import { albumTab } from '@/server/entity/album';
import { albumPhotoTab } from '@/server/entity/album-photo';
import { albumShareTab } from '@/server/entity/album-share';
import { avatarBase64Tab } from '@/server/entity/avatar-base64';
import { cacheTab } from '@/server/entity/cache';
import { exifTab } from '@/server/entity/exif';
import { fileTab } from '@/server/entity/file';
import { photoTab } from '@/server/entity/photo';
import { settingTab } from '@/server/entity/setting';
import { storageTab } from '@/server/entity/storage';
import { userTab } from '@/server/entity/user';
import { userFavoriteTab } from '@/server/entity/user-favorite';

// 这个模块统一导出 Drizzle 数据库表结构。

const schema = {
  albumPhotoTab,
  albumShareTab,
  albumTab,
  avatarBase64Tab,
  cacheTab,
  exifTab,
  fileTab,
  photoTab,
  settingTab,
  storageTab,
  userFavoriteTab,
  userTab
};

export { schema };
