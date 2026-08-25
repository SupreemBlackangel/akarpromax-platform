'use client';

import { useState, useEffect } from 'react';
import { useServicesPage } from '@/src/components/services/useServicesPage';
import PublicPageShell from '@/src/components/PublicPageShell';
import type { knowledgeItems } from '@/lib/db/schemas/knowledge-schema';

type KnowledgeItem = typeof knowledgeItems.$inferSelect;

const COPY = {
  ar: {
    title: 'الكتب والبرامج',
    loading: 'جاري التحميل...',
    noResources: 'لا توجد موارد',
  },
  en: {
    title: 'Books and Programs',
    loading: 'Loading...',
    noResources: 'No resources available',
  },
};

export default function KnowledgePage() {
  const { locale, copy: _copy, viewer, country, city, openLogin, handleLogout } = useServicesPage();
  const t = COPY[locale as 'ar' | 'en'] ?? COPY.ar;

  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/knowledge')
      .then(res => res.json())
      .then(data => { if (data.success) setItems(data.data ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <PublicPageShell
      locale={locale as 'ar' | 'en'}
      copy={_copy}
      viewer={viewer}
      country={country}
      city={city}
      onLogin={() => openLogin('login')}
      onLogout={handleLogout}
      currentPath="/knowledge"
      adLayout={{ mode: 'standard', family: 'knowledge' }}
    >
      <div className="container mx-auto p-4 max-w-4xl">
        <h1 className="text-2xl font-bold mb-6">{t.title}</h1>
        <div>
          {loading ? (
            <p>{t.loading}</p>
          ) : items.length === 0 ? (
            <div className="bg-[var(--color-surface)] rounded-lg shadow p-8 text-center text-gray-500">
              <p>{t.noResources}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((item) => (
                <div key={item.id} className="bg-[var(--color-surface)] rounded-lg shadow p-4">
                  <h3 className="font-semibold">{item.titleAr}</h3>
                  <p className="text-sm text-gray-500">{item.type}</p>
                  <button className="mt-2 px-3 py-1 bg-[var(--color-primary)] text-white rounded text-sm hover:bg-[var(--color-primary-hover)]">تحميل</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PublicPageShell>
  );
}