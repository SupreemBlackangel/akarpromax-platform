import type { IconName } from "@/src/components/ui/Icon";
import type { SponsorRole } from "@/src/constants/roles";
import { PERMISSIONS } from "@/src/constants/permissions";

export type SidebarItem = {
  key: string;
  labelKey: string;
  href: string;
  icon: IconName;
  requiredRole?: SponsorRole | SponsorRole[] | string | string[];
  requiredPermission?: string | string[];
  badgeKey?: string;
  featureFlag?: string;
  children?: SidebarItem[];
};

export type SidebarConfig = {
  items: SidebarItem[];
  getVisibleItems: (identity: { role: string; permissions: string[] }) => SidebarItem[];
};

function hasPermission(identity: { permissions: string[] }, permission: string | string[] | undefined): boolean {
  if (!permission) return true;
  const perms = Array.isArray(permission) ? permission : [permission];
  return perms.some((p) => identity.permissions.includes(p) || identity.permissions.includes("*"));
}

function hasRole(identity: { role: string }, role: SponsorRole | SponsorRole[] | string | string[] | undefined): boolean {
  if (!role) return true;
  const roles = Array.isArray(role) ? role : [role];
  return roles.includes(identity.role);
}

export const customerSidebarConfig: SidebarConfig = {
  items: [
    { key: "overview", labelKey: "services.dashboard", href: "/dashboard/services", icon: "analytics" },
    { key: "my-requests", labelKey: "services.myRequests", href: "/dashboard/services/my-requests", icon: "requests" },
    { key: "create-request", labelKey: "services.postRequest", href: "/service-requests/new", icon: "add" },
    { key: "matched-requests", labelKey: "services.matchedRequests", href: "/dashboard/services/matched-requests", icon: "matched" },
    { key: "offers", labelKey: "services.myOffers", href: "/dashboard/services/offers", icon: "offers" },
    { key: "active-jobs", labelKey: "services.activeJobs", href: "/dashboard/services/jobs", icon: "jobs" },
    { key: "completed-jobs", labelKey: "services.completedJobs", href: "/dashboard/services/jobs?status=completed", icon: "completed" },
    { key: "inbox", labelKey: "services.messages", href: "/dashboard/services/inbox", icon: "messages", badgeKey: "unreadMessages" },
    { key: "notifications", labelKey: "services.notifications", href: "/dashboard/services/notifications", icon: "notifications", badgeKey: "unreadNotifications" },
    { key: "reviews", labelKey: "services.reviews", href: "/dashboard/services/reviews", icon: "reviews" },
    { key: "settings", labelKey: "services.settings", href: "/account/security", icon: "settings" },
  ],
  getVisibleItems: (identity) => {
    const base = customerSidebarConfig.items.filter((item) => hasPermission(identity, item.requiredPermission) && hasRole(identity, item.requiredRole));
    if (!identity.permissions.includes(PERMISSIONS.SERVICE_REQUESTS_MANAGE_OWN)) {
      return base.filter((item) => !["my-requests", "create-request", "offers", "active-jobs", "completed-jobs"].includes(item.key));
    }
    return base;
  },
};

export const providerSidebarConfig: SidebarConfig = {
  items: [
    { key: "overview", labelKey: "services.dashboard", href: "/dashboard/services", icon: "analytics" },
    { key: "nearby-requests", labelKey: "services.nearbyRequests", href: "/dashboard/services/matched-requests", icon: "nearby" },
    { key: "available-requests", labelKey: "services.availableRequests", href: "/dashboard/services/matched-requests?status=published", icon: "list" },
    { key: "my-offers", labelKey: "services.myOffers", href: "/dashboard/services/offers", icon: "offers", badgeKey: "pendingOffers" },
    { key: "active-jobs", labelKey: "services.activeJobs", href: "/dashboard/services/jobs", icon: "jobs", badgeKey: "activeJobs" },
    { key: "completed-jobs", labelKey: "services.completedJobs", href: "/dashboard/services/jobs?status=completed", icon: "completed" },
    { key: "reviews", labelKey: "services.reviews", href: "/dashboard/services/reviews", icon: "reviews", badgeKey: "newReviews" },
    { key: "notifications", labelKey: "services.notifications", href: "/dashboard/services/notifications", icon: "notifications", badgeKey: "unreadNotifications" },
    { key: "provider-profile", labelKey: "services.providerProfile", href: "/dashboard/services/provider-profile", icon: "worker" },
    { key: "settings", labelKey: "services.settings", href: "/account/security", icon: "settings" },
  ],
  getVisibleItems: (identity) => {
    return providerSidebarConfig.items.filter((item) => hasPermission(identity, item.requiredPermission) && hasRole(identity, item.requiredRole));
  },
};

