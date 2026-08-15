"use client"

import type { LucideIcon } from "lucide-react"

interface EmptyStateProps {
  // 空状态图标。
  icon: LucideIcon
  // 主标题。
  title: string
  // 辅助说明。
  description?: string
}

// 渲染列表为空时的占位提示，居中展示图标、标题与说明。
export function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-24 text-center">
      <Icon className="size-12 text-muted-foreground/40" aria-hidden />
      <p className="text-base font-medium text-muted-foreground">{title}</p>
      {description && (
        <p className="max-w-sm text-sm text-muted-foreground/70">{description}</p>
      )}
    </div>
  )
}
