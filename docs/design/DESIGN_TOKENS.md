# Design Tokens

Extracted from `app/globals.css` and standardized for Phase 2 implementation.

## Color Palette

### Core Brand Colors

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--ink` | `#0b214c` | `#e8edf5` | Primary text, headings |
| `--blue` | `#1769ff` | `#4d8fff` | Links, buttons, CTAs |
| `--blue-dark` | `#0e4fd2` | `#6ba3ff` | Hover states, emphasis |
| `--sky` | `#edf3ff` | `#1a2a4a` | Light backgrounds, cards |
| `--lavender` | `#f5f7ff` | `#111b30` | Page backgrounds |
| `--paper` | `#fbfcff` | `#0d1526` | Content areas, modals |
| `--line` | `#dce5f4` | `#2a3a5c` | Borders, dividers |
| `--muted` | `#7e8ca5` | `#8a9ab5` | Secondary text, labels |
| `--gold` | `#d8af55` | `#e8c577` | Premium, featured items |

### Semantic Colors

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--success` | `#16a34a` | `#22c55e` | Success states |
| `--error` | `#dc2626` | `#ef4444` | Errors, destructive actions |
| `--warning` | `#f59e0b` | `#fbbf24` | Warnings, caution |

## Typography

### Font Families

| Token | Arabic | Latin | Usage |
|-------|--------|-------|-------|
| `--font-heading` | IBM Plex Sans Arabic | Inter | Headings, UI elements |
| `--font-body` | Noto Sans Arabic | Segoe UI | Body text, paragraphs |
| `--font-display` | Noto Kolfi Arabic | — | Display text, hero sections |

### Font Sizes

| Token | Value | Usage |
|-------|-------|-------|
| `--text-xs` | `0.75rem` | Captions, labels |
| `--text-sm` | `0.875rem` | Small text, secondary |
| `--text-base` | `1rem` | Body text |
| `--text-lg` | `1.125rem` | Subheadings |
| `--text-xl` | `1.25rem` | Section headings |
| `--text-2xl` | `1.5rem` | Page headings |
| `--text-3xl` | `1.875rem` | Hero headings |

### Font Weights

| Token | Value | Usage |
|-------|-------|-------|
| `--weight-normal` | `400` | Body text |
| `--weight-medium` | `500` | Emphasis |
| `--weight-semibold` | `600` | Headings |
| `--weight-bold` | `700` | Strong emphasis |

## Spacing

| Token | Value | Usage |
| `--space-1` | `0.25rem` | Tight spacing |
| `--space-2` | `0.5rem` | Compact spacing |
| `--space-3` | `0.75rem` | Default spacing |
| `--space-4` | `1rem` | Standard spacing |
| `--space-5` | `1.25rem` | Medium spacing |
| `--space-6` | `1.5rem` | Large spacing |
| `--space-8` | `2rem` | Section spacing |
| `--space-10` | `2.5rem` | Page spacing |
| `--space-12` | `3rem` | Large page spacing |

## Borders & Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | `0.25rem` | Small elements |
| `--radius-md` | `0.5rem` | Cards, inputs |
| `--radius-lg` | `0.75rem` | Modals, panels |
| `--radius-xl` | `1rem` | Large containers |
| `--radius-full` | `9999px` | Pills, circles |

## Shadows

| Token | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | Subtle elevation |
| `--shadow-md` | `0 4px 6px rgba(0,0,0,0.1)` | Cards, dropdowns |
| `--shadow-lg` | `0 10px 15px rgba(0,0,0,0.1)` | Modals, popovers |
| `--shadow-xl` | `0 20px 25px rgba(0,0,0,0.15)` | Floating elements |

## Breakpoints

| Token | Value | Usage |
|-------|-------|-------|
| `--bp-sm` | `640px` | Mobile landscape |
| `--bp-md` | `768px` | Tablet |
| `--bp-lg` | `1024px` | Desktop |
| `--bp-xl` | `1280px` | Large desktop |
| `--bp-2xl` | `1536px` | Extra large |

## Container

| Token | Value | Usage |
|-------|-------|-------|
| `--container-max` | `1140px` | Max content width |
| `--container-padding` | `calc((100% - 1140px) / 2)` | Horizontal padding |

## Layout

| Token | Value | Usage |
|-------|-------|-------|
| `--sidebar-width` | `280px` | Admin sidebar |
| `--header-height` | `64px` | Fixed header |
| `--footer-height` | `80px` | Fixed footer |

## Z-Index Scale

| Token | Value | Usage |
|-------|-------|-------|
| `--z-base` | `1` | Default stacking |
| `--z-dropdown` | `10` | Dropdowns, selects |
| `--z-sticky` | `20` | Sticky headers |
| `--z-modal` | `30` | Modals, dialogs |
| `--z-toast` | `40` | Toast notifications |
| `--z-tooltip` | `50` | Tooltips |

## Transitions

| Token | Value | Usage |
|-------|-------|-------|
| `--transition-fast` | `150ms ease` | Quick interactions |
| `--transition-normal` | `250ms ease` | Standard transitions |
| `--transition-slow` | `350ms ease` | Complex animations |
