# ACCOUNT TYPES AND ROLES

## 1. Concept Separation

These concepts are **completely independent**:

| Concept | Definition | Example |
|---------|-----------|---------|
| **User Identity** | The person's account | Ahmed's login |
| **Account Type** | What they are on the platform | Professional, Organization |
| **Platform Role** | Their admin privilege level | viewer, admin, super_admin |
| **Organization Role** | Their role within an organization | owner, manager, agent |
| **Profession** | Their trade/skill | Electrician, Surveyor |
| **Specialization** | Their specific expertise | Industrial wiring, Land surveying |
| **Organization Type** | What kind of organization | Real estate, Business |
| **Organization Classification** | Their business size | Startup, SME, Enterprise |

**Critical rule:** Account Type ≠ Profession.

Example:
```
PROFESSIONAL
├── Electrician
├── Surveyor
├── Engineer
├── Plumber
├── Lawyer
├── Consultant
├── Contractor
└── Appraiser
```

Profession does NOT become a new Account Type.

## 2. Account Types

### Initial Model

| Account Type | Arabic | Description |
|-------------|--------|-------------|
| NORMAL_USER | مستخدم | Regular platform user |
| PROFESSIONAL | حرفي / مهني | Individual service provider |
| REAL_ESTATE_ORGANIZATION | مكتب أو شركة عقارية | Real estate company/office |
| BUSINESS_ORGANIZATION | شركة / مؤسسة | General business entity |

### Display

```
مستخدم (Normal User)
حرفي / مهني (Professional)
مكتب أو شركة عقارية (Real Estate Office/Company)
شركة / مؤسسة (Company/Institution)
```

## 3. Platform Roles (Existing)

12 roles in `src/constants/roles.ts`:

| Role | Name (Ar) | Name (En) | Privilege Level |
|------|-----------|-----------|-----------------|
| guest | زائر | Guest | 0 |
| viewer | مستخدم مشاهدة | Viewer | 1 |
| analyst | محلل التقارير | Analyst | 2 |
| content_editor | محرر الرعاة | Content Editor | 3 |
| service_provider | مزود خدمات | Service Provider | 4 |
| service_supervisor | مشرف خدمات | Service Supervisor | 5 |
| country_manager | مدير دولة | Country Manager | 6 |
| ad_manager | مدير الإعلانات | Ad Manager | 7 |
| ads_reviewer | مراجع الإعلانات | Ads Reviewer | 8 |
| sponsor_admin | مدير الرعاة | Sponsor Admin | 9 |
| sponsor_manager | مدير الرعاة التنفيذي | Sponsor Manager | 10 |
| super_admin | المدير العام | Super Admin | 11 |

**Platform roles are for admin operations, NOT account identity.**

## 4. Organization Roles

| Role | Permissions |
|------|------------|
| OWNER | Full control, delete org, transfer ownership |
| ADMIN | Manage members, settings, content |
| MANAGER | Manage daily operations, branches, team |
| AGENT | Manage properties, listings, leads |
| MEMBER | View-only, limited actions |

**Organization roles are independent of platform roles.**

Example:
```
Ahmed
├── Platform Role: viewer (normal user)
├── Organization: XYZ Engineering
│   └── Organization Role: owner
└── Organization: ABC Properties
    └── Organization Role: agent
```

## 5. Relationship Between Concepts

```
User Identity
├── Account Type: PROFESSIONAL
├── Platform Role: viewer (legacy, backward compat)
├── Organization Memberships[]
│   ├── Organization A: owner
│   └── Organization B: member
├── Profession: Electrician
├── Specializations[]
│   ├── Industrial wiring
│   └── Residential electrical
├── ProfessionalProfile
│   ├── Verification Records
│   ├── Reputation Profile
│   ├── Activity State
│   ├── Availability State
│   └── Profile Strength
└── Verification Records[]
    ├── email_verified
    ├── phone_verified
    ├── identity_verified
    └── professional_verified
```

## 6. Platform Role vs Organization Role

| Aspect | Platform Role | Organization Role |
|--------|--------------|-------------------|
| Scope | Entire platform | Single organization |
| Assignment | Admin or system | Organization owner/admin |
| Impact | Admin access | Org-specific actions |
| Hierarchy | Independent | Org-specific hierarchy |
| Example | super_admin | owner |

**Gold reputation does NOT become Admin.**
**Organization OWNER does NOT become Platform Admin.**

## 7. Account Type Transitions

```
NORMAL_USER
├── "I want to provide services" → PROFESSIONAL
├── "I want to create an organization" → REAL_ESTATE_ORGANIZATION or BUSINESS_ORGANIZATION
└── (stays NORMAL_USER)

PROFESSIONAL
├── "I want to create an organization" → Also becomes ORGANIZATION_OWNER
└── (stays PROFESSIONAL)

REAL_ESTATE_ORGANIZATION
├── (stays REAL_ESTATE_ORGANIZATION)

BUSINESS_ORGANIZATION
├── (stays BUSINESS_ORGANIZATION)
```

## 8. Multi-Account-Type User

A user CAN be multiple types simultaneously:

```
Ahmed
├── Account Type: PROFESSIONAL (individual)
├── Organization: XYZ Engineering (OWNER)
│   └── Organization Role: owner
└── Organization: ABC Properties (MEMBER)
    └── Organization Role: agent
```

This is supported via OrganizationMemberships.

## 9. Role Assignment Rules

### Platform Roles
- Assigned by admins only
- Never self-assigned
- Certain roles are ban-listed for self-assignment:
  - service_supervisor
  - country_manager
  - ad_manager
  - ads_reviewer
  - sponsor_admin
  - sponsor_manager
  - super_admin

### Organization Roles
- OWNER: Created by organization creator
- ADMIN: Assigned by OWNER or ADMIN
- MANAGER: Assigned by OWNER or ADMIN
- AGENT: Assigned by OWNER, ADMIN, or MANAGER
- MEMBER: Assigned by OWNER, ADMIN, or MANAGER

## 10. Permission Inheritance

```
Platform Permissions ∩ Organization Permissions = Effective Permissions

Example:
Ahmed has platform permission: properties.view
Ahmed has org role: agent (org.permissions: properties.manage)
Effective: properties.manage (org level)
```

## 11. Backward Compatibility

The existing role system is preserved:
- `users.role` column remains (legacy)
- `ROLE_CATALOG` in code continues to work
- Identity map continues to function
- No breaking changes to existing API routes

**AMRS adds new concepts on top, not replacing existing ones.**

## 12. Migration Strategy

### Phase 1 (AMRS-1)
- Keep existing role system
- Add Organizations table
- Add OrganizationMemberships table
- Add VerificationRecords table

### Phase 2 (AMRS-2)
- Add ProfessionalProfile (extend service_provider_profiles)
- Add ReputationProfile
- Add ActivityState
- Add AvailabilityState

### Phase 3 (AMRS-3)
- Add Badges, Achievements
- Add ProfileStrength
- Update UI to use new models

### Phase 4 (AMRS-4)
- Deprecate MySQL schema divergence
- Unify user model
- Clean up legacy role assignments
