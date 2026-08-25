'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { MapPin, Search, CheckCircle2, XCircle, ChevronDown, ChevronUp, Eye } from 'lucide-react';

type AdminMedia = { id: string; url: string; type: string };

type AdminProperty = {
  id: string;
  titleAr?: string | null;
  titleEn?: string | null;
  descriptionAr?: string | null;
  dealType?: string | null;
  category?: string | null;
  propertyType?: string | null;
  country?: string | null;
  governorate?: string | null;
  city?: string | null;
  district?: string | null;
  address?: string | null;
  latitude?: string | null;
  longitude?: string | null;
  price?: string | null;
  currency?: string | null;
  area?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  status?: string | null;
  rejectedReason?: string | null;
  referenceNumber?: string | null;
  advertisingLicense?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  media?: AdminMedia[];
  owner?: { id: string | null; name: string | null; role: string | null };
};

const STATUS_TABS: Array<{ value: string; label: string }> = [
  { value: 'pending_review', label: 'بانتظار المراجعة' },
  { value: 'approved', label: 'منشور' },
  { value: 'rejected', label: 'مرفوض' },
  { value: 'draft', label: 'مسودة' },
  { value: 'all', label: 'الكل' },
];

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  pending_review: 'bg-amber-100 text-amber-800',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  sold: 'bg-blue-100 text-blue-700',
  rented: 'bg-indigo-100 text-indigo-700',
  archived: 'bg-gray-200 text-gray-500',
};

const DEAL_LABEL: Record<string, string> = { sale: 'للبيع', rent: 'للإيجار' };

/**
 * Moderator queue for property listings: list by status, inspect the full
 * public payload, then approve or reject (with a required reason) through the
 * existing /api/admin/properties/[id]/review endpoint. All authorization is
 * enforced server-side; this UI only surfaces it.
 */
