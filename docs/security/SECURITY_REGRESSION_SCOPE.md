# Security Regression Scope

Verified under `vinext start` + `DB_PROVIDER=postgres`:

- **CSRF / trusted origin**: `assertSafeOrigin(request)` on every auth mutation; `TRUSTED_ORIGINS` enforced.
- **Session fixation**: login signs a fresh JWT (`signSessionPayload` with a new `jti`); logout revokes the `jti` via `revokeSessionJti`.
- **Cookie flags**: `HttpOnly=true`, `SameSite=lax`, `Path=/`, `Secure=NODE_ENV==="production"` (`lib/auth/session.ts::buildSessionCookieOptions`).
- **Account enumeration**: login/register return generic `invalid_credentials` / `sent_if_exists`; timing is not leaked beyond the password hash verification path.
- **RBAC**: `lib/sponsor-auth.ts` resolves identity strictly from the `akar_session` cookie and `permissionsForSessionRole`; no ChatGPT header / bearer-token / localhost-bypass identity sources remain (`app/chatgpt-auth.ts` deleted).
- **IDOR / tenant isolation**: sponsor-scoped queries filter by the session identity; `requireSessionUser` enforces authenticated access to admin pages.
- **Private data filtering**: `/me` returns only server-selected fields; password hashes never leave `lib/db`.
- **Password hashing**: `argon2` via `lib/auth/password.ts`.
- **DB fail-fast**: `SchemaModeError` for `d1` without binding; no silent DB fallback.
- **Seed protection**: `SEED_DEMO_DATA=true` opt-in; production default = no demo data.

## Failure modes tested

| Scenario | Expected | Verified |
|---|---|---|
| invalid DB_PROVIDER | `SchemaModeError` (503/500) | yes |
| missing DATABASE_URL | `getRuntimeEnv` throw (503 on health) | yes |
| invalid session cookie | `/me` 401 | yes (E2E) |
| revoked session | `/me` 401 after logout | yes (E2E) |
| malformed Cookie header | `/me` 401 | yes (E2E) |
| PostgreSQL unreachable | schema init errors → `/api/health` 503, `mode:"failed"` | design (fail-fast) |
| schema incompatibility | `SchemaModeError`/`PostgresError` (no silent downgrade) | design (fail-fast) |
