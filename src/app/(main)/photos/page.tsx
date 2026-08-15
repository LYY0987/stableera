'use client';
import dynamic from "next/dynamic"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { Button } from "@/components/ui/button"
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
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { PhotoMasonry } from "@/components/photo/photo-masonry"
import { PHOTO_LIST_PAGE_SIZE } from "@/server/const/global"
import { PhotoFavoriteEnum } from "@/server/enums/photo-enum"
import { photoFavorite, photoRecycle, photoSetVisibility } from "@/request/photo"
import { albumAddPhoto } from "@/request/album"
import { usePhotoStore } from "@/store/photo-store"
import { Plus, Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { PhotoDateDrawer } from "@/components/photo/photo-date-drawer"
import { PhotoMasonrySkeleton } from "@/components/photo/photo-masonry-skeleton"
import { ScrollToTop } from "@/components/photo/scroll-to-top"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { usePhotoContext } from "./provider"
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

// 渲染照片列表页面。
export default function Page() {
  const t = useTranslations("photos")
  const { initialPhotos } = usePhotoContext()
  const { sidebarOpen, setSidebarOpen, refreshAlbums } = useApp()
  // isBrowser 标记当前是否在浏览器环境，SSR 阶段显示骨架屏。
  const isBrowser = useIsBrowser()
  const {
    photos,
    masonryKey,
    loadMorePhotos,
    refreshPhotoList,
    prependPhotos,
    removePhotos,
  } = usePhotoList({}, PHOTO_LIST_PAGE_SIZE, initialPhotos)
  const [modelPhotoIndex, setModelPhotoIndex] = useState(0)
  const [showPhotoViewer, setShowPhotoViewer] = useState(false)
  // albumDialogOpen 控制加入相册弹框的打开状态。
  const [albumDialogOpen, setAlbumDialogOpen] = useState(false)
  // albumPhotoIds 保存本次要加入相册的照片 id。
  const [albumPhotoIds, setAlbumPhotoIds] = useState<string[]>([])
  // keyword 保存搜索输入框当前文本，输入停止 300ms 后触发列表刷新。
  const [keyword, setKeyword] = useState("")
  // filterRef 保存当前生效的非分页筛选条件（关键词 + 时间范围），保证多次筛选可叠加。
  const filterRef = useRef<{ keyword: string | null, startTakenTime: string | null, endTakenTime: string | null }>({
    keyword: null,
    startTakenTime: null,
    endTakenTime: null,
  })
  // isFirstSearchRef 标记是否为首次触发搜索 effect，避免覆盖服务端首屏数据。
  const isFirstSearchRef = useRef(true)
  const openUpload = usePhotoStore((state) => state.openUpload)
  const uploadedPhotos = usePhotoStore((state) => state.uploadedPhotos)

  useLayoutEffect(() => {
    // 刷新最近页时禁用浏览器滚动恢复，并回到照片列表顶部。
    const previousScrollRestoration = window.history.scrollRestoration

    window.history.scrollRestoration = 'manual'
    window.scrollTo(0, 0)

    return () => {
      window.history.scrollRestoration = previousScrollRestoration
    }
  }, [])

  useEffect(() => {
    // 消费上传成功队列，把成功照片按 taken_time 插入列表对应位置。
    if (!uploadedPhotos.length) {
      return
    }

    const photosToAdd = usePhotoStore.getState().takeUploadedPhotos()

    if (!photosToAdd.length) {
      return
    }

    queueMicrotask(() => {
      prependPhotos(photosToAdd)
    })
  }, [prependPhotos, uploadedPhotos])

  // 关键词输入停止 300ms 后刷新列表，首次渲染跳过以保留服务端首屏数据。
  useEffect(() => {
    if (isFirstSearchRef.current) {
      isFirstSearchRef.current = false
      return
    }

    const timer = setTimeout(() => {
      const nextKeyword = keyword.trim() || null

      if (nextKeyword === filterRef.current.keyword) {
        return
      }

      filterRef.current.keyword = nextKeyword
      refreshPhotoList({
        keyword: nextKeyword,
        startTakenTime: filterRef.current.startTakenTime,
        endTakenTime: filterRef.current.endTakenTime,
      })
    }, 300)

    return () => clearTimeout(timer)
  }, [keyword, refreshPhotoList])

  // 打开照片详情 model。
  const openPhoto = useCallback((index: number) => {
    setModelPhotoIndex(index)
    setShowPhotoViewer(true)
  }, [])

  // 关闭照片详情 model。
  function closePhoto() {
    setShowPhotoViewer(false)
  }

  // 根据照片下标切换单张照片收藏状态。
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

  // 批量设置选中照片的可见性，并同步本地状态。
  const changePhotoVisibility = useCallback((photoIds: string[], visibility: number) => {
    photoSetVisibility({ photoIds, visibility }).then(() => {
      photos.forEach((photo) => {
        if (photoIds.includes(photo.photoId)) {
          photo.visibility = visibility
        }
      })
    })
  }, [photos])

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

  // 保存当前选择的照片时间范围，并叠加当前关键词一起触发列表刷新。
  function changePhotoTime(range: { startDate: Date, endDate: Date }) {
    filterRef.current.startTakenTime = range.startDate.toISOString()
    filterRef.current.endTakenTime = range.endDate.toISOString()
    refreshPhotoList({
      keyword: filterRef.current.keyword,
      startTakenTime: filterRef.current.startTakenTime,
      endTakenTime: filterRef.current.endTakenTime,
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
                      <span>{t("title")}</span>
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
            <div className="fixed left-[calc(100vw-5.75rem)]  md:left-[calc(100vw-6.25rem)] top-0 flex h-12 items-center gap-1 px-4">
              <PhotoDateDrawer onRangeChange={changePhotoTime} />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => openUpload(null)}
                    aria-label={t("actions.upload")}
                  >
                    <Plus />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t("actions.upload")}</TooltipContent>
              </Tooltip>
            </div>
            <div className="pointer-events-none absolute inset-y-0 left-1/2 flex pr-28 sm:pr-32 md:left-[calc(50%+1rem)]">
              <div className="pointer-events-auto relative m-auto w-full min-w-0 max-w-[14rem] sm:max-w-xs">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder={t("searchPlaceholder")}
                  aria-label={t("searchPlaceholder")}
                  className="h-8 rounded-full border-none bg-muted/50 pl-8 pr-2 focus-visible:ring-1"
                />
              </div>
            </div>
          </header>
          <div className="px-1 md:pl-1 md:pr-0">
            {isBrowser ? (
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
