# 05_V1_DATABASE_PRODUCT_MEANING.md
# V1 Database Semantic Archaeology

**Audit Date:** 2026-08-19  
**Mode:** READ-ONLY — V1 Source Archaeology

---

## Overview

V1 used SQLite via Prisma ORM with 48 models. Each table represents a product idea or business capability.

---

## 1. User & Identity Tables

### 1.1 `users` — Core Identity Model

**WHY DID THIS TABLE EXIST?**
To represent every participant in the AkarProMax ecosystem — buyers, sellers, agents, offices, artisans, admins, moderators.

**What user idea does it represent?**
One identity can be a buyer, seller, professional, office member, company member, or admin — depending on context.

**What relationship does it enable?**
- User → Properties (1:N)
- User → Offices (1:N)
- User → Blog Posts (1:N)
- User → Property Requests (1:N)
- User → Service Profiles (1:N)
- User → Subscriptions (1:N)
- User → Moderators (1:N)
- User → Auction Bids (1:N)
- User → Notifications (1:N)
- User → Portfolio (1:N)

**What workflow depends on it?**
Registration → Login → Profile → Activity → Verification → Reputation

**Important Fields:**
- `role` (user/moderator/admin) — Platform role
- `status` (active/banned) — Account status
- `userType` (INDIVIDUAL/ARTISAN/REALTOR/OFFICE/COMPANY) — User type
- `isVerified` — Identity verification
- `tokenBalance` — Virtual currency
- `isBannedFromAuctions` — Auction ban
- `interestedCities` — Geo notification preferences
- `licenseNumber` — Professional license
- `identityImages` — KYC documents

**Hidden Business Rule:**
Users can have multiple identities (personal, professional, office, company) but one login.

**Security Sensitivity:** HIGH — Contains password hash, IP, ban status

---

### 1.2 `identity_verifications` — KYC Workflow

**WHY DID THIS TABLE EXIST?**
To verify user identities before allowing certain activities (property listing, office creation).

**What user idea does it represent?**
Trust through verification — users submit national ID for admin review.

**What workflow depends on it?**
User submits ID → Admin reviews → Approve/Reject → Badge applied

**Important Fields:**
- `status` (pending/approved/rejected) — Workflow state
- `reviewedBy` — Admin who reviewed
- `rejectReason` — Rejection reason

**Hidden Business Rule:**
Only verified users can create offices or run auctions.

---

### 1.3 `moderators` — RBAC Assignment

**WHY DID THIS TABLE EXIST?**
To assign roles to users for content moderation.

**What user idea does it represent?**
Moderators are trusted users who can approve/reject content.

**What workflow depends on it?**
Admin assigns role → Moderator gains capabilities → Content moderation

**Important Fields:**
- `userId` — User reference
- `roleId` — Role reference

**Hidden Business Rule:**
One user can only have one moderator role (unique constraint).

---

### 1.4 `roles` — Permission Definitions

**WHY DID THIS TABLE EXIST?**
To define named roles with JSON-encoded permissions.

**What user idea does it represent?**
RBAC system — roles contain permissions that control access.

**What workflow depends on it?**
Admin creates role → Assigns permissions → Assigns to moderator

**Important Fields:**
- `name` — Role name
- `permissions` — JSON object with permission keys

**Hidden Business Rule:**
Permissions are stored as JSON, not normalized — allows flexible permission definitions.

---

## 2. Property Tables

### 2.1 `properties` — Core Real Estate Listing

**WHY DID THIS TABLE EXIST?**
To represent properties for sale, rent, or investment — the central entity of the platform.

**What user idea does it represent?**
A property is a real estate listing that can be searched, viewed, favorited, and transacted.

**What relationship does it enable?**
- Property → User (N:1)
- Property → Office (N:1 optional)
- Property → Auctions (1:N)
- Property → Marketing Contracts (1:N)
- Property → Suspicious Relists (1:N)

**What workflow depends on it?**
User creates → Submits for review → Admin approves → Listed → Inquiries → Sale

**Important Fields:**
- `title/titleAr` — Bilingual titles
- `type` (sale/rent) — Listing type
- `category` (apartment/villa/land) — Property type
- `price/currency` — Financial
- `city/governorate/country/countryCode` — Geo
- `lat/lng` — Coordinates
- `images` — JSON array of URLs
- `status` (active/sold/rented/inactive) — Workflow state
- `isFeatured` — Featured flag
- `views` — View counter
- `marketingEnabled` — Marketing flag
- `officeId` — Office association

**Hidden Business Rule:**
Properties can be linked to offices for auction eligibility. Marketing-enabled properties can have marketing contracts.

---

