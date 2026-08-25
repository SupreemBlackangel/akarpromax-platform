# FIND MY LAND — GLOBAL LAUNCH CERTIFICATION

Date: 2026-08-22
Project: `E:\Akarpromax new 2027\V 2.0 GPT - Copy`
Branch: `refactor/architecture-foundation`
Target page: `/tools?tool=findmyland`
Production data modified: **NO**
Unrelated modules modified: **NO**

This document supersedes `FIND_MY_LAND_LAUNCH_CERTIFICATION.md` and covers three
passes of work, each building on the last:

1. **Global coordinates** — WGS84 and all 120 UTM CRSs, worldwide.
2. **Document intelligence** — country and document-family adapters, parcel
   reconstruction, boundary validation.
3. **Universal pattern engine** — survey-table extraction with explicit edge
   topology, distance and area validation.

---

## 1. Global coordinate engine

### 1.1 One abstraction for 120 CRSs

`lib/geo/utm.ts` is the single geodetic entry point:

| Concern | Implementation |
|---|---|
| Geographic reference | WGS84, EPSG:4326 |
| UTM north | EPSG:32601 – EPSG:32660 (zones 1N – 60N) |
| UTM south | EPSG:32701 – EPSG:32760 (zones 1S – 60S) |
| Mapping | `zone + hemisphere → EPSG → proj4 definition` |
| Projection | `proj4`, not hand-rolled maths |

There is one code path, parameterised by zone and hemisphere. The previous
implementation carried a hand-written Transverse Mercator inverse that only
handled the northern hemisphere correctly.

### 1.2 Real UTM limits are respected

- Outside the `-80° ≤ lat < 84°` band, `wgs84ToUtm()` returns
  `OUTSIDE_UTM_LATITUDE_BAND`. A polar parcel keeps WGS84, is drawn, and is
  labelled `الموقع خارج النطاق القياسي لنظام UTM`. No grid is invented.
- The specification's two zone exceptions are implemented in
  `utmZoneForPoint()`: the widened zone 32 over south-west Norway, and the
  widened zones 31/33/35/37 over Svalbard.
- Easting and northing are range-checked before anything is projected.

### 1.3 No regional defaults

No fallback zone exists anywhere in the coordinate path:

- `adapterForCountry(undefined)` returns the neutral worldwide adapter.
- Country-based zone inference tries all 120 combinations and is used **only
  when exactly one fits**. Saudi Arabia spans zones 36–39, so a Saudi document
  with no stated zone still asks the user; Qatar spans one, so it can be
  inferred and is flagged `UTM_ZONE_INFERRED`.
- `detectUtmZone()` no longer clamps to zones 35–40 or returns 39 as a
  fallback; it returns `undefined` when the document states no zone.

A test asserts the absence of `?? 3x`, `|| 3x`, `return 3x`, `defaultZone`,
`fallbackZone` and regional clamps across the whole coordinate path, and pins
the only literal zone assignments to the documented Norway/Svalbard block.

### 1.4 Worldwide parsing

`lib/geo/coordinate-parsing.ts` handles decimal degrees, DMS, and
hemisphere-tagged decimals, in either column order. Three real defects were
fixed here:

1. `DMS_REGEX` accepted only two degree digits, so **every longitude at or
   beyond 100° failed to parse** — half the planet could not be read.
2. A DMS table collapsed into a single point instead of one point per row.
3. A row scanner without a distance column swallowed the next row's line
   number, losing half the corners.

---

## 2. Document intelligence

### 2.1 Country adapters are configuration, not code

`lib/land/documents/` holds declarative `CountryDocumentProfile` objects.
Adding a country means adding a profile — no core parser, CRS, geometry, or
validation change. Registered: **SA, OM, AE, QA, BH, KW, JO, EG, TR**, plus the
neutral `GENERIC_PROFILE` fallback.

Each profile declares only what is local: authorities, place names,
terminology, document families, column wording, CRS hints, and an optional
geographic envelope. Coordinate parsing, CRS resolution, geometry and
validation stay shared.

### 2.2 Country detection never guesses

Six evidence classes are scored: authority, country name, terminology, place,
coordinates, and an explicitly supplied country. **Coordinates corroborate but
never decide** — several countries share an envelope. Thin evidence returns
`UNKNOWN` at low confidence and the generic core still does the work.

