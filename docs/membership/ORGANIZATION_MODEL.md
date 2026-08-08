# ORGANIZATION MODEL

## 1. Core Principle

**ONE Organization Engine** for all entity types.

No separate systems:
- ❌ RealEstateCompanyEngine
- ❌ ContractorCompanyEngine
- ❌ EngineeringCompanyEngine

**ONE Organization** adapts via:
- type
- categories
- specializations
- services
- country
- permissions

## 2. Organization Entity

```
Organization
├── id (uuid PK)
├── name_ar/en/tr
├── slug (unique, normalized)
├── type (real_estate, business, other)
├── classification (startup, sme, established, enterprise)
├── country_code
├── city_id, district_id
├── latitude, longitude
├── logo_url, cover_url
├── description_ar/en/tr
├── website_url
├── contact_email, contact_phone
├── status (draft, pending_review, active, suspended, deleted)
├── verified_at, approved_at, suspended_at
├── created_at, updated_at
│
├── Members[] (0:N via OrganizationMembership)
├── Branches[] (0:N via OrganizationBranch)
├── VerificationRecords[] (0:N)
├── ReputationProfile (1:1)
├── Properties[] (0:N, if real_estate)
└── Services[] (0:N, if business)
```

## 3. Organization Types

| Type | Arabic | Description |
|------|--------|-------------|
| REAL_ESTATE | عقاري | Real estate offices, property companies |
| BUSINESS | تجاري | General business entities |
| OTHER | أخرى | Non-classified organizations |

## 4. Organization Classification

| Classification | Arabic | Description |
|---------------|--------|-------------|
| STARTUP | شركة ناشئة | New business, < 2 years |
| SME | شركة صغيرة ومتوسطة | Small-medium enterprise |
| ESTABLISHED | شركة راسخة | Established business, > 5 years |
| ENTERPRISE | شركة كبرى | Large enterprise |

**Classification ≠ Reputation.**

Example:
```
Startup + Verified + Gold
Enterprise + Unverified + New
```

Both are valid scenarios.

## 5. Organization Membership

```
OrganizationMembership
├── id (uuid PK)
├── organization_id (FK → Organization)
├── user_id (FK → User)
├── role (owner, admin, manager, agent, member)
├── status (active, inactive, pending)
├── joined_at
├── invited_by
│
└── UNIQUE(organization_id, user_id)
```

### Roles

| Role | Permissions |
|------|------------|
| OWNER | Full control, delete org, transfer ownership |
| ADMIN | Manage members, settings, content |
| MANAGER | Manage daily operations, branches, team |
| AGENT | Manage properties, listings, leads |
| MEMBER | View-only, limited actions |

## 6. Organization Branches

```
OrganizationBranch
├── id (uuid PK)
├── organization_id (FK → Organization)
├── name_ar/en
├── country_code, city_id, district_id
├── governorate, village, street
├── address_ar/en
├── phone, email
├── latitude, longitude
├── status (active, inactive)
├── working_hours (JSON)
├── service_areas (JSON)
```

### Branch Philosophy

Branches are NOT independent organizations. They are:
- Physical locations of the same organization
- Sharing the same verification/reputation
- Managed by the parent organization
- Linked to the same membership structure

## 7. Multi-Branch Support

```
Organization
├── Main Office
│   ├── Branch 1 (Headquarters)
│   ├── Branch 2 (City Center)
│   └── Branch 3 (Industrial Area)
```

Each branch can have:
- Independent location
- Independent contact info
- Independent working hours
- Independent service areas
- Shared verification/reputation

## 8. Country-Aware Design

**NOT hardcoded for Saudi Arabia.**

Organization model is country-aware:
- `country_code` on Organization
- Country-specific fields
- Country-specific verification
- Country-specific classification thresholds
- Multi-country support

## 9. Real Estate Organization Profile

