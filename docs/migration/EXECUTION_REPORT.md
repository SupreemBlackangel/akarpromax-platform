# Execution report — AkarProMax Office

Covers the desktop engagement to 2026-09-02. Per §61.

---

## Phase and status

| Phase | Status |
|---|---|
| PHASE 0 — Discovery & baseline | **Complete** |
| Gate 0 | **Passed**, after R1 was resolved by the owner confirming the SPA source is lost |
| Isolated development copy (§1) | **Complete** — `develop/office-winforms`, `master` untouched and tagged `baseline-2.0.6` |
| Pre-migration remediation | **Complete** — six defects fixed, all tested |
| Data migration foundation | **Clients complete**, remaining entities not started |
| PHASE 1+ (architecture, UI) | **Not started** — deliberately |

---

## What was found, and what it cost

Discovery produced six defects. None was visible from outside the application,
and none would have been fixed by changing the UI framework.

| # | Defect | Severity | Status |
|---|---|---|---|
| 1 | `Write` truncated the file before writing, and swallowed every failure | **Data loss** | Fixed |
| 2 | No automatic backup existed, ever | **Data loss** | Fixed |
| 3 | A collapsed collection would be committed perfectly by an atomic write | **Data loss** | Fixed |
| 4 | API domain `akar-promax.com` does not resolve | High | Fixed |
| 5 | `subscription-status` not implemented anywhere | High | Fixed |
| 6 | Shared secret compiled into every copy, sent as a URL parameter | High | Fixed |

Two consequences worth stating plainly, because both were invisible:

- **The subscription has never been enforced on any installation.** Both check
  paths failed — the domain does not resolve, and the endpoint did not exist —
  and the client treats any failure as "could not verify, keep the features
  enabled".
- **The office's data had no second copy.** `CreateBackup` exists but runs only
  when a person picks a filename in a save dialog.

---

## Changes

### Desktop — `AkarApp_SOURCE`, branch `develop/office-winforms`

| Commit | |
|---|---|
| `a5be2d4` | Endpoint configuration centralised; dead domain corrected; shared secret removed |
| `d9d0fdc` | Atomic writes; failed saves reported natively instead of swallowed |
| `8f4d7a7` | Daily snapshots, seven retained |
| `5a3dd01` | Snapshot on collection collapse; Ctrl+Shift+B recovery path |
| `db11cc8` | First automated tests in the project's history |
| `a8a68b1` | Backward compatibility with every existing (BOM-carrying) data file |
| `8af4073` | Client mapper: JSON model → SQLite schema, images decoded |
| `a27c7b5` | Client importer: idempotent, atomic, non-destructive |

### Web platform — `V 2.0 GPT - Copy`

`/api/program/subscription-status` implemented and deployed. It reports account
standing and labels itself `model: "account-standing"`, because the platform has
no subscription or billing entity — returning a plan name or expiry would be
fabricating business data the client would then act on.

---

## Results

| Check | Result |
|---|---|
| Desktop build | **0 errors** (137 pre-existing warnings) |
| Desktop tests | **54 / 54 passing** — from zero |
| Web tests | **273 / 273 passing** |
| Web typecheck | Clean |
| Web lint | No errors |
| Live site | `/` 200, `/providers` 200, `subscription-status` 401 without a token |
| `master` | Untouched at `1faef4c` |
| Released to customers | **Nothing** |

The 54 desktop tests include one that runs the importer against this machine's
real installation: it copies the live document to a temporary directory, checks
the counts reconcile, checks every recorded `PhotoPath` points at a file that was
actually written, and checks a second run duplicates nothing.

---

## The finding that shapes what comes next

**99.9% of the stored data is base64 images inlined into the JSON documents.**

| Document | Total | One field | Share |
|---|---|---|---|
| `akar_v2_clients` | 1,242,483 B | `profilePicture` | **99.94%** |
| `akar_v2_agency_settings` | 2,776,030 B | `logoUrl` | **99.98%** |

The clients document holds two records and weighs 1.2 MB. Decoding the embedded
image confirmed a genuine PNG of 931,249 bytes — so a third of that field is
base64 overhead alone.

Because the store rewrites a whole document per save, **editing a client's phone
number rewrites every profile picture in the file.** At two hundred clients that
is on the order of 120 MB per edit. The application degrades against the thing
the business most wants, which is more clients.

The SQLite schema already stores `PhotoPath` rather than bytes. The WPF
application had this right and the SPA regressed it, so the migration is where
it is undone — and the importer does exactly that.

---

## Decisions recorded

| | |
|---|---|
| [ADR-001](./ADR-001-migration-target.md) | Migration target: build against the WPF domain code, measure parity against the SPA |
| [ADR-002](./ADR-002-live-data-store.md) | The live product does not use the database; the data story is inverted |
| [ADR-003](./ADR-003-recommendation.md) | Recommendation against the VB.NET WinForms rewrite as specified |
| [LIVE_DOMAIN_MODEL](./LIVE_DOMAIN_MODEL.md) | The domain recovered from the data, since no source exists |
| [DOMAIN_RULES_IN_DATABASE](./DOMAIN_RULES_IN_DATABASE.md) | Three business rules that live only in SQLite triggers |

