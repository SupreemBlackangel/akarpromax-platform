# 14 — DESKTOP ↔ WEB CONTRACT MATRIX (source-verified replacement)

**Supersedes** `/home/claude/work/out/docs/product-audit/WEB-OFFICE-CONTRACT-MATRIX.md` (43 rows, binary-only evidence).
Audit date 2026-08-19. **READ-ONLY documentation. No code was changed in any tree.**

---

## 1. Evidence basis

### 1.1 What changed since the previous matrix

The previous matrix was written with **no C# source**. It said so explicitly
(`out/docs/product-audit/WEB-OFFICE-CONTRACT-MATRIX.md:39-43`) and marked every C#-side claim
`OLD SOURCE REQUIRED` or `UNKNOWN`.

**The C# source is now available.** `/home/claude/work/desk/AkarApp_Next/AkarApp` — 182 `.cs` files,
33,356 lines (Models 48, Services 36, ViewModels 48, Views 37, Migrations 3, Security 1,
Converters 4, Localization 2), plus `AkarApp.csproj`, `AssemblyInfo.cs`, `app.config`,
`baml_entries.txt`, `Localization/strings.{ar,en}.json` (197 keys each). A slightly older dev tree
exists at `/home/claude/work/desk/AkarApp_Dev/AkarApp` (171 `.cs`).

The `_Next` tree is a **decompiled/round-tripped** tree (compiler artefacts such as `if (1 == 0)`
dead branches, `IL_00e6` labels and `num`/`text2` local names are visible, e.g.
`Services/DesktopAdService.cs:346`, `ViewModels/ClientRequestMatchesViewModel.cs:47`). Method
bodies, string literals, URLs, headers, DTO field names, timeouts and control flow are all readable
and are treated as **SOURCE VERIFIED**. Original local-variable names and comments are not
recoverable and are not claimed.

### 1.2 What the C# source proves, disproves and adds

| Previous claim | Verdict from C# source |
|---|---|
| "Base host for C#-side calls is `https://akar-promax.com`" (`:82`) | **DISPROVED.** No `akar-promax.com` literal exists anywhere in the C# tree (`grep -rn "akar-promax"` → 0 hits). The base URL is read from the WebView bridge key `akar_website_api_settings` → `baseUrl` (`Services/OfficeApiClient.cs:91-101`, `Services/SubscriptionService.cs:14-32`, `Services/DesktopAdService.cs:312-335`, `Services/RadarService.cs:203-221`, `Services/DesktopNewsTickerService.cs:54-72`, `Services/OnlinePropertyService.cs:15-33`), falling back to **`http://localhost:8080`** in two services and **`http://localhost:8082`** in five. |
| "`POST /api/program/sync`" (D-01) | **DISPROVED.** No `/api/program/` path exists in the C# tree. The C# path family is **`/api/desktop/*`** (`Services/SubscriptionService.cs:34,36`, `Services/DesktopAdService.cs:282`, `Services/RadarService.cs:215`, `Services/DesktopNewsTickerService.cs:66`, `Services/OnlinePropertyService.cs:53`). |
| "`/api/program/subscription-status`" (D-02/D-03) | **CORRECTED** to `GET /api/desktop/subscription-status` and `POST /api/desktop/sync` (`Services/SubscriptionService.cs:34,36,57-98`). |
| "SubscriptionService verb UNKNOWN" | **RESOLVED.** GET first, then POST fallback (`SubscriptionService.cs:44-54`). |
| "`DesktopAdService.PostTrackingAsync` has no URL literal — UNKNOWN" (D-05/D-06) | **RESOLVED.** `POST {base}/api/desktop/ads/{adId}/{view\|click}` with header `X-API-Key` and body `{}` (`Services/DesktopAdService.cs:177-202`). |
| "Portal navigates to `https://akar-promax.com?signature=…&userToken=…&action=…`" (D-08) | **DISPROVED for the portal.** `AkarV2PortalWindow` navigates only to the **local** WebUI (`Views/AkarV2PortalWindow.cs:323,329,333`) or to the constructor URL, which `MainWindow.cs:285` hard-codes to `http://localhost:1420/`. The `signature`+`userToken` pair is real but belongs to `SubscriptionService` (`SubscriptionService.cs:62,81-86`), not to a browser navigation. |
| "The desktop is not a client of `app/api/office/v1/**` in any form" (`:110-112`) | **DISPROVED.** `Services/OfficeApiClient.cs` is a purpose-built V2 office client: `POST /api/office/v1/pairing/complete` (`:39`), `POST /api/office/v1/auth?action=heartbeat` (`:51,59`), `POST /api/office/v1/auth?action=rotate` (`:76`), with `Authorization: Bearer`, `x-protocol-version`, `x-app-version` (`:52,60-62`). `Services/PairingService.cs`, `Services/DeviceIdentityService.cs`, `Services/DeviceCredentialStore.cs` complete the pairing stack. These four files exist **only in `_Next`**, not in `_Dev` (`diff -rq` → `Only in AkarApp_Next/AkarApp/Services`). |
| "The shared secret `Akar_ProMax_2026_Secure_Key` is a WebUI bundle literal" | **CONFIRMED and extended.** It is also a C# `const` (`Services/SubscriptionService.cs:12`, re-inlined at `:62,83`). |
| "Desktop radar has no geographic dimension; matching rule readable from the shipped bundle" | **CORRECTED.** The C# radar is a **weighted scoring** engine, not the variance rule described at `:444-452`. See §6.3. |
| "`AdImpressions`/`AdCampaigns` are the remote-ad mirror" | **PARTIALLY DISPROVED.** `Services/DesktopAdService.cs` never touches `AdCampaigns` or `AdImpressions`; it caches creatives to `%LOCALAPPDATA%\AkarApp\AdCache` (`:204-250,260-263`). Those two tables are unused by the shipped ad path. |
| "Cloud backup uploads a ZIP to a free-text URL, credentials UNKNOWN" | **CONFIRMED and completed.** `multipart/form-data`, parts `backupFile` (`application/zip`) and `createdAtUtc`, header `X-API-Key` (`Services/CloudBackupSyncService.cs:116-127`). |

### 1.3 Newly discovered: the V1 server side of the contract

`/home/claude/work/v1/server/api/src/routes/desktop.ts` (292 lines) is **the server the C# was written
against**. It is mounted at `/api/desktop` (`v1/server/api/src/index.ts:91`) and implements 17
endpoints. The shipped desktop's `/api/desktop/*` paths line up with it path-for-path. This is the
first time a matching server has been found for any desktop call.

### 1.4 Evidence tiers used here

| Tier | Source | Status |
|---|---|---|
| **T1 — Desktop C# source** | `desk/AkarApp_Next/AkarApp/**` | SOURCE VERIFIED (decompiled; bodies and literals authoritative) |
| **T2 — V1 web server** | `v1/server/api/src/**`, `v1/server/api/prisma/schema.prisma`, `v1/server/.env` | SOURCE VERIFIED |
| **T3 — V1 web frontend** | `v1/src/**` | SOURCE VERIFIED |
| **T4 — V2 web** | `cur/app/api/**`, `cur/lib/integration/**` | SOURCE VERIFIED |
| **T5 — Desktop local DB** | `cur/AkarApp_LIVE/AkarDB.sqlite` (55 tables, dumped with `python3`+`sqlite3`) | SOURCE VERIFIED — but it is an **older** DB than the `_Next` EF model (§6.1) |
| **T6 — Shipped bundles/strings** | `cur/AkarApp_LIVE/webui/assets/*.js`, `inv/dll_strings.txt` | SOURCE VERIFIED for the shipped build, which is **older than `_Next`** |

### 1.5 What is still unknown

1. **Nothing was executed.** No server was started, no request issued. All statuses are static-analysis results.
2. **Which desktop build is deployed.** `AkarApp_LIVE` (shipped) contains the `signature`/`userToken`
   WebUI world; `_Next` contains the `/api/office/v1` pairing client. They are different generations.
   The shipped `AkarApp.dll` is `1.0.0.0`; `_Next`'s `AkarApp.csproj:9` declares `<Version>1.2.0</Version>`
   but `AssemblyInfo.cs:13-15,20` hard-codes `1.0.0.0`/`1.0.0` and `GenerateAssemblyInfo=false`
   (`AkarApp.csproj:14`), so the runtime version really is `1.0.0`.
3. **The V1 deployment's `DESKTOP_SIGNATURE` value at the time the desktop shipped.** The checked-in
   `v1/server/.env:6` value is a 96-hex-char string, not the C# literal (§4.4). Whether production ever
   used the C# literal is UNKNOWN.
4. **`AkarWebUI`** — the canonical WebUI project referenced by `AkarApp.csproj:57-59,63-70` is **not in
   any available tree**. The React app that consumes `akarBridge` is therefore only partly readable
   (via the older shipped `webui/assets/*.js`).
5. **V2-side route defects W-16, W-18…W-23, W-27** are carried forward from the previous matrix. Their
   route inventory, verbs and file paths were re-verified in this pass; their internal defect analysis
   was not re-derived line-by-line.
6. **`Migrations/AkarDbContextModelSnapshot.cs`** exists but no `Up`/`Down` migration for the
   `Desktop*` property columns (§6.1) — how they reach an existing DB is UNKNOWN.

### 1.6 Status vocabulary

`MATCH` · `PARTIAL MATCH` · `CONTRACT MISMATCH` · `WEB ROUTE MISSING` · `DESKTOP CALL OBSOLETE` ·
`WEB IMPLEMENTATION BROKEN` · `UNKNOWN`

Every row carries **two** statuses: `v1_status` (against `/home/claude/work/v1`) and `v2_status`
(against `/home/claude/work/cur`).

---

## 2. Desktop → Web call table

**Base-URL composition (all rows).** Every network service reads the WebView-bridge file
`{DataRoot}/akar_website_api_settings.json` and takes `.baseUrl`
(`Services/WebViewBridgeService.cs:25-40,260-264`). `DataRoot` is `Settings.StoragePath1` /
`StoragePath2` + `AkarData`, else `%LOCALAPPDATA%\AkarApp\AkarData`
(`Services/WebViewBridgeService.cs:304-333`). **The fallback default is inconsistent across the
codebase**: `http://localhost:8080` in `SubscriptionService.cs:31` and `DesktopAdService.cs:334`;
`http://localhost:8082` in `OfficeApiClient.cs:104`, `OnlinePropertyService.cs:32`,
`RadarService.cs:220`, `DesktopNewsTickerService.cs:71`, `WebsiteLoginDialog.cs:167`,
`PropertyUploadDialog.cs:265`. That is a shipped defect: with no configuration, the subscription/ad
services and everything else talk to two different ports.

