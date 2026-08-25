'use client';
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Star, MapPin, Building, Users, CheckCircle, MessageCircle, Briefcase } from 'lucide-react';
import { AdSidebar } from '@/components/advertising/placements/AdSidebar';
import { AdBottom } from '@/components/advertising/placements/AdBottom';
import { NewsTicker } from '@/components/advertising/placements/NewsTicker';
import type { organizations, organizationBranches } from '@/lib/db/schema';

type Organization = typeof organizations.$inferSelect;
type OrganizationBranch = typeof organizationBranches.$inferSelect;
type CompanyDetail = Organization & { branches: OrganizationBranch[]; membersCount: number };

export default function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [company, setCompany] = useState<CompanyDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/companies/${id}`)
      .then(res => res.json())
      .then(data => { if (data.success) setCompany(data.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="container mx-auto p-4">جاري التحميل...</div>;
  if (!company) return <div className="container mx-auto p-4">الشركة غير موجودة</div>;
  const rankColors: Record<string, string> = { NEW: 'bg-gray-100 text-gray-600', RISING: 'bg-green-100 text-green-700', DISTINGUISHED: 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]', GOLD: 'bg-yellow-100 text-yellow-700', PROMax: 'bg-purple-100 text-purple-700' };

  return (
    <div className="min-h-screen bg-gray-50">
      <NewsTicker page="company-detail" country="السعودية" governorate="الرياض" city="الرياض" />
      <div className="container mx-auto px-4 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-2"><AdSidebar page="company-detail" placement="left_01" country="السعودية" governorate="الرياض" city="الرياض" /></div>
          <div className="lg:col-span-8">
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
          </div>
          <div className="lg:col-span-2"><AdSidebar page="company-detail" placement="right_01" country="السعودية" governorate="الرياض" city="الرياض" /></div>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-6"><AdBottom page="company-detail" placement="bottom_01" country="السعودية" governorate="الرياض" city="الرياض" /><AdBottom page="company-detail" placement="bottom_02" /><AdBottom page="company-detail" placement="bottom_03" /></div>
      </div>
    </div>
  );
}
