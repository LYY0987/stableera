"use client"

import { useMemo } from "react"
import { type RenderComponentProps } from "masonic"
import Link from "next/link"
import { LockIcon, GlobeIcon } from "lucide-react"

import { AlbumActionMenu } from "@/components/album/album-action-menu"
import { getThumbHashUrl } from "@/lib/thumb-hash"
import { type AlbumVo } from "@/server/entity/vo/album"
import { useAlbumStore } from "@/store/album-store"
import { AlbumVisibilityEnum } from "@/server/enums/album-enum"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useTranslations } from "next-intl"

type AlbumCardProps = Partial<RenderComponentProps<AlbumVo>> & {
  data: AlbumVo
  href?: string
  onRename?: (album: AlbumVo) => void
  onTop?: (album: AlbumVo) => void
  onVisibility?: (album: AlbumVo) => void
  onShare?: (album: AlbumVo) => void
  onDelete?: (album: AlbumVo) => void
}

// 渲染虚拟列表中的单个相册卡片。
export function AlbumCard({ data, width, href, onRename, onTop, onVisibility, onShare, onDelete }: AlbumCardProps) {
  const t = useTranslations("albums")
  const setCurrentAlbumName = useAlbumStore((state) => state.setCurrentAlbumName)
  const thumbnailSrc = data.thumbnail
  const placeholder = useMemo(() => getThumbHashUrl(data.thumbHash), [data.thumbHash])
  const isPrivate = data.visibility === AlbumVisibilityEnum.PRIVATE

  // 点击进入相册前记录当前相册名称，供照片页面包屑展示。
  function saveCurrentAlbumName() {
    setCurrentAlbumName(data.name)
  }

  // 把重命名操作和当前相册交给上层页面。
  function renameAlbum() {
    onRename?.(data)
  }

  // 把可见性操作和当前相册交给上层页面。
  function changeAlbumVisibility() {
    onVisibility?.(data)
  }

  // 把分享操作和当前相册交给上层页面。
  function shareAlbum() {
    onShare?.(data)
  }

  // 把置顶操作和当前相册交给上层页面。
  function topAlbum() {
    onTop?.(data)
  }

  // 把删除操作和当前相册交给上层页面。
  function deleteAlbum() {
    onDelete?.(data)
  }

  return (
    <div
      className="group relative aspect-square overflow-hidden bg-muted"
      style={{ width }}
    >
      <Link
        href={href ?? `/albums/${data.albumId}`}
        prefetch={false}
        className="absolute inset-0 block"
        onClick={saveCurrentAlbumName}
      >
        {placeholder && (
          <img
            src={placeholder}
            alt=""
            className="absolute inset-0 h-full w-full scale-110 blur-sm"
            aria-hidden
          />
        )}
        {thumbnailSrc ? (
          <img
            src={thumbnailSrc}
            alt={data.name}
            crossOrigin="anonymous"
            className="absolute inset-0 h-full w-full object-cover duration-300 group-hover:scale-105"
            onError={(event) => {
              event.currentTarget.style.display = "none"
            }}
          />
        ) : (
          <div className="absolute inset-0 bg-[#DDDDDD] dark:bg-muted" />
        )}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 p-3 pb-2 text-left text-white"
          style={{
            filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.4)) drop-shadow(0 0 1px rgba(0,0,0,0.3))",
          }}
        >
          <div className="text-base font-normal">
            {data.photoTotal}
          </div>
          <div className="max-w-full truncate text-lg font-semibold">
            {data.name}
          </div>
        </div>
        {/* 可见性标记 */}
        <div className="absolute top-[4px] left-[4px] z-10">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="inline-flex">
                {isPrivate ? (
                  <LockIcon
                    size={20}
                    className="text-white"
                    style={{
                      filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.5)) drop-shadow(0 0 1px rgba(0,0,0,0.3))",
                    }}
                  />
                ) : (
                  <GlobeIcon
                    size={20}
                    className="text-white"
                    style={{
                      filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.5)) drop-shadow(0 0 1px rgba(0,0,0,0.3))",
                    }}
                  />
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {isPrivate ? t("visibility.private") : t("visibility.public")}
            </TooltipContent>
          </Tooltip>
        </div>
      </Link>
      {onRename && onTop && onVisibility && onShare && onDelete && (
        <div className="absolute top-[4px] right-[4px] z-10">
          <AlbumActionMenu
            shadow={Boolean(thumbnailSrc)}
            onRename={renameAlbum}
            onTop={topAlbum}
            onVisibility={changeAlbumVisibility}
            onShare={shareAlbum}
            onDelete={deleteAlbum}
          />
        </div>
      )}
    </div>
  )
}
