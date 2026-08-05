# Unused Pages

## Summary
- No orphan `page.tsx` files outside the Next route tree were found.
- Routed but unlinked or weakly linked pages found: 3

## Criteria
- No inbound `href`, `router.push`, or menu definition was found.
- Or the route is only reachable by manually typing the URL.

## `/tools`
Path: `/tools`
Purpose: Engineering tools module for authenticated users.
Audience: Workspace
Current Layout: `app/layout.tsx` plus local `ToolsPageClient` shell
Current Ads: None
Used By: Direct URL only
Decision: KEEP
Merge Target: `—`
Reason: It is intentionally isolated, but it is currently undiscoverable from actual route navigation.
Risk: Useful functionality may remain hidden from target users unless surfaced from a workspace entry point.

## `/properties/[id]`
Path: `/properties/[id]`
Purpose: Property detail prototype.
Audience: Public
Current Layout: `app/layout.tsx` plus standalone detail shell
Current Ads: Property-specific inline and sidebar `AdSlot` placements
Used By: Direct URL only
Decision: REBUILD
Merge Target: `PublicPageShell`
Reason: No actual route link points to it, and the page itself is a hardcoded demo rather than a live entity page.
Risk: Deep-link support may be assumed even though the route is not discoverable in-app.

## `/admin/sponsors/requests`
Path: `/admin/sponsors/requests`
Purpose: Pending sponsor approvals queue.
Audience: Admin
Current Layout: `app/layout.tsx` plus standalone requests shell
Current Ads: None
Used By: Direct URL only
Decision: KEEP
Merge Target: `—`
Reason: The workflow is valid and required, but no actual menu or link exposes it.
Risk: Sponsor approval operations remain hidden and may be bypassed by ad hoc direct navigation.

## Notes
- `/services` is not unused, but it is only linked from admin-aware surfaces, not from a true public navigation route.
- `/admin/sponsors/banner`, `/admin/sponsors/new`, `/admin/sponsors/[id]`, and `/admin/sponsors/[id]/edit` are linked from sponsor pages, so they are not unused even though they are structurally redundant.
