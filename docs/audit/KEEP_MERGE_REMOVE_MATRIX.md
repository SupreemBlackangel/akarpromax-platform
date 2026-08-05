# Keep / Merge / Remove Matrix

## KEEP

## `/tools`
Path: `/tools`
Purpose: Engineering tools module.
Audience: Workspace
Current Layout: `app/layout.tsx` + local tools shell
Current Ads: None
Used By: Direct URL only
Decision: KEEP
Merge Target: `—`
Reason: Secondary module already isolated from the main public IA and permission-gated.
Risk: Still lacks a true workspace layout.

## `/admin`
Path: `/admin`
Purpose: Admin landing/dashboard.
Audience: Admin
Current Layout: `app/layout.tsx` + inline `sponsor-admin` shell
Current Ads: None
Used By: Home admin chip, public adminNav, admin sidebars
Decision: KEEP
Merge Target: `—`
Reason: Required admin entry point.
Risk: Shell duplication remains until an `AdminLayout` exists.

## `/admin/ads`
Path: `/admin/ads`
Purpose: Advertising center.
Audience: Admin
Current Layout: `app/layout.tsx` + inline `ads-admin` shell
Current Ads: None
Used By: Public adminNav, dashboard module link, news admin shortcut
Decision: KEEP
Merge Target: `—`
Reason: Core admin domain and already consolidates create/edit in one wizard.
Risk: Uses a separate shell from the rest of admin.

## `/admin/news`
Path: `/admin/news`
Purpose: News ticker CRUD.
Audience: Admin
Current Layout: `app/layout.tsx` + standalone admin content shell
Current Ads: None
Used By: Public adminNav, dashboard module link
Decision: KEEP
Merge Target: `—`
Reason: Active content workflow with a clear operational purpose.
Risk: Not connected to a shared admin shell.

## `/admin/reports`
Path: `/admin/reports`
Purpose: Sponsor/ad reports and analytics.
Audience: Admin
Current Layout: `app/layout.tsx` + inline `sponsor-admin` shell
Current Ads: None
Used By: Public adminNav, dashboard module link
Decision: KEEP
Merge Target: `—`
Reason: Target admin module and currently functional.
Risk: Analytics remains visually split from dashboard despite overlapping data.

## `/admin/roles`
Path: `/admin/roles`
Purpose: RBAC matrix page.
Audience: Admin
Current Layout: `app/layout.tsx` + inline `sponsor-admin` shell
Current Ads: None
Used By: Public adminNav, dashboard module link
Decision: KEEP
Merge Target: `—`
Reason: Needed while permission systems are being rationalized.
Risk: Static matrix may drift from runtime permission enforcement.

## `/admin/sponsors`
Path: `/admin/sponsors`
Purpose: Sponsor profile list.
Audience: Admin
Current Layout: `app/layout.tsx` + standalone list shell
Current Ads: None
Used By: Public adminNav, dashboard module link, sponsor flows
Decision: KEEP
Merge Target: `—`
Reason: Best candidate for canonical sponsor admin root.
Risk: Domain still split with legacy sponsor control route.

## `/admin/sponsors/requests`
Path: `/admin/sponsors/requests`
Purpose: Sponsor approval queue.
Audience: Admin
Current Layout: `app/layout.tsx` + standalone requests shell
Current Ads: None
Used By: Direct URL only
Decision: KEEP
Merge Target: `—`
Reason: Architecture brief explicitly keeps sponsorship requests as a retained flow.
Risk: Hidden route until actual navigation is added.

## `/admin/users`
Path: `/admin/users`
Purpose: Admin/sponsor access management.
Audience: Admin
Current Layout: `app/layout.tsx` + inline `sponsor-admin` shell
Current Ads: None
Used By: Public adminNav, dashboard module link
Decision: KEEP
Merge Target: `—`
Reason: Core admin operations route.
Risk: Separate access model may conflict with future unified auth design.

## MERGE

## `/admin/sponsors/banner`
Path: `/admin/sponsors/banner`
Purpose: Legacy sponsor campaign/access/analytics control.
Audience: Admin
Current Layout: `app/layout.tsx` + inline `sponsor-admin` shell
Current Ads: None
Used By: `SponsorsListView`
Decision: MERGE
Merge Target: `/admin/sponsors`
Reason: Overlaps with sponsor management and duplicates the sponsor domain entry point.
Risk: Requires merging two sponsor data models.

