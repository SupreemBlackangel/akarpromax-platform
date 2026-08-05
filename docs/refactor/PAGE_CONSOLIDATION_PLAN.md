# PAGE CONSOLIDATION PLAN

## Group 1: Sponsor Domain Root Consolidation
Current pages:
- `/admin/sponsors`
- `/admin/sponsors/banner`
- `/admin/sponsors/requests`

Problem:
- The sponsor domain is split across two parallel admin entry points and one hidden requests page.
- `/admin/sponsors` uses `SponsorsListView` + `/api/sponsor-profiles`.
- `/admin/sponsors/banner` uses `SponsorAdminClient` + `/api/sponsors` + `/api/sponsor-access`.
- `/admin/sponsors/requests` is valid but unlinked.

Target page:
- `/admin/organizations`

Merge strategy:
- Convert the sponsor domain into one organizations admin surface.
- Preserve three sponsor-specific views inside `/admin/organizations`:
  - Organizations list
  - Sponsorship requests queue
  - Selected organization detail tabs
- Move legacy sponsor campaign/access/analytics functions into organization tabs instead of keeping `/banner` as a separate route.
- Keep sponsor scope as a filter or entity type inside organizations, not as a standalone route family.

Components to preserve:
- `SponsorsListView` filtering/table behavior
- `SponsorRequestsView` approval flow
- Sponsor analytics/access sections from `SponsorAdminClient`

Components to remove:
- Separate `/admin/sponsors/banner` route shell
- Duplicate sponsor-specific admin sidebars and headers

Data dependencies:
- `/api/sponsor-profiles`
- `/api/sponsors`
- `/api/sponsor-access`
- `/api/sponsor-contracts`
- `/api/sponsor-subscriptions`
- `/api/sponsor-payments`
- `/api/sponsor-invoices`
- `/api/sponsor-activity`

Redirects:
- `/admin/sponsors` -> `/admin/organizations?scope=sponsors`
- `/admin/sponsors/banner` -> `/admin/organizations?scope=sponsors&tab=sponsorship`
- `/admin/sponsors/requests` -> `/admin/organizations?scope=sponsors&tab=requests`

Permissions:
- `SPONSORS_VIEW`
- `SPONSORS_CREATE`
- `SPONSORS_UPDATE`
- `SPONSORS_APPROVE`
- `USERS_VIEW`
- `USERS_CREATE`
- `REPORTS_VIEW`

Tests:
- Authorized user can open organizations list in sponsor scope
- Hidden requests tab appears only with approval permission
- Legacy sponsor routes resolve to the correct target state
- List and sponsorship tabs load the same organization consistently

Risk:
- Two sponsor data models may not align one-to-one, so entity linking rules must be defined before merge.

## Group 2: Sponsor Create/Edit Wizard Consolidation
Current pages:
- `/admin/sponsors/new`
- `/admin/sponsors/[id]/edit`

Problem:
- The create and edit forms are almost identical.
- Both duplicate country lists, location picking, submit payload shape, validation assumptions, and navigation.

Target page:
- `/admin/organizations`

Merge strategy:
- Replace separate create/edit pages with one sponsor wizard running inside the organizations surface.
- Use mode switching:
  - `create`
  - `edit`
- Preserve one field schema and one submit adapter.

Components to preserve:
- Field layout and labels from `NewSponsorForm`
- Default-value hydration and fetch behavior from `EditSponsorForm`
- `LocationPicker`

Components to remove:
- Standalone `NewSponsorForm` page route
- Standalone `EditSponsorForm` page route
- Duplicated static country arrays in both forms

Data dependencies:
- `/api/sponsor-profiles`
- location API and location shared components

Redirects:
- `/admin/sponsors/new` -> `/admin/organizations?scope=sponsors&mode=create`
- `/admin/sponsors/[id]/edit` -> `/admin/organizations?scope=sponsors&organizationId=:id&tab=profile&mode=edit`

Permissions:
- `SPONSORS_CREATE`
- `SPONSORS_UPDATE`

Tests:
- Create mode starts empty and saves a new record
- Edit mode hydrates from the selected organization
- Same validation rules work in both modes
- Cancel returns to the organizations context without route drift

Risk:
- Mode handling can become fragile if route/query/state ownership is not centralized.

## Group 3: Sponsor Detail Consolidation Into One Tabbed Entity View
Current pages:
- `/admin/sponsors/[id]`
- `/admin/sponsors/[id]/edit`
- relevant analytics/access subsections currently embedded in `/admin/sponsors/banner`

Problem:
- One entity is split into separate detail and edit routes.
- Related access, sponsorship, billing, and analytics capabilities are elsewhere.

Target page:
- `/admin/organizations`

Merge strategy:
- Use one selected-organization surface with tabs.
- Required sponsor tabs:
  - Overview
  - Profile
  - Sponsorship
  - Members & Access
  - Billing & Contracts
  - Activity
  - Reports
- Detail and edit become tab/mode states, not separate routes.

Components to preserve:
- `SponsorDetailView` read-only fields
- edit form field set
- sponsor analytics cards from `SponsorAdminClient`
- access list patterns from sponsor/admin user views where relevant

