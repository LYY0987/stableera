"use client"

import { useEffect } from "react"

// 根错误边界：页面渲染异常时兜底展示，并提供刷新恢复入口。

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-50 px-4 text-center dark:bg-black">
      <p className="text-6xl font-semibold text-muted-foreground">500</p>
      <h1 className="text-xl font-medium">页面出错了 / Something went wrong</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        加载页面时发生错误，请重试或稍后再来。
        <br />
        An error occurred while loading this page. Please try again.
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
      >
        重试 / Try again
      </button>
    </main>
  )
}
