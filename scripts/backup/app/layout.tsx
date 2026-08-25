import type { Metadata } from "next";
import { headers } from "next/headers";
import SkipLink from "@/src/components/ui/SkipLink";
import "./globals.css";

const themeBootScript = `(function(){try{var saved=localStorage.getItem("akarpromax-theme");var mode=saved==="light"||saved==="dark"||saved==="system"?saved:"system";var resolved=mode==="system"?(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):mode;document.documentElement.dataset.theme=resolved;document.documentElement.dataset.themeMode=mode;}catch(e){}})();`;

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "akarpromax.om";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "https";
  const metadataBase = new URL(`${protocol}://${host}`);

  return {
    metadataBase,
    title: "عقار بروماكس | منصة العقار الذكية في عُمان",
    description: "اكتشف العقارات والمكاتب والخدمات المهنية في عُمان عبر منصة عقار بروماكس.",
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
      description: "منصة عقارية عُمانية تجمع العقارات والمكاتب والخدمات في تجربة واحدة موثوقة.",
      locale: "ar_OM",
      type: "website",
      images: [{ url: "/og.png", width: 1536, height: 1024, alt: "عقار بروماكس في عُمان" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "عقار بروماكس | منصة العقار الذكية في عُمان",
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
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeBootScript }} /></head>
      <body>
        <SkipLink />
        {children}
      </body>
    </html>
  );
}
