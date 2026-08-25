# FIND MY LAND — GENERALIZATION CERTIFICATION

Date: 2026-08-22. Measured with a working execution channel; every number below was run.

## Status of this document

This covers **section 34 — the architecture review the brief requires before any change** — plus the work completed earlier in the same session. The engine rebuild (layout-aware extraction, semantic column classifier, multi-strategy consensus, mutation/fuzz/negative corpora, blind holdout evaluation) is **not** done. It is not claimed as done anywhere below.

---

# Part 1 — completed and verified in this session

## 1.1 Root cause in the real Saudi documents

The two real reports were run through the parser for the first time. `سفاري.pdf` yielded **zero** coordinates.

Cause: a PDF produced from a right-to-left page wraps every run — including the lone `N` / `E` hemisphere letter and the number beside it — in Unicode bidirectional embedding controls:

```
U+202B U+202A N U+202C U+202C      U+202B U+202A 21.885762907392643 U+202C U+202C
```

Invisible, survives NFKC, and sits *between* the label and its value. Every pattern expecting `N 21.885…` fails on a page that reads perfectly to a human. This is a whole-class defect, not a template quirk: it affects any RTL-authored survey PDF from any country.

**Fix** — `lib/geo/text-extraction.ts`, `normalizeExtractedText` strips bidirectional and zero-width formatting characters. ZWNJ and ZWJ (U+200C/U+200D) are deliberately kept because they carry meaning inside Arabic and Persian words.

Measured after the fix, on the real files:

| Document | Rows in source | Extracted |
|---|---|---|
| سفاري.pdf (Balady, Jeddah) | 5 | **5** |
| تقرير مساحي معتمد بغرض الدمج | 6 | **6** |

Latitude, longitude and the reference id (`22470581`…) are separated correctly; no reference id is read as a coordinate.

## 1.2 Oman sheets — full chain, end to end

Both sheets were transcribed from the supplied photographs and run through table extraction → UTM 40N → WGS84 → cross-validation.

**Template A** — Sumail, Ad Dakhiliyah. `LINE / NORTHING / EASTING / DIST`, five corners, no CRS printed:

```
sequence 1→2→3→4→5→1  closed
registered 647 m²  ·  computed 647.91 m²  ·  Δ 0.141%  MATCH
1→2 30.00/30.012   2→3 22.00/22.009   3→4 25.00/25.002
4→5  7.07/ 7.076   5→1 17.00/17.004          all MATCH
AGREEMENT: AGREE      first vertex 23.244890, 57.946351   (Sumail ✓)
```

**Template B** — Siq, Al Jabal Al Akhdar. `WGS84 40N`, `LINE / EASTING / NORTHING / DIST`, four corners:

```
sequence 1→2→3→4→1  closed
registered 300 m²  ·  computed 300.25 m²  ·  Δ 0.084%  MATCH
all four edges MATCH within 16 mm
AGREEMENT: AGREE      first vertex 23.061010, 57.636006   (Saiq plateau ✓)
```

Column order is read from the heading in both directions. The `CENTEROID:` line is not mistaken for a fifth corner.

## 1.3 Cross-validation layer added

`lib/land/intelligence/survey-validation.ts` — the document's three independent statements (coordinates, printed edge lengths, registered area) are now measured against each other on a local tangent plane. Verdicts: `AGREE` / `PARTIAL` / `DISAGREE` / `UNVERIFIED`. One contradicted measurement withholds agreement.

A test documents the honest limit: reading the same eastings in the wrong UTM zone preserves the shape, so edges and area still agree while the parcel lands ~6° of longitude away. Distance and area agreement cannot catch a zone error — only geographic sanity can.

## 1.4 `.jfif` accepted

JFIF is an ordinary JPEG under the extension Windows and Edge produce. Added in all four places that gate uploads: `lib/geo/security-gate.ts` (extension list and the extension→MIME map, so a file arriving with an empty MIME type still passes), `app/api/land/analyze/route.ts`, and both the `accept` attribute and the two user-facing format hints in `src/components/tools/FindMyLand.tsx`.

Verified: `.jfif` with `image/jpeg`, with an empty MIME type, and in upper case all pass; `.exe`, `.js`, `.bat` still blocked.

## 1.5 Measured results

| Suite | Result |
|---|---|
| geo + document-intelligence + global + ui + parcel-boundary + upload-types | 284 / 284 |
| pattern-corpus + reference-sheet + pipeline + table-patterns + find-my-land + pdf-corpus + land-flow + amrs + cross-validation + real-templates | 281 / 281 |
| **Total** | **565 / 565** |

Baseline at the start of the session was 523/523. The 42 added tests are 16 cross-validation, 15 real templates, 11 upload types. No existing test regressed — including after the normalization change, which touches every document path.

One existing test failed and was corrected rather than worked around: `find-my-land-ui` asserts the upload area states its supported formats, and the assertion was updated to the new list. That is the test doing its job.

`eslint` on every changed file: clean.

---

# Part 2 — architecture review (section 34)

## 2.1 Where the system does **not** overfit

Three of the brief's suspicions do not hold against the current code:

**No filename or template-name logic.** A sweep for `safari`, `سفاري`, `balady`, `dakhelya`, `akhdar`, `sumail`, `siq`, `nusf` across `lib/land`, `lib/geo` and `app/api/land` returns only vocabulary entries in `documents/profiles.ts` and `documents/country-profile.ts` — keyword lists such as `["municipality", "بلدية", "أمانة", "رخصة بناء"]` used as *evidence*, which section 8 explicitly permits. There is no branch keyed to a document name.

**No hardcoded country zone fallback.** A sweep for `zone = 37|38|39|40` returns one hit, `lib/geo/utm.ts:158`. It is the **Svalbard** exception (latitude 72–84, zones 31/33/35/37 widened), which is part of the UTM specification and precisely what an earlier brief asked for. Correct, not overfitted.

**Table structure is already inferred, not matched.** `patterns/survey-table-patterns.ts` classifies headings by role in any column order, in English and Arabic, accepts `X`/`Y`, `From`/`To`, single-letter headings only as whole tokens, reads Arabic-Indic digits, derives edge topology from a `LINE` column, reports a chain that does not connect, and is bounded against catastrophic backtracking. Its own tests include "reads a heading in any column order", "reads NORTHING before EASTING", "reads X and Y headings", "keeps a parcel table and a reference-point table apart".

