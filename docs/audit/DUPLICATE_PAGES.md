# Duplicate Pages

## Summary
- Duplicate page groups found: 4
- Most severe duplication is in the sponsor admin domain and admin shell composition.

## Group 1: Sponsor Domain Split Across Two Admin Entry Points
- Routes involved:
  - `/admin/sponsors`
  - `/admin/sponsors/banner`
- Evidence:
  - `/admin/sponsors` renders `SponsorsListView` and is based on `/api/sponsor-profiles`.
  - `/admin/sponsors/banner` renders `SponsorAdminClient` and is based on `/api/sponsors` plus `/api/sponsor-access`.
  - Both routes represent sponsor administration, but each exposes a different subset of the sponsor domain.
- Impact:
  - Two competing sponsor management entry points.
  - Two data models in the same domain (`sponsor profiles` vs `sponsor campaigns/control`).
  - Two navigation stories for the same business area.
- Recommended action:
  - Keep `/admin/sponsors` as the primary sponsor route.
  - Merge useful campaign/analytics/access capabilities from `/admin/sponsors/banner` into `/admin/sponsors` or sponsor profile tabs.

## Group 2: Sponsor Create/Edit Forms Are Nearly the Same Page
- Routes involved:
  - `/admin/sponsors/new`
  - `/admin/sponsors/[id]/edit`
- Evidence:
  - Both use the same country list.
  - Both use `LocationPicker`.
  - Both submit to `/api/sponsor-profiles` with the same field set.
  - The form structure, validation shape, and redirect behavior are nearly identical.
- Impact:
  - Duplicate maintenance for every new sponsor field.
  - High probability of field drift.
- Recommended action:
  - Merge into one sponsor wizard/form with `create` and `edit` modes.

## Group 3: Sponsor Detail and Edit Should Be One Tabbed Entity Page
- Routes involved:
  - `/admin/sponsors/[id]`
  - `/admin/sponsors/[id]/edit`
- Evidence:
  - Detail page is read-only sponsor profile rendering.
  - Edit page is the same entity with almost the same field set.
  - The architecture brief explicitly calls for one entity profile page with tabs instead of separate detail/edit routes.
- Impact:
  - Split user journey for one entity.
  - Extra redirects and duplicate navigation.
- Recommended action:
  - Rebuild as one sponsor profile route with tabs or mode switching.

## Group 4: Admin Shell Duplication Across Multiple Pages
- Routes involved:
  - `/admin`
  - `/admin/users`
  - `/admin/roles`
  - `/admin/reports`
  - `/admin/settings`
  - `/admin/sponsors/banner`
- Evidence:
  - Repeated `sponsor-admin-sidebar` markup.
  - Repeated `admin-brand` blocks.
  - Repeated `sponsor-admin-header` blocks.
  - Repeated back-to-dashboard navigation.
- Impact:
  - No single `AdminLayout`.
  - Shell updates must be copied page-by-page.
- Recommended action:
  - Extract one admin layout/shell after audit approval.

## Page-Level Decisions

## `/admin/sponsors`
Path: `/admin/sponsors`
Purpose: Sponsor profile list and primary sponsor admin entry point.
Audience: Admin
Current Layout: `app/layout.tsx` plus standalone list shell
Current Ads: None
Used By: `app/page.tsx`, `DashboardAdminClient`, sponsor detail/create/edit flows
Decision: KEEP
Merge Target: `—`
Reason: This is the cleaner sponsor root and should survive as the canonical sponsor route.
Risk: It still lacks legacy sponsor campaign/access capabilities unless merged in.

## `/admin/sponsors/banner`
Path: `/admin/sponsors/banner`
Purpose: Legacy sponsor campaign/access/analytics control surface.
Audience: Admin
Current Layout: `app/layout.tsx` plus inline `sponsor-admin` shell
Current Ads: None
Used By: `SponsorsListView`
Decision: MERGE
Merge Target: `/admin/sponsors`
Reason: Same domain, competing entry point, overlapping sponsor-management responsibilities.
Risk: Merge requires reconciling two APIs and two mental models for sponsor data.

## `/admin/sponsors/new`
Path: `/admin/sponsors/new`
Purpose: Sponsor creation form.
Audience: Admin
Current Layout: `app/layout.tsx` plus standalone form shell
Current Ads: None
Used By: `SponsorsListView`
Decision: MERGE
Merge Target: `Sponsor Wizard shared with edit`
Reason: Nearly identical to edit form.
Risk: Existing links/bookmarks to `/new` need compatibility handling.

## `/admin/sponsors/[id]/edit`
Path: `/admin/sponsors/[id]/edit`
Purpose: Sponsor edit form.
Audience: Admin
Current Layout: `app/layout.tsx` plus standalone form shell
Current Ads: None
Used By: `SponsorsListView`, `SponsorDetailView`
Decision: MERGE
Merge Target: `/admin/sponsors/[id]`
Reason: Same entity, same fields, separate route only adds duplication.
Risk: Existing deep links need redirect or mode mapping.
