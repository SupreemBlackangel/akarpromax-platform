# 07_V1_IDENTITY_ACCOUNT_CAPABILITY_MODEL.md
# V1 Identity & Account Capability Model

**Audit Date:** 2026-08-19  
**Mode:** READ-ONLY — V1 Source Archaeology

---

## 1. V1 Identity Model

### 1.1 Core Question: One Identity or Multiple?

**Answer:** V1 intended ONE identity with MULTIPLE capabilities.

A single `users` record represents one person. That person can be:
- A buyer (default)
- A seller (when listing properties)
- A professional (when registering as ARTISAN/REALTOR)
- An office owner (when creating an office)
- A company member (when joining a company)
- A marketer (when creating marketer profile)
- A moderator (when assigned by admin)
- An admin (when role is set to "admin")

### 1.2 UserType Enum

| Value | Description | Registration Path |
|---|---|---|
| INDIVIDUAL | Regular user | Standard registration |
| ARTISAN | Craftsman/tradesperson | Upgrade from INDIVIDUAL |
| REALTOR | Real estate agent | Professional registration |
| OFFICE | Real estate office | Office registration |
| COMPANY | Corporate account | Company registration |

**Source:** `UserType` enum in `schema.prisma`

### 1.3 Role Field

| Value | Description | Assignment |
|---|---|---|
| user | Default role | Auto-assigned on registration |
| moderator | Content moderator | Admin-assigned via moderators table |
| admin | Platform administrator | Database role assignment |

**Source:** `users.role` field

---

## 2. Account Switching

### 2.1 Company Account Switching

V1 allowed users to create companies and switch between personal/company accounts.

**Implementation:** `CompanyContext.tsx` — `switchAccount(type: 'personal' | 'company')`

**Source:** `src/contexts/CompanyContext.tsx`

### 2.2 Profile Upgrades

V1 supported profile upgrades:

| From | To | Process |
|---|---|---|
| INDIVIDUAL | ARTISAN | Upgrade form |
| INDIVIDUAL | REALTOR | Professional registration |
| INDIVIDUAL | OFFICE | Office creation |
| INDIVIDUAL | COMPANY | Company creation |

**Source:** `Register.tsx`, `UpgradeToArtisan.tsx`

---

## 3. User Type Capabilities

### 3.1 INDIVIDUAL (Regular User)

| Capability | Evidence |
|---|---|
| Browse properties | `Properties.tsx` |
| Favorite properties | `useFavorites.ts` |
| Create property requests | `MyPropertyRequests.tsx` |
| Submit inquiries | `PropertyDetail.tsx` |
| Message other users | `ChatWidget.tsx` |
| View offices | `Offices.tsx` |
| View services | `OtherServices.tsx` |
| View blog | `Blog.tsx` |
| View suppliers | `Suppliers.tsx` |
| View software | `Software.tsx` |
| View auctions | `Auctions.tsx` |
| View tenders | `Tenders.tsx` |
| View tools | `Tools.tsx` |
| View market data | `MarketHistory.tsx` |
| View investment radar | `InvestmentRadar.tsx` |

### 3.2 ARTISAN (Craftsman)

**Additional Capabilities:**

| Capability | Evidence |
|---|---|
| Create service profile | `ServiceHub.tsx` |
| Receive service requests | `api/service-hub.ts` |
| Accept/decline requests | `api/service-hub.ts` |
| Complete jobs | `api/service-hub.ts` |
| Receive ratings | `service_hub_ratings` |
| Set availability | `api/service-hub.ts` |
| Upload CV | `api/service-hub.ts` |
| View artisan dashboard | `ArtisanDashboard.tsx` |

### 3.3 REALTOR (Real Estate Agent)

**Additional Capabilities:**

| Capability | Evidence |
|---|---|
| List properties | `SubmitProperty.tsx` |
| Manage properties | `Dashboard.tsx` |
| View property requests | `OfficeRequests.tsx` |
| Submit offers | `api/property-requests.ts` |
| View inquiries | `api/inquiries.ts` |
| Create office | `Offices.tsx` |
| Professional profile | `DashboardProfile.tsx` |

### 3.4 OFFICE (Real Estate Office)

**Additional Capabilities:**

| Capability | Evidence |
|---|---|
| Create office profile | `Offices.tsx` |
| Manage office properties | `Dashboard.tsx` |
| Create auctions | `AuctionDetail.tsx` |
| Manage auction settings | `AdminAuctions.tsx` |
| View office analytics | `Dashboard.tsx` |
| Verify office | `AdminVerification.tsx` |
| Manage members | `AdminMembership.tsx` |

### 3.5 COMPANY (Corporate Account)

**Additional Capabilities:**

| Capability | Evidence |
|---|---|
| Create company profile | `CreateCompany.tsx` |
| Switch accounts | `CompanyContext.tsx` |
| Manage supervisors | `CompanyContext.tsx` |
| Company branding | `MyCompanies.tsx` |
| Company analytics | `Dashboard.tsx` |

---

## 4. Profile Types

### 4.1 Personal Profile

