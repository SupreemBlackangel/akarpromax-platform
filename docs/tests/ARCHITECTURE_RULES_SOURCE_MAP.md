# Architecture Rules Source Map

Generated: 2026-08-05

## Rules Registry

| Rule ID | Rule | Source Document | Source Section | Automated | Manual | Temporary Exception | Removal Phase |
|---------|------|-----------------|----------------|-----------|--------|---------------------|---------------|
| ARCH-001 | No cross-module direct imports | ADR-002 | Violations | YES | NO | NO | Phase 2 |
| ARCH-002 | Inter-module communication via contracts/events only | ADR-002 | Dependency Rules | YES | NO | NO | Phase 2 |
| ARCH-003 | No circular dependencies | ADR-002 | Dependency Rules | YES | NO | NO | Phase 2 |
| ARCH-004 | No cross-module DB access | ADR-002 | Violations | YES | NO | YES (legacy) | Phase 5 |
| ARCH-005 | Public pages cannot import admin/** | ADR-000 | Mandatory Decisions | YES | NO | NO | Phase 2 |
| ARCH-006 | Admin pages cannot import public navigation | ADR-000 | Mandatory Decisions | YES | NO | NO | Phase 2 |
| ARCH-007 | Only 4 layouts allowed | ADR-000 | Mandatory Decisions | YES | NO | NO | Phase 2 |
| ARCH-008 | No local Header/Footer in pages | LAYOUT_AND_ADS_STANDARD | Layout Contract | YES | NO | NO | Phase 2 |
| ARCH-009 | All ads via AdSlot component | LAYOUT_AND_ADS_STANDARD | AdSlot Contract | YES | NO | YES (legacy) | Phase 2 |
| ARCH-010 | No Bearer Token from localStorage | AUTH_CONSOLIDATION | System 2 | YES | NO | YES (legacy) | Phase 3 |
| ARCH-011 | No OpenAI/ChatGPT header identity | AUTH_CONSOLIDATION | System 3 | YES | NO | YES (legacy) | Phase 3 |
| ARCH-012 | No localhost auto-admin fallback | AUTH_CONSOLIDATION | System 4 | YES | NO | YES (legacy) | Phase 3 |
| ARCH-013 | PostgreSQL is target database | ADR-001 | Decision | YES | NO | YES (MySQL/D1) | Phase 5 |
| ARCH-014 | No 4th database system | ADR-000 | Mandatory Decisions | YES | NO | NO | Phase 2 |
| ARCH-015 | No 5th auth system | ADR-000 | Mandatory Decisions | YES | NO | NO | Phase 2 |
| ARCH-016 | No business logic in React components | ADR-000 | Mandatory Decisions | YES | NO | YES (legacy) | Phase 2 |
| ARCH-017 | Pages must be classified | ADR-000 | Mandatory Decisions | YES | NO | NO | Phase 2 |
| ARCH-018 | No duplicate route definitions | FINAL_ROUTE_MAP | Route Ownership | YES | NO | NO | Phase 2 |
| ARCH-019 | Tables must have owner module | ADR-002 | Module Details | YES | NO | YES (legacy) | Phase 5 |
| ARCH-020 | No multi-owner tables | ADR-002 | Module Details | YES | NO | NO | Phase 2 |
| ARCH-021 | No multi-writer tables | ADR-002 | Module Details | YES | NO | YES (legacy) | Phase 5 |
| ARCH-022 | No internal folder imports | ADR-002 | Violations | YES | NO | NO | Phase 2 |
| ARCH-023 | Only public export imports allowed | ADR-002 | Violations | YES | NO | NO | Phase 2 |
| ARCH-024 | Shared UI must be neutral | ADR-000 | Mandatory Decisions | YES | NO | NO | Phase 2 |
| ARCH-025 | File size limits | ADR-000 | Definition of Done | YES | NO | YES (warning only) | Phase 2 |