Components to remove:
- Separate sponsor detail route shell
- Separate sponsor edit route shell
- Sponsor-specific duplicate analytics surface if the same tab exists

Data dependencies:
- `/api/sponsor-profiles`
- `/api/sponsors`
- `/api/sponsor-access`
- `/api/sponsor-events`
- `/api/sponsor-activity`
- billing and contract endpoints

Redirects:
- `/admin/sponsors/[id]` -> `/admin/organizations?scope=sponsors&organizationId=:id&tab=overview`
- `/admin/sponsors/[id]/edit` -> `/admin/organizations?scope=sponsors&organizationId=:id&tab=profile&mode=edit`

Permissions:
- `SPONSORS_VIEW`
- `SPONSORS_UPDATE`
- `USERS_VIEW`
- `REPORTS_VIEW`
- billing/contract permissions as mapped from sponsor roles

Tests:
- Organization detail tabs load consistently for the same ID
- Edit mode preserves organization context
- Reports tab respects reporting permission
- Access tab hides when permission is missing

Risk:
- Legacy data may represent sponsor campaign rows and sponsor profile rows as different entities.

## Group 4: Content Admin Consolidation
Current pages:
- `/admin/news`
- `/admin/i18n`

Problem:
- News and translations are separate admin routes even though the final route map permits one content domain route.
- `/admin/i18n` is advanced tooling beyond MVP but still overlaps with content operations.

Target page:
- `/admin/content`

Merge strategy:
- Merge operational content functions under one content hub.
- Keep MVP tabs:
  - News
  - Content Blocks / Managed Copy
  - Deferred: Translations advanced tooling
- If advanced translation tooling is retained temporarily, expose it as a restricted tab, not a primary route.

Components to preserve:
- `NewsAdminClient` CRUD behavior and filters
- safe portions of `I18nAdminClient` that are still required during transition

Components to remove:
- standalone `/admin/news` route shell
- standalone `/admin/i18n` route shell

Data dependencies:
- `/api/news`
- `/api/i18n/admin/keys`
- `/api/i18n/admin/values`
- `/api/i18n/admin/versions`

Redirects:
- `/admin/news` -> `/admin/content?tab=news`
- `/admin/i18n` -> `/admin/content?tab=translations`

Permissions:
- `NEWS_VIEW`, `NEWS_CREATE`, `NEWS_UPDATE`, `NEWS_PUBLISH`, `NEWS_DELETE`
- `I18N_VIEW`, `I18N_EDIT`, `I18N_PUBLISH`

Tests:
- Content route opens news tab correctly
- Translation tab is permission-gated
- Legacy URLs redirect to the correct tab

Risk:
- Translation tooling is broader than MVP and may need temporary retention without keeping it in the primary admin IA.

## Group 5: Admin Settings Scope Correction
Current pages:
- `/admin/settings`

Problem:
- The route name implies global settings, but the page currently manages sponsor plans/pricing only.

Target page:
- `/admin/settings`

Merge strategy:
- Keep the route, but convert it into a true settings hub.
- Move current pricing/plans UI into a `Pricing & Plans` tab.
- Reserve additional tabs for system settings, feature flags, legal/policy, and operational defaults as they are approved.

Components to preserve:
- plan list
- create/edit plan form
- plan activation/deactivation workflow

Components to remove:
- route-level assumption that pricing equals all settings

Data dependencies:
- `/api/sponsor-plans`
- `/api/user-context`

Redirects:
- none at route level now
- future internal tab default: `/admin/settings?tab=pricing`

Permissions:
- `SETTINGS_MANAGE`

Tests:
- settings route defaults to pricing tab during transition
- tab guard prevents unauthorized access

Risk:
- If the route is repurposed too early, operators may temporarily lose the direct pricing mental model they use today.

## Group 6: Deferred Modules and Non-MVP Surfaces
Current pages:
- `/tools`
- current prototype `/properties/[id]`

Problem:
- `/tools` is a valid deferred module but should not appear in the main IA.
- `/properties/[id]` is discoverability-poor and demo-grade, not ready as a stable reference implementation.

Target page:
- `/tools` remains deferred
- `/properties/[id]` remains in the final public map but must be rebuilt

Merge strategy:
- Do not delete `/tools`.
- Remove `/tools` from primary navigation and expose it only through deferred/module access later.
- Rebuild `/properties/[id]` on `PublicPageShell` with real data and standardized ads.

Components to preserve:
- working engineering calculators
- reusable property-detail content sections that survive the new shell
- `AdSlot` integration points, but not the hardcoded placement/path usage

Components to remove:
- standalone tools header shell
- standalone property header/footer shell
- hardcoded property demo content and hardcoded ad path values

Data dependencies:
- `/api/user-context`
- `/api/auth/*`
- `/api/ads/match`, `/api/ads/impression`, `/api/ads/click`
- future property API source

Redirects:
- none for `/tools`
- none for `/properties/[id]`

Permissions:
- `/tools`: `TOOLS_USE`
- `/properties/[id]`: public read

Tests:
- `/tools` remains accessible only to authorized users
- `/tools` is absent from primary public navigation
- rebuilt property detail uses standardized shell and ad contract

Risk:
- Hiding a currently direct-access module can create discoverability complaints if a replacement access path is not planned.
