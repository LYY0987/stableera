import { PrivateProvider } from "./provider"
import { getProxyUser } from "@/server/lib/proxy-user"
import { PHOTO_LIST_PAGE_SIZE } from "@/server/const/global"
import { photoService } from "@/server/service/photo-service"
import { PhotoVisibilityEnum } from "@/server/enums/photo-enum"

interface PrivateLayoutProps {
  children: React.ReactNode
}

// 服务端查询当前用户私密照片第一页，并提供给 /private 页面初始化列表。
export default async function PrivateLayout({ children }: PrivateLayoutProps) {
  const proxyUser = await getProxyUser()

  if (!proxyUser) {
    return null
  }

  const data = await photoService.list({
    size: PHOTO_LIST_PAGE_SIZE,
    cursorPhotoId: null,
    cursorTime: null,
    favorite: null,
    status: null,
    albumId: null,
    visibility: PhotoVisibilityEnum.PRIVATE,
  }, proxyUser.userId)

  return (
    <PrivateProvider initialPhotos={data.list}>
      {children}
    </PrivateProvider>
  )
}