## 2.2 Where it genuinely does — two real gaps

**GAP A — no row accounting. Sections 28 and 29 are unimplemented.**

A sweep for `detectedRows`, `parsedRows`, `acceptedRows`, `rejectedRows` across `lib/land` and `lib/geo` returns nothing. If a table detector sees six rows and the extractor accepts five, nothing anywhere records that a row was lost or why. The result reports five points and looks successful.

This is the most important gap in the brief, and the smallest to close: every rejection site already knows its reason, it simply is not carried out to the result.

**GAP B — the PDF text path is layout-blind.**

`boundingBox` / `transform` / `getTextContent` appear only in `lib/land/ocr/ocr-engine.ts`. The native-PDF path flattens the page to linear text before any table reasoning. `pdfjs` exposes per-item `transform` (x/y position) that is currently discarded.

Consequence: column identity is recovered from whitespace runs rather than geometry. It works on the sheets tested — and it is exactly the assumption that breaks on an unseen layout with wrapped headings or a table split across columns. Sections 1 and 12 of the brief target this directly.

## 2.3 The holdout problem — stated plainly

Section 19 makes a blind holdout corpus mandatory, and section 37 requires the code to be frozen before it runs. **I cannot create that corpus.** A holdout I generate is not blind — I would be writing both the documents and the parser that reads them, which is the definition of the overfitting the brief exists to prevent. Section 20's rule against fixing per-document, and section 37's rule that any document used for fixing moves to the development corpus, both assume documents supplied from outside.

Every survey document I have seen so far — سفاري, the merge report, the two Oman sheets — is now **development corpus** by that rule, because they were used to find and verify the bidirectional-control fix.

To evaluate generalization honestly I need survey documents I have never seen: different countries, different column orders, different point counts, varying photograph quality, WGS84 and UTM, Arabic, English, bilingual. Until those exist, any recall/precision figure in this report would be measured on documents the code was tuned against, and would mean nothing.

---

# FINAL REPORT

```text
FIND MY LAND — GENERALIZATION CERTIFICATION

ARCHITECTURE
Template-independent core:          PARTIAL — table inference is generic; the
                                    PDF text path is layout-blind (Gap B)
Layout-aware extraction:            FAIL — bounding boxes discarded outside OCR
Table inference:                    PASS — heading roles, any column order, AR/EN
Semantic column classification:     PARTIAL — alias-based, no probabilistic
                                    fallback for unknown headers
Multi-strategy extraction:          FAIL — not implemented
Consensus engine:                   FAIL — not implemented
Generic fallback:                   PASS — generic path runs without a country
Country adapters optional:          PASS — adapters supply hints, not parsing

ANTI-OVERFITTING
Hardcoded document templates remaining:  0
Filename-specific logic:                 0
Exact-template dependencies:             0
Leave-one-template-out:             NOT RUN
Mutation tests:                     0 / 0 — not built
Fuzz-generated documents:           0 / 0 — not built
Negative corpus:                    0 / 0 — not built
Blind holdout documents:            0 — cannot be authored by me; see 2.3

HOLDOUT RESULTS
Coordinate row recall:              NOT MEASURED — no blind corpus
Coordinate precision:               NOT MEASURED
CRS accuracy:                       NOT MEASURED
Topology accuracy:                  NOT MEASURED
False parcel rate:                  NOT MEASURED
Silent row loss:                    UNKNOWN — no row accounting exists (Gap A)

SAFETY
Unknown document fallback:          PASS — unresolved/review states exist
Review-required flow:               PASS — three verdicts wired
No silent wrong polygon:            PASS — source order preserved, invalid
                                    sequences produce no polygon
Rejected-row traceability:          FAIL — Gap A

REGRESSION
Saudi known corpus:                 PASS — 5/5 and 6/6 on the real files
Oman known corpus:                  PASS — both sheets, AGREE on distance+area
Generic international:              PASS — existing suites green
WGS84:                              PASS
UTM all zones:                      120 / 120 (within tests/geo/utm-global)
DMS:                                PASS
Existing regression tests:          565 / 565

RUNTIME
Real unseen document #1:            N/A — all supplied documents are now
Real unseen document #2:            development corpus (used to find the fix)
Real unseen document #3:            N/A
Runtime E2E:                        NOT RUN
Production Build:                   NOT RUN

FINAL
FIND MY LAND GENERALIZATION:        NOT READY
Evidence of template overfitting remaining:  NO filename/template logic;
                                    YES structural (layout-blind text path)
Silent wrong-result risk:           NOT CONTROLLED — no row accounting
Remaining launch blockers:          4
```

## The four blockers

1. **Row accounting** (Gap A) — `detectedRows / parsedRows / acceptedRows / rejectedRows` with a reason per rejected row, surfaced to the result and the UI. Closes sections 28, 29, 30 and the "silent wrong-result" risk. Smallest of the four and the highest safety value.
2. **Layout-aware PDF extraction** (Gap B) — keep `pdfjs` item transforms and reconstruct columns from geometry instead of whitespace.
3. **Multi-strategy consensus** — sections 9 and 10; currently a single path.
4. **Blind holdout evaluation** — blocked on documents from outside this conversation.

---

# Part 3 — generalization foundation closeout (2026-08-22)

The three code blockers named in Part 2 are closed. Everything below was run.

## Blocker 1 — row accounting

`lib/land/intelligence/row-accounting.ts`. Every detected row now ends in exactly one of two places: the accepted set, or the rejection list with a stated reason. `RowRejectionReason` covers missing pair, non-finite value, out of range, duplicate, CRS unresolved, conversion failed, sanity failure, OCR conflict.

The module reconciles itself: if the counts do not add up — a row vanished without a recorded reason — the discrepancy is recorded as an unexplained rejection rather than rounded away. `detectedRows === acceptedRows + rejectedRows` is an asserted invariant, because an accounting module that can silently lose a row is worse than none.

`statusCeilingFor` can only cap a verdict, never raise one. A fully accounted table is not thereby verified; CRS, topology and geometry still have a say.

