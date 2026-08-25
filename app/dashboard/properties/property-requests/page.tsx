'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Eye, XCircle } from 'lucide-react';
import type { propertyRequests } from '@/lib/db/schemas/properties-schema';

type PropertyRequestRow = typeof propertyRequests.$inferSelect;

const statusLabels: Record<string, string> = {
  active: 'نشط', matched: 'تم التطابق', closed: 'مغلق', expired: 'منتهي الصلاحية',
};

export default function PropertyRequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<PropertyRequestRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/property-requests');
      const data = await res.json();
      if (data.success) setRequests(data.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { (async () => { await fetchRequests(); })(); }, []);

  const closeRequest = async (id: string) => {
    await fetch('/api/property-requests', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'closed' }),
    });
    fetchRequests();
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">طلبات البحث عن عقارات</h1>
        <button onClick={() => router.push('/dashboard/properties/property-requests/new')} className="px-4 py-2 bg-[var(--color-primary)] text-white rounded hover:bg-[var(--color-primary-hover)]">
          <Plus className="w-4 h-4 inline ml-1" /> طلب جديد
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-gray-200 animate-pulse rounded" />)}</div>
      ) : requests.length === 0 ? (
        <div className="text-center py-12 text-gray-500"><p>لا توجد طلبات بحث</p></div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <div key={req.id} className="bg-[var(--color-surface)] rounded-lg shadow p-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{req.propertyType}</span>
                    <span className="text-sm text-gray-500">•</span>
                    <span className="text-sm text-gray-500">{req.city}، {req.governorate}</span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {req.dealType === 'sale' ? 'للبيع' : 'للإيجار'} • {req.budget ? `${Number(req.budget).toLocaleString()} ريال` : 'بدون ميزانية'}
                  </div>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${req.status === 'active' ? 'bg-green-200 text-green-700' : req.status === 'closed' ? 'bg-gray-200 text-gray-700' : 'bg-yellow-200 text-yellow-700'}`}>
                  {statusLabels[req.status ?? ''] || req.status}
                </span>
              </div>
              {req.status === 'active' && (
                <div className="flex gap-2 mt-3 pt-3 border-t">
                  <button onClick={() => closeRequest(req.id)} className="flex items-center gap-1 px-3 py-1 text-sm bg-red-100 text-[var(--color-error)] rounded hover:bg-red-200">
                    <XCircle className="w-4 h-4" /> إغلاق
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
