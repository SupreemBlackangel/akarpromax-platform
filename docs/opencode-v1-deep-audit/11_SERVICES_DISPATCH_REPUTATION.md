# 11_SERVICES_DISPATCH_REPUTATION.md
# Services, Dispatch & Reputation Audit

**Audit Date:** 2026-08-19  
**Mode:** READ-ONLY

---

## 1. V1 Service Hub System

### 1.1 Database Schema

#### Service Hub Profiles Table
```sql
CREATE TABLE service_hub_profiles (
  id UUID PRIMARY KEY,
  userId UUID REFERENCES users(id),
  category VARCHAR(100),
  rating DECIMAL DEFAULT 0,
  tier VARCHAR(50),
  specs JSON,
  availability BOOLEAN DEFAULT true,
  workingHours JSON,
  gps_lat DECIMAL,
  gps_lng DECIMAL,
  missedCount INTEGER DEFAULT 0,
  activeRequestId UUID,
  topRated BOOLEAN DEFAULT false,
  blacklisted BOOLEAN DEFAULT false,
  totalJobs INTEGER DEFAULT 0,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);
```

**Source:** `prisma/schema.prisma` `service_hub_profiles` model

#### Service Hub Requests Table
```sql
CREATE TABLE service_hub_requests (
  id UUID PRIMARY KEY,
  userId UUID REFERENCES users(id),
  providerId UUID REFERENCES users(id),
  specialty VARCHAR(100),
  status VARCHAR(50) DEFAULT 'pending',
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);
```

**Source:** `prisma/schema.prisma` `service_hub_requests` model

#### Service Hub Ratings Table
```sql
CREATE TABLE service_hub_ratings (
  id UUID PRIMARY KEY,
  requestId UUID REFERENCES service_hub_requests(id),
  rating INTEGER,
  comment TEXT,
  createdAt TIMESTAMP DEFAULT NOW()
);
```

**Source:** `prisma/schema.prisma` `service_hub_ratings` model

#### Service Hub Feedback Table
```sql
CREATE TABLE service_hub_feedback (
  id UUID PRIMARY KEY,
  requestId UUID REFERENCES service_hub_requests(id),
  feedback TEXT,
  flags JSON,
  createdAt TIMESTAMP DEFAULT NOW()
);
```

**Source:** `prisma/schema.prisma` `service_hub_feedback` model

### 1.2 API Endpoints

| Endpoint | Method | Auth | Purpose |
|---|---|---|---|
| `/api/service-hub/profile` | GET | Auth | Get service profile |
| `/api/service-hub/profile` | POST | Auth | Create/update profile |
| `/api/service-hub/profile/cv` | POST | Auth | Upload CV |
| `/api/service-hub/profile/excuse` | POST | Auth | Excuse from request |
| `/api/service-hub/profile/availability` | PATCH | Auth | Toggle availability |
| `/api/service-hub/requests` | POST | Auth | Create service request |
| `/api/service-hub/requests` | GET | Auth | List requests |
| `/api/service-hub/requests/:id/accept` | POST | Auth | Accept request |
| `/api/service-hub/requests/:id/complete` | POST | Auth | Complete request |
| `/api/service-hub/ratings` | POST | Auth | Rate service |
| `/api/service-hub/feedback` | POST | Auth | Submit feedback |
| `/api/service-hub/providers` | GET | Public | List providers |
| `/api/service-hub/providers/:id` | GET | Public | Provider detail |

**Source:** `server/api/src/routes/service-hub.ts`

### 1.3 Features

| Feature | Implementation | Evidence |
|---|---|---|
| Provider profile | Full CRUD | `ServiceHub.tsx` |
| Service request | Create/accept/complete | `api/service-hub.ts` |
| Provider rating | 1-5 rating | `service_hub_ratings` table |
| Client feedback | Text feedback | `service_hub_feedback` table |
| Availability toggle | Boolean flag | `service_hub_profiles.availability` |
| CV upload | File upload | `api/service-hub.ts` |
| Provider search | Category/city/tier/topRated | `api/service-hub.ts` |
| GPS tracking | Lat/lng | `service_hub_profiles.gps_*` |
| Missed count | Integer | `service_hub_profiles.missedCount` |
| Active request | UUID | `service_hub_profiles.activeRequestId` |
| Top rated | Boolean | `service_hub_profiles.topRated` |
| Blacklisted | Boolean | `service_hub_profiles.blacklisted` |
| Total jobs | Integer | `service_hub_profiles.totalJobs` |

---

## 2. V2.0 Service System