Summary strings are produced in both languages: `5 of 6 detected coordinate rows were validated.` / `تم التحقق من 5 من 6 صفوف إحداثيات مكتشفة.`

A test caught a real bug in this module during development: `Math.max(0, NaN)` is `NaN`, so a non-finite count leaked through. Guarded.

**13 / 13 tests.**

## Blocker 2 — layout-aware extraction

`lib/land/intelligence/layout.ts`. Positioned items in, rows and columns out, before anything reads meaning into a number.

Rows are grouped by baseline with a tolerance proportional to glyph height. Items separated by less than a character width merge into one cell, so a number a PDF split across several text items is rejoined. Columns are inferred by clustering left edges across rows, with a threshold that scales to the table's own width.

The consequence that matters: **a blank cell leaves a hole instead of shifting the row left.** A test covers exactly that — a table whose `DIST` value is missing on one row keeps its northing in the NORTHING column, where whitespace splitting would read it as the distance.

`fromPdfjsTextItems` adapts pdfjs `transform` matrices, kept separate so the layout engine stays independent of any one PDF library. Native text remains the first choice; nothing here routes a text PDF to OCR.

**16 / 16 tests**, including out-of-order items, multi-page separation, three- and four-column tables, and both coordinate column orders.

## Blocker 3 — consensus engine

`lib/land/intelligence/consensus.ts`. Readings from up to eight independent sources are reconciled by corner rather than by whoever answered first.

The rule the brief asks for is enforced literally: the document has as many rows as the **most complete** reader saw. If the native layout sees six rows and the pattern matcher sees five, the result is not five successful points — the union of corners is kept, a `row-count disagreement` warning names the short reader, and the verdict is held at `REVIEW_REQUIRED` until the sixth row is explained. This holds even when every shared corner agrees perfectly: agreement on what was read is not completeness.

Each point carries the named sources that produced it, not an unexplained score, plus any sources that placed it differently and the spread between readings. Corners that disagree beyond ~0.1 m become `OCR_CONFLICT` rejections in the account.

**12 / 12 tests.**

## Mutation and negative corpora

**Mutation** — one parcel, nine header shapes plus digit and precision variants: swapped coordinate columns, `X`/`Y`, abbreviated `E`/`N`, Arabic headings, `FROM`/`TO`, irregular whitespace, an extra unrelated numeric column, reduced precision, Arabic-Indic digits, vertex counts 3/5/6/8/12, and a repeated closing row.

This corpus found a real generalization defect. The heading `الخط الشرقي الشمالي المسافة` was not recognised: the vocabulary carried both `الضلع` and `ضلع` but only `خط`, with no `الخط`. Per the brief's rule, the fix addresses the failure **class**, not the string — `normalizeLabel` now strips the Arabic definite article during matching, so every term matches with or without it and the term lists stay short. Guarded so `ال` itself and three-letter words like `الى` are untouched.

**Negative** — invoices, national IDs and deed numbers, phone lists, an engineering scope with road widths and setbacks, dates and page numbers, and a price table with many decimals. Zero coordinate tables and zero coordinates from all of them. A lone plausible-looking decimal pair is not a parcel.

**23 / 23 tests.**

## Measured

| Suite | Result |
|---|---|
| geo + document-intelligence + global + ui + parcel-boundary + upload-types | 284 / 284 |
| pattern-corpus + reference-sheet + pipeline + table-patterns + find-my-land + pdf-corpus + land-flow + amrs + cross-validation + real-templates | 281 / 281 |
| row-accounting + layout + consensus + mutation/negative | 64 / 64 |
| **Total** | **629 / 629** |

No regression from the definite-article change, which touches every heading in the engine. `eslint` clean on all four new modules and their tests. TypeScript `--noEmit` under the project's own strict settings: **0 errors**.

## Scope discipline

No country rules were extended. No new regex was added for any known document. No filename or template-name branch exists anywhere — re-verified by sweep. The one vocabulary change is a general normalization rule, not a term added to satisfy a document.

## GENERALIZATION CORE CODE FREEZE

The extraction engine is frozen as of this entry. The next step is blind holdout certification against documents supplied from outside this conversation. Every survey document seen so far — سفاري, the merge report, both Oman sheets — is development corpus and cannot serve as holdout.

---

# Part 4 — BLIND HOLDOUT CERTIFICATION (attempted, 2026-08-23)

## Code freeze verified

An md5 manifest of the twelve frozen engine files was taken before evaluation and is stored at `tmp/_scratch/freeze/FREEZE.md5`. **No extraction file was modified during this phase.** No rule, pattern, dictionary entry, adapter or geometry change was made in response to anything found below.

## The methodological blocker — read this before the results

A blind holdout requires the **document**. This session can search the web and fetch a URL, but a fetch returns the page rendered to markdown and summarised by a small model — it does not deliver the original PDF bytes into the workspace, and the shell's egress does not reach these government hosts.

That matters more than it might appear. The most serious defect found in this whole engine — Unicode bidirectional controls splitting `N` from its number — lived in the **PDF text extraction layer**. Model-transcribed text arrives clean: no bidi controls, no split text items, no layout to reconstruct. Evaluating against it therefore exercises the semantic, table, CRS and geometry layers while **bypassing the exact layer where the real defect was**, and would produce a misleadingly good number.

So what follows is not a blind holdout certification. It is a partial, honestly-scoped evaluation of one real unseen document, plus authoritative ground truth for a second that could not be executed.

## Holdout attempted

| # | Jurisdiction | Source | Obtained | Executed |
|---|---|---|---|---|
| H01 | USA (Wyoming) | BLM cadastral field notes, T13N R79W, 6th PM | verbatim lines via fetch | **yes** |
| H02 | UK (England & Wales) | HM Land Registry title plan, PG40 supplement 5 | specification only, no document | no |
| H03 | Turkey | official TKGM Aplikasyon Krokisi specimen | not found publicly | no |
| H04 | Canada | Canada Lands survey plan | not attempted after H01/H02 | no |
| H05 | Other EU | — | not attempted | no |

## H01 — BLM cadastral field notes (USA)

Class D and F: many unrelated numeric annotations, DMS control points, bearings, distances in **chains**, and no CRS beyond an implied NAD83 realization.

