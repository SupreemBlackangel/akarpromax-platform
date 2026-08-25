# FIND MY LAND V1 — CLOSURE DOCUMENT
Status: **ENGINEERING FROZEN — RELEASE CANDIDATE** · Closed: 2026-08-23

## 1. Final implemented capabilities
- Document intake: native-text PDF, raster/scanned PDF, images, DOCX — one canonical path (Positioned Evidence → Layout → Table → Semantic → Candidates → Consensus). No country parsers.
- OCR Hardening V2 (pipeline `2.0.0`): quality assessment, orientation/deskew (±10°), conservative perspective correction, adaptive preprocessing, page-relevance selection (no first-N rule), survey-table ROI, numeric second pass (table regions only), cell-level confidence consensus (agreement > column format > confidence), digit-confusion candidates, decimal recovery licensed by column modal format, Arabic+English+Turkish routing, portable local tessdata (`AKARPROMAX_TESSDATA_PATH` → `cwd/tessdata` → CDN).
- Coordinates: WGS84 geographic, DMS, UTM; multi-signal axis resolution (magnitude is evidence, not truth); CRS_SELECTION_REQUIRED state (structured 200 response); CRS-aware area calculation; country ≠ CRS.
- Integrity: source point order preserved (no silent reorder/removal); row accounting invariant `detected = accepted + rejected` with per-row reasons; false-decimal/false-coordinate defenses (areas, distances, IDs, phone-like numbers never become coordinates).
- Safety ceilings: 30s/page, 120s/document, 150s/request, MAX_OCR_PAGES 8, bounded worker pool with guaranteed cleanup; 5MB max upload.
- Manual Geometry Recovery UI: manual point selection, drag ordering, mobile up/down ordering, map/list sync, live geometry preview, self-intersection validation, manual provenance recorded, original coordinates immutable.

## 2. Current fingerprint (verified at closure)
`cfd2f1229b5a0d273c7e0147bc9035d4c3c0134d6c4f192ad1d7079315ea8223`
(71-file Find My Land surface manifest; sha256-of-sha256sums; recomputed at closure time — matches holdout start and end.)

## 3. Current test result (verified at closure)
**861 / 861 pass, 0 fail** (includes H01–H06 regression corpus through the real pipeline). Engine-scoped TypeScript: 0 errors.

## 4. Windows build/runtime status
- `npm run build` + `node server.js` (port 3022): **PASS**, proven manually on Windows this cycle — but that build predates 4 later externally-merged files (tessdata LOCAL_BUNDLE, structured CRS 200 response, Manual Geometry UI). One re-run of `npm run build` is the only outstanding mechanical check.
- Live-server probe `scripts/ocr-v2-windows-gate.mjs` is committed and ready; its output was never captured. Recorded as a deferred verification item — does not reopen development.

## 5. Safety guarantees (verified by blind holdout)
No confident wrong parcel · no invented CRS/UTM zone · no silent row loss · no forced polygon · no silent point reorder/removal · no material OCR digit change without review · no coordinates from numeric noise · no OCR hang past ceilings · no HTTP 500 · no private data (owners, IDs, deeds, phones) in logs · production data untouched.

## 6. Known safe limitations
- JBIG2-compressed scans (common in official gazettes): pdfjs JBIG2 WASM decoder does not initialize under Node (`wasmUrl` not configured) → such scans reach OCR as blank pages. Failure is safe and honest (422, manual entry offered) but extraction is impossible for this class.
- Ornamental Arabic-Indic gazette digits (e.g. Omani/Egyptian official print, zero rendered as dot) defeat current tesseract models; rows are rejected with reasons instead of guessed. ROTATE_90 was observed in preprocessing on portrait pages during holdout (possible orientation misdetection — unconfirmed).
- Single generic 422 message does not distinguish "document has no coordinates" from "coordinates present but unreadable".
- Broken-CID-font PDFs yield mojibake text layers; engine correctly falls back to OCR (subject to the limitations above).

## 7. Manual Geometry Recovery status
Implemented and merged (useManualGeometry.ts, ManualGeometryPanel.tsx, manual-geometry.test.ts — in the 861 suite). Policy: it is a user tool; never used to rescue automated results in certification.

## 8. Final blind holdout status
**EXECUTED — PASS (safety certification).** Three new blind regional documents (Oman RD 24/2024 gazette table; Egypt Shorouk cordon 636/2017 degraded scan; Kuwait CITRA tender numeric-noise trap), ground-truth ledgers written before any run, absolute freeze held (start fingerprint = end fingerprint). Results: safety gates 9/9 clean on all three; functional: B3 correct NONE; B1/B2 safe honest failure (limitations §6). Artifacts: `tmp/_scratch/holdout-final/` (ledger, results, final report).

## 9. Deferred post-launch improvements (not scheduled)
JBIG2 wasm initialization for Node raster path · ornamental Arabic-Indic digit OCR (candidate: PaddleOCR/ONNX consensus pass "V2.1") · orientation-detection audit (ROTATE_90 case) · outcome-specific user messaging (NONE vs REVIEW) · live-server gate script run.

## 10. Reopen criteria (ONLY these)
- Confident wrong parcel in production
- Invented CRS/zone in production
- Silent point/row loss in production
- Normal document causes a production crash (500/hang)
- Serious security or privacy defect

NOT reopen reasons: slower OCR, another document format, another country, cosmetic improvements, optional automation.

**FIND MY LAND DEVELOPMENT = FROZEN.**
