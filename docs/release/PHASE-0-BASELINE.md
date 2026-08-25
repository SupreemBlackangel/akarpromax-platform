# PHASE 0 — TECHNICAL BASELINE

**Repository:** AkarProMax web platform (`E:\Akarpromax new 2027\V 2.0 GPT - Copy`)
**Branch:** `refactor/architecture-foundation`
**HEAD:** `8fca76d775fb56f856aded14f8adf409b4fba8aa` — *perf(web): lazy-load favorites check in useFavorites hook* — Mon 17 Aug 2026 15:07:17 +0300
**Baseline executed:** 19 Aug 2026
**Scope:** Phase 0 only. No product features fixed, no UI redesign, no framework migration, no changes to FindMyLand / Messaging / Office.

---

## 0. Method and honesty caveats (read this first)

Every conclusion below is derived from **commands executed during this session against the current working tree**, or from **current source with file:line citations**. `AGENTS.md`, `README.md` and `docs/**` were read as *history only* and are never used as evidence of current behaviour.

**How the baseline was obtained.** The developer machine's Linux sandbox (`device_bash`) failed to start, so shell commands could not be run on the Windows machine directly. Instead the repository was mirrored into an isolated Linux workspace:

1. The complete `.git` object store (2 packs, 36 loose objects, refs, index) was copied and the repository reconstructed — `git log`, `git status` and `git ls-files` therefore reflect the real repository history.
2. The **entire current working tree** was copied file-by-file: 1,691 files across `app/` (376), `scripts/` (464), `docs/` (290), `lib/` (191), `src/` (175), `tests/` (71), plus `components/ hooks/ types/ db/ worker/ drizzle*/ examples/ build/ public/` and all root-level config, including `.env`.
3. `git status` in the mirror reproduces exactly **301 modified / 4 deleted / 215 untracked** — and reproduced the same numbers again after all work below, confirming the mirror is faithful and that nothing was altered.

**Known gaps in this baseline — all environmental, none are repository defects:**

| Gap | Cause | Effect on the baseline |
|---|---|---|
| 16 files under `scripts/backup/**` not transferred | file-transfer quota exhausted | None. `scripts/backup` is excluded by `tsconfig.json:38` and `eslint.config.mjs`, and is not compiled, linted or bundled. |
| Live Neon/PostgreSQL connectivity **not verified** | outbound TCP/5432 blocked in this workspace (DNS resolves; connection hangs) | Step 8 is answered by static analysis of current source, not by a live query. **This must be re-run on a machine with DB egress.** |
| First `next build` failed on Google Fonts | `fonts.googleapis.com` blocked by the workspace proxy (`CONNECT tunnel failed, 403`) | Build was re-run with a **temporary, sandbox-only** shim in `app/layout.tsx`. The shim was reverted; `app/layout.tsx` is now byte-identical to the developer's copy (verified with `cmp`). **Zero files on the developer's machine were modified.** |
| Node/npm versions are the workspace's (`v22.22.2` / `10.9.7`) | commands ran in Linux, not on the Windows machine | `package.json` requires `node >=22.13.0`; satisfied. The Windows-local Node version is **unverified**. |

**Secrets:** `.env` was read to configure the runtime. No secret value is reproduced in this document; only variable names and redacted host information.

---

## 1. Executive status

The repository is in **substantially better shape than the historical documentation claims**, and **substantially worse shape than the historical certifications claim**.

What is now true and was not before:

* `npm ci` **succeeds** (exit 0). The historically documented lockfile mismatch is **gone**.
* `npx tsc --noEmit` **succeeds** with **0 errors** across 831 project files.
* `next build` **succeeds** — 90 static pages, 0 warnings — on Next.js 16.3.1 / React 19.2.8 / Node 22.
* `vinext` is **not a dependency, not installed, and not required**. The Vite/Cloudflare-Workers runtime is gone from the build path.
* The application boots and serves every public page with HTTP 200.

What blocks a release:

* **`npm test` fails** (exit 1). 11 of 219 tests fail, and the script only runs **19 of 79** test files. Running everything runnable gives **22 failures out of 1,012 tests**.
* **The documented production start command does not work.** `package.json` `start` is `next start`, but `next.config.js` sets `output: 'standalone'`; Next refuses and prints *`"next start" does not work with "output: standalone"`*. The correct artifact (`node .next/standalone/server.js`) serves **404 for every CSS/JS/image** until `.next/static` and `public` are manually copied in — and nothing in the repo does that copy.
* **Three authorization defects** in messaging, one of which lets any logged-in user read or write any conversation.
* **Google/Facebook OAuth is 100% broken** — every callback returns HTTP 500 (runtime-verified), including the success path.
* **Ad-creative storage is 100% broken** under Node — it depends on a Cloudflare `R2` binding via `import("cloudflare:workers")`, which throws in Node.
* **The Office media API is dead** — every request returns HTTP 400 because of a path-dispatch bug; uploaded bytes are never persisted.
* **Schema DDL runs during ordinary user requests** (56 + 52 DDL statements across two "ensure schema" paths, called from 21 API route files).
* Every existing certification document (`STAGING_READINESS`, `RELEASE_CANDIDATE_MANIFEST`, `FINAL_CERTIFICATION_REPORT`, `LIVE_RUNTIME_CERTIFICATION`) certifies a runtime that **no longer exists** and predates the Next.js/PostgreSQL migration.

**The project is not production-ready. It is, for the first time, reproducibly buildable and type-clean.**

---

## 2. Current architecture

### 2.1 As verified from source and executed commands

| Layer | Actual |
|---|---|
| Framework | Next.js **16.3.1** (App Router, Turbopack build) |
| UI | React **19.2.8** / React-DOM 19.2.8, Tailwind CSS **4.2.1** (`@tailwindcss/postcss`) |
| Language | TypeScript **5.9.3**, `strict: true`, `noEmit`, `moduleResolution: bundler` |
| Lint | ESLint **9.39.4** flat config + `eslint-config-next` **16.2.6** |
| Runtime | Node.js (workspace: v22.22.2). `engines.node >= 22.13.0` |
| Build output | `output: 'standalone'` → `.next/standalone/server.js` |
| ORM | drizzle-orm **0.45.2**, drizzle-kit **0.31.10** |
| DB (configured) | `DB_PROVIDER=postgres`; `DATABASE_URL` → Neon (`ep-lingering-shadow-…ap-southeast-1.aws.neon.tech/neondb`, `sslmode=require`) |
| DB (secondary) | `MYSQL_URL` → `mysql://…@localhost:3306/akarpromax` (local only) |
| Package manager | npm, `lockfileVersion: 3`, 755 packages installed |

### 2.2 Configuration files present

`next.config.js` (ESM, `output: 'standalone'`, `typescript.ignoreBuildErrors: false`), `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs`, `drizzle.config.ts` (dialect `postgresql`), `drizzle.mysql.config.ts`, `.openai/hosting.json`, `next-env.d.ts` (untracked/generated), `.env`, `.env.example`.

**Obsolete vinext configuration still present:**

* `vite.config.ts.vinext-backup` (root) — the tracked `vite.config.ts` is **deleted** from the working tree.
* `worker/index.ts.vinext-backup` — the tracked `worker/index.ts` is **deleted**.
* `package.json:12` — `"postinstall": "node ./scripts/patch-vinext-windows.mjs"`. Executed during `npm ci`; output: `node_modules/vinext/dist/server/static-file-cache.js not found; skipping (vinext not installed).` **Permanent no-op.**
* `tsconfig.json:54-55` — excludes `.vinext` and `.wrangler`, neither of which exists.
* `package.json:14` — `lint` passes `--ignore-pattern dist`; no `dist/` directory exists (that was the vinext build output).
* The developer's `next-env.d.ts` contained a stale `import "vinext/types/augmentations";`. It is masked by `skipLibCheck: true` and is **rewritten clean by `next build`**. The file is gitignored.
* devDependencies still carry `vite 8.0.13`, `@vitejs/plugin-react 6.0.2`, `@vitejs/plugin-rsc 0.5.26`, `@cloudflare/vite-plugin 1.37.1`, `wrangler 4.92.0`, `react-server-dom-webpack 19.2.6` — **no configuration file consumes any of them.**

### 2.3 Environment variables

Read from `.env` (18 keys): `DB_PROVIDER`, `DATABASE_URL`, `MYSQL_URL`, `SESSION_SECRET`, `APP_URL`, `TRUSTED_ORIGINS`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`, `EMAIL_TRANSPORT`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM_ADDRESS`, `MAIL_FROM_NAME`.

`.env.example` documents 28 keys. Mismatches are itemised in §10.4. Note: **all four OAuth credentials are currently empty strings.**

---

## 3. Commands executed

