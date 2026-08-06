"use client";

import type { DeviceType } from "@/src/constants/advertising";
import AdSlot from "@/src/components/AdSlot";
import type { PublicAdSlotConfig } from "@/src/config/ad-placements";
import { cn } from "@/src/utils/cn";

/**
 * Shell-level composition point for public ad placements.
 * AdSlot (data/business/analytics) stays the single ad source; this component
 * gives the placement a consistent labelled region and resolves the registry
 * config. AdFrame (presentational primitive) is intentionally NOT merged here.
 */
type AdSlotFrameProps = {
  config: PublicAdSlotConfig;
  label: string;
  locale: "ar" | "en" | "tr";
  country: string;
  city?: string;
  deviceType?: DeviceType;
  path?: string;
  className?: string;
  requestable?: boolean;
  onRequestAd?: () => void;
};

export default function AdSlotFrame({
  config,
  label,
  locale,
  country,
  city,
  deviceType,
  path,
  className = "",
  requestable = false,
  onRequestAd,
}: AdSlotFrameProps) {
  return (
    <section aria-label={label} className={cn("public-ad-slot", className)}>
      <AdSlot
        placement={config.placement}
        locale={locale}
        country={country}
        city={city}
        deviceType={deviceType}
        path={path}
        variant={config.variant}
        eager={!config.lazy}
        requestable={requestable}
        onRequestAd={onRequestAd}
      />
    </section>
  );
}
