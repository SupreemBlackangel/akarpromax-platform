# 12_ORGANIZATIONS_OFFICES_COMPANIES.md
# Organizations, Offices & Companies Audit

**Audit Date:** 2026-08-19  
**Mode:** READ-ONLY

---

## 1. V1 Office System

### 1.1 Database Schema

#### Offices Table
```sql
CREATE TABLE offices (
  id UUID PRIMARY KEY,
  name VARCHAR(255),
  nameAr VARCHAR(255),
  city VARCHAR(100),
  phone VARCHAR(50),
  email VARCHAR(255),
  licenseNumber VARCHAR(100),
  rating DECIMAL DEFAULT 0,
  userId UUID REFERENCES users(id),
  isVerified BOOLEAN DEFAULT false,
  canCreateAuctions BOOLEAN DEFAULT false,
  isAuctionsBanned BOOLEAN DEFAULT false,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);
```

**Source:** `prisma/schema.prisma` `offices` model

### 1.2 API Endpoints

| Endpoint | Method | Auth | Purpose |
|---|---|---|---|
| `/api/offices` | GET | Public | List offices |
| `/api/offices/:id` | GET | Public | Office detail |
| `/api/offices/:id/properties` | GET | Public | Office properties |
| `/api/offices` | POST | Auth | Create office |
| `/api/offices/:id` | PUT | Auth | Update office |

**Source:** `server/api/src/routes/offices.ts`

### 1.3 Features

| Feature | Implementation | Evidence |
|---|---|---|
| Office CRUD | Full CRUD | `api/offices.ts` |
| Office verification | Admin approval | `offices.isVerified` |
| Auction permission | Admin toggle | `offices.canCreateAuctions` |
| Auction ban | Admin ban | `offices.isAuctionsBanned` |
| Rating system | Multi-factor | `office_rating_snapshots` table |
| Properties | Office properties | `properties.officeId` |
| Reviews | Office reviews | `office_rating_snapshots` |

---

## 2. V1 Company System

### 2.1 Database Schema

Companies used the `users` table with `userType = 'COMPANY'`:

| Field | Type | Purpose |
|---|---|---|
| userId | UUID | User reference |
| companyName | String | Company name |
| licenseNumber | String | License number |

### 2.2 Features

| Feature | Implementation | Evidence |
|---|---|---|
| Company creation | Registration | `CreateCompany.tsx` |
| Account switching | Personal/company | `CompanyContext.tsx` |
| Supervisor management | Add supervisors | `CompanyContext.tsx` |
| Company profile | Profile editing | `MyCompanies.tsx` |

---

## 3. V2.0 Organization System

### 3.1 Database Schema

V2.0 has organizations via `organizations` table:

```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY,
  name VARCHAR(255),
  name_ar VARCHAR(255),
  type VARCHAR(50), -- office/company
  country VARCHAR(10),
  city VARCHAR(100),
  phone VARCHAR(50),
  email VARCHAR(255),
  license_number VARCHAR(100),
  is_verified BOOLEAN DEFAULT false,
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Source:** `lib/db/schemas/organizations-schema.ts`

### 3.2 API Endpoints

| Endpoint | Method | Auth | Purpose |
|---|---|---|---|
| `/api/organizations` | GET | Public | List organizations |
| `/api/organizations/[id]` | GET | Public | Organization detail |
| `/api/organizations` | POST | Auth | Create organization |
| `/api/organizations/[id]` | PATCH | Auth | Update organization |
| `/api/organizations/[id]/members` | GET/POST | Auth | Member management |

**Source:** `app/api/organizations/`

### 3.3 Features

| Feature | Implementation | Evidence |
|---|---|---|
| Organization CRUD | Full CRUD | `api/organizations/` |
| Organization verification | Admin approval | `organizations.is_verified` |
| Member management | Full CRUD | `api/organizations/[id]/members` |
| Organization profiles | Office/Company | `app/offices/`, `app/companies/` |

---

## 4. Critical Differences

### 4.1 V1 Had Separate Office/Company Tables

V1 had separate handling for offices and companies. V2.0 unified them into `organizations`.

### 4.2 V1 Had Account Switching

V1 allowed users to switch between personal/company accounts. V2.0 lacks this.

### 4.3 V1 Had Office Rating System

V1 had a multi-factor office rating system:
- Overall score
- Badge (Bronze/Silver/Gold)
- Completion rate
- Response speed
- Complaint score
- Manipulation score
- Client rating

### 4.4 V2.0 Lacks Office Rating System

V2.0 has basic verification but no rating system.

### 4.5 V1 Had Auction Permissions

V1 had per-office auction permissions:
- `canCreateAuctions`
- `isAuctionsBanned`

### 4.6 V2.0 Lacks Auction Permissions

V2.0 has no per-office auction permissions.

---

## 5. Recommended Organization Architecture

### 5.1 Organization Types

| Type | Description |
|---|---|
| office | Real estate office |
| company | Corporate account |

### 5.2 Organization Roles

| Role | Description | Capabilities |
|---|---|---|
| owner | Organization owner | Full management |
| manager | Organization manager | Member management, property management |
| member | Organization member | View-only access |

### 5.3 Organization Permissions

| Permission | Description |
|---|---|
| organization.profile.edit | Edit organization profile |
| organization.members.read | View members |
| organization.members.invite | Invite members |
| organization.members.remove | Remove members |
| organization.properties.create | Create properties |
| organization.properties.edit | Edit properties |
| organization.leads.read | View leads |
| organization.messages.read | View messages |
| organization.analytics.read | View analytics |

### 5.4 Organization Verification

| Type | Requirements | Badge |
|---|---|---|
| Office Verified | CR number, license | ✓ Office |
| Company Verified | CR number, documents | ✓ Company |

---

## 6. V1 Organization Features Missing in V2.0

| Feature | V1 Status | V2.0 Status | Gap |
|---|---|---|---|
| Account switching | FULL | MISSING | HIGH |
| Supervisor management | FULL | MISSING | MEDIUM |
| Office rating system | FULL | MISSING | HIGH |
| Auction permissions | FULL | MISSING | MEDIUM |
| Auction ban | FULL | MISSING | MEDIUM |
| Verification workflow | FULL | FULL | NONE |
| Member management | FULL | FULL | NONE |
| Branch management | FULL | FULL | NONE |

---

**Status:** COMPLETE  
**Application Source Files Modified:** ZERO
