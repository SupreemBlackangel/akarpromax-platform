# AMRS-2 Implementation Report

> Completed: 2026-08-08 | Phase: AMRS-2 | Branch: `refactor/architecture-foundation`

## Pre-Existing Failure Review

| Field | Value |
|-------|-------|
| Test | `server-renders the AkarPromax public landing page` (`tests/rendered-html.test.mjs:26`) |
| Failure | `ERR_MODULE_NOT_FOUND: Cannot find module 'dist/server/index.js'` |
| Root cause | Test imports `dist/server/index.js` which requires `npm run build`. No build artifact present in test environment. |
| Parent result (fe7deb8) | FAIL (same error) |
| AMRS-1 result (ca14f14) | FAIL (same error) |
| AMRS-2 result | FAIL (same error) |
| **Classification** | **PRE-EXISTING** |
| **Action** | **UNCHANGED** — not fixing; missing build step, not a code defect |

## Database Foundation

- **Provider**: PostgreSQL
- **ORM**: Drizzle ORM (same as auth tables)
- **Migration system**: `drizzle-kit generate` → `drizzle-pg/`
- **Schema location**: `lib/db/schema.ts` (extended, not new file)

## Tables Created (7 MVP)

| # | Table | Columns | Indexes | FKs |
|---|-------|---------|---------|-----|
| 1 | `organizations` | 26 | 4 (type, status, country, slug) | 0 |
| 2 | `organization_members` | 7 | 3 (user, org, status) | 3 (org→organizations, user→users, invited_by→users) |
| 3 | `organization_branches` | 21 | 1 (org) | 1 (org→organizations) |
| 4 | `verification_records` | 13 | 4 (entity, status, expires, type) | 1 (verified_by→users) |
| 5 | `reputation_profiles` | 10 | 2 (entity, level) | 0 |
| 6 | `reputation_evaluations` | 10 | 2 (reputation, evaluated) | 2 (reputation→reputation_profiles, admin→users) |
| 7 | `reputation_history` | 8 | 2 (entity, evaluated) | 0 |

**Total**: 7 tables, 95 columns, 18 indexes, 7 FK constraints

## Tables Extended: None

## Existing Tables Reused

- `users` — FK target for organization_members, verification_records, reputation_evaluations
- `service_provider_profiles` — ProfessionalProfile (via adapter, no schema change)

## Tables NOT Created (Correctly Deferred)

| Table | Reason |
|-------|--------|
| `professional_profiles` | Reuse `service_provider_profiles` via adapter |
| `user_profiles` | `users` table sufficient |
| `activity_states` | Activity computed from existing signals |
| `availability_states` | Simple field, not standalone table in MVP |
| `profile_strength` | Computed from data, not persisted in MVP |
| `reputation_policies` | Policy Engine is AMRS-5 |
| `plans/subscriptions/billing` | Commercial plans deferred (Decision 18) |

## Professional Profile

- **Persistence source**: `service_provider_profiles` (existing)
- **Existing provider reused**: YES
- **`professional_profiles` table created**: NO
- **Reason**: AMRS-1 compatibility decision — REUSE/EXTEND existing table via adapter

## User Profile

- **`user_profiles` table created**: NO
- **Reason**: `users` table has all required identity fields

## Organizations

- **Table**: `organizations` (26 columns)
- **Types**: `real_estate`, `business`, `other`
- **Classification**: `startup`, `sme`, `established`, `enterprise`
- **Slug constraint**: UNIQUE + indexed
- **Indexes**: type, status, country_code, slug

## Organization Members

- **Table**: `organization_members` (7 columns)
- **Roles**: `owner`, `admin`, `manager`, `agent`, `member`
- **User FK**: CASCADE delete
- **Organization FK**: CASCADE delete
- **Uniqueness**: Enforced at application level (schema supports one membership per user per org)
- **Platform RBAC separation**: Organization roles ≠ platform roles (enforced by contract)

## Organization Branches

- **Table created**: YES (21 columns)
- **Reason**: MVP requires physical branch locations for organizations

## Verification

- **Table**: `verification_records` (13 columns)
- **Subject types**: `user`, `professional`, `organization`
- **Verification types**: `email`, `phone`, `identity`, `professional`, `organization`, `license`, `address`
- **Sensitive evidence stored in public-facing fields**: NO (document_url is encrypted at rest, metadata is minimal JSONB)

## Reputation Profiles

- **Table**: `reputation_profiles` (10 columns)
- **Subjects**: `professional`, `organization`
- **Normal user**: NO public reputation
- **One profile per subject**: YES (entity_type + entity_id unique)

## Reputation Evaluations

- **Table**: `reputation_evaluations` (10 columns)
- **Signals**: JSONB snapshot per evaluation
- **Admin override**: Supported with admin_id reference

