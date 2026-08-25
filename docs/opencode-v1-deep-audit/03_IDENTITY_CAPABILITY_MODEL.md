# 03_IDENTITY_CAPABILITY_MODEL.md
# Identity, Capability & Authorization Model

**Audit Date:** 2026-08-19  
**Mode:** READ-ONLY

---

## 1. V1 Identity Model

### 1.1 User Types (V1)

| User Type | Description | Registration Path | Capabilities |
|---|---|---|---|
| INDIVIDUAL | Regular user | Standard registration | Browse, favorite, inquire, message |
| ARTISAN | Service provider | Upgrade from INDIVIDUAL | + Provide services, receive requests |
| REALTOR | Real estate agent | Professional registration | + List properties, manage office |
| OFFICE | Real estate office | Office registration | + Create auctions, manage agents |
| COMPANY | Corporate account | Company registration | + Company profile, member management |

**Source:** `AuthContext.tsx` lines 45-52, `Register.tsx`

### 1.2 Roles (V1)

| Role | Description | Assignment | Capabilities |
|---|---|---|---|
| user | Default role | Auto-assigned on registration | Standard user capabilities |
| moderator | Content moderator | Admin-assigned via `/admin/moderators` | + Approve/reject content, view reports |
| admin | Platform administrator | Database role assignment | + Full admin access, user management |

**Source:** `AuthContext.tsx` lines 54-60, `roles` table, `moderators` table

### 1.3 Identity Attributes (V1)

| Attribute | Type | Purpose |
|---|---|---|
| id | UUID | Unique identifier |
| username | String | Public handle |
| email | String | Login credential |
| passwordHash | String | bcrypt hash |
| fullName | String | Display name |
| role | Enum | user/moderator/admin |
| status | Enum | active/pending/banned |
| userType | Enum | INDIVIDUAL/ARTISAN/REALTOR/OFFICE/COMPANY |
| isVerified | Boolean | Identity verified |
| tokenBalance | Integer | Token wallet balance |
| nationalId | String | National ID number |
| idImageUrl | String | ID card image |
| headline | String | Professional headline |
| bio | String | Biography |
| companyName | String | Company name |
| licenseNumber | String | Professional license |
| interestedCities | JSON | Cities of interest for notifications |
| isBannedFromAuctions | Boolean | Auction ban flag |

**Source:** `prisma/schema.prisma` `users` model

---

## 2. V2.0 Identity Model

### 2.1 User Types (V2.0)

V2.0 uses a simplified model with role-based capabilities:

| Role | Description | Capabilities |
|---|---|---|
| super_admin | Super administrator | Full platform access |
| admin | Administrator | Admin dashboard access |
| user | Regular user | Standard user capabilities |

**Source:** `src/constants/roles.ts`, `lib/auth/identity-map.ts`

### 2.2 Permission System (V2.0)

V2.0 uses a permission catalog with fine-grained permissions:

| Permission | Description |
|---|---|
| SETTINGS_MANAGE | Manage system settings |
| USERS_MANAGE | Manage users |
| PROPERTIES_MANAGE | Manage properties |
| ADS_MANAGE | Manage advertisements |
| ORGANIZATIONS_MANAGE | Manage organizations |
| CONTENT_MANAGE | Manage content |
| ANALYTICS_VIEW | View analytics |
| VERIFICATION_MANAGE | Manage verifications |

**Source:** `src/constants/roles.ts` lines 99-120

### 2.3 Identity Attributes (V2.0)

| Attribute | Type | Purpose |
|---|---|---|
| id | UUID | Unique identifier |
| email | String | Login credential |
| passwordHash | String | PBKDF2 hash |
| name | String | Display name |
| role | Enum | super_admin/admin/user |
| isActive | Boolean | Account active flag |
| createdAt | Timestamp | Account creation |
| updatedAt | Timestamp | Last update |

**Source:** `lib/db/schema.ts` `users` table

---

## 3. Critical Differences

### 3.1 V1 Had Multiple User Types

V1 explicitly distinguished between:
- INDIVIDUAL (regular user)
- ARTISAN (service provider)
- REALTOR (real estate agent)
- OFFICE (real estate office)
- COMPANY (corporate account)

Each had different registration flows, profiles, and capabilities.

### 3.2 V2.0 Uses Role-Based System

V2.0 collapsed all user types into a single `users` table with role-based permissions. This simplifies the model but loses the explicit user type distinction.

### 3.3 V1 Had Explicit Moderators Table

V1 stored moderator assignments in a separate `moderators` table with foreign keys to `users` and `roles`. This allowed:
- Multiple moderators per role
- Moderator-specific capabilities
- Moderator activity tracking

### 3.4 V2.0 Uses Role Field

V2.0 stores the role directly on the `users` table. This is simpler but less flexible.

---

