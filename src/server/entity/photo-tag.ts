import { primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// 照片标签：一张照片可打多个标签，标签名与照片唯一。
export const photoTagTab = sqliteTable('photo_tag', {
  photoId: text('photo_id').notNull(), // 照片id
  tag: text('tag').notNull(), // 标签名
}, (table) => [
  primaryKey({ columns: [table.photoId, table.tag] })
]);

export type PhotoTag = typeof photoTagTab.$inferSelect;
export type PhotoTagInto = typeof photoTagTab.$inferInsert;
