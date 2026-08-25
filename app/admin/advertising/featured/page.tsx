'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface FeaturedItem {
  id: string | number;
  propertyId: string | number;
  status: string;
}

export default function AdminFeaturedPage() {
  const router = useRouter();
  const [items, setItems] = useState<FeaturedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/advertising/featured')
      .then(res => res.json())
      .then(data => { if (data.success) setItems(data.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">العقارات المميزة</h1>
        <button onClick={() => router.push('/admin/advertising/featured/new')} className="px-4 py-2 bg-[var(--color-primary)] text-white rounded hover:bg-[var(--color-primary-hover)]">إضافة عقار مميز</button>
      </div>
      {loading ? <p>جاري التحميل...</p> : items.length === 0 ? <p className="text-gray-500">لا توجد عقارات مميزة</p> : items.map((item) => (
        <div key={item.id} className="bg-[var(--color-surface)] rounded-lg shadow p-4 mb-4">
          <h3 className="font-semibold">عقار #{item.propertyId}</h3>
          <p className="text-sm text-gray-500">{item.status}</p>
        </div>
      ))}
    </div>
  );
}
