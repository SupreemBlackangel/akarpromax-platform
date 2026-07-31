"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { roleNameAr } from "@/src/constants/roles";

type Identity = {
  email: string | null;
  displayName: string;
  role: string;
  countryCode: string | null;
  permissions: string[];
};

type TimelineEntry = { day: string; sponsorImpressions: number; sponsorClicks: number; adImpressions: number; adClicks: number };
type TopSponsor = { id: string; nameAr: string; countryCode: string; impressions: number; clicks: number };
type TopCampaign = { id: string; internalName: string; advertiserName: string; status: string; impressions: number; clicks: number };

type Analytics = {
  identity: Identity;
  timeline: TimelineEntry[];
  topSponsors: TopSponsor[];
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

export default function ReportsAdminClient({
  initialUser,
}: {
  initialUser: { email: string; displayName: string };
}) {
  const [identity, setIdentity] = useState<Identity>({
    email: initialUser.email,
    displayName: initialUser.displayName,
    role: "viewer",
    countryCode: null,
    permissions: [],
  });
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
        setIdentity(result.identity);
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
      sponsorImpressions: acc.sponsorImpressions + entry.sponsorImpressions,
      sponsorClicks: acc.sponsorClicks + entry.sponsorClicks,
      adImpressions: acc.adImpressions + entry.adImpressions,
      adClicks: acc.adClicks + entry.adClicks,
    }),
    { sponsorImpressions: 0, sponsorClicks: 0, adImpressions: 0, adClicks: 0 },
  ) : null;

  const maxDaily = data ? Math.max(1, ...data.timeline.map((entry) => Math.max(entry.sponsorImpressions, entry.adImpressions))) : 1;

  return (
    <main className="sponsor-admin" dir="rtl">
      <aside className="sponsor-admin-sidebar">
        <Link className="admin-brand" href="/admin"><span>A</span><div><strong>عقار بروماكس</strong><small>Admin Control</small></div></Link>
        <nav aria-label="لوحة التحكم">
          <Link href="/admin" style={{ display: "flex", alignItems: "center", gap: 11, minHeight: 42, padding: "9px 12px", borderRadius: 9, color: "#6b7b93", textDecoration: "none" }}><span style={{ width: 20, color: "#1769ff", fontSize: 16, textAlign: "center" }}>≡</span>لوحة الإحصاءات</Link>
        </nav>
        <div className="admin-user-card">
          <span>{identity.displayName.slice(0, 1).toUpperCase()}</span>
          <div><strong>{identity.displayName}</strong><small>{roleNameAr(identity.role)}</small></div>
        </div>
      </aside>

      <section className="sponsor-admin-canvas">
        <header className="sponsor-admin-header">
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
              <article><span>انطباعات الرعاة</span><strong>{totals?.sponsorImpressions.toLocaleString("ar-EG") ?? 0}</strong><small>آخر 14 يومًا</small></article>
              <article><span>نقرات الرعاة</span><strong>{totals?.sponsorClicks.toLocaleString("ar-EG") ?? 0}</strong><small>آخر 14 يومًا</small></article>
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
                      <div className="reports-chart-col" key={entry.day} title={`${entry.day}\nرعاة: ${entry.sponsorImpressions}\nإعلانات: ${entry.adImpressions}`}>
                        <div className="reports-chart-bars">
                          <i className="sponsor-bar" style={{ height: `${(entry.sponsorImpressions / maxDaily) * 100}%` }} />
                          <i className="ad-bar" style={{ height: `${(entry.adImpressions / maxDaily) * 100}%` }} />
                        </div>
                        <span>{label}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="reports-legend"><span><i className="sponsor-bar" />رعاة</span><span><i className="ad-bar" />إعلانات</span></div>
              </section>

              <section className="admin-panel">
                <div className="admin-panel-title"><div><p>الأداء</p><h2>أفضل الرعاة</h2></div></div>
                <div className="admin-analytics-list">
                  {data.topSponsors.map((sponsor) => {
                    const rate = sponsor.impressions ? ((sponsor.clicks / sponsor.impressions) * 100).toFixed(1) : "0.0";
                    return (
                      <article key={sponsor.id}>
                        <div><strong>{sponsor.nameAr}</strong><small>{countries[sponsor.countryCode] ?? sponsor.countryCode.toUpperCase()}</small></div>
                        <span>{sponsor.impressions.toLocaleString("ar-EG")} ظهور</span>
                        <span>{sponsor.clicks.toLocaleString("ar-EG")} نقرة</span>
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
      </section>
    </main>
  );
}
