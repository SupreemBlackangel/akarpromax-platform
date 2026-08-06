# FOOTER INVENTORY

Phase 2 pre-edit inventory of footer implementations and link sources.

## Implementations

| File | Component | Used by | Audience | Duplicate | Accessibility | Responsive | DS compliance | Decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `src/components/shared/Footer.tsx` | `Footer` | `PublicPageShell` | Public | Yes | No landmarks; raw ar/en/tr ternaries; links to `/properties` (404) and `#top` anchors | `.footer-grid` 4-col → stack | Legacy `.shared-footer` | **DEPRECATE** → replaced by `PublicFooter`; file kept |
| `app/page.tsx` | `.reference-footer` (quick/useful/contact + social `#top` placeholders + payments) | Landing `/` | Public | Yes | Social links are `#top` (useless), footer links are `#top` | Custom | Legacy `.reference-footer` | **DEFER** (landing not rebuilt) |

## Target: `PublicFooter` (`src/components/public/public-footer.tsx`)
- Single link source `src/config/footer-navigation.ts` (`FOOTER_COLUMNS`, `FOOTER_CONTACT`, `FOOTER_SOCIAL`).
- Only existing routes are rendered.
- Legal links (`footerLegalTitle` column) are config-driven and hidden while the legal pages do not exist (no `/privacy`, `/terms`, `/cookies` routes today). The CookieNotice covers the cookies concern; legal links render automatically once routes are added.
- Contact: `mailto:info@akarpromax.om` (real), location from `copy.contactLocation`.
- Social: `FOOTER_SOCIAL` empty → no social icons rendered (no fake `#top` links). Populated only when verified external profiles exist.
- No admin links, no placeholder production data, correct heading semantics (`h2` per column), RTL/LTR + Dark via tokens, responsive grid.
- No newsletter form (no backend).

## Footer columns (Phase 2)

| Column | titleKey | Links (labelKey → href) | Notes |
| --- | --- | --- | --- |
| Quick links | `quickTitle` | `navHome`→`/`, `navServices`→`/services`, `navCatalog`→`/services/catalog`, `navRequests`→`/service-requests`, `navTools`→`/tools` | all real routes |
| Useful | `usefulTitle` | `navApply`→`/providers/apply` | real route |
| Legal | `footerLegalTitle` | (empty, `deferred: true`) | renders when legal routes exist |
