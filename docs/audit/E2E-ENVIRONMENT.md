# The end-to-end test environment

Created 2026-09-04 so the lifecycle could be run for real without writing a row
into the production database.

---

## What exists

| | |
|---|---|
| Database | `akarpromax_e2e` on the same Postgres 14 instance |
| Contents | The production **schema** (114 tables), **zero production rows** |
| Owner | `akarpromax`, so the app connects with credentials it already has |
| App instance | pm2 process `akar-e2e`, `server.js` from a copy of the build |
| Address | **`127.0.0.1:3020` only** — not exposed externally, verified with `ss -tln` |
| Its `.env` | `/var/www/akar-e2e/standalone/.env`, `chmod 600`, identical to production **except** `DATABASE_URL` and the port |

Production is untouched: `akarpromax` on port 3010.

## Running the lifecycle

It must run **on the server**. An earlier version opened an SSH connection per
SQL statement from a laptop; sshd began refusing them partway through a long
run, and the refusal arrived as an unrelated `fetch failed` when the port
forward died with it — and got that machine temporarily blocked.

```bash
cd /var/www/akarpromax-v2
PASS=$(grep -m1 '^DATABASE_URL=' .env | cut -d= -f2- | tr -d '"' \
       | sed -E 's|.*://[^:]+:([^@]*)@.*|\1|')

cd /tmp
E2E_DATABASE_URL="postgresql://akarpromax:$PASS@127.0.0.1:5432/akarpromax_e2e" \
E2E_HOST=http://127.0.0.1:3020 \
node e2e-lifecycle.mjs
```

The script is `scripts/e2e-lifecycle.mjs` in the repository; copy it to `/tmp`
first. It expects a Node on the server (v20 is installed).

## Two guards inside it

The script **truncates tables**, so it refuses to run anywhere it should not:

* `sql()` throws unless `E2E_DATABASE_URL` ends in `/akarpromax_e2e`.
* Step 0 asserts `current_database()` is `akarpromax_e2e` and that the host is
  port 3020, before anything else runs.

The isolation check proves **identity**, not emptiness. An earlier version
counted rows, which failed whenever a previous run had left its own behind — for
a reason that had nothing to do with isolation. That is how a safety check gets
relaxed until it means nothing.

## Refreshing the schema after a migration

The copy is a point-in-time dump. After changing the production schema:

```bash
cd /var/www/akarpromax-v2
PROD=$(grep -m1 '^DATABASE_URL=' .env | cut -d= -f2- | tr -d '"')
pg_dump --schema-only --no-owner --no-privileges "$PROD" > /tmp/schema.sql

sudo -u postgres dropdb akarpromax_e2e
sudo -u postgres createdb -O akarpromax akarpromax_e2e
psql "$E2E_DATABASE_URL" -q -f /tmp/schema.sql
```

`--schema-only` is the whole point: no production row is ever copied.

## Refreshing the app instance after a deploy

The instance runs its own copy of the build and does **not** update when
production does.

```bash
rm -rf /var/www/akar-e2e/standalone
cp -r /var/www/akarpromax-v2/.next/standalone /var/www/akar-e2e/standalone
# Rewrite DATABASE_URL to akarpromax_e2e before restarting -- see above.
pm2 restart akar-e2e --update-env
```

**Copying production's `.env` without rewriting `DATABASE_URL` would point the
test instance at the production database.** That is the one dangerous step here.

## Removing it

```bash
pm2 delete akar-e2e
rm -rf /var/www/akar-e2e
sudo -u postgres dropdb akarpromax_e2e
```

Kept rather than removed because the environment is what made phase 11 possible,
and the alternative — testing against production — is the thing it exists to
avoid.
