import cron from 'node-cron';
import { backupDatabase } from '@/server/lib/db-backup';

// 这个模块用 node-cron 定时备份本地数据库。

// 每天凌晨 3 点执行一次数据库备份。
function backupTask() {
  cron.schedule('0 3 * * *', () => {
    void backupDatabase().catch((err) => {
      console.error('[task] 数据库备份失败', err);
    });
  });
}

export { backupTask };
