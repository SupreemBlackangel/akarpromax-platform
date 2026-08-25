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
  }, [searchQuery]);

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
      onLogin={() => openLogin("login")}
      onLogout={handleLogout}
    >
      <div dir={dir} className="py-6">
        <ContentContainer>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
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
            <Button variant="primary" onClick={() => router.push("/onboarding")}>
              <Building2 className="w-4 h-4 mr-2" /> إضافة مكتب
            </Button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-48 bg-gray-200 animate-pulse rounded-xl" />
              ))}
            </div>
          ) : offices.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Building2 className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <h3 className="text-lg font-bold text-gray-700 mb-2">لا توجد مكاتب</h3>
                <p className="text-gray-500 text-sm">لم يتم إضافة أي مكاتب عقارية بعد</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
        </ContentContainer>
      </div>
      {AccountDialog}
    </PublicPageShell>
  );
}
