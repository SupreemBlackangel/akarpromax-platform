# 08_ADVERTISING_ENGINE_AUDIT.md
# Advertising Engine Audit

**Audit Date:** 2026-08-19  
**Mode:** READ-ONLY

---

## 1. V1 Advertising System

### 1.1 Database Schema

#### Ads Table
```sql
CREATE TABLE ads (
  id UUID PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  titleAr VARCHAR(255),
  description TEXT,
  descriptionAr TEXT,
  imageUrl VARCHAR(500),
  linkUrl VARCHAR(500),
  position VARCHAR(100), -- hero/sidebar_left/sidebar_right/footer/ad-slot-01
  page VARCHAR(100), -- home/properties/blog/etc.
  targetCountry VARCHAR(10),
  targetRegion VARCHAR(100),
  targetGovernorate VARCHAR(100),
  targetCity VARCHAR(100),
  targetVillage VARCHAR(100),
  isGlobal BOOLEAN DEFAULT false,
  language VARCHAR(10), -- ar/en/both
  sponsorTier VARCHAR(50), -- platinum/gold/silver/standard
  sponsorName VARCHAR(255),
  sponsorLogo VARCHAR(500),
  isActive BOOLEAN DEFAULT true,
  clickCount INTEGER DEFAULT 0,
  viewCount INTEGER DEFAULT 0,
  maxViews INTEGER,
  maxClicks INTEGER,
  rotationSeconds INTEGER DEFAULT 30,
  startDate DATE,
  endDate DATE,
  desktopZone VARCHAR(100),
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);
```

**Source:** `prisma/schema.prisma` `ads` model

### 1.2 API Endpoints

| Endpoint | Method | Auth | Purpose |
|---|---|---|---|
| `/api/ads` | GET | Admin | List all ads |
| `/api/ads/hero` | GET | Public | Hero slider ads (geo-filtered) |
| `/api/ads/public` | GET | Public | Public ads (geo-filtered) |
| `/api/ads/next` | GET | Public | Next ad for rotation |
| `/api/ads` | POST | Admin | Create ad |
| `/api/ads/:id` | PUT | Admin | Update ad |
| `/api/ads/:id` | DELETE | Admin | Delete ad |
| `/api/ads/:id/view` | POST | Public | Track impression |
| `/api/ads/:id/click` | POST | Public | Track click |
| `/api/ads/request` | POST | Auth | User ad request |

**Source:** `server/api/src/routes/ads.ts`

### 1.3 Geo-Targeting

V1 ads had granular geo-targeting:

| Field | Type | Purpose |
|---|---|---|
| targetCountry | String | Country code |
| targetRegion | String | Region/governorate |
| targetGovernorate | String | Governorate |
| targetCity | String | City |
| targetVillage | String | Village/locality |
| isGlobal | Boolean | Show worldwide |
| language | String | Language filter |

**Source:** `prisma/schema.prisma` `ads` model

### 1.4 Sponsor Tiers

V1 had a tiered sponsor system:

| Tier | Priority | Visual |
|---|---|---|
| Platinum | Highest | Premium placement |
| Gold | High | Featured placement |
| Silver | Medium | Standard placement |
| Standard | Low | Basic placement |

**Source:** `GeoAdsContext.tsx` lines 100-150

### 1.5 Ad Positions

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

**Source:** `GeoAdsContext.tsx` lines 50-80

### 1.6 Delivery Rules

| Rule | Description |
|---|---|
| Rotation | Configurable `rotationSeconds` per ad |
| Max Views | `maxViews` limit per campaign |
| Max Clicks | `maxClicks` limit per campaign |
| Date Range | `startDate` and `endDate` |
| Geo Filter | Country/region/city targeting |
| Language Filter | Arabic/English/Both |

### 1.7 Analytics

| Metric | Description |
|---|---|
| View Count | Total impressions per ad |
| Click Count | Total clicks per ad |
| CTR | Click-through rate |
| Placement Performance | Performance by ad position |
| Geo Performance | Performance by geography |

### 1.8 Desktop Ads

V1 had separate desktop ad zones:

| Field | Purpose |
|---|---|
| desktopZone | Desktop app ad placement |
| sync/ads | Sync ads for offline |

**Source:** `api/desktop.ts`

---

## 2. V2.0 Advertising System

### 2.1 Database Schema

V2.0 has TWO ad systems:

#### Legacy System (components/advertising/)
- Uses `ad_campaigns` and `ad_creatives` tables
- Simple matching engine
- No geo-targeting

#### New System (src/components/ads/)
- Uses `ad_campaigns`, `ad_creatives`, `ad_placements` tables
- Central engine with house fill
- Channel isolation (website/office)
- Section-scoped matching

**Source:** `lib/ads/engine.ts`, `lib/advertising/core/matching.engine.ts`

### 2.2 API Endpoints

| Endpoint | Method | Auth | Purpose |
|---|---|---|---|
| `/api/ads/match` | POST | Public | Match ads for placement |
| `/api/ads/match-batch` | POST | Public | Batch ad matching |
| `/api/admin/ads` | GET | Admin | List all ads |
| `/api/admin/ads` | POST | Admin | Create ad |
| `/api/admin/ads/:id` | PATCH | Admin | Update ad |
| `/api/admin/ads/:id` | DELETE | Admin | Delete ad |
| `/api/office/v1/ads` | GET | Office | Office ad placement |

**Source:** `app/api/ads/match/route.ts`, `app/api/admin/ads/route.ts`

### 2.3 Placements

V2.0 has defined placements:

