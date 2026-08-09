"use client";
/* eslint-disable @next/next/no-img-element -- Sponsor logos and country flags are runtime-managed URLs. */

import { useEffect, useRef, useState } from "react";
import React from "react";
import Link from "next/link";
import { Wrench } from "lucide-react";
import LocationChip from "@/src/components/LocationChip";
import AccountDialog from "@/src/components/AccountDialog";
import Brand from "@/src/components/Brand";
import CountryFlag from "@/src/components/CountryFlag";
import SponsorIdentity from "@/src/components/SponsorIdentity";
import NewsTicker from "@/src/components/NewsTicker";
import StandardPublicAdLayout from "@/src/components/ads/standard-public-ad-layout";
import MobileNavigation from "@/src/components/public/mobile-navigation";
import PublicSidebar from "@/src/components/public/public-sidebar";
import { getPublicNav } from "@/src/config/public-navigation";
import type { Locale, PublicSponsor, ThemeMode, ViewerContext } from "@/src/types/site";
import {
  citiesForCountry,
  countryOptions,
  currenciesByCountry,
  detectCity,
  detectCityByName,
  detectCountry,
  isVideoAsset,
  selectedCityOf,
  selectedCountryOf,
  sponsorBannerByCountry,
  sponsorToneByCountry,
} from "@/src/data/locations";
import { languageOptions, roleLabels, themeOptions, translations } from "@/src/data/translations";
import type { PublicProperty } from "@/lib/properties-format";

