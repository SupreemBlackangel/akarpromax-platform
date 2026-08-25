'use client';
import { useState } from 'react';
import { useServicesPage } from '@/src/components/services/useServicesPage';
import { useRouter } from 'next/navigation';
import PublicPageShell from '@/src/components/PublicPageShell';

const COPY = {
  ar: {
    title: 'موضوع جديد',
    publish: 'نشر الموضوع',
    cancel: 'إلغاء',
  },
  en: {
    title: 'New Topic',
    publish: 'Publish Topic',
    cancel: 'Cancel',
  },
  tr: {
    title: 'Yeni Konu',
    publish: 'Konu Yayınla',
    cancel: 'İptal',
  },
};

export default function NewCommunityTopicPage() {
  const { locale, copy: _copy, viewer, country, city, openLogin, handleLogout } = useServicesPage();
  const router = useRouter();
  const t = COPY[locale as 'ar' | 'en' | 'tr'] ?? COPY.ar;

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ title: '', content: '', categoryId: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/community/topics', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData),
      });
      if (res.ok) router.push('/community');
    } finally { setLoading(false); }
  };

  return (
    <PublicPageShell
      locale={locale as 'ar' | 'en' | 'tr'}
      copy={_copy}
      viewer={viewer}
      country={country}
      city={city}
      onLogin={() => openLogin('login')}
      onLogout={handleLogout}
      adLayout={{ mode: 'standard', family: 'community' }}
    >
      <div className="container mx-auto p-4 max-w-2xl">
        <h1 className="text-2xl font-bold mb-6">{t.title}</h1>
        <form onSubmit={handleSubmit} className="space-y-4 bg-[var(--color-surface)] rounded-lg shadow p-6">
          <div><label className="block text-sm font-medium mb-1">العنوان *</label><input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full p-2 border rounded" required /></div>
          <div><label className="block text-sm font-medium mb-1">المحتوى *</label><textarea value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} className="w-full p-2 border rounded h-48" required /></div>
          <div className="flex gap-4"><button type="submit" disabled={loading} className="px-6 py-2 bg-[var(--color-primary)] text-white rounded hover:bg-[var(--color-primary-hover)] disabled:opacity-50">{loading ? 'جاري...' : t.publish}</button><button type="button" onClick={() => router.back()} className="px-6 py-2 bg-gray-200 rounded hover:bg-gray-300">{t.cancel}</button></div>
        </form>
      </div>
    </PublicPageShell>
  );
}