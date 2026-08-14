<div align="center">

<img src="public/logo.png" width="100px" />

# StableEra

**恒纪元里，珍藏每一帧光影。**

一个自托管的私人相册，为珍视秩序与永恒的人而生。

[English](README.md) | [简体中文](README_ZH.md)

</div>

---

## 关于

"恒纪元"——出自《三体》中文明繁荣、岁月静好的时期。StableEra 正是这样一个空间：在乱纪元的喧嚣之外，为你守护那些值得留存的瞬间。它以瀑布流的方式呈现照片，解析 EXIF 信息还原时间线，支持本地与云端双重存储。

无论部署在家里的服务器还是云平台上，StableEra 始终让你的照片保持私有、由你掌控。

## 截图预览

> 截图即将补充。

## 功能特性

- **瀑布流布局** — 游标分页 + 虚拟滚动，海量照片也能流畅浏览。
- **智能缩略图** — 自动生成缩略图与高清预览，弱网体验同样出色。
- **EXIF 解析** — 提取相机、镜头、GPS、时间等元数据，按时间线编排照片。
- **响应式适配** — 从桌面到手机，布局自动调整。
- **聚合存储** — 本地文件、Cloudflare R2、Backblaze B2、MinIO 等 S3 兼容存储任你选择。
- **多用户管理** — 独立账户、独立相册空间，支持多人使用。
- **验证码登录** — 登录页集成 SVG 验证码，防止自动化攻击。

## 技术栈

| 层级 | 技术 |
|------|------|
| 全栈框架 | [Next.js](https://nextjs.org/) |
| API 层 | [Hono](https://hono.dev/) |
| ORM | [Drizzle](https://orm.drizzle.team/) |
| 数据库 | [SQLite](https://sqlite.org/) / [Turso](https://turso.tech/) |
| UI 组件 | [shadcn/ui](https://ui.shadcn.com/) |
| 存储 | 本地 / S3 兼容 |

## 快速开始

```bash
# 安装依赖
pnpm install

# 复制并编辑环境变量
cp .env.example .env

# 启动开发服务器
pnpm run dev
```

访问 `http://localhost:3000`，使用 `.env` 中设置的账号密码登录。

## 部署

StableEra 支持部署到 Vercel、Docker 或任何兼容 Node.js 的环境。所有配置项详见 [`.env.example`](.env.example)。

## 致谢

本项目基于 [@aslost](https://github.com/aslost) 的 [Pixtale](https://github.com/aslost/pixtale.git) 项目进行二次开发，感谢原作者提供的优秀基础。

## 开源协议

StableEra 沿用上游项目的 [AGPL-3.0](LICENSE) 开源协议，所有修改与分发均遵守 AGPL-3.0 条款。
