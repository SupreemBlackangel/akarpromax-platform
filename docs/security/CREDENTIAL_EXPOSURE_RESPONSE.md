# Credential Exposure Response Report

Generated: 2026-08-05

## Summary

A security review was triggered after admin credentials were referenced outside
the secret store. This report documents all hardcoded credential references
found in the codebase and recommended next steps.

**No plaintext passwords were found in any source file.**
The exposure is limited to hardcoded email addresses used as dev/seed identities.

## Hardcoded Email References

### 1. `admin@localhost.akarpromax`

| File | Line | Tracked | Risk |
|------|------|---------|------|
| `app/chatgpt-auth.ts` | 54 | YES | Hardcoded localhost fallback identity with `super_admin` role |
| `lib/mysql-runtime.ts` | 561 | YES | Seed function inserts this email with `super_admin` role |
| `scripts/seed-services.ts` | 6 | YES | Seed script uses this email as admin identity |

**Risk:** This email is used as an auto-admin fallback on localhost and as a
seed identity. It is not a real production credential, but it bypasses auth
on local dev. If the pattern spreads to production code, it creates an
unauthorized access vector.

### 2. `test@example.com`

**Not found in any source file.** Only referenced in conversation history.

### 3. Plaintext passwords

**Not found in any source file.** No hardcoded passwords detected in:
- Source code (`app/**`, `src/**`, `lib/**`, `scripts/**`)
- Seed files
- Documentation
- Environment templates

The `.env.example` contains only placeholder values (empty or
`REPLACE_WITH_32_BYTE_RANDOM_STRING`).

## Accounts Requiring Rotation

| Email | Reason | Action |
|-------|--------|--------|
| `admin@localhost.akarpromax` | Dev-only localhost fallback; no real password stored in code | Rotate if used in any real database; remove localhost fallback in Phase 2 |
| `admin@akarpromax.com` | Referenced in conversation history only; not in source | Verify if real account exists in production DB; rotate immediately if so |
| `test@example.com` | Referenced in conversation history only; not in source | Verify if real account exists in production DB; rotate immediately if so |

## Recommended Rotation Steps

1. Query production PostgreSQL `users` table for these emails.
2. If any exist, reset passwords via a secure admin tool (not through the app).
3. Invalidate all active sessions for those accounts.
4. Document the rotation in this file.

## Files Requiring Change (deferred to Phase 2+)

- `app/chatgpt-auth.ts:54` — Remove localhost auto-admin fallback
- `lib/mysql-runtime.ts:561` — Replace hardcoded email with env variable
- `scripts/seed-services.ts:6` — Replace hardcoded email with env variable

## Secrets Exposure Status

- `.env` file: NOT tracked by Git (confirmed in `.gitignore`)
- `.env.example`: Contains only placeholders, no real secrets
- Patch file: Does not contain `.env` content
- All reports: No secret values printed

## Conclusion

No passwords were leaked in source code. The hardcoded email
`admin@localhost.akarpromax` is a dev convenience that should be removed
in a future phase. Real credentials (if they exist in production databases)
should be rotated immediately through a secure process outside this codebase.
