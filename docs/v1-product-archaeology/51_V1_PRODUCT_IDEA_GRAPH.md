# 51_V1_PRODUCT_IDEA_GRAPH.md
# V1 Product Idea Graph

**Audit Date:** 2026-08-19  
**Mode:** READ-ONLY — V1 Source Archaeology

---

## Overview

This document represents V1 as interconnected product ideas. Each idea contains multiple features that work together.

---

## 1. Identity & Access

```
Identity
├── Registration
│   ├── Individual
│   ├── Professional
│   └── Company
├── Login
│   ├── Email/Password
│   └── JWT (30-day)
├── Verification
│   ├── Identity (KYC)
│   ├── Professional (License)
│   ├── Office
│   └── Marketer
├── Roles
│   ├── User
│   ├── Moderator
│   └── Admin
└── Permissions
    ├── JSON-based
    └── Role assignment
```

---

## 2. Property Ecosystem

```
Property
├── Listing
│   ├── Create
│   ├── Edit
│   ├── Delete
│   └── Images/Video
├── Search
│   ├── Text search
│   ├── Filters (category, type, city, price, area)
│   ├── Sort
│   └── Map view
├── Discovery
│   ├── Favorites
│   ├── Saved Searches
│   └── Alerts
├── Request
│   ├── Buyer creates
│   ├── Office sees
│   ├── Office offers
│   └── Buyer accepts/rejects
├── Inquiry
│   ├── Contact form
│   ├── Elite leads
│   └── Viewing booking
├── Marketing
│   ├── Marketing-enabled
│   ├── Contracts
│   ├── Proposals
│   └── Commissions
├── Auction
│   ├── Open auction
│   ├── Fixed price
│   ├── Bidding
│   ├── Auto-bid
│   └── Fraud detection
└── Moderation
    ├── Approve/reject
    ├── Featured toggle
    └── Reports
```

---

## 3. Services

```
Services
├── Directory
│   ├── Listings
│   ├── Categories
│   ├── Items/Pricing
│   └── Contact
├── Dispatch
│   ├── Provider profiles
│   ├── Service requests
│   ├── Accept/decline
│   ├── Job completion
│   ├── Ratings
│   └── Feedback
└── Tenders
    ├── Create tender
    ├── Bid submission
    ├── Award
    └── Activity logs
```

---

## 4. Real Estate Offices

```
Office
├── Profile
│   ├── Name, city, contact
│   ├── License
│   ├── Verification
│   └── Rating
├── Properties
│   ├── Office properties
│   ├── Property management
│   └── Featured toggle
├── Auctions
│   ├── Create auction
│   ├── Manage bids
│   ├── Settings
│   └── Fraud detection
├── Requests
│   ├── View buyer requests
│   ├── Submit offers
│   └── Track status
├── Leads
│   ├── Inquiries
│   ├── Elite leads
│   └── Campaign leads
├── Members
│   ├── Staff management
│   ├── Roles
│   └── Permissions
└── Reputation
    ├── Rating snapshots
    ├── Badge (Bronze/Silver/Gold)
    └── Multi-factor scoring
```

---

## 5. Marketing Ecosystem

```
Marketing
├── Marketer
│   ├── Profile
│   ├── Rank
│   ├── License
│   └── Approval
├── Contracts
│   ├── Create
│   ├── Exclusivity
│   ├── Auto-renew
│   └── Termination
├── Proposals
│   ├── Submit
│   ├── Accept/reject
│   └── Withdraw
├── Commissions
│   ├── Track
│   ├── Pay
│   └── Cancel
└── Code of Conduct
    ├── Version management
    └── Acceptance tracking
```

---

## 6. Advertising

```
Advertising
├── Campaigns
│   ├── Create
│   ├── Update
│   ├── Delete
│   └── Activate/deactivate
├── Targeting
│   ├── Country
│   ├── Region
│   ├── City
│   ├── Village
│   ├── Language
│   └── Page
├── Delivery
│   ├── Rotation
│   ├── Max views/clicks
│   ├── Date range
│   └── Priority
├── Sponsors
│   ├── Platinum
│   ├── Gold
│   ├── Silver
│   └── Standard
├── Analytics
│   ├── Views
│   ├── Clicks
│   └── CTR
└── Desktop
    ├── Desktop zones
    └── Offline sync
```

