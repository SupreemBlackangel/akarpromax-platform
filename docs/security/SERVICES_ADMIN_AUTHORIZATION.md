# Services Admin Authorization

## Context

Phase 4 acceptance required removing the ChatGPT/OpenAI header identity from the
services marketplace admin and API routes. The previous implementation used
`requireChatGPTUser("/admin/services")` (RSC page gate) and `getSponsorIdentity()`
(session + `x-openai-*` header/Bearer/localhost fallback) in every `app/api/service-*`
route. Both are now replaced by a **session-only** identity for the entire services module.

Architecture check result: `check-architecture.mjs` PASS (0 violations) after the
refactor, and `check-module-boundaries.mjs` stays at the pre-existing baseline of
164 violations (no phase-relative increase). No new `architecture-exceptions.json`
entries were added.

## Identity model

| API | Behaviour |
|---|---|
| `getSessionIdentity()` | `lib/sponsor-auth.ts`. Reads the raw `Cookie` header (via `lib/auth/session.ts`), then the `akar_session` HttpOnly cookie. **Never** consults `x-openai-*` headers, `oai-authenticated`, Bearer tokens, or the localhost auto-admin fallback. Returns `GUEST_IDENTITY` (`authenticated: false`) when there is no valid session. |
| `GUEST_IDENTITY` | Constant guest identity with `role: "guest"`, empty `permissions`. |
| `setSessionIdentityResolverForTests(resolver \| null)` | Test-only seam. Injects a fabricated `SponsorIdentity` for deterministic tests; passing `null` clears it. |
| `hasSponsorPermission(identity, permission)` | Returns true when `identity.permissions` includes the permission or the `"*"` super-admin wildcard. |
| `getSponsorIdentity()` | **Session-only alias** of `getSessionIdentity()` (retained for the sponsor module; non-services). The services module has zero references to it (enforced by `tests/services-marketplace.test.mjs` "session-only identity" test). |

## Enforcement layers

1. **Server page gate** — `app/admin/services/page.tsx`:
   - `getSessionIdentity()`; unauthenticated → `redirect("/")`.
   - Requires at least one of `SERVICE_CATEGORIES_MANAGE`, `SERVICE_REPORTS_MANAGE`,
     `SERVICE_PROVIDERS_REVIEW`; otherwise renders a 403 UI (Arabic) instead of the admin client.
   - `PermissionGuard` retained as an additional client-side guard (UX only, not a security boundary).
2. **API route gates** — every marketplace mutation/listing route resolves the session and returns:
   - `401 services.unauthorized` when `!identity.authenticated || !identity.email`;
   - `403 services.forbidden` when the required permission is missing.
3. **Data scoping** — domain functions scope reads/writes to the actor (`customer_user_id`, `provider_user_id`, `mine` filters) so ownership cannot be bypassed via the API.
4. **Client guard** — `PermissionGuard` in components for UI hiding.

## Per-route matrix (marketplace module `app/api/service-*`)

### Overview

| Route | Method | Required permission (any-of) |
|---|---|---|
| `service-admin` | GET | `SERVICE_CATEGORIES_MANAGE` OR `SERVICE_REPORTS_MANAGE` OR `SERVICE_PROVIDERS_REVIEW` |

### Service categories

| Route | Method | Required permission |
|---|---|---|
| `service-categories` | GET | public (active catalog, `Cache-Control` public) |
| `service-categories` | POST | `SERVICE_CATEGORIES_MANAGE` |
| `service-categories/[id]` | GET | public |
| `service-categories/[id]` | PATCH | `SERVICE_CATEGORIES_MANAGE` |
| `service-categories/[id]` | DELETE | `SERVICE_CATEGORIES_MANAGE` (409 `category_has_children` / `category_in_use`, 404 `category_not_found`) |

### Service providers

