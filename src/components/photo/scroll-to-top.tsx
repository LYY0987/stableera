"use client"

import { useEffect, useState } from "react"
import { ArrowUpIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

interface ScrollToTopProps {
  // visibleThreshold 控制按钮显示所需的最小滚动距离（px）。
  visibleThreshold?: number
}

// 渲染回到顶部按钮：滚动超过阈值时淡入显示，点击后平滑滚动到页面顶部。
export function ScrollToTop({ visibleThreshold = 400 }: ScrollToTopProps) {
  const t = useTranslations("common")
  // visible 标记按钮是否已经显示，控制淡入淡出。
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // 监听窗口滚动，根据滚动距离切换按钮显示状态。
    function handleScroll() {
      setVisible(window.scrollY > visibleThreshold)
    }

    handleScroll()
    window.addEventListener("scroll", handleScroll, { passive: true })

    return () => {
      window.removeEventListener("scroll", handleScroll)
    }
  }, [visibleThreshold])

  // 点击后平滑滚动到页面顶部。
  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant="secondary"
          onClick={scrollToTop}
          aria-label={t("backToTop")}
          className={[
            "fixed bottom-6 right-6 z-30 size-10 rounded-full shadow-lg transition-opacity duration-200",
            visible ? "opacity-100" : "pointer-events-none opacity-0",
          ].join(" ")}
        >
          <ArrowUpIcon className="size-5" />
          <span className="sr-only">{t("backToTop")}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="left">{t("backToTop")}</TooltipContent>
    </Tooltip>
  )
}
