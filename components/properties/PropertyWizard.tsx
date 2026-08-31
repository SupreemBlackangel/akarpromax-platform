'use client';
import { useState } from 'react';
import { PropertyForm } from './PropertyForm';

interface PropertyWizardMediaItem {
  url: string;
  type: string;
  altText?: string;
}

interface PropertyWizardFormData {
  category: string;
  propertyType: string;
  dealType: string;
  country: string;
  governorate: string;
  city: string;
  district: string;
  area: string;
  bedrooms: string;
  bathrooms: string;
  floor: string;
  totalFloors: string;
  yearBuilt: string;
  facade: string;
  direction: string;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  price: string;
  currency: string;
  referenceNumber: string;
  advertisingLicense: string;
  media: PropertyWizardMediaItem[];
}

interface PropertyWizardProps {
  onSuccess?: () => void;
  propertyId?: string;
  initialData?: Partial<PropertyWizardFormData>;
}

const STEPS = [
  { label: 'النوع والموقع', key: 'location' },
  { label: 'المواصفات', key: 'specs' },
  { label: 'التفاصيل', key: 'details' },
  { label: 'الوسائط', key: 'media' },
  { label: 'المراجعة', key: 'review' },
];

const INITIAL_FORM: PropertyWizardFormData = {
  category: '',
  propertyType: '',
  dealType: '',
  country: 'السعودية',
  governorate: '',
  city: '',
  district: '',
  area: '',
  bedrooms: '',
  bathrooms: '',
  floor: '',
  totalFloors: '',
  yearBuilt: '',
  facade: '',
  direction: '',
  titleAr: '',
  titleEn: '',
  descriptionAr: '',
  descriptionEn: '',
  price: '',
  currency: 'SAR',
  referenceNumber: '',
  advertisingLicense: '',
  media: [] as Array<{ url: string; type: string; altText?: string }>,
};

const CATEGORIES = [
  { value: 'residential', label: 'سكني' },
  { value: 'commercial', label: 'تجاري' },
  { value: 'industrial', label: 'صناعي' },
  { value: 'land', label: 'أرض' },
  { value: 'agricultural', label: 'زراعي' },
];

const PROPERTY_TYPES: Record<string, Array<{ value: string; label: string }>> = {
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
  land: [{ value: 'land', label: 'أرض' }],
  agricultural: [{ value: 'farm', label: 'مزرعة' }],
};

const GOVERNORATES = ['الرياض', 'مكة المكرمة', 'المدينة المنورة', 'الشرقية', 'عسير', 'تبوك', 'حائل', 'الحدود الشمالية', 'جازان', 'نجران', 'الباحة', 'الجوف', 'القصيم'];

const CITIES: Record<string, string[]> = {
  'الرياض': ['الرياض', 'الخرج', 'الدوادمي', 'المجمعة', 'القويعية'],
  'مكة المكرمة': ['مكة المكرمة', 'جدة', 'الطائف', 'القنذة', 'رابغ'],
  'المدينة المنورة': ['المدينة المنورة', 'ينبع', 'العلا', 'مهد الذهب'],
  'الشرقية': ['الدمام', 'الخبر', 'الظهران', 'القطيف', 'الأحساء', 'الجبيل'],
  'عسير': ['أبها', 'خميس مشيط', 'بيشة', 'النماص'],
  'تبوك': ['تبوك', 'ضباء', 'الوجه'],
};