| # | Command | Where |
|---|---|---|
| 1 | `git status --porcelain=v1` / `git log` / `git ls-files` | reconstructed mirror |
| 2 | `node -v` / `npm -v` | Linux workspace |
| 3 | `npm ci` | Linux workspace |
| 4 | `npm audit --json` | Linux workspace |
| 5 | `npx tsc --noEmit` (twice — with and without the stale `tsconfig.tsbuildinfo`) | Linux workspace |
| 6 | `npx tsc --noEmit --listFiles` (coverage sanity check) | Linux workspace |
| 7 | deliberate type error injected + removed (tsc sanity check) | Linux workspace |
| 8 | `npm run lint` and `npx eslint . -f json` | Linux workspace |
| 9 | `npx next build` (attempt 1 — unmodified source) | Linux workspace |
| 10 | `npx next build` (attempt 2 — with sandbox-only font shim, later reverted) | Linux workspace |
| 11 | `PORT=3010 npm start` (`next start`) + HTTP probes | Linux workspace |
| 12 | `node .next/standalone/server.js` + HTTP probes (before and after copying `.next/static` + `public`) | Linux workspace |
| 13 | `node --import tsx --test <the 19 files in the `test` script>` | Linux workspace |
| 14 | `node --import tsx --test <all 70 files under tests/>` | Linux workspace |
| 15 | `node -e "import('cloudflare:workers')"` | Linux workspace |
| 16 | `node -e "new URL('/','/')"` | Linux workspace |
| 17 | `pg` connection attempt to Neon; raw TCP/5432 probe | Linux workspace |
| 18 | `curl` probes of 19 routes against the production standalone server | Linux workspace |

---

## 4. Exit codes

| Command | Exit | Verdict |
|---|---|---|
| `npm ci` | **0** | **PASS** — 755 packages in 38s. Historical lockfile mismatch **no longer present**. |
| `npm audit` | — | 15 vulnerabilities: 10 high, 4 moderate, 1 low, 0 critical |
| `npx tsc --noEmit` | **0** | **PASS** — 0 errors, 831 project files checked |
| `npm run lint` | **1** | **FAIL** — 380 problems (168 errors, 212 warnings) in 170 files |
| `npx next build` (unmodified) | **1** | **FAIL — environmental only** (Google Fonts unreachable from this network) |
| `npx next build` (font shim) | **0** | **PASS** — 90/90 static pages, 0 warnings |
| `PORT=3010 npm start` | boots, but **warns and is unsupported** | see §8 |
| `node .next/standalone/server.js` | boots | pages 200; **static/public 404** until manually copied |
| 19-file suite (what `npm test` runs) | **1** | **FAIL** — 219 tests, 208 pass, **11 fail** |
| 70-file suite (everything under `tests/`) | **1** | **FAIL** — 1,012 tests, 988 pass, **22 fail**, 2 skipped |
| `pg` connect to Neon | timeout | **UNVERIFIED** — egress blocked in this workspace |

### 4.1 ESLint breakdown

| Count | Rule | Severity |
|---|---|---|
| 178 | `@typescript-eslint/no-unused-vars` | warning |
| 150 | `@typescript-eslint/no-explicit-any` | **error** |
| 18 | `react-hooks/exhaustive-deps` | warning |
| 16 | `@next/next/no-img-element` | warning |
| 8 | `react-hooks/set-state-in-effect` | **error** |
| 6 | `@next/next/no-html-link-for-pages` | **error** |
| 2 | `@typescript-eslint/no-require-imports` | **error** |
| 1 | `prefer-const` | **error** |
| 1 | `react-hooks/refs` | **error** |

### 4.2 A trap worth recording

`tsconfig.json` sets `"incremental": true`, and a stale **`tsconfig.tsbuildinfo` (447 KB, dated 17 Aug)** is committed to the working tree as an untracked artifact. `tsc` was run both with it present and with it removed; both returned 0 errors, and a deliberately injected type error was caught in both cases — so the clean result is real. But the file should be deleted and gitignored, because it makes "0 TypeScript errors" impossible to trust at a glance.

---

## 5. Test inventory

```
TOTAL TEST FILES                 79
TEST FILES EXECUTED BY npm test  19
TEST FILES NOT EXECUTED          60
```

`package.json:13` hard-codes the 19 filenames. There is **no glob, no runner config, and no discovery** — a new test file is invisible to CI unless someone edits that string.

### 5.1 Executed by `npm test` (19)

`services-matching`, `services-marketplace`, `services-api`, `services-authz`, `services-e2e`, `rendered-html`, `design-tokens`, `ui-components`, `public-shell`, `auth-phase4`, `integrations-constants`, `integrations-pairing`, `integrations-sync`, `integrations-radar`, `integrations-notifications`, `integrations-realtime`, `integrations-news-ads`, `command-center`, `messages-contract`.

### 5.2 Results

| Run | Files | Tests | Pass | Fail | Skipped |
|---|---|---|---|---|---|
| `npm test` suite | 19 | 219 | 208 | **11** | 0 |
| Everything under `tests/` | 70 | 1,012 | 988 | **22** | 2 |
| E2E scripts outside `tests/` | 9 | — | — | — | **not run** (need a live server + seeded DB) |

The safest way to execute all currently-runnable tests **without modifying any test logic** is:

```
node --import tsx --test $(find tests -type f \( -name '*.test.mjs' -o -name '*.test.ts' -o -name '*e2e*.mjs' \) | sort)
```

This is what produced the 1,012-test figure. The 9 remaining files (`_e2e_ads.mjs`, `_e2e_clean.mjs`, `_e2e_seed.mjs`, `scripts/auth-closure-e2e.mts`, `scripts/properties-f2-e2e.mjs`, `scripts/auctions-f2-production-e2e.mjs`, `scripts/auctions-f3-contract-e2e.mjs`, `scripts/organizations-f2-production-e2e.mjs`, `scripts/organizations-f3-production-e2e.mjs`) are standalone drivers that require a running server and a live database.

**The release test suite is NOT marked PASS.** 22 failures are confirmed and 9 files remain unaccounted for.

### 5.3 The 22 failures

| File | Failing | Root cause (verified) |
|---|---|---|
| `tests/amrs/db-schema.test.ts` | 10 | The test reads *the alphabetically last* `.sql` in `drizzle-pg/` (`tests/amrs/db-schema.test.ts:22-27`, `files.sort().pop()`). That is now `0016_extend_countries_config.sql`, not the AMRS migration it was written against. **Stale test, breaks on every new migration.** |
| `tests/rendered-html.test.mjs` | 4 | (a) imports `dist/server/index.js` — the **vinext build output**, which no longer exists; (b) reads `src/components/public/public-page-shell.tsx`, a file **deleted** from the working tree; (c) two CSS/registry assertions superseded by the ad-registry refactor. |
| `tests/command-center.test.mjs` | 3 | Asserts `780px` breakpoint, dark-mode metric styles and LTR bar-label styles in `src/styles/admin.css`; those selectors no longer exist. |
| `tests/public-shell.test.mjs` | 2 | Expects the legacy public top-ad region and a single hero slot in SSR output; the standard 8-slot ad layout replaced both. |
| `tests/design-tokens.test.mjs` | 1 | Raw `z-20` utility in `src/components/ui/LuxuryPropertyCard.tsx` instead of a layer token. **Real product violation.** |
| `tests/organizations-hardening-f1.test.mjs` | 1 | Asserts `PG_IDENTITY_SCHEMA_VERSION = 4`; actual is **5** (`lib/db/pg-identity-schema.ts:3`). Stale test. |
| `tests/services-api.test.mjs` | 1 | Service-category CRUD lifecycle: expected 1, got 0. **Needs investigation in Phase 1.** |

2 skipped: PG identity-schema apply/upgrade tests (skip when no DB). 1 further skip: `tests/e2e/production-runtime.test.mjs` self-skips when `E2E_BASE_URL` is unset — and its skip message still says *"run against `vinext start`"*.

---

## 6. Test coverage gaps — the 60 files `npm test` never runs

- **auth** (4): `tests/auth-core.test.ts`, `tests/dev-login.test.mjs`, `tests/session.test.mjs`, `scripts/auth-closure-e2e.mts`
- **land / FindMyLand** (3): `tests/land/find-my-land.test.ts`, `tests/land/land-flow.test.ts`, `tests/land/amrs-directory.test.ts`
- **geo** (1): `tests/geo/geo-pipeline.test.ts`
- **ads** (4): `tests/ads-engine.test.mjs`, `tests/ads-schema-contract.test.mjs`, `tests/standard-public-ad-layout.test.mjs`, `_e2e_ads.mjs`
- **services** (1): `tests/services-listings-route.test.ts`
- **messaging** (0): none missing — `messages-contract` is in the suite
- **auctions** (4): `tests/auctions-contract-f3.test.mjs`, `tests/auctions-hardening-f1.test.mjs`, `scripts/auctions-f2-production-e2e.mjs`, `scripts/auctions-f3-contract-e2e.mjs`
- **organizations** (5): `tests/organizations-hardening-f1.test.mjs`, `tests/organizations-verification-f2.test.mjs`, `tests/organizations-workspace-f3.test.mjs`, `scripts/organizations-f2-production-e2e.mjs`, `scripts/organizations-f3-production-e2e.mjs`
- **office integration** (0): none missing — all seven `integrations-*` files are in the suite
- **runtime** (3): `tests/runtime-env.test.mjs`, `tests/schema-latch.test.mjs`, `tests/e2e/production-runtime.test.mjs`
- **security** (4): `tests/security-headers.test.mjs`, `tests/rate-limit.test.mjs`, `tests/audit-log.test.mjs`, `tests/origin-guard.test.mjs`
- **tools** (2): `tests/tools/pdf-to-word-layout.test.ts`, `tests/tools/points-to-dxf.test.ts`
- **news** (9): all of `tests/news/**`
- **AMRS** (13): all of `tests/amrs/**`
- **e2e** (3): `_e2e_clean.mjs`, `_e2e_seed.mjs`, `scripts/properties-f2-e2e.mjs`
- **other** (4): `tests/accessibility.test.mjs`, `tests/email-transport.test.mjs`, `tests/public-config-consistency.test.mjs`, `tests/public-navigation-constitution.test.mjs`