### 2.2 `property_requests` — Buyer Wanted Ads

**WHY DID THIS TABLE EXIST?**
To allow buyers to post what they're looking for, so sellers/agents can respond.

**What user idea does it represent?**
Reverse marketplace — buyers post requirements, sellers offer matches.

**What workflow depends on it?**
Buyer creates request → Offices see request → Offices submit offers → Buyer compares → Accepts/Rejects

**Important Fields:**
- `propertyType` — Desired property type
- `city/neighborhood` — Desired location
- `minPrice/maxPrice` — Budget range
- `status` (open/closed/matched) — Workflow state

**Hidden Business Rule:**
Requests can be matched with properties, creating a lead for the office.

---

### 2.3 `property_offers` — Office Responses to Requests

**WHY DID THIS TABLE EXIST?**
To allow offices/agents to respond to buyer requests with specific properties.

**What user idea does it represent?**
Competitive bidding on buyer requests — multiple offices can offer.

**What workflow depends on it?**
Office sees request → Submits offer → Buyer reviews → Accepts/Rejects

**Important Fields:**
- `propertyRequestId` — Request reference
- `message` — Offer message
- `price` — Proposed price
- `status` (pending/accepted/rejected) — Workflow state

**Hidden Business Rule:**
Multiple offices can submit offers on the same request — buyer compares.

---

## 3. Auction Tables

### 3.1 `auctions` — Property Auction Events

**WHY DID THIS TABLE EXIST?**
To run timed competitive bidding events for properties.

**What user idea does it represent?**
Fair, transparent property sales through competitive bidding.

**What workflow depends on it?**
Office creates auction → Users bid → Time expires → Winner declared → Proof submitted

**Important Fields:**
- `propertyId` — Property reference
- `officeId` — Office reference
- `startPrice/minBidIncrement` — Financial
- `currentPrice` — Current highest bid
- `endDate` — Auction end time
- `status` (PENDING/ACTIVE/COMPLETED/CANCELLED) — Workflow state
- `type` (AUCTION/FIXED) — Auction type
- `isBinding` — Legal binding
- `winnerId/winningPrice` — Winner
- `version` — Optimistic locking

**Hidden Business Rule:**
Auctions are tied to offices — only verified offices can create auctions. Anti-sniping via auto-extend.

---

### 3.2 `auction_bids` — Individual Bids

**WHY DID THIS TABLE EXIST?**
To track every bid placed in an auction.

**What user idea does it represent?**
Transparent bidding history — all bids are recorded.

**Important Fields:**
- `amount` — Bid amount
- `isAutoBid` — Auto-bidding flag
- `maxAutoBid` — Auto-bid ceiling
- `ipAddress` — Audit trail

**Hidden Business Rule:**
Auto-bidding allows users to set a maximum and let the system bid incrementally.

---

### 3.3 `suspicious_relsits` — Anti-Fraud Detection

**WHY DID THIS TABLE EXIST?**
To detect when a previously sold property is relisted at a suspiciously low price.

**What user idea does it represent?**
Fraud prevention — protect against auction manipulation.

**What workflow depends on it?**
System detects suspicious relist → Creates record → Admin reviews → Office submits proof → Resolved

**Important Fields:**
- `oldAuctionId/newAuctionId` — Auction references
- `previousSoldPrice/newStartPrice` — Price comparison
- `priceDropPercent` — Calculated drop
- `status` (PENDING_REVIEW/RESOLVED/BLOCKED) — Workflow state
- `proofDeadline` — Deadline for proof submission

**Hidden Business Rule:**
Automatic detection — system flags when property is re-auctioned within 30 days of sale.

---

### 3.4 `sale_proofs` — Legitimacy Evidence

**WHY DID THIS TABLE EXIST?**
To prove that a suspicious relist was actually a legitimate sale.

**What user idea does it represent?**
Due process — offices can prove innocence with documentation.

**Important Fields:**
- `contractUrl` — Sale contract
- `paymentReceiptUrl` — Payment receipt
- `buyerSignatureUrl` — Buyer signature

**Hidden Business Rule:**
Multiple proof types required — contract, payment, signature.

---

### 3.5 `office_rating_snapshots` — Reputation Scoring

**WHY DID THIS TABLE EXIST?**
To calculate multi-factor reputation scores for offices.

**What user idea does it represent?**
Trust through transparency — offices are scored on multiple dimensions.

**Important Fields:**
- `overallScore` — Composite score
- `badge` (Bronze/Silver/Gold) — Visual badge
- `completionRate` — Transaction completion
- `responseSpeed` — Response time
- `complaintScore` — Complaint handling
- `manipulationScore` — Fraud detection
- `clientRating` — Client reviews