Ground truth, read from the document itself:

- Township 13 North, Range 79 West, Sixth Principal Meridian
- Two control-point coordinates in DMS with trailing hemisphere letters
- Bearings in the form `N. 0°03.4' E.`
- Distances of `39.636` and `39.823` **chains**
- Section numbers 1–36, ellipsoid heights in metres
- No coordinate table, no declared parcel area, no EPSG code

Frozen engine result:

```
coordinate candidates : 0
survey tables         : 0
registered area       : none
```

**False parcel: none.** Township 13, Range 79, fourteen section numbers, two elevations and two chain distances, and the engine manufactured nothing from any of them. That is the critical safety test in section 14, and it passes cleanly.

**Recall: 0 of 2.** The two genuine DMS control points were not extracted.

### Failure class isolated — `SPELLED_OUT_LAT_LON_LABEL_BEFORE_DMS`

Probing the frozen engine with variants of the same coordinate, changing nothing in the code:

| Form | Candidates |
|---|---|
| `Latitude 41° 07' 57.940" N., Longitude 106° 13' 36.683" W.` | **0** |
| `Latitude 41° 07' 57.940" N, Longitude 106° 13' 36.683" W` | **0** |
| `41° 07' 57.940" N 106° 13' 36.683" W` | 1 |
| `41°07'57.940"N 106°13'36.683"W` | 1 |
| `N 41° 07' 57.940" W 106° 13' 36.683"` | 1 |
| `Latitude 41.132761 N, Longitude -106.226856 W` | 1 |

DMS parsing itself is sound — bare, compact and hemisphere-first all work, and decimal degrees work even with the spelled-out label. The engine fails on exactly one combination: **a spelled-out `Latitude` / `Longitude` word immediately preceding a DMS value.** The trailing period is not the cause.

The perverse consequence is that the *more explicitly labelled* the document is, the worse the engine does — which is the opposite of what the evidence-first design intends. This is a general class, not a US quirk: `Latitude … Longitude …` before DMS is ordinary English survey wording.

**Not fixed.** Recorded for the decision after evaluation, as the rules require.

## H02 — HM Land Registry title plan (UK)

Ground truth obtained from HM Land Registry practice guide 40 supplement 5, which is authoritative:

> "the title plan will still only show the general boundary"

and, on coordinates: no table of survey coordinates for parcel corners appears on a title plan. Dimensions from deed plans "are no longer routinely reproduced". The plan carries a title number, a scale, an Ordnance Survey base, and coloured edging.

Expected engine result: land document recognised, legal metadata extracted, `coordinate_presence = NONE`, no invented coordinates.

**Not executed** — no title plan document could be brought into the workspace. The expectation is recorded so this case can run unchanged the moment a specimen is supplied.

## What this does and does not establish

It establishes one real thing: on a genuinely unseen foreign survey document dense with numbers, the frozen engine invented nothing. Section 14's target of a zero false-parcel rate holds on the one document tested.

It establishes one real failure class, found rather than assumed.

It does not establish generalization. One executed document is not a corpus, none of the requested jurisdictions except the USA were covered, no scanned image was tested, no Class B or C document was tested, and the PDF extraction layer was not exercised at all.

## FINAL REPORT

```text
FIND MY LAND — BLIND HOLDOUT CERTIFICATION

CODE FREEZE
Extraction engine modified during evaluation:   NO  (md5 manifest, 12 files, unchanged)
Production Build:                               NOT EXECUTED — started, still running
                                                when this was written; the mounted
                                                filesystem makes a full Next build
                                                exceed the shell's per-call window

HOLDOUT SET
Total unseen documents:                         1 executed, 1 with ground truth only
Countries/jurisdictions:                        USA (executed); UK (ground truth only);
                                                Turkey, Canada, EU not obtained
Documents with absolute coordinates:            1  (H01, two DMS control points)
Documents without absolute coordinates:         1  (H02, by specification)
Ambiguous CRS documents:                        1  (H01 — NAD83 implied, no realization)
Scanned/image documents:                        0

RESULTS BY DOCUMENT

H01
Country:                     USA (Wyoming)
Document type:               BLM cadastral survey field notes
Coordinate presence expected: ABSOLUTE (2 DMS control points)
Coordinate presence detected: NONE
Rows expected:               2
Rows detected:               0
Rows accepted:               0
Rows rejected:               0
CRS expected:                unresolved (NAD83 named, no realization/zone)
CRS result:                  unresolved
Verdict:                     FAIL on recall / PASS on safety — no false parcel

H02
Country:                     United Kingdom
Document type:               HM Land Registry title plan
Coordinate presence expected: NONE
Coordinate presence detected: NOT EXECUTED
Verdict:                     NOT EXECUTED

METRICS  (n = 1 executed document — too small to be a rate)
Coordinate row recall:                  0% (0 of 2)
Coordinate row precision:               N/A — nothing was extracted
Coordinate-presence accuracy:           0% (1 of 1 wrong: ABSOLUTE read as NONE)
CRS accuracy:                           100% (1 of 1 — correctly unresolved)
Topology accuracy:                      N/A — no topology in the document
Silent row loss:                        0
False parcel rate:                      0%
Incorrect VERIFIED results:             0
Correct REVIEW_REQUIRED/UNRESOLVED:     1

GENERALIZATION
Unseen Saudi/Oman-specific dependency discovered:   NO
Unknown layouts handled:                            PARTIAL
Documents without coordinates handled safely:       NOT EXECUTED
Unknown CRS handled safely:                         PASS
False coordinate rejection:                         PASS

FAILURE CLASSES
1. SPELLED_OUT_LAT_LON_LABEL_BEFORE_DMS
   A spelled-out Latitude/Longitude word immediately before a DMS value
   prevents recognition. Bare, compact and hemisphere-first DMS all parse;
   decimal degrees parse even when labelled. Confirmed by six controlled
   variants against the frozen engine.

2. HOLDOUT_CORPUS_UNAVAILABLE  (environmental, not an engine defect)
   Original document bytes cannot be brought into the workspace, so the PDF
   extraction layer — where the only serious defect so far was found — was
   not exercised.

NO FIXES WERE MADE DURING THIS EVALUATION.

DECISION
GENERALIZATION:                          PARTIAL — cannot be certified on n = 1
SAFE FOR GLOBAL PHASE:                   NO — not yet demonstrated
Extraction engine remains frozen:        YES
Remaining demonstrated generalization blockers:  1
                                         (SPELLED_OUT_LAT_LON_LABEL_BEFORE_DMS)

NEXT RECOMMENDED PHASE:
REOPEN GENERALIZATION CORE FOR SPECIFIC FAILURE CLASSES
— but only after a real holdout corpus exists. Fixing failure class 1 on the
strength of one document would be the per-document repair the freeze exists
to prevent.
```

