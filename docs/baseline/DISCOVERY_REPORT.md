# AkarProMax Office — Discovery report

PHASE 0. Measured on 2026-09-02 against the repository, the shipped binary, the
local database and the live server. Nothing here is inferred from a file name;
every claim states how it was checked.

---

## Gate 0 does not pass, and the reason changes the project

**The desktop application's source code is not in this repository.**

| Searched for | Found |
|---|---|
| `*.sln` | **0** |
| `*.vbproj` / `*.csproj` | **0** |
| `*.cs` / `*.vb` / `*.xaml` | **2**, both shipped inside the output folder (`Localization/LocalizationManager.cs`, `LocExtension.cs`) |
| `AkarApp_LIVE/` | 86 MB of **compiled output** — `AkarApp.exe`, `AkarApp.dll`, 50+ dependency DLLs |
| `AkarApp_LIVE/webui`, `dist` | **built** SPA bundles; no `src/` |
| `AkarApp_LIVE` in git | **0 tracked files** — the whole folder is untracked |

The mandate's Rule Zero says the original must stay runnable and untouched. That
is satisfied by default and cannot be otherwise: there is nothing here to touch.
But it also means the instruction *"convert the existing WPF code to VB.NET
WinForms"* has no input. There is no WPF code in this repository to convert —
only the program it compiles to.

This is reported rather than worked around, per the mandate's own rules: §4
forbids assuming anything not in the code, and §57 forbids hiding problems.

### What that leaves

Three options, and this is a decision only you can make:

1. **Provide the source.** If the Visual Studio solution exists on another
   machine or in another repository, point me at it and PHASE 0 completes
   properly — everything below already maps the target.
2. **Rewrite from the specification this report reconstructs.** The 37 screens,
   55 tables, 5 business-rule triggers and the API contract are all recoverable
   from the artefacts, and are documented here. This is a rewrite, not a
   migration, and it will not reproduce behaviour that exists only inside
   compiled methods.
3. **Decompile the assembly** to recover C# source, then port. `AkarApp.dll` is
   1.4 MB of managed .NET 8 and would decompile readably. This is your own
   software, so it is legitimate — but it produces machine-shaped code that
   still needs the architecture work in §7.

I have not started any of the three. Option 2 and 3 are substantial and
irreversible in effort, and picking for you would be guessing.

---

## What the application actually is

| Property | Value | How verified |
|---|---|---|
| Runtime | **.NET 8.0**, `Microsoft.WindowsDesktop.App` | `AkarApp.runtimeconfig.json` |
| UI framework | **WPF** | `PresentationFramework` referenced; `AkarApp.g.resources` holds compiled BAML |
| WinForms | **not used** | `System.Windows.Forms`: 0 occurrences in the assembly |
| DevExpress | **not present** | absent from all 57 entries in `AkarApp.deps.json` |
| Embedded browser | `Microsoft.Web.WebView2.Wpf.WebView2` 1.0.2903.40 | assembly strings |
| Data | EF Core 8.0.4 + SQLite (`AkarDB.sqlite`) | `deps.json`, database opened directly |
| Office documents | `DocumentFormat.OpenXml` | `deps.json` |

> **A correction to an earlier note of mine.** I had previously recorded that the
> WPF shell was dead compiled BAML and that the real UI was the WebView2 React
> SPA. That is wrong, and this report supersedes it. The BAML resources contain
> **37 live WPF views**; the SPA is reached through exactly one of them
> (`AkarV2PortalWindow`). Migrating on the old assumption would have thrown away
> the entire desktop application.

---

## UI inventory — 37 compiled views

Recovered from the BAML resource names inside `AkarApp.dll`.

**Shell:** `App`, `MainWindow`

**Core modules**

| Area | Views |
|---|---|
| Dashboard | `DashboardView`, `DashboardAlertsView` |
| Clients | `ClientsView`, `AddClientView`, `ClientProfileView`, `ClientRequestMatchesWindow` |
| Properties | `PropertiesView`, `AddPropertyView`, `PropertyBrokersWindow` |
| Contracts | `ContractsView`, `ContractTemplatesView`, `SmartContractBuilderView`, `SaleContractView`, `SaleDialog`, `OfficeAuthContractView`, `OfficeAuthorizationWindow` |
| Finance | `TreasuryView`, `VouchersView`, `FinancialReceiptView`, `FinancialReportsView`, `PostDatedChecksView` |
| Operations | `MaintenanceTicketsView` |
| Users | `UsersView`, `UserManagementView` |
| Marketing | `SocialMediaView`, `WhatsAppReminderDialog` |
| Platform link | `AkarV2PortalWindow` (the WebView2 host for the web app) |
| Access | `LoginView`, `ActivationView`, `KeyGeneratorWindow`, `PasswordDialog` |
| System | `SettingsView`, `LanguageSelectionWindow`, `FileNameDialog`, `PrintAcknowledgmentWindow` |

Every one of these needs a feature-parity row per §6. None can be signed off
without the original running to compare against.

---

## Database

Full table listing in [DATABASE_INVENTORY.md](./DATABASE_INVENTORY.md).

- **55 tables**, **29 indexes**, **5 triggers**, 0 views.
- Reference data populated: 106 `LookupItems`, 19 `LookupCategories`,
  8 `CountryConfigs`, 3 `ContractTemplates`, 3 `TaxFeeTypes`, 1 `Branch`,
  3 `Clients`, 3 `Users`. Transactional tables empty — this is a seed copy, not
  an office's production file.
