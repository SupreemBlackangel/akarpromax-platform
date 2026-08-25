# 04_V1_STATE_MACHINES.md
# V1 State Machine Archaeology

**Audit Date:** 2026-08-19  
**Mode:** READ-ONLY — V1 Source Archaeology

---

## Overview

This document reconstructs every workflow state machine found in V1. Each status field represents a business process with defined transitions.

---

## 1. User Status

**Table:** `users.status`  
**Default:** "active"

```
ACTIVE
→ BANNED (admin action)
→ ACTIVE (admin unban)
```

**Transitions:**
- ACTIVE → BANNED: Admin bans user (`api/admin.ts`)
- BANNED → ACTIVE: Admin unbans user (`api/admin.ts`)

**Evidence:** `AdminUsers.tsx`, `api/admin.ts`

---

## 2. Identity Verification Status

**Table:** `identity_verifications.status`  
**Default:** "pending"

```
PENDING
→ APPROVED (admin action)
→ REJECTED (admin action)
```

**Transitions:**
- PENDING → APPROVED: Admin approves verification (`api/admin.ts`)
- PENDING → REJECTED: Admin rejects verification (`api/admin.ts`)

**Evidence:** `AdminVerification.tsx`, `api/admin.ts`

---

## 3. Property Status

**Table:** `properties.status`  
**Default:** "active"

```
ACTIVE
→ SOLD (transaction complete)
→ RENTED (transaction complete)
→ INACTIVE (owner deactivation)
→ ACTIVE (reactivation)
```

**Transitions:**
- ACTIVE → SOLD: Sale completed
- ACTIVE → RENTED: Rental completed
- ACTIVE → INACTIVE: Owner deactivates
- INACTIVE → ACTIVE: Owner reactivates

**Evidence:** `Dashboard.tsx`, `api/properties.ts`

---

## 4. Property Request Status

**Table:** `property_requests.status`  
**Default:** "open"

```
OPEN
→ MATCHED (office matches property)
→ CLOSED (user closes)
→ OPEN (reopen)
```

**Transitions:**
- OPEN → MATCHED: Office finds matching property
- OPEN → CLOSED: User closes request
- CLOSED → OPEN: User reopens

**Evidence:** `MyPropertyRequests.tsx`, `api/property-requests.ts`

---

## 5. Property Offer Status

**Table:** `property_offers.status`  
**Default:** "pending"

```
PENDING
→ ACCEPTED (user accepts)
→ REJECTED (user rejects)
```

**Transitions:**
- PENDING → ACCEPTED: User accepts offer
- PENDING → REJECTED: User rejects offer

**Evidence:** `OfficeRequests.tsx`, `api/property-requests.ts`

---

## 6. Auction Status

**Table:** `auctions.status`  
**Default:** "PENDING"

```
PENDING
→ ACTIVE (auction starts)
→ COMPLETED (auction ends)
→ CANCELLED (admin cancels)
```

**Transitions:**
- PENDING → ACTIVE: Start date reached
- ACTIVE → COMPLETED: End date reached or winner declared
- ACTIVE → CANCELLED: Admin cancels
- PENDING → CANCELLED: Admin cancels

**Evidence:** `AuctionDetail.tsx`, `api/auctions.ts`, cron jobs

---

## 7. Auction Bid Status

**Table:** `auction_bids` (no explicit status)

**Implicit States:**
- Current highest bid
- Outbid
- Winning bid

**Transitions:**
- New bid → Current highest (if higher)
- Current highest → Outbid (when higher bid placed)
- Final bid → Winning bid (auction ends)

**Evidence:** `api/auctions.ts`

---

## 8. Auction Report Status

**Table:** `auction_reports.status`  
**Default:** "PENDING"

```
PENDING
→ RESOLVED (admin resolves)
→ DISMISSED (admin dismisses)
```

**Transitions:**
- PENDING → RESOLVED: Admin resolves report
- PENDING → DISMISSED: Admin dismisses report

**Evidence:** `AdminAuctions.tsx`, `api/auctions.ts`

---

## 9. Suspicious Relist Status

**Table:** `suspicious_relsits.status`  
**Default:** "PENDING_REVIEW"

```
PENDING_REVIEW
→ RESOLVED (proof submitted + reviewed)
→ BLOCKED (deadline missed or fraud confirmed)
```

**Transitions:**
- PENDING_REVIEW → RESOLVED: Office submits proof, admin approves
- PENDING_REVIEW → BLOCKED: Deadline missed or admin confirms fraud