---

# Part 5 — regional core finalization (Arab region + Turkey), 2026-08-23

Product scope for V1 is the Arab region and Turkey. The USA/UK evaluation is out of release scope; only the one **generic** parser defect it exposed was carried forward.

## Controlled reopen — one failure class

The freeze was lifted for `SPELLED_OUT_LAT_LON_LABEL_BEFORE_DMS` and nothing else. One file changed: `lib/geo/coordinate-parsing.ts`.

### The defect was not about labels at all

`collectDmsComponents` looks for a hemisphere letter in a four-character window before each degree magnitude, using `/([NSEWnsew])\s*$/`. For `Latitude 41°07'57"N` that window is `"ude "` — and the **`e` that ends the word `Latitude`** matched as East. The word stole the hemisphere from the value, so the reading became a longitude of 41 and the real trailing `N` was never used.

The same happens with `Longitude`. Any word ending in n, s, e or w followed by a space and a degree value would do it.

So this was never a missing-label problem. It was a missing word boundary: a hemisphere letter has to stand on its own, and the trailing letter of an ordinary word is not one. The fix is four lines and language-independent:

```ts
// A hemisphere letter has to stand on its own. Without this check the `e`
// that ends `Latitude` and `Longitude` is claimed as East ...
if (beforeIndex > 0 && /[A-Za-z]/.test(raw[beforeIndex - 1] ?? "")) {
  beforeIndex = -1;
}
```

No label vocabulary was added. No English, Arabic or Turkish word list was introduced. `Enlem`, `Boylam`, `خط العرض` and `خط الطول` work because the guard removed the interference, not because they were enumerated — which is why the repair also covers labels nobody has written down yet.

### Verified against the six probes that isolated it

| Form | Before | After |
|---|---|---|
| `Latitude 41°07'57.940" N., Longitude 106°13'36.683" W.` | 0 | **1** |
| same, no trailing period | 0 | **1** |
| bare `41°07'57.940" N 106°13'36.683" W` | 1 | 1 |
| compact, no spaces | 1 | 1 |
| hemisphere first | 1 | 1 |
| decimal degrees with label | 1 | 1 |

## Mutation tests — `tests/land/labelled-dms.test.ts`, 23 / 23

Grammar, not documents: `Latitude`/`Longitude` on one line and across lines, colon and slash separators, `Lat`/`Lon`/`Lng`, lower case, generous whitespace, a trailing period, longitude stated first without the axes swapping, and southern/western signs preserved. Arabic `خط العرض` / `خط الطول` inline and on separate lines. Turkish `Enlem` / `Boylam`, plain and with colons.

Validation is unchanged: latitude beyond 90 and longitude beyond 180 are still refused, and minutes or seconds of 75 still yield nothing.

Bearing safety has its own block, because widening DMS recognition is exactly where a cadastral bearing could start being read as a position. A lone `N 35°20' E`, a four-call metes-and-bounds run, and a specification quoting `30°00'00"` roof pitch all produce **zero** coordinate candidates.

## Regression — 652 / 652

| Suite | Result |
|---|---|
| geo + document-intelligence + global + ui + parcel-boundary + upload-types | 284 / 284 |
| pattern-corpus + reference-sheet + pipeline + table-patterns + find-my-land + pdf-corpus + land-flow + amrs + cross-validation + real-templates | 281 / 281 |
| row-accounting + layout + consensus + mutation/negative + labelled-dms | 87 / 87 |

Saudi 5/5 and 6/6, the Oman four- and five-point sheets with distance and area agreement, the UTM sweep, WGS84, DMS, the negative corpus and the mutation corpus all unchanged. Silent row loss 0. No forced polygon. `eslint` clean; TypeScript `--noEmit` on the changed file and its tests: 0 errors.

## Re-freeze

```
FREEZE V2 — 13 files
aggregate fingerprint: 8806045eae8f09d83592824e1249d1f1
manifest: tmp/_scratch/freeze/FREEZE-V2.md5
```

The only hash that moved from V1 is `lib/geo/coordinate-parsing.ts`. Every other engine file is byte-identical to the previous freeze.

## Regional holdout plan — recorded, not executed

Target jurisdictions: Saudi Arabia, Oman, Turkey, and other Gulf/Arab countries. Structural diversity matters more than country count.

Classes to cover, with the count still needed:

| Class | Description | Have | Need |
|---|---|---|---|
| A | text PDF, WGS84 decimal | dev corpus only | ≥2 unseen |
| B | text PDF, UTM easting/northing | dev corpus only | ≥2 unseen |
| C | DMS coordinates | none | ≥1 unseen |
| D | scanned / photographed sheet | none | ≥2 unseen |
| E | arbitrary column order E/N, N/E, X/Y, Y/X | mutation only | ≥1 real |
| F | LINE / FROM / TO topology | dev corpus only | ≥1 unseen |
| G | 3, 4, 5, 6+ vertices | mutation only | ≥2 real |
| H | many unrelated numbers | negative corpus only | ≥1 real |
| I | land document with no coordinates | none | ≥2 unseen |
| J | coordinates with unresolved CRS | none | ≥1 unseen |
| K | multiple parcels / coordinate groups | fixture only | ≥1 unseen |

Class D matters most. Every real defect found so far — bidirectional controls, and the hemisphere guard — lived in extraction, and only an actual file exercises that layer. Transcribed text arrives clean and would hide exactly these.

Evaluation rules stand: no parser modification during the holdout; a failure is recorded as a general class; any document used for debugging leaves the holdout permanently.

---

# Part 6 — Arab region + Turkey blind holdout, executed 2026-08-23

