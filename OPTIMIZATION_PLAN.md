# Pixtale 项目优化计划 - 详细版（风险控制）

## 总体原则

1. **不破坏现有功能** - 所有更改都必须向后兼容
2. **充分测试** - 单元测试、集成测试、性能测试
3. **增量发布** - 功能开关隔离，可灰度发布
4. **可快速回滚** - 每个阶段都有明确的回滚方案
5. **代码审查** - 每个改动都有清单

---

## 第一阶段：性能优化（预计 1-2 周）

### 1.1 图片加载优化【✅ COMPLETED】

**目标**：减少首屏加载时间，改善用户体验

**实现状态**：
- ✅ 预加载 Hook 完成 (`use-image-preload.ts`)
- ✅ 缓存服务完成 (`image-cache.ts`)
- ✅ PhotoMasonry 组件集成完成
- ✅ 单元测试框架创建
- ✅ 所有代码通过 TypeScript 验证

**关键文件**：
- `src/lib/image-cache.ts` - IndexedDB 缓存服务
- `src/hooks/use-image-preload.ts` - 预加载 React Hook
- `src/components/photo/photo-masonry.tsx` - 集成点
- `src/__tests__/lib/image-cache.test.ts` - 单元测试

**完成特性**：
- 智能预加载：距离底部 2000px 时触发
- 非阻塞加载：使用 requestIdleCallback
- IndexedDB 缓存：7 天 TTL，50MB 容量限制
- 自动清理：超过 50MB 时删除最旧的 25%

**测试清单**：
- [ ] 第一页加载时间对比（应 ≤ 5% 变化）
- [ ] 滚动到底部时预加载是否正常工作
- [ ] 缓存大小是否超过 50MB（IndexedDB 限制）
- [ ] 移动设备上性能对比
- [ ] 浏览器兼容性测试

**回滚方案**：注释掉 hook 调用即可

---

### 1.2 数据库查询优化【✅ COMPLETED】

**目标**：优化 SQL 查询性能，减少数据库负担

**实现状态**：
- ✅ 数据库优化脚本创建 (`db-optimize.ts`)
- ✅ 所有必要索引已定义
- ✅ 应用启动时自动创建索引
- ✅ 索引验证功能完成
- ✅ 查询优化指南编写完成

**关键文件**：
- `src/server/infra/db-optimize.ts` - 索引创建脚本
- `src/server/infra/query-optimization-guide.ts` - 优化指南
- `src/instrumentation.ts` - 启动时初始化

**创建的索引**：
```sql
-- 相册查询优化
idx_album_userId_visibility - ON album(user_id, visibility)
idx_album_userId - ON album(user_id)

-- 照片查询优化
idx_photo_userId_takenTime - ON photo(user_id, taken_time DESC)
idx_photo_userId_status - ON photo(user_id, status)
idx_photo_userId_recycleTime - ON photo(user_id, recycle_time DESC) WHERE status = 1

-- 关联表查询优化
idx_albumPhoto_albumId - ON album_photo(album_id)
```

**完成特性**：
- 幂等性创建：使用 CREATE INDEX IF NOT EXISTS
- 启动时自动验证：显示创建状态日志
- 自动清理规则：记录最佳实践
- EXPLAIN QUERY PLAN 支持

**测试清单**：
- [ ] 相册列表查询速度（>1000 相册仍在 200ms 内）
- [ ] 照片列表查询速度（>10000 照片仍在 500ms 内）
- [ ] 索引是否有效（使用 EXPLAIN）
- [ ] 数据库文件大小变化（应 <1%）

**回滚方案**：删除索引即可，无需数据迁移

---

### 1.3 缓存策略【✅ COMPLETED】

**目标**：减少数据库查询，加快响应速度

**实现状态**：
- ✅ 内存缓存服务创建 (`memory-cache.ts`)
- ✅ 缓存清理任务创建 (`memory-cache-task.ts`)
- ✅ 自动启动注册完成
- ✅ 缓存统计功能实现

**关键文件**：
- `src/server/infra/memory-cache.ts` - 缓存管理服务
- `src/server/task/memory-cache-task.ts` - 清理任务
- `src/server/task/index.ts` - 任务启动器

**缓存配置**：
- 相册列表 TTL: 5 分钟
- 相册详情 TTL: 10 分钟
- 照片列表 TTL: 3 分钟
- 最大条目数: 1000
- 超限清理: 删除最旧 20%

