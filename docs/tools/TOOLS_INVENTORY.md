# Tools Inventory

Captured at Phase 6 start (b702e1d).

## Route Architecture

Single-page: all 14 tools render on `/tools` via `?tool=<id>` query param. No sub-routes.

## Tool Registry (src/data/toolsData.ts)

| # | ID | Name (AR/EN/TR) | Category | Status | Featured |
|---|---|---|---|---|---|
| 1 | concrete | خرسانة مسلحة / Concrete / Beton | engineering | available | — |
| 2 | beam | كمرات / جسور / Beams & Bridges / Kirişler | engineering | available | — |
| 3 | tile | بلاط / Tiles / Fayans | engineering | available | — |
| 4 | brick | طوب / طابوق / Bricks / Tuğla | engineering | available | — |
| 5 | rebar | حديد التسليح / Rebar / Demir | engineering | available | — |
| 6 | paint | دهان / Paint / Boya | engineering | available | — |
| 7 | slope | ميل / انحدار / Slope / Eğim | engineering | available | — |
| 8 | mix | نسب الخلطة / Mix Ratio / Karışım | engineering | available | — |
| 9 | area | حاسبة المساحات / Area Calculator / Alan Hesaplama | surveying | available | — |
| 10 | calculator | آلة حاسبة علمية / Scientific Calculator / Bilimsel Hesap Makinesi | general | available | — |
| 11 | coordinate | محوّل الإحداثيات / Coordinate Converter / Koordinat Dönüştürücü | surveying | available | — |
| 12 | points2dxf | نقاط إلى DXF / Points to DXF / Noktalardan DXF'ye | surveying | available | — |
| 13 | pdf2word | PDF إلى Word / PDF to Word / PDF'den Word'e | document | new | yes |
| 14 | landmapper | ماسح الأراضي / Land Mapper / Arazi Haritalandırıcı | surveying | new | yes |

## Component Files

| File | Export | Role |
|---|---|---|
| `src/components/tools/ToolsPageClient.tsx` | `ToolsPageClient` | Main page: search, filter, lazy tool rendering |
| `src/components/tools/ToolsGate.tsx` | `ToolsGate` | Auth gate |
| `src/components/tools/ToolCard.tsx` | `ToolCard` | Tool card in grid |
| `src/components/tools/ToolsEmptyState.tsx` | `ToolsEmptyState` | No results |
| `src/components/tools/ToolsSkeletonLoader.tsx` | `ToolsSkeletonLoader` | Loading placeholder |
| `src/components/tools/NumInput.tsx` | `NumInput` | Shared numeric input |
| `src/components/tools/ConcreteCalc.tsx` | `ConcreteCalc` | Concrete calculator |
| `src/components/tools/BeamCalc.tsx` | `BeamCalc` | Beam calculator |
| `src/components/tools/TileCalc.tsx` | `TileCalc` | Tile calculator |
| `src/components/tools/BrickCalc.tsx` | `BrickCalc` | Brick/block calculator (GOLDEN REFERENCE) |
| `src/components/tools/RebarCalc.tsx` | `RebarCalc` | Rebar calculator |
| `src/components/tools/PaintCalc.tsx` | `PaintCalc` | Paint calculator |
| `src/components/tools/SlopeCalc.tsx` | `SlopeCalc` | Slope calculator |
| `src/components/tools/MixRatioCalc.tsx` | `MixRatioCalc` | Mix ratio calculator |
| `src/components/tools/AreaCalculator.tsx` | `AreaCalculator` | Area calculator |
| `src/components/tools/Calculator.tsx` | `Calculator` | Scientific calculator |
| `src/components/tools/CoordinateConverter.tsx` | `CoordinateConverter` | Coordinate converter |
| `src/components/tools/PointsToDxf.tsx` | `PointsToDxf` | Points to DXF |
| `src/components/tools/PdfToWord.tsx` | `PdfToWord` | PDF to Word |
| `src/components/tools/LandMapper.tsx` | `LandMapper` | Land mapper |

## Library Files

| File | Exports |
|---|---|
| `src/lib/tools/engineering.ts` | 8 calculation functions + types |
| `src/lib/tools/hooks.ts` | `usePersistedState`, `useUnitSystem`, `useUrlShare`, `readUrlParams` |
| `src/lib/tools/land-analysis.ts` | OCR coordinate extraction |

## Shared Components (Current)

- `NumInput` — numeric input with Enter-to-next
- No `ToolCalculatorShell`
- No `ToolResultCard`
- No `ToolSelectInput`
- No `ToolAdvancedOptions`
- No `ToolSecondaryActions`
- No `ToolHelpSection`
- No `ToolRelatedTools`

## Ad Placements

- `tools_hero` — hero ad above tool grid (always rendered)
- No `TOOL_AFTER_RESULT` placement on calculator tools
- No `TOOL_DESKTOP_SIDE` placement on calculator tools

## Styles

All in `app/globals.css` lines 1271-1507. Tailwind utilities used inline in components. No CSS modules for tools.