## `/admin/sponsors/new`
Path: `/admin/sponsors/new`
Purpose: Sponsor creation form.
Audience: Admin
Current Layout: `app/layout.tsx` + standalone form shell
Current Ads: None
Used By: `SponsorsListView`
Decision: MERGE
Merge Target: `Sponsor Wizard shared with edit`
Reason: Create and edit are nearly identical forms.
Risk: Existing direct links to `/new` need redirect behavior.

## `/admin/sponsors/[id]/edit`
Path: `/admin/sponsors/[id]/edit`
Purpose: Sponsor edit form.
Audience: Admin
Current Layout: `app/layout.tsx` + standalone form shell
Current Ads: None
Used By: `SponsorsListView`, `SponsorDetailView`
Decision: MERGE
Merge Target: `/admin/sponsors/[id]`
Reason: Edit should be a mode/tab of the sponsor entity page.
Risk: Existing edit bookmarks need compatibility handling.

## REMOVE

## `/admin/i18n`
Path: `/admin/i18n`
Purpose: Translation management with versioning and rollback.
Audience: Admin
Current Layout: `app/layout.tsx` + standalone `i18n-admin` shell
Current Ads: None
Used By: Public adminNav, dashboard module link
Decision: REMOVE
Merge Target: `—`
Reason: Advanced operational tooling outside the target MVP admin IA.
Risk: Removing it cuts off live translation editing until a lighter content workflow exists.

## REBUILD

## `/`
Path: `/`
Purpose: Public homepage and current pseudo-admin gateway.
Audience: Public
Current Layout: `app/layout.tsx` + inline `reference-app` shell
Current Ads: Hero carousel, sponsor ribbon, `side_left`, `side_right`, `between_sections`, `floating_bottom`
Used By: Root route and all preview/home links
Decision: REBUILD
Merge Target: `PublicPageShell`
Reason: Core route, but current IA is mixed, anchor navigation is broken, and the public shell owns admin concerns.
Risk: Highest-traffic route; rebuild must preserve locale/theme/account/ad behavior.

## `/services`
Path: `/services`
Purpose: Services marketplace page.
Audience: Public
Current Layout: `app/layout.tsx` + local services shell
Current Ads: None
Used By: Home adminNav and dashboard module link
Decision: REBUILD
Merge Target: `PublicPageShell`
Reason: Real product route with no shared public shell and no standardized ad pattern.
Risk: Service posting flow may change as layout and routing are normalized.

## `/properties/[id]`
Path: `/properties/[id]`
Purpose: Property detail prototype.
Audience: Public
Current Layout: `app/layout.tsx` + standalone detail shell
Current Ads: Property detail `AdSlot` stack with 7 placements
Used By: Direct URL only
Decision: REBUILD
Merge Target: `PublicPageShell`
Reason: Hardcoded demo data, wrong hardcoded ad path, and no real route discoverability.
Risk: Deep links may exist even though the implementation is currently placeholder-grade.

## `/admin/settings`
Path: `/admin/settings`
Purpose: Sponsor plans/pricing under a generic settings route.
Audience: Admin
Current Layout: `app/layout.tsx` + inline `sponsor-admin` shell
Current Ads: None
Used By: Public adminNav, dashboard module link
Decision: REBUILD
Merge Target: `Admin settings tabs`
Reason: Route semantics and actual content do not match; this should become one tab in a broader settings hub.
Risk: Route meaning may change and require redirect strategy.

## `/admin/sponsors/[id]`
Path: `/admin/sponsors/[id]`
Purpose: Sponsor profile detail.
Audience: Admin
Current Layout: `app/layout.tsx` + standalone detail shell
Current Ads: None
Used By: Sponsor list, sponsor requests, sponsor create/edit redirects
Decision: REBUILD
Merge Target: `Tabbed sponsor profile`
Reason: Entity details should live in one page with tabs instead of separate detail/edit surfaces.
Risk: Existing detail and edit URLs must be preserved or redirected.
