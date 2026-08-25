'use client';

import { useState, useEffect } from 'react';
import { useServicesPage } from '@/src/components/services/useServicesPage';
import PublicPageShell from '@/src/components/PublicPageShell';
import { useRouter } from 'next/navigation';
import type { forumTopics } from '@/lib/db/schemas/community-schema';

type ForumTopic = typeof forumTopics.$inferSelect;

const COPY = {
  ar: {
    title: 'منتدى البناء والعقار',
    newTopic: 'موضوع جديد',
    addFirstTopic: 'أضف أول موضوع',
  },
  en: {
    title: 'Property and Construction Forum',
    newTopic: 'New Topic',
    addFirstTopic: 'Add First Topic',
  },
};

export default function CommunityPage() {
  const { locale, copy: _copy, viewer, country, city, openLogin, handleLogout } = useServicesPage();
  const t = COPY[locale as 'ar' | 'en'] ?? COPY.ar;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [topics, setTopics] = useState<ForumTopic[]>([]);

  useEffect(() => {
    fetch('/api/community/topics')
      .then(res => res.json())
      .then(data => { if (data.success) setTopics(data.data); setLoading(false); })
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
      currentPath="/community"
      adLayout={{ mode: 'standard', family: 'community' }}
    >
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-black text-[color:var(--color-text-primary)]">{t.title}</h1>
          <button onClick={() => router.push('/community/new')} className="rounded-xl bg-[color:var(--color-primary)] px-4 py-2 text-sm font-bold text-white transition hover:bg-[color:var(--color-primary-hover)]">{t.newTopic}</button>
        </div>
        {loading ? <p>جاري التحميل...</p> : topics.length === 0 ? (
          <div className="bg-[var(--color-surface)] rounded-lg shadow p-8 text-center text-gray-500">
            <p>لا توجد مواضيع</p>
            <button onClick={() => router.push('/community/new')} className="mt-4 rounded-xl bg-[color:var(--color-primary)] px-4 py-2 text-sm font-bold text-white transition hover:bg-[color:var(--color-primary-hover)]">أضف أول موضوع</button>
          </div>
        ) : topics.map((topic) => (
          <div key={topic.id} className="bg-[var(--color-surface)] rounded-lg shadow p-4 mb-4 cursor-pointer hover:bg-gray-50" onClick={() => router.push(`/community/${topic.id}`)}>
            <h3 className="font-semibold">{topic.title}</h3>
            <p className="text-sm text-gray-500">{topic.replies || 0} ردود</p>
          </div>
        ))}
      </div>
    </PublicPageShell>
  );
}