'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, CheckCircle2, XCircle } from 'lucide-react';

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

const STATUS_CLASS: Record<string, string> = {
  draft: 'status-draft',
  pending_review: 'status-pending',
  approved: 'status-active',
  rejected: 'status-rejected',
  sold: 'status-active',
  rented: 'status-active',
  archived: 'status-archived',
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
    <section className="admin-panel" dir="rtl">
      <div className="admin-panel-title">
        <div><p>المراجعة</p><h2>قائمة العقارات المرسلة</h2></div>
        <span>{total} عقار</span>
      </div>

      {/* Status tabs */}
      <nav className="admin-subnav" aria-label="حالة العقارات">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            className={status === tab.value ? "active" : ""}
            type="button"
            onClick={() => { setStatus(tab.value); setPage(1); setExpanded(null); }}
          >
            {tab.label} ({countFor(tab.value)})
          </button>
        ))}
      </nav>

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
        <div className="admin-message" role="status">
          {notice}
          <button type="button" onClick={() => setNotice("")}>×</button>
        </div>
      )}

      {loading ? (
        <div className="admin-skeleton">
          <div className="admin-skeleton-row" />
          <div className="admin-skeleton-row" />
          <div className="admin-skeleton-row" />
          <div className="admin-skeleton-row" />
        </div>
      ) : error ? (
        <div className="admin-empty">
          <span>⚠</span>
          <strong>تعذر تحميل العقارات</strong>
          <p>{error}</p>
          <button type="button" onClick={() => load()}>إعادة المحاولة</button>
        </div>
      ) : rows.length === 0 ? (
        <div className="admin-empty">
          <span>◇</span>
          <strong>لا توجد عقارات في هذه الحالة</strong>
          <p>ستظهر العقارات هنا عند وصول طلبات جديدة.</p>
        </div>
      ) : (
        <div className="advertiser-admin-list">
          {rows.map((row) => {
            const cover = row.media?.find((m) => m.url)?.url || '/placeholder.svg';
            const statusClass = STATUS_CLASS[row.status ?? 'draft'] ?? 'status-draft';
            const isOpen = expanded === row.id;
            return (
              <article key={row.id}>
                <div className="admin-campaign-art" style={{ backgroundImage: `url("${cover}")` }}>
                  <span aria-hidden="true">🏠</span>
                </div>
                <div className="admin-advertiser-main">
                  <span className={`admin-status ${statusClass}`}>{STATUS_TABS.find((t) => t.value === row.status)?.label ?? row.status}</span>
                  <strong>{row.titleAr || row.titleEn || 'عقار'}</strong>
                  <small>
                    {[row.country, row.governorate, row.city, row.district].filter(Boolean).join(' / ') || '—'}
                    {' · '}المالك: {row.owner?.name || '—'}
                  </small>
                </div>
                <div><small>السعر</small><strong>{Number(row.price ?? 0).toLocaleString('ar')} {row.currency || 'SAR'}</strong></div>
                <div><small>النوع</small><strong>{row.dealType ? (DEAL_LABEL[row.dealType] ?? row.dealType) : '—'}</strong></div>
                <div className="admin-row-actions">
                  <button type="button" onClick={() => setExpanded(isOpen ? null : row.id)}>
                    مراجعة {isOpen ? '▲' : '▼'}
                  </button>
                </div>

                {isOpen && (
                  <div style={{ gridColumn: "1 / -1" }} className="border-t border-[var(--color-border)] bg-[var(--color-surface-muted)]/40 p-4 space-y-4">
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
              </article>
            );
          })}
        </div>
      )}

      {!loading && !error && pages > 1 && (
        <div className="admin-subnav" style={{ justifyContent: "center", marginTop: 14 }}>
          {Array.from({ length: pages }, (_, i) => (
            <button
              key={i}
              className={i + 1 === page ? "active" : ""}
              type="button"
              onClick={() => setPage(i + 1)}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
