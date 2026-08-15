"use client"

import { createContext, useContext } from "react"
import { type PhotoVo } from "@/server/entity/vo/photo"

interface PrivateContextValue {
  // initialPhotos 保存服务端查询到的私密照片第一页。
  initialPhotos: PhotoVo[]
}

interface PrivateProviderProps {
  // children 是 /private 路由下的页面内容。
  children: React.ReactNode
  // initialPhotos 保存服务端查询到的私密照片第一页。
  initialPhotos: PhotoVo[]
}

const PrivateContext = createContext<PrivateContextValue | null>(null)

// 读取 /private 路由下服务端预取的照片数据。
function usePrivateContext() {
  const context = useContext(PrivateContext)

  if (!context) {
    throw new Error("usePrivateContext must be used within PrivateProvider.")
  }

  return context
}

// 给 /private 路由下的客户端组件提供服务端预取私密照片。
function PrivateProvider({ children, initialPhotos }: PrivateProviderProps) {
  return (
    <PrivateContext.Provider value={{ initialPhotos }}>
      {children}
    </PrivateContext.Provider>
  )
}

export { PrivateProvider, usePrivateContext }
