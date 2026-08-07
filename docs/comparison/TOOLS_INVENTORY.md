# Tools Inventory

**Mode:** PLAN (read-only).

---

## 1. Reference tools (`src/pages/Tools.tsx`, 2,142 lines, single-page tabs)

| Tool id | Name (EN) | Evidence | Tech |
|---|---|---|---|
| deed | Map My Land / Deed Analysis | `{ value: "deed", ... title: "Map My Land – Deed Analysis" }`, `MapMyDeed.tsx` component | leaflet polygon + proj4 |
| coord | Coordinate Converter | `{ value: "coord", ... title: "Coordinate Converter" }`; `CTYPES` DD/DMS/DDM/UTM lists | proj4 |
| area | Area Calculator | `{ value: "area", ... title: "Area Calculator" }` | geometry |
| dxf | Convert Survey Points to DXF | `{ value: "dxf", ... title: "Convert Survey Points to DXF" }` | dxf-parser/export |
| pdf | Convert File/Image to Word | `{ value: "pdf", ... title: "Convert File or Image to Word" }` | tesseract.js OCR + docx |
| calc | Scientific Calculator | `{ value: "calc", ... title: "Scientific Calculator" }` | JS |

Reference tool list is **6 tools**, gated publicly (no auth on `/tools` route).

## 2. Target tools (`src/components/tools/`, `ToolsPageClient.tsx` TOOL_COMPONENTS map)

| Tool key | Component | Domain |
|---|---|---|
| area | `AreaCalculator.tsx` | land area |
| calculator | `Calculator.tsx` | general calculator |
| coordinate | `CoordinateConverter.tsx` | DD/DMS/DDM/UTM (proj4) |
| points2dxf | `PointsToDxf.tsx` | survey points → DXF |
| pdf2word | `PdfToWord.tsx` | PDF/image → Word (mammoth/tesseract/docx) |
| landmapper | `LandMapper.tsx` | land mapping / deed (leaflet) |
| beam | `BeamCalc.tsx` | structural beam |
| concrete | `ConcreteCalc.tsx` | concrete quantity |
| brick | `BrickCalc.tsx` | brick estimator |
| rebar | `RebarCalc.tsx` | rebar estimator |
| paint | `PaintCalc.tsx` | paint coverage |
| slope | `SlopeCalc.tsx` | slope/grade |
| tile | `TileCalc.tsx` | tile estimator |
| mix | `MixRatioCalc.tsx` | concrete mix ratio |
| cad/* | `cad/CadPreview`, `CadExportPanel`, `CadLayersPanel`, `CadValidationSummary`, `ToolFileDropzone` | CAD import/validation (D1-backed) |

Support: `ToolCard`, `ToolsEmptyState`, `ToolsGate` (auth gate), `ToolsSkeletonLoader`, `NumInput`. Target tool set = **15 calculator/tool components + 5 CAD components**, loaded lazily (code-split).

## 3. Overlap vs reference

| Reference tool | Target equivalent | Verdict |
|---|---|---|
| deed / Map My Land | `LandMapper` (leaflet) | MERGE — ensure feature parity (polygon area, deed fields) |
| coord | `CoordinateConverter` | MERGE — verify DD/DMS/DDM/UTM + output formats parity |
| area | `AreaCalculator` | MERGE |
| dxf | `PointsToDxf` (+ cad panel) | MERGE — reference is export-only; target adds CAD preview/validation |
| pdf | `PdfToWord` | MERGE — verify OCR pipeline parity |
| calc | `Calculator` | MERGE |

Target **superset**: reference has no engineering calculators (beam/concrete/brick/rebar/paint/slope/tile/mix). Those are target-native.

## 4. Decisions
- **KEEP** all target tools. REUSE_AS_IS.
- **MERGE (ADAPT):** reference tool implementations where target version is thinner (LandMapper vs deed analysis; CoordinateConverter output formats; PdfToWord OCR pipeline) — verify feature parity in Phase 6.
- **DO_NOT_MIGRATE:** reference single-file 2,142-line tabbed page; target lazy-loaded per-tool components are the pattern.
- **Auth model:** reference tools public; target gated by `ToolsGate` (session). Keep target gate (consistent with directive auth posture); revisit if product wants public calculators.

**Decision:** KEEP target superset; reference adds feature-parity deltas only.
