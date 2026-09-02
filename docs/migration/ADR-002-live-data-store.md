# ADR-002 — The live product does not use the database

**Status:** Discovered and recorded 2026-09-02. Amends
[ADR-001](./ADR-001-migration-target.md) and
[DOMAIN_RULES_IN_DATABASE.md](./DOMAIN_RULES_IN_DATABASE.md).

## What was found

Discovery treated `AkarDB.sqlite` — 55 tables, 29 indexes, 5 business-rule
triggers — as the application's data store. It is not the one users' data is in.

`WebViewBridgeService`, the object the SPA talks to, is a key/value document
store over the filesystem:

```csharp
public void Write(string key, string value)   // → {DataRoot}/{key}.json
public string Read(string key)
private string KeyToPath(string key) => Path.Combine(_dataRoot, Regex.Replace(key, "[^\\w\\-]", "_") + ".json");
```

`ResolveDataRoot()` opens `AkarDbContext` **only** to read `Settings.StoragePath1`
/ `StoragePath2`, falling back to
`%LOCALAPPDATA%\AkarApp\AkarData`. Those are the only two uses of the database
in the entire bridge.

Confirmed against a real installation on this machine:

```
%LOCALAPPDATA%\AkarApp\AkarData    44 files, 4.2 MB
  akar_v2_agency_settings.json     2.78 MB
  akar_v2_clients.json             1.24 MB
  akar_office_profile.json          194 KB
  akar_properties.json, akar_published_properties.json,
  akar_v2_b2b_listings.json, akar_v2_b2c_leads.json, ...
```

Files dated within the last two days — live, in-use data.

## What that means

**The office product's real data has no schema, no foreign keys, no
constraints, no transactions and no triggers.** Each collection is one JSON
document rewritten in full on every save.

The three business rules in
[DOMAIN_RULES_IN_DATABASE.md](./DOMAIN_RULES_IN_DATABASE.md) — ownership shares
capped at 100%, at most two active lead claims, an immutable client timeline —
guard SQLite tables that hold nothing. **None of them is currently in force on
any live data.** They remain the authoritative statement of what the rules are;
they are simply not enforced today.

It also explains something discovery could not: `service_`-style transactional
tables in `AkarDB.sqlite` are empty on every copy, and always will be.

## The defect this exposed, and the fix

`Write` used `File.WriteAllText` inside `try { } catch { }`.

1. `WriteAllText` **truncates then writes**. An interruption between those steps
   — crash, power loss, full disk — leaves a truncated or half-written file. On
   whole-collection documents that means *every client record*, gone, with no
   copy.
2. `catch { }` made a failed save **indistinguishable from a successful one**.
   The user was told their work was saved when the disk was full or a backup
   agent held the file open.

Fixed on `develop/office-winforms` (commit `d9d0fdc`):

- Write to a temp file in the same directory → `Flush(flushToDisk: true)` →
  `File.Replace` with a `.bak`, so an interruption leaves either the old file or
  the new one.
- `Write` now throws. The caller reports it natively and logs it, because the
  SPA sends `save` as a one-way `postMessage` with no reply channel and is a
  built bundle that cannot be taught to listen for one.

This was not deferred to the migration: it is live data loss on the shipped
product, and the mandate's own priority order puts correctness and data
integrity above everything else.

## Consequences for the migration

- **The data story is the opposite of what ADR-001 assumed.** It is not "port
  EF/SQLite to the new app" — it is **migrate JSON documents into a real
  database**. That is the single most valuable outcome available here.
- **A migration path is required, not optional.** Every installation holds its
  data in these files. Any new application must import them, and the import must
  be reversible and verified, because there is no other copy.
- The EF model and its triggers become the **target** schema rather than the
  source of live data — which is convenient, since they already encode the
  intended rules.
- Feature parity must still be measured against the SPA (ADR-001), and now data
  parity must be measured against the JSON documents.
- **Estimate impact:** ADR-001 called this a presentation rewrite plus a domain
  port. It is also a data migration with no fallback copy. That third part
  should not be discovered late.

## Open

- Whether the SPA writes concurrently from more than one place (a partial write
  racing a read would corrupt differently).
- Whether any installation has a `StoragePath1` pointing at a network share,
  where `File.Replace` semantics differ.
- Whether `.bak` files should be retained beyond one generation.
