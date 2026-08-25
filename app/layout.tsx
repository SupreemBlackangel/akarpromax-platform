import Script from "next/script";
import type { Metadata } from "next";
import { headers } from "next/headers";
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

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "akarpromax.com";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "https";
  const metadataBase = new URL(`${protocol}://${host}`);

  return {
    metadataBase,
    title: "عقار بروماكس | منصة العقار والخدمات الذكية",
    description: "اكتشف العقارات والمكاتب والخدمات المهنية عبر منصة عقار بروماكس.",
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
      title: "عقار بروماكس | قرارك العقاري يبدأ بوضوح",
      description: "منصة عقارية تجمع العقارات والمكاتب والخدمات في تجربة واحدة موثوقة.",
      locale: "ar",
      type: "website",
      images: [{ url: "/og.png", width: 1536, height: 1024, alt: "عقار بروماكس" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "عقار بروماكس | منصة العقار والخدمات الذكية",
      description: "اكتشف العقارات والمكاتب والخدمات المهنية بثقة.",
      images: ["/og.png"],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className={`${cairo.variable} ${inter.variable}`} suppressHydrationWarning>
      <head>
        <Script
          id="theme-boot"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeBootScript }}
        />
      </head>
      <body suppressHydrationWarning>
        <SkipLink />
        <GeoProvider>{children}</GeoProvider>
      </body>
    </html>
  );
}
