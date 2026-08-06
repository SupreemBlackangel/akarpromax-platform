# Reference Pattern Analysis — `D:\new program - Copy` (read-only)

Reference app root analyzed: `D:\new program - Copy\akarpromax-web\akar-frontend-src\src\components`.
Read-only — no files copied. Phase 1 primitives are original implementations guided by these
patterns, not copies.

## Reference architecture

- **UI layer**: full **Radix/shadcn-style** kit under `ui/` (`button.tsx`, `card.tsx`, `dialog.tsx`,
  `dropdown-menu.tsx`, `tabs.tsx`, `switch.tsx`, `alert.tsx`, `badge.tsx`, `pagination.tsx`,
  `breadcrumb.tsx`, `input.tsx`, `textarea.tsx`, `select.tsx`, `skeleton.tsx`, `tooltip.tsx`, ...).
- **Technique**: `class-variance-authority` (`cva`) variant records + `@radix-ui/react-*` primitives +
  `cn()` from `@/lib/utils` + Tailwind utility classes referencing a CSS-variable theme
  (`bg-primary`, `text-primary-foreground`, `ring-ring`, `bg-destructive`).
- **Composition**: page/feature components (`PropertyCard`, `OfficeCard`, `BlogCard`, `AdSlot`)
  mix data hooks (`useLanguage`, `useCurrency`, `useFavorites`) with ui primitives.

## Key patterns observed

| Pattern | Reference approach | Phase 1 decision |
| --- | --- | --- |
| Button variants | `cva` variants (default/destructive/outline/secondary/ghost/link) + sizes | Plain typed `Record` variant map; `variant/size/loading/icon/iconPlacement` props. Radix `Slot` (`asChild`) deliberately not adopted |
| Focus visibility | `focus-visible:ring-1 focus-visible:ring-ring` | `focus-visible:shadow-[var(--shadow-focus)]` (3px `--color-primary-ring`) |
| Disabled state | `disabled:pointer-events-none disabled:opacity-50` | Same pattern + `aria-busy` loading spinner |
| Card composition | `Card/Header/Title/Description/Content/Footer` | Same composition shape; added `CardMedia` with `aspect-ratio` + `PressableCard` (keyboard card) |
| Dialog | Radix `@radix-ui/react-dialog` (focus trap, Escape, labelled title) | Hand-rolled with existing `focus-trap.ts` + `useId` title/description, aria-modal, restore focus |
| Select chevron | Radix primitives render their own chevron | CSS background arrow in `.select-arrow` with `[dir="ltr"]` override (no dependency) |
| AdSlot | `window` custom-events (`ad-update`) + `__adSlot_<id>` registry, no API fetch | Feature `AdSlot` stays untouched; new `AdFrame` is the presentational visual pattern (badge, dashed border, variants) |
| Icons | `lucide-react` named imports | Same (`lucide-react` named imports only) |
| i18n | `useLanguage().t()` context + `isRTL` | Primitives take copy via props (no i18n framework in target) |

## Adopted (Phase 1)

- Variant/size records with typed props + `className` extension.
- Card subcomponent composition naming.
- Focus ring on `:focus-visible` only, disabled pointer-events + opacity.
- Lucide named icon imports; directional icons mirrored for RTL.

## Rejected / diverged

- **Radix dependency** — rejected (see `RADIX_PRIMITIVES_INVENTORY.md`); equivalent a11y behavior is
  implemented natively (focus trap, roving tabindex, Escape handling).
- **CVA + `@/lib/utils` cn** — target has no `lib/utils`; `cn` re-implemented as `src/utils/cn.ts`.
- **Window-event ad registry** — replaced by presentational `AdFrame` + existing API-backed `AdSlot`.
- **`asChild` slot pattern** — not needed for Phase 1 scope; `as` prop used where polymorphic.

## Boundary note

Reference components freely mix data hooks into feature components; the target repo's architecture
boundaries (`scripts/check-architecture.mjs`, `check-module-boundaries.mjs`) forbid primitives from
importing feature/server code — Phase 1 primitives respect that and receive data via props.
