"use client"

import { useLayoutEffect, useRef, useState } from "react"
import { useRouter, useServerInsertedHTML } from "next/navigation"
import { useTheme, type Theme } from "@/app/provider"
import { LoginForm } from "@/components/login/login-form"
import { login } from "@/request/login"
import { getCaptcha } from "@/request/captcha"
import { type LoginBo } from "@/server/entity/bo/login"
import { Camera, Sparkles, Shield, Images } from "lucide-react"
import { useTranslations } from "next-intl"

// 登录页：左侧品牌展示区 + 右侧表单区，提交登录后跳转主体页面。
export default function AuthPage() {
  const title = process.env.TITLE || "StableEra"
  const t = useTranslations("login")
  // loading 标记登录请求是否正在提交。
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  // previousTheme 保存进入登录页前的主题，离开时恢复。
  const previousThemeRef = useRef<Theme>(theme)

  useServerInsertedHTML(() => (
    <script
      dangerouslySetInnerHTML={{
        __html: `(function(){var el=document.documentElement;el.classList.remove("dark");el.style.colorScheme="light";})();`,
      }}
    />
  ))

  // rewrite 不会改地址栏，进入登录页后强制同步为 /auth。
  useLayoutEffect(() => {
    if (window.location.pathname !== "/auth") {
      window.history.replaceState(null, "", "/auth")
    }
  }, [])

  // 进入登录页强制浅色，离开时恢复原主题。
  useLayoutEffect(() => {
    previousThemeRef.current = theme
    document.documentElement.classList.remove("dark")
    document.documentElement.style.colorScheme = "light"

    return () => {
      setTheme(previousThemeRef.current)
    }
  }, [setTheme])

  // 请求登录接口，成功后跳转照片页面，失败时刷新验证码。
  function handleLogin(params: LoginBo) {
    setLoading(true)

    login(params)
      .then(() => {
        router.replace("/photos")
      })
      .catch(() => {
        setLoading(false)
        // 登录失败时主动刷新验证码，避免使用过期验证码再次提交。
        getCaptcha().catch(() => {
          // 刷新失败由 http 拦截器统一提示。
        })
      })
  }

  return (
    <div className="relative isolate flex min-h-screen w-full overflow-hidden bg-[#fefcff]">
      {/* 背景层：多层径向渐变光晕 + 噪点纹理 */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `
            radial-gradient(circle at 20% 30%, rgba(255, 182, 193, 0.45), transparent 55%),
            radial-gradient(circle at 80% 70%, rgba(173, 216, 230, 0.45), transparent 55%),
            radial-gradient(circle at 50% 100%, rgba(255, 218, 185, 0.35), transparent 60%)`,
        }}
      />
      {/* 浮动装饰球：缓慢上下移动，增加灵动感 */}
      <div className="pointer-events-none absolute left-[8%] top-[15%] z-0 size-72 rounded-full bg-gradient-to-br from-pink-300/40 to-rose-300/30 blur-3xl animate-pulse" />
      <div
        className="pointer-events-none absolute right-[12%] bottom-[18%] z-0 size-80 rounded-full bg-gradient-to-br from-sky-300/40 to-indigo-300/30 blur-3xl animate-pulse"
        style={{ animationDelay: "1.5s" }}
      />

      {/* 左侧品牌展示区（桌面端显示） */}
      <aside className="relative z-10 hidden w-1/2 flex-col justify-between p-12 lg:flex xl:p-16">
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-white/60 shadow-lg shadow-pink-500/10 backdrop-blur-sm">
            <Camera className="size-6 text-pink-500" />
          </div>
          <span className="text-2xl font-semibold tracking-tight text-slate-800">{title}</span>
        </div>

        <div className="flex flex-col gap-6">
          <h1 className="text-balance text-5xl font-bold leading-tight tracking-tight text-slate-800 xl:text-6xl">
            {t("tagline")}
          </h1>
          <p className="max-w-md text-lg text-slate-600">{t("subtitle")}</p>

          <ul className="mt-4 flex flex-col gap-4">
            <li className="flex items-center gap-3 text-slate-700">
              <span className="flex size-9 items-center justify-center rounded-xl bg-white/70 shadow-sm backdrop-blur-sm">
                <Images className="size-4 text-pink-500" />
              </span>
              <span className="text-[15px]">{t("feature1")}</span>
            </li>
            <li className="flex items-center gap-3 text-slate-700">
              <span className="flex size-9 items-center justify-center rounded-xl bg-white/70 shadow-sm backdrop-blur-sm">
                <Sparkles className="size-4 text-pink-500" />
              </span>
              <span className="text-[15px]">{t("feature2")}</span>
            </li>
            <li className="flex items-center gap-3 text-slate-700">
              <span className="flex size-9 items-center justify-center rounded-xl bg-white/70 shadow-sm backdrop-blur-sm">
                <Shield className="size-4 text-pink-500" />
              </span>
              <span className="text-[15px]">{t("feature3")}</span>
            </li>
          </ul>
        </div>

        <p className="text-sm text-slate-400">© {new Date().getFullYear()} {title}. All rights reserved.</p>
      </aside>

      {/* 右侧表单区 */}
      <main className="relative z-10 flex w-full flex-col items-center justify-center p-6 md:p-10 lg:w-1/2">
        <div className="flex w-full max-w-sm flex-col gap-8">
          {/* 移动端 Logo（桌面端已显示在左侧） */}
          <div className="flex items-center justify-center gap-3 lg:hidden">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-white/70 shadow-lg shadow-pink-500/10 backdrop-blur-sm">
              <Camera className="size-5 text-pink-500" />
            </div>
            <span className="text-xl font-semibold tracking-tight text-slate-800">{title}</span>
          </div>

          {/* 玻璃拟态卡片容器 */}
          <div className="rounded-3xl border border-white/60 bg-white/60 p-8 shadow-2xl shadow-pink-500/10 backdrop-blur-xl md:p-10">
            <div className="mb-7 flex flex-col gap-2">
              <h2 className="text-2xl font-semibold text-slate-800">{t("signIn")}</h2>
              <p className="text-sm text-slate-500">{t("description")}</p>
            </div>

            <LoginForm title={title} loading={loading} onLogin={handleLogin} />
          </div>
        </div>
      </main>
    </div>
  )
}
