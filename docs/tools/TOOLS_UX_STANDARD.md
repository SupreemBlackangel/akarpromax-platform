# Tools UX Standard

Official standard for all /tools pages in AkarPromax.

## Tool Types

| Type | Description | UX Pattern |
|---|---|---|
| **Calculator** | Numeric inputs → calculate → result | Form grid → Result card |
| **Converter** | Coordinate/unit conversion | Input fields → Converted values |
| **File Tool** | Upload → process → download | Dropzone → Progress → Download |
| **Map Tool** | Upload/image → map interaction | Upload → Map → Results table |
| **Utility** | Scientific calculator, etc. | Specialized interface |

## Safe Zone Rule (MANDATORY)

On mobile devices, the primary tool interaction zone must remain free of advertisements, large illustrations, sidebars, and non-essential content.

For calculators, inputs, the primary calculation action, and results receive absolute visual priority.

```
PRIMARY TASK
↓
PRIMARY ACTION
↓
RESULT / OUTPUT
↓
SECONDARY ACTIONS
↓
SERVICE CTA
↓
ADVERTISEMENT
↓
HELPFUL CONTENT
```

## Mobile Ad Rule

```
Before result = 0 ads
After result = max contextual placement per central policy
```

## Desktop Ad Rule

```
Contextual side placements permitted if they don't interrupt task
Calculator remains dominant — ad does not become Hero
```

## Hidden Ad Rule

If an ad is not required on mobile:
- DO NOT RENDER IT
- DO NOT render → CSS display:none (this may still record impression)

## Touch Targets

| Element | Minimum Height |
|---|---|
| Interactive buttons | >=44px |
| Numeric inputs | ~48px (mobile), ~44px (desktop) |
| Select inputs | ~48px (mobile), ~44px (desktop) |
| Checkbox labels | >=44px |

## Font Size (Mobile)

Input font size: `text-[16px]` on mobile to prevent Safari auto-zoom.

## Focus Management

- All interactive elements: `focus:outline-none focus:ring-2 focus:ring-blue-500`
- Error state: focus first invalid control
- Advanced options: `aria-expanded`, `aria-controls`, keyboard accessible

## RTL Support

- All tools support Arabic (RTL), English (LTR), Turkish (LTR)
- Coordinate values: `dir="ltr"` for numeric readablity
- Unit labels: maintain correct order under RTL

## Dark Mode

All components support dark mode via Tailwind `dark:` prefix.
- Inputs, selects, results, uploads, ads, tool cards all have dark variants.

## Accessibility

- `aria-live="polite"` on result cards
- `aria-describedby` for error states
- `aria-invalid` on invalid inputs
- `aria-label` on selects
- `role="alert"` on error messages
- Keyboard navigation for all interactive elements