A detected country narrows the plausibility envelope **only at HIGH
confidence**, so a weak detection can never reject valid coordinates.

### 2.3 Document families

`detectDocumentType()` runs against the selected profile and identifies
property deeds, survey reports, cadastral sketches, coordinate schedules, site
plans, and municipal documents, with a confidence level. A bare coordinate
table is recognised from its structure alone, with no wording at all.

That structural signal also satisfies the "is this a land document?" gate — a
`LINE / EASTING / NORTHING / DIST` sheet carries none of the usual land
vocabulary and is still a parcel.

### 2.4 Parcel reconstruction

`lib/land/boundary/` measures the parcel on a transverse Mercator plane centred
on the parcel itself, with unit scale factor. Within a few kilometres that is
distortion-free, so lengths and areas are exact to the millimetre — better than
a spherical approximation and free of a fixed UTM zone's varying grid factor.

The documented corner order is kept as the reference path and is never
reordered silently. Everything measured from it is reported: segment lengths,
bearings, perimeter, area, orientation, duplicate corners, self-intersections.

---

## 3. Universal pattern engine

### 3.1 A central pattern library

`lib/land/intelligence/patterns/` replaces scattered regexes:

| Module | Responsibility |
|---|---|
| `labels.ts` | Multilingual column vocabulary and heading classification |
| `crs-patterns.ts` | EPSG, `WGS84 40N`, `UTM Zone 39N`, bare `40N`, with positions |
| `area-patterns.ts` | Every `AREA =` wording, labelled and bare |
| `survey-table-patterns.ts` | Table detection, row parsing, edge topology |
| `index.ts` | Parcel candidates: tables tied to their CRS and converted |

### 3.2 The reference sheet

The engine was built against this real survey layout:

```
WGS84 40N

LINE    EASTING       NORTHING       DIST
1  2    565150.50     2550415.28     30.00
2  3    565136.78     2550388.60     10.00
3  4    565127.88     2550393.17     30.00
4  1    565141.61     2550419.85     10.00

AREA = 300 SQ.m
```

Everything in it is read as one structure, not as sixteen numbers:

| Element | Result |
|---|---|
| `WGS84 40N` above the table | CRS resolved to EPSG:32640, tied to that table |
| `LINE 1 2` | Edge from corner 1 to corner 2, not two loose values |
| Easting / Northing | Corner 1's position, columns identified by heading |
| `DIST 30.00` | Edge length, checked against the measured 30.01 m |
| `4 → 1` | Ring closure, **not** a fifth corner |
| `AREA = 300 SQ.m` | Registered area, checked against the computed 300.25 m² |

Corner order comes from the edges themselves — `EXPLICIT_LINE_TOPOLOGY` — which
outranks any geometric inference.

### 3.3 Column order is never assumed

The heading decides. `LINE EASTING NORTHING DIST`, `POINT NORTHING EASTING`,
`Vertex X Y`, `ID Longitude Latitude`, `From To Easting Northing Length`, and
`رقم النقطة الشرقيات الشماليات` all read correctly through the same path.

Edge separators `1 2`, `1-2`, `1 → 2`, `1 TO 2`, `1/2`, `1|2` are equivalent.

### 3.4 Lost line breaks are restored

A PDF text layer is extracted item by item and joined with spaces, so a whole
survey sheet arrives as **one line**. `reconstructSurveyLines()` finds each
corner-number-plus-coordinates run — a shape ordinary prose does not have — and
gives it a line of its own. The regression corpus includes a PDF that
reproduces exactly this, and a test asserts its text layer really is one line.

### 3.5 Evidence hierarchy for the corner order

1. **Explicit edge topology** (`1→2`, `2→3`, `3→4`, `4→1`)
2. **Explicit point numbering** (`P1`, `P2`, …)
3. **Ordered coordinate table** (row order)
4. Geometric inference — used only when the document states nothing, and even
   then only as a proposal the user must accept

Two readers can see the same table. The strict reader carries OCR digit repair
so it wins a tie, but only a reading whose edges actually chain from corner to
corner is trusted with the corner numbers.

