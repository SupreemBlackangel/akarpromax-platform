# AMRS Migration & Rollback

> Migration procedures, validation, and rollback strategy for AMRS-2.

## Migration Files

| File | Description |
|------|-------------|
| `drizzle-pg/0003_legal_cerise.sql` | AMRS-2: 7 new tables, 18 indexes, 7 FK constraints |

## Migration Order

1. `organizations` (no dependencies)
2. `organization_members` (depends on: organizations, users)
3. `organization_branches` (depends on: organizations)
4. `verification_records` (depends on: users for verified_by FK)
5. `reputation_profiles` (no dependencies)
6. `reputation_evaluations` (depends on: reputation_profiles, users)
7. `reputation_history` (no dependencies)

## Clean Database Apply

```bash
# Generate migration
npx drizzle-kit generate

# Apply to clean database
npx drizzle-kit migrate
```

**Expected result**: All 7 tables created with correct columns, constraints, and indexes.

## Existing Database Upgrade

```bash
# Apply migration to existing database
npx drizzle-kit migrate
```

**Expected result**: 
- 7 new tables added (additive only)
- No existing tables modified
- No data loss
- Existing platform continues to operate normally

## Validation Checklist

After migration, verify:

- [ ] `organizations` table exists with 26 columns
- [ ] `organization_members` table exists with 7 columns
- [ ] `organization_branches` table exists with 21 columns
- [ ] `verification_records` table exists with 13 columns
- [ ] `reputation_profiles` table exists with 10 columns
- [ ] `reputation_evaluations` table exists with 10 columns
- [ ] `reputation_history` table exists with 8 columns
- [ ] `organizations_slug_unique` constraint exists
- [ ] All 18 indexes created
- [ ] All 7 FK constraints created
- [ ] `users` table unchanged
- [ ] `service_provider_profiles` table unchanged
- [ ] Existing auth flows work (login, register, sessions)
- [ ] Existing services marketplace works
- [ ] Existing office integrations work

## Rollback Strategy

AMRS-2 is **additive only** — no existing tables are modified.

### Option A: Disable Feature (Preferred)

If AMRS features cause issues:

1. Do not expose AMRS API endpoints (they don't exist yet)
2. Keep new tables in place (unused, no harm)
3. Revert application code if needed

### Option B: Drop New Tables

If full rollback is needed:

```sql
-- Drop in reverse dependency order
DROP TABLE IF EXISTS reputation_history;
DROP TABLE IF EXISTS reputation_evaluations;
DROP TABLE IF EXISTS reputation_profiles;
DROP TABLE IF EXISTS verification_records;
DROP TABLE IF EXISTS organization_branches;
DROP TABLE IF EXISTS organization_members;
DROP TABLE IF EXISTS organizations;
```

**Warning**: This destroys all AMRS data. Only use if no production organizations/verification/reputation records exist.

### Option C: Revert Migration State

```bash
# Revert drizzle migration state
# (removes migration tracking, not the tables themselves)
```

## Backfill Plan

**No backfill performed in AMRS-2.**

- New organizations start empty (no legacy data migrated)
- Professional profile data stays in `service_provider_profiles` (adapter reads from there)
- Verification data stays in existing auth tables until AMRS-4 migrates it
- No reputation history exists until the evaluation engine runs (AMRS-5)

**Future backfill (AMRS-4+)**:
- Migrate `users.email_verified_at` → `verification_records`
- Migrate `users.phone_verified_at` → `verification_records`
- Migrate `service_provider_profiles.verified_at` → `verification_records`
- Migrate `sponsor_profiles.verified_at` → `verification_records`

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Migration fails on existing DB | Test on staging first; migration is additive only |
| FK constraint violation | All FKs reference existing tables (users) |
| Performance impact | Indexes on query-pattern columns; no heavy joins |
| Data loss | NO — additive only, no existing tables modified |
| Rollback difficulty | LOW — can drop new tables without affecting existing data |
