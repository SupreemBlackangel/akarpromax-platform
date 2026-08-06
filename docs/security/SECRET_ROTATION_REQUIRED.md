# Secret Rotation Required

Generated: 2026-08-06

## Why this document exists

The repository history and `.env.example` contain **placeholder and weak
secrets**. In production these are now rejected at boot
(`lib/config/runtime-env.ts` → `RuntimeEnvError`, fail-fast), but that only
protects fresh deployments. Anyone who previously copied `.env.example` as
`.env` still runs with the old placeholder until they rotate.

Additionally, git history is public/rotatable: the `SESSION_SECRET` placeholder
(`REPLACE_WITH_32_BYTE_RANDOM_STRING`) and the reference app's
`JWT_SECRET || "my_super_secret_key"` fallback appear in commits. If any real
secret ever replaced those strings in a committed file, it is **compromised
forever** (history is not removed by a normal revert).

## What is rejected (production)

`lib/config/runtime-env.ts` refuses to boot when `SESSION_SECRET` is:

- missing,
- shorter than 32 characters,
- on the known weak/placeholder list (`secret`, `changeme`, `change-me`,
  `development`, `test`, `password`, `my_super_secret_key`, `default-secret`,
  `your-secret-here`, `12345678`, `replace_with_32_byte_random_string`), or
- equal to the development/test fallback secrets.

`DATABASE_URL` and `APP_URL` are required in production; `TRUSTED_ORIGINS` must
contain at least one valid `http(s)` origin.

## Required rotation checklist

1. Generate a new secret, e.g. `openssl rand -base64 48` (≥ 32 bytes) or
   `crypto.randomUUID() + crypto.randomUUID()`.
2. Set `SESSION_SECRET` in the production environment (env vars / secret
   manager), **not** in a committed file.
3. Verify boot: `npm run build` then start; `RuntimeEnvError` must not appear.
4. Rotate `DATABASE_URL` / MySQL credentials if they ever appeared in a
   committed `.env.example` or diff.
5. Post-rotation: all previously issued `akar_session` tokens become invalid
   when the signing secret changes — users re-login once.
6. Check CI/commit hooks against secrets (see
   `docs/security/PHASE_4_COMMIT_SECRET_SCAN.md`).

## Known committed secret-shaped content

| Where | Value | Disposition |
| --- | --- | --- |
| `.env.example` | `REPLACE_WITH_32_BYTE_RANDOM_STRING` | Placeholder; **rejected in prod**. Comment updated in Phase 0. |
| Reference app (read-only, `D:\new program - Copy`) | `JWT_SECRET \|\| "my_super_secret_key"` | Reference only; never copied into target (see `REMOVAL_PLAN.md`). |
| `_e2e_*.mjs` (root, tracked) | `root:root@localhost:3306` | Local dev creds; script classed `REMOVE_FROM_GIT` in `ROOT_CLEANUP_REPORT.md`. |

## Audit events

- `AUTH_SECRET_VALIDATION_FAILED` — boot-time secret/URL validation failure
  (variable + reason; **never the value**).
- The secret itself is never logged or included in any error message
  (verified by `tests/runtime-env.test.mjs`).
