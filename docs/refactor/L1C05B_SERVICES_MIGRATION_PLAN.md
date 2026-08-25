# L1C-0.5B — Services migration plan (PLAN ONLY, nothing applied)

**Revision R2 — L1C-0.5B1.** R2 SUPERSEDES the R1 shadow-column + dual-write
ownership strategy. Database truth proved that **all existing operational
Services ownership data is confirmed demo/seed data**, so there is no historical
ownership to carry across a transition: once the demo graph is removed, every
ownership-bearing Services table is empty and the cutover becomes a plain
same-column type change. Everything R1 built to protect real historical
ownership — companion columns, temporary dual-write, historical backfill,
orphan triage tables — is therefore **removed from the plan, not deferred**.

Three migrations are described:

1. **M2 — Services forward-migration baseline** — bring the canonical `service_*`
   DDL under the trusted `forward_migrations` ledger. *Artifact prepared in
   L1C-0.5B1: `drizzle-pg-forward/0003_l1c_services_baseline.sql`.*
2. **M1 — Services ownership: email → `users.id` UUID** — R2 strategy, Part 2.
3. **M3 — currency column evolution** — unchanged from R1, §5.4.

**Architect decision (R1, retained): the Services forward baseline goes FIRST.**
M2 must be applied and verified before any ownership or currency migration is
authored — see Part 4 for the binding order.

**Nothing in this document has been applied.** No migration has been executed,
no `drizzle-kit generate` was run, no Neon mutation was made, no seed was run.

---

## Part 0 — L1C-0.5B1: what was executed, and what was only prepared

### 0.1 EXECUTED — Services demo seeding is contained (code only, no DB writes)

The Services demo graph is no longer inserted because a process happens to be
non-production. One authority now decides: `lib/services/demo-seed-gate.ts`.

```
isServicesDemoSeedEnabled()  ==  SEED_DEMO_DATA === "true"  AND  NODE_ENV !== "production"
```

| Path | Before | After |
|---|---|---|
| `lib/content-schema.ts` | `!isProduction()` alone reached `seedServicesMarketplace(db)` | the Services demo call sits behind `isServicesDemoSeedEnabled()`; the other demo domains keep their existing behaviour |
| `lib/mysql-runtime.ts` | `await seedServicesMarketplace(db)` ran unconditionally on every MySQL bootstrap | removed; the call is behind the same gate, and `seedServiceTaxonomy(db)` is now called explicitly so reference data survives containment |
| `scripts/seed-services-marketplace.ts` | opened the DB immediately | fail-fast gate **before** any DB module is loaded; `getRuntimeDb` is a dynamic import |
| `scripts/seed-services.ts` | opened the DB immediately | same fail-fast gate; every DB-touching import moved inside `main()` |

`seedServiceTaxonomy` is **reference/catalog data** and is deliberately NOT gated:
without it a fresh market has no professions to register against.

Proof: `tests/services-demo-seed-containment.test.mjs` (13 tests).

### 0.2 PREPARED, NOT APPLIED, NOT ARMED — the two migration artifacts

| File | Purpose |
|---|---|
| `drizzle-pg-forward/0003_l1c_services_baseline.sql` | M2 — the canonical Services schema enters the `akarpromax.forward_migrations` authority: 25 tables, 42 application indexes, folded marketplace ALTER columns, drift assertions |
| `drizzle-pg-forward/0004_l1c_services_demo_cleanup.sql` | the fail-closed removal of the architect-certified Services demo graph |

Both were **hand-authored** — `drizzle-kit generate` was not used and stays
guarded by `scripts/guard-db-generate.mjs`.

**They are inert.** `drizzle-pg-forward/meta/_journal.json` has NO entry for
either file, and the drizzle migrator only executes journalled files. Adding the
journal entry is the act of **arming** the migration. When the architect approves,
append:

```json
{ "idx": 3, "version": "7", "when": <epoch-ms>, "tag": "0003_l1c_services_baseline",     "breakpoints": true },
{ "idx": 4, "version": "7", "when": <epoch-ms>, "tag": "0004_l1c_services_demo_cleanup", "breakpoints": true }
```

