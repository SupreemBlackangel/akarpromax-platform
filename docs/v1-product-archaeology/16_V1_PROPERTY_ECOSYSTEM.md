# 16_V1_PROPERTY_ECOSYSTEM.md
# V1 Property Ecosystem

**Audit Date:** 2026-08-19  
**Mode:** READ-ONLY — V1 Source Archaeology

---

## 1. Property Supply Side

### 1.1 Property Creation

**Page:** `SubmitProperty.tsx`

**Fields:**
- title, titleAr — Bilingual titles
- description, descriptionAr — Bilingual descriptions
- type (sale/rent) — Listing type
- category (apartment/villa/land) — Property type
- price, currency — Financial
- area, bedrooms, bathrooms — Specifications
- city, cityAr, governorate, country, countryCode — Geo
- facade, propertyAge — Building details
- images — JSON array of URLs
- videoUrl — Video tour
- lat, lng — Coordinates

**Workflow:**
1. User fills form
2. Uploads images
3. Submits property
4. Status = "active" (or "pending" if moderation enabled)

### 1.2 Property Management

**Page:** `Dashboard.tsx`

**Features:**
- View own properties
- Edit property
- Delete property
- Toggle featured
- View analytics

---

## 2. Property Demand Side

### 2.1 Property Search

**Page:** `Properties.tsx`

**Filters:**
- Category
- Type
- City
- Price range
- Area range
- Bedrooms
- Bathrooms

**Features:**
- Text search
- Filter pills
- Sort options
- Map view

### 2.2 Property Detail

**Page:** `PropertyDetail.tsx`

**Features:**
- Image gallery
- Video player
- Map location
- Contact form
- Favorite button
- Share button
- Similar properties

### 2.3 Favorites

**Implementation:** `useFavorites.ts`

**Storage:** localStorage

**Features:**
- Add to favorites
- Remove from favorites
- Favorites list

---

## 3. Broker/Office Side

### 3.1 Office Properties

**Page:** `OfficeDetail.tsx`

**Features:**
- Office profile
- Office properties list
- Office contact
- Office rating

### 3.2 Property Requests

**Page:** `OfficeRequests.tsx`

**Features:**
- View buyer requests
- Submit offers
- Track offer status

---

## 4. Admin Side

### 4.1 Property Moderation

**Page:** `AdminProperties.tsx`

**Features:**
- View all properties
- Approve/reject
- Toggle featured
- Delete
- View analytics

---

## 5. Property Features

### 5.1 Search & Discovery

| Feature | Implementation |
|---|---|
| Text search | Title/description search |
| Category filter | Property type filter |
| City filter | Location filter |
| Price range | Min/max price |
| Area range | Min/max area |
| Bedrooms | Bedroom count |
| Bathrooms | Bathroom count |
| Sort | Price/area/date |
| Map view | Leaflet integration |

### 5.2 Property Details

| Feature | Implementation |
|---|---|
| Image gallery | Multiple images |
| Video tour | Video URL |
| Map location | Lat/lng |
| Specifications | Area, beds, baths |
| Contact form | Inquiry submission |
| Favorite | localStorage |
| Share | Social sharing |
| Similar | Similar properties |

### 5.3 Property Lifecycle

| Stage | Status | Description |
|---|---|---|
| Draft | draft | Being created |
| Pending | pending | Awaiting moderation |
| Active | active | Listed and visible |
| Sold | sold | Transaction complete |
| Rented | rented | Rental complete |
| Inactive | inactive | Deactivated |

---

## 6. Financial Tools

### 6.1 Mortgage Calculator

**Page:** `Tools.tsx`

**Features:**
- Loan amount
- Interest rate
- Loan term
- Monthly payment

### 6.2 Investment Analysis

**Page:** `InvestmentRadar.tsx`

**Features:**
- Market trends
- Investment score
- Area analysis

---

## 7. Inquiry & Lead System

### 7.1 Property Inquiries

**Table:** `inquiries`

**Fields:**
- name, email, phone
- message
- propertyId
- isEliteLead

### 7.2 Elite Leads

**Flag:** `isEliteLead`

**Purpose:** High-value leads get special attention

**Admin UI:** `AdminEliteLeads.tsx`

---

## 8. Marketing Integration

### 8.1 Marketing-Enabled Properties

**Field:** `marketingEnabled`

**Purpose:** Property can be marketed by agents

### 8.2 Marketing Contracts

**Table:** `marketing_contracts`

**Fields:**
- propertyId, marketerId, advertiserId
- commissionRate, commissionType
- exclusivity
- autoRenew

---

## 9. Auction Integration

### 9.1 Property Auctions

**Table:** `auctions`

**Fields:**
- propertyId, officeId
- startPrice, minBidIncrement
- currentPrice, endDate
- status, type

---

## 10. Moderation & Safety

### 10.1 Property Reports

- Users can report properties
- Admin reviews reports
- Actions: warn, remove, ban

### 10.2 Fraud Detection

- Suspicious relist detection
- Price manipulation detection
- Office reputation scoring

---

## 11. Summary

| Domain | Features |
|---|---|
| **Supply** | Property CRUD, image upload, video, map |
| **Demand** | Search, filters, favorites, inquiries |
| **Broker** | Office properties, requests, offers |
| **Admin** | Moderation, analytics, featured |
| **Financial** | Mortgage calculator, investment radar |
| **Marketing** | Marketing-enabled, contracts, commissions |
| **Auctions** | Property auctions, bidding |
| **Safety** | Reports, fraud detection |

---

**Status:** COMPLETE  
**Application Source Files Modified:** ZERO