**Evidence:** `AdminRelistMonitoring.tsx`, `api/relist-monitoring.ts`

---

## 10. Sale Proof Status

**Table:** `sale_proofs.status`

```
PENDING
→ APPROVED (admin approves)
→ REJECTED (admin rejects)
```

**Transitions:**
- PENDING → APPROVED: Admin approves proof
- PENDING → REJECTED: Admin rejects proof

**Evidence:** `api/relist-monitoring.ts`

---

## 11. Marketer Profile Status

**Table:** `marketer_profiles.status`  
**Default:** "PENDING"

```
PENDING
→ APPROVED (admin approves)
→ REJECTED (admin rejects)
```

**Transitions:**
- PENDING → APPROVED: Admin approves marketer
- PENDING → REJECTED: Admin rejects marketer

**Evidence:** `AdminMarketers.tsx`, `api/admin.ts`

---

## 12. Marketing Contract Status

**Table:** `marketing_contracts.status`  
**Default:** "PENDING"

```
PENDING
→ ACTIVE (both parties accept)
→ TERMINATED (either party terminates)
→ EXPIRED (end date reached)
```

**Transitions:**
- PENDING → ACTIVE: Both marketer and advertiser accept
- ACTIVE → TERMINATED: Either party terminates
- ACTIVE → EXPIRED: End date reached
- PENDING → EXPIRED: End date reached without acceptance

**Evidence:** `MarketerContracts.tsx`, `api/marketing.ts`

---

## 13. Marketing Proposal Status

**Table:** `marketing_proposals.status`  
**Default:** "PENDING"

```
PENDING
→ ACCEPTED (advertiser accepts)
→ REJECTED (advertiser rejects)
→ WITHDRAWN (marketer withdraws)
```

**Transitions:**
- PENDING → ACCEPTED: Advertiser accepts proposal
- PENDING → REJECTED: Advertiser rejects proposal
- PENDING → WITHDRAWN: Marketer withdraws proposal

**Evidence:** `MarketerProposals.tsx`, `api/marketing.ts`

---

## 14. Commission Status

**Table:** `commissions.status`  
**Default:** "PENDING"

```
PENDING
→ PAID (payment processed)
→ CANCELLED (contract terminated)
```

**Transitions:**
- PENDING → PAID: Commission paid
- PENDING → CANCELLED: Contract terminated

**Evidence:** `api/marketing.ts`

---

## 15. Service Hub Request Status

**Table:** `service_hub_requests.status`  
**Default:** "pending"

```
pending
→ accepted (provider accepts)
→ completed (job completed)
→ cancelled (user cancels)
```

**Transitions:**
- pending → accepted: Provider accepts request
- accepted → completed: Job completed
- pending → cancelled: User cancels

**Evidence:** `ServiceHub.tsx`, `api/service-hub.ts`

---

## 16. Service Hub Feedback Sentiment

**Table:** `service_hub_feedback.sentiment`  
**Default:** "positive"

```
positive
neutral
negative
```

**Classification:** Based on feedback text analysis.

**Evidence:** `api/service-hub.ts`

---

## 17. Subscription Status

**Table:** `user_subscriptions.status`  
**Default:** "active"

```
active
→ expired (end date reached)
→ cancelled (user cancels)
```

**Transitions:**
- active → expired: End date reached
- active → cancelled: User cancels
- expired → active: Renewal

**Evidence:** `AdminMembership.tsx`, `api/admin.ts`

---

## 18. Software License Status

**Table:** `software_licenses.status`  
**Default:** "active"

```
active
→ expired (expiration date reached)
→ revoked (admin revokes)
```

**Transitions:**
- active → expired: Expiration date reached
- active → revoked: Admin revokes license
- expired → active: Renewal

**Evidence:** `AdminSoftwareLicenses.tsx`, `api/licenses.ts`

---

## 19. License Code Status

**Table:** `license_codes.status`  
**Default:** "active"

```
active
→ used (user redeems)
```

**Transitions:**
- active → used: User redeems code

**Evidence:** `api/licenses.ts`

---

## 20. Ad Status

**Table:** `ads.status`  
**Default:** "active"

```
active
→ paused (admin pauses)
→ completed (campaign ends)
→ inactive (admin deactivates)
```

**Transitions:**
- active → paused: Admin pauses ad
- paused → active: Admin resumes
- active → completed: End date reached
- active → inactive: Admin deactivates