**The most alarming gaps are `security` (4 files, 0 executed) and `AMRS` (13 files, 0 executed).** Security headers, rate limiting, origin guarding and audit logging have real test coverage that has never been part of the release gate.

---

## 7. Build result

**Command:** `npx next build`

**Attempt 1 (unmodified source): exit 1.**
```
Error: next/font: error: Failed to fetch Cairo from Google Fonts.
Error: next/font: error: Failed to fetch Inter from Google Fonts.
```
`app/layout.tsx:4` uses `import { Cairo, Inter } from "next/font/google"`. The workspace proxy blocks `fonts.googleapis.com` (`curl` → `CONNECT tunnel failed, 403`). **This is an environment limitation, not a repository defect** — but it does mean the build has a hard dependency on outbound access to Google Fonts at build time, which will break any air-gapped or restricted CI runner. Recorded as P2.

**Attempt 2 (temporary font shim, since reverted): exit 0.**
```
▲ Next.js 16.3.1 (Turbopack)
- Environments: .env
✓ Compiled successfully in 6.1s
  Running TypeScript ... Finished TypeScript in 25.7s
✓ Generating static pages using 1 worker (90/90) in 1459ms
```

* Warnings: **0**
* Route-generation failures: **0**
* Server/client bundling failures: **0**
* Dynamic-import problems: **0**
* Cloudflare-specific import problems at build time: **0** (the `cloudflare:` imports are all dynamic and therefore deferred to runtime — see §11.D)
* Environment-validation problems: **0**
* Output: `.next/standalone/server.js` present; `.next/standalone/.env` present (**the build copies `.env`, including `SESSION_SECRET` and the Neon credentials, into the deployment artifact**)

---

## 8. Runtime result

Started with the **actual production command from `package.json`**, then with the artifact that `next.config.js` actually produces. The development server was not used as evidence.

### 8.1 `npm start` (= `next start`)

Boots, then prints:

```
⚠ "next start" does not work with "output: standalone" configuration.
  Use "node .next/standalone/server.js" instead.
```

**The production command in `package.json` is contradicted by `next.config.js`.**

### 8.2 `node .next/standalone/server.js` — as built

| Path | Status |
|---|---|
| `/` | 200 |
| `/login` | 200 |
| `/properties` | 200 |
| `/tools` | 200 |
| `/services` | 200 |
| `/_next/static/chunks/*.js` | **404** |
| `/favicon.svg` (any `public/` asset) | **404** |

### 8.3 `node .next/standalone/server.js` — after manually copying `.next/static` and `public` into `.next/standalone/`

| Path | Status | Time |
|---|---|---|
| `/` | 200 | 0.03s |
| `/login` | 200 | 0.01s |
| `/register` | 200 | 0.02s |
| `/properties` | 200 | 0.02s |
| `/properties/search` | 200 | 0.02s |
| `/tools` | 200 | 0.02s |
| `/tools/find-my-land` | 200 | 0.01s |
| `/services` | 200 | 0.01s |
| `/news` | 200 | 0.01s |
| `/offices` | 200 | 0.02s |
| `/messages` | 200 | 0.03s |
| `/admin` | 200 | 0.03s |
| `/_next/static/chunks/*.js` | **200** | — |
| `/favicon.svg` | **200** | — |
| `/api/health/live` | 200 | 0.01s |
| `/api/health` | **503** `{"status":"unhealthy","database":{"status":"down"}}` | 30.0s |
| `/api/health/ready` | **timeout** | >45s |
| `/api/news` | 200 (degrades to empty) | 14.9s |
| `/api/geo?type=countries` | **500** | 30.0s |
| `/api/properties` | **500** | 30.0s |
| `/api/currencies` | **500** | 30.0s |
| `/api/ads/match-batch` (GET) | 405 (POST-only — correct) | — |
| `/api/auth/google` | 307 → Google, with an **empty `client_id`** | — |
| `/api/auth/google/callback` | **500** | — |

**Nothing in `package.json` performs the `.next/static` + `public` copy.** The standalone artifact as produced is unshippable.

**Two runtime facts worth noting independently of the missing database:**

* Every page returns 200 in ~20 ms with the database completely unreachable. Data-driven pages therefore do **no** server-side data fetching — they render an empty shell and fetch client-side. That is a product decision, not a defect, but it means **page-level HTTP 200 is not evidence that anything works.**
* API failures take **30 seconds** to surface. There is no short connect timeout on the PostgreSQL client, so a DB outage becomes a request pile-up rather than a fast failure. Recorded as P1.

---

## 9. Database result

**Live connectivity: UNVERIFIED.** DNS for the Neon host resolves (IPv6), but TCP/5432 is blocked from this workspace. The 503/500 responses above are consistent with an unreachable database, and `/api/health` correctly reports `database.status = "down"`. **Re-run §8.3 on a machine with database egress before trusting any API result.**

Everything below is from current source.

### 9.1 Provider selection

`lib/config/runtime-env.ts:102-114`:

```ts
function parseDbProvider(raw: string | undefined, isProduction: boolean): DbProvider {
  const value = (raw ?? "").trim().toLowerCase();
  if (!value) {
    if (isProduction) return "postgres";
    return "d1";
  }
  if (!DB_PROVIDER_VALUES.includes(value as DbProvider)) { fail(...); }
  return value as DbProvider;
}
```

* Production with `DB_PROVIDER` **unset** → silently defaults to `postgres`.
* Production **accepts `mysql` and `d1` without error.** Multiple documents claim it fails fast on anything but `postgres` (§10) — **it does not.**
* Non-production defaults to `d1`, a binding that cannot exist under Node.
* `drizzle.mysql.config.ts:8` defaults to `mysql://root:root@localhost:3306/akarpromax`, so a mis-set `DB_PROVIDER=mysql` in production boots silently against a local MySQL instead of failing.

### 9.2 Where schema creation happens — **this is the important finding**

| Trigger point | What happens |
|---|---|
| **During deployment** | Nothing. No `prebuild` / `postbuild` / `prestart` hook exists. |
| **During startup** | Nothing. No `instrumentation.ts`, no `middleware.ts`. |
| **On first request (per process)** | `lib/pg-runtime.ts:227` — `getPgRuntimeDb()` memoises `ensureContentSchema(adapter)`. `lib/content-schema.ts` contains **52** `CREATE TABLE` / `CREATE INDEX` / `ALTER TABLE` statements, executed through `flushDdl()` (`lib/pg-runtime.ts:196-216`) inside the request path. |
| **Per request, in 21 API route files** | `ensurePgIdentitySchema()` (`lib/db/pg-identity-schema.ts:423`) runs `applyPgIdentitySchema`, which contains **56** DDL statements (`CREATE TABLE IF NOT EXISTS users …`, 20+ `ALTER TABLE users ADD COLUMN IF NOT EXISTS …`, `ALTER TABLE … SET DEFAULT …`). Also `ensureAdSchema`, `ensureCompanySchema`. Memoised per process, but the **first request after every deploy, restart, scale-out or cold start executes DDL against production.** |
| **Through scripts** | `npm run db:migrate:pg` exists (`node --import tsx scripts/apply-pg-identity-schema.ts`) but is **not wired into build, start, or any deployment step.** |

**FLAGGED: runtime DDL / schema mutation is performed during ordinary user requests.** Concretely: 21 route files (`app/api/amrs/**`, `app/api/admin/verifications/**`, `app/api/admin/organizations/[id]/review`, `app/api/land/discover-surveyors`, `app/api/admin/companies/taxonomy/**`, `app/api/ads/request`, `app/api/admin/ads`, `app/api/health/ready`) can issue `CREATE TABLE` / `ALTER TABLE` against the production database as a side effect of a user hitting an endpoint. In a multi-instance deployment this races, and it means the application role needs DDL privileges in production.

`drizzle-pg/` contains **17 numbered migrations** (`0000`…`0016`) plus `meta/`, but nothing applies them automatically. `drizzle.config.ts:5-18` lists 12 schema files and **omits** `geo-schema.ts`, `currency-schema.ts`, `auction-hardening-schema.ts`, `limited-auction-schema.ts`, `vehicle-schema.ts` and `lib/db/pg-identity-schema.ts` — so `npm run db:generate` cannot reproduce the live schema.

---

## 10. Runtime / deployment contradictions

### 10.1 Legacy runtime audit (Step 9) — every reference classified

