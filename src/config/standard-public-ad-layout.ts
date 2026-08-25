import type { PublicAdSlotConfig } from "@/src/config/ad-placements";
import {
  STANDARD_PUBLIC_AD_FAMILY_DEFINITIONS,
  STANDARD_PUBLIC_AD_FAMILY_KEYS,
  STANDARD_PUBLIC_AD_SLOT_DEFINITIONS,
  STANDARD_PUBLIC_AD_SLOT_KEYS,
  type StandardPublicAdLayoutKey,
  type StandardPublicAdSlotKey,
} from "@/src/config/standard-public-ad-registry";

export type { StandardPublicAdLayoutKey, StandardPublicAdSlotKey } from "@/src/config/standard-public-ad-registry";

export type StandardPublicAdSlotConfig = PublicAdSlotConfig & {
  slot: StandardPublicAdSlotKey;
  canonical: string;
};

export type StandardPublicAdLayoutFamily = {
  key: StandardPublicAdLayoutKey;
  pageLabel: { ar: string; en: string; tr: string };
  placements: Record<StandardPublicAdSlotKey, StandardPublicAdSlotConfig>;
  /** False only for families that intentionally suppress the standard HERO ad. */
  heroEnabled: boolean;
};

function createFamily(key: StandardPublicAdLayoutKey): StandardPublicAdLayoutFamily {
  const definition = STANDARD_PUBLIC_AD_FAMILY_DEFINITIONS[key];
  const placements = Object.fromEntries(
    STANDARD_PUBLIC_AD_SLOT_KEYS.map((slotKey) => {
      const slotDefinition = STANDARD_PUBLIC_AD_SLOT_DEFINITIONS[slotKey];
      return [
        slotKey,
        {
          key: `${definition.prefix}_${slotDefinition.keySuffix}`,
          placement: `${definition.prefix}_${slotDefinition.placementSuffix}`,
          slot: slotKey,
          canonical: slotDefinition.canonical,
          variant: slotDefinition.variant,
          lazy: slotDefinition.lazy,
          used: true,
        } satisfies StandardPublicAdSlotConfig,
      ] as const;
    }),
  ) as Record<StandardPublicAdSlotKey, StandardPublicAdSlotConfig>;

  return {
    key,
    pageLabel: definition.label,
    heroEnabled: definition.heroEnabled,
    placements,
  };
}

export const STANDARD_PUBLIC_AD_LAYOUT_V1 = Object.fromEntries(
  STANDARD_PUBLIC_AD_FAMILY_KEYS.map((key) => [key, createFamily(key)] as const),
) as Record<StandardPublicAdLayoutKey, StandardPublicAdLayoutFamily>;

export function getStandardPublicAdLayout(key: StandardPublicAdLayoutKey): StandardPublicAdLayoutFamily {
  return STANDARD_PUBLIC_AD_LAYOUT_V1[key];
}

export function listStandardPublicPlacements(key: StandardPublicAdLayoutKey): StandardPublicAdSlotConfig[] {
  return Object.values(STANDARD_PUBLIC_AD_LAYOUT_V1[key].placements);
}

export function listAllStandardPublicPlacements(): StandardPublicAdSlotConfig[] {
  return Object.values(STANDARD_PUBLIC_AD_LAYOUT_V1).flatMap((family) => Object.values(family.placements));
}