**Hidden Business Rule:**
Scores are recalculated periodically (cron job every hour). Badge changes based on score thresholds.

---

## 4. Service Tables

### 4.1 `service_hub_profiles` — Provider Profiles

**WHY DID THIS TABLE EXIST?**
To create enhanced profiles for skilled service providers.

**What user idea does it represent?**
Professional identity for artisans, engineers, photographers.

**Important Fields:**
- `category` — Service category
- `rating` — Average rating
- `tier` (basic/premium) — Provider tier
- `isTopRated` — Top rated flag
- `specs` — JSON array of specializations
- `distanceKm` — Geo distance

**Hidden Business Rule:**
Top-rated providers get priority in search results and dispatch.

---

### 4.2 `service_hub_requests` — Service Requests

**WHY DID THIS TABLE EXIST?**
To connect service seekers with providers.

**What user idea does it represent?**
On-demand services — users request, providers respond.

**Important Fields:**
- `providerId` — Assigned provider
- `specialty` — Service type
- `status` (pending/accepted/completed) — Workflow state
- `estimatedPrice/estimatedDuration` — Estimates

**Hidden Business Rule:**
Requests can be assigned to specific providers or broadcast.

---

### 4.3 `service_hub_ratings` — Provider Ratings

**WHY DID THIS TABLE EXIST?**
To collect user feedback on completed services.

**Important Fields:**
- `score` — 1-5 rating
- `comment` — Text feedback

---

### 4.4 `service_hub_feedback` — Sentiment Analysis

**WHY DID THIS TABLE EXIST?**
To track sentiment of feedback (positive/neutral/negative).

**Important Fields:**
- `sentiment` — Sentiment classification

**Hidden Business Rule:**
Sentiment affects provider reputation score.

---

## 5. Advertising Tables

### 5.1 `ads` — Advertisement System

**WHY DID THIS TABLE EXIST?**
To display targeted advertisements across the platform.

**What user idea does it represent?**
Revenue through advertising — businesses pay to reach users.

**What workflow depends on it?**
Advertiser requests → Admin approves → Ad displayed → Views/Clicks tracked → Analytics

**Important Fields:**
- `position` — Banner placement slot
- `page` — Target page
- `targetCountry/targetRegion/targetGovernorate/targetCity/targetVillage` — Geo targeting
- `isGlobal` — Worldwide flag
- `language` — Language filter
- `sponsorTier` (standard/bronze/silver/gold/platinum) — Sponsor rank
- `maxViews/maxClicks` — Campaign limits
- `rotationSeconds` — Ad rotation
- `desktopZone` — Desktop app zone
- `clickCount/viewCount` — Analytics

**Hidden Business Rule:**
Ads are geo-targeted — country/region/city override. Rotation prevents same ad showing repeatedly. Limits cap campaign spend.

---

## 6. Content Tables

### 6.1 `blog_posts` — Blog System

**WHY DID THIS TABLE EXIST?**
To publish content marketing and SEO articles.

**Important Fields:**
- `slug` — SEO-friendly URL
- `published` — Publish status
- `country/city` — Geo tagging
- `tags` — JSON array

---

### 6.2 `suppliers` — Supplier Directory

**WHY DID THIS TABLE EXIST?**
To list building materials and home services suppliers.

**Important Fields:**
- `category` — Supplier category
- `rating` — Supplier rating

---

### 6.3 `supplier_products` — Supplier Products

**WHY DID THIS TABLE EXIST?**
To list individual products from suppliers.

---

### 6.4 `free_resources` — Downloadable Resources

**WHY DID THIS TABLE EXIST?**
To provide free downloadable resources (guides, templates).

**Important Fields:**
- `downloadCount` — Download analytics

---

## 7. Communication Tables

### 7.1 `news_ticker_items` — News Ticker

**WHY DID THIS TABLE EXIST?**
To display scrolling announcements across the platform.

**Important Fields:**
- `targetPages` — JSON array of page names
- `displayOnAllPages` — Global flag
- `sourceType` (manual/auto) — Source type

**Hidden Business Rule:**
News items can be page-targeted or global. Auto-generated from various sources.

---

### 7.2 `news_ticker_settings` — Per-Page Configuration

**WHY DID THIS TABLE EXIST?**
To configure news ticker behavior per page.

**Important Fields:**
- `maxItems` — Maximum items shown
- `refreshInterval` — Refresh rate in seconds
- `enabled` — Enable/disable

---

## 8. Financial Tables

### 8.1 `plans` — Subscription Plans

**WHY DID THIS TABLE EXIST?**
To define subscription plans with pricing and features.