export const serviceSupervisorSidebarConfig: SidebarConfig = {
  items: [
    { key: "overview", labelKey: "services.dashboard", href: "/dashboard/services/supervisor", icon: "analytics", requiredPermission: PERMISSIONS.SERVICE_REPORTS_MANAGE },
    { key: "all-requests", labelKey: "services.allRequests", href: "/dashboard/services/supervisor/requests", icon: "list", requiredPermission: PERMISSIONS.SERVICE_REQUESTS_MANAGE_ALL },
    { key: "providers", labelKey: "services.allProviders", href: "/dashboard/services/supervisor/providers", icon: "providers", requiredPermission: PERMISSIONS.SERVICE_PROVIDERS_REVIEW },
    { key: "verification-queue", labelKey: "services.verificationQueue", href: "/dashboard/services/supervisor/verification", icon: "documents", requiredPermission: PERMISSIONS.SERVICE_PROVIDERS_REVIEW },
    { key: "reviews", labelKey: "services.moderateReviews", href: "/dashboard/services/reviews", icon: "reviews", requiredPermission: PERMISSIONS.SERVICES_REVIEW_MODERATE },
    { key: "disputes", labelKey: "services.disputes", href: "/dashboard/services/disputes", icon: "disputes", requiredPermission: PERMISSIONS.SERVICES_DISPUTE_RESOLVE },
    { key: "notifications", labelKey: "services.notifications", href: "/dashboard/services/notifications", icon: "notifications", requiredPermission: PERMISSIONS.SERVICE_NOTIFICATIONS_VIEW },
    { key: "settings", labelKey: "services.settings", href: "/account/security", icon: "settings", requiredPermission: PERMISSIONS.SETTINGS_MANAGE },
  ],
  getVisibleItems: (identity) => {
    return serviceSupervisorSidebarConfig.items.filter((item) => hasPermission(identity, item.requiredPermission) && hasRole(identity, item.requiredRole));
  },
};

