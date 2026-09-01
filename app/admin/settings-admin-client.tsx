"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Settings = {
  serviceCommissionPercent: number;
  adPricing: { currency: string; cpc: number; monthly: Record<string, number> };
};

const PLACEMENT_LABELS: Array<[string, string]> = [
  ["HERO", "الهيرو (الرئيسي)"],
  ["LEFT_01", "جانبي يسار 1"],
  ["LEFT_02", "جانبي يسار 2"],
  ["RIGHT_01", "جانبي يمين 1"],
  ["RIGHT_02", "جانبي يمين 2"],
  ["BOTTOM_01", "سفلي 1"],
  ["BOTTOM_02", "سفلي 2"],
  ["BOTTOM_03", "سفلي 3"],
];

const CURRENCIES = ["SAR", "OMR", "AED", "USD", "TRY"];

export default function SettingsAdminClient() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetch("/api/admin/platform-settings", { cache: "no-store" })
        .then((response) => response.json())
        .then((data) => { if (data.settings) setSettings(data.settings); })
        .catch(() => setMessage("تعذر تحميل الإعدادات"));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/platform-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "تعذر الحفظ");
      if (data.settings) setSettings(data.settings);
      setMessage("تم حفظ الإعدادات ✓");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر الحفظ");
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm font-bold outline-none focus:border-[var(--color-primary)]";

  return (
    <>
      <header className="advertiser-admin-header">
        <div><p>إعدادات النظام</p><h1>إعدادات المنصة</h1></div>
        <div className="admin-header-actions"><Link href="/" target="_blank">معاينة الموقع ↗</Link></div>
      </header>

      {message && <p className="mb-4 rounded-xl bg-[var(--color-primary-soft)] px-4 py-2.5 text-sm font-bold text-[var(--color-primary)]" role="status">{message}</p>}

      {!settings ? (
        <div className="h-48 animate-pulse rounded-2xl bg-[var(--color-surface-muted)]" />
      ) : (
        <div className="space-y-6" dir="rtl">
          <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
            <h2 className="text-lg font-black text-[var(--color-text-primary)]">عمولة الخدمات</h2>
            <p className="mb-4 text-xs text-[var(--color-text-muted)]">نسبة المنصة من قيمة كل مهمة خدمات مكتملة. تُطبَّق على المهام الجديدة فور الحفظ.</p>
            <label className="block max-w-xs text-xs font-black text-[var(--color-text-secondary)]">
              النسبة المئوية (%)
              <input
                type="number" min={0} max={100} step={0.1}
                value={settings.serviceCommissionPercent}
                onChange={(e) => setSettings({ ...settings, serviceCommissionPercent: Number(e.target.value) })}
                className={`${inputCls} mt-1`}
              />
            </label>
          </section>

          <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
            <h2 className="text-lg font-black text-[var(--color-text-primary)]">تسعير الإعلانات</h2>
            <p className="mb-4 text-xs text-[var(--color-text-muted)]">اضبط عملة الفوترة، وسعر النقرة (CPC)، والسعر الشهري الثابت لكل موضع. تُستخدم هذه الأسعار في احتساب تكلفة الحملات.</p>
            <div className="mb-5 grid max-w-md grid-cols-2 gap-4">
              <label className="block text-xs font-black text-[var(--color-text-secondary)]">
                العملة
                <select
                  value={settings.adPricing.currency}
                  onChange={(e) => setSettings({ ...settings, adPricing: { ...settings.adPricing, currency: e.target.value } })}
                  className={`${inputCls} mt-1`}
                >
                  {CURRENCIES.map((code) => <option key={code} value={code}>{code}</option>)}
                </select>
              </label>
              <label className="block text-xs font-black text-[var(--color-text-secondary)]">
                سعر النقرة CPC ({settings.adPricing.currency})
                <input
                  type="number" min={0} step={0.01}
                  value={settings.adPricing.cpc}
                  onChange={(e) => setSettings({ ...settings, adPricing: { ...settings.adPricing, cpc: Number(e.target.value) } })}
                  className={`${inputCls} mt-1`}
                />
              </label>
            </div>
            <h3 className="mb-2 text-sm font-black text-[var(--color-text-secondary)]">السعر الشهري الثابت لكل موضع ({settings.adPricing.currency})</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {PLACEMENT_LABELS.map(([key, label]) => (
                <label key={key} className="block text-xs font-black text-[var(--color-text-secondary)]">
                  {label}
                  <input
                    type="number" min={0} step={1}
                    value={settings.adPricing.monthly[key] ?? 0}
                    onChange={(e) => setSettings({ ...settings, adPricing: { ...settings.adPricing, monthly: { ...settings.adPricing.monthly, [key]: Number(e.target.value) } } })}
                    className={`${inputCls} mt-1`}
                  />
                </label>
              ))}
            </div>
          </section>

          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="rounded-xl bg-[var(--color-primary)] px-8 py-3 text-sm font-black text-white transition hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
          >
            {saving ? "جارٍ الحفظ..." : "حفظ الإعدادات"}
          </button>
        </div>
      )}
    </>
  );
}