### 2.1 Database Schema

V2.0 has services via content runtime:

```sql
CREATE TABLE services (
  id UUID PRIMARY KEY,
  category_id UUID,
  provider_id UUID REFERENCES users(id),
  title VARCHAR(255),
  title_ar VARCHAR(255),
  description TEXT,
  description_ar TEXT,
  price DECIMAL,
  currency VARCHAR(10),
  city VARCHAR(100),
  country VARCHAR(10),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Source:** `lib/content-schema.ts`

### 2.2 API Endpoints

| Endpoint | Method | Auth | Purpose |
|---|---|---|---|
| `/api/services/categories` | GET | Public | List categories |
| `/api/services` | GET | Public | List services |
| `/api/services/[id]` | GET | Public | Service detail |
| `/api/services` | POST | Auth | Create service |
| `/api/services/[id]` | PATCH | Auth | Update service |

**Source:** `app/api/services/`

### 2.3 Features

| Feature | Implementation | Evidence |
|---|---|---|
| Service listing | Full CRUD | `api/services/` |
| Category browsing | Hierarchical | `api/services/categories` |
| Provider profiles | Basic | `app/providers/[id]/page.tsx` |
| Service requests | Basic | `app/dashboard/services/` |

---

## 3. Critical Differences

### 3.1 V1 Had Dispatching

V1 had a real-time dispatch system:
- GPS tracking
- Active request tracking
- Missed count
- Working hours
- Availability toggle

### 3.2 V2.0 Lacks Dispatching

V2.0 has basic service listings without real-time dispatch.

### 3.3 V1 Had Two-Way Reputation

V1 had:
- Customer rates provider
- Provider rates customer
- Client feedback with flags
- Trust score calculation

### 3.4 V2.0 Lacks Two-Way Reputation

V2.0 has basic ratings without two-way feedback.

### 3.5 V1 Had Provider Tiers

V1 had provider tiers:
- Top rated
- Blacklisted
- Tier-based sorting

### 3.6 V2.0 Lacks Provider Tiers

V2.0 has no provider tier system.

---

## 4. Recommended Service Architecture

### 4.1 Provider Profile

| Field | Type | Purpose |
|---|---|---|
| userId | UUID | User reference |
| category | String | Service category |
| rating | Decimal | Average rating |
| tier | String | Provider tier |
| availability | Boolean | Availability flag |
| workingHours | JSON | Working hours |
| gps_lat | Decimal | GPS latitude |
| gps_lng | Decimal | GPS longitude |
| missedCount | Integer | Missed requests |
| activeRequestId | UUID | Active request |
| topRated | Boolean | Top rated flag |
| blacklisted | Boolean | Blacklisted flag |
| totalJobs | Integer | Total completed jobs |

### 4.2 Service Request

| Field | Type | Purpose |
|---|---|---|
| userId | UUID | Customer |
| providerId | UUID | Provider |
| specialty | String | Service type |
| status | String | pending/accepted/completed |
| createdAt | Timestamp | Creation time |

### 4.3 Dispatching

| Status | Description |
|---|---|
| pending | Request created |
| ringing | Provider notified |
| accepted | Provider accepted |
| rejected | Provider rejected |
| timeout | Request timed out |
| completed | Job completed |
| cancelled | Request cancelled |

### 4.4 Two-Way Reputation

| Direction | Rating | Feedback |
|---|---|---|
| Customer → Provider | 1-5 stars | Text comment |
| Provider → Customer | 1-5 stars | Text comment |
| Customer flags | Boolean | Abuse flag |
| Provider flags | Boolean | Abuse flag |

---

## 5. V1 Service Features Missing in V2.0

| Feature | V1 Status | V2.0 Status | Gap |
|---|---|---|---|
| GPS tracking | FULL | MISSING | HIGH |
| Active request tracking | FULL | MISSING | HIGH |
| Missed count | FULL | MISSING | MEDIUM |
| Working hours | FULL | MISSING | MEDIUM |
| Availability toggle | FULL | FULL | NONE |
| CV upload | FULL | MISSING | MEDIUM |
| Provider search | FULL | FULL | NONE |
| Top rated | FULL | MISSING | MEDIUM |
| Blacklisted | FULL | MISSING | HIGH |
| Total jobs | FULL | MISSING | LOW |
| Client feedback | FULL | MISSING | HIGH |
| Client flags | FULL | MISSING | HIGH |
| Dispatching | FULL | MISSING | CRITICAL |

---

**Status:** COMPLETE  
**Application Source Files Modified:** ZERO
