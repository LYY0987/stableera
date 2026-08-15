"use client"

import { useLayoutEffect, useRef, useState, useEffect } from "react"
import { useRouter, useServerInsertedHTML } from "next/navigation"
import { useTheme, type Theme } from "@/app/provider"
import { LoginForm } from "@/components/login/login-form"
import { useTranslations } from "next-intl"
import ringImg from "@/assets/ring.png"
import s2Img from "@/assets/s2.png"
import s3Img from "@/assets/s3.png"
import s4Img from "@/assets/s4.png"
import s5Img from "@/assets/s5.png"
import s6Img from "@/assets/s6.png"
import s7Img from "@/assets/s7.png"
import s8Img from "@/assets/s8.png"

// 星空粒子组件：canvas 绘制随机星点，带闪烁和缓慢漂移动画。
function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // stars 保存所有星点的位置、半径、透明度和闪烁速度。
    type Star = { x: number; y: number; r: number; alpha: number; speed: number }
    let stars: Star[] = []
    let animationId: number

    // 根据画布尺寸生成星点，密度随面积自适应。
    function generateStars() {
      const w = canvas!.width
      const h = canvas!.height
      const count = Math.floor((w * h) / 6000)
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.5 + 0.3,
        alpha: Math.random(),
        speed: Math.random() * 0.015 + 0.005,
      }))
    }

    // 调整画布尺寸到窗口大小，并重新生成星点。
    function resize() {
      canvas!.width = window.innerWidth
      canvas!.height = window.innerHeight
      generateStars()
    }

    // 绘制一帧：清空画布后逐个绘制星点，更新透明度实现闪烁。
    function draw() {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height)
      for (const s of stars) {
        s.alpha += s.speed
        if (s.alpha > 1 || s.alpha < 0.1) {
          s.speed = -s.speed
        }
        ctx!.beginPath()
        ctx!.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx!.fillStyle = `rgba(200, 220, 255, ${Math.max(0.1, Math.min(1, s.alpha))})`
        ctx!.fill()
      }
      animationId = requestAnimationFrame(draw)
    }

    resize()
    draw()
    window.addEventListener("resize", resize)

    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener("resize", resize)
    }
  }, [])

  return <canvas ref={canvasRef} className="absolute inset-0 z-0 h-full w-full" />
}

// Logo 圆环组件：ring 顺时针 + 双层文字环绕 + 中心 logo。
function LogoRing({ title, size = 280 }: { title: string; size?: number }) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* 最外层 ring.png 顺时针旋转 */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={ringImg.src}
        alt=""
        className="absolute inset-0 h-full w-full object-contain animate-spin-clockwise opacity-60"
        draggable={false}
      />

      {/* 外层 StableEra 文字环绕，逆时针旋转 */}
      <svg
        viewBox="0 0 240 240"
        className="absolute inset-0 h-full w-full animate-spin-counterclockwise text-cyan-300/70"
      >
        <defs>
          <path
            id={`text-outer-${size}`}
            d="M 120,120 m -100,0 a 100,100 0 1,1 200,0 a 100,100 0 1,1 -200,0"
            fill="none"
          />
        </defs>
        <text
          fontSize="12"
          fontWeight="500"
          letterSpacing="5"
          fill="currentColor"
        >
          <textPath href={`#text-outer-${size}`}>
            {`StableEra · StableEra · StableEra · StableEra · StableEra · `}
          </textPath>
        </text>
      </svg>

      {/* 中心 logo 圆形显示 */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.png"
        alt={title}
        className="relative z-10 size-24 rounded-full object-cover shadow-2xl shadow-cyan-500/20 ring-2 ring-cyan-500/20"
        draggable={false}
      />
    </div>
  )
}

