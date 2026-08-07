# Tools Inventory

All 14 tools in the /tools page.

## Route Architecture

Single page: all tools render on `/tools` via `?tool=<id>` query param. No sub-routes.

## Tool Registry (src/data/toolsData.ts)

| # | ID | Type | Category | Status |
|---|---|---|---|---|
| 1 | concrete | calculator | engineering | available |
| 2 | beam | calculator | engineering | available |
| 3 | tile | calculator | engineering | available |
| 4 | brick | calculator | engineering | available |
| 5 | rebar | calculator | engineering | available |
| 6 | paint | calculator | engineering | available |
| 7 | slope | calculator | engineering | available |
| 8 | mix | calculator | engineering | available |
| 9 | area | calculator | surveying | available |
| 10 | calculator | utility | general | available |
| 11 | coordinate | converter | surveying | available |
| 12 | points2dxf | file_tool | surveying | available |
| 13 | pdf2word | file_tool | document | new |
| 14 | landmapper | map_tool | surveying | new |

## Shared Components (Phase 6)

| Component | File | Status |
|---|---|---|
| `ToolCalculatorShell` | `src/components/tools/ToolCalculatorShell.tsx` | ✅ Used by all 14 tools |
| `ToolNumericInput` | `src/components/tools/ToolNumericInput.tsx` | ✅ Used by calculators |
| `ToolSelectInput` | `src/components/tools/ToolSelectInput.tsx` | ✅ Used by rebar, mix |
| `ToolResultCard` | `src/components/tools/ToolResultCard.tsx` | ✅ Used by calculators |
| `ToolAdvancedOptions` | `src/components/tools/ToolAdvancedOptions.tsx` | ✅ Used by brick, tile, paint |
| `ToolSecondaryActions` | `src/components/tools/ToolSecondaryActions.tsx` | ✅ Used by all 14 tools |
| `ToolAdPolicy` | `src/components/tools/ToolAdPolicy.tsx` | ✅ Central ad placement policy |

## Component Files

| File | Export | Shared Components |
|---|---|---|
| `src/components/tools/ToolsPageClient.tsx` | `ToolsPageClient` | Infrastructure |
| `src/components/tools/ToolsGate.tsx` | `ToolsGate` | Auth gate |
| `src/components/tools/ToolCard.tsx` | `ToolCard` | Tool card |
| `src/components/tools/NumInput.tsx` | `NumInput` | Legacy (kept for compatibility) |
| `src/components/tools/BrickCalc.tsx` | `BrickCalc` | Shell, NumericInput, AdvancedOptions, ResultCard, SecondaryActions |
| `src/components/tools/ConcreteCalc.tsx` | `ConcreteCalc` | Shell, NumericInput, SecondaryActions |
| `src/components/tools/BeamCalc.tsx` | `BeamCalc` | Shell, NumericInput, ResultCard, SecondaryActions |
| `src/components/tools/TileCalc.tsx` | `TileCalc` | Shell, NumericInput, AdvancedOptions, ResultCard, SecondaryActions |
| `src/components/tools/RebarCalc.tsx` | `RebarCalc` | Shell, NumericInput, SelectInput, ResultCard, SecondaryActions |
| `src/components/tools/PaintCalc.tsx` | `PaintCalc` | Shell, NumericInput, AdvancedOptions, ResultCard, SecondaryActions |
| `src/components/tools/SlopeCalc.tsx` | `SlopeCalc` | Shell, NumericInput, ResultCard, SecondaryActions |
| `src/components/tools/MixRatioCalc.tsx` | `MixRatioCalc` | Shell, NumericInput, SelectInput, ResultCard, SecondaryActions |
| `src/components/tools/Calculator.tsx` | `Calculator` | Shell |
| `src/components/tools/CoordinateConverter.tsx` | `CoordinateConverter` | Shell, SecondaryActions |
| `src/components/tools/AreaCalculator.tsx` | `AreaCalculator` | Shell, NumericInput, SecondaryActions |
| `src/components/tools/PointsToDxf.tsx` | `PointsToDxf` | Shell |
| `src/components/tools/PdfToWord.tsx` | `PdfToWord` | Shell |
| `src/components/tools/LandMapper.tsx` | `LandMapper` | Shell, SecondaryActions |

## Library Files

| File | Exports |
|---|---|
| `src/lib/tools/engineering.ts` | 8 calculation functions + types |
| `src/lib/tools/hooks.ts` | `usePersistedState`, `useUnitSystem`, `useUrlShare`, `readUrlParams` |
| `src/lib/tools/land-analysis.ts` | OCR coordinate extraction |
| `src/lib/cad/types.ts` | CAD document types |
| `src/lib/cad/validation.ts` | CAD validation + sanitization |
