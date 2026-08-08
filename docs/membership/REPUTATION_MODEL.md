# AMRS REPUTATION MODEL

## 1. Reputation Levels

### Level Definitions

| Level | Arabic | Internal Score Range | Description |
|-------|--------|---------------------|-------------|
| NEW | جديد | 0-199 | New member, building history |
| RISING | صاعد | 200-449 | Growing presence, earning trust |
| DISTINGUISHED | متميز | 450-699 | Established, consistent quality |
| GOLD | ذهبي | 700-899 | Premium tier, proven track record |
| PROMAX | ProMax | 900-1000 | Elite tier, exceptional performance |

**Note:** Score ranges are internal. Public sees only level names, not numeric scores.

### Level Display Language

| Context | NEW | RISING | DISTINGUISHED | GOLD | PROMAX |
|---------|-----|--------|---------------|------|--------|
| Professional | جديد | صاعد | متميز | مهني ذهبي | ProMax |
| Organization | جديد | صاعد | متميز | شركة ذهبية | ProMax |
| Normal User | جديد | صاعد | متميز | عضو متميز | ProMax |

## 2. ProMax Principles

ProMax is:
- **Earned**, not directly purchasable
- **Performance-based**, not activity-based
- **Trust-based**, backed by verification and reviews
- **Reviewed periodically**, not permanent
- **Can be lost** for policy violations or inactivity
- **Transparent criteria**, but not exact formula

ProMax is NOT:
- Purchasable via any plan
- Automatic from Enterprise subscription
- Permanent without evaluation
- Based on page views or login streaks

## 3. Gold Principles

Gold is also earned reputation:
- NOT tied to paid plan
- Requires consistent quality signals
- Reviewed on evaluation window
- Can downgrade with grace period

## 4. Reputation Per Entity

### Independence Principle

Professional reputation is **completely independent** of Organization reputation.

Example:
```
Ahmed (ProfessionalProfile): GOLD
XYZ Engineering (Organization): RISING
```

No automatic reputation inheritance between them.

### Future Considerations (Not Implemented Now)

- Employee reputation MAY influence organization reputation indirectly
- Organization reputation MAY appear on employee profiles as context
- But source of truth remains independent
- No reputation inheritance abuse

## 5. Normal User Reputation

One reputation framework, different policy per type:

| Entity Type | Signals | Benefits | Display |
|-------------|---------|----------|---------|
| User | Verification, valid listings, completed interactions, authentic reviews | Base profile | "عضو متميز" |
| Professional | Verification, profile completeness, response rate, completed jobs, ratings | Enhanced profile | "مهني ذهبي" |
| Organization | Verification, licensing, completed work, ratings, portfolio | Premium profile | "شركة ذهبية" |

## 6. Reputation Signals

### Professional Signals

| Signal | Weight Range | Source | Evaluation |
|--------|-------------|--------|------------|
| Email verified | 0-50 | verification_records | Binary |
| Phone verified | 0-30 | verification_records | Binary |
| Identity verified | 0-100 | verification_records | Binary |
| Professional verified | 0-150 | verification_records | Binary |
| License verified | 0-100 | verification_records | Binary |
| Profile completeness | 0-100 | profile_strength | Score 0-100 |
| Response rate | 0-100 | service_provider_profiles | Percentage |
| Response speed | 0-80 | avg_response_time_min | Inverse of time |
| Completed jobs | 0-120 | service_provider_profiles | Count |
| Customer rating | 0-150 | service_provider_profiles | Average |
| Cancellation rate | -50-0 | service_orders | Negative signal |
| Resolved disputes | 0-50 | service_disputes | Resolution count |
| Policy compliance | 0-50 | audit_logs | Violation count |
| Recent activity | 0-30 | activity_states | Meaningful actions |

**Total possible: ~1160 points** (mapped to 0-1000 internal score)

### Real Estate Organization Signals

| Signal | Weight Range | Source |
|--------|-------------|--------|
| Organization verified | 0-100 | verification_records |
| License verified | 0-150 | verification_records |
| Valid property listings | 0-80 | property_listings |
| Listing freshness | 0-50 | property_listings.updated_at |
| Response rate | 0-100 | service_requests |
| Response speed | 0-80 | avg_response_time |
| Customer reviews | 0-120 | service_reviews |
| Expired listing management | 0-30 | property_listings |
| Complaint outcomes | 0-50 | service_disputes |
| Policy compliance | 0-50 | audit_logs |
| Recent activity | 0-30 | activity_states |
| Office integration | 0-40 | office_devices (optional) |

