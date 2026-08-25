# AKARPROMAX OFFICE — INITIAL RELEASE CERTIFICATION

Date: 2026-08-22
Website project: `E:\Akarpromax new 2027\V 2.0 GPT - Copy`
Production data modified: **NO** — nothing was executed, and no file outside this report was written.

## Scope of this pass — read first

This is a **static source audit only**. The session running it had no ability to execute anything on the machine: the device shell failed to start for the whole session, and no browser-control channel was connected. That rules out, entirely:

`dotnet restore` · `dotnet build` · launching the EXE · cold/second start · pairing lifecycle · restart persistence · disconnect/re-pair · credential expiry · property sync · media sync · conflict handling · GEO · ads delivery · news delivery · Radar · notifications · SSE/realtime · offline and recovery · Office A/B isolation · installer · every E2E scenario A–H.

None of those are reported as PASS below, because none of them were run. What follows is what source inspection alone can establish — and it found a launch blocker that no amount of runtime testing would have been needed to catch.

## Section 0 — Active desktop source: RESOLVED

`F:\akarpromax-office\handoff\office-current-manifest.txt` (generated 2026-08-20) declares it outright:

```
Canonical Path:    F:\akarpromax-office\AkarApp_Next
Canonical csproj:  F:\akarpromax-office\AkarApp_Next\AkarApp\AkarApp.csproj
.NET SDK:          8.0.424
AkarApp .cs files: 182      AkarWebUI src: 335
```

The other candidates, and why they are not it:

| Path | Verdict |
|---|---|
| `F:\akarpromax-office\AkarApp_Next` | **ACTIVE.** Holds `AkarApp.csproj`, `Services/`, `Models/`, `ViewModels/`, `Views/`, `AkarWebUI/`. Integration sources modified 2026-08-21/22. |
| `F:\akarpromax-office\AkarApp_LIVE` | Build output only — DLLs, `AkarApp.exe`, `deps.json`. No `.csproj`, no source. `AkarApp.dll` is older than Next's. |
| `E:\...\V 2.0 GPT - Copy\AkarApp_LIVE` | A duplicate of the above, sitting inside the website repo. Identical file sizes and timestamps. Decoy. |
| `F:\akarpromax-office\AkarApp_Clean`, `AkarApp_Dev` | Not the canonical path per the manifest. |

No new copy was created.

Version: `AkarApp.csproj` sets `<Version>1.2.0</Version>` with `GenerateAssemblyInfo=false`, so the assembly version comes from elsewhere. `PairingService` sends `Assembly.GetName().Version` as `AppVersion` and `OfficeApiClient.GetAppVersion()` prefers `AssemblyInformationalVersionAttribute`. Worth confirming those three agree; a mismatch would misreport the client version to the server during pairing and heartbeat.

## BLOCKER 1 — Three of four data integrations call a route namespace that does not exist

This is the finding that matters.

