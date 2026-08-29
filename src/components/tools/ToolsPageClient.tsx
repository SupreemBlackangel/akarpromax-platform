"use client";

import { useEffect, useState, useCallback, useRef, lazy, Suspense } from "react";
import Link from "next/link";
import { Wrench, Star, FileText } from "lucide-react";
import { translations } from "@/src/data/translations";
import type { Locale, ViewerContext } from "@/src/types/site";
import PublicPageShell from "@/src/components/PublicPageShell";
import AccountDialog from "@/src/components/AccountDialog";
import { ToolCard } from "@/src/components/tools/ToolCard";
import { TOOLS_DATA } from "@/src/data/toolsData";

type ToolId = string;

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
const NON_FLAGSHIP_TOOLS = TOOLS_DATA.filter((t) => t.id !== FLAGSHIP_ID && t.id !== FLAGSHIP_SECONDARY_ID);

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
            <div className="tc-flagship-grid">
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
                </div>
              </Link>
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
                </div>
              </Link>
            </div>

            {/* ===== TOOLS GRID ===== */}
            <div className="tc-grid">
              {NON_FLAGSHIP_TOOLS.map((tool) => (
                <ToolCard
                  key={tool.id}
                  tool={tool}
                  locale={locale}
                  active={activeTool === tool.id}
                  onSelect={handleSelectTool}
                />
              ))}
            </div>

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
