"use client"

import { memo, useEffect, useRef, useState, useLayoutEffect } from "react"
import { flushSync } from "react-dom"
import {
  MasonryScroller,
  type Positioner,
  usePositioner,
} from "masonic"

import { useApp } from "@/app/(main)/provider"
import { useIsMobile } from "@/hooks/use-mobile"
import { useImagePreload } from "@/hooks/use-image-preload"
import { PhotoCard } from "@/components/photo/photo-card"
import { PhotoSelectionDrawer } from "@/components/photo/photo-selection-drawer"
import { type PhotoVo } from "@/server/entity/vo/photo"
import { PhotoVisibilityEnum } from "@/server/enums/photo-enum"

interface PhotoMasonryProps {
  photos: PhotoVo[]
  resetKey?: number
  onReachBottom: () => void
  onPhotoOpen?: (index: number) => void
  onPhotoFavorite?: (index: number, setFavorite: (favorite: boolean) => void) => void
  onPhotoDelete?: (photoIds: string[]) => void
  onPhotoRestore?: (photoIds: string[]) => void
  onPhotoVisibility?: (photoIds: string[], visibility: number) => void
  onAlbumOpen?: (photoIds: string[]) => void
  onAlbumRemove?: (photoIds: string[]) => void
}

// 把 rem 单位转换为当前根字号下的 px。
function remToPx(rem: number) {
  const rootFontSize = parseFloat(
    getComputedStyle(document.documentElement).fontSize
  )

  return rem * rootFontSize
}

// 根据侧边栏状态计算瀑布流初始化宽度。
function getInitialWrapWidth(sidebarOpen: boolean) {
  const width = window.innerWidth

  if (width < 768) {
    return width
  }

  return width - remToPx(sidebarOpen ? 14.25 : 3.25)
}

// 计算照片在当前列宽下的真实高度。
function getPhotoHeight(photo: PhotoVo, columnWidth: number) {
  const ratio = photo.width && photo.height ? photo.height / photo.width : 1

  return Math.max(1, Math.round(columnWidth * ratio))
}

// 同步每张照片高度到 masonic positioner。
function syncPhotoPositioner(items: PhotoVo[], columnWidth: number, positioner: Positioner) {
  const updates: number[] = []

  items.forEach((photo, index) => {
    const height = getPhotoHeight(photo, columnWidth)
    const current = positioner.get(index)

    if (!current) {
      positioner.set(index, height)
    } else if (current.height !== height) {
      updates.push(index, height)
    }
  })

  if (updates.length) {
    positioner.update(updates)
  }
}

