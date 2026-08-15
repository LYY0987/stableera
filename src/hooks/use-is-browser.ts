"use client"

import { useSyncExternalStore } from "react"

// 订阅函数：浏览器环境下无外部变更源，返回空退订函数。
function subscribe() {
  return () => {}
}

// 读取浏览器环境快照，客户端始终为 true。
function getSnapshot() {
  return true
}

// 服务端渲染快照为 false，避免水合不一致。
function getServerSnapshot() {
  return false
}

// 判断当前是否在浏览器环境，用于 SSR 阶段显示骨架屏。
function useIsBrowser() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

export { useIsBrowser }
