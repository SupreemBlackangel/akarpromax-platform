'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Clock, ShieldCheck, AlertTriangle } from 'lucide-react';

import Button from '@/src/components/ui/Button';
import Card, { CardContent } from '@/src/components/ui/Card';

interface PropertyOption {
  id: string;
  titleAr: string;
  officeId?: string | null;
}

interface OrganizerOption {
  id: string;
  nameAr: string | null;
  nameEn: string | null;
  type: string;
  verifiedAt: string | null;
  role: string;
}

export default function NewAuctionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [organizers, setOrganizers] = useState<OrganizerOption[]>([]);
  const [formData, setFormData] = useState({
    propertyId: '',
    type: 'fixed',
    organizerOrganizationId: '',
    startingPrice: '',
    bidIncrement: '100',
    minBid: '',
    maxBid: '',
    endDate: '',
    acceptSellerTerms: false,
  });

  useEffect(() => {
    Promise.all([
      fetch('/api/properties?mine=1&status=approved&limit=100').then((res) => res.json()),
      fetch('/api/auctions/organizers').then((res) => res.json()),
    ])
      .then(([propertyData, organizerData]) => {
        if (propertyData.success) setProperties(propertyData.data ?? []);
        if (organizerData.success) setOrganizers(organizerData.data ?? []);
      })
      .catch(() => setError('تعذر تحميل بيانات إنشاء المزاد'));
  }, []);

  const selectedOrganizer = useMemo(
    () => organizers.find((item) => item.id === formData.organizerOrganizationId),
    [organizers, formData.organizerOrganizationId],
  );

  const isFixed = formData.type === 'fixed';

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auctions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId: formData.propertyId,
          type: formData.type,
          organizerOrganizationId: isFixed ? formData.organizerOrganizationId : null,
          startingPrice: Number(formData.startingPrice),
          bidIncrement: Number(formData.bidIncrement),
          minBid: formData.minBid ? Number(formData.minBid) : null,
          maxBid: formData.maxBid ? Number(formData.maxBid) : null,
          endDate: null,
          acceptSellerTerms: formData.acceptSellerTerms,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'فشل في إنشاء المزاد');
        return;
      }

      router.push('/dashboard/auctions');
    } catch {
      setError('فشل الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen" dir="rtl">
      {/* Gradient Header */}
      <div
        className="text-white px-6 pt-8 pb-12"
        style={{ background: 'var(--brand-gradient)' }}
      >
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <Link href="/dashboard/auctions" className="text-white/70 hover:text-white text-sm transition">
              مزاداتي
            </Link>
            <span className="text-white/40">←</span>
            <span className="text-sm font-semibold">إنشاء مزاد جديد</span>
          </div>
          <h1 className="text-3xl font-black mb-2">إنشاء مزاد عقاري</h1>
          <p className="text-white/80 text-sm">
            أطلق مزاداً على عقارك المعتمد — مغلق أو مفتوح
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 -mt-6 pb-12 space-y-6">
        {/* Duration Notice for Fixed */}
        {isFixed && (
          <div className="bg-[var(--color-primary-soft)] border border-[var(--color-primary)]/30 rounded-2xl p-5 flex items-start gap-4 shadow-sm">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--brand-gradient)' }}>
              <Clock className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-bold text-[--brand-navy] text-sm">مدة المزاد المغلق: 72 ساعة بالضبط</p>
              <p className="text-xs text-gray-600 mt-1">
                العدّاد يبدأ من لحظة تفعيل البائع للشروط. لا يمكن تعديل المدة.
              </p>
            </div>
          </div>
        )}

        {/* Organizer Notice */}
        {isFixed && organizers.length === 0 && (
          <div className="bg-[var(--accent-soft)] border border-amber-200 rounded-2xl p-5 flex items-start gap-4">
            <AlertTriangle className="w-5 h-5 text-[var(--accent)] mt-0.5" />
            <div>
              <p className="font-bold text-[var(--accent)] text-sm">لا توجد جهات منظمة متاحة</p>
              <p className="text-xs text-[var(--accent)] mt-1">
                المزاد المغلق يتطلب جهة منظمة (مكتب عقاري أو محاماة) حاصلة على صلاحية من الإدارة. تواصل مع الدعم.
              </p>
            </div>
          </div>
        )}

        <Card className="shadow-lg border-0">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Property Selection */}
              <div>
                <label className="mb-1.5 block text-sm font-bold text-gray-700">العقار *</label>
                <select
                  value={formData.propertyId}
                  onChange={(event) => setFormData({ ...formData, propertyId: event.target.value })}
                  className="w-full rounded-xl border-gray-200 border p-3.5 bg-gray-50 focus:bg-[var(--color-surface)] focus:border-blue-400 transition text-sm"
                  required
                >
                  <option value="">اختر عقاراً معتمداً من عقاراتك</option>
                  {properties.map((property) => (
                    <option key={property.id} value={property.id}>{property.titleAr}</option>
                  ))}
                </select>
                {properties.length === 0 && (
                  <p className="mt-1.5 text-xs text-gray-400">يجب اعتماد العقار أولاً من قبل الإدارة قبل إنشاء المزاد عليه.</p>
                )}
              </div>

              {/* Auction Type */}
              <div>
                <label className="mb-1.5 block text-sm font-bold text-gray-700">نوع المزاد *</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'fixed', label: 'مزاد مغلق', desc: '72 ساعة — جهات مصرّح لها فقط', icon: '🔒' },
                    { value: 'open', label: 'مزاد مفتوح', desc: 'حتى 60 يوم — المالك فقط', icon: '🌐' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, type: opt.value, organizerOrganizationId: '' })}
                      className={`rounded-xl border-2 p-4 text-right transition-all ${
                        formData.type === opt.value
                          ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)] shadow-md'
                          : 'border-gray-200 hover:border-gray-300 bg-[var(--color-surface)]'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl">{opt.icon}</span>
                        <span className="font-bold text-sm">{opt.label}</span>
                      </div>
                      <p className="text-xs text-gray-500">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Organizer (fixed only) */}
              {isFixed && (
                <div>
                  <label className="mb-1.5 block text-sm font-bold text-gray-700">
                    الجهة المنظمة المصرّحة *
                  </label>
                  <select
                    value={formData.organizerOrganizationId}
                    onChange={(event) => setFormData({ ...formData, organizerOrganizationId: event.target.value })}
                    className="w-full rounded-xl border-gray-200 border p-3.5 bg-gray-50 focus:bg-[var(--color-surface)] focus:border-blue-400 transition text-sm"
                    required
                  >
                    <option value="">اختر جهة منظمة</option>
                    {organizers.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.nameAr || org.nameEn || org.id} — {org.type === 'law_office' ? 'مكتب محاماة' : 'مكتب عقاري'}
                      </option>
                    ))}
                  </select>
                  {selectedOrganizer && (
                    <div className="mt-2 flex items-center gap-2 text-xs">
                      <ShieldCheck className="w-4 h-4 text-green-600" />
                      <span className="text-green-700 font-semibold">جهة مصرّحة ومؤهلة</span>
                    </div>
                  )}
                </div>
              )}

              {/* Pricing */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-bold text-gray-700">السعر الابتدائي *</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={formData.startingPrice}
                    onChange={(event) => setFormData({ ...formData, startingPrice: event.target.value })}
                    className="w-full rounded-xl border-gray-200 border p-3.5 bg-gray-50 focus:bg-[var(--color-surface)] focus:border-blue-400 transition text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-bold text-gray-700">الحد الأدنى للزيادة *</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={formData.bidIncrement}
                    onChange={(event) => setFormData({ ...formData, bidIncrement: event.target.value })}
                    className="w-full rounded-xl border-gray-200 border p-3.5 bg-gray-50 focus:bg-[var(--color-surface)] focus:border-blue-400 transition text-sm"
                    required
                  />
                </div>
              </div>

              {/* Optional Limits */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-bold text-gray-700">أقل مبلغ مقبول</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.minBid}
                    onChange={(event) => setFormData({ ...formData, minBid: event.target.value })}
                    className="w-full rounded-xl border-gray-200 border p-3.5 bg-gray-50 focus:bg-[var(--color-surface)] focus:border-blue-400 transition text-sm"
                    placeholder="اختياري"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-bold text-gray-700">أعلى مبلغ مسموح</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.maxBid}
                    onChange={(event) => setFormData({ ...formData, maxBid: event.target.value })}
                    className="w-full rounded-xl border-gray-200 border p-3.5 bg-gray-50 focus:bg-[var(--color-surface)] focus:border-blue-400 transition text-sm"
                    placeholder="اختياري"
                  />
                </div>
              </div>

              {/* Terms Acceptance */}
              <label className="flex items-start gap-3 rounded-xl border-2 border-gray-100 bg-gray-50 p-4 text-sm cursor-pointer hover:bg-[var(--color-primary-soft)] transition">
                <input
                  type="checkbox"
                  checked={formData.acceptSellerTerms}
                  onChange={(event) => setFormData({ ...formData, acceptSellerTerms: event.target.checked })}
                  className="mt-1 w-4 h-4 accent-blue-600"
                />
                <span className="text-gray-600">
                  أوافق بصفتي بائع العقار على شروط المزاد. إذا كنت تنظّم المزاد نيابة عن البائع فسيبقى المزاد بانتظار موافقة البائع قبل تفعيله.
                </span>
              </label>

              {error && (
                <div className="rounded-xl bg-[var(--color-error-soft)] border border-[var(--color-error)]/30 p-4 text-sm text-[var(--color-error)]">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button
                  type="submit"
                  loading={loading}
                  className="px-8 py-3 rounded-xl font-bold text-sm text-white"
                  style={{ background: 'var(--brand-gradient)' }}
                >
                  إنشاء المزاد
                </Button>
                <Button type="button" variant="secondary" onClick={() => router.back()} className="px-6 py-3 rounded-xl">
                  إلغاء
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
