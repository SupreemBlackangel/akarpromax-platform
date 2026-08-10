"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PERMISSIONS } from "@/src/constants/permissions";
import { ROLE_CATALOG, ROLE_ORDER, roleNameEn } from "@/src/constants/roles";

type Tab = "matrix" | "users" | "moderators";

const permissionGroups: { id: string; labelAr: string; permissions: [keyof typeof PERMISSIONS, string][] }[] = [
  {
    id: "dashboard",
    labelAr: "لوحة التحكم",
    permissions: [["ADMIN_DASHBOARD_VIEW", "عرض لوحة الإحصاءات"]],
  },
  {
    id: "sponsors",
    labelAr: "إدارة الرعاة",
    permissions: [
      ["SPONSORS_VIEW", "عرض الرعاة"],
      ["SPONSORS_CREATE", "إنشاء راعٍ"],
      ["SPONSORS_UPDATE", "تعديل راعٍ"],
      ["SPONSORS_APPROVE", "الموافقة على راعٍ"],
      ["SPONSORS_REJECT", "رفض راعٍ"],
      ["SPONSORS_SUSPEND", "تعليق راعٍ"],
      ["SPONSORS_ACTIVATE", "تفعيل راعٍ"],
      ["SPONSORS_DELETE", "أرشفة راعٍ"],
    ],
  },
  {
    id: "sponsor_manage",
    labelAr: "عمليات الرعاة",
    permissions: [
      ["SPONSOR_USERS_MANAGE", "إدارة مستخدمي الراعي"],
      ["SPONSOR_BRANCHES_MANAGE", "إدارة فروع الراعي"],
      ["SPONSOR_CONTRACTS_MANAGE", "إدارة عقود الراعي"],
      ["SPONSOR_SUBSCRIPTIONS_MANAGE", "إدارة اشتراكات الراعي"],
      ["SPONSOR_PAYMENTS_MANAGE", "إدارة مدفوعات الراعي"],
    ],
  },
  {
    id: "ads",
    labelAr: "الإعلانات",
    permissions: [
      ["ADS_VIEW", "عرض الحملات"],
      ["ADS_CREATE", "إنشاء حملة"],
      ["ADS_UPDATE", "تعديل حملة"],
      ["ADS_PUBLISH", "نشر حملة"],
      ["ADS_DELETE", "أرشفة حملة"],
      ["ADS_ANALYTICS", "تحليلات الإعلانات"],
      ["MEDIA_UPLOAD", "رفع الوسائط"],
    ],
  },
  {
    id: "users",
    labelAr: "المستخدمون",
    permissions: [
      ["USERS_VIEW", "عرض المستخدمين"],
      ["USERS_CREATE", "إنشاء مستخدم"],
      ["USERS_UPDATE", "تعديل مستخدم"],
      ["USERS_DELETE", "إزالة مستخدم"],
    ],
  },
  {
    id: "roles",
    labelAr: "الأدوار",
    permissions: [
      ["ROLES_VIEW", "عرض الأدوار"],
      ["ROLES_MANAGE", "إدارة الأدوار"],
    ],
  },
  {
    id: "properties",
    labelAr: "العقارات",
    permissions: [
      ["PROPERTIES_VIEW", "عرض العقارات"],
      ["PROPERTIES_MANAGE", "إدارة العقارات"],
    ],
  },
  {
    id: "offices",
    labelAr: "المكاتب",
    permissions: [
      ["OFFICE_LINK", "ربط مكتب"],
      ["OFFICE_UNLINK", "فك ربط مكتب"],
    ],
  },
  {
    id: "system",
    labelAr: "النظام",
    permissions: [
      ["REPORTS_VIEW", "عرض التقارير"],
      ["SETTINGS_MANAGE", "إدارة الإعدادات"],
    ],
  },
];

const countries = [
  ["om", "عُمان"], ["sa", "السعودية"], ["ae", "الإمارات"], ["qa", "قطر"],
  ["kw", "الكويت"], ["bh", "البحرين"], ["eg", "مصر"], ["jo", "الأردن"],
  ["iq", "العراق"], ["lb", "لبنان"], ["ps", "فلسطين"], ["sy", "سوريا"],
  ["ye", "اليمن"], ["ma", "المغرب"], ["dz", "الجزائر"], ["tn", "تونس"],
  ["ly", "ليبيا"], ["sd", "السودان"], ["so", "الصومال"], ["dj", "جيبوتي"],
  ["mr", "موريتانيا"], ["km", "جزر القمر"], ["tr", "تركيا"],
];

