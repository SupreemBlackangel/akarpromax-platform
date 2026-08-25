# 05_REPUTATION_RANKS_VERIFICATION.md
# Reputation, Ranks & Verification System

**Audit Date:** 2026-08-19  
**Mode:** READ-ONLY

---

## 1. V1 Reputation System

### 1.1 Rank Levels

V1 had explicit rank levels:

| Rank | Description | Visual | Criteria |
|---|---|---|---|
| NEW | New user | Default | Account created |
| RISING | Rising user | Badge | Activity threshold |
| DISTINGUISHED | Distinguished user | Badge + border | High activity |
| GOLD | Gold user | Gold badge | Premium status |
| PROMAX | ProMax user | Special badge | Top tier |

**Source:** V1 user attributes, CSS classes for rank styling

### 1.2 Trust Score

V1 had a `trust_score` field on users:

| Attribute | Type | Purpose |
|---|---|---|
| trust_score | Integer (0-100) | Multi-factor trust calculation |

**Source:** `prisma/schema.prisma` `users` model

### 1.3 Academic Badge

V1 had an `academic_badge` field:

| Attribute | Type | Purpose |
|---|---|---|
| academic_badge | Boolean | Academic achievement badge |

**Source:** `prisma/schema.prisma` `users` model

### 1.4 Distinguished Status

V1 had an `is_distinguished` field:

| Attribute | Type | Purpose |
|---|---|---|
| is_distinguished | Boolean | Visual distinction for top users |

**Source:** `prisma/schema.prisma` `users` model

### 1.5 Verification Status

V1 had an `is_verified` field:

| Attribute | Type | Purpose |
|---|---|---|
| is_verified | Boolean | Identity verification status |

**Source:** `prisma/schema.prisma` `users` model

---

## 2. V2.0 Reputation System

### 2.1 Current State

V2.0 has NO explicit reputation/rank system. The only user attributes are:

| Attribute | Type | Purpose |
|---|---|---|
| role | Enum | super_admin/admin/user |
| isActive | Boolean | Account active flag |
| isVerified | Boolean | (Not implemented) |

**Source:** `lib/db/schema.ts` `users` table

### 2.2 Verification

V2.0 has a verification system via `verification_challenges` table:

| Attribute | Type | Purpose |
|---|---|---|
| id | UUID | Challenge ID |
| userId | UUID | User reference |
| challengeType | String | Verification type |
| challengeData | JSON | Challenge data |
| status | String | pending/completed/expired |
| createdAt | Timestamp | Creation time |

**Source:** `lib/db/schema.ts` `verification_challenges` table

---

## 3. Critical Differences

### 3.1 V1 Had Explicit Ranks

V1 had 5 explicit ranks (NEW, RISING, DISTINGUISHED, GOLD, PROMAX) with visual badges and behavioral changes.

### 3.2 V2.0 Lacks Rank System

V2.0 has no rank system. Users are either regular users or admins.

### 3.3 V1 Had Trust Score

V1 calculated a multi-factor trust score (0-100) based on:
- Verified identity
- Valid reviews
- Completed jobs
- Response rate
- Completion rate
- Cancellation rate
- Disputes
- Account age
- Activity
- Profile completeness
- Fraud signals

### 3.4 V2.0 Lacks Trust Score

V2.0 has no trust score calculation.

### 3.5 V1 Had Academic Badge

V1 had a functional academic badge for users with academic achievements.

### 3.6 V2.0 Lacks Academic Badge

V2.0 has no academic badge system.

---

## 4. Recommended Final Ranking Engine

### 4.1 Rank Definitions

| Rank | Description | Visual | Criteria |
|---|---|---|---|
| NEW | New user | Default | Account created < 30 days |
| RISING | Rising user | Badge | Activity > 10 actions |
| DISTINGUISHED | Distinguished user | Badge + border | Activity > 50 actions, 5+ reviews |
| GOLD | Gold user | Gold badge | Activity > 100 actions, 10+ reviews, 4.5+ rating |
| PROMAX | ProMax user | Special badge | Activity > 200 actions, 20+ reviews, 4.8+ rating, 6+ months |

### 4.2 Rank Visual Behavior

| Rank | Profile Border | Badge | Featured | Priority |
|---|---|---|---|---|
| NEW | None | None | No | Low |
| RISING | Blue border | Blue badge | No | Medium |
| DISTINGUISHED | Purple border | Purple badge | Yes | High |
| GOLD | Gold border | Gold badge | Yes | Very High |
| PROMAX | Gradient border | Special badge | Yes | Highest |

### 4.3 Trust Score Factors

