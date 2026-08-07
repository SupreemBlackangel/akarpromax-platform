# Service Request State Machine

## Canonical States

```
DRAFT
    │
    ├──► PENDING_REVIEW (admin review required)
    │
    └──► PUBLISHED (public)
            │
            ├──► RECEIVING_OFFERS
            │       │
            │       ├──► OFFER_ACCEPTED
            │       │       │
            │       │       ├──► SCHEDULED
            │       │       │       │
            │       │       │       ├──► IN_PROGRESS
            │       │       │       │       │
            │       │       │       │       ├──► WAITING_CUSTOMER_CONFIRMATION
            │       │       │       │       │       │
            │       │       │       │       │       ├──► COMPLETED
            │       │       │       │       │       │
            │       │       │       │       │       └──► DISPUTED ──► COMPLETED
            │       │       │       │       │
            │       │       │       │       └──► CANCELLED
            │       │       │       │
            │       │       │       └──► CANCELLED
            │       │       │
            │       │       └──► CANCELLED
            │       │
            │       └──► CANCELLED / EXPIRED
            │
            ├──► CANCELLED
            │
            └──► EXPIRED
```

## State Definitions

| State | Description | Who Can Enter | Valid Next States |
|-------|-------------|---------------|-------------------|
| `DRAFT` | Request created but not submitted | Customer | `PENDING_REVIEW`, `CANCELLED` |
| `PENDING_REVIEW` | Awaiting admin approval | Admin | `PUBLISHED`, `CANCELLED`, `REJECTED` |
| `PUBLISHED` | Live, visible to providers | System (on publish) | `RECEIVING_OFFERS`, `CANCELLED`, `EXPIRED` |
| `RECEIVING_OFFERS` | Providers submitting offers | Providers | `OFFER_ACCEPTED`, `PUBLISHED`, `CANCELLED`, `EXPIRED` |
| `OFFER_ACCEPTED` | Customer accepted an offer | Customer | `SCHEDULED`, `CANCELLED` |
| `SCHEDULED` | Job scheduled with date/time | Provider | `IN_PROGRESS`, `CANCELLED` |
| `IN_PROGRESS` | Work actively being done | Provider | `WAITING_CUSTOMER_CONFIRMATION`, `COMPLETED`, `CANCELLED`, `DISPUTED` |
| `WAITING_CUSTOMER_CONFIRMATION` | Provider marked done, awaiting customer | Customer | `COMPLETED`, `DISPUTED` |
| `COMPLETED` | Job finished, reviews enabled | System | (terminal) |
| `CANCELLED` | Request cancelled | Customer/Provider/Admin | (terminal) |
| `REJECTED` | Admin rejected in review | Admin | (terminal) |
| `EXPIRED` | Auto-expired after timeout | System | (terminal) |
| `DISPUTED` | Dispute opened | Customer/Provider | `COMPLETED`, `CANCELLED` |

## Transition Rules

### Customer Actions
| From State | Action | To State | Conditions |
|------------|--------|----------|------------|
| `DRAFT` | Publish | `PENDING_REVIEW` | All required fields filled |
| `DRAFT` | Cancel | `CANCELLED` | Always |
| `PENDING_REVIEW` | Cancel | `CANCELLED` | Before admin review |
| `PUBLISHED` | Cancel | `CANCELLED` | No accepted offer |
| `RECEIVING_OFFERS` | Cancel | `CANCELLED` | No accepted offer |
| `RECEIVING_OFFERS` | Accept Offer | `OFFER_ACCEPTED` | Valid offer selected |
| `OFFER_ACCEPTED` | Cancel | `CANCELLED` | Before scheduling |
| `SCHEDULED` | Cancel | `CANCELLED` | Before start |
| `IN_PROGRESS` | Cancel | `CANCELLED` | Mutual agreement |
| `IN_PROGRESS` | Confirm Done | `WAITING_CUSTOMER_CONFIRMATION` | Provider marks done |
| `WAITING_CUSTOMER_CONFIRMATION` | Confirm | `COMPLETED` | Customer confirms |
| `WAITING_CUSTOMER_CONFIRMATION` | Dispute | `DISPUTED` | Customer disagrees |
| `DISPUTED` | Resolve | `COMPLETED` | After resolution |
| `COMPLETED` | Review | `COMPLETED` | Submit review |

### Provider Actions
| From State | Action | To State | Conditions |
|------------|--------|----------|------------|
| `PUBLISHED` | Submit Offer | `RECEIVING_OFFERS` | Eligible provider |
| `RECEIVING_OFFERS` | Submit/Revise Offer | `RECEIVING_OFFERS` | Before acceptance |
| `RECEIVING_OFFERS` | Withdraw Offer | `RECEIVING_OFFERS` | Own offer, not accepted |
| `OFFER_ACCEPTED` | Schedule | `SCHEDULED` | Set date/time |
| `SCHEDULED` | Start Work | `IN_PROGRESS` | On scheduled date |
| `IN_PROGRESS` | Mark Done | `WAITING_CUSTOMER_CONFIRMATION` | Work complete |
| `DISPUTED` | Respond | `DISPUTED` | Provide evidence |

### Admin/Supervisor Actions
| From State | Action | To State | Conditions |
|------------|--------|----------|------------|
| `PENDING_REVIEW` | Approve | `PUBLISHED` | Valid request |
| `PENDING_REVIEW` | Reject | `REJECTED` | With reason |
| `PENDING_REVIEW` | Request Changes | `PENDING_REVIEW` | With feedback |
| Any | Force Cancel | `CANCELLED` | Admin privilege |
| `DISPUTED` | Resolve | `COMPLETED` | With resolution |