**Important Fields:**
- `price/currency` — Pricing
- `duration/durationUnit` — Duration
- `features` — JSON array
- `isPopular` — Popular flag
- `targetType` — User type targeting

---

### 8.2 `user_subscriptions` — User Subscriptions

**WHY DID THIS TABLE EXIST?**
To track which plan a user is subscribed to.

**Important Fields:**
- `status` (active/expired/cancelled) — Subscription state
- `startDate/endDate` — Duration

---

### 8.3 `coupons` — Discount Coupons

**WHY DID THIS TABLE EXIST?**
To provide promotional discounts.

**Important Fields:**
- `code` — Unique code
- `discount/discountType` — Discount value/type
- `usageLimit/usedCount` — Usage tracking

---

## 9. Software Tables

### 9.1 `software_licenses` — Desktop Licenses

**WHY DID THIS TABLE EXIST?**
To manage desktop software licenses with hardware binding.

**Important Fields:**
- `key` — License key
- `status` (active/expired/revoked) — License state
- `type` (trial/subscription) — License type
- `hwid` — Hardware ID binding
- `expiresAt` — Expiration

**Hidden Business Rule:**
Licenses are HWID-bound — one license per machine. Reset requires admin.

---

### 9.2 `license_codes` — Redemption Codes

**WHY DID THIS TABLE EXIST?**
To generate pre-paid license codes for distribution.

**Important Fields:**
- `code` — Unique code
- `duration` — License duration in days
- `plan` — License plan
- `status` (active/used) — Code state

---

### 9.3 `desktop_versions` — Version Management

**WHY DID THIS TABLE EXIST?**
To manage desktop application versions and force updates.

**Important Fields:**
- `version` — Version string
- `minVersion` — Minimum required version
- `forceUpdate` — Force update flag
- `downloadUrl` — Download link

---

## 10. Moderation Tables

### 10.1 `blocked_ips` — IP Blocking

**WHY DID THIS TABLE EXIST?**
To block abusive users by IP address.

**Important Fields:**
- `ipAddress` — Blocked IP
- `reason` — Block reason

---

### 10.2 `login_attempts` — Brute Force Protection

**WHY DID THIS TABLE EXIST?**
To track login attempts for rate limiting.

**Important Fields:**
- `ipAddress/email` — Attempt tracking

---

### 10.3 `activity_logs` — Audit Trail

**WHY DID THIS TABLE EXIST?**
To log all user/system actions for auditing.

**Important Fields:**
- `action` — Action type
- `details` — Action details

---

### 10.4 `blacklists` — Entity Blacklisting

**WHY DID THIS TABLE EXIST?**
To blacklist any entity type (user, office, etc.).

**Important Fields:**
- `targetId/targetType` — Polymorphic reference
- `reason` — Blacklist reason

---

## 11. Partner Tables

### 11.1 `partners` — External Partners

**WHY DID THIS TABLE EXIST?**
To create partner accounts with independent login.

**Important Fields:**
- `email/passwordHash` — Authentication
- `company` — Company name

---

## 12. Settings Tables

### 12.1 `settings` — Key-Value Configuration

**WHY DID THIS TABLE EXIST?**
To store platform-wide configuration as key-value pairs.

---

## Table Relationship Summary

| Domain | Tables | Key Relationships |
|---|---|---|
| **Identity** | users, identity_verifications, moderators, roles, blocked_ips, login_attempts | User → Verification, User → Moderator → Role |
| **Properties** | properties, property_requests, property_offers | Property → User, Request → Offers |
| **Auctions** | auctions, auction_bids, auction_participants, auction_settings, auction_logs, auction_reports, suspicious_relsits, sale_proofs, office_rating_snapshots, auction_price_history, early_warnings, blacklists | Auction → Property → Office, Bid → User |
| **Services** | service_hub_profiles, service_hub_requests, service_hub_ratings, service_hub_feedback | Profile → User, Request → Provider |
| **Advertising** | ads | Standalone with geo-targeting |
| **Content** | blog_posts, suppliers, supplier_products, free_resources, news_ticker_items, news_ticker_settings | Blog → Author, Supplier → Products |
| **Financial** | plans, user_subscriptions, coupons | Plan → Subscription → User |
| **Software** | software_licenses, license_codes, desktop_versions | License → User |
| **Marketing** | marketer_profiles, marketer_ranks, marketing_contracts, marketing_proposals, commissions, marketer_settings, code_of_conducts, code_of_conduct_acceptances | Marketer → Rank, Contract → Property → Marketer |
| **Communication** | notifications, push_subscriptions, email_logs | Notification → User |
| **Settings** | settings | Standalone key-value |

---

**Status:** COMPLETE  
**Application Source Files Modified:** ZERO
