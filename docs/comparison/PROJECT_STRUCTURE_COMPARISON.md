# Project Structure Comparison

**Mode:** PLAN (read-only).

---

## 1. Reference structure (`D:\new program - Copy`)

### Root: recovery debris (not the app)
- `node_modules/`, `_backup-akar-20260702-191040/`, `_edit/`, `.claude/`, `.vite/`, `nginx-akarpromax.conf`
- 26 standalone `.js/.cjs` scripts at root (8 `auth-server-*.js`, 12 `fix-*.js`, `server-index*.js`, `check-final.js`, `verify-final.js`, `debug-*.js`, `count-msgs.js`, `extract-garbled.js`, `remaining-strings.js`) — scratch work, many reference `process.env.JWT_SECRET || "my_super_secret_key"` fallback.
- Root `package.json` + `package-lock.json` (partial stack), `releases/akarpromax-unified-*.zip`, `recovery-backend/`, `recovery-extracted/`.

### Real app: `akarpromax-web/`
- `akar-frontend-src/` — Vite SPA:
  - `src/pages/` (123 `.tsx` files, 9 in `marketer/`)
  - `src/components/` (152 files incl. `ui/` shadcn set, `cad/`, `maps/`, `ads/`)
  - `src/App.tsx` (wouter route table, ~120 routes)
  - `server/api/` — Express API: `prisma/schema.prisma` (+ committed `dev.db`), `src/index.ts`, `src/middleware/auth.ts`, `src/routes/*.ts` (26 route files), `src/services/*` (auction socket/intel, notifications), `.env` committed
  - `server/chat-server.ts` + `chat.sqlite`
- `server/`, `recovery-*`, `releases/` — parallel/legacy copies.

## 2. Target structure (`E:\Akarpromax new 2027\V 2.0 GPT - Copy`)

```
app/                      # file-system routes (37 pages + 94 API handlers)
  (public)/ (account)/ (workspace)/ (admin)/   # route groups
  admin/                  # shared layout + sidebar + client pages
  api/                    # route handlers (auth, news, ads, sponsors, services, i18n)
  dashboard/ services/ tools/ properties/ providers/ service-requests/
lib/                      # server logic (auth, db, rbac, services, ads, i18n, api handler)
src/                      # client components (components/, constants/)
  components/             # shared, services, tools, cad (52 tsx)
  constants/              # permissions, roles catalog
db/                       # drizzle schemas (index, schema, mysql/)
drizzle/ drizzle-mysql/ drizzle-pg/   # migrations
tests/ scripts/ types/ worker/ build/ dist/ public/
```

## 3. Structural principles compared

| Principle | Reference | Target |
|---|---|---|
| Layered server logic (Page → Route → Service → Repository → Adapter) | Partial: Express routes talk to Prisma directly; services only for auctions/notifications | Strict: `lib/` services + `runtime-db`/`mysql-runtime` adapters; `check-architecture.mjs` + `check-module-boundaries.mjs` enforced |
| Public vs Admin separation | SPA route flag only (`adminOnly` prop on `<ProtectedRoute>`) — admin code in same bundle | Route groups `(public)`/`(admin)` + shared `admin/layout.tsx` + PermissionGuard |
| Client vs Server boundary | Single client bundle, all data via axios | Server components + `-client.tsx` page shells |
| Duplicate code | `.bak.0` files, `schema.prisma.bak.0`, duplicated `AdminUsers.tsx`/`AdminUsersPage.tsx`, `Dashboard.tsx`/`DashboardPage.tsx`, `ServiceHub.tsx`/`ServiceHubPage.tsx`, `Profile.tsx`/`ProfilePage.tsx` | No `.bak` in `app/`/`lib/`/`src/`; root still holds scratch `_e2e_*.mjs` + logs (cleanup task, not code debt) |
| Single DB provider | SQLite+Prisma (app) — plus MySQL elsewhere historically | PG (auth) + D1 (runtime) + MySQL (start fallback) — legacy-only MySQL/D1/SQLite per directive |

## 4. Findings

- **Reference has no enforced module boundaries**; pages import services directly and duplicate page components indicate drift. Target enforces boundaries via scripts (both PASS at `ce74fb2`).
- **Reference commits runtime artifacts** (`dev.db`, `chat.sqlite`, `.env` with keys). Target commits `.env.example` only.
- **Target structure already implements the directive's layering**; reference structure is a flat SPA + Express monolith.

## 5. Decisions

- **KEEP** target `app/`+`lib/`+`src/` split. REUSE_AS_IS.
- **REBUILD** reference pages into target route groups (Public/Account/Workspace/Admin). DO_NOT_MIGRATE reference root debris and `recovery-*` copies.
- **ADAPT** reference `components/ui/` (Radix) into `src/components/ui/` if approved.
- **CLEANUP (post-approval):** remove root `_e2e_*.mjs`, build logs, bundles; keep reference as README-documented archive only.
