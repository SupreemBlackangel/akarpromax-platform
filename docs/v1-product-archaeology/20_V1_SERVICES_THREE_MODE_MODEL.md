# 20_V1_SERVICES_THREE_MODE_MODEL.md
# V1 Services Three-Mode Model

**Audit Date:** 2026-08-19  
**Mode:** READ-ONLY — V1 Source Archaeology

---

## Overview

V1 had THREE distinct service concepts that should NOT be merged during archaeology:

1. **Service Directory/Listings** — Static service listings
2. **Urgent Dispatch/Ringing** — Real-time service dispatch
3. **Tender/RFQ/Bidding** — Competitive bidding for services

---

## Mode A: Service Directory/Listings

### Table: `other_services`

**Purpose:** Non-real-estate service listings (plumbing, cleaning, moving)

**Fields:**
- title, category, description
- city, phone, whatsapp
- logoUrl, coverUrl, ownerName
- userId

### Table: `other_service_items`

**Purpose:** Sub-items/pricing tiers within a service

**Fields:**
- serviceId, name, price, currency, description

### Features:
- Service CRUD
- Category filtering
- City filtering
- Item pricing

---

## Mode B: Urgent Dispatch/Ringing

### Table: `service_hub_profiles`

**Purpose:** Enhanced profiles for skilled service providers

**Fields:**
- userId, name, category
- rating, tier, isTopRated
- specs (JSON array)
- photoUrl, distanceKm

### Table: `service_hub_requests`

**Purpose:** Service requests from customers to providers

**Fields:**
- userId, providerId, specialty
- description, status
- estimatedPrice, estimatedDuration

### Table: `service_hub_ratings`

**Purpose:** Provider ratings from customers

**Fields:**
- requestId, userId, providerId
- score, comment

### Table: `service_hub_feedback`

**Purpose:** Sentiment-tracked feedback

**Fields:**
- requestId, userId, message, sentiment

### Features:
- Provider profiles
- Service requests
- Provider ratings
- Feedback with sentiment
- Availability toggle
- CV upload
- Provider search

---

## Mode C: Tender/RFQ/Bidding

### Table: `service_tenders`

**Purpose:** Competitive bidding for services

**Fields:**
- userId, category, city, title
- budgetFrom, budgetTo, durationDays
- status, awardedBidId, endsAt

### Table: `tender_bids`

**Purpose:** Artisan bids on tenders

**Fields:**
- tenderId, artisanId, amount
- description, durationDays, status, isHidden

### Table: `tender_activity_logs`

**Purpose:** Tender audit trail

**Fields:**
- tenderId, userId, action, details

### Table: `tender_settings`

**Purpose:** Per-user tender configuration

**Fields:**
- userId, defaultMinIncrement, defaultDurationDays, maxDurationDays

---

## Summary

| Mode | Tables | Purpose |
|---|---|---|
| Directory | other_services, other_service_items | Static service listings |
| Dispatch | service_hub_profiles, requests, ratings, feedback | Real-time service dispatch |
| Tender | service_tenders, tender_bids, tender_logs, tender_settings | Competitive bidding |

---

**Status:** COMPLETE  
**Application Source Files Modified:** ZERO
