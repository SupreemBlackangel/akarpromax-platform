# REGRESSION RISK REGISTER — AkarProMax Phase 0.5

**Status:** audit artefact, read-only. **Date:** 2026-08-19.
**Sources:** the ten domain fragments + `11-infrastructure.md` + `WEB-OFFICE-CONTRACT-MATRIX.md`,
`out/docs/product-audit/FEATURE-PARITY-MATRIX.csv` (1,335 rows; 390 rows carry `regression_risk=High`,
273 of those also carry a `RESTORE` or `FIX REGRESSION` decision), and the authoritative technical
baseline `cur/docs/release/PHASE-0-BASELINE.md`.

---

## 1. What this register is for

This is **not** a bug list. Every defect in this product is already recorded in
`PHASE-0-BASELINE.md` (N1–N28, P0-1…P0-8, P1-1…P1-12) and every capability gap is already recorded in
`FEATURE-PARITY-MATRIX.csv`. This document records something different and narrower:

> **the concrete ways in which a plausible, well-intentioned modernization step would silently destroy
> a capability that exists today or existed in a previous AkarProMax version.**

The product rule from `BRIEF.md` is that a capability may be *replaced* but never *silently lost*. The
dangerous moments are therefore not the known-broken things — those are visible. The dangerous moments
are the **cleanups**: deleting a file with no importers, consolidating two implementations onto one,
moving DDL out of the request path, turning on the full test suite, renaming a directory, reformatting
a file with mangled literals. Each of those is individually correct and each can quietly take a
capability with it.

Three loss modes recur throughout this register and are worth naming once:

1. **Dead-code deletion.** A component, route or module with zero importers is frequently the *only
   remaining specification* of a capability whose entry point was removed. Deleting it converts a
   restorable regression into an unrecoverable one. (RR-12, RR-49, RR-53, RR-55, RR-56, RR-43.)
2. **Consolidation asymmetry.** Where two implementations of the same concept exist, each one usually
   holds capabilities the other lacks. Picking a winner without an explicit union-of-capabilities pass
   loses the loser's half. (RR-14/15/16, RR-21/23, RR-30, RR-38, RR-60.)
3. **Substrate migration.** Moving the runtime, storage or schema-creation mechanism changes *which
   tables and files exist at all*. A migration that reproduces only what the migration files describe
   drops the 75 tables that only an `ensure*` path creates. (RR-27, RR-28, RR-30, RR-31, RR-32, RR-33.)

## 2. How to use it as a gate

- **Before any refactor PR is opened**, the author names the RR-IDs the change touches. A change that
  touches an RR-ID and does not link its required regression test is not reviewable.
- **The required regression test must land before or with the change, not after.** For entries whose
  test asserts *old* behaviour (RR-01…RR-06, RR-14…RR-16), the test must be written against the
  current tree first and must pass, so that the refactor's effect is visible as a red test rather than
  as a support ticket six weeks later.
- **Critical entries are release-blocking.** No Critical entry may be closed by deleting the capability;
  it may only be closed by (a) preserving it, (b) superseding it with demonstrated equal-or-better
  functionality plus a passing test, or (c) an explicit, recorded product-owner decision to retire it.
- **Two entries are pre-emptive** and must be honoured before any Phase-1 work starts: RR-51 (turning
  on the 60 unrun test files will surface pre-existing failures that will look like new breakage) and
  RR-52 (six test files encode stale expectations and must be fixed rather than the product).
- **Deletion moratorium.** Until the product-owner decisions listed in fragments 02/04/05/07/08/09/10
  are recorded, no file named in this register under "Current implementation" may be deleted, even if
  it has zero importers.

## 3. Entry counts by severity

| Severity | Count | Meaning |
|---|---|---|
| **Critical** | 20 | The capability, or its only surviving specification, is destroyed irreversibly, or user data is lost. Release-blocking. |
| **High** | 32 | The capability is lost but is recoverable from `hist/old-tag`, `ref/*` or git history at material cost. |
| **Medium** | 13 | A sub-capability, quality attribute or operator affordance is lost; recoverable cheaply. |
| **Low** | 5 | A cosmetic, debug or single-surface affordance is lost. |
| **Total** | **70** | |

---

## 4. Summary table

| Risk ID | Capability at risk | Domain | Severity | Phase most likely to trigger it |
|---|---|---|---|---|
| RR-01 | Arabic labelled point rows (`نقطة`/`نقطه`) in land documents | F FindMyLand | Critical | Phase 3 — parser consolidation |
| RR-02 | Header-less generic 3-column UTM rows | F FindMyLand | Critical | Phase 3 — parser consolidation |
| RR-03 | Accumulate-all-patterns parsing (vs first-match-wins) | F FindMyLand | High | Phase 3 — parser consolidation |
| RR-04 | Blind OCR letter→digit repair (`S→5`, `B→8`, `Z→2`, `G→6`, `l/I/!→1`) | F FindMyLand | Medium | Phase 3 — parser consolidation |
| RR-05 | Zone-less UTM zone inference with tie abstention | F FindMyLand | High | Phase 3 — parser consolidation |
| RR-06 | Coordinate-order / plausibility protection | F FindMyLand | High | Phase 3 — parser consolidation |
| RR-07 | Legacy live endpoint `POST /api/geo/extract` | V Geo | High | Phase 3 — parser consolidation |
| RR-08 | Legacy live endpoint `POST /api/land/analyze` (DXF/KML/KMZ/CSV/TXT/DOCX readers) | F FindMyLand | Critical | Phase 3 — parser consolidation |
| RR-09 | KML export of a resolved parcel | F FindMyLand | High | Phase 2 — tools UI restore |
| RR-10 | Manual coordinate paste / add-point entry | F FindMyLand | High | Phase 2 — tools UI restore |
| RR-11 | Perimeter figure in the land result | F FindMyLand | Low | Phase 2 — tools UI restore |
| RR-12 | `LandMapper.tsx` — the fourth land parser | F FindMyLand | Critical | Phase 1 — dead-code cleanup |
| RR-13 | Land share link + QR payload | E Land | Low | Phase 2 — tools UI restore |
| RR-14 | Messaging family A: attachments, archive, per-participant read state, message typing | J Messaging | Critical | Phase 3 — messaging unification |
| RR-15 | Messaging family B: context enum, server-side validation, size caps, inbox, audit, outbox | J Messaging | Critical | Phase 3 — messaging unification |
| RR-16 | Messaging family C: the old `GET/POST /api/services/messages` URL contract | J Messaging | High | Phase 3 — messaging unification |
| RR-17 | The customer's existing shared request conversation and its history | Services | Critical | Phase 1 — P0-2 isolation fix |
| RR-18 | `tests/messages-contract.test.mjs:81-83` codifies the leak as expected behaviour | J Messaging | High | Phase 1 — P0-2 isolation fix |
| RR-19 | Messaging identity key: `users.id` uuid vs email-string | J Messaging | Critical | Phase 3 — messaging unification |
| RR-20 | Property owner as a derivable conversation participant | D Properties | High | Phase 3 — messaging unification |
| RR-21 | Ads: raw-SQL D1 engine's targeting, approval, budget, frequency, day-parting, signed tracking | Advertising | Critical | Phase 3 — advertising consolidation |
| RR-22 | The 30 s `activeAdsCache` and route-level `cached()` on the ads match path | Advertising | High | Phase 2 — N+1 batching |
| RR-23 | Two incompatible `ad_campaigns`/`ad_creatives` schemas on one table name | Advertising | Critical | Phase 2 — schema migration |
| RR-24 | Old Office API generation `/api/program/*` + `/api/desktop/*` | S Office | Critical | Phase 4 — desktop parity |
| RR-25 | Desktop pairing (`apd_` bearer) vs licence-key + HWID activation duality | S Office | Critical | Phase 4 — desktop parity |
| RR-26 | Office sync property column map and NOT-NULL backfill | S Office | High | Phase 4 — desktop parity |
| RR-27 | R2 object storage (multipart ad-asset upload with magic-byte validation) | Advertising / Infra | High | Phase 2 — runtime/storage migration |
| RR-28 | User data held in module-level `Map` stores (saved land, surveyor quotes) | E Land | Critical | Phase 2 — runtime/storage migration |
| RR-29 | Two rate limiters and two caches with different algorithms | Infra | Medium | Phase 2 — runtime/storage migration |
| RR-30 | `properties` (pg) vs `property_listings` (D1/MySQL) — two property stores | D Properties | Critical | Phase 2 — storage consolidation |
| RR-31 | The 75 tables created only by an `ensure*` path and by no migration | Infra | Critical | Phase 2 — DDL out of the request path |
| RR-32 | Ensure-path vs Drizzle table-name collisions (`ad_campaigns`, `service_*`, `auction_*`) | Infra | High | Phase 2 — DDL out of the request path |
| RR-33 | Orphaned `drizzle/` migration set and the missing `0004`–`0010` files | Infra | High | Phase 2 — DDL out of the request path |
| RR-34 | Static `src/data/translations.ts` dictionary vs the DB-backed i18n store | Localization | Critical | Phase 3 — i18n migration |
| RR-35 | Two i18n schema definitions (raw-SQL/D1 vs Drizzle MySQL) | Localization | Medium | Phase 2 — schema migration |
| RR-36 | Currency catalogue: 12 seeded vs 23 static, non-empty symmetric difference | Currency | Medium | Phase 3 — currency work |
| RR-37 | Geo hierarchy: DB vs `src/data/locations.ts` vs hard-coded arrays | V Geo | Medium | Phase 3 — geo consolidation |
| RR-38 | Reputation: two scoring paths that produce different numbers | C Ranks | High | Phase 3 — AMRS consolidation |
| RR-39 | `reputation-extended.ts` five-level ladder (different thresholds) | C Ranks | Medium | Phase 1 — dead-code cleanup |
| RR-40 | Rank/verification trust indicators in the directory (currently hardcoded null/false) | C Ranks | High | Phase 3 — AMRS consolidation |
| RR-41 | Two profile-strength models with different required-field sets | B Profiles | Medium | Phase 3 — AMRS consolidation |
| RR-42 | `tools.use` permission gate on the engineering tools hub | U Tools | High | Phase 1 — dead-code cleanup |
| RR-43 | The unreachable CAD export subsystem (DXF/SVG/PNG/PDF) | U Tools | High | Phase 1 — dead-code cleanup |
| RR-44 | `/tools/[id]` fallback tool page (fake maths) vs the real registry | U Tools | Low | Phase 3 — tools consolidation |
| RR-45 | Admin subscription-plan CRUD (price, quotas, features, sort order) | AB Admin | High | Phase 3 — admin restore |
| RR-46 | Admin sponsors/organizations console (`/admin/sponsors/**`, `/admin/organizations`) | AB Admin | High | Phase 3 — admin restore |
| RR-47 | Advertiser commercial back office: contracts, invoices, payments, subscriptions, documents, activity | Commercial | Critical | Phase 3 — admin restore |
| RR-48 | `sponsor_events` impression/click writer (billing-relevant data) | Advertising | High | Phase 3 — advertising consolidation |
| RR-49 | `cur/db/schema.ts` + `cur/src/types/sponsor.ts` — the cleanest commercial restore source | Commercial | Critical | Phase 1 — dead-code cleanup |
| RR-50 | Four priced sponsor plans seeded into every non-production boot | Commercial | High | Phase 2 — seed/DDL migration |
| RR-51 | Turning on the 60 unrun test files surfaces pre-existing failures as apparent new breakage | Infra | High | Phase 1 — release gate |
| RR-52 | Six test files encode stale expectations and will be "fixed" by changing the product | Infra | High | Phase 1 — release gate |
| RR-53 | `AdRequestDialog.tsx` — the self-serve ad-request UI specification | Advertising | High | Phase 1 — dead-code cleanup |
| RR-54 | `FloatingAdSlotActions.tsx` — empty-slot request/details/contact panel | Advertising | Medium | Phase 1 — dead-code cleanup |
| RR-55 | `organization-profile-page.tsx` — the only correct org-messaging entry point | M Organizations | Critical | Phase 1 — dead-code cleanup |
| RR-56 | `lib/services/matching/professional.matcher.ts` — the pg-schema matcher | Services | Medium | Phase 1 — dead-code cleanup |
| RR-57 | CP1256-mangled Arabic literals in the auction contract template | Auctions | Critical | Phase 1 — encoding cleanup |
| RR-58 | Two `auction_terms` / `auction_bids` schema definitions | Auctions | High | Phase 2 — schema migration |
| RR-59 | `auction_participants` registry and the `isAutoBid` flag | Auctions | Medium | Phase 3 — auctions consolidation |
| RR-60 | Three news data models and two `NewsTicker` components | News | High | Phase 3 — news consolidation |
| RR-61 | Old services routes: disputes, order status PATCH, order review GET, review aggregate | Services | High | Phase 3 — services consolidation |
| RR-62 | `lib/services/core.ts`, `state-machine.ts`, `deep-links.ts` — orphaned service specifications | Services | High | Phase 1 — dead-code cleanup |
| RR-63 | `public/sponsors/*.webp` banner assets under the sponsor→advertiser rename | Advertising | Low | Phase 3 — rename completion |
| RR-64 | `audit_logs` (commercial trail) vs `audit_events` (viewer) consolidation | AB Admin | High | Phase 3 — audit consolidation |
| RR-65 | Two saved-search APIs and two saved-search dashboard pages | D Properties | Medium | Phase 3 — properties consolidation |
| RR-66 | Property card and form component consolidation (status chips, delete, offer types) | D Properties | Medium | Phase 3 — properties consolidation |
| RR-67 | Per-provider service radius under the 10 km platform cap | Services | Medium | Phase 3 — services consolidation |
| RR-68 | `GET /api/professionals` public directory route | M Organizations | Low | Phase 3 — directory consolidation |
| RR-69 | `office_links` licence-link records and `office_devices.legacy_link_id` | S Office | High | Phase 4 — desktop parity |
| RR-70 | Desktop-only commercial capabilities (ledgers, contracts, commissions, instalments) | Commercial | High | Phase 4 — desktop parity |

---

## 5. Detailed entries

### RR-01 — Arabic labelled point rows stop parsing

- **Capability at risk:** Parsing coordinate rows written the way Omani/Gulf survey documents actually write them — `نقطة 1: 512345, 2412345` — in an Arabic-first product.
- **Old implementation:** `hist/old-tag/src/lib/tools/land-analysis.ts:79-88`, matched *after* `normalizeArabic()` folded `ة→ه`, `أإآ→ا` at `hist/old-tag/src/lib/tools/land-analysis.ts:44`.
- **Current implementation:** `cur/src/lib/tools/land-analysis.ts:134` (regex contains `نقطه` with heh) and `cur/src/lib/tools/land-analysis.ts:92` (`extractCoordinates` now applies `normalizeDigits` only, no Arabic folding). The resolver stack has **no** Arabic point-label pattern at all — `cur/lib/geo/evidence-extraction.ts:28` is Latin-only.
- **Regression mechanism:** The resolver (`cur/lib/land/intelligence/resolver.ts:115`) is the declared canonical parser and the tool parser is slated to be folded into it. A consolidation that ports the resolver's patterns and drops `cur/src/lib/tools/land-analysis.ts` removes the last file that even mentions `نقطة`. Because the current tool parser already fails to match (heh vs teh-marbuta, no folding), the capability looks absent in testing, so nobody notices it is being deleted rather than migrated. Result: every Arabic labelled deed silently yields zero points and the user sees "no coordinates found".
- **Required regression test:** `tests/land/find-my-land.test.ts` — add `parses Arabic labelled point rows in both orthographies`: feed the extractor the literal block `نقطة 1: 512345, 2412345\nنقطه 2: 512400, 2412400` and assert exactly two points are returned with easting/northing `512345/2412345` and `512400/2412400`; repeat with `أ`/`إ`/`آ` variants of the label and assert the same two points. Must fail today and pass after the fix.
- **Recommended preservation strategy:** Restore `normalizeArabic()` into the shared extraction path (`cur/lib/geo/evidence-extraction.ts`), express the label as a character class covering `ة|ه` plus alef variants, and make the Arabic pattern part of the resolver's pattern set — not a tool-only pattern — before `cur/src/lib/tools/land-analysis.ts` is retired.

### RR-02 — Header-less generic UTM rows stop parsing

- **Capability at risk:** Extracting coordinates from a plain three-column table (`1 512345 2412345`) that carries no column header at all — the most common shape in scanned Omani survey annexes.
- **Old implementation:** `hist/old-tag/src/lib/tools/land-analysis.ts:89-98` — the pattern ran unconditionally on every document.
- **Current implementation:** `cur/src/lib/tools/land-analysis.ts:133` gates it behind `points.length === 0`; the resolver only reads zone-less rows *after* an English `NORTHING EASTING` header — `cur/lib/geo/evidence-extraction.ts:28,299-344`.
- **Regression mechanism:** The stated consolidation target is the resolver. The resolver's header requirement is invisible when tests use header-bearing fixtures. Retiring the tool parser therefore removes the only unconditional header-less path and produces a parser that is strictly worse than the 2026-08-05 build on the document class the product exists to read. The failure is silent — zero points, no warning.
- **Required regression test:** `tests/geo/geo-pipeline.test.ts` — add `extracts zone-less UTM rows with no table header`: pass a fixture whose entire text is three rows of `<n> <easting> <northing>` with no `NORTHING`/`EASTING`/Arabic header, and assert `extractCoordinateEvidence()` returns three points. Add a second case where the same rows are preceded by an *Arabic* heading and assert the same three points (this also closes the "Arabic coordinate-table headings" gap noted as missing in both trees).
- **Recommended preservation strategy:** Make the header a *confidence signal*, not a precondition: run the header-less pattern always, tag its output with lower confidence, and let `cur/lib/land/intelligence/strategy.ts` arbitrate. Keep the old unconditional regex as a named, tested fallback rather than deleting it.

### RR-03 — All-patterns accumulation replaced by first-match-wins

- **Capability at risk:** Mixed-format documents — a deed that lists two points as `N x E y` and four more as a bare UTM table — yielding *all* their points.
- **Old implementation:** `hist/old-tag/src/lib/tools/land-analysis.ts:101-113` — ran every pattern and merged the de-duplicated union.
- **Current implementation:** `cur/src/lib/tools/land-analysis.ts:121,133,144` — first productive pattern wins; later patterns never run.
- **Regression mechanism:** Any consolidation that treats "the parser" as a single ordered pattern list inherits first-match-wins as the obvious design. A document then resolves to a *partial* polygon — which is worse than no polygon, because the area and boundary computations succeed on the truncated ring and produce a plausible-looking wrong answer that no validation catches.
- **Required regression test:** `tests/land/find-my-land.test.ts` — add `accumulates points from every matching pattern`: one fixture containing two `N 23.5 E 58.4` rows *and* three bare `<n> <e> <n>` rows; assert the extractor returns five distinct points, and assert that removing either block reduces the count by exactly that block's size.
- **Recommended preservation strategy:** Make the pattern runner accumulate-and-dedupe by construction (union keyed on rounded coordinate pair), and have `strategy.ts` report which patterns contributed. Add a user-visible warning when two patterns disagree, rather than silently preferring one.

### RR-04 — Blind OCR letter→digit repair removed

- **Capability at risk:** Recovering coordinates from low-quality scans where OCR emitted `S` for `5`, `B` for `8`, `Z` for `2`, `G` for `6`, `l`/`I`/`!` for `1`.
- **Old implementation:** `hist/old-tag/src/lib/tools/land-analysis.ts:16-22`.
- **Current implementation:** `cur/src/lib/tools/land-analysis.ts:29-40` and `cur/src/components/tools/FindMyLand.tsx:408-411` — only `O/o/Q→0` and `|→1`, and only adjacent to digits. The replacement is the constraint-verified repair at `cur/lib/geo/evidence-extraction.ts:90-274`, which scores 1–2 edit variants against declared side lengths and area.
- **Regression mechanism:** The trade-off is deliberate and the replacement is better *when the document declares side lengths or an area*. The risk is the inverse case: a further "simplify the repair path" cleanup could delete `evidence-extraction.ts:90-274` as expensive, leaving neither the blind repair nor the verified one — a net loss against 2026-08-05.
- **Required regression test:** `tests/geo/geo-pipeline.test.ts` — add `repairs OCR digit confusions when constraints are declared`: fixture with `S12345`/`24l2345` plus a declared area; assert the repaired point is chosen and that the chosen variant's residual against the declared area is below the module's threshold. Add a negative case with no declared constraint and assert the module *abstains* rather than guessing.
- **Recommended preservation strategy:** Keep the constraint-verified repair as the primary path and document the removal of the blind repair as a recorded trade-off in the parser's module header, so a later reader does not remove the survivor as redundant.

### RR-05 — Zone-less UTM zone inference and tie abstention

- **Capability at risk:** Resolving a UTM table that never states its zone, by brute-forcing zones 1–60 against country bounds and **abstaining with a user-visible warning when two zones tie**.
- **Old implementation:** none — the old build silently defaulted to zone 39 after clamping 35–40 (`hist/old-tag/src/lib/tools/land-analysis.ts:28-41`).
- **Current implementation:** `cur/lib/land/intelligence/resolver.ts:98-113` (brute force + abstain), warning surfaced at `cur/lib/land/intelligence/resolver.ts:235`; zone detection from text at `cur/lib/land/intelligence/crs-detector.ts:27-28,41-67`.
- **Regression mechanism:** This is a *current* capability that is better than old, and it is the expensive part of the resolver. A performance-motivated refactor ("we only operate in Oman, hardcode zone 39/40") reintroduces the old silent default. The user-visible symptom is not an error but a polygon placed hundreds of kilometres away, which the country-bounds check may still accept if the wrong zone lands inside the same country.
- **Required regression test:** `tests/land/find-my-land.test.ts` — add `abstains when two UTM zones fit equally`: construct northing/easting values that fall inside country bounds under both zone 39 and zone 40; assert the resolver returns no committed CRS and that the result carries the ambiguity warning. Add a second case with an unambiguous zone and assert it commits.
- **Recommended preservation strategy:** Mark `resolver.ts:98-113` as a protected invariant in the module header; if performance forces a narrower search, narrow the *candidate set* by declared country while keeping the tie-abstention branch intact.

### RR-06 — Coordinate-order and plausibility protection

