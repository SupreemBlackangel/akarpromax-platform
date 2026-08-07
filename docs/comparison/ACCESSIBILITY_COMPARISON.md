# Accessibility Comparison

**Mode:** PLAN (read-only). Automated a11y scanning (axe) and screen-reader testing deferred until browser tooling approved. Static evidence only.

---

## 1. Reference accessibility evidence (static)

- **Strong base:** ~27 Radix UI primitives — all Radix components are WAI-ARIA authored (focus trap, keyboard nav, ARIA roles, `aria-modal`, `aria-expanded`, labelled `Label`). This is the single biggest a11y asset in the reference.
- **Supporting:** `@radix-ui/react-slot` (polymorphic semantics), `input-otp`, `react-phone-number-input` (accessible input), `sonner` toasts with focus management, `cmdk` command palette, scroll-area.
- **Weak signals:** `SeoHead`/`react-helmet-async` for meta (no SSR → less reliable ARIA context), some pages (DevLogin, admin twins) low-priority; no obvious focus-visible utility; `tw-animate-css` respects `prefers-reduced-motion` (positive).

## 2. Target accessibility evidence (static)

- **Base:** Tailwind 4, `aria-*` used in shells (`PermissionGuard`, `SponsorIdentity`, dialogs), focus styles on shared components, RTL (Arabic) + dark mode as directives.
- **Weak signals:** hand-rolled `Modal`/`Button`/`Input` lack Radix-level behaviors (no guaranteed focus trap/escape/`aria-modal` in `Modal`); no toast with `role="status"`/`alert`; no tooltip/select/combobox primitives; admin clients rely on `button`/`table` elements directly.
- **Positive:** server-rendered pages (SSR) give better initial accessibility tree vs reference CSR.

## 3. Gap/action table

| Gap | Reference has | Target needs | Action |
|---|---|---|---|
| Dialog focus trap + esc + modal ARIA | Radix Dialog | Modal.tsx | ADAPT Radix `@radix-ui/react-dialog` into `Modal` (or upgrade Modal) |
| Menu/select/tabs/switch ARIA | Radix set | admin/forms | ADAPT primitives into `src/components/ui/` |
| Live regions (toasts) | sonner | none | ADAPT sonner or build `role="status"` toast |
| Tooltip | Radix tooltip | none | ADAPT |
| Keyboard nav | Radix | table-heavy admin | Audit during implementation |
| Reduced motion | tw-animate-css | default ok | Verify CSS motion-guard on animations |
| Form labelling | Radix Label + RHF | Input.tsx | Ensure `htmlFor`/`aria-describedby` wiring; add error regions |
| Language/AR RTL | i18next AR | i18n core + dir switching | KEEP target i18n; verify `dir="rtl"` + `lang` attrs |

## 4. Decisions

- **KEEP** target SSR + shells. REUSE_AS_IS.
- **MERGE (ADAPT)** the Radix primitive set (DEPENDENCY_APPROVAL_LIST) and port it as `src/components/ui/`; upgrade `Modal`/`Input`/`Button` to use it over time (no forced rewrites).
- **REBUILD_FROM_BEHAVIOR** any missing toast/menus from Radix primitives.
- **DEFER** full axe/screen-reader audit to Phase 0/1 of implementation (needs browser tooling approval).

**Decision:** MERGE (Radix a11y) + KEEP (SSR); target becomes the a11y base, reference supplies primitives.
