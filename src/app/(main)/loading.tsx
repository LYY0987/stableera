import { LoaderCircle } from "lucide-react"

// 路由切换时的全局加载占位，避免侧边栏跳转等待时出现空白。
export default function Loading() {
  return (
    <div className="flex h-full min-h-[60vh] flex-col items-center justify-center gap-3 px-4 text-muted-foreground">
      <LoaderCircle className="size-8 animate-spin" aria-hidden />
    </div>
  )
}
