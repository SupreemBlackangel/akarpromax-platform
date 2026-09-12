"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Settings2 } from "lucide-react";

type OfficeRow = { sponsorId: string; version: number; updatedAt: string | null };

type OfficeSettings = {
  sponsorId: string;
  version: number;
  updatedAt: string | null;
  updatedByDeviceId: string | null;
  updatedByDeviceName: string | null;
  sections: Record<string, unknown>;
};

const SECTION_LABELS: Record<string, string> = {
  branding: "العلامة التجارية",
  system: "النظام",
  lists: "القوائم",
  savePaths: "مسارات الحفظ",
  backup: "النسخ الاحتياطي",
  license: "الترخيص",
  currencies: "العملات",
  siteIntegration: "تكامل الموقع",
};

/**
 * What an office has configured in its desktop app.
 *
 * Read-only on purpose: when a firm reports that its documents save to the
 * wrong folder or that the website shows an old phone number, the answer is in
 * these sections — but editing them here would change a firm's own settings
 * behind its back, and its desktop would overwrite the edit on its next save.
 */
export function OfficeSettingsPanel() {
  const [offices, setOffices] = useState<OfficeRow[]>([]);
  const [selected, setSelected] = useState("");
  const [settings, setSettings] = useState<OfficeSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadOffices = useCallback(async () => {
    setError("");
    try {
      const response = await fetch("/api/admin/office-settings", { cache: "no-store" });
      if (!response.ok) throw new Error(String(response.status));
      const body = (await response.json()) as { offices: OfficeRow[] };
      setOffices(body.offices ?? []);
    } catch {
      setError("تعذر تحميل قائمة المكاتب.");
    }
  }, []);

  useEffect(() => {
    // Fetch on mount, as the sibling panels in this directory do. The rule
    // guards against cascading renders from synchronous setState; this sets
    // state only after a network round-trip.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadOffices();
  }, [loadOffices]);

  const loadSettings = useCallback(async (sponsorId: string, isCurrent: () => boolean) => {
    if (!sponsorId) { setSettings(null); return; }
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `/api/admin/office-settings?sponsorId=${encodeURIComponent(sponsorId)}`,
        { cache: "no-store" },
      );
      if (!response.ok) throw new Error(String(response.status));
      const body = (await response.json()) as OfficeSettings;
      if (isCurrent()) setSettings(body);
    } catch {
      if (isCurrent()) setError("تعذر تحميل إعدادات هذا المكتب.");
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadSettings(selected, () => !cancelled);
    return () => { cancelled = true; };
  }, [loadSettings, selected]);

  return (
    <section className="admin-panel">
      <header className="admin-panel-head">
        <h2>
          <Settings2 size={18} aria-hidden="true" />
          إعدادات البرنامج
        </h2>
        <button type="button" className="admin-ghost-btn" onClick={() => void loadOffices()}>
          <RefreshCw size={14} aria-hidden="true" />
          تحديث
        </button>
      </header>

      <p className="admin-hint">
        للقراءة فقط. تعديلها من هنا يغيّر إعدادات مكتب دون علمه، وبرنامجه يكتب فوقها في أول مزامنة.
      </p>

      <label className="admin-field">
        <span>المكتب</span>
        <select value={selected} onChange={(event) => setSelected(event.target.value)}>
          <option value="">اختر مكتبًا…</option>
          {offices.map((office) => (
            <option key={office.sponsorId} value={office.sponsorId}>
              {office.sponsorId} — نسخة {office.version}
            </option>
          ))}
        </select>
      </label>

      {error && <p className="admin-error" role="alert">{error}</p>}
      {loading && <p className="admin-hint">جارٍ التحميل…</p>}

      {settings && !loading && (
        <>
          <dl className="admin-meta">
            <div><dt>النسخة</dt><dd dir="ltr">{settings.version}</dd></div>
            <div><dt>آخر حفظ</dt><dd dir="ltr">{settings.updatedAt ?? "—"}</dd></div>
            <div>
              <dt>الجهاز الذي حفظ</dt>
              <dd dir="ltr">{settings.updatedByDeviceName ?? settings.updatedByDeviceId ?? "—"}</dd>
            </div>
          </dl>

          {Object.entries(settings.sections).length === 0 && (
            <p className="admin-hint">لم يحفظ هذا المكتب أي إعدادات بعد.</p>
          )}

          {Object.entries(settings.sections).map(([section, value]) => (
            <details key={section} className="admin-details">
              <summary>{SECTION_LABELS[section] ?? section}</summary>
              <pre className="admin-pre" dir="ltr">{JSON.stringify(value, null, 2)}</pre>
            </details>
          ))}
        </>
      )}
    </section>
  );
}

export default OfficeSettingsPanel;
