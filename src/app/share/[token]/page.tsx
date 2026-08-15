import { notFound } from "next/navigation"
import { albumService } from "@/server/service/album-service"
import { photoService } from "@/server/service/photo-service"
import { PhotoStatusEnum, PhotoVisibilityEnum } from "@/server/enums/photo-enum"

interface SharePageProps {
  params: Promise<{ token: string }>
}

// 把照片媒体地址加上分享令牌，匿名用户可凭令牌访问 /media 代理。
function toShareUrl(url: string | null, token: string) {
  if (!url) {
    return url
  }

  return url.startsWith("/media/") ? `${url}?share=${token}` : url
}

// 渲染相册公开分享页，无需登录即可浏览相册内的公开照片。
export default async function SharePage({ params }: SharePageProps) {
  const { token } = await params
  const share = await albumService.getShareByToken(token)

  if (!share) {
    notFound()
  }

  const album = await albumService.getOwned(share.albumId, share.userId)

  if (!album) {
    notFound()
  }

  const data = await photoService.list({
    size: 500,
    cursorPhotoId: null,
    cursorTime: null,
    favorite: null,
    status: PhotoStatusEnum.NORMAL,
    albumId: share.albumId,
  }, share.userId)

  // 分享仅展示标记为公开的照片，照片所有者设为私密的照片不出现在分享中。
  const photos = data.list.filter((photo) => photo.visibility === PhotoVisibilityEnum.PUBLIC)

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-8 text-zinc-100">
      <header className="mx-auto mb-6 max-w-5xl">
        <h1 className="text-xl font-semibold">{album.name}</h1>
        <p className="mt-1 text-sm text-zinc-400">{photos.length} 张照片</p>
      </header>
      {photos.length ? (
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
          {photos.map((photo) => (
            <a
              key={photo.photoId}
              href={toShareUrl(photo.key, share.shareId) ?? "#"}
              target="_blank"
              rel="noreferrer"
              className="block aspect-square overflow-hidden rounded-md bg-zinc-800"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={toShareUrl(photo.preview, share.shareId) ?? toShareUrl(photo.thumbnail, share.shareId) ?? ""}
                alt={photo.name}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </a>
          ))}
        </div>
      ) : (
        <p className="mx-auto max-w-5xl text-center text-sm text-zinc-500">这个相册还没有可分享的照片。</p>
      )}
    </main>
  )
}
