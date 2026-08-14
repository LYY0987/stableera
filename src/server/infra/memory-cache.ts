/**
 * 服务端内存缓存管理
 * 用于缓存高频访问的热数据，减轻数据库压力
 */

import type { AlbumVo } from '@/server/entity/vo/album';
import type { PhotoVo } from '@/server/entity/vo/photo';

// 缓存条目接口
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // 单位：毫秒
}

// 缓存存储
const cacheStore = new Map<string, CacheEntry<any>>();

// 缓存配置
export const cacheConfig = {
  // 相册列表缓存时间：5 分钟
  ALBUM_LIST_TTL: 5 * 60 * 1000,
  // 单个相册缓存时间：10 分钟
  ALBUM_DETAIL_TTL: 10 * 60 * 1000,
  // 照片列表缓存时间：3 分钟
  PHOTO_LIST_TTL: 3 * 60 * 1000,
  // 最大缓存条目数
  MAX_ENTRIES: 1000,
} as const;

/**
 * 获取缓存
 */
export function getCached<T>(key: string): T | null {
  const entry = cacheStore.get(key);

  if (!entry) {
    return null;
  }

  // 检查是否过期
  if (Date.now() - entry.timestamp > entry.ttl) {
    cacheStore.delete(key);
    return null;
  }

  return entry.data as T;
}

/**
 * 设置缓存
 */
export function setCached<T>(key: string, data: T, ttl: number): void {
  // 如果缓存过多，清理旧的条目
  if (cacheStore.size >= cacheConfig.MAX_ENTRIES) {
    cleanOldEntries();
  }

  cacheStore.set(key, {
    data,
    timestamp: Date.now(),
    ttl,
  });
}

/**
 * 删除缓存
 */
export function deleteCached(key: string): void {
  cacheStore.delete(key);
}

/**
 * 清除所有缓存
 */
export function clearAllCache(): void {
  cacheStore.clear();
}

/**
 * 清理过期缓存
 */
export function cleanExpiredCache(): void {
  const now = Date.now();
  const keysToDelete: string[] = [];

  cacheStore.forEach((entry, key) => {
    if (now - entry.timestamp > entry.ttl) {
      keysToDelete.push(key);
    }
  });

  keysToDelete.forEach(key => cacheStore.delete(key));
}

/**
 * 清理最旧的 20% 条目（当缓存满时调用）
 */
function cleanOldEntries(): void {
  const entries = Array.from(cacheStore.entries());
  
  // 按时间戳排序
  entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
  
  // 删除最旧的 20%
  const toDelete = Math.ceil(entries.length * 0.2);
  for (let i = 0; i < toDelete; i++) {
    cacheStore.delete(entries[i][0]);
  }
}

/**
 * 获取缓存统计信息
 */
export function getCacheStats(): {
  totalEntries: number;
  maxEntries: number;
  utilizationPercentage: number;
} {
  return {
    totalEntries: cacheStore.size,
    maxEntries: cacheConfig.MAX_ENTRIES,
    utilizationPercentage: Math.round((cacheStore.size / cacheConfig.MAX_ENTRIES) * 100),
  };
}

/**
 * 缓存键生成函数
 */
export const cacheKeys = {
  // 用户的相册列表：user-{userId}-albums-list
  albumList: (userId: string) => `user-${userId}-albums-list`,
  
  // 单个相册详情：album-{albumId}
  albumDetail: (albumId: string) => `album-${albumId}`,
  
  // 相册内的照片列表：album-{albumId}-photos
  albumPhotos: (albumId: string) => `album-${albumId}-photos`,
  
  // 用户的所有照片：user-{userId}-photos-all
  userPhotos: (userId: string) => `user-${userId}-photos-all`,
  
  // 用户的存储空间信息：user-{userId}-storage
  userStorage: (userId: string) => `user-${userId}-storage`,
} as const;

/**
 * 使用示例：
 * 
 * // 缓存相册列表
 * function getAlbumList(userId: string): AlbumVo[] {
 *   const cacheKey = cacheKeys.albumList(userId);
 *   const cached = getCached<AlbumVo[]>(cacheKey);
 *   
 *   if (cached) {
 *     return cached;
 *   }
 *   
 *   // 从数据库查询
 *   const albums = await fetchAlbumsFromDatabase(userId);
 *   
 *   // 存入缓存
 *   setCached(cacheKey, albums, cacheConfig.ALBUM_LIST_TTL);
 *   
 *   return albums;
 * }
 * 
 * // 当创建新相册时，清除缓存
 * async function createAlbum(userId: string, name: string) {
 *   const album = await albumService.create(userId, name);
 *   
 *   // 清除该用户的相册列表缓存
 *   deleteCached(cacheKeys.albumList(userId));
 *   
 *   return album;
 * }
 * 
 * // 定期清理过期缓存（建议在后台任务中运行）
 * setInterval(() => {
 *   cleanExpiredCache();
 * }, 60 * 1000); // 每分钟清理一次
 */
