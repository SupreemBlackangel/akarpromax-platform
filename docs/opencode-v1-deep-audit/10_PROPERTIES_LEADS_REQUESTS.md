# 10_PROPERTIES_LEADS_REQUESTS.md
# Properties, Leads & Requests Audit

**Audit Date:** 2026-08-19  
**Mode:** READ-ONLY

---

## 1. V1 Property System

### 1.1 Database Schema

#### Properties Table
```sql
CREATE TABLE properties (
  id UUID PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  titleAr VARCHAR(255),
  type VARCHAR(100),
  category VARCHAR(100),
  price DECIMAL,
  currency VARCHAR(10),
  area DECIMAL,
  bedrooms INTEGER,
  bathrooms INTEGER,
  city VARCHAR(100),
  countryCode VARCHAR(10),
  facade VARCHAR(100),
  images JSON,
  lat DECIMAL,
  lng DECIMAL,
  isFeatured BOOLEAN DEFAULT false,
  views INTEGER DEFAULT 0,
  userId UUID REFERENCES users(id),
  officeId UUID REFERENCES offices(id),
  marketingEnabled BOOLEAN DEFAULT false,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);
```

**Source:** `prisma/schema.prisma` `properties` model

### 1.2 API Endpoints

| Endpoint | Method | Auth | Purpose |
|---|---|---|---|
| `/api/properties` | GET | Public | List properties |
| `/api/properties/featured` | GET | Public | Featured properties |
| `/api/properties/mine` | GET | Auth | User's properties |
| `/api/properties/pending` | GET | Admin/Mod | Pending properties |
| `/api/properties/:id` | GET | Public | Single property |
| `/api/properties/submit` | POST | Auth | Create property |
| `/api/properties/:id` | PUT | Auth | Update property |
| `/api/properties/:id` | DELETE | Auth | Delete property |
| `/api/properties/:id/status` | PATCH | Admin/Mod | Approve/reject |
| `/api/properties/:id/feature` | PATCH | Admin | Toggle featured |

**Source:** `server/api/src/routes/properties.ts`

### 1.3 Features

| Feature | Implementation | Evidence |
|---|---|---|
| Property CRUD | Full CRUD | `api/properties.ts` |
| Image upload | Multiple images | `SubmitProperty.tsx` |
| Featured properties | Admin toggle | `api/properties.ts` |
| Search filters | Category, type, city, price | `Properties.tsx` |
| View counter | Auto-increment | `api/properties.ts` |
| Office linking | Office association | `properties.officeId` |
| Marketing flag | Marketing enabled | `properties.marketingEnabled` |
| Moderation | Approve/reject | `AdminProperties.tsx` |

---

## 2. V2.0 Property System

### 2.1 Database Schema

V2.0 has TWO property tables:

