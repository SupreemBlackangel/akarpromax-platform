'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface PropertyFormMediaItem {
  url: string;
  type: string;
  altText?: string;
}

interface PropertyFormInitialData {
  titleAr?: string;
  titleEn?: string;
  descriptionAr?: string;
  descriptionEn?: string;
  dealType?: string;
  category?: string;
  propertyType?: string;
  country?: string;
  governorate?: string;
  city?: string;
  district?: string;
  address?: string;
  price?: string | number;
  currency?: string;
  area?: string | number;
  bedrooms?: string | number;
  bathrooms?: string | number;
  floor?: string | number;
  totalFloors?: string | number;
  yearBuilt?: string | number;
  facade?: string;
  direction?: string;
  referenceNumber?: string;
  advertisingLicense?: string;
  officeId?: string;
  media?: PropertyFormMediaItem[];
}

interface PropertyFormProps {
  initialData?: PropertyFormInitialData;
  propertyId?: string;
  onSuccess?: () => void;
}

export function PropertyForm({ initialData, propertyId, onSuccess }: PropertyFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    titleAr: initialData?.titleAr || '',
    titleEn: initialData?.titleEn || '',
    descriptionAr: initialData?.descriptionAr || '',
    descriptionEn: initialData?.descriptionEn || '',
    dealType: initialData?.dealType || '',
    category: initialData?.category || '',
    propertyType: initialData?.propertyType || '',
    country: initialData?.country || 'السعودية',
    governorate: initialData?.governorate || '',
    city: initialData?.city || '',
    district: initialData?.district || '',
    address: initialData?.address || '',
    price: initialData?.price || '',
    currency: initialData?.currency || 'SAR',
    area: initialData?.area || '',
    bedrooms: initialData?.bedrooms || '',
    bathrooms: initialData?.bathrooms || '',
    floor: initialData?.floor || '',
    totalFloors: initialData?.totalFloors || '',
    yearBuilt: initialData?.yearBuilt || '',
    facade: initialData?.facade || '',
    direction: initialData?.direction || '',
    referenceNumber: initialData?.referenceNumber || '',
    advertisingLicense: initialData?.advertisingLicense || '',
    officeId: initialData?.officeId || '',
    media: initialData?.media || [],
  });

  const dealTypes = [
    { value: 'sale', label: 'للبيع' },
    { value: 'rent', label: 'للإيجار' },
    { value: 'both', label: 'بيع وإيجار' },
  ];

  const categories = [
    { value: 'residential', label: 'سكني' },
    { value: 'commercial', label: 'تجاري' },
    { value: 'industrial', label: 'صناعي' },
    { value: 'land', label: 'أرض' },
    { value: 'agricultural', label: 'زراعي' },
  ];

  const propertyTypes: Record<string, Array<{ value: string; label: string }>> = {
    residential: [
      { value: 'villa', label: 'فيلا' },
      { value: 'apartment', label: 'شقة' },
      { value: 'townhouse', label: 'تاون هاوس' },
      { value: 'duplex', label: 'دوبلكس' },
      { value: 'penthouse', label: 'بنتهاوس' },
    ],
    commercial: [
      { value: 'shop', label: 'محل' },
      { value: 'office', label: 'مكتب' },
      { value: 'building', label: 'مبنى' },
      { value: 'warehouse', label: 'مستودع' },
    ],
    industrial: [
      { value: 'factory', label: 'مصنع' },
      { value: 'warehouse', label: 'مستودع' },
    ],
    land: [
      { value: 'land', label: 'أرض' },
      { value: 'farm', label: 'مزرعة' },
    ],
    agricultural: [
      { value: 'farm', label: 'مزرعة' },
    ],
  };

  const governorates = ['الرياض', 'مكة المكرمة', 'المدينة المنورة', 'الشرقية', 'عسير', 'تبوك', 'حائل', 'الحدود الشمالية', 'جازان', 'نجران', 'الباحة', 'الجوف', 'القصيم'];
  const cities: Record<string, string[]> = {
    'الرياض': ['الرياض', 'الخرج', 'الدوادمي', 'المجمعة', 'القويعية'],
    'مكة المكرمة': ['مكة المكرمة', 'جدة', 'الطائف', 'القنفذة', 'رابغ'],
    'المدينة المنورة': ['المدينة المنورة', 'ينبع', 'العلا', 'مهد الذهب'],
    'الشرقية': ['الدمام', 'الخبر', 'الظهران', 'القطيف', 'الأحساء', 'الجبيل'],
    'عسير': ['أبها', 'خميس مشيط', 'بيشة', 'النماص'],
    'تبوك': ['تبوك', 'ضباء', 'الوجه'],
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      const url = propertyId ? `/api/properties/${propertyId}` : '/api/properties';
      const method = propertyId ? 'PATCH' : 'POST';
      const payload = {
        ...formData,
        price: parseFloat(formData.price as string),
        area: parseFloat(formData.area as string),
        bedrooms: formData.bedrooms ? parseInt(formData.bedrooms as string) : undefined,
        bathrooms: formData.bathrooms ? parseInt(formData.bathrooms as string) : undefined,
        floor: formData.floor ? parseInt(formData.floor as string) : undefined,
        totalFloors: formData.totalFloors ? parseInt(formData.totalFloors as string) : undefined,
        yearBuilt: formData.yearBuilt ? parseInt(formData.yearBuilt as string) : undefined,
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrors({ general: data.error || 'حدث خطأ' });
        return;
      }

      if (onSuccess) {
        onSuccess();
      } else {
        router.push('/dashboard/properties');
      }
    } catch {
      setErrors({ general: 'فشل في الاتصال بالخادم' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === 'category') {
      setFormData(prev => ({ ...prev, propertyType: '' }));
    }
    if (field === 'governorate') {
      setFormData(prev => ({ ...prev, city: '' }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errors.general && (
        <div className="p-3 bg-red-100 text-red-700 rounded">{errors.general}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">العنوان (عربي) *</label>
          <input type="text" value={formData.titleAr} onChange={(e) => handleChange('titleAr', e.target.value)} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500" required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">العنوان (إنجليزي)</label>
          <input type="text" value={formData.titleEn} onChange={(e) => handleChange('titleEn', e.target.value)} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">نوع الصفقة *</label>
          <select value={formData.dealType} onChange={(e) => handleChange('dealType', e.target.value)} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500" required>
            <option value="">اختر</option>
            {dealTypes.map((d) => (<option key={d.value} value={d.value}>{d.label}</option>))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">الفئة *</label>
          <select value={formData.category} onChange={(e) => handleChange('category', e.target.value)} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500" required>
            <option value="">اختر</option>
            {categories.map((c) => (<option key={c.value} value={c.value}>{c.label}</option>))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">نوع العقار *</label>
          <select value={formData.propertyType} onChange={(e) => handleChange('propertyType', e.target.value)} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500" required disabled={!formData.category}>
            <option value="">اختر</option>
            {formData.category && propertyTypes[formData.category]?.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">الدولة *</label>
          <input type="text" value={formData.country} onChange={(e) => handleChange('country', e.target.value)} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500" required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">المنطقة *</label>
          <select value={formData.governorate} onChange={(e) => handleChange('governorate', e.target.value)} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500" required>
            <option value="">اختر</option>
            {governorates.map((g) => (<option key={g} value={g}>{g}</option>))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">المدينة *</label>
          <select value={formData.city} onChange={(e) => handleChange('city', e.target.value)} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500" required disabled={!formData.governorate}>
            <option value="">اختر</option>
            {formData.governorate && cities[formData.governorate]?.map((c) => (<option key={c} value={c}>{c}</option>))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">الحي</label>
          <input type="text" value={formData.district} onChange={(e) => handleChange('district', e.target.value)} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">العنوان التفصيلي</label>
          <input type="text" value={formData.address} onChange={(e) => handleChange('address', e.target.value)} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">السعر *</label>
          <input type="number" value={formData.price} onChange={(e) => handleChange('price', e.target.value)} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500" required min="0" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">العملة</label>
          <select value={formData.currency} onChange={(e) => handleChange('currency', e.target.value)} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500">
            <option value="SAR">ريال سعودي</option>
            <option value="USD">دولار أمريكي</option>
            <option value="EUR">يورو</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">المساحة (م²) *</label>
          <input type="number" value={formData.area} onChange={(e) => handleChange('area', e.target.value)} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500" required min="0" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">غرف النوم</label>
          <input type="number" value={formData.bedrooms} onChange={(e) => handleChange('bedrooms', e.target.value)} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500" min="0" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">دورات المياه</label>
          <input type="number" value={formData.bathrooms} onChange={(e) => handleChange('bathrooms', e.target.value)} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500" min="0" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">الدور</label>
          <input type="number" value={formData.floor} onChange={(e) => handleChange('floor', e.target.value)} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">عدد الأدوار</label>
          <input type="number" value={formData.totalFloors} onChange={(e) => handleChange('totalFloors', e.target.value)} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500" min="0" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">سنة البناء</label>
          <input type="number" value={formData.yearBuilt} onChange={(e) => handleChange('yearBuilt', e.target.value)} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500" min="1900" max={new Date().getFullYear()} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">الواجهة</label>
          <input type="text" value={formData.facade} onChange={(e) => handleChange('facade', e.target.value)} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">الاتجاه</label>
          <input type="text" value={formData.direction} onChange={(e) => handleChange('direction', e.target.value)} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">الوصف (عربي) *</label>
        <textarea value={formData.descriptionAr} onChange={(e) => handleChange('descriptionAr', e.target.value)} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 h-32" required />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">الوصف (إنجليزي)</label>
        <textarea value={formData.descriptionEn} onChange={(e) => handleChange('descriptionEn', e.target.value)} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 h-32" />
      </div>

      <div className="flex gap-4">
        <button type="submit" disabled={loading} className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
          {loading ? 'جاري الحفظ...' : propertyId ? 'تحديث العقار' : 'نشر العقار'}
        </button>
        <button type="button" onClick={() => router.back()} className="px-6 py-2 bg-gray-200 rounded hover:bg-gray-300">
          إلغاء
        </button>
      </div>
    </form>
  );
}