Six real, previously unseen public documents. Engine frozen throughout; fingerprint verified before and after and byte-identical. The newest frozen-file mtime precedes the arrival of the holdout PDFs by just over an hour, so nothing was touched in response to what was found.

Each file was run through the application's own entry point — `extractDocumentData` (pdfjs) → `normalizeExtractedText` → the frozen engine. No text was copied by hand into the parser at any point.

## H01 — Oman, Duqm krooki. The serious result

Native text extracted cleanly: 3876 characters, 393 pdfjs blocks. The document contains a real four-corner parcel:

```
567350.49  567328.10  567268.17  567290.62      ← four eastings
2170025.51 2169983.63 2170015.56 2170057.49     ← four northings
47.49  67.91  47.56  67.87                       ← four side lengths
AREA: 3,227 SQ. M.
```

The engine detected **zero coordinate tables** and produced **two false coordinates**: `47.49 67.91` and `47.56 67.87` — the *side lengths* — read as decimal latitude/longitude pairs. 47.49 N, 67.91 E is in Kazakhstan; Duqm is at roughly 19.6 N, 57.6 E. The four genuine UTM corners were lost entirely.

Two things caused this. The PDF's text stream is **column-major**: all four eastings run together, then all four northings, then all four distances. There is no heading in the text layer, so the table detector — which keys off a heading and row structure — sees nothing. With no table claiming them, the loose decimal pair `47.49 67.91` fell through to the generic decimal-pair path.

The layout reconstructor did its job on this document, rebuilding 94 rows and 30 columns from the pdfjs bounding boxes. **Nothing consumes that output.** The module was added and tested but never wired into the extraction path, and H01 is precisely the document it was built for.

Severity: this is a false coordinate group. It did **not** become a confident parcel — the verdict was REVIEW_REQUIRED, two points cannot form a polygon, and no map would be drawn. The safety rail held. The extraction did not.

## H02, H03, H04 — Turkey, three Aplikasyon Krokisi

All three are pages lifted from planning reports. Their native text is 208–337 characters and consists only of the consultancy letterhead and the figure caption:

- H02: `… Ek 1 : Aplikasyon Krokisi (372/27 )`
- H03: `… 8.3. APLİKASYON KROKİSİ`
- H04: `… Şekil8. Aplikasyon Krokisi`

The krokisi itself — parcel geometry, Ada/Parsel, the coordinate table — is an embedded raster image. All three returned `coordinate_presence = NONE`, `UNRESOLVED`.

That is safe but blind, and the cause is structural: `processPdf` extracts native text only and has no image fallback, so a PDF never reaches OCR. Even if it did, the rule in `extractText` sends a document to OCR only when native text is under 30 characters — and a letterhead of 200–340 characters clears that bar comfortably. A scanned survey wrapped in a text report is therefore invisible twice over.

## H05 — Oman, Duqm master plan. Correct

A zoning map legend: land-use classes, `WGS 1984 UTM Zone 40N`, scale 1:75,000, SEZAD GIS Section, a scale bar reading `0 1,000 2,000 3,000 4,000 500 Meters`, and a Windows file path. No parcel, no coordinate table.

`NONE` / `UNRESOLVED` is the right answer. The engine read the CRS declaration correctly (utm zone 40, PROBABLE) and still produced no coordinates and no parcel — it did not manufacture a parcel from a CRS label, and it did not read the scale bar or the 1:75,000 as coordinates.

## H06 — UAE, Abu Dhabi site plan requirements. Correct

A submission checklist describing what drawings must contain. It even uses the word *Coordinates* in prose — "plot limit dimension & Coordinates as per affection site-plan" — and the engine still produced nothing. `NONE` / `UNRESOLVED` is correct.

## Failure classes

1. **`TABLE_NOT_DETECTED`** (H01) — coordinate table emitted column-major with no heading in the text layer.
2. **`FALSE_COORDINATE`** (H01) — side lengths read as a decimal coordinate pair once no table claimed them.
3. **`LAYOUT_MODULE_NOT_INTEGRATED`** (H01) — layout reconstruction produced 94 rows and 30 columns from bounding boxes; the extraction path does not use it.
4. **`SCANNED_PDF_NO_OCR_FALLBACK`** (H02, H03, H04) — PDFs whose survey content is a raster image never reach OCR; incidental letterhead text also defeats the under-30-character OCR trigger.

No fixes were made. Diagnosis only.

---

# Part 7 — Controlled Regional Reopen #2 (executed)

Starting freeze fingerprint: `8806045eae8f09d83592824e1249d1f1`
Final freeze fingerprint: `ba60aab462f72c5f725eb0c4a254c9b0`
Production data modified: **NO**

The three defect classes reported in Part 6 were closed. Nothing outside Find
My Land was touched: `lib/geo`, `lib/land`, `app/api/land` and
`src/components/tools/FindMyLand.tsx` are the only importers of every module
changed here, and that was verified by import graph before editing.

## The path that actually runs

Before any edit, the production call graph was traced on disk rather than
assumed:

```
FindMyLand.tsx  (browser)
  → pdfjs text layer + page rasterisation + tesseract.js
  → POST /api/land/resolve
  → resolveLandDocument()
  → extractGeoEvidence / extractSurveyTables / extractZoneLessUtmRows
  → CRS selection → conversion → boundary analysis → verdict
```

The finding that shaped everything else: the browser was flattening the page to
a single string before the server ever saw it. No amount of work on the server
could recover a column that had already been thrown away. So the payload gained
one field — positioned words — and both the text layer and OCR now fill it.

## Defect A — the layout reader is now the reader

`reconstructLayout` existed and was used by nothing. It is now the first-class
reading of a PDF page.

- `lib/land/intelligence/table-extraction.ts` turns a reconstructed page into
  coordinate rows: heading-led first, across every row that could be a heading,
  with the reading that accounts for the most rows winning; a value-led
  fallback when no heading survived, always reported as unconfident.
- Data cells are matched to a heading by column index *and* by horizontal
  position, and the better of the two readings is kept. Index matching is exact
  on born-digital tables; position matching is what keeps an OCR table readable
  when the same logical column drifts between neighbouring clusters.
