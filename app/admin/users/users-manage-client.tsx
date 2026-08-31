"use client";

import { useCallback, useEffect, useState } from "react";
import { BadgeCheck, Ban, CircleCheck, PauseCircle, RefreshCw, Search, ShieldAlert } from "lucide-react";

type AdminUserRow = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: string;
  status: string;
  isActive: boolean;
  emailVerifiedAt: string | null;
  lastLoginAt: string | null;
  createdAt: string | null;
};

const STATUS_LABELS: Record<string, [string, string]> = {
  active: ["نشط", "bg-emerald-100 text-emerald-700"],
  pending_verification: ["بانتظار التفعيل", "bg-amber-100 text-amber-700"],
  suspended: ["موقوف", "bg-red-100 text-red-700"],
  disabled: ["معطل", "bg-gray-200 text-gray-600"],
  deleted: ["محذوف", "bg-gray-200 text-gray-500"],
};

const ROLE_LABELS: Record<string, string> = {
  user: "مستخدم",
  super_admin: "مدير عام",
  country_manager: "مدير دولة",
  ad_manager: "مدير إعلانات",
};

export default function UsersManageClient() {
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: "ok" | "bad"; text: string } | null>(null);

  const load = useCallback(async (searchQ: string, searchStatus: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (searchQ.trim()) params.set("q", searchQ.trim());
      if (searchStatus) params.set("status", searchStatus);
      const response = await fetch(`/api/admin/users?${params.toString()}`, { cache: "no-store" });
      const data = await response.json().catch(() => null);
      if (response.ok && data?.success) {
        setRows(Array.isArray(data.data) ? data.data : []);
        setTotal(Number(data.total) || 0);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(q, status), q ? 350 : 0);
    return () => window.clearTimeout(timer);
  }, [q, status, load]);

  const act = async (user: AdminUserRow, action: "verify" | "activate" | "suspend" | "block" | "unblock", confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusyId(user.id);
    setNotice(null);
    try {
      const response = await fetch(`/api/admin/users/${encodeURIComponent(user.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await response.json().catch(() => null);
      if (response.ok && data?.success && data.data) {
        setRows((current) => current.map((row) => (row.id === user.id ? { ...row, ...data.data } : row)));
        setNotice({ kind: "ok", text: "تم تنفيذ الإجراء بنجاح." });
      } else {
        setNotice({ kind: "bad", text: data?.error || "تعذر تنفيذ الإجراء." });
      }
    } catch {
      setNotice({ kind: "bad", text: "تعذر الاتصال بالخادم." });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-[var(--color-text-primary)]">إدارة المستخدمين</h2>
          <p className="text-xs text-[var(--color-text-muted)]">{total} مستخدمًا — تفعيل البريد يدويًا، إيقاف، حظر، وإعادة تفعيل.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="بحث بالاسم أو البريد أو الهاتف..."
              className="w-64 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-2 pe-3 ps-9 text-sm outline-none focus:border-[var(--color-primary)]"
            />
          </div>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm font-bold outline-none"
          >
            <option value="">كل الحالات</option>
            <option value="pending_verification">بانتظار التفعيل</option>
            <option value="active">نشط</option>
            <option value="suspended">موقوف</option>
            <option value="disabled">معطل</option>
          </select>
          <button
            type="button"
            onClick={() => void load(q, status)}
            className="grid h-9 w-9 place-items-center rounded-xl border border-[var(--color-border)] text-[var(--color-text-muted)] transition hover:text-[var(--color-primary)]"
            aria-label="تحديث"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {notice && (
        <p className={`mb-3 rounded-xl px-4 py-2.5 text-sm font-bold ${notice.kind === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`} role="status">
          {notice.text}
        </p>
      )}

      {loading ? (
        <p className="py-10 text-center text-sm text-[var(--color-text-muted)]">جارٍ التحميل...</p>
      ) : rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-[var(--color-text-muted)]">لا توجد نتائج.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-start text-[11px] font-black uppercase text-[var(--color-text-muted)]">
                <th className="py-2 text-start">المستخدم</th>
                <th className="py-2 text-start">الدور</th>
                <th className="py-2 text-start">الحالة</th>
                <th className="py-2 text-start">البريد مفعّل</th>
                <th className="py-2 text-start">آخر دخول</th>
                <th className="py-2 text-start">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((user) => {
                const st = STATUS_LABELS[user.status] || [user.status, "bg-gray-100 text-gray-600"];
                const busy = busyId === user.id;
                return (
                  <tr key={user.id} className="border-b border-[var(--color-border)]/60">
                    <td className="py-3">
                      <p className="font-black text-[var(--color-text-primary)]">{user.name || "—"}</p>
                      <p dir="ltr" className="text-xs text-[var(--color-text-muted)]">{user.email || user.phone || "—"}</p>
                    </td>
                    <td className="py-3 text-xs font-bold text-[var(--color-text-secondary)]">{ROLE_LABELS[user.role] || user.role}</td>
                    <td className="py-3">
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${st[1]}`}>{st[0]}</span>
                      {!user.isActive && (
                        <span className="ms-1 rounded-full bg-red-100 px-2.5 py-1 text-[11px] font-black text-red-700">محظور</span>
                      )}
                    </td>
                    <td className="py-3 text-xs font-bold">
                      {user.emailVerifiedAt
                        ? <span className="inline-flex items-center gap-1 text-emerald-600"><BadgeCheck className="h-4 w-4" /> نعم</span>
                        : <span className="text-amber-600">لا</span>}
                    </td>
                    <td className="py-3 text-xs text-[var(--color-text-muted)]">
                      {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString("ar") : "—"}
                    </td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {user.status === "pending_verification" && (
                          <button type="button" disabled={busy} onClick={() => void act(user, "verify")} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] font-black text-white hover:bg-emerald-700 disabled:opacity-50">
                            <CircleCheck className="h-3.5 w-3.5" /> تفعيل الحساب
                          </button>
                        )}
                        {user.status === "suspended" || user.status === "disabled" ? (
                          <button type="button" disabled={busy} onClick={() => void act(user, "activate")} className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[11px] font-black text-emerald-700 hover:bg-emerald-100 disabled:opacity-50">
                            <CircleCheck className="h-3.5 w-3.5" /> إعادة تنشيط
                          </button>
                        ) : user.status === "active" && (
                          <button type="button" disabled={busy} onClick={() => void act(user, "suspend", `إيقاف حساب «${user.name || user.email}»؟`)} className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] font-black text-amber-700 hover:bg-amber-100 disabled:opacity-50">
                            <PauseCircle className="h-3.5 w-3.5" /> إيقاف
                          </button>
                        )}
                        {user.isActive ? (
                          <button type="button" disabled={busy} onClick={() => void act(user, "block", `حظر «${user.name || user.email}» نهائيًا من الدخول؟`)} className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1.5 text-[11px] font-black text-red-700 hover:bg-red-100 disabled:opacity-50">
                            <Ban className="h-3.5 w-3.5" /> حظر
                          </button>
                        ) : (
                          <button type="button" disabled={busy} onClick={() => void act(user, "unblock")} className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[11px] font-black text-emerald-700 hover:bg-emerald-100 disabled:opacity-50">
                            <ShieldAlert className="h-3.5 w-3.5" /> إلغاء الحظر
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
