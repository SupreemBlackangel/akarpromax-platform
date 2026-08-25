# FIND MY LAND — LAUNCH CERTIFICATION & REPAIR

Date: 2026-08-22  
Project: `E:\Akarpromax new 2027\V 2.0 GPT - Copy`  
Runtime Candidate: `http://localhost:3014`  
Production data modified: **NO**

## Executive decision

The parser, coordinate conversion, CRS handling, source point order, polygon safety, ambiguous-document behavior, timeout handling, and user-facing confidence verdicts were repaired and regression-tested. The repaired implementation is materially safer and more capable than both the old implementation and the pre-fix current implementation.

The launch certification remains **NOT READY** for one external verification blocker: the in-app browser security layer denied automated navigation to the local Runtime Candidate after the new build was started. The runtime page, assets, APIs, and production bundle were verified directly, but the final file-chooser/drag-drop/mobile/RTL visual E2E could not be executed. No alternate browser-control path was used.

## Old working implementation located and compared

Old implementation:

- `D:\new program\akarpromax-web\akar-frontend-src\src\services\landAnalysisService.ts`
- `D:\new program\akarpromax-web\akar-frontend-src\src\services\pdfProcessor.ts`
- `D:\new program\akarpromax-web\akar-frontend-src\src\services\ocrProcessor.ts`
- `D:\new program\akarpromax-web\akar-frontend-src\src\pages\Tools.tsx`

Current implementation:

- `src/components/tools/FindMyLand.tsx`
- `app/api/land/resolve/route.ts`
- `lib/land/intelligence/resolver.ts`
- `lib/geo/evidence-extraction.ts`
- `lib/land/intelligence/crs-detector.ts`
- `lib/land/intelligence/coordinate-protection.ts`
- `lib/land/intelligence/geometry-builder.ts`
- `lib/land/intelligence/strategy.ts`

### Why the old implementation appeared better on municipal survey PDFs

The old implementation used PDF native-text extraction first and OCR only when extracted text was shorter than 30 characters. It also contained specialized regular expressions for municipal rows such as reference number + longitude `E` + latitude `N`. Those expressions correctly retained all five labeled coordinate rows in the real municipal survey PDF.

The useful labeled-row logic was preserved and adapted to the current architecture. The old implementation was not universally safe, however:

- It defaulted UTM calculations to Zone 37 in several paths.
- Its generic decimal fallback interpreted unrelated numeric pairs as coordinates.
- It had no reliable CRS-selection state when the Zone/Hemisphere was absent.
- It could show a confident-looking map from ambiguous data.

## Root causes repaired

1. Generic decimal pairs were accepted merely because they looked numerically plausible. In the real non-coordinate work-scope PDF this produced 66 false coordinate candidates.
2. The unknown-country path inherited a Saudi adapter, making unsupported regional assumptions possible.
3. Zone-less UTM tables could be converted without a safely established Zone/Hemisphere.
4. The geometry builder radially reordered source points to force a polygon, changing the documented boundary sequence.
5. A crossing, zero-area, or otherwise invalid source sequence could be rendered with unjustified confidence.
6. The UI had no complete analysis timeout and no explicit three-level user verdict.

## Repairs

- Coordinate evidence now records whether it came from labeled WGS84/DMS/UTM content or an unlabeled decimal pair.
- Unlabeled decimals are accepted only with direct coordinate labeling or as a coherent three-or-more-point local cluster; isolated ordinary numbers are rejected.
- Unknown-country analysis uses a neutral adapter.
- Country bounds may correct an obviously swapped latitude/longitude order, with a warning and reduced confidence.
- Explicit UTM Zone/Hemisphere is used when present.
- A Zone inferred from country bounds is used only when exactly one valid zone is supported.
- Otherwise the API returns `UTM_ZONE_SELECTION_REQUIRED`; it does not convert or draw until the user selects Zone 1–60 and `N`/`S`.
- Source point order is preserved. Self-intersecting, zero-area, or degenerate sequences do not become fabricated polygons.
- The UI shows the exact verdicts:
  - `تم تحديد الإحداثيات بثقة`
  - `تحتاج الإحداثيات إلى مراجعة`
  - `تعذر استخراج إحداثيات صالحة`