### Business Organization Signals

| Signal | Weight Range | Source |
|--------|-------------|--------|
| Verification | 0-100 | verification_records |
| Licensing | 0-150 | verification_records |
| Profile completeness | 0-80 | profile_strength |
| Completed work | 0-120 | service_orders |
| Ratings | 0-100 | service_reviews |
| Response | 0-80 | service_requests |
| Portfolio | 0-50 | service_provider_portfolio |
| Dispute outcomes | 0-50 | service_disputes |
| Policy compliance | 0-50 | audit_logs |
| Recent activity | 0-30 | activity_states |

### Normal User Signals

| Signal | Weight Range | Source |
|--------|-------------|--------|
| Email verified | 0-50 | verification_records |
| Phone verified | 0-30 | verification_records |
| Identity verified | 0-100 | verification_records |
| Valid listings | 0-50 | property_listings |
| Completed interactions | 0-80 | service_orders |
| Authentic reviews | 0-60 | service_reviews |
| Community quality | 0-40 | audit_logs |
| Policy compliance | 0-50 | audit_logs |
| Recent meaningful activity | 0-30 | activity_states |

## 7. Reputation Evaluation

### Evaluation Window

- **Default:** 90 days rolling
- **Configurable per entity type**
- **Long-term signals:** Evaluation considers both recent and historical data

### Evaluation Process

```
1. Collect signals from source tables
2. Apply policy weights (versioned)
3. Compute raw score (0-1000)
4. Map to level (NEW/RISING/DISTINGUISHED/GOLD/PROMAX)
5. Compare with current level
6. If promotion: check grace period requirements
7. If downgrade: apply grace period
8. Record evaluation
9. Update reputation profile
10. Emit event (ReputationChanged)
```

### Promotion Rules

- Must meet ALL level requirements
- Must not be in grace period
- Must have minimum evaluation window coverage
- Admin override possible (exceptional cases)

### Downgrade Rules

- Automatic if signals fall below threshold
- Grace period before downgrade (configurable, default 30 days)
- Warning notification before grace period ends
- Admin override possible (policy violations)

### Grace Period

```
Warning → Grace Period → Re-evaluation → Downgrade
```

**Exceptions (no grace):**
- Fraud
- Serious policy violation
- License invalidation
- Account suspension

## 8. Policy Versioning

```
ReputationPolicy v1
├── version: 1
├── effective_date
├── entity_type: "professional"
├── signals: [...]
├── weights: {...}
├── thresholds: {...}
├── evaluation_window: 90
├── grace_period: 30
├── created_by
└── created_at
```

Every evaluation records:
- `policy_version` used
- `evaluated_at`
- `old_level`, `new_level`
- `signals` snapshot

## 9. Reputation History

Every level change is recorded:

```
ReputationHistory
├── entity_type
├── entity_id
├── old_level
├── new_level
├── reason
├── evaluated_at
├── policy_version
```

**No level change without history record.**

## 10. Fraud Resistance

Architecture supports future detection of:
- Fake reviews
- Self reviews
- Review rings
- Fake jobs
- Account farming
- Artificial activity
- Rating manipulation

**Not implementing anti-fraud platform now.** Design allows future signals.

## 11. Reputation Transparency

### Public Explanation Page

"كيف تعمل مستويات AkarProMax؟"
- What improves reputation
- What hurts reputation
- Evaluation timing
- Meaning of Gold/ProMax
- Appeal process

**Does NOT reveal exact formula** to prevent gaming.

### Private Explanation (Per User)

"لماذا أنا في هذا المستوى؟"
- Profile strength status
- Response quality
- Review ratings
- Missing signals for next level

**No fake precision** (no "83.7%").

## 12. Promotion Celebration

When promoted:
- Congratulations message
- Level benefits explained
- `promotionSeenAt` recorded
- One-time celebration (not repeated)

## 13. Reputation vs Activity

| Concept | Reputation | Activity |
|---------|-----------|----------|
| Definition | Trust + Performance | Platform Usage |
| Source | Verification, Reviews, Jobs | Logins, Views, Actions |
| Impact | Directory ranking, benefits | Achievements, milestones |
| Gaming risk | Low (hard to fake) | High (easy to inflate) |
| Display | Level badge | Activity status |

**Core rule:** Daily login does NOT increase reputation. 100 page views does NOT equal Gold.
