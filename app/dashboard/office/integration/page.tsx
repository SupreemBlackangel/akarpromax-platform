"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import OfficeWorkspaceShell from "@/src/components/office/OfficeWorkspaceShell";
import { apiFetch } from "@services-client";

type DeviceRow = Record<string, unknown> & { id: string; status: string; device_name?: string | null };
type SyncRow = Record<string, unknown> & { id: string; status: string; operation_type: string };
type RadarRow = Record<string, unknown> & { id: string; matched_count: number; kind: string };
type DeliveryRow = Record<string, unknown> & { id: string; status: string };

export default function OfficeIntegrationPage() {
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [syncs, setSyncs] = useState<SyncRow[]>([]);
  const [radars, setRadars] = useState<RadarRow[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      apiFetch<{ devices: DeviceRow[] }>("/api/office/v1/devices", { signal: controller.signal }),
      apiFetch<{ operations: SyncRow[] }>("/api/office/v1/sync?action=operations", { signal: controller.signal }),
      apiFetch<{ queries: RadarRow[] }>("/api/office/v1/radar", { signal: controller.signal }),
      apiFetch<{ deliveries: DeliveryRow[] }>("/api/office/v1/notifications", { signal: controller.signal }),
    ])
      .then(([d, s, r, n]) => {
        if (controller.signal.aborted) return;
        setDevices(d.devices ?? []);
        setSyncs(s.operations ?? []);
        setRadars(r.queries ?? []);
        setDeliveries(n.deliveries ?? []);
      })
      .catch(() => {
        /* demo fallback */
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  const activeDevices = devices.filter((d) => d.status === "active").length;
  const syncedCount = syncs.filter((s) => s.status === "synced").length;
  const conflictCount = syncs.filter((s) => s.status === "conflict").length;
  const pendingDeliveries = deliveries.filter((d) => d.status === "queued").length;

  const statCards = [
    { label: "الأجهزة النشطة", value: activeDevices, icon: "💻", href: "/dashboard/office/devices", tone: "blue" },
    { label: "عمليات مزامنة ناجحة", value: syncedCount, icon: "🔄", href: "/dashboard/office/sync", tone: "green" },
    { label: "تعارضات", value: conflictCount, icon: "⚖", href: "/dashboard/office/sync?status=conflict", tone: "red" },
    { label: "مسح رادار", value: radars.length, icon: "📡", href: "/dashboard/office/radar", tone: "purple" },
    { label: "تنبيهات معلّقة", value: pendingDeliveries, icon: "🔔", href: "/dashboard/office/notifications", tone: "amber" },
  ];

  const toneClasses: Record<string, string> = {
    blue: "bg-[var(--color-primary-soft)] text-[var(--color-primary)] dark:bg-[var(--color-primary-soft)]/40 dark:text-[var(--color-primary)]",
    green: "bg-emerald-100 text-[var(--color-success)] dark:bg-[var(--color-success-soft)]/40 dark:text-[var(--color-success)]",
    red: "bg-red-100 text-[var(--color-error)] dark:bg-red-900/40 dark:text-[var(--color-error)]",
    purple: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
    amber: "bg-amber-100 text-[var(--accent)] dark:bg-amber-900/40 dark:text-[var(--accent)]",
  };

  return (
    <OfficeWorkspaceShell activeTab="overview">
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {statCards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="rounded-2xl border border-gray-200 bg-[var(--color-surface)] p-4 shadow-sm transition hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
          >
            <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl text-lg ${toneClasses[card.tone]}`}>
              {card.icon}
            </div>
            <p className="text-2xl font-black text-gray-900 dark:text-[var(--color-text-primary)]">{loading ? "…" : card.value}</p>
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400">{card.label}</p>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-gray-200 bg-[var(--color-surface)] p-5 dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-black text-gray-900 dark:text-[var(--color-text-primary)]">أحدث الأجهزة</h2>
            <Link href="/dashboard/office/devices" className="text-xs font-bold text-[var(--color-primary)] dark:text-[var(--color-primary)] hover:underline">
              إدارة
            </Link>
          </div>
          {devices.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
              لا توجد أجهزة بعد — ابدأ بعملية ربط لربط تطبيق المكتب.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {devices.slice(0, 5).map((device) => (
                <li key={device.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-sm font-bold text-gray-800 dark:text-gray-200">
                      {String(device.device_name ?? "") || "جهاز مكتب"}
                    </p>
                    <p className="text-xs text-gray-400">{String(device.os ?? "unknown")} · {String(device.last_seen_at ?? "—")}</p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${
                      device.status === "active"
                        ? "bg-emerald-100 text-[var(--color-success)] dark:bg-[var(--color-success-soft)]/40 dark:text-[var(--color-success)]"
                        : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                    }`}
                  >
                    {device.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-gray-200 bg-[var(--color-surface)] p-5 dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-black text-gray-900 dark:text-[var(--color-text-primary)]">آخر التنبيهات</h2>
            <Link href="/dashboard/office/notifications" className="text-xs font-bold text-[var(--color-primary)] dark:text-[var(--color-primary)] hover:underline">
              الكل
            </Link>
          </div>
          {deliveries.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">لا توجد تنبيهات بعد.</p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {deliveries.slice(0, 5).map((delivery) => (
                <li key={delivery.id} className="py-2.5">
                  <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{String(delivery.title ?? delivery.event_type)}</p>
                  <p className="text-xs text-gray-400">
                    {String(delivery.channel ?? "—")} · {String(delivery.status ?? "—")} · {String(delivery.created_at ?? "—")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </OfficeWorkspaceShell>
  );
}