| Factor | Weight | Description |
|---|---|---|
| Identity Verified | 15% | KYC verification completed |
| Valid Reviews | 20% | Number of valid reviews received |
| Completed Jobs | 15% | Number of completed transactions |
| Response Rate | 10% | Response time to messages |
| Completion Rate | 10% | Transaction completion rate |
| Cancellation Rate | -5% | Penalty for cancellations |
| Disputes | -10% | Penalty for disputes |
| Account Age | 5% | Time since registration |
| Activity | 10% | Recent activity level |
| Profile Completeness | 5% | Profile information completeness |
| Fraud Signals | -20% | Penalty for fraud detection |

### 4.4 Rank Calculation

```typescript
function calculateRank(user: User): Rank {
  const score = calculateTrustScore(user);
  
  if (score >= 90 && user.accountAge >= 180 && user.reviewCount >= 20) {
    return 'PROMAX';
  } else if (score >= 80 && user.reviewCount >= 10 && user.averageRating >= 4.5) {
    return 'GOLD';
  } else if (score >= 60 && user.reviewCount >= 5) {
    return 'DISTINGUISHED';
  } else if (score >= 30 && user.activityCount >= 10) {
    return 'RISING';
  } else {
    return 'NEW';
  }
}
```

### 4.5 Rank Benefits

| Rank | Benefits |
|---|---|
| NEW | Basic access, limited visibility |
| RISING | Increased visibility, access to basic features |
| DISTINGUISHED | Featured in search, access to advanced features |
| GOLD | Priority support, access to premium features |
| PROMAX | VIP support, access to all features, special badge |

---

## 5. Verification System

### 5.1 Verification Types

| Type | Description | Badge | Requirements |
|---|---|---|---|
| Identity Verified | KYC verification | ✓ Identity | National ID, selfie |
| Professional Verified | Professional license | ✓ Professional | License number, documents |
| Office Verified | Office verification | ✓ Office | CR number, license |
| Company Verified | Company verification | ✓ Company | CR number, documents |
| License Verified | Software license | ✓ License | License key, HWID |
| Property Verified | Property verification | ✓ Property | Ownership documents |

### 5.2 Verification Workflow

```
User submits verification request
→ Admin reviews documents
→ Approve or Reject
→ User notified
→ Badge applied if approved
```

### 5.3 Verification vs Rank

**CRITICAL RULE:** Verification and reputation rank MUST be separate concepts.

- Verification = Identity confirmation (KYC)
- Rank = Trust level (earned through activity)

A user may be:
- Identity Verified + NEW rank (new verified user)
- Unverified + GOLD rank (active user who hasn't verified)
- Identity Verified + PROMAX rank (top verified user)

---

## 6. V1 Subscription System

### 6.1 Subscription Plans

V1 had subscription plans:

| Attribute | Type | Purpose |
|---|---|---|
| name | String | Plan name |
| price | Decimal | Plan price |
| currency | String | Currency code |
| duration | Integer | Duration in days |
| features | JSON | Plan features |
| targetType | String | User type target |

**Source:** `prisma/schema.prisma` `plans` model

### 6.2 User Subscriptions

| Attribute | Type | Purpose |
|---|---|---|
| userId | UUID | User reference |
| planId | UUID | Plan reference |
| status | String | active/expired/cancelled |
| startDate | Date | Subscription start |
| endDate | Date | Subscription end |

**Source:** `prisma/schema.prisma` `user_subscriptions` model

### 6.3 Subscription vs Rank

**CRITICAL RULE:** Subscription and rank MUST be separate concepts.

- Subscription = Paid plan (monthly/yearly)
- Rank = Trust level (earned through activity)

A user may be:
- Free plan + GOLD rank (active free user)
- Pro plan + NEW rank (new paying user)
- Pro plan + PROMAX rank (top paying user)

---

## 7. V1 Distinguished Behavior

### 7.1 Visual Changes

V1 visually changed profiles by rank:

| Rank | Profile Changes |
|---|---|
| NEW | Default styling |
| RISING | Blue accent |
| DISTINGUISHED | Purple accent, border |
| GOLD | Gold accent, gold border, featured |
| PROMAX | Gradient accent, special border, VIP |

### 7.2 Behavioral Changes

| Rank | Behavioral Changes |
|---|---|
| NEW | Standard priority |
| RISING | Increased visibility |
| DISTINGUISHED | Featured in search |
| GOLD | Priority support |
| PROMAX | VIP support, special features |

---

## 8. V2.0 Gaps

### 8.1 Missing Features

1. No rank system
2. No trust score
3. No academic badge
4. No distinguished status
5. No subscription system
6. No rank visual behavior
7. No rank benefits

### 8.2 Required Implementation

1. Add rank field to users table
2. Add trust_score field to users table
3. Implement rank calculation logic
4. Implement rank visual behavior
5. Implement rank benefits
6. Add verification badges
7. Add subscription system (if needed)

---

**Status:** COMPLETE  
**Application Source Files Modified:** ZERO
