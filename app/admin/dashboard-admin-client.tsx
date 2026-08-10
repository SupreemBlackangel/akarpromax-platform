"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Stats = {
  advertisers: {
    total: number;
    byStatus: Record<string, number>;
    byCountry: { country: string; impressions: number; clicks: number }[];
  };
  campaigns: { total: number; byStatus: Record<string, number>; byType: Record<string, number> };
  access: { total: number; byRole: Record<string, { label: string; count: number }> };
  members: { total: number; byStatus: Record<string, number> };
  events: { advertiserImpressions: number; advertiserClicks: number; adImpressions: number; adClicks: number; today: number };
  plans: number;
  audit: { action: string; entityType: string; entityId: string | null; createdAt: string }[];
};

const countries: Record<string, string> = {
  om: "عُمان", sa: "السعودية", ae: "الإمارات", qa: "قطر", kw: "الكويت",
  bh: "البحرين", eg: "مصر", jo: "الأردن", iq: "العراق", lb: "لبنان",
  ps: "فلسطين", sy: "سوريا", ye: "اليمن", ma: "المغرب", dz: "الجزائر",
  tn: "تونس", ly: "ليبيا", sd: "السودان", so: "الصومال", dj: "جيبوتي",
  mr: "موريتانيا", km: "جزر القمر", tr: "تركيا",
};

const statusLabels: Record<string, string> = {
  active: "نشط", draft: "مسودة", paused: "متوقف", expired: "منتهي",
  archived: "مؤرشف", pending: "قيد الانتظار", disabled: "معطل",
};

const typeLabels: Record<string, string> = {
  platform: "المنصة", advertiser: "معلنون", property: "عقارات", service: "خدمات",
};

const actionLabels: Record<string, string> = {
  "advertiser.created": "إنشاء معلن", "advertiser.updated": "تعديل معلن",
  "advertiser.archived": "أرشفة معلن", "advertiser.logo_uploaded": "رفع شعار معلن",
  "advertiser.access.updated": "تحديث صلاحية مستخدم",
  "advertiser.access.deleted": "إزالة صلاحية مستخدم",
  "campaign.created": "إنشاء حملة", "campaign.updated": "تعديل حملة",
  "campaign.archived": "أرشفة حملة",
};