| Reference | Location | Classification |
|---|---|---|
| `vinext` (86 hits total, 25 outside `scripts/backup`) | `scripts/patch-vinext-windows.mjs` (whole file) | **LEGACY** — runs on every `npm ci`, always no-ops |
| | `lib/pg-runtime.ts:12-53`, `lib/runtime-db.ts:23`, `lib/services/db.ts:11-12`, `lib/integration/db.ts:9-10`, `lib/news/schema.ts:7-8`, `lib/news/rss.ts:5`, `lib/config/runtime-env.ts:106` | **DOCUMENTATION ONLY** (comments describing a dead runtime — actively misleading) |
| | `tests/e2e/production-runtime.test.mjs:9,16,26,99`, `tests/services-e2e.mjs:6` | **TEST ONLY** — stale instructions |
| | `vite.config.ts.vinext-backup`, `worker/index.ts.vinext-backup` | **DEAD CODE** (renamed out of the build) |
| | `tsconfig.json:54` (`.vinext` exclude) | **DEAD** |
| `cloudflare:sockets` | `AGENTS.md:327-329` only | **DOCUMENTATION ONLY** |
| `cloudflare:workers` | `lib/runtime-assets.ts:2` | **ACTIVE — BROKEN** (see §11.D) |
| | `lib/runtime-db.ts:87` (`isD1Available`) | **ACTIVE but safe** — wrapped in `try/catch`, correctly returns `false` |
| | `lib/pg-runtime.ts:26` (`detectWorkersRuntime`) | **ACTIVE but safe** — `try/catch`, correctly selects the Node path |
| | `lib/runtime-db.ts:63` | **LEGACY** — only inside `case "d1"`, unreachable under Node |
| | `db/index.ts:1` (top-level static import) | **DEAD CODE** — nothing imports `@/db`; would hard-crash at module load if anything ever did |
| | `types/cloudflare-runtime.d.ts:50-53` | **DOCUMENTATION ONLY** (ambient types; also why 15 live routes can name `D1Database` without importing it) |
| `D1` / `D1Database` (52 / 150 hits) | ~15 live `app/api/**/route.ts` files use `D1Database` as the *interface type* of the runtime DB adapter | **ACTIVE (as a type contract only)** — the adapters are PG/MySQL, not D1 |
| | `examples/d1/**`, `README.md:24` | **DOCUMENTATION ONLY** |
| `R2Bucket` | `lib/runtime-assets.ts:1`, `app/api/ad-assets/route.ts:24` | **ACTIVE — BROKEN** |
| | `types/cloudflare-runtime.d.ts:37,53` | **DOCUMENTATION ONLY** |
| Wrangler | `package.json:74` (devDependency), `tsconfig.json:55`, `README.md:19` | **DEAD** — no `wrangler.jsonc`, no config consumes it |
| `output: standalone` | `next.config.js:4` | **ACTIVE** — and contradicted by `package.json` `start` |

**Nothing was deleted.** This is an inventory only.

### 10.2 Configuration vs documentation (Step 10)

Twelve documents describe a production runtime that does not exist. Representative citations:

| Document | Claim | Contradicted by |
|---|---|---|
| `README.md:1,3-4,24-26,33-34` | "vinext-starter … running on vinext with Cloudflare D1"; `vite.config.ts` simulates bindings; `db/schema.ts` "starts intentionally empty" | Next.js 16.3.1; `vite.config.ts` does not exist; `db/schema.ts` is 541 lines |
| `AGENTS.md:237-239` | "app needs `vinext@1.0.0-beta.5`, installed `--no-save`, NOT in package.json" | `npm ci` exit 0 and a clean build with no vinext at all |
| `AGENTS.md:400` | "`npm ci` → fails EUSAGE (lockfile out of sync)" | **`npm ci` exit 0** |
| `AGENTS.md:244-257` | Windows 404 fixed by patching `node_modules/vinext/dist/server/static-file-cache.js` | Path does not exist; the real 404 cause today is the un-copied `.next/static` + `public` |
| `docs/deployment/PRODUCTION_DEPLOYMENT.md:7-8,29,34` | `npm run build` → `vinext build` → `dist/server/`; `npm start` → `vinext start --port $PORT`; smoke-test `GET /assets/*` | `next build` → `.next/standalone`; `next start` is refused; the asset surface is `/_next/static/*` |
| `docs/deployment/PRODUCTION_CHECKLIST.md:12,21-22,28` | "`npm start` boots without runtime-db errors"; "static asset cache-key patch present post-`npm ci`" | `next start` refuses to boot under standalone; postinstall is a no-op |
| `docs/deployment/HEALTH_CHECKS.md:26` | `kill -9 $(pgrep -f 'vinext start')` | No such process |
| `docs/deployment/ROLLBACK_RUNBOOK.md:16-17,33` | Rollback = `npm run build && npm start` | Same failure; no step copies static assets |
| `docs/runtime/RUNTIME_TARGET_DECISION.md:3,14-16,19` | Status **Proposed** (2026-08-07); production = `vinext start`; "`nodemailer` not declared in package.json" | `package.json:43` declares `nodemailer ^9.0.5` |
| `docs/runtime/ENVIRONMENT_MATRIX.md:58,60,141` | "production **only** allows `postgres`; missing / `mysql` / `d1` fail fast" | `lib/config/runtime-env.ts:102-114` — unset silently defaults to `postgres`; `mysql` and `d1` are accepted |
| `docs/runtime/ENVIRONMENT_MATRIX.md:103` | Email vars have "no boot validation" | `lib/config/runtime-env.ts:134-137` hard-fails on an invalid `EMAIL_TRANSPORT` in production |
| `docs/runtime/VINEXT_RUNTIME_PATCHES.md:3,53` | "For `vinext@0.0.50`"; postinstall is `patch-vinext-windows.**js**` | Not installed; `AGENTS.md:237` says beta.5; the real script is `.mjs` |
| `docs/release/STAGING_BUILD_RUNBOOK.md:11-13,29-34` | build/start/dev cited to `package.json:9-11` as vinext commands; "output is Workers-targeted (`dist/server/wrangler.json`)" | Those lines are `next dev --port 3010` / `next build` / `next start`; no `wrangler.json` is emitted |
| `docs/release/STAGING_DEPLOYMENT_RUNBOOK.md:9-22,79,86` | Staging = Cloudflare Workers via `vinext deploy`; "Node hosting LOW fit; PG queries fail" | No deploy path exists; PG works on Node standalone |
| `docs/release/STAGING_ENVIRONMENT_MATRIX.md:50,56,60-61,99` | `PORT` handled by `vinext/dist/server/prod-server.js`; bindings wired by `vite.config.ts`; "**No `NEXT_PUBLIC_*` variables exist in the codebase (grep-verified)**" | File absent; no vite config; `lib/auth/oauth.ts:27` reads `NEXT_PUBLIC_BASE_URL` and `src/components/ads/ad-slot-frame.tsx:73` reads `NEXT_PUBLIC_ADS_REVIEW_MODE` |
| `docs/release/RELEASE_CANDIDATE_MANIFEST.md:8,43,48` | RC 2026-08-09; "Build PASS = vinext build → `dist/server/wrangler.json`"; "Toolchain: Node v24.14.0, npm 11.9.0" | `next build`/standalone; workspace Node v22.22.2, npm 10.9.7 |
| `docs/release/RELEASE_CANDIDATE_MANIFEST.md:36,40` | "912/912 PASS", "npm test 192/192 PASS" | Measured today: 219 tests, 208 pass, **11 fail** |
| `docs/decisions/ADR-001-INTERNAL-RUNTIME-TARGET.md:11-16,59-65` (ACCEPTED, 2026-08-05) | Production bundle targets Cloudflare Workers; runtime-determining files are `vite.config.ts` + `worker/index.ts` | Both exist only as `.vinext-backup` |
| `docs/integrations/DATABASE_TARGET_DECISION.md:15,25-27,57` (Accepted, 2026-08-07) | "Postgres cannot load under `vinext start`" — Option A (Postgres) **Rejected** | Postgres is the live production provider |
| `docs/audit/RUNTIME_TARGET_AUDIT.md:24-27` | "Node Runtime (target) … **Not yet implemented**" | It is the only implemented runtime |

### 10.3 Certification claims that are no longer true

| Document | Claim | Date |
|---|---|---|
| `docs/release/STAGING_READINESS.md:14-15` | "STAGING INFRASTRUCTURE READY: **YES** / READY TO DEPLOY TO STAGING: **YES**" | undated |
| `docs/release/RELEASE_CANDIDATE_MANIFEST.md:8,32-46,88` | RC1, all-PASS certification table, source "FROZEN" | 2026-08-09 |
| `docs/release/FINAL_CERTIFICATION_REPORT.md:42,92,112` | "ADVERTISING READY: YES", "912/912 PASS", "all code deliverables complete" | undated |
| `docs/release/LIVE_RUNTIME_CERTIFICATION.md:9,17` | "Live Runtime Certification … PASS", `schema.mode = d1`, `/assets/* 200` | undated |
| `docs/runtime/POSTGRES_RUNTIME_COMPATIBILITY.md:3` | Status **Verified**, environment `vinext start` | 2026-08-07 |
| `docs/runtime/VINEXT_RUNTIME_PATCHES.md:3` | Status **Verified**, for `vinext@0.0.50` | 2026-08-06 |

**Every one of these predates the Next.js/PostgreSQL migration and none has been re-run against the current runtime.** `docs/release/DATABASE_RUNTIME_MATRIX.md:6` ("the production architecture is PostgreSQL only") is the single headline claim that still matches reality.