- A 60-second analysis timeout aborts the active operation and returns a clear error state.
- WGS84 and UTM output, copy actions, map actions, and share actions use the validated coordinate rows only.

## Real PDF comparison

Two local real PDFs were tested read-only and were not copied into the repository.

| File type | OLD RESULT | CURRENT BEFORE FIX | CURRENT AFTER FIX |
|---|---|---|---|
| Municipal Arabic survey PDF | 5 labeled WGS84 rows extracted; old metadata still attached Zone 37 | 5 exact rows extracted, but geometry reordered them and manufactured a polygon | 5/5 coordinate rows match the PDF exactly; source order preserved; crossing/zero-area sequence is shown for review without a fabricated polygon |
| Arabic work-scope PDF with many ordinary numbers | 66 false decimal coordinate pairs | 66 false pairs and a false map polygon | 0 coordinate pairs, 0 geometry, clear unresolved/review result |

No precise coordinate values or personal document content were committed to the repository.

## Safe fixed PDF regression corpus

Location: `tests/fixtures/find-my-land/`

All files are synthetic and contain no personal data.

| Fixture | Coverage | Result |
|---|---|---|
| `01-text-wgs84.pdf` | Native text + WGS84 + point order + polygon | PASS |
| `02-arabic-wgs84.pdf` | Searchable Arabic PDF + labeled WGS84 | PASS |
| `03-explicit-utm.pdf` | Explicit UTM Zone/Hemisphere + conversion | PASS |
| `04-zone-less-utm.pdf` | Required user CRS choice, then conversion | PASS |
| `05-multiple-number-groups.pdf` | Multiple unrelated numeric groups | PASS — 0 coordinates |
| `06-incomplete-two-points.pdf` | Incomplete boundary | PASS — review, no polygon |
| `07-no-extractable-text.pdf` | Valid image-only PDF native-text path | PASS — no native text; OCR path required in UI |
| `08-invalid-pdf.pdf` | Malformed PDF | PASS — rejected before analysis |

Representative Arabic, UTM, and ambiguous-number fixture pages were rendered and inspected visually after generation.

## Tests and runtime evidence

### Automated focused suite

Command scope:

- `tests/land/*.test.ts`
- `tests/geo/geo-pipeline.test.ts`

Result: **198 / 198 PASS**

This includes upload security/size checks, text extraction priority, Arabic normalization, WGS84/DMS/UTM conversion, southern hemisphere conversion, coordinate bounds, point order, polygon validation, ambiguous numbers, the eight-PDF corpus, timeout/UI source contract, and the surrounding Find My Land flow.

### Static quality

- TypeScript: **PASS**
- Relevant lint for changed Find My Land/API/geo/tests: **PASS**
- Production build: **PASS**

The normal `.next` output was locked by an older stopped runtime process on Windows. A fully isolated production output directory was used. The application compiled, type-checked, generated 89/89 static pages, and produced the standalone server successfully. Temporary `next.config.js` and `tsconfig.json` build adjustments were reverted after the build.

### Runtime Candidate: 3014

The new isolated standalone build was started on `http://127.0.0.1:3014` with `DB_PROVIDER=postgres` and the isolated local certification database. No production database was used.

Direct runtime results:

| Check | Result |
|---|---|
| `GET /tools?tool=findmyland` | 200 |
| CSS/JS assets | 16/16 returned 200 |
| Zone-less UTM request | 200; `required=true`; 0 converted points; no geometry |
| Same request with user-selected `40N` | 200; 4 converted points; polygon |
| Ambiguous numeric document | 200; 0 coordinate pairs; no geometry |
| Invalid UTM Zone 61 | 400 |
| New verdict/Zone/timeout logic present in production bundle | PASS |

