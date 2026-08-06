# Admin/Public Mixing Audit

## Summary
- Direct imports from `app/admin/**` into public/workspace routes: none found
- Public routes with embedded admin IA/behavior: **0 (fixed in Phase 4)**
- Shared files mixing public and admin navigation data: **0 (fixed in Phase 4)**

## Findings

### 1. Public Landing Page Embeds Admin Navigation and Admin Role Logic — RESOLVED
- File: `app/page.tsx`
- Status: Fixed in Phase 4 (navigation reduction). Removed:
  - `adminNav` real admin route list.
  - `sidebarIndexes` admin role gating.
  - The admin chip linking to `/admin` in the header.
  - Admin links inside the public landing page sidebar.
- Replacement: public sidebar now renders `publicNav`, a text-led, public-only list
  (Home / Properties / Services / Offices & companies / About / Join us) with real
  section anchors (`#top`, `#properties`, `#services`, `#offices`, `#about`, `#account`).
- Admin discoverability is now handled inside the admin pages themselves
  (`app/admin/dashboard-admin-client.tsx` module links) and direct URLs.

### 2. Translation Navigation Data Mixes Public and Admin Labels in One Sidebar Array — RESOLVED
- File: `src/data/translations.ts`
- Status: Fixed in Phase 4. The mixed `sidebar: Array<[string, string]>` field was
  removed from every locale and from the `SiteCopy` type in `src/types/site.ts`.
- Public nav labels now live inline in `app/page.tsx` (`publicNav`); admin IA is defined
  exclusively in `app/admin/**` clients.

### 3. Public Sidebar Links Are Semantically Broken for Admin Entries — RESOLVED
- File: `app/page.tsx`
- Status: Fixed in Phase 4. The sidebar no longer renders `#module-${index}` anchors for
  admin labels; every remaining public link targets a real page section id.

## Affected Page

## `/`
Path: `/`
Purpose: Landing page, public marketing shell, sponsor display, account entry point.
Audience: Public
Current Layout: `app/layout.tsx` plus inline `reference-app` shell
Current Ads: Hero ad carousel, sponsor ribbon, `AdSlot(side_left)`, `AdSlot(side_right)`, `AdSlot(between_sections)`, `AdSlot(floating_bottom)`
Used By: Root route and all preview/home links
Decision: REBUILD
Merge Target: `PublicPageShell`
Reason: The route previously owned both public IA and admin IA; the admin IA (adminNav,
sidebarIndexes, admin chip) was removed in Phase 4. The remaining shell still needs
`PublicPageShell` extraction, but it is now public-only.
Risk: Admins lost the embedded `/admin` launcher; they enter the admin portal via the
admin pages themselves or direct URLs.

## Non-Issues
- No public page imports `DashboardAdminClient`, `UsersAdminClient`, `AdsAdminClient`, or any `app/admin/**` component directly.
- Admin pages do import some shared UI from `src/components` such as `LocationPicker`, which is acceptable shared UI reuse.
