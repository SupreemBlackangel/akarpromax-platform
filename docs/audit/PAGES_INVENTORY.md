# Pages Inventory

## Layout Inventory
- `app/layout.tsx`: only global layout in the application.
- No nested `layout.tsx` files exist for public, workspace, account, or admin scopes.
- No `loading.tsx`, `error.tsx`, or `not-found.tsx` files exist.

## Page Inventory

## `/`
Path: `/`
Purpose: Main landing page combining brand marketing, locale/theme/location controls, hero advertising, sponsor ribbon, account dialog, and role-aware sidebar/admin affordances.
Audience: Public
Current Layout: `app/layout.tsx` plus inline `reference-app` shell in `app/page.tsx`
Current Ads: Custom hero carousel from `/api/ads`, sponsor ribbon, `AdSlot(side_left)`, `AdSlot(side_right)`, `AdSlot(between_sections)`, `AdSlot(floating_bottom)`
Used By: Root route, `Link href="/"` preview/back links from admin/pages, and brand/home links from `/services`, `/tools`, and `/properties/[id]`
Decision: REBUILD
Merge Target: `PublicPageShell`
Reason: Core route, but it mixes public and admin navigation, uses broken anchor-based sidebar links, and acts as both homepage and pseudo-admin launcher.
Risk: Rebuilding affects the most-linked surface and can break locale/theme/account/ad behaviors if not staged carefully.

## `/services`
Path: `/services`
Purpose: Services marketplace route with browse, requests, and new-request tabs in a single page.
Audience: Public
Current Layout: `app/layout.tsx` plus local header/main shell in `app/services/page.tsx`
Current Ads: None
Used By: `app/page.tsx` admin section link to `/services`, `app/admin/dashboard-admin-client.tsx` section link to `/services`
Decision: REBUILD
Merge Target: `PublicPageShell`
Reason: It is a real user-facing route but does not use shared public chrome, shared ad placements, or route-consistent IA.
Risk: Rebuild may alter current request-posting flow and translation loading behavior.

## `/tools`
Path: `/tools`
Purpose: Permission-gated engineering calculators for authenticated users with `tools.use`.
Audience: Workspace
Current Layout: `app/layout.tsx` plus local shell in `src/components/tools/ToolsPageClient.tsx`
Current Ads: None
Used By: Direct URL only; no `href="/tools"` or route push was found in the app
Decision: KEEP
Merge Target: `—`
Reason: The route is already isolated and hidden from the main public IA, matching the instruction to keep engineering tools as a secondary module.
Risk: It still uses a standalone shell and a public-path route, so future workspace separation will require careful auth and layout changes.

## `/properties/[id]`
Path: `/properties/[id]`
Purpose: Property detail page prototype with hardcoded villa data, local header/footer, and multiple ad slots.
Audience: Public
Current Layout: `app/layout.tsx` plus standalone detail shell in `app/properties/[id]/page.tsx`
Current Ads: `AdSlot(property_after_gallery)`, `AdSlot(property_below_price)`, `AdSlot(property_after_description)`, `AdSlot(property_before_similar)`, `AdSlot(property_sidebar_top)`, `AdSlot(property_sidebar_middle)`, `AdSlot(property_sidebar_bottom)`
Used By: Direct URL only; no inbound route/menu link to `/properties/[id]` was found
Decision: REBUILD
Merge Target: `PublicPageShell`
Reason: The page is clearly a demo/prototype: content is hardcoded and the ad path is hardcoded to `/properties/15` even on dynamic IDs.
Risk: Direct deep links may currently rely on this route shape even though the content is not real yet.

## `/admin`
Path: `/admin`
Purpose: Admin dashboard landing page with KPI cards, sponsor/ad stats, and module links.
Audience: Admin
Current Layout: `app/layout.tsx` plus inline `sponsor-admin` shell in `app/admin/dashboard-admin-client.tsx`
Current Ads: None
Used By: Public landing page admin chip, `app/page.tsx` adminNav, and multiple admin sidebars linking back to `/admin`
Decision: KEEP
Merge Target: `—`
Reason: It is the required landing route for admin operations and already aggregates the major admin modules.
Risk: It duplicates admin shell markup instead of using a shared `AdminLayout`.

