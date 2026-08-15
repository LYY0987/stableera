import { Hono } from 'hono';
import type { Context, Next } from 'hono';
import { storage } from '@/server/storage/storage';
import { orm } from '@/server/infra/db';
import { photoTab } from '@/server/entity/photo';
import { fileTab } from '@/server/entity/file';
import { albumPhotoTab } from '@/server/entity/album-photo';
import { albumTab } from '@/server/entity/album';
import { eq, and } from 'drizzle-orm';
import { AlbumVisibilityEnum } from '@/server/enums/album-enum';
import { PhotoStatusEnum, PhotoVisibilityEnum } from '@/server/enums/photo-enum';
import { contextStorage } from 'hono/context-storage';
import { getUserId, setUserId } from '@/server/security/context';
import { resolveLoginInfo } from '@/server/security/security';
import { cors } from 'hono/cors';
import { buildContentDisposition } from '@/server/lib/file';
import { FileTypeEnum } from '@/server/enums/file-enum';
import BizError from '@/server/error/biz-error';
import { i18nMiddleware, t } from '@/server/i18n';
import { albumService } from '@/server/service/album-service';
import type { HonoEnv } from './type';

// 这个模块处理照片媒体读取接口，路径为 /media/{key}。
// 登录用户按可见性规则读取；匿名用户仅可凭分享令牌读取共享相册中的公开照片。

const media = new Hono<HonoEnv>();
media.use('*', cors());
media.use('*', contextStorage());
media.use('*', i18nMiddleware);
// 解析登录用户上下文：有有效会话时写入 userId，匿名用户直接放行走分享令牌鉴权。
media.use('*', async (c: Context, next: Next) => {
  const authInfo = await resolveLoginInfo(c);

  if (authInfo) {
    setUserId(authInfo.userId);
  }

  await next();
});
media.onError((err, c) => {
  if (err instanceof BizError) {
    return c.text(t(err.message), 500);
  }
  console.error(err);
  return c.text(err.message, 500);
});

// 查询文件对应的照片信息；登录用户遵循照片可见性，匿名用户需携带有效分享令牌。
async function getPhotoFile(key: string, shareToken?: string) {

  const userId = getUserId();

  if (!userId) {
    return null;
  }

  const [row] = await orm
    .select({
      key: fileTab.key,
      type: fileTab.type,
      fileType: fileTab.fileType,
      name: photoTab.name,
      photoId: photoTab.photoId,
      storageId: photoTab.storageId,
      ownerUserId: photoTab.userId,
      status: photoTab.status,
      visibility: photoTab.visibility
    })
    .from(fileTab)
    .innerJoin(photoTab, eq(fileTab.photoId, photoTab.photoId))
    .where(eq(fileTab.key, key))
    .limit(1);

  if (!row) {
    return null;
  }

  // 登录用户：照片所有者始终可读；其他用户只能读取未删除、公开且未加入私密相册的照片。
  if (userId) {
    if (row.ownerUserId !== userId) {
      const [privatePhoto] = await orm
        .select({
          photoId: albumPhotoTab.photoId
        })
        .from(albumPhotoTab)
        .innerJoin(albumTab, eq(albumPhotoTab.albumId, albumTab.albumId))
        .where(and(
          eq(albumPhotoTab.photoId, row.photoId),
          eq(albumTab.visibility, AlbumVisibilityEnum.PRIVATE)
        ))
        .limit(1);

      if (row.status !== PhotoStatusEnum.NORMAL || row.visibility !== PhotoVisibilityEnum.PUBLIC || privatePhoto) {
        return null;
      }
    }

    return row;
  }

  // 匿名用户：仅当分享令牌有效且照片属于被分享相册时允许读取。
  const share = shareToken ? await albumService.getShareByToken(shareToken) : null;

  if (!share) {
    return null;
  }

  const [sharedPhoto] = await orm
    .select({
      photoId: albumPhotoTab.photoId
    })
    .from(albumPhotoTab)
    .where(and(
      eq(albumPhotoTab.albumId, share.albumId),
      eq(albumPhotoTab.photoId, row.photoId)
    ))
    .limit(1);

  // 已删除或标记为私密的照片不出现在分享链接中。
  if (!sharedPhoto || row.status !== PhotoStatusEnum.NORMAL || row.visibility !== PhotoVisibilityEnum.PUBLIC) {
    return null;
  }

  return row;
}

media.get('*', async (c: Context, next: Next) => {

  if (!c.req.path.startsWith('/media/')) {
    return next();
  }

  const key = decodeURIComponent(c.req.path.slice('/media/'.length));
  // 匿名分享访问通过 ?share=令牌 授权。
  const shareToken = c.req.query('share');

  const photoFile = await getPhotoFile(key, shareToken);

  if (!photoFile?.key || !photoFile?.storageId) {
    return next();
  }

  // 以 uint8array 读取，Hono 的 Response body 只接受 ArrayBuffer 视图。
  const obj = await storage.get(photoFile.key, photoFile.storageId, { as: 'uint8array' });
  const disposition = photoFile.type === FileTypeEnum.ORIGINAL ? buildContentDisposition(photoFile.name) : null;
  const headers: Record<string, string> = {
    'Content-Type': photoFile.fileType,
    // 照片墙公开后媒体可被共享缓存（CDN/浏览器）复用，加快他人重复访问。
    'Cache-Control': 'public, max-age=604800',
    'Content-Length': String(obj.size)
  };

  if (disposition) {
    headers['Content-Disposition'] = disposition;
  }

  const body = obj.body as Uint8Array;
  return c.body(new Uint8Array(body.buffer, body.byteOffset, body.byteLength) as Uint8Array<ArrayBuffer>, 200, headers);
})

export { media };
