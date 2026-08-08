# AMRS-2 Migration Preview

> This document previews the database migrations that AMRS-2 will create.
> AMRS-1 (current phase) creates NO database changes — only domain contracts and adapters.

## New Tables (AMRS-2)

### 1. `organizations`
```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar VARCHAR(255),
  name_en VARCHAR(255),
  name_tr VARCHAR(255),
  slug VARCHAR(255) UNIQUE NOT NULL,
  type VARCHAR(30) NOT NULL,          -- real_estate | business | other
  classification VARCHAR(30) NOT NULL, -- startup | sme | established | enterprise
  country_code VARCHAR(8) NOT NULL,
  city_id VARCHAR(100),
  district_id VARCHAR(100),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  logo_url TEXT,
  cover_url TEXT,
  description_ar TEXT,
  description_en TEXT,
  description_tr TEXT,
  website_url TEXT,
  contact_email VARCHAR(255),
  contact_phone VARCHAR(32),
  status VARCHAR(30) NOT NULL DEFAULT 'draft',  -- draft | pending_review | active | suspended | deleted
  verified_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  suspended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_country ON organizations(country_code);
CREATE INDEX idx_organizations_status ON organizations(status);
```

### 2. `organization_members`
```sql
CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL,          -- owner | admin | manager | agent | member
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- active | inactive | pending
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  invited_by UUID REFERENCES users(id),
  UNIQUE(organization_id, user_id)
);
CREATE INDEX idx_org_members_user ON organization_members(user_id);
CREATE INDEX idx_org_members_org ON organization_members(organization_id);
```

### 3. `organization_branches`
```sql
CREATE TABLE organization_branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name_ar VARCHAR(255),
  name_en VARCHAR(255),
  country_code VARCHAR(8) NOT NULL,
  city_id VARCHAR(100),
  district_id VARCHAR(100),
  governorate VARCHAR(255),
  village VARCHAR(255),
  street VARCHAR(255),
  address_ar TEXT,
  address_en TEXT,
  phone VARCHAR(32),
  email VARCHAR(255),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- active | inactive
  working_hours JSONB,
  service_areas JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_org_branches_org ON organization_branches(organization_id);
```

### 4. `verification_records`
```sql
CREATE TABLE verification_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(20) NOT NULL,   -- user | professional | organization
  entity_id UUID NOT NULL,
  type VARCHAR(20) NOT NULL,          -- email | phone | identity | professional | organization | license | address
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending | verified | failed | expired | revoked
  verified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  verified_by UUID REFERENCES users(id),
  source VARCHAR(20) NOT NULL DEFAULT 'system', -- system | manual | third_party
  country_code VARCHAR(8),
  document_url TEXT,                   -- encrypted at rest
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(entity_type, entity_id, type)
);
CREATE INDEX idx_verification_entity ON verification_records(entity_type, entity_id);
CREATE INDEX idx_verification_status ON verification_records(status);
```

### 5. `reputation_profiles`
```sql
CREATE TABLE reputation_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(20) NOT NULL,   -- user | professional | organization
  entity_id UUID NOT NULL,
  level VARCHAR(20) NOT NULL DEFAULT 'new', -- new | rising | distinguished | gold | promax
  score INTEGER NOT NULL DEFAULT 0,   -- 0-1000 internal
  last_evaluated_at TIMESTAMPTZ,
  policy_version INTEGER NOT NULL DEFAULT 1,
  grace_period_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(entity_type, entity_id)
);
CREATE INDEX idx_reputation_entity ON reputation_profiles(entity_type, entity_id);
CREATE INDEX idx_reputation_level ON reputation_profiles(level);
```

### 6. `reputation_evaluations`
```sql
CREATE TABLE reputation_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reputation_id UUID NOT NULL REFERENCES reputation_profiles(id) ON DELETE CASCADE,
  policy_version INTEGER NOT NULL,
  old_level VARCHAR(20) NOT NULL,
  new_level VARCHAR(20) NOT NULL,
  signals JSONB NOT NULL,             -- { verification, profileCompleteness, responseRate, ... }
  reason TEXT,
  evaluated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  admin_override BOOLEAN NOT NULL DEFAULT FALSE,
  admin_id UUID REFERENCES users(id)
);
CREATE INDEX idx_evaluations_reputation ON reputation_evaluations(reputation_id);
```

### 7. `reputation_history`
```sql
CREATE TABLE reputation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(20) NOT NULL,
  entity_id UUID NOT NULL,
  old_level VARCHAR(20) NOT NULL,
  new_level VARCHAR(20) NOT NULL,
  reason TEXT,
  evaluated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  policy_version INTEGER NOT NULL
);
CREATE INDEX idx_reputation_history_entity ON reputation_history(entity_type, entity_id);
```

## Deferred Tables (Post-MVP)

| Table | Reason Deferred |
|-------|----------------|
| `activity_states` | Activity tracking can be computed from existing login/action data |
| `availability_states` | Availability is a simple field; can be added later |
| `profile_strength` | Score computation doesn't need a dedicated table in MVP |

## Extensions to Existing Tables

| Table | Change | Purpose |
|-------|--------|---------|
| `users` | No schema change | Existing user model is sufficient |
| `service_provider_profiles` | Reused as-is | ProfessionalProfile maps directly |
| `audit_logs` | Extended with AMRS actions | Verification, reputation, membership events |

## Migration Order

1. `organizations` → `organization_members` → `organization_branches`
2. `verification_records`
3. `reputation_profiles` → `reputation_evaluations` → `reputation_history`

## Rollback

Each migration is additive (new tables only). Rollback: `DROP TABLE` in reverse order.
No existing tables are modified. No data is migrated.
