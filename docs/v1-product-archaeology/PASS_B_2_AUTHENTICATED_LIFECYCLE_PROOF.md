# PASS B.2 — AUTHENTICATED LIFECYCLE PROOF

**Audit date:** 2026-08-22  
**Runtime:** Next.js development server on `127.0.0.1:3012`  
**Database:** disposable local PostgreSQL 18 cluster on `127.0.0.1:55432/passb2_e2e`  
**Production Data Modified:** NO  
**Source Code Modified:** NO

## Decision

All six P0 capabilities left by PASS B.1 received a factual classification. **No P0 capability remains `NEEDS_RUNTIME_PROOF`.**

| Capability | PASS B.2 classification | Launch status |
|---|---|---|
| CAP-192 — Email verification lifecycle | `PRESERVED` | P0 resolved |
| CAP-193 — Password recovery lifecycle | `PRESERVED` | P0 resolved |
| CAP-205 — Property creation and moderation | `PRESERVED` | P0 resolved |
| CAP-209 — Service request matching and offers | `PRESERVED` | P0 resolved |
| CAP-212 — Auction bidding transaction | `PRESERVED` | P0 resolved |
| CAP-226 — Admin command and analytics surface | `REGRESSED` | Confirmed P0 defect |

## Reconciled Capability Totals

- V1 capabilities compared: **230**
- PRESERVED: **11**
- IMPROVED: **6**
- REGRESSED: **11**
- LOST: **18**
- BROKEN: **1**
- V1_STUB: **3**
- NEEDS_RUNTIME_PROOF: **180**

The delta from PASS B.1 is five capabilities from `NEEDS_RUNTIME_PROOF` to `PRESERVED`, and CAP-226 from `NEEDS_RUNTIME_PROOF` to `REGRESSED`.

## Isolation and Fixture Controls

- The configured `.env` PostgreSQL target is a remote Neon database and was explicitly excluded.
- A new local PostgreSQL 18 cluster was initialized under the Codex work directory with a dedicated port and database name.
- Test accounts used only `example.test` addresses.
- Test entities used explicit `PASS B2` names and generated IDs.
- Email delivery used the console transport.
- No production endpoint, production account, production row, or production credential was used.
- The development server and local PostgreSQL server were stopped after evidence collection.

## CAP-192 — Email Verification Lifecycle

**Classification: PRESERVED**

1. `POST /api/auth/register` returned **201** and `requiresVerification=true`.
2. A real `email_verification` challenge was written to isolated PostgreSQL and console email delivery was recorded.
3. Because console transport does not expose the email body, the fixture replaced only the isolated challenge hash with the SHA-256 hash of a known test token.
4. `POST /api/auth/verify-email` returned **200** and `verified=true`.
5. The account changed to active/verified.
6. `POST /api/auth/login` returned **200**, set a session cookie, and `GET /api/auth/me` returned **200**, `authenticated=true`.
7. Welcome email delivery was recorded.

This proves issuance persistence, token verification, challenge consumption, account activation, login, session persistence, and welcome delivery. Test-token substitution is a fixture-access technique only; token generation and hashing were separately proven in PASS B.1.

## CAP-193 — Password Recovery Lifecycle

**Classification: PRESERVED**

1. `POST /api/auth/forgot-password` returned **200** and created a real `password_reset` challenge.
2. Console reset-email delivery was recorded.
3. The isolated challenge hash was replaced with the SHA-256 hash of a known test token for HTTP completion.
4. `POST /api/auth/reset-password` returned **200** and `reset=true`.
5. Login with the old password returned **401**.
6. Login with the new password returned **200**.
7. Authenticated `/api/auth/me` returned **200**.
8. Logout returned **200** and the prior session then returned **401**.

## CAP-205 — Property Creation and Moderation

**Classification: PRESERVED**

Separate authenticated seller and `super_admin` sessions were used.

| Step | Result |
|---|---:|
| Seller creates property with active direct offer | 200, `draft` |
| Seller submits own property | 200, `pending_review` |
| Separate admin approves property | 200, `approved` |
| Public property detail read | 200, `approved` |

Fixture property ID: `ba2f5fdb-52e7-4575-9f46-7ad2274b2a36`.

## CAP-209 — Service Request Matching and Offers

**Classification: PRESERVED**

Separate authenticated customer and approved `service_provider` sessions were used.

| Step | Result |
|---|---:|
| Customer creates request | 201 |
| Customer publishes own request | 200, `published` |
| Customer runs matching | 200, `matched=1` |
| Matched provider submits offer | 201 |
| Customer accepts offer | 201, order created |

Evidence IDs:

