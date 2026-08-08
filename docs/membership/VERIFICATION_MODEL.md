# VERIFICATION MODEL

## 1. Core Principle

**Verification is a RECORD, not a boolean.**

Bad:
```
user.verified = true
```

Good:
```
VerificationRecord {
  type: "email"
  status: "verified"
  verifiedAt: "2026-01-15"
}
```

## 2. Verification Record

```
VerificationRecord
├── id (uuid PK)
├── entity_type (user, professional, organization)
├── entity_id (FK → User/ProfessionalProfile/Organization)
├── type (email, phone, identity, professional, organization, license, address)
├── status (pending, verified, failed, expired, revoked)
├── verified_at
├── expires_at
├── verified_by (admin user id)
├── source (system, manual, third_party)
├── country_code
├── document_url (encrypted, optional)
├── metadata (JSON, minimal)
├── created_at
```

## 3. Verification Types

### User Verification Types

| Type | Arabic | Description | Auto/Manual |
|------|--------|-------------|-------------|
| EMAIL | البريد الإلكتروني | Email address verified | Auto (token) |
| PHONE | الهاتف | Phone number verified | Auto (OTP) |
| IDENTITY | الهوية | Identity document verified | Manual |

### Professional Verification Types

| Type | Arabic | Description | Auto/Manual |
|------|--------|-------------|-------------|
| EMAIL | البريد | Professional email verified | Auto |
| PHONE | الهاتف | Professional phone verified | Auto |
| IDENTITY | الهوية | Professional identity verified | Manual |
| PROFESSIONAL | المهنة | Professional license/certification verified | Manual |
| LICENSE | الترخيص | Business license verified | Manual |
| ADDRESS | العنوان | Business address verified | Manual |

### Organization Verification Types

| Type | Arabic | Description | Auto/Manual |
|------|--------|-------------|-------------|
| EMAIL | البريد | Organization email verified | Auto |
| PHONE | الهاتف | Organization phone verified | Auto |
| ORGANIZATION | المنشأة | Organization registration verified | Manual |
| LICENSE | الترخيص | Business license verified | Manual |
| ADDRESS | العنوان | Business address verified | Manual |

## 4. Verification Status

| Status | Arabic | Description |
|--------|--------|-------------|
| PENDING | قيد الانتظار | Verification submitted, awaiting review |
| VERIFIED | موثق | Verification approved |
| FAILED | فشل | Verification rejected |
| EXPIRED | منتهي الصلاحية | Verification expired |
| REVOKED | ملغى | Verification revoked by admin |

## 5. Verification Flow

### Auto Verification (Email/Phone)

```
1. User submits email/phone
2. System generates token/OTP
3. Token/OTP sent to user
4. User enters token/OTP
5. System validates
6. VerificationRecord created with status: "verified"
7. verified_at set to current time
```

### Manual Verification (Identity/Professional/License)

```
1. User submits document
2. VerificationRecord created with status: "pending"
3. Admin reviews document
4. If approved: status → "verified", verified_at set
5. If rejected: status → "failed", rejection reason recorded
6. User notified of decision
```

## 6. Verification Expiry

| Type | Default TTL | Configurable |
|------|-------------|--------------|
| EMAIL | Never | No |
| PHONE | Never | No |
| IDENTITY | 1 year | Yes |
| PROFESSIONAL | 1 year | Yes |
| LICENSE | 1 year | Yes |
| ORGANIZATION | 1 year | Yes |
| ADDRESS | Never | Yes |

### Expiry Process

```
1. Cron job checks expiring records (30 days before)
2. User notified: "Your [type] verification expires soon"
3. If not renewed: status → "expired"
4. Reputation impact if critical verification expires
```

## 7. Verified Meaning

"موثق" (Verified) means:

**AkarProMax verified specific information.**

It does NOT mean:
- ❌ AkarProMax guarantees this company
- ❌ Best company
- ❌ Risk-free
- ❌ Recommended

## 8. Trust Transparency UI

Public profile shows:

```
✓ البريد (Email)
✓ الهاتف (Phone)
✓ المنشأة (Organization)
✓ الترخيص (License)
```

**Do NOT display:**
- ❌ Document numbers
- ❌ Sensitive verification data
- ❌ Admin notes
- ❌ Internal verification evidence
- ❌ Expiry dates (to public)

## 9. Verification Summary

### Professional Profile

```
التحقق (Verification)
├── ✓ البريد (Email)
├── ✓ الهاتف (Phone)
├── ✓ الهوية (Identity)
├── ✓ المهنة (Professional)
└── ✓ الترخيص (License)
```

### Organization Profile

```
التحقق (Verification)
├── ✓ البريد (Email)
├── ✓ الهاتف (Phone)
├── ✓ المنشأة (Organization)
├── ✓ الترخيص (License)
└── ✓ العنوان (Address)
```

## 10. Verification and Reputation

Verification directly impacts reputation:

| Verification | Reputation Impact |
|-------------|-------------------|
| EMAIL | +50 |
| PHONE | +30 |
| IDENTITY | +100 |
| PROFESSIONAL | +150 |
| LICENSE | +100 |
| ORGANIZATION | +100 |
| ADDRESS | +50 |

**Verification is a trust signal, not a reputation substitute.**

## 11. Data Minimization

Verification records store minimal data:

```typescript
{
  id: "uuid",
  entity_type: "user",
  entity_id: "user-uuid",
  type: "identity",
  status: "verified",
  verified_at: "2026-01-15T10:00:00Z",
  verified_by: "admin-uuid",
  source: "manual",
  country_code: "OM",
  // NO document_url stored in plain text
  // NO document number stored
  // NO sensitive metadata
}
```

## 12. Country-Aware Verification

Different countries may have different:
- Document types
- Verification requirements
- Expiry periods
- Verification partners

Architecture supports country-specific policies via:
- `country_code` on VerificationRecord
- Country-specific verification adapters (future)
- Configurable policies per country

## 13. Admin Verification Management

Admin can:
- View pending verifications
- Approve/reject with reason
- Revoke previously verified records
- Override verification status (exceptional)
- View verification audit trail

**All admin actions are audit-logged.**

## 14. Verification and RBAC

Verification status can gate certain actions:

```typescript
// Example: Only verified professionals can receive requests
if (!hasVerification(professional, 'professional')) {
  throw new Error('Professional verification required');
}
```

**Do NOT use verification as a general permission gate.** Use RBAC for permissions.

## 15. Existing Verification Integration

### Current Tables Reused

| Table | Current Use | AMRS Extension |
|-------|------------|----------------|
| verification_challenges | Email/OTP verification | Keep as-is |
| users.email_verified_at | Email verification | Link to VerificationRecord |
| users.phone_verified_at | Phone verification | Link to VerificationRecord |
| service_provider_profiles.verified_at | Provider verification | Link to VerificationRecord |
| service_provider_documents.verified | Document verification | Link to VerificationRecord |
| sponsor_profiles.verified_at | Sponsor verification | Link to VerificationRecord |

### Migration Strategy

1. Create VerificationRecord table
2. Migrate existing verification data
3. Update UI to use VerificationRecord
4. Deprecate direct column reads
5. Keep backward compatibility layer
