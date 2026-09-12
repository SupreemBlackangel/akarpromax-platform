'use client';
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Star, MapPin, Building, Users, CheckCircle, MessageCircle, Home } from 'lucide-react';
import PublicPageShell from '@/src/components/PublicPageShell';
import ChatWidget from '@/src/components/public/chat-widget';
import { useServicesPage } from '@/src/components/services/useServicesPage';
import type { organizations, organizationBranches } from '@/lib/db/schema';

type Organization = typeof organizations.$inferSelect;
type OrganizationBranch = typeof organizationBranches.$inferSelect;
type OfficeDetail = Organization & { branches: OrganizationBranch[]; membersCount: number; ownerUserId?: string | null };

export default function OfficeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { locale, viewer, copy, dir, country, city, openLogin, handleLogout, AccountDialog } = useServicesPage();
  const [office, setOffice] = useState<OfficeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [contactBusy, setContactBusy] = useState(false);

  const contactOffice = async () => {
    if (!office?.ownerUserId || contactBusy) return;
    if (!viewer.authenticated) {
      openLogin('login');
      return;
    }
    setContactBusy(true);
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: office.nameAr || office.nameEn || 'مكتب عقاري',
          context: 'office',
          contextId: office.id,
          recipientId: office.ownerUserId,
        }),
      });
      const data = await response.json().catch(() => null);
      if (response.ok && data?.success && data.data?.id) {
        window.dispatchEvent(new CustomEvent('akar:chat:open', {
          detail: { threadId: data.data.id, title: office.nameAr || office.nameEn || 'مكتب عقاري' },
        }));
      }
    } finally {
      setContactBusy(false);
    }
  };

  useEffect(() => {
    fetch(`/api/offices/${id}`)
      .then(res => res.json())
      .then(data => { if (data.success) setOffice(data.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  const rankColors: Record<string, string> = { NEW: 'bg-gray-100 text-gray-600', RISING: 'bg-green-100 text-green-700', DISTINGUISHED: 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]', GOLD: 'bg-yellow-100 text-yellow-700', PROMax: 'bg-purple-100 text-purple-700' };

  // The shell the /offices list already uses, with the batched standard ad
  // layout. This page hand-rolled a twelve-column grid around five legacy ad
  // components, each of which fetched on its own.
  return (
    <PublicPageShell
      locale={locale}
      copy={copy}
      viewer={viewer}
      country={country}
      city={city}
      currentPath="/offices"
      adLayout={{ mode: 'standard', family: 'office-detail' }}
      onLogin={() => openLogin('login')}
      onLogout={handleLogout}
    >
      <div dir={dir} className="py-6">
        <div className="mx-auto w-full max-w-5xl px-4">
          {loading ? (
            <p className="py-16 text-center text-sm font-bold text-[var(--color-text-muted)]">جاري التحميل...</p>
          ) : !office ? (
            <p className="py-16 text-center text-sm font-bold text-[var(--color-text-muted)]">المكتب غير موجود</p>
          ) : (
            <div className="bg-[var(--color-surface)] rounded-xl shadow-lg overflow-hidden">
              <div className="h-48 bg-gradient-to-r from-blue-600 to-indigo-600 relative">
                <div className="absolute bottom-0 left-0 right-0 p-4 flex items-end gap-4 bg-gradient-to-t from-black/60 to-transparent">
                  <div className="w-24 h-24 rounded-lg border-4 border-white bg-gray-200 overflow-hidden flex-shrink-0">{office.logoUrl ? <img src={office.logoUrl} width={96} height={96} loading="eager" decoding="async" className="w-full h-full object-cover" alt="" /> : <div className="flex items-center justify-center h-full text-4xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">🏢</div>}</div>
                  <div className="text-white">
                    <h1 className="text-2xl font-bold">{office.nameAr || office.nameEn}</h1>
                    <div className="flex items-center gap-3 mt-1">
                      {office.verifiedAt && <span className="flex items-center text-xs bg-green-500/30 px-2 py-0.5 rounded-full"><CheckCircle className="w-3 h-3 mr-1" />موثق</span>}
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="flex flex-wrap gap-4 border-b pb-4">
                  <button
                    onClick={contactOffice}
                    disabled={contactBusy || !office.ownerUserId}
                    className="px-6 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] flex items-center gap-2 disabled:opacity-50"
                  >
                    <MessageCircle className="w-4 h-4" />{contactBusy ? 'جارٍ الفتح...' : 'راسل المكتب'}
                  </button>
                  <button className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"><Home className="w-4 h-4" />تصفح العقارات</button>
                </div>
                <div className="flex flex-wrap gap-6 mt-4 text-sm text-gray-600">
                  {office.cityId && <div className="flex items-center"><MapPin className="w-4 h-4 mr-1" />{office.cityId}</div>}
                  {office.contactPhone && <div className="flex items-center"><Building className="w-4 h-4 mr-1" />{office.contactPhone}</div>}
                </div>
                <div className="mt-6"><p className="text-gray-700">{office.descriptionAr || 'لا يوجد وصف'}</p></div>
              </div>
            </div>
          )}
        </div>
      </div>
      <ChatWidget locale="ar" authenticated={viewer.authenticated} onRequireLogin={() => openLogin('login')} />
      {AccountDialog}
    </PublicPageShell>
  );
}