## `/admin/ads`
Path: `/admin/ads`
Purpose: Advertising center for media assets, campaigns, targeting, approval, and analytics.
Audience: Admin
Current Layout: `app/layout.tsx` plus inline `ads-admin` shell in `app/admin/ads/ads-admin-client.tsx`
Current Ads: None
Used By: `app/page.tsx` adminNav, `app/admin/dashboard-admin-client.tsx` module link, and `app/admin/news/news-admin-client.tsx` shortcut link
Decision: KEEP
Merge Target: `—`
Reason: This is a core admin domain and already consolidates create/edit into one wizard.
Risk: It uses a separate admin shell implementation from the rest of admin, increasing maintenance cost.

## `/admin/i18n`
Path: `/admin/i18n`
Purpose: Translation key/value editing, publishing, version history, and rollback.
Audience: Admin
Current Layout: `app/layout.tsx` plus standalone `i18n-admin` shell in `app/admin/i18n/i18n-admin-client.tsx`
Current Ads: None
Used By: `app/page.tsx` adminNav and `app/admin/dashboard-admin-client.tsx` module link
Decision: REMOVE
Merge Target: `—`
Reason: This is advanced operational tooling outside the target MVP IA and not part of the target admin module list in the architecture brief.
Risk: Removing it would temporarily eliminate live translation editing unless a lighter content workflow replaces it.

## `/admin/news`
Path: `/admin/news`
Purpose: CRUD page for news ticker items by global/country/city scope.
Audience: Admin
Current Layout: `app/layout.tsx` plus standalone admin content shell in `app/admin/news/news-admin-client.tsx`
Current Ads: None
Used By: `app/page.tsx` adminNav and `app/admin/dashboard-admin-client.tsx` module link
Decision: KEEP
Merge Target: `—`
Reason: News/ticker content is an active platform surface and needs a dedicated admin interface.
Risk: It does not share the same shell as the rest of admin and therefore drifts visually and structurally.

## `/admin/reports`
Path: `/admin/reports`
Purpose: Reporting page for sponsor and ad analytics over time.
Audience: Admin
Current Layout: `app/layout.tsx` plus inline `sponsor-admin` shell in `app/admin/reports-admin-client.tsx`
Current Ads: None
Used By: `app/page.tsx` adminNav and `app/admin/dashboard-admin-client.tsx` module link
Decision: KEEP
Merge Target: `—`
Reason: Reports are a named target module in the desired admin IA and the page already consumes the analytics API.
Risk: It duplicates the shared admin chrome inline and has no broader admin layout boundary.

## `/admin/roles`
Path: `/admin/roles`
Purpose: RBAC matrix viewer for roles and permissions.
Audience: Admin
Current Layout: `app/layout.tsx` plus inline `sponsor-admin` shell in `app/admin/roles-admin-client.tsx`
Current Ads: None
Used By: `app/page.tsx` adminNav and `app/admin/dashboard-admin-client.tsx` module link
Decision: KEEP
Merge Target: `—`
Reason: Role visibility is essential while permissions are still spread across multiple systems.
Risk: Page keeps the old one-off admin shell and does not actually manage roles yet; it mostly visualizes static catalogs.

## `/admin/settings`
Path: `/admin/settings`
Purpose: Subscription plan and pricing management page living under a generic settings route.
Audience: Admin
Current Layout: `app/layout.tsx` plus inline `sponsor-admin` shell in `app/admin/settings-admin-client.tsx`
Current Ads: None
Used By: `app/page.tsx` adminNav and `app/admin/dashboard-admin-client.tsx` module link
Decision: REBUILD
Merge Target: `Admin settings tabs`
Reason: Route name suggests global settings, but the actual page only manages sponsor plans/pricing.
Risk: Reorganization can break direct links if pricing is split into a more explicit settings sub-IA.

## `/admin/sponsors`
Path: `/admin/sponsors`
Purpose: Sponsor profile list with filters and links to view/create/edit sponsors.
Audience: Admin
Current Layout: `app/layout.tsx` plus standalone list shell in `app/admin/sponsors/_components/SponsorsListView.tsx`
Current Ads: None
Used By: `app/page.tsx` adminNav, `app/admin/dashboard-admin-client.tsx` module link, `app/admin/ads/ads-admin-client.tsx` cross-link, and sponsor detail/create/edit flows
Decision: KEEP
Merge Target: `—`
Reason: This is the clearer sponsor entry point and aligns better with the target IA than the legacy banner route.
Risk: Important sponsor analytics/access features still live elsewhere, so keeping only this page leaves the domain split.

