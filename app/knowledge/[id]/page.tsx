'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useServicesPage } from '@/src/components/services/useServicesPage';
import PublicPageShell from '@/src/components/PublicPageShell';
import { useRouter } from 'next/navigation';
import type { knowledgeItems } from '@/lib/db/schemas/knowledge-schema';

type KnowledgeItem = typeof knowledgeItems.$inferSelect;

const COPY = {
  ar: {
    download: 'تحميل',
    downloading: 'جاري التحميل...',
  },
  en: {
    download: 'Download',
    downloading: 'Downloading...',
  },
  tr: {
    download: 'İndir',
    downloading: 'İndiriliyor...',
  },
};

export default function KnowledgeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { locale, copy: _copy, viewer, country, city, openLogin, handleLogout } = useServicesPage();
  const router = useRouter();

  const [item, setItem] = useState<KnowledgeItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/knowledge/${id}`)
      .then(res => res.json())
      .then(data => { if (data.success) setItem(data.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  const handleDownload = async () => {
    await fetch(`/api/knowledge/${id}/download`, { method: 'POST' });
    if (item?.fileUrl) window.open(item.fileUrl, '_blank');
  };

  if (loading) return <div className="container mx-auto p-4">جاري التحميل...</div>;
  if (!item) return <div className="container mx-auto p-4">المورد غير موجود</div>;

  return (
    <PublicPageShell
      locale={locale as 'ar' | 'en' | 'tr'}
      copy={_copy}
      viewer={viewer}
      country={country}
      city={city}
      onLogin={() => openLogin('login')}
      onLogout={handleLogout}
      adLayout={{ mode: 'standard', family: 'knowledge' }}
    >
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-2"></div>
            <div className="lg:col-span-8">
              <div className="bg-[var(--color-surface)] rounded-lg shadow p-6">
                <h1 className="text-2xl font-bold">{item.titleAr}</h1>
                <p className="text-sm text-gray-500 mt-2">{item.type} - {item.category}</p>
                <p className="mt-4">{item.descriptionAr}</p>
                <div className="mt-6 flex gap-4">
                  <button onClick={handleDownload} className="px-6 py-2 bg-[var(--color-primary)] text-white rounded hover:bg-[var(--color-primary-hover)] disabled:opacity-50">{item.fileUrl ? 'تحميل' : 'لا يوجد ملف'}</button>
                  {item.downloadCount && <span className="text-sm text-gray-500">تم التحميل {item.downloadCount} مرة</span>}
                </div>
              </div>
            </div>
            <div className="lg:col-span-2"></div>
          </div>
        </div>
      </div>
    </PublicPageShell>
  );
}