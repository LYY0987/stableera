<div align="center">

<img src="public/logo.png" width="100px" />

# StableEra

**Cherish every frame of light in a stable era.**

A self-hosted photo gallery for preserving your memories, built for those who value order and permanence.

[English](README.md) | [简体中文](README_ZH.md)

</div>

---

## About

Inspired by the "Stable Era" from *The Three-Body Problem* — a period of predictability and calm — StableEra is a photo gallery designed to be your personal archive of moments worth keeping. It organizes your photos into a beautiful masonry layout, parses EXIF metadata for chronological storytelling, and supports both local and cloud storage.

Whether you're running it on a home server or deploying to the cloud, StableEra keeps your photos private and under your control.

## Screenshots

> Screenshots will be added soon.

## Features

- **Masonry Layout** — Infinite scroll with cursor-based pagination and virtualized rendering for smooth browsing of large collections.
- **Smart Thumbnails** — Automatically generates thumbnails and high-resolution previews, optimized for slower networks.
- **EXIF Parsing** — Extracts photo metadata (camera, lens, GPS, timestamp) and arranges photos along a timeline.
- **Responsive Design** — Adapts seamlessly from desktop to mobile browsers.
- **Flexible Storage** — Store photos locally or on any S3-compatible object storage (Cloudflare R2, Backblaze B2, MinIO, etc.).
- **Multi-user Support** — Create and manage multiple accounts with independent photo spaces.
- **Captcha Protection** — Login page includes SVG-based captcha to prevent automated attacks.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Next.js](https://nextjs.org/) |
| API Layer | [Hono](https://hono.dev/) |
| ORM | [Drizzle](https://orm.drizzle.team/) |
| Database | [SQLite](https://sqlite.org/) / [Turso](https://turso.tech/) |
| UI | [shadcn/ui](https://ui.shadcn.com/) |
| Storage | Local / S3-compatible |

## Quick Start

```bash
# Install dependencies
pnpm install

# Copy and edit environment variables
cp .env.example .env

# Start development server
pnpm run dev
```

Visit `http://localhost:3000` and log in with the credentials you set in `.env`.

## Deployment

StableEra can be deployed to Vercel, Docker, or any Node.js-compatible host. See [`.env.example`](.env.example) for all configuration options.

## Acknowledgments

This project is a derivative work based on [Pixtale](https://github.com/aslost/pixtale.git) by [@aslost](https://github.com/aslost). We extend our gratitude to the original author for the excellent foundation.

## License

StableEra is licensed under the [AGPL-3.0](LICENSE) license, inheriting the license of the upstream project. All modifications and distributions comply with the terms of AGPL-3.0.