Arm **0003 alone first**. 0004 is destructive and must be armed only for the
maintenance window in which it runs.

### 0.3 Certified footprint 0004 refuses to deviate from

```
service_provider_profiles 4   service_request_answers        18   service_offers   1
service_provider_categories 16  service_request_matches       4   service_orders   1
service_provider_documents 4   service_request_status_history 5   service_reviews  2
service_provider_portfolio 4   service_requests               5   service_job_timeline 4
```

Seed identities: `provider1..4@localhost.akarpromax` (one profile each),
`customer@localhost.akarpromax` (owns all five requests), references
`SR-2026-1001` ×2, `SR-2026-1002` ×1, `SR-2026-1003` ×1, `SR-2026-1004` ×1.

Preserved and asserted unchanged: `service_categories` (48),
`service_marketplace_settings` (1), `users`, `sponsor_access`.

Asserted empty before anything is deleted: `service_listings`,
`service_messages`, `service_disputes`, `service_bookmarks`,
`service_request_attachments`, `service_offer_revisions`, `service_reports`,
`service_notifications`, `service_message_threads`,
`service_message_participants`, `service_outbox_events`.

Any deviation → `RAISE EXCEPTION`, nothing deleted, migration not recorded.

---

## Part 1 — current ownership truth (source inventory)

Canonical Services ownership is stored as the **lower-cased account email** in
`VARCHAR(36)` columns. The value comes from `lib/identity-auth.ts:105`
(`user.email.trim().toLowerCase()`), which every route passes as `identity.email`.

`VARCHAR(36)` is exactly a UUID's width, which is a latent defect in its own
right: any address longer than 36 characters is already at risk of truncation or
rejection depending on the driver.

### 1.1 Ownership columns