export function PropertyWizard({ onSuccess, propertyId, initialData }: PropertyWizardProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<PropertyWizardFormData>({
    ...INITIAL_FORM,
    ...initialData,
  });

  const updateField = <K extends keyof PropertyWizardFormData>(field: K, value: PropertyWizardFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (field === 'category') setFormData((prev) => ({ ...prev, propertyType: '' }));
    if (field === 'governorate') setFormData((prev) => ({ ...prev, city: '' }));
  };

  const isStepValid = () => {
    switch (step) {
      case 1:
        return formData.category && formData.propertyType && formData.dealType && formData.governorate && formData.city;
      case 2:
        return formData.area;
      case 3:
        return formData.titleAr && formData.descriptionAr && formData.price;
      case 4:
        return true;
      case 5:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (step < 5 && isStepValid()) setStep(step + 1);
  };

  const handlePrev = () => {
    if (step > 1) setStep(step - 1);
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">نوع العقار والموقع</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">الفئة *</label>
                <select value={formData.category} onChange={(e) => updateField('category', e.target.value)} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500" required>
                  <option value="">اختر</option>
                  {CATEGORIES.map((c) => (<option key={c.value} value={c.value}>{c.label}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">نوع العقار *</label>
                <select value={formData.propertyType} onChange={(e) => updateField('propertyType', e.target.value)} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500" required disabled={!formData.category}>
                  <option value="">اختر</option>
                  {formData.category && PROPERTY_TYPES[formData.category]?.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">نوع الصفقة *</label>
                <select value={formData.dealType} onChange={(e) => updateField('dealType', e.target.value)} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500" required>
                  <option value="">اختر</option>
                  <option value="sale">للبيع</option>
                  <option value="rent">للإيجار</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">الدولة *</label>
                <input type="text" value={formData.country} onChange={(e) => updateField('country', e.target.value)} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">المنطقة *</label>
                <select value={formData.governorate} onChange={(e) => updateField('governorate', e.target.value)} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500" required>
                  <option value="">اختر</option>
                  {GOVERNORATES.map((g) => (<option key={g} value={g}>{g}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">المدينة *</label>
                <select value={formData.city} onChange={(e) => updateField('city', e.target.value)} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500" required disabled={!formData.governorate}>
                  <option value="">اختر</option>
                  {formData.governorate && CITIES[formData.governorate]?.map((c) => (<option key={c} value={c}>{c}</option>))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">الحي</label>
                <input type="text" value={formData.district} onChange={(e) => updateField('district', e.target.value)} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">مواصفات العقار</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">المساحة (م²) *</label>
                <input type="number" value={formData.area} onChange={(e) => updateField('area', e.target.value)} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500" required min="0" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">غرف النوم</label>
                <input type="number" value={formData.bedrooms} onChange={(e) => updateField('bedrooms', e.target.value)} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500" min="0" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">دورات المياه</label>
                <input type="number" value={formData.bathrooms} onChange={(e) => updateField('bathrooms', e.target.value)} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500" min="0" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">الدور</label>
                <input type="number" value={formData.floor} onChange={(e) => updateField('floor', e.target.value)} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">عدد الأدوار</label>
                <input type="number" value={formData.totalFloors} onChange={(e) => updateField('totalFloors', e.target.value)} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500" min="0" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">سنة البناء</label>
                <input type="number" value={formData.yearBuilt} onChange={(e) => updateField('yearBuilt', e.target.value)} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500" min="1900" max={new Date().getFullYear()} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">الواجهة</label>
                <input type="text" value={formData.facade} onChange={(e) => updateField('facade', e.target.value)} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">الاتجاه</label>
                <input type="text" value={formData.direction} onChange={(e) => updateField('direction', e.target.value)} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">تفاصيل العقار</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">العنوان (عربي) *</label>
                <input type="text" value={formData.titleAr} onChange={(e) => updateField('titleAr', e.target.value)} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">العنوان (إنجليزي)</label>
                <input type="text" value={formData.titleEn} onChange={(e) => updateField('titleEn', e.target.value)} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">السعر *</label>
                <input type="number" value={formData.price} onChange={(e) => updateField('price', e.target.value)} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500" required min="0" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">العملة</label>
                <select value={formData.currency} onChange={(e) => updateField('currency', e.target.value)} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500">
                  <option value="SAR">ريال سعودي</option>
                  <option value="USD">دولار أمريكي</option>
                  <option value="EUR">يورو</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">الوصف (عربي) *</label>
              <textarea value={formData.descriptionAr} onChange={(e) => updateField('descriptionAr', e.target.value)} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 h-32" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">الوصف (إنجليزي)</label>
              <textarea value={formData.descriptionEn} onChange={(e) => updateField('descriptionEn', e.target.value)} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 h-32" />
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">وسائط العقار</h2>
            <p className="text-gray-600">ارفع صور وفيديو للعقار</p>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <p className="text-gray-500">اسحب الملفات هنا أو اضغط للاختيار</p>
              <p className="text-sm text-gray-400 mt-2">الصيغ المدعومة: JPG, PNG, WEBP, MP4</p>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">مراجعة ونشر</h2>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
              <p><span className="font-medium">الفئة:</span> {CATEGORIES.find((c) => c.value === formData.category)?.label}</p>
              <p><span className="font-medium">النوع:</span> {PROPERTY_TYPES[formData.category]?.find((t) => t.value === formData.propertyType)?.label}</p>
              <p><span className="font-medium">الصفقة:</span> {formData.dealType === 'sale' ? 'للبيع' : formData.dealType === 'rent' ? 'للإيجار' : 'بيع وإيجار'}</p>
              <p><span className="font-medium">الموقع:</span> {formData.city}، {formData.governorate}، {formData.country}</p>
              <p><span className="font-medium">المساحة:</span> {formData.area} م²</p>
              <p><span className="font-medium">السعر:</span> {parseFloat(formData.price || '0').toLocaleString()} {formData.currency}</p>
              <p><span className="font-medium">العنوان:</span> {formData.titleAr}</p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        {STEPS.map(({ label }, index) => (
          <div key={index} className="flex items-center flex-col flex-1">
            <div className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  index + 1 <= step ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                }`}
              >
                {index + 1}
              </div>
              {index < STEPS.length - 1 && (
                <div className={`w-8 sm:w-16 h-0.5 mx-2 ${index + 1 < step ? 'bg-blue-600' : 'bg-gray-200'}`} />
              )}
            </div>
            <p className="text-xs mt-1 text-gray-500">{label}</p>
          </div>
        ))}
      </div>

      <div className="min-h-[300px]">{renderStep()}</div>

      <div className="flex justify-between mt-8 pt-4 border-t">
        <button
          onClick={handlePrev}
          disabled={step === 1}
          className="px-6 py-2 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
        >
          السابق
        </button>
        {step === 5 ? (
          <PropertyForm
            initialData={formData}
            propertyId={propertyId}
            onSuccess={onSuccess}
          />
        ) : (
          <button
            onClick={handleNext}
            disabled={!isStepValid()}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            التالي
          </button>
        )}
      </div>
    </div>
  );
}
