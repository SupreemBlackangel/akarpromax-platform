# Services RBAC Policy

## Roles and Permissions Matrix

### System Roles
| Role | Description | Base Permissions |
|------|-------------|------------------|
| `guest` | Unauthenticated visitor | None |
| `viewer` | Authenticated customer | `TOOLS_USE`, `SERVICES_VIEW`, `SERVICE_REQUESTS_MANAGE_OWN`, `SERVICE_OFFERS_MANAGE_OWN`, `SERVICE_JOBS_MANAGE_OWN`, `SERVICE_NOTIFICATIONS_VIEW` |
| `service_provider` | Verified service provider | Viewer + `SERVICES_CREATE`, `SERVICES_UPDATE`, `MEDIA_UPLOAD`, `SERVICE_PROVIDERS_APPLY`, `SERVICE_PROVIDERS_MANAGE`, `SERVICE_PROVIDERS_REVIEW` |
| `service_supervisor` | Services moderator | Provider + `SERVICES_APPROVE`, `SERVICES_REVIEW_MODERATE`, `SERVICES_DISPUTE_RESOLVE`, `SERVICE_CATEGORIES_MANAGE`, `SERVICE_PROVIDERS_MANAGE`, `SERVICE_PROVIDERS_REVIEW`, `SERVICE_REQUESTS_MANAGE_ALL`, `SERVICE_OFFERS_MANAGE_ALL`, `SERVICE_REPORTS_MANAGE`, `SERVICE_ADS_MANAGE`, `ADS_VIEW`, `ADS_CREATE`, `ADS_UPDATE`, `REPORTS_VIEW`, `I18N_VIEW` |
| `country_manager` | Country-level admin | Various country-scoped permissions |
| `ad_manager` | Ads manager | Ads-focused permissions |
| `ads_reviewer` | Ads reviewer | Ads review permissions |
| `sponsor_admin` | Sponsor program admin | Sponsor management permissions |
| `sponsor_manager` | Executive sponsor admin | Full sponsor permissions |
| `super_admin` | Platform owner | All permissions (`*`) |

### Service-Specific Permissions

| Permission | Description | Roles |
|------------|-------------|-------|
| `SERVICES_VIEW` | View public services | viewer, provider, supervisor, admin |
| `SERVICES_CREATE` | Create service requests/listings | viewer, provider, supervisor |
| `SERVICES_UPDATE` | Update own requests/listings | viewer, provider, supervisor |
| `SERVICES_DELETE` | Delete own requests/listings | viewer, provider, supervisor |
| `SERVICES_APPROVE` | Approve/reject requests/listings | supervisor, admin |
| `SERVICES_REVIEW_MODERATE` | Moderate reviews | supervisor, admin |
| `SERVICES_DISPUTE_RESOLVE` | Resolve disputes | supervisor, admin |
| `SERVICE_CATEGORIES_MANAGE` | Full category CRUD | supervisor, admin |
| `SERVICE_PROVIDERS_APPLY` | Apply for provider verification | provider, supervisor |
| `SERVICE_PROVIDERS_MANAGE` | Manage own provider profile | provider, supervisor |
| `SERVICE_PROVIDERS_REVIEW` | Review/verify providers | supervisor, admin |
| `SERVICE_REQUESTS_MANAGE_OWN` | Manage own requests | viewer, provider, supervisor |
| `SERVICE_REQUESTS_MANAGE_ALL` | Manage all requests | supervisor, admin |
| `SERVICE_OFFERS_MANAGE_OWN` | Manage own offers | viewer, provider, supervisor |
| `SERVICE_OFFERS_MANAGE_ALL` | Manage all offers | supervisor, admin |
| `SERVICE_JOBS_MANAGE_OWN` | Manage own jobs | viewer, provider, supervisor |
| `SERVICE_REPORTS_MANAGE` | Manage reports | supervisor, admin |
| `SERVICE_NOTIFICATIONS_VIEW` | View notifications | viewer, provider, supervisor |
| `SERVICE_ADS_MANAGE` | Manage service ads | supervisor, admin |

### Permission Inheritance
```
viewer
  └── service_provider
        └── service_supervisor
              └── country_manager / ad_manager / ads_reviewer / sponsor_admin
                    └── sponsor_manager
                          └── super_admin (has "*")
```

### API Endpoint Permission Mapping

