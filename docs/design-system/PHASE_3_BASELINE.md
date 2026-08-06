# Phase 3 — Baseline & Scope

Generated: 2026-08-06

Target: `E:\Akarpromax new 2027\V 2.0 GPT - Copy`
Branch: `refactor/architecture-foundation`
HEAD before Phase 3: `ea3eb1f` (Phase 2 result)
Phase 0/1/2 status: **COMPLETE** (130 + 84 + Phase-2 npm/tests, all gates green).

## Git baseline

- Worktree: clean except untracked `docs/comparison/` (Phase 0 PLAN reports, intentionally uncommitted).
- Phase 3 will not touch the reference repo.

## Audit findings

### Legacy CSS volume (`app/globals.css`)

| Metric | Value |
| --- | --- |
| Total lines | 1561 |
| Hardcoded hex occurrences | 1166 |
| `var(--*)` token references | 244 |
| Legacy `:root` color vars (light) | 9 (`--ink --blue --blue-dark --sky --lavender --paper --line --muted --gold`) |
| Dark-mode variants | 9 (second `:root` block under `[data-theme="dark"]`) |

### Legacy var → design-token mapping (verified in `src/styles/tokens.css`)

| Legacy var | New token |
| --- | --- |
| `--ink` | `--color-text-primary` |
| `--blue` | `--color-primary` |
| `--blue-dark` | `--color-primary-hover` |
| `--sky` | `--color-surface-soft` |
| `--lavender` | `--color-surface-muted` |
| `--paper` | `--color-background` |
| `--line` | `--color-border` |
| `--muted` | `--color-text-muted` |
| `--gold` | `--color-accent` |

### Feature pages (public, use `PublicPageShell`)

| Page | `.container` wrapper | Legacy `var(--*)` | Raw `<button>` | Raw `<input>` | Raw `<select>` | Raw `<textarea>` | `AdSlot` direct |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `services/page.tsx` | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| `services/catalog/page.tsx` | 1 | 0 | 0 | 1 | 0 | 0 | 0 |
| `services/catalog/[code]/page.tsx` | — (to audit) | — | — | — | — | — | — |
| `service-requests/page.tsx` | 1 | 0 | 0 | 0 | 1 | 0 | 0 |
| `service-requests/new/page.tsx` | 0 | 0 | many | many | many | many | 1 |
| `service-requests/[id]/page.tsx` | — | — | — | — | — | — | — |
| `service-requests/[id]/offer/page.tsx` | — | — | — | — | — | — | — |
| `tools/page.tsx` | 0 (delegates) | 0 | 0 | 0 | 0 | 0 | 0 |
| `properties/[id]/page.tsx` | 3 | 32 | 1 | 1 | 0 | 0 | 6 |
| `providers/[id]/page.tsx` | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| `providers/apply/page.tsx` | 1 | 0 | 1 | 0 | 0 | 0 | 0 |
| **Totals** | **~9** | **32** | **~6+** | **~12+** | **~4+** | **~3+** | **~8** |

### Key observations

- Feature pages already wrap in `PublicPageShell` (Phase 2 win) — migration is **inner content only**.
- Most feature pages use Tailwind utility classes (`bg-blue-100 dark:bg-blue-900/50`, `text-gray-900 dark:text-white`) — these are NOT legacy; they are valid Tailwind 4 and stay.
- The legacy surface is: (a) the `.container` wrapper class, (b) legacy `var(--*)` usage (concentrated in `properties/[id]`), (c) raw form controls, (d) direct `AdSlot` without `AdFrame`.
- `app/page.tsx` (landing) is **OUT OF SCOPE** — no homepage rebuild (carried from Phase 2).
- `app/globals.css` contains legacy landing/homepage CSS (`.reference-*`, `.right-sidebar`, `.sidebar-*`, etc.) that the landing page still needs — globals.css backfill must NOT break the landing page.

## Phase 3 scope (derived from `COMPONENT_MIGRATION_MATRIX.md` "Phase 3+ adoption")

Adopt the Phase-1 primitives + Phase-2 shell **across feature pages**. Ordered by value/risk:

1. **Adopt layout primitives** — replace `.container` wrappers with `PageContainer`; replace raw `<section>`/`<div className="grid|flex ...">` with `Section`/`Grid`/`Stack`/`Inline`. Low risk, mechanical, high consistency win.
2. **Migrate legacy CSS vars → design tokens** — replace `var(--ink|blue|...)` with the matching `var(--color-*)` in feature pages. Contained (32 hits, mostly one page).
3. **Adopt ui form controls** — replace raw `<button>` with `Button`; raw `<input>`/`<select>`/`<textarea>` with `InputGroup`/`Select`/`Textarea` in feature-page forms. Medium risk (visual), high consistency.
4. **Wrap `AdSlot` with `AdFrame`** — in feature pages, wrap each `AdSlot` in the presentational `AdFrame` per the ad layout policy.

### Explicitly deferred

- **Full `globals.css` hex backfill** (the 1166 hex values) — too risky in one phase; most belong to the landing page which is out of scope. The 9 legacy `:root` color vars will be aliased to the new tokens so feature pages stop depending on them.
- **Delete legacy classes** — gated by grep audit once no callers remain (Phase 4).
- **`Modal` → `Dialog`**, legacy cards → `Card` — separate follow-up (these live in shared components, not feature pages).
- **Landing page (`app/page.tsx`)** — out of scope.

## Out of scope

- `app/page.tsx` landing, `app/admin/**`, `app/dashboard/**`, `app/dev/**`.
- Business logic, auth backend, database, ads targeting, news schema.
- The reference repo (read-only).

## Rollback

`git reset --hard ea3eb1f` returns to the Phase 2 head (pre-Phase-3).
