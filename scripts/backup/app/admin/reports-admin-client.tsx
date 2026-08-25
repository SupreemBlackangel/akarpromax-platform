"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Identity = {
  email: string | null;
  displayName: string;
  role: string;
  countryCode: string | null;
  permissions: string[];
};

type TimelineEntry = { day: string; advertiserImpressions: number; advertiserClicks: number; adImpressions: number; adClicks: number };
type TopAdvertiser = { id: string; nameAr: string; countryCode: string; impressions: number; clicks: number };
type TopCampaign = { id: string; internalName: string; advertiserName: string; status: string; impressions: number; clicks: number };

type Analytics = {
  identity: Identity;
  timeline: TimelineEntry[];
  topAdvertisers: TopAdvertiser[];
  topCampaigns: TopCampaign[];
};

const countries: Record<string, string> = {
  om: "عُمان", sa: "السعودية", ae: "الإمارات", qa: "قطر", kw: "الكويت",
  bh: "البحرين", eg: "مصر", jo: "الأردن", iq: "العراق", lb: "لبنان",
  ps: "فلسطين", sy: "سوريا", ye: "اليمن", ma: "المغرب", dz: "الجزائر",
  tn: "تونس", ly: "ليبيا", sd: "السودان", so: "الصومال", dj: "جيبوتي",
  mr: "موريتانيا", km: "جزر القمر", tr: "تركيا",
};

const statusLabels: Record<string, string> = {
  active: "نشط", draft: "مسودة", paused: "متوقف", expired: "منتهي", archived: "مؤرشف",
};

export default function ReportsAdminClient() {
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/admin/analytics", { cache: "no-store", signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("تعذر تحميل التقارير");
        return response.json();
      })
      .then((result: Analytics) => {
        setData(result);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "حدث خطأ غير متوقع");
      });
    return () => controller.abort();
  }, []);

  const totals = data ? data.timeline.reduce(
    (acc, entry) => ({
      advertiserImpressions: acc.advertiserImpressions + entry.advertiserImpressions,
      advertiserClicks: acc.advertiserClicks + entry.advertiserClicks,
      adImpressions: acc.adImpressions + entry.adImpressions,
      adClicks: acc.adClicks + entry.adClicks,
    }),
    { advertiserImpressions: 0, advertiserClicks: 0, adImpressions: 0, adClicks: 0 },
  ) : null;

  const maxDaily = data ? Math.max(1, ...data.timeline.map((entry) => Math.max(entry.advertiserImpressions, entry.adImpressions))) : 1;

  return (
    <>
      <header className="advertiser-admin-header">
        <div><p>تحليلات الأداء</p><h1>التقارير والإحصاءات</h1></div>
        <div className="admin-header-actions"><Link href="/" target="_blank">معاينة الموقع ↗</Link></div>
      </header>

        {error && <div className="admin-message" role="status">{error}</div>}

        {!data ? (
          <div className="admin-panel" style={{ textAlign: "center", color: "#6b7b93" }}>
            <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.5 }}>⏳</div>
            <p>جارٍ تحميل التقارير...</p>
          </div>
        ) : (
          <>
            <div className="admin-stat-grid">
              <article><span>انطباعات المعلنين</span><strong>{totals?.advertiserImpressions.toLocaleString("ar-EG") ?? 0}</strong><small>آخر 14 يومًا</small></article>
              <article><span>نقرات المعلنين</span><strong>{totals?.advertiserClicks.toLocaleString("ar-EG") ?? 0}</strong><small>آخر 14 يومًا</small></article>
              <article><span>انطباعات الإعلانات</span><strong>{totals?.adImpressions.toLocaleString("ar-EG") ?? 0}</strong><small>آخر 14 يومًا</small></article>
              <article><span>نقرات الإعلانات</span><strong>{totals?.adClicks.toLocaleString("ar-EG") ?? 0}</strong><small>آخر 14 يومًا</small></article>
            </div>

            <div className="admin-dashboard-grid">
              <section className="admin-panel admin-panel-wide">
                <div className="admin-panel-title"><div><p>آخر 14 يومًا</p><h2>الانطباعات اليومية</h2></div></div>
                <div className="reports-chart">
                  {data.timeline.map((entry) => {
                    const date = new Date(entry.day + "T00:00:00");
                    const label = date.toLocaleDateString("ar-EG", { day: "numeric", month: "short" });
                    return (
                      <div className="reports-chart-col" key={entry.day} title={`${entry.day}\nمعلنون: ${entry.advertiserImpressions}\nإعلانات: ${entry.adImpressions}`}>
                        <div className="reports-chart-bars">
                          <i className="sponsor-bar" style={{ height: `${(entry.advertiserImpressions / maxDaily) * 100}%` }} />
                          <i className="ad-bar" style={{ height: `${(entry.adImpressions / maxDaily) * 100}%` }} />
                        </div>
                        <span>{label}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="reports-legend"><span><i className="sponsor-bar" />معلنون</span><span><i className="ad-bar" />إعلانات</span></div>
              </section>

              <section className="admin-panel">
                <div className="admin-panel-title"><div><p>الأداء</p><h2>أفضل المعلنين</h2></div></div>
                <div className="admin-analytics-list">
                  {data.topAdvertisers.map((advertiser) => {
                    const rate = advertiser.impressions ? ((advertiser.clicks / advertiser.impressions) * 100).toFixed(1) : "0.0";
                    return (
                      <article key={advertiser.id}>
                        <div><strong>{advertiser.nameAr}</strong><small>{countries[advertiser.countryCode] ?? advertiser.countryCode.toUpperCase()}</small></div>
                        <span>{advertiser.impressions.toLocaleString("ar-EG")} ظهور</span>
                        <span>{advertiser.clicks.toLocaleString("ar-EG")} نقرة</span>
                        <b>{rate}% CTR</b>
                      </article>
                    );
                  })}
                </div>
              </section>

              <section className="admin-panel">
                <div className="admin-panel-title"><div><p>الأداء</p><h2>أفضل الحملات الإعلانية</h2></div></div>
                <div className="admin-analytics-list">
                  {data.topCampaigns.map((campaign) => {
                    const rate = campaign.impressions ? ((campaign.clicks / campaign.impressions) * 100).toFixed(1) : "0.0";
                    return (
                      <article key={campaign.id}>
                        <div><strong>{campaign.internalName}</strong><small>{campaign.advertiserName} • {statusLabels[campaign.status] ?? campaign.status}</small></div>
                        <span>{campaign.impressions.toLocaleString("ar-EG")} ظهور</span>
                        <span>{campaign.clicks.toLocaleString("ar-EG")} نقرة</span>
                        <b>{rate}% CTR</b>
                      </article>
                    );
                  })}
                </div>
              </section>
            </div>
          </>
        )}
    </>
  );
}
