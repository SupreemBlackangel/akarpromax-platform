# Schema Ownership Matrix

Generated: 2026-08-05

## Current Database Tables

### PostgreSQL (lib/db/schema.ts)

| Table | Owner Module | Read Modules | Write Modules | Legacy | Target |
|-------|--------------|--------------|---------------|--------|--------|
| users | Identity | ALL | Identity | NO | PostgreSQL |

### MySQL (db/mysql/*.ts)

| Table | Owner Module | Read Modules | Write Modules | Legacy | Target |
|-------|--------------|--------------|---------------|--------|--------|
| users | Identity | ALL | Identity | YES | PostgreSQL |
| roles | Identity | ALL | Identity | YES | PostgreSQL |
| sessions | Identity | Identity | Identity | YES | PostgreSQL |
| sponsor_access | Identity | Identity, Admin | Identity | YES | PostgreSQL |
| sponsors | Organizations | Admin, Public | Admin | YES | PostgreSQL |
| sponsor_profiles | Organizations | Public | Organizations | YES | PostgreSQL |
| sponsor_users | Organizations | Admin | Organizations | YES | PostgreSQL |
| sponsor_branches | Organizations | Public | Organizations | YES | PostgreSQL |
| sponsor_plans | Organizations | Admin | Organizations | YES | PostgreSQL |
| sponsor_subscriptions | Organizations | Admin | Organizations | YES | PostgreSQL |
| sponsor_contracts | Organizations | Admin | Organizations | YES | PostgreSQL |
| sponsor_documents | Organizations | Admin | Organizations | YES | PostgreSQL |
| sponsor_payments | Organizations | Admin | Organizations | YES | PostgreSQL |
| sponsor_invoices | Organizations | Admin | Organizations | YES | PostgreSQL |
| sponsor_events | Organizations | Admin | Organizations | YES | PostgreSQL |
| sponsor_activity_logs | Organizations | Admin | Organizations | YES | PostgreSQL |
| ad_assets | Advertisements | Admin | Advertisements | YES | PostgreSQL |
| ad_campaigns | Advertisements | Admin | Advertisements | YES | PostgreSQL |
| ad_creatives | Advertisements | Admin | Advertisements | YES | PostgreSQL |
| ad_events | Advertisements | Admin | Advertisements | YES | PostgreSQL |
| news | Knowledge | Public, Admin | Admin | YES | PostgreSQL |
| office_links | Office | Admin | Office | YES | PostgreSQL |

### D1/SQLite (db/schema.ts + runtime)

| Table | Owner Module | Read Modules | Write Modules | Legacy | Target |
|-------|--------------|--------------|---------------|--------|--------|
| i18n_namespaces | Knowledge | Public | Knowledge | YES | PostgreSQL |
| i18n_keys | Knowledge | Public | Knowledge | YES | PostgreSQL |
| i18n_translations | Knowledge | Public | Knowledge | YES | PostgreSQL |
| i18n_versions | Knowledge | Admin | Knowledge | YES | PostgreSQL |
| i18n_change_log | Knowledge | Admin | Knowledge | YES | PostgreSQL |
| service_categories | Services | Public | Services | YES | PostgreSQL |
| service_listings | Services | Public | Services | YES | PostgreSQL |
| service_requests | Services | Public | Services | YES | PostgreSQL |
| service_offers | Services | Public | Services | YES | PostgreSQL |
| service_orders | Services | Public | Services | YES | PostgreSQL |
| service_messages | Services | Public | Services | YES | PostgreSQL |
| service_reviews | Services | Public | Services | YES | PostgreSQL |
| service_disputes | Services | Admin | Services | YES | PostgreSQL |
| service_bookmarks | Services | Public | Services | YES | PostgreSQL |
| ad_impressions | Advertisements | Admin | Advertisements | YES | PostgreSQL |
| ad_clicks | Advertisements | Admin | Advertisements | YES | PostgreSQL |
| ad_conversions | Advertisements | Admin | Advertisements | YES | PostgreSQL |
| ad_daily_statistics | Advertisements | Admin | Advertisements | YES | PostgreSQL |

## Ownership Rules

1. **Single Owner** — Each table has exactly one owner module
2. **Write Permission** — Only the owner module can write to a table
3. **Read Permission** — Other modules can read via public API only
4. **No Direct Access** — Never access another module's table directly

## Current Violations

| Table | Issue | Severity | Legacy Exception |
|-------|-------|----------|------------------|
| All MySQL tables | Multi-database (MySQL + PG) | WARNING | YES |
| All D1 tables | Multi-database (D1 + PG) | WARNING | YES |
| sponsor_access | Written by both Identity and Admin | VIOLATION | YES |

## Migration Target

After Phase 5:
- All tables move to PostgreSQL
- Single database system
- Clear module ownership
- No cross-module direct access
