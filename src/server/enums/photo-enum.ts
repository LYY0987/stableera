// 这个模块定义照片相关枚举值。

const PhotoStatusEnum = {
  NORMAL: 1,
  DELETE: 2
} as const;

const PhotoFavoriteEnum = {
  NO: 1,
  YES: 2
} as const;

// 照片可见性：公开（所有人可见，默认）/ 私密（仅照片所有者可见）。
const PhotoVisibilityEnum = {
  PUBLIC: 0,
  PRIVATE: 1
} as const;

export { PhotoFavoriteEnum, PhotoStatusEnum, PhotoVisibilityEnum };
