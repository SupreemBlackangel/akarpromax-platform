'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface NewsTickerItem {
  id: string | number;
  messageAr: string;
  isActive: boolean;
}

export default function AdminNewsTickerPage() {
  const router = useRouter();
  const [items, setItems] = useState<NewsTickerItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/advertising/news-ticker')
      .then(res => res.json())
      .then(data => { if (data.success) setItems(data.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">الشريط الإخباري</h1>
        <button onClick={() => router.push('/admin/advertising/news-ticker/new')} className="px-4 py-2 bg-[var(--color-primary)] text-white rounded hover:bg-[var(--color-primary-hover)]">إضافة خبر</button>
      </div>
      {loading ? <p>جاري التحميل...</p> : items.length === 0 ? <p className="text-gray-500">لا توجد أخبار</p> : items.map((item) => (
        <div key={item.id} className="bg-[var(--color-surface)] rounded-lg shadow p-4 mb-4">
          <p className="font-semibold">{item.messageAr}</p>
          <p className="text-sm text-gray-500">{item.isActive ? 'نشط' : 'موقف'}</p>
        </div>
      ))}
    </div>
  );
}
