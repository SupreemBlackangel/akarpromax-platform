import Script from "next/script";
import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { Cairo, Inter } from "next/font/google";
import SkipLink from "@/src/components/ui/SkipLink";
import { GeoProvider } from "@/src/contexts/GeoContext";
import { DisplaySettingsProvider } from "@/src/components/public/display-settings";
import { DEFAULT_PLATFORM_SETTINGS, getPlatformSettings, MOBILE_BREAKPOINT_PX, type DisplaySettings } from "@/lib/platform-settings";
import "./globals.css";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
  variable: "--font-cairo",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  display: "swap",
  variable: "--font-inter",
});

/**
 * Pre-paint presentation boot. Picks the admin's desktop or mobile display set
 * for this viewport, stamps it on <html> as data-* attributes (globals.css does
 * the rest), and resolves the theme — the visitor's stored choice when the
 * admin allows one, the admin's default otherwise. Runs before first paint and
 * again on every viewport crossing of the breakpoint, so no flash and no
 * hydration dependency.
 */
function buildDisplayBootScript(display: DisplaySettings): string {
  return `(function(){try{
var D=${JSON.stringify(display)},BP=${MOBILE_BREAKPOINT_PX};
var root=document.documentElement,dark=window.matchMedia("(prefers-color-scheme: dark)");
function on(v){return v?"on":"off";}
function apply(){
var mobile=window.matchMedia("(max-width: "+(BP-1)+"px)").matches,c=mobile?D.mobile:D.desktop,d=root.dataset;
d.displayDevice=mobile?"mobile":"desktop";
d.adsHero=on(c.ads.hero);d.adsSide=on(c.ads.side);d.adsBottom=on(c.ads.bottom);
d.uiDensity=c.density;d.listingLayout=c.listingLayout;d.listingColumns=String(c.listingColumns);
d.showSidebar=on(c.showSidebar);d.showNewsTicker=on(c.showNewsTicker);d.showOfficePromo=on(c.showOfficePromo);
d.allowThemeChange=on(c.allowThemeChange);
var saved=null;try{saved=localStorage.getItem("akarpromax-theme");}catch(e){}
var stored=saved==="light"||saved==="dark"||saved==="system"?saved:null;
var mode=c.allowThemeChange&&stored?stored:c.themeMode;
d.theme=mode==="system"?(dark.matches?"dark":"light"):mode;
d.themeMode=mode;
}
apply();
window.addEventListener("resize",apply);
dark.addEventListener("change",apply);
window.addEventListener("akarpromax-theme-change",apply);
}catch(e){}})();`;
}

// Search-engine structured data (Schema.org). One Organization + WebSite
// graph on every page; entity-level types (RealEstateListing etc.) belong on
// their own detail pages.
const structuredData = JSON.stringify({
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://akarpromax.com/#organization",
      name: "عقار بروماكس",
      alternateName: "AkarProMax",
      url: "https://akarpromax.com",
      logo: "https://akarpromax.com/apple-touch-icon.png",
      email: "info@akarpromax.com",
      address: { "@type": "PostalAddress", addressLocality: "نزوى", addressCountry: "OM" },
    },
    {
      "@type": "WebSite",
      "@id": "https://akarpromax.com/#website",
      name: "عقار بروماكس",
      url: "https://akarpromax.com",
      inLanguage: ["ar", "en", "tr"],
      publisher: { "@id": "https://akarpromax.com/#organization" },
    },
  ],
});

type SiteLocale = "ar" | "en" | "tr";

async function readLocaleCookie(): Promise<SiteLocale> {
  const store = await cookies();
  const value = store.get("akarpromax-locale")?.value;
  return value === "en" || value === "tr" ? value : "ar";
}

const META_COPY: Record<SiteLocale, { title: string; description: string; ogTitle: string; ogDescription: string }> = {
  ar: {
    title: "عقار بروماكس | منصة العقار والخدمات الذكية",
    description: "اكتشف العقارات والمكاتب والخدمات المهنية عبر منصة عقار بروماكس.",
    ogTitle: "عقار بروماكس | قرارك العقاري يبدأ بوضوح",
    ogDescription: "منصة عقارية تجمع العقارات والمكاتب والخدمات في تجربة واحدة موثوقة.",
  },
  en: {
    title: "AkarProMax | Smart Real-Estate & Services Platform",
    description: "Discover properties, offices and professional services on AkarProMax.",
    ogTitle: "AkarProMax | Your property decision starts with clarity",
    ogDescription: "One trusted platform for properties, offices and professional services.",
  },
  tr: {
    title: "AkarProMax | Akıllı Emlak ve Hizmet Platformu",
    description: "AkarProMax'te gayrimenkulleri, ofisleri ve profesyonel hizmetleri keşfedin.",
    ogTitle: "AkarProMax | Emlak kararınız netlikle başlar",
    ogDescription: "Gayrimenkul, ofis ve hizmetleri tek güvenilir platformda buluşturur.",
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "akarpromax.com";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "https";
  const metadataBase = new URL(`${protocol}://${host}`);
  const locale = await readLocaleCookie();
  const copy = META_COPY[locale];

  return {
    metadataBase,
    title: copy.title,
    description: copy.description,
    icons: {
      icon: [
        { url: "/favicon-32.png", type: "image/png", sizes: "32x32" },
        { url: "/favicon-16.png", type: "image/png", sizes: "16x16" },
      ],
      shortcut: "/favicon-32.png",
      apple: "/apple-touch-icon.png",
    },
    manifest: "/manifest.json",
    openGraph: {
      title: copy.ogTitle,
      description: copy.ogDescription,
      locale,
      type: "website",
      images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "عقار بروماكس" }],
    },
    twitter: {
      card: "summary_large_image",
      title: copy.title,
      description: copy.description,
      images: ["/og.jpg"],
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // The language cookie makes the FIRST server render match the visitor's
  // choice — no more Arabic flash for en/tr visitors, and crawlers see the
  // right lang/dir.
  const locale = await readLocaleCookie();
  // Admin-editable presentation. Read here so the very first paint already
  // carries it; a failed read must not take the site down, so it falls back to
  // the shipped defaults.
  const display = await getPlatformSettings()
    .then((settings) => settings.display)
    .catch(() => DEFAULT_PLATFORM_SETTINGS.display);
  return (
    <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"} className={`${cairo.variable} ${inter.variable}`} suppressHydrationWarning>
      <head>
        <Script
          id="theme-boot"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: buildDisplayBootScript(display) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: structuredData }}
        />
      </head>
      <body suppressHydrationWarning>
        <SkipLink />
        <GeoProvider>
          <DisplaySettingsProvider value={display}>{children}</DisplaySettingsProvider>
        </GeoProvider>
      </body>
    </html>
  );
}
