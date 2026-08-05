# Database and Auth Audit

## Executive Summary
- Authentication systems found: multiple
- Database backends found: 3
- ORM/data-access layers found: multiple Drizzle adapters plus manual SQL bootstrap layers
- Schema families found: PostgreSQL, MySQL, SQLite/D1, plus runtime SQL schema initializers
- Repository/package hygiene findings: local secrets file present, local logs present, local build/state directories present, migrations tracked, no source maps found

## Authentication Systems

### 1. Cookie JWT Session Auth
- Files:
  - `lib/auth/session.ts`
  - `app/api/auth/login/route.ts`
  - `app/api/auth/register/route.ts`
  - `app/api/auth/me/route.ts`
  - `app/api/auth/logout/route.ts`
- Mechanism:
  - `jose` signed JWT stored in `akar_session` cookie.
  - Backed by PostgreSQL `lib/db/schema.ts` `users` table.

### 2. Bearer Token Fallback in Browser Storage
- Files:
  - `src/components/AccountDialog.tsx`
  - `app/chatgpt-auth.ts`
- Mechanism:
  - `AccountDialog` reads/writes `localStorage["akar_token"]`.
  - `chatgpt-auth.ts` accepts `Authorization: Bearer ...` and resolves user via `getSessionUser()`.
- Observation:
  - Login route currently returns `user`, not a guaranteed `token`, so this path is only partially active.

### 3. OpenAI/ChatGPT Header-Based Identity
- File: `app/chatgpt-auth.ts`
- Mechanism:
  - Reads `oai-authenticated-user-email` and related headers.
  - Used by admin route gates via `requireChatGPTUser()`.

### 4. Localhost Auto-Admin Fallback
- File: `app/chatgpt-auth.ts`
- Mechanism:
  - If host is localhost and no auth header exists, returns `admin@localhost.akarpromax`.
- Risk:
  - Useful for local development, but it is a separate identity source and bypass path.

### 5. Identity Augmentation Through Sponsor Access
- File: `lib/sponsor-auth.ts`
- Mechanism:
  - Builds final UI identity from session first, then ChatGPT/header identity, then runtime `sponsor_access`, then optional MySQL admin-role promotion.

## Auth Findings
- The project does not use one auth system; it uses at least four identity sources.
- Admin pages are gated by `requireChatGPTUser()` plus optional `PermissionGuard`.
- Public/workspace gates use `/api/user-context` and `ToolsGate`/`AccountDialog`.
- Auth storage is split between cookie session and optional browser token storage.

## Database Systems

### 1. PostgreSQL
- Files:
  - `lib/db/index.ts`
  - `lib/db/schema.ts`
  - `drizzle.config.ts`
  - `drizzle-pg/**`
- Driver/ORM:
  - `postgres` + `drizzle-orm/postgres-js`
- Primary current use:
  - Auth users table for login/register/me/session resolution

### 2. MySQL
- Files:
  - `lib/mysql-db.ts`
  - `lib/mysql-runtime.ts`
  - `db/mysql/schema.ts`
  - `db/mysql/i18n-schema.ts`
  - `db/mysql/services-schema.ts`
  - `drizzle.mysql.config.ts`
  - `drizzle-mysql/**`
- Driver/ORM:
  - `mysql2/promise` + `drizzle-orm/mysql2`
- Current use:
  - Runtime fallback for sponsors/ads/news/services/i18n
  - Verification flow in `/api/auth/verify`
  - E2E seed/cleanup scripts

### 3. Cloudflare D1 / SQLite
- Files:
  - `db/index.ts`
  - `db/schema.ts`
  - `lib/runtime-db.ts`
  - `types/cloudflare-runtime.d.ts`
- Driver/ORM:
  - `drizzle-orm/d1` plus direct `D1Database.prepare()` SQL bootstrapping
- Current use:
  - Runtime content tables when `cloudflare:workers` `env.DB` exists under `vinext dev`

## Schema Families
- PostgreSQL auth schema: `lib/db/schema.ts`
- SQLite/D1 full app schema: `db/schema.ts`
- MySQL full app schema: `db/mysql/schema.ts`
- MySQL i18n schema: `db/mysql/i18n-schema.ts`
- MySQL services schema: `db/mysql/services-schema.ts`
- Runtime bootstrap SQL:
  - `lib/runtime-db.ts`
  - `lib/ad-schema.ts`
  - `lib/i18n-schema.ts`
  - `lib/services-schema.ts`

## ORM and Data Access Findings
- Drizzle is used with three adapters:
  - PostgreSQL
  - MySQL
  - D1
- Runtime content layers also use manual SQL bootstrap and custom D1-to-MySQL adapter behavior.
- `lib/rbac/permissions.ts` and `src/constants/permissions.ts` define separate permission systems, adding authz duplication on top of auth duplication.

## Secrets, Logs, Build Artifacts, and Packaging Findings

### Secrets
- `.env` exists in the working tree and contains live values for:
  - `DATABASE_URL`
  - `MYSQL_URL`
  - `SESSION_SECRET`
- `.env` is ignored by `.gitignore` and is not tracked by Git, but it is still present locally in the repo root.

### Hardcoded Local Credentials / Identity Values
- Hardcoded local MySQL credentials appear in:
  - `_e2e_seed.mjs`
  - `_e2e_clean.mjs`
  - `_e2e_ads.mjs`
- Localhost admin identity fallback appears in:
  - `app/chatgpt-auth.ts`
  - `scripts/seed-services.ts`
  - tests referencing `admin@localhost.akarpromax`

### Logs in Working Tree
- Local log files exist in the repo root, including:
  - `start.log`
  - `start-err.log`
  - `server.log`
  - `server-err.log`
  - `dev-server*.log`
- These are ignored by `.gitignore`, but they are present locally.

### Build and Runtime State Directories
- Present locally:
  - `node_modules/`
  - `dist/`
  - `.wrangler/`
- Git tracking status:
  - `node_modules/`, `dist/`, `.wrangler/` are ignored and not tracked in the current Git index.

### Migration/Schema Artifacts Tracked in Git
- Tracked:
  - `drizzle-mysql/**`
  - `drizzle-pg/**`
- These are intentional migration outputs, not accidental build artifacts.

### Source Maps
- No `*.map` files were found in the repository root tree scan.

## Architectural Risks
- The codebase violates the "one auth system" and "one database" target state.
- Session/auth behavior differs between `vinext dev` and `vinext start` per `AGENTS.md`.
- Admin identity resolution can come from session cookie, bearer token, header-based identity, or localhost fallback.
- Content/runtime data can come from D1 or MySQL depending on environment.
- Auth users come from PostgreSQL, while verification and many operational tables live elsewhere.

## Decision Direction After Approval
- Keep migration history.
- Collapse toward one auth chain.
- Collapse toward one database authority.
- Remove localhost/header fallback from production architecture once an approved admin auth path exists.
