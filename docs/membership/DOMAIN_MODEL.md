# AMRS DOMAIN MODEL

## Core Entities

### User
```
User
├── id (uuid PK)
├── email (unique)
├── phone (unique)
├── name
├── passwordHash
├── role (platform role - legacy, keep for backward compat)
├── status (pending_verification, active, disabled, suspended, deleted)
├── isActive
├── preferredLanguage (ar/en/tr)
├── onboardingCompletedAt
├── lastLoginAt
├── createdAt
│
├── ProfessionalProfile (optional, 1:1)
├── OrganizationMemberships[] (optional, 0:N)
└── VerificationRecords[] (optional, 0:N)
```

### ProfessionalProfile
```
ProfessionalProfile
├── id (uuid PK)
├── user_id (FK → User, unique)
├── display_name_ar/en
├── bio_ar/en
├── logo_url, cover_url
├── phone, whatsapp, email, website
├── country_code, city_id, district_id
├── latitude, longitude
├── service_radius_km
├── status (draft, submitted, under_review, approved, rejected, suspended)
├── verified_at, approved_at, suspended_at
├── rating_avg, rating_count
├── jobs_completed, completion_rate, response_rate
├── avg_response_time_min
├── licenses_text, insurance_text
├── founded_year, team_size
├── is_business, business_name
├── tax_number, commercial_registration
│
├── ProviderCategories[] (0:N)
├── ProviderDocuments[] (0:N)
├── ProviderPortfolio[] (0:N)
├── VerificationRecords[] (0:N)
└── ReputationProfile (1:1)
```

### Organization
```
Organization
├── id (uuid PK)
├── name_ar/en/tr
├── slug (unique)
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

### OrganizationMembership
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

### OrganizationBranch
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

### VerificationRecord
```
VerificationRecord
├── id (uuid PK)
├── entity_type (user, professional, organization)
├── entity_id (FK → User/ProfessionalProfile/Organization)
├── type (email, phone, identity, professional, organization, license, address)
├── status (pending, verified, failed, expired, revoked)
├── verified_at
├── expires_at
├── verified_by (admin user id)
├── source (system, manual, third_party)
├── country_code
├── document_url (encrypted, optional)
├── metadata (JSON, minimal)
├── created_at
│
└── UNIQUE(entity_type, entity_id, type)
```

### ReputationProfile
```
ReputationProfile
├── id (uuid PK)
├── entity_type (user, professional, organization)
├── entity_id (FK → User/ProfessionalProfile/Organization)
├── level (new, rising, distinguished, gold, promax)
├── score (0-1000, internal)
├── last_evaluated_at
├── policy_version
├── grace_period_ends_at
├── created_at, updated_at
│
├── Evaluations[] (0:N)
├── History[] (0:N)
└── UNIQUE(entity_type, entity_id)
```

### ReputationEvaluation
```
ReputationEvaluation
├── id (uuid PK)
├── reputation_id (FK → ReputationProfile)
├── policy_version
├── old_level
├── new_level
├── signals (JSON - per-signal scores)
├── reason
├── evaluated_at
├── admin_override (boolean)
├── admin_id (if override)
```

### ReputationHistory
```
ReputationHistory
├── id (uuid PK)
├── entity_type
├── entity_id
├── old_level
├── new_level
├── reason
├── evaluated_at
├── policy_version
```

### ActivityState
```
ActivityState
├── id (uuid PK)
├── entity_type (user, professional, organization)
├── entity_id
├── state (active, recently_active, low_activity, inactive)
├── last_meaningful_action_at
├── last_login_at
├── action_count_30d
├── evaluated_at
├── window_days (configurable)
```

### AvailabilityState
```
AvailabilityState
├── id (uuid PK)
├── entity_type (professional, organization)
├── entity_id
├── state (available, limited, unavailable)
├── reason (optional)
├── updated_at
├── updated_by
```

### ProfileStrength
```
ProfileStrength
├── id (uuid PK)
├── entity_type (user, professional, organization)
├── entity_id
├── score (0-100)
├── completed_fields (JSON array)
├── missing_fields (JSON array)
├── evaluated_at
```

### Badge
```
Badge
├── id (uuid PK)
├── code (unique)
├── name_ar/en/tr
├── description_ar/en/tr
├── icon_url
├── category (verification, achievement, milestone, special)
├── level_required (optional)
├── is_active
├── created_at
```

### EntityBadge
```
EntityBadge
├── id (uuid PK)
├── badge_id (FK → Badge)
├── entity_type
├── entity_id
├── awarded_at
├── awarded_by
├── expires_at (optional)
```

### Achievement
```
Achievement
├── id (uuid PK)
├── code (unique)
├── name_ar/en/tr
├── description_ar/en/tr
├── icon_url
├── category
├── target_count
├── is_active
```

### AchievementProgress
```
AchievementProgress
├── id (uuid PK)
├── achievement_id (FK → Achievement)
├── entity_type
├── entity_id
├── current_count
├── completed_at (nullable)
├── updated_at
```

## Entity Relationships

```
User 1──1 ProfessionalProfile
User 0──N OrganizationMembership
Organization 1──N OrganizationMembership
Organization 1──N OrganizationBranch
User 0──N VerificationRecord
ProfessionalProfile 0──N VerificationRecord
Organization 0──N VerificationRecord
User 1──0..1 ReputationProfile
ProfessionalProfile 1──1 ReputationProfile
Organization 1──1 ReputationProfile
ReputationProfile 1──N ReputationEvaluation
ReputationProfile 1──N ReputationHistory
User 1──1 ActivityState
ProfessionalProfile 1──1 ActivityState
Organization 1──1 ActivityState
ProfessionalProfile 1──1 AvailabilityState
Organization 1──1 AvailabilityState
User 1──1 ProfileStrength
ProfessionalProfile 1──1 ProfileStrength
Organization 1──1 ProfileStrength
Badge 0──N EntityBadge
Achievement 0──N AchievementProgress
```

## Cardinality Summary

- User → ProfessionalProfile: 0 or 1 (optional upgrade)
- User → Organization: 0 to N (member of multiple orgs)
- Organization → Branch: 0 to N
- Entity → VerificationRecord: 0 to N (multiple verification types)
- Entity → ReputationProfile: exactly 1 (auto-created)
- Entity → ActivityState: exactly 1 (auto-created)
- ProfessionalProfile → AvailabilityState: 0 or 1 (optional)
- Organization → AvailabilityState: 0 or 1 (optional)
- Entity → ProfileStrength: exactly 1 (auto-computed)
- Badge → EntityBadge: 0 to N
- Achievement → AchievementProgress: 0 to N

## Key Design Decisions

1. **ONE IDENTITY**: One User, one login, one AkarPromax identity. Professional/Organization are relationships, not separate accounts.

2. **REPUTATION PER ENTITY**: Professional reputation is independent of Organization reputation. No automatic inheritance.

3. **VERIFICATION IS RECORD-BASED**: Multiple verification types per entity, each with independent status and expiry.

4. **ACTIVITY ≠ REPUTATION**: Activity is platform usage. Reputation is trust + performance.

5. **PROFILE STRENGTH ≠ REPUTATION**: Profile completeness is separate from trustworthiness.

6. **COMMERCIAL PLAN ≠ REPUTATION**: Paid plans are separate from organic reputation.

7. **SPONSORED ≠ ORGANIC**: Sponsored placement is separate from organic ranking.
