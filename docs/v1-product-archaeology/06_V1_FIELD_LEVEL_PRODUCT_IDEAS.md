# 06_V1_FIELD_LEVEL_PRODUCT_IDEAS.md
# V1 Field-Level Product Ideas Discovery

**Audit Date:** 2026-08-19  
**Mode:** READ-ONLY — V1 Source Archaeology

---

## Overview

This document discovers hidden product ideas by examining nontrivial fields in the V1 database schema. Each field reveals a business concept or user experience that the product owner designed.

---

## 1. User Fields

### 1.1 `tokenBalance` (users table)

**Field:** `token_balance`  
**Type:** Integer, default 0  
**Where Read:** Profile display, transaction history  
**Where Written:** Token purchases, rewards, transactions  
**Why It Exists:** Virtual currency system — users can earn or purchase tokens for premium features.  
**Business Effect:** Enables microtransactions without payment gateway per transaction.  
**UI Effect:** Token balance display, purchase prompts  
**Permission Effect:** Token balance gates premium features  
**Related Feature:** Token wallet, token transactions

---

### 1.2 `isBannedFromAuctions` (users table)

**Field:** `is_banned_from_auctions`  
**Type:** Boolean, default false  
**Where Read:** Auction bid submission, auction participation  
**Where Written:** Admin auction management, fraud detection  
**Why It Exists:** Granular ban — user can be banned from auctions without full account ban.  
**Business Effect:** Prevents fraudulent bidders from participating  
**UI Effect:** Auction features hidden/disabled  
**Permission Effect:** Auction bid blocked  
**Related Feature:** Auction moderation, fraud detection

---

### 1.3 `interestedCities` (users table)

**Field:** `interested_cities`  
**Type:** JSON array  
**Where Read:** Notification matching, saved search alerts  
**Where Written:** User profile settings  
**Why It Exists:** City-based notification preferences — users receive alerts when properties are listed in their cities.  
**Business Effect:** Targeted notifications increase engagement  
**UI Effect:** City preference selector  
**Permission Effect:** None  
**Related Feature:** City-matched notifications, saved search alerts

---

### 1.4 `identityImages` (users table)

**Field:** `identity_images`  
**Type:** JSON array  
**Where Read:** Verification review, profile display  
**Where Written:** Registration, verification submission  
**Why It Exists:** Multiple identity documents — users can upload front/back of ID, passport, etc.  
**Business Effect:** Enhanced KYC verification  
**UI Effect:** Multi-image upload  
**Permission Effect:** Verification status  
**Related Feature:** Identity verification

---

### 1.5 `isOfficial` (users table)

**Field:** `is_official`  
**Type:** Boolean, default false  
**Where Read:** Profile display, search results  
**Where Written:** Admin verification  
**Why It Exists:** Official account badge — distinguishes verified professionals from regular users.  
**Business Effect:** Trust signal for buyers  
**UI Effect:** Official badge display  
**Permission Effect:** Enhanced visibility  
**Related Feature:** Verification system

---

### 1.6 `licenseNumber` (users table)

**Field:** `license_number`  
**Type:** String  
**Where Read:** Profile display, verification  
**Where Written:** Profile update, professional registration  
**Why It Exists:** Professional license tracking — real estate agents, engineers, etc.  
**Business Effect:** Verification of professional credentials  
**UI Effect:** License display on profile  
**Permission Effect:** Professional verification  
**Related Feature:** Professional verification

---

### 1.7 `craftType` (users table)

**Field:** `craft_type`  
**Type:** String  
**Where Read:** Service matching, profile display  
**Where Written:** Artisan registration  
**Why It Exists:** Artisan specialization — identifies craft type (plumber, electrician, etc.)  
**Business Effect:** Enables targeted service matching  
**UI Effect:** Craft type badge  
**Permission Effect:** Service category access  
**Related Feature:** Service hub, artisan dashboard

---

### 1.8 `experienceYears` (users table)

**Field:** `experience_years`  
**Type:** Integer  
**Where Read:** Profile display, ranking, matching  
**Where Written:** Profile update  
**Why It Exists:** Experience-based ranking — more experience = higher trust  
**Business Effect:** Affects ranking and visibility  
**UI Effect:** Experience badge  
**Permission Effect:** None directly  
**Related Feature:** Reputation system, marketer ranks

---

### 1.9 `geoLink` (users table)

