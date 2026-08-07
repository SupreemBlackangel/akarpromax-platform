# Block Calculator — Golden Reference

The Block Calculator (`BrickCalc.tsx`) is the canonical reference implementation for all engineering tools.

## Components Used

| Component | Purpose |
|---|---|
| `ToolCalculatorShell` | Title, subtitle, dir wrapper |
| `ToolNumericInput` | Enhanced numeric input with unit, min/max, aria |
| `ToolAdvancedOptions` | Collapsible advanced settings |
| `ToolResultCard` | Standardized result metrics |
| `ToolSecondaryActions` | Copy/share actions |

## Input Layout

Primary inputs visible by default:
- Wall Length (m)
- Wall Height (m)

Advanced inputs collapsed:
- Brick Length (mm)
- Brick Width (mm)
- Brick Height (mm)
- Mortar Thickness (mm)

## Result Card

3 metrics in grid:
- Bricks Needed (primary)
- Cement Bags
- Sand (tons)

## Mobile Safe Zone

```
Title
↓
Wall Length / Wall Height inputs
↓
[Advanced: Brick Dimensions] (collapsed)
↓
[Example button]
↓
Result Card (bricks, cement, sand)
↓
Secondary Actions (copy, share)
```

No ads above result. No illustrations interrupting flow.

## Verification Checklist

- [ ] TypeScript clean
- [ ] 160/160 tests pass
- [ ] Touch targets >=44px
- [ ] Focus ring visible
- [ ] RTL renders correctly
- [ ] Dark mode renders correctly
- [ ] No horizontal overflow at 320px
- [ ] Advanced options collapsed by default
- [ ] Result announced to screen readers
