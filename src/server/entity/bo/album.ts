// 这个模块定义相册业务入参对象。

interface AlbumAddBo {
  name: string;
  // 可见性 0公开 1私密，不传时默认公开。
  visibility?: number;
}

interface AlbumAddPhotoBo {
  albumIds: string[];
  photoIds: string[];
}

interface AlbumRemovePhotoBo {
  albumId: string;
  photoIds: string[];
}

interface AlbumDeleteBo {
  albumId: string;
}

interface AlbumSetNameBo {
  albumId: string;
  name: string;
}

interface AlbumSetTopBo {
  albumId: string;
}

interface AlbumSetVisibilityBo {
  albumId: string;
  // 可见性 0公开 1私密。
  visibility: number;
}

interface AlbumShareBo {
  albumId: string;
}

export type { AlbumAddBo, AlbumAddPhotoBo, AlbumDeleteBo, AlbumRemovePhotoBo, AlbumSetNameBo, AlbumSetTopBo, AlbumSetVisibilityBo, AlbumShareBo };
