# Standard Public Ad Layout

`STANDARD_PUBLIC_AD_LAYOUT_V1` defines the managed website advertising contract
for eligible public discovery/content pages.

## Contract

Each standard family owns exactly 8 placement identities:

```text
HERO
SIDE_LEFT_01
SIDE_LEFT_02
SIDE_RIGHT_01
SIDE_RIGHT_02
BOTTOM_01
BOTTOM_02
BOTTOM_03
```

These are real placement IDs, not decorative placeholders.

## Eligible Page Families

- `home`
- `properties`
- `services`
- `providers`
- `provider-detail`
- `offices`
- `office-detail`
- `companies`
- `company-detail`
- `organizations`
- `organization-detail`
- `directory`
- `community`
- `knowledge`
- `about`
- `news`
- `property-detail`

The canonical family map lives in `src/config/standard-public-ad-layout.ts`.

## Safe-Zone Exceptions

The standard layout is intentionally NOT injected into sensitive or task-critical
flows.

Current explicit safe/no-ad flows:

- `/tools`
- `/service-requests/new`
- `/service-requests/[id]/offer`
- `/providers/apply`
- `/advertise`
- `/contact`

These routes opt into `adLayout={{ mode: "safe-no-ads" }}`.

## Runtime Composition

The layout is rendered by `src/components/ads/standard-public-ad-layout.tsx`.

- Hero slot: 1 managed placement at the top of the page content.
- Desktop rails: 2 left + 2 right.
- Tablet/mobile: rail inventory reflows into safe inline positions.
- Bottom row: 3 managed placements before the footer transition.

The layout never fetches hardcoded media directly. It renders only through
`AdSlotFrame` -> `AdSlot` -> `/api/ads/match` -> impression/click analytics.

## Admin Mapping

All visible website placements are defined in `src/constants/advertising.ts`
`AD_PLACEMENTS` with:

- localized label
- website/office channel
- owning section
- page family
- position
- accepted shape
- aspect ratio hint
- `adminSelectable`

The Ads Admin wizard exposes only `visibleAdminPlacements()` so fake placement
options are not shown.

## Responsive Behavior

- Desktop: hero + left/right rails + bottom row.
- Tablet: side inventory reflows below the main content in 2 columns.
- Mobile: no left/right rails; side inventory reflows inline below content.
- Critical safe-zone pages: no inherited shell ads.

## Page Onboarding

To enroll a new public page family in V1:

1. Add the family to `src/config/standard-public-ad-layout.ts`.
2. Register the 8 placement IDs in `src/constants/advertising.ts`.
3. Mark them `adminSelectable: true` and `channel: "website"`.
4. Opt the page into `adLayout={{ mode: "standard", family: "..." }}`.
5. Add/update contract tests.

If a page is sensitive or task-critical instead, use:

```tsx
adLayout={{ mode: "safe-no-ads" }}
```

## Notes

- Office placements stay separate (`channel: "office"`).
- House/fallback behavior remains in the central engine (`lib/ads/engine.ts`).
- Valid impressions/clicks remain placement-specific.