| # | Desktop file | Class | Method | HTTP | URL | Auth | Request DTO | Response DTO | Error handling | Retry | Offline | V1 route | V1 status | V2 route | V2 status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **D-01** | `Services/SubscriptionService.cs:57` | `SubscriptionService` | `TryGetStatusAsync` | **GET** | `{base}/api/desktop/subscription-status?signature={URL-enc}&userToken={URL-enc}` (`:36,62`) | Query pair. `signature` = C# `const "Akar_ProMax_2026_Secure_Key"` (`:12`, re-inlined `:62`). `userToken` = `SecureDesktopSecretStore.GetWebsiteAuthToken()` → bridge `user_token` → `akar_website_api_settings.apiKey` (`Services/OfflineLicenseService.cs:22-58`) | none (query only) | `ParseStatus` (`:108-137`) unwraps `data` **or** `result` **or** root (`:112`), then reads with multi-alias lookup: `expiry_date\|expiryDate\|expires_at\|expiresAt\|expiry\|subscription_expiry`; `renewal_url\|renewalUrl\|renew_url\|renewUrl\|payment_url\|paymentUrl`; `message\|status_message\|statusMessage\|note`; `trial_days\|trialDays\|grace_days\|graceDays\|free_days\|freeDays`; `expired\|isExpired`; `active\|isActive\|success` (`:113-118`). Property lookup is **case-insensitive** (`:160`) | `catch { return null }` (`:70-73`); non-2xx → `null` (`:64-67`) | **None inside the method.** Caller falls through to D-02 (`:44-53`) | `OfflineLicenseService.EvaluateStoredStatus` serves a DPAPI-encrypted local record + registry shadow; server refresh is skipped entirely if a valid offline licence exists (`OfflineLicenseService.cs:60-80,234-294`) | `GET /api/desktop/subscription-status` (`v1/server/api/src/routes/desktop.ts:43`) — returns `{data:{expiry_date, renewal_url, message, trial_days, expired, active}}` (`:72-81`), **an exact field-for-field match** | **PARTIAL MATCH** — response shape matches perfectly; the `signature` constant does not (§4.4) | none (`cur/app/api/` has no `desktop` directory) | **WEB ROUTE MISSING** |
| **D-02** | `Services/SubscriptionService.cs:76` | `SubscriptionService` | `TryPostStatusAsync` | **POST** | `{base}/api/desktop/sync` (`:34`) | Body-carried `signature` + `userToken` | `{signature:"Akar_ProMax_2026_Secure_Key", userToken:string, action:"GET_SUBSCRIPTION_STATUS"}` (`:81-86`), `application/json`, UTF-8 | same `ParseStatus` as D-01 | `catch { return null }` (`:94-97`) | none | as D-01 | `POST /api/desktop/sync` (`desktop.ts:85`) — reads `{signature, userToken, action}` (`:87`), logs `desktop_sync_{action}` to `ActivityLog` (`:106-108`), returns the same 6-field `data` envelope (`:109-118`) | **PARTIAL MATCH** — shape matches; signature constant mismatch | none | **WEB ROUTE MISSING** |
| **D-03** | `Services/DesktopAdService.cs:61` | `DesktopAdService` | `TryFetchRemoteBannerAsync` | **GET** | `{base}/api/desktop/ads/placement/desktop_portal_bottom_banner` (`:265-273,275-283`) | Header **`X-API-Key: {websiteAuthToken}`** (`:77`); aborts if the token is empty (`:63-67`) | none | Requires a **root property `ad`** (`:118-123`); then reads `placement\|zone\|Position\|Zone` and **rejects anything ≠ `desktop_portal_bottom_banner`** (`:137-145`); `isActive\|active\|enabled` (`:146`); `startDate\|start_date` / `endDate\|end_date\|expiresAt\|expires_at` schedule window (`:150-155,385-397`); `title\|name\|headline`, `subtitle\|description\|body\|text`, `imageUrl\|image\|image_url\|bannerUrl\|banner_url`, `linkUrl\|targetUrl\|url\|target_url\|link`, `ctaText\|buttonText\|cta\|button_text`, `id\|adId`, `priority\|sortOrder\|sort_order` (`:156-174`) | 401 → null (`:79-82`); 400 → null (`:83-86`); other non-2xx → null (`:87-90`); `catch` → null (`:106-109`) | none per call; the portal re-polls on a **15-minute** `DispatcherTimer` (`Views/AkarV2PortalWindow.cs:81-88,220`) | Creative cached to `%LOCALAPPDATA%\AkarApp\AdCache\{sha256(url)}{ext}` with **12 h** freshness (`:18,204-250,260-263`); banner itself is not persisted, so an offline start shows no ad | `GET /api/desktop/ads/placement/:zone` (`desktop.ts:176`) — **unauthenticated**, `prisma.ad.findFirst({desktopZone: zone, isActive:true})`, returns `res.json(ad \|\| null)` — a **bare Ad row**, not `{ad:…}` | **CONTRACT MISMATCH** — the desktop parser requires a root `ad` wrapper (`DesktopAdService.cs:118`); V1 returns the row itself ⇒ `ParseBottomBanner` returns `null` on every successful response. Also `X-API-Key` is never read by V1 | none | **WEB ROUTE MISSING** |
| **D-04** | `Services/DesktopAdService.cs:25` | `DesktopAdService` | `RecordAdViewAsync` → `PostTrackingAsync` | **POST** | `{base}/api/desktop/ads/{adId}/view` (`:189`) | Header `X-API-Key` (`:194`) | literal `"{}"`, `application/json` (`:195`) | ignored — `_ = response.IsSuccessStatusCode;` (`:197`) | `catch {}` silent (`:199-201`) | none | Guarded by `adId > 0` (`:27`); nothing queued | `POST /api/desktop/ads/:adId/view` (`desktop.ts:187`) — increments `ads.view_count`, returns `{viewCount}` | **MATCH** (wire contract) — but unreachable in practice because D-03 never yields an `Id` | none | **WEB ROUTE MISSING** |
| **D-05** | `Services/DesktopAdService.cs:33` | `DesktopAdService` | `RecordAdClickAsync` → `PostTrackingAsync` | **POST** | `{base}/api/desktop/ads/{adId}/click` (`:189`) | as D-04 | as D-04 | ignored | silent | none | none | `POST /api/desktop/ads/:adId/click` (`desktop.ts:196`) — increments `ads.click_count` | **MATCH** (same caveat as D-04) | none | **WEB ROUTE MISSING** |
| **D-06** | `Services/DesktopAdService.cs:204` | `DesktopAdService` | `EnsureLocalImageAsync` | **GET** | absolute creative URL from D-03, resolved against the base URL if relative (`:100,285-310`) | none | none | raw bytes; extension from the URL or from `Content-Type` (`image/png\|jpg\|jpeg\|webp\|bmp`, `:364-383`) | non-2xx → `""` (`:230-233`); `catch` → `""` (`:246-249`) | none | 12 h disk cache (`:221-225`) survives outages | static `/uploads` (`v1/server/api/src/index.ts:75,159`) | **MATCH** | n/a (D-03 missing) | **WEB ROUTE MISSING** |
| **D-07** | `Services/DesktopNewsTickerService.cs:12` | `DesktopNewsTickerService` | `FetchTickerTextAsync` | **GET** | `{base}/api/desktop/news-ticker` (`:19,54-72`) | **none** | none | Requires root `data` **array** (`:27`); per item reads string property `text` (`:33-38`); joins with `"  •  "` (`:41`) | non-2xx → hard-coded Arabic default ticker (`:22,49-52`); `catch` → same (`:43-46`) | none; `DashboardViewModel.cs:423` fetches once per dashboard load | Always renders the built-in default string when offline (`:51`) | `GET /api/desktop/news-ticker` (`desktop.ts:165`) — returns `{data: tickers.map(t => ({text: t.text}))}` (`:172`) — **exactly the shape the desktop parses** | **WEB IMPLEMENTATION BROKEN** — the handler calls `prisma.newsTicker.findMany` (`desktop.ts:167`) and **no `NewsTicker` model exists** in `v1/server/api/prisma/schema.prisma` (only `NewsTickerItem`, `:645`, and `NewsTickerSettings`, `:664`). The route throws and returns 500 | none | **WEB ROUTE MISSING** |
| **D-08** | `Services/RadarService.cs:85` | `RadarService` | `FetchAndMatchFromWebsite` | **GET** | `{base}/api/desktop/property-requests` (`:92,203-221`) | **none sent** | none | Requires root `data` **array** (`:100-101`); per item reads `id`, `city`, **`neighborhoods`**, `propertyType\|property_type`, `minPrice\|min_price`, `maxPrice\|max_price`, `description` (`:106-115`) | non-2xx → `0` (`:95`); missing `data` → `0` (`:100`); `catch` → `0` (`:164-168`) | none; invoked once per dashboard load (`ViewModels/DashboardViewModel.cs:433`) | Matches are written to local `RadarMatches` + `DashboardAlerts` (`:133-152`) and survive offline | `GET /api/desktop/property-requests` (`desktop.ts:149`) — **requires `signature` in the query** (`:151-155`) and returns a **bare array** of `PropertyRequest` (`:161`) | **CONTRACT MISMATCH** — three independent failures: (a) the desktop sends no `signature` ⇒ 401; (b) V1 returns an array, the desktop needs `{data:[…]}`; (c) the desktop reads `neighborhoods`, the Prisma field is `neighborhood` (`schema.prisma:727`) | none | **WEB ROUTE MISSING** |
| **D-09** | `Services/OnlinePropertyService.cs:35` | `OnlinePropertyService` | `UploadDraftAsync` | **POST** | `{base}/api/desktop/properties/draft` (`:53`) | Header **`Authorization: Bearer {websiteAuthToken}`** (`:64`); aborts with an Arabic "log in first" message if the token is empty (`:40-48`) | `{property:{…}, selectedFields:string[], images:string[]}` (`:55-60`). `property` = `{title, titleAr, description, descriptionAr, price(double), currency:"SAR", type:"rent"\|"sell", category:residential\|commercial\|agricultural\|industrial\|warehouse\|land, city, cityAr, neighborhood, area, bedrooms(=RoomsCount), bathrooms:0, floor:0, propertyAge(=ConstructionStatus), facadeDirection(Arabic joined), officeName, officePhone(=Settings.WhatsAppNumber), lat:0, lng:0}` (`:122-148`). `selectedFields` are user-ticked field keys (`Views/PropertyUploadDialog.cs:182-186`) | Requires `success===true` (`:74`), then `data.draftId`, `data.propertyId` (int), `data.websiteUrl` (`:76-79`). On failure reads `error.message` (`:105-109`) | non-2xx bodies still parsed; `catch` → Arabic connection error (`:112-119`) | none | On success writes `Properties.DesktopDraftId`, `DesktopWebsiteUrl`, `IsPublishedToWebsite` locally (`:87-89`) | `POST /api/desktop/properties/draft` (`desktop.ts:122`) — **requires `signature` in the body** (`:124-128`), reads **flat** `data.title/titleAr/category/price/city/cityAr/images/tags/userId` (`:129-143`), returns the raw Prisma `Property` with **201** (`:145`) | **CONTRACT MISMATCH** — four failures: (a) the desktop sends `Bearer`, V1 wants a body `signature` ⇒ 401; (b) the desktop nests the payload under `property`, V1 reads it flat ⇒ every field would be a default; (c) V1 has no `selectedFields` concept; (d) V1 returns a bare Property, the desktop needs `{success:true, data:{draftId, propertyId, websiteUrl}}` | none | **WEB ROUTE MISSING** |
| **D-10** | `Views/WebsiteLoginDialog.cs:170` | `WebsiteLoginDialog` | `OnLogin` | **POST** | `{typed url}/api/auth/login` (`:199`) — URL typed by the office, default `http://localhost:8082` (`:167`) | none (this call *acquires* the credential) | `{email, password}` (`:196`), `application/json` | Requires root **`data`** (`:215-220`), then `data.token` (`:223-224`). On failure reads `error.message` (`:207-209`) | Non-2xx → Arabic error from `error.message`; `HttpRequestException` and generic `Exception` handled separately (`:262-271`); 15 s timeout (`:195`) | none | On success: `SecureDesktopSecretStore.SaveWebsiteAuthToken(token)` (DPAPI, `:234`), bridge `user_token` (`:240`), and if "save URL" is ticked, `akar_website_api_settings = {baseUrl, apiKey: token}` (`:244-246`) | `POST /api/auth/login` (`v1/server/api/src/index.ts:81`, `routes/auth.ts:53`) — returns **`{token, user:{…}}` at the top level** (`auth.ts:64-89`) | **CONTRACT MISMATCH** — the desktop requires `data.token`; V1 has no `data` wrapper. The dialog reports "استجابة غير متوقعة من الموقع" and **no token is ever stored**, which disables D-01, D-02, D-03, D-04, D-05, D-09 and D-11 | `POST /api/auth/login` (`cur/app/api/auth/login/route.ts:162`) — returns `{requestId, user:{…}}` and a **session cookie**; **no bearer token at all** | **CONTRACT MISMATCH** |
| **D-11** | `Services/CloudBackupSyncService.cs:97` | `CloudBackupSyncService` | `UploadPendingPackagesAsync` | **POST** | `Settings.CloudBackupUploadUrl` — free text, no path convention (`:86,88`) | Header `X-API-Key: {websiteAuthToken}` when non-empty (`:117-120`) | `multipart/form-data`: part **`backupFile`** = the ZIP, `Content-Type: application/zip`, filename `AkarBackup_{yyyyMMdd_HHmmss}.zip`; part **`createdAtUtc`** = ISO-8601 `"O"` (`:121-127`). ZIP contains `database/{AkarDB file}`, `AkarData/**` and `metadata.json` `{createdAtUtc, machineName, databaseFile, dataRoot}` (`:149-184`) | ignored | non-2xx → logged, **file stays in `pending/`** and is retried on the next cycle (`:129-133`); `catch` → logged, same (`:142-145`) | Cycle every **5 min** (`:43`); a new package is created every `Settings.CloudBackupIntervalMinutes` (default 30, `:74`); upload only when `Settings.EnableCloudBackup` (`:86`) | Durable on-disk queue at `%LOCALAPPDATA%\AkarApp\CloudSync\pending`, moved to `…\uploaded` after success (`:134-140,186-194`); log at `…\AkarApp\cloud-sync.log` (`:196-207`) | **none** — no backup-intake route exists anywhere in `v1/server/api/src/routes/` | **WEB ROUTE MISSING** | **none** | **WEB ROUTE MISSING** |
| **D-12** | `Services/OfficeApiClient.cs:35` | `OfficeApiClient` | `CompletePairingAsync` (via `PairingService.PairAsync`, `Services/PairingService.cs:10`) | **POST** | `{base}/api/office/v1/pairing/complete` (`:39`) | **Unauthenticated** — the pairing code is the credential | `CompletePairingRequest` serialized with **default `JsonSerializerOptions`** ⇒ **PascalCase** keys: `{"Code","InstallationId","DeviceName","Os","OsVersion","AppVersion","ProtocolVersion"}` (`:37,127-136`). Values: code upper-cased/trimmed, `InstallationId` = a persisted GUID `D` format (`Services/DeviceIdentityService.cs:9-19`), `DeviceName` = `Environment.MachineName`, `Os` = `"windows"`, `OsVersion` = `Environment.OSVersion.ToString()`, `AppVersion` = `Version.ToString(2)` ⇒ **`"1.0"`**, `ProtocolVersion` = 1 (`PairingService.cs:20-34`) | `CompletePairingResponse` deserialized **flat, case-insensitive**: `DeviceId, InstallationId, SponsorId, OfficeId, Status, Token, TokenPrefix, ExpiresAt` (`:46,138-148`) | non-2xx → `OfficeApiException(status, error)` where `error` is `body.error` or the first 200 chars (`:41-45,107-119`). `PairingService` maps 404/410/429/409 to Arabic messages (`:58-65`) and catches `HttpRequestException`/`TaskCanceledException` (`:68-75`) | **none**; 30 s timeout (`:17`) | On success, the token is written to DPAPI secret storage (`Services/DeviceCredentialStore.cs:10-16`) | **none** — V1 has no `/api/office` mount (`v1/server/api/src/index.ts:81-138`) | **WEB ROUTE MISSING** | `POST /api/office/v1/pairing/complete` (`cur/app/api/office/v1/pairing/complete/route.ts:9`) | **CONTRACT MISMATCH** — two independent, each-fatal defects: (a) the route reads `body.code`, `body.installationId`, … (`:16,32-37`) and JavaScript property access is case-sensitive, so the desktop's PascalCase body yields `code === ""` ⇒ **400 `code required`**; (b) even on success the route returns **`{device:{…}}`** (`:42`) while the desktop deserializes the response **flat** (`OfficeApiClient.cs:46`) ⇒ `Token` is `""` ⇒ `PairingService` reports "لم يتم استلام رمز مصادقة من الخادم" (`:38-41`) |
| **D-13** | `Services/OfficeApiClient.cs:49` | `OfficeApiClient` | `HeartbeatAsync` | **POST** | `{base}/api/office/v1/auth?action=heartbeat` (`:51`) | `Authorization: Bearer {deviceToken}` (`:52`) | **no body, no `Content-Type`** | `bool` from `IsSuccessStatusCode` (`:54`) | none — exceptions propagate to `PairingService.SendHeartbeatAsync`, which catches all (`Services/PairingService.cs:91-94`) | none | none | **none** | **WEB ROUTE MISSING** | `POST /api/office/v1/auth` (`cur/app/api/office/v1/auth/route.ts:8`) — `action !== "rotate"` falls through to heartbeat (`:12-24,26-38`); the missing body is tolerated (`req.json()` throws → `meta = {}`, `:28-32`) | **MATCH** — but **`PairingService.SendHeartbeatAsync` has no caller anywhere in the tree**, so this never executes |
| **D-14** | `Services/OfficeApiClient.cs:57` | `OfficeApiClient` | `HeartbeatDetailAsync` | **POST** | same as D-13 | `Authorization: Bearer`, **`x-protocol-version: 1`**, **`x-app-version: {InformationalVersion}`** = `"1.0.0"` (`:60-62`, `AssemblyInfo.cs:15`) | none | `HeartbeatResult {Authenticated, DeviceId, Status, ServerTime, ProtocolVersion, ProtocolStatus, AppVersionStatus, CredentialExpiresAt}` (`:68,157-167`) | non-2xx → `null` (`:64`); deserialization failure → `null` (`:66-71`) | none | none | **none** | **WEB ROUTE MISSING** | as D-13; the V2 heartbeat returns exactly those 8 camelCase fields (`cur/lib/integration/device.ts`) | **PARTIAL MATCH** — the DTO aligns, but `x-app-version: 1.0.0` has minor `0 < 2`, so `checkProtocolVersion` returns `UPDATE_RECOMMENDED` on **every** request (`cur/lib/integration/constants.ts:97-99`). The method also has **no caller** |
| **D-15** | `Services/OfficeApiClient.cs:74` | `OfficeApiClient` | `RotateTokenAsync` | **POST** | `{base}/api/office/v1/auth?action=rotate` (`:76`) | `Authorization: Bearer {deviceToken}` (`:77`) | no body | `RotateTokenResponse {Token, TokenPrefix, ExpiresAt}` (`:84,150-155`) | non-2xx → `OfficeApiException` (`:80-83`) | none | none | **none** | **WEB ROUTE MISSING** | `POST /api/office/v1/auth?action=rotate` (`cur/app/api/office/v1/auth/route.ts:15-24`) — returns `{token, tokenPrefix, expiresAt}`, matched case-insensitively | **MATCH** — but the method has **no caller**; credentials expire after 90 days with nothing to renew them |
| **D-16** | `Views/AkarV2PortalWindow.cs:196` | `AkarV2PortalWindow` | `Window_Loaded` → `NavigateLocalWebUi` | **GET** (browser navigation) | Prefers `https://akarapp.local/index.html` via `SetVirtualHostNameToFolderMapping("akarapp.local", {BaseDir}/webui)` (`:323,329`), else `file://` on `{BaseDir}/webui/index.html` (`:333`); if `webui/index.html` is absent, navigates `_url` — hard-coded to **`http://localhost:1420/`** at `MainWindow.cs:285` | none | none | HTML | Navigation failure raises an Arabic MessageBox and writes `%LOCALAPPDATA%\AkarApp\webview.log` (`:110-122`); JS errors, unhandled rejections and `console.error` are forwarded via `postMessage` by an injected hook (`:680`) | none | Fully local when `webui/` ships | n/a (local UI) | **MATCH** — no web route required; note the `localhost:1420` dev-server fallback is a shipped defect | n/a | **MATCH** |
| **D-17** | `ViewModels/PropertiesViewModel.cs:386` | `PropertiesViewModel` | `ResolveFullWebsiteUrl` (used by `GetWebsiteLink`, `ShareWhatsApp`, `ShareFacebook`, and `Views/PropertyUploadDialog.cs:230-247`) | **GET** (browser navigation / clipboard) | `{base}/#/{Properties.DesktopWebsiteUrl}` (`:401,410`) | none | none | HTML | `catch {}` (`:424`) | none | Requires `DesktopWebsiteUrl`, which only D-09 can populate | V1 SPA routes are **path-based** — `src/App.tsx:1` imports `wouter`'s `Switch`/`Route`, not a hash router | **CONTRACT MISMATCH** — a `/#/…` URL lands on `/` and the fragment is ignored | V2 is Next.js App Router (`cur/app/**`), also path-based | **CONTRACT MISMATCH** |
| **D-18** | `ViewModels/PropertiesViewModel.cs:442,460`; `ViewModels/SocialMediaViewModel.cs:240,244,258,267,284`; `ViewModels/DashboardViewModel.cs:406`; `Views/WhatsAppReminderDialog.cs:47`; `Services/BackgroundServices.cs:74` | several | share / reminder launchers | **GET** (shell-launched) | `https://wa.me/{number}?text=…`, `https://www.facebook.com/sharer/sharer.php?u=…`, `https://twitter.com/intent/tweet?text=…`, `https://www.instagram.com` | none | query string | n/a | `catch {}` | none | Requires a browser | third-party | **MATCH** — no Akar web contract required | third-party | **MATCH** |