| Endpoint | Required Permission(s) |
|----------|------------------------|
| `GET /api/service-requests` | `SERVICES_VIEW` |
| `POST /api/service-requests` | `SERVICES_CREATE` |
| `GET /api/service-requests/[id]` | `SERVICES_VIEW` |
| `PATCH /api/service-requests/[id]` (cancel) | `SERVICE_REQUESTS_MANAGE_OWN` |
| `PATCH /api/service-requests/[id]` (acceptOffer) | `SERVICE_REQUESTS_MANAGE_OWN` |
| `POST /api/service-requests/[id]/publish` | `SERVICES_CREATE` |
| `GET /api/service-offers` | `SERVICES_VIEW` |
| `POST /api/service-offers` | `SERVICES_CREATE` + `SERVICE_OFFERS_MANAGE_OWN` |
| `PATCH /api/service-offers/[id]` (accept/decline) | `SERVICE_OFFERS_MANAGE_OWN` |
| `PATCH /api/service-offers/[id]` (revise) | `SERVICE_OFFERS_MANAGE_OWN` |
| `PATCH /api/service-offers/[id]` (withdraw) | `SERVICE_OFFERS_MANAGE_OWN` |
| `GET /api/service-providers` | `SERVICES_VIEW` |
| `POST /api/service-providers` | `SERVICE_PROVIDERS_APPLY` |
| `GET /api/service-providers/me` | `SERVICE_PROVIDERS_MANAGE` |
| `PATCH /api/service-providers/[id]/status` | `SERVICE_PROVIDERS_REVIEW` |
| `POST /api/service-providers/[id]/categories` | `SERVICE_PROVIDERS_MANAGE` |
| `GET /api/service-providers/me/matched-requests` | `SERVICE_PROVIDERS_MANAGE` |
| `POST /api/service-categories` | `SERVICE_CATEGORIES_MANAGE` |
| `PATCH /api/service-categories/[id]` | `SERVICE_CATEGORIES_MANAGE` |
| `DELETE /api/service-categories/[id]` | `SERVICE_CATEGORIES_MANAGE` |
| `GET /api/service-admin` | Any of: `SERVICE_CATEGORIES_MANAGE`, `SERVICE_REPORTS_MANAGE`, `SERVICE_PROVIDERS_REVIEW` |
| `GET /api/service-notifications` | `SERVICE_NOTIFICATIONS_VIEW` |
| `GET /api/service-jobs` | `SERVICE_JOBS_MANAGE_OWN` |
| `PATCH /api/service-jobs/[id]/status` | `SERVICE_JOBS_MANAGE_OWN` |
| `POST /api/service-jobs/[id]/review` | `SERVICE_JOBS_MANAGE_OWN` |
| `GET /api/service-reports` | `SERVICE_REPORTS_MANAGE` |
| `POST /api/service-reports` | `SERVICE_REPORTS_MANAGE` |
| `POST /api/service-reports/[id]/resolve` | `SERVICE_REPORTS_MANAGE` |
| `GET /api/service-disputes` | `SERVICES_VIEW` |
| `POST /api/service-disputes` | `SERVICES_CREATE` |
| `PATCH /api/service-disputes` | `SERVICES_DISPUTE_RESOLVE` |

### Frontend Route Protection

All dashboard pages use `ServiceDashboardShell` which:
1. Checks `viewer.authenticated` - redirects to login if false
2. Renders sidebar based on user's permissions via `getSidebarConfig(userType)`
3. Only renders nav items where `hasPermission(identity, item.requiredPermission)`

### Admin Panel Protection

`/admin/services` page uses:
```typescript
const REQUIRED_PERMISSIONS = [
  PERMISSIONS.SERVICE_CATEGORIES_MANAGE,
  PERMISSIONS.SERVICE_REPORTS_MANAGE,
  PERMISSIONS.SERVICE_PROVIDERS_REVIEW,
];

// User needs AT LEAST ONE of these permissions
const hasAccess = REQUIRED_PERMISSIONS.some(p => hasSponsorPermission(identity, p));
```

Then wraps in `PermissionGuard` component for additional client-side protection.

### Supervisor Dashboard Access

`/dashboard/services/supervisor` checks:
```typescript
const userType = getUserType(viewer);
// Returns "supervisor" if:
// - permissions includes SERVICE_PROVIDERS_REVIEW OR SERVICE_REQUESTS_MANAGE_ALL
// Returns "admin" if:
// - permissions includes ADMIN_DASHBOARD_VIEW
// Returns "provider" if:
// - role === "service_provider"
// Returns "customer" otherwise
```

### Multi-Tenant Isolation

All queries scoped by:
- `country_code` for categories/listings
- `user_id` for ownership checks
- `sponsor_id` for sponsor-scoped entities

Provider matching respects country boundaries:
```sql
WHERE p.country_code = request.country_code
```

### Audit Requirements

All state-changing operations call `writeAudit()` with:
```typescript
{
  action: "entity.action",        // e.g., "service_request.create"
  entityType: "table_name",       // e.g., "service_requests"
  entityId: "uuid",               // affected entity
  metadata: { ... },              // context (categoryId, etc.)
  actorUserId: "email",           // from identity
  ipAddress: "x.x.x.x"            // from request headers
}
```

### Session Security

- HttpOnly `akar_session` cookie
- JWT with HS256, jti rotation, revocation set
- `assertSafeOrigin` on all mutating endpoints
- Rate limiting per operation
- `assertSafeOrigin` validates `Origin` header against allowed origins

### Testing Permissions

See `tests/services-authz.test.mjs` for 10 test scenarios covering:
1. Unauthenticated guest denied
2. Category permission grants access
3. Authenticated without permission denied
3. Super admin wildcard works
4. Provider review permission isolated
5. Reports permission isolated
6. Service supervisor role derives correct permissions
7. Viewer role has no admin scope
6. Null resolver falls back to guest
7. Clearing resolver restores guest identity