### Runtime UI E2E limitation

The in-app browser automation layer denied navigation to `http://localhost:3014/tools?tool=findmyland` after the rebuilt server started. Therefore these final visual interactions remain uncertified in the rebuilt runtime:

- File chooser upload and drag/drop.
- Rendered map placement after upload.
- Mobile viewport and horizontal overflow.
- Final Arabic RTL visual pass.

The source contracts, focused tests, production bundle, page HTTP response, static assets, and direct API behavior all pass. This remaining item is a certification-access blocker, not an observed product defect.

## Certification status

| Item | Status |
|---|---|
| Old implementation located | YES |
| Old parser compared | YES |
| PDF upload | FAIL — rebuilt-runtime UI automation not executed |
| Text PDF extraction | PASS |
| Arabic PDF | PASS |
| Coordinate-table extraction | PASS |
| UTM | PASS |
| Lat/Lng | PASS |
| Zone/Hemisphere handling | PASS |
| Coordinate validation | PASS |
| Point ordering | PASS |
| Polygon generation | PASS |
| Map placement | FAIL — rebuilt-runtime visual placement not executed |
| Invalid/ambiguous PDF handling | PASS |
| Old vs Current parity | IMPROVED |
| Real local PDF regression files tested | 2 |
| Safe fixed PDF corpus files | 8 |
| Focused tests | 198 / 198 |
| TypeScript | PASS |
| Relevant lint | PASS |
| Build | PASS |
| Production data modified | NO |

## Remaining launch blockers

1. Run the rebuilt 3014 UI once in an authorized interactive browser: upload the safe Arabic fixture, confirm the four coordinate rows and polygon, repeat the zone-less UTM fixture through the Zone/Hemisphere selector, upload the malformed fixture, then verify 430×932 mobile RTL layout.

## LAUNCH DECISION

**FIND MY LAND = NOT READY**

Remaining launch blockers: **1**

---

## Continuation review — 2026-08-22 (post-quota handover)

The work above was produced in a session that ended at the Runtime-Candidate verification step. This section records an independent re-verification of the state that exists on disk. No source file, config file, fixture, build output, or production data was modified during this review.

### On-disk state confirmed

| Item | Confirmed |
|---|---|
| Repaired Find My Land sources present | `lib/land/intelligence/{resolver,crs-detector,coordinate-protection,geometry-builder,strategy,adapters,contracts}.ts`, `lib/geo/{evidence-extraction,text-extraction}.ts`, `app/api/land/resolve/route.ts`, `src/components/tools/FindMyLand.tsx` |
| Safe PDF corpus present | 8 fixtures + `manifest.json` in `tests/fixtures/find-my-land/` |
| Focused test files present | `tests/land/{find-my-land,find-my-land-pdf-corpus,land-flow}.test.ts` |
| Isolated production build present | `.next-fml2/` complete, including `BUILD_ID`, `routes-manifest.json`, `prerender-manifest.json` and `standalone/server.js` |
| Old `.next` output | Untouched; not deleted, not forced |
| `next.config.js` restored | Yes — no `distDir` override, no `ignoreBuildErrors`, original `standalone` output and origin list; file mtime is later than the build, consistent with the documented revert |
| `tsconfig.json` restored | Yes — `strict: true`, `noEmit: true`, original include/exclude |
| `package.json` | Unmodified by this task |
| Last source modification vs build | Last source edit (`resolver.ts`) precedes the production build; the build and the report were produced after it |

### Source-contract re-verification

Read directly from the files on disk, the required pipeline guarantees hold:

