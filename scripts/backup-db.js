const path = require('path')
const { createJiti } = require('jiti')

// 手动备份数据库：node scripts/backup-db.js
// 复用服务端备份逻辑，备份到 data/backups 并自动保留最近 N 份（BACKUP_KEEP 可覆盖）。

async function runBackup() {
  const jiti = createJiti(__filename, { tsconfigPaths: true })
  const { backupDatabase } = await jiti.import(
    path.join(__dirname, '../src/server/lib/db-backup.ts'),
  )
  const dest = await backupDatabase()

  if (!dest) {
    console.log('[backup-db] 未产生本地备份（Turso 远程库无需本地备份）')
    return
  }

  console.log(`[backup-db] 备份成功: ${dest}`)
}

runBackup().catch((err) => {
  console.error('[backup-db] 备份失败', err)
  process.exit(1)
})
