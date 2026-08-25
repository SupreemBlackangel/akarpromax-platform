# AKARPROMAX — REFERENCE SOURCES

**Phase 0.5 — Complete Feature Preservation, Old-vs-Current Parity & Web↔Office Audit**
Generated: 19 August 2026 · **Read-only audit — no source file, schema, route, test or configuration was modified.**

Repository root on the developer machine: `E:\Akarpromax new 2027\V 2.0 GPT - Copy`

---

## 0. How this audit reached the source

The developer machine's Linux sandbox (`device_bash`) is unavailable in this environment — exactly as
recorded in Phase 0 (`docs/release/PHASE-0-BASELINE.md` §0). Every file was therefore transferred
file-by-file into an isolated Linux workspace via the file-staging bridge and analysed there.

| Step | Result |
|---|---|
| Directory inventory of the whole repository | `device_list_dir` recursive over every top-level folder |
| Current working tree transferred | **1,263 files** — `app/` 376, `docs/` 289, `lib/` 191, `src/` 174, `tests/` 71, `scripts/` 49 (root only), `components/` 16, `drizzle-pg/` 14, `drizzle-mysql/` 7, `drizzle/` 7, `db/` 5, `hooks/` 4, `types/` 3, plus all root-level configuration |
| Git history recovered | `akarpromax-pre-refactor.bundle` cloned → **51 commits**, 4 branches, 1 tag, 2026-07-28 → 2026-08-05 |
| Six archived source snapshots extracted | 253 – 599 files each (see §2) |
| Desktop application | Published .NET build inspected: `AkarApp.dll` string extraction, `AkarDB.sqlite` schema dump (55 tables), shipped React `webui/` bundles, `Localization/strings.{ar,en}.json` |

### Transfers that did not complete

| Item | Size | Reason | Effect |
|---|---|---|---|
| `.git/objects/pack/pack-55f2733…pack` | 21.4 MB | wall-clock timeout on three attempts | The **current** repository's own history could not be reconstructed. History evidence in this audit comes from `akarpromax-pre-refactor.bundle` (51 commits) and from the six snapshot trees, not from `refactor/architecture-foundation`. Recorded in §6 as an OLD SOURCE REQUIRED gap. |
| `scripts/backup/**` | 325 files | deliberately excluded to stay inside transfer quota | `scripts/backup/` is excluded by `tsconfig.json` and `eslint.config.mjs` and is not compiled, linted or bundled. It is classified below as BACKUP and remains available on the developer machine for any follow-up. |
| `node_modules/`, `.next/`, `public/` binaries, `.wrangler/`, `.vs/` | — | not source | none |

---

## 1. Classification legend

| Class | Meaning |
|---|---|
| **CURRENT** | The working tree that ships today. The single source of truth for "what exists now". |
| **PREVIOUS PRODUCTION** | A tagged state that was treated as releasable before the architecture refactor. |
| **OLD IMPLEMENTATION** | An earlier generation of the product, superseded by the refactor. |
| **REFERENCE ONLY** | Inspectable but not buildable from this repository (binaries, published output). |
| **BACKUP** | A point-in-time copy taken by a tool or script during the refactor. |
| **HISTORICAL DOCUMENTATION** | Describes intent or a past state; never evidence of current behaviour. |
| **GIT HISTORY** | Recoverable commit history. |
| **UNKNOWN** | Present, purpose not established. |

---

## 2. Reference sources — exact paths

### 2.1 CURRENT

