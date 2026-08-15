import { and, asc, count, desc, eq, getTableColumns, gte, inArray, isNotNull, like, lt, lte, notInArray, or, sql } from 'drizzle-orm';
import { createId } from '@/server/lib/id';
import { type Photo, photoTab } from '@/server/entity/photo';
import { albumPhotoTab } from '@/server/entity/album-photo';
import { albumTab } from '@/server/entity/album';
import { orm } from '@/server/infra/db';
import BizError from '@/server/error/biz-error';
import { storage } from '@/server/storage/storage';
import {
  type PhotoCreateUrlBo,
  type PhotoDeleteBo,
  type PhotoExistsBo,
  type PhotoFavoriteBo,
  type PhotoListBo,
  type PhotoRecycleBo,
  type PhotoRestoreBo,
  type PhotoSetTagsBo,
  type PhotoSetVisibilityBo,
  type PhotoTakenDateListBo,
} from '@/server/entity/bo/photo';
import { PHOTO_LIST_PAGE_SIZE } from '@/server/const/global';
import { AlbumVisibilityEnum } from '@/server/enums/album-enum';
import { PhotoFavoriteEnum, PhotoStatusEnum, PhotoVisibilityEnum } from '@/server/enums/photo-enum';
import { StorageTypeOptions } from '@/server/enums/storage-enum';
import { type PageVo } from '@/server/entity/vo/common';
import { type PhotoAddResultVo, type PhotoCreateUrlVo, type PhotoExistsVo, type PhotoTagVo, type PhotoTakenDateVo, type PhotoVo } from '@/server/entity/vo/photo';
import { type Storage } from '@/server/entity/storage';
import { storageService } from '@/server/service/storage-service';
import { buildContentDisposition, formatFileTimestamp, splitFileName } from '@/server/lib/file';
import { albumService } from '@/server/service/album-service';
import { settingService } from '@/server/service/setting-service';
import { SettingPhotoDedupEnum, SettingSyncDeleteEnum } from '@/server/enums/setting-enum';
import { formatHttpUrl, toMediaUrl } from '@/lib/url';
import { fileChecksum } from '@/server/lib/crypto';
import { processPhotoImages } from '@/server/lib/photo-process';
import { readPhotoExifFromBuffer as readExifWithExifr } from '@/server/lib/photo-exifr';
import { readPhotoExifFromBuffer as readExifWithExiftool } from '@/server/lib/photo-exif';
import { type Exif } from '@/server/entity/exif';
import { exifService } from '@/server/service/exif-service';
import { buildPhotoKey, buildPreviewKey, buildThumbnailKey } from '@/server/lib/photo-path';
import { type File as PhotoFile, fileTab } from '@/server/entity/file';
import { userFavoriteTab } from '@/server/entity/user-favorite';
import { photoTagTab } from '@/server/entity/photo-tag';
import { userTab } from '@/server/entity/user';
import { fileService } from '@/server/service/file-service';
import { FileTypeEnum } from '@/server/enums/file-enum';

// 这个模块处理照片上传、列表、回收站等业务。

