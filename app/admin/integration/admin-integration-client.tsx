"use client";

import { useEffect, useMemo, useState } from "react";
import { MonitorSmartphone, Radar } from "lucide-react";

import PageHeader from "@/src/components/ui/PageHeader";
import Badge from "@/src/components/ui/Badge";
import Card, { CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/Card";
import { ErrorState } from "@/src/components/ui/Feedback";
import OfficeSubscriptionsPanel from "./office-subscriptions-panel";
import OfficeNotificationsPanel from "./office-notifications-panel";
import IntegrationStats, { STAT_ICONS, type IntegrationStat } from "./components/IntegrationStats";
import IntegrationCard, { IntegrationCardSkeleton } from "./components/IntegrationCard";
import EmptyIntegrationsState from "./components/EmptyIntegrationsState";
import type { IntegrationStatus } from "./components/IntegrationStatusBadge";

type AggregatedRow = Record<string, unknown>;
type Overview = { devices: AggregatedRow[]; syncs: AggregatedRow[]; radars: AggregatedRow[]; deliveries: AggregatedRow[]; rules: AggregatedRow[] };

/** "2026-09-05 12:36:42" → "2026-09-05 12:36"; anything unparseable is shown as-is. */
function fmtTime(v: unknown): string | null {
  const s = String(v ?? "").trim();
  if (!s || s === "—") return null;
  const m = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/.exec(s);
  return m ? `${m[1]} ${m[2]}` : s;
}

const str = (v: unknown) => String(v ?? "");

/** A device is the integration; its status word comes from what the platform recorded for it. */
function deviceStatus(d: AggregatedRow): IntegrationStatus {
  const s = str(d.status).toLowerCase();
  if (s === "active") return "connected";
  if (s === "revoked" || s === "blocked") return "error";
  if (s === "pending") return "needs_setup";
  return "disconnected";
}

const SYNC_TONE: Record<string, "success" | "danger" | "neutral" | "warning"> = { synced: "success", conflict: "danger", failed: "danger", pending: "warning" };

export default function AdminIntegrationClient() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState("");

  // Unchanged: one overview fetch, aborted on unmount.
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

  const loading = !data && !error;
  const devices = data?.devices ?? [];
  const activeCount = devices.filter((d) => deviceStatus(d) === "connected").length;

  // Syncs keyed by device, so each card can show its own without a second request.
  const syncsByDevice = useMemo(() => {
    const map = new Map<string, AggregatedRow[]>();
    for (const op of data?.syncs ?? []) {
      const id = str(op.device_id);
      if (!map.has(id)) map.set(id, []);
      map.get(id)!.push(op);
    }
    return map;
  }, [data]);

  const latestSync = useMemo(() => {
    const times = (data?.syncs ?? []).map((s) => str(s.created_at)).filter(Boolean).sort();
    return times.length ? fmtTime(times[times.length - 1]) : null;
  }, [data]);

  const stats: IntegrationStat[] = [
    { key: "active", label: "التكاملات النشطة", value: data ? activeCount : null, tone: "success", icon: STAT_ICONS.active },
    { key: "inactive", label: "التكاملات غير المفعّلة", value: data ? devices.length - activeCount : null, tone: "neutral", icon: STAT_ICONS.inactive },
    { key: "lastSync", label: "آخر عملية مزامنة", value: latestSync, tone: "primary", icon: STAT_ICONS.lastSync, hint: data && !latestSync ? "لم تُسجَّل مزامنة بعد" : undefined },
    {
      key: "system", label: "حالة النظام العامة",
      value: error ? "خطأ" : data ? (activeCount > 0 ? "متصل" : "لا اتصال") : null,
      tone: error ? "danger" : activeCount > 0 ? "success" : "warning", icon: STAT_ICONS.system,
    },
  ];

  return (
    <div className="admin-page" dir="rtl">
      <PageHeader
        title="التكاملات"
        description="إدارة ربط المنصة بالخدمات والأنظمة الخارجية"
        actions={
          <Badge variant={activeCount > 0 ? "success" : "neutral"} aria-label={`المتصل ${activeCount} من ${devices.length}`}>
            <span dir="ltr">{data ? `${activeCount} / ${devices.length}` : "—"}</span>
            <span>المتصل / الإجمالي</span>
          </Badge>
        }
      />

      <IntegrationStats stats={stats} loading={loading} />

      {/* ---- the integrations themselves: one card per connected office app ---- */}
      <section aria-labelledby="integrations-heading" className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="integrations-heading" className="text-base font-black text-[color:var(--color-text-primary)]">تطبيقات المكاتب المتصلة</h2>
          {data && devices.length > 0 && <span className="text-xs text-[color:var(--color-text-secondary)]">{devices.length} تكامل</span>}
        </div>
        {error ? (
          <ErrorState title="تعذّر تحميل التكاملات" description={error} />
        ) : loading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-label="جارٍ تحميل التكاملات">
            {Array.from({ length: 3 }).map((_, i) => <IntegrationCardSkeleton key={i} />)}
          </div>
        ) : devices.length === 0 ? (
          <EmptyIntegrationsState />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {devices.map((device) => {
              const id = str(device.id);
              const ops = syncsByDevice.get(id) ?? [];
              const lastOp = ops.map((o) => str(o.created_at)).filter(Boolean).sort().pop();
              const conflicts = ops.filter((o) => str(o.status) === "conflict").length;
              return (
                <IntegrationCard
                  key={id}
                  icon={<MonitorSmartphone className="size-6" aria-hidden="true" />}
                  name={str(device.device_name) || "جهاز مكتب"}
                  description="التطبيق المكتبي لـ AkarProMax — نشر العقارات والمزامنة مع المنصة."
                  status={deviceStatus(device)}
                  lastSync={fmtTime(lastOp ?? device.last_seen_at)}
                  meta={[
                    { label: "الحساب المرتبط", value: str(device.sponsor_id) || "—", dir: "ltr" },
                    { label: "الإصدار", value: device.app_version ? `v${str(device.app_version)}` : "—", dir: "ltr" },
                    { label: "النظام", value: [str(device.os), str(device.os_version)].filter(Boolean).join(" ") || "—", dir: "ltr" },
                    { label: "آخر اتصال", value: fmtTime(device.last_seen_at) ?? "—", dir: "ltr" },
                  ]}
                  notice={conflicts > 0 ? { tone: "danger", text: `${conflicts} عملية مزامنة بتعارض تحتاج مراجعة` } : null}
                  setupHref="#office-notifications"
                  details={
                    ops.length === 0 ? (
                      <p className="text-[color:var(--color-text-secondary)]">لا توجد عمليات مزامنة لهذا الجهاز.</p>
                    ) : (
                      <ul className="divide-y divide-[color:var(--color-border)]">
                        {ops.slice(0, 8).map((op) => (
                          <li key={str(op.id)} className="flex flex-wrap items-center justify-between gap-2 py-1.5">
                            <span className="font-semibold text-[color:var(--color-text-primary)]" dir="ltr">{str(op.operation_type)}</span>
                            <span className="flex items-center gap-2">
                              <Badge variant={SYNC_TONE[str(op.status)] ?? "neutral"}>{str(op.status)}</Badge>
                              <span className="text-[color:var(--color-text-secondary)]">محاولات: {str(op.attempts)}</span>
                              {op.conflict_reason ? <span className="text-[color:var(--color-danger)]">{str(op.conflict_reason)}</span> : null}
                            </span>
                          </li>
                        ))}
                        {ops.length > 8 && <li className="pt-1.5 text-[color:var(--color-text-secondary)]">و{ops.length - 8} عملية أخرى…</li>}
                      </ul>
                    )
                  }
                />
              );
            })}
          </div>
        )}
      </section>

      <div className="mt-8">
        <OfficeSubscriptionsPanel />
      </div>

      <div id="office-notifications" className="mt-6 scroll-mt-6">
        <OfficeNotificationsPanel />
      </div>

      {/* ---- radar: recent geo scans, secondary ---- */}
      <Card className="mt-6 rounded-2xl">
        <CardHeader className="flex flex-row items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[color:color-mix(in_oklab,var(--color-primary),transparent_88%)] text-[color:var(--color-primary)]" aria-hidden="true"><Radar className="size-5" /></span>
          <div>
            <CardTitle>آخر عمليات الرادار</CardTitle>
            <CardDescription>عمليات المسح الجغرافي التي طلبتها التطبيقات المكتبية.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-[color:var(--color-text-secondary)]">جارٍ التحميل…</p>
          ) : !data || data.radars.length === 0 ? (
            <p className="text-sm text-[color:var(--color-text-secondary)]">لا توجد عمليات مسح رادار.</p>
          ) : (
            <div className="overflow-x-auto">
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
                    <tr key={str(radar.id)}>
                      <td>{str(radar.kind)}</td>
                      <td dir="ltr">{Number(radar.latitude).toFixed(3)}, {Number(radar.longitude).toFixed(3)}</td>
                      <td>{str(radar.radius_km)} كم</td>
                      <td>{str(radar.matched_count)}</td>
                      <td dir="ltr">{fmtTime(radar.created_at) ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
