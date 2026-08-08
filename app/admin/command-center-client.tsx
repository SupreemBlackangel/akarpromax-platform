"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type Overview = {
  generatedAt: string;
  sponsors: {
    total: number;
    active: number;
    byStatus: Record<string, number>;
    byCountry: { country: string; count: number }[];
  };
  ads: {
    total: number;
    active: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
    byApprovalStatus: Record<string, number>;
    endingSoon: number;
    totalImpressions: number;
    totalClicks: number;
    ctr: number;
    totalConversions: number;
  };
  properties: {
    total: number;
    active: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
    byListingType: Record<string, number>;
    byCountry: Record<string, number>;
    featured: number;
    missingCoordinates: number;
    staleCount: number;
    recentCount: number;
  };
  services: {
    totalRequests: number;
    openRequests: number;
    byRequestStatus: Record<string, number>;
    totalOffers: number;
    byOfferStatus: Record<string, number>;
    totalOrders: number;
    activeOrders: number;
    byOrderStatus: Record<string, number>;
    totalProviders: number;
    approvedProviders: number;
    byProviderStatus: Record<string, number>;
    totalDisputes: number;
    openDisputes: number;
    byDisputeStatus: Record<string, number>;
    totalReviews: number;
    avgRating: number;
    oldestDisputeAge: string | null;
    oldestPendingVerificationAge: string | null;
  };
  users: {
    total: number;
    byRole: Record<string, number>;
    byStatus: Record<string, number>;
    recentRegistrations: number;
    suspendedCount: number;
    pendingVerification: number;
  };
  integration: {
    totalDevices: number;
    activeDevices: number;
    byDeviceStatus: Record<string, number>;
    staleDevices: number;
    totalSyncs: number;
    successfulSyncs: number;
    bySyncStatus: Record<string, number>;
    failedSyncs: number;
    conflictSyncs: number;
    deadLetterSyncs: number;
    totalRadars: number;
    pendingPairings: number;
    notificationDeliveries: number;
    failedDeliveries: number;
  };
  geo: {
    propertiesByCity: { city: string; count: number }[];
    demandByCity: { city: string; count: number }[];
    providersByCity: { city: string; count: number }[];
    coverageGaps: { city: string; demand: number; providers: number }[];
  };
  news: {
    total: number;
    active: number;
  };
  health: {
    status: "healthy" | "degraded" | "unavailable";
    schemaMode: string;
    schemaReady: boolean;
    database: "healthy" | "degraded" | "unavailable";
    authentication: "healthy" | "degraded" | "unavailable";
    realtime: "healthy" | "degraded" | "unavailable";
    officeIntegration: "healthy" | "degraded" | "unavailable";
    email: "healthy" | "degraded" | "unavailable";
    uptime: string;
  };
  audit: {
    recent: { action: string; entityType: string; entityId: string | null; createdAt: string }[];
    todayCount: number;
  };
};

const COUNTRIES: Record<string, string> = {
  om: "عُمان", sa: "السعودية", ae: "الإمارات", qa: "قطر", kw: "الكويت",
  bh: "البحرين", eg: "مصر", jo: "الأردن", iq: "العراق", lb: "لبنان",
  ps: "فلسطين", sy: "سوريا", ye: "اليمن", ma: "المغرب", dz: "الجزائر",
  tn: "تونس", ly: "ليبيا", sd: "السودان", so: "الصومال", dj: "جيبوتي",
  tr: "تركيا",
};

const STATUS_AR: Record<string, string> = {
  active: "نشط", draft: "مسودة", paused: "متوقف", expired: "منتهي",
  archived: "مؤرشف", pending: "قيد الانتظار", disabled: "معطل",
  open: "مفتوح", closed: "مغلق", running: "قيد التشغيل",
  synced: "مزامن", queued: "في الانتظار", conflict: "تعارض",
  approved: "موافق عليه", rejected: "مرفوض", pending_verification: "بانتظار التحقق",
  in_progress: "قيد التنفيذ", completed: "مكتمل", created: "تم الإنشاء",
};

const ENTITY_AR: Record<string, string> = {
  sponsor: "راعٍ", campaign: "حملة", user: "مستخدم", ad: "إعلان",
  service_request: "طلب خدمة", property: "عقار", news: "خبر", device: "جهاز",
};