export default function DashboardAdminClient() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/admin/stats", { cache: "no-store", signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("تعذر تحميل إحصاءات لوحة التحكم");
        return response.json();
      })
      .then((data: Stats) => {
        setStats(data);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "حدث خطأ غير متوقع");
      });
    return () => controller.abort();
  }, []);

  if (error) {
    return <div style={{ padding: 48, color: "#b34351" }}>{error}</div>;
  }

  const totals = stats ? [
    { label: "المعلنون النشطون", value: stats.advertisers.byStatus.active ?? 0, note: `من أصل ${stats.advertisers.total}` },
    { label: "الحملات النشطة", value: stats.campaigns.byStatus.active ?? 0, note: `من أصل ${stats.campaigns.total}` },
    { label: "مستخدمو المعلنين", value: stats.access.total, note: `${stats.plans} خطط متاحة` },
    { label: "أعضاء المنصة", value: stats.members.total, note: `${stats.events.today} حدث اليوم` },
  ] : [];

  return (
    <>
      <header className="advertiser-admin-header">
          <div><p>نظرة عامة على الأنظمة</p><h1>لوحة الإحصاءات</h1></div>
          <div className="admin-header-actions"><Link href="/" target="_blank">معاينة الموقع ↗</Link></div>
        </header>

        {!stats ? (
          <div className="admin-panel" style={{ textAlign: "center", color: "#6b7b93" }}>
            <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.5 }}>⏳</div>
            <p>جارٍ تحميل الإحصاءات...</p>
          </div>
        ) : (
          <>
            <div className="admin-stat-grid">
              {totals.map((item) => (
                <article key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value.toLocaleString("ar-EG")}</strong>
                  <small>{item.note}</small>
                </article>
              ))}
            </div>

            <div className="admin-dashboard-grid">
              <section className="admin-panel">
                <div className="admin-panel-title"><div><p>الأداء</p><h2>الانطباعات والنقرات</h2></div></div>
                <div className="admin-kpi-rows">
                  <div><span>انطباعات المعلنين</span><b>{stats.events.advertiserImpressions.toLocaleString("ar-EG")}</b></div>
                  <div><span>نقرات المعلنين</span><b>{stats.events.advertiserClicks.toLocaleString("ar-EG")}</b></div>
                  <div><span>انطباعات الإعلانات</span><b>{stats.events.adImpressions.toLocaleString("ar-EG")}</b></div>
                  <div><span>نقرات الإعلانات</span><b>{stats.events.adClicks.toLocaleString("ar-EG")}</b></div>
                </div>
              </section>

              <section className="admin-panel">
                <div className="admin-panel-title"><div><p>المعلنون حسب الحالة</p><h2>توزيع حملات المعلنين</h2></div></div>
                <div className="admin-bar-list">
                  {Object.entries(stats.advertisers.byStatus).map(([status, count]) => (
                    <div key={status}>
                      <span>{statusLabels[status] ?? status}</span>
                      <div className="admin-bar-track"><i className={`bar-${status}`} style={{ width: `${stats.advertisers.total ? (count / stats.advertisers.total) * 100 : 0}%` }} /></div>
                      <b>{count}</b>
                    </div>
                  ))}
                </div>
              </section>

              <section className="admin-panel">
                <div className="admin-panel-title"><div><p>الإعلانات حسب الحالة</p><h2>توزيع الحملات الإعلانية</h2></div></div>
                <div className="admin-bar-list">
                  {Object.entries(stats.campaigns.byStatus).map(([status, count]) => (
                    <div key={status}>
                      <span>{statusLabels[status] ?? status}</span>
                      <div className="admin-bar-track"><i className={`bar-${status}`} style={{ width: `${stats.campaigns.total ? (count / stats.campaigns.total) * 100 : 0}%` }} /></div>
                      <b>{count}</b>
                    </div>
                  ))}
                </div>
              </section>

              <section className="admin-panel">
                <div className="admin-panel-title"><div><p>التركيبة</p><h2>الأدوار والمستخدمون</h2></div></div>
                <div className="admin-bar-list">
                  {Object.values(stats.access.byRole).map(({ label, count }) => (
                    <div key={label}>
                      <span>{label}</span>
                      <div className="admin-bar-track"><i style={{ width: `${stats.access.total ? (count / stats.access.total) * 100 : 0}%` }} /></div>
                      <b>{count}</b>
                    </div>
                  ))}
                </div>
              </section>

              <section className="admin-panel admin-panel-wide">
                <div className="admin-panel-title"><div><p>أسواق</p><h2>أفضل الدول حسب الانطباعات</h2></div></div>
                <div className="admin-analytics-list">
                  {stats.advertisers.byCountry.map((row) => {
                    const rate = row.impressions ? ((row.clicks / row.impressions) * 100).toFixed(1) : "0.0";
                    return (
                      <article key={row.country}>
                        <div><strong>{countries[row.country] ?? row.country.toUpperCase()}</strong><small>معلنون</small></div>
                        <span>{row.impressions.toLocaleString("ar-EG")} ظهور</span>
                        <span>{row.clicks.toLocaleString("ar-EG")} نقرة</span>
                        <b>{rate}% CTR</b>
                      </article>
                    );
                  })}
                  {!stats.advertisers.byCountry.length && <div className="admin-empty"><span>◇</span><strong>لا توجد أحداث بعد</strong><p>ستظهر الانطباعات فور بدء تشغيل حملات المعلنين.</p></div>}
                </div>
              </section>

              <section className="admin-panel">
                <div className="admin-panel-title"><div><p>سجل</p><h2>آخر العمليات</h2></div></div>
                <div className="admin-audit-list">
                  {stats.audit.map((entry) => (
                    <article key={`${entry.createdAt}-${entry.action}-${entry.entityId}`}>
                      <span>•</span>
                      <div><strong>{actionLabels[entry.action] ?? entry.action}</strong><small>{entry.entityType}{entry.entityId ? ` • ${entry.entityId.slice(0, 8)}` : ""}</small></div>
                      <time>{new Date(entry.createdAt).toLocaleString("ar-EG", { dateStyle: "short", timeStyle: "short" })}</time>
                    </article>
                  ))}
                  {!stats.audit.length && <div className="admin-empty"><span>◇</span><strong>لا يوجد سجل بعد</strong></div>}
                </div>
              </section>
            </div>
          </>
        )}
    </>
  );
}