---

## Known issues and risks

### Closed

| # | | How |
|---|---|---|
| K2 | A careless manifest publish locks out every installation | `scripts/publish-office-manifest.sh` refuses to publish unless the installer is live, downloads end to end, matches its advertised length and carries an `MZ` header — then requires the version typed back. It backs up the previous manifest and records a `sha256` and `releaseDate`, which the manifest never had. |
| K3 | Unverified `phones` / `addresses` element shapes | Unrecognised shapes are now named in the import report instead of skipped quietly. Blank entries are not reported, so the warning stays rare enough to be believed. The test written for it caught a real crash in the mapper: `TryGetProperty` throws on a non-object, and this store has no types. |
| K4 | `EnableUnsafeBinaryFormatterSerialization` | Disabled, after confirming BinaryFormatter, `IFormatter`, `SoapFormatter` and `[Serializable]` appear nowhere and every clipboard call is `SetText`/`GetText`. Verified in the produced runtimeconfig. |
| K5 | Credential stored beside the executable | Moved to `%LOCALAPPDATA%\AkarApp`. An existing file is moved, not copied, so the old exposure does not survive. DPAPI protection unchanged. |

K5 was worse than first recorded: the program directory is replaced by the
installer and the updater, so a routine update destroyed the saved credential;
it is shared by every Windows account on the machine; and writing there needs
elevation, which is why the save silently failed on properly-installed copies.

### Open

| # | | Why it stays open |
|---|---|---|
| K1 | Installed copies get none of this until a build ships | Needs a release. The package is built and staged; `Setup.exe` needs one `ISCC` run on a machine with Inno Setup. |
| K6 | Properties, ledger, users, requests and contracts have no importer | Real work, not a risk to mitigate. Clients proved the pattern. |
| K7 | All XAML is lost | Cannot be recovered. The 37 views run but cannot be read. |
| K8 | What the SPA computes, validates and displays | Only observable by running it. No amount of code reading substitutes. |

---|---|
| K1 | Installed copies get none of this until a build ships. The domain and secret fixes are in .NET, not the SPA, so no server change reaches them. |
| K2 | `mandatory: true` in the update manifest means publishing a version without a matching installer locks out every installation. |
| K3 | Both live client records have empty `phones` and `addresses`, so their element shape is **unverified**. The mapper accepts objects and bare strings defensively. |
| K4 | `EnableUnsafeBinaryFormatterSerialization` is on. A known RCE vector, removed in .NET 9. Where it is used has not been established. |
| K5 | `remember.json` stores a DPAPI credential beside the executable rather than under `%APPDATA%`, in a directory the updater replaces. |
| K6 | Properties, ledger, users, requests and contracts have no importer yet. |
| K7 | All XAML is lost. The 37 views can be run but not read. |
| K8 | The SPA's screens are documented only by its data; what it computes, validates and displays still needs to be observed by running it. |

---

## Two decisions, now made by the owner

1. **Subscription: keep failing open, and start recording.** Policy unchanged —
   failing closed would lock an office out of its own client records over a
   network outage, which costs more than an unverified subscription. What
   changed is that it stops being silent: every check now logs its outcome
   (active / inactive / unverified / never signed in) with a reason and a
   timestamp, and no token, signature or personal data. A later decision to
   tighten it can then be made against real numbers.
2. **Build the package, do not release it.** Done. `AkarApp_PUBLISH_2.0.7` is
   built and the installer script is bumped to 2.0.7 with its payload staged.
   Inno Setup is not installed on this machine, so the `Setup.exe` is one `ISCC`
   run away rather than done, and a testable ZIP is published to
   `/downloads/AkarProMaxOffice-2.0.7-UNRELEASED.zip`.

   **`version.json` is untouched and still advertises 2.0.6.** Nothing reaches a
   customer. With `mandatory: true`, publishing a version without a matching
   installer at that URL leaves every installed client demanding an update it
   cannot fetch. Installer first, manifest second, always.

### Verified in the compiled assembly, not assumed from the source

| Check | Result |
|---|---|
| `akar-promax.com` (dead domain) | **0 occurrences** |
| `https://akarpromax.com` | present |
| `Akar_ProMax_2026_Secure_Key` | **0 occurrences** |
| `AKARPROMAX_API_BASE` override | present |
| `subscription-checks.log` | present |

---

## Next

1. Importers for the remaining entities, same three properties.
2. Run the full migration against a copy of a real installation and reconcile
   every count before anything is pointed at live data.
3. Establish what the SPA computes and validates, by running it.
4. Then, and only then, the UI work.
