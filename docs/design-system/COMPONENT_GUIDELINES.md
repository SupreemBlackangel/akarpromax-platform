# Component Guidelines — Phase 1 primitives

Applies to `src/components/ui/**` and `src/components/layout/**`.

## Hard rules

1. **Tokens only** — colors/spacing/radius/shadow/motion/z-index come from `src/styles/tokens.css`
   (`var(--color-*)`, `var(--space-*)`, `var(--radius-*)`, `var(--shadow-*)`, `var(--motion-*)`, `var(--layer-*)`).
   No raw hex/rgb, no `z-10`/`z-[999]` (test-enforced in `tests/design-tokens.test.mjs`).
2. **No feature imports** — primitives must not import `lib/ads`, `lib/auth`, `lib/db`, `lib/services`,
   `@/src/components/AdSlot`, API routes, or server state.
3. **No API/db/auth calls** — primitives are presentational/stateful-UI only. Data flows in via props.
4. **No hardcoded translation copy** — interactive labels (`aria-label`, badge text, tab list labels) are
   passed as props (`closeLabel`, `label`, `ariaLabel`, `showAriaLabel`/`hideAriaLabel`). Exception:
   a neutral English fallback (`closeLabel = "Close"`) matches the pre-existing `Modal` convention; consumers
   must localize it.
5. **Typed props + className extension** — every primitive accepts `className` and forwards it last;
   interactive primitives spread native HTML props.
6. **Semantic landmarks/roles** — dialogs `role="dialog" aria-modal aria-labelledby`; feedback uses
   `role="alert"` (danger) / `role="status"` (async); nav uses `aria-current`; form controls wire
   `label`, `aria-invalid`, `aria-describedby`.
7. **Keyboard support** — Dialog (Escape + focus trap via `focus-trap.ts`), DropdownMenu
   (Enter/Space/ArrowDown + Escape/outside-click), Tabs (arrow-key roving tabindex + Home/End),
   Switch (Enter/Space), PressableCard (Enter/Space).
8. **RTL/LTR-safe** — use logical properties / `start`/`end` / `rtl:` variants; directional icons
   mirrored (see `RTL_LTR_GUIDELINES.md`).
9. **No new UI library** — no Radix/shadcn (decision in `RADIX_PRIMITIVES_INVENTORY.md`); only
   `lucide-react` icons (named imports) + React built-ins.

## Structure conventions

- One component per file, default export; named exports for subcomponents.
- `cn()` (`src/utils/cn.ts`) merges class strings; `className` always merged last.
- Client-only behavior: add `"use client"` only when hooks are used.
- Sizes/variants expressed as typed records (`Record<Variant, string>`) for exhaustiveness.

## Layout primitives (`src/components/layout/`)

- `PageContainer` — max-width wrapper (`narrow 640` / `default 1140` / `wide 1400` / `full`) + responsive padding.
- `Section` — landmark `<section>` with optional background/border/spacing and container wrapping.
- `Stack` / `Inline` / `Grid` / `Divider` — composition primitives using `--space-*` gaps.
- `ContentContainer` / `WideContainer` / `NarrowContainer` — alias wrappers over `PageContainer`.

## Ad visual pattern

`AdFrame` is the presentational ad container (badge label, dashed border, `--color-surface-muted` fill,
horizontal/vertical/leaderboard/box variants). It performs **no** fetching — the feature `AdSlot`
(`src/components/AdSlot.tsx`) stays untouched and is not a primitive.

## Testing

New primitives get SSR tests (`tests/ui-components.test.mjs`) asserting roles, ARIA wiring,
token classes, and disabled/loading states. Token coverage + WCAG contrast + no-raw-z-index checks
live in `tests/design-tokens.test.mjs`. Run:

```
node --import tsx --test tests/design-tokens.test.mjs tests/ui-components.test.mjs
```

## Raw colours are a lint error (design phase 1)

`eslint-rules/no-raw-colours.mjs` adds four `no-restricted-syntax` selectors to every `className`
under `app/**` and `src/**`: a Tailwind palette class (`bg-gray-100`, `text-red-500`,
`border-amber-200/40` …) or a hex literal (`#1769ff`) in a string or template fails the lint.
Colours come from `var(--color-*)` in `src/styles/tokens.css` — the only file allowed to hold a hex.

`eslint-raw-colour-allowlist.json` lists the files that already carried raw colours when the rule
landed (124 at the time). They are exempt so the rule could ship without a repo-wide rewrite;
**delete a file from the list when you clean it** and the rule guards it from then on. Do not add
files to the list.

Companion rules from the same phase, enforced by review rather than lint: two font families only
(`--font-heading-stack` for h1–h4 and the brand, `--font-body-stack` for everything else; no Inter,
Tajawal or Arial), the type scale `--text-xs … --text-2xl` (nothing below 12px, no weight 900 under
28px, numbers `tabular-nums`), and gold (`--color-accent`) for exactly three things: the
"featured" badge, the "verified" badge and the rating star.
