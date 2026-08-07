# UI/UX Comparison

**Mode:** PLAN (read-only). Runtime/screenshot scoring is explicitly deferred until build+browser tooling is approved (see RISK_REGISTER). Below = static evidence + known design intentions.

---

## 1. Reference UI/UX profile (static evidence)

- **Component vocabulary:** 152 component files incl. shadcn-style `components/ui/` (Radix primitives: accordion, dialog, dropdown, tabs, toast, tooltip, select, menubar, navigation-menu, scroll-area, resizable-panels) + domain components (`PropertyCard`, `OfficeCard`, `HeroSlideshow`, `PageHeroSlideshow`, `RotatingAd`, `AdBanner`, `GeoAdBanner`, `SmartLandingBanner`, `WelcomeBanner`, `MobileStickyContact`, `UnifiedInbox`, `RichTextEditor`, `MapMyDeed`, `MortgageCalculator`, `InvestmentGauge`, `SeoHead`, `InstallPWA`, `ThemeToggle`).
- **Design systems:** `next-themes` (dark mode), `tw-animate-css`, framer-motion animations, lucide icons, sonner toasts, vaul drawers.
- **Intent:** content-rich real-estate/marketplace portal; hero carousels + rotating ad banners + property cards + office cards; PWA install prompt; sticky mobile contact bar; RTL/Arabic content (CTYPES_AR in Tools.tsx).
- **Known weaknesses (static):** page twins show untested parallel UIs; `/dev-login`; `AdminAuctions` guard gap; client-only rendering (CSR) → no SSR for SEO.

## 2. Target UI/UX profile (static evidence)

- **Component vocabulary:** `src/components/shared/` (Button, Card, Input, Modal, Badge, Sidebar, Header, Footer), `PublicPageShell`, `AdminPageShell`, `AdSlot`, `NewsTicker`, `AccountDialog`, `AdRequestDialog`, `FloatingAdSlotActions`, `LocationPicker`/`LocationChip`/`CountryFlag`, `PermissionGuard`, `SponsorIdentity`, services components, tools components (19), cad components.
- **Design systems:** Tailwind 4 (dark mode via class strategy), lucide-react, custom shells; session-driven account dialog (no full-page login form yet).
- **Intent:** admin-first (sponsors/ads/news/i18n management), services marketplace (dashboard/workspace), public services catalog, property detail, tools/calculators; RTL + dark mode + mobile-first as non-negotiables (per directive).

## 3. Parity scorecard (1–5, static confidence)

| Dimension | Reference | Target | Notes |
|---|---|---|---|
| Component richness | 4 | 3 | Reference has 5× components; target has fewer, more focused primitives |
| Admin UI | 3 (32 screens, some twins) | 4 (shared layout, 9 screens, consistent shell) | Target structure wins on consistency |
| Public landing polish | 4 | 2 | Home is minimal vs reference hero/slideshow/ads |
| Forms | 4 (RHF+zod+yup) | 3 (plain forms) | Decide on form library (see below) |
| Feedback (toasts/loading) | 4 (sonner, skeleton) | 3 (Modal/Badge only) | Missing toast/empty-state conventions beyond tools |
| Motion/animation | 4 (framer-motion) | 1 | None beyond Tailwind transitions |
| SEO/SSR | 1 (CSR) | 4 (SSR/RSC) | Target superior |

## 4. UX decisions for migration

- **MERGE (ADAPT):** adopt Radix-based `components/ui/` into target `src/components/ui/` for a11y-rich controls (select, dialog, dropdown-menu, tooltip, toast, tabs, menubar, navigation-menu) — approved via DEPENDENCY_APPROVAL_LIST.
- **MERGE (ADAPT):** reference hero/slideshow/ad-banner/card components → rebuilt on target `PublicPageShell` (dark mode + RTL + mobile first).
- **REBUILD_FROM_BEHAVIOR:** PWA install (Wrangler static + no plugin needed), rich text editor (target i18n/CMS content), unified inbox (already mirrored by `dashboard/services/inbox`).
- **KEEP:** target `PublicPageShell`, `AdminPageShell`, `AdSlot`, `NewsTicker`, `PermissionGuard`, `SponsorIdentity`, services dashboard shells. REUSE_AS_IS.
- **DEFER (needs approval):** adding sonner (toasts) + framer-motion is optional polish; not required for parity. Forms: recommend react-hook-form + zod 4 for new account flows (approval item).

**Decision:** MERGE reference richness on top of target shell (ADAPT), never the reverse. Target's SSR/a11y foundation is the base; reference contributes components and screens.
