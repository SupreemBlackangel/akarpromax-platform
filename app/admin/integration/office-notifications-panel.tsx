"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, Send } from "lucide-react";

import Badge from "@/src/components/ui/Badge";
import Button from "@/src/components/ui/Button";
import Card, { CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/Card";
import { toast } from "@/src/components/ui/Toast";

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

const STATUS_LABELS: Record<string, { variant: "warning" | "success" | "neutral" | "danger"; label: string }> = {
  queued: { variant: "warning", label: "بانتظار الفتح" },
  delivered: { variant: "success", label: "قُرئ" },
  deferred: { variant: "neutral", label: "مؤجل" },
  failed: { variant: "danger", label: "فشل" },
};

/**
 * Announcements to the desktop applications, and what reached them.
 *
 * The recipient list is the offices that hold an active desktop device — the
 * only ones a notification can reach. The fetch, the fields, the validation
 * and the POST are unchanged; only the frame around them is new, and the
 * outcome is now also confirmed with a toast.
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

  // Load on mount. The state updates happen after the network response, not
  // synchronously in the effect body — the "subscribe to an external system"
  // case the rule permits, which its static check cannot see through `await`.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  async function send() {
    if (!draft.title.trim() || !draft.body.trim()) { setMessage("العنوان والنص مطلوبان"); toast.warning("العنوان والنص مطلوبان"); return; }
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
      const ok = payload.sent ? `أُرسل الإشعار إلى ${payload.sent} مكتب` : "لا يوجد مكتب بجهاز نشط يستقبل الإشعار";
      setMessage(ok);
      if (payload.sent) toast.success(ok); else toast.warning(ok);
      setDraft({ sponsorId: "", title: "", body: "", link: "" });
      await load();
    } catch (error) {
      const msg = error instanceof Error && error.message === "Forbidden" ? "ليست لديك صلاحية الإرسال" : "تعذّر إرسال الإشعار";
      setMessage(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  const field = "w-full rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 py-2 text-sm text-[color:var(--color-text-primary)] outline-none transition focus:border-[color:var(--color-primary)] focus:ring-2 focus:ring-[color:var(--color-primary)]/30";
  const label = "flex flex-col gap-1.5 text-xs font-bold text-[color:var(--color-text-secondary)]";

  return (
    <Card className="rounded-2xl">
      <CardHeader className="flex flex-row items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[color:color-mix(in_oklab,var(--color-primary),transparent_88%)] text-[color:var(--color-primary)]" aria-hidden="true"><Bell className="size-5" /></span>
        <div>
          <CardTitle>إشعارات التطبيق المكتبي</CardTitle>
          <CardDescription>يصل الإشعار إلى جرس التطبيق المكتبي لدى المكتب المختار، أو لدى كل المكاتب التي لها جهاز نشط.</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <label className={label}>
            المكتب
            <select className={field} value={draft.sponsorId} onChange={(e) => setDraft({ ...draft, sponsorId: e.target.value })}>
              <option value="">كل المكاتب ({sponsors.length})</option>
              {sponsors.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label className={`${label} md:col-span-2`}>
            العنوان
            <input className={field} maxLength={160} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          </label>
          <label className={`${label} md:col-span-3`}>
            النص
            <textarea className={field} rows={3} maxLength={1000} value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
          </label>
          <label className={label}>
            رابط (اختياري)
            <input className={field} dir="ltr" placeholder="/advertise" value={draft.link} onChange={(e) => setDraft({ ...draft, link: e.target.value })} />
            <small className="font-normal">مسار في الموقع مثل /advertise، أو app://messages لفتح شاشة داخل التطبيق</small>
          </label>
          <div className="flex flex-wrap items-end gap-3 md:col-span-2">
            <Button variant="primary" size="md" disabled={busy} loading={busy} onClick={() => void send()}>
              <Send className="size-4" aria-hidden="true" />
              {busy ? "جارٍ الإرسال…" : "إرسال الإشعار"}
            </Button>
            {message && <span role="status" className="self-center text-xs font-extrabold text-[color:var(--color-primary)]">{message}</span>}
          </div>
        </div>

        <div className="mt-6">
          {!deliveries ? (
            <p className="text-sm text-[color:var(--color-text-secondary)]">جارٍ التحميل…</p>
          ) : deliveries.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[color:var(--color-border)] px-4 py-6 text-center text-sm text-[color:var(--color-text-secondary)]">لم يُرسل أي إشعار للتطبيقات المكتبية بعد.</p>
          ) : (
            <div className="overflow-x-auto">
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
                    const st = STATUS_LABELS[d.status] ?? { variant: "neutral" as const, label: d.status };
                    return (
                      <tr key={d.id}>
                        <td>{EVENT_LABELS[d.eventType] ?? d.eventType}</td>
                        <td dir="ltr">{d.sponsorId}</td>
                        <td title={d.body}>{d.title}</td>
                        <td><Badge variant={st.variant}>{st.label}</Badge></td>
                        <td dir="ltr">{d.createdAt}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
