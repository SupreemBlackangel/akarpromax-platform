"use client";

import { useEffect, useMemo, useState, useCallback, useRef, lazy, Suspense } from "react";
import { languageOptions, translations } from "@/src/data/translations";
import type { Locale, ViewerContext } from "@/src/types/site";
import PublicPageShell from "@/src/components/PublicPageShell";
import AccountDialog from "@/src/components/AccountDialog";
import { ToolsGate, type ToolsGateState } from "@/src/components/tools/ToolsGate";
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
type SortOption = typeof SORT_OPTIONS[number];

const SORT_LABELS: Record<SortOption, Record<string, string>> = {
  default: { ar: "الترتيب الافتراضي", en: "Default", tr: "Varsayılan sıralama" },
  az: { ar: "أبجدي ↑", en: "A–Z", tr: "A-Z" },
  za: { ar: "أبجدي ↓", en: "Z–A", tr: "Z-A" },
  newest: { ar: "الأحدث أولاً", en: "Newest first", tr: "En yeni" },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- lazy components have varying prop types
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
  landmapper: lazy(() => import("@/src/components/tools/LandMapper").then((m) => ({ default: m.LandMapper }))),
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

function readActiveToolParam(): string | null {
  if (typeof window === "undefined") return null;
  const tool = new URLSearchParams(window.location.search).get("tool");
  return tool && TOOLS_DATA.some((t) => t.id === tool) ? tool : null;
}

export function ToolsPageClient() {
  const [locale, setLocale] = useState<Locale>(() => {
    if (typeof window === "undefined") return "ar";
    const stored = window.localStorage.getItem("akarpromax-locale");
    return stored === "en" || stored === "tr" ? stored : "ar";
  });
  const [gateState, setGateState] = useState<ToolsGateState>("loading");
  const [showLogin, setShowLogin] = useState(false);
  const [accountMode, setAccountMode] = useState<"login" | "register">("login");
  const [activeTool, setActiveTool] = useState<ToolId | null>(() => readActiveToolParam());
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
  const [deviceType] = useState<"desktop" | "tablet" | "mobile">(() => detectDeviceType());
  const dir = locale === "ar" ? "rtl" : "ltr";
  const toolAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
    window.localStorage.setItem("akarpromax-locale", locale);
  }, [dir, locale]);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/user-context", { cache: "no-store", signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: ViewerContext & { permissions: string[] }) => {
        setViewer(data);
        if (!data.authenticated) {
          setGateState("unauthenticated");
          return;
        }
        setGateState(data.permissions.includes("tools.use") ? "granted" : "forbidden");
      })
      .catch(() => {
        setGateState("unauthenticated");
      });
    return () => controller.abort();
  }, []);

  const handleAuthenticated = useCallback((v: ViewerContext) => {
    setViewer(v);
    if (v.authenticated) {
      setGateState(v.permissions.includes("tools.use") ? "granted" : "forbidden");
    } else {
      setGateState("unauthenticated");
    }
    setShowLogin(false);
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    setViewer({ authenticated: false, email: null, displayName: "Guest", role: "guest", countryCode: null, permissions: [] });
    setGateState("unauthenticated");
  }, []);

  const requestLogin = useCallback((mode: "login" | "register" = "login") => {
    setAccountMode(mode);
    setShowLogin(true);
  }, []);

  const getToolName = useCallback(
    (id: string) => {
      const tool = TOOLS_DATA.find((t) => t.id === id);
      if (!tool) return id;
      return locale === "ar" ? tool.ar : locale === "tr" ? tool.tr : tool.en;
    },
    [locale],
  );

  const getToolNameForSearch = useCallback(
    (tool: typeof TOOLS_DATA[number]) => {
      return [tool.ar, tool.en, tool.tr, tool.descAr, tool.descEn, tool.descTr].join(" ").toLowerCase();
    },
    [],
  );

  const filteredTools = useMemo(() => {
    let result = [...TOOLS_DATA];

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

  return (
    <PublicPageShell
      locale={locale}
      copy={translations[locale]}
      viewer={viewer}
      country={country}
      city={city}
      deviceType={deviceType}
      currentPath={activeTool === "findmyland" ? "/tools?tool=findmyland" : "/tools"}
      adLayout={{ mode: "safe-no-ads" }}
      onLogin={() => requestLogin("login")}
      onLogout={handleLogout}
    >
      <div dir={dir} className="tc-page">
        <ToolsGate locale={locale} state={gateState} onRequestLogin={() => requestLogin("login")}>
          <div className="container">
            {/* Engineering Catalog Toolbar */}
            <div className="tc-toolbar" role="search" aria-label={locale === "ar" ? "البحث والتصفية" : locale === "tr" ? "Arama ve filtreleme" : "Search and filter"}>
              <div className="tc-toolbar-row">
                <div className="tc-search-wrapper">
                  <svg className="tc-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
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
                      ×
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
                  {filteredTools.length === TOOLS_DATA.length
                    ? (locale === "ar" ? `${TOOLS_DATA.length} أداة` : locale === "tr" ? `${TOOLS_DATA.length} araç` : `${TOOLS_DATA.length} tools`)
                    : (locale === "ar" ? `${filteredTools.length} من ${TOOLS_DATA.length} أداة` : locale === "tr" ? `${filteredTools.length} / ${TOOLS_DATA.length} araç` : `${filteredTools.length} of ${TOOLS_DATA.length} tools`)}
                </span>
                {(searchQuery || selectedCategory !== "all" || sortBy !== "default") && (
                  <button type="button" className="tc-clear-filters" onClick={clearFilters}>
                    {locale === "ar" ? "مسح الفلاتر" : locale === "tr" ? "Filtreleri temizle" : "Clear filters"}
                  </button>
                )}
              </div>
            </div>

            {/* Tools Grid */}
            {filteredTools.length > 0 ? (
              <div className="tc-grid">
                {filteredTools.map((tool) => (
                  <ToolCard
                    key={tool.id}
                    tool={tool}
                    locale={locale}
                    isActive={activeTool === tool.id}
                    onSelect={handleSelectTool}
                  />
                ))}
              </div>
            ) : (
              <ToolsEmptyState locale={locale} onClear={clearFilters} />
            )}

            {/* Active Tool Area */}
            {activeTool && (
              <div ref={toolAreaRef} className="tc-active-tool" id="active-tool">
                <div className="tc-active-tool-header">
                  <h2 className="tc-active-tool-title">{getToolName(activeTool)}</h2>
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
        </ToolsGate>
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
