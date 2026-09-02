# AkarProMax Office — Discovery report

PHASE 0. Measured on 2026-09-02 against the source tree, the shipped binary, the
local database and the live server. Every claim states how it was checked.

---

## Where the code is

The desktop source is **not** in this repository. It lives beside it:

```
E:\Akarpromax new 2027\
├── AkarApp_SOURCE/        ← the WPF source, its own git (HEAD 1faef4c)
├── AkarApp_INSTALLER/
├── AkarApp_PUBLISH_TEST/
├── AkarApp_Patcher/
└── V 2.0 GPT - Copy/      ← this repository (the web platform)
    └── AkarApp_LIVE/      ← 86 MB of compiled output, untracked by git
```

`AkarApp_SOURCE` holds **172 C# files** and `AkarApp.csproj`
(`net8.0-windows`, `UseWPF=True`). Its git history records a single commit:
*"restore compilable+runnable state from decompiled 2.0.6 source"*.

That last point governs everything below. **This source was recovered by
decompiling the shipped 2.0.6 assembly.** It compiles and runs, but it is
machine-shaped C#, and one part of it did not survive decompilation at all.

---

## The XAML is gone

| | Count |
|---|---|
| `.cs` files | **172** |
| `.xaml` files | **0** |
| `.baml` files | **37** |

The views exist only as **compiled BAML**. The project embeds
`AkarApp.g.resources` — extracted verbatim from the shipped DLL — because
per-file BAML entries fail with *"Cannot locate resource 'app.xaml'"*.

So the 37 screens can be **run**, but not **read or edited**. Every layout,
style, binding, colour and data template is opaque. A migration that must
reproduce those screens has no source for them; they would have to be
reconstructed from the running application, or the BAML decompiled back to XAML
first.

---

## The 37 views are unreachable at runtime

This is the finding that reframes the whole mandate.

`MainWindow.cs`:

```csharp
private async void MainWindow_Loaded(object sender, RoutedEventArgs e)
{
    TryOpenModernPortalOnStartup();      // → OpenModernPortal()
}

private void OpenModernPortal()
{
    AkarV2PortalWindow akarV2PortalWindow = new AkarV2PortalWindow("http://localhost:1420/") { ... };
    akarV2PortalWindow.Closed += delegate { Application.Current.Shutdown(); };
    Application.Current.MainWindow = akarV2PortalWindow;
    akarV2PortalWindow.Show();
}
```

MainWindow opens the WebView2 portal the moment it loads, hands it the
`MainWindow` role, and shuts the application down when it closes. The user never
reaches the WPF UI. `MainWindow` has 10 `_Click` handlers; none are reachable.

`AkarV2PortalWindow` serves the React SPA from disk:

```csharp
_localIndexPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "webui", "index.html");
Browser.CoreWebView2.SetVirtualHostNameToFolderMapping("akarapp.local", text, ...);
Navigate("https://akarapp.local/index.html");
```

**So the product the user actually sees is a React SPA in a WebView2 window.**
The WPF application is a launcher around it. The SPA ships as built bundles
(`AkarApp_LIVE/webui/assets/*.js`); no React source was found in any sibling
folder.

### What that means for this mandate

"Convert the WPF UI to VB.NET WinForms with DevExpress" would, executed
literally, port 37 screens **no user can currently open**, and would not touch
the interface they actually use. The result would look complete and change
nothing.

That is a decision for you, not for me, so I have stopped here. The three
coherent readings:

1. **Rebuild the real product as a native WinForms app** — i.e. reimplement the
   SPA's functionality in VB.NET/DevExpress and drop WebView2. This is what
   "professional desktop application" most likely means, and it is the largest
   of the three. It needs the SPA's source, which I have not located.
2. **Port the dormant WPF modules and revive them** — the 37 screens become the
   product again and the portal becomes one tab. This matches the mandate's
   literal words. The XAML being gone makes it a reconstruction.
3. **Keep the WebView2 shell, harden and modernise it** — cheapest, addresses
   the defects below, but is not a WinForms migration.

I am not choosing between these, and I will not start one on assumption.

---

## Source layout (what does exist, and is readable)

```
AkarApp/
├── App.cs, MainWindow.cs
├── Models/        48 files — EF Core entities + AkarDbContext
├── Services/      25 files — see below
├── ViewModels/    ~30 files
├── Views/         code-behind only (the XAML is gone)
├── Security/      SecurityManager.cs
├── Localization/  LocalizationManager.cs, LocExtension.cs
├── Converters/    4 WPF value converters
└── Migrations/    EF migrations + model snapshot
```

**Services — the business logic worth preserving (§8):**

`AccountingService`, `LedgerService`, `SubscriptionService`, `LicenseService`,
`OfflineLicenseService`, `CloudBackupSyncService`, `RadarService`,
`DesktopAdService`, `ContractFileLinkService`, `StorageService`, `PrintHelper`,
`ScannerService`, `DatabaseSeeder`, `BackgroundServices`, `AppIntegrityService`,
`IntegrityManifest`, `HwidGenerator`, `SecureDesktopSecretStore`,
`BridgeHostObject` (the WebView2 ↔ .NET bridge).

This layer is readable and portable. It is the part of a migration that can
proceed on evidence rather than reconstruction.

---

## Database

Full listing in [DATABASE_INVENTORY.md](./DATABASE_INVENTORY.md).

- **55 tables**, **29 indexes**, **5 triggers**, 0 views (`AkarApp_LIVE/AkarDB.sqlite`).
- Reference data populated: 106 `LookupItems`, 19 `LookupCategories`,
  8 `CountryConfigs`, 3 each of `Clients`, `Users`, `ContractTemplates`,
  `TaxFeeTypes`, 1 `Branch`. Transactional tables empty — a seed copy, not any
  office's production file.
