# Risk Register

**Mode:** PLAN (read-only). Risks identified during audit. Probability (P) / Impact (I) / Exposure = P×I (1–9). Mitigation owner = implementation phase.

---

## A. Architecture & runtime

| ID | Risk | P | I | Exposure | Mitigation / Phase |
|---|---|---|---|---|---|
| AR-1 | PG auth cannot load under `vinext start` (`cloudflare:` sockets in Workers bundle) | H(3) | H(3) | 9 | Auth E2E on `vinext dev` only; consider Node-targeted build or MySQL-backed auth under start (AGENTS.md). Phase 0 |
| AR-2 | `cookie` session unreliable under `start` over HTTP → `authenticated:false` on `/api/auth/me` | H(3) | M(2) | 6 | Wizard builds viewer from local state; verify raw-`Cookie` header read; document. Phase 1 |
| AR-3 | Module-singleton `sponsorSchemaReady` sticky-falls-back to MySQL after a D1 schema-init reject | M(2) | M(2) | 4 | Add retry/latch instead of sticky fallback. Phase 0 |
| AR-4 | Adding ~23 admin screens may pressure boundary checks (Public→Admin leaks) | M(2) | M(2) | 4 | Enforce checks after each phase; PR gate. Phases 3–8 |

## B. Security (from AUTH_SECURITY_FINDINGS)

| ID | Risk | P | I | Exposure | Mitigation / Phase |
|---|---|---|---|---|---|
| SE-1 | Hardcoded JWT fallback secret pattern from reference accidentally reintroduced | L(1) | H(3) | 3 | DO_NOT_MIGRATE list + code-review gate. Phase 0 |
| SE-2 | No CSRF token; SameSite=lax only | M(2) | M(2) | 4 | Central origin/Referer check or double-submit token. Phase 0 |
| SE-3 | `SESSION_SECRET!` non-assertion → silent misconfig, no fail-fast boot | M(2) | M(2) | 4 | Boot guard requiring env. Phase 0 |
| SE-4 | No login rate limiting / account lockout / MFA | M(2) | M(2) | 4 | Rate limits Phase 0; MFA backlog |
| SE-5 | Tool file uploads (PDF/CAD) without server validation caps | M(2) | M(2) | 4 | Size/type + magic-byte validation. Phase 6 |
| SE-6 | Committed reference `.env`/DB artifacts become a copy-paste source | L(1) | M(2) | 2 | Never migrate; archive reference read-only |

## C. Migration scope

| ID | Risk | P | I | Exposure | Mitigation / Phase |
|---|---|---|---|---|---|
| MS-1 | Reference strings garbled (AR/EN glyph corruption) in tools/content | H(3) | M(2) | 6 | Re-key all copy through target `lib/i18n`; no raw string port. Phase 5–6 |
| MS-2 | 23 admin screens is a large port scope → phase slip | M(2) | M(2) | 4 | Phase gating; each screen test-covered |
| MS-3 | Auctions/tenders realtime rebuild (REST) loses UX if product expected live bids | M(2) | M(2) | 4 | Confirm product expectations; polling/REST acceptable per directive |
| MS-4 | PayPal/web-push/nodemailer approvals block Phases 2/8 | M(2) | M(2) | 4 | Explicit DEPENDENCY_APPROVAL_LIST sign-off before those phases |
| MS-5 | Reference `dev.db` data not migrated → users expect old content | M(2) | L(1) | 2 | Content seed scripts (news/sponsors/ads) + optional one-time import script |
| MS-6 | Screenshot/runtime comparison deferred (no build/browser tooling) → some UX scores are static-only | M(2) | L(1) | 2 | Documented; revisit in Phase 0/1 with approved tooling |

## D. Process

| ID | Risk | P | I | Exposure | Mitigation / Phase |
|---|---|---|---|---|---|
| PR-1 | Dep changes lost on `npm install` (vinext Windows static-asset patch) | M(2) | H(3) | 6 | AGENTS.md already documents; re-apply one-liner |
| PR-2 | Auth tests only runnable on dev (Workers runtime differences) | H(3) | M(2) | 6 | Keep `vinext dev` as the canonical E2E env; document in AGENTS.md |
| PR-3 | Reference repo has no commits — no baseline to diff against | M(2) | L(1) | 2 | Archive copy as immutable reference snapshot |

## Top 5 to address first
1. AR-1 (PG under start) — product decision: Node build vs MySQL auth.
2. SE-2/SE-3 (CSRF + secret boot guard) — Phase 0 hardening.
3. AR-2 (cookie under start) — Phase 1 verify.
4. SE-4 (auth rate limits) — Phase 0.
5. MS-1 (garbled strings) — i18n re-keying discipline during port.
