"use client";

import { useEffect, useState } from "react";

import OfficeSubscriptionsPanel from "./office-subscriptions-panel";
import OfficeNotificationsPanel from "./office-notifications-panel";

type AggregatedRow = Record<string, unknown>;

export default function AdminIntegrationClient() {
  const [data, setData] = useState<{
    devices: AggregatedRow[];
    syncs: AggregatedRow[];
    radars: AggregatedRow[];
    deliveries: AggregatedRow[];
    rules: AggregatedRow[];
  } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      fetch("/api/admin/integration-overview", { cache: "no-store", signal: controller.signal }).then((r) => r.json()),
    ])
      .then(([payload]) => {
        if (controller.signal.aborted) return;
        setData(payload);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError("تعذّر تحميل بيانات التكامل");
      });
    return () => controller.abort();
  }, []);

  if (error) {
    return <p className="admin-error">{error}</p>;
  }

  const statCards = [
    { label: "أجهزة مكتب", value: data?.devices.length ?? "…", tone: "blue" },
    { label: "عمليات مزامنة", value: data?.syncs.length ?? "…", tone: "green" },
    { label: "مسح رادار", value: data?.radars.length ?? "…", tone: "purple" },
    { label: "تنبيهات", value: data?.deliveries.length ?? "…", tone: "amber" },
    { label: "قواعد تنبيه", value: data?.rules.length ?? "…", tone: "gray" },
  ];

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <h1>مركز التكامل</h1>
        <p>أجهزة المكاتب المتصلة، المزامنة، الرادار الجغرافي، والتنبيهات عبر النظام بأكمله.</p>
      </div>

      <div className="admin-stat-grid">
        {statCards.map((card) => (
          <div key={card.label} className={`admin-stat-card tone-${card.tone}`}>
            <div className="admin-stat-value">{card.value}</div>
            <div className="admin-stat-label">{card.label}</div>
          </div>
        ))}
      </div>

      <OfficeSubscriptionsPanel />

      <OfficeNotificationsPanel />

      <section className="admin-panel">
        <div className="admin-panel-head">
          <h2>أجهزة المكاتب</h2>
        </div>
        {!data ? (
          <p className="admin-empty">جارٍ التحميل…</p>
        ) : data.devices.length === 0 ? (
          <p className="admin-empty">لا توجد أجهزة مسجلة بعد.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>الجهاز</th>
                <th>المعلن</th>
                <th>الحالة</th>
                <th>الإصدار</th>
                <th>آخر اتصال</th>
              </tr>
            </thead>
            <tbody>
              {data.devices.map((device) => (
                <tr key={String(device.id)}>
                  <td>{String(device.device_name ?? "") || "جهاز مكتب"}</td>
                  <td>{String(device.sponsor_id)}</td>
                  <td><span className={`badge badge-${device.status === "active" ? "success" : "muted"}`}>{String(device.status)}</span></td>
                  <td>app v{String(device.app_version ?? "?")}</td>
                  <td>{String(device.last_seen_at ?? "—")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="admin-panel">
        <div className="admin-panel-head">
          <h2>عمليات المزامنة (آخر 50)</h2>
        </div>
        {!data ? (
          <p className="admin-empty">جارٍ التحميل…</p>
        ) : data.syncs.length === 0 ? (
          <p className="admin-empty">لا توجد عمليات مزامنة.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>العملية</th>
                <th>الجهاز</th>
                <th>الحالة</th>
                <th>المحاولات</th>
                <th>التعارض</th>
              </tr>
            </thead>
            <tbody>
              {data.syncs.slice(0, 50).map((op) => (
                <tr key={String(op.id)}>
                  <td>{String(op.operation_type)}</td>
                  <td>{String(op.device_id).slice(0, 8)}…</td>
                  <td><span className={`badge badge-${op.status === "synced" ? "success" : op.status === "conflict" ? "danger" : "muted"}`}>{String(op.status)}</span></td>
                  <td>{String(op.attempts)}</td>
                  <td>{String(op.conflict_reason ?? "—")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="admin-panel">
        <div className="admin-panel-head">
          <h2>آخر عمليات الرادار</h2>
        </div>
        {!data ? (
          <p className="admin-empty">جارٍ التحميل…</p>
        ) : data.radars.length === 0 ? (
          <p className="admin-empty">لا توجد عمليات مسح رادار.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>النوع</th>
                <th>الموقع</th>
                <th>نصف القطر</th>
                <th>النتائج</th>
                <th>الوقت</th>
              </tr>
            </thead>
            <tbody>
              {data.radars.slice(0, 20).map((radar) => (
                <tr key={String(radar.id)}>
                  <td>{String(radar.kind)}</td>
                  <td>{Number(radar.latitude).toFixed(3)}, {Number(radar.longitude).toFixed(3)}</td>
                  <td>{String(radar.radius_km)} كم</td>
                  <td>{String(radar.matched_count)}</td>
                  <td>{String(radar.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