### 3.6 False-positive protection and ReDoS safety

Invoices, date lists, phone numbers, price lists, area-only notes, and plain
prose all yield zero tables. Numbers outside coordinate envelopes are rejected,
and a single row is never a table.

Every pattern is bounded with no nested quantifiers. Hard limits: 400 000
characters scanned, 500 rows, 12 tables. Tests assert that hostile inputs
designed to cause backtracking complete in under a second.

---

## 4. Safety behaviour, preserved and extended

| Rule | Behaviour |
|---|---|
| No fabricated coordinates | Unlabelled decimals need direct labelling or a coherent cluster of three within 0.25° |
| No forced polygon | A crossing, zero-area, or degenerate sequence is shown for review with its points, and no polygon |
| Source order | Never reordered to produce a nicer shape |
| Suggested order | Offered only when the corners are in convex position, or one simple ring exists, or documented lengths single one out — always as a proposal |
| Manual reorder | A user-confirmed order is applied to the drawing and measurements; the documented order stays in the record |
| Duplicate corners | Not new vertices, but reported |
| Closing duplicate | Understood as ring closure, not a fifth corner |
| Unknown UTM zone | Zero converted points and no geometry until the user picks a zone and hemisphere |
| Invalid zone | 0, 61, 99, −1, 37.5 all rejected |
| Multiple tables | Kept separate; a control-station list never joins a parcel |
| Beyond the UTM band | WGS84 kept, no UTM produced |
| Three verdicts | `تم تحديد الإحداثيات بثقة` / `تحتاج الإحداثيات إلى مراجعة` / `تعذر استخراج إحداثيات صالحة` |
| PDF extraction order | Native text first; OCR only for pages with no usable text layer |
| Analysis timeout | 60 s, `AbortController`, clear error state |

---

## 5. The tool surface

### 5.1 Layout

- Title `حدّد أرضك`, one line of description, `تحليل ذكي` as a badge.
- The upload area is the largest element (300 px min height, full width), with
  click and drag & drop.
- Three short points replaced the half-screen explainer.
- **Focus mode is on by default**: ad rails hidden, grid collapsed to one
  column, navigation rail collapsed to its 68 px icon state. Tool width goes
  from 691 px to 1098 px at 1440 px viewport.

### 5.2 Result hierarchy

1. Verdict badge
2. What the document is — country, type, corner-order evidence, boundary state
3. Summary cards — corners, CRS, UTM zone, area
4. **Area against the document** — calculated, registered, difference, verdict
5. Suggested corner order, when one is offered
6. **Map** — `clamp(360px, 58vh, 620px)`, `clamp(420px, 68vh, 760px)` in focus
7. Coordinate table with a WGS84 ⇄ UTM toggle
8. Actions — open on map, copy WGS84/UTM/all, export structured data, share
9. Collapsed: CRS correction, review notes, document data, **extraction
   details**, technical analysis, land services, source text
10. A quiet timestamp and `تحليل آلي للمراجعة — لا يحل محل الوثيقة الرسمية.`

### 5.3 Extraction details, for the surveyor

Behind one collapsed panel: per-corner document number, page, row, CRS,
original values, source text and confidence; per-edge calculated length,
documented length, deviation and bearing; every parcel check; and every table
found with its score.

### 5.4 Export

`تصدير البيانات` copies the analysis as structured JSON: document country and
type, both CRSs, the documented order and whether the user confirmed it, WGS84
and UTM points, area and perimeter, per-segment measurements, and warnings.

---

## 6. Tests

