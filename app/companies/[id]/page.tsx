'use client';
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Star, MapPin, Building, Users, CheckCircle, MessageCircle, Briefcase } from 'lucide-react';
import PublicPageShell from '@/src/components/PublicPageShell';
import { useServicesPage } from '@/src/components/services/useServicesPage';
import type { organizations, organizationBranches } from '@/lib/db/schema';

type Organization = typeof organizations.$inferSelect;
type OrganizationBranch = typeof organizationBranches.$inferSelect;
type CompanyDetail = Organization & { branches: OrganizationBranch[]; membersCount: number };

export default function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { locale, viewer, copy, dir, country, city, openLogin, handleLogout, AccountDialog } = useServicesPage();
  const [company, setCompany] = useState<CompanyDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/companies/${id}`)
      .then(res => res.json())
      .then(data => { if (data.success) setCompany(data.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  const rankColors: Record<string, string> = { NEW: 'bg-gray-100 text-gray-600', RISING: 'bg-green-100 text-green-700', DISTINGUISHED: 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]', GOLD: 'bg-yellow-100 text-yellow-700', PROMax: 'bg-purple-100 text-purple-700' };

  // The same shell, ad layout and news ticker the /companies list already uses.
  // This page used to render none of them and hand-roll a twelve-column grid
  // with an <AdSidebar> in each rail and three <AdBottom> below — five ad
  // components, five separate GETs, five full engine passes for one page view.
  // The shell asks once, for every slot on the page, through the batch route.
  return (
    <PublicPageShell
      locale={locale}
      copy={copy}
      viewer={viewer}
      country={country}
      city={city}
      currentPath="/companies"
      adLayout={{ mode: 'standard', family: 'company-detail' }}
      onLogin={() => openLogin('login')}
      onLogout={handleLogout}
    >
      <div dir={dir} className="py-6">
        <div className="mx-auto w-full max-w-5xl px-4">
          {loading ? (
            <p className="py-16 text-center text-sm font-bold text-[var(--color-text-muted)]">جاري التحميل...</p>
          ) : !company ? (
            <p className="py-16 text-center text-sm font-bold text-[var(--color-text-muted)]">الشركة غير موجودة</p>
          ) : (
            <div className="bg-[var(--color-surface)] rounded-xl shadow-lg overflow-hidden">
              <div className="h-48 bg-gradient-to-r from-purple-500 to-indigo-600 relative">
                <div className="absolute bottom-0 left-0 right-0 p-4 flex items-end gap-4 bg-gradient-to-t from-black/60 to-transparent">
                  <div className="w-24 h-24 rounded-lg border-4 border-white bg-gray-200 overflow-hidden flex-shrink-0">{company.logoUrl ? <img src={company.logoUrl} width={96} height={96} loading="eager" decoding="async" className="w-full h-full object-cover" alt="" /> : <div className="flex items-center justify-center h-full text-4xl bg-purple-100 text-purple-600">🏭</div>}</div>
                  <div className="text-white">
                    <h1 className="text-2xl font-bold">{company.nameAr || company.nameEn}</h1>
                    <div className="flex items-center gap-3 mt-1">
                      {company.verifiedAt && <span className="flex items-center text-xs bg-green-500/30 px-2 py-0.5 rounded-full"><CheckCircle className="w-3 h-3 mr-1" />موثقة</span>}
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="flex flex-wrap gap-4 border-b pb-4">
                  <button className="px-6 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] flex items-center gap-2"><MessageCircle className="w-4 h-4" />مراسلة</button>
                  <button className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"><Briefcase className="w-4 h-4" />طلب خدمة</button>
                </div>
                <div className="flex flex-wrap gap-6 mt-4 text-sm text-gray-600">
                  {company.cityId && <div className="flex items-center"><MapPin className="w-4 h-4 mr-1" />{company.cityId}</div>}
                  {company.contactPhone && <div className="flex items-center"><Users className="w-4 h-4 mr-1" />{company.contactPhone}</div>}
                </div>
                <div className="mt-6"><p className="text-gray-700">{company.descriptionAr || 'لا يوجد وصف'}</p></div>
              </div>
            </div>
          )}
        </div>
      </div>
      {AccountDialog}
    </PublicPageShell>
  );
}
