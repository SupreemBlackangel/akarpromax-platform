'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import type { messages } from '@/lib/db/schemas/messages-schema';

type MessageRow = typeof messages.$inferSelect;

export default function MessageDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/messages/${id}`)
      .then(res => res.json())
      .then(data => { if (data.success) setMessages(data.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/messages/${id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content }),
      });
      if (res.ok) { const data = await res.json(); setMessages([...messages, data.data]); setContent(''); }
    } finally { setSubmitting(false); }
  };

  if (loading) return <div className="container mx-auto p-4">جاري التحميل...</div>;

  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <div className="bg-[var(--color-surface)] rounded-lg shadow h-[600px] flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.senderId === 'me' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] p-3 rounded-lg ${m.senderId === 'me' ? 'bg-[var(--color-primary)] text-white' : 'bg-gray-100'}`}>
                {m.content}
                {m.createdAt && <p className="text-xs opacity-70 mt-1">{new Date(m.createdAt).toLocaleTimeString()}</p>}
              </div>
            </div>
          ))}
        </div>
        <form onSubmit={handleSend} className="border-t p-4 flex gap-2">
          <input type="text" value={content} onChange={(e) => setContent(e.target.value)} className="flex-1 p-2 border rounded" placeholder="اكتب رسالة..." />
          <button type="submit" disabled={submitting} className="px-4 py-2 bg-[var(--color-primary)] text-white rounded hover:bg-[var(--color-primary-hover)] disabled:opacity-50">{submitting ? '...' : 'ارسال'}</button>
        </form>
      </div>
    </div>
  );
}
