# AMRS Database Schema

> Complete reference for all AMRS PostgreSQL tables.

## 1. organizations

**Purpose**: Independent organization entity (real estate, business, other)
**Owner**: Organization domain (AMRS-2)

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
| `name_ar` | VARCHAR(255) | nullable | — | Arabic display name |
| `name_en` | VARCHAR(255) | nullable | — | English display name |
| `name_tr` | VARCHAR(255) | nullable | — | Turkish display name |
| `slug` | VARCHAR(255) | NOT NULL | — | UNIQUE, normalized URL slug |
| `type` | VARCHAR(30) | NOT NULL | — | `real_estate` \| `business` \| `other` |
| `classification` | VARCHAR(30) | NOT NULL | — | `startup` \| `sme` \| `established` \| `enterprise` |
| `country_code` | VARCHAR(8) | NOT NULL | — | ISO country code |
| `city_id` | VARCHAR(100) | nullable | — | City reference |
| `district_id` | VARCHAR(100) | nullable | — | District reference |
| `latitude` | DOUBLE PRECISION | nullable | — | Geo coordinate |
| `longitude` | DOUBLE PRECISION | nullable | — | Geo coordinate |
| `logo_url` | VARCHAR(512) | nullable | — | Logo image URL |
| `cover_url` | VARCHAR(512) | nullable | — | Cover image URL |
| `description_ar` | TEXT | nullable | — | Arabic description |
| `description_en` | TEXT | nullable | — | English description |
| `description_tr` | TEXT | nullable | — | Turkish description |
| `website_url` | VARCHAR(512) | nullable | — | External website |
| `contact_email` | VARCHAR(255) | nullable | — | Public contact email |
| `contact_phone` | VARCHAR(32) | nullable | — | Public contact phone |
| `status` | VARCHAR(30) | NOT NULL | `'draft'` | `draft` \| `pending_review` \| `active` \| `suspended` \| `deleted` |
| `verified_at` | TIMESTAMPTZ | nullable | — | When verified by admin |
| `approved_at` | TIMESTAMPTZ | nullable | — | When approved |
| `suspended_at` | TIMESTAMPTZ | nullable | — | When suspended |
| `created_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | Last update timestamp |

**Indexes**: `org_type_idx`, `org_status_idx`, `org_country_idx`, `org_slug_idx`
**Unique**: `organizations_slug_unique` on `slug`
**Soft delete**: Via `status = 'deleted'` (no hard delete)

---

## 2. organization_members

**Purpose**: User↔Organization relationship with role
**Owner**: Organization domain (AMRS-2)

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
| `organization_id` | UUID | NOT NULL | — | FK → organizations (CASCADE) |
| `user_id` | UUID | NOT NULL | — | FK → users (CASCADE) |
| `role` | VARCHAR(20) | NOT NULL | — | `owner` \| `admin` \| `manager` \| `agent` \| `member` |
| `status` | VARCHAR(20) | NOT NULL | `'active'` | `active` \| `inactive` \| `pending` |
| `joined_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | When membership started |
| `invited_by` | UUID | nullable | — | FK → users (SET NULL) |

**Indexes**: `org_member_user_idx`, `org_member_org_idx`, `org_member_status_idx`
**FKs**: 3 (organization, user, invited_by)
**Invariants**: organization role ≠ platform role; owner assigned server-controlled

---

## 3. organization_branches

**Purpose**: Physical branch locations for organizations
**Owner**: Organization domain (AMRS-2)

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
| `organization_id` | UUID | NOT NULL | — | FK → organizations (CASCADE) |
| `name_ar` | VARCHAR(255) | nullable | — | Arabic branch name |
| `name_en` | VARCHAR(255) | nullable | — | English branch name |
| `country_code` | VARCHAR(8) | NOT NULL | — | ISO country code |
| `city_id` | VARCHAR(100) | nullable | — | City reference |
| `district_id` | VARCHAR(100) | nullable | — | District reference |
| `governorate` | VARCHAR(255) | nullable | — | Governorate name |
| `village` | VARCHAR(255) | nullable | — | Village name |
| `street` | VARCHAR(255) | nullable | — | Street address |
| `address_ar` | TEXT | nullable | — | Arabic full address |
| `address_en` | TEXT | nullable | — | English full address |
| `phone` | VARCHAR(32) | nullable | — | Branch phone |
| `email` | VARCHAR(255) | nullable | — | Branch email |
| `latitude` | DOUBLE PRECISION | nullable | — | Geo coordinate |
| `longitude` | DOUBLE PRECISION | nullable | — | Geo coordinate |
| `status` | VARCHAR(20) | NOT NULL | `'active'` | `active` \| `inactive` |
| `working_hours` | JSONB | nullable | — | Working hours schedule |
| `service_areas` | JSONB | nullable | — | Service area definitions |
| `created_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | Last update timestamp |

**Indexes**: `org_branch_org_idx`
**FKs**: 1 (organization)
**Note**: Branches share verification/reputation with parent organization

---

## 4. verification_records

**Purpose**: Generic subject-based verification audit trail
**Owner**: Verification domain (AMRS-2)

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
| `entity_type` | VARCHAR(20) | NOT NULL | — | `user` \| `professional` \| `organization` |
| `entity_id` | UUID | NOT NULL | — | FK to entity (polymorphic) |
| `type` | VARCHAR(20) | NOT NULL | — | `email` \| `phone` \| `identity` \| `professional` \| `organization` \| `license` \| `address` |
| `status` | VARCHAR(20) | NOT NULL | `'pending'` | `pending` \| `verified` \| `failed` \| `expired` \| `revoked` |
| `verified_at` | TIMESTAMPTZ | nullable | — | When verified |
| `expires_at` | TIMESTAMPTZ | nullable | — | When verification expires (null = never) |
| `verified_by` | UUID | nullable | — | FK → users (admin who verified) |
| `source` | VARCHAR(20) | NOT NULL | `'system'` | `system` \| `manual` \| `third_party` |
| `country_code` | VARCHAR(8) | nullable | — | Country of verification |
| `document_url` | VARCHAR(512) | nullable | — | Encrypted document reference |
| `metadata` | JSONB | nullable | — | Minimal metadata (no PII) |
| `created_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | Creation timestamp |