## `/admin/sponsors/banner`
Path: `/admin/sponsors/banner`
Purpose: Legacy sponsor control surface for sponsor campaigns, sponsor analytics, and access management.
Audience: Admin
Current Layout: `app/layout.tsx` plus inline `sponsor-admin` shell in `app/admin/sponsors/sponsor-admin-client.tsx`
Current Ads: None
Used By: `app/admin/sponsors/_components/SponsorsListView.tsx` banner link
Decision: MERGE
Merge Target: `/admin/sponsors`
Reason: It overlaps heavily with sponsor management but uses a different data model and different UI from the newer sponsor profile routes.
Risk: Merging requires reconciling `/api/sponsors` and `/api/sponsor-profiles` responsibilities.

## `/admin/sponsors/new`
Path: `/admin/sponsors/new`
Purpose: Create a sponsor profile.
Audience: Admin
Current Layout: `app/layout.tsx` plus standalone form shell in `app/admin/sponsors/_components/NewSponsorForm.tsx`
Current Ads: None
Used By: `app/admin/sponsors/_components/SponsorsListView.tsx`
Decision: MERGE
Merge Target: `Sponsor Wizard shared with edit`
Reason: The route is nearly identical to edit and should be one mode of the same sponsor workflow.
Risk: Form-state and redirect logic must be normalized during merge.

## `/admin/sponsors/requests`
Path: `/admin/sponsors/requests`
Purpose: Pending sponsor approval queue with approve/reject actions.
Audience: Admin
Current Layout: `app/layout.tsx` plus standalone list shell in `app/admin/sponsors/_components/SponsorRequestsView.tsx`
Current Ads: None
Used By: Direct URL only; no in-app link to `/admin/sponsors/requests` was found
Decision: KEEP
Merge Target: `—`
Reason: The architecture brief explicitly keeps sponsor requests as one of the three sponsor admin surfaces.
Risk: The route is currently hidden from actual navigation, so the workflow is easy to miss.

## `/admin/sponsors/[id]`
Path: `/admin/sponsors/[id]`
Purpose: Sponsor profile detail page.
Audience: Admin
Current Layout: `app/layout.tsx` plus standalone detail shell in `app/admin/sponsors/_components/SponsorDetailView.tsx`
Current Ads: None
Used By: `SponsorsListView`, `SponsorRequestsView`, `NewSponsorForm`, and `EditSponsorForm`
Decision: REBUILD
Merge Target: `Tabbed sponsor profile`
Reason: The page is read-only detail while edit lives on a separate route; the sponsor brief calls for one profile page with tabs.
Risk: Existing deep links to detail/edit routes will need redirects or mode handling.

## `/admin/sponsors/[id]/edit`
Path: `/admin/sponsors/[id]/edit`
Purpose: Edit an existing sponsor profile.
Audience: Admin
Current Layout: `app/layout.tsx` plus standalone form shell in `app/admin/sponsors/_components/EditSponsorForm.tsx`
Current Ads: None
Used By: `SponsorsListView` and `SponsorDetailView`
Decision: MERGE
Merge Target: `/admin/sponsors/[id]`
Reason: It duplicates the new form almost field-for-field and should become an edit tab/mode on the sponsor profile page.
Risk: Existing edit links will need redirect or mode-preserving compatibility.

## `/admin/users`
Path: `/admin/users`
Purpose: Sponsor/admin access user management.
Audience: Admin
Current Layout: `app/layout.tsx` plus inline `sponsor-admin` shell in `app/admin/users-admin-client.tsx`
Current Ads: None
Used By: `app/page.tsx` adminNav and `app/admin/dashboard-admin-client.tsx` module link
Decision: KEEP
Merge Target: `—`
Reason: User and access control is a target admin module and is actively permission-gated.
Risk: It duplicates the same admin chrome pattern already repeated across several admin routes.