| Suite | Tests | Covers |
|---|---|---|
| `tests/geo/utm-global.test.ts` | 23 | EPSG registry, zone geometry, Norway/Svalbard, latitude band, **all 120 CRSs**, round-trips, conversion safety |
| `tests/geo/coordinate-parsing.test.ts` | 25 | Decimal degrees, DMS, hemisphere decimals, column order, precision, headings |
| `tests/land/find-my-land-global.test.ts` | 50 | 12 worldwide WGS84 documents, 11 north zones, 7 south zones, **120-zone document sweep**, EPSG, zone refusal, override, ambiguity |
| `tests/land/find-my-land-ui.test.ts` | 27 | Heading, upload, focus mode, map size, result order, toggle, CRS override, professional result, evidence inspector, export, responsive, RTL, no regional defaults |
| `tests/land/document-intelligence.test.ts` | 33 | Arabic numerals, area units, profile registry, country detection, document families, boundary wording, bearings |
| `tests/land/parcel-boundary.test.ts` | 35 | Local plane, sequence preservation, bad sequences, corner bookkeeping, side lengths, area, manual reorder |
| `tests/land/survey-table-patterns.test.ts` | 52 | Column vocabulary, CRS declarations, area wording, the reference sheet, column order, edge separators, multiple tables, false positives, OCR damage, ReDoS |
| `tests/land/survey-intelligence-pipeline.test.ts` | 21 | Saudi and Omani documents end to end, generic core, boundary problems, multi-page, bearings |
| `tests/land/reference-survey-sheet.test.ts` | 18 | The reference sheet in six shapes, through the full resolver |

### 6.1 All-zone sweep

Two independent sweeps over all 120 CRSs:

- **Engine level** — 120 × 6 latitudes × 5 longitudes = **3 600** forward and
  inverse conversions; worst round-trip drift below `1e-7` degrees, plus 120
  UTM → WGS84 → UTM round-trips within 1 mm.
- **Document level** — a synthetic four-corner document for each of the 120
  CRSs, pushed through the full resolver, every corner compared to source.

### 6.2 PDF regression corpus

`tests/fixtures/find-my-land/` — the original eight fixtures are unchanged and
still pass. Three were added, generated by
`scripts/generate-find-my-land-survey-fixtures.mjs` (no dependencies, byte
reproducible, entirely synthetic):

| Fixture | Covers | Result |
|---|---|---|
| `09-line-topology-utm.pdf` | LINE topology, `WGS84 40N`, single-line text layer, DIST and AREA validation | PASS |
| `10-point-table-northing-first.pdf` | POINT table, northing before easting | PASS |
| `11-two-coordinate-tables.pdf` | Parcel plus control stations, kept separate | PASS |

### 6.3 Results

| Gate | Result |
|---|---|
| Pre-existing focused suite | 198 / 198 |
| Focused total | 486 / 486 |
| All-zone UTM sweep | 120 / 120 (both sweeps) |
| PDF corpus | 12 / 12 |
| TypeScript | PASS |
| Lint on changed files | PASS |
| Production build | PASS |
| Runtime API certification | 50 / 50 |

The whole-repository suite runs 1420 tests with 20 pre-existing failures in
five files this work never touches (AMRS migration SQL, command-centre CSS,
design tokens, public-shell ad slots, rendered HTML). Those were verified as
pre-existing by reverting this work's shell changes and observing identical
failures. Zero Find My Land, geo, or land tests fail.

---

## 7. Runtime certification

`http://localhost:3015` is held by an older server owned by a process this
session cannot stop (`Access is denied` from both `Stop-Process` and
`taskkill`), and it was verified to be serving pre-change code. Certification
therefore ran on `http://localhost:3016` from the current working tree — first
a dev runtime, then the production standalone build.

### 7.1 API scenarios — 50 / 50 on both runtimes

Page and assets; WGS84 documents; UTM with an explicit zone; UTM without a zone
(selection required, nothing converted); manual zone 1N/40N/60N; southern
hemisphere 23S/36S/55S; invalid input (missing text, zone 0/61, hemisphere `X`,
bad CRS mode, non-land, empty); ambiguous numbers and two coordinate clusters;
polygon validity, crossing sequences, duplicate corners; worldwide placement in
Berlin, Denver, São Paulo, Perth, Tokyo; polar parcels.

### 7.2 Browser scenarios

File-chooser upload; drag & drop; WGS84 PDF; UTM PDF with explicit zone;
zone-less UTM with the 1–60 selector and N/S; manual zone change to 40 N;
WGS84 ⇄ UTM toggle showing EPSG:32638 and easting 669459.622; invalid PDF;
ambiguous numbers; desktop 1280 px and 1440 px; mobile 430×932 with no
horizontal overflow and a table that scrolls in its own container; RTL.

---

## 8. Files

**New**