function useCommandCenter() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/command-center/overview", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load overview");
      const payload = await res.json();
      setData(payload);
      setError("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        const res = await fetch("/api/admin/command-center/overview", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load overview");
        const payload = await res.json();
        if (!cancelled) {
          setData(payload);
          setError("");
        }
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (autoRefresh) intervalRef.current = setInterval(loadData, 30_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoRefresh, loadData]);

  return { data, error, loading, refresh: loadData, autoRefresh, setAutoRefresh };
}

function MetricCard({ label, value, note, href, tone }: {
  label: string; value: string | number; note?: string; href?: string; tone?: string;
}) {
  const inner = (
    <div className={`cc-metric ${tone ? `cc-tone-${tone}` : ""}`}>
      <span className="cc-metric-label">{label}</span>
      <strong className="cc-metric-value">{typeof value === "number" ? value.toLocaleString("ar-EG") : value}</strong>
      {note && <small className="cc-metric-note">{note}</small>}
    </div>
  );
  return href ? <Link href={href} className="cc-metric-link">{inner}</Link> : <div className="cc-metric">{inner}</div>;
}

const HEALTH_LABELS: Record<string, string> = {
  healthy: "✓ سليم",
  degraded: "⚠ مُضعف",
  unavailable: "✗ غير متاح",
};

function HealthRow({ label, status }: { label: string; status: string }) {
  return (
    <div className="cc-kpi-row">
      <span>{label}</span>
      <b className={status === "healthy" ? "cc-status-ok" : status === "degraded" ? "cc-status-warn" : "cc-status-warn"}>
        {HEALTH_LABELS[status] ?? status}
      </b>
    </div>
  );
}

function StatusBars({ data, total }: { data: Record<string, number>; total: number }) {
  const entries = Object.entries(data).filter(([, v]) => v > 0);
  if (!entries.length) return <div className="cc-empty">لا توجد بيانات</div>;
  return (
    <div className="cc-bars">
      {entries.map(([status, count]) => (
        <div key={status} className="cc-bar-row">
          <span className="cc-bar-label">{STATUS_AR[status] ?? status}</span>
          <div className="cc-bar-track">
            <div className="cc-bar-fill" style={{ width: `${total ? (count / total) * 100 : 0}%` }} />
          </div>
          <b className="cc-bar-value">{count}</b>
        </div>
      ))}
    </div>
  );
}

function CountryList({ data }: { data: { country: string; count: number }[] }) {
  if (!data.length) return <div className="cc-empty">لا توجد بيانات جغرافية</div>;
  return (
    <div className="cc-list-compact">
      {data.map((row) => (
        <div key={row.country} className="cc-list-row">
          <span>{COUNTRIES[row.country] ?? row.country.toUpperCase()}</span>
          <b>{row.count}</b>
        </div>
      ))}
    </div>
  );
}

function AuditLog({ entries }: { entries: Overview["audit"]["recent"] }) {
  if (!entries.length) return <div className="cc-empty">لا يوجد سجل بعد</div>;
  return (
    <div className="cc-audit">
      {entries.map((entry, i) => (
        <div key={`${entry.createdAt}-${i}`} className="cc-audit-row">
          <span className="cc-audit-dot" />
          <div className="cc-audit-info">
            <strong>{entry.action}</strong>
            <small>{ENTITY_AR[entry.entityType] ?? entry.entityType}{entry.entityId ? ` • ${entry.entityId.slice(0, 8)}` : ""}</small>
          </div>
          <time className="cc-audit-time">
            {new Date(entry.createdAt).toLocaleString("ar-EG", { dateStyle: "short", timeStyle: "short" })}
          </time>
        </div>
      ))}
    </div>
  );
}

function MiniBarChart({ data, max }: { data: Record<string, number>; max: number }) {
  const entries = Object.entries(data).filter(([, v]) => v > 0);
  if (!entries.length) return null;
  return (
    <div className="cc-mini-bars">
      {entries.map(([key, val]) => (
        <div key={key} className="cc-mini-col" title={`${STATUS_AR[key] ?? key}: ${val}`}>
          <div className="cc-mini-bar" style={{ height: `${max ? (val / max) * 100 : 0}%` }} />
          <span>{(STATUS_AR[key] ?? key).slice(0, 3)}</span>
        </div>
      ))}
    </div>
  );
}

