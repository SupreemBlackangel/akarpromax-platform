# Phase 2 Warnings

Classification of all 20 architecture warnings.

## Warning Categories

### ARCH-007: Layout not in allowed list (4 warnings)

| Warning ID | Rule | File | Description | Severity | Legacy | Blocking | Target Phase | Owner | Recommended Fix |
|------------|------|------|-------------|----------|--------|----------|--------------|-------|-----------------|
| ARCH-007-1 | ARCH-007 | app/(public)/layout.tsx | Layout not in allowed list | LOW | NO | NO | Phase 3 | Architecture | Add to allowed list or remove |
| ARCH-007-2 | ARCH-007 | app/(account)/layout.tsx | Layout not in allowed list | LOW | NO | NO | Phase 3 | Architecture | Add to allowed list or remove |
| ARCH-007-3 | ARCH-007 | app/(admin)/layout.tsx | Layout not in allowed list | LOW | NO | NO | Phase 3 | Architecture | Add to allowed list or remove |
| ARCH-007-4 | ARCH-007 | app/(workspace)/layout.tsx | Layout not in allowed list | LOW | NO | NO | Phase 3 | Architecture | Add to allowed list or remove |

**Classification:** PHASE 3
**Reason:** These layouts are new route group layouts created in Phase 2. They need to be added to the allowed list in the architecture test script.

### ARCH-013: MySQL usage (5 warnings)

| Warning ID | Rule | File | Description | Severity | Legacy | Blocking | Target Phase | Owner | Recommended Fix |
|------------|------|------|-------------|----------|--------|----------|--------------|-------|-----------------|
| ARCH-013-1 | ARCH-013 | lib/services/audit.ts | MySQL usage (legacy allowed) | LOW | YES | NO | Phase 5 | Database | Migrate to PostgreSQL |
| ARCH-013-2 | ARCH-013 | lib/services/core.ts | MySQL usage (legacy allowed) | LOW | YES | NO | Phase 5 | Database | Migrate to PostgreSQL |
| ARCH-013-3 | ARCH-013 | lib/services/db.ts | MySQL usage (legacy allowed) | LOW | YES | NO | Phase 5 | Database | Migrate to PostgreSQL |
| ARCH-013-4 | ARCH-013 | lib/sponsor-auth.ts | MySQL usage (legacy allowed) | LOW | YES | NO | Phase 5 | Database | Migrate to PostgreSQL |
| ARCH-013-5 | ARCH-013 | app/api/auth/verify/route.ts | MySQL usage (legacy allowed) | LOW | YES | NO | Phase 5 | Database | Migrate to PostgreSQL |

**Classification:** SAFE LEGACY
**Reason:** These are legacy MySQL usages that are documented and allowed. They will be migrated to PostgreSQL in Phase 5.

### ARCH-025: File size limits (11 warnings)

| Warning ID | Rule | File | Description | Severity | Legacy | Blocking | Target Phase | Owner | Recommended Fix |
|------------|------|------|-------------|----------|--------|----------|--------------|-------|-----------------|
| ARCH-025-1 | ARCH-025 | app/admin/ads/ads-admin-client.tsx | Component 958 lines (>400) | LOW | YES | NO | Phase 4 | Components | Split into smaller components |
| ARCH-025-2 | ARCH-025 | app/admin/sponsors/sponsor-admin-client.tsx | Component 458 lines (>400) | LOW | YES | NO | Phase 4 | Components | Split into smaller components |
| ARCH-025-3 | ARCH-025 | app/api/ads/route.ts | Component 403 lines (>400) | LOW | YES | NO | Phase 4 | API | Split into smaller routes |
| ARCH-025-4 | ARCH-025 | app/page.tsx | Page component 545 lines (>300) | LOW | YES | NO | Phase 3 | Components | Extract presentation components |
| ARCH-025-5 | ARCH-025 | app/services/page.tsx | Page component 311 lines (>300) | LOW | YES | NO | Phase 3 | Components | Extract presentation components |
| ARCH-025-6 | ARCH-025 | src/components/AccountDialog.tsx | Component 916 lines (>400) | LOW | YES | NO | Phase 3 | Components | Split into smaller components |
| ARCH-025-7 | ARCH-025 | lib/ads/admin.ts | Component 479 lines (>400) | LOW | YES | NO | Phase 4 | Library | Split into smaller modules |
| ARCH-025-8 | ARCH-025 | lib/ads/engine.ts | Component 490 lines (>400) | LOW | YES | NO | Phase 4 | Library | Split into smaller modules |
| ARCH-025-9 | ARCH-025 | lib/mysql-runtime.ts | Component 657 lines (>400) | LOW | YES | NO | Phase 5 | Library | Migrate to PostgreSQL |
| ARCH-025-10 | ARCH-025 | lib/runtime-db.ts | Component 533 lines (>400) | LOW | YES | NO | Phase 5 | Library | Migrate to D1 |
| ARCH-025-11 | ARCH-025 | lib/services/core.ts | Component 532 lines (>400) | LOW | YES | NO | Phase 5 | Library | Split into smaller modules |

**Classification:** SAFE LEGACY
**Reason:** These are large files that need to be refactored, but they are not blocking Phase 2 completion. They will be addressed in later phases.

## Summary

| Classification | Count | Blocking |
|----------------|-------|----------|
| PHASE 3 | 4 | NO |
| SAFE LEGACY | 16 | NO |
| **Total** | **20** | **NO** |

## Conclusion

No warnings are classified as "PHASE 2 REQUIRED". All warnings are either:
- PHASE 3 (layouts need to be added to allowed list)
- SAFE LEGACY (documented legacy issues)

Phase 2 can be completed without fixing any warnings.