- `lib/land/intelligence/axis-resolution.ts` decides which column is easting and
  which is northing. `X` and `Y` are **not** mapped globally: they are reported
  as axes and resolved from heading semantics, explicit axis wording, grid value
  ranges, regional convention and repeated row structure. An assignment is
  confident only when at least two independent signals agree and none conflicts.
  Magnitude is one voice and never the deciding one.
- The Turkish national convention (Y = easting, X = northing) participates as
  named supporting evidence when the sheet reads as Turkish — never as a rule
  that can create a reading on its own.
- Row accounting runs through the whole path. Every detected row ends either as
  an accepted corner or as a rejection with a stated reason
  (`MISSING_COORDINATE_PAIR`, `OUT_OF_RANGE`, `CRS_UNRESOLVED`,
  `CONVERSION_FAILED`, `FAILED_SANITY_CHECK`), and the resolver reconciles the
  totals so a row cannot vanish between the table and the map.
- `SOURCE_PRIORITY` in the consensus module states the order explicitly:
  structured table > rebuilt layout > OCR ROI > full-page OCR > labelled regex >
  flat text > numeric cluster > country adapter. The country adapter is last on
  purpose: it can sanity-check a reading, never produce one.

## Defect B — pages are chosen by what they show

The old rule — "more than N characters means this is a text document" — is gone.

- `lib/land/ocr/page-evidence.ts` judges sufficiency structurally: a page is
  sufficient only when a coordinate table was actually recovered from its text
  layer. Prose is not survey evidence, however much of it there is.
- Pages that fail are ranked by survey vocabulary (Arabic, Turkish, English),
  raster dominance, unread numeric structure and absence of a text layer, and
  the OCR budget is spent on the best of them **wherever they sit**. A krokisi
  on page 30 of a 40-page planning report is reached.
- When nothing scores anywhere and the document is image-heavy, a bounded
  sample is spread across the whole document and always includes its last page.
  There is no "first N pages" rule anywhere in the engine.
- OCR words become `PositionedItem`s in the page's own frame, y-flipped from the
  raster origin, and join the text-layer words in one list. Native PDF and OCR
  converge on `Positioned Evidence → Layout → Table → Semantic roles →
  Coordinate candidates → Consensus`. There is no Turkish parser, no Omani
  parser and no per-document parser.
- `lib/land/ocr/languages.ts` picks the models from the document: `ara+eng` by
  default, `tur+eng` for a Turkish sheet, `ara+eng+tur` only when both scripts
  are present — so no upload pays for a model it does not need — and degrades
  to a single model rather than losing the document when trained data is
  unreachable.
- **No dependency was added.** Server-side rasterisation uses `@napi-rs/canvas`,
  which `pdfjs-dist@6` already ships and already uses for its own rendering;
  the browser path uses the canvas it always had. Where the native binding is
  absent the renderer returns null and the text layer is used, rather than
  failing.

## Defect C — a decimal pair must earn its place

`lib/geo/decimal-admission.ts` gates every unlabelled decimal pair.

- Positive structural evidence is required: coordinate vocabulary near the
  numbers, or at least three sibling pairs, or a structured reader that already
  identified them. Absence of a reason to reject is not a reason to accept.
- Measurement context (`DIST`, `LENGTH`, `WIDTH`, `AREA`, `SCALE`, `المسافة`,
  `الطول`, `العرض`, `المساحة`, `المقياس`, `MESAFE`, `UZUNLUK`, `GENİŞLİK`,
  `ALAN`, `ÖLÇEK` and their kin) rejects a weak reading outright.
- A survey sheet carries both vocabularies, so the **nearer** one owns the
  numbers. Proximity, not presence, decides.
- A rejected pair is not a coordinate candidate at all: it forms no cluster,
  reaches no map, and is counted apart from coordinates that were merely set
  aside — with its reason recorded in the analysis steps.

## Evidence

H01–H06 were run as a regression corpus, from the original PDFs, through the
real pipeline. Nothing was transcribed into a parser.

| | OCR | Result |
|---|---|---|
| H01 Oman Duqm krooki | not needed | 4 corners, polygon, UTM 40N from the document, computed area 3 228.76 m² against a registered 3 227 m² (**MATCH**, 0.05 %), 4/4 rows, **0** false candidates |
| H02 Turkey Manisa | activated, `tur+eng` | 21 coordinate rows recovered from the raster; axes resolved confidently as Y = easting, X = northing; the document states no zone, so the engine asks instead of guessing |
| H03 Turkey Manyas | activated, `tur+eng` | no table recovered — the sheet prints truncated eastings; refused rather than reconstructed |
| H04 Turkey Gölmarmara | activated, `tur+eng` | no table in the raster; UNRESOLVED |
| H05 Oman master plan | activated, `ara+eng` | no coordinates, no parcel |
| H06 UAE site plan | activated, `ara+eng` | no coordinates, no parcel |

Safety counters across the corpus: silent row loss **0**, false coordinate
groups **0**, false confident parcels **0**, invented CRS **0**, forced polygons
**0**.

## Known limitation, stated rather than papered over

H02 and H03 print a national-grid easting without its zone. Turkey's bounding
box admits several UTM zones for the same pair of numbers, so the engine
reports `crsSelection.required` and asks the user for the zone. Supplying zone
35N places H02 at 39.204° N, 27.583° E — Soma, Manisa, correct. Guessing it
would have been an invented CRS, which is the one thing this engine may never
produce.

---

# Part 8 — OCR Hardening V2 (executed)

OCR pipeline version: **1.x → 2.0.0** (`OCR_PIPELINE_VERSION` in
`lib/land/ocr/ocr-engine.ts`; the coordinate engine is versioned separately
and was not redesigned).

Fingerprint scheme (documented here because three schemes have now circulated):
sha256 over the sorted list of per-file sha256 hashes of the full Find My Land
surface — every `.ts/.tsx/.d.ts` under `lib/geo`, `lib/land`, `app/api/land`,
plus `src/components/tools/FindMyLand.tsx` and `src/lib/tools/land-analysis.ts`.
The manifest is `tmp/_scratch/freeze/FREEZE-V4.{files,sha256,fingerprint}`.
The externally supplied starting value `5bbdfe78…a363e` came from a Windows
session whose manifest never reached the repository; the same tree recomputed
under this documented scheme at the start of this task was
`4ced27c13d4dfbadab18c5e21b19464e5ef9e27add4705afa8a1e0ac0028d07a`, and every
baseline behaviour it certifies (H01 4/4, UTM 40N, area match, timeout
ceilings, `serverExternalPackages`) was re-verified by test before any edit.