### 2.1 Cross-cutting observations (desktop → web)

1. **Three unrelated credentials coexist in one product.**
   (a) `websiteAuthToken` — a JWT obtained from `/api/auth/login`, stored DPAPI-encrypted
   (`Services/SecureDesktopSecretStore.cs:18-29,78-90`), sent as `Bearer` on D-09, as **`X-API-Key`**
   on D-03/D-04/D-05/D-11, and as a **query parameter** on D-01/D-02. The same secret is transported
   three different ways.
   (b) `officeDeviceToken` — the V2 `apd_…` credential (`Services/DeviceCredentialStore.cs:5-16`).
   (c) `LicenseKey`/`RegisteredHWID` — the local activation pair, never transmitted (§4.1).
2. **The V2 pairing stack is present but unreachable end-to-end.** `PairDevice` is exposed to the
   WebView UI (`Services/BridgeHostObject.cs:26-29`), but `SendHeartbeatAsync`, `HeartbeatDetailAsync`,
   `RotateTokenAsync` and `WebViewBridgeService.GetConnectionState` have **no caller anywhere** —
   `GetConnectionState` is not even on the host object (`BridgeHostObject.cs:16-44`).
3. **The whole `/api/desktop/*` family is gated on D-10 succeeding**, and D-10 cannot succeed against
   either V1 or V2. The desktop's online surface is dead from the first screen.
4. **No idempotency, no retry-with-backoff, no circuit breaker anywhere.** The only durable queue is
   the cloud-backup `pending/` directory (D-11). Every other failure is swallowed and forgotten.
5. **No `If-Modified-Since`, `ETag`, cursor or `since` parameter on any read.** The desktop cannot
   do incremental pull; there is no inbound change feed at all.
6. **`AdCampaigns` and `AdImpressions` are unused by the shipped ad path** (`DesktopAdService.cs`
   touches neither). Ad state lives in a filesystem cache, so campaign history is not queryable.

---

## 3. Web → Desktop tables

### 3.1 V1 — every `/api/desktop/*` endpoint, plus adjacent licence/API-key routes

Mount: `app.use("/api/desktop", desktopRouter)` (`v1/server/api/src/index.ts:91`).
Signature gate: `verifySignature(sig) => sig === process.env.DESKTOP_SIGNATURE`, and the module
**throws at import time** if the variable is unset (`desktop.ts:6-14`).