| # | Table | Column | Semantics | Writer | Readers | Current value | Target | FK possible | Order |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `service_provider_profiles` | `user_id` | provider account | `upsertProviderProfile` (`marketplace.ts`) via `app/api/service-providers/route.ts` | marketplace, identity, matching, dashboard counts | EMAIL | `users.id` | YES | 1 |
| 2 | `service_requests` | `customer_user_id` | request owner | `createRequestFull` (`marketplace.ts`), `createRequest` (`core.ts`) | 10 routes + marketplace/matching/compat | EMAIL | `users.id` | YES | 2 |
| 3 | `service_listings` | `provider_user_id` | listing owner | `createListing` (`core.ts`) | `core.ts`, `app/api/services/listings/*` | EMAIL | `users.id` | YES | 2 |
| 4 | `service_offers` | `provider_user_id` | offer author | `createOfferFull` (`marketplace.ts`), `createOffer` (`core.ts`) | marketplace, core, offer routes, dashboard counts | EMAIL | `users.id` | YES | 3 |
| 5 | `service_offer_revisions` | `provider_user_id` | revision author | `reviseOffer` (`marketplace.ts`) | marketplace | EMAIL | `users.id` | YES | 3 |
| 6 | `service_offer_revisions` | `created_by` | actor | `reviseOffer` | marketplace | EMAIL | `users.id` (nullable) | YES | 3 |
| 7 | `service_orders` | `customer_user_id` | order customer | `acceptOfferFlow` (copies from request) | jobs routes, dashboard counts, marketplace | EMAIL | `users.id` | YES | 4 |
| 8 | `service_orders` | `provider_user_id` | order provider | `acceptOfferFlow` (copies from offer) | jobs routes, dashboard counts, marketplace | EMAIL | `users.id` | YES | 4 |
| 9 | `service_job_timeline` | `actor_user_id` | who moved the job | `addJobTimeline` (`marketplace.ts`) | marketplace | EMAIL | `users.id` (nullable) | YES | 4 |
| 10 | `service_messages` | `sender_user_id` | message author | `sendMessageFull` (`marketplace.ts`) | marketplace | EMAIL | `users.id` | YES | 5 |
| 11 | `service_message_participants` | `user_id` | thread membership | `ensureMessageParticipant` | marketplace | EMAIL | `users.id` | YES | 5 |
| 12 | `service_reviews` | `reviewer_user_id` | review author | `addReviewFull`, `core.addReview` | marketplace, core, provider pages | EMAIL | `users.id` | YES | 6 |
| 13 | `service_reviews` | `reviewee_user_id` | reviewed provider | same | same + `providerReviews` | EMAIL | `users.id` | YES | 6 |
| 14 | `service_notifications` | `user_id` | recipient | `notify` (`marketplace.ts`), `runMatching` | notification routes, dashboard counts | EMAIL | `users.id` | YES | 6 |
| 15 | `service_reports` | `reporter_user_id` | reporter | `createReport` | report routes | EMAIL | `users.id` | YES | 7 |
| 16 | `service_reports` | `resolved_by` | moderator | `resolveReport` | report routes | EMAIL | `users.id` (nullable) | YES | 7 |
| 17 | `service_request_attachments` | `uploaded_by` | uploader | `addRequestAttachments` | attachment routes | EMAIL | `users.id` (nullable) | YES | 7 |
| 18 | `service_request_status_history` | `changed_by` | actor | `recordRequestHistory` | history route | EMAIL | `users.id` (nullable) | YES | 7 |
| 19 | `service_provider_documents` | `uploaded_by` | uploader | `addProviderDocument` | provider document routes | EMAIL | `users.id` (nullable) | YES | 7 |
| 20 | `service_provider_documents` | `verified_by` | verifier | `verifyProviderDocument` | provider document routes | EMAIL | `users.id` (nullable) | YES | 7 |
| 21 | `service_bookmarks` | `user_id` | bookmark owner | `core.ts` | `core.ts` | EMAIL | `users.id` | YES | 7 |
| 22 | `service_disputes` | `opened_by_user_id` | dispute opener | `core.ts` | dashboard counts, `core.ts` | EMAIL | **none — EXCLUDED FROM M1 ENTIRELY** | **EXCLUDED (R2)** — owner-rejected product path. NO value migration, NO backfill, NO UUID type change, NO FK. The column keeps exactly what it holds today. See §2.6 | — |
| 23 | `service_marketplace_settings` | `updated_by` | last admin editor | `updateServiceMarketplaceSettings` | settings route | today's column is `VARCHAR(255)`, currently NULL | `users.id` (nullable) | YES | §2.3 step 9 |

### 1.2 Columns that are NOT user ownership (leave alone)

- `service_request_matches.provider_id` → `service_provider_profiles.id` (already a UUID FK candidate; no email).
- `service_message_threads` — keyed by `(thread_type, thread_id)`; carries no user column.
- `service_provider_profiles.email` — genuine **contact** data, must stay an email.
- `service_outbox_events.payload` — JSON; see 1.4.
- `audit_logs.actor_user_id`, `sponsor_activity_logs` — deliberate historical
  audit records. Per the phase rule these are **preserved as written**: they
  record who acted *at that time* under the identifier in use then. They are not
  re-keyed and receive no FK.

### 1.3 Gaps found in the existing email re-key (`lib/services/identity.ts`)

`rekeyServiceUserReferences` updates 22 columns. Three ownership surfaces are
**missing**, so an email change today silently orphans them:

| Missing surface | Effect of an email change today |
|---|---|
| `service_listings.provider_user_id` | the provider's listings detach from the account — they keep the old email |
| `service_marketplace_settings.updated_by` | stale editor attribution |
| `service_outbox_events.payload.providerUserId` | queued events address the old identity |

This is a **pre-existing defect**, not introduced by L1C-0/0.5A. M1 removes the
whole class by making ownership immutable; until M1 lands, `identity.ts` is the
only mitigation and is incomplete.

### 1.4 Embedded identity in event payloads

`lib/services/matching.ts:116` writes
`{ requestId, providerId, providerUserId, score }` into
`service_outbox_events.payload`. `providerUserId` is an email today.

