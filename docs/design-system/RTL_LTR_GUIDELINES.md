# RTL / LTR Guidelines — AkarProMax

The app is RTL-first (`<html dir="rtl" lang="ar">`), with LTR surfaces needed for
Latin/English content and the dev showcase.

## CSS side — logical properties

New primitives use logical properties / logical utilities everywhere a "side" is meant:

| Physical | Logical (use this) |
| --- | --- |
| `margin-left/right` | `margin-inline-start/end` (`ms-*` / `me-*`) |
| `padding-left/right` | `padding-inline-start/end` (`ps-*` / `pe-*`) |
| `left/right` | `inset-inline-start/end` (`start-*` / `end-*`) |
| `border-left/right` | `border-inline-start/end` (`border-s` / `border-e`) |
| `text-align: left/right` | `text-start` / `text-end` |
| `border-radius` corners | logical radii (`rounded-s-*` / `rounded-e-*`) |

## Directional icons

Chevrons/arrows flip with direction. Implemented with Tailwind `rtl:`/`ltr:` variants:

- Breadcrumb separator: `ChevronRight` (LTR) ↔ `ChevronLeft` (RTL).
- Pagination prev/next buttons: mirror `ChevronLeft`/`ChevronRight` per direction.
- Switch thumb travels inline-end when checked → `translate-x` for LTR, `-translate-x` for RTL
  (`rtl:data-[state=checked]:-translate-x-[calc(100%-2px)]`).
- Select chevron: `.select-arrow` in `tokens.css` positions via `background-position`
  (left in RTL, right in LTR) with a `[dir="ltr"]` override.

## Component positions

- DropdownMenu alignment uses `start-0`/`end-0` (logical), not `left/right`.
- Tooltip `side="start"`/`side="end"` map to `end-full`/`start-full` (logical).
- Search icon + PasswordInput toggle use `start-*`/`end-*` insets.

## What stays physical (intentionally)

- Full-bleed decorative gradients, hero visuals, and legacy `.reference-app` CSS are untouched
  (Phase 2+ migration item).
- `@keyframes` transforms on legacy elements are not converted.

## Testing

- All new primitives assert logical utilities/`rtl:` variants in SSR tests where the direction matters
  (Switch thumb, Breadcrumbs, Pagination).
- The dev showcase renders in `dir="rtl" lang="ar"`; LTR behavior is covered by `rtl:`/`ltr:` variant
  presence in markup.