export default function CommandCenterOverview() {
  const { data, error, loading, refresh, autoRefresh, setAutoRefresh } = useCommandCenter();

  return (
    <>
      <header className="sponsor-admin-header">
        <div>
          <p>Unified Command Center</p>
          <h1>مركز الأوامر الموحد</h1>
        </div>
        <div className="admin-header-actions">
          <button
            type="button"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? "cc-refresh-active" : ""}
            aria-pressed={autoRefresh}
          >
            {autoRefresh ? "● تحديث تلقائي" : "○ تحديث يدوي"}
          </button>
          <button type="button" onClick={refresh}>⟳ تحديث</button>
          <Link href="/" target="_blank">معاينة الموقع ↗</Link>
        </div>
      </header>

      {error && <div className="admin-message" role="alert">{error}</div>}

      {loading && !data ? (
        <div className="admin-panel" style={{ textAlign: "center", color: "var(--color-text-muted)" }}>
          <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.5 }}>⏳</div>
          <p>جارٍ تحميل بيانات مركز الأوامر...</p>
        </div>
      ) : data ? (
        <>
          <div className="cc-meta">
            <span>آخر تحديث: {new Date(data.generatedAt).toLocaleString("ar-EG")}</span>
          </div>

          {/* ── ROW 1: Primary Metrics ── */}
          <div className="cc-stat-grid cc-stat-grid-6">
            <MetricCard label="الرعاة" value={data.sponsors.total} note={`${data.sponsors.active} نشط`} href="/admin/sponsors" tone="blue" />
            <MetricCard label="الحملات" value={data.ads.total} note={`${data.ads.active} نشطة`} href="/admin/ads" tone="purple" />
            <MetricCard label="العقارات" value={data.properties.total} note={`${data.properties.active} نشطة`} href="/api/properties" tone="emerald" />
            <MetricCard label="طلبات الخدمات" value={data.services.totalRequests} note={`${data.services.openRequests} مفتوحة`} href="/admin/services" tone="amber" />
            <MetricCard label="المستخدمون" value={data.users.total} note={`${data.users.byRole.super_admin ?? 0} مشرف`} href="/admin/users" tone="gray" />
            <MetricCard label="الأجهزة" value={data.integration.totalDevices} note={`${data.integration.activeDevices} متصلة`} href="/admin/integration" tone="teal" />
          </div>

          {/* ── ROW 2: Secondary Metrics ── */}
          <div className="cc-stat-grid cc-stat-grid-4">
            <MetricCard label="انطباعات الإعلانات" value={data.ads.totalImpressions} tone="blue" />
            <MetricCard label="نقرات الإعلانات" value={data.ads.totalClicks} tone="blue" />
            <MetricCard label="معدل النقر" value={`${data.ads.ctr}%`} tone="green" />
            <MetricCard label="متوسط التقييم" value={data.services.avgRating > 0 ? `${data.services.avgRating} ★` : "—"} note={`${data.services.totalReviews} تقييم`} tone="amber" />
          </div>

          {/* ── ROW 3: Operational Panels ── */}
          <div className="cc-grid-2">
            <section className="admin-panel">
              <div className="admin-panel-title">
                <div><p>الرعاة</p><h2>توزيع حسب الحالة</h2></div>
                <Link href="/admin/sponsors">عرض الكل ↗</Link>
              </div>
              <StatusBars data={data.sponsors.byStatus} total={data.sponsors.total} />
            </section>

            <section className="admin-panel">
              <div className="admin-panel-title">
                <div><p>الحملات الإعلانية</p><h2>توزيع حسب الحالة</h2></div>
                <Link href="/admin/ads">عرض الكل ↗</Link>
              </div>
              <StatusBars data={data.ads.byStatus} total={data.ads.total} />
            </section>
          </div>

          <div className="cc-grid-3">
            <section className="admin-panel">
              <div className="admin-panel-title"><div><p>الحملات الإعلانية</p><h2>حسب النوع</h2></div></div>
              <StatusBars data={data.ads.byType} total={data.ads.total} />
            </section>

            <section className="admin-panel">
              <div className="admin-panel-title"><div><p>الحملات الإعلانية</p><h2>الأداء</h2></div></div>
              <div className="cc-kpi-stack">
                <div className="cc-kpi-row"><span>الانطباعات</span><b>{data.ads.totalImpressions.toLocaleString()}</b></div>
                <div className="cc-kpi-row"><span>النقرات</span><b>{data.ads.totalClicks.toLocaleString()}</b></div>
                <div className="cc-kpi-row"><span>معدل النقر</span><b>{data.ads.ctr}%</b></div>
                <div className="cc-kpi-row"><span>تنتهي قريباً (7 أيام)</span><b className={data.ads.endingSoon > 0 ? "cc-status-warn" : ""}>{data.ads.endingSoon}</b></div>
              </div>
            </section>

            <section className="admin-panel">
              <div className="admin-panel-title"><div><p>الحملات الإعلانية</p><h2>حسب الموافقة</h2></div></div>
              <StatusBars data={data.ads.byApprovalStatus} total={data.ads.total} />
            </section>
          </div>

          <div className="cc-grid-2">
            <section className="admin-panel">
              <div className="admin-panel-title">
                <div><p>العقارات</p><h2>حسب النوع</h2></div>
              </div>
              <MiniBarChart data={data.properties.byType} max={Math.max(1, ...Object.values(data.properties.byType))} />
              {!Object.keys(data.properties.byType).length && <div className="cc-empty">لا توجد عقارات بعد</div>}
            </section>

            <section className="admin-panel">
              <div className="admin-panel-title">
                <div><p>العقارات</p><h2>حسب نوع القائمة</h2></div>
              </div>
              <StatusBars data={data.properties.byListingType} total={data.properties.total} />
            </section>
          </div>

          <div className="cc-grid-2">
            <section className="admin-panel">
              <div className="admin-panel-title">
                <div><p>العقارات</p><h2>الحالة والجودة</h2></div>
              </div>
              <div className="cc-kpi-stack">
                <div className="cc-kpi-row"><span>مميزة</span><b>{data.properties.featured}</b></div>
                <div className="cc-kpi-row"><span>بدون إحداثيات</span><b className={data.properties.missingCoordinates > 0 ? "cc-status-warn" : ""}>{data.properties.missingCoordinates}</b></div>
                <div className="cc-kpi-row"><span>قديمة (30+ يوم)</span><b className={data.properties.staleCount > 0 ? "cc-status-warn" : ""}>{data.properties.staleCount}</b></div>
                <div className="cc-kpi-row"><span>جديدة (30 يوم)</span><b>{data.properties.recentCount}</b></div>
              </div>
            </section>

            <section className="admin-panel">
              <div className="admin-panel-title">
                <div><p>العقارات</p><h2>حسب الدولة</h2></div>
              </div>
              <CountryList data={Object.entries(data.properties.byCountry).map(([country, count]) => ({ country, count }))} />
              {!Object.keys(data.properties.byCountry).length && <div className="cc-empty">لا توجد عقارات بعد</div>}
            </section>
          </div>

          {/* ── ROW 4: Services Marketplace ── */}
          <div className="cc-grid-3">
            <section className="admin-panel">
              <div className="admin-panel-title"><div><p>سوق الخدمات</p><h2>الطلبات</h2></div><Link href="/admin/services">عرض ↗</Link></div>
              <StatusBars data={data.services.byRequestStatus} total={data.services.totalRequests} />
            </section>

            <section className="admin-panel">
              <div className="admin-panel-title"><div><p>سوق الخدمات</p><h2>العروض والوظائف</h2></div></div>
              <div className="cc-kpi-stack">
                <div className="cc-kpi-row"><span>إجمالي العروض</span><b>{data.services.totalOffers}</b></div>
                <div className="cc-kpi-row"><span>العروض المقبولة</span><b>{data.services.byOfferStatus.accepted ?? 0}</b></div>
                <div className="cc-kpi-row"><span>الوظائف النشطة</span><b>{data.services.activeOrders}</b></div>
                <div className="cc-kpi-row"><span>الوظائف المكتملة</span><b>{data.services.byOrderStatus.completed ?? 0}</b></div>
                <div className="cc-kpi-row"><span>إجمالي الطلبات</span><b>{data.services.totalOrders}</b></div>
              </div>
            </section>

            <section className="admin-panel">
              <div className="admin-panel-title"><div><p>سوق الخدمات</p><h2>المزودون والنزاعات</h2></div></div>
              <div className="cc-kpi-stack">
                <div className="cc-kpi-row"><span>إجمالي المزودين</span><b>{data.services.totalProviders}</b></div>
                <div className="cc-kpi-row"><span>الموافق عليهم</span><b>{data.services.approvedProviders}</b></div>
                <div className="cc-kpi-row"><span>بانتظار المراجعة</span><b className={data.services.oldestPendingVerificationAge ? "cc-status-warn" : ""}>{(data.services.byProviderStatus.submitted ?? 0) + (data.services.byProviderStatus.under_review ?? 0)}</b></div>
                <div className="cc-kpi-row"><span>النزاعات المفتوحة</span><b className={data.services.openDisputes > 0 ? "cc-status-warn" : ""}>{data.services.openDisputes}</b></div>
                {data.services.oldestDisputeAge && <div className="cc-kpi-row"><span>أقدم نزاع</span><b className="cc-status-warn">{data.services.oldestDisputeAge}</b></div>}
              </div>
            </section>
          </div>

          <div className="cc-grid-3">
            <section className="admin-panel">
              <div className="admin-panel-title"><div><p>سوق الخدمات</p><h2>حسب العروض</h2></div></div>
              <StatusBars data={data.services.byOfferStatus} total={data.services.totalOffers} />
            </section>

            <section className="admin-panel">
              <div className="admin-panel-title"><div><p>سوق الخدمات</p><h2>حسب الوظائف</h2></div></div>
              <StatusBars data={data.services.byOrderStatus} total={data.services.totalOrders} />
            </section>

            <section className="admin-panel">
              <div className="admin-panel-title"><div><p>سوق الخدمات</p><h2>المزودون حسب الحالة</h2></div></div>
              <StatusBars data={data.services.byProviderStatus} total={data.services.totalProviders} />
            </section>
          </div>

          {/* ── ROW 5: Geographic Intelligence ── */}
          <div className="cc-grid-3">
            <section className="admin-panel">
              <div className="admin-panel-title"><div><p>جغرافيا</p><h2>العقارات حسب المدينة</h2></div></div>
              <MiniBarChart data={Object.fromEntries(data.geo.propertiesByCity.map((r) => [r.city, r.count]))} max={Math.max(1, ...data.geo.propertiesByCity.map((r) => r.count))} />
              {!data.geo.propertiesByCity.length && <div className="cc-empty">لا توجد بيانات بعد</div>}
            </section>

            <section className="admin-panel">
              <div className="admin-panel-title"><div><p>جغرافيا</p><h2>الطلب على الخدمات حسب المدينة</h2></div></div>
              <MiniBarChart data={Object.fromEntries(data.geo.demandByCity.map((r) => [r.city, r.count]))} max={Math.max(1, ...data.geo.demandByCity.map((r) => r.count))} />
              {!data.geo.demandByCity.length && <div className="cc-empty">لا توجد بيانات بعد</div>}
            </section>

            <section className="admin-panel">
              <div className="admin-panel-title"><div><p>جغرافيا</p><h2>المزودون حسب المدينة</h2></div></div>
              <MiniBarChart data={Object.fromEntries(data.geo.providersByCity.map((r) => [r.city, r.count]))} max={Math.max(1, ...data.geo.providersByCity.map((r) => r.count))} />
              {!data.geo.providersByCity.length && <div className="cc-empty">لا توجد بيانات بعد</div>}
            </section>
          </div>

          {data.geo.coverageGaps.length > 0 && (
            <section className="admin-panel">
              <div className="admin-panel-title"><div><p>جغرافيا</p><h2>فجوات التغطية — طلب مرتفع بدون مزودين</h2></div></div>
              <div className="cc-kpi-stack">
                {data.geo.coverageGaps.map((gap) => (
                  <div key={gap.city} className="cc-kpi-row">
                    <span>{gap.city}</span>
                    <b className="cc-status-warn">{gap.demand} طلب / {gap.providers} مزود</b>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── ROW 6: Users & Integration ── */}
          <div className="cc-grid-2">
            <section className="admin-panel">
              <div className="admin-panel-title">
                <div><p>المستخدمون</p><h2>حسب الدور</h2></div>
                <Link href="/admin/users">إدارة ↗</Link>
              </div>
              <StatusBars data={data.users.byRole} total={data.users.total} />
            </section>

            <section className="admin-panel">
              <div className="admin-panel-title">
                <div><p>المستخدمون</p><h2>الأمان والحالة</h2></div>
              </div>
              <div className="cc-kpi-stack">
                <div className="cc-kpi-row"><span>جديد (30 يوم)</span><b>{data.users.recentRegistrations}</b></div>
                <div className="cc-kpi-row"><span>معلق التحقق</span><b className={data.users.pendingVerification > 0 ? "cc-status-warn" : ""}>{data.users.pendingVerification}</b></div>
                <div className="cc-kpi-row"><span>محظور</span><b className={data.users.suspendedCount > 0 ? "cc-status-warn" : ""}>{data.users.suspendedCount}</b></div>
              </div>
            </section>
          </div>

          <div className="cc-grid-2">
            <section className="admin-panel">
              <div className="admin-panel-title">
                <div><p>التكامل</p><h2>الأجهزة</h2></div>
                <Link href="/admin/integration">إدارة ↗</Link>
              </div>
              <StatusBars data={data.integration.byDeviceStatus} total={data.integration.totalDevices} />
            </section>
          </div>

          <div className="cc-grid-3">
            <section className="admin-panel">
              <div className="admin-panel-title"><div><p>التكامل</p><h2>المزامنة</h2></div></div>
              <div className="cc-kpi-stack">
                <div className="cc-kpi-row"><span>ناجحة</span><b className="cc-status-ok">{data.integration.successfulSyncs}</b></div>
                <div className="cc-kpi-row"><span>فشل</span><b className={data.integration.failedSyncs > 0 ? "cc-status-warn" : ""}>{data.integration.failedSyncs}</b></div>
                <div className="cc-kpi-row"><span>تعارض</span><b className={data.integration.conflictSyncs > 0 ? "cc-status-warn" : ""}>{data.integration.conflictSyncs}</b></div>
                <div className="cc-kpi-row"><span>رسالة ميتة</span><b className={data.integration.deadLetterSyncs > 0 ? "cc-status-warn" : ""}>{data.integration.deadLetterSyncs}</b></div>
                <div className="cc-kpi-row"><span>الإجمالي</span><b>{data.integration.totalSyncs}</b></div>
              </div>
            </section>

            <section className="admin-panel">
              <div className="admin-panel-title"><div><p>التكامل</p><h2>الإعداد والإنذارات</h2></div></div>
              <div className="cc-kpi-stack">
                <div className="cc-kpi-row"><span>أزواج معلقة</span><b className={data.integration.pendingPairings > 0 ? "cc-status-warn" : ""}>{data.integration.pendingPairings}</b></div>
                <div className="cc-kpi-row"><span>أجهزة قديمة (7+ أيام)</span><b className={data.integration.staleDevices > 0 ? "cc-status-warn" : ""}>{data.integration.staleDevices}</b></div>
                <div className="cc-kpi-row"><span>استعلامات الرادار</span><b>{data.integration.totalRadars}</b></div>
              </div>
            </section>

            <section className="admin-panel">
              <div className="admin-panel-title"><div><p>التكامل</p><h2>送达 الإشعارات</h2></div></div>
              <div className="cc-kpi-stack">
                <div className="cc-kpi-row"><span>الإجمالي</span><b>{data.integration.notificationDeliveries}</b></div>
                <div className="cc-kpi-row"><span>فشل</span><b className={data.integration.failedDeliveries > 0 ? "cc-status-warn" : ""}>{data.integration.failedDeliveries}</b></div>
              </div>
            </section>
          </div>

          {/* ── ROW 7: Health & Audit ── */}
          <div className="cc-grid-2">
            <section className="admin-panel">
              <div className="admin-panel-title"><div><p>النظام</p><h2>حالة المكونات</h2></div></div>
              <div className="cc-kpi-stack">
                <HealthRow label="النظام العام" status={data.health.status} />
                <HealthRow label="قاعدة البيانات" status={data.health.database} />
                <HealthRow label="المصادقة" status={data.health.authentication} />
                <HealthRow label="البث المباشر" status={data.health.realtime} />
                <HealthRow label="تكامل المكتب" status={data.health.officeIntegration} />
                <HealthRow label="البريد الإلكتروني" status={data.health.email} />
                <div className="cc-kpi-row"><span>وضع المخطط</span><b>{data.health.schemaMode}</b></div>
                <div className="cc-kpi-row"><span>أحداث اليوم</span><b>{data.audit.todayCount}</b></div>
              </div>
            </section>

            <section className="admin-panel">
              <div className="admin-panel-title"><div><p>السجل</p><h2>آخر العمليات</h2></div></div>
              <AuditLog entries={data.audit.recent} />
            </section>
          </div>
        </>
      ) : null}
    </>
  );
}
