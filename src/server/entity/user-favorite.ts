import { sql } from 'drizzle-orm';
import { primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// 用户收藏：记录每个用户收藏的照片，photo 表 favorite 列仅作历史兼容。
export const userFavoriteTab = sqliteTable('user_favorite', {
  userId: text('user_id').notNull(), // 用户id
  photoId: text('photo_id').notNull(), // 照片id
  createTime: text('create_time').default(sql`(strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))`).notNull(), // 收藏时间 ISO UTC
}, (table) => [
  primaryKey({ columns: [table.userId, table.photoId] })
]);

export type UserFavorite = typeof userFavoriteTab.$inferSelect;
export type UserFavoriteInto = typeof userFavoriteTab.$inferInsert;
