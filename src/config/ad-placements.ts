/**
 * Central ad placement registry (Phase 2).
 *
 * Canonical Phase 2 placement names map to the STABLE engine placement strings
 * from src/constants/advertising.ts so ad targeting data is unchanged.
 * Only `used: true` entries are rendered by the shell today; the rest are
 * documented reservations (AD_PLACEMENT_REGISTRY.md).
 */
export type PublicAdSlotConfig = {
  key: string;
  /** Stable engine placement string passed to AdSlot (must exist in AD_PLACEMENTS). */
  placement: string;
  variant: "hero" | "horizontal" | "vertical";
  lazy: boolean;
  used: boolean;
  /** Canonical frame id (e.g. HERO, LEFT_01). Optional for legacy slots. */
  canonical?: string;
};

export const PUBLIC_TOP_AD: PublicAdSlotConfig = {
  key: "PUBLIC_TOP",
  placement: "global_header",
  variant: "horizontal",
  lazy: false,
  used: true,
};

export const PUBLIC_BOTTOM_AD: PublicAdSlotConfig = {
  key: "PUBLIC_BOTTOM",
  placement: "global_footer",
  variant: "horizontal",
  lazy: true,
  used: true,
};

export const AD_PLACEMENT_REGISTRY: Record<string, PublicAdSlotConfig> = {
  PUBLIC_TOP: PUBLIC_TOP_AD,
  PUBLIC_BOTTOM: PUBLIC_BOTTOM_AD,
  HOME_HERO: { key: "HOME_HERO", placement: "", variant: "horizontal", lazy: false, used: false },
  PUBLIC_INLINE_1: { key: "PUBLIC_INLINE_1", placement: "between_sections", variant: "horizontal", lazy: true, used: false },
  PUBLIC_INLINE_2: { key: "PUBLIC_INLINE_2", placement: "between_sections", variant: "horizontal", lazy: true, used: false },
  PUBLIC_SIDEBAR: { key: "PUBLIC_SIDEBAR", placement: "listing_sidebar", variant: "vertical", lazy: true, used: false },
};

export function placementConfig(key: string): PublicAdSlotConfig | undefined {
  return AD_PLACEMENT_REGISTRY[key];
}
