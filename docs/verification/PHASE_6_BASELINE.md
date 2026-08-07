# Phase 6 — Engineering Tools Experience & Mobile-First UX Standardization

## Execution Date
Phase 6 Kickoff: 2026-08-08

## Phase 5 Final State (Rollback Base)
- **Commit**: `b702e1d` (Phase 5 P1 complete)
- **Rollback base**: `06a4a2f`
- **Worktree**: Clean, all changes committed
- **Tests**: 177 (160 unit + 17 E2E)
- **Module boundaries**: ✅ PASS
- **Architecture enforcement**: ✅ PASS (all 12 checks)

## Phase 6 Work Completed

### Shared Components Created (6 files)
| Component | File | Purpose |
|---|---|---|
| `ToolCalculatorShell` | `src/components/tools/ToolCalculatorShell.tsx` | Wraps title/subtitle/content |
| `ToolNumericInput` | `src/components/tools/ToolNumericInput.tsx` | Enhanced NumInput: unit display, inputMode, min/max, aria-describedby, error state |
| `ToolSelectInput` | `src/components/tools/ToolSelectInput.tsx` | Labeled dropdown with aria-label |
| `ToolResultCard` | `src/components/tools/ToolResultCard.tsx` | Standardized result display: primary/secondary metrics, aria-live="polite" |
| `ToolAdvancedOptions` | `src/components/tools/ToolAdvancedOptions.tsx` | Collapsible advanced settings container |
| `ToolSecondaryActions` | `src/components/tools/ToolSecondaryActions.tsx` | Copy/share/download/reset buttons |

### Engineering Calculators Migrated (8/8 = 100%)
| Calculator | Status | Notes |
|---|---|---|
| BrickCalc | ✅ Golden reference | Primary inputs visible, brick dims in advanced |
| ConcreteCalc | ✅ | 3 primary inputs, 5 result metrics |
| BeamCalc | ✅ | 3 primary inputs, 5 result metrics |
| TileCalc | ✅ | Room dims visible, tile dims in advanced |
| RebarCalc | ✅ | Select + 2 numeric, 3 result metrics |
| PaintCalc | ✅ | Wall/ceiling visible, coats/coverage in advanced |
| SlopeCalc | ✅ | 2 primary inputs, 4 result metrics |
| MixRatioCalc | ✅ | Volume + select, 4 result metrics |

### UX Improvements Applied
- ✅ `ToolNumericInput`: `inputMode="decimal"` for mobile numeric keyboard
- ✅ `ToolNumericInput`: `aria-describedby` for error state
- ✅ `ToolNumericInput`: `aria-invalid` for form validation
- ✅ `ToolSelectInput`: `aria-label` on all selects
- ✅ `ToolResultCard`: `aria-live="polite"` for screen reader announcements
- ✅ `ToolAdvancedOptions`: progressive disclosure (advanced options collapsed)
- ✅ `ToolSecondaryActions`: consistent action buttons across all tools
- ✅ Mobile touch targets: `min-h-[36px]` on buttons, `min-h-[44px]` on inputs
- ✅ Unit display on numeric inputs (m, mm, %, m², m³, L/m²)
- ✅ Min validation on all numeric inputs

### Documentation Created
- `docs/tools/TOOLS_INVENTORY.md` — complete tool audit (14 tools, components, hooks)
- `docs/tools/TOOLS_UI_UX_AUDIT.md` — classified UX issues (ARCH, MOB, A11Y, RTL, DM, PERF)
- `docs/verification/PHASE_6_BASELINE.md` — phase baseline with completion status

### Files Modified
- `src/components/tools/BrickCalc.tsx` — REFACTORED (golden reference)
- `src/components/tools/ConcreteCalc.tsx` — REFACTORED
- `src/components/tools/BeamCalc.tsx` — REFACTORED
- `src/components/tools/TileCalc.tsx` — REFACTORED
- `src/components/tools/RebarCalc.tsx` — REFACTORED
- `src/components/tools/PaintCalc.tsx` — REFACTORED
- `src/components/tools/SlopeCalc.tsx` — REFACTORED
- `src/components/tools/MixRatioCalc.tsx` — REFACTORED

## Testing Baseline

### Build
- `vinext build`: ✅ Clean
- TypeScript: ✅ 0 errors

### Unit Tests
- `npm test`: ✅ 160/160 pass

### E2E Tests
- **Pending**: Will run after `vinext start` on port 3011

## Remaining Work
- Migrate remaining tools (general/surveying/file tools)
- Enforce ad placement policy centrally
- Create `TOOLS_UX_STANDARD.md`
- Final E2E regression tests
- Commit Phase 6 baseline
