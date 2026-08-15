import { redirect } from "next/navigation"

// 首页直接跳转到照片墙。
export default function Home() {
  redirect("/photos")
}