**Indexes**: `verif_entity_idx`, `verif_status_idx`, `verif_expires_idx`, `verif_type_idx`
**FKs**: 1 (verified_by → users)
**Unique constraint**: (entity_type, entity_id, type) — one record per subject per verification type
**Security**: document_url encrypted at rest; no raw evidence in public model

---

## 5. reputation_profiles

**Purpose**: Current reputation state per entity
**Owner**: Reputation domain (AMRS-2)

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
| `entity_type` | VARCHAR(20) | NOT NULL | — | `professional` \| `organization` (NOT user) |
| `entity_id` | UUID | NOT NULL | — | FK to entity (polymorphic) |
| `level` | VARCHAR(20) | NOT NULL | `'new'` | `new` \| `rising` \| `distinguished` \| `gold` \| `promax` |
| `score` | INTEGER | NOT NULL | `0` | Internal score 0-1000 |
| `last_evaluated_at` | TIMESTAMPTZ | nullable | — | When last evaluated |
| `policy_version` | INTEGER | NOT NULL | `1` | Policy version used |
| `grace_period_ends_at` | TIMESTAMPTZ | nullable | — | Grace period end date |
| `created_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | Last update timestamp |

**Indexes**: `rep_entity_idx`, `rep_level_idx`
**Unique constraint**: (entity_type, entity_id) — one profile per subject
**Subjects**: Professional + Organization ONLY (no public normal-user reputation)

---

## 6. reputation_evaluations

**Purpose**: Immutable evaluation records with signal snapshots
**Owner**: Reputation domain (AMRS-2)

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
| `reputation_id` | UUID | NOT NULL | — | FK → reputation_profiles (CASCADE) |
| `policy_version` | INTEGER | NOT NULL | — | Policy version used |
| `old_level` | VARCHAR(20) | NOT NULL | — | Previous level |
| `new_level` | VARCHAR(20) | NOT NULL | — | New level |
| `signals` | JSONB | NOT NULL | — | Signal snapshot (verification, rating, etc.) |
| `reason` | TEXT | nullable | — | Evaluation reason |
| `evaluated_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | When evaluated |
| `admin_override` | BOOLEAN | NOT NULL | `false` | Whether admin overrode |
| `admin_id` | UUID | nullable | — | FK → users (admin who overrode) |

**Indexes**: `eval_reputation_idx`, `eval_evaluated_idx`
**FKs**: 2 (reputation → reputation_profiles, admin → users)

---

## 7. reputation_history

**Purpose**: Level change log (immutable audit trail)
**Owner**: Reputation domain (AMRS-2)

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
| `entity_type` | VARCHAR(20) | NOT NULL | — | Entity type |
| `entity_id` | UUID | NOT NULL | — | Entity ID |
| `old_level` | VARCHAR(20) | NOT NULL | — | Previous level |
| `new_level` | VARCHAR(20) | NOT NULL | — | New level |
| `reason` | TEXT | nullable | — | Change reason |
| `evaluated_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | When changed |
| `policy_version` | INTEGER | NOT NULL | — | Policy version used |

**Indexes**: `hist_entity_idx`, `hist_evaluated_idx`

---

## Future Extensions

| Table | Phase | Purpose |
|-------|-------|---------|
| `activity_states` | Post-MVP | Per-entity activity tracking |
| `availability_states` | Post-MVP | Per-entity availability |
| `profile_strength` | Post-MVP | Completeness scoring |
| `reputation_policies` | AMRS-5 | Policy versioning |
| `badges` | AMRS-3+ | Achievement system |
| `entity_badges` | AMRS-3+ | Badge assignments |
