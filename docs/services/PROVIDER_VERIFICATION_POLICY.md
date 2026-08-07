# Provider Verification Policy

## Verification States

```
DRAFT
  │
  ├──► SUBMITTED (provider submits application)
  │       │
  │       ├──► UNDER_REVIEW (admin reviewing)
  │       │       │
  │       │       ├──► APPROVED (verified)
  │       │       │
  │       │       └──► REJECTED (with reason)
  │       │
  │       └──► (can return to DRAFT if rejected)
  │
  └──► (provider can edit while DRAFT)
```

## State Definitions

| State | Description | Can Receive Requests | Can Submit Offers |
|-------|-------------|---------------------|-------------------|
| `DRAFT` | Profile incomplete, not submitted | No | No |
| `SUBMITTED` | Application submitted, awaiting review | No | No |
| `UNDER_REVIEW` | Admin actively reviewing | No | No |
| `APPROVED` | Verified, active provider | Yes | Yes |
| `REJECTED` | Application rejected | No | No |
| `SUSPENDED` | Temporarily disabled | No | No |

## Verification Requirements

### Mandatory for All Providers
1. **Profile Completeness**
   - Display name (AR/EN)
   - Bio (AR/EN)
   - Phone & WhatsApp
   - Country/City
   - At least one service category with pricing

2. **Documents**
   - Commercial registration (PDF)
   - Government-issued ID (owner)
   - Proof of address

3. **Business Verification** (if `is_business = true`)
   - Tax number
   - Commercial registration number
   - Business name (AR/EN)

### Category-Specific Requirements
| Category | License Required | Visit Required |
|----------|-----------------|----------------|
| ac-repair | Yes | Yes |
| electrical | Yes | Yes |
| plumbing | No | Yes |
| security | Yes | No |
| architectural | Yes | No |
| surveying | Yes | Yes |
| inspection | Yes | Yes |
| legal-services | Yes | No |
| accounting | Yes | No |
| renovation | Yes | Yes |

## Verification Process

### 1. Provider Submits Application
```typescript
// Provider fills profile, adds categories, uploads documents
await submitProviderApplication(providerId);
// Status: DRAFT → SUBMITTED
// Notification: "Application submitted for review"
```

### 2. Admin Review Queue
- Supervisors see pending providers at `/dashboard/services/supervisor` (providers tab)
- Admins see at `/admin/services` (providers tab)
- Filters: `status = under_review`

### 3. Admin Reviews
- Views profile, documents, categories
- Checks: license validity, document authenticity, category match
- Can request additional documents via notes

### 4. Decision
**Approve:**
```typescript
await setProviderStatus(providerId, "approved");
// Status: SUBMITTED → APPROVED
// Notification: "Profile approved, can now receive requests"
// Auto: approved_at = now(), creates notification
```

**Reject:**
```typescript
await setProviderStatus(providerId, "rejected", "Missing trade license");
// Status: SUBMITTED → REJECTED
// Notification: "Application rejected: Missing trade license"
// Creates: rejection_reason
```

**Suspend:**
```typescript
await setProviderStatus(providerId, "suspended", "Policy violation");
// Status: APPROVED → SUSPENDED
// Notification: "Account suspended: Policy violation"
// Effect: Cannot receive new requests, existing orders continue
```

### 5. Re-submission After Rejection
- Provider can edit profile while `REJECTED`
- Resubmit → `SUBMITTED` again
- Goes back to review queue

## Document Verification

Each document individually verified:
```typescript
await verifyProviderDocument(docId, true, { userId: adminId });
// Sets: verified = 1, verified_by = adminId, verified_at = now()
```

Types:
- `commercial_registration` (required)
- `license` (category-dependent)
- `insurance` (optional)
- `id_card` (required)
- `proof_of_address` (required)
- `tax_certificate` (business only)
- `other` (supplementary)

## Suspension & Reactivation

### Suspension Reasons
- Policy violations (fake reviews, spam, no-shows)
- Expired license/insurance
- Customer complaints pattern
- Payment disputes
- Fraud suspicion

### Reactivation
```typescript
await setProviderStatus(providerId, "approved");
// Status: SUSPENDED → APPROVED
// Notification: "Account reactivated"
// Requires: Issue resolved, admin approval
```

## Audit Trail

All status changes logged:
```typescript
await writeAudit({
  action: `service_provider.status.${newStatus}`,
  entityType: "service_provider_profiles",
  entityId: providerId,
  metadata: { previousStatus: oldStatus, reason },
  actorUserId: adminId,
  ipAddress: requestIp
});
```

## Notifications

| Event | Template | Recipient |
|-------|----------|-----------|
| `PROVIDER_APPROVED` | "Profile approved, can now receive requests" | Provider |
| `PROVIDER_REJECTED` | "Application rejected: {reason}" | Provider |
| `PROVIDER_SUSPENDED` | "Account suspended: {reason}" | Provider |
| `PROVIDER_REACTIVATED` | "Account reactivated" | Provider |

## Supervisor Dashboard

`/dashboard/services/supervisor` → Providers tab:
- Filters: `status = under_review`
- Actions: Approve, Reject (with required reason)
- Shows: Profile preview, document thumbnails, categories

## Admin Panel

`/admin/services` → Providers tab:
- Full provider list with status badges
- Bulk actions: Approve/Reject multiple
- Export to CSV
- Search by name, email, city, status

## API Endpoints

| Endpoint | Method | Permission | Description |
|----------|--------|------------|-------------|
| `GET /api/service-providers?status=under_review` | GET | `SERVICE_PROVIDERS_REVIEW` | List pending |
| `GET /api/service-providers/[id]` | GET | `SERVICE_PROVIDERS_REVIEW` | View profile |
| `PATCH /api/service-providers/[id]/status` | PATCH | `SERVICE_PROVIDERS_REVIEW` | Update status |
| `POST /api/service-providers/[id]/apply` | POST | `SERVICE_PROVIDERS_APPLY` | Submit application |
| `GET /api/service-providers/me` | GET | `SERVICE_PROVIDERS_MANAGE` | Own profile |

## Testing

See `tests/services-marketplace.test.mjs`:
- `provider lifecycle statuses are fully labeled`
- `approving a provider updates the profile, notifies the owner and writes an audit entry`
- `rejecting a provider records the reason and a PROVIDER_REJECTED notification`
- `setProviderStatus throws PROVIDER_NOT_FOUND for unknown ids`