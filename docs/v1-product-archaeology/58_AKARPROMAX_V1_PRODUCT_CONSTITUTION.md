# 58_AKARPROMAX_V1_PRODUCT_CONSTITUTION.md
# AkarProMax V1 Product Constitution

**Audit Date:** 2026-08-19  
**Mode:** READ-ONLY — V1 Source Archaeology

---

## Vision

AkarProMax V1 was designed as a comprehensive real estate marketplace and professional services platform for the Arab world, with a focus on Oman. The platform aimed to connect buyers, sellers, agents, offices, companies, artisans, and service providers in a trusted, verified ecosystem.

---

## Actors

| Actor | Description |
|---|---|
| Guest | Unauthenticated browser |
| Individual | Regular user (buyer/seeker) |
| Professional | Real estate agent, craftsman |
| Office | Real estate brokerage |
| Company | Corporate entity |
| Marketer | Property marketing agent |
| Partner | External business partner |
| Advertiser | Ad campaign creator |
| Supplier | Building materials provider |
| Artisan | Skilled service provider |
| Moderator | Content moderator |
| Admin | Platform administrator |

---

## Core Domains

1. **Identity & Access** — Registration, login, verification, roles, permissions
2. **Property** — Listings, search, requests, offers, inquiries, auctions
3. **Services** — Directory, dispatch, tenders, ratings
4. **Organizations** — Offices, companies, membership
5. **Marketing** — Marketers, contracts, commissions
6. **Advertising** — Campaigns, targeting, analytics
7. **Communication** — Chat, notifications, news ticker
8. **Content** — Blog, suppliers, software, knowledge
9. **Financial** — Subscriptions, payments, coupons, tokens, licenses
10. **Engineering** — BOQ, CAD, 3D, specialized engines
11. **Desktop** — License, sync, offline

---

## Shared Platform Services

| Service | Purpose |
|---|---|
| Authentication | JWT-based login |
| Authorization | Role-based access control |
| Geo | Location hierarchy, targeting |
| Storage | File uploads, images |
| Notifications | In-app, email, push |
| Analytics | Event tracking |
| Audit | Activity logging |

---

## Trust Model

| Layer | Mechanism |
|---|---|
| Identity | KYC verification |
| Professional | License verification |
| Office | Office verification |
| Reputation | Ratings, reviews, scores |
| Fraud Detection | Suspicious relists, early warnings |
| Moderation | Content approval, user banning |

---

## Identity Model

**Core Principle:** One identity, multiple capabilities.

A user has:
- One login (email/password)
- Multiple profiles (personal, professional, office, company)
- Multiple memberships (offices, companies)
- Multiple roles (user, moderator, admin)
- Multiple verifications (identity, professional, office)
- Multiple reputations (user, office, provider, marketer)

---

## Reputation Model

| Domain | Mechanism |
|---|---|
| User | Verification + experience |
| Office | Multi-factor rating snapshots |
| Provider | Rating + tier + top-rated |
| Marketer | Rank + deals + commission |
| Bidder | Bid history + fraud flags |

---

## Admin Model

| Level | Capabilities |
|---|---|
| Moderator | Content moderation, verification |
| Admin | User management, settings, analytics |
| Super Admin | Full control |

---

## Messaging Model

| Feature | Implementation |
|---|---|
| Private chat | Socket.IO rooms |
| Group chat | Socket.IO rooms |
| Encryption | AES-256-GCM (server-side) |
| Moderation | Logged access |
| Notifications | In-app, push, desktop |

---

## Advertising Model

| Feature | Implementation |
|---|---|
| Campaigns | CRUD with geo-targeting |
| Sponsors | Tiered (Platinum/Gold/Silver/Standard) |
| Rotation | Configurable seconds |
| Limits | Max views/clicks |
| Analytics | View/click tracking |

---

## Geo Model

| Feature | Implementation |
|---|---|
| Detection | GPS, IP, timezone, language |
| Hierarchy | Country → Region → City → Village |
| Targeting | Properties, ads, notifications |
| Maps | Leaflet integration |

---

## Property Model

| Side | Features |
|---|---|
| Supply | CRUD, images, video, map |
| Demand | Search, filters, favorites, inquiries |
| Broker | Office properties, requests, offers |
| Admin | Moderation, analytics, featured |
| Financial | Mortgage calculator, investment radar |
| Marketing | Marketing-enabled, contracts, commissions |
| Auctions | Open/fixed auctions, bidding |

---

## Services Model

| Mode | Purpose |
|---|---|
| Directory | Static service listings |
| Dispatch | Real-time service requests |
| Tender | Competitive bidding |

---

## Office Model

| Feature | Implementation |
|---|---|
| Profile | Name, city, contact, license |
| Properties | Office properties |
| Auctions | Create/manage auctions |
| Requests | View/offer on requests |
| Leads | Inquiries, elite leads |
| Members | Staff management |
| Reputation | Rating snapshots, badges |

---

## Engineering Model

| Category | Engines |
|---|---|
| Core | BOQ, CAD, DXF, 3D, MEP, Structural |
| Specialized | Mosque, School, Mall, Industrial, Medical, Academic |
| Tools | Land Analysis, FindMyLand, PDF, Contract |
| Project | Project management, verification |

---

## Knowledge/Content Model

| Type | Purpose |
|---|---|
| Blog | Content marketing |
| Suppliers | Building materials directory |
| Software | Desktop software with licensing |
| Free Resources | Downloadable resources |

---

## Commercial Model

| Stream | Model |
|---|---|
| Advertising | Placement fees, sponsor tiers |
| Subscriptions | Monthly/yearly plans |
| Licenses | Trial/subscription/perpetual |
| Commissions | Percentage of sales |
| Coupons | Promotional discounts |
| Tokens | Virtual currency |

---

## Engagement Loops

1. Property Discovery → Inquiry → Transaction
2. Saved Search → Alert → Property → Transaction
3. Property Request → Office Offer → Transaction
4. Service Request → Dispatch → Job → Review
5. Auction → Bid → Win → Proof
6. Marketer → Proposal → Contract → Commission
7. Office → Properties → Leads → Reputation
8. Verification → Trust → Access
9. Free Tool → Professional → Service
10. Ad → View → Click → Conversion

---

## Safety Model

| Layer | Mechanism |
|---|---|
| Verification | Identity, professional, office, marketer |
| Banning | User, auction, office, IP |
| Fraud Detection | Suspicious relists, early warnings |
| Reputation | Ratings, reviews, scores |
| Moderation | Content, chat, reports |
| Audit | Activity logs, login attempts, chat logs |
| Legal | Code of conduct, acceptance tracking |

---

## Summary

AkarProMax V1 was a comprehensive platform designed to:
1. Connect real estate stakeholders
2. Provide trusted, verified interactions
3. Enable multiple revenue streams
4. Support the Arab world market
5. Integrate desktop and web experiences

The platform's strength was its breadth of features and integration across domains. Its complexity was both its strength and challenge.

---

**Status:** COMPLETE  
**Application Source Files Modified:** ZERO