| # | Route | Verb | Auth / scope | Request | Response | Desktop caller? | V1 status | Notes |
|---|---|---|---|---|---|---|---|---|
| V1W-01 | `/api/desktop/version` (`desktop.ts:16`) | GET | **none** | none | `{version, minVersion, forceUpdate, downloadUrl, releaseNotes, releasedAt}` from `DesktopVersion` (`schema.prisma:892`), else a hard-coded `2.0.0`/`1.5.0` fallback (`:31-38`) | **NONE** | `PARTIAL MATCH` | The desktop has no updater; `/download` also redirects here (`index.ts:140`) |
| V1W-02 | `/api/desktop/subscription-status` (`:43`) | GET | query `signature` + JWT `userToken` (`:45-62`) | `?signature=&userToken=` | `{data:{expiry_date, renewal_url:"/api/plans", message, trial_days, expired, active}}` | **D-01** | `PARTIAL MATCH` | Field-perfect against `ParseStatus`. `renewal_url` is a *relative* path; `SubscriptionStatus.RenewalUrl` is surfaced to the WebUI verbatim (`AkarV2PortalWindow.cs:453`) and would not resolve |
| V1W-03 | `/api/desktop/sync` (`:85`) | POST | body `signature` + JWT `userToken` (`:87-100`) | `{signature, userToken, action}` | same 6-field `data` envelope; writes `ActivityLog{action:"desktop_sync_"+action}` (`:106-108`) | **D-02** | `PARTIAL MATCH` | `action` is logged but never branched on — `GET_SUBSCRIPTION_STATUS`, `GET_UPDATES` and anything else return the same body |
| V1W-04 | `/api/desktop/properties/draft` (`:122`) | POST | body `signature` only (`:124-128`) | flat `{title, titleAr, category, price, city, cityAr, images[], tags[], userId}` | raw Prisma `Property`, 201 | **D-09** | `CONTRACT MISMATCH` | `userId` defaults to **`1`** when absent (`:141`) — every desktop draft would be attributed to user 1. No ownership check, no office linkage |
| V1W-05 | `/api/desktop/property-requests` (`:149`) | GET | query `signature` (`:151-155`) | none | **bare array** of up to 50 `PropertyRequest` rows with `status:"open"` (`:156-161`) | **D-08** | `CONTRACT MISMATCH` | Desktop needs `{data:[…]}` and reads `neighborhoods`; the model field is `neighborhood` (`schema.prisma:727`) |
| V1W-06 | `/api/desktop/news-ticker` (`:165`) | GET | **none** | none | `{data:[{text}]}` (`:172`) | **D-07** | `WEB IMPLEMENTATION BROKEN` | `prisma.newsTicker` does not exist — the schema has `NewsTickerItem` (`:645`) and `NewsTickerSettings` (`:664`) only. 500 on every call |
| V1W-07 | `/api/desktop/ads/placement/:zone` (`:176`) | GET | **none** | path `zone` | bare `Ad` row or `null` (`:183`) | **D-03** | `CONTRACT MISMATCH` | Desktop requires a root `ad` wrapper. `Ad.desktopZone` (`schema.prisma:566`) is the right column; the vocabulary is free text so `desktop_portal_bottom_banner` is storable |
| V1W-08 | `/api/desktop/ads/:adId/view` (`:187`) | POST | **none** | path `adId` | `{viewCount}` | **D-04** | `MATCH` | Unauthenticated counter increment — trivially inflatable |
| V1W-09 | `/api/desktop/ads/:adId/click` (`:196`) | POST | **none** | path `adId` | `{clickCount}` | **D-05** | `MATCH` | Same |
| V1W-10 | `/api/desktop/license/validate` (`:205`) | POST | **none** | `{key, hwid}` | `{valid, status, expiresAt, type}`; statuses `active` / `expired` / `hwid_mismatch` / `license.status` | **NONE** | `PARTIAL MATCH` | **Trust-on-first-use HWID binding** (`:224-226`): the first caller to present a key claims it. This is the closest thing V1 has to device activation and the desktop never calls it |
| V1W-11 | `/api/desktop/license/reset-hwid` (`:231`) | POST | **none** | `{key}` | `{success:true}` | **NONE** | `PARTIAL MATCH` | Unauthenticated HWID unbinding — anyone holding a key can move a licence to a new machine at will |
| V1W-12 | `/api/desktop/sync/ads` (`:242`) | GET | **none** | none | full `Ad[]` where `isActive` | **NONE** | `PARTIAL MATCH` | Leaks the entire ad table including advertiser name/email/phone and price (`schema.prisma:556-563`) |
| V1W-13 | `/api/desktop/sync/notifications` (`:252`) | GET | **none** | none | `{notifications:[], count:0}` — hard-coded | **NONE** | `WEB IMPLEMENTATION BROKEN` | Stub |
| V1W-14 | `/api/desktop/sync/ack` (`:258`) | POST | **none** | ignored | `{success:true}` | **NONE** | `WEB IMPLEMENTATION BROKEN` | Stub; nothing is acknowledged |
| V1W-15 | `/api/desktop/sync/batch` (`:264`) | POST | **none** | `{operations:[{action,…}]}` | `{success:true, results:[{operation, status:"ok"}]}` (`:268-273`) | **NONE** | `WEB IMPLEMENTATION BROKEN` | **Reports success for every operation and persists nothing.** This is the only route shaped like `CloudSyncQueue`; it is a façade |
| V1W-16 | `/api/desktop/free-trial-license` (`:277`) | POST | **none** | none | a new `SoftwareLicense` `{key:"TRIAL-…", type:"trial", status:"active", expiresAt:+30d}` | **NONE** | `PARTIAL MATCH` | Unauthenticated, unrate-limited licence minting |
| V1W-17 | `/api/desktop/setup` (`:289`) | GET | none | none | 302 → `/api/desktop/version` | **NONE** | `MATCH` | |
| V1W-18 | `/api/licenses` (`routes/licenses.ts:18`) | POST | `requireAuth` | `{type, durationDays, notes}` | `SoftwareLicense`, 201 | **NONE** | `PARTIAL MATCH` | Key format `XXXX-XXXX-XXXX-XXXX` from `A-Z0-9` (`:7-16`) — **not** the desktop's `5×4` `LicenseService` format (§4.1) |
| V1W-19 | `/api/licenses/validate` (`:38`) | POST | **none** | `{key}` | `{valid, license}` / `{valid:false, expired:true, license}` | **NONE** | `PARTIAL MATCH` | Returns the **entire licence row** including `userId` and `notes` to an unauthenticated caller. No HWID dimension, unlike V1W-10 |
| V1W-20 | `/api/licenses/redeem` (`:53`) | POST | **none** | `{code, userId}` | `{success, license}` | **NONE** | `PARTIAL MATCH` | Caller supplies `userId` — a licence can be redeemed onto any account |
| V1W-21 | `/api/licenses/codes/redeem` (`:79`) | POST | **none** | as V1W-20 | as V1W-20 | **NONE** | `PARTIAL MATCH` | Byte-identical duplicate of V1W-20 |
| V1W-22 | `/api/auth/api-key` (`routes/auth.ts:469`) | GET | `requireAuth` | none | `{exists:true, message}` if a key exists, else `{apiKey:"akr_"+64hex, _shown_once:true}` and stores `sha256` | **NONE** | `CONTRACT MISMATCH` | The consumer (`v1/src/pages/Dashboard.tsx:59`) expects `{hasApiKey, maskedKey}` — neither field is ever returned. **And no V1 route validates `X-API-Key` anywhere**, so the key the desktop sends on D-03/D-04/D-05/D-11 has no verifier |
| V1W-23 | `/api/auth/api-key` (`auth.ts:481`) | POST | `requireAuth` | none | `{apiKey:"akr_"+64hex, _shown_once:true}` | **NONE** | `PARTIAL MATCH` | Regenerates unconditionally; no revocation list, no scopes, no expiry |
| V1W-24 | 10 advertised endpoints: `GET /api/desktop/me`, `GET/POST /api/desktop/properties`, `PUT/DELETE /api/desktop/properties/:desktopId`, `PATCH /api/desktop/properties/:desktopId/status`, `GET /api/desktop/inquiries`, `PATCH /api/desktop/inquiries/:id/read`, `GET /api/desktop/property-requests`, `GET /api/desktop/stats` (`v1/src/pages/Dashboard.tsx:329-339`) | — | documented as `X-API-Key` | — | — | **NONE** | `WEB ROUTE MISSING` | The V1 dashboard shows office users a complete desktop-integration API spec. **Nine of the ten do not exist** in `desktop.ts` (only `/property-requests` does, and with a different auth). This is the clearest statement anywhere of the *intended* contract: an `X-API-Key`-authenticated, desktop-id-keyed property CRUD plus inquiries and stats |

### 3.2 V2 — every `app/api/office/v1/*` route, plus adjacent office routes

Route inventory and verbs re-verified in this pass. Defect analyses for W-16, W-18…W-23 and W-27 are
carried forward from the superseded matrix (§1.5 note 5).

| # | Route | Verb | Auth / scope | Request | Response | Desktop caller? (C#-verified) | V2 status |
|---|---|---|---|---|---|---|---|
| W-01 | `/api/office/v1/pairing` (`cur/app/api/office/v1/pairing/route.ts:10`) | GET | Sponsor session + `OFFICE_INTEGRATION_VIEW` | none | `{codes:[…]}` | NONE (sponsor-facing by design) | `MATCH` |
| W-02 | `/api/office/v1/pairing` (`:20`) | POST | Sponsor session + `OFFICE_PAIRING_MANAGE` | `{officeId?}` | `{code, expiresAt}` — 6 chars, 15 min TTL, stored as `sha256Hex` | NONE (by design) | `MATCH` |
| W-03 | `/api/office/v1/pairing?id=` (`:37`) | DELETE | Sponsor session + `OFFICE_PAIRING_MANAGE` | query `id` | `{ok:true}` | NONE | `PARTIAL MATCH` — no UI control invokes it |
| W-04 | `/api/office/v1/pairing/complete` (`complete/route.ts:9`) | POST | unauthenticated, IP rate-limited (`:10`) | `{code, installationId, deviceName, model, os, osVersion, appVersion, protocolVersion}` — **camelCase** | 201 `{device:{deviceId, installationId, sponsorId, officeId, status, token:"apd_"+64hex, tokenPrefix, expiresAt}}` (`:42`) | **YES — `Services/OfficeApiClient.cs:39`** | `CONTRACT MISMATCH` — PascalCase request body ⇒ 400; `{device:…}` envelope vs flat DTO ⇒ empty token. See D-12 |
| W-05 | `/api/office/v1/auth` (`auth/route.ts:8`) | POST | `Bearer apd_…` | body or headers `appVersion`/`osVersion`/`protocolVersion` | `{authenticated, deviceId, status, serverTime, protocolVersion, protocolStatus, appVersionStatus, credentialExpiresAt}` | **YES — `OfficeApiClient.cs:51,59`** (both call paths dead) | `PARTIAL MATCH` |
| W-06 | `/api/office/v1/auth?action=rotate` (`:15`) | POST | `Bearer apd_…` | none | `{token, tokenPrefix, expiresAt}` | **YES — `OfficeApiClient.cs:76`** (dead code) | `PARTIAL MATCH` |
| W-07 | `/api/office/v1/devices` (`devices/route.ts:9`) | GET | Sponsor session + `OFFICE_DEVICES_MANAGE` | query `status?` | `{devices:[…]}` | NONE (by design) | `MATCH` |
| W-08 | `/api/office/v1/devices` (`:20`) | PATCH | Sponsor session + `OFFICE_DEVICES_REVOKE` | `{deviceId, action:"revoke", reason?}` | `{ok:true}` | NONE (by design) | `MATCH` |
| W-09 | `/api/office/v1/news` (`news/route.ts:7`) | GET | `Bearer` + `office.news.read` | `country`,`city?`,`limit`,`view` | `{news:[…]}` / `{items:[…]}` | NONE — the desktop reads `/api/desktop/news-ticker` (D-07) with `{data:[{text}]}` | `CONTRACT MISMATCH` |
| W-10 | `/api/office/v1/news` (`:41`) | POST | `Bearer` + `office.news.read` (a read scope gating a write) | `{newsId}` | `{ok:true}` | NONE | `PARTIAL MATCH` |
| W-11 | `/api/office/v1/ads` (`ads/route.ts:15`) | GET | `Bearer` + `office.ads.read` | `country`,`placement`∈5 `office_*`,`device`,`locale`,`limit`,`region?`,`city?` | `{ads:[…], placement, channel:"office"}` | NONE — the desktop asks for `desktop_portal_bottom_banner` (`DesktopAdService.cs:16`), which is not in the vocabulary ⇒ 400 | `CONTRACT MISMATCH` |
| W-12 | `/api/office/v1/ads` (`:56`) | POST | `Bearer` + `office.ads.read` | `{campaignId, eventType, placement, token?, dedupKey?, …}` | `{recorded}` | NONE — the desktop posts `/api/desktop/ads/{id}/{view\|click}` with body `{}` | `CONTRACT MISMATCH` |
| W-13 | `/api/office/v1/notifications` (`notifications/route.ts:7`) | GET | `Bearer` + `office.notifications.read` | `view`,`status?` | `{deliveries:[…]}` / `{rules:[…]}` | NONE | `PARTIAL MATCH` — read-only, no ack/rule write |
| W-14 | `/api/office/v1/radar` (`radar/route.ts:9`) | GET | `Bearer` + `office.radar.read` | none | `{queries:[…]}` | NONE | `PARTIAL MATCH` |
| W-15 | `/api/office/v1/radar` (`:19`) | POST | `Bearer` + `office.radar.read` | `{latitude, longitude, radiusKm?, kind?, countryCode?, filters?}` | `{queryId, targets:[…distanceKm…]}` | NONE — the desktop radar has no coordinates (§6.3) | `CONTRACT MISMATCH` |
| W-16 | `/api/office/v1/stream` (`stream/route.ts:7`) | GET | `Bearer`, **no scope check** | `Last-Event-ID` | `text/event-stream` | NONE — no SSE/EventSource client exists in the C# tree | `WEB IMPLEMENTATION BROKEN` |
| W-17 | `/api/office/v1/sync` (`sync/route.ts:29`) | POST | `Bearer` + `office.sync` | `{items:[{operationType, entityId, payload, clientUpdatedAt, idempotencyKey}]}` | `{accepted, conflicts, duplicates, items:[…]}` | NONE — `CloudSyncQueue` has no idempotency key (§6.5) | `PARTIAL MATCH` |
| W-18 | `/api/office/v1/sync?action=retry` (`:29`) | POST | `Bearer` + `office.sync` | none | `{requeued}` | NONE | `WEB IMPLEMENTATION BROKEN` |
| W-19 | `/api/office/v1/sync?action=dead-letter` (`:29`) | POST | `Bearer` + `office.sync` | none | `{deadLettered}` | NONE | `WEB IMPLEMENTATION BROKEN` |
| W-20 | `/api/office/v1/sync` (`:79`) | GET | `Bearer` + `office.sync` | `sinceId?`,`limit?` | `{items:[…]}` — the device's own push log, not a change feed | NONE | `WEB IMPLEMENTATION BROKEN` |
| W-21 | `/api/office/v1/sync?action=operations` (`:79`) | GET | `Bearer` + `office.sync` | none | `{operations:[…]}` | NONE | `PARTIAL MATCH` |
| W-22 | `/api/office/v1/media` (`media/route.ts:56`) | POST | `Bearer` + `office.properties.read` (a read scope gating writes) | multipart | intended `{success, data}` | NONE | `WEB IMPLEMENTATION BROKEN` — 400 on every request |
| W-23 | `/api/office/v1/media` (`:299`) | GET | `Bearer` + `office.properties.read` | path segments | intended `{success, data}` | NONE | `WEB IMPLEMENTATION BROKEN` |
| W-24 | `/api/office-links` (`cur/app/api/office-links/route.ts:12,26,38,56`) | GET/POST/PATCH/DELETE | Session + `ADVERTISERS_VIEW` / `OFFICE_LINK` / `OFFICE_UNLINK` | — | — | NONE (no device-facing route) | `PARTIAL MATCH` — the legacy `license_key`-keyed link, the one scheme structurally close to the desktop's licence model |
| W-25 | `/api/office/profile` | GET/PATCH | Session | — | — | NONE | `MATCH` |
| W-26 | `/api/office/branches` | GET/POST/PATCH/DELETE | Session | — | — | NONE (the desktop has its own `Branches` table) | `MATCH` |
| W-27 | `/api/office/portfolio` | GET/POST | Session + active `organization_members` | — | `GET` always `[]`; `POST` fabricates a response | NONE | `WEB IMPLEMENTATION BROKEN` |
| W-28 | `/api/admin/integration-overview` | GET | Sponsor session + `OFFICE_ADMIN_VIEW` | — | — | NONE (by design) | `MATCH` |

---

## 4. Authentication, pairing, activation and licensing protocol

