"use client"

import { useMemo } from "react"
import { HardDrive, Images, ServerCog } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StorageStatusEnum, StorageTypeEnum } from "@/server/enums/storage-enum"
import { type StorageVo } from "@/server/entity/vo/storage"
import { useTranslations } from "next-intl"

// 把字节数格式化成易读的容量文案。
function formatCapacity(size: number) {
  if (!size) {
    return "0 B"
  }

  const units = ["B", "KB", "MB", "GB", "TB"]
  const index = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1)
  const value = size / 1024 ** index

  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`
}

// 把存储类型转成展示文案。
function storageTypeLabel(type: number, t: (key: string) => string) {
  if (type === StorageTypeEnum.LOCAL) {
    return t("local")
  }

  if (type === StorageTypeEnum.BLOB) {
    return t("vercelBlob")
  }

  return t("objectStorage")
}

interface StorageDashboardProps {
  storages: StorageVo[]
}

// 渲染存储用量仪表盘：总用量、照片数、可用存储数及容量分布。
function StorageDashboard({ storages }: StorageDashboardProps) {
  const t = useTranslations("storage")

  const stats = useMemo(() => {
    const totalUsed = storages.reduce((sum, item) => sum + item.usedCapacity, 0)
    const totalPhotos = storages.reduce((sum, item) => sum + item.photoTotal, 0)
    const activeStorages = storages.filter(
      (item) => item.status === StorageStatusEnum.NORMAL && !item.unavailable,
    ).length

    const distribution = storages
      .map((item) => ({
        name: item.name,
        typeLabel: storageTypeLabel(item.type, t),
        used: item.usedCapacity,
        percent: totalUsed > 0 ? (item.usedCapacity / totalUsed) * 100 : 0,
      }))
      .sort((a, b) => b.used - a.used)

    return { totalUsed, totalPhotos, activeStorages, distribution }
  }, [storages, t])

  const cards = [
    {
      key: "totalUsed",
      label: t("dashboard.totalUsed"),
      value: formatCapacity(stats.totalUsed),
      icon: HardDrive,
      accent: "text-cyan-500",
    },
    {
      key: "totalPhotos",
      label: t("dashboard.totalPhotos"),
      value: stats.totalPhotos.toLocaleString(),
      icon: Images,
      accent: "text-emerald-500",
    },
    {
      key: "activeStorages",
      label: t("dashboard.activeStorages"),
      value: `${stats.activeStorages} / ${storages.length}`,
      icon: ServerCog,
      accent: "text-amber-500",
    },
  ]

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.key} size="sm">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{card.label}</span>
                <card.icon className={`size-4 ${card.accent}`} />
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-semibold tabular-nums">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">
            {t("dashboard.distribution")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {storages.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              {t("dashboard.empty")}
            </div>
          ) : (
            <>
              <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
                {stats.distribution.map((item) => (
                  <div
                    key={item.name}
                    className="h-full"
                    style={{
                      width: `${item.percent}%`,
                      backgroundColor: pickColor(item.name),
                    }}
                    title={`${item.name} · ${formatCapacity(item.used)}`}
                  />
                ))}
              </div>
              <ul className="grid grid-cols-1 gap-1.5 text-xs sm:grid-cols-2">
                {stats.distribution.map((item) => (
                  <li key={item.name} className="flex items-center gap-2">
                    <span
                      className="inline-block size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: pickColor(item.name) }}
                    />
                    <span className="min-w-0 flex-1 truncate">
                      {item.name}
                      <span className="ml-1 text-muted-foreground">· {item.typeLabel}</span>
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {formatCapacity(item.used)} · {item.percent.toFixed(1)}%
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// 根据名称稳定生成色板，避免每次渲染颜色抖动。
function pickColor(name: string) {
  const palette = [
    "#06b6d4",
    "#10b981",
    "#f59e0b",
    "#8b5cf6",
    "#ec4899",
    "#3b82f6",
    "#ef4444",
    "#14b8a6",
  ]
  let hash = 0
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) & 0xffffffff
  }
  return palette[Math.abs(hash) % palette.length]
}

export { StorageDashboard }
