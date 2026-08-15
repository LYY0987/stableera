// 这个模块定义照片接口返回对象。

import { type Photo } from '@/server/entity/photo';

// 照片上传者基础信息，用于照片墙展示作者标识。
type PhotoUploaderVo = {
  userId: string;
  username: string;
  avatar: string;
};

type PhotoVo = Photo & {
  key: string;
  preview: string;
  thumbnail: string;
  exif: string | null;
  latitude: number | null;
  longitude: number | null;
  altitude: number | null;
  storageName: string | null;
  storageTypeDesc: string | null;
  uploader: PhotoUploaderVo | null;
};

interface PhotoTakenDateVo {
  date: string;
  count: number;
}

interface PhotoAddResultVo {
  photo: PhotoVo | null;
  duplicate: boolean;
}

interface PhotoExistsVo {
  duplicate: boolean;
}

interface PhotoCreateUrlVo {
  // 预签名上传地址。
  url: string;
  // 实际上传使用的对象 key。
  key: string;
}

export type { PhotoUploaderVo, PhotoVo, PhotoTakenDateVo, PhotoAddResultVo, PhotoExistsVo, PhotoCreateUrlVo };
