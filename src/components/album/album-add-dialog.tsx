"use client"

import { useState, type KeyboardEvent } from "react"
import { Plus } from "lucide-react"
import { useTranslations } from "next-intl"

import { Dialog } from "@/components/common/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AlbumVisibilityEnum, AlbumVisibilityOptions } from "@/server/enums/album-enum"

interface AlbumAddDialogProps {
  title: string
  onNameConfirm: (name: string, visibility?: number) => void
}

// 渲染新增相册弹窗，并在确认后把相册名和可见性交给父组件。
export function AlbumAddDialog({ title, onNameConfirm }: AlbumAddDialogProps) {
  const t = useTranslations("albums")
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [visibility, setVisibility] = useState<string>(String(AlbumVisibilityEnum.PUBLIC))

  // 提交输入的相册名称和可见性。
  function submitName() {
    const value = name.trim()

    if (!value) {
      return
    }

    onNameConfirm(value, Number(visibility) as number)
    setName("")
    setVisibility(String(AlbumVisibilityEnum.PUBLIC))
    setOpen(false)
  }

  // 处理输入框回车确认。
  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      submitName()
    }
  }

  // 处理弹窗打开状态变化。
  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)

    if (!nextOpen) {
      setName("")
      setVisibility(String(AlbumVisibilityEnum.PUBLIC))
    }
  }

  return (
    <Dialog
      title={title}
      className="w-full"
      open={open}
      onOpenChange={handleOpenChange}
      onConfirm={submitName}
      trigger={
        <Button
          type="button"
          size="icon"
          variant="ghost"
        >
          <Plus />
        </Button>
      }
    >
      <div className="space-y-4">
        <Input
          value={name}
          placeholder={t("namePlaceholder")}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={handleInputKeyDown}
        />
        <div>
          <label className="text-sm font-medium mb-2 block">{t("visibility.label")}</label>
          <Select value={visibility} onValueChange={setVisibility}>
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
          <p className="text-xs text-muted-foreground mt-1.5">
            {visibility === String(AlbumVisibilityEnum.PUBLIC)
              ? t("visibility.publicDesc")
              : t("visibility.privateDesc")}
          </p>
        </div>
      </div>
    </Dialog>
  )
}
