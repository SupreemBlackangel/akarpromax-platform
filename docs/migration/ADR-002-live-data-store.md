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

---

## Addendum, 2026-09-03 — from running the SPA

The SPA was served locally and opened in a browser. Four things that static
reading had not established, and one correction.

### The two layers disagree about the server, and only one of them is wrong

The SPA calls **`https://akarpromax.com`** — the correct domain. The .NET
services called `akar-promax.com`, which does not resolve.

That is why nobody noticed: sign-in, the office screens and the platform sync
all worked, because those are the SPA's calls. Only the .NET layer's
subscription check and desktop ad service were pointed at nothing.

### The update mechanism has never worked either

`bootstrap.js` fetches `PLATFORM + "/office-app/version.json"`, and that path
serves **no `Access-Control-Allow-Origin` header** — verified against
production. The SPA runs on the `https://akarapp.local` virtual host, so the
fetch is cross-origin and fails. Reproduced exactly: opening the SPA on a
different origin produced

```
Access to fetch at 'https://akarpromax.com/office-app/version.json' ...
blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present
```

This cuts both ways and both matter:

- **The mandatory-update gate cannot fire.** The risk recorded as K2 — that a
  careless manifest publish locks every installation out — is smaller than
  feared, because the check never completes.
- **No installation has ever been told about an update.** Shipping a new version
  would reach nobody automatically until the CORS header is added.

Adding one `Access-Control-Allow-Origin` to that location fixes it. It is a
one-line nginx change and it is deliberately **not** made here, because it
activates a dormant mandatory gate across every customer at once. That is an
outward-facing change with no undo and it needs a decision, not an inference.

### A correction

I stated mid-investigation that the bridge "is not in the SPA at all". That was
wrong. It is there, minified as `window.chrome?.webview` with optional
chaining, which a literal search for `chrome.webview` misses. The SPA sends
request/reply actions through it — `get_path`, `get_hwid`,
`get_subscription_status`, `apply_activation_code`, `backup_create`,
`backup_restore`, `browse_folder`, `scan_document` — each carrying a
`requestId`.

### An open question that gates the migration

The `save` and `migrate` actions the .NET host handles carry **no** `requestId`,
and the current SPA bundle does not appear to send them. Its persistence is
`localStorage`: 27 `getItem` and 24 `setItem` calls, and it reports
"local path (localStorage)" when no bridge is present.

So it is **not established** whether the current build still mirrors
localStorage into the `AkarData` JSON files, or whether those files are frozen
at the one-time migration recorded by `__akar_bridge_migrated_v1.json`. Their
timestamps are recent and close to the WebView2 store's, which is consistent
with them being in sync — but consistent is not the same as verified, and an
attempt to read Chromium's LevelDB directly was inconclusive because its keys
are UTF-16 and the probe was not.

**The importer reads the JSON files. If localStorage is the authoritative store
and the files lag it, the migration would import stale data.** Nothing should be
migrated for real until this is settled, and it is settled by watching whether
editing a client in the running application changes
`AkarData/akar_v2_clients.json` — a two-minute check on a machine with the app
installed, which is worth more than any further reading of a minified bundle.
