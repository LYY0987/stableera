// 这个模块定义相册相关枚举值。

const AlbumVisibilityEnum = {
  // 公开：相册中的照片在照片墙显示。
  PUBLIC: 0,
  // 私密：相册中的照片不在照片墙显示。
  PRIVATE: 1
} as const;

type AlbumVisibility = (typeof AlbumVisibilityEnum)[keyof typeof AlbumVisibilityEnum];

const AlbumVisibilityOptions = [
  { label: "public", value: AlbumVisibilityEnum.PUBLIC },
  { label: "private", value: AlbumVisibilityEnum.PRIVATE }
];

export { AlbumVisibilityEnum, AlbumVisibilityOptions };
export type { AlbumVisibility };
