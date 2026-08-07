# Dependency Comparison

**Mode:** PLAN (read-only). Sources: reference `akarpromax-web/akar-frontend-src/package.json`, target `package.json`.

---

## 1. Reference dependency inventory

### Frontend devDependencies (85 entries)
Radix UI (27): accordion, alert-dialog, aspect-ratio, avatar, checkbox, collapsible, context-menu, dialog, dropdown-menu, hover-card, label, menubar, navigation-menu, popover, progress, radio-group, scroll-area, select, separator, slider, slot, switch, tabs, toast, toggle, toggle-group, tooltip.
Styling: tailwindcss 4.1, @tailwindcss/typography, tailwind-merge 2.5, class-variance-authority, clsx, tw-animate-css, next-themes.
Data/forms: @tanstack/react-query 5.45, @hookform/resolvers 3.10, react-hook-form 7.55, zod 3.24, yup 1.7, date-fns, react-day-picker, embla-carousel-react, input-otp, react-resizable-panels, vaul, sonner, cmdk.
Charts/media: recharts 2.15, framer-motion 11.3, lucide-react 0.451, react-dropzone (dep), three/@react-three/fiber+drei (dev), @types/* set.
Infra: vite 5.4, @vitejs/plugin-react, vite-plugin-compression, msw 2.14, archiver, wouter 3.3, dotenv, tsx, typescript 6.0.3.

### Runtime dependencies (46 entries)
Express 5.2, cors, helmet, express-rate-limit, multer, socket.io + client, jsonwebtoken, bcryptjs, nodemailer + web-push, axios, @paypal/react-paypal-js, prisma/@prisma/client 6.6, i18next + react-i18next + languagedetector, react-helmet-async, html2canvas, pdfjs-dist 5.7, pdf-lib, jspdf, jszip, dxf-parser, proj4, leaflet + react-leaflet + @react-leaflet/core, react-datepicker, react-phone-number-input, qrcode, uuid, onnxruntime-web, tesseract.js.

### serverDependencies (duplicate marker in same file)
cors, dotenv, express, jsonwebtoken, prisma 7.8 (!), socket.io — note **two Prisma majors declared** (6.6 client + 7.8) in one file.

## 2. Target dependency inventory

### dependencies (18)
@types/leaflet, @types/proj4, bcryptjs 3.0.3, docx 9.7, drizzle-orm 0.45.2, jose 6.2, leaflet 1.9, lucide-react 1.28, mammoth 1.12, mysql2 3.23, next 16.2.6, pdfjs-dist 6.2, postgres 3.4, proj4 2.21, react 19.2.6, react-dom 19.2.6, tesseract.js 7, zod 4.4.3.

### devDependencies (16)
@cloudflare/vite-plugin, @tailwindcss/postcss, @types/node, @types/react, @types/react-dom, @vitejs/plugin-react, @vitejs/plugin-rsc, drizzle-kit, eslint 9.39, eslint-config-next, react-server-dom-webpack, tailwindcss 4.2, tsx, typescript 5.9, vinext 0.0.50, vite 8.0.13, wrangler 4.92.

## 3. Overlap matrix

| Library | Reference | Target | Verdict |
|---|---|---|---|
| bcryptjs | 3.0.3 | 3.0.3 | KEEP target version (identical) |
| leaflet | 1.9.4 | 1.9.4 | KEEP (target already uses for LandMapper) |
| proj4 | 2.20.6 | 2.21.0 | KEEP target |
| tesseract.js | 7.0.0 | 7.0.0 | KEEP target (OCR) |
| pdfjs-dist | 5.7.284 | 6.2.108 | KEEP target (newer major) |
| tailwindcss | 4.1.0 | 4.2.1 | KEEP target |
| react | 18.2 | 19.2.6 | KEEP target (React 19) |
| zod | 3.24 | 4.4.3 | KEEP target (v4) |
| @types/react | 18 | 19 | KEEP target |

## 4. Gaps (reference feature → target missing)

| Reference feature | Dep needed | Missing in target |
|---|---|---|
| Radix a11y primitives (27 pkgs) | @radix-ui/* | YES |
| react-query data layer | @tanstack/react-query | YES |
| Charts | recharts | YES |
| Rich editor / toasts / menus | sonner, cmdk, vaul, rich-text | YES |
| Email (verification/reset/OTP) | nodemailer | YES |
| Payments | @paypal/react-paypal-js | YES |
| Realtime (auctions/chat) | socket.io | YES |
| PWA/offline | vite-plugin-pwa, InstallPWA | YES |
| File upload server-side | multer | NO (route handlers can handle multipart) |
| i18n framework | i18next | NO (target has home-grown i18n) |
| form validation | react-hook-form | NO (decide: adopt or keep plain) |

## 5. Rules applied
- No dependency may be added without approval (DEPENDENCY_APPROVAL_LIST.md).
- No duplicate providers: one ORM (drizzle), one auth (session), one DB (PG primary). Reference's dual Prisma majors and Prisma+SQLite are **not** carried forward.
- Reference packages flagged for REBUILD_FROM_BEHAVIOR (no dep install): socket.io realtime (REST), react-query (server handlers), i18next (target home-grown), PWA (wrangler static).

**Decision:** MERGE (approve list subset) + REBUILD_FROM_BEHAVIOR for framework-coupled libs; REMOVE reference-only duplicates (prisma, express, multer, jsonwebtoken, socket.io, @paypal, onnxruntime-web) unless approved as new features.