**R2:** the table is certified at **0 rows**, and `0004_l1c_services_demo_cleanup.sql`
refuses to delete anything if it is not empty, so no email-keyed payload survives
the cutover. From the writer/reader cutover (§2.3 step 6) onward every emitted
payload carries the UUID identity and an explicit payload version. Part 3 is the
binding outbox policy.

---

## Part 2 — M1: ownership migration to `users.id`

### 2.1 Target

`users.id` (uuid, `lib/db/schema.ts`) becomes the only durable Services
ownership identity. Email returns to being mutable contact/login data.

**Architect decision (R2 — SUPERSEDES R1): there is NO dual-write transition.**
The R1 ruling assumed real historical ownership had to survive the change. It
does not exist: the demo cleanup (§0.2) empties every ownership-bearing table
first, so the cutover is a straight application switch to `identity.userId`
followed by a `VARCHAR(36)` → `uuid` type change **on the same columns**. No
companion columns, no dual-write window, no backfill. See §2.3.

### 2.2 Why the R1 pre-flight, orphan gate and identity map are gone

R1 required a resolvability report per column, an orphan gate, a
`services_identity_map` and a `services_orphan_ownership` triage table. All of
that existed to carry **real historical ownership** across the change.

The architect's verification removed the premise: every ownership-bearing row in
the live database is demo data, and 0004 deletes exactly that graph. After the
maintenance window the ownership columns hold **no rows at all**, with one
recorded exception:

- `service_marketplace_settings.updated_by` is nullable and currently NULL.

There is therefore nothing to resolve, nothing to map, and nothing to orphan.
The pre-flight is replaced by the fail-closed preconditions inside 0004 — which
are stricter, because they refuse to proceed at all if any unexpected
operational Services row exists.

**No historical email backfill will be performed.** If unexpected rows appear
before the window, the correct response is to stop and re-certify, not to write
a backfill.

### 2.3 Ordered steps — R2 SEQUENCE (supersedes the R1 A–J dual-write table)

| Step | Action | Gate to proceed |
|---|---|---|
| **1** | **Contain demo seeding.** `SEED_DEMO_DATA=true` + non-production is the only path to Services demo data. | ✅ done in L1C-0.5B1 (§0.1) |
| **2** | **Establish the Services forward baseline.** Arm and apply `0003_l1c_services_baseline.sql`. | `db:migrate:forward` clean, `db:verify:truth` green |
| **3** | **Maintenance window — application stopped.** No writer may be running when step 4 executes. | window open, app down |
| **4** | **Apply the fail-closed demo cleanup.** Arm and apply `0004_l1c_services_demo_cleanup.sql`. It asserts the certified footprint first and deletes nothing if anything deviates. | migration succeeded; post-assertions green |
| **5** | **Confirm the ownership-bearing operational tables are empty**, with the single recorded exception that `service_marketplace_settings.updated_by` is nullable and NULL. | verified |
| **6** | **Switch application writers and readers from `identity.email` to `identity.userId`** on all 22 in-scope ownership/actor sites. Column names and `VARCHAR(36)` types are unchanged in this step. | release deployed |
| **7** | **Retain the existing `VARCHAR(36)` ownership column names temporarily.** A canonical UUID in text form is exactly 36 characters, so it fits with no widening and no rename. | n/a |
| **8** | **Prove new writes are UUID-only.** Every non-NULL value in every in-scope ownership column must match the canonical UUID shape; no email may appear. | zero non-UUID values observed |
| **9** | **`ALTER` the same ownership/actor columns from `VARCHAR(36)` to PostgreSQL `uuid`.** Same columns, same names — a type change, not a migration of data between columns. | alter applied |
| **10** | **Add the reviewed foreign keys to `users(id)`** per the §2.5 matrix. | FKs installed |
| **11** | **Remove the obsolete email re-key machinery** (`rekeyServiceUserReferences` and its call sites). An email change becomes a pure `users` row update. | — |

Explicitly **NOT** in the R2 plan:

| Removed | Status |
|---|---|
| companion / shadow ownership columns (`*_user_uuid`) | **NO** — never created |
| temporary dual-write | **NO** — never deployed |
| historical email backfill | **NO** — there is no history to backfill |
| widening ownership columns to `VARCHAR(255)` | **NO** — unnecessary; UUID text is 36 chars |
| `services_identity_map` / `services_orphan_ownership` | **NO** — no rows to map or triage |