**Field:** `geo_link`  
**Type:** String  
**Where Read:** Profile display, contact  
**Where Written:** Profile update  
**Why It Exists:** Google Maps link for user location  
**Business Effect:** Enables location-based discovery  
**UI Effect:** Map link on profile  
**Permission Effect:** None  
**Related Feature:** Geo features, map integration

---

### 1.10 `agreedToCharter` (users table)

**Field:** `agreed_to_charter`  
**Type:** DateTime  
**Where Read:** Registration, compliance  
**Where Written:** Charter acceptance  
**Why It Exists:** Legal compliance — tracks when user agreed to platform charter  
**Business Effect:** Legal protection  
**UI Effect:** Charter acceptance prompt  
**Permission Effect:** Required for certain actions  
**Related Feature:** Code of conduct, legal compliance

---

## 2. Property Fields

### 2.1 `marketingEnabled` (properties table)

**Field:** `marketing_enabled`  
**Type:** Boolean, default false  
**Where Read:** Marketing contract creation, property display  
**Where Written:** Property update, marketing toggle  
**Why It Exists:** Opt-in marketing — property owner chooses if property can be marketed by agents.  
**Business Effect:** Enables marketer ecosystem  
**UI Effect:** Marketing toggle on property  
**Permission Effect:** Marketer access  
**Related Feature:** Marketing contracts, marketer proposals

---

### 2.2 `marketingStartDate/marketingEndDate` (properties table)

**Field:** `marketing_start_date/marketing_end_date`  
**Type:** DateTime  
**Where Read:** Marketing contract validation  
**Where Written:** Marketing settings  
**Why It Exists:** Time-limited marketing — property marketing has start/end dates.  
**Business Effect:** Prevents stale marketing contracts  
**UI Effect:** Date range selector  
**Permission Effect:** Marketing window  
**Related Feature:** Marketing contracts

---

### 2.3 `marketingNotesAr/marketingNotesEn` (properties table)

**Field:** `marketing_notes_ar/marketing_notes_en`  
**Type:** String  
**Where Read:** Marketer dashboard  
**Where Written:** Property update  
**Why It Exists:** Bilingual marketing instructions — owner provides notes for marketers.  
**Business Effect:** Better marketing execution  
**UI Effect:** Notes editor  
**Permission Effect:** Marketer visibility  
**Related Feature:** Marketing contracts

---

### 2.4 `facade` (properties table)

**Field:** `facade`  
**Type:** String  
**Where Read:** Property display, search filters  
**Where Written:** Property creation  
**Why It Exists:** Building orientation — north/south/east/west facing.  
**Business Effect:** Important for property valuation  
**UI Effect:** Facade badge  
**Permission Effect:** None  
**Related Feature:** Property search

---

### 2.5 `propertyAge` (properties table)

**Field:** `property_age`  
**Type:** String  
**Where Read:** Property display  
**Where Written:** Property creation  
**Why It Exists:** Building age — new/old/renovated  
**Business Effect:** Affects property value  
**UI Effect:** Age badge  
**Permission Effect:** None  
**Related Feature:** Property valuation

---

### 2.6 `videoUrl` (properties table)

**Field:** `video_url`  
**Type:** String  
**Where Read:** Property detail page  
**Where Written:** Property creation  
**Why It Exists:** Video tours — properties can have video walkthroughs.  
**Business Effect:** Better property presentation  
**UI Effect:** Video player  
**Permission Effect:** None  
**Related Feature:** Property media

---

## 3. Auction Fields

### 3.1 `minBidIncrement` (auctions table)

**Field:** `min_bid_increment`  
**Type:** Float, default 1000  
**Where Read:** Bid validation  
**Where Written:** Auction creation  
**Why It Exists:** Minimum bid increase — prevents tiny incremental bids.  
**Business Effect:** Ensures meaningful bidding  
**UI Effect:** Bid validation  
**Permission Effect:** None  
**Related Feature:** Auction bidding

---

### 3.2 `isBinding` (auctions table)

**Field:** `is_binding`  
**Type:** Boolean, default true  
**Where Read:** Winner confirmation, legal  
**Where Written:** Auction creation  
**Why It Exists:** Legal binding — winning bid is legally binding.  
**Business Effect:** Legal protection for seller  
**UI Effect:** Binding notice  
**Permission Effect:** Winner obligation  
**Related Feature:** Auction legal

---

### 3.3 `version` (auctions table)

