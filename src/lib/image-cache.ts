/**
 * 图片缓存管理服务
 * 使用 IndexedDB 存储最近加载的图片元数据，避免重复加载
 * 数据库大小限制：通常 50-100MB
 */

interface CachedImage {
  photoId: string;
  url: string;
  timestamp: number;
  size?: number;
}

class ImageCacheService {
  private dbName = 'pixtale_image_cache';
  private storeName = 'images';
  private db: IDBDatabase | null = null;
  private isSupported = true;
  private maxCacheSize = 50 * 1024 * 1024; // 50MB
  private maxCacheAge = 7 * 24 * 60 * 60 * 1000; // 7天

  /**
   * 初始化缓存数据库
   */
  async init(): Promise<void> {
    if (typeof window === 'undefined' || !window.indexedDB) {
      this.isSupported = false;
      return;
    }

    try {
      const request = window.indexedDB.open(this.dbName, 1);

      return new Promise((resolve, reject) => {
        request.onerror = () => {
          this.isSupported = false;
          reject(new Error('Failed to open IndexedDB'));
        };

        request.onsuccess = () => {
          this.db = request.result;
          resolve();
        };

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(this.storeName)) {
            const store = db.createObjectStore(this.storeName, { keyPath: 'photoId' });
            store.createIndex('timestamp', 'timestamp', { unique: false });
          }
        };
      });
    } catch (error) {
      this.isSupported = false;
    }
  }

  /**
   * 获取缓存的图片
   */
  async get(photoId: string): Promise<CachedImage | null> {
    if (!this.isSupported || !this.db) return null;

    try {
      return new Promise((resolve) => {
        const transaction = this.db!.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.get(photoId);

        request.onsuccess = () => {
          const item = request.result as CachedImage | undefined;
          
          // 检查是否过期
          if (item && Date.now() - item.timestamp < this.maxCacheAge) {
            resolve(item);
          } else if (item) {
            // 删除过期数据
            this.delete(photoId);
            resolve(null);
          } else {
            resolve(null);
          }
        };

        request.onerror = () => resolve(null);
      });
    } catch (error) {
      return null;
    }
  }

  /**
   * 存储图片到缓存
   */
  async set(photoId: string, url: string, size?: number): Promise<void> {
    if (!this.isSupported || !this.db) return;

    try {
      const item: CachedImage = {
        photoId,
        url,
        timestamp: Date.now(),
        size,
      };

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.put(item);

        request.onsuccess = () => {
          // 清理超大缓存
          this.cleanupIfNeeded().catch(() => {});
          resolve();
        };

        request.onerror = () => reject(new Error('Failed to cache image'));
      });
    } catch (error) {
      return;
    }
  }

  /**
   * 删除缓存
   */
  async delete(photoId: string): Promise<void> {
    if (!this.isSupported || !this.db) return;

    try {
      return new Promise((resolve) => {
        const transaction = this.db!.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.delete(photoId);

        request.onsuccess = () => resolve();
        request.onerror = () => resolve();
      });
    } catch (error) {
      return;
    }
  }

  /**
   * 清空所有缓存
   */
  async clear(): Promise<void> {
    if (!this.isSupported || !this.db) return;

    try {
      return new Promise((resolve) => {
        const transaction = this.db!.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => resolve();
      });
    } catch (error) {
      return;
    }
  }

  /**
   * 清理超大缓存（当总大小超过限制时）
   */
  private async cleanupIfNeeded(): Promise<void> {
    if (!this.isSupported || !this.db) return;

    try {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('timestamp');

      const allItems = await new Promise<CachedImage[]>((resolve) => {
        const request = index.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve([]);
      });

      // 计算总大小
      const totalSize = allItems.reduce((sum, item) => sum + (item.size || 0), 0);

      if (totalSize > this.maxCacheSize) {
        // 删除最老的 25% 的缓存
        const toDelete = Math.ceil(allItems.length * 0.25);
        const writeTransaction = this.db.transaction([this.storeName], 'readwrite');
        const writeStore = writeTransaction.objectStore(this.storeName);

        for (let i = 0; i < toDelete; i++) {
          writeStore.delete(allItems[i].photoId);
        }
      }
    } catch (error) {
      // 忽略清理错误
    }
  }
}

// 导出单例
export const imageCache = new ImageCacheService();
