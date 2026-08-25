'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewPropertyRequestPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    dealType: '', propertyType: '', country: 'السعودية', governorate: '', city: '',
    district: '', budget: '', area: '', bedrooms: '', bathrooms: '', description: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/property-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          budget: formData.budget ? parseFloat(formData.budget) : null,
          area: formData.area ? parseFloat(formData.area) : null,
          bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : null,
          bathrooms: formData.bathrooms ? parseInt(formData.bathrooms) : null,
        }),
      });
      if (res.ok) router.push('/dashboard/properties/property-requests');
    } finally {
      setLoading(false);
    }
  };

  const governorates = ['الرياض', 'مكة المكرمة', 'المدينة المنورة', 'الشرقية', 'عسير', 'تبوك'];
  const cities: Record<string, string[]> = {
    'الرياض': ['الرياض', 'الخرج'], 'مكة المكرمة': ['مكة المكرمة', 'جدة'], 'الشرقية': ['الدمام', 'الخبر'],
  };

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">طلب البحث عن عقار</h1>
      <form onSubmit={handleSubmit} className="bg-[var(--color-surface)] rounded-lg shadow p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">نوع الصفقة *</label>
            <select value={formData.dealType} onChange={(e) => setFormData({ ...formData, dealType: e.target.value })} className="w-full p-2 border rounded" required>
              <option value="">اختر</option>
              <option value="sale">للبيع</option>
              <option value="rent">للإيجار</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">نوع العقار *</label>
            <select value={formData.propertyType} onChange={(e) => setFormData({ ...formData, propertyType: e.target.value })} className="w-full p-2 border rounded" required>
              <option value="">اختر</option>
              <option value="villa">فيلا</option>
              <option value="apartment">شقة</option>
              <option value="land">أرض</option>
              <option value="shop">محل</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">المنطقة *</label>
            <select value={formData.governorate} onChange={(e) => setFormData({ ...formData, governorate: e.target.value, city: '' })} className="w-full p-2 border rounded" required>
              <option value="">اختر</option>
              {governorates.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">المدينة *</label>
            <select value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} className="w-full p-2 border rounded" required disabled={!formData.governorate}>
              <option value="">اختر</option>
              {formData.governorate && cities[formData.governorate]?.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">الحي</label>
            <input type="text" value={formData.district} onChange={(e) => setFormData({ ...formData, district: e.target.value })} className="w-full p-2 border rounded" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">الميزانية (ريال)</label>
            <input type="number" value={formData.budget} onChange={(e) => setFormData({ ...formData, budget: e.target.value })} className="w-full p-2 border rounded" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">المساحة (م²)</label>
            <input type="number" value={formData.area} onChange={(e) => setFormData({ ...formData, area: e.target.value })} className="w-full p-2 border rounded" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">غرف النوم</label>
            <input type="number" value={formData.bedrooms} onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })} className="w-full p-2 border rounded" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">وصف إضافي</label>
          <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full p-2 border rounded h-24" required minLength={10} />
        </div>
        <div className="flex gap-4">
          <button type="submit" disabled={loading} className="px-6 py-2 bg-[var(--color-primary)] text-white rounded hover:bg-[var(--color-primary-hover)] disabled:opacity-50">
            {loading ? 'جاري الإرسال...' : 'إرسال الطلب'}
          </button>
          <button type="button" onClick={() => router.back()} className="px-6 py-2 bg-gray-200 rounded hover:bg-gray-300">إلغاء</button>
        </div>
      </form>
    </div>
  );
}