---

## 7. Communication

```
Communication
├── Chat
│   ├── Private conversations
│   ├── Group conversations
│   ├── Text messages
│   ├── Image messages
│   ├── Voice messages
│   ├── File messages
│   ├── Edit/delete
│   ├── Typing indicators
│   ├── Online/offline
│   ├── Read receipts
│   ├── Block/unblock
│   └── Moderation
├── Notifications
│   ├── In-app
│   ├── Email
│   ├── Push
│   └── Desktop
└── News Ticker
    ├── Items
    ├── Page targeting
    └── Auto-generation
```

---

## 8. Content

```
Content
├── Blog
│   ├── Posts
│   ├── Categories
│   ├── Slugs
│   └── Bilingual
├── Suppliers
│   ├── Directory
│   ├── Products
│   └── Ratings
├── Software
│   ├── Directory
│   ├── Licensing
│   └── Downloads
├── Free Resources
│   ├── Downloads
│   └── Categories
└── Knowledge
    ├── Books
    ├── Software
    └── Resources
```

---

## 9. Financial

```
Financial
├── Subscriptions
│   ├── Plans
│   ├── Pricing
│   ├── Features
│   └── Renewal
├── Payments
│   ├── Thawani
│   ├── Tap
│   └── Methods
├── Coupons
│   ├── Codes
│   ├── Discounts
│   └── Usage limits
├── Tokens
│   ├── Balance
│   ├── Earn
│   └── Spend
└── Licenses
    ├── Trial
    ├── Subscription
    └── Perpetual
```

---

## 10. Trust & Safety

```
Trust & Safety
├── Verification
│   ├── Identity (KYC)
│   ├── Professional
│   ├── Office
│   └── Marketer
├── Reputation
│   ├── Office ratings
│   ├── Provider ratings
│   ├── Marketer ranks
│   └── Trust scores
├── Fraud Detection
│   ├── Suspicious relists
│   ├── Early warnings
│   └── Sale proofs
├── Moderation
│   ├── Content approval
│   ├── User banning
│   ├── IP blocking
│   └── Chat moderation
└── Audit
    ├── Activity logs
    ├── Login attempts
    └── Chat logs
```

---

## 11. Engineering

```
Engineering
├── Core Engines
│   ├── BOQ Engine
│   ├── CAD Parser
│   ├── DXF Writer
│   ├── 3D Visualizer
│   ├── MEP Engine
│   └── Structural Engine
├── Specialized Engines
│   ├── Mosque
│   ├── School
│   ├── Mall
│   ├── Industrial
│   ├── Medical
│   └── Academic
├── Tools
│   ├── Land Analysis
│   ├── FindMyLand
│   ├── PDF Tools
│   └── Contract Generator
└── Project Management
    ├── Project code
    ├── Owner
    ├── Calculations
    └── Verification
```

---

## 12. Desktop Integration

```
Desktop
├── License
│   ├── Validation
│   ├── HWID binding
│   ├── Reset
│   └── Trial
├── Sync
│   ├── Properties
│   ├── Ads
│   ├── News
│   └── Batch
├── Version
│   ├── Check
│   ├── Force update
│   └── Release notes
└── Offline
    ├── Local storage
    ├── Queue
    └── Sync on reconnect
```

---

## 13. Geo Intelligence

```
Geo
├── Detection
│   ├── GPS
│   ├── IP
│   ├── Timezone
│   └── Language
├── Hierarchy
│   ├── Country
│   ├── Region/Governorate
│   ├── City
│   ├── Village
│   └── District
├── Targeting
│   ├── Properties
│   ├── Ads
│   ├── Notifications
│   └── Services
└── Maps
    ├── Leaflet
    ├── Coordinates
    └── Distance
```

---

**Status:** COMPLETE  
**Application Source Files Modified:** ZERO