**Field:** `version`  
**Type:** Integer, default 0  
**Where Read:** Bid submission  
**Where Written:** Every bid  
**Why It Exists:** Optimistic locking — prevents concurrent bid conflicts.  
**Business Effect:** Data integrity  
**UI Effect:** None (backend)  
**Permission Effect:** None  
**Related Feature:** Auction concurrency

---

### 3.4 `maxAutoBid` (auction_bids table)

**Field:** `max_auto_bid`  
**Type:** Float  
**Where Read:** Auto-bid logic  
**Where Written:** Bid submission  
**Why It Exists:** Auto-bidding ceiling — system bids incrementally up to this max.  
**Business Effect:** Convenient bidding  
**UI Effect:** Auto-bid toggle  
**Permission Effect:** None  
**Related Feature:** Auto-bid system

---

### 3.5 `priceDropPercent` (suspicious_relsits table)

**Field:** `price_drop_percent`  
**Type:** Float  
**Where Read:** Fraud detection, admin review  
**Where Written:** Automatic calculation  
**Why It Exists:** Quantifies suspicious price drop — higher % = more suspicious.  
**Business Effect:** Fraud scoring  
**UI Effect:** Risk indicator  
**Permission Effect:** Admin review trigger  
**Related Feature:** Fraud detection

---

### 3.6 `proofDeadline` (suspicious_relsits table)

**Field:** `proof_deadline`  
**Type:** DateTime  
**Where Read:** Deadline enforcement  
**Where Written:** Automatic calculation  
**Why It Exists:** Time limit for proof submission — office must prove legitimacy within deadline.  
**Business Effect:** Prevents delayed responses  
**UI Effect:** Countdown timer  
**Permission Effect:** Auto-block if missed  
**Related Feature:** Fraud enforcement

---

## 4. Office Fields

### 4.1 `canCreateAuctions` (offices table)

**Field:** `can_create_auctions`  
**Type:** Boolean, default false  
**Where Read:** Auction creation  
**Where Written:** Admin approval  
**Why It Exists:** Auction permission — only approved offices can create auctions.  
**Business Effect:** Quality control  
**UI Effect:** Auction creation enabled/disabled  
**Permission Effect:** Auction access  
**Related Feature:** Office verification

---

### 4.2 `isAuctionsBanned` (offices table)

**Field:** `is_auctions_banned`  
**Type:** Boolean, default false  
**Where Read:** Auction creation, auction display  
**Where Written:** Admin moderation  
**Why It Exists:** Office-level auction ban — bans office from auctions without deleting office.  
**Business Effect:** Granular moderation  
**UI Effect:** Auction features disabled  
**Permission Effect:** Auction access revoked  
**Related Feature:** Office moderation

---

### 4.3 `propertyCount` (offices table)

**Field:** `property_count`  
**Type:** Integer, default 0  
**Where Read:** Office listing, office profile  
**Where Written:** Property creation/deletion  
**Why It Exists:** Denormalized counter — avoids counting properties every time.  
**Business Effect:** Performance optimization  
**UI Effect:** Property count display  
**Permission Effect:** None  
**Related Feature:** Office profile

---

## 5. Ad Fields

### 5.1 `sponsorTier` (ads table)

**Field:** `sponsor_tier`  
**Type:** String, default "standard"  
**Where Read:** Ad display, ad sorting  
**Where Written:** Ad creation  
**Why It Exists:** Sponsor ranking — higher tier = better placement.  
**Business Effect:** Premium pricing for better placement  
**UI Effect:** Visual distinction  
**Permission Effect:** None  
**Related Feature:** Sponsor system

---

### 5.2 `rotationSeconds` (ads table)

**Field:** `rotation_seconds`  
**Type:** Integer, default 5  
**Where Read:** Ad rotation logic  
**Where Written:** Ad creation  
**Why It Exists:** Ad rotation — prevents same ad showing continuously.  
**Business Effect:** Better ad distribution  
**UI Effect:** Auto-rotate  
**Permission Effect:** None  
**Related Feature:** Ad rotation

---

### 5.3 `maxViews/maxClicks` (ads table)

**Field:** `max_views/max_clicks`  
**Type:** Integer  
**Where Read:** Ad serving logic  
**Where Written:** Ad creation  
**Why It Exists:** Campaign limits — caps impressions/clicks per campaign.  
**Business Effect:** Budget control  
**UI Effect:** Campaign progress  
**Permission Effect:** None  
**Related Feature:** Ad analytics

---

### 5.4 `desktopZone` (ads table)

