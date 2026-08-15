import { type Album } from '@/server/entity/album';

// 这个模块定义相册接口返回对象。

interface AlbumVo extends Album {
  thumbnail: string | null;
  thumbHash: string | null;
  photoTotal: number;
}

// 相册分享信息返回对象。
interface AlbumShareVo {
  token: string;
  albumId: string;
  createTime: string;
  expiresAt: string | null;
}

export type { AlbumShareVo, AlbumVo };
