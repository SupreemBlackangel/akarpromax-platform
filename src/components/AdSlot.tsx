"use client";

import { useEffect, useRef, useState } from "react";
import type { DeviceType } from "@/src/constants/advertising";
import type { AdMatchResult } from "@/lib/ads/types";
import { isVideoAsset } from "@/src/data/locations";
import FloatingAdSlotActions from "@/src/components/FloatingAdSlotActions";

type AdSlotProps = {
  placement: string;
  locale: "ar" | "en" | "tr";
  country: string;
  city?: string;
  deviceType?: DeviceType;
  path?: string;
  entityType?: string;
  entityId?: string | number;
  categoryId?: string | number;
  tags?: string[];
  variant?: "horizontal" | "vertical" | "floating" | "popup";
  className?: string;
  eager?: boolean;
  requestable?: boolean;
  onRequestAd?: () => void;
  onViewDetails?: (slotData: {
    slotId: string;
    slotCode: string;
    pageType: string;
    pageUrl: string;
    adPosition: string;
    country: string;
    region?: string;
    city?: string;
    district?: string;
    latitude?: number;
    longitude?: number;
    radiusKm?: number;
    language: string;
    userId?: string;
    advertiserId?: string;
  }) => void;
  onContact?: (slotData: {
    slotId: string;
    slotCode: string;
    pageType: string;
    pageUrl: string;
    adPosition: string;
    country: string;
    region?: string;
    city?: string;
    district?: string;
    latitude?: number;
    longitude?: number;
    radiusKm?: number;
    language: string;
    userId?: string;
    advertiserId?: string;
  }) => void;
};

function detectDeviceType(): DeviceType {
  if (typeof window === "undefined") return "desktop";
  if (window.matchMedia("(max-width: 720px)").matches) return "mobile";
  if (window.matchMedia("(min-width: 721px) and (max-width: 1024px)").matches) return "tablet";
  return "desktop";
}

function getSessionId(): string {
  try {
    const existing = window.sessionStorage.getItem("akar-ad-session");
    if (existing) return existing;
    const created = crypto.randomUUID();
    window.sessionStorage.setItem("akar-ad-session", created);
    return created;
  } catch {
    return "";
  }
}

const badgeLabel: Record<"ar" | "en" | "tr", string> = { ar: "إعلان", en: "Ad", tr: "Reklam" };

