"use client";

import { useCallback, useEffect, useState } from "react";
import { visibleAdminPlacements, AD_PLACEMENTS, DEVICE_TYPES } from "@/src/constants/advertising";

/**
 * Ad preview simulator and campaign conflict report.
 *
 * Both read from /api/admin/ads/simulate, which runs the production eligibility
 * and selection engines. Nothing here re-implements a matching rule: this panel
 * only renders what the engine reports, so it cannot drift away from what
 * visitors actually see.
 */

type SimulatedCampaign = {
  campaignId: string;
  internalName: string;
  advertiserName: string;
  eligible: boolean;
  reason: string | null;
  reasonLabel: { ar: string; en: string } | null;
  priority: number;
  weight: number;
  competing: boolean;
  trafficShare: number;
};

type Simulation = {
  evaluated: number;
  eligibleCount: number;
  competingCount: number;
  campaigns: SimulatedCampaign[];
};

type Conflict = {
  type: string;
  severity: "blocked" | "warning";
  placement: string;
  campaignIds: string[];
  message: { ar: string; en: string };
};

const COUNTRIES: [string, string][] = [
  ["om", "عُمان"], ["sa", "السعودية"], ["ae", "الإمارات"], ["qa", "قطر"],
  ["kw", "الكويت"], ["bh", "البحرين"], ["tr", "تركيا"], ["ps", "فلسطين"],
];
const LANGUAGES: [string, string][] = [["ar", "العربية"], ["en", "English"], ["tr", "Türkçe"]];
const DEVICE_LABELS: Record<string, string> = { desktop: "كمبيوتر", tablet: "جهاز لوحي", mobile: "هاتف" };

function percent(share: number): string {
  return `${Math.round(share * 1000) / 10}%`;
}

export default function SimulatorPanel() {
  const placements = visibleAdminPlacements();
  const [placement, setPlacement] = useState(placements[0]?.key ?? "web_home_hero");
  const [countryCode, setCountryCode] = useState("om");
  const [language, setLanguage] = useState("ar");
  const [deviceType, setDeviceType] = useState("desktop");
  const [at, setAt] = useState("");
  const [result, setResult] = useState<Simulation | null>(null);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const meta = AD_PLACEMENTS[placement];

  const run = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/ads/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          placement,
          countryCode,
          language,
          deviceType,
          section: meta?.sections?.[0],
          at: at || undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? "تعذر تشغيل المحاكاة");
      setResult(data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر تشغيل المحاكاة");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [placement, countryCode, language, deviceType, at, meta]);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/admin/ads/simulate")
      .then((response) => response.json())
      .then((data) => { if (!cancelled) setConflicts(Array.isArray(data?.conflicts) ? data.conflicts : []); })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  const blocked = conflicts.filter((conflict) => conflict.severity === "blocked");
  const warnings = conflicts.filter((conflict) => conflict.severity === "warning");

  return (
    <section className="ads-panel ads-simulator">
      <header className="ads-panel-title">
        <div>
          <h2>محاكي عرض الإعلان</h2>
          <p>يشغّل محرك الأهلية والاختيار نفسه الذي يخدم الزوّار — لا محاكاة منفصلة.</p>
        </div>
      </header>

      {(blocked.length > 0 || warnings.length > 0) && (
        <div className="ads-conflicts">
          <h3>تعارضات الحملات</h3>
          {blocked.map((conflict, index) => (
            <p key={`b${index}`} className="ads-conflict ads-conflict-blocked" role="alert">
              <span aria-hidden="true">■</span>{conflict.message.ar}
            </p>
          ))}
          {warnings.map((conflict, index) => (
            <p key={`w${index}`} className="ads-conflict ads-conflict-warning">
              <span aria-hidden="true">▲</span>{conflict.message.ar}
            </p>
          ))}
        </div>
      )}

      <div className="ads-form-grid">
        <label>الموضع
          <select value={placement} onChange={(event) => setPlacement(event.target.value)}>
            {placements.map((item) => (
              <option key={item.key} value={item.key}>{item.label.ar}</option>
            ))}
          </select>
        </label>
        <label>الدولة
          <select value={countryCode} onChange={(event) => setCountryCode(event.target.value)}>
            {COUNTRIES.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
          </select>
        </label>
        <label>اللغة
          <select value={language} onChange={(event) => setLanguage(event.target.value)}>
            {LANGUAGES.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
          </select>
        </label>
        <label>الجهاز
          <select value={deviceType} onChange={(event) => setDeviceType(event.target.value)}>
            {DEVICE_TYPES.map((device) => <option key={device} value={device}>{DEVICE_LABELS[device] ?? device}</option>)}
          </select>
        </label>
        <label>التاريخ والوقت (اختياري)
          <input type="datetime-local" value={at} onChange={(event) => setAt(event.target.value)} />
        </label>
      </div>

      <button type="button" className="ads-simulator-run" disabled={loading} onClick={() => void run()}>
        {loading ? "جارٍ التشغيل..." : "شغّل المحاكاة"}
      </button>

      {error && <p className="ads-error" role="alert">{error}</p>}

      {result && (
        <>
          <p className="ads-simulator-summary">
            فُحصت <b>{result.evaluated}</b> حملة · مؤهلة <b>{result.eligibleCount}</b> · تتنافس فعلياً <b>{result.competingCount}</b>
          </p>
          {result.competingCount === 0 && (
            <div className="ads-empty">
              <span aria-hidden="true">◎</span>
              <strong>لا إعلان لهذا الموضع</strong>
              <p>لا توجد حملة مؤهلة بهذه المعطيات. السبب لكل حملة مذكور بالأسفل.</p>
            </div>
          )}
          <table className="ads-simulator-table">
            <thead>
              <tr>
                <th>الحملة</th><th>الأولوية</th><th>الوزن</th><th>نسبة الظهور</th><th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {result.campaigns.map((campaign) => (
                <tr key={campaign.campaignId} className={campaign.competing ? "is-competing" : ""}>
                  <td>
                    <strong>{campaign.internalName}</strong>
                    <small>{campaign.advertiserName}</small>
                  </td>
                  <td>{campaign.priority}</td>
                  <td>{campaign.weight}</td>
                  <td>{campaign.competing ? percent(campaign.trafficShare) : "—"}</td>
                  <td>
                    {campaign.competing
                      ? <span className="ads-badge ads-badge-approved">تتنافس</span>
                      : campaign.eligible
                        ? <span className="ads-badge ads-badge-pending">مؤهلة لكنها لا تفوز أبداً هنا</span>
                        : <span className="ads-badge ads-badge-rejected">{campaign.reasonLabel?.ar ?? campaign.reason}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}