- **Three business rules live in triggers, not in code:**
  ownership shares must total 100% (insert and update), a lead accepts at most
  two claims, and the client timeline is append-only (update and delete blocked).
  A port that recreates the schema from the EF model alone silently drops all
  three.

---

## Server integration — three defects

### 1. The API domain does not exist

`AkarApp/Services/SubscriptionService.cs` and `DesktopAdService.cs` hardcode:

```csharp
private const string SyncUrl   = "https://akar-promax.com/api/program/sync";
private const string StatusUrl = "https://akar-promax.com/api/program/subscription-status";
```

```
nslookup akar-promax.com  →  Non-existent domain
curl                      →  status 000, no route
```

The live platform is **`akarpromax.com`**, without the hyphen. Every server call
the desktop app makes fails at DNS.

### 2. `subscription-status` is not implemented

Against the real domain:

| Endpoint the app calls | Live |
|---|---|
| `/api/program/sync` | **200** |
| `/api/program/subscription-status` | **404** |
| `/api/desktop/...` | **404** |

The server implements `/api/program/{login, devices, profile, properties, messages, sync}`.
Subscription status is not among them. So even with the domain corrected, the
licence check has nothing to call.

### 3. A shared secret is hardcoded and sent in the query string

```csharp
string url = $"{StatusUrl}?signature={Uri.EscapeDataString("Akar_ProMax_2026_Secure_Key")}&userToken={...}";
```

The key is a literal in the assembly, so it is recoverable from any installed
copy, and it travels as a **URL query parameter** — the one place a secret
should never go, since query strings land in access logs, proxies and crash
reports. The user token rides alongside it.

This is the mandate's §42 (hardcoded secrets) and §11 (no plaintext secrets) in
one line.

---

## Update system

`https://akarpromax.com/office-app/version.json`:

```json
{ "version": "2.0.6", "setupUrl": "/downloads/AkarProMaxOffice-Setup.exe",
  "mandatory": true, "notes": "..." }
```

The installer is present and current (18.9 MB, 30 Aug 2026).

Against §32–§37 the manifest lacks `minimumSupportedVersion`, `channel`,
`releaseDate` and `sha256`; there is no separate updater executable, no
integrity verification, no rollback, and no `/releases/<version>/` layout.

**Standing hazard:** `mandatory` is `true`. Publishing a version number without
a matching installer at that URL leaves every installed client demanding an
update it cannot fetch — which locks all of them out. Installer first, manifest
second, always.

---

## Localization

`strings.ar.json` and `strings.en.json`: **197 keys each, perfectly aligned** —
no key in one and missing from the other.

**Turkish does not exist.** §22 requires ar/en/tr, so `strings.tr.json` is 197
keys of new translation.

Note this covers the WPF layer only. The SPA — the interface users actually see
— carries its own strings inside its bundles.

---

## Security findings

| # | Finding | Severity |
|---|---|---|
| S1 | Shared secret hardcoded **and** sent as a URL query parameter, alongside the user token | **High** |
| S2 | `EnableUnsafeBinaryFormatterSerialization: true` in `runtimeconfig.json` — a known RCE vector, and removed outright in .NET 9 | **High** |
| S3 | `AkarApp_LIVE/remember.json` stores a saved credential (`admin` + DPAPI blob) beside the executable rather than under `%APPDATA%`, in a directory the updater replaces. DPAPI is the right primitive; the location is not. Not tracked by git — verified | Medium |
| S4 | `AkarDB.sqlite` unencrypted. Whether that is acceptable depends on what an office keeps in it — a decision, not a default | Medium |

---

## Risk register

| # | Risk | Severity |
|---|---|---|
| R1 | **The migration target is ambiguous** — the WPF UI is dormant; the real UI is the SPA | **Blocker** |
| R2 | **All XAML is lost**; 37 views exist only as BAML and cannot be read or edited | **Blocker for option 2** |
| R3 | Source is decompiled, not original — names and structure are machine-shaped | High |
| R4 | Business rules live in database triggers, invisible to a code-only port | High |
| R5 | API domain does not resolve | High |
| R6 | `subscription-status` unimplemented server-side | High |
| R7 | Hardcoded secret in query string (S1) | High |
| R8 | Mandatory-update gate can lock out every installation | High |
| R9 | SPA source not located — blocks option 1 | High |
| R10 | `BinaryFormatter` enabled (S2) | Medium |
| R11 | Turkish absent; SPA strings separate from RESX | Medium |
| R12 | DevExpress neither referenced nor licensed | Medium |
| R13 | No automated tests exist anywhere in the desktop tree | Medium |

---

## Recommended order, once R1 is decided

Per §62 I am recording a departure from the mandate's order rather than making
it silently:

1. **Fix R5, R6 and R7 first, on the current shipped app.** They break users
   today, they are independent of any migration, and two of them are
   server-side. Deferring a dead DNS name until a rewrite lands would be poor
   judgement.
2. **Extract the trigger rules into documented domain rules before PHASE 2**, or
   the new Domain layer will not know they exist.
3. Then the mandate's PHASE 1 → 13, against whichever target you choose.

---

## Baseline status — Gate 0 does **not** pass

| Check | Result |
|---|---|
| Source located | ✅ `AkarApp_SOURCE`, 172 C# files |
| Solution builds | **Not attempted** this session (a prior session recorded a working recipe) |
| Original runs | **Not attempted** |
| XAML available | ❌ **Lost** — 37 views are BAML only |
| Migration target agreed | ❌ **Open** — see R1 |
| Isolated development copy | **Not created** — pointless before the target is settled |
| Automated tests | ❌ none exist |

Per §56, nothing here is called complete. PHASE 0 halts at Gate 0 pending your
decision on R1.
