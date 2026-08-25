'use client';

import Link from 'next/link';
import { useState } from 'react';
import { MapPin, Pencil, Send, Trash2, Eye, AlertCircle } from 'lucide-react';

export type OwnerProperty = {
  id: string;
  titleAr?: string | null;
  titleEn?: string | null;
  dealType?: string | null;
  propertyType?: string | null;
  city?: string | null;
  district?: string | null;
  price?: string | number | null;
  currency?: string | null;
  area?: string | number | null;
  status?: string | null;
  rejectedReason?: string | null;
  views?: number | null;
  inquiries?: number | null;
  updatedAt?: string | null;
  media?: Array<{ url?: string | null }> | null;
};

const STATUS_META: Record<string, { label: string; cls: string }> = {
  draft: { label: 'مسودة', cls: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  pending_review: { label: 'قيد المراجعة', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
  approved: { label: 'منشور', cls: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
  rejected: { label: 'مرفوض', cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
  sold: { label: 'مباع', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  rented: { label: 'مؤجر', cls: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' },
  archived: { label: 'مؤرشف', cls: 'bg-gray-200 text-gray-500 dark:bg-gray-800 dark:text-gray-400' },
};

const DEAL_LABEL: Record<string, string> = { sale: 'للبيع', rent: 'للإيجار' };

type Props = {
  property: OwnerProperty;
  onChanged?: () => void;
};

/**
 * Owner-facing card: shows the listing's own lifecycle state and the
 * state-aware actions (edit / submit for review / delete). Public cards
 * stay LuxuryPropertyCard; this one is only for "عقاراتي".
 */
export default function OwnerPropertyCard({ property, onChanged }: Props) {
  const [busy, setBusy] = useState<'submit' | 'delete' | null>(null);
  const [message, setMessage] = useState('');

  const status = property.status || 'draft';
  const meta = STATUS_META[status] ?? { label: status, cls: 'bg-gray-100 text-gray-600' };
  const canEdit = status === 'draft' || status === 'rejected';
  const canSubmit = status === 'draft' || status === 'rejected';
  const imageUrl = property.media?.find((m) => m?.url)?.url || '/placeholder.svg';
  const priceNumber = Number(property.price ?? 0);
  const location = [property.district, property.city].filter(Boolean).join('، ') || '—';

  const submitForReview = async () => {
    setBusy('submit');
    setMessage('');
    try {
      const res = await fetch(`/api/properties/${property.id}/submit`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        setMessage(data.error || 'تعذر إرسال العقار للمراجعة');
        return;
      }
      setMessage('تم إرسال العقار للمراجعة');
      onChanged?.();
    } catch {
      setMessage('فشل في الاتصال بالخادم');
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    if (!window.confirm('هل أنت متأكد من حذف هذا العقار؟ لا يمكن التراجع.')) return;
    setBusy('delete');
    setMessage('');
    try {
      const res = await fetch(`/api/properties/${property.id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        setMessage(data.error || 'تعذر حذف العقار');
        return;
      }
      onChanged?.();
    } catch {
      setMessage('فشل في الاتصال بالخادم');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm overflow-hidden flex flex-col">
      <div className="relative h-40 bg-gray-100 dark:bg-gray-800">
        {/* eslint-disable-next-line @next/next/no-img-element -- runtime-managed URL */}
        <img src={imageUrl} alt={property.titleAr || 'عقار'} loading="lazy" decoding="async" className="h-full w-full object-cover" />
        <span className={`absolute top-3 right-3 rounded-full px-3 py-1 text-[11px] font-black ${meta.cls}`}>{meta.label}</span>
        {property.dealType && (
          <span className="absolute top-3 left-3 rounded-full bg-black/60 px-3 py-1 text-[11px] font-bold text-white">
            {DEAL_LABEL[property.dealType] ?? property.dealType}
          </span>
        )}
      </div>

      <div className="p-4 flex-1 flex flex-col gap-2" dir="rtl">
        <h3 className="text-sm font-black text-[var(--color-text-primary)] line-clamp-1">{property.titleAr || property.titleEn || 'عقار'}</h3>
        <p className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
          <MapPin className="h-3.5 w-3.5" /> {location}
        </p>
        <div className="flex items-center justify-between text-xs font-bold text-[var(--color-text-secondary)]">
          <span>{Number.isFinite(priceNumber) && priceNumber > 0 ? priceNumber.toLocaleString('ar') : '—'} {property.currency || 'SAR'}</span>
          <span>{property.area ? `${property.area} م²` : ''}</span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-[var(--color-text-muted)]">
          <span className="inline-flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> {property.views ?? 0}</span>
          <span>استفسارات: {property.inquiries ?? 0}</span>
          {property.updatedAt && <span>آخر تحديث: {new Date(property.updatedAt).toLocaleDateString('ar')}</span>}
        </div>

        {status === 'rejected' && property.rejectedReason && (
          <p className="flex items-start gap-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 px-3 py-2 text-[11px] font-semibold text-red-700 dark:text-red-300">
            <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            سبب الرفض: {property.rejectedReason}
          </p>
        )}
        {message && <p className="text-[11px] font-semibold text-[var(--color-text-muted)]" role="status">{message}</p>}

        <div className="mt-auto flex flex-wrap gap-2 pt-2">
          {status === 'approved' && (
            <Link href={`/properties/${property.id}`} className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-[11px] font-bold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)] transition">
              عرض الصفحة العامة
            </Link>
          )}
          {canEdit && (
            <Link href={`/dashboard/properties/${property.id}/edit`} className="inline-flex items-center gap-1 rounded-lg bg-[var(--color-primary-soft)] px-3 py-1.5 text-[11px] font-bold text-[var(--color-primary)] hover:opacity-90 transition">
              <Pencil className="h-3.5 w-3.5" /> تعديل
            </Link>
          )}
          {canSubmit && (
            <button
              type="button"
              onClick={submitForReview}
              disabled={busy !== null}
              className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-green-700 disabled:opacity-50 transition"
            >
              <Send className="h-3.5 w-3.5" /> {busy === 'submit' ? 'جارٍ الإرسال...' : 'إرسال للمراجعة'}
            </button>
          )}
          <button
            type="button"
            onClick={remove}
            disabled={busy !== null}
            className="inline-flex items-center gap-1 rounded-lg bg-red-50 dark:bg-red-900/20 px-3 py-1.5 text-[11px] font-bold text-red-600 hover:bg-red-100 disabled:opacity-50 transition"
          >
            <Trash2 className="h-3.5 w-3.5" /> {busy === 'delete' ? 'جارٍ الحذف...' : 'حذف'}
          </button>
        </div>
      </div>
    </div>
  );
}