### 4.1 Desktop scheme (i) — local activation: HWID + derived licence key

**HWID.** Two independent generators ship in the same binary:

- `Services/HwidGenerator.cs:10-24` — `MD5(ProcessorId + "-" + BaseBoard.SerialNumber + "-" + DiskDrive.SerialNumber)`, upper-cased hex; on WMI failure falls back to `MD5(MachineName + UserName)`.
- `Security/SecurityManager.cs:7-31` — `SHA256(ProcessorId + "-" + BaseBoard.SerialNumber)`, upper-cased hex; on failure returns the literal `"DEMO-HWID-001"`.

Only the first is used by `LicenseService.GetCurrentHwid()` (`Services/LicenseService.cs:41-44`) and by
`ActivationViewModel` (`ViewModels/ActivationViewModel.cs:56`). `SecurityManager.GenerateHWID` has no
caller. **The two produce different values for the same machine** — a latent hazard if either is ever
wired to the other's consumer.

**Licence key.** `LicenseService.GenerateKeyForHwid` (`:13-26`):
`SHA256(HWID.Trim().ToUpper() + "AKAR_REAL_ESTATE_2026_ZK")` → hex → first 20 chars → five
4-character groups joined by `-`. Validation is a string comparison of the dash-stripped forms
(`:28-39`). **The salt is a compile-time constant (`:11,20`), so the key generator and the validator
are the same function — any copy of the binary can mint a valid key for any HWID.** The product even
ships the generator UI: `Views/KeyGeneratorWindow.cs`, opened from the portal with
**Ctrl+Shift+6** (`Views/AkarV2PortalWindow.cs:98-103`).

**Activation-code (coupon) format.** `LicenseService.GenerateActivationCode` (`:51-65`):
`base64url(JSON{Hwid, ExpiryUtc, IssuedAtUtc, RenewalUrl, Note}) + "." + base64url(HMACSHA256(payload, "AKAR_REAL_ESTATE_2026_ZK"))`.
`TryDecodeActivationCode` (`:67-112`) verifies with `CryptographicOperations.FixedTimeEquals`, allows
`Hwid == "*"` as a wildcard, and requires a non-default `ExpiryUtc`. Same shared constant ⇒ same
forgeability property.

**Throttle.** `Services/ActivationThrottle.cs:8-10` — max 5 attempts per 15 min, then a 30-minute
block. **Process-memory only** (`:12-13`), so restarting the app clears it.

**Offline licence record.** `Services/OfflineLicenseService.cs`:
- File `offline_subscription.lic` under the data root, DPAPI `CurrentUser` with entropy
  `"AKAR_OFFLINE_LICENSE_2026|" + HWID` (`:138-151,368-385`).
- Registry shadow `HKCU\Software\AkarApp\OfflineLicense\ShadowState`, same protection (`:387-419`).
- Anti-tamper: HWID rebind detection (`:251-258`), shadow-vs-file rollback detection with a
  1-minute tolerance (`:20,262-275`), wall-clock rollback detection (`:276-283`), and
  corrupted-file → immediate expiry with `Source="corrupted"` (`:352-365`).
- Record fields: `Hwid, ExpiryUtcTicks, CreatedAtUtcTicks, LastValidatedUtcTicks, IsTrial, Source, RenewalUrl, StatusNote` (`Services/OfflineLicenseRecord.cs`).
- `Source` vocabulary: `coupon` / `server` / `trial` / `local` / `pending` / `corrupted` / `coupon-error` (`:131,202,227,248,320,362,95`).
- **Expiry never shrinks**: a stored expiry later than the server's is kept (`:115-122,187-194`).
- Startup uses the offline record and skips the server entirely when it is valid and untampered
  (`:60-69`); post-login always refreshes and will create a 30-day trial if no record exists (`:71-80,169-172`).

### 4.2 Desktop scheme (ii) — website session token

Acquired by `Views/WebsiteLoginDialog.cs:199` (`POST {url}/api/auth/login`), read back from three
sources in priority order — DPAPI secret store, bridge `user_token`, `akar_website_api_settings.apiKey`
(`Services/OfflineLicenseService.cs:22-58`) — and mirrored into the DPAPI store whenever the WebUI
writes either bridge key (`Services/WebViewBridgeService.cs:277-302`). Transported as `Bearer`,
`X-API-Key` **and** a `userToken` query parameter depending on the service (§2.1).

### 4.3 Desktop scheme (iii) — V2 device pairing (present, unreachable)

`installationId` is a **random GUID** persisted in the DPAPI secret store under
`office_installation_id` (`Services/DeviceIdentityService.cs:7-19`) — **not** the HWID. Pairing is
`PairingService.PairAsync(code)` → `OfficeApiClient.CompletePairingAsync` → credential saved under
`office_device_token` / `office_device_id` / `office_device_token_prefix` /
`office_device_token_expires` (`Services/DeviceCredentialStore.cs:5-16`). Exposed to the WebUI as
`akarBridge.PairDevice(code)` → `{success, deviceId, expiresAt, error}` JSON
(`Services/WebViewBridgeService.cs:61-78`).

### 4.4 The V1 server scheme

Three unrelated mechanisms:

1. **`DESKTOP_SIGNATURE` shared secret** — a single process-wide constant compared by string equality
   (`desktop.ts:6-14`). Gates `/subscription-status`, `/sync`, `/properties/draft`,
   `/property-requests`. **The checked-in value is
   `09ACD5F39D33791E92C37D37139F6C8E79835F8309C92D058DFC80082CB26D53BB3C28E36B574BD3EEDB74D54D208513`
   (`v1/server/.env:6`), a 96-hex-char string. The desktop sends the literal
   `Akar_ProMax_2026_Secure_Key` (`Services/SubscriptionService.cs:12`).** Unless the production
   deployment overrode the variable with the desktop's literal, **every signature-gated V1 desktop
   endpoint returns 401 to the shipped desktop.** This single mismatch invalidates D-01, D-02, D-08 and D-09.
2. **JWT `userToken`** — `jwt.verify(userToken, process.env.JWT_SECRET)` → `decoded.id`
   (`desktop.ts:56-58,94-96`). This is the ordinary user session token from `/api/auth/login`
   (`routes/auth.ts:63`), not a device credential. No expiry-independent device binding.
3. **`SoftwareLicense.key` + `hwid`** — TOFU binding on first validate (`desktop.ts:220-226`),
   unauthenticated unbinding (`:231-240`), unauthenticated trial minting (`:277-287`). Key format
   `XXXX-XXXX-XXXX-XXXX` (`routes/licenses.ts:7-16`) — **incompatible with the desktop's 5×4
   `LicenseService` format**, and derived from `crypto.random`, not from the HWID, so
   `LicenseService.ValidateKey` would reject any V1-issued key.
4. **`users.apiKey`** — `akr_` + 64 hex, SHA-256 at rest (`routes/auth.ts:475-478`). **No route in V1
   validates it.** It is the intended carrier for the 10 advertised endpoints (V1W-24).

### 4.5 The V2 pairing scheme

Unchanged from the superseded matrix and re-verified here: 6-character single-use code from
`ABCDEFGHJKLMNPQRSTUVWXYZ23456789`, 15-minute TTL, stored as `sha256Hex`; `POST /pairing/complete`
mints `apd_` + 64 hex with 8 scopes and a 90-day TTL; `Authorization: Bearer` on every call;
`?action=rotate` rotates; `PATCH /devices` revokes; protocol gate
`OFFICE_PROTOCOL_VERSION=1`, `MIN_SUPPORTED_APP_VERSION=1.0.0`, `RECOMMENDED_APP_VERSION=1.2.0`
(`cur/lib/integration/constants.ts:81-101`, applied at `cur/lib/integration/office-auth.ts:17-31`
and `cur/app/api/office/v1/pairing/complete/route.ts:19-27`).

### 4.6 Exact points of incompatibility

| # | Incompatibility | Evidence | Consequence |
|---|---|---|---|
| **I-1** | Login envelope: desktop requires `data.token`; V1 returns `{token, user}`; V2 returns `{requestId, user}` + cookie, no token | `Views/WebsiteLoginDialog.cs:215-224` vs `v1/server/api/src/routes/auth.ts:64-89` vs `cur/app/api/auth/login/route.ts:162-179` | **No credential is ever acquired.** Every online desktop feature is dead |
| **I-2** | `signature` constant: `Akar_ProMax_2026_Secure_Key` vs `DESKTOP_SIGNATURE` env value | `Services/SubscriptionService.cs:12` vs `v1/server/.env:6`, `desktop.ts:12-14` | 401 on the four signature-gated V1 routes |
| **I-3** | JSON casing: desktop pairing request is PascalCase; V2 reads camelCase | `Services/OfficeApiClient.cs:37,127-136` vs `cur/app/api/office/v1/pairing/complete/route.ts:16,32-37` | 400 `code required` |
| **I-4** | Response envelope: V2 pairing returns `{device:{…}}`; desktop deserializes flat | `cur/…/pairing/complete/route.ts:42` vs `Services/OfficeApiClient.cs:46,138-148` | Empty token even on a 201 |
| **I-5** | Ad envelope: desktop requires root `{ad:…}`; V1 returns the row | `Services/DesktopAdService.cs:118-123` vs `desktop.ts:183` | Banner never renders |
| **I-6** | Radar envelope + field name: desktop requires `{data:[…]}` and `neighborhoods`; V1 returns an array with `neighborhood` | `Services/RadarService.cs:100,110` vs `desktop.ts:161`, `schema.prisma:727` | Zero website matches, always |
| **I-7** | Draft envelope + nesting + auth: desktop sends `Bearer` + `{property:{…}}` and needs `{success, data:{draftId, propertyId, websiteUrl}}`; V1 wants a body `signature` + flat fields and returns a raw row | `Services/OnlinePropertyService.cs:53-80` vs `desktop.ts:122-146` | Publish-to-website cannot succeed |
| **I-8** | Credential model: desktop `installationId` is a random GUID, not the HWID; V1 binds licences to the HWID; V2 binds devices to `installation_id` | `Services/DeviceIdentityService.cs:16` vs `desktop.ts:220-226` vs `cur/lib/integration/schema.ts:352` | Three device identities that cannot be reconciled |
| **I-9** | Licence-key algebra: desktop keys are `SHA256(HWID+salt)`-derived and self-verifying offline; V1 keys are random and DB-verified | `Services/LicenseService.cs:13-39` vs `v1/…/licenses.ts:7-16` | A V1-issued key can never activate the desktop |
| **I-10** | Version reporting: `AssemblyInformationalVersion` is `1.0.0` while `csproj` says `1.2.0`; V2 wants minor ≥ 2 | `AssemblyInfo.cs:13-15`, `AkarApp.csproj:9,14` vs `cur/lib/integration/constants.ts:97-99` | Every V2 request is classified `UPDATE_RECOMMENDED` |
| **I-11** | Credential transport: the same JWT is sent as `Bearer`, as `X-API-Key`, and as a query parameter | `OnlinePropertyService.cs:64`, `DesktopAdService.cs:77`, `SubscriptionService.cs:62` | No server can validate all three; secrets end up in query strings and access logs |
| **I-12** | Deep links use a hash router (`/#/`) against two path-routed SPAs | `ViewModels/PropertiesViewModel.cs:401,410` vs `v1/src/App.tsx:1`, `cur/app/**` | Shared property links land on the home page |
| **I-13** | Default base URL disagrees inside the desktop itself (`:8080` vs `:8082`) | `SubscriptionService.cs:31`, `DesktopAdService.cs:334` vs six other services | With no configuration, subscription/ads and everything else talk to different hosts |
| **I-14** | Sync vocabulary: V2 accepts only `property.upsert`/`property.delete`; `CloudSyncQueue.TableName` is any table; V1's `/sync/batch` accepts anything and stores nothing | `cur/lib/integration/constants.ts:67-68`, `AkarDB.sqlite CloudSyncQueue`, `desktop.ts:264-275` | No table other than properties has a destination in any version |

---

## 5. WebView2 bridge and portal contract

### 5.1 Host object `akarBridge`

Registered with `AddHostObjectToScript("akarBridge", new BridgeHostObject(_bridge))`
(`Views/AkarV2PortalWindow.cs:365`). `BridgeHostObject` is `[ComVisible(true)]`,
`ClassInterfaceType.AutoDual` (`Services/BridgeHostObject.cs:5-7`). Synchronous access from JS:
`window.chrome.webview.hostObjects.sync.akarBridge`.

| JS call | C# | Returns | Notes |
|---|---|---|---|
| `GetAllData()` | `BridgeHostObject.cs:16` → `WebViewBridgeService.GetAllDataJson():153-177` | JSON map `{filenameWithoutExt: fileContents}` over every `*.json` in the data root | Used by the injected init script to rehydrate `localStorage` |
| `GetInstallationId()` | `:21` → `DeviceIdentityService.GetInstallationId()` | GUID string | Creates and persists on first call |
| `PairDevice(code)` | `:26` → `WebViewBridgeService.cs:61-78` → `PairingService.PairAsync` | `{success, deviceId, expiresAt, error}` | **Blocking** — `.GetAwaiter().GetResult()` on a sync host object; a 30 s HTTP timeout freezes the UI thread |
| `HasDeviceCredential()` | `:31` | `bool` | |
| `GetDeviceStatus()` | `:36` → `WebViewBridgeService.cs:85-94` | `{paired:false}` or `{paired:true, deviceId}` | |
| `DisconnectDevice()` | `:41` | void | Clears the four credential secrets |

