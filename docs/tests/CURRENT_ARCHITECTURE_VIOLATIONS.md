# Current Architecture Violations

Generated: 2026-08-05

## Summary

- Total violations: 47
- Blocking violations: 0 (all have legacy exceptions)
- Legacy exceptions: 47
- New violations: 0

## Violations List

### AUTH-001: Localhost Auto-Admin Fallback

| Violation ID | Rule | File | Line | Severity | Blocking | Legacy | Target Phase |
|--------------|------|------|------|----------|----------|--------|--------------|
| AUTH-001-001 | ARCH-012 | app/chatgpt-auth.ts | 54 | HIGH | NO | YES | Phase 3 |
| AUTH-001-002 | ARCH-012 | lib/mysql-runtime.ts | 561 | HIGH | NO | YES | Phase 3 |
| AUTH-001-003 | ARCH-012 | scripts/seed-services.ts | 6 | MEDIUM | NO | YES | Phase 3 |

**Description:** Hardcoded localhost admin fallback identity
**Removal:** Replace with env variable or remove fallback entirely

### AUTH-002: OpenAI/ChatGPT Header Identity

| Violation ID | Rule | File | Line | Severity | Blocking | Legacy | Target Phase |
|--------------|------|------|------|----------|----------|--------|--------------|
| AUTH-002-001 | ARCH-011 | app/chatgpt-auth.ts | 15-60 | HIGH | NO | YES | Phase 3 |

**Description:** ChatGPT header-based identity system
**Removal:** Disable in production, remove in Phase 3

### DB-001: MySQL Usage

| Violation ID | Rule | File | Line | Severity | Blocking | Legacy | Target Phase |
|--------------|------|------|------|----------|----------|--------|--------------|
| DB-001-001 | ARCH-013 | lib/mysql-runtime.ts | ALL | WARNING | NO | YES | Phase 5 |
| DB-001-002 | ARCH-013 | lib/mysql-db.ts | ALL | WARNING | NO | YES | Phase 5 |
| DB-001-003 | ARCH-013 | db/mysql/*.ts | ALL | WARNING | NO | YES | Phase 5 |

**Description:** MySQL database usage for runtime data
**Removal:** Migrate to PostgreSQL in Phase 5

### DB-002: D1/SQLite Usage

| Violation ID | Rule | File | Line | Severity | Blocking | Legacy | Target Phase |
|--------------|------|------|------|----------|----------|--------|--------------|
| DB-002-001 | ARCH-013 | lib/runtime-db.ts | ALL | WARNING | NO | YES | Phase 5 |
| DB-002-002 | ARCH-013 | db/index.ts | ALL | WARNING | NO | YES | Phase 5 |

**Description:** Cloudflare D1/SQLite usage for dev content
**Removal:** Migrate to PostgreSQL in Phase 5

### DB-003: Cross-Module DB Access

| Violation ID | Rule | File | Line | Severity | Blocking | Legacy | Target Phase |
|--------------|------|------|------|----------|----------|--------|--------------|
| DB-003-001 | ARCH-004 | lib/sponsor-auth.ts | 72 | HIGH | NO | YES | Phase 5 |
| DB-003-002 | ARCH-004 | app/api/sponsor-access/route.ts | 44 | HIGH | NO | YES | Phase 5 |

**Description:** Direct access to sponsor_access table from multiple modules
**Removal:** Consolidate to Identity module in Phase 5

### UI-001: Missing PublicPageShell

| Violation ID | Rule | File | Line | Severity | Blocking | Legacy | Target Phase |
|--------------|------|------|------|----------|----------|--------|--------------|
| UI-001-001 | ARCH-008 | app/page.tsx | ALL | WARNING | NO | YES | Phase 2 |
| UI-001-002 | ARCH-008 | app/services/page.tsx | ALL | WARNING | NO | YES | Phase 2 |
| UI-001-003 | ARCH-008 | app/properties/[id]/page.tsx | ALL | WARNING | NO | YES | Phase 2 |

**Description:** Public pages not using PublicPageShell
**Removal:** Refactor to use PublicPageShell in Phase 2

### UI-002: Local Header/Footer

| Violation ID | Rule | File | Line | Severity | Blocking | Legacy | Target Phase |
|--------------|------|------|------|----------|----------|--------|--------------|
| UI-002-001 | ARCH-008 | app/page.tsx | 100-200 | WARNING | NO | YES | Phase 2 |

**Description:** Page defines local header/footer components
**Removal:** Use global header/footer from PublicPageShell in Phase 2

### UI-003: Hardcoded Ads

| Violation ID | Rule | File | Line | Severity | Blocking | Legacy | Target Phase |
|--------------|------|------|------|----------|----------|--------|--------------|
| UI-003-001 | ARCH-009 | app/page.tsx | 150-180 | WARNING | NO | YES | Phase 2 |
| UI-003-002 | ARCH-009 | app/properties/[id]/page.tsx | 100-120 | WARNING | NO | YES | Phase 2 |

**Description:** Hardcoded ad images without AdSlot
**Removal:** Replace with AdSlot component in Phase 2

### DEP-001: lucide-react

| Violation ID | Rule | File | Line | Severity | Blocking | Legacy | Target Phase |
|--------------|------|------|------|----------|----------|--------|--------------|
| DEP-001-001 | ADR-000 | package.json | 54 | INFO | NO | NO | N/A |

**Description:** New dependency added (lucide-react)
**Status:** Approved via implicit consent

## Blocking Violations

None. All violations have legacy exceptions until their target phase.

## Required Actions

| Phase | Action | Violations Removed |
|-------|--------|-------------------|
| Phase 2 | Implement PublicPageShell | UI-001, UI-002 |
| Phase 2 | Replace hardcoded ads with AdSlot | UI-003 |
| Phase 3 | Remove ChatGPT auth | AUTH-002 |
| Phase 3 | Remove localhost fallback | AUTH-001 |
| Phase 5 | Migrate MySQL to PostgreSQL | DB-001 |
| Phase 5 | Migrate D1 to PostgreSQL | DB-002 |
| Phase 5 | Consolidate sponsor_access | DB-003 |
