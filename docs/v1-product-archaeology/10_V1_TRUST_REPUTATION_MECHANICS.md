# 10_V1_TRUST_REPUTATION_MECHANICS.md
# V1 Trust & Reputation Mechanics

**Audit Date:** 2026-08-19  
**Mode:** READ-ONLY — V1 Source Archaeology

---

## 1. Identity Verification

### 1.1 KYC Verification

**Table:** `identity_verifications`

**Workflow:**
1. User submits national ID + image
2. Admin reviews
3. Approve/Reject
4. Badge applied

**Fields:**
- `nationalId` — National ID number
- `idImageUrl` — ID card image
- `status` (pending/approved/rejected)
- `reviewedBy` — Admin who reviewed
- `rejectReason` — Rejection reason

**Effect:**
- `users.isVerified` = true when approved
- `users.verifiedAt` = timestamp

---

## 2. Professional Verification

### 2.1 License Verification

**Fields on `users`:**
- `licenseNumber` — Professional license
- `isOfficial` — Official badge

**Effect:**
- `isOfficial` = true when verified
- Professional badge displayed

---

## 3. Office Verification

### 3.1 Office Verification

**Fields on `offices`:**
- `isVerified` — Verified flag
- `verifiedAt` — Verification timestamp
- `canCreateAuctions` — Auction permission

**Effect:**
- Office gets verified badge
- Office can create auctions

---

## 4. Reputation System

### 4.1 User Reputation

**Fields on `users`:**
- `isVerified` — Identity verified
- `isOfficial` — Professional verified
- `experienceYears` — Experience

### 4.2 Office Reputation

**Table:** `office_rating_snapshots`

**Fields:**
- `overallScore` — Composite score (0-100)
- `badge` (Bronze/Silver/Gold) — Visual badge
- `completionRate` — Transaction completion rate
- `responseSpeed` — Response time
- `complaintScore` — Complaint handling
- `manipulationScore` — Fraud detection
- `clientRating` — Client reviews

**Calculation:**
- Recalculated every hour (cron job)
- Based on multiple factors

### 4.3 Provider Reputation

**Table:** `service_hub_profiles`

**Fields:**
- `rating` — Average rating (1-5)
- `tier` (basic/premium) — Provider tier
- `isTopRated` — Top rated flag

**Calculation:**
- Based on `service_hub_ratings.score`
- Tier based on rating threshold

### 4.4 Marketer Reputation

**Table:** `marketer_profiles`

**Fields:**
- `totalProperties` — Total properties marketed
- `successfulDeals` — Successful deals
- `totalCommission` — Total earnings
- `rating` — Average rating
- `reviewsCount` — Review count
- `rankId` — MarketerRank reference

**Rank System:**
- Bronze (0-10 properties)
- Silver (11-50 properties)
- Gold (51-100 properties)
- Platinum (100+ properties)

---

## 5. Two-Sided Reputation

### 5.1 Provider Rating

**Table:** `service_hub_ratings`

**Fields:**
- `score` — 1-5 rating
- `comment` — Text feedback

**Direction:** Customer → Provider

### 5.2 Client Feedback

**Table:** `service_hub_feedback`

**Fields:**
- `message` — Feedback text
- `sentiment` (positive/neutral/negative)

**Direction:** Provider → Customer

### 5.3 Client Flags

**Table:** `service_hub_feedback.sentiment`

**Effect:**
- Negative sentiment affects customer reputation
- Used for matching/blocking

---

## 6. Auction Reputation

### 6.1 Bidder Reputation

**Fields on `auction_bids`:**
- `ipAddress` — Audit trail

**Reputation Factors:**
- Bid history
- Win rate
- Fraud flags

### 6.2 Office Auction Reputation

**Fields on `offices`:**
- `canCreateAuctions` — Permission
- `isAuctionsBanned` — Ban flag

**Effect:**
- Banned offices cannot create auctions

---

## 7. Visual Consequences

### 7.1 Badge Display

| Badge | Visual | Condition |
|---|---|---|
| Verified | ✓ Verified | isVerified = true |
| Official | ✓ Official | isOfficial = true |
| Bronze | Bronze badge | Office rating < 50 |
| Silver | Silver badge | Office rating 50-80 |
| Gold | Gold badge | Office rating > 80 |
| Top Rated | Top Rated badge | isTopRated = true |

### 7.2 Profile Changes

- Verified users get blue checkmark
- Official users get special badge
- High-rated offices get featured placement

---

## 8. Access Consequences

### 8.1 Verification Gates

| Action | Requires |
|---|---|
| Create office | isVerified |
| Run auctions | canCreateAuctions |
| Become marketer | MarketerProfile approved |
| Access premium features | Subscription |

### 8.2 Reputation Gates

| Action | Requires |
|---|---|
| Featured placement | High rating |
| Priority in search | Top rated |
| Lower commission | High rank |

---

## 9. Fraud Detection

### 9.1 Suspicious Relist Detection

**Table:** `suspicious_relsits`

**Trigger:** Property re-listed within 30 days of sale

**Factors:**
- Price drop percentage
- Time since sale
- Office history

### 9.2 Early Warning System

**Table:** `early_warnings`

**Triggers:**
- Suspicious bidding patterns
- Multiple accounts from same IP
- Rapid price changes

---

## 10. Summary

| Domain | Verification | Reputation | Trust |
|---|---|---|---|
| User | KYC (isVerified) | Experience | Identity confirmed |
| Professional | License (isOfficial) | Experience | Professional confirmed |
| Office | License (isVerified) | Rating snapshots | Office confirmed |
| Provider | Profile (isVerified) | Rating, tier, top rated | Service quality |
| Marketer | Profile (approved) | Rank, deals, commission | Marketing quality |
| Bidder | IP tracking | Bid history | Bidding integrity |

---

**Status:** COMPLETE  
**Application Source Files Modified:** ZERO