- **Capability at risk:** Refusing to accept a lat/lon pair that is transposed or outside plausible country bounds.
- **Old implementation:** a range check inside a single regex only (`hist/old-tag/src/lib/tools/land-analysis.ts:69-77`, lat 15–35 / lon 30–65).
- **Current implementation:** `cur/lib/geo/coordinate-protection.ts:1-65` plus country bounds in `cur/lib/geo/geometry.ts:6-30`.
- **Regression mechanism:** `coordinate-protection.ts` has a small consumer set and looks like a wrapper. A consolidation that inlines "just check the ranges" into the extraction path loses the *ordering* half of the protection — the part that catches `(58.4, 23.5)` written as `(23.5, 58.4)`. Transposition is the single most common land-data defect and produces a polygon in the wrong hemisphere quadrant, not an error.
- **Required regression test:** `tests/geo/geo-pipeline.test.ts` — add `rejects or corrects transposed lat/lon pairs`: feed `(58.4, 23.5)` for an Oman-bounded document and assert the module either flags the transposition or returns the corrected order; assert a genuinely out-of-bounds pair is rejected with a typed reason rather than silently dropped.
- **Recommended preservation strategy:** Keep `coordinate-protection.ts` as a single choke point that every extraction path must call, and add an assertion in `strategy.ts` that no point reaches the geometry builder without having passed it.

### RR-07 — Legacy live endpoint `POST /api/geo/extract`

- **Capability at risk:** A second, independently reachable land-extraction pipeline that external and old clients may still be calling.
- **Old implementation:** the same pipeline, present since before the refactor — `cur/lib/geo/pipeline.ts:145` is the live implementation behind it.
- **Current implementation:** `cur/app/api/geo/extract/route.ts:2,7` (`runPipeline` from `cur/lib/geo/pipeline.ts`). Recorded in `PHASE-0-BASELINE.md` as one of the three parallel parsers, legacy-**live**.
- **Regression mechanism:** The consolidation plan in fragment 02 is "keep the resolver, retire `lib/geo/pipeline.ts`". Retiring the module and deleting the route removes a **live HTTP contract** with no deprecation window. There is no inventory of its callers because it is called from outside the repo. Additionally, `cur/lib/geo/evidence-extraction.ts` is imported by *both* the resolver and `app/api/land/analyze`; deleting "the pipeline" without tracing that shared import can break the survivor.
- **Required regression test:** `tests/geo/geo-pipeline.test.ts` — add `POST /api/geo/extract keeps its response envelope`: assert the route module exports `POST`, and assert on a fixture upload that the response contains the same top-level keys the pipeline returns today (points, crs, warnings). Freeze the envelope as a contract snapshot so a rewrite behind the URL is detectable.
- **Recommended preservation strategy:** Do not delete the URL. Reimplement it as a thin adapter over the resolver that reproduces the recorded envelope, keep the contract test, and publish a deprecation note with a date before removing.

### RR-08 — Legacy live endpoint `POST /api/land/analyze` and its file readers

- **Capability at risk:** DXF, KML, KMZ, ZIP, CSV, TXT and DOCX land-document input, plus the perimeter computation — capabilities the current FindMyLand UI no longer offers but the server still has.
- **Old implementation:** `hist/old-tag` + `ref/AkarProMax_ChatGPT_Source_Review/app/tools/find-my-land/page.tsx` (the accept list and the tabbed upload UI).
- **Current implementation:** `cur/app/api/land/analyze/route.ts:17-27` (`ALLOWED_EXTENSIONS` = `.pdf .csv .txt .jpg .jpeg .png .webp .dxf .kml .kmz .zip`; MIME list at `:19-29`), file-kind dispatch at `:31-40`, DXF branch at `:172-179`, KML branch at `:180-183`, perimeter at `:98-103`. The UI is restricted to `pdf/png/jpg/jpeg/webp` (`cur/src/components/tools/FindMyLand.tsx:133,1264`) and never calls this route.
- **Regression mechanism:** This route is the textbook "dead code" candidate — no in-repo UI caller, superseded by `/api/land/resolve`. Deleting it destroys the **only implementation of DXF/KML/CSV parsing anywhere in the tree**, which is precisely the capability fragment 02 lists as a REGRESSION to be restored. The restore then becomes a build-from-scratch instead of a UI change. This is the single highest-leverage deletion mistake available in the land domain.
- **Required regression test:** `tests/land/land-flow.test.ts` — add `/api/land/analyze accepts every declared extension`: iterate `ALLOWED_EXTENSIONS` and assert each is accepted by the route's validator; add three behavioural cases feeding a minimal DXF `LWPOLYLINE`, a minimal KML `<coordinates>` block and a two-column CSV, each asserting the extracted ring's vertex count and that `perimeter` is present and non-zero.
- **Recommended preservation strategy:** Before any parser consolidation, **move** the DXF/KML/CSV/DOCX readers out of the route into a named module (e.g. `lib/land/readers/`), wire them into the resolver's input stage, and re-point the FindMyLand accept list at the union. Only then may the route become an adapter. Nothing may be deleted until the readers have a caller in the new stack.

### RR-09 — KML export of a resolved parcel

- **Capability at risk:** Downloading the resolved boundary as KML for Google Earth / surveying software — the standard hand-off format in this market.
- **Old implementation:** `ref/AkarProMax_ChatGPT_Source_Review/app/tools/find-my-land/page.tsx` (`downloadKml`).
- **Current implementation:** none — `cur/app/tools/find-my-land/page.tsx:1-5` is a redirect stub, and `cur/src/components/tools/FindMyLand.tsx` has no file download at all (its export affordances are clipboard-only, `:1073-1108`).
- **Regression mechanism:** The capability exists today only in a backup snapshot. Any tidy-up that drops `ref/AkarProMax_ChatGPT_Source_Review` from the working set, or that closes the FindMyLand restore ticket by shipping clipboard export only ("we have export"), makes the loss permanent and invisible — clipboard text is not a KML file and cannot be opened by the tools surveyors use.
- **Required regression test:** `tests/tools/points-to-dxf.test.ts` (extend, or add `tests/land/land-export.test.ts`) — `exports a resolved parcel as valid KML`: given a four-point ring, assert the generated document contains one `<Polygon>` with a `<coordinates>` list of five `lon,lat[,alt]` tuples (closed ring) and parses as XML.
- **Recommended preservation strategy:** Treat "export" as a named capability with an enumerated format list (clipboard, KML, DXF, CSV) and assert the list in a test, so shipping a subset cannot close the ticket.

### RR-10 — Manual coordinate paste / add-point entry

- **Capability at risk:** The only path for a user who has coordinates but no scannable document — pasting a coordinate list or adding points by hand on the map.
- **Old implementation:** `ref/AkarProMax_ChatGPT_Source_Review/app/tools/find-my-land/page.tsx` (textarea + add/clear point controls).
- **Current implementation:** none. `cur/app/tools/find-my-land/page.tsx:1-5` is a redirect stub; `cur/src/components/tools/FindMyLand.tsx:1249-1260` offers drag-and-drop of files only.
- **Regression mechanism:** The FindMyLand rebuild is framed as "document intelligence". A restore effort scoped as "bring back the upload page" naturally reproduces the upload path and omits manual entry, because manual entry does not exercise any of the new machinery. The user segment that loses the tool entirely (coordinates from a government portal, no PDF) is invisible in usage data because they never got a result to begin with.
- **Required regression test:** `tests/land/find-my-land.test.ts` — `accepts a pasted coordinate list with no file`: submit a newline-separated list of four `easting northing` pairs through the manual-entry path and assert a closed ring with area and centroid is produced, with no OCR or PDF code invoked.
- **Recommended preservation strategy:** Make manual entry a first-class input source in the resolver's input contract (`file | text | points`), so the UI restore has an API-level obligation to expose it.

### RR-11 — Perimeter figure in the land result

- **Capability at risk:** Reporting the parcel perimeter alongside the area.
- **Old implementation:** `ref/AkarProMax_ChatGPT_Source_Review/app/tools/find-my-land/page.tsx` result tile.
- **Current implementation:** computed server-side at `cur/app/api/land/analyze/route.ts:98-103`; never surfaced by `cur/src/components/tools/FindMyLand.tsx`.
- **Regression mechanism:** Perimeter survives only inside the route named in RR-08. Deleting that route deletes the computation as well as the endpoint, so the "surface the perimeter" restore becomes a re-implementation.
- **Required regression test:** `tests/land/land-flow.test.ts` — `reports perimeter for a resolved ring`: for a rectangle of known side lengths, assert the returned perimeter equals the geodesic sum within 0.5 %.
- **Recommended preservation strategy:** Move the perimeter computation into `cur/lib/geo/geometry.ts` next to the area computation, where both the resolver and the legacy route can use it, before touching the route.

### RR-12 — `LandMapper.tsx` deleted before its parser behaviour is merged

- **Capability at risk:** The fourth land parser, and with it the raw-OCR-text disclosure that lets a user diagnose a bad scan.
- **Old implementation:** `hist/old-tag/src/components/tools/LandMapper.tsx:44-49` (image OCR `ara+eng`), `:65-72` (PDF text, max 5 pages), `:74-93` (raster fallback under 30 non-space chars), `:130-148` (polygon), `:160-162` (area), `:200-210` (progress), `:277-279` (per-row copy), `:289-298` (raw OCR text in a `<details>`).
- **Current implementation:** `cur/src/components/tools/LandMapper.tsx` — present, importing `cur/src/lib/tools/land-analysis.ts:91`, with **no importer**. `cur/src/data/toolsData.ts` aliases the `landmapper` tool id onto FindMyLand.
- **Regression mechanism:** It is a duplicate component with zero importers whose tool id already redirects — the strongest possible "delete me" signal in the tree. But it is the *only* file that still pairs the old parser with a working UI, and the parity matrix records its parser capabilities (RR-01, RR-02, RR-03) as **not yet carried over**. Deleting it before those three merges land removes the reference implementation and the ability to diff old-vs-new behaviour on a real document. The alias makes the deletion look free.
- **Required regression test:** `tests/land/find-my-land.test.ts` — `landmapper tool id resolves to a component with parser parity`: assert the tool registry entry for `landmapper` resolves, and assert the three parser behaviours of RR-01/02/03 hold on the resolved component's extraction path. The test fails as long as the alias points at a parser that has not absorbed the old patterns.
- **Recommended preservation strategy:** Put `cur/src/components/tools/LandMapper.tsx` and `cur/src/lib/tools/land-analysis.ts` under an explicit preservation note; permit deletion only in the same commit that lands the RR-01/02/03 tests green, and restore the raw-OCR-text `<details>` disclosure into FindMyLand first.

### RR-13 — Land share link and QR payload

- **Capability at risk:** Sharing a resolved parcel by link and QR code.
- **Old implementation:** `ref/AkarProMax_ChatGPT_Source_Review/src/components/tools/FindMyLand.tsx:283-299,580-600`.
- **Current implementation:** the API survives at `cur/app/api/land/[id]/share/route.ts`; no UI caller exists in `cur/src/components/tools/FindMyLand.tsx`.
- **Regression mechanism:** An "unused endpoint" sweep deletes `app/api/land/[id]/share` because grep finds no caller. The share store it depends on is also an in-memory `Map` (`cur/lib/land/resolve-store.ts:9`, 1 h TTL, RR-28), so the endpoint additionally looks non-functional in any multi-instance test.
- **Required regression test:** `tests/land/land-flow.test.ts` — `share endpoint returns a resolvable link for a saved parcel`: create a parcel, call the share route, assert a non-empty share id and that fetching it returns the same geometry.
- **Recommended preservation strategy:** Keep the route, re-attach the UI affordance in the same phase as RR-09/RR-10, and move the share store off the in-memory `Map` as part of RR-28.

### RR-14 — Messaging family A capabilities lost by consolidating onto family B

- **Capability at risk:** Message attachments, thread archive, per-participant read state (`last_read_at`), message typing and per-message metadata — capabilities that exist **only** in the Drizzle family.
- **Old implementation:** `hist/old-tag/app/api/services/messages/route.ts:11-77` and `hist/old-tag/lib/services/core.ts:516` — the old generation had none of these (no threads, no participants, no `is_read`).
- **Current implementation:** family A schema `cur/lib/db/schemas/messages-schema.ts:4,17,26,38` — `message_threads` (`last_message_at`, `is_archived`, `created_by`, `metadata` at `:9-14`), `message_participants.last_read_at` (`:21`), `messages.type`/`metadata` (`:31-32`), `message_attachments` (`url, type, size, name, mime_type` at `:38-47`); routes `cur/app/api/messages/route.ts`, `cur/app/api/messages/[id]/route.ts`.
- **Regression mechanism:** Family B is de facto canonical (all working UI, the contract test, the identity rekey). Family A has no migration creating its four tables (RR-31), no participant check on `[id]` GET/POST (`cur/app/api/messages/[id]/route.ts:11-12,25-27`), and clients that read keys the API does not return. Every signal says "delete family A". Doing so deletes the **only attachment schema in the product** and the only per-participant read model, and the replacement (`is_read`/`read_at` on `service_messages`, `cur/lib/services-schema.ts:80-88`) cannot express "P1 has read up to message 40" in a multi-party thread.
- **Required regression test:** `tests/messages-contract.test.mjs` — add `unified messaging preserves the family A model`: assert the canonical schema declares an attachments table with `url/type/size/name/mime_type`, a per-participant `last_read_at` column, a thread `is_archived` flag and a message `type` column; and assert behaviourally that marking a thread read for participant P1 does not change P2's unread count.
- **Recommended preservation strategy:** Adopt family B's routes and authorization with family A's *schema shape*, as fragment 05 recommends. Write the union of the 21 preservation items in fragment 05 §"What a unified messaging system must preserve" into the contract test **before** either family is touched; delete family A only after every item is asserted green against the survivor.

### RR-15 — Messaging family B capabilities lost by consolidating onto family A

- **Capability at risk:** The seven-context enum with its legacy storage values, server-side validation and size caps, the cross-context inbox with per-thread unread counts, the audit write, the outbox enqueue, `is_system` messages, the 200-message cap and the participant-uniqueness index.
- **Old implementation:** `hist/old-tag/app/api/services/messages/route.ts:54-77` (the `request`/`order` contexts and the error vocabulary `UNAUTHORIZED`, `INVALID_BODY`, `INVALID_QUERY`, `ORDER_NOT_FOUND`, `REQUEST_NOT_FOUND`, `NOT_PARTICIPANT` at `:19,25,57,66,68,72`); `hist/old-tag/lib/services/core.ts:520` (audit write).
- **Current implementation:** contexts `cur/lib/services/message-contexts.ts:19-27`; validation (context enum, 4000-char body, 200-char title, 500-char context link) `cur/app/api/service-messages/route.ts:21-22` and `cur/app/api/service-messages/threads/route.ts:30-31`; inbox `cur/lib/services/marketplace.ts:2009-2075`; audit `cur/lib/services/marketplace.ts:1885`; outbox `cur/lib/services/marketplace.ts:1883`; `is_system` `cur/lib/services-schema.ts:85`; 200-message cap `cur/lib/services/marketplace.ts:1889-1896`; unique index `cur/lib/services-marketplace-schema.ts:361`; delegation shim `cur/lib/services/core.ts:518-531`.
- **Regression mechanism:** The inverse of RR-14. Family A has the better schema, so "migrate to A wholesale" is the tempting decision. Family A's routes have **no** context enum, **no** body/title/link length validation, **no** audit write, **no** outbox, **no** message cap and insert `recipientId` unvalidated (`cur/app/api/messages/route.ts:37-39`). Migrating wholesale silently removes every server-side guard the product has on messaging, and drops the legacy storage values `request`/`order` that existing `service_messages` rows depend on — orphaning live conversations.
- **Required regression test:** `tests/messages-contract.test.mjs` — extend the existing context assertions (`:46-47,209-210`) into behavioural ones: assert a 4001-character body is rejected with `INVALID_BODY`, a 201-character title is rejected, an unknown context string is rejected, a send writes exactly one `service_message.send` audit row and one outbox row, and a thread read returns at most 200 messages ordered `created_at ASC`.
- **Recommended preservation strategy:** Same as RR-14 — one contract test carrying the union of both families' guarantees, landed before either family is retired. Treat the seven context string values as a frozen storage vocabulary with a migration if they ever change.

### RR-16 — The old `/api/services/messages` URL contract

- **Capability at risk:** The only public messaging URL the old generation ever exposed, including its `GET ?threadType=&threadId=` half and its distinct error codes.
- **Old implementation:** `hist/old-tag/app/api/services/messages/route.ts:49-77` (GET), `:54-61` (query contract), `:66,68,72` (`ORDER_NOT_FOUND`, `NOT_PARTICIPANT`, `REQUEST_NOT_FOUND`).
- **Current implementation:** proxy `cur/app/api/services/messages/route.ts:19,23` forwarding to `/api/service-messages`, which exports **only POST** — so the GET half already returns 405 for every old client. Errors collapse to a flat `FORBIDDEN` at `cur/app/api/service-messages/threads/[threadType]/[threadId]/route.ts:23`.
- **Regression mechanism:** The proxy is a shim with no in-repo consumer. Any "delete the `/api/services/*` generation" decision (a live product-owner question in fragment 04) removes it. Because the GET half is *already* broken, testing the deletion shows no change — the remaining POST compatibility disappears unnoticed, and any external integrator still posting to the old URL breaks with no deprecation signal.
- **Required regression test:** `tests/messages-contract.test.mjs` — add `legacy /api/services/messages contract`: assert the route module exports both `GET` and `POST`; assert `GET ?threadType=order&threadId=<id>` returns `{messages:[…]}` for a participant and a typed `NOT_PARTICIPANT`/`ORDER_NOT_FOUND` for the two negative cases.
- **Recommended preservation strategy:** Fix the GET half rather than deleting the shim, restore the typed error vocabulary as a mapping layer in the proxy, and publish a dated deprecation note before removal.

### RR-17 — Fixing the request-thread leak destroys the customer's existing conversation history

- **Capability at risk:** The customer's single shared negotiation thread per request, with all its existing messages — the record of what was agreed.
- **Old implementation:** `hist/old-tag/app/api/services/messages/route.ts:70-73` — request threads had an existence check only, so the shared-thread shape predates the refactor and old rows use it.
- **Current implementation:** thread keyed only on `(thread_type, thread_id)` — read `cur/lib/services/marketplace.ts:1889-1896`, write `cur/lib/services/marketplace.ts:1866-1871`, participant derivation `cur/lib/services/marketplace.ts:1924-1932`, inbox fan-out `cur/lib/services/marketplace.ts:2019-2023`, read-state clearing `cur/lib/services/marketplace.ts:1901`, recipient resolution `cur/lib/services/marketplace.ts:1967-1970`. `cur/lib/services-schema.ts:80-88` has no counterparty column, so per-provider scoping is not representable.
- **Regression mechanism:** The fix shape proposed in fragment 04 is a composite thread key such as `request:<requestId>:<providerUserId>`. Applied naively, **every existing row keyed `request:<requestId>` becomes unreachable**: it matches no new thread id, so the customer opens the request and sees an empty conversation. The commercially important content — the price P1 agreed — is exactly what disappears. The secondary loss is the customer's single-pane view: after the split, a customer with six bidders has six threads and no combined history, which is a usability regression sold as a security fix.
- **Required regression test:** `tests/messages-contract.test.mjs` — add `request thread split preserves pre-existing history`: seed a legacy `service_messages` row with `thread_type='request', thread_id='<requestId>'` and messages from the customer and P1; run the migration; assert the customer can still read all pre-split messages, assert P1 can read the ones P1 was party to, and assert P2 **cannot** read P1's messages. This single test guards both the fix and the data.
- **Recommended preservation strategy:** Migrate, do not re-key: add a `counterparty_user_id` column to `service_messages`, backfill legacy rows by resolving the sender/recipient pair, and keep the customer-side view a union across counterparties. Derive the recipient from the thread *pair*, not from the request owner (`marketplace.ts:1967-1970`).

### RR-18 — The contract test codifies the leak as expected behaviour

- **Capability at risk:** The ability of the test suite to detect either the leak or its fix.
- **Old implementation:** none — no old test existed.
- **Current implementation:** `tests/messages-contract.test.mjs:81-83` asserts that both the customer and a provider are participants of request `r1`, and never asserts that a *second* provider is excluded. Registered in `package.json:13`, so it runs.
- **Regression mechanism:** This is inverted-guard risk. When RR-17's fix lands, this assertion may still pass (one provider is still a participant), so the suite gives a green light to a partial fix; conversely, if a future change re-widens participation, nothing fails. Worse, an engineer fixing the leak may find this test failing and "fix the test" by relaxing it — the exact failure mode `PHASE-0-BASELINE.md` warns about for the six stale-expectation files (RR-52).
- **Required regression test:** `tests/messages-contract.test.mjs` — replace `:81-83` with a three-party assertion: given request `r1` with offers from P1 and P2, assert the customer sees both conversations, P1 sees only P1's, and `isThreadParticipant` returns **false** for P2 against P1's thread. Land this inversion in the same commit as the fix.
- **Recommended preservation strategy:** Add a comment at the assertion recording that it is a security invariant, not a shape check, and cross-reference P0-2 in `PHASE-0-BASELINE.md:479,546,575` so a future reader cannot relax it innocently.

### RR-19 — Messaging identity key: uuid vs email string

- **Capability at risk:** The identity of every message sender and thread participant already stored in the database.
- **Old implementation:** `hist/old-main/lib/sponsor-auth.ts:42-100` — email-keyed only, which is why family B stores emails.
- **Current implementation:** family B writes the user's **email** into `sender_user_id` (`cur/app/api/service-messages/route.ts:37`) and `service_message_participants.user_id`; family A writes `users.id` uuid via `getSession()` (`cur/app/api/messages/route.ts:15`). The rekey helper is `cur/lib/services/identity.ts:58-59`.
- **Regression mechanism:** A single unified system cannot do both. Migrating family B's rows to uuids requires resolving every historical email to a current `users.id`; any email that has since changed, or that belonged to a user who never completed registration, resolves to nothing. Those rows are then orphaned — the messages still exist but belong to nobody, so they vanish from every participant query. The loss is invisible in testing because test fixtures always resolve.
- **Required regression test:** `tests/messages-contract.test.mjs` — add `identity rekey preserves every message's sender`: seed messages whose `sender_user_id` is (a) a current email, (b) a former email of a user who has since changed it, (c) an email with no `users` row; run the rekey; assert (a) and (b) resolve to the correct uuid and (c) is preserved in a quarantine column rather than dropped, and assert the total message count is unchanged.
- **Recommended preservation strategy:** Add the uuid column alongside the email column, dual-write, backfill with an explicit unresolved-row report, and only then flip reads. Never drop the email column until the unresolved report is empty and signed off.

### RR-20 — Property owner as a derivable conversation participant

