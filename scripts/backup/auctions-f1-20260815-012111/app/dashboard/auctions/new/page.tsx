'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function NewAuctionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [properties, setProperties] = useState([]);
  const [formData, setFormData] = useState({
    propertyId: '', type: 'fixed', startingPrice: '', bidIncrement: '100', minBid: '', maxBid: '', endDate: '',
  });

  useEffect(() => {
    fetch('/api/properties?status=approved')
      .then(res => res.json())
      .then(data => { if (data.success) setProperties(data.data); });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/auctions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, startingPrice: parseFloat(formData.startingPrice) }),
      });
      if (res.ok) router.push('/dashboard/auctions');
    } finally { setLoading(false); }
  };

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">مزاد جديد</h1>
      <form onSubmit={handleSubmit} className="space-y-4 bg-white rounded-lg shadow p-6">
        <div>
          <label className="block text-sm font-medium mb-1">العقار *</label>
          <select value={formData.propertyId} onChange={(e) => setFormData({ ...formData, propertyId: e.target.value })} className="w-full p-2 border rounded" required>
            <option value="">اختر عقاراً</option>
            {(properties as any[]).map((p: any) => <option key={p.id} value={p.id}>{p.titleAr}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">نوع المزاد *</label>
          <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} className="w-full p-2 border rounded">
            <option value="fixed">مزاد محدد (3 ايام)</option>
            <option value="open">مزاد مفتوح (15 يوماً)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">السعر الابتدائي *</label>
          <input type="number" value={formData.startingPrice} onChange={(e) => setFormData({ ...formData, startingPrice: e.target.value })} className="w-full p-2 border rounded" required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">قيمة المزاودة</label>
          <input type="number" value={formData.bidIncrement} onChange={(e) => setFormData({ ...formData, bidIncrement: e.target.value })} className="w-full p-2 border rounded" placeholder="100" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">اقل مزاودة</label>
            <input type="number" value={formData.minBid} onChange={(e) => setFormData({ ...formData, minBid: e.target.value })} className="w-full p-2 border rounded" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">اقصى مزاودة</label>
            <input type="number" value={formData.maxBid} onChange={(e) => setFormData({ ...formData, maxBid: e.target.value })} className="w-full p-2 border rounded" />
          </div>
        </div>
        {formData.type === 'fixed' && (
          <div>
            <label className="block text-sm font-medium mb-1">تاريخ الانتهاء</label>
            <input type="datetime-local" value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} className="w-full p-2 border rounded" />
          </div>
        )}
        <div className="flex gap-4">
          <button type="submit" disabled={loading} className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">{loading ? 'جاري...' : 'انشاء المزاد'}</button>
          <button type="button" onClick={() => router.back()} className="px-6 py-2 bg-gray-200 rounded hover:bg-gray-300">الغاء</button>
        </div>
      </form>
    </div>
  );
}
