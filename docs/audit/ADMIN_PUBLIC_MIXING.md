# Admin/Public Mixing Audit

## Summary
- Direct imports from `app/admin/**` into public/workspace routes: none found
- Public routes with embedded admin IA/behavior: 1
- Shared files mixing public and admin navigation data: 2 major files

## Findings

### 1. Public Landing Page Embeds Admin Navigation and Admin Role Logic
- File: `app/page.tsx`
- Evidence:
  - Builds `adminNav` with real admin routes.
  - Computes `sidebarIndexes` from admin roles.
  - Renders an admin chip linking to `/admin`.
  - Renders admin links inside the public landing page sidebar.
- Impact:
  - Public shell is not isolated from admin information architecture.
  - Admin discoverability is controlled inside a public route instead of a dedicated admin layout.

### 2. Translation Navigation Data Mixes Public and Admin Labels in One Sidebar Array
- File: `src/data/translations.ts`
- Evidence:
  - `sidebar` arrays contain both public items and admin items in one structure.
  - The first six items are public-facing labels, while later items are admin labels.
- Impact:
  - Public navigation content and admin IA cannot evolve independently.
  - The same translated structure is being overloaded for two different audiences.

### 3. Public Sidebar Links Are Semantically Broken for Admin Entries
- File: `app/page.tsx`
- Evidence:
  - `copy.sidebar` items always render as `#module-${index}` anchors.
  - Real content IDs only exist for `module-1` through `module-4`.
  - Admin-labeled sidebar items therefore point to non-existent anchors.
- Impact:
  - Public/admin mixing is not only conceptual; it also produces dead or misleading navigation.

## Affected Page

## `/`
Path: `/`
Purpose: Landing page, public marketing shell, sponsor display, account entry point, and current admin launcher.
Audience: Public
Current Layout: `app/layout.tsx` plus inline `reference-app` shell
Current Ads: Hero ad carousel, sponsor ribbon, `AdSlot(side_left)`, `AdSlot(side_right)`, `AdSlot(between_sections)`, `AdSlot(floating_bottom)`
Used By: Root route and all preview/home links
Decision: REBUILD
Merge Target: `PublicPageShell` with admin navigation removed to `AdminLayout`
Reason: This route currently owns both public IA and admin IA, which violates the required separation between site and admin portal.
Risk: Removing mixed admin UI requires preserving legitimate admin discoverability somewhere else.

## Non-Issues
- No public page imports `DashboardAdminClient`, `UsersAdminClient`, `AdsAdminClient`, or any `app/admin/**` component directly.
- Admin pages do import some shared UI from `src/components` such as `LocationPicker`, which is acceptable shared UI reuse.
