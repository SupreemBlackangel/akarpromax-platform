'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardPageShell from '@/src/components/dashboard/DashboardPageShell';

type GeoRow = { id: string; code?: string | null; nameAr?: string | null; nameEn?: string | null };

// Geography comes from the platform geo registry — never a hardcoded country.
async function fetchGeo(query: string): Promise<GeoRow[]> {
  const response = await fetch(`/api/geo?${query}`, { cache: 'no-store' });
  const data = await response.json().catch(() => null);
  const rows = Array.isArray(data) ? data : data?.data;
  return Array.isArray(rows) ? rows : [];
}

export default function NewPropertyRequestPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [countries, setCountries] = useState<GeoRow[]>([]);
  const [governorates, setGovernorates] = useState<GeoRow[]>([]);
  const [cities, setCities] = useState<GeoRow[]>([]);
  const [formData, setFormData] = useState({
    dealType: '', propertyType: '', country: '', governorate: '', city: '',
    district: '', budget: '', area: '', bedrooms: '', bathrooms: '', description: '',
  });

  useEffect(() => {
    fetchGeo('type=countries').then(setCountries).catch(() => {});
  }, []);

  const onCountryChange = (countryId: string, label: string) => {
    setFormData((current) => ({ ...current, country: label, governorate: '', city: '' }));
    setGovernorates([]);
    setCities([]);
    if (countryId) fetchGeo(`type=governorates&parentId=${encodeURIComponent(countryId)}`).then(setGovernorates).catch(() => {});
  };

  const onGovernorateChange = (governorateId: string, label: string) => {
    setFormData((current) => ({ ...current, governorate: label, city: '' }));
    setCities([]);
    if (governorateId) fetchGeo(`type=cities&parentId=${encodeURIComponent(governorateId)}`).then(setCities).catch(() => {});
  };

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

  const inputClass = 'w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5 text-sm outline-none focus:border-[var(--color-primary)]';
  const labelClass = 'mb-1 block text-xs font-bold text-[var(--color-text-secondary)]';

  return (
    <DashboardPageShell
      currentPath="/dashboard/properties/property-requests/new"
      title={{ ar: 'طلب البحث عن عقار', en: 'New property request', tr: 'Yeni mülk talebi' }}
      description={{ ar: 'حدد مواصفات العقار الذي تبحث عنه وسنطابقه مع المعروض', en: 'Describe the property you need and we will match it', tr: 'Aradığınız mülkü tanımlayın, eşleştirelim' }}
    >
      <form onSubmit={handleSubmit} className="max-w-2xl space-y-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>نوع الصفقة *</label>
            <select value={formData.dealType} onChange={(e) => setFormData({ ...formData, dealType: e.target.value })} className={inputClass} required>
              <option value="">اختر</option>
              <option value="sale">للبيع</option>
              <option value="rent">للإيجار</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>نوع العقار *</label>
            <select value={formData.propertyType} onChange={(e) => setFormData({ ...formData, propertyType: e.target.value })} className={inputClass} required>
              <option value="">اختر</option>
              <option value="villa">فيلا</option>
              <option value="apartment">شقة</option>
              <option value="townhouse">تاون هاوس</option>
              <option value="building">عمارة</option>
              <option value="land">أرض</option>
              <option value="shop">محل</option>
              <option value="office">مكتب</option>
              <option value="warehouse">مستودع</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <label className={labelClass}>الدولة *</label>
            <select
              onChange={(e) => onCountryChange(e.target.value, e.target.selectedOptions[0]?.text ?? '')}
              className={inputClass}
              required
              defaultValue=""
            >
              <option value="" disabled>اختر</option>
              {countries.map((c) => <option key={c.id} value={c.id}>{c.nameAr || c.nameEn || c.code}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>المنطقة *</label>
            <select
              onChange={(e) => onGovernorateChange(e.target.value, e.target.selectedOptions[0]?.text ?? '')}
              className={inputClass}
              required
              disabled={!governorates.length}
              defaultValue=""
            >
              <option value="" disabled>{governorates.length ? 'اختر' : 'اختر الدولة أولاً'}</option>
              {governorates.map((g) => <option key={g.id} value={g.id}>{g.nameAr || g.nameEn || g.code}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>المدينة *</label>
            <select
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              className={inputClass}
              required
              disabled={!cities.length}
            >
              <option value="">{cities.length ? 'اختر' : 'اختر المنطقة أولاً'}</option>
              {cities.map((c) => <option key={c.id} value={c.nameAr || c.nameEn || c.id}>{c.nameAr || c.nameEn || c.code}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>الحي</label>
            <input type="text" value={formData.district} onChange={(e) => setFormData({ ...formData, district: e.target.value })} className={inputClass} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <label className={labelClass}>الميزانية</label>
            <input type="number" value={formData.budget} onChange={(e) => setFormData({ ...formData, budget: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>المساحة (م²)</label>
            <input type="number" value={formData.area} onChange={(e) => setFormData({ ...formData, area: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>غرف النوم</label>
            <input type="number" value={formData.bedrooms} onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>الحمامات</label>
            <input type="number" value={formData.bathrooms} onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })} className={inputClass} />
          </div>
        </div>
        <div>
          <label className={labelClass}>وصف إضافي *</label>
          <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className={`${inputClass} h-24`} required minLength={10} />
        </div>
        <div className="flex gap-3">
          <button type="submit" disabled={loading} className="rounded-xl bg-[var(--color-primary)] px-6 py-2.5 text-sm font-bold text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50">
            {loading ? 'جاري الإرسال...' : 'إرسال الطلب'}
          </button>
          <button type="button" onClick={() => router.back()} className="rounded-xl border border-[var(--color-border)] px-6 py-2.5 text-sm font-bold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)]">إلغاء</button>
        </div>
      </form>
    </DashboardPageShell>
  );
}