- **Native text before OCR.** `extractText` selects OCR only when native text is under 30 characters; otherwise native text wins. A searchable PDF never takes the OCR path.
- **No invented coordinates.** `filterCoordinateEvidence` accepts an unlabelled decimal pair only when a coordinate label sits directly before it, or when three or more such pairs form a tight local cluster (≤ 0.25° span) that also survives order protection. Isolated ordinary numbers are dropped.
- **No unevidenced UTM zone.** A zone is used only when the document declares it, the user selects it, or exactly one zone is uniquely plausible against the document-country bounds. `inferUtmZone` returns nothing on a tie or a zero-plausibility result, and the resolver then returns the selection-required state with no conversion and no geometry.
- **Point order preserved.** `buildLandGeometry` closes the ring in source order only. There is no radial or convex-hull reordering. An invalid, crossing, or zero-area sequence returns warnings and a centre point, never a polygon.
- **Ambiguous input is not shown as confident.** Zero-length, non-finite, out-of-range and out-of-bounds coordinates are rejected or confidence-reduced before geometry; the selection-required and unresolved paths both return `UNRESOLVED` confidence.
- **UI reads validated rows only.** The coordinate table filters on parsed values, so unconverted evidence placeholders cannot reach the displayed rows, the map, or the copy/share actions.

### Real municipal survey PDF — independent check

The rendered page of the real Jeddah municipal survey report (`تقرير مساحي`, Balady) was inspected directly, independently of the parser.

- The document carries exactly **five** labelled coordinate rows in its `الإحداثيات / الشرقيات / الشماليات` table, each with its own `E` and `N` symbol column. This matches the five rows the repaired parser extracts, and matches the "5/5 rows" parity claim.
- The fifth row repeats the second row's easting and northing exactly. After de-duplication four distinct corners remain.
- Taking those four corners **in document order**, segment 1→2 and segment 3→4 intersect. The documented source sequence is therefore genuinely self-crossing, and the parcel outline shown on the document's own map thumbnail cannot be reproduced without reordering the points.

This independently confirms the central repair decision: the crossing sequence is a property of the source table, not a parser fault, and the correct behaviour is to surface it for review rather than silently reorder the corners into a plausible-looking polygon. The old implementation drew the reordered polygon; the current one does not. On this document the current behaviour is **IMPROVED**.

### Remaining blocker — unchanged

The single outstanding item is still the interactive UI pass against the rebuilt Runtime Candidate. The continuation session had no execution path to close it:

- The device shell for this project was unavailable for the whole session, so the candidate could not be started, queried, or inspected at runtime.
- No authorized browser-control channel was connected, so `http://localhost:3014` could not be driven.

No alternate or unauthorized route to the runtime was attempted. Nothing in the source review, the build output, or the real-PDF check contradicts the earlier direct-runtime results; the gap is access, not evidence of a defect.

**To close it**, start the already-built candidate and run the five interactions listed under "Remaining launch blockers":

```
cd "E:\Akarpromax new 2027\V 2.0 GPT - Copy\.next-fml2\standalone"
set PORT=3014
node server.js
```

Use the same isolated certification database as the earlier run. Do not point the candidate at production data.

### Continuation verdict

Unchanged from the section above: **FIND MY LAND = NOT READY**, remaining launch-blocking defects **1**, and that one item is a verification-access blocker rather than an observed product defect.

---

## Runtime blocker reported by manual testing — 2026-08-22

Manual testing on the Runtime Candidate reported two failures that supersede the earlier direct-HTTP results:

- `http://localhost:3014/tools` — stays on a skeleton and never finishes rendering.
- `http://localhost:3014/tools?tool=findmyland` — fully blank page.

This invalidates the earlier "page returns 200" evidence as a certification signal. A 200 response with a complete HTML document is compatible with both symptoms, because both failures occur after the document is delivered.

**Status: not reproduced, not diagnosed, not fixed.** The session that received this report had no shell on the host and no browser-control channel, so the candidate could not be started, queried, or observed. No console log, network trace, or server log was read. Nothing was changed in response to the report — editing the parser or the page blind, against a code base that currently passes 198/198, would risk turning one blocker into several.

### What the two symptoms jointly imply

