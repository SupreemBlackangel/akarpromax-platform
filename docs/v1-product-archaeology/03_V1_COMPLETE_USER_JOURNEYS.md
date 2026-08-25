# 03_V1_COMPLETE_USER_JOURNEYS.md
# V1 Complete User Journeys

**Audit Date:** 2026-08-19  
**Mode:** READ-ONLY — V1 Source Archaeology

---

## Overview

This document reconstructs COMPLETE user journeys through the V1 platform. Each journey includes actor, trigger, entry, steps, state transitions, data created, notifications, messaging, admin intervention, success, failure, and after-success loop.

---

## Journey 1: Guest → Property Buyer

**ACTOR:** Guest (unauthenticated)  
**TRIGGER:** Wants to buy property  
**ENTRY:** Homepage or direct link

### Steps:

1. **Browse Properties**
   - Page: `Properties.tsx`
   - Action: View property listings
   - Data: Property list with filters

2. **View Property Detail**
   - Page: `PropertyDetail.tsx`
   - Action: Click property card
   - Data: Full property details, images, map

3. **Register**
   - Page: `Register.tsx`
   - Action: Fill registration form
   - Data: User account created
   - State: UserType = INDIVIDUAL

4. **Verify Email**
   - Page: `VerifyEmail.tsx`
   - Action: Click verification link
   - State: email verified

5. **Favorite Property**
   - Action: Click favorite button
   - Data: Property added to favorites
   - Storage: localStorage

6. **Contact Seller/Office**
   - Page: `PropertyDetail.tsx`
   - Action: Click contact button
   - Data: Inquiry created
   - Notification: Seller/office notified

7. **Start Conversation**
   - Page: `ChatWidget.tsx`
   - Action: Send message
   - Data: Conversation created
   - Notification: Recipient notified

8. **Request Viewing**
   - Action: Request property viewing
   - Data: Booking created
   - Notification: Office notified

### State Transitions:
- Guest → Registered User → Active User → Property Inquirer → Conversation Starter

### Data Created:
- User account
- Property favorite
- Inquiry
- Conversation
- Messages
- Booking

### Notifications:
- Email verification
- Inquiry notification to seller/office
- Message notification to recipient
- Booking notification to office

### After-Success Loop:
- User receives saved search alerts
- User receives new property notifications
- User receives message replies

---

## Journey 2: Property Owner → Listing

**ACTOR:** Registered User  
**TRIGGER:** Wants to sell/rent property  
**ENTRY:** Dashboard

### Steps:

1. **Submit Property**
   - Page: `SubmitProperty.tsx`
   - Action: Fill property form
   - Data: Property created
   - State: status = "active"

2. **Upload Images**
   - Action: Upload property images
   - Data: Images stored

3. **Set Price & Details**
   - Action: Set price, area, bedrooms, etc.
   - Data: Property details saved

4. **Submit for Review**
   - Action: Submit property
   - State: status = "pending" (if moderation enabled)
   - Notification: Admin/moderator notified

5. **Moderation**
   - Page: `AdminProperties.tsx`
   - Action: Admin approves/rejects
   - State: status = "active" or "rejected"
   - Notification: Owner notified

6. **Property Listed**
   - Page: `Properties.tsx`
   - Action: Property appears in search
   - Data: Property viewable by buyers

7. **Receive Inquiries**
   - Action: Buyers contact
   - Data: Inquiries created
   - Notification: Owner notified

8. **Respond to Inquiries**
   - Action: Reply to messages
   - Data: Conversations created

### State Transitions:
- User → Property Owner → Inquiry Receiver → Conversation Participant

### Data Created:
- Property
- Images
- Inquiries
- Conversations
- Messages

### Notifications:
- Moderation notification to admin
- Approval/rejection notification to owner
- Inquiry notification to owner
- Message notification

### After-Success Loop:
- Property receives views
- Property receives inquiries
- Owner receives messages
- Property may be featured

---

## Journey 3: Property Seeker → Request

**ACTOR:** Registered User  
**TRIGGER:** Can't find desired property  
**ENTRY:** Dashboard

### Steps:

1. **Create Property Request**
   - Page: `MyPropertyRequests.tsx`
   - Action: Fill request form
   - Data: PropertyRequest created
   - State: status = "open"

2. **Set Requirements**
   - Action: Set property type, city, budget
   - Data: Request details saved

3. **Wait for Offers**
   - Action: Offices see request
   - Data: Offices view request

4. **Receive Offers**
   - Action: Offices submit offers
   - Data: PropertyOffers created
   - State: offer status = "pending"
   - Notification: User notified

5. **Compare Offers**
   - Action: Review multiple offers
   - Data: Offer comparison

6. **Accept Offer**
   - Action: Accept best offer
   - State: offer status = "accepted"
   - Notification: Office notified

7. **Reject Other Offers**
   - Action: Reject remaining offers
   - State: offer status = "rejected"
   - Notification: Offices notified

8. **Close Request**
   - Action: Close request
   - State: request status = "closed"

### State Transitions:
- User → Request Creator → Offer Receiver → Offer Acceptor

### Data Created:
- PropertyRequest
- PropertyOffers
- Notifications

### Notifications:
- Request notification to offices
- Offer notification to user
- Acceptance notification to office
- Rejection notification to offices

### After-Success Loop:
- User may create more requests
- Office may send more offers

---

## Journey 4: Service Customer → Service Request

**ACTOR:** Registered User  
**TRIGGER:** Needs a service (plumbing, electrical, etc.)  
**ENTRY:** Service Hub

### Steps:

1. **Browse Providers**
   - Page: `ServiceHub.tsx`
   - Action: Search providers by category/city
   - Data: Provider list

2. **View Provider Profile**
   - Action: Click provider
   - Data: Provider details, ratings, portfolio

3. **Create Service Request**
   - Action: Submit request
   - Data: ServiceHubRequest created
   - State: status = "pending"
   - Notification: Provider notified

4. **Provider Responds**
   - Action: Provider accepts/declines
   - State: status = "accepted" or "declined"
   - Notification: Customer notified

5. **Service Performed**
   - Action: Provider performs service
   - Data: Service completed

6. **Job Completion**
   - Action: Mark job complete
   - State: status = "completed"
   - Notification: Customer notified

7. **Rate Provider**
   - Action: Submit rating
   - Data: ServiceHubRating created
   - Notification: Provider notified

8. **Submit Feedback**
   - Action: Submit feedback
   - Data: ServiceHubFeedback created

### State Transitions:
- User → Service Customer → Request Creator → Job Completer → Rater

### Data Created:
- ServiceHubRequest
- ServiceHubRating
- ServiceHubFeedback

### Notifications:
- Request notification to provider
- Acceptance/decline notification to customer
- Completion notification to customer
- Rating notification to provider

### After-Success Loop:
- Provider receives more requests
- Customer receives service recommendations
- Provider reputation increases

---

## Journey 5: Service Provider → Registration

**ACTOR:** Registered User (artisan/craftsman)  
**TRIGGER:** Wants to provide services  
**ENTRY:** Upgrade to Artisan

### Steps:

1. **Upgrade Account**
   - Page: `UpgradeToArtisan.tsx`
   - Action: Fill artisan form
   - Data: UserType changed to ARTISAN

2. **Create Service Profile**
   - Page: `ServiceHub.tsx`
   - Action: Fill profile form
   - Data: ServiceHubProfile created

3. **Set Availability**
   - Action: Toggle availability
   - Data: availability = true

4. **Upload CV**
   - Action: Upload CV document
   - Data: CV stored

5. **Receive Requests**
   - Action: Customers submit requests
   - Data: ServiceHubRequests received
   - Notification: Provider notified

6. **Accept Request**
   - Action: Accept request
   - State: status = "accepted"
   - Notification: Customer notified

7. **Perform Service**
   - Action: Perform service
   - Data: Service completed

8. **Complete Job**
   - Action: Mark complete
   - State: status = "completed"
   - Notification: Customer notified

9. **Receive Rating**
   - Action: Customer rates
   - Data: ServiceHubRating received
   - Reputation: Rating updated

### State Transitions:
- User → Artisan → Service Provider → Job Completer → Rated Provider

