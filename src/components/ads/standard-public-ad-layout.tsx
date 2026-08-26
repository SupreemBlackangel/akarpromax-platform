import type { ReactNode } from "react";
import type { DeviceType } from "@/src/constants/advertising";
import type { PublicAdSlotConfig } from "@/src/config/ad-placements";
import type { StandardPublicAdLayoutKey } from "@/src/config/standard-public-ad-layout";
import { getStandardPublicAdLayout } from "@/src/config/standard-public-ad-layout";
import PageContainer from "@/src/components/layout/PageContainer";
import dynamic from "next/dynamic";

const AdSlotFrame = dynamic(() => import("@/src/components/ads/ad-slot-frame"), { ssr: false });

type StandardPublicAdLayoutProps = {
  family: StandardPublicAdLayoutKey;
  label: string;
  locale: "ar" | "en" | "tr";
  country: string;
  city?: string;
  deviceType?: DeviceType;
  path: string;
  entityType?: string;
  entityId?: string | number;
  categoryId?: string | number;
  tags?: string[];
  /** Called with the slot config when a visitor clicks an empty frame to advertise. */
  onRequestAd?: (config: PublicAdSlotConfig) => void;
  children: ReactNode;
};

export default function StandardPublicAdLayout({
  family,
  label,
  locale,
  country,
  city,
  deviceType,
  path,
  entityType,
  entityId,
  categoryId,
  tags,
  onRequestAd,
  children,
}: StandardPublicAdLayoutProps) {
  const layout = getStandardPublicAdLayout(family);
  const { sideLeft01, sideLeft02, sideRight01, sideRight02, bottom01, bottom02, bottom03 } = layout.placements;

  const sharedSlotProps = {
    label,
    locale,
    country,
    city,
    deviceType,
    path,
    entityType,
    entityId,
    categoryId,
    tags,
    onRequestAd,
  };

  // NOTE (RTL): LEFT_01/LEFT_02 and RIGHT_01/RIGHT_02 are LOGICAL placement
  // IDs. The app is RTL, so the grid's first column (sideLeft01/sideLeft02)
  // physically renders on the RIGHT side of the main content and the third
  // column (sideRight01/sideRight02) on the LEFT side. This is expected CSS
  // logical behavior, not a bug. Semantic renaming is deferred to a later pass.
  const renderHero = layout.heroEnabled !== false;

  return (
    <div className="standard-public-ad-layout" data-standard-public-ad-layout={family}>
      {renderHero && (
        <PageContainer size="full" className="public-ad-layout-container pt-[var(--space-6)]">
          <AdSlotFrame config={layout.placements.hero} className="standard-public-ad-hero" {...sharedSlotProps} />
        </PageContainer>
      )}

      <PageContainer size="full" className="public-ad-layout-container py-[var(--space-4)]">
        <div className="standard-public-ad-grid grid gap-4 xl:grid-cols-[176px_minmax(0,1fr)_176px] 2xl:grid-cols-[176px_minmax(0,1fr)_176px] xl:gap-4 2xl:gap-6">
          <div className="standard-public-ad-rail hidden xl:flex xl:flex-col xl:gap-4">
            <AdSlotFrame config={sideLeft01} className="standard-public-ad-rail" {...sharedSlotProps} />
            <AdSlotFrame config={sideLeft02} className="standard-public-ad-rail" {...sharedSlotProps} />
          </div>

          <div className="min-w-0 flex-1">
            {children}
          </div>

          <div className="standard-public-ad-rail hidden xl:flex xl:flex-col xl:gap-4">
            <AdSlotFrame config={sideRight01} className="standard-public-ad-rail" {...sharedSlotProps} />
            <AdSlotFrame config={sideRight02} className="standard-public-ad-rail" {...sharedSlotProps} />
          </div>
        </div>
      </PageContainer>

      <PageContainer size="full" className="public-ad-layout-container xl:hidden pb-[var(--space-6)]">
        <div className="grid gap-[var(--space-4)] md:grid-cols-2">
          <AdSlotFrame config={sideLeft01} className="standard-public-ad-inline" {...sharedSlotProps} />
          <AdSlotFrame config={sideLeft02} className="standard-public-ad-inline" {...sharedSlotProps} />
          <AdSlotFrame config={sideRight01} className="standard-public-ad-inline" {...sharedSlotProps} />
          <AdSlotFrame config={sideRight02} className="standard-public-ad-inline" {...sharedSlotProps} />
        </div>
      </PageContainer>

      <PageContainer size="full" className="public-ad-layout-container pb-[var(--space-8)]">
        <div className="grid gap-[var(--space-5)] md:grid-cols-2 xl:grid-cols-3">
          <AdSlotFrame config={bottom01} className="standard-public-ad-bottom" {...sharedSlotProps} />
          <AdSlotFrame config={bottom02} className="standard-public-ad-bottom" {...sharedSlotProps} />
          <AdSlotFrame config={bottom03} className="standard-public-ad-bottom" {...sharedSlotProps} />
        </div>
      </PageContainer>
    </div>
  );
}