type RoleUser = {
  id: string;
  email: string;
  displayName: string | null;
  role: string;
  countryCode: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

type AssignableRoleEntry = {
  id: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  permissionCount: number;
};

type ScopeEntry = {
  id: string;
  userId: string;
  module: string;
  countryCode: string | null;
  cityId: string | null;
  createdAt: string;
  updatedAt: string;
};

type EligibleUser = {
  id: string;
  email: string;
  displayName: string | null;
  role: string;
};

export default function RolesAdminClient() {
  const [tab, setTab] = useState<Tab>("matrix");
  const [visibleRoles] = useState<Set<string>>(() => new Set(ROLE_ORDER.filter((r) => r !== "guest")));
  const allPermissions = useMemo(() => permissionGroups.flatMap((g) => g.permissions), []);

  const [users, setUsers] = useState<RoleUser[]>([]);
  const [assignableRoles, setAssignableRoles] = useState<AssignableRoleEntry[]>([]);
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [usersBusy, setUsersBusy] = useState(false);
  const [usersMessage, setUsersMessage] = useState("");
  const [canManage, setCanManage] = useState(false);

  const [scopes, setScopes] = useState<ScopeEntry[]>([]);
  const [eligibleUsers, setEligibleUsers] = useState<EligibleUser[]>([]);
  const [scopeModules, setScopeModules] = useState<string[]>([]);
  const [scopesBusy, setScopesBusy] = useState(false);
  const [scopesMessage, setScopesMessage] = useState("");
  const [scopeForm, setScopeForm] = useState({ userId: "", module: "", countryCode: "", cityId: "" });

  const loadUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/roles", { cache: "no-store" });
      if (!res.ok) throw new Error("فشل تحميل المستخدمين");
      const data = await res.json();
      setUsers(data.users ?? []);
      setAssignableRoles(data.assignableRoles ?? []);
      setCanManage(data.assignableRoles?.length > 0);
    } catch (err) {
      setUsersMessage(err instanceof Error ? err.message : "حدث خطأ");
    }
  }, []);

  const loadScopes = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/moderators", { cache: "no-store" });
      if (!res.ok) throw new Error("فشل تحميل نطاقات المشرفين");
      const data = await res.json();
      setScopes(data.scopes ?? []);
      setEligibleUsers(data.eligibleUsers ?? []);
      setScopeModules(data.modules ?? []);
    } catch (err) {
      setScopesMessage(err instanceof Error ? err.message : "حدث خطأ");
    }
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      if (tab === "users" && users.length === 0 && !usersBusy) {
        try { await loadUsers(); } finally { if (active) setUsersBusy(false); }
      }
      if (tab === "moderators" && scopes.length === 0 && !scopesBusy) {
        try { await loadScopes(); } finally { if (active) setScopesBusy(false); }
      }
    })();
    return () => { active = false; };
  }, [tab, users.length, scopes.length, usersBusy, scopesBusy, loadUsers, loadScopes]);

  const filteredUsers = useMemo(() => {
    if (roleFilter === "all") return users;
    return users.filter((u) => u.role === roleFilter);
  }, [users, roleFilter]);

  async function updateUserRole(userId: string, newRole: string) {
    setUsersBusy(true);
    setUsersMessage("");
    try {
      const res = await fetch("/api/admin/roles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل تحديث الدور");
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: newRole } : u));
      setUsersMessage("تم تحديث الدور بنجاح.");
    } catch (err) {
      setUsersMessage(err instanceof Error ? err.message : "حدث خطأ");
    } finally {
      setUsersBusy(false);
    }
  }

  async function addScope(e: React.FormEvent) {
    e.preventDefault();
    if (!scopeForm.userId || !scopeForm.module) return;
    setScopesBusy(true);
    setScopesMessage("");
    try {
      const res = await fetch("/api/admin/moderators", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(scopeForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل إضافة النطاق");
      setScopes((prev) => [...prev, {
        id: data.id,
        userId: scopeForm.userId,
        module: scopeForm.module,
        countryCode: scopeForm.countryCode || null,
        cityId: scopeForm.cityId || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }]);
      setScopeForm({ userId: "", module: "", countryCode: "", cityId: "" });
      setScopesMessage("تمت إضافة النطاق.");
    } catch (err) {
      setScopesMessage(err instanceof Error ? err.message : "حدث خطأ");
    } finally {
      setScopesBusy(false);
    }
  }

  async function removeScope(scopeId: string) {
    setScopesBusy(true);
    setScopesMessage("");
    try {
      const res = await fetch(`/api/admin/moderators?id=${encodeURIComponent(scopeId)}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "فشل حذف النطاق");
      }
      setScopes((prev) => prev.filter((s) => s.id !== scopeId));
      setScopesMessage("تم حذف النطاق.");
    } catch (err) {
      setScopesMessage(err instanceof Error ? err.message : "حدث خطأ");
    } finally {
      setScopesBusy(false);
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "matrix", label: "مصفوفة الصلاحيات" },
    { id: "users", label: "إدارة أدوار المستخدمين" },
    { id: "moderators", label: "نطاقات المشرفين" },
  ];

  return (
    <>
      <header className="sponsor-admin-header">
        <div><p>نظام الصلاحيات</p><h1>الأدوار والصلاحيات</h1></div>
        <div className="admin-header-actions"><Link href="/" target="_blank">معاينة الموقع ↗</Link></div>
      </header>

      <nav style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            style={{
              padding: "8px 16px",
              border: "1px solid",
              borderColor: tab === t.id ? "#1769ff" : "#dce5f2",
              borderRadius: 8,
              background: tab === t.id ? "#1769ff" : "#fff",
              color: tab === t.id ? "#fff" : "#4f6483",
              cursor: "pointer",
              fontSize: 10,
              fontWeight: 900,
            }}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "matrix" && (
        <>
          <section className="admin-panel">
            <div className="admin-panel-title"><div><p>المصفوفة</p><h2>صلاحيات الأدوار</h2></div><span>{visibleRoles.size} أدوار</span></div>
            <div className="roles-matrix-wrap">
              <table className="roles-matrix">
                <thead>
                  <tr>
                    <th className="roles-perm-cell">الصلاحية</th>
                    {ROLE_ORDER.filter((role) => role !== "guest" && visibleRoles.has(role)).map((role) => (
                      <th key={role}>{ROLE_CATALOG[role].nameAr}<small>{roleNameEn(role)}</small></th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {permissionGroups.map((group) => (
                    <Fragment key={group.id}>
                      <tr className="roles-group-row">
                        <td colSpan={ROLE_ORDER.length}>{group.labelAr}</td>
                      </tr>
                      {group.permissions.map(([key, label]) => (
                        <tr key={key}>
                          <td className="roles-perm-cell">{label}</td>
                          {ROLE_ORDER.filter((role) => role !== "guest" && visibleRoles.has(role)).map((role) => (
                            <td key={`${role}-${key}`} className={ROLE_CATALOG[role].permissions.includes(PERMISSIONS[key]) ? "granted" : "denied"}>
                              {ROLE_CATALOG[role].permissions.includes(PERMISSIONS[key]) ? "✓" : "—"}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td className="roles-perm-cell">إجمالي الصلاحيات</td>
                    {ROLE_ORDER.filter((role) => role !== "guest" && visibleRoles.has(role)).map((role) => (
                      <td key={role}>{ROLE_CATALOG[role].permissions.length} من {allPermissions.length}</td>
                    ))}
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>

          <section className="admin-panel" style={{ marginTop: 18 }}>
            <div className="admin-panel-title"><div><p>الدليل</p><h2>وصف الأدوار</h2></div></div>
            <div className="roles-descriptions">
              {ROLE_ORDER.filter((role) => role !== "guest").map((role) => (
                <article key={role}>
                  <span>{ROLE_CATALOG[role].nameAr.slice(0, 1)}</span>
                  <div><strong>{ROLE_CATALOG[role].nameAr}</strong><small>{roleNameEn(role)}</small></div>
                  <p>{ROLE_CATALOG[role].descriptionAr}</p>
                </article>
              ))}
            </div>
          </section>
        </>
      )}

      {tab === "users" && (
        <>
          {usersMessage && (
            <div className="admin-message" role="status">
              {usersMessage}
              <button type="button" onClick={() => setUsersMessage("")}>×</button>
            </div>
          )}

          <div className="admin-stat-grid">
            <article>
              <span>إجمالي المستخدمين</span>
              <strong>{users.length.toLocaleString("ar-EG")}</strong>
              <small>حساب مسجل</small>
            </article>
            <article>
              <span>مدراء عامون</span>
              <strong>{users.filter((u) => u.role === "super_admin").length.toLocaleString("ar-EG")}</strong>
              <small>صلاحية شاملة</small>
            </article>
            <article>
              <span>مديرو دول</span>
              <strong>{users.filter((u) => u.role === "country_manager").length.toLocaleString("ar-EG")}</strong>
              <small>دور إقليمي</small>
            </article>
            <article>
              <span>نشطون</span>
              <strong>{users.filter((u) => u.status === "active").length.toLocaleString("ar-EG")}</strong>
              <small>حساب مفعّل</small>
            </article>
          </div>

          <section className="admin-panel">
            <div className="admin-panel-title">
              <div><p>الحسابات</p><h2>إدارة أدوار المستخدمين</h2></div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  style={{ padding: "6px 10px", border: "1px solid #dce5f2", borderRadius: 7, fontSize: 9, fontWeight: 800, background: "#fff", color: "#20375b" }}
                >
                  <option value="all">كل الأدوار</option>
                  {ROLE_ORDER.filter((r) => r !== "guest").map((r) => (
                    <option key={r} value={r}>{ROLE_CATALOG[r].nameAr} ({ROLE_CATALOG[r].nameEn})</option>
                  ))}
                </select>
                <span>{filteredUsers.length} من {users.length}</span>
              </div>
            </div>

            {usersBusy && users.length === 0 ? (
              <div className="admin-empty"><span>◇</span><strong>جارٍ التحميل...</strong></div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="roles-matrix" style={{ fontSize: 9 }}>
                  <thead>
                    <tr>
                      <th className="roles-perm-cell" style={{ textAlign: "right" }}>المستخدم</th>
                      <th>البريد الإلكتروني</th>
                      <th>الدور الحالي</th>
                      <th>الدولة</th>
                      <th>الحالة</th>
                      {canManage && <th>تغيير الدور</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => {
                      const country = user.countryCode
                        ? countries.find(([id]) => id === user.countryCode?.toLowerCase())?.[1] ?? user.countryCode.toUpperCase()
                        : null;
                      return (
                        <tr key={user.id}>
                          <td className="roles-perm-cell" style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                            <span style={{ display: "inline-grid", placeItems: "center", width: 28, height: 28, borderRadius: "50%", background: "#edf4ff", color: "#1769ff", fontSize: 9, fontWeight: 900, marginLeft: 6 }}>
                              {(user.displayName || user.email).slice(0, 1).toUpperCase()}
                            </span>
                            {user.displayName || user.email}
                          </td>
                          <td style={{ fontSize: 8, color: "#8a99b0" }}>{user.email}</td>
                          <td>
                            <span style={{ padding: "3px 8px", borderRadius: 12, background: "#edf4ff", color: "#1769ff", fontSize: 8, fontWeight: 900 }}>
                              {ROLE_CATALOG[user.role as keyof typeof ROLE_CATALOG]?.nameAr ?? user.role}
                            </span>
                          </td>
                          <td style={{ fontSize: 8, color: "#526681" }}>{country ?? "—"}</td>
                          <td>
                            <span style={{ padding: "3px 7px", borderRadius: 20, background: user.status === "active" ? "#e6f8ef" : "#fff0f0", color: user.status === "active" ? "#19734e" : "#a83f4d", fontSize: 7, fontWeight: 900 }}>
                              {user.status === "active" ? "نشط" : "معطل"}
                            </span>
                          </td>
                          {canManage && (
                            <td>
                              <select
                                value={user.role}
                                onChange={(e) => updateUserRole(user.id, e.target.value)}
                                disabled={usersBusy}
                                style={{ padding: "5px 8px", border: "1px solid #dce5f2", borderRadius: 6, fontSize: 8, background: "#fbfcff", color: "#1d3559" }}
                              >
                                {ROLE_ORDER.filter((r) => r !== "guest").map((r) => (
                                  <option key={r} value={r}>{ROLE_CATALOG[r].nameAr}</option>
                                ))}
                              </select>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                    {filteredUsers.length === 0 && (
                      <tr><td colSpan={6}><div className="admin-empty"><span>◇</span><strong>لا يوجد مستخدمون</strong></div></td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {tab === "moderators" && (
        <>
          {scopesMessage && (
            <div className="admin-message" role="status">
              {scopesMessage}
              <button type="button" onClick={() => setScopesMessage("")}>×</button>
            </div>
          )}

          <div className="admin-stat-grid">
            <article>
              <span>إجمالي النطاقات</span>
              <strong>{scopes.length.toLocaleString("ar-EG")}</strong>
              <small>نطاق مُعيَّن</small>
            </article>
            <article>
              <span>المشرفون النشطون</span>
              <strong>{new Set(scopes.map((s) => s.userId)).size.toLocaleString("ar-EG")}</strong>
              <small>مستخدم لديه نطاقات</small>
            </article>
            <article>
              <span>الوحدات</span>
              <strong>{scopeModules.length.toLocaleString("ar-EG")}</strong>
              <small>وحدة متاحة</small>
            </article>
            <article>
              <span>نطاقات دولية</span>
              <strong>{scopes.filter((s) => !s.countryCode).length.toLocaleString("ar-EG")}</strong>
              <small>بلا تقييد جغرافي</small>
            </article>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 17, alignItems: "start" }}>
            <section className="admin-panel">
              <div className="admin-panel-title"><div><p>النطاقات</p><h2>نطاقات المشرفين الحالية</h2></div><span>{scopes.length} نطاق</span></div>
              <div style={{ overflowX: "auto" }}>
                {scopesBusy && scopes.length === 0 ? (
                  <div className="admin-empty"><span>◇</span><strong>جارٍ التحميل...</strong></div>
                ) : (
                  <table className="roles-matrix" style={{ fontSize: 9 }}>
                    <thead>
                      <tr>
                        <th className="roles-perm-cell" style={{ textAlign: "right" }}>المستخدم</th>
                        <th>الوحدة</th>
                        <th>الدولة</th>
                        <th>المدينة</th>
                        <th>إجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scopes.map((scope) => {
                        const user = eligibleUsers.find((u) => u.id === scope.userId);
                        const country = scope.countryCode
                          ? countries.find(([id]) => id === scope.countryCode?.toLowerCase())?.[1] ?? scope.countryCode
                          : null;
                        return (
                          <tr key={scope.id}>
                            <td className="roles-perm-cell" style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                              {user ? (user.displayName || user.email) : scope.userId}
                            </td>
                            <td>
                              <span style={{ padding: "3px 8px", borderRadius: 12, background: "#edf4ff", color: "#1769ff", fontSize: 8, fontWeight: 900 }}>
                                {scope.module}
                              </span>
                            </td>
                            <td style={{ fontSize: 8 }}>{country ?? "الكل"}</td>
                            <td style={{ fontSize: 8 }}>{scope.cityId ?? "—"}</td>
                            <td>
                              <div className="admin-row-actions">
                                <button className="danger" type="button" onClick={() => removeScope(scope.id)} disabled={scopesBusy}>حذف</button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {scopes.length === 0 && (
                        <tr><td colSpan={5}><div className="admin-empty"><span>◇</span><strong>لا توجد نطاقات بعد</strong></div></td></tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </section>

            {canManage && (
              <form className="admin-panel admin-access-form" onSubmit={addScope}>
                <div className="admin-panel-title"><div><p>إضافة</p><h2>نطاق مشرف جديد</h2></div></div>
                <label>
                  المستخدم
                  <select value={scopeForm.userId} onChange={(e) => setScopeForm({ ...scopeForm, userId: e.target.value })} required>
                    <option value="">— اختر مستخدم —</option>
                    {eligibleUsers.map((u) => (
                      <option key={u.id} value={u.id}>{u.displayName || u.email} ({ROLE_CATALOG[u.role as keyof typeof ROLE_CATALOG]?.nameAr ?? u.role})</option>
                    ))}
                  </select>
                </label>
                <label>
                  الوحدة
                  <select value={scopeForm.module} onChange={(e) => setScopeForm({ ...scopeForm, module: e.target.value })} required>
                    <option value="">— اختر وحدة —</option>
                    {scopeModules.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </label>
                <label>
                  الدولة <small style={{ color: "#8c9ab0", fontWeight: 400 }}>(اختياري — اتركه فارغاً لكل الدول)</small>
                  <select value={scopeForm.countryCode} onChange={(e) => setScopeForm({ ...scopeForm, countryCode: e.target.value })}>
                    <option value="">كل الدول</option>
                    {countries.map(([id, label]) => (
                      <option key={id} value={id}>{label}</option>
                    ))}
                  </select>
                </label>
                <label>
                  المدينة <small style={{ color: "#8c9ab0", fontWeight: 400 }}>(اختياري)</small>
                  <input value={scopeForm.cityId} onChange={(e) => setScopeForm({ ...scopeForm, cityId: e.target.value })} placeholder="مثال: om-muscat" />
                </label>
                <button className="admin-primary" type="submit" disabled={scopesBusy || !scopeForm.userId || !scopeForm.module}>
                  إضافة النطاق
                </button>
              </form>
            )}
          </div>
        </>
      )}
    </>
  );
}
