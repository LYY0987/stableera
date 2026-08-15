import { sql } from 'drizzle-orm';
import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

// 相册分享：分享链接令牌，未登录用户可凭令牌浏览相册内的公开照片。
export const albumShareTab = sqliteTable('album_share', {
  shareId: text('share_id').primaryKey(), // 分享id（URL 令牌）
  albumId: text('album_id').notNull(), // 相册id
  userId: text('user_id').notNull(), // 创建分享的用户id
  expiresAt: text('expires_at'), // 过期时间，为空表示永久有效
  createTime: text('create_time').default(sql`(strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))`).notNull(), // 创建时间 ISO UTC
});

export type AlbumShare = typeof albumShareTab.$inferSelect;
export type AlbumShareInto = typeof albumShareTab.$inferInsert;
