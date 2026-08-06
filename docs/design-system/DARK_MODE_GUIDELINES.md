# Dark Mode Guidelines — AkarProMax

Dark mode is boot-strapped by the existing `data-theme` script (`html[data-theme="dark"]`) — no
`dark:` utilities are used. Phase 1 centralizes the dark palette in `src/styles/tokens.css`.

## Model

1. Light values live on `:root`; dark overrides on `html[data-theme="dark"]` (same selector the boot
   script toggles). Legacy CSS overrides under `html[data-theme="dark"] .reference-*` are untouched.
2. `@theme inline` maps utilities to `var(--color-*)`, so one component class string automatically
   re-resolves under dark — no per-theme classes in primitives.
3. Dark values were extracted from the existing `html[data-theme="dark"]` block (navy panels
   `#152a4b/#0f1d33/#10264c`, borders `#304867/#263a5a`, text `#e8efff/#b8c9e2`, primary `#82adff`)
   — no new hue families.
4. Brand gold `--color-accent` is intentionally identical in both themes.

## Rules for new components

- Never hardcode a dark-mode color in a component. Only reference `var(--color-*)`.
- Never use `dark:` utilities.
- Overlays darken in dark mode via `--color-overlay` (`rgba(7,20,41,.58)` light → `rgba(2,8,18,.66)` dark).
- Shadows deepen in dark via `--shadow-*` overrides.
- Ensure contrast for both themes (enforced: `tests/design-tokens.test.mjs` WCAG AA pairs for
  text-on-surface and text-on-primary in both themes).

## Reduced motion

`@media (prefers-reduced-motion: reduce)` collapses `--motion-*` tokens to 0.01ms; primitives use
only `--motion-*`/`--easing-*` so they inherit the behavior automatically.

## Verification

```
node --import tsx --test tests/design-tokens.test.mjs
```
Covers: dark token presence/difference from light, WCAG AA contrast (light + dark), reduced-motion
neutralization, and the no-raw-z-index rule.