- **Capability at risk:** A buyer being able to message the owner of a property listing at all.
- **Old implementation:** none found — the old generation accepted only `request`/`order` contexts (`hist/old-tag/app/api/services/messages/route.ts:27`).
- **Current implementation:** the entry point exists at `cur/app/properties/[id]/page.tsx:225` via `cur/src/components/services/StartThreadButton.tsx:12-56`, but the owner is never added as a participant, and the redirect reads `thread.thread_type` off a camelCase response (`cur/lib/services/marketplace.ts:2000-2006`) producing `?open=undefined%3Aundefined`. The only implicit-owner derivation that works is the professional branch, `cur/lib/services/marketplace.ts:1938-1941`.
- **Regression mechanism:** The fix requires a stable owner field on the property table — and the property table itself is contested (RR-30: `properties` pg vs `property_listings` D1). Whichever store is chosen, deriving the owner needs a uuid, while services identity is email-keyed (RR-19). A messaging unification that resolves RR-14/15 without also resolving property ownership will ship a `property` context that authorizes nobody, and the button will be quietly dropped as "not working" rather than fixed — removing the capability from the roadmap.
- **Required regression test:** `tests/messages-contract.test.mjs` — add `property thread derives the listing owner as participant`: seed a property with a known owner, start a thread from a different user, assert the owner is a participant without any explicit `participantIds`, assert the owner receives the notification, and assert the returned thread object's key casing matches what `StartThreadButton.tsx:39` reads.
- **Recommended preservation strategy:** Resolve RR-30 first, then add owner derivation as an implicit branch in `isThreadParticipant` mirroring the professional branch, and fix the camelCase/snake_case mismatch in the same change.

### RR-21 — Consolidating the two ad engines loses the D1 engine's targeting and controls

- **Capability at risk:** Approval state, budget and daily budget, frequency capping, device and OS targeting, language, channel, placement, region/district and radius targeting, day-parting, house ads, inventory health, and signed impression/click tracking.
- **Old implementation:** `hist/old-tag/lib/ads/*` (489 lines) behind `hist/old-tag/app/api/ads/route.ts:1-402`; wide campaign model `hist/old-tag/lib/ad-schema.ts:1-176`.
- **Current implementation:** raw-SQL D1 engine `cur/lib/ads/engine.ts` (759 lines; campaign parse `:143-208`, load `:171-208`, geo targeting `:374-400`, creative selection `:536-561`, match `:611`, used-set `:618`, locale columns `:684-688`) behind `cur/app/api/ads/match`. The rival is the Drizzle/pg engine `cur/lib/advertising/core/matching.engine.ts:18-35` behind `/api/advertising/match`, which has **no** approval, budget, frequency, device, language, channel or placement filtering and re-queries creatives inside its loop (`:31`).
- **Regression mechanism:** The pg engine is newer, cleaner and drives five public detail-page placements; the D1 engine is raw SQL over a ~100-column table. "Modernize onto Drizzle" is the natural call and would delete every commercial control the platform has over ad delivery — advertisers would be billed against a system that cannot enforce their budget or cap their frequency. Conversely, deleting the pg engine loses the news-ticker and featured-properties concepts the D1 stack lacks.
- **Required regression test:** `tests/ads-engine.test.mjs` — add `matcher enforces every declared control`: table-driven cases asserting that the surviving engine rejects an unapproved campaign, a campaign over daily budget, a campaign past its frequency cap for the viewer, a device/OS/language/channel mismatch, an out-of-radius geo, and an out-of-window day-part; plus `tests/ads-schema-contract.test.mjs` asserting the surviving campaign model still carries all of those columns.
- **Recommended preservation strategy:** Record the product-owner decision (fragment 07, decision 2) before any code moves. Whichever engine wins must absorb the loser's capability list first, asserted by the test above; the news-ticker and featured-properties concepts must be added to the D1 vocabulary if D1 wins.

### RR-22 — Migrating to `/api/ads/match-batch` drops the 30 s caches

- **Capability at risk:** The two 30-second caches that are currently the only thing keeping 8 ad round-trips per page view survivable.
- **Old implementation:** `hist/old-tag/app/api/ads/match-batch/route.ts` — byte-identical to the current file, shipped-but-unused since the pre-refactor tag.
- **Current implementation:** module-level `activeAdsCache` `cur/lib/ads/engine.ts:133,212-222`; route-level `cached()` `cur/app/api/ads/match/route.ts:21-25`; batch engine `cur/lib/ads/engine.ts:707-719`; batch route `cur/app/api/ads/match-batch/route.ts:13-41` (up to 40 contexts, zero client callers); the N+1 caller is `cur/src/components/AdSlot.tsx:176` via `cur/src/components/ads/standard-public-ad-layout.tsx:66-101`.
- **Regression mechanism:** Moving `AdSlot` onto the batch route is the correct fix for the N+1 and for cross-slot campaign duplication (each current call gets a fresh `usedCampaignIds` set at `engine.ts:618`). But the batch route has **no** route-level `cached()` wrapper, and a rewrite that also "simplifies" the engine's `activeAdsCache` while it is there removes both caches at once. The result is fewer requests each doing strictly more uncached work — a latency regression that looks like a performance fix, plus a load spike on the campaign table.
- **Required regression test:** `tests/ads-engine.test.mjs` — add `batch match reuses the active-ads cache and dedupes across contexts`: call the batch entry point twice within the TTL and assert the campaign loader is invoked once; call it with 8 contexts and assert no campaign id appears in more than one context's result.
- **Recommended preservation strategy:** Add the route-level `cached()` wrapper to `/api/ads/match-batch` and assert both caches in the test **before** migrating `AdSlot`. Keep `/api/ads/match` alive as a single-context adapter over the batch path.

### RR-23 — Two incompatible `ad_campaigns` / `ad_creatives` schemas on one table name

- **Capability at risk:** The ~100-column campaign model — media, tri-lingual copy, targeting, budget, caps, approval and counters — and, symmetrically, the pg model's `targeting jsonb`, `max_views`, `max_clicks`.
- **Old implementation:** `hist/old-tag/lib/ad-schema.ts:1-176`.
- **Current implementation:** raw-SQL definition `cur/lib/ad-schema.ts:1-52` + `AD_TABLES_SQL:70-134` (created by `ensureContentSchema`, `cur/lib/content-schema.ts:567`) versus Drizzle definition `cur/lib/db/schemas/advertising-schema.ts:5-19` (`id uuid`, `name`, `type`, `targeting jsonb`) and `:21-25` for creatives. Same table names, mutually unreadable. The ensure path always wins because it runs at connection setup (`cur/lib/pg-runtime.ts:227`).
- **Regression mechanism:** Generating a migration from the Drizzle schema — the standard modernization move — produces `CREATE TABLE ad_campaigns` with the narrow model. On a fresh database that table wins, and the entire raw-SQL engine's column set ceases to exist: every targeting, budget and approval column silently becomes unavailable, and `cur/lib/ads/engine.ts:143-208` parses nothing. The symptom is "no ads match", not an error. On an existing database the migration fails or, worse, the Drizzle side keeps reading columns that are not there.
- **Required regression test:** `tests/ads-schema-contract.test.mjs` — add `one canonical ad_campaigns definition`: assert that exactly one module in the tree declares a table named `ad_campaigns`, and assert the declared column set is a superset of the union list (media, `*_ar/_en/_tr` copy, countries/cities/languages/devices/channels, region/district, radius, budget, daily budget, approval, counters, `targeting`, `max_views`, `max_clicks`).
- **Recommended preservation strategy:** Pick the winner as part of RR-21, write the union column list into the contract test first, then delete the losing declaration in the same commit as the migration that creates the union.

### RR-24 — The old Office API generation `/api/program/*` and `/api/desktop/*`

- **Capability at risk:** Every capability the **shipped** desktop binary actually uses: program sync (news + ads pull), subscription/licence status, and the desktop bottom-banner ad placement.
- **Old implementation:** the shipped client contract, recoverable from `inv/dll_urls.txt` and `inv/dll_strings.txt` — `https://akar-promax.com/api/program/sync` (`inv/dll_strings.txt:8699` base; caller `AkarApp_LIVE/webui/assets/index-BaC7A85f.js:1`, `async function te()`), `/api/program/subscription-status` (`inv/dll_strings.txt:8700`; `SubscriptionService.FetchStatusAsync` at `inv/dll_strings.txt:1689`), `/api/desktop` + `/ads/placement/desktop_portal_bottom_banner` (`inv/dll_strings.txt:1491-1492`); the response normaliser is `AkarApp_LIVE/webui/assets/index-BaC7A85f.js:1` (`ka`, `Ca`), and the 13-field subscription shape is recoverable at `inv/dll_strings.txt:9876`.
- **Current implementation:** none — `grep api/program` over `cur/app` and `cur/lib` returns zero hits. The web's device surface is `cur/app/api/office/v1/*` with a different contract (`cur/lib/integration/sync.ts`, bearer device tokens via `cur/lib/integration/office-auth.ts:5-34`).
- **Regression mechanism:** `/api/office/v1/*` is fully built and tested on the web side, so it reads as the modern replacement and the legacy contract reads as historical. But no desktop call carries an `apd_` token, an `installationId`, an `x-protocol-version` or an `office/v1` path — the shipped desktop **is not a client of `/api/office/v1/**` in any form**. Treating the legacy contract as superseded, and letting the DLL string inventory go stale, destroys the only surviving specification of the protocol the deployed fleet speaks. Every installed office then silently stops receiving news and ads, with no error surface on either side.
- **Required regression test:** `tests/integrations-program-compat.test.mjs` (new, and added to the `package.json:13` list) — `legacy program contract is served`: assert `POST /api/program/sync` with `{signature, userToken, action:"GET_UPDATES"}` returns `{success:true, news:[…], ads:[…]}` with ad items carrying the desktop field names (`id|adId, title|name, subtitle|description, ctaText|buttonText, linkUrl|url, imageUrl, placement ∈ side|bottom|any, backgroundFrom, backgroundTo`); assert `GET /api/program/subscription-status` returns the 13 recorded fields; assert `GET /api/desktop/ads/placement/desktop_portal_bottom_banner` resolves.
- **Recommended preservation strategy:** Implement R-2 from `WEB-OFFICE-CONTRACT-MATRIX.md` as a compatibility shim over the existing `listOfficeNews` (`cur/lib/integration/news.ts:24`) and `matchAds(channel:"office")` before any desktop rewrite. Freeze `inv/dll_strings.txt`/`dll_urls.txt` as protected audit artefacts — they are the only specification. Do **not** treat the shipped shared secret `Akar_ProMax_2026_Secure_Key` as a credential.

### RR-25 — Pairing vs licence-key/HWID: collapsing the two activation models

- **Capability at risk:** Either the web-built pairing system (code + `apd_` bearer, rotation, revocation, typed failure reasons) or the shipped desktop's licence-key + HWID activation with an offline licence — whichever is discarded.
- **Old implementation:** `hist/old-tag/app/api/office-links/route.ts` — a working licence-key link record matching the desktop's activation model; desktop side `InputLicenseKey` (`inv/dll_strings.txt:4986`), `RegisteredHWID` (`:5901`), `GenerateHWID` (`:4702`), `OfflineLicenseService` / `AKAR_OFFLINE_LICENSE_2026` (`:5534-5536,3390`).
- **Current implementation:** pairing `cur/app/api/office/v1/pairing/route.ts:20-35`, `cur/lib/integration/pairing.ts:83-98,100-163`, single-use enforcement `:111,143-150`, expiry normalisation `:54-81`; device auth `cur/lib/integration/office-auth.ts:5-34`, `cur/lib/integration/device.ts:44-96`, rotation `:102-139`, typed 401 reasons `:24,51-64`; `cur/app/api/office-links/route.ts` still exists but `office_devices` is the system of record and `office_devices.legacy_link_id` (`cur/lib/integration/schema.ts:226`) is never populated.
- **Regression mechanism:** Both models are real and neither is wrong. Choosing pairing and deleting `office-links` strands every already-activated desktop with no migration path (RR-69) and removes the revocation record the web currently holds. Choosing licence-key and deleting the pairing stack discards a fully built, fully tested credential system with rotation and typed revocation — capabilities the licence model does not have — and re-legitimises a scheme the historical decision record deprecated. Either deletion is a one-way door taken to remove "duplicate auth".
- **Required regression test:** `tests/integrations-pairing.test.mjs` — extend with `both activation paths remain addressable`: assert the pairing path still issues, rotates and revokes a credential with typed reasons (existing coverage at `:22,54,65,84`), and add `legacy licence link maps to a device row`: given an `office_links` record, assert a device row exists or can be created with `legacy_link_id` populated, and assert revoking the licence link revokes the device credential.
- **Recommended preservation strategy:** Do not choose until PO-1 in fragment 08 is recorded. Whichever wins, implement the mapping (licence key + HWID → `installation_id`/device row) and populate `legacy_link_id` **before** retiring the other. Keep revocation authoritative on the web side in both models.

### RR-26 — Office sync column map and NOT-NULL backfill

- **Capability at risk:** A synced office property arriving with its slug, listing type, property type, country, city, district, parking and cover image — and with the defaults that keep it insertable.
- **Old implementation:** `ref/akarpromax-source/lib/integration/sync.ts:60-99` mapped `slug`, `listing_type`, `property_type`, `country_code`, `city_id`, `district`, `parking_slots`, `image_url`; `:50-66` defaulted `title_*`, `description_*`, `features_*`, `listing_type`, `property_type`, `country_code`, `parking_slots`; `:96-98` used `JSON.stringify(value)` for `features_*`; default currency `OMR`.
- **Current implementation:** `cur/lib/integration/sync.ts:60-105` — all eight columns removed; `:50-58` defaults only seven columns; `:93-96` uses `String(value)` for `features_*`; `:55` defaults currency to `SAR`.
- **Regression mechanism:** This regression has already happened; the risk is that the *restore* is scoped as "add back the columns" while the desktop→web work is in flight, and the two other silent behaviours are missed. `country_code`/`city_id` are exactly the columns the radar filters on (`cur/lib/integration/radar.ts:74,92`), so office-pushed listings stay invisible; `String(value)` flattens feature arrays to comma strings that break every downstream `JSON.parse`; and the `OMR→SAR` default silently reinterprets the price of any push that omits currency. A partial restore looks complete and leaves three data-corruption paths open.
- **Required regression test:** `tests/integrations-sync.test.mjs` — add `sync preserves the full column map and defaults`: push a payload omitting every optional field and assert all eight restored columns are populated or defaulted, assert `features_*` round-trips as JSON (`JSON.parse` succeeds and yields an array), assert the currency default, and assert a push omitting `titleTr`/`descriptionTr` succeeds rather than being recorded `status='failed'`.
- **Recommended preservation strategy:** Restore from `ref/akarpromax-source/lib/integration/sync.ts` as a diff, not a rewrite, and add the column map to the contract test so a future trim is caught.

### RR-27 — R2 → Node storage migration

- **Capability at risk:** The multipart, resumable ad-asset upload with magic-byte validation and post-upload verification — the only server-side byte storage the platform has ever had.
- **Old implementation:** `hist/old-tag/app/api/ad-assets/route.ts:9-19,133-177` (multi-upload, resumable multipart) and `hist/old-tag/app/api/sponsor-assets/route.ts:1-171` (171-line R2 uploader with magic-byte validation), driven from `hist/old-tag/app/admin/sponsors/sponsor-admin-client.tsx:197-241,416-433`.
- **Current implementation:** `cur/lib/runtime-assets.ts:1-5` (`await import("cloudflare:workers")`, no Node guard, no fallback); sole consumer `cur/app/api/ad-assets/route.ts:3,24`; binding declared `cur/types/cloudflare-runtime.d.ts:37,50-53`. Broken under Node per `PHASE-0-BASELINE.md`. The sponsor uploader is gone; branding is now a bare URL text input at `cur/app/admin/advertisers/advertiser-admin-client.tsx:357`.
- **Regression mechanism:** The migration will be framed as "replace R2 with S3/local disk". The code that will be replaced is the *transport*; the capabilities that will be lost are the ones layered on top of it — resumable multipart, magic-byte type validation, and the post-upload verification fetch. A minimal `putObject` shim satisfies "uploads work" in testing and quietly ships a system that accepts a renamed executable as a JPEG and cannot resume a large creative on a poor connection. Second-order risk: `cur/db/index.ts:1` has a **top-level** `import { env } from "cloudflare:workers"`; it currently has zero importers, so a migration that only greps for `runtime-assets` leaves a second unguarded Workers coupling behind.
- **Required regression test:** `tests/ad-assets-storage.test.mjs` (new, added to `package.json:13`) — `asset upload preserves validation and resumability`: assert a file whose extension says `.jpg` but whose magic bytes are `MZ` is rejected; assert a multipart upload can be resumed after an interrupted part and yields a byte-identical object; assert the post-upload verification fetch runs and a failed verification marks the asset unusable. Plus `tests/runtime-env.test.mjs` — assert no module imports `cloudflare:workers` at top level.
- **Recommended preservation strategy:** Port the validation and multipart logic from `hist/old-tag/app/api/sponsor-assets/route.ts` into the new storage adapter as the first commit of the migration, behind the same interface. Restore the drag-and-drop uploader for advertiser branding rather than leaving the raw-URL input as the permanent answer.

### RR-28 — In-memory `Map` stores holding real user data

