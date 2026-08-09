# Ad Safe Zones

No advertisement may appear inside critical or trust-sensitive flows. Safe
zones are enforced structurally — the placement registry simply does not define
placements inside these flows, and the component layer adds an explicit policy
where a tool UI is involved.

## Critical flows with no ad placement

- Auth critical forms (login, registration, password reset, OTP entry)
- Verification evidence (identity/document upload and review)
- Find My Land processing and first critical result
- Tool calculation core (the primary input → action → result zone)
- Service request critical submission
- Completion confirmation
- Sensitive trust/security UI (trust badges, verification truth, security
  settings)

## Enforcement

1. **Placement registry** (`src/constants/advertising.ts`): placements are
   defined only for content surfaces (home, listings, details, sidebars, office
   dashboard areas). Critical-flow screens reference no registered placement,
   so no ad can be requested for them.

2. **Tool page policy** (`src/components/tools/ToolAdPolicy.tsx`): the tools
   surface has an explicit rule that on mobile the interaction zone
   (title → input → action → result) stays free of ads — ads may appear only
   **after** the result. The following placements are blocked on mobile:

   ```ts
   BLOCKED_MOBILE_PLACEMENTS = ["tools_hero", "tool_inline", "tool_before_result", "tool_sticky"]
   ```

   Desktop allows contextual side placements only when they do not interrupt
   the task (`shouldRenderAd`, desktop-only `sidebar` position).

3. **Trust vs commercial** (`docs/marketplace/TRUST_VS_COMMERCIAL_RULES.md`):
   paid promotion is kept separate from verification truth, trust badges, GOLD,
   PROMAX, review authenticity and organic ranking. Sponsored content is always
   labeled (`isSponsored` surfaced as "Sponsored" / "إعلان").

## Verification

The certification regression checks that no `AdSlot` reference exists in the
critical-flow pages and that the tool placement policy blocks the listed
mobile placements.
