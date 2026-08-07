# Design System Comparison

**Mode:** PLAN (read-only).

---

## 1. Reference design system

| Token/layer | Evidence | Status |
|---|---|---|
| Tailwind version | `tailwindcss 4.1.0` + `@tailwindcss/vite` + `@tailwindcss/typography` | Tailwind 4 CSS-first config |
| Primitives | shadcn-style `src/components/ui/*` built on Radix + `class-variance-authority` + `clsx` + `tailwind-merge` | Consistent CVA variant pattern |
| Dark mode | `next-themes` 0.4.6 + `ThemeToggle.tsx` | Theme provider at app root |
| Animations | `tw-animate-css` + framer-motion 11 | Micro-interactions |
| Icons | `lucide-react` 0.451 | Consistent icon set |
| Toasts/drawers | `sonner`, `vaul`, `cmdk` | Radix ecosystem |
| Typography | `@tailwindcss/typography` for rich content | Blog/legal pages |

## 2. Target design system

| Token/layer | Evidence | Status |
|---|---|---|
| Tailwind version | `tailwindcss 4.2.1` + `@tailwindcss/postcss` | Tailwind 4 CSS-first config |
| Primitives | `src/components/shared/*`: Button, Card, Input, Modal, Badge, Sidebar, Header, Footer | Hand-rolled, no CVA |
| Dark mode | class strategy (directive non-negotiable) | Present |
| Icons | `lucide-react` 1.28 | Consistent |
| Toasts/drawers | none (Modal component only) | Gap |
| Typography | Tailwind base | Gap for rich content |
| RTL | directive non-negotiable (Arabic UI) | Present in shells/tools |

## 3. Token gap analysis

- Reference uses CVA + tailwind-merge for polymorphic variants; target uses inline classes per component. **MERGE** CVA pattern if Radix set adopted (uniform variant API).
- Reference dark mode via next-themes; target class-based. **KEEP** target approach (next-themes is a client-side provider; target shells already handle it).
- Missing in target: toast system, menu/dropdown/select primitives, scroll-area, resizable panels, tooltip, tabs (page tabs exist as `admin-subnav`), rich-text typography set, animations.

## 4. Decisions

- **KEEP** target Tailwind 4 pipeline + shell components. REUSE_AS_IS.
- **ADAPT** reference `components/ui/` primitives into `src/components/ui/` (Radix + cva + tailwind-merge + cn), scoped so existing `shared/` components are not broken (Button/Modal refactor optional later).
- **REBUILD_FROM_BEHAVIOR** any reference animation intent using Tailwind/CSS (no framer-motion required unless approved).
- **DO_NOT_MIGRATE** next-themes; keep target class-based theme.

**Decision:** MERGE (primitives) + KEEP (pipeline/shells). Design tokens stay Tailwind-4-native with CSS variables; no external theme engine.
