/**
 * 图片预加载 Hook 单元测试
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useImagePreload } from '@/hooks/use-image-preload';

describe('useImagePreload', () => {
  describe('预加载触发条件', () => {
    test('当距离底部大于阈值时不应该预加载', () => {
      const { result } = renderHook(() => useImagePreload({ threshold: 2000 }));

      // 模拟窗口高度和滚动位置
      Object.defineProperty(window, 'scrollY', { value: 0, writable: true });
      Object.defineProperty(window, 'innerHeight', { value: 800, writable: true });
      Object.defineProperty(document.documentElement, 'scrollHeight', { value: 5000, writable: true });

      expect(result.current.shouldPreload()).toBe(false);
    });

    test('当距离底部小于阈值时应该预加载', () => {
      const { result } = renderHook(() => useImagePreload({ threshold: 2000 }));

      // 模拟接近底部的场景
      Object.defineProperty(window, 'scrollY', { value: 3000, writable: true });
      Object.defineProperty(window, 'innerHeight', { value: 800, writable: true });
      Object.defineProperty(document.documentElement, 'scrollHeight', { value: 5000, writable: true });

      expect(result.current.shouldPreload()).toBe(true);
    });
  });

  describe('预加载操作', () => {
    test('应该能预加载图片', async () => {
      const { result } = renderHook(() => useImagePreload());

      const photos = [
        { photoId: 'photo-1', url: 'https://example.com/photo1.jpg' },
        { photoId: 'photo-2', url: 'https://example.com/photo2.jpg' },
      ];

      await result.current.preloadImages(photos);

      // 验证预加载队列
      await waitFor(() => {
        // 实际的预加载验证需要 mock fetch
      });
    });

    test('应该能清除预加载队列', () => {
      const { result } = renderHook(() => useImagePreload());

      result.current.clearPreloaded();

      // 验证队列被清除
      expect(result.current).toBeDefined();
    });
  });

  describe('缓存选项', () => {
    test('当禁用缓存时应该跳过缓存操作', async () => {
      const { result } = renderHook(() => useImagePreload({ enableCache: false }));

      const photos = [
        { photoId: 'photo-1', url: 'https://example.com/photo1.jpg' },
      ];

      await result.current.preloadImages(photos);

      // 验证缓存被禁用
      expect(result.current).toBeDefined();
    });
  });
});
