# 12_V1_ADVERTISING_BUSINESS_ENGINE.md
# V1 Advertising Business Engine

**Audit Date:** 2026-08-19  
**Mode:** READ-ONLY — V1 Source Archaeology

---

## 1. Ad System Overview

V1 had a complete advertising business system with:
- Ad creation and management
- Geo-targeting
- Sponsor tiers
- Rotation
- Impression/click tracking
- Campaign limits
- Desktop integration

---

## 2. Database Schema

### 2.1 Ads Table

**Table:** `ads`

| Field | Type | Purpose |
|---|---|---|
| id | Int | PK |
| title | String | Ad title |
| titleAr | String | Arabic title |
| subtitle | String | Subtitle |
| badge | String | Badge text |
| imageUrl | String | Image URL |
| linkUrl | String | Click destination |
| position | String | Banner placement slot |
| page | String | Target page |
| country | String | Country targeting |
| city | String | City targeting |
| isActive | Boolean | Active flag |
| clickCount | Integer | Click analytics |
| viewCount | Integer | View analytics |
| ctaText | String | Call-to-action |
| companyName | String | Company name |
| companyLogo | String | Company logo |
| phoneNumber | String | Phone number |
| displayDuration | Integer | Display duration |
| displayOrder | Integer | Display order |
| targetType | String | Target type |
| desktopZone | String | Desktop zone |
| startDate | String | Start date |
| endDate | String | End date |
| targetCountry | String | Country targeting |
| targetRegion | String | Region targeting |
| targetGovernorate | String | Governorate targeting |
| targetCity | String | City targeting |
| targetVillage | String | Village targeting |
| isGlobal | Boolean | Global flag |
| language | String | Language filter |
| icon | String | Icon |
| accentColor | String | Accent color |
| backgroundFrom | String | Gradient start |
| backgroundTo | String | Gradient end |
| sponsorTier | String | Sponsor rank |
| sponsorName | String | Sponsor name |
| advertiserName | String | Advertiser name |
| advertiserEmail | String | Advertiser email |
| advertiserPhone | String | Advertiser phone |
| price | Float | Ad price |
| notes | String | Notes |
| maxViews | Integer | View cap |
| maxClicks | Integer | Click cap |
| rotationSeconds | Integer | Rotation interval |
| status | String | Ad status |

---

## 3. Ad Positions

| Position | Page | Description |
|---|---|---|
| hero | Homepage | Hero slider |
| sidebar_left | All pages | Left sidebar |
| sidebar_right | All pages | Right sidebar |
| footer | All pages | Footer area |
| ad-slot-01 | Properties | Property listing slot |
| properties_hero | Properties | Properties hero |
| offices_hero | Offices | Offices hero |
| desktop_zones | Desktop | Desktop app zones |

---

## 4. Geo-Targeting

### 4.1 Targeting Fields

| Field | Type | Purpose |
|---|---|---|
| targetCountry | String | Country code |
| targetRegion | String | Region/governorate |
| targetGovernorate | String | Governorate |
| targetCity | String | City |
| targetVillage | String | Village/locality |
| isGlobal | Boolean | Show worldwide |
| language | String | Language filter |

### 4.2 Targeting Logic

```typescript
if (ad.isGlobal) return true;
if (ad.targetCountry && ad.targetCountry !== userCountry) return false;
if (ad.targetRegion && ad.targetRegion !== userRegion) return false;
if (ad.targetCity && ad.targetCity !== userCity) return false;
return true;
```

---

## 5. Sponsor Tiers

| Tier | Priority | Visual |
|---|---|---|
| Platinum | Highest | Premium placement |
| Gold | High | Featured placement |
| Silver | Medium | Standard placement |
| Standard | Low | Basic placement |

---

## 6. Ad Delivery

### 6.1 Rotation

**Field:** `rotationSeconds` (default 5)

**Logic:**
- Ads rotate every N seconds
- Prevents same ad showing repeatedly
- Client-side rotation

### 6.2 Campaign Limits

**Fields:**
- `maxViews` — Total impression limit
- `maxClicks` — Total click limit

**Logic:**
- When limit reached, ad stops serving
- Checked on each view/click

### 6.3 Date Range

**Fields:**
- `startDate` — Campaign start
- `endDate` — Campaign end

**Logic:**
- Ad only serves within date range
- Checked on each request

---

## 7. Analytics

### 7.1 Tracking

**Fields:**
- `viewCount` — Total impressions
- `clickCount` — Total clicks

**Endpoints:**
- `POST /api/ads/:id/view` — Track impression
- `POST /api/ads/:id/click` — Track click

### 7.2 Impression Deduplication

**Client-side:** Set of viewed ad IDs
**Prevents:** Duplicate impressions from same user

---

## 8. Desktop Integration

### 8.1 Desktop Zones

**Field:** `desktopZone`

**Purpose:** Separate ad inventory for desktop app

**Endpoint:** `GET /api/desktop/ads/placement/:zone`

### 8.2 Desktop Sync

**Endpoint:** `GET /api/desktop/sync/ads`

**Purpose:** Sync ads for offline viewing

---

## 9. Ad Requests

### 9.1 User Ad Requests

**Endpoint:** `POST /api/ads/request`

**Purpose:** Users can request to advertise

**Fields:**
- Advertiser name, email, phone
- Ad details
- Targeting preferences

---

## 10. Admin Management

### 10.1 Ad CRUD

**Page:** `AdminAds.tsx`

**Actions:**
- Create ad
- Update ad
- Delete ad
- Activate/deactivate

### 10.2 Ad Approval

**Workflow:**
1. User submits ad request
2. Admin reviews
3. Admin creates ad
4. Ad activated

---

## 11. Geo Ad Context

### 11.1 GeoAdsContext

**File:** `src/contexts/GeoAdsContext.tsx`

**Features:**
- Geo-targeted ad loading
- Position filtering
- View/click tracking
- Tier-based sorting
- 5-minute cache

### 11.2 Ad Components

| Component | File | Purpose |
|---|---|---|
| AdHero | `AdHero.tsx` | Hero ad display |
| AdSidebar | `AdSidebar.tsx` | Sidebar ad display |
| AdBottom | `AdBottom.tsx` | Bottom ad display |
| NewsTicker | `NewsTicker.tsx` | News ticker display |

---

## 12. Summary

| Feature | Implementation |
|---|---|
| Ad CRUD | ✅ Full CRUD |
| Geo-targeting | ✅ Country/region/city/village |
| Sponsor tiers | ✅ Platinum/Gold/Silver/Standard |
| Ad rotation | ✅ Configurable seconds |
| Max views/clicks | ✅ Campaign limits |
| Date range | ✅ Start/end dates |
| Language targeting | ✅ Arabic/English/Both |
| Page targeting | ✅ Page-specific |
| Desktop zones | ✅ Desktop integration |
| Impression tracking | ✅ View count |
| Click tracking | ✅ Click count |
| Impression dedup | ✅ Client-side Set |
| Ad requests | ✅ User submission |
| Admin management | ✅ Full CRUD |

---

**Status:** COMPLETE  
**Application Source Files Modified:** ZERO