**Field:** `desktop_zone`  
**Type:** String  
**Where Read:** Desktop ad placement  
**Where Written:** Ad creation  
**Why It Exists:** Desktop-specific ad zones — separate from web placements.  
**Business Effect:** Desktop monetization  
**UI Effect:** Desktop ad display  
**Permission Effect:** None  
**Related Feature:** Desktop integration

---

### 5.5 `isGlobal` (ads table)

**Field:** `is_global`  
**Type:** Boolean, default true  
**Where Read:** Ad targeting  
**Where Written:** Ad creation  
**Why It Exists:** Worldwide ads — shows ad to all countries.  
**Business Effect:** Global campaigns  
**UI Effect:** Global badge  
**Permission Effect:** None  
**Related Feature:** Geo-targeting

---

### 5.6 `accentColor/backgroundFrom/backgroundTo` (ads table)

**Field:** `accent_color/background_from/background_to`  
**Type:** String  
**Where Read:** Ad rendering  
**Where Written:** Ad creation  
**Why It Exists:** Custom styling — ads can have custom colors and gradients.  
**Business Effect:** Brand consistency  
**UI Effect:** Custom ad appearance  
**Permission Effect:** None  
**Related Feature:** Ad design

---

## 6. Marketer Fields

### 6.1 `totalProperties/successfulDeals` (marketer_profiles table)

**Field:** `total_properties/successful_deals`  
**Type:** Integer  
**Where Read:** Rank calculation, profile display  
**Where Written:** Deal completion  
**Why It Exists:** Performance tracking — tracks marketer's deal history.  
**Business Effect:** Affects rank and commission rate  
**UI Effect:** Performance stats  
**Permission Effect:** Rank advancement  
**Related Feature:** Marketer ranks

---

### 6.2 `totalCommission` (marketer_profiles table)

**Field:** `total_commission`  
**Type:** Float  
**Where Read:** Profile display, withdrawal  
**Where Written:** Commission payment  
**Why It Exists:** Earnings tracking — total commission earned.  
**Business Effect:** Withdrawal eligibility  
**UI Effect:** Earnings display  
**Permission Effect:** Withdrawal access  
**Related Feature:** Commission system

---

### 6.3 `exclusivity` (marketing_contracts table)

**Field:** `exclusivity`  
**Type:** Boolean, default false  
**Where Read:** Contract validation  
**Where Written:** Contract creation  
**Why It Exists:** Exclusive marketing — only one marketer can market exclusively.  
**Business Effect:** Premium pricing for exclusivity  
**UI Effect:** Exclusivity badge  
**Permission Effect:** Other marketers blocked  
**Related Feature:** Marketing contracts

---

### 6.4 `autoRenew/renewalInterval` (marketing_contracts table)

**Field:** `auto_renew/renewal_interval`  
**Type:** Boolean/Integer  
**Where Read:** Contract renewal logic  
**Where Written:** Contract creation  
**Why It Exists:** Automatic renewal — contracts renew automatically.  
**Business Effect:** Reduces admin overhead  
**UI Effect:** Auto-renew toggle  
**Permission Effect:** None  
**Related Feature:** Contract management

---

## 7. Service Fields

### 7.1 `tier` (service_hub_profiles table)

**Field:** `tier`  
**Type:** String, default "basic"  
**Where Read:** Provider ranking, search results  
**Where Written:** Admin approval, performance  
**Why It Exists:** Provider ranking — premium tier gets priority.  
**Business Effect:** Better visibility for top providers  
**UI Effect:** Tier badge  
**Permission Effect:** Priority in dispatch  
**Related Feature:** Provider ranking

---

### 7.2 `isTopRated` (service_hub_profiles table)

**Field:** `is_top_rated`  
**Type:** Boolean, default false  
**Where Read:** Search results, dispatch  
**Where Written:** Rating calculation  
**Why It Exists:** Top-rated badge — high-performing providers get visual distinction.  
**Business Effect:** Trust signal  
**UI Effect:** Top-rated badge  
**Permission Effect:** Priority visibility  
**Related Feature:** Provider reputation

---

### 7.3 `sentiment` (service_hub_feedback table)

**Field:** `sentiment`  
**Type:** String, default "positive"  
**Where Read:** Provider reputation  
**Where Written:** Feedback submission  
**Why It Exists:** Sentiment tracking — positive/neutral/negative feedback.  
**Business Effect:** Affects provider reputation  
**UI Effect:** Sentiment indicator  
**Permission Effect:** None  
**Related Feature:** Two-sided reputation

