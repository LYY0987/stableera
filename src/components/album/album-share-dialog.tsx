"use client"

import { useEffect, useState } from "react"
import { CheckIcon, CopyIcon, LinkIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/common/dialog"
import { Input } from "@/components/ui/input"
import { albumShareCreate, albumShareDelete, albumShareStatus } from "@/request/album"
import { type AlbumVo } from "@/server/entity/vo/album"

interface AlbumShareDialogProps {
  open: boolean
  album: AlbumVo | null
  onOpenChange: (open: boolean) => void
}

// 渲染相册分享弹窗：生成/复制/撤销分享链接。
export function AlbumShareDialog({ open, album, onOpenChange }: AlbumShareDialogProps) {
  const t = useTranslations("albums")
  // token 保存当前相册的分享令牌，null 表示尚未分享。
  const [token, setToken] = useState<string | null>(null)
  // loading 标记分享链接生成或撤销中。
  const [loading, setLoading] = useState(false)
  // copied 标记链接是否刚复制成功，用于切换图标。
  const [copied, setCopied] = useState(false)
  // syncKey 标记弹窗打开状态与目标相册，变化时在渲染期重置分享状态。
  const syncKey = open ? `open:${album?.albumId ?? ""}` : "closed"
  const [prevSyncKey, setPrevSyncKey] = useState(syncKey)

  // 弹窗打开或切换相册时重置分享状态。
  if (prevSyncKey !== syncKey) {
    setPrevSyncKey(syncKey)
    setToken(null)
    setCopied(false)
  }

  // 弹窗打开时查询当前相册的分享状态。
  useEffect(() => {
    if (!open || !album) {
      return
    }

    albumShareStatus({ albumId: album.albumId })
      .then((share) => setToken(share?.token ?? null))
      .catch(() => {
        // 错误已由 http 拦截器统一提示。
      })
  }, [open, album])

  // 生成分享链接。
  function createShare() {
    if (!album) {
      return
    }

    setLoading(true)
    albumShareCreate({ albumId: album.albumId })
      .then((share) => {
        setToken(share.token)
        toast.success(t("share.created"))
      })
      .finally(() => setLoading(false))
  }

  // 撤销分享链接。
  function revokeShare() {
    if (!album) {
      return
    }

    setLoading(true)
    albumShareDelete({ albumId: album.albumId })
      .then(() => {
        setToken(null)
        toast.success(t("share.revoked"))
      })
      .finally(() => setLoading(false))
  }

  // 复制分享链接到剪贴板。
  async function copyLink() {
    if (!token) {
      return
    }

    const url = `${window.location.origin}/share/${token}`

    await navigator.clipboard.writeText(url)
    setCopied(true)
    toast.success(t("share.copied"))
    setTimeout(() => setCopied(false), 2000)
  }

  const shareUrl = token ? `${window.location.origin}/share/${token}` : ""

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("share.title")}
      className="w-full"
      showCloseButton={false}
      onConfirm={() => onOpenChange(false)}
    >
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">{t("share.description")}</p>
        {token ? (
          <>
            <div className="flex items-center gap-2">
              <Input readOnly value={shareUrl} className="flex-1" />
              <Button type="button" variant="secondary" size="icon" onClick={copyLink} aria-label={t("share.copy")}>
                {copied ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
              </Button>
            </div>
            <Button type="button" variant="destructive" size="sm" onClick={revokeShare} disabled={loading}>
              <Trash2Icon className="size-4" />
              {t("share.revoke")}
            </Button>
          </>
        ) : (
          <Button type="button" onClick={createShare} disabled={loading}>
            <LinkIcon className="size-4" />
            {t("share.create")}
          </Button>
        )}
      </div>
    </Dialog>
  )
}