`service_disputes.opened_by_user_id` remains **excluded** (§2.6).

**L1C-0.5B1 stops at step 1.** Steps 2–11 are plan only; the UUID code cutover
must not begin in B1.

### 2.4 Affected row/table classes

25 canonical Services tables. **22 ownership columns across 16 tables** are in
M1 scope; `service_disputes.opened_by_user_id` is excluded (§2.6), so the 23rd
column in the §1.1 inventory is deliberately not migrated.

Under R2 the volume classification is no longer a migration risk: after step 4
every one of those tables is empty, so step 9's `ALTER ... TYPE uuid` rewrites
nothing and needs no batching. The only non-empty ownership-bearing row in the
system is the single `service_marketplace_settings` row, whose `updated_by` is
NULL.

`service_request_matches` carries no user column and is untouched.
`service_disputes` is out of scope (§2.6).

### 2.5 FK matrix — EXPLICIT, ONE POLICY PER COLUMN (R1)

Every ownership column appears exactly once. Applied at **step 10** of the R2 sequence (§2.3), immediately after the `VARCHAR(36)` → `uuid` type change.

| # | Table | Column | Nullability after I | FK to `users(id)` | ON DELETE |
|---|---|---|---|---|---|
| 1 | `service_provider_profiles` | `user_id` | NOT NULL | YES | **RESTRICT** |
| 2 | `service_requests` | `customer_user_id` | NOT NULL | YES | **RESTRICT** |
| 3 | `service_listings` | `provider_user_id` | NOT NULL | YES | **RESTRICT** |
| 4 | `service_offers` | `provider_user_id` | NOT NULL | YES | **RESTRICT** |
| 5 | `service_offer_revisions` | `provider_user_id` | NOT NULL | YES | **RESTRICT** |
| 6 | `service_offer_revisions` | `created_by` | NULL | YES | **SET NULL** |
| 7 | `service_orders` | `customer_user_id` | NOT NULL | YES | **RESTRICT** |
| 8 | `service_orders` | `provider_user_id` | NOT NULL | YES | **RESTRICT** |
| 9 | `service_job_timeline` | `actor_user_id` | NULL | YES | **SET NULL** |
| 10 | `service_messages` | `sender_user_id` | NOT NULL | YES | **RESTRICT** |
| 11 | `service_message_participants` | `user_id` | NOT NULL | YES | **RESTRICT** |
| 12 | `service_reviews` | `reviewer_user_id` | NOT NULL | YES | **RESTRICT** |
| 13 | `service_reviews` | `reviewee_user_id` | NOT NULL | YES | **RESTRICT** |
| 14 | `service_notifications` | `user_id` | NOT NULL | YES | **RESTRICT** |
| 15 | `service_reports` | `reporter_user_id` | **NOT NULL** | YES | **RESTRICT** — explicitly classified per R1: a report must keep an accountable reporter, so deleting a user must not silently anonymise an open report |
| 16 | `service_reports` | `resolved_by` | NULL | YES | **SET NULL** |
| 17 | `service_request_attachments` | `uploaded_by` | NULL | YES | **SET NULL** |
| 18 | `service_request_status_history` | `changed_by` | NULL | YES | **SET NULL** |
| 19 | `service_provider_documents` | `uploaded_by` | NULL | YES | **SET NULL** |
| 20 | `service_provider_documents` | `verified_by` | NULL | YES | **SET NULL** |
| 21 | `service_bookmarks` | `user_id` | NOT NULL | YES | **RESTRICT** |
| — | `service_disputes` | `opened_by_user_id` | **EXCLUDED FROM M1** | **NO FK** | Not migrated. See §2.6. |
| 23 | `service_marketplace_settings` | `updated_by` | NULL | YES | **SET NULL** |

