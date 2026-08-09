import type { ReactNode } from "react";
import type { DeviceType } from "@/src/constants/advertising";
import type { StandardPublicAdLayoutKey } from "@/src/config/standard-public-ad-layout";
import { getStandardPublicAdLayout } from "@/src/config/standard-public-ad-layout";
import PageContainer from "@/src/components/layout/PageContainer";
import AdSlotFrame from "@/src/components/ads/ad-slot-frame";

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
  children,
}: StandardPublicAdLayoutProps) {
  const layout = getStandardPublicAdLayout(family);
  const { hero, sideLeft01, sideLeft02, sideRight01, sideRight02, bottom01, bottom02, bottom03 } = layout.placements;

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
  };

  return (
    <div data-standard-public-ad-layout={family}>
      <PageContainer size="wide" className="pt-[var(--space-6)]">
        <AdSlotFrame config={hero} className="standard-public-ad-hero" {...sharedSlotProps} />
      </PageContainer>

      <PageContainer size="wide" className="py-[var(--space-6)]">
        <div className="grid gap-[var(--space-6)] xl:grid-cols-[minmax(180px,220px)_minmax(0,1fr)_minmax(180px,220px)]">
          <aside className="hidden xl:flex xl:flex-col xl:gap-[var(--space-6)]">
            <AdSlotFrame config={sideLeft01} className="standard-public-ad-rail standard-public-ad-rail-left" {...sharedSlotProps} />
            <AdSlotFrame config={sideLeft02} className="standard-public-ad-rail standard-public-ad-rail-left" {...sharedSlotProps} />
          </aside>

          <div className="min-w-0">{children}</div>

          <aside className="hidden xl:flex xl:flex-col xl:gap-[var(--space-6)]">
            <AdSlotFrame config={sideRight01} className="standard-public-ad-rail standard-public-ad-rail-right" {...sharedSlotProps} />
            <AdSlotFrame config={sideRight02} className="standard-public-ad-rail standard-public-ad-rail-right" {...sharedSlotProps} />
          </aside>
        </div>
      </PageContainer>

      <PageContainer size="wide" className="pb-[var(--space-6)] xl:hidden">
        <div className="grid gap-[var(--space-5)] md:grid-cols-2">
          <AdSlotFrame config={sideLeft01} className="standard-public-ad-inline" {...sharedSlotProps} />
          <AdSlotFrame config={sideRight01} className="standard-public-ad-inline" {...sharedSlotProps} />
          <AdSlotFrame config={sideLeft02} className="standard-public-ad-inline" {...sharedSlotProps} />
          <AdSlotFrame config={sideRight02} className="standard-public-ad-inline" {...sharedSlotProps} />
        </div>
      </PageContainer>

      <PageContainer size="wide" className="pb-[var(--space-8)]">
        <div className="grid gap-[var(--space-5)] md:grid-cols-2 xl:grid-cols-3">
          <AdSlotFrame config={bottom01} className="standard-public-ad-bottom" {...sharedSlotProps} />
          <AdSlotFrame config={bottom02} className="standard-public-ad-bottom" {...sharedSlotProps} />
          <AdSlotFrame config={bottom03} className="standard-public-ad-bottom md:col-span-2 xl:col-span-1" {...sharedSlotProps} />
        </div>
      </PageContainer>
    </div>
  );
}