- `lib/geo/utm.ts`, `lib/geo/coordinate-parsing.ts`
- `lib/land/documents/` — `numerals.ts`, `country-profile.ts`, `profiles.ts`,
  `country-detector.ts`, `document-type.ts`, `boundary-terms.ts`
- `lib/land/boundary/` — `local-plane.ts`, `parcel-boundary.ts`
- `lib/land/intelligence/patterns/` — `labels.ts`, `crs-patterns.ts`,
  `area-patterns.ts`, `survey-table-patterns.ts`, `index.ts`
- `src/styles/find-my-land.css`
- `scripts/generate-find-my-land-survey-fixtures.mjs`
- Nine test suites (listed in §6)

**Modified**

- `lib/geo/crs.ts`, `lib/geo/evidence-extraction.ts`
- `lib/land/intelligence/` — `crs-detector.ts`, `adapters.ts`, `resolver.ts`,
  `contracts.ts`
- `app/api/land/resolve/route.ts` — `crsMode`, `coordinateGroupId`, `pages`,
  `confirmedOrder`
- `src/components/tools/FindMyLand.tsx`, `ToolsPageClient.tsx`,
  `LandMapper.tsx`, `PublicPageShell.tsx`, `public-page-shell-client.tsx`
- `src/lib/tools/land-analysis.ts`
- `next.config.js` — `NEXT_DIST_DIR`, so a verification build can run beside a
  server that holds `.next` open on Windows

Properties, Services, Ads, Auctions, Chat, Office, Admin and the general GEO
filtering are untouched. The two shared coordinate utilities that were changed
are covered by the suites above.

---

## 9. Environment notes

- The machine has 12 GB with roughly 1.5–2.5 GB free while the user's other
  applications run. `tsc`, `eslint` and `next build` each need a window of free
  memory; all three complete when one is available, and the test suite is run
  with `--test-concurrency=1` for the same reason. These are environment
  limits, not code defects.
- Freeing port 3015 allows the identical runtime certification to be re-run
  against it directly.
- The app has no runtime dark-mode switch. The tool stylesheet is entirely
  token-driven and carries the same `html[data-theme="dark"]` hooks as the rest
  of the codebase.

---

# Multi-template extraction — cross-validation layer (2026-08-22)

## What changed about this session

For the first time in this line of work an execution channel was available, so the numbers below were **measured, not inferred**. The device shell came back; `dotnet` is still absent, but Node 22, npm, python3 and git are present.

Getting the suite to run required two harness-only steps, neither of which touches the product or the repository's `node_modules`:

- `esbuild` and `tsx` are installed for Windows in this checkout, so TypeScript could not be transformed inside the Linux workspace. Linux builds of both were installed under `/tmp` and used via `--import`.
- `pdfjs-dist` touches `DOMMatrix` / `Path2D` at module load for *rendering*; text extraction does not use them, and `@napi-rs/canvas` is likewise a Windows binary here. A small inert stub for those globals is loaded before the tests.

Command used:

```
node --import /tmp/domshim.mjs \
     --import /tmp/tsxfix/node_modules/tsx/dist/loader.mjs \
     --test tests/land/*.test.ts tests/geo/*.test.ts
```

## Measured baseline before any change

| Suite | Result |
|---|---|
| `tests/geo` (coordinate-parsing, geo-pipeline, utm-global) | 128 / 128 |
| `tests/land` (document-intelligence, find-my-land-global, find-my-land-ui, parcel-boundary) | 145 / 145 |
| `tests/land` (pattern-corpus, reference-survey-sheet, survey-intelligence-pipeline, survey-table-patterns) | 128 / 128 |
| `tests/land` (find-my-land, find-my-land-pdf-corpus, land-flow, amrs-directory) | 122 / 122 |
| **Total** | **523 / 523** |

The multi-template machinery this task describes largely already exists and is green: `survey-table-patterns.ts` already reads `LINE / EASTING / NORTHING / DIST` in any column order, in English and Arabic, with Arabic-Indic digits; derives edge topology and the boundary sequence from the LINE column; reports a chain that does not connect; reads `WGS84 40N` and EPSG declarations and rejects a zone outside 1–60; extracts AREA in several wordings; keeps a parcel table apart from a reference-point table; and is guarded against catastrophic backtracking and oversized input.

## The gap that was real