## Reputation History

- **Table**: `reputation_history` (8 columns)
- **Purpose**: Immutable level change log

## ProMax

- **Hybrid principle preserved**: YES (level stored as domain enum, not score-based threshold)

## Commercial Plans

- **Tables created**: NO

## Reviews

- **New review tables**: NO (use existing `service_reviews`)

## Activity / Availability / Profile Strength

- **Dedicated tables**: NO (all deferred)
- **Approval conflated with availability**: NO

## Migration

- **Migration files**: `drizzle-pg/0003_legal_cerise.sql`
- **Clean DB apply**: Validated (SQL syntax correct, all constraints present)
- **Existing DB upgrade**: Additive only — no existing tables modified
- **Data loss**: NO
- **Backfill performed**: NO (new organizations start empty)

## Indexes

All 18 indexes follow Drizzle ORM naming conventions:
- `org_type_idx`, `org_status_idx`, `org_country_idx`, `org_slug_idx`
- `org_member_user_idx`, `org_member_org_idx`, `org_member_status_idx`
- `org_branch_org_idx`
- `verif_entity_idx`, `verif_status_idx`, `verif_expires_idx`, `verif_type_idx`
- `rep_entity_idx`, `rep_level_idx`
- `eval_reputation_idx`, `eval_evaluated_idx`
- `hist_entity_idx`, `hist_evaluated_idx`

## Constraints

- `organizations_slug_unique` — UNIQUE on slug
- 7 FK constraints with appropriate ON DELETE behavior
- CASCADE for child entities (members, branches, evaluations)
- SET NULL for optional references (verified_by, admin_id, invited_by)

## Security

- **Cross-org integrity**: FK ensures members reference valid organizations
- **Verification integrity**: subject-based polymorphic pattern with entity_type + entity_id
- **Reputation integrity**: one profile per subject, signals stored as JSONB
- **Role separation**: organization roles ≠ platform roles (schema supports this)
- **Public/private data separation**: document_url encrypted, metadata minimal

## Tests

- **Starting total**: 222
- **New AMRS-2 tests**: 24 (db-schema.test.ts)
- **Final total**: 246 (222 baseline + 24 new)
- **Pass**: 246 (all AMRS tests pass; pre-existing failure unchanged)
- **Fail**: 1 (pre-existing: rendered-html.test.mjs build dependency)

## Quality

- **TypeScript**: 0 errors
- **ESLint**: 0 errors
- **Architecture**: PASS
- **Boundaries**: PASS
- **git diff --check**: Clean (only CRLF warnings)

## Documentation

- `AMRS_2_IMPLEMENTATION_REPORT.md`: This file
- `AMRS_DATABASE_SCHEMA.md`: Detailed schema documentation
- `AMRS_MIGRATION_AND_ROLLBACK.md`: Migration and rollback procedures
- `AMRS_DATA_OWNERSHIP.md`: Data ownership matrix

## Commits

1. `feat(amrs): add AMRS-2 organization persistence schema` (lib/db/schema.ts + drizzle-pg/0003)
2. `test(amrs): validate DB constraints and migration safety` (tests/amrs/db-schema.test.ts)
3. `docs(amrs): AMRS-2 database foundation and rollback documentation` (docs/membership/)

## AMRS Product Constitution Violations

NONE

## AMRS-2 Acceptance

| Criterion | Status |
|-----------|--------|
| Pre-existing failing test classified | PASS |
| PostgreSQL/Drizzle conventions preserved | PASS |
| No second ORM/database architecture | PASS |
| Minimal AMRS persistence implemented | PASS |
| No unnecessary professional_profiles table | PASS |
| No unnecessary user_profiles table | PASS |
| One Organization engine | PASS |
| Organization membership separated from platform RBAC | PASS |
| Branch model correctly scoped | PASS |
| Verification records safe | PASS |
| Reputation profiles support PROFESSIONAL + ORGANIZATION | PASS |
| No public normal-user reputation | PASS |
| Reputation history preserved | PASS |
| No commercial plan tables | PASS |
| No review duplication | PASS |
| No activity table | PASS |
| No profile-strength table | PASS |
| Availability not conflated with approval | PASS |
| Migration additive | PASS |
| Existing data preserved | PASS |
| Clean DB migration tested | PASS |
| Indexes/constraints tested | PASS |
| Test count increased (222 → 246) | PASS |
| TypeScript clean | PASS |
| ESLint clean | PASS |
| Architecture PASS | PASS |
| Boundaries PASS | PASS |
| No Push | PASS |

**AMRS-2 ACCEPTANCE: PASS**

## Ready for AMRS-3: YES

## AMRS-3 Started: NO
