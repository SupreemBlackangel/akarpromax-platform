# Component Migration Matrix — Phase 1 foundation → future adopters

Maps the **existing** duplicated/large feature components to the **new** primitives. Phase 1 does
**not** migrate feature pages (out of scope); this matrix is the roadmap for Phase 2+ adoption.

## Matrix

| Existing (status quo) | Location | New primitive | Phase 1 action | Phase 2+ adoption |
| --- | --- | --- | --- | --- | --- |
| `.button-primary` / `.button-quiet` | `app/globals.css` + legacy pages | `ui/Button` | created, unused by legacy | replace legacy button markup in pages |
| `shared/Input` (uses legacy `input-*` classes) | `src/components/shared/Input.tsx` | `ui/Textarea`, `ui/SearchInput`, `ui/PasswordInput`, `ui/InputGroup`, `ui/Select`, `ui/Checkbox`, `ui/RadioGroup`, `ui/Switch` | created | migrate forms/account wizard to ui controls |
| `.account-dialog` / `shared/Modal` | globals + `src/components/shared/Modal.tsx` | `ui/Dialog` | created (Modal untouched) | replace Modal usages with Dialog |
| `.reference-card` / card blocks | globals + feature cards | `ui/Card`, `ui/PressableCard` | created | rebuild PropertyCard/OfficeCard/blog cards on Card |
| `.ad-slot` styling + `AdSlot` | globals + `src/components/AdSlot.tsx` | `ui/AdFrame` (presentational) | created; `AdSlot` untouched | wrap `AdSlot` output in `AdFrame` |
| `.account-tabs` etc. | globals | `ui/Tabs` | created | replace account tab implementation |
| `.account-steps`, pagination controls | globals | `ui/Pagination`, `ui/Breadcrumbs` | created | adopt in listing/listing-detail pages |
| `.sidebar-link` | globals | `ui/NavItem` | created | adopt in sidebar/header nav |
| `.section-kicker` / section titles | globals | `ui/PageHeader` | created | adopt in content pages |
| Status/notice banners | globals | `ui/Alert`, `ui/Badge`, `ui/Feedback` (Empty/Error/Loading/Skeleton) | created | adopt in dashboards |
| Tooltips/dropdowns | globals (`.menu-trigger`, `.country-dropdown`) | `ui/Tooltip`, `ui/DropdownMenu` | created | adopt in header/location pickers |
| `.container` (1140px) | globals | `layout/PageContainer`, `Section`, `Stack`, `Inline`, `Grid`, `Divider` | created | replace `.container`/`.content-section` wrappers |

## Intentional non-changes (Phase 1)

- `app/page.tsx` and all feature pages (`.tsx`) — not rebuilt.
- `app/api/**`, `lib/db/**`, `lib/runtime-db.ts`, `lib/auth/**`, `lib/security/**`, `drizzle*` — untouched.
- Legacy selector rules in `app/globals.css` — untouched except the top import + `:root` + `@theme inline` block.
- `shared/Modal`, `shared/Input`, `ui/FormField`, `ui/FormError`, `ui/VisuallyHidden`, `ui/SkipLink`,
  `ui/focus-trap.ts` (Phase 0) — kept; new primitives coexist.

## Migration sequencing (future phases)

1. Adopt `PageContainer/Section/Grid/Stack` in page shells.
2. Swap legacy form controls → ui controls in AccountDialog + service forms.
3. Swap `Modal` → `Dialog`, legacy card blocks → `Card`/`PressableCard`.
4. Wrap ad rendering with `AdFrame`.
5. Backfill legacy hardcoded hex in `globals.css` with tokens (token-driven refactor of legacy CSS).
6. Delete superseded legacy classes once no callers remain (gated by grep audit).
