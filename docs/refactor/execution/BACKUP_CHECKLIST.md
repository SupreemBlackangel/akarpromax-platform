# Backup Checklist

Generated: 2026-08-05

## Status

This checklist documents backup requirements before major refactoring.
Each item must be verified manually before proceeding.

## Backup Items

- [ ] **PostgreSQL backup**
  - Method: pg_dump or Neon dashboard backup
  - Target: Auth users table (`lib/db/schema.ts`)
  - Location: ___
  - Timestamp: ___
  - Operator: ___

- [ ] **MySQL backup**
  - Method: mysqldump
  - Target: Full akarpromax database (runtime data, sponsors, ads, news, services)
  - Location: ___
  - Timestamp: ___
  - Operator: ___

- [ ] **D1/SQLite backup**
  - Method: wrangler d1 export or file copy
  - Target: Local dev D1 databases
  - Location: ___
  - Timestamp: ___
  - Operator: ___

- [ ] **Uploaded assets backup**
  - Method: File copy from MinIO/storage
  - Target: Property images, sponsor logos, ad creatives
  - Location: ___
  - Timestamp: ___
  - Operator: ___

- [ ] **Object storage backup**
  - Method: MinIO mirror or snapshot
  - Target: All buckets
  - Location: ___
  - Timestamp: ___
  - Operator: ___

- [ ] **Environment variables inventory**
  - Method: Manual review of .env files
  - Target: DATABASE_URL, MYSQL_URL, SESSION_SECRET, JWT_SECRET
  - Location: ___
  - Timestamp: ___
  - Operator: ___

- [ ] **Restoration test**
  - Method: Restore to isolated environment
  - Target: Verify data integrity
  - Location: ___
  - Timestamp: ___
  - Operator: ___

## Notes

- Do NOT commit .env files or secrets to Git.
- Do NOT copy database credentials into documentation.
- Backup location should be outside the repository.
- Test restoration before proceeding with destructive changes.
