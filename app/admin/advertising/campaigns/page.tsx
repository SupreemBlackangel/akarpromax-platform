'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Campaign {
  id: string | number;
  name: string;
  type: string;
  status: string;
}

export default function AdminCampaignsPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/advertising/campaigns')
      .then(res => res.json())
      .then(data => { if (data.success) setCampaigns(data.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">الحملات الإعلانية</h1>
        <button onClick={() => router.push('/admin/advertising/campaigns/new')} className="px-4 py-2 bg-[var(--color-primary)] text-white rounded hover:bg-[var(--color-primary-hover)]">حملة جديدة</button>
      </div>
      {loading ? <p>جاري التحميل...</p> : campaigns.length === 0 ? <p className="text-gray-500">لا توجد حملات</p> : campaigns.map((c) => (
        <div key={c.id} className="bg-[var(--color-surface)] rounded-lg shadow p-4 mb-4">
          <h3 className="font-semibold">{c.name}</h3>
          <p className="text-sm text-gray-500">{c.type} - {c.status}</p>
        </div>
      ))}
    </div>
  );
}
