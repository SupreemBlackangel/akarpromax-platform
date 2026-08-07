# Tools Responsive Acceptance

All 14 tools must pass responsive acceptance at the following breakpoints:

## Breakpoints

```
320px  — Minimum supported (iPhone SE)
360px  — Common Android
375px  — iPhone standard
390px  — iPhone Pro
412px  — Pixel
430px  — iPhone Pro Max
768px  — Tablet portrait
1024px — Tablet landscape
1280px — Desktop
1440px — Large desktop
```

## Acceptance Criteria

For each tool at each applicable breakpoint:

```
scrollWidth <= clientWidth (no horizontal overflow)
Touch targets >= 44px
Primary CTA reachable
Output/result reachable
No ad before result/output
No large illustration interrupting task
No sidebar interrupting task
```

## Tool-Specific Notes

### Calculators (Brick, Concrete, Beam, Tile, Rebar, Paint, Slope, Mix)
- Grid: 2-col on mobile, 3-col on desktop
- Advanced options: collapsed on mobile
- Result: visible after calculation

### Scientific Calculator
- Button grid: 5-col always
- Buttons: 48px height (touch-optimized)

### Coordinate Converter
- Input fields: full-width on mobile
- Direction selects: side-by-side on desktop
- UTM zone buttons: horizontal scroll if needed

### Area Calculator
- Shape selector: horizontal scroll on mobile
- Polygon textarea: full-width
- Triangle inputs: 3-col on all sizes

### Points to DXF
- Dropzone: full-width
- Textarea: full-width
- Settings row: wrap on mobile

### PDF to Word
- Upload button: full-width
- Progress bar: full-width
- Download: centered

### Land Mapper
- Upload: full-width
- Map: 400px height on desktop, full-width on mobile
- Results table: scrollable
