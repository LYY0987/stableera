"use client"

import { useEffect, useState } from "react"
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

  useEffect(() => {
    setInputVisibility(String(visibility))
  }, [visibility, open])

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