**What the desktop calls** (from `AkarApp_Next\AkarApp\Services\`):

| Service | URL built | Website route | Status |
|---|---|---|---|
| `OfficeApiClient.CompletePairingAsync` | `{base}/api/office/v1/pairing/complete` | `app/api/office/v1/pairing/complete/route.ts` | **exists** |
| `OfficeApiClient.HeartbeatAsync` / `HeartbeatDetailAsync` | `{base}/api/office/v1/auth?action=heartbeat` | `app/api/office/v1/auth/route.ts` | **exists** |
| `OfficeApiClient.RotateTokenAsync` | `{base}/api/office/v1/auth?action=rotate` | `app/api/office/v1/auth/route.ts` | **exists** |
| `RadarService` | `{base}/api/desktop/property-requests` | — | **MISSING** |
| `DesktopNewsTickerService` | `{base}/api/desktop/news-ticker` | — | **MISSING** |
| `OnlinePropertyService` | `{base}/api/desktop/properties/draft` | — | **MISSING** |
| `DesktopAdService` | `{adBase}/ads/{adId}/{action}` | `app/api/office/v1/ads/route.ts` | **mismatched** |

**`app/api/desktop` does not exist in the website project at all.** The directory is absent.

What the website actually exposes under `app/api/office/v1/`: `pairing/`, `pairing/complete/`, `auth/`, `devices/`, `ads/`, `media/`, `news/`, `notifications/`, `radar/`, `stream/`, `sync/`.

So the canonical routes for radar, news, property sync and ads all exist — the desktop simply is not calling them. Pairing and authentication were migrated to `/api/office/v1/*`; the four data integrations were left on a legacy `/api/desktop/*` namespace that no longer has an implementation.

Consequence, without needing to run anything: **Scenario B (property sync), Scenario E (Radar) and Scenario F (news) cannot succeed against this website.** Scenario D (ads) is on a different base URL and a different auth scheme.

This is exactly the legacy-route condition section 18 warns against and section 32's inventory was meant to surface. It is a launch blocker, and the fix belongs on the desktop client (repoint to the canonical routes and reconcile the DTOs), not on the website — do not invent `/api/desktop/*` routes to match a stale client.

## BLOCKER 2 — Production configuration ships a developer's absolute path

`AkarApp_Next\AkarApp\app.config`:

```xml
<source name="System.Windows.Application" switchValue="All">
  <listeners>
    <add name="myListener" type="System.Diagnostics.TextWriterTraceListener"
         initializeData="C:\Users\zak\AppData\Local\Temp\akar_trace.log" />
  </listeners>
</source>
<trace autoflush="true" />
```

Two problems. The path is hardcoded to a specific developer account (`C:\Users\zak\...`) and will not exist on any customer machine. And `switchValue="All"` with `autoflush` turns on full WPF application tracing in every build, writing continuously to a plaintext file — which cuts against section 31's rule about what may be logged.

Section 36 forbids dev-only flags and hardcoded developer paths in production configuration. This qualifies on both counts.

## BLOCKER 3 (conditional) — API base URL falls back to localhost, silently

All five network services resolve their base URL the same way: read `akar_website_api_settings` through `WebViewBridgeService`, parse `baseUrl`, and on any failure fall through a bare `catch { }` to a hardcoded local address.

| Service | Fallback |
|---|---|
| `OfficeApiClient` | `http://localhost:8082` |
| `OnlinePropertyService` | `http://localhost:8082` |
| `RadarService` | `http://localhost:8082/api/desktop` |
| `DesktopNewsTickerService` | `http://localhost:8082/api/desktop` |
| `DesktopAdService` | `http://localhost:8080` |

On a customer machine, if that setting is absent or malformed — a fresh install before any configuration, for instance — every integration silently targets the local machine and fails with no diagnosable reason, because the exception is swallowed. Section 4 requires production configuration to be ready for `https://akarpromax.com`; there is no production default anywhere in the resolution chain.

Two smaller defects in the same code:

- `DesktopAdService` falls back to port **8080** while the other four use **8082**. Ads can diverge from the rest of the integration even in development.
- `DesktopAdService` returns the configured URL **without** `TrimEnd('/')`, unlike the other four. A configured base URL ending in `/` produces double-slash ad URLs only.

## Candidate blocker — credential save failures are invisible

`SecureDesktopSecretStore.SaveSecret` wraps its entire write in `try { ... } catch { }` and returns void. `DeviceCredentialStore.SaveCredential` calls it four times and cannot tell whether anything persisted. `PairingService.PairAsync` then reports `Success = true`.

If the DPAPI write or the file write fails, pairing reports success to the user and the credential is not on disk — so the next launch asks to pair again. That is section 7's restart-persistence scenario failing in a way that looks like a server problem. Whether it actually manifests needs a runtime test; the code path that would hide it is unambiguous.

## What the static audit found to be sound

- **Credential at rest** — `SecureDesktopSecretStore` uses Windows DPAPI (`ProtectedData.Protect`, `DataProtectionScope.CurrentUser`) with entropy derived from a constant plus `Environment.UserName`, stored at `%LocalAppData%\AkarApp\Security\desktop_secrets.bin`. Not plaintext. Appropriate for a desktop client.
- **Installation ID** — `DeviceIdentityService.GetInstallationId()` generates a GUID once, persists it, and returns the stored value thereafter. Stable across restarts by construction; carries no sensitive data. (Minor: no locking, so two concurrent first-calls could race and generate two IDs.)
- **Pairing error handling** — `PairingService` maps 404 / 410 / 429 / 409 to clear Arabic user messages, and handles `HttpRequestException` and `TaskCanceledException` separately. Good against sections 9 and 30. One exception: the final `catch (Exception ex)` interpolates `ex.Message` into user-facing text, which section 30 asks to avoid.
- **Bridge surface** — `BridgeHostObject` exposes exactly the five documented methods (`GetInstallationId`, `PairDevice`, `HasDeviceCredential`, `GetDeviceStatus`, `DisconnectDevice`) plus `GetAllData`, each delegating to `WebViewBridgeService`. Shape matches section 25. Runtime behaviour unverified.
- **No hardcoded credentials or secrets** were found in the audited services.

## Auth scheme inconsistency (section 33)

Pairing and heartbeat send `Authorization: Bearer {deviceToken}`. `DesktopAdService` sends `X-API-Key: {websiteAuthToken}` resolved from `OfflineLicenseService.ResolveWebsiteAuthToken()`. Two different credentials and two different header schemes against what should be one device-authenticated surface. Reconcile when repointing ads to `/api/office/v1/ads`.

## Not audited

`WebViewBridgeService` internals, `Models/` DTOs against the website's response shapes, the remaining 30 services, `AkarWebUI`, and the website route handlers' own contracts. A full section 33 DTO comparison needs both sides read in depth; only the pairing/auth DTOs were compared here, and those match the routes that exist.

## Recommended order

1. Repoint `RadarService`, `DesktopNewsTickerService`, `OnlinePropertyService` and `DesktopAdService` to `/api/office/v1/{radar,news,sync,ads}` and reconcile DTOs and auth headers against those handlers. (Blocker 1)
2. Remove the developer trace listener from `app.config`, or make it conditional and relative. (Blocker 2)
3. Give the base-URL resolver a production default and a logged, user-visible failure state instead of `catch { }` → localhost. Unify the ad base URL and add the missing `TrimEnd('/')`. (Blocker 3)
4. Make `SaveSecret` report failure so pairing cannot claim success without persistence.
5. Only then run the build, launch, and scenarios A–H.

## Certification status

Static audit complete. Runtime certification **not started** — no execution channel was available. Three launch blockers identified from source, one of which (Blocker 1) would have failed three of the eight required scenarios.

**AKARPROMAX OFFICE = NOT READY FOR INITIAL RELEASE.**

---

# Targeted Integration Repair — 2026-08-22

Source changes only. Nothing was compiled or executed: the session had no shell on the machine. Every build and runtime line below reads NOT EXECUTED, not PASS.

Active source: `F:\akarpromax-office\AkarApp_Next` (unchanged, per the handoff manifest). No third copy was created.

## New files

**`Services/OfficeBaseUrl.cs`** — the single base-URL provider and the only place canonical routes are declared.

Resolution order: explicit environment override (`AKARPROMAX_API_BASE_URL`) → stored application configuration (`akar_website_api_settings.baseUrl`) → production canonical `https://akarpromax.com`.

Validation before any URL is used: must parse as an absolute URI; scheme must be http or https; host must be non-empty. Outside development it additionally rejects plain `http` (a device credential must not travel unencrypted) and rejects loopback hosts. `IsDevelopment` is true for DEBUG builds or when `AKARPROMAX_ENV=development`, and only then may a localhost address be used. A release build therefore cannot fall back to the developer's machine — the worst case is the production URL.

Routes are constants (`Routes.PairingComplete`, `.Auth`, `.News`, `.Ads`, `.Sync`, `.Radar`, `.Media`, `.Notifications`, `.Stream`), so no service carries a path string.

**`Services/OfficeDiagnostics.cs`** — small warn/info sink that redacts anything resembling a bearer token, replacing the silent `catch { }` blocks that previously hid configuration failures.

## FIX 1 — canonical routes

| Service | Before | After | State |
|---|---|---|---|
| `DesktopNewsTickerService` | GET `{base}` + legacy desktop namespace + `/news-ticker` | `GET /api/office/v1/news?view=ticker&country=om&limit=20`, Bearer device token; parses `items[].titleAr/En/Tr` (was `data[].text`) | **FIXED** |
| `OnlinePropertyService` | POST legacy `/properties/draft` with the interactive website session token | `POST /api/office/v1/sync` with `{items:[{operationType:"property.upsert", entityId, payload, clientUpdatedAt, idempotencyKey}]}`, Bearer **device** token; reads `{accepted, conflicts, duplicates, items[]}` | **FIXED** |
| `DesktopAdService` | GET legacy `/ads/placement/…` with `X-API-Key`; POST `/ads/{id}/{action}` | `GET /api/office/v1/ads?placement=office_dashboard_hero&country=&device=desktop&locale=ar&limit=1`; `POST /api/office/v1/ads` with `{campaignId, eventType, placement, country, device, locale, dedupKey}`; Bearer device token; response parser now reads `ads[]` with the old `ad` shape as fallback | **FIXED** |
| `RadarService` | GET legacy `/property-requests` | **NOT FIXED — website-side decision required** | **BLOCKED** |

`x-app-version` and `x-protocol-version` are now sent on every office call, so the server's protocol gate (409 on an outdated client) works for all of them, not only pairing.

Idempotency: the sync key is derived from a SHA-256 of the serialized payload — `office-property-{id}-{hash16}`. An identical retry is de-duplicated server side; a genuine edit yields a new key and is accepted as an update. A `duplicates` response is treated as success, not failure.

### Radar — why it was not repointed

The old route returned **client demand requests** (city, neighbourhood, property type, min/max price) which `RadarService` matched against local inventory. The canonical `/api/office/v1/radar` is a different feature: a geo proximity scan that requires `latitude`, `longitude` and `radiusKm` in the POST body (400 without them) and returns `RadarTarget` objects — id, kind, title, countryCode, cityId, lat/lng, distanceKm.

`AkarApp.Models.Setting` stores **no** latitude, longitude, city, region, country or radius. The office's own location does not exist locally, so the required parameters cannot be supplied. There is no canonical endpoint that returns demand requests.

This is the contract mismatch that cannot be fixed from the Desktop alone. Rather than issue the old path against the production base URL — which would hit the public website and return an HTML 404 — the legacy call is disabled behind a documented guard that logs a diagnostic and returns 0. Local radar matching (`MatchPropertyAgainstLocalRequests`) is untouched and still works. The decision needed is either office-location settings plus geo-scan semantics, or a demand-requests route under `/api/office/v1/`.

## FIX 2 — developer path removed

The `System.Windows.Application` trace listener in `app.config` wrote to an absolute path under a single developer's profile with `switchValue="All"` and `autoflush`. The whole `<system.diagnostics>` block was removed; `<runtime><gcAllowVeryLargeObjects/></runtime>` is retained. No developer absolute path remains in the Office runtime configuration or in any audited service. `AkarApp.dll.config` in the output directory is a build artifact and will be regenerated from this file.

## FIX 3 — safe production base URL

Removed: `http://localhost:8082` from `OfficeApiClient`, `OnlinePropertyService`, `RadarService`, `DesktopNewsTickerService`, and `http://localhost:8080` from `DesktopAdService`. All five now call `OfficeBaseUrl.Resolve()`. The port inconsistency (8080 vs 8082) and the missing `TrimEnd('/')` in the ad path disappear with the per-service resolvers.

## Error handling and logging

Property sync distinguishes 401/403 (`يلزم إعادة ربط البرنامج بالمكتب`) from transport failures (`لا يوجد اتصال — ستتم إعادة المحاولة`, with `IsOffline`) and from conflicts (`IsConflict`, with a plain-language message). No stack trace or raw `ex.Message` reaches the user; details go to `OfficeDiagnostics`. `OnlinePropertyUploadResult` gained `EntityId`, `IsConflict`, `IsOffline` — additive only, so existing consumers still compile.

No credential, token, pairing code or API key is written to any log.

## Verification

`scripts/verify-office-integration.mjs` in the website repo, read-only, exits non-zero on failure:

```
node scripts/verify-office-integration.mjs "F:\akarpromax-office\AkarApp_Next"
```

Run against the edited source: **9/9 passed** — no legacy namespace in the four services; canonical routes declared centrally; production URL is `https://akarpromax.com`; development override present; no localhost URL literal; no developer absolute path; base URL validated; office callers use the device credential; no credential in a log statement.

## Open item carried forward

`DesktopAdService` sends `country` but not `region`/`city`, because the installation does not store them (it reads them from `akar_website_api_settings` if present). Office-level city targeting is therefore country-wide today. The acceptance criterion "a Jeddah office must not receive Riyadh-only ads" **cannot be met** until the office location reaches the server — the same missing data that blocks Radar. One fix serves both.

## Status

Code repair complete for two of three fixes and three of four services. Build and runtime certification pending an execution channel.

**AKARPROMAX OFFICE = NOT READY FOR INITIAL RELEASE** — code repair complete, runtime certification pending.
