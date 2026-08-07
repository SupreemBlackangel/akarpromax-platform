# Services Sidebar Navigation

## Overview

Centralized sidebar configuration for all services dashboards. Single source of truth for navigation items, permissions, badges, and feature flags.

## Configuration Files

```
src/config/
├── sidebar.ts              # Main export + types
├── user-sidebar.ts         # Customer dashboard
├── provider-sidebar.ts     # Provider workspace
├── supervisor-sidebar.ts   # Supervisor dashboard
└── admin-sidebar.ts        # Admin panel (existing)
```

## Sidebar Item Schema

```typescript
interface SidebarItem {
  key: string;                    // Unique identifier, matches route segment
  labelKey: string;               // i18n translation key
  href: string;                   // Full path
  icon: string;                   // Emoji or Lucide icon name
  requiredRole?: SponsorRole | SponsorRole[];      // Role requirement
  requiredPermission?: string | string[];          // Permission requirement
  badgeKey?: string;              // Key for badge count API
  featureFlag?: string;           // Feature flag key
  children?: SidebarItem[];       // Nested items (for admin)
}
```

## Permission Evaluation

```typescript
function hasPermission(identity, permission) {
  if (!permission) return true;
  const perms = Array.isArray(permission) ? permission : [permission];
  return perms.some(p => identity.permissions.includes(p) || identity.permissions.includes("*"));
}

function hasRole(identity, role) {
  if (!role) return true;
  const roles = Array.isArray(role) ? role : [role];
  return roles.includes(identity.role);
}

function getVisibleItems(items, identity) {
  return items
    .filter(item => hasPermission(identity, item.requiredPermission) && hasRole(identity, item.requiredRole))
    .map(item => ({
      ...item,
      children: item.children ? getVisibleItems(item.children, identity) : undefined
    }));
}
```

## Badge Counts API

Single endpoint: `GET /api/service-dashboard/counts`

Returns:
```json
{
  "openRequests": 5,
  "matchedRequests": 3,
  "activeJobs": 2,
  "pendingOffers": 1,
  "unreadNotifications": 7,
  "unreadMessages": 2,
  "openDisputes": 1,
  "pendingVerification": 0,
  "newReviews": 0
}
```

Sidebar items with `badgeKey` fetch count from this single response.

## Customer Sidebar (`user-sidebar.ts`)

```typescript
export const customerSidebarConfig = {
  items: [
    { key: "overview",        labelKey: "services.dashboard",       href: "/dashboard/services",           icon: "📊" },
    { key: "my-requests",     labelKey: "services.myRequests",      href: "/dashboard/services/my-requests", icon: "📝", requiredPermission: "SERVICE_REQUESTS_MANAGE_OWN" },
    { key: "create-request",  labelKey: "services.postRequest",     href: "/service-requests/new",           icon: "➕" },
    { key: "matched-requests",labelKey: "services.matchedRequests", href: "/dashboard/services/matched-requests", icon: "🎯" },
    { key: "offers",          labelKey: "services.myOffers",        href: "/dashboard/services/offers",      icon: "💼", badgeKey: "pendingOffers" },
    { key: "active-jobs",     labelKey: "services.activeJobs",      href: "/dashboard/services/jobs",        icon: "🔧", badgeKey: "activeJobs" },
    { key: "completed-jobs",  labelKey: "services.completedJobs",   href: "/dashboard/services/jobs?status=completed", icon: "✅" },
    { key: "favorites",       labelKey: "services.favorites",       href: "/dashboard/services/favorites",   icon: "⭐" },
    { key: "inbox",           labelKey: "services.messages",        href: "/dashboard/services/inbox",       icon: "💬", badgeKey: "unreadMessages" },
    { key: "notifications",   labelKey: "services.notifications",   href: "/dashboard/services/notifications", icon: "🔔", badgeKey: "unreadNotifications" },
    { key: "reviews",         labelKey: "services.reviews",         href: "/dashboard/services/reviews",     icon: "⭐" },
    { key: "settings",        labelKey: "services.settings",        href: "/account/security",               icon: "⚙" },
  ],
  getVisibleItems: (identity) => items.filter(...)
};
```

## Provider Sidebar (`provider-sidebar.ts`)