### 10.4 Environment-variable mismatches

**Read by code, absent from `.env.example`:**

| Variable | Read at | Consequence |
|---|---|---|
| `NEXT_PUBLIC_BASE_URL` | `lib/auth/oauth.ts:27` — `process.env.NEXT_PUBLIC_BASE_URL \|\| "http://localhost:3010"` | **The OAuth redirect URI is pinned to `http://localhost:3010` in every environment, including production.** `.env.example:107,112` tells operators to register `${APP_PUBLIC_URL}/api/auth/…` instead — following the documentation guarantees `redirect_uri_mismatch`. |
| `APP_BASE_URL` | `app/api/land/[id]/share/route.ts:7` (defaults `http://localhost:3000`) | Share links point at localhost |
| `NEXT_PUBLIC_ADS_REVIEW_MODE` | `src/components/ads/ad-slot-frame.tsx:73` | undocumented |
| `SMTP_FROM_NAME` | `lib/email.ts:232` | undocumented |
| `E2E_BASE_URL`, `E2E_AUTH_EMAIL`, `E2E_AUTH_PASSWORD`, `PROPERTIES_E2E_BASE`, `AUCTIONS_E2E_BASE`, `AUCTIONS_F3_BASE`, `ORGANIZATIONS_E2E_BASE`, `ORGANIZATIONS_F3_BASE` | E2E scripts | undocumented |

**Documented but never read:** `AD_TRACKING_SECRET` (`.env.example:71`), `CODEX_SANDBOX` / `WRANGLER_WRITE_LOGS` / `WRANGLER_LOG_PATH` / `MINIFLARE_REGISTRY_PATH` (`docs/runtime/ENVIRONMENT_MATRIX.md:126-127`).

**Documented with the wrong meaning:**

* `.env.example:10-13` calls `DATABASE_URL` "the MySQL connection, REQUIRED when `DB_PROVIDER=mysql`". `lib/config/runtime-env.ts:130,154` treats it as the **PostgreSQL** URL and requires it in production regardless of provider.
* `.env.example:15-18` says "`postgres` (deprecated) … Production defaults to mysql … Postgres is rejected in production (WEB-03)". `lib/config/runtime-env.ts:107` returns `postgres` as the production default and never rejects it. **This is exactly backwards.**
* `.env.example:27` ships `SESSION_SECRET=REPLACE_WITH_32_BYTE_RANDOM_STRING` — that literal string is in `KNOWN_WEAK_SECRETS` (`lib/config/runtime-env.ts:45`), so copying the template verbatim hard-fails the production boot with no explanation.

---

## 11. Verified defects (Step 11 — confirmed, NOT fixed)

### A. FindMyLand

| # | Suspicion | Verdict | Evidence |
|---|---|---|---|
| A1 | PDF text flattening | **CONFIRMED** | Client joins every text item on a page with a single space, discarding `transform`/y-coordinates: `src/components/tools/FindMyLand.tsx:820-823` (`content.items…map(item => item.str).join(" ")`); page boundaries are the only structure kept (`:828`). Server is worse — `lib/land/ocr/ocr-engine.ts:62` does `fullText += item.str + ' '` with **no newline at all**; bounding boxes are captured at `:63-72` but `extractStructuredData(fullText)` (`:81`) only consumes the flat string. OCR text is then further mangled: `src/components/tools/FindMyLand.tsx:414` — `t.replace(/(\d)\s+(\d)/g, "$1$2")` — `\s` matches `\n`, so adjacent numeric **columns** and numbers across **line breaks** are welded together before parsing. |
| A2 | OCR fallback criteria | **CONFIRMED — three different thresholds** | Per page: `FindMyLand.tsx:825` — `pageText.replace(/\s/g,"").length < 25`. Whole document: `:829-831` — `< 80 && pagesNeedingOcr.length === 0`. Server: `lib/geo/text-extraction.ts:32` — `ocrLen > 0 && nativeLen < 30`. Non-PDF uploads always OCR (`:858-864`). **The server OCR engine never OCRs a PDF at all** — `lib/land/ocr/ocr-engine.ts:25-29` routes `application/pdf` to pdfjs-text-only; tesseract is reachable only for `image/*` (`:86`). |
| A3 | Arabic coordinate headers | **NOT CONFIRMED — they are not supported** | The only coordinate-table header recogniser is Latin-only: `lib/geo/evidence-extraction.ts:28` — `/(?:\bLINE\s+)?\bNORTHING\s+EASTING\b…/gi`. `extractZoneLessUtmRows` returns `[]` when it does not match (`:299-301,344`). Arabic tokens `إحداثيات` / `خط العرض` / `خط الطول` appear only as **relevance keywords** (`lib/land/intelligence/classifier.ts:53-54`, `adapters.ts:30-32`, `lib/geo/security-gate.ts:152`), never as column parsers. The client matches only `نقطه` (ha spelling, not `نقطة`) as an optional row prefix (`src/lib/tools/land-analysis.ts:134`). No match anywhere for `الشمال` / `الشرق` / `س` / `ص` as axis headers. |
| A4 | Legacy parser availability | **CONFIRMED — three parallel parsers, two still publicly reachable** | Current: `lib/land/intelligence/resolver.ts` → `app/api/land/resolve/route.ts:2,38`, the only endpoint the UI calls (`FindMyLand.tsx:872`). Legacy #1: `lib/geo/pipeline.ts` → `app/api/geo/extract/route.ts:2,36` — **live, POST-able, zero in-app callers.** Legacy #2: `lib/land/ocr/ocr-engine.ts` → `app/api/land/analyze/route.ts:2,6` — **live, zero in-app callers.** Legacy #3 (true dead code): `src/components/tools/LandMapper.tsx:47-90` has its own duplicate pdfjs+tesseract parser and is never imported — both tool ids map to FindMyLand (`src/components/tools/ToolsPageClient.tsx:49-50`). Duplicated logic pairs: `lib/geo/crs.ts` vs `lib/land/intelligence/crs-detector.ts`; `lib/geo/classification.ts` vs `lib/land/intelligence/classifier.ts`. |
| A5 | FindMyLand tests in `npm test` | **CONFIRMED — none are** | `tests/land/find-my-land.test.ts`, `tests/land/land-flow.test.ts`, `tests/land/amrs-directory.test.ts`, `tests/geo/geo-pipeline.test.ts` all exist and import the **current** resolver stack — and none appears in the 19-file list at `package.json:13`. |

### B. Messaging

