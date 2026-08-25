"use client";

import { useCallback, useEffect, useState } from "react";

type OverviewRow = {
  sponsorId: string;
  officeId: string | null;
  officeName: string | null;
  deviceCount: number;
  activeDeviceCount: number;
  status: string | null;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
  isExpired: boolean;
  daysRemaining: number | null;
  statusMessage: string | null;
};

type Draft = { status: string; startDate: string; endDate: string };

const STATUS_LABELS: Record<string, string> = {
  trial: "تجريبي",
  active: "فعال",
  expired: "منتهي",
  suspended: "معلّق",
  cancelled: "ملغى",
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function inOneYear(): string {
  const d = new Date();
  d.setUTCFullYear(d.getUTCFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

function stateBadge(row: OverviewRow): { tone: string; label: string } {
  if (!row.status) return { tone: "default", label: "بدون اشتراك" };
  if (row.isActive) return { tone: "success", label: "فعال" };
  if (row.isExpired) return { tone: "error", label: "منتهي" };
  return { tone: "warning", label: STATUS_LABELS[row.status] ?? row.status };
}

/**
 * Subscription management for paired offices. Reuses the admin panel/table
 * styles already used on this page — no new layout, no redesign.
 */
export default function OfficeSubscriptionsPanel() {
  const [rows, setRows] = useState<OverviewRow[] | null>(null);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>({ status: "active", startDate: "", endDate: "" });
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/office-subscriptions", { cache: "no-store" });
      if (!response.ok) {
        setMessage(response.status === 403 || response.status === 401 ? "لا تملك صلاحية إدارة الاشتراكات." : "تعذّر تحميل الاشتراكات.");
        setRows([]);
        return;
      }
      const payload = (await response.json()) as { subscriptions: OverviewRow[]; statuses: string[] };
      setRows(payload.subscriptions ?? []);
      setStatuses(payload.statuses ?? []);
    } catch {
      setMessage("تعذّر تحميل الاشتراكات.");
      setRows([]);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  function beginEdit(row: OverviewRow) {
    setMessage("");
    setEditing(row.sponsorId);
    setDraft({
      status: row.status ?? "active",
      startDate: row.startDate ?? today(),
      endDate: row.endDate ?? inOneYear(),
    });
  }

  async function save(row: OverviewRow) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/office-subscriptions", {
        method: row.status ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sponsorId: row.sponsorId, ...draft }),
      });
      const payload = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) {
        setMessage(payload.message || payload.error || "تعذّر حفظ الاشتراك.");
        return;
      }
      setEditing(null);
      await load();
      setMessage("تم حفظ الاشتراك. سيصل التحديث للجهاز عند الطلب التالي.");
    } catch {
      setMessage("تعذّر حفظ الاشتراك.");
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(row: OverviewRow, status: string) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/office-subscriptions", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sponsorId: row.sponsorId, status }),
      });
      const payload = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) {
        setMessage(payload.message || payload.error || "تعذّر تغيير الحالة.");
        return;
      }
      await load();
    } catch {
      setMessage("تعذّر تغيير الحالة.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="admin-panel">
      <div className="admin-panel-head">
        <h2>اشتراكات المكاتب</h2>
      </div>
      {message ? <p className="admin-message">{message}</p> : null}
      {!rows ? (
        <p className="admin-empty">جارٍ التحميل…</p>
      ) : rows.length === 0 ? (
        <p className="admin-empty">لا توجد مكاتب مرتبطة بعد.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>المكتب</th>
              <th>الحالة</th>
              <th>من</th>
              <th>إلى</th>
              <th>الوضع</th>
              <th>إجراء</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const badge = stateBadge(row);
              const isEditing = editing === row.sponsorId;
              return (
                <tr key={row.sponsorId}>
                  <td>
                    {row.officeId || row.officeName || row.sponsorId}
                    <br />
                    <small>{row.sponsorId}</small>
                  </td>
                  <td>
                    {isEditing ? (
                      <select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}>
                        {statuses.map((status) => (
                          <option key={status} value={status}>{STATUS_LABELS[status] ?? status}</option>
                        ))}
                      </select>
                    ) : (
                      <span>{row.status ? STATUS_LABELS[row.status] ?? row.status : "—"}</span>
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <input type="date" value={draft.startDate} onChange={(e) => setDraft({ ...draft, startDate: e.target.value })} />
                    ) : (
                      row.startDate ?? "—"
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <input type="date" value={draft.endDate} onChange={(e) => setDraft({ ...draft, endDate: e.target.value })} />
                    ) : (
                      row.endDate ?? "—"
                    )}
                  </td>
                  <td>
                    <span className={`badge badge-${badge.tone}`}>{badge.label}</span>
                    {row.isActive && row.daysRemaining != null ? <small> · {row.daysRemaining} يوم</small> : null}
                  </td>
                  <td className="admin-row-actions">
                    {isEditing ? (
                      <>
                        <button type="button" disabled={busy} onClick={() => void save(row)}>حفظ</button>
                        <button type="button" disabled={busy} onClick={() => setEditing(null)}>إلغاء</button>
                      </>
                    ) : (
                      <>
                        <button type="button" disabled={busy} onClick={() => beginEdit(row)}>
                          {row.status ? "تعديل" : "إنشاء / تفعيل"}
                        </button>
                        {row.status && row.status !== "suspended" ? (
                          <button type="button" disabled={busy} onClick={() => void setStatus(row, "suspended")}>تعليق</button>
                        ) : null}
                        {row.status === "suspended" ? (
                          <button type="button" disabled={busy} onClick={() => void setStatus(row, "active")}>تفعيل</button>
                        ) : null}
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}