```typescript
export const providerSidebarConfig = {
  items: [
    { key: "overview",           labelKey: "services.dashboard",           href: "/dashboard/services",                    icon: "📊" },
    { key: "nearby-requests",    labelKey: "services.nearbyRequests",      href: "/dashboard/services/matched-requests",   icon: "📍" },
    { key: "available-requests", labelKey: "services.availableRequests",   href: "/dashboard/services/matched-requests?status=published", icon: "📋" },
    { key: "my-offers",          labelKey: "services.myOffers",            href: "/dashboard/services/offers",             icon: "💼", badgeKey: "pendingOffers" },
    { key: "active-jobs",        labelKey: "services.activeJobs",          href: "/dashboard/services/jobs",               icon: "🔧", badgeKey: "activeJobs" },
    { key: "completed-jobs",     labelKey: "services.completedJobs",       href: "/dashboard/services/jobs?status=completed", icon: "✅" },
    { key: "my-services",        labelKey: "services.myServices",          href: "/dashboard/services/my-services",        icon: "🛠" },
    { key: "portfolio",          labelKey: "services.portfolio",           href: "/dashboard/services/portfolio",          icon: "🖼" },
    { key: "reviews",            labelKey: "services.reviews",             href: "/dashboard/services/reviews",            icon: "⭐", badgeKey: "newReviews" },
    { key: "coverage-areas",     labelKey: "services.coverageAreas",       href: "/dashboard/services/coverage",           icon: "🗺" },
    { key: "working-hours",      labelKey: "services.workingHours",        href: "/dashboard/services/hours",              icon: "🕐" },
    { key: "notifications",      labelKey: "services.notifications",       href: "/dashboard/services/notifications",      icon: "🔔", badgeKey: "unreadNotifications" },
    { key: "provider-profile",   labelKey: "services.providerProfile",     href: "/dashboard/services/provider-profile",   icon: "👨‍🔧" },
    { key: "verification",       labelKey: "services.verification",        href: "/dashboard/services/verification",       icon: "📄" },
    { key: "settings",           labelKey: "services.settings",            href: "/account/security",                      icon: "⚙" },
  ],
  getVisibleItems: (identity) => items.filter(...)
};
```

## Supervisor Sidebar (`supervisor-sidebar.ts`)

```typescript
export const serviceSupervisorSidebarConfig = {
  items: [
    { key: "overview",             labelKey: "services.dashboard",          href: "/dashboard/services/supervisor",           icon: "📊", requiredPermission: "SERVICE_REPORTS_MANAGE" },
    { key: "all-requests",         labelKey: "services.allRequests",        href: "/dashboard/services/supervisor/requests",    icon: "📋", requiredPermission: "SERVICE_REQUESTS_MANAGE_ALL" },
    { key: "pending-review",       labelKey: "services.pendingReview",      href: "/dashboard/services/supervisor/requests?status=pending", icon: "⏳", requiredPermission: "SERVICE_REQUESTS_MANAGE_ALL" },
    { key: "open-requests",        labelKey: "services.openRequests",       href: "/dashboard/services/supervisor/requests?status=open", icon: "📂", requiredPermission: "SERVICE_REQUESTS_MANAGE_ALL" },
    { key: "in-progress",          labelKey: "services.inProgress",         href: "/dashboard/services/supervisor/jobs?status=in_progress", icon: "🔧", requiredPermission: "SERVICE_REQUESTS_MANAGE_ALL" },
    { key: "offers",               labelKey: "services.offers",             href: "/dashboard/services/supervisor/offers",    icon: "💼", requiredPermission: "SERVICE_OFFERS_MANAGE_ALL" },
    { key: "providers",            labelKey: "services.allProviders",       href: "/dashboard/services/supervisor/providers", icon: "👥", requiredPermission: "SERVICE_PROVIDERS_REVIEW" },
    { key: "verification-queue",   labelKey: "services.verificationQueue",  href: "/dashboard/services/supervisor/verification", icon: "📄", requiredPermission: "SERVICE_PROVIDERS_REVIEW" },
    { key: "categories",           labelKey: "services.categories",         href: "/dashboard/services/supervisor/categories",  icon: "🗂", requiredPermission: "SERVICE_CATEGORIES_MANAGE" },
    { key: "coverage-areas",       labelKey: "services.coverageAreas",      href: "/dashboard/services/supervisor/coverage",  icon: "🗺", requiredPermission: "SERVICE_CATEGORIES_MANAGE" },
    { key: "reviews",              labelKey: "services.moderateReviews",    href: "/dashboard/services/supervisor/reviews",   icon: "⭐", requiredPermission: "SERVICES_REVIEW_MODERATE" },
    { key: "disputes",             labelKey: "services.disputes",           href: "/dashboard/services/supervisor/disputes",  icon: "⚖", requiredPermission: "SERVICES_DISPUTE_RESOLVE" },
    { key: "service-ads",          labelKey: "services.ads",                href: "/dashboard/services/supervisor/ads",       icon: "📢", requiredPermission: "SERVICE_ADS_MANAGE" },
    { key: "notifications",        labelKey: "services.notifications",      href: "/dashboard/services/supervisor/notifications", icon: "🔔", requiredPermission: "SERVICE_NOTIFICATIONS_VIEW" },
    { key: "reports",              labelKey: "services.reports",            href: "/dashboard/services/supervisor/reports",   icon: "📈", requiredPermission: "SERVICE_REPORTS_MANAGE" },
    { key: "settings",             labelKey: "services.settings",           href: "/dashboard/services/supervisor/settings",  icon: "⚙", requiredPermission: "SETTINGS_MANAGE" },
    { key: "audit-log",            labelKey: "services.auditLog",           href: "/dashboard/services/supervisor/audit",     icon: "📝", requiredPermission: "SERVICE_REPORTS_MANAGE" },
  ],
  getVisibleItems: (identity) => items.filter(...)
};
```