### System Actions
| From State | Trigger | To State |
|------------|---------|----------|
| `PUBLISHED` | No offers after 14 days | `EXPIRED` |
| `RECEIVING_OFFERS` | No offers after 14 days | `EXPIRED` |
| `OFFER_ACCEPTED` | No scheduling after 7 days | `CANCELLED` |
| `SCHEDULED` | Past scheduled date, not started | `CANCELLED` |

## Implementation

### State Validation
```typescript
// lib/services/constants.ts
export const REQUEST_FLOW: Record<RequestStatus, RequestStatus[]> = {
  [REQUEST_STATUS.DRAFT]: [REQUEST_STATUS.PUBLISHED, REQUEST_STATUS.CANCELLED],
  [REQUEST_STATUS.PUBLISHED]: [REQUEST_STATUS.RECEIVING_OFFERS, REQUEST_STATUS.CANCELLED, REQUEST_STATUS.EXPIRED],
  [REQUEST_STATUS.RECEIVING_OFFERS]: [REQUEST_STATUS.OFFER_SELECTED, REQUEST_STATUS.PUBLISHED, REQUEST_STATUS.CANCELLED, REQUEST_STATUS.EXPIRED],
  [REQUEST_STATUS.OFFER_SELECTED]: [REQUEST_STATUS.SCHEDULED, REQUEST_STATUS.CANCELLED],
  [REQUEST_STATUS.SCHEDULED]: [REQUEST_STATUS.IN_PROGRESS, REQUEST_STATUS.CANCELLED],
  [REQUEST_STATUS.IN_PROGRESS]: [REQUEST_STATUS.WAITING_CUSTOMER_CONFIRMATION, REQUEST_STATUS.COMPLETED, REQUEST_STATUS.CANCELLED, REQUEST_STATUS.DISPUTED],
  [REQUEST_STATUS.WAITING_CUSTOMER_CONFIRMATION]: [REQUEST_STATUS.COMPLETED, REQUEST_STATUS.DISPUTED],
  [REQUEST_STATUS.COMPLETED]: [],
  [REQUEST_STATUS.CANCELLED]: [],
  [REQUEST_STATUS.EXPIRED]: [],
  [REQUEST_STATUS.DISPUTED]: [REQUEST_STATUS.COMPLETED, REQUEST_STATUS.CANCELLED],
  // Legacy
  [REQUEST_STATUS.OPEN]: [REQUEST_STATUS.OFFERED, REQUEST_STATUS.CANCELLED, REQUEST_STATUS.EXPIRED],
  [REQUEST_STATUS.OFFERED]: [REQUEST_STATUS.ORDERED, REQUEST_STATUS.CANCELLED, REQUEST_STATUS.EXPIRED],
  [REQUEST_STATUS.ORDERED]: [],
};

export function canTransitionRequest(from: string, to: string): boolean {
  return REQUEST_FLOW[from]?.includes(to) ?? false;
}
```

### Server-Side Enforcement
All state changes go through service layer (`lib/services/marketplace.ts`):
```typescript
export async function publishRequest(requestId: string) {
  const request = await getRequestFull(requestId);
  if (request.status !== REQUEST_STATUS.DRAFT) throw new Error("REQUEST_STATUS_INVALID");
  // ... update status, run matching, create history, audit, notify
}

export async function cancelRequestFull(requestId, byUserId, reason) {
  const request = await getRequestFull(requestId);
  const cancellable = [REQUEST_STATUS.DRAFT, REQUEST_STATUS.PUBLISHED, REQUEST_STATUS.RECEIVING_OFFERS, REQUEST_STATUS.OFFER_SELECTED];
  if (!cancellable.includes(request.status)) throw new Error("REQUEST_STATUS_INVALID");
  // ... update status, create history, audit, notify
}
```

### History Tracking
Every transition creates `service_request_status_history`:
```sql
INSERT INTO service_request_status_history
(id, request_id, from_status, to_status, note, changed_by, created_at)
VALUES (?, ?, ?, ?, ?, ?, now());
```

### Audit Logging
Every transition calls `writeAudit()`:
```typescript
await writeAudit({
  action: `service_request.status.${to}`,
  entityType: "service_requests",
  entityId: requestId,
  metadata: { fromStatus: from, toStatus: to, reason },
  actorUserId: actorId,
  ipAddress: ip
});
```

### Notifications
Each transition triggers relevant notifications:
- `PUBLISHED` → `SERVICE_REQUEST_MATCHED` to providers, `SERVICE_REQUEST_PUBLISHED` to customer
- `OFFER_ACCEPTED` → `SERVICE_OFFER_ACCEPTED` to provider, `SERVICE_OFFER_ACCEPTED` to customer
- `COMPLETED` → `SERVICE_JOB_COMPLETED` to both parties
- `CANCELLED` → `SERVICE_REQUEST_CANCELLED` to relevant parties

## Testing

See `tests/services-marketplace.test.mjs` for state transition tests:
- Valid transitions pass
- Invalid transitions fail
- Unauthorized transitions fail
- Completion enables review
- Cancellation policy enforced

## Frontend State Display

Status badges (`ServiceStatusBadges.tsx`):
```typescript
const colorMap = {
  draft: "default", published: "info", receiving_offers: "info",
  offer_selected: "warning", scheduled: "warning", in_progress: "info",
  waiting_customer_confirmation: "warning", completed: "success",
  cancelled: "error", expired: "default", disputed: "error"
};
```

Labels localized via `t("services.status." + status)`.