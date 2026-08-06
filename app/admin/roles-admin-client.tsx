"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { PERMISSIONS } from "@/src/constants/permissions";
import { ROLE_CATALOG, ROLE_ORDER, roleNameEn } from "@/src/constants/roles";

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

export default function RolesAdminClient() {
  const [visibleRoles] = useState<Set<string>>(() => new Set(ROLE_ORDER.filter((role) => role !== "guest")));
  const allPermissions = useMemo(() => permissionGroups.flatMap((group) => group.permissions), []);

  return (
    <>
      <header className="sponsor-admin-header">
        <div><p>نظام الصلاحيات</p><h1>الأدوار والصلاحيات</h1></div>
        <div className="admin-header-actions"><Link href="/" target="_blank">معاينة الموقع ↗</Link></div>
      </header>

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
  );
}
