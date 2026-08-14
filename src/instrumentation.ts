// 这个模块在 Next.js 服务启动时注册服务端定时任务。

export async function register() {

  if (process.env.NEXT_RUNTIME === 'edge' || process.env.VERCEL) {
    return
  }

  const { migrate } = await import('@/server/infra/migrate');
  await migrate();

  // 初始化数据库索引以提高查询性能
  const { initializeIndexes, verifyIndexes } = await import('@/server/infra/db-optimize');
  await initializeIndexes();
  
  // 在开发环境验证索引创建情况
  if (process.env.NODE_ENV === 'development') {
    const indexStatus = await verifyIndexes();
    console.log(`📊 数据库索引状态: 已创建 ${indexStatus.created} 个索引${indexStatus.missing.length > 0 ? `, 缺失: ${indexStatus.missing.join(', ')}` : ''}`);
  }

  const { userService } = await import('@/server/service/user-service');
  await userService.init();

  const { startTasks } = await import('@/server/task');
  startTasks();
}
