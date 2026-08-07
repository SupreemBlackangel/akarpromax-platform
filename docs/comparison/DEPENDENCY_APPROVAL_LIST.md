# Dependency Approval List

**Mode:** PLAN (read-only). Every dependency that would be ADDED to target must be approved here. Existing target deps are already approved (current `package.json`). Reference-only deps are flagged DO_NOT_INSTALL unless a feature requires them.

Rules: single provider per concern; no install until the owning phase starts; each entry = feature + owner phase + decision.

---

## 1. Recommended to approve (MERGE/ADAPT)

| # | Package | Version (target-compatible) | Needed for | Phase | Decision |
|---|---|---|---|---|---|
| D-01 | `@radix-ui/react-dialog` | latest stable | Modal focus-trap upgrade (a11y) | 0 | APPROVE — ADAPT |
| D-02 | `@radix-ui/react-dropdown-menu` | latest | admin menus | 0 | APPROVE — ADAPT |
| D-03 | `@radix-ui/react-select` | latest | forms/admin selects | 0 | APPROVE — ADAPT |
| D-04 | `@radix-ui/react-tabs` | latest | tabbed surfaces | 0 | APPROVE — ADAPT |
| D-05 | `@radix-ui/react-toast` or `sonner` | latest | notifications/toasts | 0 | APPROVE (choose ONE) |
| D-06 | `@radix-ui/react-tooltip` | latest | tooltips | 0 | APPROVE — ADAPT |
| D-07 | `@radix-ui/react-label` | latest | form labelling | 0 | APPROVE — ADAPT |
| D-08 | `@radix-ui/react-switch`, `checkbox`, `radio-group` | latest | forms | 0 | APPROVE — ADAPT |
| D-09 | `class-variance-authority` + `clsx` + `tailwind-merge` | latest | UI variant system (`components/ui`) | 0 | APPROVE — ADAPT |
| D-10 | `nodemailer` (+ types) | latest | email verify/reset/OTP | 2 | APPROVE — REBUILD email flows |
| D-11 | `input-otp` | latest | OTP input (a11y) | 2 | APPROVE — ADAPT |
| D-12 | `pdf-lib` OR `jspdf` (pick ONE) | latest | PDF generation (contract/export) | 6 | CONDITIONAL — only if feature approved |
| D-13 | `react-hook-form` + `@hookform/resolvers` | latest | account/forms | 1 | CONDITIONAL — target may keep plain forms; product call |
| D-14 | `@paypal/react-paypal-js` | latest | payments | 8 | CONDITIONAL — only if payments feature approved |

## 2. Explicitly NOT approved (DO_NOT_INSTALL unless feature re-opens)

| Package | Reason |
|---|---|
| `jsonwebtoken` | replaced by `jose` (target session) |
| `express`, `cors`, `helmet`, `express-rate-limit`, `multer` | route handlers replace Express; add rate-limit logic server-side, not the lib, unless needed |
| `prisma` / `@prisma/client` (any major) | single-ORM rule → Drizzle only |
| `socket.io` / `socket.io-client` | rebuild realtime as REST |
| `next-themes` | class-based dark mode already |
| `i18next` / `react-i18next` / language-detector | home-grown `lib/i18n` |
| `@tanstack/react-query`, `axios` | server handlers + fetch |
| `wouter` | filesystem routes |
| `three`, `@react-three/fiber`, `@react-three/drei` | no consumer; heavy |
| `onnxruntime-web` | no consumer |
| `web-push` | only if notifications feature approved (Phase 9) |
| `jszip`, `archiver`, `html2canvas` | no feature yet |
| `react-helmet-async` | RSC metadata API |
| `msw` | target uses node --test |

## 3. Reference deps to KEEP pinned (already in target)
`bcryptjs 3.0.3`, `leaflet 1.9.4`, `proj4 2.21.0`, `tesseract.js 7`, `pdfjs-dist 6.2`, `mammoth`, `docx`, `tailwindcss 4`, `zod 4`.

## 4. Review process
Each conditional item requires a feature ticket + explicit approval in this file before `npm install`. No other dependency additions permitted. All approved installs executed in the owning phase only.