- Request: `32b96560-6dda-4541-97ec-bf6720bca17f`
- Offer: `1db36f04-3818-46ea-b3b1-c63144fdb998`
- Order: `a91552a0-41b1-4b93-aee2-48e850ad2a72`

## CAP-212 — Auction Bidding Transaction

**Classification: PRESERVED**

Separate authenticated seller, bidder, and admin sessions were used.

| Step | Result |
|---|---:|
| Seller creates auction-capable property | 200, `draft` |
| Seller submits it | 200, `pending_review` |
| Admin approves it | 200, `approved` |
| Seller creates open auction and accepts seller terms | 201 |
| Separate bidder accepts terms and bids | 200, `idempotent=false` |
| Same bidder repeats same idempotency key | 200, `idempotent=true` |
| Seller attempts self-bid | 403 |

Auction property ID: `9672db1a-862d-4db2-b040-afaf58b52a6d`.

## CAP-226 — Admin Command and Analytics Surface

**Classification: REGRESSED — confirmed P0**

An authenticated `super_admin` session was used.

| Endpoint | Result | Finding |
|---|---:|---|
| `/api/admin/analytics` | 200 | Authenticated analytics payload returned |
| `/api/admin/stats` | 200 | Authenticated statistics payload returned |
| `/api/admin/command-center/overview` | 500 | PostgreSQL syntax failure at SQLite-style `datetime('now', '+7 days')` |
| `/api/admin/roles` | 500 | Runtime schema does not provision the `admin_roles` relation in the isolated canonical bootstrap |

The surface is real and partially functional, so `REGRESSED` is more accurate than `BROKEN`. It remains a launch blocker until the command-center SQL is portable and the roles schema is guaranteed by the canonical migration/bootstrap path.

## `/api/advertising/match` — Live or Legacy?

**Decision: LIVE COMPATIBILITY SURFACE, NOT DEAD LEGACY. Classification remains `BROKEN`.**

Five active UI components call this endpoint directly:

- `components/advertising/placements/NewsTicker.tsx`
- `components/advertising/placements/FeaturedProperties.tsx`
- `components/advertising/placements/AdSidebar.tsx`
- `components/advertising/placements/AdHero.tsx`
- `components/advertising/placements/AdBottom.tsx`

The newer `src/components/AdSlot.tsx` calls `POST /api/ads/match`, which works. The older GET route is not dead because the five placement components still invoke it. Therefore CAP-200 remains `BROKEN`; it is a broken live compatibility endpoint. Severity should be treated as **P1**, not P2, unless those five components are formally retired.

## Identity Schema v4/v5 Reconciliation

**Decision: v5 is canonical; the v4 failure is test drift.**

- `lib/db/pg-identity-schema.ts` exports `PG_IDENTITY_SCHEMA_VERSION = 5`.
- The canonical required-table list includes the v5 reputation tables.
- `tests/organizations-verification-f2.test.mjs` explicitly expects version 5.
- The isolated database reported `version=5`, `appliedVersion=5`, `ready=true`, and no missing tables.
- `tests/amrs/pg-identity-schema.test.ts` compares against the exported canonical constant.
- Only `tests/organizations-hardening-f1.test.mjs` still hard-codes version 4.

The PASS B.1 failure is one stale test assertion, not an identity runtime regression.

## Additional Fresh-Database Finding

**New technical P0 blocker: canonical fresh PostgreSQL bootstrap is not self-sufficient.**

On a clean local database, runtime schema initialization attempted to alter `ad_impressions` and `ad_clicks` before creating them, causing readiness/login to fail with `relation "ad_impressions" does not exist`. The fixture had to pre-create the two minimal tracking tables. Property/auction PostgreSQL migrations also had to be applied explicitly because the runtime content initializer does not provision the Drizzle-backed `properties`, offer-type, and auction-hardening relations.

This is a reproduced defect, not `NEEDS_RUNTIME_PROOF`. It requires a later authorized source/migration correction.

## Final Certification

- Remaining original P0 as `NEEDS_RUNTIME_PROOF`: **0**
- Original P0 resolved as `PRESERVED`: **10 of 11** (five in PASS B.1 and five in PASS B.2)
- Original P0 resolved as `REGRESSED`: **1 of 11** (CAP-226)
- New confirmed technical P0: **1** (fresh PostgreSQL bootstrap ordering/completeness)
- Production Data Modified: **NO**
- Source Code Modified: **NO**

**PASS B.2 evidence pass: COMPLETE**  
**PASS B certification: OPEN**

PASS B remains open because CAP-226 is a confirmed P0 regression, the fresh-database bootstrap is a confirmed P0 blocker, and the live `/api/advertising/match` compatibility surface remains broken.
