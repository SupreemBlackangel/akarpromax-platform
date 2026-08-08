# SECURITY AND PRIVACY

## 1. Data Classification

### PUBLIC

| Field | Entity | Notes |
|-------|--------|-------|
| Display name | User, Professional, Organization | Public profile |
| Logo/Avatar | Professional, Organization | Public profile |
| Public bio | Professional, Organization | Public profile |
| Services | Professional, Organization | Public directory |
| Public location | Professional, Organization | City-level only |
| Verification summary | All | ✓/✗ per type |
| Reputation level | All | Level name only |
| Activity status | All | Active/Inactive |
| Availability | Professional, Organization | Available/Unavailable |
| Ratings | Professional, Organization | Average rating |
| Public portfolio | Professional, Organization | Public items |

### PRIVATE

| Field | Entity | Notes |
|-------|--------|-------|
| Identity documents | All | Never exposed |
| Raw licenses | Professional, Organization | Never exposed |
| Private email | User | Never exposed |
| Private phone | User | Never exposed |
| Admin notes | All | Admin-only |
| Verification evidence | All | Admin-only |
| Private organization data | Organization | Member-only |

### SENSITIVE VERIFICATION

| Field | Entity | Notes |
|-------|--------|-------|
| Document numbers | All | Encrypted at rest |
| Document URLs | All | Encrypted at rest |
| Verification metadata | All | Minimal, encrypted |
| Admin verification notes | All | Admin-only |

### ADMIN ONLY

| Field | Entity | Notes |
|-------|--------|-------|
| Internal scores | All | Reputation score |
| Signal weights | All | Policy configuration |
| Override records | All | Admin audit trail |
| System logs | All | Debugging only |

## 2. Public DTO Design

### Public User Profile

```typescript
PublicUserProfile = {
  id: string
  displayName: string
  avatarUrl: string | null
  verificationSummary: {
    email: boolean
    phone: boolean
    identity: boolean
  }
  reputationLevel: "new" | "rising" | "distinguished" | "gold" | "promax"
  activityStatus: "active" | "recently_active" | "low_activity" | "inactive"
  profileStrength: number // 0-100
}
```

### Public Professional Profile

```typescript
PublicProfessionalProfile = {
  id: string
  displayName: string
  logoUrl: string | null
  coverUrl: string | null
  bio: string
  profession: string
  specializations: string[]
  location: {
    country: string
    city: string
    district: string
    // NO exact coordinates to public
  }
  verificationSummary: {
    email: boolean
    phone: boolean
    identity: boolean
    professional: boolean
    license: boolean
  }
  reputationLevel: string
  activityStatus: string
  availability: string
  rating: number
  ratingCount: number
  jobsCompleted: number
  responseRate: number
  responseTime: string
  // NO private fields
}
```

### Public Organization Profile

```typescript
PublicOrganizationProfile = {
  id: string
  name: string
  slug: string
  logoUrl: string | null
  coverUrl: string | null
  description: string
  type: string
  classification: string
  location: {
    country: string
    city: string
    district: string
  }
  verificationSummary: {...}
  reputationLevel: string
  activityStatus: string
  metrics: {
    rating: number
    activeProperties: number
    responseRate: number
    responseTime: string
  }
  // NO private fields
}
```

## 3. Security Risks

### IDOR (Insecure Direct Object Reference)

**Risk:** User accesses another user's private data.

**Mitigation:**
- Ownership check on every private endpoint
- Session-based authorization
- Entity-level permission check

```typescript
// Example
if (entity.userId !== session.userId) {
  throw new ForbiddenError();
}
```

### Cross-Organization Access

**Risk:** User in Org A accesses Org B data.

**Mitigation:**
- Organization membership check
- Role-based access within organization
- Entity-level permission check

```typescript
// Example
if (!isMemberOf(session.userId, organizationId)) {
  throw new ForbiddenError();
}
```

### RBAC Bypass

**Risk:** User escalates privileges.

**Mitigation:**
- Server-side permission check
- No client-side role assignment
- Permission check on every API route

```typescript
// Example
if (!hasPermission(session.permissions, "REPUTATION_MANAGE")) {
  throw new ForbiddenError();
}
```

### Verification Mutation

**Risk:** User marks themselves as verified.

**Mitigation:**
- Server-side verification only
- Admin approval required for manual verification
- VerificationRecord is append-only (status changes audit-logged)

### Reputation Mutation

**Risk:** User sends `level=promax` in request.

**Mitigation:**
- Reputation is server-computed only
- Client cannot set level
- Level transitions are server-controlled

```typescript
// Example
// Client sends: { level: "promax" }
// Server ignores level field
// Server computes level from signals
```

### Public DTO Leakage

**Risk:** Private data exposed in public API.

**Mitigation:**
- Explicit DTO mapping
- Never return raw entity
- Whitelist fields for public view

```typescript
// Example
function toPublicProfile(user: User): PublicUserProfile {
  return {
    id: user.id,
    displayName: user.name,
    // NO email, phone, etc.
  };
}
```

## 4. Privacy Rules

### Data Minimization

- Collect only what's needed
- Store only what's required
- Display only what's necessary
- Delete when no longer needed

### Consent

- Clear consent at registration
- Granular notification preferences
- Easy opt-out
- Data export on request

### Right to Deletion

- User can request account deletion
- Data removed within 30 days
- Audit trail preserved (anonymized)
- Legal obligations honored

### Data Encryption

- Sensitive fields encrypted at rest
- Document URLs encrypted
- Verification evidence encrypted
- Admin notes encrypted

## 5. Authentication Security

### Session Security

- JWT HS256 with short expiry (7 days)
- httpOnly cookie
- Secure flag in production
- SameSite=lax
- JTI-based revocation

### Password Security

- bcrypt with 12 rounds
- Min 8, max 128 characters
- No password reuse (future)
- Password change requires current password

### OTP Security

- 6-digit codes
- 10-minute expiry
- 5 max attempts
- Rate limiting per IP

## 6. API Security

### Rate Limiting

- Per IP rate limiting
- Per user rate limiting
- Stricter limits for auth endpoints
- Configurable per endpoint

### Input Validation

- Schema validation on all inputs
- SQL injection prevention (parameterized queries)
- XSS prevention (output encoding)
- CSRF protection (SameSite cookies)

### Output Validation

- DTO mapping (never return raw entities)
- Field whitelisting
- Type checking
- No sensitive data in responses

## 7. Audit Security

### Audit Trail

Every sensitive action logged:
- User ID
- Action
- Entity type
- Entity ID
- Old values
- New values
- IP address
- Timestamp

### Audit Protection

- Audit logs are append-only
- No deletion of audit logs
- Admin actions require reason
- Super admin review for critical actions

## 8. Fraud Prevention

### Architecture Supports Future

- Fake review detection
- Self-review prevention
- Review ring detection
- Fake job detection
- Account farming detection
- Artificial activity detection
- Rating manipulation detection

### Not Implementing Now

- Full anti-fraud platform
- ML-based detection
- Real-time fraud scoring

## 9. Compliance

### GDPR Considerations

- Data export capability
- Right to deletion
- Consent management
- Data minimization

### Local Regulations

- Country-specific requirements
- Data residency (future)
- Local verification partners

## 10. Security Monitoring

### Events Monitored

- Failed login attempts
- Password resets
- Permission changes
- Verification changes
- Level overrides
- Admin actions

### Alerts

- Suspicious activity
- Brute force attempts
- Permission escalation
- Data export requests