### Data Created:
- ServiceHubProfile
- ServiceHubRequests
- ServiceHubRatings

### Notifications:
- Request notification
- Acceptance notification
- Completion notification
- Rating notification

### After-Success Loop:
- Provider receives more requests
- Provider reputation increases
- Provider may become top-rated

---

## Journey 6: Auction Bidder

**ACTOR:** Registered User  
**TRIGGER:** Wants to bid on property  
**ENTRY:** Auction listing

### Steps:

1. **Browse Auctions**
   - Page: `Auctions.tsx`
   - Action: View auction listings
   - Data: Auction list

2. **View Auction Detail**
   - Page: `AuctionDetail.tsx`
   - Action: Click auction
   - Data: Auction details, bid history

3. **Join Auction**
   - Action: Join auction
   - Data: AuctionParticipant created
   - State: hasDeposit = false (if deposit required)

4. **Place Bid**
   - Action: Submit bid
   - Data: AuctionBid created
   - State: currentPrice updated
   - Notification: Outbid users notified

5. **Set Auto-Bid**
   - Action: Set max auto-bid
   - Data: maxAutoBid set
   - State: isAutoBid = true

6. **Monitor Auction**
   - Action: Watch bid updates
   - Data: Real-time updates
   - Notification: Outbid notifications

7. **Win Auction**
   - Action: Auction ends
   - State: winnerId set, winningPrice set
   - Notification: Winner notified

8. **Confirm Win**
   - Action: Confirm purchase
   - State: status = "COMPLETED"
   - Notification: Office notified

### State Transitions:
- User → Auction Participant → Bidder → Winner → Purchaser

### Data Created:
- AuctionParticipant
- AuctionBid
- AuctionLog
- AuctionPriceHistory

### Notifications:
- Outbid notification
- Win notification
- Confirmation notification

### After-Success Loop:
- Bidder may bid on more auctions
- Bidder reputation increases
- Bidder may be banned if fraud detected

---

## Journey 7: Auction Fraud Detection

**ACTOR:** System (automatic)  
**TRIGGER:** Property re-listed after sale  
**ENTRY:** Cron job

### Steps:

1. **Detect Suspicious Relist**
   - System: Check if property re-listed within 30 days
   - Data: SuspiciousRelist created
   - State: status = "PENDING_REVIEW"

2. **Calculate Price Drop**
   - System: Calculate priceDropPercent
   - Data: Price comparison stored

3. **Set Proof Deadline**
   - System: Set proofDeadline (30 days)
   - Data: Deadline stored

4. **Notify Office**
   - System: Send notification
   - Notification: Office notified

5. **Office Submits Proof**
   - Action: Office submits contract, receipt, signature
   - Data: SaleProof created

6. **Admin Reviews**
   - Page: `AdminRelistMonitoring.tsx`
   - Action: Admin reviews proof
   - State: status = "RESOLVED" or "BLOCKED"

7. **Resolution**
   - If RESOLVED: Office cleared
   - If BLOCKED: Office banned from auctions
   - Notification: Office notified

### State Transitions:
- System → Detection → Review → Resolution

### Data Created:
- SuspiciousRelist
- SaleProof

### Notifications:
- Detection notification to office
- Resolution notification to office

---

## Journey 8: Marketer → Property Marketing

**ACTOR:** Registered User  
**TRIGGER:** Wants to market properties for commission  
**ENTRY:** Marketer Registration

### Steps:

1. **Register as Marketer**
   - Page: `MarketerRegister.tsx`
   - Action: Fill registration form
   - Data: MarketerProfile created
   - State: status = "PENDING"

2. **Admin Approval**
   - Page: `AdminMarketers.tsx`
   - Action: Admin approves
   - State: status = "APPROVED"
   - Notification: Marketer notified

3. **Browse Available Properties**
   - Page: `AvailableProperties.tsx`
   - Action: View marketing-enabled properties
   - Data: Property list

4. **Submit Proposal**
   - Page: `MarketerProposals.tsx`
   - Action: Submit proposal
   - Data: MarketingProposal created
   - State: status = "PENDING"
   - Notification: Advertiser notified