| # | Suspicion | Verdict | Evidence |
|---|---|---|---|
| B1 | Duplicate message systems | **CONFIRMED — three surfaces** | **Family A** (Drizzle/Postgres): `app/api/messages/route.ts`, `app/api/messages/[id]/route.ts`; tables `message_threads`, `message_participants`, `messages`, `message_attachments` (`lib/db/schemas/messages-schema.ts:4,17,26,38`). **Family B** (raw SQL over the runtime adapter): `app/api/service-messages/route.ts`, `…/threads/route.ts`, `…/threads/[threadType]/[threadId]/route.ts`; tables `service_messages`, `service_message_threads` (`lib/services-marketplace-schema.ts:283`), `service_message_participants` (`:292`). **Family C** (proxy): `app/api/services/messages/route.ts:19` — `return proxyToCanonical(request, "/api/service-messages")`, re-issuing the request over `fetch` and forwarding raw headers. The two data models never share data — A keys on a uuid, B on the composite `PRIMARY KEY (thread_type, thread_id)` (`lib/services-marketplace-schema.ts:290`). |
| B2 | Service vs generic API | **CONFIRMED — materially different** | Identity: A uses `session.userId` (uuid) — `app/api/messages/route.ts:15`; B stores the **email** as the user id — `app/api/service-messages/route.ts:37` (`senderUserId: identity.email`). Payload: A `{title, context, contextId, recipientId, content}` (`:31-42`) vs B `{threadType, threadId, body}` (`:19-21`). Envelope: A `{success, data}` with Arabic error strings vs B bare `{threads}`/`{messages}`/`{ok,id}` with machine codes. Validation: B enforces the context enum (`lib/services/message-contexts.ts:35`) and a 4000-char cap; **A validates nothing** — `content` is inserted unchecked (`app/api/messages/[id]/route.ts:26`). |
| B3 | `threadType`/`threadId` vs `thread_type`/`thread_id` | **CONFIRMED — inconsistent, with a live UI bug** | Route params and request JSON are camelCase; DB columns are snake_case (`lib/services-marketplace-schema.ts:284-285`); responses are **snake_case** because `listInbox` hand-builds them (`lib/services/marketplace.ts:2063-2064`) and `threadMessages` does `SELECT *` (`:1892`) — **except** `startMessageThread`, which returns camelCase (`:2000-2006`). `StartThreadButton` then reads `data.thread.thread_type` off that camelCase object (`src/components/services/StartThreadButton.tsx:35,39`), so both values are `undefined` and the redirect becomes `?open=undefined%3Aundefined`. Same class of bug in Family A: `app/api/messages/route.ts:12-16` returns Drizzle join rows keyed by SQL table name, but `app/messages/page.tsx:26` reads `t.threads.id`, which does not exist. **No silent zero-row SQL risk** — all SQL binds are positional `?n`. |
| B4 | Property conversation participant resolution | **CONFIRMED — participant list is empty** | `app/properties/[id]/page.tsx:225-232` renders `<StartThreadButton threadType="property" threadId={property.id} …>` with `participantIds` **omitted** (defaults to `[]`, `StartThreadButton.tsx:17`). `startMessageThread` therefore seeds only the caller (`lib/services/marketplace.ts:1995`); the owner/agent is never derived. `isThreadParticipant` has no implicit-owner branch for `property` (only `professional`, `:1938-1940`), so the owner can never read the thread. `resolveRecipientUserId` falls through to the participant query and returns `null` (`:1956,1971-1983`), so `sendMessageFull` skips the notify/outbox block entirely (`:1872-1884`) — **the buyer's message is written and nobody is told.** `listInbox` then hides the thread because it has zero messages (`:2051`). The organization page does pass a participant (`src/components/public/organization-profile-page.tsx:191`) — the property page is the outlier. |
| B5 | Request/provider conversation isolation | **CONFIRMED — cross-provider leak · SECURITY** | `threadMessages` is keyed only by the request id: `lib/services/marketplace.ts:1892` — `SELECT * FROM service_messages WHERE thread_type = ?1 AND thread_id = ?2 …`. The guard admits **any** provider with a live offer: `:1927-1931` — `SELECT id FROM service_offers WHERE request_id = ?1 AND provider_user_id = ?2 AND status != 'withdrawn'`. Providers P1 and P2 both bid on request R; P1 posts a price; P2 `GET`s `/api/service-messages/threads/request/R`, passes the guard, and reads P1's messages verbatim. `listInbox` puts `request:R` in P2's inbox automatically (`:2019-2023`). Writes are equally unscoped (`:1868-1870`), and `markThreadRead` clears unread state on **all** other senders' messages (`:1901`). `order` threads are correctly isolated (`:1917-1922`) — the defect is specific to the `request` context. |
| B6 | Authorization of `/api/messages/[id]` | **CONFIRMED — there is none · SECURITY** | The entire guard is a login check: `app/api/messages/[id]/route.ts:11`. The GET then reads by thread id with no ownership or participant predicate — `:12` `db.select().from(messages).where(eq(messages.threadId, id))`; `messageParticipants` is not even imported (`:3`). POST is identically unguarded (`:25-27`). **Any authenticated user can read, and write into, any thread whose uuid they know** — and `app/api/messages/route.ts:18` hands thread ids to callers. Related: `startMessageThread` has no authorization at all (`lib/services/marketplace.ts:1985-2007`), so any authenticated user can self-enrol into any `property` / `general` / `organization` thread via `ensureMessageParticipant`, after which `isThreadParticipant` returns true (`:1933-1937`). |
| B7 | Realtime behaviour | **NOT CONFIRMED — there is no realtime for messages** | No `EventSource` client exists anywhere in `app/`, `src/`, `components/`, `hooks/`, `lib/`. The only `text/event-stream` in the repo is `app/api/office/v1/stream/route.ts:46` (device/signage events, not messages). `src/components/services/ThreadMessages.tsx:31-39` fetches once on mount with no interval; new messages are appended optimistically client-side only (`:54-60`), so the other party sees nothing until a full page reload. The inbox is likewise one-shot (`app/dashboard/services/inbox/page.tsx:30-48`). |

### C. Office integration

| # | Suspicion | Verdict | Evidence |
|---|---|---|---|
| C1 | `/api/office/v1` media routing | **CONFIRMED — every request returns 400** | Both handlers dispatch on URL path segments: `app/api/office/v1/media/route.ts:59` and `:302` — `const segments = path.split("/").filter(s => s.length > 0)`. For the only URL that can reach this file, `segments = ["api","office","v1","media"]`. POST tests `segments[2] === "initiate"` (`:69`), `"complete"` (`:116`), `"list"` (`:196`, `:228`), `"delete"` (`:266`) — but `segments[2]` is always `"v1"`. GET tests `segments[1] === "list"` (`:311`) — always `"office"`. There is **no catch-all route segment, no `rewrites` in `next.config.js`, and no `middleware.ts`**. Every request therefore falls through to `:296` / `:336` — `{"success":false,"error":"Unknown media action"}`, HTTP **400**. The auth + scope check + a DB connect all execute first. |
| C2 | Actual file persistence | **CONFIRMED — bytes are never stored** | `initiate` writes only metadata (`:96-100`). `complete` inserts a row whose `url` is a **fabricated string** — `:156` `` `/media/${propertyId}/${uploadId}/${generateId()}` ``. `arrayBuffer()` / `stream()` appear nowhere in the file; nothing is written to R2, disk, or a blob column. Worse, the URL is generated **twice with a fresh random id** — `:156` (stored) vs `:187` (returned to the client) — so they never match, and no route serves `/media/**`, so both 404. Secondary: `:167` increments `properties.views` as a "media count"; `:151` writes camelCase columns (`propertyId`, `isFeatured`, `mimeType`, `createdAt`, and the reserved word `order`) while the Postgres schema uses snake_case (`lib/db/schemas/properties-schema.ts:74-84`) and `translateSql` does no identifier-casing translation (`lib/pg-runtime.ts:78-88`). `office_media_upload_sessions` is never created by any DDL. |
| C3 | Realtime stream behaviour | **CONFIRMED — the stream is inert** | `app/api/office/v1/stream/route.ts:44-51` returns `text/event-stream`. It is **not** an in-process EventEmitter — `createRealtimeTransport()` returns a DB-backed transport (`lib/integration/realtime.ts:112-116`), so it would be multi-instance-safe. But the stream replays history once, enqueues `event: ready`, and `start()` ends (`:26-34`) — **no subscription, no polling, no interval**; the controller is never closed, so clients hang on an open socket receiving nothing forever. And **nothing ever publishes**: `DbRealtimeTransport.publish` (`lib/integration/realtime.ts:26`) has zero callers, so `office_realtime_events` is always empty. |

### D. Storage — `cloudflare:workers` under Node

**CONFIRMED and runtime-proven.** `node -e "import('cloudflare:workers')"` → `ERR_UNSUPPORTED_ESM_URL_SCHEME: Only URLs with a scheme in: file, data, and node are supported…`.

`lib/runtime-assets.ts:2` — `const runtime = await import("cloudflare:workers")` — is imported by `app/api/ad-assets/route.ts:3` and called at `:86, :146, :156, :167, :203, :255`. The admin console reaches it (`app/admin/ads/page.tsx` → `ads-admin-client.tsx:505,689,695,700,744` → `fetch('/api/ad-assets')`).

**Every ad-creative operation throws before any storage logic runs**: list assets, multipart initiate/part/complete, simple `PUT`, `DELETE`, and asset serving (`route.ts:202`). Already-stored creatives cannot be displayed either.

The other three `cloudflare:workers` sites are harmless: `lib/runtime-db.ts:87` and `lib/pg-runtime.ts:26` wrap the import in `try/catch` and correctly fall through to the Node path; `lib/runtime-db.ts:63` is unreachable outside `d1` mode; `db/index.ts:1` is dead code.

### E. OAuth

| # | Suspicion | Verdict | Evidence |
|---|---|---|---|
| E1 | Redirect URL construction | **CONFIRMED broken — but NOT header-injectable** | The origin is a module-level constant read once at import: `lib/auth/oauth.ts:27` — `const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL \|\| "http://localhost:3010";`. Callback URIs are literal concatenations (`:34`, `:42`). **No request header is consulted anywhere in the auth path** — grep for `x-forwarded-host` / `get("host")` across `lib/` and `app/api/auth/` returns zero hits, so the attacker-controlled-origin risk is **absent**. The real defect: every `NextResponse.redirect` in the OAuth routes uses a **relative base** — `app/api/auth/google/callback/route.ts:29` — `new URL("/", "/")` — which throws `TypeError: Invalid URL` in Node (verified directly). This is on the **success** path: the session is created at `:28`, then the response 500s. Error paths are equally broken (`:17` throws before the try block; `:32` throws inside the catch). Mirrored in `app/api/auth/facebook/callback/route.ts:17,28,31` and the initiate routes (`google/route.ts:11`, `facebook/route.ts:11`). **Runtime-verified: `GET /api/auth/google/callback` → HTTP 500.** |
| E1b | OAuth CSRF | **CONFIRMED** | No `state` parameter is generated or verified — `lib/auth/oauth.ts:53-60` and `:66-72` build the authorize params without one, and neither callback reads one. |
| E2 | Required environment variables | **CONFIRMED — silent disable, no validation** | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (`lib/auth/oauth.ts:32-33`), `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET` (`:40-41`), `NEXT_PUBLIC_BASE_URL` (`:27`). Every one falls back silently — `:32` `clientId: process.env.GOOGLE_CLIENT_ID \|\| ""`. No presence check, no throw, no boot-time validation. The current `.env` has all four **empty**, so `getGoogleAuthUrl` still succeeds and emits `…/auth?client_id=&redirect_uri=…` (`:61`); the user is redirected off-site and shown a provider-side "invalid client" page. **Runtime-verified: `GET /api/auth/google` → 307 with an empty `client_id`.** The `catch` at `app/api/auth/google/route.ts:10-12` intended as the config guard is dead code, and would itself 500 if it ever fired. |
| E3 | Env-name cross-check | **PARTIAL** | See §10.4. `NEXT_PUBLIC_BASE_URL` is read but undocumented; `APP_PUBLIC_URL`/`APP_URL` are documented as the OAuth origin but never read by OAuth code. |

