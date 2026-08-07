# Tools Comparison

**Mode:** PLAN (read-only). Feeds feature-parity for the tools vertical.

---

## 1. Reference vs Target — tool matrix

| Tool | Reference | Target | Parity action |
|---|---|---|---|
| Deed/land analysis | `MapMyDeed` (leaflet polygon, deed fields) | `LandMapper` (leaflet) | ADAPT — confirm polygon drawing + area + deed field parity |
| Coordinate converter | proj4 DD/DMS/DDM/UTM, copy-to-clipboard, multi-row output | `CoordinateConverter` (proj4) | ADAPT — confirm all 4 formats + output build parity |
| Area calculator | geometry area calc | `AreaCalculator` | MERGE — align math/output |
| Points→DXF | dxf export | `PointsToDxf` + `cad/*` (preview, layers, validation) | Target superior (adds CAD preview) |
| PDF/Image→Word | tesseract.js OCR + docx | `PdfToWord` (tesseract 7 + mammoth + docx) | ADAPT — verify OCR quality/flows |
| Calculator | scientific | `Calculator` | MERGE |
| Engineering calcs | NONE | beam, concrete, brick, rebar, paint, slope, tile, mix | Target-native; KEEP |
| CAD import/validation | NONE | `cad/*` (D1-backed) | Target-native; KEEP |

## 2. Architectural comparison

| Aspect | Reference | Target |
|---|---|---|
| Granularity | 1 monolithic page (2,142 lines) | 15 lazy components + 5 CAD components + catalog UI |
| Loading | all tools in bundle (heavy: leaflet/proj4/tesseract in main) | per-tool `lazy()` code-split; heavy deps isolated to `/tools` |
| Auth | public route | `ToolsGate` (session-gated) |
| i18n | AR/EN inline (garbled glyphs in file — encoding risk) | `locale` prop threading (ar/en/tr) |
| Persistence | none | CAD tooling D1-backed |

## 3. Decisions
- **KEEP** target architecture (lazy, gated, locale-aware). REUSE_AS_IS.
- **MERGE** reference behavior into the 6 overlapping tools (ADAPT for parity). REUSE_AS_IS for engineering + CAD sets.
- **DO_NOT_MIGRATE** the monolithic tabbed page or inline string encoding.

**Decision:** KEEP target tool framework; ADAPT reference tool behaviors into target components (Phase 6).
