"use client";

import { useCallback, useEffect, useState } from "react";

type Delivery = {
  id: string;
  sponsorId: string;
  eventType: string;
  title: string;
  body: string;
  link: string | null;
  status: string;
  createdAt: string;
  deliveredAt: string | null;
};

const EVENT_LABELS: Record<string, string> = {
  "admin.announcement": "إعلان إداري",
  "message.new": "رسالة جديدة",
  "ad.approved": "اعتماد إعلان",
  "ad.rejected": "رفض إعلان",
  "subscription.updated": "تحديث اشتراك",
};

const STATUS_LABELS: Record<string, { tone: string; label: string }> = {
  queued: { tone: "warning", label: "بانتظار الفتح" },
  delivered: { tone: "success", label: "قُرئ" },
  deferred: { tone: "muted", label: "مؤجل" },
  failed: { tone: "danger", label: "فشل" },
};

/**
 * Announcements to the desktop applications, and what reached them.
 *
 * Reuses the admin panel/table styles of this page. The recipient list is the
 * offices that hold an active desktop device — the only ones a notification
 * can reach.
 */
export default function OfficeNotificationsPanel() {
  const [sponsors, setSponsors] = useState<string[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[] | null>(null);
  const [draft, setDraft] = useState({ sponsorId: "", title: "", body: "", link: "" });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/office-notifications", { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const payload = (await res.json()) as { sponsors: string[]; deliveries: Delivery[] };
      setSponsors(payload.sponsors ?? []);
      setDeliveries(payload.deliveries ?? []);
    } catch {
      setDeliveries([]);
      setMessage("تعذّر تحميل إشعارات المكاتب");
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function send() {
    if (!draft.title.trim() || !draft.body.trim()) { setMessage("العنوان والنص مطلوبان"); return; }
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/office-notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sponsorId: draft.sponsorId, title: draft.title.trim(), body: draft.body.trim(), link: draft.link.trim() }),
      });
      const payload = (await res.json().catch(() => ({}))) as { sent?: number; error?: string };
      if (!res.ok) throw new Error(payload.error ?? String(res.status));
      setMessage(payload.sent ? `أُرسل الإشعار إلى ${payload.sent} مكتب` : "لا يوجد مكتب بجهاز نشط يستقبل الإشعار");
      setDraft({ sponsorId: "", title: "", body: "", link: "" });
      await load();
    } catch (error) {
      setMessage(error instanceof Error && error.message === "Forbidden" ? "ليست لديك صلاحية الإرسال" : "تعذّر إرسال الإشعار");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="admin-panel">
      <div className="admin-panel-head">
        <h2>إشعارات التطبيق المكتبي</h2>
        <p>يصل الإشعار إلى جرس التطبيق المكتبي لدى المكتب المختار، أو لدى كل المكاتب التي لها جهاز نشط.</p>
      </div>

      <div className="admin-form-grid" style={{ marginBottom: 18 }}>
        <label>
          المكتب
          <select value={draft.sponsorId} onChange={(e) => setDraft({ ...draft, sponsorId: e.target.value })}>
            <option value="">كل المكاتب ({sponsors.length})</option>
            {sponsors.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label style={{ gridColumn: "span 2" }}>
          العنوان
          <input maxLength={160} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
        </label>
        <label style={{ gridColumn: "1 / -1" }}>
          النص
          <textarea rows={3} maxLength={1000} value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
        </label>
        <label>
          رابط (اختياري)
          <input dir="ltr" placeholder="/advertise" value={draft.link} onChange={(e) => setDraft({ ...draft, link: e.target.value })} />
          <small>مسار في الموقع مثل /advertise، أو app://messages لفتح شاشة داخل التطبيق</small>
        </label>
        <div className="admin-row-actions" style={{ gridColumn: "span 2", alignItems: "flex-end", flexWrap: "wrap" }}>
          <button type="button" disabled={busy} onClick={() => void send()}>{busy ? "جارٍ الإرسال…" : "إرسال الإشعار"}</button>
          {message && <span style={{ fontSize: 12, fontWeight: 800, color: "var(--color-primary)", alignSelf: "center" }}>{message}</span>}
        </div>
      </div>

      {!deliveries ? (
        <p className="admin-empty">جارٍ التحميل…</p>
      ) : deliveries.length === 0 ? (
        <p className="admin-empty">لم يُرسل أي إشعار للتطبيقات المكتبية بعد.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>النوع</th>
              <th>المكتب</th>
              <th>العنوان</th>
              <th>الحالة</th>
              <th>أُرسل</th>
            </tr>
          </thead>
          <tbody>
            {deliveries.slice(0, 50).map((d) => {
              const st = STATUS_LABELS[d.status] ?? { tone: "muted", label: d.status };
              return (
                <tr key={d.id}>
                  <td>{EVENT_LABELS[d.eventType] ?? d.eventType}</td>
                  <td dir="ltr">{d.sponsorId}</td>
                  <td title={d.body}>{d.title}</td>
                  <td><span className={`badge badge-${st.tone}`}>{st.label}</span></td>
                  <td dir="ltr">{d.createdAt}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}
