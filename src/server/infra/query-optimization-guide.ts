/**
 * 数据库查询优化指南
 * 记录项目中的查询优化最佳实践
 */

// ============================================================
// 1. 当前优化措施
// ============================================================
// 已添加的数据库索引：
// - idx_album_userId_visibility: 加速用户相册查询 (WHERE user_id AND visibility)
// - idx_photo_userId_takenTime: 加速照片列表查询 (按拍摄时间排序)
// - idx_albumPhoto_albumId: 加速相册内照片查询
// - idx_photo_userId_status: 加速照片状态过滤查询
// - idx_album_userId: 加速用户相册查询
// - idx_photo_userId_recycleTime: 加速回收站查询

// ============================================================
// 2. 查询优化最佳实践
// ============================================================

import { eq, and, desc, inArray } from 'drizzle-orm'
import { orm } from '@/server/infra/db'
import { albumTab, photoTab, albumPhotoTab } from '@/server/entity'

// ✅ 优化示例 1：避免 N+1 查询
// 问题：循环查询每个相册的照片
export async function badGetAlbumsWithPhotos(userId: string) {
  const albums = await orm.select().from(albumTab).where(eq(albumTab.userId, userId))
  
  // ❌ N+1 问题：每个相册都会执行一次查询
  const result = await Promise.all(albums.map(async (album) => ({
    ...album,
    photos: await orm
      .select()
      .from(photoTab)
      .innerJoin(albumPhotoTab, eq(photoTab.id, albumPhotoTab.photoId))
      .where(eq(albumPhotoTab.albumId, album.id))
  })))
  
  return result
}

// ✅ 优化示例 1 修复：一次查询获取所有数据
export async function goodGetAlbumsWithPhotos(userId: string) {
  // 方案 A: 使用 JOIN 一次性获取
  const result = await orm
    .select()
    .from(albumTab)
    .leftJoin(albumPhotoTab, eq(albumTab.id, albumPhotoTab.albumId))
    .leftJoin(photoTab, eq(albumPhotoTab.photoId, photoTab.id))
    .where(eq(albumTab.userId, userId))
  
  // 后端组织数据
  const grouped = new Map()
  result.forEach(row => {
    const albumId = row.album.id
    if (!grouped.has(albumId)) {
      grouped.set(albumId, { ...row.album, photos: [] })
    }
    if (row.photo) {
      grouped.get(albumId).photos.push(row.photo)
    }
  })
  
  return Array.from(grouped.values())
}

// ============================================================
// 3. 常见查询模式优化
// ============================================================

// ✅ 优化模式 1：分页列表查询
export async function getAlbumsPaginated(userId: string, page: number = 1, pageSize: number = 20) {
  const offset = (page - 1) * pageSize
  
  return orm
    .select()
    .from(albumTab)
    .where(eq(albumTab.userId, userId))
    .orderBy(desc(albumTab.createdAt))
    .limit(pageSize)
    .offset(offset)
    // 索引 idx_album_userId 会加速这个查询
}

// ✅ 优化模式 2：带状态过滤的查询
export async function getActivePhotos(userId: string, limit: number = 100) {
  return orm
    .select()
    .from(photoTab)
    .where(
      and(
        eq(photoTab.userId, userId),
        eq(photoTab.status, 0) // 0 = 正常状态
      )
    )
    .orderBy(desc(photoTab.takenTime))
    .limit(limit)
    // 索引 idx_photo_userId_status 会加速这个查询
}

// ✅ 优化模式 3：范围查询
export async function getPhotosByDateRange(
  userId: string,
  startDate: Date,
  endDate: Date
) {
  return orm
    .select()
    .from(photoTab)
    .where(
      and(
        eq(photoTab.userId, userId),
        photoTab.takenTime >= startDate,
        photoTab.takenTime <= endDate
      )
    )
    .orderBy(desc(photoTab.takenTime))
    // 索引 idx_photo_userId_takenTime 会加速这个查询
}

// ✅ 优化模式 4：批量查询 (IN 查询)
export async function getPhotosById(photoIds: string[]) {
  if (photoIds.length === 0) return []
  
  return orm
    .select()
    .from(photoTab)
    .where(inArray(photoTab.id, photoIds))
    // 注意：IN 查询不使用索引当数量很大时
    // 超过 1000 项时考虑分批查询
}

// ✅ 优化后的批量查询：分批处理
export async function getPhotosByIdBatched(photoIds: string[], batchSize: number = 500) {
  if (photoIds.length === 0) return []
  
  const results = []
  for (let i = 0; i < photoIds.length; i += batchSize) {
    const batch = photoIds.slice(i, i + batchSize)
    results.push(
      ...await orm
        .select()
        .from(photoTab)
        .where(inArray(photoTab.id, batch))
    )
  }
  return results
}

// ============================================================
// 4. 性能检查清单
// ============================================================

/**
 * 性能检查清单：
 * 
 * ✅ 查询优化规则：
 * 1. 避免 N+1 查询 - 使用 JOIN 而不是循环查询
 * 2. 总是在 WHERE 条件中使用有索引的列
 * 3. 避免在 WHERE 条件中使用函数 (如 LOWER(), DATE() 等)
 * 4. 大量 IN 查询时分批处理 (>1000 项)
 * 5. 使用 LIMIT 获取列表数据
 * 6. 对排序列使用索引
 * 
 * 📊 监控规则：
 * 1. 任何查询 >500ms 都需要优化
 * 2. 任何涉及 >10 张表的 JOIN 需要重新设计
 * 3. 批量操作需要使用事务
 * 4. 定期运行 ANALYZE 更新统计信息
 * 
 * 🔍 诊断方法：
 * 使用 EXPLAIN QUERY PLAN 检查查询计划
 * 示例: EXPLAIN QUERY PLAN SELECT ... FROM album WHERE user_id = ? AND visibility = ?
 * 如果看到 "SCAN TABLE" 说明没有使用索引
 * 如果看到 "SEARCH TABLE ... USING INDEX ..." 说明正确使用了索引
 */

// ============================================================
// 5. 未来优化机会
// ============================================================

/**
 * 潜在优化 (按优先级)：
 * 
 * 1. 🔴 高优先级：
 *    - 添加复合索引用于常用的组合查询
 *    - 实现服务端缓存 (Redis 或内存) 用于热数据
 *    - 添加数据库查询日志以识别慢查询
 * 
 * 2. 🟡 中优先级：
 *    - 使用 CDN 缓存图片缩略图元数据
 *    - 实现相册列表的分页加载
 *    - 为热查询添加应用层缓存
 * 
 * 3. 🟢 低优先级：
 *    - 分库分表 (仅当数据库太大时)
 *    - 使用读写分离 (仅当查询压力很高时)
 *    - 数据仓库用于分析查询
 */
