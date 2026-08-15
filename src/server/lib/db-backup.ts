import fs from 'node:fs';
import path from 'node:path';
import { db } from '@/server/infra/db';

// 这个模块提供本地 SQLite 数据库的备份能力，Turso 远程库自动跳过。

// 备份保留份数，可通过 BACKUP_KEEP 环境变量覆盖。
const BACKUP_KEEP = Number(process.env.BACKUP_KEEP ?? 7);

// 备份本地数据库到 data/backups 目录，并清理超出保留份数的旧备份，返回备份文件路径。
async function backupDatabase(): Promise<string | null> {
  if (!db) {
    console.log('[backup] 跳过（当前使用 Turso 远程数据库）');
    return null;
  }

  const dataDir = path.join(process.cwd(), 'data');
  const backupDir = path.join(dataDir, 'backups');
  fs.mkdirSync(backupDir, { recursive: true });

  const dest = path.join(backupDir, `stableera-${formatBackupTimestamp()}.sqlite`);

  // better-sqlite3 的 backup 走 SQLite 在线备份接口，服务运行中备份也保持一致。
  await db.backup(dest);

  pruneOldBackups(backupDir);

  console.log(`[backup] 备份完成: ${dest}`);
  return dest;
}

// 生成备份文件名时间戳：YYYYMMDD_HHmmss。
function formatBackupTimestamp(date = new Date()) {
  const pad = (value: number, length = 2) => String(value).padStart(length, '0');

  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    '_',
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join('');
}

// 只保留最近 BACKUP_KEEP 份备份，删除更旧的。
function pruneOldBackups(backupDir: string) {
  const files = fs.readdirSync(backupDir)
    .filter((name) => /^stableera-\d{8}_\d{6}\.sqlite$/.test(name))
    .sort();

  const removeCount = Math.max(0, files.length - BACKUP_KEEP);

  for (const name of files.slice(0, removeCount)) {
    fs.unlinkSync(path.join(backupDir, name));
  }
}

export { backupDatabase };
