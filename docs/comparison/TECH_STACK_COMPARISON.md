# Tech Stack Comparison

**Scope:** Reference = `D:\new program - Copy` (recovery dump; real app at `akarpromax-web/akar-frontend-src/`). Target = `E:\Akarpromax new 2027\V 2.0 GPT - Copy` (current repo, `refactor/architecture-foundation` @ `ce74fb2`).
**Mode:** PLAN (read-only). No production files modified.

---

## 1. Runtime & Framework

| Aspect | Reference | Target |
|---|---|---|
| App type | Client-side SPA (React 18, Vite 5) | Server-first Next.js 16 app via Vinext 0.0.50 (RSC + route handlers) |
| Framework | Vite 5.4.14 + `@vitejs/plugin-react` 4.3.1 | Next 16.2.6 + `@vitejs/plugin-rsc` 0.5.26, `@cloudflare/vite-plugin` 1.37.1, Vinext 0.0.50 |
| React | 18.2.0 | 19.2.6 |
| TypeScript | 6.0.3 (frontend), 5.x (server) | 5.9.3 |
| Routing | Client-side `wouter` 3.3.5 (SPA hash/path routes) | File-system `app/` routes (37 page routes, 94 API route handlers) |
| Rendering | CSR only (react-helmet-async for meta) | RSC + SSR + force-dynamic API handlers |
| Styling | Tailwind CSS 4.1.0 + `@tailwindcss/vite` + typography | Tailwind CSS 4.2.1 + `@tailwindcss/postcss` |
| Component library | Radix UI primitives (~27 packages) + shadcn-style `components/ui/` | Hand-rolled `src/components/shared/` (Button, Card, Input, Modal, Badge, Sidebar) + page-level clients |
| Data fetching | `@tanstack/react-query` + axios | Server route handlers + fetch; no query client |
| Forms | react-hook-form + zod 3.24 + yup 1.7 | Plain forms; zod 4.4.3 for API validation |
| i18n | i18next 26 + react-i18next + browser-language-detector | Home-grown `lib/i18n` (core/db/keys) + `api/i18n/[locale]` + admin i18n panel |

## 2. Server / API

| Aspect | Reference | Target |
|---|---|---|
| Server | Express 5.2.1 (`server/api/src/index.ts`) | Vinext/Next route handlers (`app/api/**/route.ts`) |
| ORM | Prisma 6.6 (SQLite `dev.db` committed) | Drizzle 0.45.2 (D1/SQLite + MySQL + Postgres schemas) |
| Realtime | socket.io 4.8.3 (auction socket, chat) | None (REST polling pattern) |
| Uploads | multer 2.2 | `api/sponsor-assets` / `ad-assets` route handlers (part handling) |
| Email | nodemailer 9 | Not present (no SMTP in target yet) |
| Push | web-push 3.6 | None |

## 3. Database

| Aspect | Reference | Target |
|---|---|---|
| Primary DB | SQLite (`server/api/prisma/dev.db`) via Prisma | PostgreSQL (`DATABASE_URL`) via Drizzle + `lib/db` (auth layer) |
| Runtime data | Same SQLite | D1 (`lib/runtime-db.ts`) under dev; MySQL fallback (`MYSQL_URL`) under `vinext start` |
| Migrations | Prisma migrations (1 migration in repo) | Drizzle kits: `drizzle/` (D1), `drizzle-mysql/`, `drizzle-pg/` (2 SQL migrations) |

## 4. Auth

| Aspect | Reference | Target |
|---|---|---|
| Mechanism | JWT Bearer (jsonwebtoken, 30d expiry) in `server/api/src/middleware/auth.ts` | HttpOnly session cookie `akar_session` (jose HS256, 7d) in `lib/auth/session.ts` |
| Password hashing | bcryptjs 3.0.3 | bcryptjs 3.0.3 (`lib/auth/password.ts`) |
| Roles | String `role` on user; `requireRole(...roles)` middleware | Session payload role + `permissions` array via `lib/auth/identity-map.ts` + `lib/rbac/check.ts` |

## 5. Notable capability libraries

| Domain | Reference | Target |
|---|---|---|
| PDF | pdfjs-dist 5.7, pdf-lib 1.17, jspdf 4.2 | pdfjs-dist 6.2.108 (tools) |
| DOCX | mammoth (in reference deps as server dep) | mammoth 1.12, docx 9.7 (tools: PdfToWord) |
| OCR | tesseract.js 7 | tesseract.js 7 |
| CAD/geo | dxf-parser, proj4, leaflet 1.9 + react-leaflet, three/react-three-fiber | proj4 2.21, leaflet 1.9 (tools: CoordinateConverter, PointsToDxf, LandMapper) |
| Charts | recharts 2.15 | none (inline SVG where needed) |
| ML | onnxruntime-web 1.26 | none |
| Payments | @paypal/react-paypal-js 9.1 | none |
| PWA | PWA + install prompt + compression plugin | none |

## 6. Build & tooling

| Aspect | Reference | Target |
|---|---|---|
| Build | `vite build` → static bundle + separate Express/tsx server | `vinext build` → Workers-target bundle (PG cannot load under `start`; see AGENTS.md) |
| Tests | msw 2.14 (mock server), no unit suite wired | `node --test` + tsx (44 tests green; services + rendered-html suites) |
| Lint | none wired in frontend scripts | eslint 9.39.4 (`eslint.config.mjs`), `npm run lint` |
| Deploy target | Static host + Node server | Cloudflare Workers (wrangler 4.92) + D1 |

## 7. Verdict (per directive's single-provider rule)

- **Framework/runtime:** KEEP target (Next/Vinext + RSC). REBUILD reference features inside target's server model. Reference SPA router (`wouter`) is not migratable as-is.
- **Styling/component layer:** KEEP target's Tailwind 4 pipeline; MERGE reference's shadcn/Radix a11y primitives where target needs richer controls (dialogs, selects, menus, toasts) via **ADAPT** of the reference `components/ui/` set — they are plain Radix + tailwind-merge/cva and drop into Tailwind 4 with minimal changes.
- **DB:** KEEP target PG+D1 split. Reference SQLite/Prisma is legacy-only.
- **Auth:** KEEP target session cookie model. Reference JWT-in-localStorage model is a security regression (see AUTH_SECURITY_FINDINGS.md).
- **Capability libraries:** SELECTIVE MERGE — PDF/OCR/CAD/geo already partially mirrored in target tools; payments/PWA/realtime/ML are new-feature candidates (see DEPENDENCY_APPROVAL_LIST.md).

**Decision:** KEEP (target architecture) + MERGE (reference feature set) with **ADAPT** for shared UI primitives. No REBUILD_FROM_BEHAVIOR needed at the framework level; reference stack itself is NOT carried forward.