**Not exposed:** `WebViewBridgeService.GetConnectionState()` (`:96-116`), which returns
`{state:"UNPAIRED"\|"CREDENTIAL_EXPIRED"\|"CONNECTED", arabic}`. The UI has no way to reach it.
Also not exposed: `GetDataRoot`, `SetDataRoot`, `CreateBackup`, `RestoreBackup`, `Read`, `Write` —
those are reachable only through the `postMessage` channel below.

### 5.2 `postMessage` channel

`Browser.CoreWebView2.WebMessageReceived` (`Views/AkarV2PortalWindow.cs:374`). Messages that start
with `{` are parsed as JSON and dispatched on `action`; anything else is appended to
`%LOCALAPPDATA%\AkarApp\webview.log` (`:668`). Replies are delivered by
`ExecuteScriptAsync("window.__akarBridgeReply(requestId, payload)")`.

| `action` | Handler | Reply payload |
|---|---|---|
| `save` | `:388-397` | none — writes `{DataRoot}/{key}.json` via `_bridge.Write` |
| `migrate` | `:398-410` | none — bulk-writes every supplied key; one-shot, guarded by `localStorage.__akar_bridge_migrated_v1` (`:703`) |
| `get_hwid` | `:415-433` | `{ok:true, hwid, activated}` — `activated` = `App.IsAppActivated` |
| `get_subscription_status` | `:434-466` | `{ok, hasToken, isActive, isExpired, deviceTimeTampered, isTrial, usesOfflineLicense, daysRemaining, licenseSource, expiryDate, renewalUrl, statusMessage, checkedAt}` — 13 fields, from `App.SubscriptionState` |
| `apply_activation_code` | `:467-510` | same 13 fields plus `error`; `ok` is false when `licenseSource == "coupon-error"`. Calls `OfflineLicenseService.ApplyActivationCode` and `App.UpdateSubscriptionState` |
| `get_path` | `:511-528` | `{ok:true, path}` — current data root |
| `backup_create` | `:529-568` | `{ok:true, path}` / `{ok:false, error}` — opens a native `SaveFileDialog`, zips the data root |
| `backup_restore` | `:569-606` | `{ok:true}` / `{ok:false, error}` — `OpenFileDialog`; the old data root is moved aside and restored on failure (`WebViewBridgeService.cs:213-258`) |
| `browse_folder` | `:607-637` | `{ok:true, path}` — `OpenFolderDialog`, then `SetDataRoot`, which also updates `Settings.StoragePath1` (`WebViewBridgeService.cs:128-145`) |
| `scan_document` | `:638-666` | `{ok:true, imageData}` / `{ok:false, error}` — WIA `WIA.CommonDialog.ShowAcquireImage`, re-encoded to JPEG q90 (`Services/ScannerService.cs:11-40`) |

**The 13-field subscription payload is the authoritative spec** for what a `/subscription-status`
endpoint should ultimately feed. The previous matrix recovered these names from compiler-generated
`ToString` strings and marked them unverified (`:91`); they are now confirmed as **bridge wire
fields**, distinct from the 6-field HTTP DTO that `SubscriptionService.ParseStatus` consumes.

### 5.3 Injected scripts

Two `AddScriptToExecuteOnDocumentCreatedAsync` payloads (`:680-682`):

1. **Error hook** — forwards `window.error` (including `SCRIPT`/`LINK` resource errors),
   `unhandledrejection` and `console.error` to the host as plain `postMessage` strings; emits
   `hook: installed` on load.
2. **Storage bridge** (`WebViewBridgeService.BuildInitScript():179-182`) — synchronously pulls
   `GetAllData()` into `localStorage` on document create, then monkey-patches
   `Storage.prototype.setItem` so every `localStorage` write is mirrored to the host as
   `{action:'save', key, data}`.

**Security note:** the patched `setItem` mirrors **every** key on **every** page loaded in the portal,
including third-party pages if the portal ever navigates off-origin. The host writes each key to a
file named after a regex-sanitised version of the key (`WebViewBridgeService.cs:260-264`) — an
unbounded, attacker-influenced filename space inside the data root.

### 5.4 Portal window capabilities

- Full-screen chromeless window sized to `SystemParameters.WorkArea` (`:205-209`).
- Virtual host mapping `akarapp.local` → `{BaseDir}/webui` with `HostResourceAccessKind.Allow` (`:323`).
- DevTools enabled in `DEBUG`, disabled in `RELEASE` (`:352-357`).
- WebView2 user-data folder migrated to the configured storage path, with a copy-then-rename fallback (`:124-175`).
- Bottom ad banner row driven by `DesktopAdService`, refreshed on a 15-minute timer (`:81-88,220,222-226`).
- Hidden key-generator: **Ctrl+Shift+6** opens `KeyGeneratorWindow` (`:89-104`).
- `NavigateToUrl(string)` is public and is called by `Views/PropertyUploadDialog.cs:230-233` after a successful upload.

---

## 6. Data-model mapping

### 6.1 Properties

Four stores, none agreeing:

| Store | Location | Shape |
|---|---|---|
| `AkarDB.sqlite` `Properties` | desktop, shipped | **66 columns** (dumped) |
| `Models/Property.cs` (EF) | desktop, `_Next` source | adds `DesktopDraftId:160`, `DesktopWebsiteUrl:163`, `IsPublishedToWebsite:165` |
| `Property` (Prisma) | V1 | `schema.prisma:383` |
| `properties` (Drizzle PG) + `property_listings` (D1/MySQL) | V2 | two disagreeing tables |

**Schema-drift finding:** the three `Desktop*` columns are written by
`Services/OnlinePropertyService.cs:87-89`, seeded by `Services/DatabaseSeeder.cs:82,95`, and read by
`ViewModels/PropertiesViewModel.cs:415,433,452` — but they are **absent from the shipped
`AkarDB.sqlite`** and are **not in `V2SchemaMigration.ApplyMissingColumns`**
(`Services/V2SchemaMigration.cs`, 33 ALTER entries, none for `Properties.Desktop*`). How they reach an
existing installation is UNKNOWN; on a pre-existing DB, EF queries touching them would fail.

**Desktop `Properties` → V1 `Property`, by the actual mapper** (`Services/OnlinePropertyService.cs:122-148`):

| Desktop source | Wire field | V1 handling (`desktop.ts:131-143`) | Gap |
|---|---|---|---|
| `Type + " - " + City` | `title` | `data.title` — but nested under `property`, so never seen ⇒ `"Desktop Draft"` | I-7 |
| `$"{Type} في {City} - {District}"` | `titleAr` | `data.titleAr` ⇒ `""` | I-7 |
| `""` | `description` | **no column read** | lost |
| composed Arabic block | `descriptionAr` | **no column read** | lost |
| `Price` (decimal→double) | `price` | `parseFloat` ⇒ `0` | I-7 |
| constant `"SAR"` | `currency` | **not read** | The desktop hard-codes SAR regardless of `Settings.DefaultCurrency` / `CountryConfigs.DefaultCurrency` |
| `OfferType == "إيجار" ? "rent" : "sell"` | `type` | **not read** | Two-value collapse; `بيع`, `استثمار` etc. all become `sell` |
| `MapCategory(Type)` — 6 Arabic→English values (`:161-173`) | `category` | `data.category` ⇒ `"apartment"` | I-7 |
| `City` | `city` / `cityAr` | ⇒ `"Unknown"` / `""` | I-7 |
| `District` | `neighborhood` | **no column** on V1 `Property` | lost |
| `TotalArea` | `area` | **not read** | lost |
| `RoomsCount` | `bedrooms` | **not read** | lost; `bathrooms`, `floor` are hard-coded `0` |
| `ConstructionStatus` | `propertyAge` | **not read** | semantic mismatch — construction status is not an age |
| facade booleans joined in Arabic | `facadeDirection` | **not read** | lost |
| `Settings.OfficeName`, `Settings.WhatsAppNumber` | `officeName`, `officePhone` | **not read** | no office identity reaches V1 |
| constants `0`,`0` | `lat`, `lng` | **not read** | **the desktop never sends real coordinates**, even though it stores `Coordinates(N,E)` and `PropertyGisPolygons(UtmZone, UtmNorthing, UtmEasting)` |
| — | `images`, `tags` | V1 stringifies `data.images`/`data.tags`; the desktop sends `images` **as sibling of `property`**, so V1 sees `undefined` ⇒ `"[]"` | I-7 |
| — | `userId` | defaults to **1** (`desktop.ts:141`) | every draft attributed to user 1 |

**Never transmitted by any desktop code path** (present in `AkarDB.sqlite`, absent from every wire
DTO): `SubType`, `OwnershipDocument`, `NumberOfStreets`, `NearbyLandmarks`, `KmzFilePath`,
`OwnerStatus`, `OwnerName`, `Commissioner*` (5), `CourtAuthorizationPath`,
`PrintedAuthorizationPath`, `HasCourtPOA`, `HasOfficePOA`, `IsCashPayment`, `IsDeferredPayment`,
`IsInstallmentPayment`, `InstallmentPrice`, `SaleStatus`, `OwnerClientId`, `CommissionRate`,
`SoldDate`, `SoldPrice`, `BuyerClientId`, `Buyer*` (4), `LifecycleFlag`, `LifecycleStatus`,
`PublicDisclosures`, `HasLegalRestrictions`, `LegalRestrictionDocPath`, `ClearanceCertPath`,
`GisPolygonJson`, `ManualCoordinates`, `CalculatedPolygonAreaSqm`, `ListingAgentId`, `BuyerAgentId`,
`IsPublicListing`, `IsCoBroking`, `CoBrokingAgencyId`, `FloorNumber`, `TotalFloors`, `YearBuilt`,
`Bedrooms`, `Bathrooms`, `AreaUnit`, `FurnishingStatus`, `FurnishingsDescription`, `IsArchived`.
Plus the entire satellite set: `PropertyBounds`, `PropertyGisPolygons`, `Coordinates`,
`PropertyAmenities`, `PropertyAttachments`, `PropertyBrokers`, `PropertyInstallments`,
`PropertyLegalStatus`, `Units`, `Ownerships`.

### 6.2 `ClientRequests` / `PublicLeads` / `LeadClaims` / `CoBrokingRequests`

| Desktop table (columns from `AkarDB.sqlite`) | V1 | V2 | Gap |
|---|---|---|---|
| `ClientRequests(Id, ClientId, RequestType, PropertyType, City, District, DistrictsJson, FurnishingStatus, MinRooms, MaxRooms, MinBudget, MaxBudget, MinArea, MaxArea, PreferredFeatures, Notes, IsActive, IsMatched, CreatedAt, AssignedAgentId, OfferMode)` | `PropertyRequest(id, userId, title, description, propertyType, city, neighborhood, minPrice, maxPrice, status)` (`schema.prisma:721-739`) | `property_requests` + `property_request_offers` | V1 has **9 of 21** concepts. No home for `DistrictsJson` (multi-district), `FurnishingStatus`, `MinRooms/MaxRooms`, `MinArea/MaxArea`, `PreferredFeatures`, `IsMatched`, `AssignedAgentId`, `OfferMode`. Direction is also inverted: V1 requests belong to *website users*; desktop requests belong to *office clients* |
| `PublicLeads(Id, SourceType, PostedByName, PostedByMobile, PropertyType, City, District, BudgetMin, BudgetMax, Description, PublicDisclosures, Status, ExpiresAt, CreatedAt)` | none | none | Entire public-lead pool absent from both |
| `LeadClaims(Id, LeadId, AgencyId, AgentUserId, ClaimedAt, ExpiresAt, Status, WithdrawnAt, RejectedAt, ContractId)` | none | none | Claim/expire/withdraw/reject lifecycle absent from both |
| `CoBrokingRequests(Id, PropertyId, RequestingAgencyId, RequestingAgentId, OwningAgencyId, CommissionSplitPct, Status, RequestedAt, RespondedAt, ClosedContractId, Notes)` | none | none | Inter-agency co-broking absent from both |
| `ClientOffers(Id, ClientId, PropertyId, OfferType, AskingPrice, Currency, Notes, IsCompleted, CompletedAt, ContractId, CreatedAt)`, UNIQUE`(ClientId, PropertyId, OfferType)` (`Services/V2SchemaMigration.cs`) | `PropertyOffer` (`schema.prisma:741`) | `property_request_offers` | Different semantics: desktop = *this client wants this property*; web = *this provider offers against a request* |

**No V1 or V2 route exposes any of these four tables to the desktop, in either direction.**

### 6.3 `RadarMatches` — the actual algorithm

`Services/RadarService.cs`. **Two engines, both weighted-additive, both non-geographic.**

