"use client"

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react"
import { LoaderCircle, RefreshCw, User, Lock, ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { type LoginBo } from "@/server/entity/bo/login"
import { useTranslations } from "next-intl"
import { getCaptcha } from "@/request/captcha"

interface LoginFormProps extends React.ComponentProps<"div"> {
  title: string
  loading?: boolean
  onLogin: (params: LoginBo) => void
}

export function LoginForm({
  className,
  title,
  loading = false,
  onLogin,
  ...props
}: LoginFormProps) {
  const t = useTranslations("login")
  // form 保存登录表单的用户名、密码和验证码字段。
  const [form, setForm] = useState<LoginBo>({
    username: "",
    password: "",
    captchaId: "",
    captchaCode: "",
  })
  // captchaImage 保存当前验证码图片的 data URL。
  const [captchaImage, setCaptchaImage] = useState("")
  // captchaLoading 标记验证码图片是否正在加载。
  const [captchaLoading, setCaptchaLoading] = useState(false)
  // refreshLockRef 防止验证码刷新被重复触发。
  const refreshLockRef = useRef(false)

  // 拉取一张新的验证码图片并更新 captchaId。
  const refreshCaptcha = useCallback(async () => {
    if (refreshLockRef.current) {
      return
    }
    refreshLockRef.current = true
    setCaptchaLoading(true)
    try {
      const data = await getCaptcha()
      setCaptchaImage(data.image)
      setForm((prev) => ({ ...prev, captchaId: data.captchaId, captchaCode: "" }))
    } catch {
      // 错误已由 http 拦截器统一提示，这里仅吞掉异常。
    } finally {
      setCaptchaLoading(false)
      refreshLockRef.current = false
    }
  }, [])

  // 若配置了演示账号，则预填到登录表单，并加载首张验证码。
  useEffect(() => {
    const username = process.env.NEXT_PUBLIC_DEMO_USERNAME
    const password = process.env.NEXT_PUBLIC_DEMO_PASSWORD

    if (username || password) {
      setForm((prev) => ({
        username: username || prev.username,
        password: password || prev.password,
        captchaId: prev.captchaId,
        captchaCode: prev.captchaCode,
      }))
    }

    refreshCaptcha()
  }, [refreshCaptcha])

  // 更新登录表单字段。
  function updateField(field: keyof LoginBo, value: string) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  // 提交登录表单，把用户名、密码和验证码传给登录页面。
  function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    onLogin({
      username: form.username.trim(),
      password: form.password,
      captchaId: form.captchaId,
      captchaCode: form.captchaCode.trim(),
    })
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <form onSubmit={submitLogin} className="flex flex-col gap-5">
        {/* 用户名输入：带图标、聚焦时图标变粉色 */}
        <div className="relative group">
          <User className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400 transition-colors group-focus-within:text-pink-500" />
          <Input
            type="text"
            placeholder={t("username")}
            value={form.username}
            onChange={(event) => updateField("username", event.target.value)}
            className="h-12 rounded-xl border-slate-200/80 bg-white/70 pl-11 pr-4 text-[15px] shadow-sm backdrop-blur-sm transition-all placeholder:text-slate-400 focus-visible:border-pink-400 focus-visible:ring-pink-400/20"
            required
          />
        </div>

        {/* 密码输入：带图标、聚焦时图标变粉色 */}
        <div className="relative group">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400 transition-colors group-focus-within:text-pink-500" />
          <Input
            type="password"
            placeholder={t("password")}
            value={form.password}
            onChange={(event) => updateField("password", event.target.value)}
            className="h-12 rounded-xl border-slate-200/80 bg-white/70 pl-11 pr-4 text-[15px] shadow-sm backdrop-blur-sm transition-all placeholder:text-slate-400 focus-visible:border-pink-400 focus-visible:ring-pink-400/20"
            required
          />
        </div>

        {/* 验证码：左侧输入框 + 右侧可点击刷新的图片 */}
        <div className="relative group flex gap-3">
          <div className="relative flex-1">
            <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400 transition-colors group-focus-within:text-pink-500" />
            <Input
              type="text"
              placeholder={t("captchaPlaceholder")}
              value={form.captchaCode}
              onChange={(event) => updateField("captchaCode", event.target.value)}
              className="h-12 rounded-xl border-slate-200/80 bg-white/70 pl-11 pr-4 text-[15px] shadow-sm backdrop-blur-sm transition-all placeholder:text-slate-400 focus-visible:border-pink-400 focus-visible:ring-pink-400/20"
              maxLength={6}
              autoComplete="off"
              required
            />
          </div>
          <button
            type="button"
            onClick={refreshCaptcha}
            disabled={captchaLoading}
            title={t("captchaAlt")}
            aria-label={t("captchaAlt")}
            className="relative h-12 w-32 shrink-0 overflow-hidden rounded-xl border border-slate-200/80 bg-white/70 shadow-sm backdrop-blur-sm transition-all hover:border-pink-300 hover:shadow-md disabled:opacity-60"
          >
            {/* captchaLoading 时显示刷新图标转圈，否则显示验证码图片 */}
            {captchaLoading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-50">
                <RefreshCw className="size-4 animate-spin text-slate-400" />
              </div>
            ) : captchaImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={captchaImage}
                alt={t("captchaAlt")}
                className="h-full w-full object-cover"
                draggable={false}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-50">
                <RefreshCw className="size-4 text-slate-400" />
              </div>
            )}
          </button>
        </div>

        {/* 提交按钮：粉色渐变背景 + 悬停上浮 */}
        <Button
          type="submit"
          disabled={loading}
          className="mt-2 h-12 gap-2 rounded-xl bg-gradient-to-r from-pink-500 via-rose-500 to-orange-400 text-base font-medium shadow-lg shadow-pink-500/25 transition-all hover:shadow-xl hover:shadow-pink-500/40 hover:brightness-105 disabled:opacity-70 disabled:shadow-none"
        >
          {loading && <LoaderCircle className="size-4 animate-spin" />}
          {t("signIn")}
        </Button>
      </form>
    </div>
  )
}
