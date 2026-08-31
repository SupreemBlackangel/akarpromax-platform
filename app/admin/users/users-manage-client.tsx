"use client";

import { useCallback, useEffect, useState } from "react";
import { BadgeCheck, Ban, CircleCheck, Eye, PauseCircle, Pencil, RefreshCw, Search, ShieldAlert, Trash2, X } from "lucide-react";

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

// Mirrors the platform role catalog (src/constants/roles.ts).
const ROLE_LABELS: Record<string, string> = {
  user: "مستخدم",
  service_provider: "مزود خدمات",
  service_supervisor: "مشرف خدمات",
  analyst: "محلل التقارير",
  content_editor: "محرر المعلنين",
  ads_reviewer: "مراجع الإعلانات",
  ad_manager: "مدير الإعلانات",
  country_manager: "مدير دولة",
  sponsor_manager: "مدير المعلنين",
  sponsor_admin: "مدير المعلنين التنفيذي",
  super_admin: "المدير العام",
};

export default function UsersManageClient() {
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: "ok" | "bad"; text: string } | null>(null);
  const [detail, setDetail] = useState<{ user: AdminUserRow; editing: boolean } | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editRole, setEditRole] = useState("user");

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

  const openDetail = (user: AdminUserRow, editing: boolean) => {
    setDetail({ user, editing });
    setEditName(user.name || "");
    setEditPhone(user.phone || "");
    setEditRole(user.role || "user");
    setNotice(null);
  };

  const saveEdit = async () => {
    if (!detail) return;
    setBusyId(detail.user.id);
    try {
      const response = await fetch(`/api/admin/users/${encodeURIComponent(detail.user.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, phone: editPhone, role: editRole }),
      });
      const data = await response.json().catch(() => null);
      if (response.ok && data?.success && data.data) {
        setRows((current) => current.map((row) => (row.id === detail.user.id ? { ...row, ...data.data } : row)));
        setDetail(null);
        setNotice({ kind: "ok", text: "تم حفظ التعديلات." });
      } else {
        setNotice({ kind: "bad", text: data?.error || "تعذر حفظ التعديلات." });
      }
    } catch {
      setNotice({ kind: "bad", text: "تعذر الاتصال بالخادم." });
    } finally {
      setBusyId(null);
    }
  };

  const deleteUser = async (user: AdminUserRow) => {
    if (!window.confirm(`حذف حساب «${user.name || user.email}»؟ سيُقفل الحساب نهائيًا ولن يستطيع الدخول.`)) return;
    setBusyId(user.id);
    setNotice(null);
    try {
      const response = await fetch(`/api/admin/users/${encodeURIComponent(user.id)}`, { method: "DELETE" });
      const data = await response.json().catch(() => null);
      if (response.ok && data?.success && data.data) {
        setRows((current) => current.map((row) => (row.id === user.id ? { ...row, ...data.data } : row)));
        setNotice({ kind: "ok", text: "تم حذف الحساب." });
      } else {
        setNotice({ kind: "bad", text: data?.error || "تعذر حذف الحساب." });
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
                        <button type="button" disabled={busy} onClick={() => openDetail(user, false)} title="معاينة" className="inline-flex items-center gap-1 rounded-lg bg-[var(--color-primary-soft)] px-2.5 py-1.5 text-[11px] font-black text-[var(--color-primary)] hover:bg-blue-100 disabled:opacity-50">
                          <Eye className="h-3.5 w-3.5" /> معاينة
                        </button>
                        <button type="button" disabled={busy} onClick={() => openDetail(user, true)} title="تعديل" className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-2.5 py-1.5 text-[11px] font-black text-gray-700 hover:bg-gray-200 disabled:opacity-50 dark:bg-gray-800 dark:text-gray-200">
                          <Pencil className="h-3.5 w-3.5" /> تعديل
                        </button>
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
                        {user.status !== "deleted" && (
                          <button type="button" disabled={busy} onClick={() => void deleteUser(user)} title="حذف" className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-2.5 py-1.5 text-[11px] font-black text-white hover:bg-red-700 disabled:opacity-50">
                            <Trash2 className="h-3.5 w-3.5" /> حذف
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

      {detail && (
        <div
          className="fixed inset-0 z-[120] grid place-items-center bg-black/50 p-4 backdrop-blur-sm"
          onMouseDown={(event) => { if (event.target === event.currentTarget) setDetail(null); }}
        >
          <div role="dialog" aria-modal="true" aria-label={detail.editing ? "تعديل مستخدم" : "معاينة مستخدم"} className="w-full max-w-md rounded-2xl bg-[var(--color-surface)] p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-black text-[var(--color-text-primary)]">
                {detail.editing ? "تعديل بيانات المستخدم" : "معاينة المستخدم"}
              </h3>
              <button type="button" aria-label="إغلاق" onClick={() => setDetail(null)} className="grid h-8 w-8 place-items-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300">
                <X className="h-4 w-4" />
              </button>
            </div>

            {detail.editing ? (
              <div className="space-y-3">
                <label className="block text-xs font-black text-[var(--color-text-secondary)]">
                  الاسم
                  <input value={editName} onChange={(event) => setEditName(event.target.value)} className="mt-1 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]" />
                </label>
                <label className="block text-xs font-black text-[var(--color-text-secondary)]">
                  الهاتف
                  <input value={editPhone} onChange={(event) => setEditPhone(event.target.value)} dir="ltr" className="mt-1 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]" />
                </label>
                <label className="block text-xs font-black text-[var(--color-text-secondary)]">
                  الدور (رفع/خفض المستوى)
                  <select value={editRole} onChange={(event) => setEditRole(event.target.value)} className="mt-1 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm font-bold outline-none focus:border-[var(--color-primary)]">
                    {Object.entries(ROLE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </label>
                <p className="text-[11px] text-[var(--color-text-muted)]">البريد الإلكتروني لا يُعدَّل من هنا حفاظًا على سلامة التحقق. منح «المدير العام» أو سحبه يتطلب مديرًا عامًا.</p>
                <div className="flex gap-2 pt-2">
                  <button type="button" disabled={busyId === detail.user.id} onClick={() => void saveEdit()} className="flex-1 rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-black text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50">
                    {busyId === detail.user.id ? "جارٍ الحفظ..." : "حفظ التعديلات"}
                  </button>
                  <button type="button" onClick={() => setDetail(null)} className="rounded-xl border border-[var(--color-border)] px-4 py-2.5 text-sm font-black text-[var(--color-text-secondary)]">
                    إلغاء
                  </button>
                </div>
              </div>
            ) : (
              <dl className="space-y-2.5 text-sm">
                {[
                  ["الاسم", detail.user.name || "—"],
                  ["البريد الإلكتروني", detail.user.email || "—"],
                  ["الهاتف", detail.user.phone || "—"],
                  ["الدور", ROLE_LABELS[detail.user.role] || detail.user.role],
                  ["الحالة", (STATUS_LABELS[detail.user.status] || [detail.user.status])[0] + (detail.user.isActive ? "" : " (محظور)")],
                  ["البريد مفعّل", detail.user.emailVerifiedAt ? new Date(detail.user.emailVerifiedAt).toLocaleString("ar") : "غير مفعّل"],
                  ["آخر دخول", detail.user.lastLoginAt ? new Date(detail.user.lastLoginAt).toLocaleString("ar") : "—"],
                  ["تاريخ التسجيل", detail.user.createdAt ? new Date(detail.user.createdAt).toLocaleString("ar") : "—"],
                  ["المعرّف", detail.user.id],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-start justify-between gap-4 border-b border-[var(--color-border)]/60 pb-2">
                    <dt className="shrink-0 text-xs font-black text-[var(--color-text-muted)]">{label}</dt>
                    <dd dir="auto" className="break-all text-end font-bold text-[var(--color-text-primary)]">{value}</dd>
                  </div>
                ))}
                <div className="flex gap-2 pt-3">
                  <button type="button" onClick={() => openDetail(detail.user, true)} className="flex-1 rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-black text-white hover:bg-[var(--color-primary-hover)]">
                    تعديل البيانات
                  </button>
                  <button type="button" onClick={() => setDetail(null)} className="rounded-xl border border-[var(--color-border)] px-4 py-2.5 text-sm font-black text-[var(--color-text-secondary)]">
                    إغلاق
                  </button>
                </div>
              </dl>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