## Admin Sidebar (`admin-sidebar.ts` - Existing)

Enhanced with services children:

```typescript
const navGroups = [
  // ... existing groups
  {
    label: "الخدمات والمنظمات",
    items: [
      { 
        href: "/admin/services", 
        icon: "✦", 
        label: "سوق الخدمات", 
        permission: [PERMISSIONS.SERVICE_CATEGORIES_MANAGE, PERMISSIONS.SERVICE_REPORTS_MANAGE, PERMISSIONS.SERVICE_PROVIDERS_REVIEW],
        children: [
          { key: "services-overview",      labelKey: "admin.services.overview",      href: "/admin/services",                 icon: "📊" },
          { key: "services-requests",      labelKey: "admin.services.requests",      href: "/admin/services/requests",        icon: "📋" },
          { key: "services-categories",    labelKey: "admin.services.categories",    href: "/admin/services/categories",      icon: "🗂" },
          { key: "services-providers",     labelKey: "admin.services.providers",     href: "/admin/services/providers",       icon: "👥" },
          { key: "services-verifications", labelKey: "admin.services.verifications", href: "/admin/services/verifications",   icon: "📄" },
          { key: "services-offers",        labelKey: "admin.services.offers",        href: "/admin/services/offers",          icon: "💼" },
          { key: "services-reviews",       labelKey: "admin.services.reviews",       href: "/admin/services/reviews",         icon: "⭐" },
          { key: "services-disputes",      labelKey: "admin.services.disputes",      href: "/admin/services/disputes",        icon: "⚖" },
          { key: "services-settings",      labelKey: "admin.services.settings",      href: "/admin/services/settings",        icon: "⚙" },
        ]
      },
      // ... sponsors, ads, etc.
    ]
  ]
];
```

## Usage in Components

### ServiceDashboardShell
```typescript
import { getSidebarConfig } from "@/src/config/sidebar";

export default function ServiceDashboardShell({ viewer, active, children }) {
  const userType = getUserType(viewer);  // "customer" | "provider" | "supervisor"
  const config = getSidebarConfig(userType);
  const visibleItems = config.getVisibleItems(viewer);
  
  return (
    <aside>
      <nav>
        {visibleItems.map(item => (
          item.children ? (
            <CollapsibleSection key={item.key} item={item} active={active} />
          ) : (
            <SidebarLink key={item.key} item={item} active={active} badgeCounts={badgeCounts} />
          )
        ))}
      </nav>
    </aside>
  );
}
```

### Badge Integration
```typescript
const [badgeCounts, setBadgeCounts] = useState<Record<string, number>>({});

useEffect(() => {
  apiFetch("/api/service-dashboard/counts").then(data => setBadgeCounts(data));
}, [viewer.authenticated]);

// In render:
{visibleItems.map(item => (
  <SidebarLink
    key={item.key}
    item={item}
    active={active}
    badge={item.badgeKey ? badgeCounts[item.badgeKey] : 0}
  />
))}
```

## Mobile Support

- Same config used for mobile drawer
- `SidebarLink` component responsive
- Hamburger menu toggles drawer
- Same permission filtering applies

## Feature Flags

```typescript
interface SidebarItem {
  featureFlag?: string;  // e.g., "services.disputes.enabled"
}
```

Evaluated at render time:
```typescript
const isEnabled = !item.featureFlag || featureFlags[item.featureFlag];
```

## Migration from Hardcoded

### Before (ServiceDashboardShell.tsx)
```typescript
const navItems = [
  { key: "overview", href: "/dashboard/services", label: "نظرة عامة", icon: "📊" },
  // ... hardcoded
];
```

### After
```typescript
import { customerSidebarConfig } from "@/src/config/sidebar";

const config = getSidebarConfig("customer");
const visibleItems = config.getVisibleItems(viewer);
```

## Testing

See `tests/services-marketplace.test.mjs`:
- `provider dashboard ships all ten pages behind auth and boundary-clean aliases`
- Verifies all 10 provider pages exist
- Checks `useServicesPage` and `ServiceDashboardShell` usage
- Validates `@services-ui/` imports (no legacy paths)
- Verifies session-only identity (no ChatGPT headers)