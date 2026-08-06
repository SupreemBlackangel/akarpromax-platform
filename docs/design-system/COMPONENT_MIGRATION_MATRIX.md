# Component Migration Matrix — Phase 1 foundation → Phase 2 shell → future adopters

Maps the **existing** duplicated/large feature components to the **new** primitives. Phase 1
created primitives; Phase 2 built the unified public shell on them. This matrix is now the
roadmap for Phase 3+ adoption across feature pages.

## Matrix

| Existing (status quo) | Location | New primitive | Phase 1 action | Phase 2 action | Phase 3+ adoption |
| --- | --- | --- | --- | --- | --- | --- |
| `.button-primary` / `.button-quiet` | `app/globals.css` + legacy pages | `ui/Button` | created | used by `public-header`, `cookie-notice`, `office-promotion` | replace legacy button markup in pages |
| `shared/Input` (uses legacy `input-*` classes) | `src/components/shared/Input.tsx` | `ui/Textarea`, `ui/SearchInput`, `ui/PasswordInput`, `ui/InputGroup`, `ui/Select`, `ui/Checkbox`, `ui/RadioGroup`, `ui/Switch` | created | — | migrate forms/account wizard to ui controls |
| `.account-dialog` / `shared/Modal` | globals + `src/components/shared/Modal.tsx` | `ui/Dialog` | created | — | replace Modal usages with Dialog |
| `.reference-card` / card blocks | globals + feature cards | `ui/Card`, `ui/PressableCard` | created | — | rebuild PropertyCard/OfficeCard/blog cards on Card |
| `.ad-slot` styling + `AdSlot` | globals + `src/components/AdSlot.tsx` | `ui/AdFrame` (presentational) | created | `ad-slot-frame.tsx` composes `AdSlot` at shell level | wrap `AdSlot` output in `AdFrame` |
| `.account-tabs` etc. | globals | `ui/Tabs` | created | — | replace account tab implementation |
| `.account-steps`, pagination controls | globals | `ui/Pagination`, `ui/Breadcrumbs` | created | `Breadcrumbs` used by shell layout | adopt in listing/listing-detail pages |
| `.sidebar-link` | globals | `ui/NavItem` | created | used by `desktop-navigation`, `mobile-navigation` | adopt in sidebar/header nav |
| `.section-kicker` / section titles | globals | `ui/PageHeader` | created | used by shell layout (optional `pageHeader`) | adopt in content pages |
| Status/notice banners | globals | `ui/Alert`, `ui/Badge`, `ui/Feedback` (Empty/Error/Loading/Skeleton) | created | — | adopt in dashboards |
| Tooltips/dropdowns | globals (`.menu-trigger`, `.country-dropdown`) | `ui/Tooltip`, `ui/DropdownMenu` | created | — | adopt in header/location pickers |
| `.container` (1140px) | globals | `layout/PageContainer`, `Section`, `Stack`, `Inline`, `Grid`, `Divider` | created | `PageContainer` used by shell regions | replace `.container`/`.content-section` wrappers |
| `shared/Header` (legacy nav) | `src/components/shared/Header.tsx` | `public-header` + `desktop-navigation` + `mobile-navigation` | — | replaced in public shell (file kept for admin) | — |
| `shared/Footer` (legacy footer) | `src/components/shared/Footer.tsx` | `public-footer` | — | replaced in public shell (file kept) | — |
| inline `AdSlot` in `PublicPageShell` | `src/components/PublicPageShell.tsx` | `ad-slot-frame.tsx` | — | replaced | — |

## Intentional non-changes (Phase 2)

- `app/page.tsx` landing — not rebuilt; only its `#top`→`#main-content` anchors retargeted.
- `app/api/**`, `lib/db/**`, `lib/runtime-db.ts`, `lib/auth/**`, `lib/security/**`, `drizzle*` — untouched.
- Legacy selector rules in `app/globals.css` — untouched (reduced-motion block pre-existed).
- `shared/Modal`, `shared/Input`, `ui/FormField`, `ui/FormError`, `ui/VisuallyHidden`, `ui/SkipLink`,
  `ui/focus-trap.ts` (Phase 0) — kept; new primitives coexist.
- `shared/Header` (admin) — kept; public shell no longer uses it.
- `NewsTicker.tsx` — kept unchanged.

## Migration sequencing (Phase 3+)

1. Adopt `PageContainer/Section/Grid/Stack` in feature page shells.
2. Swap legacy form controls → ui controls in AccountDialog + service forms.
3. Swap `Modal` → `Dialog`, legacy card blocks → `Card`/`PressableCard`.
4. Wrap ad rendering with `AdFrame`.
5. Backfill legacy hardcoded hex in `globals.css` with tokens (token-driven refactor of legacy CSS).
6. Delete superseded legacy classes once no callers remain (gated by grep audit).