## What V2 adds

The production read of a raster page is now:

```
raster → quality assessment → perspective (conservative) → orientation →
deskew → adaptive enhancement → upscale policy → primary OCR →
positioned words → survey-table ROI → high-quality ROI OCR →
numeric second pass (table regions only) → cell-level consensus →
positioned evidence → the same semantic engine as native PDF text
```

New modules, all template-free and country-free:

- `lib/land/ocr/raster.ts` — bounded raster primitives on the canvas backend
  PDF.js already ships (no new dependency): grayscale, Otsu/adaptive
  threshold, background normalisation, contrast stretch, median denoise,
  small-angle rotation, right-angle rotation, projective warp by inverse
  homography, high-quality upscale, hard resource ceilings (4000 px / 12 MP).
- `lib/land/ocr/image-quality.ts` — explainable `ImageQualityAssessment`:
  blur (Laplacian variance), contrast, tile-percentile background variation,
  projection-profile skew (±10°, coarse→fine), 0°/90° orientation from line
  banding, dominant text height, recommended operations. 180° is never
  guessed from banding — the page is preserved instead of destructively
  turned.
- `lib/land/ocr/geometry-correction.ts` — applies only what was measured and
  records every applied operation with its confidence. Perspective runs only
  when a bright paper quadrilateral hugs the image border with ≥0.65
  confidence and ≥1.5° distortion, so a parcel drawing inside a full-frame
  scan can never be mistaken for the page border.
- `lib/land/ocr/survey-roi.ts` — coordinate-table regions from aligned
  numeric rows plus trilingual header vocabulary; bordered, borderless, tiny
  and multiple tables; vertical-jump splitting keeps separate tables apart;
  at most three ROIs per document.
- `lib/land/ocr/cell-consensus.ts` — `OCRCellEvidence` per cell across the
  primary / ROI / numeric passes. Agreement outranks confidence (the 0.96
  single-pass example loses to two agreeing 0.75 passes); digit-confusion
  candidates (O↔0, I/l/|↔1, Z↔2, S↔5, G↔6, B↔8) exist only inside numeric
  table cells; decimal recovery is licensed by the column's own modal format,
  never by plausibility; identical digit sequences differing only by a lost
  separator are one reading. A material unresolved conflict yields
  `CONFLICTING_CELL`, an `OCR_CONFLICT` row rejection, and is never silently
  chosen.
- `lib/land/ocr/tessdata.ts` — language-model availability: operator
  directory (`AKARPROMAX_TESSDATA_PATH`) → locally installed
  `@tesseract.js-data/*` packages → CDN; a missing language is dropped with a
  warning, never a crash, a hang, or a 500.

Engine changes (`ocr-engine.ts`): per-request worker pool (one worker per
language profile, reused across pages and ROIs, always terminated in
`finally`); recognition input is a **Buffer** — the previous Blob input is
unreadable by the Node worker and surfaced as a worker-level crash outside
any try/catch; a worker `errorHandler` is installed so a worker fault can
never kill the process; every existing ceiling kept exactly (30 s page,
120 s document, 150 s request, ≤8 pages, ≤2 workers) plus
`MAX_ROI_PASSES = 6`; a within-request OCR cache keyed by page/ROI/mode
prevents duplicate passes. `OcrResult` gains `rois`, `cellRejections`, and an
explainable `quality` object.

Row accounting: OCR cell rejections flow into the resolver's document row
account (`ResolveInput.ocrRejections`, wired by the analyze route), and
`buildRowAccount` reconciles overlapping dispositions from independent
readers so `detectedRows === acceptedRows + rejectedRows` holds in every
output, each rejection with a stated reason.

Safety defect found and closed during hardening: `BARE_ZONE_WITH_HEMISPHERE`
and the detector's zone-letter pattern could read the OCR fragment
`…325⏎1⏎Sör…` as "UTM zone 1 S" — a newline-crossing match with a
Unicode-blind lookahead. Both patterns now require same-line digits, an
uppercase bare N/S caption letter, and a Unicode letter/number boundary.
Every explicit-declaration fixture (`WGS84 ZONE 40N`, EPSG forms, Arabic
نطاق forms) still detects; the invented zone is gone.

## Real-corpus results (actual PDFs through the actual pipeline)

| | Before (this runtime) | After |
|---|---|---|
| H01 Oman krooki | 2.6 s, correct, no OCR | 2.5 s, identical: 4/4, UTM 40N, polygon, area MATCH (3228.76 vs 3227 m², 0.05 %) |
| H02 Turkey Manisa | tesseract worker crash (Blob input); previously pinned at the 150 s ceiling on Windows | 23.5 s: OCR `tur+eng`, 2 ROIs (36-row table), 23 coordinate rows, axes evidence-confident (Y=E / X=N), 1 unresolved conflict, **zone requested from the user, none invented** |
| H03 Manyas | crash | 13.5 s, safe UNRESOLVED (source prints truncated eastings) |
| H04 Gölmarmara | crash | 17.7 s, safe UNRESOLVED |
| H05 Duqm master plan | crash | 14.0 s, no parcel, no false coordinates |
| H06 Abu Dhabi site plan | crash | 9.6 s, no parcel |

Safety counters after V2: silent row loss 0, false coordinate groups 0,
false confident parcels 0, invented CRS 0, forced polygons 0, page timeouts
0, document timeouts 0, leaked workers 0 (a three-document stress run exits
cleanly and reuses its workers).

Tests: 68 new OCR V2 tests (image quality, geometry, ROI, consensus,
tessdata, contract, real-file runtime); full Find My Land surface
**841/841**. TypeScript clean over the whole surface; ESLint clean over
every changed file.

Windows production build and production runtime smoke could not be executed
from this session: the device bridge's execution environment failed to start
mid-task and never recovered (file staging and commit remained available and
carried every read and write). They remain the same two open items Gate #1
already carries.