| Placement | Section | Description |
|---|---|---|
| HERO | home/services/properties/tools | Hero banner |
| LEFT_01 | All pages | Left sidebar slot 1 |
| LEFT_02 | All pages | Left sidebar slot 2 |
| RIGHT_01 | All pages | Right sidebar slot 1 |
| RIGHT_02 | All pages | Right sidebar slot 2 |
| BOTTOM_01 | All pages | Bottom slot 1 |
| BOTTOM_02 | All pages | Bottom slot 2 |
| BOTTOM_03 | All pages | Bottom slot 3 |

**Source:** `src/constants/advertising.ts`

### 2.4 Channel Isolation

V2.0 isolates ads by channel:

| Channel | Description |
|---|---|
| website | Public website ads |
| office | AkarProMax Office ads |

**Source:** `lib/ads/engine.ts` lines 100-150

### 2.5 House Fill

V2.0 has a house fill system:

- 3-commercial threshold
- Round-robin creatives
- Channel isolation
- House ≠ commercial

**Source:** `lib/ads/engine.ts` lines 200-250

---

## 3. Critical Differences

### 3.1 V1 Had Geo-Targeting

V1 ads had granular geo-targeting:
- Country
- Region
- Governorate
- City
- Village
- Language

### 3.2 V2.0 Lacks Geo-Targeting

V2.0 ads have no geo-targeting. They are shown globally based on section/placement.

### 3.3 V1 Had Sponsor Tiers

V1 had a tiered sponsor system:
- Platinum > Gold > Silver > Standard

### 3.4 V2.0 Has No Sponsor Tiers

V2.0 has no sponsor tier system.

### 3.5 V1 Had Rotation

V1 had configurable ad rotation:
- `rotationSeconds` per ad
- Impression deduplication

### 3.6 V2.0 Has No Rotation

V2.0 has no ad rotation system.

### 3.7 V1 Had Max Views/Clicks

V1 had campaign limits:
- `maxViews` per campaign
- `maxClicks` per campaign

### 3.8 V2.0 Has No Campaign Limits

V2.0 has no campaign limit system.

### 3.9 V1 Had Desktop Ads

V1 had separate desktop ad zones with offline sync.

### 3.10 V2.0 Has Partial Desktop Ads

V2.0 has office ad placement but no offline sync.

---

## 4. Recommended Final Advertising Engine

### 4.1 Architecture

```
Advertiser
→ Campaign
→ Creative
→ Placement
→ Targeting Rules
→ Delivery Rules
→ Events
→ Analytics
```

### 4.2 Targeting

| Target | Description |
|---|---|
| Channel | Website / Office |
| Country | Country code |
| Region | Region/governorate |
| City | City |
| District | District |
| Lat/Lng | Latitude/longitude |
| Radius | Radius in km |
| Page | Page type |
| Module | Feature module |
| Placement | Ad placement |
| Language | Arabic/English |
| Property Type | Property category |
| Service Category | Service type |
| Organization Category | Organization type |

### 4.3 Delivery Rules

| Rule | Description |
|---|---|
| Start | Campaign start date |
| End | Campaign end date |
| Priority | Campaign priority |
| Rotation | Rotation seconds |
| Frequency Cap | Max impressions per user |
| Impression Cap | Total impression limit |
| Click Cap | Total click limit |
| Pacing | Even distribution |

### 4.4 Analytics

| Metric | Description |
|---|---|
| Impression | Total views |
| Click | Total clicks |
| Conversion | Goal completions |
| CTR | Click-through rate |
| Placement Performance | By ad position |
| Geo Performance | By geography |
| Creative Performance | By creative |
| Website vs Office | Channel comparison |

---

## 5. V1 Ad Components

| Component | File | Purpose |
|---|---|---|
| GeoAdsContext | `GeoAdsContext.tsx` | Geo-targeted ad loading |
| AdHero | `AdHero.tsx` | Hero ad display |
| AdSidebar | `AdSidebar.tsx` | Sidebar ad display |
| AdBottom | `AdBottom.tsx` | Bottom ad display |
| NewsTicker | `NewsTicker.tsx` | News ticker display |

**Source:** `src/components/advertising/`

---

## 6. V2.0 Ad Components

| Component | File | Purpose |
|---|---|---|
| AdSlot | `AdSlot.tsx` | Generic ad slot |
| AdSlotFrame | `ad-slot-frame.tsx` | Ad slot frame |
| StandardPublicAdLayout | `standard-public-ad-layout.tsx` | Standard ad layout |
| AdHero | `AdHero.tsx` | Hero ad display |
| AdSidebar | `AdSidebar.tsx` | Sidebar ad display |
| AdBottom | `AdBottom.tsx` | Bottom ad display |

**Source:** `src/components/ads/`, `components/advertising/`

---

## 7. Duplicate Ad Systems

V2.0 has TWO ad systems running in parallel:

| System | Components | API | Engine |
|---|---|---|---|
| Legacy | `components/advertising/` | `/api/advertising/match` | `lib/advertising/core/matching.engine.ts` |
| New | `src/components/ads/` | `/api/ads/match` | `lib/ads/engine.ts` |

This causes:
- Duplicate ad slots on some pages
- Redundant API calls
- Inconsistent behavior

---

## 8. V1 Ad Features Missing in V2.0

| Feature | V1 Status | V2.0 Status | Gap |
|---|---|---|---|
| Geo-targeting | Implemented | Missing | CRITICAL |
| Sponsor tiers | Implemented | Missing | HIGH |
| Ad rotation | Implemented | Missing | HIGH |
| Max views/clicks | Implemented | Missing | MEDIUM |
| Language targeting | Implemented | Missing | MEDIUM |
| Page targeting | Implemented | Missing | MEDIUM |
| Desktop zones | Implemented | Partial | MEDIUM |
| Ad requests | Implemented | Missing | LOW |
| Impression dedup | Implemented | Missing | MEDIUM |

---

**Status:** COMPLETE  
**Application Source Files Modified:** ZERO
