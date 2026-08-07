# Services Architecture

## Overview

The Services Marketplace is a comprehensive platform connecting service providers with customers across Oman. It implements a full lifecycle from request creation through matching, offers, job execution, and reviews.

## Core Components

### 1. Domain Layer
- **Entities**: ServiceCategory, ServiceProviderProfile, ServiceRequest, ServiceOffer, ServiceOrder, ServiceReview, ServiceDispute, ServiceNotification
- **Aggregates**: ProviderProfile (with categories, documents, portfolio), Request (with answers, attachments, matches, history), Offer (with revisions), Order (with timeline)

### 2. Application Services
- **Marketplace Service** (`lib/services/marketplace.ts`): Core business logic for all entities
- **Core Service** (`lib/services/core.ts`): Legacy service layer (being phased out)
- **Matching Engine** (`lib/services/matching.ts` + `lib/services/match-score.ts`): Geographic and category-based provider matching
- **Notification Service** (`lib/services/marketplace.ts` notify functions): Multi-channel notifications
- **Sync Service** (planned): Property sync for Office integration

### 3. Infrastructure
- **Database**: D1 (SQLite) primary, MySQL fallback via `runtime-db.ts`
- **Schema**: 22 tables with proper indexes and foreign keys
- **Migrations**: Additive only via `ensureServicesSchema` and `ensureServicesMarketplaceSchema`

### 4. API Layer
- **Canonical Routes**: `/api/service-*` (service-requests, service-offers, service-providers, service-categories, service-notifications, service-messages, service-jobs, service-reports, service-admin)
- **Legacy Routes**: `/api/services/*` proxy to canonical routes
- **Authentication**: Session-based via `sponsor-auth.ts`, role-based permissions via `PERMISSIONS`

### 5. Frontend
- **Pages**: Public hub, catalog, provider profiles, request wizard, customer dashboard, provider workspace, supervisor dashboard, admin panel
- **Components**: ServiceDashboardShell (centralized sidebar), ServiceCards (CategoryCard, ProviderCard, RequestCard, OfferCard, JobCard), Wizard steps
- **State Management**: React hooks, server-state via `apiFetch`, local draft persistence

## Data Flow

```
Customer creates Request
  → Draft saved locally
  → Published → Matching Engine runs
  → Providers notified via NotificationService
  → Providers submit Offers
  → Customer accepts Offer → Order created
  → Job lifecycle: ACCEPTED → SCHEDULED → IN_PROGRESS → COMPLETED
  → Reviews enabled after COMPLETED
  → Disputes can be opened at any stage
```

## Security

- Session-only authentication (HttpOnly cookies)
- Server-side RBAC on every API route
- CSRF/Origin checks via `assertSafeOrigin`
- Rate limiting per endpoint
- Input validation (Zod schemas)
- Audit logging for all state changes
- No direct database access from frontend

## Scalability

- Matching engine uses batch processing (500 providers max per run)
- Notifications delivered asynchronously via outbox pattern
- Pagination on all list endpoints (max 100)
- Composite indexes on query patterns
- Connection pooling via D1 runtime