```
Cover Image
Logo
Organization Name

Verification
├── ✓ البريد (Email)
├── ✓ الهاتف (Phone)
├── ✓ المنشأة (Organization)
├── ✓ الترخيص (License)
└── ✓ العنوان (Address)

Reputation Level: GOLD
Activity: Active
Location: Muscat, Oman

Metrics
├── التقييم (Rating): 4.8
├── العقارات النشطة (Active Properties): 45
├── معدل الاستجابة (Response Rate): 95%
├── وقت الاستجابة (Response Time): 2 hours
└── الخبرة (Experience): 5 years

Sections
├── نظرة عامة (Overview)
├── العقارات (Properties)
├── الخدمات (Services)
├── الفريق (Team)
├── الفروع (Branches)
├── التقييمات (Reviews)
└── عن الشركة (About)
```

## 10. Business Organization Profile

```
Cover Image
Logo
Company Name

Verification
├── ✓ البريد (Email)
├── ✓ الهاتف (Phone)
├── ✓ المنشأة (Organization)
└── ✓ الترخيص (License)

Reputation Level: DISTINGUISHED
Activity: Active
Availability: Available

Metrics

Sections
├── نظرة عامة (Overview)
├── الخدمات (Services)
├── التخصصات (Specializations)
├── المشاريع (Projects)
├── الأعمال (Portfolio)
├── الفريق (Team)
├── الفروع (Branches)
├── التقييمات (Reviews)
└── عن الشركة (About)
```

## 11. Organization Onboarding Wizard

### Step 1: Organization Type
- Real Estate
- Business
- Other

### Step 2: Basic Info
- Trade name (ar/en)
- Country
- City

### Step 3: Registration Data
- Commercial registration number
- Tax number
- Registration date

### Step 4: Licenses
- License type
- License number
- Expiry date
- Document upload

### Step 5: Address/Location
- Full address
- Latitude/longitude
- Map picker

### Step 6: Branches
- Add branches (optional)
- Branch details

### Step 7: Specializations/Services
- Categories
- Services offered
- Service areas

### Step 8: Branding
- Logo upload
- Cover image upload
- Description

### Step 9: Contact
- Contact person
- Email
- Phone
- WhatsApp

### Step 10: Verification Documents
- Upload verification documents
- Declaration

### Step 11: Review & Submit
- Review all information
- Submit for approval

## 12. Organization and Services Integration

### Read Contracts

Organization data feeds into:
- Service provider profiles
- Directory search
- Matching algorithm
- Trust signals

### Write Contracts

Services marketplace writes:
- Service listings (org-scoped)
- Service requests (org-scoped)
- Reviews (org-attributed)

**AMRS does NOT own service requests.** It provides context.

## 13. Organization and Properties Integration

### Read Contracts

Organization data feeds into:
- Property listings (org-scoped)
- Directory search
- Trust signals

### Write Contracts

Properties domain writes:
- Property listings (org-scoped)
- Property views (org-attributed)

**AMRS does NOT own property listings.** It provides context.

## 14. Organization and Office Integration

### Read Contracts

Organization data feeds into:
- Office device pairing
- Office sync
- Office radar

### Write Contracts

Office integration writes:
- Device status
- Sync operations
- Radar queries

**AMRS does NOT own office integration.** It provides context.

## 15. Duplicate Prevention

### Tables NOT to Create

- ❌ companies (use organizations)
- ❌ offices (use sponsor_branches + organization_branches)
- ❌ business_profiles (use organization_profiles)
- ❌ real_estate_companies (use organizations with type=real_estate)

### Tables to Reuse

- ✅ organizations (new)
- ✅ organization_members (new)
- ✅ organization_branches (new)
- ✅ sponsor_profiles (extend for legacy)
- ✅ sponsor_branches (reuse for legacy)

## 16. Module Ownership

| Entity | Owner | AMRS Access |
|--------|-------|-------------|
| Organizations | AMRS | Full CRUD |
| Organization Members | AMRS | Full CRUD |
| Organization Branches | AMRS | Full CRUD |
| Properties | Properties | Read-only |
| Services | Services | Read-only |
| Office | Office | Read-only |
| Verification | AMRS | Full CRUD |
| Reputation | AMRS | Full CRUD |
