'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Save, MapPin, Home, Ruler, Bed, Bath, Tag, Image as ImageIcon, Upload } from 'lucide-react';
import Button from '@/src/components/ui/Button';
import Card from '@/src/components/ui/Card';
import { CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import GeoAddressPicker from '@/components/properties/GeoAddressPicker';
import { CURRENCY_REGISTRY } from '@/lib/market/currency-registry';
import { createPropertySchema } from '@/lib/validators/property-validators';
import { formatZodError, type ValidationError } from '@/lib/validation/formatZodError';
import { MAX_PROPERTY_IMAGES } from '@/lib/media/limits';

interface OfferType {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  allowDirect: boolean;
  allowAuction: boolean;
  allowFixedAuction: boolean;
  allowOpenAuction: boolean;
}

interface Offer {
  id?: string;
  offerTypeId: string;
  marketingMethod: 'direct' | 'auction';
  auctionType?: 'fixed' | 'open';
  price: number;
  currency: string;
  negotiable: boolean;
  isActive: boolean;
  details?: Record<string, unknown>;
}

interface MediaItem {
  url: string;
  type: 'image' | 'video';
  isFeatured?: boolean;
}

export interface PropertyFormData {
  id?: string;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  category: string;
  propertyType: string;
  country: string;
  governorate: string;
  city: string;
  district: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  area: number;
  bedrooms: number;
  bathrooms: number;
  floor: number;
  totalFloors: number;
  yearBuilt: number | null;
  facade: string;
  direction: string;
  referenceNumber: string;
  advertisingLicense: string;
  offers: Offer[];
  media: MediaItem[];
}

interface PropertyFormWithOffersProps {
  initialData?: PropertyFormData;
  propertyId?: string;
  onSuccess?: () => void;
  onValidationError?: (errors: ValidationError[]) => void;
  /** The page's "next" button validates the step it is leaving through this. */
  stepValidatorRef?: React.MutableRefObject<((step: number) => ValidationError[]) | null>;
}

const defaultOffer: Offer = {
  offerTypeId: '',
  marketingMethod: 'direct',
  price: 0,
  // No platform default: the publisher prices the offer in whichever
  // currency they choose (e.g. USD for Syria/Lebanon listings) — the
  // currency never gets converted or reinterpreted downstream.
  currency: '',
  negotiable: false,
  isActive: true,
};

const defaultFormData: PropertyFormData = {
  titleAr: '',
  titleEn: '',
  descriptionAr: '',
  descriptionEn: '',
  category: '',
  propertyType: '',
  // Canonical geo code from the /api/geo registry (Saudi Arabia as a default
  // suggestion only — every registry country is selectable).
  country: 'sa',
  governorate: '',
  city: '',
  district: '',
  address: '',
  latitude: null,
  longitude: null,
  area: 0,
  bedrooms: 0,
  bathrooms: 0,
  floor: 0,
  totalFloors: 0,
  yearBuilt: null,
  facade: '',
  direction: '',
  referenceNumber: '',
  advertisingLicense: '',
  offers: [{ ...defaultOffer }],
  media: [],
};

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

function mapInitialData(initialData?: PropertyFormData): PropertyFormData {
  if (!initialData) return { ...defaultFormData, offers: [{ ...defaultOffer }] };
  const offers: Offer[] = (initialData.offers && initialData.offers.length > 0
    ? initialData.offers
    : [{ ...defaultOffer }]
  ).map((o: Offer) => ({
    id: o.id,
    offerTypeId: o.offerTypeId || '',
    marketingMethod: o.marketingMethod === 'auction' ? 'auction' : 'direct',
    auctionType: o.auctionType as 'fixed' | 'open' | undefined,
    price: Number(o.price) || 0,
    currency: o.currency || '',
    negotiable: !!o.negotiable,
    isActive: o.isActive !== undefined ? !!o.isActive : true,
    details: o.details || {},
  }));
  const media: MediaItem[] = (initialData.media || []).map((m: MediaItem) => ({
    url: m.url,
    type: m.type === 'video' ? 'video' : 'image',
    isFeatured: !!m.isFeatured,
  }));
  return {
    ...defaultFormData,
    ...initialData,
    titleAr: initialData.titleAr || '',
    titleEn: initialData.titleEn || '',
    descriptionAr: initialData.descriptionAr || '',
    descriptionEn: initialData.descriptionEn || '',
    category: initialData.category || '',
    propertyType: initialData.propertyType || '',
    country: initialData.country || 'sa',
    governorate: initialData.governorate || '',
    city: initialData.city || '',
    district: initialData.district || '',
    address: initialData.address || '',
    latitude: initialData.latitude ?? null,
    longitude: initialData.longitude ?? null,
    area: Number(initialData.area) || 0,
    bedrooms: Number(initialData.bedrooms) || 0,
    bathrooms: Number(initialData.bathrooms) || 0,
    floor: Number(initialData.floor) || 0,
    totalFloors: Number(initialData.totalFloors) || 0,
    yearBuilt: initialData.yearBuilt ? Number(initialData.yearBuilt) : null,
    facade: initialData.facade || '',
    direction: initialData.direction || '',
    referenceNumber: initialData.referenceNumber || '',
    advertisingLicense: initialData.advertisingLicense || '',
    offers,
    media,
  };
}


/**
 * The wizard's error keys.
 *
 * The JSX reads `errors.titleAr` and `errors.offer_0_price`; the schema
 * reports `titleAr` and `offers.0.price`. This is the one place the two
 * spellings meet, so the field markup did not have to be rewritten.
 */
const OFFER_FIELD_KEY: Record<string, string> = {
  offerTypeId: 'type', price: 'price', currency: 'currency', auctionType: 'auction',
};

function errorKey(error: ValidationError): string {
  const parts = error.path.split('.');
  if (parts[0] === 'offers' && parts.length === 3) {
    const suffix = OFFER_FIELD_KEY[parts[2]] ?? parts[2];
    return `offer_${parts[1]}_${suffix}`;
  }
  return error.path;
}

/** Field key -> Arabic message, for the inputs; the list itself drives the summary. */
function toErrorMap(list: ValidationError[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const error of list) {
    const key = errorKey(error);
    if (!map[key]) map[key] = error.message;
    // `media.0.url` also marks the media section as a whole.
    if (error.path.startsWith('media')) map.media ??= error.message;
  }
  return map;
}

export function PropertyFormWithOffers({ initialData, propertyId, onSuccess, onValidationError, stepValidatorRef }: PropertyFormWithOffersProps) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [offerTypes, setOfferTypes] = useState<OfferType[]>([]);
  const [formData, setFormData] = useState<PropertyFormData>(() => mapInitialData(initialData));

  useEffect(() => {
    fetch('/api/offer-types')
      .then(res => res.json())
      .then(data => {
        if (data.success) setOfferTypes(data.data);
      })
      .catch(() => {});
  }, []);

  const addOffer = useCallback(() => {
    setFormData(prev => ({ ...prev, offers: [...prev.offers, { ...defaultOffer }] }));
  }, []);

  const removeOffer = useCallback((index: number) => {
    setFormData(prev => {
      if (prev.offers.length <= 1) return prev;
      return { ...prev, offers: prev.offers.filter((_, i) => i !== index) };
    });
  }, []);

  const updateOffer = useCallback(<K extends keyof Offer>(index: number, field: K, value: Offer[K]) => {
    setFormData(prev => ({
      ...prev,
      offers: prev.offers.map((offer, i) => {
        if (i !== index) return offer;
        const updated = { ...offer, [field]: value };
        if (field === 'marketingMethod' && value === 'direct') {
          updated.auctionType = undefined;
        }
        return updated;
      }),
    }));
  }, []);

  const handleChange = useCallback(<K extends keyof PropertyFormData>(field: K, value: PropertyFormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === 'category') {
      setFormData(prev => ({ ...prev, propertyType: '' }));
    }
  }, []);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const uploadImages = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingImage(true);
    try {
      const uploaded: Array<{ url: string; type: 'image' }> = [];
      // The shared cap, not an arbitrary ten: the office application enforces
      // the same number, so a listing cannot carry images on one side that the
      // other would refuse.
      const room = Math.max(0, MAX_PROPERTY_IMAGES - formData.media.filter((m) => m.url && m.type === 'image').length);
      for (const file of Array.from(files).slice(0, room)) {
        const body = new FormData();
        body.append('file', file);
        const response = await fetch('/api/properties/upload-image', { method: 'POST', body });
        const data = await response.json().catch(() => null);
        if (response.ok && data?.success && data.url) uploaded.push({ url: data.url, type: 'image' });
      }
      if (uploaded.length) {
        handleChange('media', [...formData.media.filter((m) => m.url), ...uploaded]);
      }
    } finally {
      setUploadingImage(false);
    }
  };


  /**
   * The request body, built the same way for a real submit and for the
   * per-step check — the same object the server validates, so a step can be
   * checked against the very rules that will judge it later.
   */
  const buildPayload = useCallback(() => {
    const primaryOffer = formData.offers.find(o => o.offerTypeId) || formData.offers[0];
    const primaryType = offerTypes.find(t => t.id === primaryOffer?.offerTypeId);
    const rentFamily = new Set(['RENT', 'TAQBEEL', 'USUFRUCT', 'LEASE_TO_OWN']);
    const dealType = primaryType && rentFamily.has(primaryType.code) ? 'rent' : 'sale';
    return {
      titleAr: formData.titleAr,
      titleEn: formData.titleEn,
      descriptionAr: formData.descriptionAr,
      descriptionEn: formData.descriptionEn,
      dealType,
      category: formData.category,
      propertyType: formData.propertyType,
      country: formData.country,
      governorate: formData.governorate,
      city: formData.city,
      district: formData.district,
      address: formData.address,
      latitude: formData.latitude,
      longitude: formData.longitude,
      price: primaryOffer?.price || 0,
      currency: primaryOffer?.currency || '',
      area: Number(formData.area),
      bedrooms: formData.bedrooms ? Number(formData.bedrooms) : undefined,
      bathrooms: formData.bathrooms ? Number(formData.bathrooms) : undefined,
      floor: formData.floor ? Number(formData.floor) : undefined,
      totalFloors: formData.totalFloors ? Number(formData.totalFloors) : undefined,
      yearBuilt: formData.yearBuilt ? Number(formData.yearBuilt) : undefined,
      facade: formData.facade,
      direction: formData.direction,
      referenceNumber: formData.referenceNumber,
      advertisingLicense: formData.advertisingLicense,
      // A row the user added and never filled is not an error — the server's
      // normaliser drops it too, so the two agree on what the listing holds.
      media: formData.media
        .filter((m) => m.url.trim())
        .map((m) => ({ url: m.url.trim(), type: m.type, isFeatured: m.isFeatured })),
      offers: formData.offers.map((offer) => ({
        id: offer.id,
        offerTypeId: offer.offerTypeId || undefined,
        marketingMethod: offer.marketingMethod,
        auctionType: offer.marketingMethod === 'auction' ? offer.auctionType : undefined,
        price: Number(offer.price),
        currency: offer.currency,
        negotiable: offer.negotiable,
        isActive: offer.isActive,
        details: offer.details,
      })),
    };
  }, [formData, offerTypes]);

  /**
   * The errors that belong to one step, judged by the shared schema.
   *
   * The whole payload is parsed and the issues are filtered by step, because a
   * step cannot be checked in isolation: `superRefine` on an offer compares two
   * of its fields, and `schema.pick` would drop that. Issues from steps the
   * user has not reached yet are simply not this step's business.
   */
  const validateStep = useCallback((step: number): ValidationError[] => {
    const result = createPropertySchema.safeParse(buildPayload());
    if (result.success) return [];
    return formatZodError(result.error).filter((issue) => issue.step === step);
  }, [buildPayload]);

  useEffect(() => {
    if (!stepValidatorRef) return;
    stepValidatorRef.current = validateStep;
    return () => { stepValidatorRef.current = null; };
  }, [stepValidatorRef, validateStep]);

  /** Show a list of errors and hand it to the wizard, which opens the right step. */
  const reportErrors = useCallback((list: ValidationError[]) => {
    setErrors(toErrorMap(list));
    onValidationError?.(list);
  }, [onValidationError]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      const payload = buildPayload();

      // The same schema the server runs, so the common case never needs a
      // round trip to be told the title is too short.
      const parsed = createPropertySchema.safeParse(payload);
      if (!parsed.success) {
        reportErrors(formatZodError(parsed.error));
        return;
      }

      const url = propertyId ? `/api/properties/${propertyId}` : '/api/properties';
      const method = propertyId ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        // A validation failure arrives per field, in Arabic, with its step.
        if (Array.isArray(data?.errors) && data.errors.length > 0) {
          reportErrors(data.errors as ValidationError[]);
        } else {
          setErrors({ general: data?.error || 'حدث خطأ' });
        }
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
  }, [buildPayload, propertyId, router, onSuccess, reportErrors]);

  const selectedType = (id: string) => offerTypes.find(t => t.id === id);

  const inputClass = "w-full px-4 py-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-border-focus)]/20 focus:border-[var(--color-border-focus)] transition shadow-sm hover:border-[var(--color-border-strong)]";
  const labelClass = "block text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)] mb-1.5";
  const selectClass = "w-full px-4 py-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-border-focus)]/20 focus:border-[var(--color-border-focus)] transition shadow-sm cursor-pointer hover:border-[var(--color-border-strong)]";

  return (
    <form id="property-form" onSubmit={handleSubmit} className="space-y-6">
      {errors.general && (
        <div className="p-4 rounded-xl bg-[var(--color-danger-soft)] border border-[var(--color-danger)] text-[var(--color-danger)] text-sm font-semibold flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-[var(--color-danger-soft)] flex items-center justify-center text-xs">!</span>
          {errors.general}
        </div>
      )}

      <Card id="step-basic" data-section="basic" data-step="1" className="rounded-2xl border-[var(--color-border)] shadow-sm hover:shadow-md transition">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b border-[var(--color-border)] rounded-t-2xl">
          <CardTitle className="flex items-center gap-2 text-[var(--color-text-primary)]">
            <span className="w-8 h-8 rounded-lg flex items-center justify-center text-white" style={{ background: 'var(--brand-gradient)' }}>
              <Home className="w-4 h-4" />
            </span>
            المعلومات الأساسية
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>العنوان (عربي) *</label>
              <input type="text" value={formData.titleAr} onChange={(e) => handleChange('titleAr', e.target.value)} className={selectClass} required />
              {errors.titleAr && <p className="text-[var(--color-danger)] text-xs mt-1">{errors.titleAr}</p>}
            </div>
            <div>
              <label className={labelClass}>العنوان (إنجليزي)</label>
              <input type="text" value={formData.titleEn} onChange={(e) => handleChange('titleEn', e.target.value)} className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>الفئة *</label>
              <select value={formData.category} onChange={(e) => handleChange('category', e.target.value)} className={selectClass} required>
                <option value="">اختر</option>
                {categories.map((c) => (<option key={c.value} value={c.value}>{c.label}</option>))}
              </select>
              {errors.category && <p className="text-[var(--color-danger)] text-xs mt-1">{errors.category}</p>}
            </div>
            <div>
              <label className={labelClass}>نوع العقار *</label>
              <select value={formData.propertyType} onChange={(e) => handleChange('propertyType', e.target.value)} className={selectClass} required disabled={!formData.category}>
                <option value="">اختر</option>
                {formData.category && propertyTypes[formData.category]?.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
              </select>
              {errors.propertyType && <p className="text-[var(--color-danger)] text-xs mt-1">{errors.propertyType}</p>}
            </div>
            <div>
              <label className={labelClass}>رقم مرجعي</label>
              <input type="text" value={formData.referenceNumber} onChange={(e) => handleChange('referenceNumber', e.target.value)} className={inputClass} />
            </div>
          </div>

          <div>
            <label className={labelClass}>الوصف (عربي) *</label>
            <textarea value={formData.descriptionAr} onChange={(e) => handleChange('descriptionAr', e.target.value)} className={`${inputClass} h-32`} required />
            {errors.descriptionAr && <p className="text-[var(--color-danger)] text-xs mt-1">{errors.descriptionAr}</p>}
          </div>

          <div>
            <label className={labelClass}>الوصف (إنجليزي)</label>
            <textarea value={formData.descriptionEn} onChange={(e) => handleChange('descriptionEn', e.target.value)} className={`${inputClass} h-32`} />
          </div>
        </CardContent>
      </Card>

      <Card id="step-location" data-section="location" data-step="2" className="rounded-2xl border-[var(--color-border)] shadow-sm hover:shadow-md transition">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b border-[var(--color-border)] rounded-t-2xl">
          <CardTitle className="flex items-center gap-2 text-[var(--color-text-primary)]">
            <span className="w-8 h-8 rounded-lg flex items-center justify-center text-white" style={{ background: 'var(--brand-gradient)' }}>
              <MapPin className="w-4 h-4" />
            </span>
            الموقع
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <GeoAddressPicker
            value={{
              country: formData.country,
              governorate: formData.governorate,
              city: formData.city,
              district: formData.district,
              latitude: formData.latitude,
              longitude: formData.longitude,
            }}
            onChange={(next) => {
              setFormData((prev) => ({
                ...prev,
                country: next.country,
                governorate: next.governorate,
                city: next.city,
                district: next.district,
                latitude: next.latitude,
                longitude: next.longitude,
              }));
            }}
            errors={{ country: errors.country, governorate: errors.governorate, city: errors.city }}
          />

          <div>
            <label className={labelClass}>العنوان التفصيلي</label>
            <input type="text" value={formData.address} onChange={(e) => handleChange('address', e.target.value)} className={inputClass} />
          </div>
        </CardContent>
      </Card>

      <Card id="step-specs" data-section="specs" data-step="3" className="rounded-2xl border-[var(--color-border)] shadow-sm hover:shadow-md transition">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b border-[var(--color-border)] rounded-t-2xl">
          <CardTitle className="flex items-center gap-2 text-[var(--color-text-primary)]">
            <span className="w-8 h-8 rounded-lg flex items-center justify-center text-white" style={{ background: 'var(--brand-gradient)' }}>
              <Ruler className="w-4 h-4" />
            </span>
            المواصفات
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>المساحة (م²) *</label>
              <input type="number" value={formData.area || ''} onChange={(e) => handleChange('area', parseFloat(e.target.value) || 0)} className={inputClass} required min="0" />
              {errors.area && <p className="text-[var(--color-danger)] text-xs mt-1">{errors.area}</p>}
            </div>
            <div>
              <label className={labelClass}>سنة البناء</label>
              <input type="number" value={formData.yearBuilt ?? ''} onChange={(e) => handleChange('yearBuilt', e.target.value ? parseInt(e.target.value) : null)} className={inputClass} min="1900" max={new Date().getFullYear()} />
            </div>
            <div>
              <label className={labelClass}>الواجهة</label>
              <input type="text" value={formData.facade} onChange={(e) => handleChange('facade', e.target.value)} className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className={labelClass}><Bed className="w-4 h-4 inline ml-1" />غرف النوم</label>
              <input type="number" value={formData.bedrooms || ''} onChange={(e) => handleChange('bedrooms', parseInt(e.target.value) || 0)} className={inputClass} min="0" />
            </div>
            <div>
              <label className={labelClass}><Bath className="w-4 h-4 inline ml-1" />دورات المياه</label>
              <input type="number" value={formData.bathrooms || ''} onChange={(e) => handleChange('bathrooms', parseInt(e.target.value) || 0)} className={inputClass} min="0" />
            </div>
            <div>
              <label className={labelClass}>الدور</label>
              <input type="number" value={formData.floor || ''} onChange={(e) => handleChange('floor', parseInt(e.target.value) || 0)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>عدد الأدوار</label>
              <input type="number" value={formData.totalFloors || ''} onChange={(e) => handleChange('totalFloors', parseInt(e.target.value) || 0)} className={inputClass} min="0" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>الاتجاه</label>
              <input type="text" value={formData.direction} onChange={(e) => handleChange('direction', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>رخصة الإعلان</label>
              <input type="text" value={formData.advertisingLicense} onChange={(e) => handleChange('advertisingLicense', e.target.value)} className={inputClass} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card id="step-offers" data-section="offers" data-step="4" className="rounded-2xl border-[var(--color-border)] shadow-sm hover:shadow-md transition">
        <CardHeader className="flex items-center justify-between bg-gradient-to-r from-slate-50 to-white border-b border-[var(--color-border)] rounded-t-2xl">
          <CardTitle className="flex items-center gap-2 text-[var(--color-text-primary)]">
            <span className="w-8 h-8 rounded-lg flex items-center justify-center text-white" style={{ background: 'var(--brand-gradient)' }}>
              <Tag className="w-4 h-4" />
            </span>
            أنواع العروض ({formData.offers.length})
          </CardTitle>
          <Button
            type="button"
            variant="secondary"
            onClick={addOffer}
            className="text-sm px-4 py-2 rounded-lg font-bold text-[var(--color-primary)] bg-[var(--color-primary-soft)] border border-[var(--color-border)] hover:bg-[var(--color-secondary-hover)] transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> إضافة عرض
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-[var(--color-text-muted)]">أضف نوع عرض واحد أو أكثر (بيع، إيجار، مزاد، تقبيل...). كل عرض له سعره وطريقة تسويقه الخاصة.</p>
          {formData.offers.map((offer, index) => {
            const type = selectedType(offer.offerTypeId);
            return (
              <div key={index} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[var(--color-text-secondary)]">العرض {index + 1}</span>
                  <button
                    type="button"
                    onClick={() => removeOffer(index)}
                    disabled={formData.offers.length <= 1}
                    className="text-[var(--color-danger)] hover:text-[var(--color-danger)] disabled:opacity-30"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>نوع العرض *</label>
                    <select
                      value={offer.offerTypeId}
                      onChange={(e) => updateOffer(index, 'offerTypeId', e.target.value)}
                      className={selectClass}
                    >
                      <option value="">اختر نوع العرض</option>
                      {offerTypes.map((t) => (
                        <option key={t.id} value={t.id}>{t.nameAr} ({t.nameEn})</option>
                      ))}
                    </select>
                    {errors[`offer_${index}_type`] && <p className="text-[var(--color-danger)] text-xs mt-1">{errors[`offer_${index}_type`]}</p>}
                  </div>
                  <div>
                    <label className={labelClass}>طريقة العرض *</label>
                    <select
                      value={offer.marketingMethod}
                      onChange={(e) => updateOffer(index, 'marketingMethod', e.target.value as 'direct' | 'auction')}
                      className={selectClass}
                    >
                      <option value="direct">مباشر</option>
                      <option value="auction" disabled={type ? !type.allowAuction : false}>مزاد</option>
                    </select>
                  </div>
                </div>

                {offer.marketingMethod === 'auction' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>نوع المزاد</label>
                      <select
                        value={offer.auctionType || ''}
                        onChange={(e) => updateOffer(index, 'auctionType', e.target.value as 'fixed' | 'open' | undefined)}
                        className={selectClass}
                      >
                        <option value="">اختر</option>
                        <option value="fixed" disabled={type ? !type.allowFixedAuction : false}>مزاد محدد</option>
                        <option value="open" disabled={type ? !type.allowOpenAuction : false}>مزاد مفتوح</option>
                      </select>
                    </div>
                    <div className="flex items-end pb-1 gap-4">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={offer.negotiable}
                          onChange={(e) => updateOffer(index, 'negotiable', e.target.checked)}
                          className="w-4 h-4"
                        />
                        قابل للتفاوض
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={offer.isActive}
                          onChange={(e) => updateOffer(index, 'isActive', e.target.checked)}
                          className="w-4 h-4"
                        />
                        نشط
                      </label>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className={labelClass}>السعر *</label>
                    <input
                      type="number"
                      value={offer.price || ''}
                      onChange={(e) => updateOffer(index, 'price', parseFloat(e.target.value) || 0)}
                      className={inputClass}
                      min="0"
                      required
                    />
                    {errors[`offer_${index}_price`] && <p className="text-[var(--color-danger)] text-xs mt-1">{errors[`offer_${index}_price`]}</p>}
                  </div>
                  <div>
                    <label className={labelClass}>العملة *</label>
                    <select
                      value={offer.currency}
                      onChange={(e) => updateOffer(index, 'currency', e.target.value)}
                      className={selectClass}
                      required
                    >
                      <option value="" disabled>اختر العملة</option>
                      {CURRENCY_REGISTRY.map((c) => (<option key={c.code} value={c.code}>{`${c.nameAr} — ${c.code}`}</option>))}
                    </select>
                    {errors[`offer_${index}_currency`] && <p className="text-[var(--color-danger)] text-xs mt-1">{errors[`offer_${index}_currency`]}</p>}
                  </div>
                  <div className="flex items-end">
                    {offer.marketingMethod === 'direct' && (
                      <label className="flex items-center gap-2 text-sm pb-2">
                        <input
                          type="checkbox"
                          checked={offer.negotiable}
                          onChange={(e) => updateOffer(index, 'negotiable', e.target.checked)}
                          className="w-4 h-4"
                        />
                        قابل للتفاوض
                      </label>
                    )}
                  </div>
                </div>

                {offer.marketingMethod === 'direct' && (
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={offer.isActive}
                        onChange={(e) => updateOffer(index, 'isActive', e.target.checked)}
                        className="w-4 h-4"
                      />
                      نشط
                    </label>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card id="step-media" data-section="media" data-step="5" className="rounded-2xl border-[var(--color-border)] shadow-sm hover:shadow-md transition">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b border-[var(--color-border)] rounded-t-2xl">
          <CardTitle className="flex items-center gap-2 text-[var(--color-text-primary)]">
            <span className="w-8 h-8 rounded-lg flex items-center justify-center text-white" style={{ background: 'var(--brand-gradient)' }}>
              <ImageIcon className="w-4 h-4" />
            </span>
            الصور والوسائط
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {formData.media.length > 0 && (
            <p className="text-xs text-[var(--color-text-muted)]">الصورة الأولى هي صورة الغلاف. رتب الروابط حسب الأهمية.</p>
          )}
          {formData.media.map((media, index) => (
            <div key={index} className="flex gap-2 items-center">
              {media.type === 'image' && media.url ? (
                // eslint-disable-next-line @next/next/no-img-element -- preview of a runtime-managed URL
                <img src={media.url} alt="" width={56} height={40} loading="lazy" decoding="async" className="h-10 w-14 shrink-0 rounded-lg object-cover bg-[var(--color-surface-muted)] border border-[var(--color-border)]" onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }} />
              ) : (
                <span className="h-10 w-14 shrink-0 rounded-lg bg-[var(--color-surface-muted)] border border-[var(--color-border)] flex items-center justify-center text-[10px] font-bold text-[var(--color-text-muted)]">{media.type === 'video' ? 'فيديو' : '—'}</span>
              )}
              {index === 0 && <span className="shrink-0 rounded-full bg-[var(--color-primary-soft)] border border-[var(--color-border)] px-2 py-0.5 text-[10px] font-black text-[var(--color-primary)]">غلاف</span>}
              <input
                type="text"
                value={media.url}
                onChange={(e) => handleChange('media', formData.media.map((m, i) => i === index ? { ...m, url: e.target.value } : m))}
                placeholder="رابط الصورة أو الفيديو"
                className={inputClass}
                dir="ltr"
              />
              <select
                value={media.type}
                onChange={(e) => handleChange('media', formData.media.map((m, i) => i === index ? { ...m, type: e.target.value as 'image' | 'video' } : m))}
                className={selectClass}
              >
                <option value="image">صورة</option>
                <option value="video">فيديو</option>
              </select>
              <button
                type="button"
                onClick={() => handleChange('media', formData.media.filter((_, i) => i !== index))}
                className="text-[var(--color-danger)] hover:text-[var(--color-danger)]"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <Button
            type="button"
            variant="secondary"
            onClick={() => handleChange('media', [...formData.media, { url: '', type: 'image' as const }])}
            className="text-sm px-4 py-2 rounded-lg font-bold text-[var(--color-primary)] bg-[var(--color-primary-soft)] border border-[var(--color-border)] hover:bg-[var(--color-secondary-hover)] transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> إضافة وسيط
          </Button>
          <input ref={uploadInputRef} type="file" accept="image/png,image/jpeg,image/webp" multiple hidden onChange={(e) => { void uploadImages(e.target.files); e.currentTarget.value = ''; }} />
          <Button
            type="button"
            variant="secondary"
            disabled={uploadingImage}
            onClick={() => uploadInputRef.current?.click()}
            className="text-sm px-4 py-2 rounded-lg font-bold text-[var(--color-success)] bg-[var(--color-success-soft)] border border-[var(--color-success)] hover:bg-[var(--color-success-soft)] transition flex items-center gap-1.5 disabled:opacity-60"
          >
            <Upload className="w-4 h-4" /> {uploadingImage ? 'جارٍ الرفع...' : 'رفع صور من جهازك'}
          </Button>
          <p className="text-[11px] text-[var(--color-text-muted)]">تُحوَّل الصور تلقائيًا إلى WebP بمقاس موحد لسرعة التصفح.</p>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row gap-3 pt-4" data-step="5">
        <Button
          type="submit"
          disabled={loading}
          className="flex items-center justify-center gap-2 px-8 py-3 rounded-xl font-bold text-white shadow-lg hover:shadow-xl transition"
          style={{ background: 'var(--brand-gradient)' }}
        >
          <Save className="w-4 h-4" />
          {loading ? 'جاري الحفظ...' : propertyId ? 'تحديث العقار' : 'نشر العقار'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.back()}
          className="px-6 py-3 rounded-xl font-bold text-[var(--color-text-secondary)] bg-[var(--color-surface)] border border-[var(--color-border)] hover:bg-[var(--color-surface-muted)] transition"
        >
          إلغاء
        </Button>
      </div>
    </form>
  );
}
