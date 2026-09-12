"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, Building2 } from "lucide-react";
import { useServicesPage } from "@/src/components/services/useServicesPage";
import PublicPageShell from "@/src/components/PublicPageShell";
import Button from "@/src/components/ui/Button";
import Card, { CardContent } from "@/src/components/ui/Card";
import { ContentContainer } from "@/src/components/layout/Containers";
import { OfficeCard } from "@/components/office/OfficeCard";
import EmptyState from "@/src/components/ui/EmptyState";

interface Office {
  id: string;
  nameAr?: string;
  nameEn?: string;
  name?: string;
  logoUrl?: string;
  cityId?: string;
  verifiedAt?: string | null;
}

export default function OfficesPage() {
  const router = useRouter();
  const { locale, viewer, copy, dir, country, city, openLogin, handleLogout, AccountDialog } = useServicesPage();
  const [loading, setLoading] = useState(true);
  const [offices, setOffices] = useState<Office[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    let mounted = true;
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams();
        if (searchQuery.trim()) params.append("q", searchQuery.trim());
        // Scoped to the visitor's platform country (empty when browsing globally).
        if (country) params.append("country", country);
        const res = await fetch(`/api/offices?${params.toString()}`);
        const data = await res.json();
        if (mounted && data.success) setOffices(data.data);
      } catch (error) {
        console.error("Error fetching offices:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    }, 300);
    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [searchQuery, country]);

  return (
    <PublicPageShell
      locale={locale}
      copy={copy}
      viewer={viewer}
      country={country}
      city={city}
      currentPath="/offices"
      pageHeader={{
        eyebrow: "المكاتب العقارية",
        title: "المكاتب العقارية",
        description: "ابحث عن أفضل المكاتب العقارية الموثوقة",
      }}
      adLayout={{ mode: "standard", family: "offices" }}
      // The office desktop app is promoted here only — this is the page its
      // audience (real-estate companies and offices) actually lands on.
      officePromotion={{
        cta: "حمّل تطبيق AkarProMax Office",
        description: "تطبيق سطح المكتب للمكاتب العقارية: أدر عقارك وعملاءك من جهازك، وارفع عقاراتك للمنصة واستقبل فرص منطقتك مباشرة.",
        href: "/download",
      }}
      onLogin={() => openLogin("login")}
      onLogout={handleLogout}
    >
      <div dir={dir} className="py-6">
        <ContentContainer>
          <div className="mb-6 flex flex-col gap-4 md:flex-row">
            <div className="flex-1 relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث عن مكتب..."
                className="w-full p-3 pr-10 border rounded-lg focus:ring-2 focus:ring-[color:var(--color-primary)]"
              />
              <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            </div>
            {/* Outline, not filled: a visitor on this page came to LOOK at
                offices; registering one is what a handful of them do instead,
                and a filled button made the page's loudest control the one
                almost nobody wants. Hidden on a phone — it appears under the
                results instead (below), where it does not sit between the
                search field and what the search found. */}
            <Button variant="outline" className="hidden md:inline-flex" onClick={() => router.push("/onboarding")}>
              <Building2 aria-hidden="true" className="size-4 me-2" /> إضافة مكتب
            </Button>
          </div>

          {loading ? (
            <div className="listing-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-48 bg-gray-200 animate-pulse rounded-xl" />
              ))}
            </div>
          ) : offices.length === 0 ? (
            <Card>
              <CardContent className="p-[var(--space-8)]">
                <EmptyState icon={Building2} title="لا توجد مكاتب" description="لم يُضف أي مكتب عقاري بعد" />
              </CardContent>
            </Card>
          ) : (
            <div className="listing-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {offices.map((o) => (
                <OfficeCard
                  key={o.id}
                  office={{
                    id: o.id,
                    name: o.nameAr || o.nameEn || o.name || "",
                    logo: o.logoUrl,
                    city: o.cityId,
                    isVerified: !!o.verifiedAt,
                  }}
                />
              ))}
            </div>
          )}

          {/* The phone's copy of the action, after the results. */}
          <div className="mt-[var(--space-6)] md:hidden">
            <Button variant="outline" className="w-full" onClick={() => router.push("/onboarding")}>
              <Building2 aria-hidden="true" className="size-4 me-2" /> إضافة مكتب
            </Button>
          </div>
        </ContentContainer>
      </div>
      {AccountDialog}
    </PublicPageShell>
  );
}
