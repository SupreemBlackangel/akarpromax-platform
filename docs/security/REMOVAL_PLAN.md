# Removal Plan — Developer Backdoors and Unsafe Auth Patterns

Generated: 2026-08-06

Purpose: document what was removed/already absent in the target app and what is
still forbidden. The reference app (`D:\new program - Copy`) stays **read-only**;
nothing here copies from it.

## Reference app's unsafe patterns (never in the target)

| Pattern | Reference app | Target status |
| --- | --- | --- |
| Dev-login backdoor route | `/dev-login` | **Absent.** No such route exists in the target. The guard `lib/security/dev-login.ts` is anticipatory: it would reject any future attempt unless `NODE_ENV=development` AND `ENABLE_DEV_LOGIN === "true"`. |
| Header identity | ChatGPT `x-openai-*` headers / Bearer / localhost auto-admin | Removed (`app/chatgpt-auth.ts` deleted; session is the only identity source — see AGENTS.md). |
| Default signing secret | `JWT_SECRET \|\| "my_super_secret_key"` | Rejected at boot in production by `lib/config/runtime-env.ts` (weak-secret list). |
| Localhost admin fallback | implicit admin on localhost | Removed (AGENTS.md auth chain section). |

## Guard behaviour (`lib/security/dev-login.ts`)

```
assertDevLoginAllowed()
  → allowed ONLY when nodeEnv === "development" && ENABLE_DEV_LOGIN === "true"
  → otherwise logs AUTH_DEV_LOGIN_BLOCKED and throws 403 { code: "dev_login_disabled" }
```

Verified by `tests/dev-login.test.mjs` (5 cases): blocked in production, blocked
in test, blocked in dev without the flag, allowed only in dev with the flag,
never on by default.

## Rules

1. **Never create** a `/dev-login` route or any session-forging endpoint.
2. **Never** restore header-based identity or localhost auto-admin.
3. **Never** fall back to a hardcoded signing secret.
4. **Never** copy auth/secrets/`.env`/DB config from the reference app into the
   target; consult `SECRET_ROTATION_REQUIRED.md` instead.
5. Development conveniences must be gated by `ENABLE_DEV_LOGIN` semantics
   (environment-specific and off by default).

## Related

- `docs/audit/ROOT_CLEANUP_REPORT.md` (root scripts with hardcoded MySQL creds)
- `docs/security/CREDENTIAL_EXPOSURE_RESPONSE.md`
- `docs/security/PHASE_4_COMMIT_SECRET_SCAN.md`
