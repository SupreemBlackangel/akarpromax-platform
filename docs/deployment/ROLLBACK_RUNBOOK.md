# Rollback Runbook

## When to use

- New build is unhealthy (readiness 503, auth 500, content 500).
- A schema version is incompatible with the previous application image.

## Procedure

1. Stop the new instance(s).
2. Deploy the previous safe commit (rollback base `06a4a2f` covers Phase 5 baseline; for finer rollback use the nearest prior commit).

```bash
git checkout <previous-safe-commit>
npm ci
npm run build
npm start
```

3. Verify readiness: `GET /api/health` → `schema.mode === "postgres"` and `schema.ready === true`.
4. Verify auth smoke: `POST /api/auth/login` → 200 (+ Set-Cookie), `GET /api/auth/me` → authenticated:true.
5. Verify content: `GET /api/news` → 200.

## DB compatibility

- Phase 5 schema changes are **additive** (`CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, new nullable columns). Reverting the application image does NOT require dropping the new schema, because the previous image only reads its own columns.
- Do NOT run `git reset --hard` against the live repo as a deploy strategy.

## Forward-fix fallback

If a forward fix is faster than a rollback:
1. Fix in `lib/` + `app/`.
2. `npm run build && npm start`.
3. Re-gate on `/api/health`.

## Rollback base

`06a4a2f` (Phase 4 deterministic DB_PROVIDER selection). Phase 5 P0 commit `da8b2ec` and P1 commit restore the documented production PG auth+content runtime.
