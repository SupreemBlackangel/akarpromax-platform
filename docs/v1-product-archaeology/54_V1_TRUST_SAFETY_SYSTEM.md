# 54_V1_TRUST_SAFETY_SYSTEM.md
# V1 Trust & Safety System

**Audit Date:** 2026-08-19  
**Mode:** READ-ONLY — V1 Source Archaeology

---

## 1. Verification System

### 1.1 Identity Verification

**Table:** `identity_verifications`

**Workflow:**
1. User submits national ID + image
2. Admin reviews
3. Approve/Reject
4. Badge applied

### 1.2 Professional Verification

**Fields on `users`:**
- `licenseNumber` — Professional license
- `isOfficial` — Official badge

### 1.3 Office Verification

**Fields on `offices`:**
- `isVerified` — Verified flag
- `verifiedAt` — Verification timestamp
- `canCreateAuctions` — Auction permission

### 1.4 Marketer Verification

**Table:** `marketer_profiles`

**Fields:**
- `status` (PENDING/APPROVED/REJECTED)
- `approvedBy`, `approvedAt`

---

## 2. Ban System

### 2.1 User Ban

**Fields on `users`:**
- `status` = "banned"
- `banReason` — Ban reason
- `bannedAt` — Ban timestamp

### 2.2 Auction Ban

**Field on `users`:** `isBannedFromAuctions`

**Effect:** User cannot bid on auctions

### 2.3 Office Auction Ban

**Field on `offices`:** `isAuctionsBanned`

**Effect:** Office cannot create auctions

### 2.4 IP Blocking

**Table:** `blocked_ips`

**Fields:**
- `ipAddress` — Blocked IP
- `userId` — Associated user
- `reason` — Block reason

---

## 3. Fraud Detection

### 3.1 Suspicious Relist Detection

**Table:** `suspicious_relsits`

**Trigger:** Property re-listed within 30 days of sale

**Detection:**
1. Check if property was sold in auction
2. Check if new auction created within 30 days
3. Calculate price drop percentage
4. Create SuspiciousRelist record

### 3.2 Sale Proof

**Table:** `sale_proofs`

**Required Documents:**
- contractUrl — Sale contract
- paymentReceiptUrl — Payment receipt
- buyerSignatureUrl — Buyer signature

### 3.3 Early Warning System

**Table:** `early_warnings`

**Triggers:**
- Suspicious bidding patterns
- Multiple accounts from same IP
- Rapid price changes

---

## 4. Reputation System

### 4.1 Office Rating Snapshots

**Table:** `office_rating_snapshots`

**Factors:**
- overallScore — Composite score
- completionRate — Transaction completion
- responseSpeed — Response time
- complaintScore — Complaint handling
- manipulationScore — Fraud detection
- clientRating — Client reviews

### 4.2 Provider Rating

**Table:** `service_hub_ratings`

**Fields:**
- score — 1-5 rating
- comment — Text feedback

### 4.3 Marketer Reputation

**Table:** `marketer_profiles`

**Fields:**
- totalProperties, successfulDeals
- totalCommission, rating, reviewsCount
- rankId — MarketerRank reference

---

## 5. Moderation System

### 5.1 Content Moderation

- Property approval/rejection
- User approval/rejection
- Verification approval/rejection

### 5.2 Chat Moderation

**Table:** `moderation_requests`

**Workflow:**
1. Moderator requests access
2. Access granted
3. All access logged

### 5.3 Report System

**Table:** `auction_reports`

**Workflow:**
1. User reports issue
2. Admin reviews
3. Resolve/Dismiss

---

## 6. Audit Trail

### 6.1 Activity Logs

**Table:** `activity_logs`

**Fields:**
- userId, action, details

### 6.2 Login Attempts

**Table:** `login_attempts`

**Fields:**
- ipAddress, email, userId

### 6.3 Chat Moderation Logs

**Table:** `moderation_access_logs`

**Fields:**
- moderatorId, conversationId, reason

---

## 7. Legal Compliance

### 7.1 Code of Conduct

**Table:** `code_of_conducts`

**Fields:**
- version, titleAr, titleEn
- contentAr, contentEn
- isActive, effectiveDate

### 7.2 Acceptance Tracking

**Table:** `code_of_conduct_acceptances`

**Fields:**
- userId, codeId
- acceptedAt, ipAddress, userAgent

---

## 8. Summary

| Domain | Mechanism |
|---|---|
| Verification | Identity, professional, office, marketer |
| Banning | User ban, auction ban, office ban, IP blocking |
| Fraud Detection | Suspicious relist, early warning |
| Reputation | Office ratings, provider ratings, marketer ranks |
| Moderation | Content, chat, reports |
| Audit | Activity logs, login attempts, chat logs |
| Legal | Code of conduct, acceptance tracking |

---

**Status:** COMPLETE  
**Application Source Files Modified:** ZERO
