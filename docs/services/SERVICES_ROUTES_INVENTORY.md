# Services Routes Inventory

## Public Routes

| Route | Method | Page Component | Description |
|-------|--------|----------------|-------------|
| `/services` | GET | `app/services/page.tsx` | Public hub with categories, providers, recent requests |
| `/services/categories` | GET | `app/services/categories/page.tsx` | All categories with search/filter |
| `/services/catalog` | GET | `app/services/catalog/page.tsx` | Category listing |
| `/services/catalog/[code]` | GET | `app/services/catalog/[code]/page.tsx` | Providers in category |
| `/providers/[id]` | GET | `app/providers/[id]/page.tsx` | Provider profile |
| `/providers/apply` | GET | `app/providers/apply/page.tsx` | Provider application |
| `/service-requests` | GET | `app/service-requests/page.tsx` | Public request listing |
| `/service-requests/new` | GET | `app/service-requests/new/page.tsx` | 8-step request wizard |
| `/service-requests/[id]` | GET | `app/service-requests/[id]/page.tsx` | Request detail with offers |
| `/service-requests/[id]/offer` | GET | `app/service-requests/[id]/offer/page.tsx` | Offer submission form |

## Customer Dashboard Routes

| Route | Method | Page Component | Active Tab |
|-------|--------|----------------|------------|
| `/dashboard/services` | GET | `app/dashboard/services/page.tsx` | overview |
| `/dashboard/services/my-requests` | GET | `app/dashboard/services/my-requests/page.tsx` | my-requests |
| `/dashboard/services/matched-requests` | GET | `app/dashboard/services/matched-requests/page.tsx` | matched-requests |
| `/dashboard/services/offers` | GET | `app/dashboard/services/offers/page.tsx` | offers |
| `/dashboard/services/offers/[id]` | GET | `app/dashboard/services/offers/[id]/page.tsx` | offers |
| `/dashboard/services/jobs` | GET | `app/dashboard/services/jobs/page.tsx` | jobs |
| `/dashboard/services/jobs/[id]` | GET | `app/dashboard/services/jobs/[id]/page.tsx` | jobs |
| `/dashboard/services/inbox` | GET | `app/dashboard/services/inbox/page.tsx` | inbox |
| `/dashboard/services/reviews` | GET | `app/dashboard/services/reviews/page.tsx` | reviews |
| `/dashboard/services/favorites` | GET | `app/dashboard/services/favorites/page.tsx` | favorites |
| `/dashboard/services/notifications` | GET | `app/dashboard/services/notifications/page.tsx` | notifications |
| `/dashboard/services/provider-profile` | GET | `app/dashboard/services/provider-profile/page.tsx` | provider-profile |
| `/dashboard/services/disputes` | GET | `app/dashboard/services/disputes/page.tsx` | disputes |

## Provider Workspace Routes

Uses same routes as customer dashboard with provider-specific data:
- `matched-requests` shows requests matching provider's categories/location
- `offers` shows provider's submitted offers
- `jobs` shows active/completed jobs for provider
- `provider-profile` for managing profile, categories, documents, portfolio
- `verification` for verification status and documents

## Supervisor Dashboard Routes

| Route | Method | Page Component | Description |
|-------|--------|----------------|-------------|
| `/dashboard/services/supervisor` | GET | `app/dashboard/services/supervisor/page.tsx` | Tabbed: overview, requests, offers, providers, reports, categories, disputes |

## Admin Routes

| Route | Method | Page Component | Permissions |
|-------|--------|----------------|-------------|
| `/admin/services` | GET | `app/admin/services/page.tsx` | Tabbed: overview, providers, reports, categories |
| `/admin/services/requests` | GET | (planned) | Request management |
| `/admin/services/offers` | GET | (planned) | Offer management |
| `/admin/services/providers` | GET | (planned) | Provider management |
| `/admin/services/verifications` | GET | (planned) | Verification queue |
| `/admin/services/categories` | GET | (planned) | Category CRUD |
| `/admin/services/reports` | GET | (planned) | Report management |
| `/admin/services/disputes` | GET | (planned) | Dispute management |
| `/admin/services/settings` | GET | (planned) | Settings |

## API Routes (Canonical)

### Service Requests
| Route | Methods | Description |
|-------|---------|-------------|
| `/api/service-requests` | GET, POST | List/create requests |
| `/api/service-requests/[id]` | GET, PATCH | Get/update request (cancel, accept offer) |
| `/api/service-requests/[id]/publish` | POST | Publish draft request |
| `/api/service-requests/[id]/cancel` | POST | Cancel request |
| `/api/service-requests/[id]/matches` | GET | Get matched providers |
| `/api/service-requests/[id]/matches/[providerId]` | PATCH | Mark contacted/ignored |
| `/api/service-requests/[id]/history` | GET | Status history |
| `/api/service-requests/[id]/attachments` | GET, POST | Attachments |

