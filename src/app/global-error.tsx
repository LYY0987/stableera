"use client"

// 全局错误边界：根布局自身渲染失败时的最终兜底，必须自带 html/body。

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="zh">
      <body style={{ margin: 0, background: "#09090b", color: "#fafafa" }}>
        <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 16, textAlign: "center" }}>
          <p style={{ fontSize: 56, fontWeight: 600, margin: 0, opacity: 0.6 }}>500</p>
          <h1 style={{ fontSize: 20, margin: 0 }}>应用发生严重错误 / Fatal error</h1>
          <p style={{ fontSize: 14, opacity: 0.7, maxWidth: 360, margin: 0 }}>
            应用初始化失败，请刷新页面重试。{error?.message ? `（${error.message}）` : ""}
          </p>
          <button
            type="button"
            onClick={reset}
            style={{ padding: "8px 16px", borderRadius: 6, background: "#fafafa", color: "#09090b", fontSize: 14, border: "none", cursor: "pointer" }}
          >
            重试 / Try again
          </button>
        </main>
      </body>
    </html>
  )
}