Counts: **13 RESTRICT** (1–5, 7, 8, 10–15, 21) + **9 SET NULL** (6, 9, 16–20, 23) =
**22 columns in M1 scope**. No column carries two policies.
`service_disputes.opened_by_user_id` is excluded from M1 entirely (§2.6), which is
why the active scope is 22 and not 23.

### 2.6 Excluded from M1 — `service_disputes` (ARCHITECT DECISION, R1/B0)

> `service_disputes.opened_by_user_id` is **EXCLUDED FROM THE M1 UUID CUTOVER.**

Reason: the platform dispute workflow is owner-rejected. It must not block or
complicate the canonical Services ownership migration.

| Aspect | Decision |
|---|---|
| Table and column | preserved exactly as-is; no schema change |
| Value migration | **none** — the stored value is not rewritten |
| UUID type change | **none** — the column stays `VARCHAR(36)` |
| Backfill | **none** |
| Foreign key | **none** |
| Orphan gate | not applicable — the column is not part of the cutover |
| Behaviour | unchanged; nothing new is built on the table |
| Classification | preserved legacy data, retained for capability preservation |

The column keeps holding whatever identifier it holds today. It is recorded
here so its exclusion is a deliberate, reviewable decision rather than an
oversight. Note this is numbered §2.6 and the index plan follows as §2.7.

### 2.7 Index plan

The same 10 ownership index shapes exist today and are rebuilt on `uuid` at
step 9/10: `service_requests(customer_user_id)`,
`service_listings(provider_user_id)`,
`service_offers(request_id, provider_user_id)` UNIQUE,
`service_orders(customer_user_id, provider_user_id)`,
`service_notifications(user_id, is_read, created_at)`,
`service_message_participants(thread_type, thread_id, user_id)` UNIQUE,
`service_reviews(reviewee_user_id)`,
`service_reviews(order_id, reviewer_user_id)` UNIQUE,
`service_provider_profiles(user_id)` UNIQUE,
`service_bookmarks(user_id, listing_id)` UNIQUE.

All ten are part of the 42 indexes the 0003 baseline owns. Because the tables
are empty at that point, the rebuild is a metadata operation.

### 2.8 Rollback

| Step | Rollback |
|---|---|
| 1 (containment) | revert the release; the gate is code only |
| 2 (baseline 0003) | nothing to roll back — additive and idempotent, it creates nothing that did not already exist on the live database |
| 4 (cleanup 0004) | **forward-only, and the reason the maintenance window exists.** The rows it deletes are demo data the architect certified as disposable, and the demo graph can be re-created from `lib/services/seed-marketplace.ts` with `SEED_DEMO_DATA=true` against a non-production target. Take the routine database backup before opening the window regardless. |
| 6 (writer/reader cutover) | revert the release. The columns still hold text of the same width, so no data repair is needed. |
| 9–11 (type change, FKs, re-key removal) | forward-only. Step 9 must not share a release window with step 6, and must not run until step 8 has observed UUID-only writes. |

---

## Part 3 — outbox events (PLAN ONLY, R1)

`lib/services/matching.ts:116` writes `{ requestId, providerId, providerUserId, score }`
into `service_outbox_events.payload`; `providerUserId` is an email today.

**Actual status model** (source truth, `processOutbox` in `lib/services/marketplace.ts`):
the only statuses are **`pending`**, **`processed`** and **`failed`**. `processOutbox`
selects `status = 'pending'`, marks success as `processed` and any throw as
`failed`, incrementing `attempts`. **There is no automatic retry and no
`retrying` status** — a `failed` event stays failed until someone acts on it.

| Event class | Policy |
|---|---|
| **Processed historical events** (`status = 'processed'`) | **Preserve unchanged.** Historical payloads are a record of what was emitted at the time. They are never rewritten. |
| **`pending`** — an email-key event awaiting its first processing | **Must not exist.** `0004` asserts `service_outbox_events` is empty before it deletes anything, so a `pending` row blocks the cleanup outright. |
| **`failed`** — an event whose processing threw | **Must not exist.** Same assertion. |
| **Any outbox row appearing before the cutover** | **STOP and escalate for architect review.** Do not build a legacy email resolver, and do not introduce an identity map to resolve it — R2 removed both. An outbox row means the certified "0 rows" truth no longer holds and the footprint must be re-certified. |
| **New events after the UUID cutover** | Carry the **UUID identity** and an **explicit payload version** (e.g. `{ v: 2, requestId, providerId, providerUserId: <uuid> }`) so a consumer can always tell which identity scheme a payload uses. |

