"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import OfficeWorkspaceShell from "@/src/components/office/OfficeWorkspaceShell";
import { apiFetch } from "@services-client";

type DeviceRow = Record<string, unknown> & { id: string; status: string; device_name?: string | null };
type PairingRow = Record<string, unknown> & { id: string; status: string; expires_at: string };

export default function OfficeDevicesPage() {
  return (
    <Suspense>
      <OfficeDevicesPageInner />
    </Suspense>
  );
}

function OfficeDevicesPageInner() {
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") === "pairing" ? "pairing" : "devices";

  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [pairings, setPairings] = useState<PairingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState<{ code: string; expiresAt: string } | null>(null);
  const [notice, setNotice] = useState("");

  const load = useCallback((controller?: AbortController) => {
    return Promise.all([
      apiFetch<{ devices: DeviceRow[] }>("/api/office/v1/devices", { signal: controller?.signal }),
      apiFetch<{ codes: PairingRow[] }>("/api/office/v1/pairing", { signal: controller?.signal }),
    ])
      .then(([d, p]) => {
        if (controller?.signal.aborted) return;
        setDevices(d.devices ?? []);
        setPairings(p.codes ?? []);
      })
      .catch(() => {
        if (controller?.signal.aborted) return;
      })
      .finally(() => {
        if (!controller?.signal.aborted) setLoading(false);
      });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller);
    return () => controller.abort();
  }, [load]);

  const startPairing = async () => {
    try {
      const res = await apiFetch<{ code: string; expiresAt: string }>("/api/office/v1/pairing", {
        method: "POST",
        body: JSON.stringify({}),
      });
      setCode(res);
      setNotice("");
      void load();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "تعذّر إنشاء رمز الربط");
    }
  };

  const revoke = async (deviceId: string) => {
    if (!window.confirm("إلغاء ربط هذا الجهاز؟ سيتم سحب صلاحياته فورًا.")) return;
    try {
      await apiFetch("/api/office/v1/devices", {
        method: "PATCH",
        body: JSON.stringify({ deviceId, action: "revoke", reason: "manual" }),
      });
      void load();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "تعذّر إلغاء الربط");
    }
  };

  const copyCode = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code.code);
      setNotice("تم نسخ الرمز");
    } catch {
      setNotice(code.code);
    }
  };

  return (
    <OfficeWorkspaceShell activeTab="devices">
      {notice && (
        <div className="mb-4 rounded-xl border border-[var(--color-primary)]/30 bg-[var(--color-primary-soft)] px-4 py-2 text-sm font-bold text-[var(--color-primary)] dark:border-blue-800 dark:bg-[var(--color-primary-soft)]/30 dark:text-[var(--color-primary)]">
          {notice}
        </div>
      )}

      <div className="mb-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => window.location.assign("/dashboard/office/devices")}
          className={`rounded-xl px-4 py-2 text-sm font-bold ${
            activeTab === "devices"
              ? "bg-[var(--color-primary)] text-white"
              : "bg-[var(--color-surface)] text-gray-600 dark:bg-gray-900 dark:text-gray-300 border border-gray-200 dark:border-gray-800"
          }`}
        >
          الأجهزة
        </button>
        <button
          type="button"
          onClick={() => window.location.assign("/dashboard/office/devices?tab=pairing")}
          className={`rounded-xl px-4 py-2 text-sm font-bold ${
            activeTab === "pairing"
              ? "bg-[var(--color-primary)] text-white"
              : "bg-[var(--color-surface)] text-gray-600 dark:bg-gray-900 dark:text-gray-300 border border-gray-200 dark:border-gray-800"
          }`}
        >
          ربط جهاز جديد
        </button>
      </div>

      {activeTab === "pairing" ? (
        <div className="max-w-2xl rounded-2xl border border-gray-200 bg-[var(--color-surface)] p-6 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="font-black text-gray-900 dark:text-[var(--color-text-primary)]">ربط تطبيق المكتب</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            أنشئ رمز ربط لمرة واحدة (صالح 15 دقيقة). أدخله في تطبيق AkarPromax Office على الجهاز.
            لا يُستخدم الرمز للمصادقة الدائمة — يتسلم الجهاز رمزًا مخولًا بصلاحيات محدودة.
          </p>

          <button
            type="button"
            onClick={() => void startPairing()}
            className="mt-4 rounded-xl bg-[var(--color-primary)] px-5 py-2.5 text-sm font-black text-white transition hover:bg-[var(--color-primary-hover)]"
          >
            {code ? "إنشاء رمز جديد" : "إنشاء رمز الربط"}
          </button>

          {code && (
            <div className="mt-5 rounded-2xl border-2 border-dashed border-[var(--color-primary)]/30 bg-[var(--color-primary-soft)] p-6 text-center dark:border-blue-700 dark:bg-[var(--color-primary-soft)]/20">
              <p className="text-xs font-black uppercase tracking-widest text-[var(--color-primary)] dark:text-[var(--color-primary)]">رمز الربط</p>
              <p className="mt-2 select-all text-4xl font-black tracking-[0.4em] text-blue-800 dark:text-blue-200">{code.code}</p>
              <p className="mt-2 text-xs font-bold text-[var(--color-primary)] dark:text-[var(--color-primary)]">صالح حتى {code.expiresAt}</p>
              <button
                type="button"
                onClick={() => void copyCode()}
                className="mt-3 rounded-lg bg-[var(--color-primary)] px-4 py-1.5 text-xs font-black text-white hover:bg-[var(--color-primary-hover)]"
              >
                نسخ الرمز
              </button>
            </div>
          )}

          {pairings.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-2 text-sm font-black text-gray-700 dark:text-gray-300">الرموز السابقة</h3>
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {pairings.slice(0, 6).map((row) => (
                  <li key={row.id} className="flex items-center justify-between py-2 text-sm">
                    <span className="text-gray-500 dark:text-gray-400">{row.status} · {row.expires_at}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-[var(--color-surface)] dark:border-gray-800 dark:bg-gray-900">
          <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
            <h2 className="font-black text-gray-900 dark:text-[var(--color-text-primary)]">الأجهزة المتصلة</h2>
          </div>
          {loading ? (
            <p className="px-5 py-10 text-center text-sm text-gray-500">جارٍ التحميل…</p>
          ) : devices.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
              لا توجد أجهزة بعد. انتقل إلى «ربط جهاز جديد» لإنشاء رمز ربط.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {devices.map((device) => (
                <li key={device.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 dark:text-[var(--color-text-primary)]">{String(device.device_name ?? "") || "جهاز مكتب"}</p>
                    <p className="text-xs text-gray-400">
                      {String(device.os ?? "OS")} {String(device.os_version ?? "")} · app v{String(device.app_version ?? "?")} · proto v{String(device.protocol_version ?? 1)}
                    </p>
                    <p className="text-xs text-gray-400">آخر اتصال: {String(device.last_seen_at ?? "—")} · IP {String(device.last_ip ?? "—")}</p>
                    <p className="text-xs text-gray-400">تاريخ الربط: {String(device.created_at ?? "—")}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${
                        device.status === "active"
                          ? "bg-emerald-100 text-[var(--color-success)] dark:bg-[var(--color-success-soft)]/40 dark:text-[var(--color-success)]"
                          : "bg-red-100 text-[var(--color-error)] dark:bg-red-900/40 dark:text-[var(--color-error)]"
                      }`}
                    >
                      {device.status}
                    </span>
                    {device.status === "active" && (
                      <button
                        type="button"
                        onClick={() => void revoke(device.id)}
                        className="rounded-lg border border-[var(--color-error)]/30 px-3 py-1 text-xs font-bold text-red-600 hover:bg-[var(--color-error-soft)] dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                      >
                        إلغاء الربط
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </OfficeWorkspaceShell>
  );
}