## 4. Recommendation: ONE USER, ONE LOGIN, ONE IDENTITY

### 4.1 Core Principle

A user should have:
- ONE identity (email/password)
- ONE login (JWT session)
- MULTIPLE capabilities (assigned via roles/permissions)
- MULTIPLE profiles (personal, professional, office member, company member)
- MULTIPLE memberships (organizations they belong to)

### 4.2 Capability Model

```
USER
├── IDENTITY (email, password, name)
├── CAPABILITIES (assigned via roles)
│   ├── browse_properties
│   ├── create_properties
│   ├── message_users
│   ├── provide_services
│   ├── manage_office
│   ├── manage_company
│   ├── moderate_content
│   └── admin_access
├── PROFILES
│   ├── PERSONAL (always exists)
│   ├── PROFESSIONAL (optional)
│   ├── OFFICE_MEMBER (optional)
│   ├── COMPANY_MEMBER (optional)
│   └── SERVICE_PROVIDER (optional)
├── MEMBERSHIPS
│   ├── OFFICE:<office-id> (role: agent/manager/owner)
│   ├── COMPANY:<company-id> (role: member/manager/owner)
│   └── ORGANIZATION:<org-id> (role: member/admin)
├── VERIFICATION
│   ├── IDENTITY_VERIFIED (boolean)
│   ├── PROFESSIONAL_VERIFIED (boolean)
│   ├── OFFICE_VERIFIED (boolean)
│   └── COMPANY_VERIFIED (boolean)
├── REPUTATION
│   ├── RANK (NEW/RISING/DISTINGUISHED/GOLD/PROMAX)
│   ├── TRUST_SCORE (0-100)
│   └── REVIEWS (from services/transactions)
└── SUBSCRIPTION
    ├── PLAN (free/basic/pro/enterprise)
    └── STATUS (active/expired/cancelled)
```

### 4.3 Separation of Concerns

| Concept | Definition | Example |
|---|---|---|
| IDENTITY | Who the user IS | email: user@example.com |
| ROLE | What the user CAN DO | moderator, admin |
| PERMISSION | Specific action allowed | properties.approve |
| CAPABILITY | Feature access | create_auction |
| ORGANIZATION MEMBERSHIP | Belonging to an org | Member of Office X |
| ORGANIZATION ROLE | Role within org | Manager of Office X |
| REPUTATION RANK | Trust level | GOLD |
| VERIFICATION | Identity confirmation | Identity Verified |
| SUBSCRIPTION | Paid plan | Pro Plan |
| ACCOUNT STATUS | Account state | Active, Suspended |

### 4.4 Critical Rule

**PROMAX rank MUST NOT imply administrative permissions.**

A user may be:
- One identity
- A professional
- Member of an office
- Manager inside that office
- GOLD reputation rank

Without being a platform moderator.

---

## 5. V1 Identity Fragmentation Issues

### 5.1 Company Account Switching

V1 allowed users to create companies and switch between personal/company accounts. This created confusion about which identity was active.

### 5.2 Multiple Registration Paths

V1 had different registration flows for:
- Individual
- Professional
- Company

This led to inconsistent user experiences and data duplication.

### 5.3 User Type vs Role Confusion

V1 conflated `userType` (INDIVIDUAL/ARTISAN/REALTOR/OFFICE/COMPANY) with `role` (user/moderator/admin), making it unclear which controlled capabilities.

---

## 6. V2.0 Improvements

### 6.1 Simplified Model

V2.0 collapsed user types into a single `users` table with role-based permissions. This is cleaner and easier to maintain.

### 6.2 Permission Catalog

V2.0 introduced a permission catalog with fine-grained permissions. This allows more precise access control.

### 6.3 OAuth Integration

V2.0 added social login (Google + Facebook) via OAuth, which V1 lacked.

---

## 7. Recommended Final Architecture

### 7.1 User Table

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user',
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 7.2 User Profiles Table

```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  profile_type VARCHAR(50) NOT NULL, -- personal/professional/office/company
  headline VARCHAR(255),
  bio TEXT,
  license_number VARCHAR(100),
  company_name VARCHAR(255),
  national_id VARCHAR(100),
  id_image_url VARCHAR(500),
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 7.3 User Capabilities Table

```sql
CREATE TABLE user_capabilities (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  capability VARCHAR(100) NOT NULL,
  granted_at TIMESTAMP DEFAULT NOW(),
  granted_by UUID REFERENCES users(id),
  expires_at TIMESTAMP,
  UNIQUE(user_id, capability)
);
```

### 7.4 Organization Memberships Table

```sql
CREATE TABLE organization_memberships (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  organization_id UUID REFERENCES organizations(id),
  role VARCHAR(50) NOT NULL, -- member/manager/owner
  joined_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, organization_id)
);
```

---

**Status:** COMPLETE  
**Application Source Files Modified:** ZERO
