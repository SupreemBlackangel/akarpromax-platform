"use client";

import { useEffect, useMemo, useState, useCallback, useRef, lazy, Suspense } from "react";
import Link from "next/link";
import { Search, X, Wrench, Star, ArrowLeft, FileText } from "lucide-react";
import { languageOptions, translations } from "@/src/data/translations";
import type { Locale, ViewerContext } from "@/src/types/site";
import PublicPageShell from "@/src/components/PublicPageShell";
import AccountDialog from "@/src/components/AccountDialog";
import { ToolCard } from "@/src/components/tools/ToolCard";
import { ToolsEmptyState } from "@/src/components/tools/ToolsEmptyState";
import { TOOLS_DATA, type ToolCategory } from "@/src/data/toolsData";

type ToolId = string;

const CATEGORY_LABELS: Record<ToolCategory, Record<string, string>> = {
  engineering: { ar: "هندسية", en: "Engineering", tr: "Mühendislik" },
  surveying: { ar: "مساحية", en: "Surveying", tr: "Ölçüm" },
  document: { ar: "مستندات", en: "Documents", tr: "Belgeler" },
  general: { ar: "عامة", en: "General", tr: "Genel" },
};

const SORT_OPTIONS = ["default", "az", "za", "newest"] as const;
type SortOption = (typeof SORT_OPTIONS)[number];

