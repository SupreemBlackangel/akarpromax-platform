"use client";

import { useState } from "react";
import Link from "next/link";
import { PdfToWord } from "@/src/components/tools/PdfToWord";
import { AdSidebar } from "@/components/advertising/placements/AdSidebar";

const location = { country: "السعودية", governorate: "الرياض", city: "الرياض" };

export default function PdfToWordPage() {
  const [locale, setLocale] = useState<string>(() => {
    if (typeof window === "undefined") return "ar";
    const stored = window.localStorage.getItem("akarpromax-locale");
    return stored === "en" || stored === "tr" ? stored : "ar";
  });

  return (
    <div dir={locale === "ar" ? "rtl" : "ltr"} className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <Link href="/tools" className="text-[var(--color-primary)] hover:underline mb-4 inline-block">
          &larr; {locale === "ar" ? "العودة للادوات" : "Back to tools"}
        </Link>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-2">
            <AdSidebar page="tools" placement="left_01" country={location.country} governorate={location.governorate} city={location.city} />
          </div>
          <div className="lg:col-span-8">
            <PdfToWord locale={locale} />
          </div>
          <div className="lg:col-span-2">
            <AdSidebar page="tools" placement="right_01" country={location.country} governorate={location.governorate} city={location.city} />
          </div>
        </div>
      </div>
    </div>
  );
}