export default function AdminPropertyModeration() {
  const [status, setStatus] = useState('pending_review');
  const [search, setSearch] = useState('');
  const [searchDraft, setSearchDraft] = useState('');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<AdminProperty[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState('');

  const load = useCallback(() => {
    const controller = new AbortController();
    (async () => {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams({ status, page: String(page), limit: '20' });
        if (search) params.set('search', search);
        const res = await fetch(`/api/admin/properties?${params.toString()}`, {
          cache: 'no-store',
          signal: controller.signal,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.success) {
          throw new Error(data.error || `HTTP ${res.status}`);
        }
        if (!controller.signal.aborted) {
          setRows(Array.isArray(data.data) ? data.data : []);
          setStatusCounts(data.statusCounts ?? {});
          setPages(data.pagination?.pages ?? 1);
          setTotal(data.pagination?.total ?? 0);
        }
      } catch (e) {
        if (!controller.signal.aborted) {
          setRows([]);
          setError(e instanceof Error ? e.message : 'فشل في جلب العقارات');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [status, search, page]);

  useEffect(() => load(), [load]);

  const review = async (id: string, action: 'approve' | 'reject') => {
    setBusyId(id);
    setNotice('');
    try {
      const body: Record<string, unknown> = { action };
      if (action === 'reject') {
        const reason = (rejectReason[id] || '').trim();
        if (reason.length < 3) {
          setNotice('سبب الرفض مطلوب (٣ أحرف على الأقل)');
          setBusyId(null);
          return;
        }
        body.reason = reason;
      }
      const res = await fetch(`/api/admin/properties/${encodeURIComponent(id)}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        setNotice(data.error || 'فشل تنفيذ الإجراء');
        return;
      }
      setNotice(data.message || 'تم تنفيذ الإجراء');
      setExpanded(null);
      load();
    } catch {
      setNotice('فشل في الاتصال بالخادم');
    } finally {
      setBusyId(null);
    }
  };

  const countFor = useMemo(
    () => (value: string) =>
      value === 'all'
        ? Object.values(statusCounts).reduce((sum, n) => sum + n, 0)
        : statusCounts[value] ?? 0,
    [statusCounts],
  );

  return (
    <div dir="rtl">
      {/* Status tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => { setStatus(tab.value); setPage(1); setExpanded(null); }}
            className={`rounded-xl px-4 py-2 text-xs font-black transition ${
              status === tab.value
                ? 'bg-[var(--color-primary)] text-white'
                : 'bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-soft)]'
            }`}
          >
            {tab.label}
            <span className="ms-1.5 rounded-full bg-black/10 px-1.5 py-0.5 text-[10px]">{countFor(tab.value)}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <form
        className="flex gap-2 mb-5"
        onSubmit={(e) => { e.preventDefault(); setSearch(searchDraft.trim()); setPage(1); }}
      >
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute top-2.5 start-3 h-4 w-4 text-gray-400" />
          <input
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            placeholder="بحث بالعنوان، المدينة، الرقم المرجعي..."
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] ps-9 pe-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          />
        </div>
        <button type="submit" className="rounded-xl bg-[var(--color-surface-muted)] px-4 py-2 text-xs font-black text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-soft)] transition">
          بحث
        </button>
      </form>

      {notice && (
        <div className="mb-4 rounded-xl bg-[var(--color-primary-soft)] px-4 py-2.5 text-xs font-bold text-[var(--color-primary)]" role="status">
          {notice}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 dark:bg-red-900/20 px-5 py-8 text-center text-sm font-bold text-red-700 dark:text-red-300">
          {error}
          <div>
            <button type="button" onClick={() => load()} className="mt-3 rounded-xl bg-red-600 px-4 py-2 text-xs font-black text-white">إعادة المحاولة</button>
          </div>
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--color-border)] px-5 py-12 text-center text-sm font-bold text-[var(--color-text-muted)]">
          لا توجد عقارات في هذه الحالة.
        </div>
      ) : (
        <div className="space-y-3">
          <div className="text-xs font-bold text-[var(--color-text-muted)]">{total} عقار</div>
          {rows.map((row) => {
            const cover = row.media?.find((m) => m.url)?.url || '/placeholder.svg';
            const badge = STATUS_BADGE[row.status ?? 'draft'] ?? 'bg-gray-100 text-gray-600';
            const isOpen = expanded === row.id;
            return (
              <div key={row.id} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
                <div className="flex items-center gap-4 p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element -- runtime-managed URL */}
                  <img src={cover} alt="" width={80} height={60} loading="lazy" decoding="async" className="h-14 w-20 rounded-xl object-cover bg-gray-100" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="text-sm font-black text-[var(--color-text-primary)] truncate">{row.titleAr || row.titleEn || 'عقار'}</strong>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${badge}`}>{STATUS_TABS.find((t) => t.value === row.status)?.label ?? row.status}</span>
                      {row.dealType && <span className="rounded-full bg-[var(--color-surface-muted)] px-2 py-0.5 text-[10px] font-bold text-[var(--color-text-secondary)]">{DEAL_LABEL[row.dealType] ?? row.dealType}</span>}
                      {row.propertyType && <span className="rounded-full bg-[var(--color-surface-muted)] px-2 py-0.5 text-[10px] font-bold text-[var(--color-text-secondary)]">{row.propertyType}</span>}
                    </div>
                    <p className="mt-1 flex items-center gap-1 text-xs text-[var(--color-text-muted)] truncate">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      {[row.country, row.governorate, row.city, row.district].filter(Boolean).join(' / ') || '—'}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">
                      المالك: {row.owner?.name || '—'} ({row.owner?.role || 'user'}) · أُرسل: {row.updatedAt ? new Date(row.updatedAt).toLocaleDateString('ar') : '—'}
                    </p>
                  </div>
                  <div className="text-end shrink-0">
                    <div className="text-sm font-black text-[var(--color-primary)]">{Number(row.price ?? 0).toLocaleString('ar')} {row.currency || 'SAR'}</div>
                    <div className="text-[11px] text-[var(--color-text-muted)]">{row.area ? `${row.area} م²` : ''}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setExpanded(isOpen ? null : row.id)}
                    className="inline-flex items-center gap-1 rounded-xl border border-[var(--color-border)] px-3 py-2 text-xs font-black text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)] transition shrink-0"
                  >
                    <Eye className="h-3.5 w-3.5" /> مراجعة {isOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>
                </div>

                {isOpen && (
                  <div className="border-t border-[var(--color-border)] bg-[var(--color-surface-muted)]/40 p-4 space-y-4">
                    {row.media && row.media.length > 0 && (
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {row.media.map((m) => (
                          // eslint-disable-next-line @next/next/no-img-element -- runtime-managed URL
                          <img key={m.id} src={m.url} alt="" width={144} height={96} loading="lazy" decoding="async" className="h-24 w-36 shrink-0 rounded-xl object-cover bg-gray-100" />
                        ))}
                      </div>
                    )}
                    <p className="text-xs leading-relaxed text-[var(--color-text-secondary)] whitespace-pre-wrap">{row.descriptionAr || '—'}</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-bold text-[var(--color-text-secondary)]">
                      <span>غرف: {row.bedrooms ?? '—'}</span>
                      <span>حمامات: {row.bathrooms ?? '—'}</span>
                      <span>مرجع: {row.referenceNumber || '—'}</span>
                      <span>رخصة الإعلان: {row.advertisingLicense || '—'}</span>
                      {row.latitude && row.longitude && <span className="col-span-2">إحداثيات: {row.latitude}, {row.longitude}</span>}
                    </div>
                    {row.status === 'rejected' && row.rejectedReason && (
                      <p className="rounded-xl bg-red-50 dark:bg-red-900/20 px-3 py-2 text-[11px] font-bold text-red-700 dark:text-red-300">سبب الرفض السابق: {row.rejectedReason}</p>
                    )}

                    {row.status === 'pending_review' && (
                      <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
                        <button
                          type="button"
                          disabled={busyId === row.id}
                          onClick={() => review(row.id, 'approve')}
                          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-green-600 px-5 py-2.5 text-xs font-black text-white hover:bg-green-700 disabled:opacity-50 transition"
                        >
                          <CheckCircle2 className="h-4 w-4" /> اعتماد ونشر
                        </button>
                        <div className="flex flex-1 gap-2">
                          <input
                            value={rejectReason[row.id] || ''}
                            onChange={(e) => setRejectReason((prev) => ({ ...prev, [row.id]: e.target.value }))}
                            placeholder="سبب الرفض (إلزامي عند الرفض)"
                            className="flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-red-400"
                          />
                          <button
                            type="button"
                            disabled={busyId === row.id}
                            onClick={() => review(row.id, 'reject')}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-5 py-2.5 text-xs font-black text-white hover:bg-red-700 disabled:opacity-50 transition"
                          >
                            <XCircle className="h-4 w-4" /> رفض
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {pages > 1 && (
            <div className="flex justify-center gap-2 pt-3">
              {Array.from({ length: pages }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPage(i + 1)}
                  className={`h-9 w-9 rounded-xl text-xs font-black transition ${
                    i + 1 === page
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-soft)]'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