5. **Advertiser Accepts**
   - Action: Advertiser accepts proposal
   - State: status = "ACCEPTED"
   - Data: MarketingContract created
   - Notification: Marketer notified

6. **Market Property**
   - Action: Promote property
   - Data: Marketing activity

7. **Sale Completed**
   - Action: Property sold
   - Data: Commission created
   - State: commission status = "PENDING"
   - Notification: Marketer notified

8. **Commission Paid**
   - Action: Commission paid
   - State: commission status = "PAID"
   - Notification: Marketer notified

### State Transitions:
- User → Marketer → Proposal Submitter → Contractor → Commission Earner

### Data Created:
- MarketerProfile
- MarketingProposal
- MarketingContract
- Commission

### Notifications:
- Approval notification
- Proposal notification
- Acceptance notification
- Commission notification

### After-Success Loop:
- Marketer receives more proposals
- Marketer rank increases
- Marketer earns more commission

---

## Journey 9: Office → Auction Creation

**ACTOR:** Office Manager  
**TRIGGER:** Wants to auction property  
**ENTRY:** Dashboard

### Steps:

1. **Verify Office**
   - Action: Admin verifies office
   - State: isVerified = true
   - State: canCreateAuctions = true

2. **Create Auction**
   - Page: `AuctionDetail.tsx`
   - Action: Fill auction form
   - Data: Auction created
   - State: status = "PENDING"

3. **Set Auction Details**
   - Action: Set start price, increment, duration
   - Data: Auction settings saved

4. **Start Auction**
   - Action: Auction starts
   - State: status = "ACTIVE"
   - Notification: Users notified

5. **Monitor Bids**
   - Action: Watch bid activity
   - Data: Bid history

6. **Auction Ends**
   - Action: Auction ends
   - State: status = "COMPLETED"
   - State: winnerId, winningPrice set
   - Notification: Winner notified

7. **Confirm Sale**
   - Action: Confirm winner
   - Notification: Winner notified

### State Transitions:
- Office Manager → Auction Creator → Bid Monitor → Sale Confirmer

### Data Created:
- Auction
- AuctionBid
- AuctionParticipant
- AuctionLog

### Notifications:
- Auction start notification
- Bid notification
- Win notification
- Confirmation notification

---

## Journey 10: Admin → User Moderation

**ACTOR:** Admin  
**TRIGGER:** User reported or flagged  
**ENTRY:** Admin Dashboard

### Steps:

1. **View Reports**
   - Page: `AdminReports.tsx`
   - Action: Review reports
   - Data: Report list

2. **Investigate User**
   - Page: `AdminUsers.tsx`
   - Action: View user details
   - Data: User profile, activity

3. **Ban User**
   - Action: Ban user
   - State: status = "BANNED"
   - Data: banReason, bannedAt
   - Notification: User notified

4. **Or Warn User**
   - Action: Send warning
   - Notification: User notified

5. **Or Verify User**
   - Action: Verify identity
   - State: isVerified = true
   - Notification: User notified

### State Transitions:
- Admin → Investigator → Moderator → Enforcer

### Data Created:
- ActivityLog
- Notification

### Notifications:
- Ban notification
- Warning notification
- Verification notification

---

## Summary

| Journey | Actor | Steps | Key Entities |
|---|---|---|---|
| Guest → Buyer | Guest | 8 | User, Property, Inquiry, Conversation |
| Owner → Listing | User | 8 | Property, Images, Inquiry |
| Seeker → Request | User | 8 | PropertyRequest, PropertyOffer |
| Customer → Service | User | 8 | ServiceHubRequest, Rating, Feedback |
| Provider → Registration | User | 9 | ServiceHubProfile, Request, Rating |
| Auction Bidder | User | 8 | AuctionParticipant, AuctionBid |
| Fraud Detection | System | 7 | SuspiciousRelist, SaleProof |
| Marketer → Marketing | User | 8 | MarketerProfile, Contract, Commission |
| Office → Auction | Office | 7 | Auction, Bid, Participant |
| Admin → Moderation | Admin | 5 | User, Report, ActivityLog |

---

**Status:** COMPLETE  
**Application Source Files Modified:** ZERO