#### Properties Table (PG)
```sql
CREATE TABLE properties (
  id UUID PRIMARY KEY,
  title_ar VARCHAR(255),
  title_en VARCHAR(255),
  description_ar TEXT,
  description_en TEXT,
  deal_type VARCHAR(50),
  category VARCHAR(50),
  property_type VARCHAR(50),
  country VARCHAR(10),
  governorate VARCHAR(100),
  city VARCHAR(100),
  district VARCHAR(100),
  latitude DECIMAL,
  longitude DECIMAL,
  address TEXT,
  price DECIMAL,
  currency VARCHAR(10),
  area DECIMAL,
  bedrooms INTEGER,
  bathrooms INTEGER,
  floor INTEGER,
  total_floors INTEGER,
  year_built INTEGER,
  facade VARCHAR(100),
  direction VARCHAR(100),
  reference_number VARCHAR(100),
  advertising_license VARCHAR(100),
  office_id UUID REFERENCES organizations(id),
  user_id UUID REFERENCES users(id),
  status VARCHAR(50) DEFAULT 'draft',
  views INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Source:** `lib/db/schemas/properties-schema.ts`

#### Property Listings Table (Content Runtime)
```sql
CREATE TABLE property_listings (
  id UUID PRIMARY KEY,
  country_code VARCHAR(10),
  city_id UUID,
  listing_type VARCHAR(50),
  property_type VARCHAR(50),
  price DECIMAL,
  currency VARCHAR(10),
  area DECIMAL,
  bedrooms INTEGER,
  bathrooms INTEGER,
  title VARCHAR(255),
  title_ar VARCHAR(255),
  description TEXT,
  description_ar TEXT,
  images JSON,
  lat DECIMAL,
  lng DECIMAL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Source:** `lib/content-schema.ts`

### 2.2 API Endpoints

| Endpoint | Method | Auth | Purpose |
|---|---|---|---|
| `/api/properties` | GET | Public | List properties |
| `/api/properties` | POST | Auth | Create property |
| `/api/properties/[id]` | GET | Public | Single property |
| `/api/properties/[id]` | PATCH | Auth | Update property |
| `/api/properties/[id]` | DELETE | Auth | Delete property |
| `/api/properties/[id]/submit` | POST | Auth | Submit for review |
| `/api/properties/search` | GET | Public | Advanced search |
| `/api/properties/my` | GET | Auth | User's properties |
| `/api/properties/favorites` | GET/POST/DELETE | Auth | Favorites |
| `/api/properties/offer-types` | GET/POST/PATCH/DELETE | Various | Offer types |
| `/api/properties/saved-searches` | GET/POST/DELETE | Auth | Saved searches |

**Source:** `app/api/properties/`

### 2.3 Features

| Feature | Implementation | Evidence |
|---|---|---|
| Property CRUD | Full CRUD | `api/properties/` |
| Image upload | Multiple images | `property_media` table |
| Featured properties | Admin toggle | `properties.is_featured` |
| Search filters | 18+ filters | `api/properties/search` |
| View counter | Auto-increment | `properties.views` |
| Office linking | Organization association | `properties.office_id` |
| Offer types | Dynamic offer types | `property_offer_types` table |
| Offers | Property offers | `property_offers` table |
| Favorites | User favorites | `property_favorites` table |
| Saved searches | Saved search alerts | `saved_searches` table |
| Moderation | Status workflow | `properties.status` |

---

## 3. V1 Property Requests

### 3.1 Database Schema

#### Property Requests Table
```sql
CREATE TABLE property_requests (
  id UUID PRIMARY KEY,
  userId UUID REFERENCES users(id),
  title VARCHAR(255),
  propertyType VARCHAR(100),
  city VARCHAR(100),
  minPrice DECIMAL,
  maxPrice DECIMAL,
  status VARCHAR(50) DEFAULT 'open',
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);
```

**Source:** `prisma/schema.prisma` `property_requests` model

#### Property Offers Table
```sql
CREATE TABLE property_offers (
  id UUID PRIMARY KEY,
  propertyRequestId UUID REFERENCES property_requests(id),
  userId UUID REFERENCES users(id),
  message TEXT,
  price DECIMAL,
  status VARCHAR(50) DEFAULT 'pending',
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);
```

**Source:** `prisma/schema.prisma` `property_offers` model

### 3.2 API Endpoints

| Endpoint | Method | Auth | Purpose |
|---|---|---|---|
| `/api/property-requests` | POST | Auth | Create request |
| `/api/property-requests` | GET | Auth | List requests |

**Source:** `server/api/src/routes/property-requests.ts`

### 3.3 Features

| Feature | Implementation | Evidence |
|---|---|---|
| Request creation | Authenticated | `MyPropertyRequests.tsx` |
| Request listing | Filtered | `OfficeRequests.tsx` |
| Offer submission | Authenticated | `api/property-requests.ts` |
| Offer status | Pending/accepted/rejected | `property_offers.status` |

---

## 4. V1 Inquiries & Leads

### 4.1 Database Schema

#### Inquiries Table
```sql
CREATE TABLE inquiries (
  id UUID PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  message TEXT,
  propertyId UUID REFERENCES properties(id),
  isEliteLead BOOLEAN DEFAULT false,
  createdAt TIMESTAMP DEFAULT NOW()
);
```

**Source:** `prisma/schema.prisma` `inquiries` model

### 4.2 Elite Leads

V1 had a special "elite leads" system:

| Feature | Description |
|---|---|
| Flag | `isEliteLead` boolean on inquiries |
| Admin UI | `/admin/elite-leads` page |
| Purpose | High-value lead management |

**Source:** `AdminEliteLeads.tsx`

### 4.3 Bookings

#### Bookings Table
```sql
CREATE TABLE bookings (
  id UUID PRIMARY KEY,
  propertyId UUID REFERENCES properties(id),
  userId UUID REFERENCES users(id),
  officeId UUID REFERENCES offices(id),
  fullName VARCHAR(255),
  phone VARCHAR(50),
  preferredDate DATE,
  createdAt TIMESTAMP DEFAULT NOW()
);
```

**Source:** `prisma/schema.prisma` `bookings` model

---

## 5. V2.0 Property Requests

### 5.1 Database Schema

V2.0 has property requests via `property_requests` table:

```sql
CREATE TABLE property_requests (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  title VARCHAR(255),
  property_type VARCHAR(50),
  category VARCHAR(50),
  country VARCHAR(10),
  governorate VARCHAR(100),
  city VARCHAR(100),
  district VARCHAR(100),
  min_price DECIMAL,
  max_price DECIMAL,
  min_area DECIMAL,
  max_area DECIMAL,
  bedrooms INTEGER,
  bathrooms INTEGER,
  status VARCHAR(50) DEFAULT 'open',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Source:** `lib/db/schemas/properties-schema.ts`

### 5.2 API Endpoints

| Endpoint | Method | Auth | Purpose |
|---|---|---|---|
| `/api/properties/property-requests` | GET | Auth | List requests |
| `/api/properties/property-requests` | POST | Auth | Create request |
| `/api/properties/property-request-offers` | GET/POST | Auth | Offers |

**Source:** `app/api/properties/`

---

## 6. Critical Differences

### 6.1 V1 Had Elite Leads

V1 had a special "elite leads" system for high-value inquiries with:
- `isEliteLead` flag
- Dedicated admin UI
- Special handling

### 6.2 V2.0 Lacks Elite Leads

V2.0 has no elite leads system.

### 6.3 V1 Had Bookings

V1 had a property viewing booking system with:
- Property booking
- Office association
- Preferred date

### 6.4 V2.0 Lacks Bookings

V2.0 has no booking system.

### 6.5 V1 Had City-Matched Notifications

V1 automatically notified users when properties were listed in their interested cities.

### 6.6 V2.0 Lacks City-Matched Notifications

V2.0 has no automatic notification system for property matches.

---

## 7. V1 Property Features Missing in V2.0

| Feature | V1 Status | V2.0 Status | Gap |
|---|---|---|---|
| Elite leads | Implemented | Missing | HIGH |
| Bookings | Implemented | Missing | MEDIUM |
| City-matched notifications | Implemented | Missing | MEDIUM |
| Marketing flag | Implemented | Missing | LOW |
| Office verification | Implemented | Missing | MEDIUM |
| Auction permission | Implemented | Missing | MEDIUM |

---

**Status:** COMPLETE  
**Application Source Files Modified:** ZERO