**完成特性**：
- 简单键值存储：无 Redis 依赖
- 自动过期检查：每 5 分钟清理一次
- TTL 支持：灵活的过期时间设置
- 缓存统计：监控缓存利用率
- 预定义键生成器：标准化缓存键

**缓存键示例**：
```typescript
cacheKeys.albumList(userId)        // user-{userId}-albums-list
cacheKeys.albumDetail(albumId)     // album-{albumId}
cacheKeys.albumPhotos(albumId)     // album-{albumId}-photos
cacheKeys.userPhotos(userId)       // user-{userId}-photos-all
cacheKeys.userStorage(userId)      // user-{userId}-storage
```

**使用示例**：
```typescript
// 缓存热数据
const cacheKey = cacheKeys.albumList(userId);
const cached = getCached<AlbumVo[]>(cacheKey);
if (!cached) {
  const albums = await fetchFromDatabase();
  setCached(cacheKey, albums, cacheConfig.ALBUM_LIST_TTL);
  return albums;
}
return cached;

// 修改后立即失效
async function updateAlbum(...) {
  const result = await albumService.update(...);
  deleteCached(cacheKeys.albumList(userId));
  return result;
}
```

**测试清单**：
- [ ] 缓存命中率 > 60%
- [ ] 内存使用增加 < 50MB
- [ ] 修改相册后缓存正确失效
- [ ] 服务器重启后缓存清空

**回滚方案**：注释掉缓存调用即可

---

## 第二阶段：功能扩展 - 相册共享【MEDIUM RISK】

预计 2-3 周，包括：
- 数据库 schema 添加（share_token, album_share 表）
- API 端点（创建/撤销共享链接）
- 前端 UI 组件
- 权限验证

### 详细设计待定...

---

## 第三阶段：标签与元数据【MEDIUM-HIGH RISK】

预计 2-3 周，包括：
- 添加 photo_tag 表
- 自动标签生成逻辑
- 标签搜索功能

### 详细设计待定...

---

## 发布清单（每个阶段都要）

### 代码审查
- [ ] 没有 console.log 和调试代码
- [ ] TypeScript 严格模式（noImplicitAny）
- [ ] 没有注释的代码
- [ ] 变量命名清晰
- [ ] 函数长度 < 50 行

### 测试
- [ ] 单元测试覆盖率 > 80%
- [ ] 集成测试通过
- [ ] 性能测试通过
- [ ] 浏览器兼容性测试（Chrome, Firefox, Safari）
- [ ] 移动设备测试（iOS, Android）

### 文档
- [ ] README 更新
- [ ] API 文档更新
- [ ] 数据库变更文档
- [ ] 变更日志

### 部署
- [ ] 在 staging 环境验证 24 小时
- [ ] 灰度发布到 5% 流量
- [ ] 监控错误率和性能指标
- [ ] 若无异常，全量发布
- [ ] 准备回滚方案

---

## 风险评估

| 优化项 | 风险等级 | 影响范围 | 回滚难度 |
|------|--------|--------|--------|
| 图片预加载 | 🟢 低 | 纯前端 | 很简单 |
| 数据库索引 | 🟢 低 | 后端性能 | 很简单 |
| 内存缓存 | 🟡 中 | 后端逻辑 | 简单 |
| 相册共享 | 🟡 中 | 权限系统 | 中等 |
| 标签系统 | 🟠 高 | 数据结构 | 复杂 |

---

## 监控指标

### 前端性能
- First Contentful Paint (FCP)
- Largest Contentful Paint (LCP)
- Cumulative Layout Shift (CLS)
- Time to Interactive (TTI)

### 后端性能
- 平均响应时间（ms）
- P95/P99 响应时间
- 数据库查询时间
- 错误率（%）

### 业务指标
- 图片加载成功率
- 缓存命中率
- 用户反馈评分

---

## 时间表

| 阶段 | 开始时间 | 完成时间 | 发布时间 |
|------|--------|--------|--------|
| 第一阶段 | Week 1 | Week 2 | Week 3 |
| 第二阶段 | Week 3 | Week 5 | Week 6 |
| 第三阶段 | Week 6 | Week 8 | Week 9 |

---

## 重要提醒

1. **不要同时修改多个系统** - 一次一个功能
2. **每次提交都要有清晰的 commit message**
3. **保留完整的测试日志**
4. **准备回滚脚本**
5. **定期备份数据库**
