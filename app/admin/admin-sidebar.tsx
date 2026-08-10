"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PERMISSIONS } from "@/src/constants/permissions";
import { roleNameAr } from "@/src/constants/roles";
import type { SponsorIdentity } from "@/lib/sponsor-auth";

const countries: Record<string, string> = {
  om: "عُمان", sa: "السعودية", ae: "الإمارات", qa: "قطر", kw: "الكويت",
  bh: "البحرين", eg: "مصر", jo: "الأردن", iq: "العراق", lb: "لبنان",
  ps: "فلسطين", sy: "سوريا", ye: "اليمن", ma: "المغرب", dz: "الجزائر",
  tn: "تونس", ly: "ليبيا", sd: "السودان", so: "الصومال", dj: "جيبوتي",
  mr: "موريتانيا", km: "جزر القمر", tr: "تركيا",
};

const SERVICE_PERMISSIONS = [
  PERMISSIONS.SERVICE_CATEGORIES_MANAGE,
  PERMISSIONS.SERVICE_REPORTS_MANAGE,
  PERMISSIONS.SERVICE_PROVIDERS_REVIEW,
];

type NavItem = { href: string; icon: string; label: string; permission?: string | string[] };
type NavGroup = { label: string; items: NavItem[] };

const navGroups: NavGroup[] = [
  {
    label: "الإدارة العامة",
    items: [{ href: "/admin", icon: "▦", label: "لوحة الإحصاءات", permission: PERMISSIONS.ADMIN_DASHBOARD_VIEW }],
  },
  {
    label: "المستخدمون والصلاحيات",
    items: [
      { href: "/admin/users", icon: "♙", label: "المستخدمون", permission: PERMISSIONS.USERS_VIEW },
      { href: "/admin/roles", icon: "♛", label: "الأدوار والصلاحيات", permission: PERMISSIONS.ROLES_VIEW },
    ],
  },
  {
    label: "الخدمات والمنظمات",
    items: [
      { href: "/admin/services", icon: "✦", label: "سوق الخدمات", permission: SERVICE_PERMISSIONS },
      { href: "/admin/properties", icon: "⌂", label: "تصنيف العقارات", permission: PERMISSIONS.PROPERTIES_VIEW },
      { href: "/admin/companies", icon: "◉", label: "تصنيف الشركات", permission: PERMISSIONS.PROPERTIES_VIEW },
      { href: "/admin/sponsors", icon: "▣", label: "نظام الرعاة", permission: PERMISSIONS.SPONSORS_VIEW },
      { href: "/admin/sponsors/requests", icon: "✉", label: "طلبات الرعاة", permission: PERMISSIONS.SPONSORS_APPROVE },
      { href: "/admin/sponsors/banner", icon: "◈", label: "شريط الرعاة", permission: PERMISSIONS.SPONSORS_VIEW },
    ],
  },
  {
    label: "المحتوى والقانون",
    items: [
      { href: "/admin/news", icon: "➤", label: "إدارة الأخبار", permission: PERMISSIONS.NEWS_VIEW },
      { href: "/admin/i18n", icon: "🔤", label: "إدارة الترجمات", permission: PERMISSIONS.I18N_VIEW },
    ],
  },
  {
    label: "الإعلانات والتقارير",
    items: [
      { href: "/admin/ads", icon: "▤", label: "مركز الإعلانات", permission: PERMISSIONS.ADS_VIEW },
      { href: "/admin/reports", icon: "↗", label: "التقارير", permission: PERMISSIONS.REPORTS_VIEW },
    ],
  },
  {
    label: "النظام المتصل",
    items: [{ href: "/admin/integration", icon: "🔗", label: "مركز التكامل", permission: PERMISSIONS.OFFICE_ADMIN_VIEW }],
  },
  {
    label: "التدقيق والمراجعة",
    items: [{ href: "/admin/audit", icon: "📓", label: "سجل التدقيق", permission: PERMISSIONS.ADMIN_DASHBOARD_VIEW }],
  },
  {
    label: "إعدادات النظام",
    items: [{ href: "/admin/settings", icon: "⚙", label: "الإعدادات", permission: PERMISSIONS.SETTINGS_MANAGE }],
  },
];

function canSee(permission: string | string[] | undefined, granted: string[]): boolean {
  if (!permission) return true;
  return Array.isArray(permission)
    ? permission.some((item) => granted.includes(item))
    : granted.includes(permission);
}

export default function AdminSidebar({ identity }: { identity: SponsorIdentity }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    pathname === href || (href !== "/admin" && pathname.startsWith(href.endsWith("/") ? href : `${href}/`));

  return (
    <aside className="sponsor-admin-sidebar">
      <Link className="admin-brand" href="/"><span>A</span><div><strong>عقار بروماكس</strong><small>Admin Control</small></div></Link>
      <nav className="admin-nav" aria-label="لوحة الإدارة">
        {navGroups.map((group) => {
          const items = group.items.filter((item) => canSee(item.permission, identity.permissions));
          if (!items.length) return null;
          return (
            <div className="admin-nav-group" key={group.label}>
              <div className="admin-nav-group-head">{group.label}</div>
              {items.map((item) => (
                <Link key={item.href} href={item.href} className={isActive(item.href) ? "admin-nav-link active" : "admin-nav-link"}>
                  <span aria-hidden="true">{item.icon}</span>{item.label}
                </Link>
              ))}
            </div>
          );
        })}
      </nav>
      <div className="admin-user-card">
        <span>{identity.displayName.slice(0, 1).toUpperCase()}</span>
        <div>
          <strong>{identity.displayName}</strong>
          <small>{roleNameAr(identity.role)}{identity.countryCode ? ` • ${countries[identity.countryCode.toLowerCase()] ?? identity.countryCode.toUpperCase()}` : ""}</small>
        </div>
      </div>
    </aside>
  );
}