No historical processed payload is rewritten under any of the three rules.

**R2 status.** `service_outbox_events` is certified at **0 rows**, and
`0004_l1c_services_demo_cleanup.sql` asserts it is empty before it deletes
anything. There is therefore no backlog to drain, nothing to inspect and no
processed history to preserve at the cutover. The R1 "version-aware legacy
resolver" is **removed from the plan**: it existed only to resolve historical
email payloads through the identity map, and both are gone. The rule that
survives is the last row of the table — every event emitted from the cutover
onward carries the UUID identity and an explicit payload version.

---

## Part 4 — migration order (ARCHITECT DECISION, R1 — retained under R2)

> **SERVICES FORWARD BASELINE FIRST**, then the demo cleanup, then the ownership
> and currency evolution migrations.

1. **Demo containment** (§0.1) — code only. ✅ done in L1C-0.5B1.
2. **M2 — Services forward baseline**, `0003_l1c_services_baseline.sql` (Part 5).
   Nothing else is applied until Services DDL is under the trusted ledger.
3. **Demo cleanup**, `0004_l1c_services_demo_cleanup.sql`, inside a maintenance
   window with the application stopped.
4. **M1 — ownership email → `users.id`** (Part 2), R2 steps 6–11.
5. **M3 — currency column evolution** (§5.4).

Nothing beyond item 1 has been applied. The 0003 and 0004 files exist but are
not journalled, so no migration runner will execute them (§0.2). No
`drizzle-kit generate` was run. No Neon mutation was made.

---

## Part 5 — M2: Services forward-migration baseline

### 5.1 Current authority

Canonical Services DDL is **runtime ensure-based**, not migration-based:
`lib/content-schema.ts:590-591` and `lib/mysql-runtime.ts:641-642` call
`ensureServicesSchema` (`lib/services-schema.ts`) then
`ensureServicesMarketplaceSchema` (`lib/services-marketplace-schema.ts`), the
latter also `ALTER`-ing 7 base tables with new columns.

### 5.2 Tables that would enter the Services forward baseline

**25 tables, 42 indexes.**

Base (`lib/services-schema.ts`, 9): `service_categories`, `service_listings`,
`service_requests`, `service_offers`, `service_orders`, `service_messages`,
`service_reviews`, `service_disputes`, `service_bookmarks` — plus 19 indexes.

Marketplace (`lib/services-marketplace-schema.ts`, 16): `service_provider_profiles`,
`service_provider_categories`, `service_provider_documents`,
`service_provider_portfolio`, `service_request_answers`,
`service_request_attachments`, `service_request_matches`,
`service_request_status_history`, `service_offer_revisions`,
`service_job_timeline`, `service_reports`, `service_notifications`,
`service_message_threads`, `service_message_participants`,
`service_outbox_events`, `service_marketplace_settings` — plus 23 indexes.

7 base tables carry marketplace `ALTER` columns that must be folded into the
baseline shape: `service_categories`, `service_listings`, `service_requests`,
`service_offers`, `service_reviews`, `service_messages`,
`service_provider_profiles`.

### 5.3 Strategy — DELIVERED AS `0003_l1c_services_baseline.sql` (prepared, not armed)

The strategy below was followed exactly by the prepared artifact. Points 1–3 are
authored; points 4–6 remain for the apply window.


1. Hand-author forward SQL stating the **current, already-live** table shapes
   (base CREATE + marketplace ALTER folded together). Never diff against an empty
   database; never fabricate a Drizzle snapshot.
2. Make it idempotent (`CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`,
   guarded `ADD COLUMN`) so it is a no-op against the live Neon database and a
   full creator against a fresh one.