- **Capability at risk:** Saved land parcels — the primary artefact of FindMyLand — and surveyor quote requests, a commercial lead surface.
- **Old implementation:** none found; both are current-generation features.
- **Current implementation:** `cur/lib/land/saved-land.ts:3` (`const store = new Map<string, SavedLand>()`), consumed live by `cur/app/api/land/route.ts:34,41,57-61`, `cur/app/api/land/[id]/share/route.ts:2`, `cur/app/api/land/[id]/surveyors/route.ts:2`; `cur/lib/land/quote.ts:3` (`const quotes = new Map<string, QuoteRequest>()`); `cur/lib/land/resolve-store.ts:9-10` (1 h TTL). The save button is `cur/src/components/tools/FindMyLand.tsx:1127-1155`, with `ownerId` read from `localStorage`. `tests/land/land-flow.test.ts` tests the `Map`, so the defect is codified.
- **Regression mechanism:** Two distinct destructive paths. (a) A runtime migration or a move to multiple instances turns an already-lossy store into a visibly broken one, and the natural triage is to remove the save button rather than persist the data — deleting a capability to fix a bug. (b) A persistence migration that follows the existing shape carries the `localStorage`-supplied `ownerId` into the database, permanently enshrining an unauthenticated ownership key (any caller can already read any owner's lands via `app/api/land/route.ts:34`). Either way the capability that ships is not the capability that was intended. The land test codifying the `Map` means the suite will resist the fix.
- **Required regression test:** `tests/land/land-flow.test.ts` — rewrite the saved-land cases as `saved land survives a process boundary and is owner-scoped`: persist a parcel, discard and rebuild the module/connection, assert the parcel is still retrievable; assert a request carrying a different session cannot read it; assert a client-supplied `ownerId` is ignored in favour of the session identity. The same shape for `lib/land/quote.ts`.
- **Recommended preservation strategy:** Persist to `land_parcels` with session-derived ownership (fragment 02, decision 5) before any runtime or scale-out change. Treat `saved-land`, `quote` and `resolve-store` as user data, not cache; the other five `Map`s (`lib/cache.ts:3`, `lib/cache/cache.service.ts:1`, `lib/security/rate-limit.ts:65`, `lib/amrs/security.ts:32`, `lib/i18n/core.ts:8-9`) are cache and are covered by RR-29.

### RR-29 — Two rate limiters and two caches with different algorithms

- **Capability at risk:** Auth/office rate limiting (login, register, OTP, password reset, office pairing, office sync) and the AMRS/geo/land/news rate limiting, plus the two independent caches.
- **Old implementation:** none found — both are current-generation.
- **Current implementation:** `cur/lib/security/rate-limit.ts:5-39` (per-op limits/windows/cooldowns) with `MemoryRateLimitStore` at `:63-90`, buckets at `:65`; the second limiter `cur/lib/amrs/security.ts:18-21,32` (60 req/min default, **zero call sites** on any `app/api/amrs/**` route); caches `cur/lib/cache.ts:3` and `cur/lib/cache/cache.service.ts:1`.
- **Regression mechanism:** Consolidating onto one limiter is correct, and the AMRS one looks disposable because it has no callers. But `lib/security/rate-limit.ts` encodes a **per-operation policy table** (`:5-18`) that the AMRS module does not have, while the AMRS module encodes the intended AMRS defaults that were never wired. Deleting either loses a policy that exists nowhere else. Similarly, a shared-store migration (needed anyway for horizontal scale) that reimplements "a limiter" from scratch drops the per-op table, silently applying one global limit to login and OTP alike.
- **Required regression test:** `tests/rate-limit.test.mjs` (currently not in `package.json:13` — see RR-51) — add `per-operation policy table is preserved`: assert each of the operations enumerated at `lib/security/rate-limit.ts:5-18` still resolves to its own limit/window/cooldown after consolidation, and assert the AMRS default (60/min) is applied to at least one `app/api/amrs/**` route.
- **Recommended preservation strategy:** Merge the AMRS defaults into the policy table before deleting `lib/amrs/security.ts`'s limiter, and move to a shared store behind the existing interface rather than a new one.

### RR-30 — `properties` (Postgres) vs `property_listings` (D1/MySQL)

- **Capability at risk:** Whichever store loses — either the public site, dashboard and office workspace, or the desktop sync, radar, taxonomy admin and ads integration.
- **Old implementation:** `hist/old-tag/app/properties/[id]/page.tsx` (detail only, no list page) — the split post-dates the old tag.
- **Current implementation:** Postgres `properties` — `cur/lib/db/schemas/properties-schema.ts:5`, consumed by `cur/app/api/properties/route.ts` and (per fragment 11) **83 files**; no migration and no ensure path creates it. SQLite/D1 `property_listings` — `cur/lib/properties-schema.ts:27`, created by `ensurePropertiesSchema` (`cur/lib/properties-schema.ts:74`), consumed by `cur/lib/integration/sync.ts:109`, `cur/lib/integration/radar.ts:72`, `cur/app/api/admin/properties/taxonomy/route.ts:39-47`.
- **Regression mechanism:** This is the deepest consolidation in the product and it is on the critical path of at least six other entries (RR-20, RR-26, RR-31, RR-32, RR-66, and the office/radar work). The trap: `properties` has 83 consumers and no creator, so on a fresh Postgres database it does not exist — which makes `property_listings` look like the working store and `properties` like an aspiration. Consolidating "onto the one that works" would discard the public site's entire data model (media, favorites, saved searches, requests, offers, inquiries, views — `properties-schema.ts:77,102` et al.), all of which have no equivalent on `property_listings`. Consolidating the other way without a column map discards the desktop's 69-column richness (`AkarApp_LIVE/AkarDB.sqlite` `Properties`, plus `PropertyBounds`, `PropertyGisPolygons`, `Coordinates`, `Ownerships`, `PropertyAttachments`, `PropertyAmenities`, `PropertyBrokers`) that `cur/lib/integration/sync.ts:60-104` already truncates to ~20 scalars.
- **Required regression test:** `tests/properties-store-contract.test.mjs` (new, added to `package.json:13`) — `one canonical property store serves every consumer`: assert a property created through `POST /api/properties` is visible to the public list, the dashboard "my listings" path, the office sync pull, the radar query and the taxonomy admin; assert a property arriving through office sync is visible on the public detail page. The test must fail today (it will) and is the exit criterion for the consolidation.
- **Recommended preservation strategy:** Record PO-5 (fragment 08) / decision 2 (fragment 02) first. Then build the union schema, backfill both directions, keep dual reads behind a feature flag until the contract test is green, and only then drop the loser. Never delete `cur/lib/properties-schema.ts` before `lib/integration/sync.ts` and `radar.ts` have been repointed and tested.

### RR-31 — Moving DDL out of the request path drops the 75 ensure-only tables

- **Capability at risk:** Every table that exists only because an `ensure*` function runs at boot or per request — 75 tables spanning content, ads, i18n, services, properties, companies, office integration and news.
- **Old implementation:** the same pattern — `hist/old-tag/lib/runtime-db.ts` called the content-schema ensure path on every D1 boot.
- **Current implementation:** eleven ensure paths, enumerated in fragment 11: `ensureContentSchema` `cur/lib/content-schema.ts:567` (22 tables, invoked from `cur/lib/pg-runtime.ts:227` and `cur/lib/runtime-db.ts:64`), `ensureAdSchema` `cur/lib/ad-schema.ts:170` (4, plus **per-request** at `cur/app/api/admin/ads/route.ts:123` and `cur/app/api/ads/request/route.ts:54`), `ensureI18nSchema` `cur/lib/i18n-schema.ts:61` (5), `ensureServicesSchema` `cur/lib/services-schema.ts:141` (9), `ensureServicesMarketplaceSchema` `cur/lib/services-marketplace-schema.ts:370` (16), `ensurePropertiesSchema` `cur/lib/properties-schema.ts:74` (3), `ensureCompanySchema` `cur/lib/company-schema.ts:29` (2, per-request at `cur/app/api/admin/companies/taxonomy/route.ts:15`), `ensureIntegrationSchema` `cur/lib/integration/schema.ts:158` (9), `ensureNewsSchema` `cur/lib/news/schema.ts:126` (5), `ensureMysqlSchema` `cur/lib/mysql-runtime.ts:630`, `ensurePgIdentitySchema` `cur/lib/db/pg-identity-schema.ts:423` (11). **None** of these 75 tables appears in `cur/drizzle-pg/`.
- **Regression mechanism:** `PHASE-0-BASELINE.md` §18 step 5 correctly instructs "move schema DDL out of the request path into an explicit, idempotent migration step, and revoke DDL privileges from the application role". The obvious implementation is to generate migrations from the Drizzle schema files — which describe a *different* 73-table set. Executing that plan and revoking DDL rights means the 75 ensure-only tables are never created on a fresh environment, and the application can no longer create them at boot either. The failure is total but domain-by-domain and looks like unrelated breakage: services 500s, ads return nothing, office pairing fails, i18n falls back to static. Compounding it, `ensureMysqlSchema` already omits `ensureCompanySchema` and `ensureIntegrationSchema` (`cur/lib/mysql-runtime.ts:630-649` vs `cur/lib/content-schema.ts:593-594`), so MySQL is already missing 11 tables — a precedent that makes an incomplete migration look normal.
- **Required regression test:** `tests/schema-latch.test.mjs` (currently not in `package.json:13` — see RR-51) — add `every ensure-path table has a migration`: enumerate the `CREATE TABLE` names emitted by all eleven ensure functions, enumerate the table names created by `drizzle-pg/`, and assert the first set is a subset of the second. Add `no phantom tables`: assert every table name written by any query in `app/api/**` is in the union (this catches `office_media_upload_sessions`, written at `cur/app/api/office/v1/media/route.ts:97,171` and defined nowhere).
- **Recommended preservation strategy:** Generate the migrations **from the ensure functions**, not from the Drizzle schemas, as the first step; make the subset test green; only then revoke DDL privileges. Keep the ensure paths in place, behind the existing `isContentSchemaApplied()` latch (`cur/lib/content-schema.ts:567-585`), for one full release after the migrations land.

### RR-32 — Ensure-path vs Drizzle table-name collisions

- **Capability at risk:** Whichever definition loses for `ad_campaigns`, `ad_creatives`, `service_requests`, `service_offers`, `service_categories`, `service_reviews`, `auction_bids`, `auction_terms`, `auction_terms_acceptance`.
- **Old implementation:** single definitions per table in `hist/old-tag/db/schema.ts:8-540` and `hist/old-tag/lib/services/core.ts`.
- **Current implementation:** the collision table in fragment 11 — e.g. `service_requests` as `cur/lib/services-schema.ts:32-50` (`id VARCHAR(36)`, `customer_user_id`, `category_id`, `country_code`, `city_id`, `title_key`, `budget_min/max`) versus `cur/lib/db/schemas/services-schema.ts:46-67` (`id uuid`, `user_id uuid`, `title`, `description`, `urgency`, `governorate`, `radius`, `budget decimal`); `auction_bids` declared twice in Drizzle (`cur/lib/db/schemas/properties-schema.ts` and `cur/lib/db/schemas/auctions-schema.ts`); `auction_terms`/`auction_terms_acceptance` declared twice (`cur/lib/db/schemas/auctions-schema.ts:60-76` with `content_tr`, and `cur/lib/db/schemas/auction-hardening-schema.ts:5-31` with hashes and unique indexes).
- **Regression mechanism:** `CREATE TABLE IF NOT EXISTS` means the first definition wins silently. During any migration, the *order* of DDL determines which model exists, and the losing side's consumers (`cur/app/api/services/route.ts`, `cur/app/api/service-analytics/route.ts`, `cur/lib/services/matching/professional.matcher.ts`, `cur/lib/advertising/core/matching.engine.ts`) query columns that are not there. The specific loss to guard: `auction_terms.content_tr` — Turkish auction terms — exists only on the *superseded* definition, on a platform whose UI is AR/EN/TR. Resolving the collision by keeping the hardening definition drops Turkish terms with no record.
- **Required regression test:** `tests/schema-latch.test.mjs` — add `no table name is declared twice`: enumerate every table name declared by any ensure function or `pgTable` call and assert no duplicates; for each formerly-colliding table assert the surviving column set is the union (explicitly assert `auction_terms.content_tr` exists, and that `ad_campaigns` carries both column families per RR-23).
- **Recommended preservation strategy:** Resolve each collision by union, not by choosing. Where a union is impossible (`service_requests` id types), rename one table and migrate its consumers explicitly rather than letting DDL order decide.

### RR-33 — Orphaned `drizzle/` set and the missing `0004`–`0010` migrations

- **Capability at risk:** The DDL for `forum_categories`/`forum_topics`/`forum_posts`, `knowledge_items`, `news_ticker_items`, plus the properties/leads+land/auction-fields/geo+currency/vehicles migrations.
- **Old implementation:** `ref/akarpromax-source/drizzle-pg/0004_add_new_tables.sql:289,301,312,327,412` and `ref/akarpromax-source/drizzle-pg/0005`…`0010*.sql`.
- **Current implementation:** absent from `cur/drizzle-pg/`, while `cur/drizzle-pg/meta/_journal.json` still lists `0004`–`0006` and `cur/scripts/apply-geo-currency-schema.ts:8` reads a missing `0009`. Separately, `cur/drizzle/` (3 files, 13 tables) has **no config and no runner** — `cur/drizzle.config.ts` points at `drizzle-pg`, `cur/drizzle.mysql.config.ts` at `drizzle-mysql`.
- **Regression mechanism:** Two mirror-image errors. (a) A migration cleanup that reconciles `_journal.json` by *deleting the orphaned journal entries* makes the missing files permanently unrecoverable from the journal's record that they existed — and community, knowledge and news-ticker then have no DDL anywhere. (b) A cleanup that deletes the orphaned `cur/drizzle/` directory as unused removes the only SQLite/D1 migration set, which is the closest thing the tree has to a specification for the D1 side of RR-31.
- **Required regression test:** `tests/schema-latch.test.mjs` — add `journal and migration files agree`: assert every entry in `drizzle-pg/meta/_journal.json` has a corresponding `.sql` file and vice versa; assert every path read by `scripts/apply-*.ts` exists; assert `forum_categories`, `forum_topics`, `forum_posts`, `knowledge_items` and `news_ticker_items` each have exactly one creator.
- **Recommended preservation strategy:** Restore `0004`–`0010` from `ref/akarpromax-source/drizzle-pg/` before touching the journal. Keep `cur/drizzle/` until RR-31's migrations exist; then retire it in a commit that records what it contained.

### RR-34 — Localization: static dictionary vs DB-backed store

- **Capability at risk:** Either the compile-time `copy` dictionary that the major public pages actually render, or the admin's ability to change a string without a redeploy.
- **Old implementation:** `hist/old-tag/lib/i18n/core.ts` + `hist/old-tag/src/components/services/useServicesPage.tsx` — the same split existed before the refactor.
- **Current implementation:** static store `cur/src/data/translations.ts`, returned as `copy: translations[locale]` at `cur/src/components/services/useServicesPage.tsx:138` and destructured by `cur/app/page.tsx:16`, `cur/app/properties/page.tsx:37`, `cur/app/services/page.tsx:62`; six modules import the dictionary directly (`cur/src/components/AuthPageShell.tsx`, `cur/src/components/FloatingAdSlotActions.tsx:4`, `cur/src/components/tools/ToolsPageClient.tsx`, `cur/app/properties/[id]/page.tsx`, `cur/app/vehicles/[id]/page.tsx`). DB store: `cur/src/components/services/useServicesPage.tsx:72-84` fetches `/api/i18n/{locale}`, `t(key)` at `:86-92`; admin writer `cur/app/admin/i18n/i18n-admin-client.tsx:133`; cache invalidation `cur/lib/i18n/core.ts:53-57`. Only 21 of 53 `app/**` pages call `t(` at all; `app/page.tsx` calls it zero times.
- **Regression mechanism:** Both directions are destructive. Deleting `src/data/translations.ts` and migrating everything to `t()` moves every string on the highest-traffic pages behind a network fetch and a DB row — any locale whose bundle is missing a key renders the raw key, and there is no per-key fallback to the compile-time value. Conversely, "the DB store is barely used, drop it" deletes the entire admin i18n console, the five `i18n_*` tables and the only path to changing copy without a deploy — a capability the old build also had. The migration touches Properties, Services, Auctions, Community, Knowledge, Tools and Admin, so it will be done incrementally, and a half-migrated page mixing `copy` and `t()` shows two different Arabic strings for the same concept.
- **Required regression test:** `tests/i18n-parity.test.mjs` (new, added to `package.json:13`) — `every static key has a DB counterpart and a fallback`: enumerate the key set of `src/data/translations.ts` for each locale, assert every key resolves through `t()` (from the DB bundle or the static fallback), assert `t()` never returns the raw key for a known key, and assert the three locales have identical key sets.
- **Recommended preservation strategy:** Make `t()` fall back to the static dictionary per key before migrating any page, so the static file becomes the seed and the safety net rather than a rival. Migrate page-by-page with the parity test as the gate; delete `src/data/translations.ts` only when it is empty of keys the DB does not have.

### RR-35 — Two i18n schema definitions

- **Capability at risk:** The five-table translation model (`i18n_namespaces`, `i18n_keys`, `i18n_translations`, `i18n_versions`, `i18n_change_log`) including versioning and the change log.
- **Old implementation:** `hist/old-tag/db/mysql/i18n-schema.ts` (5 tables).
- **Current implementation:** raw-SQL/D1 `cur/lib/i18n-schema.ts:61` (`ensureI18nSchema`) versus Drizzle MySQL `cur/db/mysql/i18n-schema.ts`, reachable through `cur/db/mysql/schema.ts:560` and live for one route via `cur/lib/mysql-db.ts:4`.
- **Regression mechanism:** The MySQL Drizzle path has exactly one live consumer, so it looks retirable; but it is the only *migrated* definition (`drizzle-mysql/0000`), and the raw-SQL one is ensure-only (RR-31). Deleting either during a provider consolidation leaves the version history and change log without a creator on the surviving provider — and those two tables are what makes admin-managed translation auditable.
- **Required regression test:** `tests/i18n-parity.test.mjs` — add `i18n schema has one creator and five tables`: assert all five tables exist on the configured provider and that a translation edit writes both a `i18n_versions` row and an `i18n_change_log` row.
- **Recommended preservation strategy:** Fold the MySQL definition into the ensure path's migration (RR-31) before deleting it; assert the version/change-log write in the test.

### RR-36 — Currency catalogue: 12 seeded vs 23 static

- **Capability at risk:** The eleven currencies that exist only in the static map, and the per-listing currency validation that neither list currently performs.
- **Old implementation:** none found as a distinct catalogue.
- **Current implementation:** DB seed of 12 at `cur/scripts/seed-currency-data.ts:5-16`; orphaned static list of 23 at `cur/src/data/locations.ts:29-53`, with a **non-empty symmetric difference**; `AGENTS.md:205` asserts 12. Formatters are triplicated: `cur/src/lib/services-client.ts:141`, `cur/src/components/ui/LuxuryPropertyCard.tsx:36`, `cur/lib/services/currency/currency.service.ts:61`; `CurrencyService.convert` (`cur/lib/services/currency/currency.service.ts:48`) has no caller.
- **Regression mechanism:** `src/data/locations.ts` is orphaned and will be deleted in a geo consolidation (RR-37). Because the difference is symmetric, deleting it removes currencies the seed does not have — so any listing already priced in one of them becomes unformattable, and the country→currency mapping in `cur/src/components/.../GeoContext.tsx:25` loses entries. The loss is invisible until a user in one of those countries loads a page.
- **Required regression test:** `tests/currency-catalogue.test.mjs` (new) — `currency catalogue is a superset of every code in use`: assert the seeded catalogue contains every code referenced by `src/data/locations.ts`, by `geo-schema.ts` `countries.currency_code`, and by any property/services currency column fixture; assert exactly one formatter implementation is exported.
- **Recommended preservation strategy:** Compute the union, extend the seed, and delete the static list in the same commit — with the test asserting the union first.

### RR-37 — Geo hierarchy: three sources of truth

- **Capability at risk:** The country/region/city/district lists the UI actually offers, and the ability of ad geo-targeting to resolve them.
- **Old implementation:** none found as a single source.
- **Current implementation:** DB `cur/lib/db/schemas/geo-schema.ts` (no migration, no ensure path — RR-31); static `cur/src/data/locations.ts`; hard-coded arrays in `cur/components/properties/PropertyWizard.tsx:76-81` and `cur/src/components/land/LandSearchPage.tsx:43-47`. Only Saudi Arabia is seeded (`cur/scripts/seed-geo-data.ts`) while the UI offers 23 countries. Ads geo-targeting consumes IDs that must match the DB (`cur/lib/ads/engine.ts:374-400`) while `cur/src/components/AdSlot.tsx:185-186` passes only `country` + `city`.
- **Regression mechanism:** Consolidating onto the DB is right, but the DB is seeded for one country. A consolidation that deletes the static and hard-coded lists before the seed is complete reduces the product's coverage from 23 countries to one, in a single commit, with no error — the dropdowns simply get shorter.
- **Required regression test:** `tests/geo-catalogue.test.mjs` (new) — `DB geo catalogue covers every country the UI offers`: assert the seeded country set is a superset of the union of `src/data/locations.ts`, `PropertyWizard.tsx:76-81` and `LandSearchPage.tsx:43-47`; assert every city id used in an ads-targeting fixture resolves.
- **Recommended preservation strategy:** Extend the seed to the union first (fragment 02, decision 10 records the open question of which countries ship), make the test green, then delete the static sources.

### RR-38 — Reputation: two scoring paths producing different numbers

- **Capability at risk:** The per-entity-type policies, the ProMax eligibility gate and the demotion grace period.
- **Old implementation:** none found — reputation is a current-generation capability.
- **Current implementation:** `cur/lib/amrs/reputation.ts:56-91` (`computeScore`/`scoreToLevel`, module-level constants, thresholds `:68-74`) coexisting with `cur/lib/amrs/reputation.ts:447-493` (`computeScoreWithPolicy`/`scoreToLevelWithPolicy`); only the policy path is reached by `evaluateReputation` (`:156`). Per-entity policies `:333-445`; ProMax gate `:158-159,495-516`; grace period `:161-163,518-533` (written but no read path honours it); history `:167-214`.
- **Regression mechanism:** The two paths return different numbers for the same signals, so a dedupe is required. The module-level pair is the one that *looks* canonical (simpler, exported, referenced by the thresholds constant) while the policy pair is the one actually used. Deduping onto the module-level pair silently removes the per-entity-type policies, the ProMax eligibility gate and the grace period — three deliberate product rules — and every entity's level changes at the next evaluation with no migration and no notification to the affected professionals and offices.
- **Required regression test:** `tests/amrs/amrs5-policy.test.ts` (not currently in `package.json:13` — see RR-51) — add `policy path is the only scoring path`: assert `computeScore` and `computeScoreWithPolicy` return identical results for a fixture signal set under each of the four entity policies; assert a score above the ProMax threshold with insufficient verification is downgraded to `gold`; assert a one-rank demotion sets `grace_period_ends_at` **and** that a read during the grace window still reports the old level.
- **Recommended preservation strategy:** Delete the module-level pair, not the policy pair. Land the grace-period read path in the same change so the column stops being write-only.

### RR-39 — `reputation-extended.ts`, the second five-level ladder

- **Capability at risk:** An alternative reputation model with different thresholds (0/100/300/600/1000 versus 0/200/450/700/900).
- **Old implementation:** none found.
- **Current implementation:** `cur/lib/services/reputation/reputation-extended.ts:8-140` — zero importers, same three tables as `cur/lib/amrs/reputation.ts:66-72`.
- **Regression mechanism:** It is dead and duplicative and will be deleted. The risk is small but real: it is a *second recorded intent* about where the level boundaries should sit, on tables shared with the live model. Deleting it without recording the threshold difference means a future "the levels feel wrong" conversation restarts from zero.
- **Required regression test:** `tests/amrs/amrs5-policy.test.ts` — add `level thresholds are asserted explicitly`: assert the surviving ladder's five boundaries as literal values, so any future change is a deliberate test edit.
- **Recommended preservation strategy:** Record the alternative thresholds in the surviving module's header comment, then delete the file.

### RR-40 — Rank and verification trust indicators in the directory

- **Capability at risk:** Rank, rating, jobs-completed and verification surfacing as trust signals, and the directory's declared filters and sorts.
- **Old implementation:** none found — a current-generation capability that was declared and never delivered.
- **Current implementation:** `cur/lib/amrs/directory.ts:106-119` and `:126-160` hardcode `ratingAvg: null, jobsCompleted: null, reputationLevel: null, reputationScore: null, isVerified: false` for every entry; conditions are built from status/country/city/search only (`:43-65`), while `cur/app/api/amrs/directory/route.ts:24-34` accepts `reputationLevel`, `classification`, `organizationType`, `isVerified` and `sortBy=rating|reputation` and silently ignores them. Downstream, `cur/app/api/land/discover-surveyors/route.ts:35` sorts by reputation and `cur/lib/land/surveyor-discovery.ts:48-50` defaults `onlyVerified` on — so with `isVerified` hardcoded `false`, surveyor discovery returns zero candidates for every request.
- **Regression mechanism:** The hardcoded nulls look like placeholders and the route contract looks complete, so a cleanup pass is likely to *remove the unused parameters from the route* to make the contract honest. That converts a wiring gap into a removed feature: the API can then no longer express the filters, and the reputation engine (RR-38) loses its only consumer, which makes it a deletion candidate in turn.
- **Required regression test:** `tests/amrs/amrs7-directory.test.ts` (not currently in `package.json:13`) — add `directory returns real trust signals and honours its filters`: seed two organizations with different reputation levels and verification states; assert `reputationLevel`, `reputationScore`, `ratingAvg`, `jobsCompleted` and `isVerified` are non-placeholder; assert `?isVerified=true` returns only the verified one and `?sortBy=reputation` orders correctly; assert `/api/land/discover-surveyors` returns a non-empty candidate list.
- **Recommended preservation strategy:** Join the data rather than trimming the contract. Keep the route parameters and make the test the specification.

### RR-41 — Two profile-strength models with different required-field sets

- **Capability at risk:** Profile completeness scoring, and the definition of what a complete professional/organization/user profile is.
- **Old implementation:** none found.
- **Current implementation:** `cur/lib/amrs/profiles.ts:28-144` (weighted scoring: professional 12 fields / org 11 / user 6) versus `cur/lib/amrs/contracts/profile-strength.ts:13-34` (required-field ratio: professional 7 / org 5 / user 3). Neither is rendered anywhere and neither has a route.
- **Regression mechanism:** Both are dead, so both are deletion candidates in the same sweep — which removes the *only two records* of what field completeness means, on a platform where completeness is one of the nine reputation signals (`cur/lib/amrs/reputation.ts:44-91`). The reputation engine then has a signal with no definition.
- **Required regression test:** `tests/amrs/amrs6-profiles.test.ts` (not currently in `package.json:13`) — `one completeness model, asserted field lists`: assert the surviving module exposes the required-field list per entity type as data, assert the lists are the union of the two current models, and assert the reputation completeness signal consumes it.
- **Recommended preservation strategy:** Merge into one module (the weighted one, which is richer), record the union field lists in the test, wire it to the reputation signal, then delete the other.

### RR-42 — The `tools.use` permission gate

- **Capability at risk:** Gating the engineering tools hub behind login and the `tools.use` permission.
- **Old implementation:** `hist/old-tag/src/components/tools/ToolsGate.tsx:16-46`, used at `hist/old-tag/src/components/tools/ToolsPageClient.tsx:64,95`.
- **Current implementation:** `cur/src/components/tools/ToolsGate.tsx` exists with **no importer**; `/tools` renders `ToolLoader` unconditionally; the permission is still declared at `cur/src/constants/permissions.ts:79`.
- **Regression mechanism:** A dead component plus an unchecked permission is the canonical cleanup target: delete the file, delete the permission constant. That closes the question by fiat — the product silently becomes "tools are public" with no record that they were ever gated, and if the answer later turns out to be "gated for offices only", the gate has to be rebuilt and the permission re-added to every role.
- **Required regression test:** `tests/tools-gate.test.mjs` (new, added to `package.json:13`) — `tools access policy is explicit`: assert either (a) `/tools` renders behind `ToolsGate` and an unauthenticated request is refused, or (b) a recorded constant `TOOLS_ARE_PUBLIC === true` exists and the `tools.use` permission has been removed from `src/constants/permissions.ts`. The test forces the decision to be recorded in code either way.
- **Recommended preservation strategy:** Take fragment 02 decision 1 before Phase 1 cleanup. Do not delete `ToolsGate.tsx` and the permission in the same change; delete them only as the second half of a recorded "tools are public" decision.

### RR-43 — The unreachable CAD export subsystem

- **Capability at risk:** A complete DXF/SVG/PNG/PDF export toolchain for coordinate and boundary data.
- **Old implementation:** not applicable — it is a current-generation subsystem that was never wired.
- **Current implementation:** `cur/src/lib/cad/*` (including `cur/src/lib/cad/coordinates.ts`) and `cur/src/components/cad/*` — no route renders them.
- **Regression mechanism:** An entire directory tree with no importer is the largest and most obvious deletion in the repo. It is also the only DXF *writer* in the product, and DXF is one of the input formats RR-08 is trying to preserve and one of the export formats RR-09 needs. Deleting it means the "Points→DXF" tool and any future boundary export must be written from scratch, and `cur/src/lib/cad/coordinates.ts` is one of the four surviving coordinate-utility implementations whose consolidation is already planned.
- **Required regression test:** `tests/tools/points-to-dxf.test.ts` (exists, not in `package.json:13` — see RR-51) — extend with `CAD writer produces a parseable DXF for a closed ring`: assert the emitted file contains a single `LWPOLYLINE` with the expected vertex count and closed flag, and that re-reading it through the DXF reader used by `app/api/land/analyze` yields the original coordinates. This ties the writer and the reader together so neither can be deleted alone.
- **Recommended preservation strategy:** Wire the subsystem to at least one route (Points→DXF, or FindMyLand export per RR-09) before the Phase 1 cleanup window, or record an explicit park decision (fragment 02, decision 9) that names the directory as preserved.

### RR-44 — `/tools/[id]` fallback page versus the real tool registry

- **Capability at risk:** Correct tool behaviour for any tool id that resolves to the fallback.
- **Old implementation:** not applicable.
- **Current implementation:** the registry `cur/src/data/toolsData.ts` + `cur/src/components/tools/*` versus the fallback page `cur/app/tools/[id]/page.tsx:5-30`, which performs fake calculations. Both are routed.
- **Regression mechanism:** Consolidating by deleting the registry components in favour of the generic page (fewer files) would replace real tools with fake maths. The inverse — deleting the fallback — is correct but must redirect its ids first, or every currently-reachable `/tools/<id>` URL 404s.
- **Required regression test:** `tests/tools-registry.test.mjs` (new) — `every routed tool id resolves to a real implementation`: enumerate ids in `src/data/toolsData.ts`, assert each resolves to a registry component and none falls through to `app/tools/[id]/page.tsx`.
- **Recommended preservation strategy:** Redirect the fallback's ids into the registry, then delete the fallback.

### RR-45 — Admin subscription-plan CRUD

- **Capability at risk:** Creating, editing, toggling and deleting subscription plans with monthly and yearly price, currency, max branches/users/properties/ads, feature list and sort order.
- **Old implementation:** `hist/old-tag/app/admin/settings-admin-client.tsx:115-179,242-258` + `hist/old-tag/app/api/sponsor-plans/route.ts:42-161`.
- **Current implementation:** `cur/app/admin/settings-admin-client.tsx:13-16` — a 19-line empty state. `/api/sponsor-plans` does not exist, yet `cur/app/api/admin/stats/route.ts:70` still counts `sponsor_plans`, and the table is still created and seeded with four priced tiers (`cur/lib/content-schema.ts:517-541`, invoked at `:606`).
- **Regression mechanism:** The admin settings page is an empty shell, so it is a natural "delete this stub" target; the `sponsor_plans` table has no API, so it is a natural "drop this table" target. Doing both removes the plan catalogue and the quota model (`max_branches`/`max_users`/`max_properties`/`max_ads`) that is the only expression of what a paid tier grants — while the KPI query at `admin/stats/route.ts:70` keeps counting a table that no longer exists, turning a silent gap into a 500.
- **Required regression test:** `tests/admin-plans.test.mjs` (new, added to `package.json:13`) — `plan catalogue is addressable`: assert `sponsor_plans` has a creator and the four seeded tiers are readable; assert the admin stats query resolves; and, once restored, assert create/edit/toggle/delete round-trip including the four quota fields and the feature list.
- **Recommended preservation strategy:** Take fragment 10 decision 1 first. Until it is taken, keep the table, keep the stats query, and keep `hist/old-tag/app/api/sponsor-plans/route.ts` identified as the restore source. Do not delete the empty settings client — replace it.

### RR-46 — Admin sponsors / organizations console

- **Capability at risk:** The list/detail/edit/new/requests/banner console for sponsors, and its never-built organization equivalent.
- **Old implementation:** `hist/old-tag/app/admin/sponsors/{page,new,[id],[id]/edit,requests,banner}`.
- **Current implementation:** `/admin/advertisers/**` preserves list/detail/edit/new/requests 1:1; the `banner/` route was dropped (no `cur/app/admin/advertisers/banner`). `app/admin/organizations` exists in the 2026-08-08 snapshot (`ref/akarpromax-source/app/admin`) and is **absent** from `cur`. Two rival advertiser consoles now coexist: `cur/app/admin/advertisers` (over `sponsor_profiles`) and `cur/app/admin/advertisers/management` (`advertiser-admin-client.tsx`, over `sponsors` + `sponsor_access`).
- **Regression mechanism:** Deduping the two advertiser consoles is necessary, and the `management` variant is the odd one out. But it is the one holding the banner-preset UI (`cur/app/admin/advertisers/advertiser-admin-client.tsx:71-74,86`) and the logo/banner fields; deleting it completes the loss of the old `banner/` page. Separately, restoring the organizations console from the snapshot must happen before the snapshot is dropped from the working set — `organizations.review` is not even in the permission catalogue (`cur/src/constants/permissions.ts:1-60`), so nothing but `super_admin` can review an organization today, and with no console the capability is unreachable from any angle.
- **Required regression test:** `tests/admin-navigation.test.mjs` (extend `tests/public-navigation-constitution.test.mjs`'s pattern) — `every admin capability has a reachable page`: assert each admin API family (advertisers, organizations, verifications, plans, banner) has at least one page linked from `cur/app/admin/admin-sidebar.tsx:27-81`; assert the banner-management affordance exists.
- **Recommended preservation strategy:** Merge the two advertiser consoles by union (keep the banner presets), restore `app/admin/organizations` from `ref/akarpromax-source` before that snapshot leaves the working set, and add `organizations.review`/`verification.review` to the permission catalogue.

### RR-47 — Advertiser commercial back office

- **Capability at risk:** Advertiser contracts (6 statuses), invoices (numbering, tax split, due dates, `paid_at`, PDF link), payments (method, reference, 4 statuses), subscriptions (trial/active/expired/cancelled/past_due with auto-renew), documents (typed vault) and the per-advertiser activity trail.
- **Old implementation:** `hist/old-tag/app/api/sponsor-contracts/route.ts:8,15-27`, `sponsor-invoices/route.ts:8,13-25`, `sponsor-payments/route.ts:13-66`, `sponsor-subscriptions/route.ts:37-166`, `sponsor-documents/route.ts:11-49`, `sponsor-activity/route.ts:9-22` — ~838 lines across nine deleted routes, all landed in commit `4c13c3e`.
- **Current implementation:** no routes. The **tables are still created on every boot** by `ensureContentSchema` (`cur/lib/content-schema.ts:567`; the sponsor commercial tables are in its 22-table set), the activity writer survives with no reader (`cur/lib/services/audit.ts:33-60`), and three permissions remain grantable in `cur/app/admin/roles-admin-client.tsx:36-38` while being checked by no route.
- **Regression mechanism:** The tables have no API and no UI, so a schema cleanup will drop them; the permissions have no checker, so an RBAC cleanup will remove them; the writer has no reader, so a dead-code cleanup will remove it. Each of the three is individually justified and together they erase the last in-tree trace that the platform ever had a billing model. `hist/old-tag` remains, but nothing in the current tree points at it, so the loss becomes undiscoverable. This is the largest single capability block at risk in the register.
- **Required regression test:** `tests/commercial-surface.test.mjs` (new, added to `package.json:13`) — `commercial tables, permissions and writers stay coherent`: assert that for each of `sponsor_contracts`, `sponsor_invoices`, `sponsor_payments`, `sponsor_subscriptions`, `sponsor_documents`, `sponsor_activity_logs` either (a) a route exists that reads it, or (b) a recorded `RETIRED_COMMERCIAL_TABLES` constant names it; assert no permission in `src/constants/permissions.ts` is unchecked by every route unless similarly recorded.
- **Recommended preservation strategy:** Take fragment 10 decisions 2–7 and 9 before any of the three cleanups. Whatever the answer, express it in the `RETIRED_*` constant so the removal is a recorded decision rather than an accumulation of tidy-ups. Restore from `hist/old-tag` (full source present — `OLD SOURCE REQUIRED` never applies here).

### RR-48 — The `sponsor_events` impression/click writer

- **Capability at risk:** Advertiser-facing impression, click and CTR reporting — billing-relevant data.
- **Old implementation:** `hist/old-tag/app/api/sponsor-events/route.ts:6-30` (the writer).
- **Current implementation:** no writer in `cur/app/api`; the table is still created by `ensureContentSchema`; **five read sites still join it**, including `cur/app/api/advertisers/route.ts:44-45` and the admin UI at `cur/app/admin/advertisers/advertiser-admin-client.tsx:305,317-319`. All advertiser counters therefore read 0 forever.
- **Regression mechanism:** The natural cleanup is the opposite of the fix: seeing permanently-zero tiles, an engineer removes the reporting columns and the joins, then the unused table. That completes the loss — the platform then has no advertiser-facing delivery metric at all, and the live `/api/ads/impression` + `/api/ads/click` path (`cur/lib/ads/events.ts:118,170` → `ad_daily_statistics`) is never connected to the advertiser view, because nobody remembers that it was supposed to be.
- **Required regression test:** `tests/ads-engine.test.mjs` — add `advertiser counters reflect recorded events`: record an impression and a click through the live tracking path, then assert the advertiser detail response's impression/click/CTR fields are non-zero and consistent.
- **Recommended preservation strategy:** Re-point the five read sites at `ad_impressions`/`ad_clicks`/`ad_daily_statistics` rather than restoring the old writer, and keep the test as the contract. Do not remove the reporting columns.

### RR-49 — `cur/db/schema.ts` and `cur/src/types/sponsor.ts`

- **Capability at risk:** The cleanest surviving restore source for the entire commercial model, inside the current tree.
- **Old implementation:** `hist/old-tag/db/schema.ts:8-540` (25 tables) — `cur/db/schema.ts` is byte-identical to it.
- **Current implementation:** `cur/db/schema.ts` (20,155 bytes, 25 `sqliteTable` declarations) — **zero importers**; `cur/db/index.ts:1` — zero importers, top-level `import { env } from "cloudflare:workers"`; `cur/src/types/sponsor.ts` — the entire commercial type model, zero importers.
- **Regression mechanism:** Three files with zero importers, one of which contains a build-hostile top-level Workers import. Any dead-code or runtime-migration sweep deletes all three. They are, per fragment 10, "the cleanest restore source" for RR-47 — the only place in the *current* tree where the commercial schema and types are expressed in the project's own idiom. After deletion, restoring RR-47 means porting from `hist/old-tag`, a separate repository that a future engineer may not know exists. The `cloudflare:workers` import makes deletion look not merely safe but urgent.
- **Required regression test:** `tests/runtime-env.test.mjs` (not currently in `package.json:13`) — add `no top-level cloudflare:workers import`, which will flag `db/index.ts:1` and give the correct remedy (guard or dynamic-import it) rather than deletion; plus `tests/commercial-surface.test.mjs` (RR-47) — assert `db/schema.ts` and `src/types/sponsor.ts` still declare the commercial model until `RETIRED_COMMERCIAL_TABLES` is recorded.
- **Recommended preservation strategy:** Fix `db/index.ts:1` instead of deleting it. Mark all three files with a preservation header referencing fragment 10 decision 32, and permit deletion only in the commit that records the commercial product-owner decision.

### RR-50 — Four priced sponsor plans seeded on every boot

- **Capability at risk:** The only surviving statement of AkarProMax's intended price points and quota tiers (Free / Basic 99 / Professional 299 / Enterprise 999 OMR per month, with yearly prices and per-tier branch/user/property/ad limits and feature lists).
- **Old implementation:** the same seed shipped pre-refactor alongside a working `/api/sponsor-plans`.
- **Current implementation:** `cur/lib/content-schema.ts:517-541` (`seedSponsorPlans`, the four tiers with `priceMonthly` 0/99/299/999, `priceYearly` 0/999/2999/9999, currency `OMR`, `maxBranches`/`maxUsers`/`maxProperties`/`maxAds`, feature arrays), invoked at `cur/lib/content-schema.ts:606`, guarded only by a row-count check. No API, no UI, no way to sell them. Meanwhile `cur/docs/marketplace/COMMERCIAL_READINESS.md:5-21` and `cur/src/content/public-destinations.ts:130` state there is no billing.
- **Regression mechanism:** Two opposite dangers. (a) A seed cleanup ("we don't sell plans, stop inserting priced rows") deletes the only in-tree record of the intended pricing — and it is genuinely wrong to seed prices into a production-shaped database, so the cleanup will happen. (b) Left alone, the seed silently establishes prices the product owner may never have approved, and any restored plan UI would present them as fact. Note the Professional tier's feature list contains a mixed-script artefact (`دعم فني优先`), which is itself evidence the data was never reviewed.
- **Required regression test:** `tests/commercial-surface.test.mjs` — `plan seed is intentional`: assert the seed runs only when a recorded flag/env permits it; assert the four tiers' prices and quotas as literal values so any change is a deliberate test edit; assert no seeded feature string contains non-Arabic/Latin script.
- **Recommended preservation strategy:** Move the tier definitions out of the boot path into a reviewed fixture file that the seed *reads*, so retiring the seed cannot delete the pricing record. Take fragment 10 decisions 1 and 29 to resolve the doc-versus-database contradiction.

### RR-51 — Turning on the 60 unrun test files

- **Capability at risk:** The credibility of the release gate, and the 60 test files themselves.
- **Old implementation:** not applicable.
- **Current implementation:** `cur/package.json:13` hard-codes 19 filenames — no glob, no discovery. `PHASE-0-BASELINE.md:48` records 11 of 219 tests failing over those 19 files, and **22 failures out of 1,012 tests** when everything runnable is executed; §6 enumerates the 60 unrun files, including all 13 `tests/amrs/**`, all 9 `tests/news/**`, all 4 security files (`security-headers`, `rate-limit`, `audit-log`, `origin-guard`), 3 land, 1 geo, 4 ads, 2 tools, 5 organizations, 4 auctions and 3 runtime files.
- **Regression mechanism:** Step 1 of the recommended Phase 1 is to replace the hard-coded list with discovery. The moment that lands, ~22 failures appear that were *not* caused by the change. Under release pressure the two available shortcuts are both destructive: (a) re-exclude the noisy files, which permanently ratifies the 24 % coverage and removes the security and AMRS suites from the gate forever; (b) "fix" the failures by changing the product to match whatever the test asserts, which is exactly wrong for the six files in RR-52. Note also that many entries in this register name tests in files that are currently unrun — those tests provide no protection until this is fixed.
- **Required regression test:** `tests/test-discovery.test.mjs` (new, and the first file added) — `every test file is discovered`: enumerate `tests/**/*.test.{mjs,ts}` on disk and assert the runner's file list equals that set, so re-exclusion becomes a visible failing test rather than a quiet edit of `package.json:13`.
- **Recommended preservation strategy:** Sequence it: (1) land discovery with the full failure list captured verbatim as a baseline artefact **before** any fix; (2) fix the six stale-expectation files (RR-52); (3) triage the two genuine product failures (`design-tokens` z-index in `cur/src/components/ui/LuxuryPropertyCard.tsx`, service-category CRUD behind `tests/services-api.test.mjs`); (4) only then treat any remaining red as new. Never re-exclude a file without recording why in `tests/test-discovery.test.mjs`.

### RR-52 — Six test files encoding stale expectations

- **Capability at risk:** Six pieces of correct current behaviour that a literal reading of the failing tests would instruct an engineer to undo.
- **Old implementation:** the behaviours the tests were originally written against.
- **Current implementation:** `PHASE-0-BASELINE.md:638` names them: `tests/amrs/db-schema.test.ts`, `tests/rendered-html.test.mjs`, `tests/command-center.test.mjs`, `tests/public-shell.test.mjs`, `tests/organizations-hardening-f1.test.mjs`, `tests/e2e/production-runtime.test.mjs` (the last also carries stale instructions, `PHASE-0-BASELINE.md:378`).
- **Regression mechanism:** After RR-51 these six go red. The default engineering reflex — "make the test pass" — changes the *product* to match an outdated assertion: re-adding markup that was deliberately removed, reverting a command-centre contract, reshaping a schema. Because the tests are the only written statement of the old expectation, the change looks like restoring intended behaviour. Several of these files are also regex-over-source assertions rather than behavioural tests (fragment 03 notes the three `organizations-*-f{1,2,3}` files are regex-over-source), so they fail for cosmetic reasons and get "fixed" by editing source formatting.
- **Required regression test:** For each of the six, the fix is to correct the *assertion* and add a comment naming the behaviour change that made it stale. Concretely, in `tests/organizations-hardening-f1.test.mjs` replace the source-regex assertions with behavioural ones against `POST /api/amrs/organizations`; in `tests/command-center.test.mjs` assert the current `CommandCenterOverview` contract as exported by `cur/lib/command-center/service.ts:3-104` (and assert the hand-copied duplicate in `cur/app/admin/command-center-client.tsx:6-100` matches it).
- **Recommended preservation strategy:** Fix these six in a dedicated commit, before any product triage, with the commit message recording that the tests were wrong and the product was right. Convert regex-over-source assertions to behavioural assertions while there.

### RR-53 — `AdRequestDialog.tsx`

- **Capability at risk:** The self-serve "request this ad slot" flow — a localized six-field dialog wired to a live API.
- **Old implementation:** `hist/old-tag/app/page.tsx:12,453-454,540` — rendered on the home page and wired to `requestable` side rails.
- **Current implementation:** `cur/src/components/AdRequestDialog.tsx:134,195` exists and is **imported by nothing**; no `AdSlot`/`AdSlotFrame` is ever passed `requestable` (default `false` at `cur/src/components/AdSlot.tsx:128` and `cur/src/components/ads/ad-slot-frame.tsx:65`). The API survives at `cur/app/api/ads/request/route.ts:9`, whitelisting `["side_left","side_right"]` — placements the standard layout no longer renders.
- **Regression mechanism:** Advertiser onboarding is already BROKEN end to end (`/advertise` posts to a non-existent `/api/advertising/request`), so the only working public entry point in the product is this orphaned dialog. Deleting it as unused leaves the platform with **no** public way to become an advertiser — only an admin can create one — and the restore then requires rebuilding both the dialog and its localized copy. The placement whitelist mismatch means even a naive restore fails silently, which makes the component look broken rather than merely unwired.
- **Required regression test:** `tests/standard-public-ad-layout.test.mjs` (not currently in `package.json:13`) — add `an empty ad slot offers a request path`: assert at least one rendered placement passes `requestable`, assert the dialog mounts, and assert the placement it submits is present in the `/api/ads/request` whitelist.
- **Recommended preservation strategy:** Re-attach the dialog to at least one rendered placement and reconcile the whitelist with `cur/src/config/standard-public-ad-registry.ts` before any dead-code sweep (fragment 07, decision 3).

### RR-54 — `FloatingAdSlotActions.tsx`

- **Capability at risk:** The three-action floating panel (request / details / contact) shown on an empty ad slot.
- **Old implementation:** `hist/old-tag/src/components/FloatingAdSlotActions.tsx`.
- **Current implementation:** `cur/src/components/FloatingAdSlotActions.tsx:44-75`, rendered only from `cur/src/components/AdSlot.tsx:338` inside the `requestable` branch at `:315` — never reached; `onViewDetails`/`onContact` default to no-op closures at `cur/src/components/AdSlot.tsx:334-335`.
- **Regression mechanism:** Same sweep as RR-53, and it will be deleted in the same commit. It also imports the static translation dictionary directly (`cur/src/components/FloatingAdSlotActions.tsx:4`), so it will additionally be touched by the i18n migration (RR-34) — two independent reasons for it to be edited or removed by someone not thinking about advertising.
- **Required regression test:** covered by the RR-53 test — extend it to assert the three actions render and that `onViewDetails`/`onContact` are bound to real handlers rather than no-ops.
- **Recommended preservation strategy:** Restore alongside RR-53; if the request flow is retired by decision, retire both together and record it.

### RR-55 — `organization-profile-page.tsx`

- **Capability at risk:** The only correct implementation of "message this office / company", and a richer public organization profile than the live one.
- **Old implementation:** none found — a current-generation component.
- **Current implementation:** `cur/src/components/public/organization-profile-page.tsx:76-93,164-165,186-194` — **zero importers**; its sibling `cur/src/components/public/organization-discovery-page.tsx:72-85` likewise. The live routes are `cur/app/organizations/[id]/page.tsx:43-120` (no messaging at all) and `cur/app/offices/[id]/page.tsx:47-48` / `cur/app/companies/[id]/page.tsx:47-48`, whose "مراسلة" and "طلب خدمة" buttons have **no handler**.
- **Regression mechanism:** This is the sharpest instance of loss mode 1 in the register. Two unimported components duplicating live routes is an unambiguous cleanup. But `organization-profile-page.tsx:186-194` is the *only* place in the tree that calls `StartThreadButton` with `participantIds` for the `organization` context — i.e. the only working specification of how a visitor contacts an office. Deleting it leaves three dead buttons on three live pages and no code anywhere showing what they were meant to do; the `organization` message context then has zero entry points and becomes a deletion candidate itself (RR-14/15 cascade). The component also carries the offices/companies `mode` split that the live routes lack.
- **Required regression test:** `tests/messages-contract.test.mjs` — add `office and company profiles have a working contact action`: assert the live `/offices/[id]` and `/companies/[id]` pages render a contact control bound to a handler, and assert that activating it creates an `organization`-context thread with the organization's contact as a participant. The test fails today and cannot be satisfied by the dead component.
- **Recommended preservation strategy:** Port the messaging block (and the `mode` split) from `organization-profile-page.tsx` into `app/organizations/[id]/page.tsx` and the offices/companies routes **first**; delete the dead components only in the commit that lands the test green.

### RR-56 — `lib/services/matching/professional.matcher.ts`

- **Capability at risk:** The second matching implementation, written against the pg services schema.
- **Old implementation:** none found.
- **Current implementation:** `cur/lib/services/matching/professional.matcher.ts:6-33` — zero importers, queries `service_providers`/`service_requests` pg tables that no migration creates (RR-31/RR-32). The live matcher is `cur/lib/services/match-score.ts:70-189` + `cur/lib/services/matching.ts`.
- **Regression mechanism:** Dead and unrunnable — a certain deletion. Its value is as the only expression of matching against the *Drizzle* services model, which matters if the services schema collision (RR-32) is resolved in favour of the pg definition: the live raw-SQL matcher would then need rewriting, and this file is the head start. Low severity because the live matcher is richer, but the loss is real if the schema decision goes the other way.
- **Required regression test:** `tests/services-matching.test.mjs` (new) — `one matcher, asserted scoring contract`: assert the surviving matcher applies the documented weights, including the response/completion-rate budget at `cur/lib/services/match-score.ts:163-176`, and assert it rejects out-of-radius and cross-city pairs (`:93,111`).
- **Recommended preservation strategy:** Resolve RR-32's `service_requests` collision before deleting; if pg wins, port this file rather than rewriting.

### RR-57 — CP1256-mangled Arabic in the auction contract template

- **Capability at risk:** The only record of the intended Arabic text of the legally-framed auction contract.
- **Old implementation:** none found — the contract generator is current-generation.
- **Current implementation:** `cur/lib/auctions/settlement.ts:103` and `:130-166` — every Arabic literal in the HTML template is CP1256-mangled UTF-8 (e.g. `ط§ظ„ظ…ط²ط§ط¯ ط§ظ„ظ…ط؛ظ„ظ‚` at `:103`); the same corruption appears at `cur/app/api/auctions/[id]/contract/route.ts:41` and throughout `cur/app/api/auctions/[id]/contract/sign/route.ts:20,27,31,36,146-150`. The **plain-text twin at `cur/lib/auctions/settlement.ts:60-88` is correct Arabic**, and the row carries both representations with separate SHA-256 hashes; signing validates against `document_hash ?? content_hash` (`cur/app/api/auctions/[id]/contract/sign/route.ts:51`).
- **Regression mechanism:** The mangled literals look like garbage and will attract exactly one of two "cleanups", both destructive. (a) A formatter/encoding pass that re-encodes or normalises the file rewrites the byte sequences — after which the mojibake can no longer be decoded back through CP1256, and the intended wording of every string that has no plain-text twin is lost permanently. (b) A tidy-up that deletes the HTML template as "the broken one" and keeps the plain-text twin loses the document *structure* (the terms table at `:130-166` with role/version/hash rows). Either way the hash duality means existing signed contracts may stop validating: changing `document_html` changes `document_hash`, and any contract signed against the old hash becomes unverifiable.
- **Required regression test:** `tests/auctions-contract-f3.test.mjs` (exists, not in `package.json:13` — see RR-51) — add `contract HTML renders decodable Arabic`: assert the generated HTML contains no character in the mojibake ranges (`ط`, `ظ`, `غ` sequences typical of CP1256-through-UTF8), assert the rendered type label matches the plain-text twin's wording for both `fixed` and open auctions, and assert that regenerating a contract for an already-signed auction preserves the stored `document_hash` (or migrates signatures explicitly).
- **Recommended preservation strategy:** Before any reformatting, decode the mangled literals through CP1256 and record the recovered Arabic in a reviewed fixture. Repair the template from the recovered text plus the correct plain-text twin at `settlement.ts:60-88`, in a single commit that also migrates or re-signs existing contracts. Add an encoding lint so the class of defect cannot recur.

### RR-58 — Two `auction_terms` / `auction_bids` schema definitions

- **Capability at risk:** Trilingual auction terms (`content_tr`), and the hardened terms model (role, `content_hash`, `acceptance_hash`, unique indexes).
- **Old implementation:** `ref/akarpromax-source/lib/auctions/auction.engine.ts` drove the `auctions`/`auction_bids(auction_id)`/`auction_participants` model.
- **Current implementation:** `cur/lib/db/schemas/auctions-schema.ts:60-76` (`type`, `content_tr`, no hash) versus `cur/lib/db/schemas/auction-hardening-schema.ts:5-31` (`role`, `content_hash`, `acceptance_hash`, unique indexes; the only one with a `drizzle-pg` migration, `0011_auction_hardening_f1.sql`). `auction_bids` is declared twice in Drizzle (`cur/lib/db/schemas/properties-schema.ts` and `cur/lib/db/schemas/auctions-schema.ts`), consumed by five files under `cur/app/api/auctions/*`. Both definitions are still wired into `cur/drizzle.config.ts:13`.
- **Regression mechanism:** Resolving the collision correctly means keeping the hardening pair — which has no `content_tr`. On an AR/EN/TR platform, that silently drops Turkish auction terms with no migration and no record, and there is no Turkish content to notice missing because the column was never populated. The `auction_bids` double declaration means whichever loses changes the bid model under five live routes.
- **Required regression test:** `tests/auctions-hardening-f1.test.mjs` (not currently in `package.json:13`) — add `auction terms cover every platform locale`: assert the surviving `auction_terms` declaration carries `content_ar`, `content_en` and `content_tr`, assert content-hash and acceptance-hash columns are present, and assert exactly one `auction_bids` declaration exists in the tree.
- **Recommended preservation strategy:** Add `content_tr` to the hardening schema before deleting `auctions-schema.ts`'s terms tables; resolve `auction_bids` by choosing the property-backed model explicitly and updating `drizzle.config.ts:13` in the same commit.

### RR-59 — `auction_participants` registry and the `isAutoBid` flag

- **Capability at risk:** A per-auction participant registry and automatic proxy bidding.
- **Old implementation:** `ref/akarpromax-source/lib/auctions/auction.engine.ts:43-47` wrote an `auction_participants` row for every bidder; `:23,35` propagated an `isAutoBid` flag.
- **Current implementation:** `auction_participants` is declared (`cur/lib/db/schemas/auctions-schema.ts:5-58`) with **zero importers**; `isAutoBid` is hard-coded `false` at `cur/app/api/auctions/[id]/bid/route.ts:110`.
- **Regression mechanism:** The abandoned auction model will be removed as part of RR-58. `auction_participants` goes with it, and the hard-coded `false` reads as "auto-bid isn't a feature" rather than "auto-bid was dropped". The participant registry is also the natural home for auction notifications and a bidder's own dashboard (`/dashboard/bids`, itself already missing), so its deletion forecloses those.
- **Required regression test:** `tests/auctions-hardening-f1.test.mjs` — add `bids record participation and auto-bid provenance`: assert placing a bid creates or updates a participant record for the bidder, and assert the `isAutoBid` value on a stored bid reflects its source rather than a constant.
- **Recommended preservation strategy:** Port `auction_participants` into the surviving schema before deleting the abandoned one; either implement auto-bid or replace the hard-coded `false` with an explicit `AUTO_BID_NOT_IMPLEMENTED` constant so the gap stays visible.

### RR-60 — Three news models and two `NewsTicker` components

- **Capability at risk:** Whichever news model loses — the engine model's placements/targeting/delivery counters, or the ad-engine model's `page_targeting`/`geo_targeting`/`speed`, or the continuous-scroll ticker behaviour.
- **Old implementation:** `hist/old-tag/src/components/NewsTicker.tsx` (89 lines, continuous scroll); the current `cur/app/api/news/route.ts` is a strict superset of the old 318-line route.
- **Current implementation:** engine model `cur/lib/news/schema.ts:11` (`news`, `news_extended`, `news_placements`, `news_events`, `news_delivery_counters`, created by `ensureNewsSchema` at `:126`) driving `cur/app/api/news/*`, `cur/src/components/NewsTicker.tsx` and `/admin/news`; ad-engine model `cur/lib/db/schemas/advertising-schema.ts:51` (`news_ticker_items`) driving `cur/lib/advertising/core/matching.engine.ts:53` → `/api/advertising/match` → `cur/components/advertising/placements/NewsTicker.tsx`; MySQL seed model `drizzle-mysql/0001_news_table.sql` (7 hard-coded rows). The shell ticker is mounted at `cur/src/components/public/public-shell-layout.tsx:199`.
- **Regression mechanism:** Two components with the same export name and incompatible props will be deduped by import path, effectively at random. The two data models have disjoint targeting vocabularies, so the survivor cannot express the loser's placements — and one of the two admin screens (`/admin/advertising/news-ticker`, targeting an API that was never built) is already broken, which makes the ad-engine model look abandoned even though it is the one rendering on community/knowledge/offices/companies detail pages. Separately, the current ticker's interval is mis-derived from the old animation duration, holding each headline 18–35 s; "fixing" it by reverting to the old continuous scroll would undo a real accessibility improvement.
- **Required regression test:** `tests/news/news-ticker-contract.test.mjs` (the `tests/news/**` suite exists but is unrun — see RR-51) — `one ticker component, one targeting vocabulary`: assert exactly one `NewsTicker` export exists; assert the surviving model can express page targeting, geo targeting and speed as well as placements and delivery counters; assert an item targeted at a specific page appears there and not elsewhere.
- **Recommended preservation strategy:** Union the targeting vocabulary into the engine model, re-point the placement components at it, then delete `news_ticker_items` and the duplicate component together. Keep the carousel; tune the interval as a separate, tested change.

### RR-61 — Old services routes: disputes, order status, order review, review aggregate

- **Capability at risk:** The entire dispute capability, the order status PATCH contract, GET-reviews-for-an-order, and the `{reviews, aggregate:{count,avg}}` envelope.
- **Old implementation:** `hist/old-tag/app/api/services/disputes/route.ts:11-109` (list/open/resolve, gated by `SERVICES_VIEW`/`SERVICES_DISPUTE_RESOLVE`) over `hist/old-tag/lib/services/core.ts:477-511`; `hist/old-tag/app/api/services/orders/[id]/route.ts:13-48`; `hist/old-tag/app/api/services/orders/[id]/review/route.ts:15-71`; `hist/old-tag/app/api/services/reviews/route.ts:22-28`.
- **Current implementation:** the dispute service functions **survive** at `cur/lib/services/core.ts:477-511`, but `cur/app/api/services/disputes/route.ts:19,23,27` proxies to an absent `/api/service-disputes`; `cur/app/api/services/orders/[id]/route.ts:20` proxies to an absent `/api/service-orders/[id]`; `cur/app/api/services/orders/[id]/review/route.ts:20,25` likewise; `cur/app/api/service-reviews/route.ts:21` returns `{reviews}` only. The dispute UI (`cur/app/dashboard/services/disputes/page.tsx:32,52`) and the dashboard counter (`cur/app/api/service-dashboard/counts/route.ts:33`) both still reference disputes.
- **Regression mechanism:** Fragment 04's decision 4 asks whether to complete the proxies or delete `/api/services/*`. Deleting is the tidier answer and removes four 404-terminating routes — along with the last references to disputes anywhere in the routing layer. The service functions at `core.ts:477-511` then have no caller and are deleted in the next sweep (RR-62), at which point the dispute capability exists only in `hist/old-tag`. The dispute UI page and the counter would be removed as "referencing a dead API", completing the erasure of a P0 capability.
- **Required regression test:** `tests/services-api.test.mjs` — add `dispute lifecycle is reachable`: open a dispute against an order, list it as the customer and as an admin holding `SERVICES_DISPUTE_RESOLVE`, resolve it, assert the status transition; add `order status and order review contracts`: assert a status PATCH and a GET-reviews-for-order both resolve (through the new paths, with the old paths aliased), and assert the review response carries `aggregate:{count,avg}`.
- **Recommended preservation strategy:** Complete the proxies rather than deleting them: implement `/api/service-disputes`, alias `/api/services/orders/[id]` → `/api/service-jobs/[id]/status`, add the GET half of order reviews, and restore the aggregate envelope. Preserve `cur/lib/services/core.ts:477-511` until the dispute route exists.

### RR-62 — `lib/services/core.ts`, `state-machine.ts` and `deep-links.ts`

- **Capability at risk:** Service listings (the only implementation), the canonical five-entity state machine, and the richer nine-context messaging taxonomy with icons, colours and labels.
- **Old implementation:** `hist/old-tag/lib/services/core.ts` — the whole old service layer.
- **Current implementation:** `cur/lib/services/core.ts` (531 lines) — live for listings (`cur/app/api/services/listings/route.ts:20,61`, `cur/app/api/services/listings/[id]/route.ts`) and disputes; the rest of its functions (request create `:219-246`, offer create `:323-356`, accept offer `:366-406`, add review `:434-458`, update order status `:408-430`) are orphaned duplicates of `cur/lib/services/marketplace.ts`. `cur/lib/services/state-machine.ts:107-235` — canonical uppercase state machine for five entities, **zero importers**. `cur/lib/services/messaging/deep-links.ts:1-69` — the only place `office`, `company` and per-context iconography exist, versus the live `cur/lib/services/message-contexts.ts:64-81`.
- **Regression mechanism:** A "one service layer" consolidation deletes `core.ts` wholesale — taking service listings, which is the only end-to-end working old-generation feature and has no equivalent under `/api/service-*` at all (docs claim a `/api/service-listings` that does not exist), plus the dispute functions from RR-61. Separately, `state-machine.ts` and `deep-links.ts` are unimported and will go in the same sweep: the first is the only complete statement of the request/offer/order/job/dispute lifecycles (the live `cur/lib/services/constants.ts:63-123` covers two), the second is the only record that `office` and `company` were intended as first-class message contexts — which is precisely the open question behind the dead office/company buttons in RR-55.
- **Required regression test:** `tests/services-listings-route.test.ts` (exists, not in `package.json:13`) — assert listings create/read/update round-trip end to end. Plus `tests/services-state-machine.test.mjs` (new) — assert the surviving state machine covers all five entities and rejects every illegal transition; plus in `tests/messages-contract.test.mjs`, assert the surviving context taxonomy retains labels and icons for every declared context including `office` and `company`.
- **Recommended preservation strategy:** Delete `core.ts`'s orphaned duplicates function-by-function, never the file; keep listings and disputes until they have successors. Merge `state-machine.ts` into `constants.ts` (adopting the richer definition) and merge the nine-context taxonomy into `message-contexts.ts` before deleting either.

### RR-63 — `public/sponsors/*.webp` under the sponsor→advertiser rename

- **Capability at risk:** The four advertiser banner presets that the admin console offers.
- **Old implementation:** the same assets under the sponsor vocabulary.
- **Current implementation:** presets `/sponsors/oman-gold.webp`, `/sponsors/saudi-emerald.webp`, `/sponsors/turkiye-crimson.webp`, `/sponsors/arab-blue.webp` at `cur/app/admin/advertisers/advertiser-admin-client.tsx:71-74,86`; schema default `/sponsors/arab-blue.webp` at `cur/db/schema.ts:139`.
- **Regression mechanism:** Completing the sponsor→advertiser rename naturally includes renaming the `public/sponsors/` directory. The paths are string literals in JSX and a schema default, so nothing fails to compile — every banner simply 404s, including on rows already storing the old path. The schema default lives in `cur/db/schema.ts`, a file that is itself a deletion candidate (RR-49).
- **Required regression test:** `tests/public-config-consistency.test.mjs` (exists, not in `package.json:13`) — add `every referenced static asset exists`: enumerate `/`-rooted asset literals in `app/**` and `src/**` and assert each resolves under `public/`.
- **Recommended preservation strategy:** If the directory is renamed, add a redirect or copy for the old paths and migrate stored `bannerUrl` values in the same change.

### RR-64 — `audit_logs` versus `audit_events`

- **Capability at risk:** The commercial audit trail — every commercial admin action — and its searchability.
- **Old implementation:** `hist/old-tag/lib/content-schema` `audit_logs` (D1) was the single trail; the old reader was `hist/old-tag/app/api/sponsor-activity/route.ts:10-21`.
- **Current implementation:** four audit implementations coexist — `audit_logs` raw SQL (`cur/lib/content-schema.ts:53`, written by `cur/lib/services/audit.ts:13-31` and by `cur/app/api/ad-assets/route.ts:174,226`, `cur/app/api/admin/ads/approve/route.ts:54`, `cur/app/api/ads/request/route.ts:179`, `cur/app/api/advertisers/route.ts:104`), `audit_events` Drizzle (`cur/lib/security/audit.ts:7-119`, `cur/lib/db/schema.ts:61-73`), `cur/lib/audit/audit.service.ts:19` (zero importers) and `cur/lib/amrs/security.ts:139` (in-memory). The admin viewer reads **`audit_events`** (`cur/app/api/admin/audit/route.ts:86-87`), so the commercial trail written to `audit_logs` is unsearchable.
- **Regression mechanism:** Consolidating onto `audit_events` — the one the viewer reads — without migrating `audit_logs` rows discards the entire historical commercial trail, which is the evidence base for any billing dispute. Consolidating onto `audit_logs` loses the 40+ typed auth event names and the secret-field redaction in `cur/lib/security/audit.ts:7-119`. Deleting `cur/lib/audit/audit.service.ts` and the AMRS in-memory logger in the same sweep removes two more intent records.
- **Required regression test:** `tests/audit-log.test.mjs` (exists, not in `package.json:13`) — add `every audit writer is readable by the admin console`: enumerate the modules that write audit rows, assert each writes to the canonical store, and assert a commercial action (e.g. advertiser update) and an auth action both appear in `GET /api/admin/audit`; assert secret-like fields are redacted.
- **Recommended preservation strategy:** Point the viewer at both stores first (making nothing unsearchable), migrate `audit_logs` rows into the canonical store with their metadata blobs intact, then retire the losers.

### RR-65 — Two saved-search APIs and two dashboard pages

- **Capability at risk:** Saved searches and the (unbuilt) saved-search notification toggle.
- **Old implementation:** none found.
- **Current implementation:** `cur/app/api/saved-searches/route.ts:9` + `[id]` + `[id]/notify` versus `cur/app/api/properties/saved-searches/route.ts:9`; pages `cur/app/dashboard/saved-searches/page.tsx:26` versus `cur/app/dashboard/properties/saved-searches/page.tsx:15`. One table (`saved_searches`, `cur/lib/db/schemas/properties-schema.ts:102`, `filters jsonb`), no creator (RR-31).
- **Regression mechanism:** Deduping is right; the trap is that only the first family has the `[id]/notify` sub-route, which is the only expression of saved-search notification intent. Consolidating onto the `properties/`-prefixed family (the more logically placed one) deletes it, and with it the notification toggle's server side — leaving a UI toggle with no endpoint.
- **Required regression test:** `tests/properties-saved-searches.test.mjs` (new) — `one saved-search API with notification support`: assert exactly one route family exists, assert create/list/delete round-trip with a `filters` payload, and assert the notify toggle persists and is readable.
- **Recommended preservation strategy:** Keep the union (including `[id]/notify`) at whichever path wins; either build the matcher or hide the toggle and the "0 matching" counter explicitly (fragment 02, decision 8).

### RR-66 — Property card and form component consolidation

- **Capability at risk:** Status chips and the delete affordance on property cards; the offer-types-aware edit form.
- **Old implementation:** none found — all current-generation.
- **Current implementation:** cards — `cur/components/properties/PropertyCard.tsx` (status chips + delete) versus `cur/src/components/ui/LuxuryPropertyCard.tsx` (used by the dashboard, hardcoded SAR formatting at `:36`, and the source of the `design-tokens` z-index test failure). Forms — `cur/components/properties/PropertyForm.tsx`, `cur/components/properties/PropertyFormWithOffers.tsx`, `cur/components/properties/PropertyWizard.tsx`, plus the inline form in `cur/app/dashboard/properties/new/page.tsx`; live ones are `PropertyFormWithOffers` (edit) and the inline `new` page.
- **Regression mechanism:** The dashboard already uses `LuxuryPropertyCard`, so consolidating onto it is the obvious move — and it lacks the status chips and delete control that `PropertyCard` has, so owners lose the ability to see a listing's moderation state or remove it from the card. On the form side, consolidating onto the inline `new`-page form (the one users hit) loses the offer-types integration that only `PropertyFormWithOffers` has, and `PropertyWizard.tsx:76-81` carries hard-coded geo arrays that RR-37 needs to see before it is deleted.
- **Required regression test:** `tests/properties-ui-contract.test.mjs` (new) — `property card exposes status and delete; edit form exposes offer types`: assert the surviving card renders the moderation status and a delete control for the owner, and assert the surviving edit form renders the offer-type selector and persists it.
- **Recommended preservation strategy:** Union the affordances into the survivor before deleting; fix the `LuxuryPropertyCard` currency hardcoding as part of RR-36 and the raw `z-20` as part of RR-51's genuine-failure triage.

### RR-67 — Per-provider service radius under the 10 km cap

- **Capability at risk:** A provider's own service radius, and the platform's ability to vary the cap by country.
- **Old implementation:** `ref/akarpromax-services-current/lib/services/match-score.ts:90,98` — no cap at all.
- **Current implementation:** `cur/lib/services/match-score.ts:62` (`PLATFORM_MAX_SERVICE_RADIUS_KM = 10`), `:99-100` (a provider's radius can only reduce the ceiling), `:111` (hard reject, not a score penalty), `:93` (cross-city pairs rejected before distance is computed). The provider form still stores a 50 km default (`cur/lib/services/marketplace.ts:116,140`).
- **Regression mechanism:** The cap is a hard reject, so widening it later is easy — but a cleanup that removes the now-meaningless `service_radius_km` column or the provider-facing radius field (because it "can only reduce the ceiling", and its 50 km default is never honoured) destroys per-provider radius as a concept. Restoring it then requires re-collecting the data from every provider.
- **Required regression test:** `tests/services-matching.test.mjs` (see RR-56) — `radius policy is layered`: assert the platform cap is applied, assert a provider radius below the cap further restricts matches, and assert the stored provider radius survives a round-trip even while the cap is lower.
- **Recommended preservation strategy:** Keep the column and the provider field; make the cap an admin-configurable per-country policy (fragment 04, decision 1) rather than a module constant.

### RR-68 — `GET /api/professionals`

- **Capability at risk:** The public professionals directory query — approved-only, filtered by city and category, name search, ordered by rating.
- **Old implementation:** `ref/akarpromax-source/app/api/professionals/route.ts:6-22` (also in the staged index at `inv/stage_list.txt:208`); the `rank` param was read at `:11` and never used.
- **Current implementation:** deleted from the working tree. `cur/app/api/professionals/[id]/route.ts:17-21` survives for the detail view.
- **Regression mechanism:** The route is already gone; the risk is that the snapshot it survives in leaves the working set, or that the directory consolidation (RR-40) is scoped to `lib/amrs/directory.ts` only and nobody notices that a *second*, simpler professionals query existed with an ordering the AMRS directory does not implement (rating desc).
- **Required regression test:** `tests/amrs/amrs7-directory.test.ts` — add `professionals are listable with the documented filters`: assert a list endpoint exists returning approved providers filtered by city and category and searchable by business name, ordered by rating descending.
- **Recommended preservation strategy:** Fold the query into the AMRS directory as a professional-entity path rather than restoring a parallel route, and record `ref/akarpromax-source/app/api/professionals/route.ts:6-22` as the specification.

### RR-69 — `office_links` and `office_devices.legacy_link_id`

- **Capability at risk:** Every already-activated desktop installation's link record, and the web-side revoke path over it.
- **Old implementation:** `hist/old-tag/app/api/office-links/route.ts` — a working licence-key link record matching the desktop's activation model; the revoke path is at `cur/app/api/office-links/route.ts:51`.
- **Current implementation:** `cur/app/api/office-links/route.ts` still exists and is permission-gated, but `office_devices` is now the system of record and `cur/lib/integration/schema.ts:226` (`office_devices.legacy_link_id`) is **never populated**. There is no admin page for office links anywhere in `cur/app/admin/`.
- **Regression mechanism:** A live API with no admin UI and a superseded role is a retirement candidate. Retiring it strands every existing activation with no path into `office_devices` — the migration column exists precisely because someone intended to do this and did not. It also removes the only revoke surface the web has over the shipped desktop, which is already defeatable offline (`OfflineLicenseService`, `inv/dll_strings.txt:5534-5536`); removing the online half leaves no revocation at all.
- **Required regression test:** `tests/integrations-pairing.test.mjs` — add `legacy office links migrate into device records`: for an `office_links` row, assert a corresponding `office_devices` row exists with `legacy_link_id` populated, and assert revoking through either surface disables the credential.
- **Recommended preservation strategy:** Write the migration that populates `legacy_link_id` and build the admin console (fragment 10, decision 16) before retiring the API. Keep revocation authoritative on the web in whichever model RR-25 selects.

### RR-70 — Desktop-only commercial capabilities

- **Capability at risk:** Agency and client ledgers, treasury, tax-fee catalogue, the 56-column contract engine with templates/clauses/handover schedules, staff commissions with listing/buyer-agent split, co-broking revenue share, instalments, post-dated cheques, e-signature evidence, powers of attorney with expiry alerting, lead claiming, and chargeable maintenance.
- **Old implementation:** the desktop product — `cur/AkarApp_LIVE/AkarDB.sqlite` (55 tables: `AgencyLedger`, `ClientLedger`, `Treasury`, `TaxFeeTypes`, `Contracts`, `SaleContracts`, `StaffCommissions`, `CoBrokingRequests`, `RentInstallments`, `SaleInstallments`, `PropertyInstallments`, `PostDatedChecks`, `ESignatures`, `PowersOfAttorney`, `PublicLeads`, `LeadClaims`, `MaintenanceTickets`, `TechnicianDirectory`), with behaviour strings at `inv/dll_strings.txt:3829,3839` and elsewhere.
- **Current implementation:** no web counterpart. The web's contract surface is a stub returning plain text with a fabricated id and a `fileUrl` that is never written (`cur/lib/services/contracts/contract.service.ts:85,91`; `cur/app/api/contracts/route.ts:7`, POST only); `cur/docs/marketplace/COMMERCIAL_READINESS_SUMMARY.md:11` states there is no commissions engine; web e-signatures exist only for auctions (`cur/lib/db/schemas/auction-hardening-schema.ts`).
- **Regression mechanism:** These capabilities are preserved *on the desktop*, so the product rule appears satisfied. The risk is the reverse of deletion: (a) the desktop is the only holder, and the only machine-readable record of its model is `AkarDB.sqlite` plus a string dump — if `AkarApp_LIVE` is dropped from the repo as a binary artefact, 55 tables' worth of product design vanish with it, and there is no C# source anywhere; (b) the web contract *stub* will be either deleted (removing the placeholder that marks the gap) or built out naively against a model that ignores the desktop's, guaranteeing a second incompatible contract engine and no path to unify.
- **Required regression test:** `tests/desktop-parity-inventory.test.mjs` (new) — `the desktop capability inventory is present and enumerated`: assert `AkarApp_LIVE/AkarDB.sqlite` is present and reports the expected table count, and assert a checked-in inventory file lists every desktop-only table with a recorded web decision (parity / desktop-only / merged). The test fails if the artefact is removed or a table appears with no decision.
- **Recommended preservation strategy:** Treat `AkarApp_LIVE/AkarDB.sqlite`, `inv/dll_strings.txt` and `inv/dll_urls.txt` as protected specification artefacts (they are the only record — see RR-24). Take PO-9 in fragment 08 and fragment 10's decisions 17–25 before either deleting the contract stub or building on it.

---

## 6. Cross-references

- **Phase 0 baseline:** `cur/docs/release/PHASE-0-BASELINE.md` — defects N1–N28, P0-1…P0-8, P1-1…P1-12. Entries RR-17/RR-18 correspond to P0-2; RR-27 to P1-3; RR-31 to the §18 step-5 instruction; RR-51/RR-52 to P0-7 and §5/§6.
- **Parity matrix:** `out/docs/product-audit/FEATURE-PARITY-MATRIX.csv` — every RR entry above traces to at least one row; the 390 `regression_risk=High` rows are the population this register was distilled from, with the 273 that also carry `RESTORE`/`FIX REGRESSION` prioritised.
- **Contract matrix:** `out/docs/product-audit/WEB-OFFICE-CONTRACT-MATRIX.md` — R-1…R-13 repair guidance underpins RR-24, RR-25, RR-26 and RR-69.
- **Open product-owner decisions:** fragments 02 (11), 04 (12), 05 (12), 07 (12), 08 (PO-1…PO-11), 09, 10 (32). No Critical entry in this register can be closed before the decision it names is recorded.



---

# PART II — ROUND 2 RISKS (V1 PRODUCT ARCHAEOLOGY + DESKTOP C# SOURCE)

Added 19 Aug 2026. Part I above (RR-01…RR-70) is unchanged and still binding. Part II records the ways a
modernization can destroy a capability that **V1 shipped end-to-end** or that the **desktop currently
relies on**. The population these were distilled from: **204 capabilities at V1 depth L4/L5 that are
MISSING, BROKEN or REGRESSED today**, and the 70 source-verified desktop↔web contract rows.



## Round 2 — V1 Messaging & Notifications

Same shape as `out/docs/product-audit/REGRESSION-RISK-REGISTER.md`. IDs continue from that register's
namespace with a `V1-` prefix to avoid collision.

### V1-RR-01 — Deleting the V1 chat server deletes the only realtime messaging implementation in the product

- **Capability at risk:** Live message delivery, presence, typing indicators, and the socket room model — every realtime messaging capability either generation has ever shipped.
- **V1 implementation:** `v1/server/chat-server.ts:210-212,494-505,562-757` — Socket.IO server, JWT handshake auth, rooms `conv_*`/`user_*`/`oversight_*`, 13 client-facing events.
- **Current implementation:** none. `MSG-023` records that V2 messaging has **no realtime at all**: `cur/src/components/services/ThreadMessages.tsx:31-39` is a single fetch on mount, and the only `text/event-stream` in the tree (`cur/app/api/office/v1/stream/route.ts:44-51`) is inert.
- **Regression mechanism:** V1 is being retired as a generation. Because V2's messaging *works* (family B has a real inbox, real participants, real authorization), the natural reading is "V2 messaging is ahead of V1; V1's chat server is legacy". It is ahead on the thread model and behind on delivery. Retiring the V1 process without porting the transport converts a live chat product into a page-refresh product, and nothing in V2's test suite fails.
- **Required regression test:** A messaging realtime contract test: with two authenticated clients joined to the same thread, a send by client A must reach client B **without** client B issuing a new request, within a bounded interval; and a client that is *not* a participant must not receive the event.
- **Recommended preservation strategy:** Port the transport before retiring the process. Treat `chat-server.ts:562-757` as the specification for the event surface; re-implement it against V2's thread/participant model with the participant check added at every handler.

### V1-RR-02 — The moderation access log is lost because V2 has no slot for it

- **Capability at risk:** The immutable record of every third-party decryption of a private conversation — reason, moderator, conversation, timestamp.
- **V1 implementation:** `v1/server/chat-server.ts:82-88` (table), `:188-190` (insert), and three call sites: `:239` (admin REST read), `:286` (oversight request), `:736` (live oversight session). Browser at `:258-275`.
- **Current implementation:** **none.** `MSG-041` records that V2 has no admin messaging console, no message moderation and no access log; `frag/05` §"Product-owner decisions" question 11 records that admin read access is an open question.
- **Regression mechanism:** Unification maps V1 concepts onto V2 tables. `conversations`→`service_message_threads`, `messages`→`service_messages`, `conversation_participants`→`service_message_participants`, `message_read_receipts`→`is_read`. `moderation_access_logs` maps to **nothing**, so it falls off the mapping table silently. Its absence is invisible in testing because no user-facing feature depends on it — it is a compliance artefact whose value is realised only when someone asks "who read this conversation?".
- **Required regression test:** Assert that an admin/moderator read of a conversation the actor is not a participant of writes exactly one access-log row carrying actor, conversation, reason and timestamp; and assert the row cannot be updated or deleted through any application path.
- **Recommended preservation strategy:** Create the table in the unified schema **before** any messaging migration, and wire it into the authorization layer (every non-participant read), not into individual routes — so a future route cannot forget it.

### V1-RR-03 — Encryption at rest is dropped as "not in V2"

- **Capability at risk:** AES-256-GCM encryption of message bodies at rest.
- **V1 implementation:** `v1/server/encryption.ts:1-51`; key derivation `:19-21` (scrypt over `ENC_KEY` + `ENC_SALT`); write path `v1/server/chat-server.ts:647-648`; read paths `:243,514,552,733`.
- **Current implementation:** **none** — V2 stores message bodies in plaintext (`cur/lib/services-schema.ts:80-88`).
- **Regression mechanism:** Consolidating onto V2's storage means writing plaintext into `service_messages`. Nothing breaks, no test fails, and the user-visible product is identical — the only change is that the at-rest posture silently reverts. The change is also **hard to reverse later**: once plaintext rows exist, re-encrypting requires a migration over live data. Compounding it, V1's UI already tells users "رسائلك مشفرة وآمنة" (`v1/src/components/chat/ChatApp.tsx:39`), so the claim would migrate while the property did not.
- **Required regression test:** Assert that a stored text message body does not equal its plaintext, that it round-trips through decrypt, and that a tampered ciphertext fails to decrypt (GCM tag check, `encryption.ts:45-47`). Add a test asserting no UI string claims encryption unless the property holds.
- **Recommended preservation strategy:** Decide encryption posture **before** the storage migration (see decision 3 below), and extend coverage to the non-text bodies V1 leaves plaintext (`chat-server.ts:647` encrypts only `type==='text'`).

### V1-RR-04 — Fixing the V1 oversight authorization hole by deleting oversight

- **Capability at risk:** Moderated visibility into a private conversation — the product's only abuse-investigation tool.
- **V1 implementation:** `v1/server/chat-server.ts:724-742` (`request-oversight`), `:744-749` (`stop-oversight`), client `v1/src/contexts/ChatContext.tsx:189-197,245-254`, banner `v1/src/components/chat/ChatWindow.tsx:236-245`.
- **Current implementation:** none (`MSG-041`).
- **Regression mechanism:** `request-oversight` is a genuine P0 hole — it has **no role check** and returns any conversation's decrypted transcript to any authenticated socket. The cheapest remediation is deletion, and because V2 has no oversight feature, deleting it produces no parity gap *against V2*. It produces a parity gap against V1, which the product rule forbids: moderation capability would disappear with the defect.
- **Required regression test:** Assert that a non-admin caller requesting oversight is rejected; that an admin caller succeeds **and** writes an access-log row; and that the monitored participants receive the oversight-active signal (V1 emits it only to the requester, `chat-server.ts:737`).
- **Recommended preservation strategy:** Fix in place — add the role check, fan the activation signal into `conv_<id>`, and replace the self-approving moderation request (`:191-194`) with a real reviewer — rather than removing the feature.

### V1-RR-05 — The unified inbox idea is lost because its implementation is localStorage

- **Capability at risk:** One normalized, timestamp-sorted inbox merging conversations, appointments, quotes and property inquiries, with type filters, per-group counts, cross-type unread state and in-place actions.
- **V1 implementation:** `v1/src/components/UnifiedInbox.tsx:90-146` (merge), `:148-196` (filters/groups), `:46-64` (unread persistence), `:379-508` (in-place actions); page `v1/src/pages/InboxPage.tsx:12`.
- **Current implementation:** `MSG-016` — a messaging-only inbox at `cur/app/dashboard/services/inbox/page.tsx:24-111`.
- **Regression mechanism:** Every data source in `UnifiedInbox` is `localStorage` (`chat_conversations` at `:68` — a key the live `ChatContext` never writes; `akar_property_inquiries` at `:85`; `lib/artisanData` for appointments and quotes). An audit that classifies by implementation depth correctly marks this **L1 UI_ONLY**, and L1 modules are the first deleted in a consolidation. But `BRIEF2.md:81-83` records explicitly that **the idea is the asset** and the implementation is not. Deleting the component deletes the only specification of the merged-inbox information architecture.
- **Required regression test:** A specification-level test asserting the unified inbox surface accepts at least four item types, sorts strictly by timestamp descending across types, exposes per-type counts, and preserves unread state across a reload.
- **Recommended preservation strategy:** Port the *component* to real data sources before deleting it; keep the file under the deletion moratorium until the replacement renders the same four types.

### V1-RR-06 — Block, mute, chat settings and trash vanish with `localStorage`

- **Capability at risk:** Block list, per-conversation mute, chat appearance settings, deleted-message trash/restore, inbox unread state, and the "disable receiving messages" privacy toggle.
- **V1 implementation:** `akar_blocked` (`v1/src/contexts/ChatContext.tsx:75-77,310-326`), `akar_muted` (`:78-80,328-342`), `chat_trash_all` (`:81-86,261-308`), `akar_chat_font` (`v1/src/contexts/ChatSettingsContext.tsx:29,40`), `akar_inbox_unread` (`v1/src/components/UnifiedInbox.tsx:46-58`), `akar_messaging_registry` (`v1/src/pages/Profile.tsx:139-152`, read at `v1/src/components/chat/ChatWindow.tsx:42-53`).
- **Current implementation:** all MISSING in V2 (`MSG-030` mute, `MSG-031` block; no chat settings, no trash, no messaging privacy toggle).
- **Regression mechanism:** These are per-device browser state with no server representation. A migration that ports *tables* ports none of them, and a migration that ports *components* still finds no column to write to. Each is individually small and collectively they are the entire personal-control surface of V1 messaging. The `akar_messaging_registry` case is the sharpest: it is a **privacy** control that is currently enforced only on the would-be sender's own device (`ChatWindow.tsx:47-52`), so porting it faithfully would port a control that does not control anything.
- **Required regression test:** For each control, assert it survives a different device/session: block persists server-side and **suppresses delivery**; mute suppresses notification dispatch server-side; the privacy toggle rejects an unsolicited first message at the API, not in the UI.
- **Recommended preservation strategy:** Give each control a server column in the unified schema during the migration, not after. Treat "enforced on the sender's device" as MISSING, not PARTIAL, when scoping.

### V1-RR-07 — Consolidating five implementations picks a winner and drops each loser's half

- **Capability at risk:** The union of capabilities spread across V1 `chat-server.ts`, V1 `chat-server.cjs`, and V2 families A, B and C.
- **V1 implementation:** `v1/server/chat-server.ts` (encrypted, receipts, blocks, edit/delete, oversight, pagination) vs `v1/server/chat-server.cjs:15,60-119,291-411` (plaintext, third database `server/chat.sqlite`, no blocks, no edit/delete, no admin REST, `group_avatar` actually rendered at `:241`).
- **Current implementation:** families A/B/C per `MSG-052`, `MSG-053`, `MSG-056`; the asymmetry is already registered as RR-14/RR-15.
- **Regression mechanism:** This is RR-14/RR-15's "consolidation asymmetry" raised from two implementations to **five**. Each holds something no other has: `.cjs` renders group avatars; `.ts` has encryption and blocks; family A has the only attachment schema and per-participant `last_read_at`; family B has the only working authorization, validation and inbox; family C is the only compatibility URL. A pairwise migration decision made twice in sequence loses more than a single union pass would.
- **Required regression test:** One contract test carrying the **union** of: `frag/05`'s 21 preservation items, this fragment's 52-item list, and the five-way feature matrix above. It must be green against the survivor before any of the other four is deleted.
- **Recommended preservation strategy:** Write the union list first; classify every item as preserved / superseded / explicitly retired with an owner decision; delete nothing until every item is classified.

### V1-RR-08 — The tender expiry cron disappears with the chat process

- **Capability at risk:** Automatic closing of expired tenders and the paired notification to the tender owner **and every pending bidder**.
- **V1 implementation:** `v1/server/chat-server.ts:760-782` — a 5-minute `setInterval` plus an immediate run at startup, closing `service_tenders`, writing `tender_activity_logs`, and inserting notifications for the owner and every distinct pending bidder.
- **Current implementation:** none — V2 has no scheduler; `NOTIF-019` records `processOutbox` with zero callers.
- **Regression mechanism:** The cron lives inside the **chat** process and queries the **chat** SQLite file, while `service_tenders`, `tender_bids` and the Prisma `notifications` table live in the API database (`v1/server/api/.env:1`). It is therefore both misplaced and probably already failing silently — the whole body is wrapped in try/catch (`:778`). A reviewer retiring the chat server sees a chat file and deletes it; a reviewer auditing tenders never looks in a chat file. The capability is invisible from both directions.
- **Required regression test:** Assert that a tender whose `endsAt` has passed transitions to `CLOSED`, writes a `CLOSED_AUTO` activity row, and produces exactly one notification for the owner and one per distinct pending bidder.
- **Recommended preservation strategy:** Move the job to a real scheduler against the canonical database **before** the chat process is retired; record it in the tender domain's inventory so it is not owned solely by messaging.

### V1-RR-09 — Product APIs mounted on the chat port are deleted with it

- **Capability at risk:** Property payment options (read + upsert), the mortgage / flexible / fixed installment calculators with amortization schedules, the listing-type / rent-option / sale-option / offer-type / filter-option lookups, and the `properties/expanded` pricing model.
- **V1 implementation:** `v1/server/chat-server.ts:294-489` — 11 endpoints that have nothing to do with messaging, including `POST /api/calculator/mortgage` (`:343-354`) which dynamically imports `server/utils/installment-calculator.ts`.
- **Current implementation:** those capabilities belong to the properties/commercial domains in V2 and are audited there, not here.
- **Regression mechanism:** "Delete the V1 chat server" is scoped as a messaging decision and reviewed by messaging owners. Nobody reviewing messaging is looking for an amortization schedule generator. The `property_expanded` table (`:124-132`, 21 pricing columns covering daily/weekly/monthly/yearly/flexible rent and cash/instalment/flexible/cooperative sale) is created only by this file.
- **Required regression test:** Not a messaging test — an inventory assertion that every route currently served on `CHAT_PORT` has a named owner outside messaging before the process is retired.
- **Recommended preservation strategy:** Split the file first: move the 11 non-messaging endpoints and the two non-messaging tables to their domain owners, then treat what remains as the messaging decision.

### V1-RR-10 — Read receipts collapse into a boolean during the migration

- **Capability at risk:** Per-user, per-message read state — and with it correct multi-party unread counts and ✓/✓✓ semantics.
- **V1 implementation:** `v1/server/chat-server.ts:65-71` (`message_read_receipts`, unique `(message_id,user_id)`), `:179-185` (unread derivation), `:617-619,668-673` (writers), `:529-533` (aggregation).
- **Current implementation:** `MSG-026` — a boolean `is_read`/`read_at` on the message row, auto-set on GET (`cur/app/api/service-messages/threads/[threadType]/[threadId]/route.ts:26`), plus family A's unused per-participant `last_read_at` (`cur/lib/db/schemas/messages-schema.ts:21`).
- **Regression mechanism:** Family B is de facto canonical, so the migration path of least resistance maps V1 receipts onto `is_read`. That mapping is lossy in exactly the case that matters: in a group or a multi-bidder thread, one reader flips the flag for everyone. `frag/05` §(b) already documents the security consequence in the leaking `request` context — ProviderB reading the room destroys the customer's unread state for ProviderA's messages. Migrating V1's model *down* to a boolean makes that behaviour universal rather than context-specific.
- **Required regression test:** Given a 3-participant thread, assert that marking read for P1 leaves P2's and P3's unread counts unchanged, and that the sender's ✓✓ reflects a defined policy (all-read vs any-read) rather than an accident of the storage shape. Note that V1's own aggregation is any-read (`chat-server.ts:518`) and must be decided, not inherited.
- **Recommended preservation strategy:** Adopt V1's receipt table plus family A's `last_read_at` watermark as the unified read model; treat `is_read` as a derived value, never as storage.

---


## Round 2 — V1 Advertising

1. **Hero playlist (High).** V1's hero is a playlist of all active slides of a placement (`PageHeroSlideshow.tsx:124-153`);
   V2 deliberately returns one creative (`cur/lib/ads/engine.ts:536-561`). Migrating V1 hero inventory onto V2 as-is
   silently reduces a sold 5-slide hero to a 1-slide hero. Must be resolved before any hero data migration.
2. **Sponsor tier (High).** Tier drives both ranking and visual prominence in V1 and is inert in V2 (ADS-010). Importing
   V1 campaigns without re-implementing tier turns paid platinum placements into standard ones.
3. **Geo semantics flip (High).** V1 ORs geo predicates (broaden), V2 ANDs them (narrow). The same campaign row imported
   unchanged will serve to a *different, smaller* audience in V2 — a silent delivery regression for every geo-targeted V1 ad.
4. **Macro-region collapse (High).** V1 `targetRegion` values (`gcc`, `levant`, …) have no home in V2's `region_ids`
   (administrative). A naive column mapping produces campaigns targeting a non-existent region id → zero fill.
5. **Village grain loss (Med).** `targetVillage` has no V2 equivalent; migration drops it silently.
6. **Office channel dark (High).** V1's desktop ads work only through `desktopZone`, which no admin writes; V2's office
   API works but no client calls it. A cutover that keeps neither path wired leaves the Office channel with zero ads and
   nobody noticing, because both sides fail silently (`desktop.ts:183` returns `null`, `DesktopAdService.cs:87-90`
   swallows non-2xx).
7. **News ticker (High).** V1's ticker is live in the global layout with an auto-generation job; V2's promotional ticker
   admin route does not exist (ADS-077). Cutting over without restoring the admin leaves the ticker frozen or empty.
8. **Advertiser funnel dead on arrival (High).** `/advertise` is V1's only self-serve intake and V2's equivalent 404s
   (ADS-088). If V1 is retired first, inbound ad demand has no landing point.
9. **Counter migration (Med).** V1 stores lifetime `view_count`/`click_count` on the row; V2 keeps events plus daily
   rollups. Importing lifetime counters as events (or not importing them) will distort caps that are enforced in V2 but
   were never enforced in V1 — a V1 ad at 40 000 views against a 5 000 `maxViews` cap will be dead on arrival.
10. **Aspect-ratio governance (Med).** Without V1's ratio bands, migrated and new creatives will break the V2 layouts that
    assume `aspectRatio` metadata (`cur/src/constants/advertising.ts:177-194`) with no enforcement.
11. **Revenue reporting (Med).** V1's only revenue figure is Σ`price` in the admin. V2 stores `price` and never reports
    it. Retiring the V1 console removes the only place ad revenue is visible.
12. **Base64 creatives (Med).** V1 rows can carry multi-MB data-URL images in `image_url` (`AdminAds.tsx:1189`). Any
    migration must externalise these to the asset store, or row sizes and match payloads explode.
13. **API allow-list drift (High, pre-existing).** `AD_FIELDS` accepts 8 non-existent columns (`ads.ts:66-76`); creates
    carrying them 500. Any archaeology that assumes the V1 admin "just works" for every field is wrong — verify per field.
14. **Two V2 engines (High, pre-existing).** Any V1 data landed in `ad_campaigns` will be read by whichever engine owns
    the table; the other breaks (ADS-084). Merge the engines **before** migrating V1 inventory.

---


## Round 2 — V1 Identity, Authorization, Moderators, Rank, Membership

| # | Risk | Trigger | Severity | Mitigation |
|---|---|---|---|---|
| 1 | **Restoring V1's account types re-imports its authorization model.** The three-type registration wizard, the office/company flow and the account switcher are all worth restoring, but each is entangled with `localStorage`-resident state | any lift-and-shift of `Register.tsx` / `CompanyContext.tsx` | **High** | port the *screens and the field sets*, never the persistence; org state must be server-side from the first commit |
| 2 | **Wiring a rank through the permission path.** No rank does anything today in either tree, so the first team to make one "do something" will reach for `hasPermission` because it is the only mechanism that exists | first implementation of `RANK-012…018` | **High** | Article 7 + a test asserting rank changes produce no permission delta |
| 3 | **`hasScopedPermission` returning `true` is invisible.** It compiles, type-checks and passes every existing test; the defect only appears when a scoped grant is expected to deny | any use of `moderator_scopes` in production | **High** | make the scope branch throw until implemented; add a denial test per scope dimension |
| 4 | **`lib/roles/permissions.ts` is an allow-all table one import away.** Every leaf is `true`; `hasPermission(PERMISSIONS, …)` returns `true` for everything | a developer imports the wrong `PERMISSIONS` | **High** | delete the module or rename it `PERMISSION_SHAPE` with no `hasPermission` export |
| 5 | **V1's public-writable `plans`/`coupons`/`licenses` endpoints are attractive to copy** — they are short, clean, idiomatic Express, and wrong | any port of `plans.ts`/`coupons.ts`/`licenses.ts` | **High** | port with the guard added, never as-is; add a contract test asserting 403 for a non-admin |
| 6 | **The fake payment endpoints look implemented.** `payments.ts` reads as a finished integration; only the absence of a gateway SDK import reveals it | any "the payment code already exists" assumption | **High** | delete `payments.ts` rather than adapt it; treat payments as greenfield |
| 7 | **The checked-in admin JWT survives a partial migration.** Its secret is the *default* of `chat-server.cjs`; deleting `DevLogin.tsx` alone does not close it | migrating the chat server without setting `JWT_SECRET` | **High** | rotate all secrets, remove all fallback literals, fail fast on every process |
| 8 | **Restoring `ModeratorPanel` without scope re-creates a global moderator.** It is a working screen backed by correctly-guarded endpoints, so it will be restored early — and `requireRole("admin","moderator")` is unscoped | routing `ModeratorPanel` | **Med** | restore only after Article 5 exists |
| 9 | **The `isVerified` overload propagates.** Any migration that maps V1 `isVerified` onto V2 `verification_records` must decide which of the two meanings each row carries — and V1 does not record which | data migration | **Med** | migrate as `email` type only; require re-submission for identity verification |
| 10 | **Phantom fields become phantom columns.** `isDistinguished` and `approvedPostsCount` appear in V1's `User` TypeScript interface, so a schema generated from it will create columns nothing ever writes | code-first schema generation | **Med** | derive schema from `schema.prisma`, never from `AuthContext.tsx:32-69` |
| 11 | **Two V2 audit tables plus V1's one.** Three audit streams with different actor keys (uuid, e-mail, int) | consolidation | **Med** | one stream keyed by `identity_id`; backfill with a documented mapping |
| 12 | **The desktop's pipe-delimited permission string is the only working scope model — and it is a string.** `branch:1:المكتب الرئيسي` embeds a display name in an authorization token | reusing the desktop format on the web | **Med** | model it relationally on the web; keep the string only as a desktop wire format |
| 13 | **`Partner` credentials are a live second login surface with no login route.** Adding one later without unifying identity re-forks the key space | partner-portal work | **Med** | fold `Partner` into `identities` + an org membership before building the portal |
| 14 | **V1's `POST /api/subscriptions` pattern (body-supplied `userId`) recurs in four licence handlers.** Copying any one of them re-introduces the hole | licence/subscription port | **High** | one handler, session-derived subject, contract-tested |
| 15 | **Removing the DEV mock layer will surface every latent integration bug at once.** 1,110 lines currently hide them | first honest V1 run | **Med** | expect a large defect wave; treat V1 depth ratings in this fragment (not the archaeology CSV) as the baseline |

---


## Round 2 — V1 Properties, Leads, Organizations, Marketers, Suppliers, Partners

1. **Losing the anti-manipulation subsystem (highest).** `SuspiciousRelist` + `SaleProof` + the 5-minute
   cron (`v1/server/api/src/routes/relist-monitoring.ts:38-462`, `v1/server/api/src/index.ts:174-176`) is
   the single most production-like thing in this entire V1 scope, and V2 has nothing comparable. If it is
   not carried across, a documented market-integrity control disappears silently.
2. **Losing real reputation signals.** V1 computes office scores from actual auction outcomes
   (`auction-intelligence.ts:41-66`); V2's far more elegant reputation engine is fed by hand-posted numbers
   (AMRS-041). Porting the V2 engine without the V1 signal source produces a prettier version of nothing.
3. **Losing the only working alert delivery.** `notifyCityMatch` (`notification-sender.ts:114-164`) is the
   one V1 path that actually reaches a user's inbox on new supply. V2's saved-search alerts are declared and
   never evaluated (PROP-052). Replacing "coarse but delivered" with "precise but never sent" is a
   regression users will feel immediately.
4. **Losing property image upload.** V1 has a working multipart upload with a MIME whitelist
   (`properties.ts:12-39`); V2 accepts a URL string (PROP-027). Any migration that ships V2's form without
   an upload endpoint regresses the single most important listing-creation step.
5. **Losing the finance toolkit.** Mortgage/flexible/fixed calculators plus the server amortisation engine
   (`installment-calculator.ts:36-112`) have no V2 counterpart. In GCC markets instalment terms are the
   deal, not a nice-to-have.
6. **Losing the regulatory ad-licence field twice.** V1 collects `adLicenseNumber`
   (`SubmitProperty.tsx:39`) and drops it (no column, not in the insert); V2 has no such field at all.
   Rebuilding from either side alone loses a field that is legally required to advertise property in Saudi
   Arabia and the UAE.
7. **Carrying the transport bugs forward.** The `/api/api/...` double prefix (`api.ts:1189`) and the
   `.then(r => r.json())` double parse (`api.ts:1223`, 29 call sites) make ~14 V1 pages look "implemented"
   in a code review while being 100% non-functional at runtime. Any audit that reads V1 pages without
   checking the transport will over-credit V1 depth — and any port that copies the call sites reproduces the
   failure.
8. **Mistaking dead mocks for a backend.** `v1/src/mocks/handlers.ts` (1,267 lines) is never registered
   (`v1/src/main.tsx:59-72`), and the inline mocks in `api.ts` are compiled out of production
   (`api.ts:76`). Emperor, Matchmaking, marketer, partner and expanded-listing "implementations" live only
   there.
9. **Two office concepts merging badly.** Prisma `Office` (owns listings and auctions) and localStorage
   `Company` (owns nothing but has supervisors) must be reconciled into V2's `organizations` without
   dropping the supervisor/post-as-company UX (`CompanyContext.tsx:14,73-88`).
10. **Security items that must not survive the port.** `GET /api/partners` returns `passwordHash`
    (`other.ts:48-52`); `GET /inquiries/all` is readable by any authenticated user (`inquiries.ts:7`);
    the offer PATCH is a mass-assignment with no owner check (`property-requests.ts:88-99`);
    `POST /analytics/track` trusts a body-supplied `userId` (`analytics.ts:9-15`).
11. **Denormalised counters with no writer.** `Office.propertyCount`/`rating` (`schema.prisma:446-447`) and
    `Property.views` (only incremented on detail GET) will silently drift if copied without their
    recompute jobs — V2 already has the same class of defect at PROP-047.
12. **Elite Leads / Matchmaking marketed as AI.** `AdminMatchmaking.tsx:61,67` says "AI-powered". Nothing
    in `v1/server/` computes anything. Restoring these screens without building the engine would carry an
    unsupported claim into the new product.

---


## Round 2 — V1 Services, Artisans, Urgent Dispatch, Tenders, Auctions

| # | Risk | Evidence | Severity |
|---|---|---|---|
| R1 | **Adopting V1's dispatch UI without building its data model reproduces V1's failure exactly.** Every discipline, availability and timing field the UI reads is absent from the V1 schema. | `TechnicianInbox.tsx:24-57` vs `schema.prisma:790-822` | High |
| R2 | **Phone-reveal endpoint has no authorization.** If ported as-is, any authenticated user can enumerate requester phone numbers. | `service-hub.ts:138-146` | High |
| R3 | **Sealed tender bids are only sealed in the browser.** The detail API returns every bid with artisan identity; a competitor reads them from the network tab. Must be fixed *before* the model is reused for V2 offers. | `tenders.ts:118-121` vs `TenderDetail.tsx:67-69` | High |
| R4 | **V1 service-hub admin endpoints lack `requireRole`.** Blacklist and review-deletion are `requireAuth` only. | `service-hub.ts:257,267,276,287` | High |
| R5 | **Route-ordering shadowing.** `/auctions/my`, `/auctions/my-bids`, `/relist-monitoring/my` are unreachable behind `/:id`. Any port that copies the route order inherits three dead dashboards. | `auctions.ts:74,368,382`; `relist-monitoring.ts:139,153` | High |
| R6 | **Ban cascade is irreversible.** Rejecting a proof (or missing a deadline) bans the office, bans the previous winner and mass-cancels every live auction, with **no unban path** in the API. | `relist-monitoring.ts:280-318,424-445` | High |
| R7 | **False-positive relist flags suspend live auctions instantly.** A legitimate price correction >15 % within 30 days suspends the auction before any human looks. | `relist-monitoring.ts:60-91` | Med |
| R8 | **Rating/feedback payload contracts differ between V1 client and V1 server**; porting either half alone silently drops the three feedback axes or 400s every rating. | `ServiceHub.tsx:150,234` vs `service-hub.ts:198,244` | High |
| R9 | **Three parallel provider/review stores in V1** (`ServiceHubProfile`, `localStorage akar_artisans`, `akar_artisan_reviews`). Migrating "V1 provider data" means choosing one and accepting loss. | `ServiceHub.tsx:365-386`, `lib/artisanData.ts:1,131` | High |
| R10 | **`initAuctionSocket` is never called**; a port that assumes realtime works will ship a silent no-op. | `auction-socket.ts:6` (zero callers) | Med |
| R11 | **`logPriceChange` is never called**; the price-history chart ships empty. | `auction-intelligence.ts:290` | Med |
| R12 | **`auction-contract.ts` imports `pdf-lib` incorrectly** (`import { pdfLib }`) and would throw at module load if ever wired. Do not port the file; port the *layout spec*. | `auction-contract.ts:1` | Med |
| R13 | **In-process `setInterval` cron does not survive multi-instance deployment** — five jobs would run once per replica (double bans, double closures). | `server/api/src/index.ts:167-192` | High |
| R14 | **Office rating penalises complaints at −10 each with no cap on report volume**, so a report-bombing campaign can zero any office's score. `responseSpeed` is a hard-coded 0.8 constant, making 20 % of the score fictional. | `auction-intelligence.ts:23,26,33-35` | Med |
| R15 | **`REPEAT_BIDDER_PAIR` warning fires on any bidder active in 3 auctions of the same office** — in a small market this flags loyal buyers as colluders. | `auction-intelligence.ts:154-165` | Med |
| R16 | **Anti-sniping is unconditional**: any bid inside 5 minutes extends by 5 minutes with no cap, so an auction can be extended indefinitely. V2's 72-hour guarantee (AUC-026/027) would be violated if merged naively. | `auctions.ts:226-228` | Med |
| R17 | **Self-bid check is partially broken** (office id compared to user id), so an office *user* who is not the creator can bid on their own office's auction. | `auctions.ts:203` | Med |
| R18 | Adopting V1's tier ladder alongside V2's `featured`/`rank` creates a second merchandising axis; without a mapping rule the two will contradict each other in listings. | `ServiceHub.tsx:94-106` vs SVC-021 | Med |
| R19 | **Auction settings GET is unguarded** — any authenticated user can read any office's increments and duration ceilings. | `auctions.ts:558` | Med |
| R20 | V1's `Category` model is keyed `(key,type,section)` while V2 uses a `parent_id` tree; a lossy import will flatten V1's four service-hub sections into unlabelled groups. | `schema.prisma:1299` vs SVC-005 | Low |

---


## Round 2 — V1 Acquisition, Smart Landing, Support, SEO, Lookups, Knowledge, Licensing, i18n

Ordered by product impact.

1. **The founder funnel creates no account (P0, High).** `/join` is the conversion point of three funnels
   and `POST /auth/quick-register` is `res.json({success:true})` (`auth.ts:488-490`). Any migration that
   copies V1's funnel design without rebuilding this handler ships a signup page that reports success and
   creates nothing. `V1-ACQ-002/003`.
2. **Legal consent is displayed but never stored (P0, High).** The Integrity Pledge and Office Charter are
   the platform's stated basis for banning accounts and suspending desktop licences
   (`JoinFounders.tsx:337-338`, `LandingOffices.tsx:175-176`), and acceptance lives only in React state
   (`:72`). There is no record that any user ever agreed. `V1-ACQ-004/005`, `V1-ACQ-020`.
3. **Commercial claims contradict the code (P0, High).** 3 months vs 30 days vs 90 days vs 14 days for the
   trial; "no commissions" on the provider funnel; "Windows, Mac and Linux" for a WPF app; "Free Forever"
   founder membership. Each is a public promise with no enforcing mechanism. `V1-ACQ-012/016/022/023`,
   `V1-LIC-005`.
4. **Every licence purchase degrades to a 30-day trial (P0, High).** `BuyLicense` sends six fields the
   server does not read; `licenses.ts:18-36` defaults `type:"trial", durationDays:30`. Buyer identity and
   amount paid are discarded. If the V2 licence model is built from observed V1 rows, it will be built from
   corrupt data. `V1-LIC-010`.
5. **Anonymous licence minting and an active-key leak (P0, High).** `POST /api/desktop/free-trial-license`
   is unauthenticated and writes a licence with no `userId` (`desktop.ts:277-288`); `GET /api/software/
   products` returns every active `SoftwareLicense` row to anonymous callers (`other.ts:53-60`). Both must
   be closed before any V1 licensing behaviour is carried forward. `V1-LIC-002/004`.
6. **Every contact-form and free-resource submission is destroyed while reporting success (P0, High).**
   `Contact.tsx:21-29` and `POST /api/free-resources` → `other.ts:118` both toast success and persist
   nothing. There is no error log, so the loss is invisible in production. `V1-ACQ-028`, `V1-KNOW-019`.
7. **Admin-edited legal text is never shown (P0, High).** `AdminContent` holds the refund window, governing
   law and privacy commitments; `About`/`Terms`/`Privacy` render hardcoded copy
   (`grep akar_static_content` → no consumers). An operator who updates the refund policy in the console
   will believe it is live. `V1-KNOW-016/017`.
8. **The catch-all router silently succeeds (P0, High).** `other.ts` returns `[]` for unmatched GETs and
   `{success:true}` for unmatched POSTs and every DELETE. It is the single root cause of `V1-ADMIN-004/005`,
   `V1-KNOW-019/020` and `V1-LIC-002`. Any port of V1 server behaviour must delete this pattern rather than
   translate it. `V1-ADMIN-018`.
9. **Three of five Saudi ad keywords write an invalid governorate (P0, High).** `?city=jeddah|mecca|dammam`
   set governorates that exist in no data file, so the paid-traffic landing experience degrades to an empty
   city list — and `LocationContext.tsx:21` shows the team already knew about this class of bug.
   `V1-LAND-009`; sibling `V1-LAND-024` (Eastern Province, Abu Dhabi).
10. **Campaign attribution cannot be reconstructed (P0, High).** UTM, source, city, device and session are
    posted and discarded on every visit (`analytics.ts:6-19`). There is no historical acquisition data to
    migrate, and no way to prove which funnel worked. `V1-LAND-018/021`.
11. **Five admin consoles are browser-local (P1, High).** Tickets, SEO, Lookups, Reports and Settings each
    store operational state in `localStorage`. Two operators see two different worlds; a browser reset is a
    data loss event; nothing is auditable. If any of these is declared "already built", the rebuild will be
    under-scoped. `V1-SUP-001`, `V1-SEO-001`, `V1-LKP-001`, `V1-ADMIN-006/008`.
12. **Governance switches that enforce nothing (P0, High).** `maintenanceMode`, `registrationEnabled` and
    `emailVerificationRequired` are toggles an operator will reasonably believe work. `V1-ADMIN-009`.
13. **Ban enforcement reads a user-writable store (P1, High).** `WriteBlog`, `FreeResources` and
    `AdminFreeResources` all gate on `localStorage.akar_users`. `V1-KNOW-025`.
14. **Six parallel city vocabularies (P0, High).** Any consolidation that picks one file will silently drop
    cities present only in another; `citiesData.json` and `locationsData.json` already differ by 6
    governorates and 28 cities, and `citiesData.json` is keyed without a country qualifier.
    `V1-LKP-010/015/016`.
15. **5,192 inline translation ternaries (P0, High).** Migrating V1 screens into V2's DB-backed i18n means
    extracting copy from 167 components. Any estimate that assumes the 720-key bundle is the source of
    truth is wrong by more than an order of magnitude. `V1-I18N-003`.
16. **Rich-text posts display raw HTML to readers (P1, High).** Authored via `RichTextEditor`, rendered as
    escaped text (`BlogPostDetail.tsx:197-198`). Content migrated as-is will need HTML sanitisation and a
    rendering decision, not a straight copy. `V1-KNOW-011`.
17. **Dead-but-complete components will be mistaken for missing features (P2, Med).** `WelcomeBanner`,
    `PageHeroBanner`, `InstallPWA` and `Pricing.tsx` are finished and imported by nothing; `readStored()`
    and 82 unclassified frontend modules sit alongside them. Absence from the running app is not evidence
    of absence from the product. `V1-LAND-027/029`, `V1-NOTIF2-002`, `V1-ACQ-030`, `V1-LAND-025`.
18. **`public/` is unstaged (P1, High).** Seven artefacts — `.htaccess`, `manifest.json`, `robots.txt`,
    `sitemap.xml`, `sw.js`, `offline.html`, `mockServiceWorker.js` — cannot be verified; four are required
    by staged source. No parity claim about hosting, crawling, offline behaviour or push can be closed
    until they are supplied. `V1-SEO-019`, `V1-NOTIF2-001/003`.
19. **`AdminCategories` cannot reach the one healthy taxonomy API (P0, High).** Five fetch-style calls
    against `apiRequest(method, path, …)`. The API is good; only the client is wrong — an easy fix that is
    easy to miss because the page looks finished. `V1-LKP-013`.
20. **Four duplicate licence-redemption endpoints, all unauthenticated with a body-supplied `userId`
    (P1, High).** Consolidation must happen before, not after, licences carry commercial value.
    `V1-LIC-014/015`.

---


## Round 2 — V1 Engineering platform, CAD/BIM, Land/OCR, MapMyDeed

| Risk | Detail | Severity |
|---|---|---|
| Silent loss of the entire engineering platform | 40 modules and ~18 800 lines exist only in V1 and have **no V2 counterpart and no V2 library basis** (no `three`, `jszip`, `jspdf`, `pdf-lib`, `dxf-parser`). If V2 ships without them, the product's most differentiated capability disappears with no trace in the registry. | **High** |
| False-persistence UX | `ContractGenerator` reports "saved" when nothing was written (V1-ENG-024). Any V2 port that copies this pattern will lose user work. | **High** |
| Silent truncation | `MAX_POINTS = 20` per coordinate table (V1-FML-012) and the 3-page PDF OCR cap (V1-FML-021) discard data without an error — only a footnote. Porting the parser without lifting the caps re-imports the defect. | **High** |
| Deed-parsing regressions already live in V2 | Arabic point labels (V1-FML-005), all-patterns accumulation (V1-FML-006), header-less UTM triples (V1-FML-008), deskew (V1-FML-016) all worked in V1 and do not work in V2. These are the highest-yield restorations. | **High** |
| Formula trust | Users are shown BOQ quantities, cost totals, fire ratings and seismic isolator counts with no disclaimer beyond one line in the ZIP PDF footer. If any formula is wrong, the platform generates confidently wrong engineering advice. | **High** |
| Hard-coded jurisdiction | 15 % KSA VAT (`PriceManager.tsx:44`), SAR default currency (`UserPreferences.ts:57`), UTM zone clamp 35–40 (`landAnalysisService.ts:121`), qibla table for 10 countries, PET table for 10 countries. Any market outside these silently gets wrong numbers. | **High** |
| Auth asymmetry | V1 gates `/arch-ai` and Map My Land behind auth; V2's tools are public. Porting engines into a public V2 tools page changes the monetisation and abuse surface. | Med |
| localStorage-only preferences | Layer profiles, price overrides and material brands are device-scoped (V1-ENG-019/020, V1-CAD-005). A user who switches machines loses their entire rate book. | Med |
| Orphaned-but-valuable code | `dxfExportService`, `auditService`, the declared-but-unused `pdf-lib` / `dxf-parser` / `html2canvas` dependencies indicate abandoned branches whose intended capability is unrecorded elsewhere. | Med |

---