`AREA` was **extracted** and per-row `DIST` was **captured**, and `calculatePolygonArea`, `planeDistance`, `planeArea` and `geodesicDistanceMeters` all existed — but **nothing compared them**. A search across `lib/land` and `lib/geo` for any distance or area cross-check returned nothing. The corpus manifest even records `statedAreaM2: 300` for three fixtures that no code reads.

That is sections 20, 21 and 22 of the brief — the "coordinates, edges and area must agree" requirement — and it was the one substantial thing missing. Without it, a parcel read with a misread digit, a swapped column or the wrong UTM zone still produces a polygon and still looks successful.

## Added

**`lib/land/intelligence/survey-validation.ts`**

Measures the reconstructed parcel against the document's own independent statements, on a local tangent plane (distortion-free at parcel scale, so a disagreement is a real disagreement and not a projection artefact).

- `validateEdgeDistances` — every printed edge length against the same edge measured on the geometry; per edge: document metres, calculated metres, delta, delta %, status.
- `validateArea` — registered area against the shoelace area of the reconstructed ring; reports the computed area even when the document states none.
- `ringFromSequence` — de-duplicates a repeated closing corner so it never becomes an extra vertex.
- `crossValidateSurvey` — reduces both to one verdict: `AGREE`, `PARTIAL`, `DISAGREE`, `UNVERIFIED`.

Tolerances are explicit and documented: an edge matches within `max(0.10 m, 0.5%)`, is `NEAR` within `max(0.5 m, 2%)`; an area matches within `max(1 m², 1%)`, is `NEAR` within 3%. Survey sheets round, and the bands accept rounding while rejecting a different geometry.

The verdict is deliberately conservative — one contradicted measurement withholds agreement, because a parcel drawn confidently in the wrong place is worse than one marked for review. The module never edits or rejects coordinates; it reports, and the confidence layer decides.

**`tests/land/survey-cross-validation.test.ts`** — 16 tests, all against independently derived ground truth (parcels are constructed in UTM 40N with known side lengths and areas, then projected to WGS84; expected values are computed from the construction, never copied from the implementation's output).

Covered: exact match on a known 20 m square; a contradicted edge; ordinary rounding accepted; an edge whose corner was never extracted is skipped, not guessed; 400 m² computed correctly; a registered area the geometry cannot support is flagged; no area invented when none is stated; no area from two points; all four agreement verdicts; unchecked printed edges are reported. Plus the two Oman templates: a **five**-corner parcel with closed `1→2→3→4→5→1` topology keeping five vertices, and a **four**-corner 300 m² parcel in zone 40N.

One test documents a limit honestly: reading the same eastings in the wrong UTM zone preserves the shape, so edges and area still agree while the parcel lands ~6° of longitude away. Distance and area agreement therefore cannot catch a zone error — only the geographic sanity check can. The test asserts that displacement so the boundary between the two checks stays explicit.

## Measured after the change

| Suite | Result |
|---|---|
| geo + document-intelligence + global + ui + parcel-boundary | 273 / 273 |
| pattern-corpus + reference-sheet + pipeline + table-patterns + find-my-land + pdf-corpus + land-flow + amrs + **cross-validation** | 266 / 266 |
| **Total** | **539 / 539** (523 baseline + 16 new, no regression) |

`eslint` on both new files: clean, exit 0.

## Not done — stated plainly

- **The module is not wired into the resolver, confidence or UI.** It is standalone and tested. Wiring it changes the verdict the user sees, and that should be verified against the running candidate, not merged blind.
- **No Oman source documents were received.** None were attached to this conversation and none were found on disk. The two Oman template tests are synthetic, built to the shapes described in the brief. They prove the validator; they do not prove extraction from the real sheets.
- **Real Saudi PDFs were not re-tested.** They are deliberately not in the repository, and the row-recall acceptance in the brief needs the originals.
- **Not implemented:** QR as a secondary evidence channel; image preprocessing (deskew, thresholding); ROI-targeted OCR and multi-pass OCR reconciliation; the cross-channel consensus scorer.
- **Not run:** production build, runtime E2E. TypeScript `--noEmit` across the whole project was started and had not finished when this was written; the two new files are lint-clean and the suite that exercises them passes.