### Service Offers
| Route | Methods | Description |
|-------|---------|-------------|
| `/api/service-offers` | GET, POST | List/create offers |
| `/api/service-offers/[id]` | GET, PATCH | Get/update offer |
| `/api/service-offers/[id]/accept` | POST | Accept offer |
| `/api/service-offers/[id]/decline` | POST | Decline offer |
| `/api/service-offers/[id]/revise` | POST | Revise offer |
| `/api/service-offers/[id]/withdraw` | POST | Withdraw offer |

### Service Providers
| Route | Methods | Description |
|-------|---------|-------------|
| `/api/service-providers` | GET, POST | List/create provider profiles |
| `/api/service-providers/me` | GET | Current user's provider profile |
| `/api/service-providers/[id]` | GET, PATCH | Get/update profile |
| `/api/service-providers/[id]/status` | PATCH | Update verification status |
| `/api/service-providers/[id]/categories` | GET, POST | Manage categories |
| `/api/service-providers/[id]/documents` | GET, POST | Manage documents |
| `/api/service-providers/[id]/portfolio` | GET, POST | Manage portfolio |
| `/api/service-providers/me/matched-requests` | GET | Matched requests for provider |

### Service Categories
| Route | Methods | Description |
|-------|---------|-------------|
| `/api/service-categories` | GET, POST | List/create categories |
| `/api/service-categories/[id]` | GET, PATCH, DELETE | Get/update/delete category |

### Notifications
| Route | Methods | Description |
|-------|---------|-------------|
| `/api/service-notifications` | GET | List notifications |
| `/api/service-notifications/[id]/read` | POST | Mark read |
| `/api/service-notifications/read-all` | POST | Mark all read |

### Service Jobs
| Route | Methods | Description |
|-------|---------|-------------|
| `/api/service-jobs` | GET | List jobs |
| `/api/service-jobs/[id]` | GET | Job detail |
| `/api/service-jobs/[id]/status` | PATCH | Update job status |
| `/api/service-jobs/[id]/timeline` | GET | Job timeline |
| `/api/service-jobs/[id]/review` | GET, POST | Reviews |

### Service Messages
| Route | Methods | Description |
|-------|---------|-------------|
| `/api/service-messages` | GET, POST | List/send messages |
| `/api/service-messages/threads` | GET | List threads |
| `/api/service-messages/threads/[threadType]/[threadId]` | GET | Thread messages |

### Service Reports
| Route | Methods | Description |
|-------|---------|-------------|
| `/api/service-reports` | GET, POST | List/create reports |
| `/api/service-reports/[id]/resolve` | POST | Resolve report |

### Admin
| Route | Methods | Description |
|-------|---------|-------------|
| `/api/service-admin` | GET | Admin overview stats |
| `/api/service-categories` | GET, POST | Category management |
| `/api/service-providers` | GET | List providers (with status filter) |
| `/api/service-providers/[id]/status` | PATCH | Update provider status |
| `/api/service-reports` | GET | List reports |
| `/api/service-reports/[id]/resolve` | POST | Resolve report |

### Legacy Routes (Proxy to Canonical)
| Legacy Route | Canonical Route |
|--------------|-----------------|
| `/api/services/requests` | `/api/service-requests` |
| `/api/services/requests/[id]` | `/api/service-requests/[id]` |
| `/api/services/requests/[id]/offers` | `/api/service-requests/[id]/offers` |
| `/api/services/categories` | `/api/service-categories` |
| `/api/services/categories/[id]` | `/api/service-categories/[id]` |
| `/api/services/listings` | `/api/service-listings` |
| `/api/services/listings/[id]` | `/api/service-listings/[id]` |
| `/api/services/orders/[id]` | `/api/service-orders/[id]` |
| `/api/services/orders/[id]/review` | `/api/service-orders/[id]/review` |
| `/api/services/disputes` | `/api/service-disputes` |
| `/api/services/reviews` | `/api/service-reviews` |
| `/api/services/messages` | `/api/service-messages` |

## Route Protection

All routes protected by:
- Session authentication (`getSessionIdentity`)
- Permission checks (`hasSponsorPermission`)
- Role-based access (`service_provider`, `service_supervisor`, `sponsor_admin`, `super_admin`)

See `SERVICES_RBAC_POLICY.md` for detailed permission matrix.