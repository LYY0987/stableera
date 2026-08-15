import Link from "next/link"

// 全局 404 页面，路由不存在或数据不存在时展示，并引导返回首页。

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-50 px-4 text-center dark:bg-black">
      <p className="text-6xl font-semibold text-muted-foreground">404</p>
      <h1 className="text-xl font-medium">页面不存在 / Page not found</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        你访问的页面不存在或已被移动。
        <br />
        The page you are looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/"
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
      >
        返回首页 / Back to home
      </Link>
    </main>
  )
}