| Path (device) | Class | Contents | Notes |
|---|---|---|---|
| `E:\Akarpromax new 2027\V 2.0 GPT - Copy\app` | CURRENT | 376 files — App Router pages, layouts and 200+ API route handlers | Source of truth for current UI + API |
| `…\lib` | CURRENT | 191 files — domain services, schemas, runtime adapters | |
| `…\src` | CURRENT | 174 files — components, config registries, constants, contexts, data, styles, tools | |
| `…\components` | CURRENT | 16 files — properties, company/office/professional cards, advertising placements, onboarding, alerts | Parallel to `src/components`; both are live |
| `…\hooks` | CURRENT | 4 files | |
| `…\tests` | CURRENT | 71 files (79 test files total incl. `scripts/*e2e*`) | Only 19 are executed by `npm test` |
| `…\db`, `…\db\mysql` | CURRENT (partly dead) | 5 files | `db/index.ts` statically imports `cloudflare:workers`; nothing imports `@/db` |
| `…\drizzle-pg` | CURRENT | 14 migrations present (`0000`–`0003`, `0011`–`0016`) + `meta/` | **`0004`–`0010` are missing from the working tree** while still listed in `meta/_journal.json` — see §6 |
| `…\drizzle` | CURRENT (orphaned) | 3 SQLite migrations + meta | No config or runner references it |
| `…\drizzle-mysql` | CURRENT (secondary) | 7 files | MySQL path, local development only |
| `…\types`, `…\worker`, `…\build` | CURRENT | ambient types; `worker/index.ts.vinext-backup` only | `worker/index.ts` is deleted from the tree |
| Root config | CURRENT | `package.json`, `next.config.js`, `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs`, `drizzle.config.ts`, `drizzle.mysql.config.ts`, `architecture-exceptions.json`, `.env.example`, `AGENTS.md` | |

### 2.2 PREVIOUS PRODUCTION / OLD IMPLEMENTATION / GIT HISTORY

| Path (device) | Class | Contents |
|---|---|---|
| `…\akarpromax-pre-refactor.bundle` | **GIT HISTORY** | Full git bundle. Cloned successfully. **51 commits, 2026-07-28 → 2026-08-05.** Branches: `main` (`ee54559`, 2026-07-29), `fix/admin-sponsor-management` (`2ffe528`), `feature/services-marketplace-and-translations` (`9ca0079`), `refactor/architecture-foundation` (`830fc77`). Tag: `pre-architecture-refactor` → `9ca0079`. |
| ↳ branch `main` @ `ee54559` (2026-07-29) | **OLD IMPLEMENTATION** | 55 files. The earliest recoverable generation: sponsor system, ads/hero playlists, i18n admin, MySQL + D1 schema, 8 engineering tools. |
| ↳ tag `pre-architecture-refactor` @ `9ca0079` (2026-08-05) | **PREVIOUS PRODUCTION** | 247 files. The last state before the architecture refactor. Contains the complete sponsor commercial back-office (`app/api/sponsor-*`: plans, subscriptions, invoices, payments, contracts, documents, access, branches, users, profiles, assets, activity, events), the full `app/admin/sponsors/**` console, the first-generation services marketplace (`app/api/services/{categories,listings,requests,orders,reviews,disputes,messages}`), the first-generation messaging, and the original `LandMapper` parsing stack. |
| `…\.git` (packs, refs, index) | GIT HISTORY (**partial**) | `HEAD`, `packed-refs`, `config`, `ORIG_HEAD`, `COMMIT_EDITMSG`, index (984 tracked paths), and the 4.3 MB pack were transferred; the 21.4 MB pack timed out. Current-branch history is therefore **not** reconstructable in this workspace. |

### 2.3 BACKUP — archived source snapshots

All six were extracted and diffed against the current tree.

