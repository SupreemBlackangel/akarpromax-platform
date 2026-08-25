'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { messageThreads, messageParticipants } from '@/lib/db/schemas/messages-schema';

type MessageThread = typeof messageThreads.$inferSelect;
type MessageParticipant = typeof messageParticipants.$inferSelect;
type ThreadJoinRow = { message_threads: MessageThread; message_participants: MessageParticipant };

export default function MessagesPage() {
  const router = useRouter();
  const [threads, setThreads] = useState<ThreadJoinRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/messages')
      .then(res => res.json())
      .then(data => { if (data.success) setThreads(data.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">الرسائل</h1>
      {loading ? <p>جاري التحميل...</p> : threads.length === 0 ? (
        <div className="bg-[var(--color-surface)] rounded-lg shadow p-8 text-center text-gray-500">
          <p>لا توجد رسائل</p>
          <button onClick={() => router.push('/')} className="mt-4 px-4 py-2 bg-[var(--color-primary)] text-white rounded hover:bg-[var(--color-primary-hover)]">تصفح العقارات</button>
        </div>
      ) : threads.map((t) => (
        <div key={t.message_threads.id} className="bg-[var(--color-surface)] rounded-lg shadow p-4 mb-4 cursor-pointer hover:bg-gray-50" onClick={() => router.push(`/messages/${t.message_threads.id}`)}>
          <h3 className="font-semibold">{t.message_threads.title || 'محادثة'}</h3>
          <p className="text-sm text-gray-500">{t.message_threads.context}</p>
        </div>
      ))}
    </div>
  );
}
