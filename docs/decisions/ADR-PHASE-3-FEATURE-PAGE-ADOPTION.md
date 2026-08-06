# ADR-PHASE-3: Feature-Page Adoption of Unified Primitives

Generated: 2026-08-06
Status: ACCEPTED

## Context

Phase 2 delivered a canonical public shell (`PublicPageShell`) built on Phase 1
primitives (`PageContainer`, `Grid`, `Button`, `AdFrame`, `Section`, `Stack`,
`Inline`, tokens). The feature pages, however, still used a mix of:

- raw `<div className="container ...">` wrappers,
- Tailwind `grid sm:grid-cols-N` instead of the `Grid` primitive,
- raw primary `<button className="... bg-blue-600 ...">` CTAs,
- inline `AdSlot` calls with no presentational frame,
- legacy `var(--blue)`/`var(--ink)`/`var(--line)`/etc. color references instead
  of the `--color-*` design tokens.

## Decision

Adopt the primitives across the public feature pages in a single rollout, with
these rules:

1. Replace `.container` wrappers with `PageContainer` (passing `dir={dir}` where
   the page owns the direction, i.e. the services-* pages that import
   `useServicesPage`).
2. Replace structural `grid sm:grid-cols-N` with `<Grid columns={N}>` (children
   keep their own `sm:col-span-N` classes, which `Grid` emits correctly).
3. Replace raw primary/secondary `<button>` CTAs with `<Button variant="primary">`
   / `<Button variant="secondary">`; wire `loading={submitting}` where a submit
   button already had a `disabled={submitting}` + dynamic-label pattern.
4. Wrap every `AdSlot` in `<AdFrame label={...} variant="horizontal|vertical">`.
   For pages using `useServicesPage` (services-*), use `copy.adLabel`; for the
   properties page (which uses the global `translations`), use
   `translations[locale].adLabel`.
5. Migrate legacy `var(--*)` palette references to tokens (see mapping below).
   **Tailwind utility classes are NOT legacy** — `bg-gray-900`, `border-gray-200`,
   `dark:` variants, etc. are left intact (they are the pages' own styling, not
   the legacy CSS-variable palette).

### Color-token mapping
`--blue→--color-primary`, `--ink→--color-text-primary`, `--muted→--color-text-muted`,
`--gold→--color-accent`, `--sky→--color-surface-soft`, `--lavender→--color-surface-muted`,
`--paper→--color-background`, `--line→--color-border`, `--blue-dark→--color-primary-hover`.

## Consequences

- Single, consistent page-width/padding and grid behavior across all public
  feature pages — no more ad-hoc `.container` drift.
- Ad slots always render with the shell-level presentational frame policy
  (dashed border, label footer) and are a11y-labeled via `aria-label`.
- Primary CTAs use the token palette (`--color-primary` #1769ff); the prior
  Tailwind `blue-600` (#2563eb) shade changes — accepted as the canonical
  design-system move.
- Form controls (`<input>`/`<select>`/`<textarea>` with Tailwind utilities) and
  `<Link>` CTAs are intentionally left intact to keep the diff bounded and avoid
  restyling the account wizard / service forms (deferred to the matrix's
  "swap legacy form controls → ui controls" step, which targets `var(--)` form
  controls, not Tailwind-styled ones).
- The `tools` page's `tc-*` self-contained CSS system (in `globals.css`
  1271–1390) is preserved; only its hero `AdSlot` is wrapped in `AdFrame`.

## Alternatives considered

- **Convert all form controls to ui controls in the same pass** — deferred to
  keep this rollout scoped to shell primitives; the `tc-*` tools system and
  Tailwind forms are not legacy `var(--)` controls.
- **Rewrite the service-requests wizard forms** — out of scope; the wizard is a
  business-logic surface (Phase 3 only adopts layout primitives, not form UX).

## Related
- `docs/design-system/COMPONENT_MIGRATION_MATRIX.md`
- `docs/verification/PHASE_3_BASELINE.md`
- `docs/verification/PHASE_3_RESULT.md`
- `docs/decisions/ADR-PHASE-2-PUBLIC-SHELL.md`
