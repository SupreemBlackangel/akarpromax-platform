# Visual Identity Audit

Generated: 2026-08-06
Source: `app/globals.css` (authoritative current identity) + `:root` tokens. Extracted with automated color counting (1166 hex occurrences, 394 unique).

## Core identity (confirmed, to preserve)

| Role | Value | Count | Sources | Decision | Replacement token |
| --- | --- | --- | --- | --- | --- |
| Primary | `#1769ff` | 79 | everywhere (buttons, links, brand mark) | KEEP — core identity | `--color-primary` |
| Primary hover | `#0e4fd2` | ~9 | `.location-save:hover`, header, brand | KEEP | `--color-primary-hover` |
| Primary active/dark | `#155dc7` | 6 | pressed states | KEEP | `--color-primary-active` |
| Ink / text | `#0b214c` | 8 (+ `--ink`) | headings, strong text | KEEP | `--color-text-primary` |
| Paper / background | `#fbfcff` | (`--paper`) | body bg | KEEP | `--color-background` |
| Sky / soft primary fill | `#edf3ff` | 14 (+`--sky`) | section backgrounds | KEEP | `--color-surface-soft` (alias) |
| Lavender / muted surface | `#f5f7ff` | (`--lavender`) | alternating surfaces | KEEP | `--color-surface-muted` |
| Line / border | `#dce5f4` | (`--line`) | borders, dividers | KEEP | `--color-border` |
| Muted text | `#7e8ca5` | (`--muted`) | secondary text | KEEP | `--color-text-muted` |
| Gold / accent | `#d8af55` | (`--gold`) | premium accents | KEEP | `--color-accent` |

## Dominant hardcoded light palette (candidates for token backfill)

| Value | Count | Use | Decision | Replacement |
| --- | --- | --- | --- | --- |
| `#fff` | 109 | surfaces, inverse text | KEEP as `--color-surface` / `--color-text-inverse` | `--color-surface`, `--color-primary-foreground` |
| `#d9e5f8` | 17 | control borders | Tokenize | `--color-border-strong` |
| `#f8fbff` | 13 | control backgrounds | Tokenize | `--color-surface-input` |
| `#eaf2ff` / `#eef5ff` | 16 | soft primary fills/hover | Tokenize | `--color-secondary`, `--color-primary-soft` |
| `#667895` / `#536781` / `#8c9ab0` / `#7d8eaa` | ~31 | secondary text | Tokenize | `--color-text-secondary` / `--color-text-muted` |
| `#6ea1ff` / `#5f88c7` / `#9ec2ff` / `#b7d2ff` | ~33 | focus borders, primary tints | Tokenize | `--color-border-focus`, `--color-primary-ring` |
| `#a5b2c6` | 6 | placeholders, disabled | Tokenize | `--color-text-placeholder`, `--color-disabled` |
| `#dc2626` | 6 | error | Tokenize | `--color-danger` |
| `#fef2f2` | 5 | error surface | Tokenize | `--color-danger-soft` |
| `#e6f8ef` | 7 | success surface | Tokenize | `--color-success-soft` |
| `#155dc7`/`#1459c7` | 8 | primary deep | Tokenize | `--color-primary-active` |

## Dominant dark palette (`html[data-theme="dark"]`)

| Value | Count | Use | Replacement (dark) |
| --- | --- | --- | --- |
| `#10264c` | 16 | panel/section bg | `--color-surface-muted` |
| `#152a4b` | 15 | cards | `--color-surface` |
| `#0f1d33` | 28 | page/input bg | `--color-background` / `--color-surface-input` |
| `#1d3559` | 12 | elevated | `--color-surface-elevated` |
| `#304867` / `#263a5a` | 59 | borders | `--color-border` / `--color-border-strong` |
| `#e8efff` | 26 | text | `--color-text-primary` |
| `#b8c9e2` / `#8ea2c1` | ~14 | secondary text | `--color-text-secondary` / `--color-text-muted` |
| `#82adff` / `#6ea1ff` | ~17 | primary in dark | `--color-primary` (dark) / `--color-border-focus` |

## Gradients

- Brand/hero/welcome bands use `linear-gradient(100deg, #f7f2e9, #fffdf7, #eef4ff)` (light) and dark equivalents — declared **once** in globals (`.welcome-band`, `.hero-ad`, dark `.cad-preview-canvas` radial). Gradient usage is contained; no new gradients in primitives.

## Focus / overlay

- Focus rings today: `outline: 2px solid #b7d2ff` / `box-shadow 0 0 0 3px rgba(23,105,255,.12)`.
  Replacement: `--color-border-focus` (`#6ea1ff`) + `--shadow-focus` (3px ring).
- Overlays: `.account-backdrop`/`.modal-backdrop` use `rgba(7,20,41,.58)` family.
  Replacement: `--color-overlay` `rgba(7,20,41,.58)`.

## Logo variants & icon style

- Brand mark: `--blue` square with asymmetric radius (`11px 11px 2px 11px`) + white glyph — **not** changed in Phase 1.
- Icons: `lucide-react` named imports (tree-shakeable). Directional chevrons already mirrored via `inset-inline`/`margin-inline-start` in places — new primitives use logical properties throughout.

## Card style (identity)

- Radius 10–12px, border `1px solid #d9e5f8`-family, shadow `0 14px 26px rgba(25,64,123,.16)`-family, padding 12–20px.
  Card tokens: `--radius-lg` (12), `--color-border`, `--shadow-md`/`--shadow-lg`.

## Conclusion

The identity is a single coherent blue/gold on white/paper system with a navy dark mode. No conflicting or unusable primary values were found. **No primary colors change.** Phase 1 only centralizes these values into semantic tokens; legacy selectors continue to work because tokens.css is loaded before them and legacy CSS still carries literals (token backfill of legacy selectors is a Phase 2+ migration item).