### F. Advertising

| # | Suspicion | Verdict | Evidence |
|---|---|---|---|
| F1 | `/api/ads/match` vs `/api/ads/match-batch` | **CONFIRMED — N+1; the batch endpoint has zero consumers** | Exactly one browser call site, and it uses the singular endpoint: `src/components/AdSlot.tsx:176` — `fetch("/api/ads/match", …)`, one POST per mounted `AdSlot` inside a `useEffect` (`:168-211`). A repo-wide grep for `match-batch` finds only two documentation hits (`docs/audit/ROUTES_INVENTORY.md:61`, `docs/comparison/ROUTES_COMPARISON.md:19`) — no source, no test, no e2e. A standard public page emits 12 `AdSlotFrame` instances (`src/components/ads/standard-public-ad-layout.tsx:66,73-74,82-83,90-93,99-101`) over 8 canonical slots (`src/config/standard-public-ad-registry.ts:51-58`); lazy gating (`ad-slot-frame.tsx:76,84`) means the hidden responsive twins never fire, giving **~8 separate POSTs per page view where 1 batched POST would do**. |
| F2 | Both endpoints exist | **CONFIRMED** | `app/api/ads/match/route.ts:9` and `app/api/ads/match-batch/route.ts:13`, both `force-dynamic` POST handlers. Batch is functionally complete (caps at 40 contexts, `:18`; validates placements, `:20-24`; single `matchAdsBatch` call, `:28`). **Asymmetry:** the singular route memoises via `cached(…, 30_000, …)` (`match/route.ts:21-25`); the batch route has **no cache**, so migrating naively trades 8 requests for 1 but loses the 30-second server-side cache. Both return HTTP 200 with empty arrays on DB failure (`match/route.ts:28`, `match-batch/route.ts:40`) — **ad failures are invisible to monitoring.** |

---

## 12. Historical defects that are ALREADY FIXED

| Historical claim | Source | Status today |
|---|---|---|
| "`npm ci` fails EUSAGE — lockfile out of sync with package.json" | `AGENTS.md:400` | **FIXED.** `npm ci` exits 0, 755 packages, 38s. |
| "The app needs `vinext@1.0.0-beta.5` installed `--no-save`; it is not in package.json" | `AGENTS.md:237-239` | **FIXED / OBSOLETE.** vinext is neither needed nor installed; the build succeeds without it. |
| "Production bundle is built for Cloudflare Workers" | `ADR-001:11-16`, `docs/audit/RUNTIME_TARGET_AUDIT.md:19-22` | **FIXED.** `next build` produces a Node standalone server. |
| "Postgres cannot load under the production runtime; Option A (Postgres) rejected" | `docs/integrations/DATABASE_TARGET_DECISION.md:15,25-27,57`; `ADR-001:73-79` | **FIXED.** `DB_PROVIDER=postgres` against Neon is the configured production provider, and `pg`/`postgres` load cleanly under Node. |
| "`cookies()` never reads the Cookie header under the production runtime; `/me` always false" | `AGENTS.md:299-303` | **OBSOLETE.** Superseded by the Node runtime; not reproducible. |
| "Windows 404 on `/assets/*` requires patching `node_modules/vinext/…/static-file-cache.js`" | `AGENTS.md:244-257`, `docs/runtime/VINEXT_RUNTIME_PATCHES.md` | **OBSOLETE.** That file does not exist. A *different* static-asset 404 exists today, with a different cause (§8.2). |
| "TypeScript errors present in the tree" | multiple historical logs (`_validation_tsc.log`, `ts-errors-before.txt`) | **FIXED.** `tsc --noEmit` → 0 errors across 831 files (verified with and without the stale build cache, plus a deliberate-error sanity check). |
| "`nodemailer` is not declared in package.json" | `docs/runtime/RUNTIME_TARGET_DECISION.md:19` | **FIXED.** `package.json:43` declares `nodemailer ^9.0.5`. |
| "ESLint is not configured for ESLint 9" | implied by historical lint logs | **FIXED.** `eslint.config.mjs` is a valid ESLint 9 flat config using `eslint-config-next/core-web-vitals` + `/typescript`; it runs and reports correctly. **No new configuration was created.** |

---

## 13. New defects discovered in this baseline

| # | Defect | Evidence |
|---|---|---|
| N1 | **`next start` is incompatible with `output: 'standalone'`.** The production command in `package.json` cannot be used. | Runtime warning from Next.js 16.3.1; `package.json:11` vs `next.config.js:4` |
| N2 | **The standalone artifact ships without static assets.** Every CSS/JS/image 404s until `.next/static` and `public` are copied into `.next/standalone/`. Nothing in the repo does this. | §8.2 vs §8.3 |
| N3 | **`.env` — including `SESSION_SECRET` and the Neon credentials — is copied into `.next/standalone/`** by the build. | `ls .next/standalone/.env` after `next build` |
| N4 | **OAuth callbacks return HTTP 500 on the success path** (relative-base `new URL`). | `app/api/auth/google/callback/route.ts:29`; runtime-verified 500 |
| N5 | **OAuth has no `state` parameter** — CSRF unmitigated. | `lib/auth/oauth.ts:53-60,66-72` |
| N6 | **`NEXT_PUBLIC_BASE_URL` is undocumented and unset**, pinning the OAuth redirect URI to `http://localhost:3010` in production. | `lib/auth/oauth.ts:27` |
| N7 | **`/api/messages/[id]` performs no authorization** beyond "is logged in". | `app/api/messages/[id]/route.ts:11-12,25-27` |
| N8 | **Cross-provider message leak** on service-request threads. | `lib/services/marketplace.ts:1892,1927-1931` |
| N9 | **`startMessageThread` has no authorization** — self-enrolment into arbitrary threads. | `lib/services/marketplace.ts:1985-2007` |
| N10 | **Property conversations are created with an empty participant list**; the owner can never read them and is never notified. | `app/properties/[id]/page.tsx:225-232`; `lib/services/marketplace.ts:1995,1976-1982` |
| N11 | **`StartThreadButton` reads snake_case off a camelCase response**, producing `?open=undefined%3Aundefined`. | `src/components/services/StartThreadButton.tsx:35,39` vs `lib/services/marketplace.ts:2000-2006` |
| N12 | **`app/messages/page.tsx:26` reads `t.threads.id`**, a key the API never returns. | vs `app/api/messages/route.ts:12-16` |
| N13 | **The Office media API is unreachable** — path-segment dispatch can never match; every request 400s. | `app/api/office/v1/media/route.ts:59,69,296,302,311,336` |
| N14 | **Office media uploads are discarded**; the stored URL and the returned URL are different random strings, and neither resolves. | `app/api/office/v1/media/route.ts:156,187` |
| N15 | **Office media SQL uses camelCase identifiers and the reserved word `order` unquoted** against a snake_case Postgres schema. | `app/api/office/v1/media/route.ts:151,311` vs `lib/db/schemas/properties-schema.ts:74-84` |
| N16 | **The Office SSE stream never emits and nothing ever publishes**; clients hang forever. | `app/api/office/v1/stream/route.ts:26-34`; `lib/integration/realtime.ts:26` has zero callers |
| N17 | **Ad-creative storage is entirely broken under Node** (`cloudflare:workers` R2 binding). | `lib/runtime-assets.ts:2`; `app/api/ad-assets/route.ts:86…255` |
| N18 | **Runtime DDL during ordinary user requests** — 56 + 52 DDL statements reachable from 21 API route files. | §9.2 |
| N19 | **`DB_PROVIDER` accepts `mysql` and `d1` in production** and silently defaults to `postgres` when unset — contradicting four documents that promise fail-fast. | `lib/config/runtime-env.ts:102-114` |
| N20 | **`drizzle.config.ts` omits 6 live schema files**, so `npm run db:generate` cannot reproduce the production schema. | `drizzle.config.ts:5-18` |
| N21 | **`tests/amrs/db-schema.test.ts` reads the alphabetically-last migration**, so it breaks on every new migration. | `tests/amrs/db-schema.test.ts:22-27` |
| N22 | **Two live, undocumented, uncalled land-parsing endpoints** (`/api/geo/extract`, `/api/land/analyze`) expose legacy parsers. | `app/api/geo/extract/route.ts:2,36`; `app/api/land/analyze/route.ts:2,6` |
| N23 | **API failures take 30 s to surface** — no short DB connect timeout. | §8.3 timings |
| N24 | **Ad matching fails open with HTTP 200 + empty array**, making outages invisible. | `app/api/ads/match/route.ts:28`; `match-batch/route.ts:40` |
| N25 | **`app/api/messages/route.ts:37-39` inserts `body.recipientId` as a participant with no validation.** | same |
| N26 | **The build requires outbound access to `fonts.googleapis.com`**, breaking restricted CI runners. | §7 |
| N27 | **A stale 447 KB `tsconfig.tsbuildinfo` sits in the working tree** (untracked), making "0 TS errors" untrustworthy at a glance. | §4.2 |
| N28 | **15 npm vulnerabilities (10 high).** | `npm audit` |