export default function Home() {
  const [locale, setLocale] = useState<Locale>("ar");
  const [languageOpen, setLanguageOpen] = useState(false);
  const [country, setCountry] = useState("om");
  const [countryOpen, setCountryOpen] = useState(false);
  const [city, setCity] = useState("om-muscat");
  const [cityOpen, setCityOpen] = useState(false);
  const [themeMode, setThemeMode] = useState<ThemeMode>("system");
  const [themeOpen, setThemeOpen] = useState(false);
  const [themeReady, setThemeReady] = useState(false);
  const [sidebarPinned, setSidebarPinned] = useState(false);
  const [activeSponsor, setActiveSponsor] = useState<PublicSponsor | null>(null);
  const [featuredProperties, setFeaturedProperties] = useState<PublicProperty[]>([]);
  const [deviceType, setDeviceType] = useState<"desktop" | "mobile">("desktop");
  const [viewer, setViewer] = useState<ViewerContext>({ authenticated: false, email: null, displayName: "Guest", role: "guest", countryCode: null, permissions: [] });
  const [accountOpen, setAccountOpen] = useState(false);
  const [accountMode, setAccountMode] = useState<"login" | "register">("login");
  const [currentPath, setCurrentPath] = useState("/");
  const dropdownCloseTimers = useRef<Partial<Record<"country" | "city" | "language" | "theme", number>>>({});
  const copy = translations[locale];
  const direction = locale === "ar" ? "rtl" : "ltr";
  const selectedLanguage = languageOptions.find((option) => option.id === locale) ?? languageOptions[0];
  const selectedTheme = themeOptions.find((option) => option.id === themeMode) ?? themeOptions[0];
  const selectedCountry = selectedCountryOf(country);
  const selectedCity = selectedCityOf(country, city);
  const selectedCurrency = currenciesByCountry[country] ?? currenciesByCountry.om;
  const selectedSponsorTone = sponsorToneByCountry[country] ?? "blue";
  const sponsorContactHref = `mailto:partners@akarpromax.om?subject=${encodeURIComponent(`AkarPromax sponsor — ${selectedCountry.names.en}`)}`;
  const sponsorBannerUrl = activeSponsor?.bannerUrl || sponsorBannerByCountry[country] || "/sponsors/arab-blue.webp";
  const sponsorLogoUrl = activeSponsor?.logoUrl || null;
  const sponsorName = activeSponsor ? (locale === "ar" ? activeSponsor.nameAr : locale === "tr" ? activeSponsor.nameTr : activeSponsor.nameEn) : copy.sponsorAvailable;
  const sponsorTargetHref = activeSponsor?.websiteUrl || sponsorContactHref;
  const sponsorActionLabel = activeSponsor ? (locale === "ar" ? "زيارة الراعي" : locale === "tr" ? "Sponsoru ziyaret et" : "Visit sponsor") : copy.sponsorCta;
  const sponsorPlacements = activeSponsor?.placements ?? ["header", "content", "footer"];
  const publicNav = getPublicNav(viewer);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Keep the UI consistent even if the local logout request fails.
    }
    setViewer({ authenticated: false, email: null, displayName: "Guest", role: "guest", countryCode: null, permissions: [] });
    setSidebarPinned(false);
  };

  const trackSponsorEvent = (placement: "header" | "content" | "footer", eventType: "impression" | "click") => {
    if (!activeSponsor) return;
    void fetch("/api/sponsor-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sponsorId: activeSponsor.id, countryCode: country, placement, eventType }),
      keepalive: true,
    }).catch(() => undefined);
  };


  const cancelDropdownClose = (key: "country" | "city" | "language" | "theme") => {
    const timer = dropdownCloseTimers.current[key];
    if (timer !== undefined) {
      window.clearTimeout(timer);
      delete dropdownCloseTimers.current[key];
    }
  };

  const scheduleDropdownClose = (key: "country" | "city" | "language" | "theme", close: () => void) => {
    cancelDropdownClose(key);
    dropdownCloseTimers.current[key] = window.setTimeout(() => {
      close();
      delete dropdownCloseTimers.current[key];
    }, 120);
  };

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = direction;
    document.title = copy.metaTitle;
  }, [copy.metaTitle, direction, locale]);

  useEffect(() => {
    const syncPath = () => setCurrentPath(`${window.location.pathname}${window.location.search}${window.location.hash}`);
    syncPath();
    window.addEventListener("hashchange", syncPath);
    window.addEventListener("popstate", syncPath);
    return () => {
      window.removeEventListener("hashchange", syncPath);
      window.removeEventListener("popstate", syncPath);
    };
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 720px)");
    const updateDevice = () => setDeviceType(media.matches ? "mobile" : "desktop");
    updateDevice();
    media.addEventListener("change", updateDevice);
    return () => media.removeEventListener("change", updateDevice);
  }, []);

  useEffect(() => {
    const storedTheme = window.localStorage.getItem("akarpromax-theme");
    let mounted = true;
    window.queueMicrotask(() => {
      if (!mounted) return;
      if (storedTheme === "system" || storedTheme === "light" || storedTheme === "dark") setThemeMode(storedTheme);
      setThemeReady(true);
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!themeReady) return;
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
    const applyTheme = () => {
      const resolvedTheme = themeMode === "system" ? (systemTheme.matches ? "dark" : "light") : themeMode;
      document.documentElement.dataset.theme = resolvedTheme;
      document.documentElement.dataset.themeMode = themeMode;
    };
    applyTheme();
    window.localStorage.setItem("akarpromax-theme", themeMode);
    if (themeMode === "system") systemTheme.addEventListener("change", applyTheme);
    return () => systemTheme.removeEventListener("change", applyTheme);
  }, [themeMode, themeReady]);

  useEffect(() => {
    const detectedCountry = detectCountry();
    const detectedCity = detectCity(detectedCountry);
    let mounted = true;
    window.queueMicrotask(() => {
      if (!mounted) return;
      setCountry(detectedCountry);
      setCity(detectedCity);
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const availableCities = citiesForCountry(country);
    if (!availableCities.some((option) => option.id === city)) {
      const nextCity = detectCity(country);
      window.queueMicrotask(() => {
        setCity(nextCity);
        if (nextCity) window.localStorage.setItem("akarpromax-city", nextCity);
      });
    }
  }, [country, city]);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/user-context", { cache: "no-store", signal: controller.signal })
      .then((response) => response.ok ? response.json() : null)
      .then((data: ViewerContext | null) => { if (data) setViewer(data); })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/sponsors?country=${encodeURIComponent(country)}`, { cache: "no-store", signal: controller.signal })
      .then((response) => response.ok ? response.json() : { sponsors: [] })
      .then((data: { sponsors?: PublicSponsor[] }) => setActiveSponsor(data.sponsors?.[0] ?? null))
      .catch(() => undefined);
    return () => controller.abort();
  }, [country]);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/properties?country=${encodeURIComponent(country)}&featured=1&limit=3`, { cache: "no-store", signal: controller.signal })
      .then((response) => response.ok ? response.json() : { properties: [] })
      .then((data: { properties?: PublicProperty[] }) => setFeaturedProperties(data.properties ?? []))
      .catch(() => undefined);
    return () => controller.abort();
  }, [country]);

  useEffect(() => {
    if (!activeSponsor) return;
    activeSponsor.placements.forEach((placement) => {
      if (!["header", "content", "footer"].includes(placement)) return;
      void fetch("/api/sponsor-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sponsorId: activeSponsor.id, countryCode: country, placement, eventType: "impression" }),
        keepalive: true,
      }).catch(() => undefined);
    });
  }, [activeSponsor, country]);

  useEffect(() => () => {
    Object.values(dropdownCloseTimers.current).forEach((timer) => {
      if (timer !== undefined) window.clearTimeout(timer);
    });
  }, []);

  return (
    <>
      <MobileNavigation
        open={sidebarPinned}
        onClose={() => setSidebarPinned(false)}
        items={publicNav}
        labels={copy}
        currentPath={currentPath}
        viewer={viewer}
        onLogin={() => {
          setAccountMode("login");
          setAccountOpen(true);
          setSidebarPinned(false);
        }}
        onLogout={handleLogout}
      />

      <main className="reference-app md:flex md:min-h-[100dvh]" id="main-content" dir={direction} data-locale={locale}>
        <PublicSidebar
          labels={copy}
          items={publicNav}
          currentPath={currentPath}
          className="hidden md:flex"
          footer={
            <div className="flex flex-col gap-[var(--space-3)]">
              <div className="min-w-0">
                <p className="truncate text-[var(--font-size-sm)] font-semibold text-[color:var(--color-text-primary)]">{viewer.authenticated ? viewer.displayName || viewer.email : copy.brandTitle}</p>
                <p className="text-[var(--font-size-xs)] text-[color:var(--color-text-muted)]">{viewer.authenticated ? roleLabels[locale][viewer.role] ?? viewer.role : copy.brandSubtitle}</p>
              </div>
              {viewer.authenticated ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full rounded-[var(--radius-md)] border border-[color:var(--color-border-strong)] bg-transparent px-[var(--space-4)] py-[var(--space-3)] text-[var(--font-size-sm)] font-medium text-[color:var(--color-text-primary)] transition-colors duration-[var(--motion-fast)] hover:bg-[color:var(--color-surface)] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
                >
                  {copy.logout}
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setAccountMode("login");
                      setAccountOpen(true);
                    }}
                    className="w-full rounded-[var(--radius-md)] border border-[color:var(--color-border-strong)] bg-transparent px-[var(--space-4)] py-[var(--space-3)] text-[var(--font-size-sm)] font-medium text-[color:var(--color-text-primary)] transition-colors duration-[var(--motion-fast)] hover:bg-[color:var(--color-surface)] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
                  >
                    {copy.login}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAccountMode("register");
                      setAccountOpen(true);
                    }}
                    className="w-full rounded-[var(--radius-md)] bg-[color:var(--color-primary)] px-[var(--space-4)] py-[var(--space-3)] text-[var(--font-size-sm)] font-semibold text-[color:var(--color-primary-foreground)] transition-colors duration-[var(--motion-fast)] hover:bg-[color:var(--color-primary-hover)] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
                  >
                    {copy.register}
                  </button>
                </>
              )}
            </div>
          }
        />

        <div className="site-canvas min-w-0 flex-1">
        <div className="sticky-topbar">
        <header className="reference-header">
          <div className="container header-inner">
            <button className="menu-trigger md:hidden" type="button" aria-label={sidebarPinned ? copy.closeMenu : copy.showMenu} aria-expanded={sidebarPinned} onClick={() => setSidebarPinned((open) => !open)}>☰</button>
            <Brand copy={copy} />
            <div className="header-tools" aria-label={copy.toolsAria}>
              <div className="tool-cluster location-cluster">
              <div className="country-switcher" aria-label={copy.countryAria} onMouseEnter={() => cancelDropdownClose("country")} onMouseLeave={() => scheduleDropdownClose("country", () => setCountryOpen(false))} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) { cancelDropdownClose("country"); setCountryOpen(false); } }}>
                <button className="country-trigger" type="button" aria-haspopup="menu" aria-expanded={countryOpen} onClick={() => { setCountryOpen((open) => !open); setCityOpen(false); setLanguageOpen(false); setThemeOpen(false); }} onKeyDown={(event) => { if (event.key === "Escape") setCountryOpen(false); }}>
                  <CountryFlag country={selectedCountry} /><span>{selectedCountry.names[locale]}</span><span className="country-chevron" aria-hidden="true">⌄</span>
                </button>
                <div className="country-dropdown" role="menu" hidden={!countryOpen}>
                  {countryOptions.map((option) => <button key={option.id} type="button" role="menuitemradio" className={country === option.id ? "country-option active" : "country-option"} aria-label={option.names[locale]} aria-checked={country === option.id} onClick={() => { const nextCity = detectCity(option.id); setActiveSponsor(null); setCountry(option.id); setCity(nextCity); setCountryOpen(false); window.localStorage.setItem("akarpromax-country", option.id); window.localStorage.setItem("akarpromax-city", nextCity); }}><CountryFlag country={option} /><span>{option.names[locale]}</span>{option.id === "om" && <small>{copy.country}</small>}</button>)}
                </div>
              </div>
              <div className="city-switcher" aria-label={copy.cityAria} onMouseEnter={() => cancelDropdownClose("city")} onMouseLeave={() => scheduleDropdownClose("city", () => setCityOpen(false))} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) { cancelDropdownClose("city"); setCityOpen(false); } }}>
                <button className="city-trigger" type="button" aria-haspopup="menu" aria-expanded={cityOpen} onClick={() => { setCityOpen((open) => !open); setCountryOpen(false); setLanguageOpen(false); setThemeOpen(false); }} onKeyDown={(event) => { if (event.key === "Escape") setCityOpen(false); }}>
                  <span className="city-pin" aria-hidden="true">⌖</span><span>{selectedCity.names[locale]}</span><span className="city-chevron" aria-hidden="true">⌄</span>
                </button>
                <div className="city-dropdown" role="menu" hidden={!cityOpen}>
                  {citiesForCountry(country).map((option) => <button key={option.id} type="button" role="menuitemradio" className={city === option.id ? "city-option active" : "city-option"} aria-label={option.names[locale]} aria-checked={city === option.id} onClick={() => { setCity(option.id); setCityOpen(false); window.localStorage.setItem("akarpromax-city", option.id); }}><span className="city-pin" aria-hidden="true">⌖</span><span>{option.names[locale]}</span></button>)}
                </div>
              </div>
              <LocationChip
                locale={locale}
                countryCode={country}
                countryName={selectedCountry.names[locale]}
                cityName={selectedCity.names[locale]}
                onApply={(fields) => {
                  setActiveSponsor(null);
                  setCountry(fields.countryCode);
                  setCity(detectCity(fields.countryCode));
                  setCountryOpen(false);
                  setCityOpen(false);
                  window.localStorage.setItem("akarpromax-country", fields.countryCode);
                  window.localStorage.setItem("akarpromax-city", detectCity(fields.countryCode));
                }}
                onDetected={(fields) => {
                  setCountry(fields.countryCode);
                  setCity(detectCityByName(fields.countryCode, fields.city));
                  window.localStorage.setItem("akarpromax-country", fields.countryCode);
                  window.localStorage.setItem("akarpromax-city", detectCityByName(fields.countryCode, fields.city));
                }}
              />
              <a className="currency-chip" href="#main-content" dir="auto" aria-label={`${copy.currencyAria}: ${selectedCurrency.names[locale]} (${selectedCurrency.code})`} title={selectedCurrency.names[locale]}>{selectedCurrency.symbol} {selectedCurrency.code}</a>
              </div>
              <div className="tool-cluster preference-cluster">
              <div className="language-switcher" aria-label={copy.languageAria} onMouseEnter={() => cancelDropdownClose("language")} onMouseLeave={() => scheduleDropdownClose("language", () => setLanguageOpen(false))} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) { cancelDropdownClose("language"); setLanguageOpen(false); } }}>
                <button className="language-trigger" type="button" aria-haspopup="menu" aria-expanded={languageOpen} onClick={() => { setLanguageOpen((open) => !open); setCountryOpen(false); setCityOpen(false); setThemeOpen(false); }} onKeyDown={(event) => { if (event.key === "Escape") setLanguageOpen(false); }}>
                  <span className="language-symbol" aria-hidden="true">{selectedLanguage.symbol}</span><span>{selectedLanguage.short}</span><span className="language-chevron" aria-hidden="true">⌄</span>
                </button>
                <div className="language-dropdown" role="menu" hidden={!languageOpen}>
                  {languageOptions.map((option) => <button key={option.id} type="button" role="menuitemradio" className={locale === option.id ? "language-option active" : "language-option"} aria-label={option.label} aria-checked={locale === option.id} onClick={() => { setLocale(option.id); setLanguageOpen(false); }}><span className="language-symbol" aria-hidden="true">{option.symbol}</span><span>{option.label}</span><small>{option.short}</small></button>)}
                </div>
              </div>
              <div className="theme-switcher" aria-label={copy.themeAria} onMouseEnter={() => cancelDropdownClose("theme")} onMouseLeave={() => scheduleDropdownClose("theme", () => setThemeOpen(false))} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) { cancelDropdownClose("theme"); setThemeOpen(false); } }}>
                <button className="theme-trigger" type="button" aria-haspopup="menu" aria-expanded={themeOpen} title={`${copy.themeAria}: ${copy[selectedTheme.labelKey]}`} onClick={() => { setThemeOpen((open) => !open); setCountryOpen(false); setCityOpen(false); setLanguageOpen(false); }} onKeyDown={(event) => { if (event.key === "Escape") setThemeOpen(false); }}>
                  <span className="theme-symbol" aria-hidden="true">{selectedTheme.symbol}</span><span>{copy[selectedTheme.labelKey]}</span><span className="theme-chevron" aria-hidden="true">⌄</span>
                </button>
                <div className="theme-dropdown" role="menu" hidden={!themeOpen}>
                  {themeOptions.map((option) => <button key={option.id} type="button" role="menuitemradio" className={themeMode === option.id ? "theme-option active" : "theme-option"} aria-checked={themeMode === option.id} onClick={() => { setThemeMode(option.id); setThemeOpen(false); }}><span className="theme-symbol" aria-hidden="true">{option.symbol}</span><span>{copy[option.labelKey]}</span></button>)}
                </div>
              </div>
              </div>
              <a className="office-tool" href="#main-content" aria-label={copy.officeAppAria} title={copy.officeAppAria}>▣</a>
            </div>
            <div className="header-actions">{viewer.authenticated ? <button type="button" className="header-login header-account" onClick={() => { setAccountMode("login"); setAccountOpen(true); }}>{viewer.displayName}</button> : <><button type="button" className="header-login" onClick={() => { setAccountMode("login"); setAccountOpen(true); }}>{copy.login}</button><button type="button" className="header-register" onClick={() => { setAccountMode("register"); setAccountOpen(true); }}>{copy.register}</button></>}</div>
          </div>
        </header>

        <NewsTicker copy={copy} locale={locale} country={country} city={city} />
        </div>
        <StandardPublicAdLayout family="home" label={copy.adLabel} locale={locale} country={country} city={city} deviceType={deviceType} path="/">
        {sponsorPlacements.includes("header") && <section className="country-sponsor container" id="sponsors" aria-label={copy.sponsorAria} data-sponsor-country={country}>
          <div className={`sponsor-ribbon sponsor-tone-${selectedSponsorTone} sponsor-ribbon-image`}>
            <div className="sponsor-ribbon-visual" aria-hidden="true">{isVideoAsset(sponsorBannerUrl) ? <video className="sponsor-visual-image" src={sponsorBannerUrl} autoPlay muted loop playsInline preload="metadata" /> : <img className="sponsor-visual-image" src={sponsorBannerUrl} alt="" decoding="async" />}</div>
            <div className="sponsor-copy"><p>{copy.sponsorLabel}</p><h2>{copy.sponsorOfficial} {selectedCountry.names[locale]}</h2><span>{copy.sponsorDescription}</span><a className="sponsor-cta" href={sponsorTargetHref} target={activeSponsor?.websiteUrl ? "_blank" : undefined} rel={activeSponsor?.websiteUrl ? "sponsored noopener" : undefined} onClick={() => trackSponsorEvent("header", "click")}>{sponsorActionLabel} <b>{copy.arrow}</b></a></div>
            <div className="sponsor-brand-placeholder"><SponsorIdentity logoUrl={sponsorLogoUrl} name={sponsorName} countryCode={selectedCountry.id} /><div className="sponsor-brand-details"><small>{sponsorLogoUrl ? copy.sponsorLogo : locale === "ar" ? "هوية الراعي" : locale === "tr" ? "Sponsor kimliği" : "Sponsor identity"}</small><strong>{sponsorName}</strong></div><span className="sponsor-country-chip"><CountryFlag country={selectedCountry} />{selectedCountry.names[locale]}</span></div>
          </div>
        </section>}

        <section className="welcome-band" id="about">
          <div className="container welcome-grid">
            <div className="welcome-copy"><p className="section-kicker">{copy.welcomeKicker}</p><h1>{copy.welcomeTitle}<br /><em>{copy.welcomeAccent}</em></h1><p>{copy.welcomeDescription}</p><div className="welcome-actions"><a className="button-primary" href="#properties">{copy.browse} <b>{copy.arrow}</b></a><button type="button" className="button-quiet" onClick={() => { setAccountMode("register"); setAccountOpen(true); }}>{copy.join}</button></div></div>
            <div className="welcome-visual" aria-label={copy.visualAria}><div className="visual-ring" /><div className="visual-card"><span>{copy.visualTag}</span><strong>OM</strong><small>{copy.visualSmall}</small></div></div>
          </div>
        </section>

        <section className="content-section container" id="properties" aria-labelledby="property-title">
          <div className="section-title-row"><div><p className="section-kicker">{copy.propertiesKicker}</p><h2 id="property-title">{copy.propertiesTitle}<br />{copy.propertiesAccent}</h2></div><a className="section-link" href="#account">{copy.viewAll} <b>{copy.arrow}</b></a></div>
          <div className="property-grid reference-cards">
            {featuredProperties.length > 0
              ? featuredProperties.map((p, index) => (
                  <article className={index === 0 ? "reference-card feature-card" : "reference-card"} key={p.id}>
                    <div className="card-image" style={{ backgroundImage: `url(${p.imageUrl || "/og.png"})`, backgroundSize: "cover", backgroundPosition: "center" }}>
                      <span>{p.isFeatured
                        ? (locale === "ar" ? "مميز" : locale === "tr" ? "Öne çıkan" : "Featured")
                        : p.listingType === "for-rent"
                          ? (locale === "ar" ? "إيجار" : locale === "tr" ? "Kiralık" : "For rent")
                          : (locale === "ar" ? "بيع" : locale === "tr" ? "Satılık" : "For sale")}</span>
                    </div>
                    <div className="card-body">
                      <p>{p.area[locale] ?? p.title[locale]}</p>
                      <h3>{p.title[locale]}</h3>
                      <Link href={`/properties/${p.slug || p.id}`}>{locale === "ar" ? "التفاصيل" : locale === "tr" ? "Detaylar" : "Details"} <b>{copy.arrow}</b></Link>
                    </div>
                  </article>
                ))
              : copy.propertyCards.map((card, index) => <article className={index === 0 ? "reference-card feature-card" : "reference-card"} key={`${locale}-card-${index}`}><div className={`card-image card-${index === 0 ? "house" : index === 1 ? "map" : "coast"}`}><span>{card.tag}</span></div><div className="card-body"><p>{card.meta}</p><h3>{card.title}</h3>{card.link && <a href="#account">{card.link} <b>{copy.arrow}</b></a>}</div></article>)}
          </div>
        </section>

        <section className="services-band" id="services" aria-labelledby="services-title">
          <div className="container"><div className="section-title-row"><div><p className="section-kicker">{copy.servicesKicker}</p><h2 id="services-title">{copy.servicesTitle}<br />{copy.servicesAccent}</h2></div><span className="muted-note">{copy.servicesNote.split("\n").map((line) => <span key={line}>{line}<br /></span>)}</span></div>
            <div className="service-grid">{copy.services.map((service, index) => service.href ? (
              <article className="service-tools-card" id={`module-${index + 1}`} key={`${locale}-service-${index}`}>
                <Link href={service.href} className="service-tools-link" aria-label={service.ariaLabel} title={service.description}>
                  <span className="service-tools-icon" title={service.iconAlt} aria-hidden="true"><Wrench size={22} strokeWidth={2.2} /></span>
                  <div><h3>{service.title}</h3><p>{service.shortDescription}</p></div>
                  <b aria-hidden="true">{copy.arrow}</b>
                </Link>
              </article>
            ) : (
              <article id={`module-${index + 1}`} key={`${locale}-service-${index}`}><span className="service-number">{String(index + 1).padStart(2, "0")}</span><div><h3>{service.title}</h3><p>{service.description}</p></div><b>↗</b></article>
            ))}</div>
          </div>
        </section>

        <section className="office-band" id="offices"><div className="container office-grid"><div className="office-copy"><p className="section-kicker">{copy.officeKicker}</p><h2>AkarPromax<br />Office</h2><p>{copy.officeDescription}</p><a className="button-primary" href="#account">{copy.officeCta} <b>{copy.arrow}</b></a></div><div className="office-panel"><span className="panel-orbit orbit-one" /><span className="panel-orbit orbit-two" /><div className="office-panel-label">{copy.officeSync}</div><div className="office-panel-value">24<span>/</span>7</div><div className="office-panel-foot">{copy.officeStats.map((item) => <span key={item}>{item}</span>)}</div></div></div></section>

        <section className="account-band" id="account"><div className="container account-inner"><div><p className="section-kicker">{copy.accountKicker}</p><h2>{copy.accountTitle}<br />{copy.accountAccent}</h2></div><div className="account-copy"><p>{copy.accountDescription}</p><a className="button-primary" href="mailto:hello@akarpromax.om?subject=Join%20request">{copy.accountCta} <b>{copy.arrow}</b></a></div></div></section>
        </StandardPublicAdLayout>

        <footer className="reference-footer"><div className="container footer-grid"><div className="footer-about"><Brand copy={copy} /><p>{copy.footerDescription}</p><div className="socials"><a href="#main-content" aria-label="Facebook">f</a><a href="#main-content" aria-label="X">𝕏</a><a href="#main-content" aria-label="Instagram">◎</a><a href="#main-content" aria-label="LinkedIn">in</a></div></div><div><h3>{copy.quickTitle}</h3>{copy.quickLinks.map((item) => <a href="#main-content" key={`${locale}-quick-${item}`}>{item}</a>)}</div><div><h3>{copy.usefulTitle}</h3>{copy.usefulLinks.map((item) => <a href="#main-content" key={`${locale}-useful-${item}`}>{item}</a>)}</div><div><h3>{copy.contactTitle}</h3><a href="#main-content">{copy.contactLocation}　⌖</a><a href="mailto:info@akarpromax.om">{copy.contactEmail}　✉</a><a href="#main-content">{copy.contactTeam}</a></div></div><div className="container footer-bottom"><span>{copy.footerRights}</span><span>{copy.footerTagline}</span><div className="payments"><span>Visa</span><span>Mastercard</span></div></div></footer>
        <a className="floating-chat" href="mailto:hello@akarpromax.om" aria-label={copy.chatAria}>⌁</a>
        <AccountDialog locale={locale} open={accountOpen} initialMode={accountMode} viewer={viewer} onClose={() => setAccountOpen(false)} onAuthenticated={setViewer} />
      </div>
      </main>
    </>
  );
}