**Local engine** — `ScanPropertyAgainstRequests` (`:25`) / `ScanAllProperties` (`:274`) →
`ScoreMatch(property, request, tolerancePct)` (`:295-342`):

| Component | Rule | Points |
|---|---|---|
| City | `p.City.Contains(req.City)` **or** `req.City.Contains(p.City)`, case-insensitive. **Non-match ⇒ hard return 0** (`:300-303`) | +40 |
| District bonus | `p.District.Contains(req.District)` | +5 |
| Budget | `req.MaxBudget > 0 && p.Price > 0`; cap = `MaxBudget × (1 + tol/100)`; in `[MinBudget, cap]` ⇒ +30; else `≤ cap × 1.1` ⇒ +15 | +30 / +15 |
| Area | `req.MaxArea > 0 && p.TotalArea > 0`; cap = `MaxArea × (1 + tol/100)`; in `[MinArea, cap]` ⇒ +20; else `≤ cap × 1.1` ⇒ +10 | +20 / +10 |
| Type | `p.Type.Contains(req.PropertyType)` | +10 |
| | `Math.Min(score, 100)` (`:341`) | max 105 → clamped |

`tolerancePct` = `Settings.RadarTolerancePct`, default **20** (`:344-354`). Threshold **60**
(`:15,35,45`). Declared weights `CityWeight=40`, `BudgetWeight=30`, `AreaWeight=20`, `TypeWeight=10`
(`:17-23`). Only `IsActive` requests are scanned (`:36`); duplicates are suppressed by an existing
`(ClientRequestId, PropertyId)` row (`:40-43`). Each hit writes a `RadarMatches` row **and** a
`DashboardAlerts` row with `Severity = score >= 85 ? "critical" : "info"` (`:47-67`).

**Website engine** — `FetchAndMatchFromWebsite` (`:85`) → `ScoreMatchAgainstWebsiteRequest`
(`:171-201`): same shape, but **no area component** (max 85) and a hard-coded 20 % budget tolerance
(`1.2m`, `:189`) that ignores `RadarTolerancePct`. It scans `Properties.Where(!IsArchived)` × all
fetched requests — an O(n×m) full cross-product with no limit (`:120-156`).

**Critical modelling defect:** website requests are stored in the same `RadarMatches.ClientRequestId`
column as local `ClientRequests.Id` (`:135`), with **no discriminator**. A website request with
`id = 7` collides with local client request 7 — the dedupe check at `:127` will suppress genuine
matches, and `ClientRequestMatchesViewModel` will resolve the wrong request.

**Contrast with V2's radar** (`cur/app/api/office/v1/radar/route.ts:19`): a geospatial
`{latitude, longitude, radiusKm, kind}` scan returning `distanceKm`-sorted targets. It has **no
request dimension, no score, no tolerance, no match persistence and no notification**; the desktop has
**no coordinates, no distance and no target-kind concept**. These are two different features that
share a name. V1 has **no radar at all** — `RadarService` is entirely client-side against
`/api/desktop/property-requests`.

`RadarMatches(Id, ClientRequestId, PropertyId, MatchScore, IsNotified, NotifiedAt, IsActedOn, CreatedAt)`
has **no counterpart column** in V1 or V2. `IsNotified`/`NotifiedAt`/`IsActedOn` are written by the
desktop only; nothing consumes them (`grep` finds no reader outside the model).

### 6.4 `AdCampaigns` / `AdImpressions`

| Desktop `AdCampaigns` | V1 `Ad` (`schema.prisma:526-580`) | V2 `ad_campaigns` | Gap |
|---|---|---|---|
| `Id` | `id` | `id` | ok |
| `Title` | `title` + `titleAr` | `title_ar/en/tr` | desktop is single-language |
| `Zone` | **`desktopZone`** (`:566`) | `placement` (5 fixed `office_*`) | **V1 is the match** — free-text `desktopZone` accepts `desktop_portal_bottom_banner`; V2's enum rejects it with 400 |
| `ImagePath` | — | — | desktop-local cache; **unused by `DesktopAdService`** |
| `ImageUrl` | `imageUrl` | `media_url` | ok |
| `TargetUrl` | `linkUrl` | `target_url` | name differs; the desktop parser already accepts `linkUrl` (`DesktopAdService.cs:159`) |
| `StartDate`/`EndDate` | `startDate`/`endDate` (**stored as `String?`**, `:568-569`) | `start_at`/`end_at` | desktop parses with `DateTime.TryParse` (`:385-396`) so ISO strings work |
| `IsActive` | `isActive` | `status`+`is_active` | ok |
| `Priority` | `displayOrder` | `priority`,`weight`,`is_fallback` | desktop reads `priority\|sortOrder\|sort_order` (`:173`) — **`displayOrder` is not in that alias list** |
| `IsCollapsible` | — | — | absent from both |
| `NewsText` | — | — | absent from both; the desktop can attach ticker text to a banner |
| — | `ctaText` | `cta_*` | desktop reads it (`:160`) |
| — | `subtitle`, `badge`, `companyName`, `companyLogo`, `phoneNumber`, `sponsorTier`, `sponsorName`, `advertiser*`, `price`, `maxViews`, `maxClicks`, `rotationSeconds`, geo-targeting ×5, `backgroundFrom/To`, `accentColor`, `language`, `icon` | — | V1-only |
| `AdImpressions(Id, CampaignId, ImpressionType, OccurredAt)` | **no event table** — only `viewCount`/`clickCount` counters (`:535-536`) | `ad_events(campaign_id, event_type, occurred_at, country_code, city_id, locale, device)` | **V1 loses per-impression granularity entirely.** V2 has it but abuses `city_id` as a dedup key |

### 6.5 `CloudSyncQueue`

`CloudSyncQueue(Id, TableName, RecordId, Operation, PayloadJson, SyncStatus, SyncAttempts, LastAttemptAt, ErrorMessage, CreatedAt)`
— DDL at `Services/V2SchemaMigration.cs` (`ApplySupplementalTables`, entry 5), with
`SyncStatus DEFAULT 'pending'`, `Operation DEFAULT 'UPDATE'`, `PayloadJson DEFAULT '{}'`, and index
`idx_sync_status`.

**Finding: `CloudSyncQueue` has no writer and no reader anywhere in the C# tree.**
`grep -rn "CloudSyncQueue"` matches only the DDL string in `V2SchemaMigration.cs`. The table is
created and never used. The shipped DB has 0 rows. The only thing resembling sync in the desktop is
the cloud-backup ZIP upload (D-11), which is a whole-database dump, not an operation queue.

| Desktop column | V1 | V2 `office_sync_operations` |
|---|---|---|
| `TableName` | `/sync/batch` accepts `operations[].action` (`desktop.ts:270`) and discards it | `entity_type`, derived from `operationType.split(".")[0]`; only `property.*` accepted |
| `RecordId` (INTEGER) | not persisted | `entity_id VARCHAR(120)` |
| `Operation` | not persisted | `operation_type` — dotted `entity.verb` |
| `PayloadJson` | not persisted | `payload` |
| `SyncStatus` (`pending` default) | not persisted | `queued/sending/synced/failed/retrying/conflict/dead_letter` |
| `SyncAttempts` | not persisted | `attempts` (max 5) |
| `LastAttemptAt`, `ErrorMessage` | not persisted | `processed_at`/`updated_at`, `error`+`conflict_reason` |
| **none** | — | **`idempotency_key` (UNIQUE per device)** — the desktop has no such concept |
| **none** | — | `direction`, `client_updated_at`, `server_updated_at` |

### 6.6 `OfficeAuthContracts` (office authorisation contracts)

`OfficeAuthContracts(Id, InternalNumber, ClientId, PropertyId, AuthType, AuthScope, RequiredAmount, RequiredCurrency, CommissionType, CommissionRate, CommissionFixedAmount, CommissionFixedCurrency, AgreementContent, Witness1{Name,Identity,Mobile,IdImagePath}, Witness2{…}, SignedContractImagePath, CreatedDate)`
— driven by `ViewModels/OfficeAuthContractViewModel.cs` (1,104 lines) and
`Views/OfficeAuthorizationWindow.cs` (599 lines).

**No counterpart in V1 or V2.** The nearest V2 concept is `office_links` (a device/licence link), which
is unrelated. This is a complete legal-document subsystem — exclusive listing authorisations with
commission terms, two witnesses with ID photos, and a scanned signed copy — with **no web
representation of any kind**.

### 6.7 Users / permissions / branches

| Desktop | V1 | V2 | Gap |
|---|---|---|---|
| `Users(Id, Name, Mobile, Email, PasswordHash, Permissions, Role, IsActive, AvatarPath, HideTrueOwner, CanDeleteRecords, CanViewFinancials, CanManageUsers, TenantId, BranchId)` | `User` (`schema.prisma:20`) | `users` + `organization_members` | Three unrelated identity models |
| `Permissions` — a **substring-matched free-text field**: `Perm.Has(permissions, key)` returns true if the string contains `"admin"` or contains the key (`ViewModels/Perm.cs:22-33`). Keys: `admin, clients, properties, contracts, treasury, social, print, delete` | `User.role` + `requireRole()` | `PERMISSIONS` constants | **Substring matching is a security defect**: a permission string containing `"administrative"` grants `admin`; `"no_delete"` grants `delete` |
| `UserRolePermissions(Id, UserId, PermissionKey, IsAllowed, GrantedByUserId, GrantedAt)`, UNIQUE`(UserId, PermissionKey)` — the *second*, structured system. Keys: `view_reports, export_reports, manage_vouchers, manage_checks, manage_maintenance, assign_technician, manage_users, manage_branches, manage_settings` (`ViewModels/PermX.cs:5-21`) | none | none | A per-user grant table with an audit trail exists on the desktop and nowhere on the web |
| `AppRoles`: `SuperAdmin, BranchManager, Accountant, DataEntry` (`ViewModels/AppRoles.cs:5-14`) | `admin, moderator, …` | sponsor roles | No overlap in vocabulary |
| `Branches(Id, Name, Address, Phone, ManagerName, IsActive, CreatedAt)` — 1 row seeded | `Office` (`schema.prisma:434`) | `organization_branches` | No sync path in either direction |
| `Settings.TenantId` on `Users` | — | `sponsor_id`/`office_id` | The desktop has a dormant multi-tenant column |

### 6.8 `Settings` and `CountryConfigs`

`Settings` has **47 columns** in the shipped DB — office identity (`OfficeName`, `OfficePhone`,
`OfficeAddress`, `TaxNumber`, `CRNumber`, `LogoPath`, `AgencyTier`), financial defaults (`Currency`,
`DefaultCurrency`, `CommissionPercentage`, `TaxPercentage`), printing (`TopMargin`, `BottomMargin`,
`PrintBackgroundPath`), storage (`StoragePath1`, `StoragePath2`, `DocumentsBasePath`,
`AutoBackupPath`), licensing (`LicenseKey`, `RegisteredHWID`, `IsActivated`), social
(`WhatsAppNumber`, `FacebookUrl`, `InstagramUrl`, `TwitterUrl`, `WebsiteUrl`, `DefaultAdText`),
locale (`AppLanguage`, `IsEnglish`, `CountryCode`, `ShowKhanaField`), SMTP (4), radar
(`RadarTolerancePct`), alerts (`PoaAlertDaysBefore`), ads (`AdPollIntervalMins`), cloud
(`CloudBackupUploadUrl`, `EnableCloudBackup`, `CloudBackupIntervalMinutes`), integrity
(`EnableIntegrityChecks`), and `DefaultListingAgentId`, `SaleContractDefaultNotes`, `UserPassword`.

**`Settings.AdPollIntervalMins` is dead** — the ad refresh interval is hard-coded to 15 minutes at
`Views/AkarV2PortalWindow.cs:83`.

`CountryConfigs(Id, CountryCode, CountryNameAr, DefaultCurrency, DefaultTaxPct, FieldsJson,
LabelOverridesJson, IsActive)` — **8 rows seeded**. `FieldsJson` drives per-country field visibility
and `LabelOverridesJson` drives per-country relabelling. **Neither V1 nor V2 has any analogue**; V1
has `locationsData.json` (`v1/vite.config.ts:6`) for geography only.

---

## 7. Compatibility tally

**Total rows: 88** — 18 desktop→web (§2, each scored twice) + 24 V1 web→desktop (§3.1) + 28 V2
web→desktop (§3.2). V1 is scored over 42 rows (18 D + 24 V1W); V2 over 46 rows (18 D + 28 W).

### 7.1 Against V1 (42 scored rows)

| Status | Desktop→Web (18) | Web→Desktop (24) | Total | Rows |
|---|---|---|---|---|
| `MATCH` | 5 | 3 | **8** | D-04, D-05, D-06, D-16, D-18; V1W-08, V1W-09, V1W-17 |
| `PARTIAL MATCH` | 2 | 12 | **14** | D-01, D-02; V1W-01, 02, 03, 10, 11, 12, 16, 18, 19, 20, 21, 23 |
| `CONTRACT MISMATCH` | 5 | 4 | **9** | D-03, D-08, D-09, D-10, D-17; V1W-04, 05, 07, 22 |
| `WEB IMPLEMENTATION BROKEN` | 1 | 4 | **5** | D-07; V1W-06, 13, 14, 15 |
| `WEB ROUTE MISSING` | 5 | 1 | **6** | D-11, D-12, D-13, D-14, D-15; V1W-24 |
| `DESKTOP CALL OBSOLETE` | 0 | 0 | **0** | — |
| `UNKNOWN` | 0 | 0 | **0** | — |

