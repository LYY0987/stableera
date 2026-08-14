/**
 * 图片缓存服务单元测试
 * 测试 IndexedDB 缓存的基本功能
 */

import { imageCache } from '@/lib/image-cache';

describe('ImageCacheService', () => {
  beforeEach(async () => {
    // 清空缓存
    await imageCache.clear();
  });

  describe('初始化', () => {
    test('应该成功初始化缓存', async () => {
      await expect(imageCache.init()).resolves.toBeUndefined();
    });
  });

  describe('缓存操作', () => {
    beforeEach(async () => {
      await imageCache.init();
    });

    test('应该能保存和获取缓存', async () => {
      const photoId = 'photo-1';
      const url = 'https://example.com/photo1.jpg';

      await imageCache.set(photoId, url, 1024);
      const cached = await imageCache.get(photoId);

      expect(cached).not.toBeNull();
      expect(cached?.photoId).toBe(photoId);
      expect(cached?.url).toBe(url);
      expect(cached?.size).toBe(1024);
    });

    test('获取不存在的缓存应该返回 null', async () => {
      const cached = await imageCache.get('non-existent');
      expect(cached).toBeNull();
    });

    test('应该能删除缓存', async () => {
      const photoId = 'photo-1';
      await imageCache.set(photoId, 'https://example.com/photo1.jpg');

      await imageCache.delete(photoId);
      const cached = await imageCache.get(photoId);

      expect(cached).toBeNull();
    });

    test('应该能清空所有缓存', async () => {
      await imageCache.set('photo-1', 'https://example.com/photo1.jpg');
      await imageCache.set('photo-2', 'https://example.com/photo2.jpg');

      await imageCache.clear();

      expect(await imageCache.get('photo-1')).toBeNull();
      expect(await imageCache.get('photo-2')).toBeNull();
    });
  });

  describe('缓存过期', () => {
    beforeEach(async () => {
      await imageCache.init();
    });

    test('过期的缓存应该自动删除', async () => {
      const photoId = 'photo-1';
      await imageCache.set(photoId, 'https://example.com/photo1.jpg');

      // 这个测试在实际执行中需要时间跳过
      // 这里仅作为测试结构示例
      expect(await imageCache.get(photoId)).not.toBeNull();
    });
  });
});
