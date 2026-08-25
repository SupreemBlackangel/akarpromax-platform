# 19_V1_AUCTION_OPERATING_SYSTEM.md
# V1 Auction Operating System

**Audit Date:** 2026-08-19  
**Mode:** READ-ONLY — V1 Source Archaeology

---

## 1. Auction Types

### 1.1 AUCTION (Open Auction)

**Description:** Competitive bidding with time limit

**Fields:**
- startPrice — Starting price
- minBidIncrement — Minimum bid increase
- currentPrice — Current highest bid
- endDate — Auction end time
- status — PENDING/ACTIVE/COMPLETED/CANCELLED

### 1.2 FIXED (Fixed Price)

**Description:** Fixed price sale through auction system

**Fields:**
- startPrice — Fixed price
- type = "FIXED"

---

## 2. Auction Lifecycle

### 2.1 Creation

**Page:** `AuctionDetail.tsx`

**Requirements:**
- Office must be verified
- Office must have `canCreateAuctions = true`
- Property must exist

**Fields Set:**
- propertyId, officeId
- startPrice, minBidIncrement
- startDate, endDate
- type, isBinding
- currency

### 2.2 Activation

**Trigger:** Start date reached

**State Change:** PENDING → ACTIVE

**Effects:**
- Auction visible to bidders
- Bidding enabled
- Notifications sent

### 2.3 Bidding

**Page:** `AuctionDetail.tsx`

**Process:**
1. User joins auction
2. User places bid
3. System validates bid
4. System updates currentPrice
5. System logs bid
6. System notifies outbid users

**Validation:**
- Bid > currentPrice
- Bid >= currentPrice + minBidIncrement
- User not banned from auctions
- Auction is ACTIVE

### 2.4 Auto-Bidding

**Field:** `maxAutoBid`

**Process:**
1. User sets max auto-bid
2. System bids incrementally
3. System stops at max
4. User notified when outbid

### 2.5 Completion

**Trigger:** End date reached or winner declared

**State Change:** ACTIVE → COMPLETED

**Effects:**
- Winner declared
- winningPrice set
- Notifications sent

### 2.6 Winner Confirmation

**Process:**
1. Winner confirms purchase
2. Office confirms sale
3. Transaction completed

---

## 3. Anti-Fraud System

### 3.1 Suspicious Relist Detection

**Table:** `suspicious_relsits`

**Trigger:** Property re-listed within 30 days of sale

**Detection Logic:**
1. Check if property was sold in auction
2. Check if new auction created within 30 days
3. Calculate price drop percentage
4. Create SuspiciousRelist record
5. Set proof deadline (30 days)

**Fields:**
- oldAuctionId, newAuctionId
- propertyId, officeId
- previousSoldPrice, newStartPrice
- priceDropPercent
- status (PENDING_REVIEW/RESOLVED/BLOCKED)
- proofDeadline

### 3.2 Sale Proof

**Table:** `sale_proofs`

**Purpose:** Evidence that suspicious relist was legitimate

**Required Documents:**
- contractUrl — Sale contract
- paymentReceiptUrl — Payment receipt
- buyerSignatureUrl — Buyer signature

**Workflow:**
1. Office submits proof
2. Admin reviews
3. Approve/Reject

### 3.3 Early Warning System

**Table:** `early_warnings`

**Triggers:**
- Suspicious bidding patterns
- Multiple accounts from same IP
- Rapid price changes
- Known fraud patterns

**Fields:**
- type, targetId, targetType
- details, severity
- isResolved

### 3.4 Office Rating Snapshots

**Table:** `office_rating_snapshots`

**Factors:**
- overallScore — Composite score
- completionRate — Transaction completion
- responseSpeed — Response time
- complaintScore — Complaint handling
- manipulationScore — Fraud detection
- clientRating — Client reviews

**Calculation:** Recalculated every hour

---

## 4. Auction Reports

### 4.1 Report Submission

**Table:** `auction_reports`

**Fields:**
- auctionId, reporterId
- reason
- status (PENDING/RESOLVED/DISMISSED)
- resolvedById, resolvedAt

### 4.2 Report Resolution

**Process:**
1. Admin reviews report
2. Admin investigates
3. Admin resolves/dismisses
4. Notification sent

---

## 5. Auction Settings

### 5.1 Per-Office Settings

**Table:** `auction_settings`

**Fields:**
- officeId — Office reference
- defaultMinIncrement — Default bid increment
- defaultDurationDays — Default auction duration
- maxDurationDays — Maximum duration
- requiresDeposit — Deposit requirement
- depositPercentage — Deposit amount
- autoExtendMinutes — Anti-sniping extension

### 5.2 Anti-Sniping

**Field:** `autoExtendMinutes`

**Logic:**
- If bid placed within N minutes of end
- Extend end time by N minutes
- Prevents last-second sniping

---

## 6. Auction Analytics

### 6.1 Price History

**Table:** `auction_price_history`

**Fields:**
- auctionId, price, bidderId, source

**Purpose:** Track price changes over time

### 6.2 Auction Logs

**Table:** `auction_logs`

**Fields:**
- auctionId, action, userId, details

**Purpose:** Immutable audit trail

---

## 7. Auction Bans

### 7.1 User Ban

**Field:** `users.isBannedFromAuctions`

**Effect:** User cannot bid on any auction

### 7.2 Office Ban

**Field:** `offices.isAuctionsBanned`

**Effect:** Office cannot create auctions

---

## 8. Cron Jobs

### 8.1 Close Expired Auctions

**Interval:** 60 seconds

**Action:** Auto-close expired auctions

### 8.2 Process Expired Relists

**Interval:** 5 minutes

**Action:** Auto-block offices with expired proof deadlines

### 8.3 Run Early Warning Scan

**Interval:** 6 hours

**Action:** Scan for suspicious patterns

### 8.4 Recalculate Office Ratings

**Interval:** 1 hour

**Action:** Recalculate all office reputation scores

---

## 9. Summary

| Feature | Implementation |
|---|---|
| Auction types | AUCTION (open), FIXED (fixed price) |
| Bidding | Real-time bidding with validation |
| Auto-bidding | Incremental bidding up to max |
| Anti-sniping | Auto-extend on last-minute bids |
| Suspicious relist | Automatic detection within 30 days |
| Sale proof | Contract, receipt, signature |
| Early warning | Pattern-based fraud detection |
| Office rating | Multi-factor scoring |
| Reports | User-submitted, admin-resolved |
| Price history | Immutable price tracking |
| Audit logs | Immutable action tracking |
| User ban | isBannedFromAuctions |
| Office ban | isAuctionsBanned |

---

**Status:** COMPLETE  
**Application Source Files Modified:** ZERO
