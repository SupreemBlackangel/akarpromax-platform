"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { PlatformSettings } from "@/lib/platform-settings";
import type { DeviceDisplaySettings, DisplaySettings } from "@/src/config/display-settings";

type Settings = PlatformSettings;

const DEVICE_TABS: Array<[keyof DisplaySettings, string]> = [
  ["desktop", "الكومبيوتر"],
  ["mobile", "الجوال"],
];

const AD_BAND_LABELS: Array<[keyof DeviceDisplaySettings["ads"], string, string]> = [
  ["hero", "إعلان الهيرو", "الشريط العلوي العريض أعلى الصفحة"],
  ["side", "المساحات الجانبية", "أربع مساحات في العمودين الجانبيين — لا تُعرض عادةً على الجوال"],
  ["bottom", "المساحات السفلية", "ثلاث مساحات أسفل المحتوى"],
];

const CHROME_LABELS: Array<[Extract<keyof DeviceDisplaySettings, "showSidebar" | "showNewsTicker" | "showOfficePromo">, string, string]> = [
  ["showSidebar", "الشريط الجانبي العام", "قائمة التنقل الجانبية العائمة"],
  ["showNewsTicker", "شريط الأخبار", "الشريط المتحرك أسفل الهيدر"],
  ["showOfficePromo", "ترويج تطبيق المكاتب", "القسم الترويجي أسفل الصفحة"],
];

const THEME_LABELS: Array<[DeviceDisplaySettings["themeMode"], string]> = [
  ["system", "حسب النظام"],
  ["light", "فاتح"],
  ["dark", "داكن"],
];

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
  const [device, setDevice] = useState<keyof DisplaySettings>("desktop");
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

  /** Patches one field of the currently selected device's display set. */
  const patchDevice = (patch: Partial<DeviceDisplaySettings>) => {
    setSettings((current) =>
      current ? { ...current, display: { ...current.display, [device]: { ...current.display[device], ...patch } } } : current,
    );
  };

  const toggleCls = (on: boolean) =>
    `flex items-start gap-3 rounded-xl border p-3 text-right transition ${
      on
        ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]"
        : "border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-muted)]"
    }`;

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

          <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
            <h2 className="text-lg font-black text-[var(--color-text-primary)]">طريقة العرض</h2>
            <p className="mb-4 text-xs text-[var(--color-text-muted)]">
              لكل جهاز إعداداته الخاصة. الفاصل بين الجهازين هو عرض 1024 بكسل: أي شاشة أضيق تأخذ إعدادات الجوال، وتُطبَّق فورًا عند تغيير حجم النافذة.
            </p>

            <div className="mb-5 inline-flex rounded-xl border border-[var(--color-border)] p-1">
              {DEVICE_TABS.map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setDevice(key)}
                  className={`rounded-lg px-5 py-2 text-sm font-black transition ${
                    device === key ? "bg-[var(--color-primary)] text-white" : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <h3 className="mb-2 text-sm font-black text-[var(--color-text-secondary)]">المساحات الإعلانية</h3>
            <div className="mb-6 grid gap-3 sm:grid-cols-3">
              {AD_BAND_LABELS.map(([band, label, hint]) => {
                const on = settings.display[device].ads[band];
                return (
                  <button
                    key={band}
                    type="button"
                    aria-pressed={on}
                    onClick={() => patchDevice({ ads: { ...settings.display[device].ads, [band]: !on } })}
                    className={toggleCls(on)}
                  >
                    <span aria-hidden="true" className="mt-0.5 text-lg">{on ? "☑" : "☐"}</span>
                    <span className="min-w-0">
                      <span className="block text-sm font-black text-[var(--color-text-primary)]">{label}</span>
                      <span className="block text-[var(--text-xs)] font-bold text-[var(--color-text-muted)]">{hint}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            <h3 className="mb-2 text-sm font-black text-[var(--color-text-secondary)]">المظهر (الثيم)</h3>
            <div className="mb-6 grid max-w-lg gap-4 sm:grid-cols-2">
              <label className="block text-xs font-black text-[var(--color-text-secondary)]">
                الوضع الافتراضي للزائر
                <select
                  value={settings.display[device].themeMode}
                  onChange={(e) => patchDevice({ themeMode: e.target.value as DeviceDisplaySettings["themeMode"] })}
                  className={`${inputCls} mt-1`}
                >
                  {THEME_LABELS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <button
                type="button"
                aria-pressed={settings.display[device].allowThemeChange}
                onClick={() => patchDevice({ allowThemeChange: !settings.display[device].allowThemeChange })}
                className={`${toggleCls(settings.display[device].allowThemeChange)} mt-5 h-fit`}
              >
                <span aria-hidden="true" className="mt-0.5 text-lg">{settings.display[device].allowThemeChange ? "☑" : "☐"}</span>
                <span className="min-w-0">
                  <span className="block text-sm font-black text-[var(--color-text-primary)]">السماح للزائر بتغيير المظهر</span>
                  <span className="block text-[var(--text-xs)] font-bold text-[var(--color-text-muted)]">عند الإيقاف يُثبَّت الوضع الافتراضي ويُخفى زر المظهر</span>
                </span>
              </button>
            </div>

            <h3 className="mb-2 text-sm font-black text-[var(--color-text-secondary)]">عرض القوائم والكثافة</h3>
            <div className="mb-6 grid max-w-2xl gap-4 sm:grid-cols-3">
              <label className="block text-xs font-black text-[var(--color-text-secondary)]">
                شكل القوائم
                <select
                  value={settings.display[device].listingLayout}
                  onChange={(e) => patchDevice({ listingLayout: e.target.value as DeviceDisplaySettings["listingLayout"] })}
                  className={`${inputCls} mt-1`}
                >
                  <option value="grid">شبكة بطاقات</option>
                  <option value="list">قائمة بصف واحد</option>
                </select>
              </label>
              <label className="block text-xs font-black text-[var(--color-text-secondary)]">
                عدد الأعمدة
                <select
                  value={settings.display[device].listingColumns}
                  disabled={settings.display[device].listingLayout === "list"}
                  onChange={(e) => patchDevice({ listingColumns: Number(e.target.value) as DeviceDisplaySettings["listingColumns"] })}
                  className={`${inputCls} mt-1 disabled:opacity-50`}
                >
                  {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
              <label className="block text-xs font-black text-[var(--color-text-secondary)]">
                كثافة الواجهة
                <select
                  value={settings.display[device].density}
                  onChange={(e) => patchDevice({ density: e.target.value as DeviceDisplaySettings["density"] })}
                  className={`${inputCls} mt-1`}
                >
                  <option value="comfortable">مريحة</option>
                  <option value="compact">مضغوطة</option>
                </select>
              </label>
            </div>

            <h3 className="mb-2 text-sm font-black text-[var(--color-text-secondary)]">عناصر الواجهة</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              {CHROME_LABELS.map(([flag, label, hint]) => {
                const on = settings.display[device][flag];
                return (
                  <button
                    key={flag}
                    type="button"
                    aria-pressed={on}
                    onClick={() => patchDevice({ [flag]: !on } as Partial<DeviceDisplaySettings>)}
                    className={toggleCls(on)}
                  >
                    <span aria-hidden="true" className="mt-0.5 text-lg">{on ? "☑" : "☐"}</span>
                    <span className="min-w-0">
                      <span className="block text-sm font-black text-[var(--color-text-primary)]">{label}</span>
                      <span className="block text-[var(--text-xs)] font-bold text-[var(--color-text-muted)]">{hint}</span>
                    </span>
                  </button>
                );
              })}
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