`/tools` and `/tools?tool=findmyland` are the same route. The active tool is read from `window.location.search` inside an effect (`readActiveToolParam`), never during server rendering, so **both URLs must produce byte-identical server-rendered HTML**. The two symptoms therefore diverge only after client JavaScript runs, which means:

1. Client JavaScript is executing — a pure asset-404 or a dead bundle would make both URLs look the same.
2. The skeleton on `/tools` is server-rendered markup that hydration never replaces.
3. The blank page on `?tool=findmyland` is consistent with the React root unmounting after an uncaught error on the path that mounts the lazy `FindMyLand` chunk — that path is reached only when the query parameter is present.

The most probable class of root cause is therefore a **client-side exception or hydration failure**, not a missing asset or a broken standalone path. This is a ranked inference from the code, not an observation.

### Concrete defects found by source inspection

Both were found while tracing the render path. Neither is confirmed as the cause.

**1. `useSyncExternalStore` return value destructured as an array** — `src/components/PublicPageShell.tsx`

```js
const [path] = useSyncExternalStore(subscribeToLocation, getLocationSnapshot, () => EMPTY_SERVER_PATH);
```

The snapshot is a string, not a tuple. Array-destructuring a string yields its first character, so `path` is `"/"` on the client and `undefined` on the server (destructuring `""`). Every public page using this shell therefore renders a different `currentPath` on the server than on the client, which is a hydration mismatch on the outermost shell that wraps the Tools page. Correct form is a plain assignment:

```js
const path = useSyncExternalStore(subscribeToLocation, getLocationSnapshot, () => EMPTY_SERVER_PATH);
```

This file predates the Find My Land repair work, so it is a pre-existing defect rather than a regression from it.

**2. UTF-8 BOM ahead of the `"use client"` directive** — `src/components/tools/FindMyLand.tsx`

The file begins with the bytes `EF BB BF` before the directive. `src/components/tools/ToolsGate.tsx` has the same BOM and predates this work, which argues the toolchain tolerates it; it is recorded here as a low-ranked candidate and as a hygiene item, not as a diagnosis.

### Diagnostic added

`scripts/fml-runtime-diagnose.mjs` — dependency-free, GET-only, touches no database. Run against the candidate:

```
node scripts/fml-runtime-diagnose.mjs http://127.0.0.1:3014
```

It fetches both URLs, reports whether the skeleton markup is present in the server-rendered HTML, enumerates and re-fetches every referenced script and stylesheet to surface any non-200, times `/api/user-context` and `/api/land/resolve`, and confirms whether the two URLs' server HTML is identical. Its output plus the DevTools Console contents for both URLs is sufficient to separate the remaining candidate causes.

### Certification status after this report

| Item | Status |
|---|---|
| `/tools` renders | FAIL — reported skeleton that never resolves |
| `/tools?tool=findmyland` renders | FAIL — reported blank page |
| Console fatal errors | UNKNOWN — not captured |
| Find My Land UI E2E (5 remaining interactions) | BLOCKED — cannot start behind a non-rendering page |
| Production build | PASS — build artifacts intact; no rebuild attempted or required yet |
| Production data modified | NO |
| Unrelated features modified | NO |

The earlier parser, conversion, ordering, polygon and validation results are unaffected by this blocker and remain as recorded above. They are source- and test-level results; the blocker is at the page render layer.

**FIND MY LAND = NOT READY. Remaining launch blockers: 1** — the non-rendering Tools page, undiagnosed.

### Fix applied — `PublicPageShell.tsx`

`const [path] = useSyncExternalStore(...)` → `const path = useSyncExternalStore(...)`. One statement plus an explanatory comment; no other file touched, no parser/geo logic changed. Type-neutral: the hook is typed as returning `string`, and `resolvedPath` stays `string`.

Not yet type-checked, linted, rebuilt, or run — the session applying it still had no shell on the host.

