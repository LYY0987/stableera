/**
 * 图片预加载 Hook
 * 在用户接近列表底部时，自动预加载下一批图片
 * 避免用户看到加载中状态
 */

import { useCallback, useEffect, useRef } from 'react';
import { imageCache } from '@/lib/image-cache';

interface UseImagePreloadOptions {
  /**
   * 触发预加载的距离阈值（px）
   * 默认 2000px 表示还剩 2000px 就开始预加载
   */
  threshold?: number;

  /**
   * 是否启用缓存
   * 默认 true
   */
  enableCache?: boolean;

  /**
   * 预加载图片数量
   * 默认 5 张
   */
  preloadCount?: number;
}

/**
 * 使用预加载 Hook
 * 
 * @example
 * const { shouldPreload, preloadImages } = useImagePreload({
 *   threshold: 2000,
 *   enableCache: true,
 * });
 * 
 * // 在滚动时调用
 * if (shouldPreload()) {
 *   preloadImages(nextPhotos);
 * }
 */
export function useImagePreload(options: UseImagePreloadOptions = {}) {
  const {
    threshold = 2000,
    enableCache = true,
    preloadCount = 5,
  } = options;

  const preloadedIdsRef = useRef<Set<string>>(new Set());
  const isCacheInitializedRef = useRef(false);

  /**
   * 初始化缓存
   */
  useEffect(() => {
    if (enableCache && !isCacheInitializedRef.current) {
      isCacheInitializedRef.current = true;
      imageCache.init().catch(() => {
        // 缓存初始化失败，继续使用应用
      });
    }
  }, [enableCache]);

  /**
   * 检查是否应该预加载
   */
  const shouldPreload = useCallback((): boolean => {
    if (typeof window === 'undefined') return false;

    const scrollTop = window.scrollY;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    const scrollBottom = documentHeight - (scrollTop + windowHeight);

    return scrollBottom < threshold;
  }, [threshold]);

  /**
   * 预加载单张图片
   */
  const preloadImage = useCallback(
    async (photoId: string, url: string) => {
      if (!url) return;

      try {
        // 先检查缓存
        if (enableCache) {
          const cached = await imageCache.get(photoId);
          if (cached) return;
        }

        // 用 Image 触发浏览器 HTTP 缓存预热，无需依赖 CORS。
        await new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = () => resolve();
          img.src = url;
        });

        // 记录已预加载项
        if (enableCache) {
          await imageCache.set(photoId, url);
        }
      } catch (error) {
        // 预加载失败不影响功能，静默处理
      }
    },
    [enableCache]
  );

  /**
   * 预加载图片
   */
  const preloadImages = useCallback(
    async (photoUrls: Array<{ photoId: string; url: string | null }>) => {
      const toPreload = photoUrls
        .filter(
          (photo) =>
            photo.url &&
            !preloadedIdsRef.current.has(photo.photoId)
        )
        .slice(0, preloadCount);

      if (toPreload.length === 0) return;

      // 添加到预加载队列，但不阻塞主线程
      toPreload.forEach((photo) => {
        preloadedIdsRef.current.add(photo.photoId);

        // 使用 requestIdleCallback 或 setTimeout 延后加载
        if ('requestIdleCallback' in window) {
          requestIdleCallback(
            () => preloadImage(photo.photoId, photo.url!),
            { timeout: 2000 }
          );
        } else {
          setTimeout(() => preloadImage(photo.photoId, photo.url!), 100);
        }
      });
    },
    [preloadCount, preloadImage]
  );

  /**
   * 清理预加载队列
   */
  const clearPreloaded = useCallback(() => {
    preloadedIdsRef.current.clear();
  }, []);

  return {
    shouldPreload,
    preloadImages,
    preloadImage,
    clearPreloaded,
  };
}
