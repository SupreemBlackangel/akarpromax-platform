"use client";

import Link from "next/link";
import { PdfToWord } from "@/src/components/tools/PdfToWord";
import PublicPageShell from "@/src/components/PublicPageShell";
import { useServicesPage } from "@/src/components/services/useServicesPage";

export default function PdfToWordPage() {
  const { locale, viewer, copy, dir, country, city, openLogin, handleLogout, AccountDialog } = useServicesPage();

  // The tools ad family, rendered by the shell in one batched request, instead
  // of two <AdSidebar> components each fetching for itself. The hard-coded
  // "السعودية / الرياض" they were handed was dead anyway: AdSidebar reads the
  // visitor's own location and ignores those props entirely.
  return (
    <PublicPageShell
      locale={locale}
      copy={copy}
      viewer={viewer}
      country={country}
      city={city}
      currentPath="/tools"
      adLayout={{ mode: "standard", family: "tools" }}
      onLogin={() => openLogin("login")}
      onLogout={handleLogout}
    >
      <div dir={dir} className="py-6">
        <div className="mx-auto w-full max-w-4xl px-4">
          <Link href="/tools" className="text-[var(--color-primary)] hover:underline mb-4 inline-block">
            &larr; {locale === "ar" ? "العودة للادوات" : "Back to tools"}
          </Link>
          <PdfToWord locale={locale} />
        </div>
      </div>
      {AccountDialog}
    </PublicPageShell>
  );
}
