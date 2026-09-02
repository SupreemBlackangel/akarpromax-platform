"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import type { DeviceType } from "@/src/constants/advertising";
import type { AdMatchResult } from "@/lib/ads/types";
import { isVideoAsset } from "@/src/data/locations";
import FloatingAdSlotActions from "@/src/components/FloatingAdSlotActions";
import { useGeo } from "@/src/contexts/GeoContext";
import { requestAdMatch } from "@/src/lib/ad-match-batcher";

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
  variant?: "hero" | "horizontal" | "vertical" | "floating" | "popup";
  className?: string;
  eager?: boolean;
  requestable?: boolean;
  onRequestAd?: () => void;
  onStatusChange?: (empty: boolean) => void;
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

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

const badgeLabel: Record<"ar" | "en" | "tr", string> = { ar: "إعلان", en: "Ad", tr: "Reklam" };

const MIN_VISUAL_SECONDS = 5;

type AdSlotState = {
  ads: AdMatchResult[];
  currentIndex: number;
  loaded: boolean;
};

type AdSlotAction =
  | { type: "reset" }
  | { type: "matched"; ads: AdMatchResult[] }
  | { type: "done" }
  | { type: "next" }
  | { type: "prev" }
  | { type: "goto"; index: number };

function adSlotReducer(state: AdSlotState, action: AdSlotAction): AdSlotState {
  switch (action.type) {
    case "reset":
      return { ads: [], currentIndex: 0, loaded: false };
    case "matched":
      return { ...state, ads: action.ads };
    case "done":
      return { ...state, loaded: true };
    case "next":
      return state.ads.length < 2 ? state : { ...state, currentIndex: (state.currentIndex + 1) % state.ads.length };
    case "prev":
      return state.ads.length < 2 ? state : { ...state, currentIndex: (state.currentIndex - 1 + state.ads.length) % state.ads.length };
    case "goto":
      return action.index < 0 || action.index >= state.ads.length ? state : { ...state, currentIndex: action.index };
  }
}

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
  onStatusChange,
  onViewDetails,
  onContact,
}: AdSlotProps) {
  const geo = useGeo();
  const resolvedCountry = geo.isGlobal ? "" : geo.countryCode || country;
  const resolvedRegion = geo.isGlobal ? "" : geo.governorate;
  const resolvedCity = geo.isGlobal ? "" : geo.city || city || "";
  const resolvedDistrict = geo.isGlobal ? "" : geo.district;
  const resolvedLatitude = geo.isGlobal ? null : geo.latitude;
  const resolvedLongitude = geo.isGlobal ? null : geo.longitude;
  const [{ ads, currentIndex, loaded }, dispatch] = useReducer(adSlotReducer, { ads: [], currentIndex: 0, loaded: false });
  const [deviceType, setDeviceType] = useState<DeviceType>(providedDeviceType ?? detectDeviceType());
  const [prevProvidedDeviceType, setPrevProvidedDeviceType] = useState(providedDeviceType);
  const [hovering, setHovering] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState<boolean>(() => prefersReducedMotion());
  const containerRef = useRef<HTMLDivElement | null>(null);
  const impressedRef = useRef<Set<string>>(new Set());
  const sessionId = useRef<string>("");
  const onStatusChangeRef = useRef(onStatusChange);

  const ad = ads[currentIndex] ?? null;
  const paused = hovering || tabHidden || userPaused;

  if (providedDeviceType !== prevProvidedDeviceType) {
    setPrevProvidedDeviceType(providedDeviceType);
    if (providedDeviceType) setDeviceType(providedDeviceType);
  }

  useEffect(() => {
    onStatusChangeRef.current = onStatusChange;
  }, [onStatusChange]);

  useEffect(() => {
    sessionId.current = getSessionId();
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (event: MediaQueryListEvent) => setReducedMotion(event.matches);
    media.addEventListener?.("change", onChange);
    return () => media.removeEventListener?.("change", onChange);
  }, []);

  useEffect(() => {
    const onVisibility = () => setTabHidden(document.visibilityState !== "visible");
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    impressedRef.current = new Set();
    dispatch({ type: "reset" });
    onStatusChangeRef.current?.(false);
    (async () => {
      let matched: AdMatchResult[] = [];
      try {
        matched = await requestAdMatch(
          {
            placement,
            path,
            domain: typeof window !== "undefined" ? window.location.hostname : undefined,
            countryCode: resolvedCountry,
            regionId: resolvedRegion,
            cityId: resolvedCity,
            districtId: resolvedDistrict,
            latitude: resolvedLatitude,
            longitude: resolvedLongitude,
            language: locale,
            deviceType,
            entityType,
            entityId,
            categoryId,
            tags,
            sessionId: sessionId.current,
            count: 3,
          },
          controller.signal,
        );
        if (controller.signal.aborted) return;
        dispatch({ type: "matched", ads: matched });
      } catch {
        if (!controller.signal.aborted) dispatch({ type: "matched", ads: [] });
      } finally {
        if (!controller.signal.aborted) {
          dispatch({ type: "done" });
          if (!requestable) onStatusChangeRef.current?.(matched.length === 0);
        }
      }
    })();
    return () => controller.abort();
  }, [categoryId, deviceType, entityId, entityType, locale, path, placement, requestable, resolvedCity, resolvedCountry, resolvedDistrict, resolvedLatitude, resolvedLongitude, resolvedRegion, tags]);

  useEffect(() => {
    if (ads.length < 2 || reducedMotion || paused) return;
    const current = ads[currentIndex];
    const seconds = Math.max(MIN_VISUAL_SECONDS, current?.durationSeconds ?? MIN_VISUAL_SECONDS);
    const timer = window.setTimeout(() => {
      dispatch({ type: "next" });
    }, seconds * 1000);
    return () => window.clearTimeout(timer);
  }, [ads, currentIndex, paused, reducedMotion]);

  useEffect(() => {
    if (loaded || ads.length > 0 || requestable) return;
    const timer = window.setTimeout(() => {
      dispatch({ type: "done" });
      onStatusChangeRef.current?.(true);
    }, 60000);
    return () => window.clearTimeout(timer);
  }, [ads.length, loaded, requestable]);

  useEffect(() => {
    const container = containerRef.current;
    const currentAd = ads[currentIndex];
    if (!currentAd || !container) return;
    const key = `${currentAd.campaignId}:${currentAd.creativeId ?? "main"}`;
    if (impressedRef.current.has(key)) return;
    let timer: number | undefined;
    const record = () => {
      if (impressedRef.current.has(key) || document.visibilityState !== "visible") return;
      impressedRef.current.add(key);
      void fetch("/api/ads/impression", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId: currentAd.campaignId,
          token: currentAd.trackingToken,
          placement,
          path,
          countryCode: resolvedCountry,
          regionId: resolvedRegion,
          cityId: resolvedCity,
          districtId: resolvedDistrict,
          latitude: resolvedLatitude,
          longitude: resolvedLongitude,
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
  }, [ads, currentIndex, categoryId, deviceType, entityId, entityType, locale, path, placement, resolvedCity, resolvedCountry, resolvedDistrict, resolvedLatitude, resolvedLongitude, resolvedRegion, tags]);

  /**
   * Every ad links through the click tracker, which counts the click and then
   * redirects to the advertiser.
   *
   * The slot used to preventDefault, POST, wait for the response and assign
   * location.href. That forced external ads into the current tab even though
   * the anchor carried target="_blank", made the visitor wait out a round trip
   * before anything happened, and recorded nothing for a middle-click or a
   * cmd-click, because the handler bailed on modifier keys and the href pointed
   * straight at the advertiser. Letting the browser navigate to the tracker
   * handles all of those the same way, with no JavaScript in the path.
   */
  const trackerHref = ad
    ? `/api/ads/click?token=${encodeURIComponent(ad.trackingToken)}&locale=${encodeURIComponent(locale)}`
    : "#";

  if (!ad && !loaded) {
    return <div className={`ad-slot ad-slot-${variant} ad-slot-skeleton${className ? ` ${className}` : ""}`} aria-hidden="true" />;
  }
  if (!ad) {
    if (!requestable) {
      return null;
    }
    const slotData = {
      slotId: `${placement}-${entityType ?? "page"}-${entityId ?? "default"}`,
      slotCode: placement,
      pageType: entityType ?? "page",
      pageUrl: path ?? (typeof window !== "undefined" ? window.location.pathname : ""),
      adPosition: placement,
      country: resolvedCountry,
      region: resolvedRegion || undefined,
      city: resolvedCity || undefined,
      district: resolvedDistrict || undefined,
      latitude: resolvedLatitude ?? undefined,
      longitude: resolvedLongitude ?? undefined,
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

  const heroControls = variant === "hero" && ads.length > 1;
  const controlsLabel = locale === "ar" ? "التحكم في الإعلانات" : locale === "tr" ? "Reklam kontrolleri" : "Ad controls";
  const prevLabel = locale === "ar" ? "الإعلان السابق" : locale === "tr" ? "Önceki reklam" : "Previous ad";
  const nextLabel = locale === "ar" ? "الإعلان التالي" : locale === "tr" ? "Sonraki reklam" : "Next ad";
  const pauseLabel = userPaused
    ? (locale === "ar" ? "استئناف الإعلانات" : locale === "tr" ? "Reklamları sürdür" : "Resume ads")
    : (locale === "ar" ? "إيقاف الإعلانات مؤقتًا" : locale === "tr" ? "Reklamları duraklat" : "Pause ads");

  return (
    <div
      className={`ad-slot ad-slot-${variant}${paused && heroControls ? " is-paused" : ""}${className ? ` ${className}` : ""}`}
      ref={containerRef}
      dir={locale === "ar" ? "rtl" : "ltr"}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <a
        key={`${ad.campaignId}:${ad.creativeId ?? "main"}`}
        className="ad-slot-link"
        href={trackerHref}
        target={ad.targetUrl.startsWith("/") ? undefined : "_blank"}
        rel="sponsored noopener noreferrer"
      >
        <span className="ad-slot-media">
          {ad.mediaType === "video" || isVideoAsset(ad.imageUrl)
            ? <video className="ad-slot-asset" src={ad.imageUrl} poster={ad.posterUrl ?? undefined} autoPlay muted loop playsInline preload={eager ? "auto" : "metadata"} />
            : <img
                className="ad-slot-asset"
                src={ad.imageUrl}
                /* Ad images are meaningful and clickable — never decorative. */
                alt={ad.imageAlt || ad.title || ad.advertiserName || ""}
                /* Intrinsic size lets the browser reserve the box before the
                   bytes arrive, which removes the load-time layout shift. */
                width={ad.imageWidth ?? undefined}
                height={ad.imageHeight ?? undefined}
                decoding="async"
                loading={eager ? "eager" : "lazy"}
                fetchPriority={eager ? "high" : "auto"}
                /* A dead media_url used to render a broken-image box; hide the
                   asset instead and let the copy block carry the ad. */
                onError={(event) => { event.currentTarget.style.display = "none"; }}
              />}
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
      {heroControls && (
        <div className="hero-ad-controls" aria-label={controlsLabel}>
          <button className="hero-arrow" type="button" aria-label={prevLabel} onClick={() => dispatch({ type: "prev" })}>‹</button>
          <div className="hero-ad-dots">
            {ads.map((entry, index) => (
              <button
                key={`${entry.campaignId}:${entry.creativeId ?? index}`}
                type="button"
                className={index === currentIndex ? "active" : ""}
                aria-label={`${locale === "ar" ? "عرض الإعلان" : locale === "tr" ? "Reklamı göster" : "Show ad"} ${index + 1}`}
                aria-current={index === currentIndex || undefined}
                onClick={() => dispatch({ type: "goto", index })}
              >
                <span style={index === currentIndex ? { animationDuration: `${Math.max(MIN_VISUAL_SECONDS, entry.durationSeconds ?? MIN_VISUAL_SECONDS)}s` } : undefined} />
              </button>
            ))}
          </div>
          <button className="hero-pause" type="button" aria-label={pauseLabel} aria-pressed={userPaused} onClick={() => setUserPaused((p) => !p)}>
            {userPaused ? "▶" : "Ⅱ"}
          </button>
          <button className="hero-arrow" type="button" aria-label={nextLabel} onClick={() => dispatch({ type: "next" })}>›</button>
        </div>
      )}
    </div>
  );
}
