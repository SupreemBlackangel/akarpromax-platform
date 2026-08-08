# ADMIN CONTROL MODEL

## 1. Admin Workspace

**ONE workspace for Membership & Reputation.**

Not 15 separate pages. One integrated workspace:

```
Membership & Reputation
├── نظرة عامة (Overview)
├── المستويات (Levels)
├── التحقق (Verification)
├── السياسات (Policies)
├── الشارات (Badges)
├── المؤسسات (Organizations)
└── التدقيق (Audit)
```

## 2. What Admin Can Control (Without Deployment)

### Level Definitions

```typescript
LevelDefinition = {
  level: "gold"
  name_ar: "ذهبي"
  name_en: "Gold"
  scoreRange: [700, 899]
  benefits: {...}
  requirements: {...}
}
```

### Thresholds

```typescript
Thresholds = {
  professional: {
    minJobsCompleted: 10
    minRating: 4.0
    minResponseRate: 80
    minProfileStrength: 70
  }
  organization: {
    minProperties: 5
    minRating: 4.0
    minResponseRate: 85
    minProfileStrength: 80
  }
}
```

### Evaluation Windows

```typescript
EvaluationWindow = {
  default: 90 // days
  professional: 90
  organization: 90
  user: 180
}
```

### Weights

```typescript
SignalWeights = {
  professional: {
    verification: 0.25
    profileCompleteness: 0.15
    responseRate: 0.20
    completedJobs: 0.20
    rating: 0.20
  }
}
```

### Badge Rules

```typescript
BadgeRule = {
  code: "first_job"
  name_ar: "أول عمل"
  name_en: "First Job"
  trigger: "job_completed"
  count: 1
  is_active: true
}
```

### Profile Requirements

```typescript
ProfileRequirements = {
  professional: {
    required: ["bio", "logo", "phone", "location"]
    optional: ["website", "founded_year", "team_size"]
  }
}
```

### Activity Windows

```typescript
ActivityWindows = {
  active: 30 // days
  recently_active: 90
  low_activity: 180
  inactive: 365
}
```

### Grace Periods

```typescript
GracePeriods = {
  default: 30 // days
  policy_violation: 0
  fraud: 0
  license_expiration: 30
}
```

## 3. Admin Manual Override

### Use Cases

- Exceptional cases only
- Policy violations
- Fraud prevention
- Special circumstances

### Override Record

```typescript
AdminOverride = {
  id: uuid
  entity_type: "professional"
  entity_id: "uuid"
  admin_id: "uuid"
  action: "level_override"
  old_level: "rising"
  new_level: "gold"
  reason: "Exceptional quality demonstrated"
  start_date: "2026-01-15"
  expiry_date: "2026-07-15" // optional
  audit_log_id: "uuid"
}
```

### Rules

- **Audit logged** (always)
- **Admin ID recorded** (always)
- **Reason required** (always)
- **Optional expiry** (for temporary overrides)
- **Does NOT erase automated history**
- **Does NOT prevent future evaluations**

## 4. Audit Trail

### Every Admin Action Logged

```typescript
AuditLog = {
  id: uuid
  actor_user_id: "admin-uuid"
  action: "reputation_policy_update"
  entity_type: "reputation_policy"
  entity_id: "policy-uuid"
  old_values: {...}
  new_values: {...}
  ip_address: "1.2.3.4"
  created_at: "2026-01-15T10:00:00Z"
}
```

### Audit Categories

| Category | Actions |
|----------|---------|
| Level Management | level_update, level_override |
| Policy Management | policy_create, policy_update, policy_activate |
| Verification | verify_approve, verify_reject, verify_revoke |
| Badge Management | badge_create, badge_update, badge_award, badge_revoke |
| Organization | org_suspend, org_activate, org_override |

## 5. Policy Versioning

### Every Policy Change Versioned

```typescript
ReputationPolicy = {
  id: uuid
  version: 3
  label: "v3 - Enhanced quality signals"
  effective_date: "2026-04-01"
  entity_type: "professional"
  signals: [...]
  weights: {...}
  thresholds: {...}
  evaluation_window: 90
  grace_period: 30
  created_by: "admin-uuid"
  created_at: "2026-03-15"
}
```

### Evaluation Records Policy Version

Every evaluation records which policy version was used:

```typescript
ReputationEvaluation = {
  policy_version: 3
  evaluated_at: "2026-04-15"
  old_level: "rising"
  new_level: "distinguished"
}
```

## 6. Admin Dashboard Integration

### Command Center Integration

Phase 7 Command Center can later display:

- Membership growth
- Verification backlog
- Reputation distribution
- Inactive professionals
- Inactive organizations
- Availability status
- Profile completion
- Promotion/downgrade events

### No Duplicate Analytics

AMRS uses existing Command Center infrastructure:
- Same data source
- Same query patterns
- Same UI components
- Same refresh cycle

## 7. Admin Permission Requirements

### Membership & Reputation Permissions

| Permission | Description |
|-----------|-------------|
| MEMBERSHIP_VIEW | View membership data |
| MEMBERSHIP_MANAGE | Manage membership settings |
| REPUTATION_VIEW | View reputation data |
| REPUTATION_MANAGE | Manage reputation policies |
| VERIFICATION_VIEW | View verification records |
| VERIFICATION_MANAGE | Approve/reject verifications |
| ORGANIZATION_VIEW | View organization data |
| ORGANIZATION_MANAGE | Manage organizations |

### Integration with Existing RBAC

```typescript
// Existing permissions
USERS_VIEW
USERS_CREATE
USERS_UPDATE
USERS_DELETE

// New AMRS permissions
MEMBERSHIP_VIEW
MEMBERSHIP_MANAGE
REPUTATION_VIEW
REPUTATION_MANAGE
VERIFICATION_VIEW
VERIFICATION_MANAGE
ORGANIZATION_VIEW
ORGANIZATION_MANAGE
```

## 8. Bulk Operations

### Supported Bulk Actions

- Bulk verification approval
- Bulk level override (with reason)
- Bulk badge award
- Bulk notification send

### Rules

- **Requires confirmation**
- **Audit logged**
- **Batch size limits**
- **Progress feedback**

## 9. Import/Export

### Data Export

- Member list (CSV/JSON)
- Reputation data (CSV/JSON)
- Verification records (CSV/JSON)
- Audit logs (CSV/JSON)

### Data Import

- Bulk member creation (CSV)
- Badge import (JSON)
- Policy import (JSON)

### Rules

- **Validation required**
- **Duplicate check**
- **Audit logged**
- **Rollback support**

## 10. Reporting

### Available Reports

- Membership growth
- Reputation distribution
- Verification status
- Organization status
- Activity trends
- Level transitions

### Report Delivery

- On-demand (admin request)
- Scheduled (weekly/monthly)
- Export (CSV/PDF)

## 11. Configuration Interface

### UI Components

- Level editor
- Policy editor
- Badge editor
- Threshold configurator
- Window configurator

### Rules

- **Real-time preview**
- **Validation**
- **Version control**
- **Audit trail**

## 12. Emergency Controls

### Emergency Actions

- Suspend all reputation evaluation
- Freeze level transitions
- Bulk verification hold
- System-wide announcement

### Rules

- **Requires super_admin**
- **Audit logged**
- **Automatic rollback** (configurable)
- **Notification sent**