**Fields:**
- fullName, firstName, lastName, middleName
- gender, birthDate
- phone, avatar
- bio, headline
- country, city, address, geoLink
- profession, craftType, experienceYears, workDescription
- nationalId, idImageUrl (verification)
- interestedCities (notifications)

### 4.2 Professional Profile

**Additional Fields:**
- licenseNumber
- identityImages
- isOfficial
- isVerified

### 4.3 Office Profile

**Table:** `offices`

**Fields:**
- name, nameAr
- city, cityAr, governorate
- phone, email
- imageUrl, description, descriptionAr
- licenseNumber
- propertyCount, rating
- isVerified, verifiedAt
- canCreateAuctions, isAuctionsBanned

### 4.4 Company Profile

**Via:** `CompanyContext.tsx`

**Fields:**
- companyName
- Branches
- Members
- Specialties
- Portfolio

### 4.5 Marketer Profile

**Table:** `marketer_profiles`

**Fields:**
- licenseNumber, licenseExpiry
- experienceYears, specialization
- bioAr, bioEn
- totalProperties, successfulDeals
- totalCommission, rating, reviewsCount
- status (PENDING/APPROVED/REJECTED)

### 4.6 Service Provider Profile

**Table:** `service_hub_profiles`

**Fields:**
- name, category
- rating, tier, isTopRated
- specs (JSON array)
- photoUrl, distanceKm

---

## 5. Verification Types

### 5.1 Identity Verification

**Table:** `identity_verifications`

**Workflow:**
1. User submits national ID + image
2. Admin reviews
3. Approve/Reject
4. Badge applied

**Fields:**
- nationalId, idImageUrl
- status (pending/approved/rejected)
- reviewedBy, reviewedAt, rejectReason

### 5.2 Professional Verification

**Via:** `users.licenseNumber`, `users.isOfficial`

**Workflow:**
1. User provides license number
2. Admin verifies
3. isOfficial flag set

### 5.3 Office Verification

**Via:** `offices.isVerified`, `offices.verifiedAt`

**Workflow:**
1. Office provides license number
2. Admin verifies
3. isVerified flag set
4. canCreateAuctions enabled

### 5.4 Marketer Verification

**Via:** `marketer_profiles.status`

**Workflow:**
1. Marketer registers
2. Admin reviews
3. Approve/Reject
4. Status set to APPROVED/REJECTED

---

## 6. Permission Model

### 6.1 Role-Based Access Control

**Table:** `roles` (permissions as JSON)

**Assignment:** `moderators` table (1 user = 1 role)

### 6.2 Permission Storage

Permissions stored as JSON in `roles.permissions`:

```json
{
  "properties": { "approve": true, "reject": true },
  "users": { "ban": true, "verify": true },
  "ads": { "create": true, "edit": true }
}
```

### 6.3 Authorization Checks

**Source:** `api/properties.ts`, `api/admin.ts`, etc.

**Pattern:**
```typescript
if (user.role !== 'admin' && user.role !== 'moderator') {
  return res.status(403).json({ error: 'Forbidden' });
}
```

---

## 7. Identity Fragments

### 7.1 V1 Violated Its Own Model

V1 created fragmented identities:

| Fragment | Issue |
|---|---|
| Company account switching | User could be personal OR company, not both simultaneously |
| Multiple registration paths | Different flows for individual/professional/company |
| UserType vs Role confusion | userType (INDIVIDUAL/ARTISAN/etc.) vs role (user/moderator/admin) |
| Separate partner accounts | Partners had independent login, not linked to user |

### 7.2 Partner Accounts

**Table:** `partners`

Partners had separate login credentials, not linked to `users` table.

**Fields:**
- email, passwordHash
- name, company

**Issue:** Fragmented identity — partner is not a user.

---

## 8. Reputation & Rank

### 8.1 User Reputation

**Fields on `users`:**
- `isVerified` — Identity verification
- `isOfficial` — Professional verification
- `experienceYears` — Experience

### 8.2 Office Reputation

**Table:** `office_rating_snapshots`

**Fields:**
- overallScore
- badge (Bronze/Silver/Gold)
- completionRate, responseSpeed
- complaintScore, manipulationScore
- clientRating

### 8.3 Provider Reputation

**Table:** `service_hub_profiles`

**Fields:**
- rating, tier, isTopRated

### 8.4 Marketer Reputation

**Table:** `marketer_profiles`

**Fields:**
- totalProperties, successfulDeals
- totalCommission, rating, reviewsCount
- rankId (MarketerRank)

---

## 9. Summary

### 9.1 V1 Identity Model

| Concept | Implementation |
|---|---|
| One identity | `users` table — single record per person |
| Multiple capabilities | UserType enum, role field, profile tables |
| Account switching | CompanyContext — personal/company toggle |
| Profile upgrades | Registration paths, upgrade forms |
| Verification | Identity, professional, office, marketer |
| Reputation | Per-domain (user, office, provider, marketer) |
| Permissions | Role-based with JSON permissions |

### 9.2 V1 Violations

| Violation | Issue |
|---|---|
| Partner accounts | Separate login, not linked to users |
| Company switching | Either/or, not simultaneous |
| UserType vs Role | Confusing dual system |

---

**Status:** COMPLETE  
**Application Source Files Modified:** ZERO
