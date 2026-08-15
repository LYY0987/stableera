"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"

import { Dialog } from "@/components/common/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AlbumVisibilityEnum, AlbumVisibilityOptions } from "@/server/enums/album-enum"

interface AlbumVisibilityDialogProps {
  open: boolean
  visibility: number
  onOpenChange: (open: boolean) => void
  onVisibilityConfirm: (visibility: number) => void
}

// 渲染修改相册可见性弹窗。
export function AlbumVisibilityDialog({ 
  open, 
  visibility, 
  onOpenChange, 
  onVisibilityConfirm 
}: AlbumVisibilityDialogProps) {
  const t = useTranslations("albums")
  // inputVisibility 保存弹框中选择的可见性。
  const [inputVisibility, setInputVisibility] = useState(String(visibility))
  // prevSyncKey 记录上一次的打开状态与可见性，变化时在渲染期同步选项。
  const [prevSyncKey, setPrevSyncKey] = useState(`${open}:${visibility}`)
  const syncKey = `${open}:${visibility}`

  // 弹框打开或目标可见性变化时同步选择，保证每次打开都展示当前可见性。
  if (prevSyncKey !== syncKey) {
    setPrevSyncKey(syncKey)
    setInputVisibility(String(visibility))
  }

  // 提交修改的可见性。
  function submitVisibility() {
    onVisibilityConfirm(Number(inputVisibility) as number)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("visibilityTitle")}
      className="w-full"
      showCloseButton={false}
      onConfirm={submitVisibility}
    >
      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium mb-2 block">{t("visibility.label")}</label>
          <Select value={inputVisibility} onValueChange={setInputVisibility}>
            <SelectTrigger>
              <SelectValue placeholder={t("visibility.placeholder")} />
            </SelectTrigger>
            <SelectContent>
              {AlbumVisibilityOptions.map((option) => (
                <SelectItem key={option.value} value={String(option.value)}>
                  {t(`visibility.${option.label}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="text-xs text-muted-foreground">
          {inputVisibility === String(AlbumVisibilityEnum.PUBLIC)
            ? t("visibility.publicDesc")
            : t("visibility.privateDesc")}
        </p>
      </div>
    </Dialog>
  )
}
