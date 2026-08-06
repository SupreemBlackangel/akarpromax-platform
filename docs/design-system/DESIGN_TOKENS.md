# Design Tokens — AkarProMax (Phase 1)

Source of truth: `src/styles/tokens.css` (single file). Imported at the top of
`app/globals.css` before the legacy rules, so legacy selectors keep working and
new primitives consume tokens directly.

## Architecture

- `:root` → light theme defaults (matches existing `--ink/--blue/--sky/...` values — no color changes).
- `html[data-theme="dark"]` → dark overrides (matches existing `html[data-theme="dark"]` overrides).
- `@media (prefers-reduced-motion: reduce)` → motion tokens collapse to 0.01ms.
- `app/globals.css` maps a curated subset into `@theme inline`, so Tailwind utilities
  like `bg-primary`, `text-primary`, `border-border`, `font-sans` inline `var(--color-*)`
  references that resolve at runtime per theme.

## Groups

| Group | Tokens | Notes |
| --- | --- | --- |
| Surfaces | `--color-background` `--color-surface` `--color-surface-elevated` `--color-surface-muted` `--color-surface-soft` `--color-surface-input` | Light = paper/white/lavender/sky family; dark = navy panels |
| Text | `--color-text-primary/secondary/muted/placeholder/inverse` | |
| Borders | `--color-border` `--color-border-strong` `--color-border-focus` `--color-primary-ring` | Focus ring = `--shadow-focus` |
| Brand | `--color-primary(-hover/-active/-soft/-foreground)` `--color-secondary(/-hover/-foreground)` `--color-accent(/-foreground)` | `#1769ff` family unchanged |
| Feedback | `success/warning/danger/info` each with `-soft` and `-foreground` | |
| State | `--color-disabled` `--color-disabled-surface` `--color-overlay` | Overlay = existing `rgba(7,20,41,.58)` |
| Spacing | `--space-0..24` (2px scale → 96px) | Used via `px-[var(--space-5)]` etc. |
| Radius | `--radius-none/sm/md/lg/xl/2xl/pill` | Card = `--radius-lg` (12px) |
| Shadows | `--shadow-none/sm/md/lg/overlay/focus` | Card = `--shadow-sm`/`--shadow-md` |
| Typography | `--font-family-arabic` `--font-family-latin`, `--font-size-xs..display`, `--font-weight-*`, `--line-height-*` | Fixes pre-existing `--font-site` gap by mapping `font-sans` to `--font-family-arabic` |
| Motion | `--motion-fast/normal/slow` `--easing-standard/emphasized` | Reduced-motion collapses to 0.01ms |
| Layers | `--layer-base/sticky/header/dropdown/overlay/dialog/toast/tooltip` | **Only** source of z-index values in new components |

## Usage rules

- New components must reference tokens (`var(--color-*)`), never raw hex/rgb.
- New components must use layer tokens for z-index (`z-[var(--layer-*)]`), never `z-10`/`z-[999]`.
- Spacing via `--space-*`; radius via `--radius-*`; shadows via `--shadow-*`; motion via `--motion-*`.
- Legacy `app/globals.css` selectors are intentionally untouched (token backfill is Phase 2+).

## Backward compatibility

Legacy `:root` vars (`--ink`, `--blue`, ...) remain defined in `globals.css` for old selectors;
`tokens.css` introduces the semantic `--color-*` set alongside them. No existing value changes.
