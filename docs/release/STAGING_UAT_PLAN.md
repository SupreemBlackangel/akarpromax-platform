# Staging UAT Plan

UAT journey plan for the production-like Staging environment. Uses **synthetic
signed-up data only** — no real personal data required.

## 1. Staging access model

- **Staging is NOT publicly indexed**: apply `robots` noindex (via `robots.txt`
  and/or `X-Robots-Tag: noindex`) on the staging host, and never publish staging
  URLs in production sitemap/canonical data.
- Recommend an **application access gate** (invite-only UAT): an auth-required
  landing or basic-auth/IP-restriction at the edge, per hosting capability.
  Keep local development (localhost) unaffected.
- Do not make staging publicly discoverable unnecessarily.

## 2. First staging super-admin bootstrap (secure)

`scripts/seed-auth-admin.ts` (migration-time only, never read by the app at
runtime):

```bash
SEED_ADMIN_EMAIL=admin@staging.akarpromax.com \
SEED_ADMIN_PASSWORD=<strong throwaway bootstrap password> \
  npm run db:migrate:pg      # or: node --import tsx scripts/seed-auth-admin.ts
```

Rules:
- No hardcoded admin passwords in code (`scripts/seed-auth-admin.ts:7-8` defaults
  are dev-only and must be overridden).
- The bootstrap password is a strong, single-use value; **rotate immediately**
  after first admin login.
- The seeded admin gets `role=super_admin` in the staging PG `users` table.
- Never seed a predictable production admin.

## 3. Minimal approved UAT dataset (synthetic)

| ROLE | COUNT (min) | SYNTHETIC FIXTURE |
|---|---|---|
| Normal customer | 3 | `uat-customer-1..3@example.test`, distinct languages (ar/en/tr) |
| Professional/provider | 2 | verified provider profiles (service categories, public profile) |
| Real estate office | 1 | office-paired account + 1 device |
| Business organization | 1 | active organization + owner + 1 member |
| Admin | 1 | bootstrap super-admin |

Data rules: emails `*@example.test` or `*@akarpromax.test`; fictional names;
no real phone/address/ID. News/ad content = clearly-labelled UAT fixtures.
Staging must be able to run with **zero commercial campaigns** thanks to House
ads fallback (see `PART 27`).

## 4. UAT personas → journeys

| # | PERSONA | JOURNEY |
|---|---|---|
| 1 | Property seeker | browse → search → filter → detail → contact → geo → see (tasteful) ads |
| 2 | Property advertiser | publish property → org/property relationship → manage listing → ads placements |
| 3 | Service customer | request → matching → offer → accept → job → completion → confirm → review |
| 4 | Professional/provider | register → apply professional → admin approve → public profile → receive lead → offer |
| 5 | Real estate office | office pair → authenticate → sync → radar → news → ads → notifications → realtime |
| 6 | Business/company owner | create org → profile → members → branches → verification → business presence → properties/services |
| 7 | Admin | login (bootstrap) → moderate professional → approve org verification → reputation evaluation → content/news moderation → ads management (multi-creative) |
| 8 | AkarProMax Office user | end-to-end office client flow (mandatory for closed-beta planning) |

## 5. Journey checklists

### Property (UAT)
- [ ] Browse + search + filters (city/geo/type)
- [ ] Property detail loads (images, org relationship)
- [ ] Contact flow works (rate-limited)
- [ ] Ads on property surfaces are tasteful (placement-safe, do not dominate UX)

### Services (UAT)
- [ ] request → matching → offer → accept → decline → job → completion →
      confirmation → review → dispute surfaces

### Professional (UAT)
- [ ] normal user → professional apply → admin approval → public profile →
      receive service lead → offer

### Organization (UAT)
- [ ] create → profile → members → branches → verification (admin gate) →
      business presence → linked properties/services
- [ ] Public org detail hides draft orgs and raw member rows (non-admin)

### AkarProMax Office (UAT — mandatory for closed beta)
- [ ] pair device → authenticate (Bearer token, scopes)
- [ ] sync property upsert/delete (conflict policy documented: client
      "accept-server")
- [ ] radar queries return office-scoped geo results
- [ ] news/ticker = office channel only (no website leak)
- [ ] ads served for office placements + house fallback; impressions/clicks
      recorded channel=office
- [ ] notifications delivered
- [ ] SSE stream connects, `ready` event, replay after reconnect

### Advertising (UAT)
- [ ] real placement renders → campaign → creative rotation → fallback →
      geo targeting → website/office isolation
- [ ] confirm ads remain tasteful and do not dominate the real-estate/service UX

### Legal (UAT)
- [ ] `/legal` → Terms, Privacy, Marketplace Policies, Provider policy,
      Advertising policy, Review policy, Dispute policy all render
- [ ] versioned acceptance where implemented
- [ ] **Legal drafts remain `REQUIRES HUMAN LEGAL REVIEW` before production.**

## 6. Analytics separation on staging

- Staging ad impressions/clicks are recorded in the staging DB only — never in
  production billing/reporting data.
- Ads/news/service/user metrics are environment-tagged (staging DB + host).
- Staging traffic must not contaminate production analytics; no cross-environment
  writes.