export const adminSidebarConfig: SidebarConfig = {
  items: [
    { key: "dashboard", labelKey: "admin.dashboard", href: "/admin", icon: "dashboard", requiredPermission: PERMISSIONS.ADMIN_DASHBOARD_VIEW },
    { key: "users", labelKey: "admin.users", href: "/admin/users", icon: "users", requiredPermission: PERMISSIONS.USERS_VIEW },
    { key: "roles", labelKey: "admin.roles", href: "/admin/roles", icon: "roles", requiredPermission: PERMISSIONS.ROLES_VIEW },
    {
      key: "services",
      labelKey: "admin.services",
      href: "/admin/services",
      icon: "services",
      requiredPermission: [PERMISSIONS.SERVICE_CATEGORIES_MANAGE, PERMISSIONS.SERVICE_REPORTS_MANAGE, PERMISSIONS.SERVICE_PROVIDERS_REVIEW],
      children: [
        { key: "services-overview", labelKey: "admin.services.overview", href: "/admin/services", icon: "analytics" },
        { key: "services-requests", labelKey: "admin.services.requests", href: "/admin/services/requests", icon: "list" },
        { key: "services-categories", labelKey: "admin.services.categories", href: "/admin/services/categories", icon: "categories" },
        { key: "services-providers", labelKey: "admin.services.providers", href: "/admin/services/providers", icon: "providers" },
        { key: "services-verifications", labelKey: "admin.services.verifications", href: "/admin/services/verifications", icon: "documents" },
        { key: "services-offers", labelKey: "admin.services.offers", href: "/admin/services/offers", icon: "offers" },
        { key: "services-reviews", labelKey: "admin.services.reviews", href: "/admin/services/reviews", icon: "reviews" },
        { key: "services-disputes", labelKey: "admin.services.disputes", href: "/admin/services/disputes", icon: "disputes" },
        { key: "services-settings", labelKey: "admin.services.settings", href: "/admin/services/settings", icon: "settings" },
      ],
    },
    { key: "advertisers", labelKey: "admin.advertisers", href: "/admin/advertisers", icon: "advertisers", requiredPermission: PERMISSIONS.ADVERTISERS_VIEW },
    { key: "news", labelKey: "admin.news", href: "/admin/news", icon: "news", requiredPermission: PERMISSIONS.NEWS_VIEW },
    { key: "i18n", labelKey: "admin.i18n", href: "/admin/i18n", icon: "i18n", requiredPermission: PERMISSIONS.I18N_VIEW },
    { key: "ads", labelKey: "admin.ads", href: "/admin/ads", icon: "ads", requiredPermission: PERMISSIONS.ADS_VIEW },
    { key: "reports", labelKey: "admin.reports", href: "/admin/reports", icon: "reports", requiredPermission: PERMISSIONS.REPORTS_VIEW },
    { key: "settings", labelKey: "admin.settings", href: "/admin/settings", icon: "settings", requiredPermission: PERMISSIONS.SETTINGS_MANAGE },
  ],
  getVisibleItems: (identity) => {
    return adminSidebarConfig.items.filter((item) => hasPermission(identity, item.requiredPermission) && hasRole(identity, item.requiredRole));
  },
};

export const officeSidebarConfig: SidebarConfig = {
  items: [
    { key: "overview", labelKey: "office.overview", href: "/dashboard/office/integration", icon: "analytics", requiredPermission: PERMISSIONS.OFFICE_INTEGRATION_VIEW },
    { key: "devices", labelKey: "office.devices", href: "/dashboard/office/devices", icon: "ads", requiredPermission: PERMISSIONS.OFFICE_DEVICES_MANAGE },
    { key: "pairing", labelKey: "office.pairing", href: "/dashboard/office/devices?tab=pairing", icon: "integration", requiredPermission: PERMISSIONS.OFFICE_PAIRING_MANAGE },
    { key: "radar", labelKey: "office.radar", href: "/dashboard/office/radar", icon: "matched", requiredPermission: PERMISSIONS.OFFICE_RADAR_VIEW },
    { key: "sync", labelKey: "office.sync", href: "/dashboard/office/sync", icon: "integration", requiredPermission: PERMISSIONS.OFFICE_SYNC_VIEW },
    { key: "notifications", labelKey: "office.notifications", href: "/dashboard/office/notifications", icon: "notifications", requiredPermission: PERMISSIONS.OFFICE_NOTIFICATIONS_VIEW },
    { key: "settings", labelKey: "services.settings", href: "/account/security", icon: "settings" },
  ],
  getVisibleItems: (identity) => {
    return officeSidebarConfig.items.filter((item) => hasPermission(identity, item.requiredPermission) && hasRole(identity, item.requiredRole));
  },
};

export function getSidebarConfig(userType: "customer" | "provider" | "supervisor" | "admin" | "office"): SidebarConfig {
  switch (userType) {
    case "customer":
      return customerSidebarConfig;
    case "provider":
      return providerSidebarConfig;
    case "supervisor":
      return serviceSupervisorSidebarConfig;
    case "admin":
      return adminSidebarConfig;
    case "office":
      return officeSidebarConfig;
    default:
      return customerSidebarConfig;
  }
}