// 登录页：居中悬浮卡片，左侧 Logo 圆环 + 右侧表单，星空背景 + 装饰图。
export default function AuthPage() {
  const title = process.env.TITLE || "StableEra"
  const t = useTranslations("login")
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  // previousTheme 保存进入登录页前的主题，离开时恢复。
  const previousThemeRef = useRef<Theme>(theme)

  useServerInsertedHTML(() => (
    <script
      dangerouslySetInnerHTML={{
        __html: `(function(){var el=document.documentElement;el.classList.add("dark");el.style.colorScheme="dark";})();`,
      }}
    />
  ))

  // rewrite 不会改地址栏，进入登录页后强制同步为 /auth。
  useLayoutEffect(() => {
    if (window.location.pathname !== "/auth") {
      window.history.replaceState(null, "", "/auth")
    }
  }, [])

  // 进入登录页强制深色星空主题，离开时恢复原主题。
  useLayoutEffect(() => {
    previousThemeRef.current = theme
    document.documentElement.classList.add("dark")
    document.documentElement.style.colorScheme = "dark"

    return () => {
      setTheme(previousThemeRef.current)
    }
  }, [setTheme])

  // 登录成功后跳转照片页面。
  function handleLoginSuccess() {
    router.replace("/photos")
  }

  // 装饰图配置：src、位置、大小、动画延迟。
  const decorations = [
    { src: s2Img.src, className: "left-[2%] top-[6%] w-32 lg:w-44", delay: "0s", duration: "4s" },
    { src: s3Img.src, className: "right-[8%] top-[10%] w-24 lg:w-32", delay: "0.8s", duration: "5s" },
    { src: s4Img.src, className: "left-[5%] bottom-[8%] w-28 lg:w-36", delay: "1.2s", duration: "6s" },
    { src: s5Img.src, className: "right-[3%] bottom-[12%] w-36 lg:w-48", delay: "2s", duration: "4.5s" },
    { src: s6Img.src, className: "left-[12%] top-[45%] w-20 lg:w-28", delay: "0.5s", duration: "5.5s" },
    { src: s7Img.src, className: "right-[14%] top-[50%] w-22 lg:w-30", delay: "1.8s", duration: "4.8s" },
    { src: s8Img.src, className: "left-[45%] bottom-[3%] w-24 lg:w-32", delay: "2.5s", duration: "5.2s" },
  ]

  return (
    <div className="relative isolate flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#0a0e1a] p-6">
      {/* 背景层：星空粒子 canvas */}
      <Starfield />

      {/* 背景层：深空径向渐变光晕 */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `
            radial-gradient(circle at 20% 30%, rgba(34, 211, 238, 0.08), transparent 55%),
            radial-gradient(circle at 80% 70%, rgba(20, 184, 166, 0.08), transparent 55%)`,
        }}
      />

      {/* 背景装饰图：各角浮动 */}
      {decorations.map((dec, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={i}
          src={dec.src}
          alt=""
          className={`pointer-events-none absolute z-0 opacity-15 animate-pulse ${dec.className}`}
          style={{ animationDuration: dec.duration, animationDelay: dec.delay }}
          draggable={false}
        />
      ))}

      {/* 居中悬浮卡片：半透明让星空贯穿 */}
      <div className="relative z-10 flex w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-cyan-500/20 bg-slate-900/30 shadow-2xl shadow-cyan-500/10 backdrop-blur-md md:flex-row">
        {/* 卡片内装饰图：左上角 */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={s4Img.src}
          alt=""
          className="pointer-events-none absolute left-0 top-0 z-0 h-32 w-32 object-cover opacity-10 md:h-40 md:w-40"
          draggable={false}
        />
        {/* 卡片内装饰图：右下角 */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={s7Img.src}
          alt=""
          className="pointer-events-none absolute bottom-0 right-0 z-0 h-36 w-36 object-cover opacity-10 md:h-48 md:w-48"
          draggable={false}
        />

        {/* 卡片左侧：Logo 圆环（仅桌面端显示） */}
        <div className="hidden items-center justify-center border-r border-cyan-500/10 p-12 md:flex md:w-1/2">
          <LogoRing title={title} size={280} />
        </div>

        {/* 卡片右侧：登录表单 */}
        <div className="relative z-10 flex flex-col justify-center p-8 md:w-1/2 md:p-12">
          {/* 登录标题居中 */}
          <div className="mb-7 flex flex-col items-center gap-2 text-center">
            <h2 className="text-2xl font-semibold text-slate-100">{t("signIn")}</h2>
            <p className="text-sm text-slate-400">{t("description")}</p>
          </div>

          <LoginForm title={title} onLoginSuccess={handleLoginSuccess} />
        </div>
      </div>
    </div>
  )
}
