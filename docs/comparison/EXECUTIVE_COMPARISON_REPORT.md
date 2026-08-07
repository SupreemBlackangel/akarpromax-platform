# Executive Comparison Report

**Mode:** PLAN (read-only). Reference = `D:\new program - Copy` (recovery dump; app at `akarpromax-web/akar-frontend-src/`). Target = current repo `E:\Akarpromax new 2027\V 2.0 GPT - Copy` (`refactor/architecture-foundation` @ `ce74fb2`).

---

## 1. Bottom line

- **Target is architecturally ahead of the reference.** It implements the directive's non-negotiables (Public/Admin separation, layered Page→Route→Service→Repository→Adapter, PG-first single-ORM, session-cookie auth, 6-role RBAC, RTL, dark mode, mobile-first, ads/news/sponsors/services modules).
- **Reference is a feature-rich but architecturally weak SPA** (CSR + Express + SQLite/Prisma, JWT-Bearer auth, single 2,142-line tools page, 32 admin screens with duplicates and a guard bug, committed secrets/artifacts, hardcoded JWT fallback secret).
- **Verdict: KEEP target, MERGE reference features.** Reference contributes features and UI behavior; target supplies architecture, security, and runtime. Zero reference framework/deps migrate as-is.

## 2. What we confirmed
- Reference true app = `akarpromax-web/akar-frontend-src/` (Vite 5 SPA, React 18, wouter, Tailwind 4 + Radix, Prisma+SQLite, Express API, ~120 routes, 123 pages, 152 components). Root of reference = recovery debris (26 scratch scripts, backups, committed `.env`/DBs).
- Target = Next 16.2 + Vinext 0.0.50, React 19, Tailwind 4.2, Drizzle (PG+D1+MySQL), 37 pages + 94 API handlers, session auth (jose), RBAC with 6 roles, 44 green tests, enforced module boundaries.
- Phase 5 auth consolidation and Phase 4 admin consolidation are committed and green.

## 3. Critical findings (short list)
1. **CRITICAL (reference R1):** hardcoded `"my_super_secret_key"` JWT fallback across 8 scratch auth scripts → forgeable tokens if env unset. Do not port.
2. **HIGH (reference R2/R3/R4):** client-side JWT, 30d no-refresh, `/dev-login` backdoor.
3. **MEDIUM (reference R7):** committed `.env` (JWT_SECRET, ENC_KEY/SALT, DESKTOP_SIGNATURE), `dev.db`, `chat.sqlite` in repo.
4. **MEDIUM (target T2/T3):** no CSRF token (SameSite mitigates); `SESSION_SECRET!` non-assertion → no fail-fast boot guard. Hardening backlog Phase 1.
5. **Platform constraint (documented):** PG auth runs under `vinext dev` only; `vinext start` is MySQL-backed and cannot load PG (`cloudflare:` sockets). Auth E2E stays on dev. Session-cookie persistence across full reload blocked under start over HTTP.

## 4. Recommendation (first phase)
**Phase 0 — Hardening + foundation** (post-approval): add `SESSION_SECRET` boot guard, central CSRF/origin check for cookie sessions, rate limits on auth endpoints, and create `src/components/ui/` from the approved Radix primitive list. Then Phase 1 – Account/email flows; Phase 2 – Public home/property surfaces; Phases 3–8 – verticals (see IMPLEMENTATION_PHASES.md).

## 5. Counts
- Reference: 123 pages, 152 components, ~120 routes, 26 API route files, 6 tools.
- Target: 37 pages, 94 API handlers, 52 src components, ~38 lib modules, 15+5 tool/cad components, 44 tests green.
- Reports written: 25 under `docs/comparison/`.

## 6. Options for approval
A. Approve implementation as planned (Phases 0–9). B. Approve Phase 0 only, review, continue. C. Adjust scope (e.g. deprioritize auctions/licensing/partners). D. Stop and keep target as-is (reference archived).