// 渲染照片瀑布流，并在窗口触底时通知父组件加载更多。
const PhotoMasonry = memo(function PhotoMasonry({
  photos,
  resetKey = 0,
  onReachBottom,
  onPhotoOpen,
  onPhotoFavorite,
  onPhotoDelete,
  onPhotoRestore,
  onPhotoVisibility,
  onAlbumOpen,
  onAlbumRemove,
}: PhotoMasonryProps) {
  const { sidebarOpen, userInfo } = useApp()
  // currentUserId 标记当前登录用户，照片墙中只有本人照片可以管理（删除/加入相册等）。
  const currentUserId = userInfo?.userId
  // isMobile 判断当前是否为移动端视口。
  const isMobile = useIsMobile()
  // 预加载 hook
  const { shouldPreload, preloadImages } = useImagePreload({
    threshold: 2000,
    enableCache: true,
    preloadCount: 5,
  })
  // wrapRef 用于监听瀑布流外层真实可视宽度。
  const wrapRef = useRef<HTMLDivElement | null>(null)
  // onReachBottomRef 用于保存最新的触底回调。
  const onReachBottomRef = useRef(onReachBottom)
  // windowHeight 用于告诉 masonic 当前虚拟滚动可视高度。
  const [windowHeight, setWindowHeight] = useState(() => window.innerHeight)
  // wrapPosition 记录瀑布流外层容器的页面位置和布局宽度。
  const [wrapPosition, setWrapPosition] = useState({ offset: 0, width: getInitialWrapWidth(sidebarOpen) })
  // selectedPhotoIds 记录当前选中的照片 id。
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([])
  // touchHoverCloseRef 记录当前展示悬浮信息照片的关闭方法。
  const touchHoverCloseRef = useRef<(() => void) | null>(null)
  const width = wrapPosition.width
  const columnWidth = innerWidth < 768 ? (width - 4) / 2 : 240
  const positioner = usePositioner(
    {
      width,
      columnWidth,
      columnGutter: 4,
      rowGutter: 4,
    },
    [resetKey]
  )

  syncPhotoPositioner(photos, positioner.columnWidth, positioner)
  const visibleSelectedPhotoIds = selectedPhotoIds.filter((photoId) => photos.some((photo) => photo.photoId === photoId))
  // 批量管理操作只作用于当前用户自己的照片，其他人的公开照片仅可查看。
  const ownedSelectedPhotoIds = visibleSelectedPhotoIds.filter((photoId) => (
    photos.find((photo) => photo.photoId === photoId)?.userId === currentUserId
  ))


  useEffect(() => {
    // 保持触底回调为父组件传入的最新方法。
    onReachBottomRef.current = onReachBottom
  }, [onReachBottom])

  useEffect(() => {
    // 更新窗口高度，供 masonic 计算可视区域。
    function handleResize() {
      setWindowHeight(window.innerHeight)
    }

    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
    }
  }, [])

  useLayoutEffect(() => {
    // 监听瀑布流外层可视容器宽度变化。
    const container = wrapRef.current

    if (!container) {
      return
    }

    const containerEl = container
    let timerId: number | null = null

    // 计算瀑布流外层距离页面顶部的位置。
    function getOffset() {
      let offset = 0
      let el: HTMLElement | null = containerEl

      while (el) {
        offset += el.offsetTop
        el = el.offsetParent as HTMLElement | null
      }

      return offset
    }

    // 获取瀑布流外层当前的位置和宽度。
    function getWrapPosition() {
      return {
        offset: getOffset(),
        width: containerEl.offsetWidth,
      }
    }

    // 强制同步瀑布流外层的位置和宽度。
    function syncWrapPosition() {
      setWrapPosition(getWrapPosition())
    }

    // 测量瀑布流外层的位置和宽度，首次同步完成后再强制读取一次。
    function measureWrapPosition() {
      const nextPosition = getWrapPosition()
      let needSync = false

      flushSync(() => {
        setWrapPosition((prev) => {
          const widthDiff = Math.abs(prev.width - nextPosition.width)
          const sameOffset = prev.offset === nextPosition.offset

          if (widthDiff <= 10 && sameOffset) {
            return prev
          }

          needSync = true
          return nextPosition
        })
      })

      if (needSync) {
        syncWrapPosition()
      }
    }

    // 把 ResizeObserver 的通知防抖到停止变化 300ms 后处理。
    function updateWrapPosition() {
      if (timerId !== null) {
        window.clearTimeout(timerId)
      }

      timerId = window.setTimeout(() => {
        timerId = null
        measureWrapPosition()
      }, 350)
    }

    syncWrapPosition()

    const resizeObserver = new ResizeObserver(updateWrapPosition)

    resizeObserver.observe(containerEl)

    return () => {
      if (timerId !== null) {
        window.clearTimeout(timerId)
      }

      resizeObserver.disconnect()
    }
  }, [])

  useEffect(() => {
    // 处理窗口触底，通知父组件请求下一页照片。
    function handleWindowScroll() {
      if (touchHoverCloseRef.current) {
        touchHoverCloseRef.current()
        touchHoverCloseRef.current = null
      }

      const bottomDistance = document.documentElement.scrollHeight - window.scrollY - window.innerHeight
      let threshold = isMobile ? 7000 : 2200

      if (photos.length >= 200) {
        threshold *= 1.5
      }

      if (bottomDistance <= threshold) {
        onReachBottomRef.current()
      }

      // 智能预加载：当用户接近底部时预加载下一批照片
      if (shouldPreload() && photos.length > 0) {
        // 获取可见范围之外的照片（用于预加载）
        const scrollTop = window.scrollY
        const viewportHeight = window.innerHeight
        const nextPhotoIndex = Math.ceil((scrollTop + viewportHeight) / 200) // 估算位置
        const preloadStart = Math.min(nextPhotoIndex, photos.length)
        const preloadPhotos = photos.slice(preloadStart, preloadStart + 10).map(photo => ({
          photoId: photo.photoId,
          url: photo.thumbnail || null,
        }))

        if (preloadPhotos.length > 0) {
          preloadImages(preloadPhotos).catch(() => {
            // 预加载失败，继续正常流程
          })
        }
      }
    }

    window.addEventListener("scroll", handleWindowScroll)

    return () => {
      window.removeEventListener("scroll", handleWindowScroll)
    }
  }, [isMobile, photos.length])

  // 切换照片选择数组中的 photoId。
  function changePhotoSelected(photoId: string, selected: boolean) {
    setSelectedPhotoIds((prev) => {
      if (selected) {
        return prev.includes(photoId) ? prev : [...prev, photoId]
      }

      return prev.filter((id) => id !== photoId)
    })
  }

  // 清空当前照片列表中的选中项。
  function clearSelectedPhotos() {
    setSelectedPhotoIds([])
  }

  // 从列表前面开始补选照片，最多选中 100 张。
  function selectFirstPhotos() {
    setSelectedPhotoIds((prev) => {
      const visibleIds = prev.filter((photoId) => photos.some((photo) => photo.photoId === photoId))
      const allPhotosSelected = photos.length > 0 && photos.every((photo) => visibleIds.includes(photo.photoId))

      if (visibleIds.length >= 100 || allPhotosSelected) {
        return []
      }

      const remainTotal = Math.max(0, 100 - visibleIds.length)

      if (!remainTotal) {
        return visibleIds
      }

      const selectedSet = new Set(visibleIds)
      const idsToAdd = photos
        .map((photo) => photo.photoId)
        .filter((photoId) => !selectedSet.has(photoId))
        .slice(0, remainTotal)

      return [...visibleIds, ...idsToAdd]
    })
  }

  // 清空选中状态后把当前选中的本人照片 id 传给页面删除。
  function deleteSelectedPhotos() {
    const photoIds = ownedSelectedPhotoIds
    clearSelectedPhotos()
    onPhotoDelete?.(photoIds)
  }

  // 把当前选中的本人照片 id 传给页面恢复。
  function restoreSelectedPhotos() {
    onPhotoRestore?.(ownedSelectedPhotoIds)
    clearSelectedPhotos()
  }

  // 把当前选中的本人照片 id 传给页面打开相册选择。
  function openAlbumDialog() {
    onAlbumOpen?.(ownedSelectedPhotoIds)
    clearSelectedPhotos()
  }

  // 清空选中状态后把当前选中的本人照片 id 传给页面移出相册。
  function removeAlbumPhotos() {
    const photoIds = ownedSelectedPhotoIds
    clearSelectedPhotos()
    onAlbumRemove?.(photoIds)
  }

  // 批量切换选中本人照片的可见性：全部私密时改为公开，否则改为私密。
  function toggleSelectedVisibility() {
    const photoIds = ownedSelectedPhotoIds
    const allPrivate = photoIds.length > 0 && photoIds.every((photoId) => (
      photos.find((photo) => photo.photoId === photoId)?.visibility === PhotoVisibilityEnum.PRIVATE
    ))
    const target = allPrivate ? PhotoVisibilityEnum.PUBLIC : PhotoVisibilityEnum.PRIVATE

    clearSelectedPhotos()
    onPhotoVisibility?.(photoIds, target)
  }

  return (
    <>
      <PhotoSelectionDrawer
        open={visibleSelectedPhotoIds.length > 0}
        onClose={clearSelectedPhotos}
        onDelete={ownedSelectedPhotoIds.length > 0 ? deleteSelectedPhotos : undefined}
        onSelectAll={selectFirstPhotos}
        onRestore={onPhotoRestore ? restoreSelectedPhotos : undefined}
        visibilityTarget={onPhotoVisibility && ownedSelectedPhotoIds.length > 0
          ? ownedSelectedPhotoIds.every((photoId) => photos.find((photo) => photo.photoId === photoId)?.visibility === PhotoVisibilityEnum.PRIVATE)
            ? PhotoVisibilityEnum.PUBLIC
            : PhotoVisibilityEnum.PRIVATE
          : undefined}
        onVisibilityToggle={onPhotoVisibility && ownedSelectedPhotoIds.length > 0 ? toggleSelectedVisibility : undefined}
        onAlbumOpen={onAlbumOpen && ownedSelectedPhotoIds.length > 0 ? openAlbumDialog : undefined}
        onAlbumRemove={onAlbumRemove && ownedSelectedPhotoIds.length > 0 ? removeAlbumPhotos : undefined}
      />
      <div ref={wrapRef} className="w-full overflow-x-hidden">
        <MasonryScroller
          className="outline-transparent"
          items={photos}
          positioner={positioner}
          offset={wrapPosition.offset}
          height={windowHeight}
          itemKey={(item) => item.photoId}
          overscanBy={3}
          render={(props) => (
            <PhotoCard
              {...props}
              selected={visibleSelectedPhotoIds.includes(props.data.photoId)}
              selectionActive={visibleSelectedPhotoIds.length > 0}
              onOpen={() => onPhotoOpen?.(props.index)}
              onFavoriteChange={onPhotoFavorite}
              onSelectedChange={changePhotoSelected}
              touchHoverCloseRef={touchHoverCloseRef}
            />
          )}
        />
      </div>
    </>
  )
})

export { PhotoMasonry }
