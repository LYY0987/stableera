import { useSyncExternalStore } from "react"

const MOBILE_BREAKPOINT = 768

// 订阅视口宽度变化，变化时通知 React 重新读取快照。
function subscribe(onStoreChange: () => void) {
  const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
  mql.addEventListener("change", onStoreChange)

  return () => mql.removeEventListener("change", onStoreChange)
}

// 读取当前是否命中移动端视口。
function getSnapshot() {
  return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`).matches
}

// 服务端渲染时默认按桌面处理。
function getServerSnapshot() {
  return false
}

// 判断当前视口是否为移动端，监听窗口宽度变化自动更新。
export function useIsMobile() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
