# 52_V1_GROWTH_AND_ENGAGEMENT_LOOPS.md
# V1 Growth & Engagement Loops

**Audit Date:** 2026-08-19  
**Mode:** READ-ONLY — V1 Source Archaeology

---

## Overview

This document identifies recurring loops designed into V1. These loops are often more important than individual features.

---

## Loop 1: Property Discovery → Inquiry → Transaction

```
Property Search
→ View Property
→ Favorite
→ Contact Seller/Office
→ Inquiry
→ Conversation
→ Viewing Request
→ Transaction
→ Review
→ Reputation Increase
→ More Visibility
→ More Inquiries
```

**Actors:** Buyer, Seller, Office  
**Data Created:** Inquiry, Conversation, Booking, Review  
**Notifications:** Inquiry, Message, Booking

---

## Loop 2: Saved Search → Alert → Property → Transaction

```
Create Saved Search
→ New Property Listed
→ Notification
→ View Property
→ Contact
→ Transaction
```

**Actors:** Buyer, System  
**Data Created:** SavedSearch, Notification  
**Notifications:** Property match alert

---

## Loop 3: Property Request → Office Offer → Transaction

```
Create Property Request
→ Office Sees Request
→ Office Submits Offer
→ Buyer Compares Offers
→ Accept Offer
→ Transaction
→ Review
→ Office Reputation Increase
→ More Requests
```

**Actors:** Buyer, Office  
**Data Created:** PropertyRequest, PropertyOffer  
**Notifications:** Request, Offer, Acceptance

---

## Loop 4: Service Request → Dispatch → Job → Review

```
Service Need
→ Browse Providers
→ Create Request
→ Provider Accepts
→ Job Performed
→ Job Completed
→ Rating
→ Provider Reputation Increase
→ More Requests
```

**Actors:** Customer, Provider  
**Data Created:** ServiceHubRequest, ServiceHubRating  
**Notifications:** Request, Acceptance, Completion, Rating

---

## Loop 5: Auction → Bid → Win → Proof

```
Auction Created
→ Users Bid
→ Price Increases
→ Auction Ends
→ Winner Declared
→ Winner Confirms
→ Transaction
→ Proof Submitted
→ Office Reputation
```

**Actors:** Bidder, Office  
**Data Created:** Auction, AuctionBid, SaleProof  
**Notifications:** Bid, Outbid, Win, Confirmation

---

## Loop 6: Marketer → Proposal → Contract → Commission

```
Marketer Registers
→ Admin Approves
→ Browse Properties
→ Submit Proposal
→ Advertiser Accepts
→ Contract Created
→ Property Marketed
→ Sale Completed
→ Commission Earned
→ Rank Increase
→ More Opportunities
```

**Actors:** Marketer, Advertiser  
**Data Created:** MarketerProfile, MarketingProposal, MarketingContract, Commission  
**Notifications:** Approval, Proposal, Acceptance, Commission

---

## Loop 7: Office → Properties → Leads → Reputation

```
Office Creates Profile
→ Lists Properties
→ Receives Inquiries
→ Manages Leads
→ Completes Transactions
→ Receives Reviews
→ Reputation Increases
→ More Visibility
→ More Leads
```

**Actors:** Office, Buyers  
**Data Created:** Office, Property, Inquiry, Review  
**Notifications:** Inquiry, Review

---

## Loop 8: Verification → Trust → Access

```
User Registers
→ Submits Verification
→ Admin Approves
→ Badge Applied
→ Access Unlocked
→ More Features
→ More Activity
→ More Trust
```

**Actors:** User, Admin  
**Data Created:** IdentityVerification  
**Notifications:** Verification approval

---

## Loop 9: Free Tool → Professional → Service

```
User Uses Free Tool
→ Gets Result
→ Needs Professional
→ Browses Providers
→ Creates Request
→ Job Completed
→ Review
→ Provider Reputation
```

**Actors:** User, Provider  
**Data Created:** Tool result, ServiceHubRequest  
**Notifications:** Request, Completion

---

## Loop 10: Ad → View → Click → Conversion

```
Ad Created
→ Ad Displayed
→ User Views
→ User Clicks
→ Landing Page
→ Conversion
→ Analytics
→ Ad Optimization
```

**Actors:** Advertiser, User  
**Data Created:** Ad, View, Click  
**Notifications:** None

---

## Summary

| Loop | Key Actors | Key Data | Engagement Driver |
|---|---|---|---|
| Property Discovery | Buyer, Seller | Inquiry, Transaction | New listings |
| Saved Search Alert | Buyer, System | Notification | New matches |
| Property Request | Buyer, Office | Request, Offer | Office competition |
| Service Dispatch | Customer, Provider | Request, Rating | Provider quality |
| Auction | Bidder, Office | Bid, Win | Competitive bidding |
| Marketer | Marketer, Advertiser | Contract, Commission | Deal flow |
| Office | Office, Buyers | Property, Lead | Property inventory |
| Verification | User, Admin | Verification | Trust building |
| Free Tool | User, Provider | Tool, Request | Tool utility |
| Advertising | Advertiser, User | Ad, Click | Ad reach |

---

**Status:** COMPLETE  
**Application Source Files Modified:** ZERO
