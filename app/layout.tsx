import Script from "next/script";
import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { Cairo, Inter } from "next/font/google";
import SkipLink from "@/src/components/ui/SkipLink";
import { GeoProvider } from "@/src/contexts/GeoContext";
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

const themeBootScript = `(function(){try{var saved=localStorage.getItem("akarpromax-theme");var mode=saved==="light"||saved==="dark"||saved==="system"?saved:"system";var resolved=mode==="system"?(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):mode;document.documentElement.dataset.theme=resolved;document.documentElement.dataset.themeMode=mode;}catch(e){}})();`;

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
  return (
    <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"} className={`${cairo.variable} ${inter.variable}`} suppressHydrationWarning>
      <head>
        <Script
          id="theme-boot"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeBootScript }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: structuredData }}
        />
      </head>
      <body suppressHydrationWarning>
        <SkipLink />
        <GeoProvider>{children}</GeoProvider>
      </body>
    </html>
  );
}
