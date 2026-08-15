'use client';
import dynamic from "next/dynamic"
import { AppSidebar } from "@/components/layout/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { usePhotoList } from "@/hooks/use-photo-list"
import { useIsBrowser } from "@/hooks/use-is-browser"

import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import { PhotoMasonry } from "@/components/photo/photo-masonry"
import { PHOTO_LIST_PAGE_SIZE } from "@/server/const/global"
import { PhotoFavoriteEnum, PhotoVisibilityEnum } from "@/server/enums/photo-enum"
import { photoFavorite, photoRecycle, photoSetVisibility } from "@/request/photo"
import { albumAddPhoto } from "@/request/album"
import { LockKeyhole } from "lucide-react"
import { PhotoMasonrySkeleton } from "@/components/photo/photo-masonry-skeleton"
import { EmptyState } from "@/components/common/empty-state"
import { ScrollToTop } from "@/components/photo/scroll-to-top"
import { usePrivateContext } from "./provider"
import { useApp } from "@/app/(main)/provider"
import { useTranslations } from "next-intl"

const AlbumSelectDialog = dynamic(
  () => import("@/components/album/album-select-dialog").then((mod) => mod.AlbumSelectDialog),
  { ssr: false }
)

const PhotoViewer = dynamic(
  () => import("@/components/photo/photo-viewer").then((mod) => mod.PhotoViewer),
  { ssr: false }
)

// 渲染私密照片列表页面，方便查看私密照片并快速切换回公开。
export default function Page() {
  const t = useTranslations("private")
  const { initialPhotos } = usePrivateContext()
  const { sidebarOpen, setSidebarOpen, refreshAlbums } = useApp()
  // isBrowser 标记当前是否在浏览器环境，SSR 阶段显示骨架屏。
  const isBrowser = useIsBrowser()
  const {
    photos,
    masonryKey,
    loadMorePhotos,
    removePhotos,
  } = usePhotoList({ visibility: PhotoVisibilityEnum.PRIVATE }, PHOTO_LIST_PAGE_SIZE, initialPhotos)
  const [modelPhotoIndex, setModelPhotoIndex] = useState(0)
  const [showPhotoViewer, setShowPhotoViewer] = useState(false)
  // albumDialogOpen 控制加入相册弹框的打开状态。
  const [albumDialogOpen, setAlbumDialogOpen] = useState(false)
  // albumPhotoIds 保存本次要加入相册的照片 id。
  const [albumPhotoIds, setAlbumPhotoIds] = useState<string[]>([])

  useLayoutEffect(() => {
    // 刷新私密照片页时禁用浏览器滚动恢复，并回到列表顶部。
    const previousScrollRestoration = window.history.scrollRestoration

    window.history.scrollRestoration = 'manual'
    window.scrollTo(0, 0)

    return () => {
      window.history.scrollRestoration = previousScrollRestoration
    }
  }, [])

  // 打开照片详情 model。
  const openPhoto = useCallback((index: number) => {
    setModelPhotoIndex(index)
    setShowPhotoViewer(true)
  }, [])

  // 关闭照片详情 model。
  function closePhoto() {
    setShowPhotoViewer(false)
  }

  // 切换单张照片收藏状态。
  const changePhotoFavorite = useCallback((index: number, setFavorite: (favorite: boolean) => void) => {
    const photo = photos[index]
    const favorite = photo.favorite === PhotoFavoriteEnum.YES
      ? PhotoFavoriteEnum.NO
      : PhotoFavoriteEnum.YES

    photoFavorite({ photoIds: [photo.photoId], favorite }).then(() => {
      setFavorite(favorite === PhotoFavoriteEnum.YES)
      photo.favorite = favorite
    })
  }, [photos])

  // 批量回收选中的照片。
  const recyclePhotos = useCallback((photoIds: string[]) => {
    photoRecycle({ photoIds }).then(() => {
      removePhotos(photoIds)
    })
  }, [removePhotos])

  // 批量设置选中照片的可见性：设为公开后照片离开私密专区。
  const changePhotoVisibility = useCallback((photoIds: string[], visibility: number) => {
    photoSetVisibility({ photoIds, visibility }).then(() => {
      if (visibility === PhotoVisibilityEnum.PUBLIC) {
        removePhotos(photoIds)
      } else {
        photos.forEach((photo) => {
          if (photoIds.includes(photo.photoId)) {
            photo.visibility = visibility
          }
        })
      }
    })
  }, [photos, removePhotos])

  // 打开批量加入相册弹框。
  const openAlbumDialog = useCallback((photoIds: string[]) => {
    setAlbumPhotoIds(photoIds)
    setAlbumDialogOpen(true)
  }, [])

  // 选中相册后把照片加入相册。
  function changePhotoAlbum(albumIds: string[]) {
    albumAddPhoto({ albumIds, photoIds: albumPhotoIds }).then(() => {
      void refreshAlbums()
    })
  }

  return (
    <>
      <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <AppSidebar />
        <SidebarInset>
          <header
            className="sticky top-0 z-20 flex h-12 shrink-0 items-center justify-between gap-2 bg-background transition-[width,height] ease-linear">
            <div className="flex min-w-0 items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator
                orientation="vertical"
                className="mr-2 data-vertical:h-4 data-vertical:self-auto"
              />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbPage className="flex items-center gap-2">
                      <LockKeyhole className="size-4" />
                      <span>{t("title")}</span>
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>
          <div className="px-1 md:pl-1 md:pr-0">
            {isBrowser ? (
              photos.length > 0 ? (
                <PhotoMasonry
                  photos={photos}
                  resetKey={masonryKey}
                  onReachBottom={loadMorePhotos}
                  onPhotoOpen={openPhoto}
                  onPhotoFavorite={changePhotoFavorite}
                  onPhotoDelete={recyclePhotos}
                  onPhotoVisibility={changePhotoVisibility}
                  onAlbumOpen={openAlbumDialog}
                />
              ) : (
                <EmptyState icon={LockKeyhole} title={t("emptyTitle")} description={t("emptyDescription")} />
              )
            ) : (
              <PhotoMasonrySkeleton photos={initialPhotos} />
            )}
          </div>
          {isBrowser && <ScrollToTop />}
        </SidebarInset>
      </SidebarProvider>
      <PhotoViewer
        open={showPhotoViewer}
        index={modelPhotoIndex}
        photos={photos}
        onBack={closePhoto}
        onBrowserBack={closePhoto}
      />
      <AlbumSelectDialog
        open={albumDialogOpen}
        onOpenChange={setAlbumDialogOpen}
        onAlbumSelect={changePhotoAlbum}
      />
    </>
  )
}