- **Business rules live in triggers**, not only in code: ownership shares must
  total 100% (insert and update), a lead accepts at most two claims, and the
  client timeline is append-only. A rewrite that recreates the schema without
  these silently drops three real rules.

---

## Server integration — two defects, both blocking

The assembly calls:

```
https://akar-promax.com
https://akar-promax.com/api/program/subscription-status
https://akar-promax.com/api/program/sync
```

**1. The domain does not exist.**

```
nslookup akar-promax.com  →  Non-existent domain
curl  → status 000, no route
```

The live platform is `akarpromax.com`, without the hyphen. Every call the
shipped binary makes to the server fails at DNS.

**2. `subscription-status` is not implemented anywhere.**

Against the real domain:

| Endpoint the app calls | Live result |
|---|---|
| `/api/program/sync` | **200** — implemented |
| `/api/program/subscription-status` | **404** — no such route |
| `/api/desktop` | **404** — no such route |

The server implements `/api/program/{login, devices, profile, properties, messages, sync}`.
Subscription status is not among them.

So the desktop app cannot check a subscription and cannot sync — first because
of the domain, and then because one of the two endpoints does not exist.

> **Caveat, stated because it matters.** `AkarApp.dll` in this folder is dated
> 24 Jun 2026, while the installer published at
> `/downloads/AkarProMaxOffice-Setup.exe` is dated 30 Aug 2026 (18.9 MB) and the
> manifest advertises **2.0.6**. The shipped binary may differ from this copy. I
> have not downloaded and inspected it, so treat the two findings above as
> proven for *this* build and unverified for the released one. Confirming it is
> a short job and should be done before any of it is acted on.

---

## Update system as it stands

`https://akarpromax.com/office-app/version.json`:

```json
{ "version": "2.0.6", "setupUrl": "/downloads/AkarProMaxOffice-Setup.exe",
  "mandatory": true, "notes": "..." }
```

The installer exists and is current. Against §32–§37 this manifest is missing
`minimumSupportedVersion`, `channel`, `releaseDate`, `sha256` and structured
release notes; there is no separate updater executable, no rollback, no
per-version `/releases/<version>/` layout and no integrity check.

**Standing hazard:** `mandatory` is `true`. Publishing a version number without
a matching installer at that URL makes every installed client demand an update
it cannot obtain, which locks all of them out. Any change here must publish the
installer first and the manifest second.

---

## Localization

`Localization/strings.ar.json` and `strings.en.json`, **197 keys each, perfectly
aligned** — no key exists in one and not the other. That is a healthy starting
point.

**Turkish does not exist.** The mandate requires ar/en/tr, so `strings.tr.json`
is 197 keys of new translation, not a port.

---

## Security findings

1. **A saved credential ships in the application directory.**
   `AkarApp_LIVE/remember.json` contains `{"u":"admin","p":"AQAAANCMnd8BFdER..."}`.
   The blob is DPAPI-protected, which is the right primitive (§11) — but it sits
   beside the executable rather than under `%APPDATA%`, in a directory an
   installer or updater may replace, and it is a real account's stored secret
   sitting in a working folder. It is **not** tracked by git (verified), which is
   the one piece of good news.
2. **`EnableUnsafeBinaryFormatterSerialization: true`** in
   `AkarApp.runtimeconfig.json`. `BinaryFormatter` is removed in .NET 9 and is a
   known remote-code-execution vector whenever it deserializes anything not
   fully trusted. Where it is used must be established before any port.
3. Local database is unencrypted SQLite. Whether that is acceptable depends on
   what an office stores in it; it needs a decision, not a default.

---

## Risk register

| # | Risk | Severity | Note |
|---|---|---|---|
| R1 | No source code | **Blocker** | Gate 0 cannot pass; needs your decision |
| R2 | Business rules in triggers | High | Invisible to a code-only port |
| R3 | Dead API domain | High | Sync and subscription both fail today |
| R4 | `subscription-status` unimplemented | High | Server-side work, not desktop |
| R5 | Mandatory-update gate | High | A wrong manifest locks out every install |
| R6 | `BinaryFormatter` enabled | Medium | RCE surface; blocks .NET 9 |
| R7 | Turkish absent | Medium | New translation, 197 keys |
| R8 | DevExpress not licensed/present | Medium | New dependency and licence cost |
| R9 | No automated tests exist | Medium | Parity claims rest on manual comparison |
| R10 | Repo binary may be stale vs 2.0.6 | Medium | Verify before acting on R3/R4 |

---

## Recommended order, once Gate 0 clears

The mandate's phase order assumes source in hand. Two things should move,
and per §62 I am recording the mismatch rather than quietly reordering:

- **Fix R3 and R4 first, on the current WPF app.** They are server-side and
  desktop-config work, they are breaking users *today*, and they are independent
  of any migration. Waiting for a rewrite to fix a DNS name would be poor
  judgement.
- **Recover the trigger logic into documented domain rules before PHASE 2.**
  If it stays only in the database, the new Domain layer will not know it exists.

Otherwise the mandate's PHASE 1 → 13 order stands.

---

## Baseline status

| Check | Result |
|---|---|
| Original application runs | **Not attempted** — no source to build; the shipped `AkarApp.exe` was not executed |
| Solution builds | **N/A** — no solution |
| Automated tests | **None exist** |
| Isolated development copy | **Not created** — creating one before the source question is settled would only copy build output |

Per §56 I am not calling any part of this complete. PHASE 0 is **blocked at
Gate 0** pending your answer on where the source lives.