---

## 8. Auction Risk Fields

### 8.1 `adminNote` (suspicious_relsits table)

**Field:** `admin_note`  
**Type:** String  
**Where Read:** Resolution review  
**Where Written:** Admin moderation  
**Why It Exists:** Admin notes — records reasoning for resolution.  
**Business Effect:** Audit trail  
**UI Effect:** Note display  
**Permission Effect:** None  
**Related Feature:** Fraud moderation

---

### 8.2 `resolvedAt` (suspicious_relsits table)

**Field:** `resolved_at`  
**Type:** DateTime  
**Where Read:** Status tracking  
**Where Written:** Resolution  
**Why It Exists:** Resolution timestamp — when fraud case was resolved.  
**Business Effect:** SLA tracking  
**UI Effect:** Resolution date  
**Permission Effect:** None  
**Related Feature:** Fraud resolution

---

## 9. Software Fields

### 9.1 `hwid` (software_licenses table)

**Field:** `hwid`  
**Type:** String  
**Where Read:** License validation  
**Where Written:** License activation  
**Why It Exists:** Hardware binding — license tied to specific machine.  
**Business Effect:** Prevents license sharing  
**UI Effect:** Hardware info display  
**Permission Effect:** Single machine  
**Related Feature:** License management

---

### 9.2 `type` (software_licenses table)

**Field:** `type`  
**Type:** String  
**Where Read:** License validation  
**Where Written:** License creation  
**Why It Exists:** License types — trial, subscription, perpetual.  
**Business Effect:** Different access levels  
**UI Effect:** License type badge  
**Permission Effect:** Feature access  
**Related Feature:** License plans

---

## 10. Content Fields

### 10.1 `sourceType` (news_ticker_items table)

**Field:** `source_type`  
**Type:** String, default "manual"  
**Where Read:** News generation  
**Where Written:** News creation  
**Why It Exists:** Source tracking — manual vs auto-generated news.  
**Business Effect:** Content management  
**UI Effect:** Source badge  
**Permission Effect:** None  
**Related Feature:** News ticker

---

### 10.2 `targetPages` (news_ticker_items table)

**Field:** `target_pages`  
**Type:** JSON array  
**Where Read:** Page rendering  
**Where Written:** News creation  
**Why It Exists:** Page targeting — news shows only on specific pages.  
**Business Effect:** Relevant content  
**UI Effect:** Page-specific display  
**Permission Effect:** None  
**Related Feature:** News targeting

---

## Summary of Hidden Product Ideas

| Idea | Fields | Business Concept |
|---|---|---|
| **Virtual Currency** | tokenBalance | Microtransactions without per-transaction payments |
| **City-Matched Notifications** | interestedCities | Automatic alerts when properties listed in user's cities |
| **Granular Bans** | isBannedFromAuctions, isAuctionsBanned | Ban from specific features without full account ban |
| **Marketing Opt-In** | marketingEnabled, marketingStartDate/End | Property owners choose if agents can market |
| **Sponsor Tiers** | sponsorTier | Premium ad placement through sponsorship |
| **Ad Rotation** | rotationSeconds | Prevent same ad showing repeatedly |
| **Campaign Limits** | maxViews/maxClicks | Budget control for ad campaigns |
| **Desktop Ad Zones** | desktopZone | Separate desktop ad inventory |
| **Auto-Bidding** | maxAutoBid | Automated bidding up to ceiling |
| **Fraud Detection** | priceDropPercent, proofDeadline | Automatic suspicious relist detection |
| **Optimistic Locking** | version | Prevent concurrent bid conflicts |
| **Provider Tiers** | tier, isTopRated | Priority visibility for top providers |
| **Sentiment Analysis** | sentiment | Track feedback sentiment |
| **Hardware Binding** | hwid | License tied to specific machine |
| **Exclusive Marketing** | exclusivity | Single-agent marketing contracts |
| **Auto-Renewal** | autoRenew | Automatic contract renewal |
| **Geo-Targeting** | targetCountry/Region/City/Village | Location-based ad targeting |
| **Global Ads** | isGlobal | Worldwide ad campaigns |
| **Page Targeting** | targetPages | Page-specific news/content |
| **Legal Compliance** | agreedToCharter | Charter acceptance tracking |

---

**Status:** COMPLETE  
**Application Source Files Modified:** ZERO
