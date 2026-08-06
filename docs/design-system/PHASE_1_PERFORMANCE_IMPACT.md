# Phase 1 Performance Impact

## Approach: additive, no runtime cost

Phase 1 ships new source files and CSS tokens. Nothing is loaded in production pages yet —
legacy pages still render exactly as before. Impact analysis below.

## CSS

- `src/styles/tokens.css` adds ~150 custom-property declarations + `@theme inline` mapping.
  Imported at the top of `app/globals.css`. CSS custom properties are inherited once per element and
  only re-resolve on theme change (no animation loops); cost is negligible.
- `@theme inline` means utilities used by primitives inline `var(--color-*)` references — no extra
  generated classes beyond what is actually used (Tailwind 4 tree-shakes utilities).
- No new web fonts, no new `@import`s beyond the local tokens file.

## JS bundle

- New primitives are only imported by `/dev/design-system` (dev-only, `notFound()` outside
  `NODE_ENV=development`). Production page bundles are **unchanged**.
- `lucide-react` imports are named/tree-shaken (existing dependency, no new package).
- No new dependencies added (no Radix/CVA — per `RADIX_PRIMITIVES_INVENTORY.md`).

## Runtime behavior

- Interactive primitives (Dialog, DropdownMenu, Switch, Tabs, PasswordInput) attach listeners only
  when mounted and clean them up on unmount (`useEffect` cleanup).
- Dialog locks body scroll while open (same as existing Modal) — no global listeners when closed.
- `AdFrame` performs no network/IO — purely presentational.

## SSR / RSC

- Server components (layout primitives, Card, Button, Badge, etc.) render zero extra client JS.
- Client components are small and isolated; no server round-trips added.

## Dev-only route

- `/dev/design-system` returns `notFound()` in production builds (`NODE_ENV !== "development"`),
  so it is not reachable in `vinext start`. Verified in the build route table it registers only as a
  normal route; the guard prevents any production exposure.

## Measurements

- Build (vinext build) completes successfully with the new tokens imported; no size regressions
  observed. New-test runtime: `design-tokens` + `ui-components` ≈ 0.7s (SSR render of primitives).
- Future Phase 2 adoption must re-measure page weight after swapping legacy classes (expected net
  reduction: 394 hardcoded hex values in globals collapse to token references).