| Route | Method | Required permission / scope |
|---|---|---|
| `service-providers` | GET | `SERVICE_PROVIDERS_REVIEW` (admin review list) |
| `service-providers` | POST | authenticated (self-application) |
| `service-providers/me` | GET/PATCH | authenticated, scoped to session user |
| `service-providers/me/matched-requests` | GET | authenticated provider |
| `service-providers/[id]` | GET | authenticated participant |
| `service-providers/[id]/apply` | POST | authenticated |
| `service-providers/[id]/categories` | GET/POST/PATCH | owner of profile |
| `service-providers/[id]/documents` | GET/POST | owner of profile |
| `service-providers/[id]/portfolio` | GET/POST/PATCH/DELETE | owner of profile |
| `service-providers/[id]/status` | PATCH | `SERVICE_PROVIDERS_REVIEW` (401 added) |

### Service reports

| Route | Method | Required permission |
|---|---|---|
| `service-reports` | GET | `SERVICE_REPORTS_MANAGE` |
| `service-reports` | POST | authenticated reporter |
| `service-reports/[id]/resolve` | POST | `SERVICE_REPORTS_MANAGE` |

### Service requests / offers / jobs

| Route | Method | Required permission (any-of) |
|---|---|---|
| `service-requests` (GET list, POST) | GET/POST | `SERVICE_REQUESTS_MANAGE_OWN` OR `SERVICE_REQUESTS_MANAGE_ALL` |
| `service-requests/[id]` | GET/PATCH | same (ownership-scoped) |
| `service-requests/[id]/publish` | POST | same |
| `service-requests/[id]/cancel` | POST | same |
| `service-requests/[id]/history` | GET | same |
| `service-requests/[id]/attachments` | GET/POST | same |
| `service-requests/[id]/matching` | POST | same |
| `service-requests/[id]/matches/[providerId]` | GET/POST | same |
| `service-offers` + `[id]` + accept/decline/revise/withdraw | all | `SERVICE_OFFERS_MANAGE_OWN` OR `SERVICE_OFFERS_MANAGE_ALL` |
| `service-jobs` + `[id]` + status/timeline/review | all | authenticated participant (ownership-scoped) |

### Messages / notifications (authenticated, ownership-scoped)

| Route | Method |
|---|---|
| `service-messages`, `service-messages/threads`, `.../[threadType]/[threadId]` | GET/POST — authenticated participant of the thread |
| `service-notifications`, `[id]/read`, `read-all` | GET/POST — scoped to session user (`user_id = session email`) |

> Note: legacy `app/api/services/*` routes (singular "services": listings, requests,
> reviews, disputes, categories) remain on the legacy identity chain and are **out of
> scope** for Phase 4; they belong to the pre-existing services module, not the
> marketplace module.

## Audit trail

Admin mutations record `audit_logs` entries through `lib/services/audit.ts`:

| Action | Entity |
|---|---|
| `service_category.create` / `service_category.update` / `service_category.delete` | `service_categories` |
| `service_provider.status.approved` / `service_provider.status.rejected` / `service_provider.status.suspended` / etc. | `service_provider_profiles` |
| `service_report.create` / `service_report.resolve` | `service_reports` |

Each entry carries `actorUserId` (the session email), `ipAddress`, `entityId`, and
`metadata`. Audit writes go through the same `getServicesDb()` seam as data writes,
so deterministic tests can assert on them.

## Deterministic tests

- `tests/services-marketplace.test.mjs` — static: "the services module uses
  session-only identity and never ChatGPT identity" scans all `app/api/service-*/**`
  and `lib/services/*` files for `getSponsorIdentity|requireChatGPTUser|getChatGPTUser`
  (must be absent), and asserts the admin page gates on `getSessionIdentity`.
- `tests/services-authz.test.mjs` — dynamic: session resolver seam + in-memory DB
  (see the DB dependency audit doc) exercising the 10 authorization scenarios
  (guest vs. role-mapped permissions on admin APIs).