| Path (device) | Class | Date | Files | What it is |
|---|---|---|---|---|
| `…\.akarpromax\New folder\akarpromax-source.zip` | BACKUP | 2026-08-08 | 599 | Broadest snapshot. Sole surviving copy of `drizzle-pg/0004_add_new_tables.sql` (the only DDL for `forum_*`, `knowledge_items`, `news_ticker_items`), `0005`–`0010`, `app/admin/organizations`, `app/admin/professionals`. |
| `…\akarpromax-auth-current.zip` | BACKUP | 2026-08-11 | 357 | Identity/auth state during the auth hardening pass |
| `…\akarpromax-properties-current.zip` | BACKUP | 2026-08-11 | 125 | Properties state; also holds `drizzle-pg/0007_add_properties_tables.sql` and `0009_add_geo_currency.sql` |
| `…\akarpromax-services-current.zip` | BACKUP | 2026-08-12 | 179 | Services marketplace state |
| `…\akarpromax-auctions-current.zip` | BACKUP | 2026-08-12 | 175 | Auctions state before the F1/F2/F3 hardening passes |
| `…\AkarProMax_ChatGPT_Source_Review.zip` | BACKUP | 2026-08-13 | 258 | Most recent snapshot. Holds the **richer FindMyLand UI** (DXF/KML/KMZ/CSV/TXT input, manual coordinate paste, add-point-on-map, KML export, perimeter) that the current `/tools/find-my-land` redirect no longer exposes. |
| `…\_auctions_current_snapshot\` | BACKUP | 2026-08-13 | ~180 | Unpacked auctions snapshot + `AUCTIONS_CURRENT_MANIFEST.txt` |
| `…\_ai-backup\public-hardening_20260816_002518\` | BACKUP | 2026-08-16 | 12 | Pre-image of the public-shell/ads hardening script, with `manifest.json` |
| `…\.cleanup-backup\` | BACKUP | 2026-08-10…14 | ~40 | Pre-image of the auth and auction API cleanup: `api-auth-backup/**` (13 routes), `api-auction-backup/**` (6 routes), `schemas-backup/**` (15 schema files) |
| `…\.auth-f1-backup`, `.properties-f2-backup`, `.properties-lifecycle-backup`, `.property-lifecycle-backup`, `.services-f3-backup`, `.services-provider-review-backup`, `.local-backup`, `.visual-backup`, `.visual-checkpoint`, `.temp-fix` | BACKUP | Aug 2026 | small | Per-pass pre-images written by the `apply_*.py` / `run_*.ps1` drivers in the repository root |
| `…\scripts\backup\` | BACKUP | Aug 2026 | 325 | Full `app/` + `lib/` pre-image taken by the refactor scripts. **Not transferred** (quota); excluded from `tsconfig.json` and `eslint.config.mjs`. |

### 2.4 REFERENCE ONLY — AkarProMax Office (desktop)

| Path (device) | Class | What it is |
|---|---|---|
| `…\AkarApp_LIVE\` | **REFERENCE ONLY** | **A published .NET 8 build, not source.** There is no `.sln`, no `.csproj`, and no `.cs` file except `Localization/LocalizationManager.cs` and `Localization/LocExtension.cs`. |
| ↳ `AkarApp.dll` (1.48 MB) | REFERENCE ONLY | Assembly `AkarApp, Version=1.0.0.0`, product string **"AKARPROMAX v2.0"**. 9,890 strings extracted to `inv/dll_strings.txt`. Reveals `SubscriptionService`, `OfflineLicenseService`, `CloudBackupSyncService`, `DesktopAdService`, `RadarService`, `AkarV2PortalWindow`, `DeactivateDeviceCommand`, and the endpoints `https://akar-promax.com/api/program/sync`, `https://akar-promax.com/api/program/subscription-status`, `/api/desktop`, `/ads/placement/desktop_portal_bottom_banner`. |
| ↳ `AkarDB.sqlite` (532 KB) | REFERENCE ONLY | **55-table local schema** — the authoritative record of desktop capability: Clients + phones/addresses/requests/offers/timeline/ledger/group-members, Properties + bounds/GIS polygons/attachments/amenities/brokers/installments/legal-status, Units, Ownerships, Contracts, SaleContracts, ContractTemplates/Clauses/Members, LegalClauses, ESignatures, PowersOfAttorney, Rent/Sale installments, PostDatedChecks, Treasury, AgencyLedger, ClientLedger, StaffCommissions, TaxFeeTypes, MaintenanceTickets, HandoverSchedules, TechnicianDirectory, CoBrokingRequests, LeadClaims, PublicLeads, RadarMatches, AdCampaigns, AdImpressions, CloudSyncQueue, DashboardAlerts, Branches, Users, UserRolePermissions, OfficeAuthContracts, CountryConfigs, LookupCategories, LookupItems, Coordinates, Settings. |
| ↳ `webui/assets/*.js`, `webui/index.html`, `dist/` | REFERENCE ONLY | The React UI shipped inside the WebView2 host: Dashboard, ClientsPage, PropertiesPage, PropertyRequestsPage, ContractsPage, ContractPrintPreview, InvoicesPage, LedgerPage, ReportsPage, RadarPage, SettingsPage, ScanButton, WaButton, ledgerStore, **wpfBridge** (host actions `get_path`, `browse_folder`, `backup_create`, `backup_restore`, `get_hwid`, `get_subscription_status`, `scan_document`). |
| ↳ `Localization/strings.ar.json`, `strings.en.json` | REFERENCE ONLY | Desktop UI string catalogue — used in this audit to enumerate desktop screens. |
| ↳ `AkarApp.exe.WebView2/`, `runtimes/`, satellite `*.resources.dll` | REFERENCE ONLY | Runtime and browser cache; no product signal. |
| **AkarApp_LIVE C# source** | **MISSING — OLD SOURCE REQUIRED** | See §6.1. |

### 2.5 HISTORICAL DOCUMENTATION

| Path | Class | Note |
|---|---|---|
| `…\docs\**` (289 files) | HISTORICAL DOCUMENTATION | Read as *intent and past state only*. Phase 0 verified that ~30 of these documents describe a Cloudflare-Workers/`vinext` runtime that no longer exists, and that six carry PASS/READY certifications for that dead runtime. |
| ↳ `docs/release/PHASE-0-BASELINE.md` | **AUTHORITATIVE** | The one exception: it is a runtime-verified baseline dated 19 Aug 2026 and is used as evidence throughout this audit. |
| `…\AGENTS.md`, `README.md`, `INTEGRATION_EXECUTION_PLAN.md`, `RECOVERY_EXECUTION_PLAN.md`, `SERVICES_EXECUTION_PLAN.md` | HISTORICAL DOCUMENTATION | Contain product requirements (e.g. the 12-currency requirement at `AGENTS.md:205`) that are useful as *intent*, alongside runtime claims that Phase 0 disproved. |
| `…\docs\v1-analysis\` | HISTORICAL DOCUMENTATION | A 982-byte feature list and a 518-byte homepage HTML snapshot — the only "V1" artefacts in the repository. Insufficient for parity; see §6.4. |

### 2.6 UNKNOWN / not product source

| Path | Class | Note |
|---|---|---|
| `…\.openai\hosting.json`, `.vs\`, `.vscode\`, `.wrangler\`, `.next\`, `.vinext\` | UNKNOWN / tooling | `.vinext/` holds only dev-server lock + downloaded fonts |
| `…\examples\d1\` | HISTORICAL DOCUMENTATION | Cloudflare D1 starter sample; 2 files |
| `…\artifacts\`, `tmp\`, `build\` | UNKNOWN | Build/scratch output |
| ~150 loose root files: `*.log`, `$out`, `$err`, `*.bak`, `apply_*.py`, `run_*.ps1`, `diagnose_*.ps1`, `adlmdll.dll`, `lacadp.dll`, `ara.traineddata`, `eng.traineddata`, `test-utm.js` | BACKUP / UNKNOWN | The `apply_*`/`run_*` drivers are the scripts that produced the `.` backup folders in §2.3 and are useful as a change log; the `.traineddata` files are Tesseract OCR models used by the land tooling |

---

## 3. Which tree answers which question

| Question | Authoritative source |
|---|---|
| What exists today? | `cur/` (§2.1) — **only** current source, current tests, and executed behaviour |
| What existed before the refactor? | tag `pre-architecture-refactor` (§2.2) |
| What existed in the earliest generation? | branch `main` @ `ee54559` (§2.2) |
| What existed mid-refactor, per domain? | the six snapshots (§2.3) |
| What can the desktop product do? | `AkarDB.sqlite` + `AkarApp.dll` strings + `webui/` bundles (§2.4) |
| What was *intended*? | `docs/**`, `AGENTS.md` (§2.5) — intent only, never behaviour |
| What is verified broken today? | `docs/release/PHASE-0-BASELINE.md` |

---

## 4. Evidence labelling used throughout this audit

`SOURCE VERIFIED` · `RUNTIME VERIFIED` · `TEST VERIFIED` · `HISTORICAL ONLY` · `INTENDED ONLY` ·
`STUB` · `UNKNOWN`

A capability is never recorded as present on the strength of documentation alone.

---

## 5. Reference-source classification summary

| Class | Count of distinct sources |
|---|---|
| CURRENT | 1 working tree (13 source folders + root config) |
| PREVIOUS PRODUCTION | 1 (tag `pre-architecture-refactor`) |
| OLD IMPLEMENTATION | 1 (branch `main` @ `ee54559`) |
| GIT HISTORY | 1 bundle (51 commits, 4 branches, 1 tag) + 1 partial `.git` |
| BACKUP | 16 (6 zips + 10 backup folders) |
| REFERENCE ONLY | 1 desktop build (4 evidence artefacts) |
| HISTORICAL DOCUMENTATION | 289 documents + 5 root plans |
| UNKNOWN | ~10 tooling/scratch locations |

---

## 6. OLD SOURCE REQUIRED — what must be attached to complete historical parity

These gaps are **not** resolved by this audit. Features that depend on them are marked
`OLD SOURCE REQUIRED` in the registry and the parity matrix, never `FULL`.

### 6.1 AkarProMax Office (AkarApp_LIVE) C# source — **highest priority**

`AkarApp_LIVE` in this repository is a published build. To complete the Web↔Office contract matrix
and the desktop parity rows, attach the desktop solution folder containing:

- the `.sln` and every `.csproj`
- `Services/` — at minimum `SubscriptionService`, `OfflineLicenseService`, `CloudBackupSyncService`,
  `DesktopAdService`, `RadarService`, and whatever performs the `/api/program/sync` upload
- `Views/` — including `AkarV2PortalWindow` (the WebView2 portal and its `GetWebsiteAuthToken` /
  `signature` + `userToken` handoff)
- the HTTP client layer, request/response DTOs and API models
- `appsettings*.json` / configuration, and the licence-file format behind `AKAR_OFFLINE_LICENSE_2026`
- the desktop's own migration history for `AkarDB.sqlite`
- the source of the `webui/` React app (currently only minified bundles are present)

Without it, 15 desktop→web calls are documented from binary evidence only, and 2 remain `UNKNOWN`.

### 6.2 The server that serves `akar-promax.com/api/program/*`

The shipped desktop calls `https://akar-promax.com/api/program/sync`,
`https://akar-promax.com/api/program/subscription-status` and `/api/desktop`. **None of these
routes exists in this web platform.** Either that server's source is a separate deployment that must
be attached, or the endpoints are unimplemented — the audit cannot tell which. This is the single
largest unknown in the Web↔Office relationship.

### 6.3 The current branch's own git history

The 21.4 MB pack did not transfer, so `refactor/architecture-foundation` history (everything after
2026-08-05) could not be walked. Re-run the transfer on a machine with a faster bridge, or attach a
fresh `git bundle create akarpromax-current.bundle --all`. This would let the audit distinguish
"never built" from "built then removed" for capabilities dated after 2026-08-05.

### 6.4 Any AkarProMax version older than 2026-07-28

The bundle's earliest commit is `f4e0934` "feat: establish AkarPromax platform foundation"
(2026-07-28). `docs/v1-analysis/` implies an earlier V1 web product existed, but contains only a
982-byte feature list and a 518-byte HTML snapshot. If a genuine V1/V2 codebase exists outside this
repository, attach it — otherwise all V1 parity claims remain `OLD SOURCE REQUIRED`.

### 6.5 Missing migrations `drizzle-pg/0004`–`0010`

`meta/_journal.json` and `scripts/apply-geo-currency-schema.ts:8` reference migrations `0004`–`0010`
that are **absent from the current `drizzle-pg/`**. They survive only in
`ref/akarpromax-source` (`0004`, `0005`, `0006`, `0008`, `0010`) and
`ref/akarpromax-properties-current` (`0007`, `0009`). `0004_add_new_tables.sql` is the only DDL
anywhere for `forum_*`, `knowledge_items` and `news_ticker_items` — without it Community, Knowledge
and the second news ticker have no tables on a fresh database. Restore them into the repository from
the snapshots, or regenerate and re-baseline.

### 6.6 `scripts/backup/**` (325 files)

Not transferred in this pass. It is a full `app/` + `lib/` pre-image and may contain intermediate
capability that neither the snapshots nor the bundle preserve. Attach it if any section-A restore
item cannot be sourced elsewhere.

### 6.7 `public/sw.js`

`src/components/public/PwaManager.tsx:19` registers a service worker that is not present in the
repository. Its absence blocks any web-push notification parity claim.

---

## 7. Integrity statement

- No file under the repository was created, modified, renamed or deleted by this audit.
- All analysis was performed on copies inside an isolated workspace.
- The only files this phase produces are the eleven documents under `docs/product-audit/`.


---

# PART II — ROUND 2 SOURCES (19 August 2026)

Round 1 closed with two `OLD SOURCE REQUIRED` gaps at the top of §6: the AkarProMax Office C# source, and any
AkarProMax version older than 2026-07-28. **Both are now closed.** This part records the new sources, their
classification, and an independent assessment of the OpenCode V1 archaeology.

## 8. New reference sources

### 8.1 V1 — the original AkarProMax web product

| Path (device) | Class | Contents |
|---|---|---|
| `E:\Akarpromax new 2027\V1.0` | **OLD IMPLEMENTATION (V1, authoritative)** | A full-stack product, not a prototype. Vite + React SPA front end, Express + Prisma + Socket.IO back end. Root carries `package.json`, `vite.config.ts` (32 KB), `tsconfig.json`, `index.html`, `.env`, `DEPLOY_RUN.md`, `DEPLOY_STEPS.md`, and its own `.git`. |
| `…\V1.0\src` | OLD IMPLEMENTATION | **344 files.** `pages/` **123** (116 top-level + 8 `marketer/`, of which 3 are 0-byte stubs and 1 is a `.bak`), `components/` **159** = 42 root + `arch/` **40** + `ui/` 55 + `auctions/` 9 + `chat/` 7 + `layout/` 6, `contexts/` 10 (9 real + 1 `.bak`), `hooks/` 13, `services/` 8, `lib/` 15, `locales/` 2 (ar 49 KB / en 41 KB), `mocks/` 3 (MSW, `handlers.ts` 55 KB), `data/` 1, `config/` 1, `types/` 2, `api/` 2 (both 0-byte). Excluded from transfer: `src/generated/prisma` (generated client). |
| `…\V1.0\server` | OLD IMPLEMENTATION | **48 files.** `api/src/routes/` **27** (+1 `.bak`) including **`desktop.ts`** — the server side of the desktop contract; `api/src/services/` **4** (`auction-contract`, `auction-intelligence`, `auction-socket`, `notification-sender`); `api/src/middleware/auth.ts`; `api/src/index.ts` (route mounting, in-process schedulers); `api/prisma/schema.prisma` (49.6 KB, **63 models**) + 1 migration; `chat-server.ts` (40 KB, Socket.IO) and `chat-server.cjs`; `encryption.ts`; `seed-chat.ts`; `utils/installment-calculator.ts`. Excluded: `api/src/generated/**` (~54 MB) and `api/prisma/dev.db`. |
| `…\V1.0\public` | OLD IMPLEMENTATION | 23 files (manifest inspected, images not transferred). Notable: **`sw.js`** — the service worker whose absence blocked V2's web-push parity claim in §6.7 — plus `manifest.json`, `offline.html`, `robots.txt`, `sitemap.xml`, `.htaccess`, `mockServiceWorker.js`, `pdf.worker.min.mjs`, `data/citiesData.json`. |
| `…\V1.0\V1.0.rar` | BACKUP | 19.9 MB archive of the same tree. Not extracted. |
| `…\V1.0\.git` | GIT HISTORY (**not transferred**) | V1 has its own repository. Not walked in this round — see §10.1. |

**Sibling folders observed but not connected:** `E:\Akarpromax new 2027\` also contains `V 2.0 GPT`,
`V 2.0 GPT -Copy`, `V 3.0 GPT 2027`, `V4.0 GPT 2027`, `deploy-staging`, `docs`. None were inspected. See §10.2.

### 8.2 AkarProMax Office — the desktop C# source

| Path (device) | Class | Contents |
|---|---|---|
| `F:\akarpromax-office\AkarApp_Next\AkarApp` | **CURRENT (desktop, authoritative)** | .NET 8 WPF. **182 `.cs`** — `Models/` 48, `Services/` 36, `ViewModels/` 48, `Views/` 37, `Migrations/` 3, `Security/` 1, `Converters/` 4, `Localization/` 2 — plus `AkarApp.csproj`, `app.config`, `AssemblyInfo.cs`, `App.cs` (63 KB), `MainWindow.cs`, `baml_entries.txt`, `Localization/strings.{ar,en}.json`. Most recent build artefacts dated 17 Aug 2026. |
| `F:\akarpromax-office\AkarApp_Next\AkarWebUI` | CURRENT (desktop web UI source) | React/TypeScript **source** (not build output): `package.json`, `vite.config.ts`, `vitest.config.ts`, `tailwind.config.ts`, and `src/` with ~40 feature directories including `ai`, `bim`, `canvas`, `structural`, `parcel-splitting`, `sresis-integration`, `__tests__`. **Not inspected in this round** — see §10.3. |
| `F:\akarpromax-office\AkarApp_Dev\AkarApp` | OLD IMPLEMENTATION (desktop) | 171 `.cs`, an earlier state of the same project. Used for diffing; `Services/OfficeApiClient.cs` and its three companions exist **only** in `_Next`. |
| `F:\akarpromax-office\AkarApp_Clean` | BACKUP | Published build + `AkarApp/`, `src/`, `decompiled/`, `decompiled_ilspy/`. |
| `F:\akarpromax-office\AkarApp_LIVE` | REFERENCE ONLY | The published build already analysed in Round 1 — byte-identical to the copy inside the web repository. |
| `…\AkarApp_Next\decompiled`, `…\AkarApp_Dev\decompiled` | REFERENCE ONLY | ILSpy output. The `Views/*.cs` + `Views/Baml/*.baml` pairing in the source trees indicates those trees were themselves reconstructed from BAML and then made buildable. Treat XAML-derived layout as reconstructed, and C# logic as authoritative. |

### 8.3 OpenCode V1 archaeology

| Path (device) | Class |
|---|---|
| `E:\Akarpromax new 2027\V 2.0 GPT - Copy\docs\v1-product-archaeology` | **HISTORICAL DOCUMENTATION — claims, independently re-verified below.** 38 files (26 `.md`, 12 `.csv`). |

## 9. Independent assessment of OpenCode Pass A

**Verdict: the counts are correct; the completeness claim is not. Pass A is NOT CERTIFIED.**

Counts re-derived from source and **confirmed**: pages 123 · non-UI components 104 · hooks 13 · contexts 9 ·
services 8 · lib 15 · frontend scope 272 · server routes 27. The "117 / 47 / 195 / 205" figures that
circulated earlier are wrong and were not used.

Defects found by independent verification:

| # | Defect | How verified |
|---|---|---|
| 1 | **Six promised documents were never produced** — `02_V1_PAGE_BY_PAGE_ARCHAEOLOGY.md`, `V1_ACQUISITION_FUNNELS.md`, `V1_ARTISAN_OPERATING_MODEL.md`, `V1_SUPPORT_TICKET_SYSTEM.md`, `V1_SEO_MANAGEMENT_SYSTEM.md`, `V1_LOOKUP_TAXONOMY_SYSTEM.md`. Their subject matter was unaudited until Round 2 covered it. | directory listing |
| 2 | `src/pages/ServiceHubPage.tsx` missing from `V1_PAGE_COVERAGE.csv`; the CSV has 122 rows against 123 source pages. The status document's explanation (that the missing row is a `.bak`) is incorrect — 123 already excludes the `.bak`. | set difference, disk vs CSV |
| 3 | `V1_SERVICE_LOGIC_COVERAGE.csv` contains **28** rows; `PASS_A_STATUS.md` and `PASS_A_COVERAGE_VALIDATION.md` both claim 37 and both mark it PASS. | row count |
| 4 | **The status document contradicts its own CSV.** `V1_IMPLEMENTATION_DEPTH_PASS_A.csv` distributes 190 rows as L4 107 / L3 48 / L1 30 / L2 3 / L0 2; both status documents report L4 117 / L1 28 / L3 30 / L2 11 / L0 2. | value counts |
| 5 | Depth classification covers **190 of 272** frontend modules — 82 have no classification. | arithmetic |
| 6 | `components/ui/` (55 shadcn primitives) is entirely outside coverage. A legitimate scope choice, but it was not stated as one. | directory count |
| 7 | Server services: **4** exist on disk; the status document claims 3. `auction-socket.ts` is uncovered. | directory listing |
| 8 | Three 0-byte files (`AdminUsersPage.tsx`, `DashboardPage.tsx`, `ServiceHubPage.tsx`) are counted as pages, and two carry a `STUB` label that is not a valid depth value. | file sizes |
| 9 | "RESOLVED" was in places assigned because an authorization check was found, which is not product meaning. Round 2 re-derived meaning from source for AdminEmperor, Elite Leads, Matchmaking, Membership and Smart Landing — and **corrected three of them**. | see §9.1 |

### 9.1 Corrections to specific Pass A conclusions

| Claim | Round-2 finding |
|---|---|
| AdminEmperor "WIRED (read-only)" | The intent is right, the wiring is not. `GET /api/admin/emperor` **exists nowhere** in `V1.0/server`; the only implementation is a never-registered mock returning `{status,uptime,version}`, which shares no field with the UI. Depth **L1 UI_ONLY**. |
| AdminEliteLeads "WIRED (manual toggle)" | The toggle's endpoint `PATCH /elite-leads/:id/mark` **has no handler**, so it never persists; and `leadScore` has no column, no service and no formula anywhere. Depth **L2 DATA_MODEL_ONLY**. Not AI. |
| AdminMatchmaking "WIRED (request↔project)" | **There is no algorithm and no developer-project model.** No `/api/matchmaking/*` route exists; the only executable definition is a dead mock returning the literals `matched: 3` / `matched: 10`. Depth **L1 UI_ONLY**. |
| AdminMembership "CRITICAL no auth" | **Not reproducible.** The route is guarded at `App.tsx:283` and the API at `admin.ts:9`. The related claim "Desktop HWID reset has NO auth" is also not reproducible (`admin.ts:9,390`). |
| "18 of 32 admin pages have no auth check" | Not reproducible as stated. The verified numbers: **1 of 34** admin routes has no client-side guard; **4** admin surfaces have no route at all; **19 of 37** have no server-side authorization on their write path. |
| "34/40 engineering engines are FUNCTIONAL" | Depth-honest recount: of the 40 `components/arch/` engines, **L4 = 1, L3 = 30, L2 = 2, L1 = 7, L5 = 0**. None persists; the three server contracts they touch are stubs. |
| "61.6% of all features are L4_END_TO_END_WIRED" | Over the 1,229 Round-2 rows the real distribution is **L4 413 (34%) · L3 241 · L1 236 · L0 202 · L2 119 · L5 5**. |

**What Pass A got right and this audit relies on:** the file counts, the security findings on the JWT
fallback secret and the fake payment verification, the identification of `lib/api.ts` as a large mock layer,
and the choice to classify by implementation depth at all.

## 10. Remaining OLD SOURCE REQUIRED gaps (revised)

**Closed by Round 2:** §6.1 (desktop C# source), §6.2 (the server behind `/api/desktop/*` — it is
`V1.0/server/api/src/routes/desktop.ts`), §6.4 (a pre-2026-07-28 AkarProMax — it is V1), §6.7 (`sw.js`).

Still open:

### 10.1 V1's own git history
`E:\Akarpromax new 2027\V1.0\.git` exists and was not walked. It would establish whether V1 capabilities that
are `L0`/`L1` today were once wired and then reduced — which changes their parity decision from "product
intent" to "regression".

### 10.2 The other version folders
`V 2.0 GPT`, `V 2.0 GPT -Copy`, `V 3.0 GPT 2027`, `V4.0 GPT 2027`, `deploy-staging` and a sibling `docs`
folder were observed but not connected. If any contains a generation between V1 and the current V2, the
parity chain has a missing link.

### 10.3 `AkarApp_Next\AkarWebUI` source
The desktop's own React/TypeScript UI source — with `ai`, `bim`, `canvas`, `structural`,
`parcel-splitting` and `sresis-integration` directories — was located but not inspected. It may duplicate or
supersede parts of the V1 engineering platform, and it is a required input to any Engineering archaeology
pass.

### 10.4 The current V2 branch history
Unchanged from §6.3: the 21.4 MB pack still did not transfer, so `refactor/architecture-foundation` history
after 2026-08-05 cannot be walked.

### 10.5 `scripts/backup/**` (325 files)
Unchanged from §6.6.

### 10.6 Missing migrations `drizzle-pg/0004`–`0010`
Unchanged from §6.5.

## 11. Integrity statement (Round 2)

- No file under `E:\Akarpromax new 2027\V1.0`, `F:\akarpromax-office`, or the V2 application source was
  created, modified, renamed or deleted.
- All analysis was performed on copies inside an isolated workspace.
- The only files written are the eleven documents under `docs/product-audit/`.
