# Ads Public Layout Policy

Generated: 2026-08-06
Status: ACCEPTED (Phase 2)

## Scope

Defines where ads appear in the unified public shell and what rules they follow.
The ads **engine** (`src/constants/advertising.ts`, targeting, tracking, `AdSlot`)
is unchanged.

## Shell-level placements

1. **Top (`PUBLIC_TOP`)** — `global_header`, eager-loaded, directly under the
   ticker. One per page.
2. **Bottom (`PUBLIC_BOTTOM`)** — `global_footer`, lazy-loaded, after page
   content. One per page.

Both render through `ad-slot-frame.tsx` inside a labelled `<section>` so each
placement is a distinct region for assistive tech.

## Lazy vs eager

The registry `lazy` flag maps to the `eager` prop (`eager = !lazy`). Top ad is
eager (above the fold); bottom ad is lazy (below the fold). This preserves the
existing `AdSlot` contract.

## Page-owned placements stay page-owned

Mid-content, sidebar, hero, and floating placements remain owned by their
respective pages (services hub, property detail, landing). The shell does not
render them and does not centralize their logic.

## No merge of data and presentation

- `AdSlot` = data fetch + business rules + analytics (never rendered directly by
  the shell).
- `ad-slot-frame.tsx` = shell composition (resolves config, labels the region).
- `AdFrame` = presentational primitive (used elsewhere, not at shell level).

This keeps targeting/analytics concerns separate from layout.

## No new targeting or schema

Phase 2 adds no new placements to `AD_PLACEMENTS`, no new `campaignType`, and no
schema migrations. `used: false` entries are documentation-only reservations.
