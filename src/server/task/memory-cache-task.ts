/**
 * 内存缓存清理任务
 * 定期清理过期的内存缓存条目
 */

import cron from 'node-cron';
import { cleanExpiredCache, getCacheStats } from '@/server/infra/memory-cache';

// 每 5 分钟执行一次内存缓存过期清理
function cleanMemoryCacheTask() {
  cron.schedule('*/5 * * * *', () => {
    try {
      cleanExpiredCache();
      
      // 在开发环境打印缓存统计
      if (process.env.NODE_ENV === 'development') {
        const stats = getCacheStats();
        console.log(`💾 内存缓存统计: ${stats.totalEntries}/${stats.maxEntries} (${stats.utilizationPercentage}%)`);
      }
    } catch (err) {
      console.error('[task] cleanMemoryCache 失败', err);
    }
  });
}

export { cleanMemoryCacheTask };
