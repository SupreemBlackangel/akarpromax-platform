import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "akarpromax.om";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "https";
  const metadataBase = new URL(`${protocol}://${host}`);

  return {
    metadataBase,
    title: "عقار بروماكس | منصة العقار الذكية في عُمان",
    description: "اكتشف العقارات والمكاتب والخدمات المهنية في عُمان عبر منصة عقار بروماكس.",
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
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
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
