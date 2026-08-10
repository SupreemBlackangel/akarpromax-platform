"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type AuditRow = {
  id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  user_id: string | null;
  ip_address: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
};

type AuditResponse = {
  rows: AuditRow[];
  total: number;
  page: number;
  limit: number;
};

const EVENT_TYPES = [
  "AUTH_LOGIN_FAILED", "AUTH_LOGIN_SUCCESS", "AUTH_RATE_LIMITED",
  "AUTH_REGISTER_ATTEMPT", "AUTH_REGISTER_SUCCESS", "AUTH_REGISTER_FAILED",
  "AUTH_SESSION_INVALIDATED", "AUTH_PASSWORD_RESET_SUCCESS",
  "ROLE_ASSIGNED", "ROLE_REMOVED", "PERMISSION_CHANGED",
  "USER_SUSPENDED", "USER_BANNED", "USER_RESTORED", "USER_ROLE_CHANGED",
  "ADS_CAMPAIGN_CREATED", "ADS_CAMPAIGN_UPDATED", "ADS_CAMPAIGN_DELETED",
  "OFFICE_PAIRING_STARTED", "OFFICE_PAIRING_COMPLETED",
];

const EVENT_LABELS: Record<string, string> = {
  AUTH_LOGIN_FAILED: "فشل تسجيل الدخول",
  AUTH_LOGIN_SUCCESS: "تسجيل دخول ناجح",
  AUTH_RATE_LIMITED: "تحديد المعدل",
  AUTH_REGISTER_ATTEMPT: "محاولة تسجيل",
  AUTH_REGISTER_SUCCESS: "تسجيل ناجح",
  AUTH_REGISTER_FAILED: "فشل التسجيل",
  AUTH_SESSION_INVALIDATED: "إلغاء الجلسة",
  AUTH_PASSWORD_RESET_SUCCESS: "إعادة تعيين كلمة المرور",
  ROLE_ASSIGNED: "تعيين دور",
  ROLE_REMOVED: "إزالة دور",
  PERMISSION_CHANGED: "تغيير صلاحية",
  USER_SUSPENDED: "تعليق مستخدم",
  USER_BANNED: "حظر مستخدم",
  USER_RESTORED: "استعادة مستخدم",
  USER_ROLE_CHANGED: "تغيير دور المستخدم",
  ADS_CAMPAIGN_CREATED: "إنشاء حملة",
  ADS_CAMPAIGN_UPDATED: "تحديث حملة",
  ADS_CAMPAIGN_DELETED: "حذف حملة",
  OFFICE_PAIRING_STARTED: "بدء توصيل مكتب",
  OFFICE_PAIRING_COMPLETED: "اكتمال توصيل مكتب",
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("ar-EG", {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function buildQuery(params: {
  page: number;
  limit: number;
  action: string;
  entityType: string;
  userId: string;
  from: string;
  to: string;
}): string {
  const sp = new URLSearchParams();
  sp.set("page", String(params.page));
  sp.set("limit", String(params.limit));
  if (params.action) sp.set("action", params.action);
  if (params.entityType) sp.set("entity_type", params.entityType);
  if (params.userId) sp.set("user_id", params.userId);
  if (params.from) sp.set("from", params.from);
  if (params.to) sp.set("to", params.to);
  return `/api/admin/audit?${sp.toString()}`;
}

export default function AuditAdminClient() {
  const [data, setData] = useState<AuditResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [userId, setUserId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const limit = 25;

  useEffect(() => {
    let active = true;
    const url = buildQuery({ page, limit, action, entityType, userId, from, to });
    fetch(url, { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((result: AuditResponse) => {
        if (!active) return;
        setData(result);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "حدث خطأ غير متوقع");
        setLoading(false);
      });
    return () => { active = false; };
  }, [page, action, entityType, userId, from, to]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / limit)) : 1;

  return (
    <>
      <header className="advertiser-admin-header">
        <div><p>سجل النشاط</p><h1>سجل التدقيق</h1></div>
        <div className="admin-header-actions">
          <Link href="/admin" style={{ opacity: 0.7 }}>العودة للوحة الإحصاءات</Link>
        </div>
      </header>

      {error && <div className="admin-message" role="status">{error}</div>}

      <section className="admin-panel" style={{ marginBottom: 16 }}>
        <div className="admin-panel-title"><div><p>البحث والتصفية</p><h2>فلترة السجلات</h2></div></div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, padding: "12px 16px" }}>
          <select value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }} style={selectStyle}>
            <option value="">جميع الأحداث</option>
            {EVENT_TYPES.map((et) => (
              <option key={et} value={et}>{EVENT_LABELS[et] ?? et}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="نوع الكيان"
            value={entityType}
            onChange={(e) => { setEntityType(e.target.value); setPage(1); }}
            style={inputStyle}
          />
          <input
            type="text"
            placeholder="معرف المستخدم"
            value={userId}
            onChange={(e) => { setUserId(e.target.value); setPage(1); }}
            style={inputStyle}
          />
          <input
            type="date"
            value={from}
            onChange={(e) => { setFrom(e.target.value); setPage(1); }}
            style={inputStyle}
            title="من تاريخ"
          />
          <input
            type="date"
            value={to}
            onChange={(e) => { setTo(e.target.value); setPage(1); }}
            style={inputStyle}
            title="إلى تاريخ"
          />
        </div>
      </section>

      {loading && !data ? (
        <div className="admin-panel" style={{ textAlign: "center", color: "#6b7b93" }}>
          <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.5 }}>&#8987;</div>
          <p>جارٍ تحميل السجلات...</p>
        </div>
      ) : (
        <section className="admin-panel">
          <div className="admin-panel-title">
            <div>
              <p>{data?.total ?? 0} سجل</p>
              <h2>السجلات</h2>
            </div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>التاريخ</th>
                  <th style={thStyle}>الحدث</th>
                  <th style={thStyle}>نوع الكيان</th>
                  <th style={thStyle}>معرف الكيان</th>
                  <th style={thStyle}>المستخدم</th>
                  <th style={thStyle}>IP</th>
                  <th style={thStyle}>التفاصيل</th>
                </tr>
              </thead>
              <tbody>
                {data?.rows.map((row) => (
                  <tr key={row.id}>
                    <td style={tdStyle}>{formatDate(row.created_at)}</td>
                    <td style={tdStyle}>
                      <span style={badgeStyle}>{EVENT_LABELS[row.action] ?? row.action}</span>
                    </td>
                    <td style={tdStyle}>{row.entity_type ?? "-"}</td>
                    <td style={tdStyle} title={row.entity_id ?? ""}>
                      {row.entity_id ? row.entity_id.slice(0, 8) + "..." : "-"}
                    </td>
                    <td style={tdStyle} title={row.user_id ?? ""}>
                      {row.user_id ? row.user_id.slice(0, 8) + "..." : "-"}
                    </td>
                    <td style={tdStyle}>{row.ip_address ?? "-"}</td>
                    <td style={tdStyle}>
                      {row.details ? (
                        <details style={{ fontSize: 12 }}>
                          <summary style={{ cursor: "pointer" }}>عرض</summary>
                          <pre style={{ whiteSpace: "pre-wrap", direction: "ltr", textAlign: "left", marginTop: 4, background: "#f5f6f8", padding: 8, borderRadius: 4 }}>
                            {JSON.stringify(row.details, null, 2)}
                          </pre>
                        </details>
                      ) : "-"}
                    </td>
                  </tr>
                ))}
                {data?.rows.length === 0 && (
                  <tr><td colSpan={7} style={{ ...tdStyle, textAlign: "center", color: "#6b7b93" }}>لا توجد سجلات</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, padding: 16 }}>
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} style={pageBtnStyle}>السابق</button>
              <span style={{ fontSize: 14, opacity: 0.7 }}>{page} / {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} style={pageBtnStyle}>التالي</button>
            </div>
          )}
        </section>
      )}
    </>
  );
}

const tableStyle: React.CSSProperties = { width: "100%", borderCollapse: "collapse", fontSize: 14 };
const thStyle: React.CSSProperties = { textAlign: "right", padding: "10px 12px", borderBottom: "2px solid #e2e5ea", fontWeight: 600, whiteSpace: "nowrap" };
const tdStyle: React.CSSProperties = { textAlign: "right", padding: "8px 12px", borderBottom: "1px solid #eef0f3", verticalAlign: "top" };
const badgeStyle: React.CSSProperties = { display: "inline-block", padding: "2px 8px", borderRadius: 4, background: "#eef1f6", fontSize: 12, whiteSpace: "nowrap" };
const selectStyle: React.CSSProperties = { padding: "6px 10px", borderRadius: 6, border: "1px solid #d0d5dd", fontSize: 13, background: "#fff", minWidth: 140 };
const inputStyle: React.CSSProperties = { padding: "6px 10px", borderRadius: 6, border: "1px solid #d0d5dd", fontSize: 13, background: "#fff", minWidth: 130 };
const pageBtnStyle: React.CSSProperties = { padding: "6px 16px", borderRadius: 6, border: "1px solid #d0d5dd", background: "#fff", cursor: "pointer", fontSize: 13 };
