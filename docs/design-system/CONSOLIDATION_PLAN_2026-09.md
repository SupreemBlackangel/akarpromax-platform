# Design System Consolidation — Audit Outcome & Phased Plan (2026-09-01)

Full-platform UI audit (8 parallel scanners + synthesis). Verdict: **strong
foundation, brittle execution** — `src/styles/tokens.css` (~110 vars, complete
dark set) and `src/components/ui/` (~28 token-based primitives) are the
canonical standards; the work is migration onto them, not redesign.

## Shipped in this batch (commit f4eda11 + 381362c)

- **`@custom-variant dark`** in `app/globals.css`: every Tailwind `dark:`
  utility now follows `html[data-theme]` (ThemeSwitcher/boot script) instead of
  OS `prefers-color-scheme`. This was the root cause of mixed light/dark UI.
- **`@theme inline` completed**: all color tokens + radius + shadow scales are
  now reachable as Tailwind utilities.
- Removed conflicting `--brand-*` hex redefinitions from globals.css
  (tokens.css is the single source).
- **Invisible dark headings fixed**: `dark:text-[var(--color-surface)]` →
  `dark:text-[var(--color-text-primary)]` across 33 files.
- **Error/404 boundaries added**: `app/error.tsx`, `app/global-error.tsx`,
  `app/not-found.tsx` (token-styled, RTL-aware). `app/loading.tsx` tokenized,
  forced `dir="rtl"` dropped.
- **Dead code deleted**: `src/components/shared/` (8 components, 0 imports) and
  off-token `src/components/ui/Input.tsx`.
- **Admin tokenization (mechanical)**: all hardcoded hex in
  `roles-admin-client`, `companies-admin-client`, `audit-admin-client` →
  `var(--color-*)`; these pages are now dark-mode readable.
- Roles page: new header "apply role to user" modal built on `.modal-*` +
  tokens + lucide.

## Remaining phases (do in order; one build-swap each)

| # | Action | Risk |
|---|--------|------|
| 4 | Build missing primitives: `ui/Table`, real Toast provider (wire into `toast-region.tsx`), exported token-based `ui/Input` | LOW (additive) |
| 5b | Full rewrite of companies/audit/auction-organizers admin pages onto ui/Button+Table+Input+Badge | MEDIUM |
| 6 | Tokenize public/services bodies: `app/services/page.tsx`, properties filters (blue vs emerald focus split), `ServiceCards.tsx` gray palette, `tools.css` + its dark block, LandSearchPage strings | MEDIUM |
| 7 | Collapse the ~150 per-selector `html[data-theme="dark"]` overrides in globals.css by tokenizing the ~276 light hex values, section by section | MED-HIGH |
| 8 | `ui/Icon.tsx` wrapper + migrate emoji/glyph icons (~45 files) to lucide; unify the 5 dashboard shells; `<EmptyState>` primitive; hand-rolled tab bars → `ui/Tabs`; physical→logical RTL props | LOW × volume |

Key facts for later sessions: `.modal-*` classes in globals.css are LIVE (used
by roles modal + AccountDialog) — do not delete with the shared/ cleanup. The
canonical feedback tokens are `--color-danger*` (not `--color-error*`).