const photoService = {

  // 分页查询照片：照片墙返回所有用户的公开照片，回收站列表只返回当前用户照片，并按传入条件和拍摄时间排序。
  async list(params: PhotoListBo, userId: string): Promise<PageVo<PhotoVo>> {

    const size = params.size && params.size > 0 ? params.size : PHOTO_LIST_PAGE_SIZE;
    const status = params.status ?? PhotoStatusEnum.NORMAL;
    const orderColumn = status === PhotoStatusEnum.DELETE
      ? photoTab.recycleTime
      : photoTab.takenTime;

    const whereList = [
      eq(photoTab.status, status),
      // 照片墙展示所有用户的公开照片；回收站列表仍只显示当前用户的照片。
      ...(status === PhotoStatusEnum.DELETE ? [eq(photoTab.userId, userId)] : [])
    ];

    if (params.favorite) {
      // 收藏筛选改为当前用户自己的收藏记录，而不是共享的 photo.favorite 列。
      whereList.push(inArray(photoTab.photoId, this.buildUserFavoritePhotoIdQuery(userId)));
    }

    if (params.startTakenTime) {
      whereList.push(gte(photoTab.takenTime, params.startTakenTime));
    }

    if (params.endTakenTime) {
      whereList.push(lte(photoTab.takenTime, params.endTakenTime));
    }

    if (params.keyword?.trim()) {
      // 关键词匹配文件名或标签。
      const keywordValue = params.keyword.trim();
      const tagPhotoIdQuery = orm
        .select({ photoId: photoTagTab.photoId })
        .from(photoTagTab)
        .where(like(photoTagTab.tag, `%${keywordValue}%`));
      const keywordOr = or(
        like(photoTab.name, `%${keywordValue}%`),
        inArray(photoTab.photoId, tagPhotoIdQuery)
      );

      if (keywordOr) {
        whereList.push(keywordOr);
      }
    }

    if (params.cursorPhotoId && params.cursorTime) {
      const cursorWhere = or(
        lt(orderColumn, params.cursorTime),
        and(
          eq(orderColumn, params.cursorTime),
          lt(photoTab.photoId, params.cursorPhotoId)
        )
      );

      if (cursorWhere) {
        whereList.push(cursorWhere);
      }
    }

    const list = params.albumId
      ? await orm
        .select(getTableColumns(photoTab))
        .from(photoTab)
        .innerJoin(albumPhotoTab, eq(photoTab.photoId, albumPhotoTab.photoId))
        .where(and(
          ...whereList,
          // 相册是个人数据，相册内照片始终限定为当前用户自己的照片。
          eq(photoTab.userId, userId),
          eq(albumPhotoTab.albumId, params.albumId)
        ))
        .orderBy(desc(orderColumn), desc(photoTab.photoId))
        .limit(size)
      : await orm
        .select()
        .from(photoTab)
        .where(and(
          ...whereList,
          // 照片墙展示：自己的照片（含私密）+ 其他用户的公开照片（排除任意私密相册中的照片）。
          status === PhotoStatusEnum.NORMAL
            ? or(
                eq(photoTab.userId, userId),
                and(
                  eq(photoTab.visibility, PhotoVisibilityEnum.PUBLIC),
                  notInArray(photoTab.photoId, this.buildPrivateAlbumPhotoIdQuery())
                )
              )
            : sql`1=1`
        ))
        .orderBy(desc(orderColumn), desc(photoTab.photoId))
        .limit(size);

    const fileStorageList = await storageService.getStorageList();
    const photoIds = list.map((photo) => photo.photoId);
    const [exifMap, fileMap, favoritePhotoIds, uploaderMap, tagMap] = await Promise.all([
      exifService.listByPhotoIds(photoIds),
      fileService.listByPhotoIds(photoIds),
      this.listUserFavoritePhotoIds(photoIds, userId),
      this.listUploaders(list.map((photo) => photo.userId)),
      this.listTagsByPhotoIds(photoIds),
    ]);

    const result = list.map((photo) => {
      const fileStorage = fileStorageList.find((item) => item.storageId === photo.storageId);
      const domain = formatHttpUrl(fileStorage?.domain);
      const vo = this.toPhotoVo(photo, fileMap.get(photo.photoId) ?? [], fileStorage, domain, exifMap.get(photo.photoId) ?? null);

      // 收藏状态按当前用户覆盖，photo 表的 favorite 列仅作历史兼容。
      vo.favorite = favoritePhotoIds.has(photo.photoId) ? PhotoFavoriteEnum.YES : PhotoFavoriteEnum.NO;
      // 上传者信息用于照片墙作者标识。
      vo.uploader = uploaderMap.get(photo.userId) ?? null;
      // 照片标签。
      vo.tags = tagMap.get(photo.photoId) ?? [];

      return vo;
    });

    return {
      list: result,
      total: result.length
    };
  },

  // 按天统计照片墙中未删除且有拍摄时间的公开照片（相册内仅统计当前用户照片）。
  async takenDateList(params: PhotoTakenDateListBo, userId: string): Promise<PhotoTakenDateVo[]> {

    const whereList = [
      eq(photoTab.status, PhotoStatusEnum.NORMAL),
      isNotNull(photoTab.takenTime),
    ];

    if (params.favorite) {
      // 收藏日期统计同样按当前用户自己的收藏记录过滤。
      whereList.push(inArray(photoTab.photoId, this.buildUserFavoritePhotoIdQuery(userId)));
    }

    const tzModifier = params.tzOffset >= 0 ? `+${params.tzOffset} minutes` : `${params.tzOffset} minutes`;
    // 按前端传入时区的自然日分组，与列表展示和筛选边界一致。
    const takenDate = sql<string>`date(${photoTab.takenTime}, ${tzModifier})`;
    const selectColumns = {
      date: takenDate,
      count: count(photoTab.photoId),
    };

    const list = params.albumId
      ? await orm
        .select(selectColumns)
        .from(photoTab)
        .innerJoin(albumPhotoTab, eq(photoTab.photoId, albumPhotoTab.photoId))
        .where(and(
          ...whereList,
          // 相册是个人数据，日期统计同样只统计当前用户相册中的照片。
          eq(photoTab.userId, userId),
          eq(albumPhotoTab.albumId, params.albumId)
        ))
        .groupBy(takenDate)
        .orderBy(asc(takenDate))
      : await orm
        .select(selectColumns)
        .from(photoTab)
        .where(and(
          ...whereList,
          // 日期统计与照片墙一致：自己的照片（含私密）+ 其他用户的公开照片（排除私密相册）。
          or(
            eq(photoTab.userId, userId),
            and(
              eq(photoTab.visibility, PhotoVisibilityEnum.PUBLIC),
              notInArray(photoTab.photoId, this.buildPrivateAlbumPhotoIdQuery())
            )
          )
        ))
        .groupBy(takenDate)
        .orderBy(asc(takenDate));

    return list.map((item) => ({
      date: item.date,
      count: Number(item.count),
    }));
  },

  // 构造子查询：返回所有用户私密相册中照片的 photoId，照片墙统一排除。
  buildPrivateAlbumPhotoIdQuery() {
    return orm
      .select({ photoId: albumPhotoTab.photoId })
      .from(albumPhotoTab)
      .innerJoin(albumTab, eq(albumPhotoTab.albumId, albumTab.albumId))
      .where(eq(albumTab.visibility, AlbumVisibilityEnum.PRIVATE));
  },

  // 构造子查询：返回当前用户已收藏照片的 photoId，用于列表与日期统计的收藏筛选。
  buildUserFavoritePhotoIdQuery(userId: string) {
    return orm
      .select({ photoId: userFavoriteTab.photoId })
      .from(userFavoriteTab)
      .where(eq(userFavoriteTab.userId, userId));
  },

  // 查询指定照片集合中当前用户已收藏的 photoId 集合。
  async listUserFavoritePhotoIds(photoIds: string[], userId: string): Promise<Set<string>> {
    if (!photoIds.length) {
      return new Set();
    }

    const rows = await orm
      .select({ photoId: userFavoriteTab.photoId })
      .from(userFavoriteTab)
      .where(and(
        eq(userFavoriteTab.userId, userId),
        inArray(userFavoriteTab.photoId, photoIds)
      ));

    return new Set(rows.map((row) => row.photoId));
  },

  // 查询照片上传者的基础信息，返回 userId 到信息的映射，用于照片墙作者标识。
  async listUploaders(userIds: string[]): Promise<Map<string, { userId: string; username: string; avatar: string }>> {
    const uniqueIds = Array.from(new Set(userIds));

    if (!uniqueIds.length) {
      return new Map();
    }

    const rows = await orm
      .select({
        userId: userTab.userId,
        username: userTab.username,
        avatar: userTab.avatar
      })
      .from(userTab)
      .where(inArray(userTab.userId, uniqueIds));

    return new Map(rows.map((row) => [row.userId, row]));
  },

  // 设置当前用户指定照片的可见性（公开/私密），仅照片所有者可操作。
  async setVisibility(params: PhotoSetVisibilityBo, userId: string): Promise<void> {
    if (!params.photoIds?.length) {
      throw new BizError('photo.selectRequired');
    }

    if (params.visibility !== PhotoVisibilityEnum.PUBLIC && params.visibility !== PhotoVisibilityEnum.PRIVATE) {
      throw new BizError('photo.visibilityRequired');
    }

    await orm.update(photoTab)
      .set({
        visibility: params.visibility
      })
      .where(and(
        eq(photoTab.userId, userId),
        inArray(photoTab.photoId, params.photoIds)
      ));
  },

  // 查询指定照片集合的标签，返回 photoId 到标签列表的映射。
  async listTagsByPhotoIds(photoIds: string[]): Promise<Map<string, string[]>> {
    if (!photoIds.length) {
      return new Map();
    }

    const rows = await orm
      .select({
        photoId: photoTagTab.photoId,
        tag: photoTagTab.tag
      })
      .from(photoTagTab)
      .where(inArray(photoTagTab.photoId, photoIds));

    const tagMap = new Map<string, string[]>();

    for (const row of rows) {
      const tags = tagMap.get(row.photoId) ?? [];
      tags.push(row.tag);
      tagMap.set(row.photoId, tags);
    }

    return tagMap;
  },

  // 统计全部标签及对应照片数量，按数量倒序。
  async listTags(): Promise<PhotoTagVo[]> {
    const rows = await orm
      .select({
        tag: photoTagTab.tag,
        count: count(photoTagTab.photoId)
      })
      .from(photoTagTab)
      .groupBy(photoTagTab.tag)
      .orderBy(desc(count(photoTagTab.photoId)), asc(photoTagTab.tag));

    return rows.map((row) => ({
      tag: row.tag,
      count: Number(row.count),
    }));
  },

  // 整体替换当前用户指定照片的标签，仅照片所有者可操作。
  async setTags(params: PhotoSetTagsBo, userId: string): Promise<void> {
    const photoId = params.photoId?.trim();

    if (!photoId) {
      throw new BizError('photo.selectRequired');
    }

    const [photo] = await orm
      .select({ photoId: photoTab.photoId })
      .from(photoTab)
      .where(and(
        eq(photoTab.photoId, photoId),
        eq(photoTab.userId, userId)
      ))
      .limit(1);

    if (!photo) {
      return;
    }

    // 去重、去空、限制标签数量后整体替换。
    const tags = Array.from(new Set(
      (params.tags ?? [])
        .map((tag) => tag.trim())
        .filter(Boolean)
    )).slice(0, 20);

    await orm.transaction(async (tx) => {
      await tx.delete(photoTagTab)
        .where(eq(photoTagTab.photoId, photoId));

      if (tags.length) {
        await tx.insert(photoTagTab)
          .values(tags.map((tag) => ({ photoId, tag })));
      }
    });
  },

  // 根据原文件名生成存储 key，若 key 已存在则在扩展名前追加时间戳。
  async resolvePhotoKey(userId: string, name: string) {

    const trimmedName = name.trim();

    if (!trimmedName) {
      throw new BizError('photo.fileNameRequired');
    }

    let key = buildPhotoKey(userId, trimmedName);
    const [existing] = await orm
      .select({ fileId: fileTab.fileId })
      .from(fileTab)
      .where(eq(fileTab.key, key))
      .limit(1);

    if (existing) {
      const { baseName, extName } = splitFileName(trimmedName);
      key = buildPhotoKey(userId, `${baseName}_${formatFileTimestamp()}${extName}`);
    }

    return key;
  },

  // 按文件名生成 photos/userId/name 的 key，并返回直传凭证（S3 预签名 URL 或 Blob client token）。
  async createUrl(params: PhotoCreateUrlBo, userId: string): Promise<PhotoCreateUrlVo> {
    const fileName = params.fileName?.trim();
    const storageId = params.storageId?.trim();

    if (!fileName) {
      throw new BizError('photo.fileNameRequired');
    }

    if (!storageId) {
      throw new BizError('storage.configRequired');
    }

    const fileStorageList = await storageService.getStorageList();
    const fileStorage = fileStorageList.find((item) => item.storageId === storageId);

    if (!fileStorage) {
      throw new BizError('storage.notFound');
    }

    const key = await this.resolvePhotoKey(userId, fileName);
    const contentType = params.contentType?.trim() || 'application/octet-stream';
    const url = await storage.createUrl(key, storageId, contentType);

    return { url, key };
  },

  // 根据去重设置和 SHA-1 判断当前用户是否已有相同文件。
  async exists(params: PhotoExistsBo, userId: string): Promise<PhotoExistsVo> {
    const checksum = params.checksum?.trim();
    const name = params.name?.trim();

    if (!checksum || !name) {
      return { duplicate: false };
    }

    const setting = await settingService.get();

    if (setting.photoDedup !== SettingPhotoDedupEnum.ENABLE) {
      return { duplicate: false };
    }

    const [duplicatePhoto] = await orm
      .select({ photoId: photoTab.photoId })
      .from(photoTab)
      .where(and(
        eq(photoTab.userId, userId),
        eq(photoTab.checksum, checksum)
      ))
      .limit(1);

    return { duplicate: Boolean(duplicatePhoto) };
  },

  // 上传单张照片，后端生成 preview、thumbnail 和元信息。
  async add(form: FormData, userId: string): Promise<PhotoAddResultVo> {

    const file = form.get('file') as File | null;
    const storageId = String(form.get('storageId') ?? '');
    const albumId = String(form.get('albumId') ?? '');
    const lastModified = Number(form.get('lastModified') ?? 0);
    // 直传完成后传入的对象 key；有值时从存储读取原图。
    const uploadedKey = String(form.get('key') ?? '').trim();

    if (!file && !uploadedKey) {
      throw new BizError('photo.selectRequired');
    }

    if (!storageId) {
      throw new BizError('storage.configRequired');
    }

    const fileStorageList = await storageService.getStorageList();
    const fileStorage = fileStorageList.find((item) => item.storageId === storageId);

    if (!fileStorage) {
      throw new BizError('storage.notFound');
    }

    const { buffer, name, size, type } = await this.readPhotoUpload(file, uploadedKey, storageId);
    const checksum = await fileChecksum(new Blob([buffer]));

    if ((await this.exists({ checksum, name }, userId)).duplicate) {
      return { photo: null, duplicate: true };
    }

    // 图片处理（缩略图/预览/thumbHash）与 EXIF 解析相互独立，并行执行缩短上传耗时。
    const [images, meta] = await Promise.all([
      processPhotoImages(buffer),
      process.env.VERCEL
        ? readExifWithExifr(buffer)
        : readExifWithExiftool(buffer),
    ]);
    const takenTime = meta.takenTime ?? new Date(lastModified > 0 ? lastModified : Date.now()).toISOString();
    const key = uploadedKey || await this.resolvePhotoKey(userId, name);
    const photoId = createId();
    const preview = buildPreviewKey(checksum, photoId);
    const thumbnail = buildThumbnailKey(checksum, photoId);

    const cacheMetadata = [['Cache-Control', 'private, max-age=604800']];
    const keyMetadata = [
      ...cacheMetadata,
      ['Content-Disposition', buildContentDisposition(name)]
    ];

    // 已直传原图时不再重复 put 原图，只写入衍生图。
    const uploadFiles = uploadedKey
      ? []
      : [{
          key,
          body: buffer,
          type,
          metadata: keyMetadata,
        }];

    await storage.put([
      ...uploadFiles,
      {
        key: preview,
        body: images.previewBuffer,
        type: 'image/jpeg',
        metadata: cacheMetadata,
      },
      {
        key: thumbnail,
        body: images.thumbnailBuffer,
        type: 'image/webp',
        metadata: cacheMetadata,
      },
    ], storageId);

    const now = new Date().toISOString();

    const [photo] = await orm.insert(photoTab).values({
      photoId,
      name,
      thumbHash: images.thumbHash,
      checksum,
      type,
      typeDesc: type.split('/').pop() || type,
      size,
      width: images.width,
      height: images.height,
      takenTime,
      createTime: now,
      userId,
      status: PhotoStatusEnum.NORMAL,
      favorite: PhotoFavoriteEnum.NO,
      storageId
    }).returning();

    const files = await fileService.save([
      { fileId: createId(), photoId, key, type: FileTypeEnum.ORIGINAL, fileType: type, size },
      { fileId: createId(), photoId, key: preview, type: FileTypeEnum.PREVIEW, fileType: 'image/jpeg', size: images.previewBuffer.length },
      { fileId: createId(), photoId, key: thumbnail, type: FileTypeEnum.THUMBNAIL, fileType: 'image/webp', size: images.thumbnailBuffer.length },
    ]);

    await exifService.save(photoId, {
      exif: meta.exif,
      latitude: meta.latitude,
      longitude: meta.longitude,
      altitude: meta.altitude,
    });

    if (albumId) {
      await albumService.addPhoto({
        albumIds: [albumId],
        photoIds: [photo.photoId]
      }, userId);
    }

    const domain = formatHttpUrl(fileStorage.domain);

    return {
      photo: this.toPhotoVo(photo, files, fileStorage, domain, {
        photoId,
        exif: meta.exif,
        latitude: meta.latitude,
        longitude: meta.longitude,
        altitude: meta.altitude,
      }),
      duplicate: false,
    };
  },

  // 把当前用户的指定照片移动到回收站，并记录回收时间。
  async recycle(params: PhotoRecycleBo, userId: string): Promise<void> {
    if (!params.photoIds?.length) {
      throw new BizError('photo.selectRequired');
    }

    await orm.update(photoTab)
      .set({
        status: PhotoStatusEnum.DELETE,
        recycleTime: new Date().toISOString()
      })
      .where(and(
        eq(photoTab.userId, userId),
        inArray(photoTab.photoId, params.photoIds)
      ));
  },

  // 把指定用户的全部照片移动到回收站，并记录回收时间。
  async recycleByUserId(userId: string): Promise<void> {

    await orm.update(photoTab)
      .set({
        status: PhotoStatusEnum.DELETE,
        recycleTime: new Date(0).toISOString()
      })
      .where(eq(photoTab.userId, userId));
  },

  // 设置当前用户对指定照片的收藏状态，收藏记录按用户独立存储。
  async favorite(params: PhotoFavoriteBo, userId: string): Promise<void> {
    if (!params.photoIds?.length) {
      throw new BizError('photo.selectRequired');
    }

    if (!params.favorite) {
      throw new BizError('photo.favoriteRequired');
    }

    const photoIds = Array.from(new Set(params.photoIds));

    if (params.favorite === PhotoFavoriteEnum.YES) {
      // 收藏：批量写入 user_favorite，已存在的记录自动跳过。
      await orm.insert(userFavoriteTab)
        .values(photoIds.map((photoId) => ({ userId, photoId })))
        .onConflictDoNothing();
      return;
    }

    // 取消收藏：删除当前用户对应的收藏记录。
    await orm.delete(userFavoriteTab)
      .where(and(
        eq(userFavoriteTab.userId, userId),
        inArray(userFavoriteTab.photoId, photoIds)
      ));
  },

  // 恢复当前用户回收站中的指定照片。
  async restore(params: PhotoRestoreBo, userId: string): Promise<void> {
    if (!params.photoIds?.length) {
      throw new BizError('photo.selectRequired');
    }

    await orm.update(photoTab)
      .set({
        status: PhotoStatusEnum.NORMAL,
        recycleTime: null
      })
      .where(and(
        eq(photoTab.userId, userId),
        inArray(photoTab.photoId, params.photoIds)
      ));
  },

  // 彻底删除当前用户的指定照片文件和数据库记录。
  async delete(params: PhotoDeleteBo, userId: string): Promise<void> {
    if (!params.photoIds?.length) {
      throw new BizError('photo.selectRequired');
    }

    const fileStorageList = await storageService.list();

    const photos = await orm
      .select()
      .from(photoTab)
      .where(and(
        eq(photoTab.userId, userId),
        inArray(photoTab.photoId, params.photoIds)
      ));
    const photoIds = photos.map((photo) => photo.photoId);

    if (!photoIds.length) {
      return;
    }

    const fileMap = await fileService.listByPhotoIds(photoIds);

    for (const fileStorage of fileStorageList.list) {
      const keys = photos
        .filter((photo) => photo.storageId === fileStorage.storageId)
        .flatMap((photo) => (fileMap.get(photo.photoId) ?? []).map((item) => item.key));

      await storage.delete(keys, fileStorage.storageId);
    }

    await orm.delete(albumPhotoTab)
      .where(inArray(albumPhotoTab.photoId, photoIds));

    await orm.delete(userFavoriteTab)
      .where(inArray(userFavoriteTab.photoId, photoIds));

    await orm.delete(photoTagTab)
      .where(inArray(photoTagTab.photoId, photoIds));

    await fileService.deleteByPhotoIds(photoIds);

    await orm.delete(photoTab)
      .where(and(
        eq(photoTab.userId, userId),
        inArray(photoTab.photoId, photoIds)
      ));

    // 相册封面和照片数可能变化，失效相册列表缓存。
    await albumService.invalidateListCache(userId);
  },

  // 清理当前用户回收站中的照片文件和数据库记录。
  async clear(userId: string): Promise<void> {

    const setting = await settingService.get();
    const syncDelete = setting.syncDelete === SettingSyncDeleteEnum.ENABLE;
    const now = new Date().toISOString();

    await this.clearDeletedPhotos({
      userId,
      recycleTime: now,
      syncDelete
    });
  },

  // 定时清理超过设置保留天数的回收站照片文件和数据库记录。
  async clearExpired(): Promise<void> {

    const setting = await settingService.get();

    const syncDelete = setting.syncDelete === SettingSyncDeleteEnum.ENABLE;
    const expireTime = new Date(Date.now() - setting.clearLast * 24 * 60 * 60 * 1000).toISOString();

    await this.clearDeletedPhotos({
      recycleTime: expireTime,
      syncDelete
    });
  },

  // 按传入值循环清理回收站照片文件和数据库记录。
  async clearDeletedPhotos(params: { userId?: string, recycleTime: string, syncDelete: boolean }): Promise<void> {
    const fileStorageList = params.syncDelete ? await storageService.list() : null;

    while (true) {
      const whereList = [
        lte(photoTab.recycleTime, params.recycleTime),
        eq(photoTab.status, PhotoStatusEnum.DELETE)
      ];

      if (params.userId) {
        whereList.push(eq(photoTab.userId, params.userId));
      }

      // 每次只取 100 条，避免一次清理太多照片导致存储删除请求过大。
      const photos = await orm
        .select()
        .from(photoTab)
        .where(and(...whereList))
        .limit(100);

      if (!photos.length) {
        return;
      }

      const photoIds = photos.map((photo) => photo.photoId);
      const fileMap = await fileService.listByPhotoIds(photoIds);

      if (fileStorageList) {
        for (const fileStorage of fileStorageList.list) {

          const keys = photos
            .filter((photo) => photo.storageId === fileStorage.storageId)
            .flatMap((photo) => (fileMap.get(photo.photoId) ?? []).map((item) => item.key));
          await storage.delete(keys, fileStorage.storageId);

        }
      }

      await orm.delete(albumPhotoTab)
        .where(inArray(albumPhotoTab.photoId, photoIds));

      await orm.delete(userFavoriteTab)
        .where(inArray(userFavoriteTab.photoId, photoIds));

      await orm.delete(photoTagTab)
        .where(inArray(photoTagTab.photoId, photoIds));

      await fileService.deleteByPhotoIds(photoIds);

      await orm.delete(photoTab)
        .where(and(
          ...whereList,
          inArray(photoTab.photoId, photoIds)
        ));
    }
  },

  // 从文件列表取指定类型的存储 key。
  getFileKey(files: PhotoFile[], type: number): string | null {
    return files.find((file) => file.type === type)?.key ?? null;
  },

  // 把存储信息和文件 key 合并进照片返回对象。
  toPhotoVo(photo: Photo, files: PhotoFile[], fileStorage?: Storage, domain?: string, exifRow: Exif | null = null): PhotoVo {
    const key = this.getFileKey(files, FileTypeEnum.ORIGINAL) ?? '';
    const preview = this.getFileKey(files, FileTypeEnum.PREVIEW) ?? '';
    const thumbnail = this.getFileKey(files, FileTypeEnum.THUMBNAIL) ?? '';

    return {
      ...photo,
      exif: exifRow?.exif ?? null,
      latitude: exifRow?.latitude ?? null,
      longitude: exifRow?.longitude ?? null,
      altitude: exifRow?.altitude ?? null,
      key: toMediaUrl(key, domain, fileStorage?.type) ?? null,
      preview: toMediaUrl(preview, domain, fileStorage?.type) ?? null,
      thumbnail: toMediaUrl(thumbnail, domain, fileStorage?.type) ?? null,
      storageName: fileStorage?.name ?? null,
      storageTypeDesc: fileStorage
        ? StorageTypeOptions.find((item) => item.value === fileStorage.type)?.label ?? null
        : null,
      // 上传者信息由列表查询按需填充，其余场景默认为空。
      uploader: null,
      tags: []
    };
  },

  // 从上传文件或已直传的存储 key 读取照片字节及名称、大小、类型。
  async readPhotoUpload(
    file: File | null,
    key?: string,
    storageId?: string,
  ): Promise<{ buffer: Uint8Array<ArrayBuffer>; name: string; size: number; type: string }> {
    const trimmedKey = key?.trim();

    if (trimmedKey) {
      if (!storageId) {
        throw new BizError('storage.configRequired');
      }

      const object = await storage.get(trimmedKey, storageId, { as: 'uint8array' });
      // 零拷贝视图，把 body 的 buffer 限定为 ArrayBuffer 以满足 Blob 构造要求。
      const body = object.body as Uint8Array;
      const buffer = new Uint8Array(body.buffer, body.byteOffset, body.byteLength) as Uint8Array<ArrayBuffer>;
      const name = trimmedKey.split('/').pop() || trimmedKey;

      return {
        buffer,
        name,
        size: object.size || buffer.length,
        type: object.type || 'application/octet-stream',
      };
    }

    if (!file) {
      throw new BizError('photo.selectRequired');
    }

    return {
      buffer: new Uint8Array(await file.arrayBuffer()),
      name: file.name.trim(),
      size: file.size,
      type: file.type || 'application/octet-stream',
    };
  },
}

export { photoService }