Note for the next runtime pass: the reported `/tools` skeleton is `app/loading.tsx`, matching it element for element (32-wide logo block, four nav bars, 20-wide button, eyebrow/title/description bars, three `h-72 rounded-3xl` cards). That is the **route-segment Suspense fallback**, so the `/tools` segment is never resolving — a server/RSC-level stall rather than a client hydration crash. The shell fix above corrects a client hydration mismatch and should not be expected to clear it on its own. `scripts/fml-runtime-diagnose.mjs` discriminates the two directly: if the server HTML for `/tools` contains the loading skeleton and no `tc-flagship`/`tc-grid` markup, the stall is server-side.

---

## Root cause of the unstyled page — CONFIRMED

Evidence: the page source and browser console from the running candidate.

Every static request returns **HTTP 500**, not 404:

```
/_next/static/chunks/43aq8dm05kelw.css      500
/_next/static/chunks/1hszx4a_hh5jb.css      500
/_next/static/chunks/23naakdz7p4rk.css      500
/_next/static/chunks/*.js  (all 9)          500
/_next/static/media/*.woff2 (all 3)         500
/favicon-32.png  /favicon-16.png            500
/manifest.json                              500
```

Two facts settle it.

**1. A 500 on every asset, including `public/` files, is not a missing-file condition.** A missing file returns 404. A 500 on the entire tree — chunks, fonts, favicons and `manifest.json` alike — means the file reads themselves are failing, i.e. the directory the server is reading from is gone.

**2. The server is not running this build.** The RSC payload in the served HTML carries `"b":"Bibfn0ux5pej_zv6aF9C8"`. That build id matches nothing on disk:

| Directory | Build id |
|---|---|
| `.next-fml2` (the certification candidate) | `JdlKiEAC9GLH8Xv8FYTvi` |
| `.next.passc1-prebuild` | `ptD7A85wn-gtsdPslintN` |
| `.next-fml` (aborted; no `BUILD_ID` file) | static dir `oizXzKFepVBdTr0wPObhl` |
| `.next` | no build present at all |
| **served on :3014** | **`Bibfn0ux5pej_zv6aF9C8`** |

The served HTML also references `/_next/static/chunks/1hszx4a_hh5jb.css` and `/_next/static/chunks/0fnsewg6sjdx4.js`, neither of which exists in `.next-fml2`.

### Root cause

> The process listening on port 3014 is a **stale Next.js server left over from an earlier build whose output directory has since been deleted or overwritten** (`cleanDistDir` is enabled, so each subsequent build wiped it). The process still holds its compiled application in memory, so it renders and streams HTML correctly and returns 200 for pages — which is why the earlier "`GET /tools` → 200, 16/16 assets 200" check passed at the time and why the skeleton once appeared correctly styled from browser cache. But every read from its now-missing output directory fails, so all JavaScript, CSS, fonts and `public/` assets return 500. With no JavaScript, `?tool=findmyland` cannot activate the tool, because the active tool is read from `window.location.search` on the client.

The `.next-fml2` candidate was never the thing under test. Its packaging was verified correct and remains so: `standalone/.next-fml2/static` and `standalone/public` are present and belong to this build, `assetPrefix` and `basePath` are empty, and `server.js` resolves `distDir` to the directory that exists.

### Fix

Not a code change. Stop the stale process holding 3014 and start the actual candidate:

```
scripts\RESTART-3014.cmd
```

It lists what is listening on 3014, stops the PID you confirm, and starts `.next-fml2\standalone\server.js` on 3014. Set the isolated certification database env vars in that window first; never point it at production.

To also include the `PublicPageShell` hydration fix, rebuild first with `node scripts\fml-candidate-build.mjs`, then restart.

### Certification status

The three earlier "blockers" were one problem wearing three faces — infinite skeleton, blank page, unstyled page were all the same dead server. No parser, geo, page or shell defect is implicated in any of them.

Still open: the five Find My Land UI interactions, which can now actually be run once 3014 serves the real candidate.
