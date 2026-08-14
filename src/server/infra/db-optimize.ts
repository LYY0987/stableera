/**
 * 数据库优化初始化脚本
 * 创建必要的索引以提高查询性能
 * 这个脚本在应用启动时执行，确保索引存在
 */

import { orm, db } from '@/server/infra/db';

/**
 * 创建所有必要的索引
 * 使用 CREATE INDEX IF NOT EXISTS 确保幂等性
 */
export async function initializeIndexes(): Promise<void> {
  if (!db) {
    // 使用 Turso 时跳过本地索引创建
    return;
  }

  try {
    // 为相册查询添加索引
    // 用于：按用户过滤相册，以及按可见性过滤
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_album_userId_visibility 
      ON album(user_id, visibility);
    `);

    // 为照片查询添加索引
    // 用于：按用户过滤、按拍摄时间排序
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_photo_userId_takenTime 
      ON photo(user_id, taken_time DESC);
    `);

    // 为相册-照片关联查询添加索引
    // 用于：快速查找相册中的照片
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_albumPhoto_albumId 
      ON album_photo(album_id);
    `);

    // 为照片状态过滤添加索引
    // 用于：查询未删除的照片
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_photo_userId_status 
      ON photo(user_id, status);
    `);

    // 为用户查询优化
    // 用于：按用户 ID 快速查询
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_album_userId 
      ON album(user_id);
    `);

    // 为照片回收站查询优化
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_photo_userId_recycleTime 
      ON photo(user_id, recycle_time DESC) 
      WHERE status = 1;
    `);

    console.log('✅ 数据库索引初始化成功');
  } catch (error) {
    console.error('❌ 数据库索引初始化失败:', error);
    // 不抛出错误，允许应用继续运行
  }
}

/**
 * 验证索引是否创建
 */
export async function verifyIndexes(): Promise<{ created: number; missing: string[] }> {
  if (!db) {
    return { created: 0, missing: [] };
  }

  const requiredIndexes = [
    'idx_album_userId_visibility',
    'idx_photo_userId_takenTime',
    'idx_albumPhoto_albumId',
    'idx_photo_userId_status',
    'idx_album_userId',
    'idx_photo_userId_recycleTime',
  ];

  try {
    const result = db.prepare('SELECT name FROM sqlite_master WHERE type="index"').all() as Array<{ name: string }>;
    const existingIndexes = new Set(result.map(r => r.name));

    const missing = requiredIndexes.filter(idx => !existingIndexes.has(idx));

    return {
      created: requiredIndexes.length - missing.length,
      missing,
    };
  } catch (error) {
    console.error('验证索引失败:', error);
    return { created: 0, missing: requiredIndexes };
  }
}

/**
 * 分析查询性能
 * 使用 EXPLAIN QUERY PLAN 检查查询是否使用了索引
 */
export function analyzeQuery(sql: string): string[] {
  if (!db) return [];

  try {
    const result = db.prepare(`EXPLAIN QUERY PLAN ${sql}`).all() as Array<{ detail: string }>;
    return result.map(r => r.detail);
  } catch (error) {
    return [];
  }
}
