# Ad Placement Registry

The placement registry in `src/constants/advertising.ts` (`AD_PLACEMENTS`) is
the single source of truth for where advertisements may render. Campaigns may
only target placements that exist in this registry.

## Structure

Each entry:

```ts
{
  key: string;                    // placement id, e.g. "home_top"
  label: { ar: string; en: string; tr: string };
  sections: string[];             // platform sections the placement belongs to
  shape: "horizontal" | "vertical" | "floating" | "popup";
}
```

## Sections

`PLATFORM_SECTIONS_REGISTRY` lists the platform sections, including the
AkarProMax Office section (`office`) in addition to the public sections
(`home`, `properties`, `services`, `offices`, `engineering-tools`,
`contractors`, `consultations`, `auctions`, `news`).

## Office placements

The following office placements are registered under the `office` section:

- `office_dashboard_hero` — dashboard hero banner
- `office_dashboard_sidebar` — dashboard sidebar
- `office_news_inline` — inside office news
- `office_properties_inline` — inside office properties
- `office_services_inline` — inside office services

The Office API layer (`lib/integration/constants.ts` `OFFICE_AD_PLACEMENTS`)
mirrors the same ids; `app/api/office/v1/ads` validates against both the
registry (`isValidPlacement`) and the Office allow-list.

## Validation

- `buildContext` + `isValidPlacement` (`lib/ads/context.ts`) reject any request
  with an unknown placement (`400`).
- `matchAds` computes per-placement inventory health (see
  `AD_ANALYTICS_MODEL.md`) using the same registry so analytics never reference
  placements that do not exist.
- Safe-zone placement policy lives in `src/components/tools/ToolAdPolicy.tsx`
  (see `AD_SAFE_ZONES.md`).