### 7.2 Against V2 (46 scored rows)

| Status | Desktop→Web (18) | Web→Desktop (28) | Total | Rows |
|---|---|---|---|---|
| `MATCH` | 4 | 7 | **11** | D-13, D-15, D-16, D-18; W-01, 02, 07, 08, 25, 26, 28 |
| `PARTIAL MATCH` | 1 | 9 | **10** | D-14; W-03, 05, 06, 10, 13, 14, 17, 21, 24 |
| `CONTRACT MISMATCH` | 3 | 5 | **8** | D-10, D-12, D-17; W-04, 09, 11, 12, 15 |
| `WEB IMPLEMENTATION BROKEN` | 0 | 7 | **7** | W-16, 18, 19, 20, 22, 23, 27 |
| `WEB ROUTE MISSING` | 10 | 0 | **10** | D-01…D-09, D-11 |
| `DESKTOP CALL OBSOLETE` | 0 | 0 | **0** | — |
| `UNKNOWN` | 0 | 0 | **0** | — |

### 7.3 Reading the tally

- **V1 is far closer to the desktop than V2 is.** `/api/desktop/*` exists path-for-path, and
  `GET /api/desktop/subscription-status` is a **field-perfect** match for the desktop's parser
  (D-01/V1W-02). Six of eight `MATCH` rows against V1 are real desktop→web wire contracts
  (D-04, D-05, D-06 plus V1W-08, V1W-09, V1W-17); against V2, **zero** of eleven `MATCH` rows is a
  reachable desktop↔web contract.
- **Every V1 `MATCH` is nevertheless unreachable at runtime**, because D-10 (login) fails and no
  credential is ever stored. The V1 integration is one envelope fix away from partially working, and
  one shared-secret decision away from mostly working.
- **The four V1 `WEB IMPLEMENTATION BROKEN` web→desktop rows** (news-ticker 500, plus the three sync
  stubs) mean that even a fixed login would leave the ticker and all batch sync non-functional.
- **V2's 10 `WEB ROUTE MISSING` rows are the entire `/api/desktop` family.** V2 replaced it with
  `/api/office/v1/**`, and the desktop's client for that family (`OfficeApiClient`) fails on two
  independent serialisation defects and has no caller for 3 of its 4 methods.

---

## 8. Repair guidance per mismatch (documentation only — nothing was applied)

Ordered by blocking severity.

### R-1 — Fix the login envelope (blocks 7 of 18 desktop→web rows)
*Mismatch* I-1 / D-10. The desktop requires `data.token` (`Views/WebsiteLoginDialog.cs:215-224`).
Cheapest fix on the web side: have the desktop-facing login return
`{data:{token, user}}` — or add a dedicated `POST /api/desktop/login` that wraps the existing
handler. On V2 this additionally requires issuing a **bearer token**, since V2 login is cookie-only
(`cur/app/api/auth/login/route.ts:162-179`). Decide deliberately whether the desktop gets a
long-lived device credential (preferred, see R-6) or a user JWT.

### R-2 — Decide the `signature` secret, or delete the scheme
*Mismatch* I-2. Either set `DESKTOP_SIGNATURE` to the desktop's compiled literal
(accepting that it is a client-side constant with zero secrecy value), or remove signature gating
from `desktop.ts:12-14` and replace it with the `X-API-Key` verification the desktop already sends on
four other calls and that V1 already mints (`routes/auth.ts:475-478`). **Do not keep both.**

### R-3 — Fix the three response envelopes
- **Ads** (I-5): wrap as `{ad: <row>}` in `desktop.ts:183`, and add `priority` (or `sortOrder`) to the
  serialised ad — `DesktopAdService.cs:173` does not recognise `displayOrder`.
- **Property requests** (I-6): wrap as `{data: [...]}` in `desktop.ts:161`, and either rename the
  field to `neighborhoods` in the response or widen the desktop alias list at `RadarService.cs:110`.
  Also drop the `signature` requirement or make the desktop send it.
- **Draft upload** (I-7): accept `{property:{…}, selectedFields, images}` and return
  `{success:true, data:{draftId, propertyId, websiteUrl}}`. Stop defaulting `userId` to 1
  (`desktop.ts:141`) — resolve the owner from the credential.

### R-4 — Fix `/api/desktop/news-ticker`
*Mismatch* V1W-06. `prisma.newsTicker` does not exist. Point the handler at `NewsTickerItem`
(`schema.prisma:645`) with `isActive: true`, and map `text` (or `textAr` for Arabic clients). The
response envelope `{data:[{text}]}` is already correct.

### R-5 — Fix the V2 pairing client contract
*Mismatch* I-3 / I-4 / D-12 / W-04. Two options, both one-line-ish:
- **Server side:** accept PascalCase keys as aliases in `pairing/complete/route.ts:16,32-37`, and
  return the device object **unwrapped** (or additionally at the top level).
- **Desktop side:** serialise with `JsonNamingPolicy.CamelCase` and add a
  `CompletePairingEnvelope { CompletePairingResponse Device }`.
Whichever is chosen, add a contract test that round-trips the real C# DTO against the real route —
neither side has one today.

### R-6 — Choose one device identity
*Mismatch* I-8. Three identities exist: the desktop HWID (`HwidGenerator.cs:10`), the desktop
`installationId` GUID (`DeviceIdentityService.cs:16`), and V1's `SoftwareLicense.hwid`
(`desktop.ts:220-226`). Recommendation: make `installationId = HWID`, so that
`office_devices.installation_id` (UNIQUE, `cur/lib/integration/schema.ts:352`) and
`software_licenses.hwid` describe the same machine and can be joined. This is a one-line change in
`DeviceIdentityService.GetInstallationId`.

### R-7 — Wire up the dead pairing methods
`PairingService.SendHeartbeatAsync`, `OfficeApiClient.HeartbeatDetailAsync` and
`OfficeApiClient.RotateTokenAsync` have no callers. A paired device therefore never heartbeats and
its credential silently dies at 90 days. Add a background timer (the pattern exists —
`CloudBackupSyncService.Start():23-46`) that heartbeats and rotates when
`DeviceCredentialStore.GetDeviceExpiryAt()` is within, say, 7 days. Also expose
`WebViewBridgeService.GetConnectionState()` on `BridgeHostObject` so the UI can show pairing state.

### R-8 — Fix the app version
*Mismatch* I-10. `AkarApp.csproj:9` says `1.2.0`; `AssemblyInfo.cs:13-15` says `1.0.0.0`/`1.0.0` and
`GenerateAssemblyInfo=false` (`:14`) means the csproj value is ignored. Either delete the hard-coded
attributes or set them to `1.2.0`. Until then every V2 request is `UPDATE_RECOMMENDED`
(`cur/lib/integration/constants.ts:97-99`).

### R-9 — Unify credential transport
*Mismatch* I-11. Pick **one**: `Authorization: Bearer` on every desktop call. Remove the `X-API-Key`
header (`DesktopAdService.cs:77,194`, `CloudBackupSyncService.cs:119`) and the `userToken` query
parameter (`SubscriptionService.cs:62`) — the latter puts a JWT into every access log and proxy cache
key.

### R-10 — Fix the default base URL split
*Mismatch* I-13. `http://localhost:8080` vs `http://localhost:8082` inside one binary. Introduce a
single `ResolveWebsiteBaseUrl()` helper (six near-identical copies exist:
`OfficeApiClient.cs:87-105`, `SubscriptionService.cs:14-32`, `DesktopAdService.cs:312-335`,
`RadarService.cs:203-221`, `DesktopNewsTickerService.cs:54-72`, `OnlinePropertyService.cs:15-33`,
plus `WebsiteLoginDialog.cs:146-168` and `PropertyUploadDialog.cs:249-266`) and give it one default.

### R-11 — Fix the deep-link scheme
*Mismatch* I-12. `ResolveFullWebsiteUrl` (`ViewModels/PropertiesViewModel.cs:401,410`) builds
`{base}/#/{path}`. Both web apps are path-routed. Drop the `#`.

### R-12 — Give `RadarMatches` a source discriminator
*Mismatch* §6.3. `ClientRequestId` holds both local `ClientRequests.Id` and remote website request
ids (`RadarService.cs:135`). Add a `SourceType` column (`local`/`website`) and include it in the
dedupe predicate at `:40` and `:127`, and in `ClientRequestMatchesViewModel`'s lookup.

### R-13 — Decide what `CloudSyncQueue` is for
It is created (`V2SchemaMigration.cs`) and never used. Either delete it, or make it the real outbound
queue and give it an `IdempotencyKey` column so it can feed a V2-style `POST /sync` (W-17) or a fixed
V1 `/sync/batch` (V1W-15). Today `/sync/batch` reports `status:"ok"` for every operation and persists
nothing (`desktop.ts:264-275`) — that is worse than a 501, because a client would mark records synced.

### R-14 — Close the unauthenticated licence surface in V1
`POST /api/desktop/license/reset-hwid` (`desktop.ts:231`) unbinds any licence with no auth;
`POST /api/desktop/free-trial-license` (`:277`) mints unlimited 30-day licences with no auth;
`POST /api/licenses/validate` (`routes/licenses.ts:38`) returns the full licence row including
`userId` and `notes` to anyone; `GET /api/desktop/sync/ads` (`:242`) returns advertiser contact
details and prices. All four need authentication before any desktop integration ships.

### R-15 — Replace substring permission matching
`ViewModels/Perm.cs:22-33` grants a permission if the stored string *contains* the key, and grants
everything if it contains `"admin"`. Migrate to the structured `UserRolePermissions` table that
already exists (`V2SchemaMigration.cs`, `ViewModels/PermX.cs`), and make that table the mapping target
for any future web permission sync.

### R-16 — Publish the 10 advertised endpoints, or stop advertising them
`v1/src/pages/Dashboard.tsx:329-339` shows every office user a desktop-integration API of which nine
endpoints do not exist. Either implement them (they are a reasonable contract: `X-API-Key` auth,
`desktopId`-keyed property CRUD, inquiries, stats) or remove the panel.

### R-17 — Carry the coordinates
`OnlinePropertyService.MapProperty` hard-codes `lat:0, lng:0` (`:145-146`) while the desktop stores
`Coordinates(PointNumber, N, E)` and `PropertyGisPolygons(UtmZone, UtmNorthing, UtmEasting)`. Without
a UTM→WGS84 projection on one side, no office property can ever appear in a map or in V2's geo radar.
No projection code exists in any tree.

### R-18 — Decide where office identity lives
`OnlinePropertyService` sends `officeName`/`officePhone` (`:143-144`); no web route reads them. The
desktop's `Settings` office block (§6.8), `Branches`, `Users` and `UserRolePermissions` have no web
representation and no sync path. This is a product-owner decision, not a bug fix.

---

## 9. Remaining unknowns

1. **Nothing was executed.** Every status is static. A runtime pass against a booted V1 server would
   confirm or refute I-2 (the `DESKTOP_SIGNATURE` value in production) in one request.
2. **Which desktop build is in the field.** `AkarApp_LIVE` (shipped, `1.0.0.0`, WebUI-centric) and
   `_Next` (with `OfficeApiClient`) are different generations. The relationship between
   `AkarApp_Dev` → `AkarApp_Next` → `AkarApp_LIVE` is not established.
3. **`AkarWebUI`** — the canonical React UI project (`AkarApp.csproj:57-70`) is absent from every
   tree. Which `akarBridge` actions and which `postMessage` actions it actually calls is inferred
   from the host side only. In particular, whether any UI ever calls `PairDevice` is **UNKNOWN**.
4. **`Properties.DesktopDraftId` / `DesktopWebsiteUrl` / `IsPublishedToWebsite`** exist in the EF model
   and in seed SQL but not in the shipped DB nor in `V2SchemaMigration`. The migration path is UNKNOWN.
5. **The V1 production `DESKTOP_SIGNATURE`, `JWT_SECRET` and base URL** are unknown; the checked-in
   `.env` may not reflect production.
6. **`Settings.CloudBackupUploadUrl`** is free text with no documented protocol on either side. Whether
   a backup-intake service ever existed is UNKNOWN.
7. **V2 defect depth** for W-16, W-18…W-23, W-27 is inherited (§1.5 note 5), not re-derived here.
8. **`AdCampaigns`/`AdImpressions`/`CloudSyncQueue`/`LookupCategories` consumers.** `AdCampaigns` and
   `AdImpressions` are unused by `DesktopAdService`; `CloudSyncQueue` has no code reference at all.
   Whether an earlier build used them is UNKNOWN.
9. **Old-V2 (`hist/`, `ref/`) desktop-facing routes** were not examined in this pass.
10. **`app.config` and `baml_entries.txt`** were catalogued but not analysed for additional endpoints.