const SORT_LABELS: Record<SortOption, Record<string, string>> = {
  default: { ar: "الترتيب الافتراضي", en: "Default", tr: "Varsayılan sıralama" },
  az: { ar: "أبجدي ↑", en: "A–Z", tr: "A-Z" },
  za: { ar: "أبجدي ↓", en: "Z–A", tr: "Z-A" },
  newest: { ar: "الأحدث أولاً", en: "Newest first", tr: "En yeni" },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TOOL_COMPONENTS: Record<string, React.ComponentType<any>> = {
  concrete: lazy(() => import("@/src/components/tools/ConcreteCalc").then((m) => ({ default: m.ConcreteCalc }))),
  beam: lazy(() => import("@/src/components/tools/BeamCalc").then((m) => ({ default: m.BeamCalc }))),
  tile: lazy(() => import("@/src/components/tools/TileCalc").then((m) => ({ default: m.TileCalc }))),
  brick: lazy(() => import("@/src/components/tools/BrickCalc").then((m) => ({ default: m.BrickCalc }))),
  rebar: lazy(() => import("@/src/components/tools/RebarCalc").then((m) => ({ default: m.RebarCalc }))),
  paint: lazy(() => import("@/src/components/tools/PaintCalc").then((m) => ({ default: m.PaintCalc }))),
  slope: lazy(() => import("@/src/components/tools/SlopeCalc").then((m) => ({ default: m.SlopeCalc }))),
  mix: lazy(() => import("@/src/components/tools/MixRatioCalc").then((m) => ({ default: m.MixRatioCalc }))),
  area: lazy(() => import("@/src/components/tools/AreaCalculator").then((m) => ({ default: m.AreaCalculator }))),
  calculator: lazy(() => import("@/src/components/tools/Calculator").then((m) => ({ default: m.Calculator }))),
  coordinate: lazy(() => import("@/src/components/tools/CoordinateConverter").then((m) => ({ default: m.CoordinateConverter }))),
  points2dxf: lazy(() => import("@/src/components/tools/PointsToDxf").then((m) => ({ default: m.PointsToDxf }))),
  pdf2word: lazy(() => import("@/src/components/tools/PdfToWord").then((m) => ({ default: m.PdfToWord }))),
  // Keep old shared links working, but route both names to the restored unified tool.
  landmapper: lazy(() => import("@/src/components/tools/FindMyLand").then((m) => ({ default: m.FindMyLand }))),
  findmyland: lazy(() => import("@/src/components/tools/FindMyLand").then((m) => ({ default: m.FindMyLand }))),
};

function ToolLoader({ toolId, locale }: { toolId: string; locale: string }) {
  const Comp = TOOL_COMPONENTS[toolId];
  if (!Comp) return null;
  return (
    <Suspense fallback={<div className="tc-tool-loading">{locale === "ar" ? "جارٍ التحميل..." : locale === "tr" ? "Yükleniyor..." : "Loading..."}</div>}>
      <Comp locale={locale} />
    </Suspense>
  );
}

function detectDeviceType(): "desktop" | "tablet" | "mobile" {
  if (typeof window === "undefined") return "desktop";
  if (window.matchMedia("(max-width: 720px)").matches) return "mobile";
  if (window.matchMedia("(min-width: 721px) and (max-width: 1024px)").matches) return "tablet";
  return "desktop";
}

const FLAGSHIP_ID = "findmyland";
const FLAGSHIP = TOOLS_DATA.find((t) => t.id === FLAGSHIP_ID)!;
const FLAGSHIP_SECONDARY_ID = "pdf2word";
const FLAGSHIP_SECONDARY = TOOLS_DATA.find((t) => t.id === FLAGSHIP_SECONDARY_ID)!;

function readActiveToolParam(): string | null {
  if (typeof window === "undefined") return null;
  const tool = new URLSearchParams(window.location.search).get("tool");
  if (!tool) return null;
  if (tool === FLAGSHIP_ID || tool === FLAGSHIP_SECONDARY_ID) return tool;
  return TOOLS_DATA.some((t) => t.id === tool) ? tool : null;
}

export function ToolsPageClient() {
  // SSR and first client render must be identical.
  // Browser preference is restored after mount.
  const [locale, setLocale] = useState<Locale>("ar");
  const [showLogin, setShowLogin] = useState(false);
  const [accountMode, setAccountMode] = useState<"login" | "register">("login");
  const [activeTool, setActiveTool] = useState<ToolId | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<ToolCategory | "all">("all");
  const [sortBy, setSortBy] = useState<SortOption>("default");
  const [viewer, setViewer] = useState<ViewerContext>({
    authenticated: false,
    email: null,
    displayName: "Guest",
    role: "guest",
    countryCode: null,
    permissions: [],
  });
  const [country] = useState("om");
  const [city] = useState("om-muscat");
  const [deviceType, setDeviceType] =
    useState<"desktop" | "tablet" | "mobile">("desktop");
  const dir = locale === "ar" ? "rtl" : "ltr";
  const toolAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    try {
      const stored = window.localStorage.getItem("akarpromax-locale");
      if (stored === "en" || stored === "tr") {
        queueMicrotask(() => {
          if (!cancelled) setLocale(stored);
        });
      }
    } catch {}

    const syncRouteState = () => {
      setActiveTool(readActiveToolParam());
    };

    const syncDeviceType = () => {
      setDeviceType(detectDeviceType());
    };

    queueMicrotask(() => {
      if (cancelled) return;
      syncRouteState();
      syncDeviceType();
    });

    window.addEventListener("popstate", syncRouteState);
    window.addEventListener("resize", syncDeviceType);

    return () => {
      cancelled = true;
      window.removeEventListener("popstate", syncRouteState);
      window.removeEventListener("resize", syncDeviceType);
    };
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;

    try {
      window.localStorage.setItem("akarpromax-locale", locale);
    } catch {}
  }, [dir, locale]);

  // Authentication enriches the public shell only.
  // Engineering tools remain usable without a separate permission gate.
  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/user-context", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: ViewerContext) => {
        setViewer(data);
      })
      .catch(() => {});

    return () => controller.abort();
  }, []);

  const handleAuthenticated = useCallback((v: ViewerContext) => {
    setViewer(v);
    setShowLogin(false);
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    setViewer({
      authenticated: false,
      email: null,
      displayName: "Guest",
      role: "guest",
      countryCode: null,
      permissions: [],
    });
  }, []);

  const requestLogin = useCallback((mode: "login" | "register" = "login") => {
    setAccountMode(mode);
    setShowLogin(true);
  }, []);

  const getToolNameForSearch = useCallback(
    (tool: (typeof TOOLS_DATA)[number]) => {
      return [tool.ar, tool.en, tool.tr, tool.descAr, tool.descEn, tool.descTr].join(" ").toLowerCase();
    },
    [],
  );

  const filteredTools = useMemo(() => {
    let result = TOOLS_DATA.filter((t) => t.id !== FLAGSHIP_ID && t.id !== FLAGSHIP_SECONDARY_ID);

    if (selectedCategory !== "all") {
      result = result.filter((t) => t.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((t) => getToolNameForSearch(t).includes(q));
    }

    switch (sortBy) {
      case "az":
        result.sort((a, b) => {
          const nameA = locale === "ar" ? a.ar : locale === "tr" ? a.tr : a.en;
          const nameB = locale === "ar" ? b.ar : locale === "tr" ? b.tr : b.en;
          return nameA.localeCompare(nameB, locale === "ar" ? "ar" : locale === "tr" ? "tr" : "en");
        });
        break;
      case "za":
        result.sort((a, b) => {
          const nameA = locale === "ar" ? a.ar : locale === "tr" ? a.tr : a.en;
          const nameB = locale === "ar" ? b.ar : locale === "tr" ? b.tr : b.en;
          return nameB.localeCompare(nameA, locale === "ar" ? "ar" : locale === "tr" ? "tr" : "en");
        });
        break;
      case "newest":
        result.sort((a, b) => {
          const statusOrder: Record<string, number> = { new: 0, beta: 1, available: 2, coming_soon: 3 };
          return (statusOrder[a.status] ?? 2) - (statusOrder[b.status] ?? 2);
        });
        break;
    }

    return result;
  }, [searchQuery, selectedCategory, sortBy, locale, getToolNameForSearch]);

  const showFlagship = useMemo(() => {
    if (selectedCategory !== "all" && FLAGSHIP.category !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return getToolNameForSearch(FLAGSHIP).includes(q);
    }
    return true;
  }, [selectedCategory, searchQuery, getToolNameForSearch]);

  const showFlagshipSecondary = useMemo(() => {
    if (selectedCategory !== "all" && FLAGSHIP_SECONDARY.category !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return getToolNameForSearch(FLAGSHIP_SECONDARY).includes(q);
    }
    return true;
  }, [selectedCategory, searchQuery, getToolNameForSearch]);

  const clearFilters = useCallback(() => {
    setSearchQuery("");
    setSelectedCategory("all");
    setSortBy("default");
  }, []);

  const handleSelectTool = useCallback((id: string) => {
    setActiveTool(id);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("tool", id);
      window.history.replaceState(null, "", url.toString());
    } catch {}
    setTimeout(() => {
      toolAreaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }, []);

  const handleCloseTool = useCallback(() => {
    setActiveTool(null);
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("tool");
      window.history.replaceState(null, "", url.toString());
    } catch {}
  }, []);

  const categories = useMemo(() => {
    const cats = new Set(TOOLS_DATA.map((t) => t.category));
    return Array.from(cats);
  }, []);

  const totalTools = TOOLS_DATA.length;

  return (
    <PublicPageShell
      locale={locale}
      copy={translations[locale]}
      viewer={viewer}
      country={country}
      city={city}
      deviceType={deviceType}
      currentPath={activeTool === "findmyland" || activeTool === "pdf2word" ? `/tools?tool=${activeTool}` : "/tools"}
      adLayout={{ mode: "standard", family: "tools" }}
      defaultSidebarCollapsed={activeTool !== null}
      onLogin={() => requestLogin("login")}
      onLogout={handleLogout}
    >
      <div dir={dir} className="tc-page">
        <div className="container">

            {/* ===== FLAGSHIP CARDS ===== */}
            {(showFlagship || showFlagshipSecondary) && (
              <div className="tc-flagship-grid">
                {showFlagship && (
                  <Link
                    href={`/tools?tool=${FLAGSHIP.id}`}
                    className="tc-flagship"
                    aria-label={locale === "ar" ? FLAGSHIP.ar : locale === "tr" ? FLAGSHIP.tr : FLAGSHIP.en}
                    onClick={(event) => { event.preventDefault(); handleSelectTool(FLAGSHIP.id); }}
                  >
                    <div className="tc-flagship-body">
                      <div className="tc-flagship-icon">
                        <Star size={24} strokeWidth={1.5} />
                      </div>
                      <div className="tc-flagship-text">
                        <h2 className="tc-flagship-title">{FLAGSHIP.ar}</h2>
                        <p className="tc-flagship-desc">{FLAGSHIP.descAr}</p>
                      </div>
                      <div className="tc-flagship-cta">
                        <span>{locale === "ar" ? "جرّبها الآن" : locale === "tr" ? "Hemen Dene" : "Try It Now"}</span>
                        <ArrowLeft size={16} strokeWidth={2} />
                      </div>
                    </div>
                  </Link>
                )}
                {showFlagshipSecondary && (
                  <Link
                    href={`/tools?tool=${FLAGSHIP_SECONDARY.id}`}
                    className="tc-flagship tc-flagship--secondary"
                    aria-label={locale === "ar" ? FLAGSHIP_SECONDARY.ar : locale === "tr" ? FLAGSHIP_SECONDARY.tr : FLAGSHIP_SECONDARY.en}
                    onClick={(event) => { event.preventDefault(); handleSelectTool(FLAGSHIP_SECONDARY.id); }}
                  >
                    <div className="tc-flagship-body">
                      <div className="tc-flagship-icon">
                        <FileText size={24} strokeWidth={1.5} />
                      </div>
                      <div className="tc-flagship-text">
                        <h2 className="tc-flagship-title">{FLAGSHIP_SECONDARY.ar}</h2>
                        <p className="tc-flagship-desc">{FLAGSHIP_SECONDARY.descAr}</p>
                      </div>
                      <div className="tc-flagship-cta">
                        <span>{locale === "ar" ? "جرّبها الآن" : locale === "tr" ? "Hemen Dene" : "Try It Now"}</span>
                        <ArrowLeft size={16} strokeWidth={2} />
                      </div>
                    </div>
                  </Link>
                )}
              </div>
            )}

            {/* ===== TOOLBAR ===== */}
            <div className="tc-toolbar" role="search" aria-label={locale === "ar" ? "البحث والتصفية" : locale === "tr" ? "Arama ve filtreleme" : "Search and filter"}>
              <div className="tc-toolbar-row">
                <div className="tc-search-wrapper">
                  <Search className="tc-search-icon" size={16} strokeWidth={2} aria-hidden="true" />
                  <input
                    type="search"
                    className="tc-search-input"
                    placeholder={locale === "ar" ? "ابحث عن أداة..." : locale === "tr" ? "Araç ara..." : "Search tools..."}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    aria-label={locale === "ar" ? "بحث عن أداة" : locale === "tr" ? "Araç ara" : "Search tools"}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      className="tc-search-clear"
                      onClick={() => setSearchQuery("")}
                      aria-label={locale === "ar" ? "مسح البحث" : locale === "tr" ? "Aramayı temizle" : "Clear search"}
                    >
                      <X size={14} strokeWidth={2.2} />
                    </button>
                  )}
                </div>
                <div className="tc-toolbar-controls">
                  <select
                    className="tc-select"
                    value={locale}
                    onChange={(e) => setLocale(e.target.value as Locale)}
                    aria-label={locale === "ar" ? "اللغة" : locale === "tr" ? "Dil" : "Language"}
                  >
                    {languageOptions.map((option) => (
                      <option key={option.id} value={option.id}>{option.symbol} {option.label}</option>
                    ))}
                  </select>
                  <select
                    className="tc-select"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value as ToolCategory | "all")}
                    aria-label={locale === "ar" ? "تصفية حسب القسم" : locale === "tr" ? "Kategoriye göre filtrele" : "Filter by category"}
                  >
                    <option value="all">{locale === "ar" ? "كل الأقسام" : locale === "tr" ? "Tüm Kategoriler" : "All Categories"}</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{CATEGORY_LABELS[cat][locale]}</option>
                    ))}
                  </select>
                  <select
                    className="tc-select"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    aria-label={locale === "ar" ? "ترتيب حسب" : locale === "tr" ? "Sıralama" : "Sort by"}
                  >
                    {SORT_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{SORT_LABELS[opt][locale]}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="tc-toolbar-info">
                <span className="tc-results-count">
                  {filteredTools.length + (showFlagship ? 1 : 0) + (showFlagshipSecondary ? 1 : 0) === totalTools
                    ? (locale === "ar" ? `${totalTools} أداة` : locale === "tr" ? `${totalTools} araç` : `${totalTools} tools`)
                    : (locale === "ar"
                        ? `${filteredTools.length + (showFlagship ? 1 : 0) + (showFlagshipSecondary ? 1 : 0)} من ${totalTools} أداة`
                        : locale === "tr"
                          ? `${filteredTools.length + (showFlagship ? 1 : 0) + (showFlagshipSecondary ? 1 : 0)} / ${totalTools} araç`
                          : `${filteredTools.length + (showFlagship ? 1 : 0) + (showFlagshipSecondary ? 1 : 0)} of ${totalTools} tools`)}
                </span>
                {(searchQuery || selectedCategory !== "all" || sortBy !== "default") && (
                  <button type="button" className="tc-clear-filters" onClick={clearFilters}>
                    {locale === "ar" ? "مسح الفلاتر" : locale === "tr" ? "Filtreleri temizle" : "Clear filters"}
                  </button>
                )}
              </div>
            </div>

            {/* ===== TOOLS GRID ===== */}
            {filteredTools.length > 0 || showFlagship ? (
              <div className="tc-grid">
                {filteredTools.map((tool) => (
                  <ToolCard
                    key={tool.id}
                    tool={tool}
                    locale={locale}
                    active={activeTool === tool.id}
                    onSelect={handleSelectTool}
                  />
                ))}
              </div>
            ) : (
              <ToolsEmptyState locale={locale} onClear={clearFilters} />
            )}

            {/* ===== ACTIVE TOOL AREA ===== */}
            {activeTool && (
              <div ref={toolAreaRef} className="tc-active-tool" id="active-tool">
                <div className="tc-active-tool-header">
                  <h2 className="tc-active-tool-title">
                    {(() => {
                      const tool = TOOLS_DATA.find((t) => t.id === activeTool);
                      if (!tool) return activeTool;
                      return locale === "ar" ? tool.ar : locale === "tr" ? tool.tr : tool.en;
                    })()}
                  </h2>
                  <button
                    type="button"
                    className="tc-active-tool-close"
                    onClick={handleCloseTool}
                    aria-label={locale === "ar" ? "إغلاق الأداة" : locale === "tr" ? "Aracı kapat" : "Close tool"}
                  >
                    ×
                  </button>
                </div>
                <div className="tc-active-tool-body">
                  <ToolLoader toolId={activeTool} locale={locale} />
                </div>
              </div>
            )}
        </div>
      </div>
      <AccountDialog
        locale={locale}
        open={showLogin}
        initialMode={accountMode}
        viewer={viewer}
        onClose={() => setShowLogin(false)}
        onAuthenticated={handleAuthenticated}
      />
    </PublicPageShell>
  );
}