3. Register it in the `akarpromax.forward_migrations` ledger used by
   `npm run db:migrate:forward`.
4. Verify with `npm run db:verify:truth`, extended to the Services tables.
5. **Only then** remove the runtime `ensure*` calls, in a separate release.
6. Never add the deprecated `lib/db/schemas/services-schema.ts` to any config.
   `npm run db:generate` is guarded by `scripts/guard-db-generate.mjs`.

### 5.4 M3 — currency column evolution (ARCHITECT DECISION, R1 — UNCHANGED under R2)

**R2 reaffirms this decision without modification. M3 is NOT applied in
L1C-0.5B1**; no currency schema change was authored. The 0003 baseline asserts
the *pre-M3* shape (`VARCHAR(8) NOT NULL DEFAULT 'OMR'` on all five monetary
tables) so that drift is caught rather than absorbed. Every DB `DEFAULT 'OMR'`
is dropped by M3. No FX, no global default, no market/country inference.


L1C-0.5A removed every **application-level** currency fallback, and R1 removed
the offer form's OMR preselection and its Services-specific 4-code list. What
remains is column-level and needs a migration.

**Architect decision for `service_requests.currency`:**

```
budgetMin IS NULL AND budgetMax IS NULL   =>  currency MUST become NULL
any budget amount exists                  =>  an explicit canonical currency is REQUIRED
```

A request with no budget carries no amount, so it must carry no currency; a
currency with no amount is a platform-chosen value with nothing to denominate,
which the currency rule forbids. `service_requests.currency` is today
`VARCHAR(8) NOT NULL DEFAULT 'OMR'`, so this cannot be expressed until the column
becomes nullable — it therefore belongs to **L1C-0.5B**, not to L1C-0.5A. **No
temporary currency value was invented**, and the request wizard was deliberately
left unchanged pending this migration.

Migration content for M3:

| Table | Column | Current | Required |
|---|---|---|---|
| `service_requests` | `currency` | `VARCHAR(8) NOT NULL DEFAULT 'OMR'` | drop `DEFAULT`; make **NULLABLE**; add a CHECK pairing amount and currency (`(budget_min IS NULL AND budget_max IS NULL) = (currency IS NULL)`); backfill existing budget-less rows to NULL |
| `service_listings` | `currency` | `VARCHAR(8) NOT NULL DEFAULT 'OMR'` | drop `DEFAULT` |
| `service_offers` | `currency` | `VARCHAR(8) NOT NULL DEFAULT 'OMR'` | drop `DEFAULT` |
| `service_orders` | `currency` | `VARCHAR(8) NOT NULL DEFAULT 'OMR'` | drop `DEFAULT` |
| `service_offer_revisions` | `currency` | `VARCHAR(8) NOT NULL DEFAULT 'OMR'` | drop `DEFAULT` |

The four remaining defaults are **dormant** — every active write binds an
explicit, registry-validated code — but they are a platform-chosen currency
sitting in the schema.

Once M3 lands, the request wizard (`app/service-requests/new/page.tsx:284`,
which currently hardcodes `currency: "OMR"`) gains a currency selector that is
shown only when a budget is entered.

---

## Part 6 — identity vs contact (RECORDED, R1)

| Field | Meaning | Behaviour on a login-email change |
|---|---|---|
| `service_provider_profiles.user_id` | **Identity ownership.** After M1 this is `users.id` — immutable, FK-constrained, the only thing that says which account owns the provider profile. | unchanged — that is the point of M1 |
| `service_provider_profiles.email` | **Contact data.** The address the provider publishes for customers to reach them. | **not conceptually re-keyed.** It is an independent field the provider edits themselves. |

A login-email change must never be treated as a change of provider contact
email. They are different facts that happen to look alike today because
`rekeyServiceUserReferences` currently updates both
(`lib/services/identity.ts:52-53`) — a consequence of email being used as the
ownership key. **§2.3 step 11 of the R2 sequence** — remove the obsolete email
re-key machinery (`rekeyServiceUserReferences` and its call sites) — removes that
coupling: identity moves to `users.id` and the contact email is left alone.
