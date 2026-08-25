"use client";

import { useEffect, useRef, useSyncExternalStore, useState } from "react";

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
function subscribeToReviewLocation(callback: () => void): () => void {
  window.addEventListener("popstate", callback);
  window.addEventListener("hashchange", callback);
  return () => {
    window.removeEventListener("popstate", callback);
    window.removeEventListener("hashchange", callback);
  };
}

function getReviewLocationSnapshot(): boolean {
  return typeof window !== "undefined" && window.location.search.includes("adreview=1");
}

type AdSlotFrameProps = {
  config: PublicAdSlotConfig;
  label: string;
  locale: "ar" | "en" | "tr";
  country: string;
  city?: string;
  deviceType?: DeviceType;
  path?: string;
  entityType?: string;
  entityId?: string | number;
  categoryId?: string | number;
  tags?: string[];
  className?: string;
  requestable?: boolean;
  onRequestAd?: () => void;
};

const REVIEW_LABEL: Record<"ar" | "en" | "tr", string> = {
  ar: "مساحة إعلانية",
  en: "Ad space",
  tr: "Reklam alanı",
};

export default function AdSlotFrame({
  config,
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
  className = "",
  requestable = false,
  onRequestAd,
}: AdSlotFrameProps) {
  const reviewViaQuery = useSyncExternalStore(
    subscribeToReviewLocation,
    getReviewLocationSnapshot,
    () => false,
  );
  const reviewViaEnv = process.env.NEXT_PUBLIC_ADS_REVIEW_MODE === "1";
  const reviewMode = reviewViaEnv || reviewViaQuery;
  const [isEmpty, setIsEmpty] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(!config.lazy);
  const frameRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!config.lazy || reviewMode || shouldLoad) return;
    const frame = frameRef.current;
    if (!frame) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setShouldLoad(true);
        observer.disconnect();
      },
      { rootMargin: "400px 0px" },
    );
    observer.observe(frame);
    return () => observer.disconnect();
  }, [config.lazy, reviewMode, shouldLoad]);

  return (
    <section
      ref={frameRef}
      aria-label={label}
      className={cn("public-ad-slot", className)}
      data-placement={config.placement}
      data-canonical={config.canonical ?? config.key}
    >
      {isEmpty && !reviewMode ? (
        <div
          className={`ad-slot ad-slot-${config.variant} ad-slot-empty`}
          role="img"
          aria-label={`${label}: ${config.placement}`}
          data-slot-key={config.key}
        >
          <span className="ad-slot-empty-label">{REVIEW_LABEL[locale]}</span>
          <span className="ad-slot-empty-placement">{config.canonical ?? config.key}</span>
        </div>
      ) : reviewMode ? (
        <div className="ad-slot-review" role="img" aria-label={`${label}: ${config.placement}`} data-slot-key={config.key}>
          <span className="ad-slot-review-label">{REVIEW_LABEL[locale]}</span>
          <span className="ad-slot-review-id">{config.canonical ?? config.key}</span>
          <span className="ad-slot-review-placement">{config.placement}</span>
          <span className="ad-slot-review-variant">
            {config.variant}
            {config.lazy ? " · lazy" : " · eager"}
          </span>
        </div>
      ) : shouldLoad ? (
        <AdSlot
          placement={config.placement}
          locale={locale}
          country={country}
          city={city}
          deviceType={deviceType}
          path={path}
          entityType={entityType}
          entityId={entityId}
          categoryId={categoryId}
          tags={tags}
          variant={config.variant}
          eager={!config.lazy}
          requestable={requestable}
          onRequestAd={onRequestAd}
          onStatusChange={setIsEmpty}
        />
      ) : (
        <div className={`ad-slot ad-slot-${config.variant} ad-slot-deferred`} aria-hidden="true" />
      )}
    </section>
  );
}
