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

## Completed since (later batches)

- **Phase 4** — `ui/Table.tsx` (Table/THead/TBody/Row/HeadCell/Cell/EmptyRow) and
  `ui/Toast.tsx` (module-level store + `toast.*` + `<ToastViewport/>`, mounted in
  the public shell and admin layout; the sr-only `toast-region.tsx` stub deleted).
- **Phase 6 (partial)** — `ServiceCards.tsx` off the gray palette; property
  filters unified on `--color-border-focus` (they had a blue-vs-emerald split);
  the add-property wizard + `PropertyFormWithOffers` fully tokenized.
- **Phase 7** — 144 hardcoded values across 23 drifted shades inside the 151
  `html[data-theme="dark"]` rules replaced with dark tokens. tokens.css is now
  the single source of dark values. (The rules remain as structure; deleting the
  redundant ones is the optional follow-up.)
- **Phase 8 (icons)** — `ui/Icon.tsx` named registry over lucide; 15 admin
  glyphs + 55 sidebar emoji migrated; `icon: IconName` makes an unmapped name a
  build error.
- **Auth surface redesign** — `AuthPageShell` rebuilt as a branded split layout
  (gradient identity panel, real `logo.svg`, three value points with lucide
  icons, inline token-drawn SVG skyline artwork). `/register` moved onto the
  same shell, dropping its bespoke layout, hardcoded blue gradient,
  letter-in-a-box logo and forced `dir="rtl"`. Both pages fully tokenized.
  The header's "دخول" now links to `/login` instead of opening the modal.
- Plus: global `<select>` chevron unification (RTL-aware, `appearance:none`).

### Broken token references found and fixed

These were referenced but **never defined**, so the rules silently did nothing:

| Broken | Replaced with | Impact |
|---|---|---|
| `--color-surface-1` / `--color-surface-2` | `--color-surface` / `--color-surface-input` | 7 files (login, register, forgot/reset password, verify-otp, account profile + security) rendered with **no background at all** |
| `--color-error*` | `--color-danger*` | register page feedback styling |

Lesson: a typo'd `var()` fails silently. When adding a token reference, confirm
it exists in `src/styles/tokens.css` first.

## Remaining

| # | Action | Risk |
|---|--------|------|
| 5b | Full rewrite of companies/audit/auction-organizers admin pages onto ui/Button+Table+Input+Badge (they are tokenized but still hand-rolled markup) | MEDIUM |
| 6b | Remaining public bodies: `app/services/page.tsx` hero/chips, `tools.css` + its dark block, LandSearchPage hardcoded strings | MEDIUM |
| 6c | Trilingual the register form's copy — the page now follows the locale via `AuthPageShell`, but its own field labels/messages are still Arabic-only (login uses `authLabels`) | LOW |
| 7b | Delete the now-redundant `html[data-theme="dark"]` rules whose light counterpart consumes the same token | MEDIUM |
| 8b | Unify the 5 dashboard shells; `<EmptyState>` primitive; hand-rolled tab bars → `ui/Tabs`; physical→logical RTL props; remaining emoji in page bodies | LOW × volume |

Key facts for later sessions:

- `.modal-*` classes in globals.css are LIVE (used by the roles modal +
  AccountDialog) — do not delete with the `shared/` cleanup.
- Canonical feedback tokens are `--color-danger*`, **not** `--color-error*`.
- Canonical surface tokens are `--color-surface`, `-elevated`, `-muted`,
  `-soft`, `-input`. There is no `--color-surface-1`/`-2`.
- New icons go through `ui/Icon.tsx`; config `icon:` fields are typed `IconName`,
  so an unmapped name breaks the build rather than rendering a broken glyph.
- Auth pages (login/register/forgot/reset/verify-otp) all render inside
  `AuthPageShell` — change the shell, not the individual pages, for identity work.