**Evidence:** `AdminAds.tsx`, `api/ads.ts`

---

## 21. Blog Post Status

**Table:** `blog_posts.published`  
**Default:** true

```
DRAFT (published = false)
→ PUBLISHED (published = true)
→ DRAFT (unpublish)
```

**Transitions:**
- DRAFT → PUBLISHED: Author publishes
- PUBLISHED → DRAFT: Author unpublishes

**Evidence:** `WriteBlog.tsx`, `api/blog.ts`

---

## 22. Inquiry Status

**Table:** `inquiries` (no explicit status field)

**Implicit States:**
- New inquiry
- Reviewed
- Contacted

**Evidence:** `AdminInquiries.tsx`, `api/inquiries.ts`

---

## 23. Notification Read Status

**Table:** `notifications.isRead`  
**Default:** false

```
UNREAD (isRead = false)
→ READ (isRead = true)
```

**Transitions:**
- UNREAD → READ: User reads notification

**Evidence:** `api/auction-enhancements.ts`

---

## 24. Push Subscription Status

**Table:** `push_subscriptions` (no explicit status)

**Implicit States:**
- Active subscription
- Unsubscribed (deleted)

**Evidence:** `usePushNotifications.ts`, `api/auction-enhancements.ts`

---

## 25. Moderation Request Status

**Table:** `moderation_requests.status`  
**Default:** "pending"

```
pending
→ approved (moderator approves access)
→ rejected (moderator rejects)
```

**Transitions:**
- pending → approved: Moderator approves access
- pending → rejected: Moderator rejects access

**Evidence:** `chat-server.ts`

---

## 26. Early Warning Status

**Table:** `early_warnings`

```
ACTIVE
→ RESOLVED (admin resolves)
```

**Transitions:**
- ACTIVE → RESOLVED: Admin resolves warning

**Evidence:** `api/auction-enhancements.ts`

---

## 27. Office Rating Snapshot

**Table:** `office_rating_snapshots`

**No explicit status — snapshots are immutable records.**

**Evidence:** `api/auction-enhancements.ts`

---

## 28. Auction Price History

**Table:** `auction_price_history`

**No explicit status — history is immutable log.**

**Evidence:** `api/auctions.ts`

---

## 29. Auction Log

**Table:** `auction_logs`

**No explicit status — logs are immutable audit trail.**

**Evidence:** `api/auctions.ts`

---

## 30. Activity Log

**Table:** `activity_logs`

**No explicit status — logs are immutable audit trail.**

**Evidence:** `api/admin.ts`

---

## Summary

| Entity | States | Key Transitions |
|---|---|---|
| User | ACTIVE, BANNED | Ban/Unban |
| Identity Verification | PENDING, APPROVED, REJECTED | Submit, Approve, Reject |
| Property | ACTIVE, SOLD, RENTED, INACTIVE | List, Sell, Rent, Deactivate |
| Property Request | OPEN, MATCHED, CLOSED | Create, Match, Close |
| Property Offer | PENDING, ACCEPTED, REJECTED | Submit, Accept, Reject |
| Auction | PENDING, ACTIVE, COMPLETED, CANCELLED | Start, End, Cancel |
| Auction Report | PENDING, RESOLVED, DISMISSED | Report, Resolve, Dismiss |
| Suspicious Relist | PENDING_REVIEW, RESOLVED, BLOCKED | Detect, Resolve, Block |
| Marketer Profile | PENDING, APPROVED, REJECTED | Register, Approve, Reject |
| Marketing Contract | PENDING, ACTIVE, TERMINATED, EXPIRED | Propose, Accept, Terminate |
| Marketing Proposal | PENDING, ACCEPTED, REJECTED, WITHDRAWN | Submit, Accept, Reject |
| Commission | PENDING, PAID, CANCELLED | Earn, Pay, Cancel |
| Service Request | pending, accepted, completed, cancelled | Request, Accept, Complete |
| Subscription | active, expired, cancelled | Subscribe, Expire, Cancel |
| Software License | active, expired, revoked | Activate, Expire, Revoke |
| License Code | active, used | Generate, Redeem |
| Ad | active, paused, completed, inactive | Create, Pause, Complete |
| Blog Post | DRAFT, PUBLISHED | Write, Publish |
| Notification | UNREAD, READ | Notify, Read |

---

**Status:** COMPLETE  
**Application Source Files Modified:** ZERO