export default function AdSlot({
  placement,
  locale,
  country,
  city,
  deviceType: providedDeviceType,
  path,
  entityType,
  entityId,
  categoryId,
  tags,
  variant = "horizontal",
  className,
  eager = false,
  requestable = false,
  onRequestAd,
  onViewDetails,
  onContact,
}: AdSlotProps) {
  const [ad, setAd] = useState<AdMatchResult | null>(null);
  const [deviceType, setDeviceType] = useState<DeviceType>(providedDeviceType ?? detectDeviceType());
  const [prevProvidedDeviceType, setPrevProvidedDeviceType] = useState(providedDeviceType);
  const [loaded, setLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const impressionSent = useRef(false);

  const sessionId = useRef<string>("");

  if (providedDeviceType !== prevProvidedDeviceType) {
    setPrevProvidedDeviceType(providedDeviceType);
    if (providedDeviceType) setDeviceType(providedDeviceType);
  }

  useEffect(() => {
    sessionId.current = getSessionId();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    impressionSent.current = false;
    (async () => {
      setAd(null);
      setLoaded(false);
      try {
        const res = await fetch("/api/ads/match", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            placement,
            path,
            countryCode: country,
            cityId: city,
            language: locale,
            deviceType,
            entityType,
            entityId,
            categoryId,
            tags,
            sessionId: sessionId.current,
          }),
          cache: "no-store",
          signal: controller.signal,
        });
        const data = await res.json();
        if (controller.signal.aborted) return;
        setAd(Array.isArray(data.ads) && data.ads.length ? data.ads[0] : null);
      } catch {
        if (!controller.signal.aborted) setAd(null);
      } finally {
        if (!controller.signal.aborted) setLoaded(true);
      }
    })();
    return () => controller.abort();
  }, [categoryId, city, country, deviceType, entityId, entityType, locale, path, placement, tags]);

  useEffect(() => {
    const container = containerRef.current;
    if (!ad || !container || impressionSent.current) return;
    let timer: number | undefined;
    const record = () => {
      if (impressionSent.current || document.visibilityState !== "visible") return;
      impressionSent.current = true;
      void fetch("/api/ads/impression", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId: ad.campaignId,
          token: ad.trackingToken,
          placement,
          path,
          countryCode: country,
          cityId: city,
          language: locale,
          deviceType,
          entityType,
          entityId,
          categoryId,
          tags,
          sessionId: sessionId.current,
        }),
        keepalive: true,
      }).catch(() => undefined);
    };
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && entries[0].intersectionRatio >= 0.5) {
        timer ??= window.setTimeout(record, 1000);
      } else if (timer !== undefined) {
        window.clearTimeout(timer);
        timer = undefined;
      }
    }, { threshold: [0.5] });
    observer.observe(container);
    return () => {
      observer.disconnect();
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [ad, categoryId, city, country, deviceType, entityId, entityType, locale, path, placement, tags]);

  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (!ad) return;
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    void fetch("/api/ads/click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        campaignId: ad.campaignId,
        token: ad.trackingToken,
        placement,
        path,
        countryCode: country,
        cityId: city,
        language: locale,
        deviceType,
        entityType,
        entityId,
        categoryId,
        tags,
        sessionId: sessionId.current,
      }),
      keepalive: true,
    })
      .then((res) => res.json())
      .then((data) => {
        window.location.href = typeof data.redirectUrl === "string" ? data.redirectUrl : ad.targetUrl;
      })
      .catch(() => {
        window.location.href = ad.targetUrl;
      });
  };

  if (!ad && !loaded) {
    return <div className={`ad-slot ad-slot-${variant} ad-slot-skeleton${className ? ` ${className}` : ""}`} aria-hidden="true" />;
  }
  if (!ad) {
    if (!requestable) return null;
    const slotData = {
      slotId: `${placement}-${entityType ?? "page"}-${entityId ?? "default"}`,
      slotCode: placement,
      pageType: entityType ?? "page",
      pageUrl: path ?? (typeof window !== "undefined" ? window.location.pathname : ""),
      adPosition: placement,
      country,
      region: city,
      city,
      latitude: undefined as number | undefined,
      longitude: undefined as number | undefined,
      radiusKm: undefined as number | undefined,
      language: locale,
      userId: undefined as string | undefined,
      advertiserId: undefined as string | undefined,
    };
    const handleViewDetails = onViewDetails ? (() => onViewDetails(slotData)) : (() => {});
    const handleContact = onContact ? (() => onContact(slotData)) : (() => {});
    return (
      <div className={`ad-slot ad-slot-${variant} ad-slot-requestable${className ? ` ${className}` : ""}`} dir={locale === "ar" ? "rtl" : "ltr"}>
        <FloatingAdSlotActions
          slotData={slotData}
          locale={locale}
          onRequest={async () => { onRequestAd?.(); }}
          onViewDetails={async () => { handleViewDetails(); }}
          onContact={async () => { handleContact(); }}
        />
      </div>
    );
  }

  return (
    <div className={`ad-slot ad-slot-${variant}${className ? ` ${className}` : ""}`} ref={containerRef} dir={locale === "ar" ? "rtl" : "ltr"}>
      <a
        className="ad-slot-link"
        href={ad.targetUrl}
        target={ad.targetUrl.startsWith("/") ? undefined : "_blank"}
        rel="sponsored noopener"
        onClick={handleClick}
      >
        <span className="ad-slot-media">
          {ad.mediaType === "video" || isVideoAsset(ad.imageUrl)
            ? <video className="ad-slot-asset" src={ad.imageUrl} poster={ad.posterUrl ?? undefined} autoPlay muted loop playsInline preload={eager ? "auto" : "metadata"} />
            : <img className="ad-slot-asset" src={ad.imageUrl} alt="" decoding="async" loading={eager ? "eager" : "lazy"} fetchPriority={eager ? "high" : "auto"} />}
        </span>
        <span className="ad-slot-copy">
          {ad.eyebrow && <span className="ad-slot-eyebrow">{ad.eyebrow}</span>}
          <strong className="ad-slot-title">{ad.title}</strong>
          {ad.accent && <em className="ad-slot-accent">{ad.accent}</em>}
          {ad.description && <span className="ad-slot-desc">{ad.description}</span>}
          {ad.cta && <span className="ad-slot-cta">{ad.cta} ↗</span>}
        </span>
        <span className="ad-slot-badge">{badgeLabel[locale]}</span>
      </a>
    </div>
  );
}
