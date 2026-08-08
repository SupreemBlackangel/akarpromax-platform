# AMRS Data Ownership

> Clear ownership matrix for all AMRS and related data.

## Ownership Matrix

| Domain | Tables | Read | Write | Delete |
|--------|--------|------|-------|--------|
| **Users/Auth** | `users`, `verification_challenges`, `audit_events` | Auth system, AMRS verification | Auth system | Auth system (cascade) |
| **Organizations** | `organizations`, `organization_members`, `organization_branches` | AMRS org domain, Directory, Services | AMRS org domain | AMRS org domain (soft delete) |
| **Verification** | `verification_records` | AMRS verification domain, Admin | AMRS verification domain, Admin | Never (append-only) |
| **Reputation** | `reputation_profiles`, `reputation_evaluations`, `reputation_history` | AMRS reputation domain, Directory, Profiles | AMRS reputation engine, Admin | Never (append-only) |
| **Professional** | `service_provider_profiles` (existing) | AMRS adapter, Services, Directory | Services domain | Services domain |
| **Services** | `service_*` tables (existing) | Services domain | Services domain | Services domain |
| **Properties** | `property_listings` (existing) | Properties domain | Properties domain | Properties domain |
| **Office** | `office_*` tables (existing) | Office integration domain | Office integration domain | Office integration domain |

## Read/Write Access by Module

### Organization Domain
- **Reads**: `organizations`, `organization_members`, `organization_branches`
- **Writes**: Organization CRUD, member management, branch management
- **Delegates to**: Verification domain for org verification, Reputation domain for org reputation

### Verification Domain
- **Reads**: `verification_records`
- **Writes**: Create/update verification records
- **Consumers**: Admin verification UI, auto-verification (email/phone), manual verification workflow

### Reputation Domain
- **Reads**: `reputation_profiles`, `reputation_evaluations`, `reputation_history`
- **Writes**: Evaluation engine (AMRS-5), admin override
- **Consumers**: Directory ranking, profile display, level benefits

### Services Domain
- **Reads**: `service_provider_profiles` (ProfessionalProfile adapter reads here)
- **Writes**: Provider profile CRUD (existing)
- **AMRS integration**: AMRS reads via adapter, does NOT write directly

### Admin Domain
- **Reads**: All AMRS tables for management UI
- **Writes**: Manual override, verification approval, policy management (AMRS-8)

## Data Flow

```
User Registration → users table
    ↓
Professional Upgrade → service_provider_profiles (existing)
    ↓
Organization Creation → organizations + organization_members
    ↓
Verification → verification_records (per subject)
    ↓
Reputation Evaluation → reputation_profiles + reputation_evaluations + reputation_history
    ↓
Directory/Profile Display → reads from all tables
```

## Invariants

1. **Users own their identity** — `users` table is the single source of truth for auth
2. **Organizations are independent** — not nested under users; users have memberships
3. **Verification is append-only** — records are never deleted, only status changes
4. **Reputation is computed** — scores/levels are engine-computed, not user-set
5. **Branches inherit from parent** — organization verification/reputation applies to branches
6. **Professional profiles stay in services** — AMRS reads via adapter, never writes directly

## Future Considerations

- **AMRS-4**: Will migrate verification data from auth tables to `verification_records`
- **AMRS-5**: Will add reputation policy engine that writes to reputation tables
- **AMRS-8**: Will add admin management UI for all AMRS data
- **Data export**: All AMRS data is exportable for GDPR compliance
- **Data deletion**: Organization soft-delete preserves trust history; hard delete requires admin approval
