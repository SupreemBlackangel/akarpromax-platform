'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useServicesPage } from '@/src/components/services/useServicesPage';
import PublicPageShell from '@/src/components/PublicPageShell';
import { useRouter } from 'next/navigation';
import type { forumTopics, forumPosts } from '@/lib/db/schemas/community-schema';

type ForumTopic = typeof forumTopics.$inferSelect;
type ForumPost = typeof forumPosts.$inferSelect;
type TopicWithPosts = ForumTopic & { posts: ForumPost[] };

const COPY = {
  ar: {
    reply: 'إرسال',
    sending: 'جاري الإرسال...',
  },
  en: {
    reply: 'Reply',
    sending: 'Sending...',
  },
  tr: {
    reply: 'Geri Bildirim',
    sending: 'Gönderiliyor...',
  },
};

export default function CommunityTopicPage() {
  const { id } = useParams<{ id: string }>();
  const { locale, copy: _copy, viewer, country, city, openLogin, handleLogout } = useServicesPage();
  const t = COPY[locale as 'ar' | 'en' | 'tr'] ?? COPY.ar;
  const router = useRouter();

  const [topic, setTopic] = useState<TopicWithPosts | null>(null);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/community/topics/${id}`)
      .then(res => res.json())
      .then(data => { if (data.success) { setTopic(data.data); setPosts(data.data.posts || []); } setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/community/topics/${id}/posts`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content }),
      });
      if (res.ok) { const data = await res.json(); setPosts([...posts, data.data]); setContent(''); }
    } finally { setSubmitting(false); }
  };

  if (loading) return <div className="container mx-auto p-4">جاري التحميل...</div>;
  if (!topic) return <div className="container mx-auto p-4">الموضوع غير موجود</div>;

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
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-2"></div>
            <div className="lg:col-span-8">
              <div className="bg-[var(--color-surface)] rounded-lg shadow p-6 mb-4">
                <h1 className="text-2xl font-bold">{topic.title}</h1>
                <p className="text-sm text-gray-500 mt-2">بواسطة {topic.userId}</p>
                <div className="mt-4 whitespace-pre-wrap">{topic.content}</div>
              </div>
              <div className="space-y-4">
                {posts.map((p) => (
                  <div key={p.id} className="bg-[var(--color-surface)] rounded-lg shadow p-4">
                    <p className="text-sm text-gray-500">بواسطة {p.userId}</p>
                    <p className="mt-2 whitespace-pre-wrap">{p.content}</p>
                  </div>
                ))}
              </div>
              <form onSubmit={handleReply} className="mt-6 bg-[var(--color-surface)] rounded-lg shadow p-4">
                <textarea value={content} onChange={(e) => setContent(e.target.value)} className="w-full p-2 border rounded h-24" placeholder="اكتب ردك..." />
                <button type="submit" disabled={submitting} className="mt-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded hover:bg-[var(--color-primary-hover)] disabled:opacity-50">{submitting ? 'جاري...' : 'ارسال الرد'}</button>
              </form>
            </div>
            <div className="lg:col-span-2"></div>
          </div>
        </div>
      </div>
    </PublicPageShell>
  );
}