---

## 14. P0 blockers — must be fixed before any release

| ID | Blocker | Why P0 |
|---|---|---|
| **P0-1** | `/api/messages/[id]` GET **and** POST have no participant check (N7) | Any authenticated user can read, and inject messages into, any conversation. Data breach. |
| **P0-2** | Cross-provider leak on service-request threads (N8) | Competing bidders read each other's pricing. Commercial-confidentiality breach. |
| **P0-3** | `startMessageThread` has no authorization (N9) | Any authenticated user can self-enrol into arbitrary threads, and add third parties. |
| **P0-4** | The production start command does not work (N1) + the standalone artifact has no static assets (N2) | There is currently **no working deployment procedure.** |
| **P0-5** | OAuth is completely broken — every callback 500s (N4) | Advertised login method is non-functional; the session is created before the 500, leaving inconsistent state. |
| **P0-6** | Runtime DDL during user requests (N18) | Production DDL races across instances; the app role needs DDL privileges; a cold start can mutate the live schema. |
| **P0-7** | `npm test` fails, and covers only 19 of 79 test files (§5) | There is no trustworthy release gate. |
| **P0-8** | `SESSION_SECRET` and Neon credentials are copied into the build artifact (N3) | Any artifact leak is a full credential leak. |

## 15. P1 blockers

| ID | Blocker |
|---|---|
| **P1-1** | Office media API is dead and discards uploads (N13, N14, N15) |
| **P1-2** | Office realtime never emits (N16) |
| **P1-3** | Ad-creative storage broken under Node (N17) |
| **P1-4** | Property conversations have no participants and send no notifications (N10) |
| **P1-5** | `NEXT_PUBLIC_BASE_URL` undocumented/unset → OAuth redirect pinned to localhost (N6); OAuth has no `state` (N5) |
| **P1-6** | `DB_PROVIDER` validation does not match its documented contract (N19); `drizzle.config.ts` cannot regenerate the live schema (N20) |
| **P1-7** | 168 ESLint errors, 150 of them `no-explicit-any`, plus 8 `react-hooks/set-state-in-effect` and 1 `react-hooks/refs` (real React correctness violations) |
| **P1-8** | 30-second failure latency on DB outage (N23); ads fail open silently (N24) |
| **P1-9** | Two undocumented live legacy land endpoints (N22) |
| **P1-10** | 10 high-severity npm vulnerabilities (N28) |
| **P1-11** | Broken client contracts: `StartThreadButton` (N11), `app/messages/page.tsx` (N12), unvalidated `recipientId` (N25) |
| **P1-12** | **Live database connectivity was never verified in this baseline.** Re-run §8.3 with DB egress before Phase 1 sign-off. |

## 16. P2 technical debt

* Three parallel land parsers; two duplicated logic pairs (`crs`, `classification`) — A4.
* FindMyLand has three different OCR-fallback thresholds and no Arabic coordinate-header support — A1/A2/A3.
* Three parallel messaging surfaces (Drizzle, raw-SQL, and an HTTP proxy) — B1/B2.
* Ad matching is N+1 (~8 POSTs/page); the batch endpoint exists and is unused and uncached — F1/F2.
* Dead vinext residue: `postinstall` no-op, `--ignore-pattern dist`, `.vinext`/`.wrangler` excludes, `*.vinext-backup` files, `db/index.ts`, `examples/d1/`, `.openai/hosting.json`, and 6 unused Vite/Cloudflare devDependencies.
* ~30 obsolete documents (§10.2/§10.3) that actively mislead. Six carry PASS/READY certifications for a runtime that no longer exists.
* 212 ESLint warnings (178 unused vars, 18 exhaustive-deps, 16 `no-img-element`).
* Stale `tsconfig.tsbuildinfo` (N27); build depends on Google Fonts reachability (N26).
* Repository hygiene: ~150 loose root-level files — `.log`, `.zip`, `.bundle`, `.bak`, one-off `.py`/`.ps1` migration drivers, `$out`, `$err`, `adlmdll.dll`, `lacadp.dll`, `ara.traineddata`, `eng.traineddata` — plus 11 backup directories. 215 untracked files and 301 uncommitted modifications sit on top of `HEAD`.
* `tests/e2e/production-runtime.test.mjs` self-skips silently when `E2E_BASE_URL` is unset and still names `vinext start`.

---

## 17. Files likely requiring changes in Phase 1+

**Deployment / runtime**
`package.json` (start script, test script, add a static-copy step) · `next.config.js` · `.env.example` · `lib/config/runtime-env.ts` · `drizzle.config.ts` · `scripts/patch-vinext-windows.mjs` (delete) · `tsconfig.json` · `eslint.config.mjs`

**Security (P0)**
`app/api/messages/[id]/route.ts` · `app/api/messages/route.ts` · `lib/services/marketplace.ts` (`threadMessages`, `markThreadRead`, `isThreadParticipant`, `startMessageThread`, `listInbox`) · `app/api/service-messages/threads/[threadType]/[threadId]/route.ts` · `app/api/service-messages/threads/route.ts`

**OAuth**
`lib/auth/oauth.ts` · `app/api/auth/google/route.ts` · `app/api/auth/google/callback/route.ts` · `app/api/auth/facebook/route.ts` · `app/api/auth/facebook/callback/route.ts`

**Database / schema lifecycle**
`lib/pg-runtime.ts` · `lib/db/pg-identity-schema.ts` · `lib/content-schema.ts` · the 21 `app/api/**/route.ts` files calling `ensure*Schema` · `scripts/apply-pg-identity-schema.ts`

**Storage / Office**
`lib/runtime-assets.ts` · `app/api/ad-assets/route.ts` · `app/api/office/v1/media/route.ts` · `app/api/office/v1/stream/route.ts` · `lib/integration/realtime.ts`

**Messaging client contracts**
`src/components/services/StartThreadButton.tsx` · `app/messages/page.tsx` · `app/properties/[id]/page.tsx` · `src/components/services/ThreadMessages.tsx`

**Advertising**
`src/components/AdSlot.tsx` · `app/api/ads/match-batch/route.ts` · `src/components/ads/ad-slot-frame.tsx`

**Tests (stale expectations — fix the test, not the product)**
`tests/amrs/db-schema.test.ts` · `tests/rendered-html.test.mjs` · `tests/command-center.test.mjs` · `tests/public-shell.test.mjs` · `tests/organizations-hardening-f1.test.mjs` · `tests/e2e/production-runtime.test.mjs`

**Real product violations surfaced by tests**
`src/components/ui/LuxuryPropertyCard.tsx` (raw `z-20`) · service-category CRUD path behind `tests/services-api.test.mjs`

**Documentation to reconcile or retire**
`README.md` · `AGENTS.md` · `docs/deployment/**` (7) · `docs/runtime/**` (7) · `docs/release/**` (19) · `docs/decisions/ADR-001-*` · `docs/integrations/DATABASE_TARGET_DECISION.md` · `docs/audit/RUNTIME_TARGET_AUDIT.md`

---

## 18. Recommended next phase

**Phase 1 — Release Gate & Security (do not start feature work).** In this order:

1. **Make the gate real.** Replace the hard-coded 19-file `test` script with directory discovery so all 70 runnable files execute; decouple `npm test` from `npm run build`. Fix the 6 stale-expectation test files. Then triage the 2 genuine product failures (`design-tokens` z-index, `services-api` CRUD). *Exit criterion: `npm test` green over all discoverable tests.*
2. **Close P0-1/2/3** (messaging authorization) with regression tests written first. These are live data-exposure holes.
3. **Make deployment work.** Decide `standalone` **or** `next start` and make `package.json`, `next.config.js` and the runbooks agree; add the `.next/static` + `public` copy step; stop copying `.env` into the artifact. *Exit criterion: a documented command that boots and serves CSS.*
4. **Fix OAuth** (absolute redirect base, `state`, boot-time credential validation, document `NEXT_PUBLIC_BASE_URL`).
5. **Move schema DDL out of the request path** into an explicit, idempotent migration step, and revoke DDL privileges from the application role.
6. **Re-run this entire baseline on a machine with database and Google-Fonts egress**, to close the two UNVERIFIED items (§0).

Defer to Phase 2+: Office media and realtime (P1-1/2), R2→Node storage (P1-3), ad batching, the lint-error backlog, parser consolidation, and the documentation purge.

**Do not** delete legacy runtime residue in Phase 1. It is inventoried in §10.1; removal is a Phase 2 task with its own verification.

---

# PHASE 0: BLOCKED

**The baseline itself was successfully established and is reproducible** — dependency install, type-check and production build all succeed, and every route serves. **The status is BLOCKED because the baseline it revealed is not releasable:** the release test suite fails and covers 24% of test files, there is no working production start command, and three live authorization defects allow authenticated users to read conversations they are not party to.

Two items remain UNVERIFIED for environmental reasons and must be closed on a machine with network egress: **live PostgreSQL/Neon connectivity**, and **an unmodified `next build`** (Google Fonts).
