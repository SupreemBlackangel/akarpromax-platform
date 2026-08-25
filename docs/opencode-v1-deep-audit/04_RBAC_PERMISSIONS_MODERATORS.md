# 04_RBAC_PERMISSIONS_MODERATORS.md
# RBAC, Permissions & Moderators Architecture

**Audit Date:** 2026-08-19  
**Mode:** READ-ONLY

---

## 1. V1 Permission Model

### 1.1 Role-Based Access Control

V1 implemented a simple RBAC system with three roles:

| Role | Assignment | Capabilities |
|---|---|---|
| user | Default on registration | Standard user actions |
| moderator | Admin-assigned | Content moderation, report handling |
| admin | Database assignment | Full platform administration |

**Source:** `AuthContext.tsx` lines 54-60

### 1.2 Moderator Assignment

V1 stored moderator assignments in a dedicated `moderators` table:

```sql
CREATE TABLE moderators (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  role_id UUID REFERENCES roles(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Source:** `prisma/schema.prisma` `moderators` model

### 1.3 Permission Storage

V1 stored permissions as JSON in the `roles` table:

```sql
CREATE TABLE roles (
  id UUID PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  permissions JSON NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Source:** `prisma/schema.prisma` `roles` model

### 1.4 V1 Admin Pages

| Page | Purpose | Capabilities |
|---|---|---|
| `/admin/moderators` | Moderator management | Add/remove moderators |
| `/admin/verification` | Identity verification | Approve/reject verifications |
| `/admin/activity-log` | Activity log viewer | View admin actions |
| `/admin/users` | User management | Approve/reject/ban users |
| `/admin/properties` | Property management | Approve/reject properties |
| `/admin/ads` | Ad management | Manage advertisements |
| `/admin/emperor` | "Emperor" panel | Unknown purpose |
| `/admin/matchmaking` | Property matchmaking | Match properties with requests |
| `/admin/elite-leads` | Elite lead management | Manage high-value leads |
| `/admin/service-reviews` | Service review management | Manage service reviews |
| `/admin/market-rates` | Market rate management | Manage market data |
| `/admin/marketers` | Marketer management | Manage marketers |
| `/admin/chat` | Chat oversight | View conversations |

---

## 2. V2.0 Permission Model

### 2.1 Role-Based Access Control

V2.0 uses a simplified role system:

| Role | Assignment | Capabilities |
|---|---|---|
| super_admin | Full platform access | All permissions |
| admin | Admin dashboard access | Admin permissions |
| user | Default role | Standard user actions |

**Source:** `src/constants/roles.ts`, `lib/auth/identity-map.ts`

### 2.2 Permission Catalog

V2.0 introduced a fine-grained permission catalog:

| Permission | Description | Assigned To |
|---|---|---|
| SETTINGS_MANAGE | Manage system settings | super_admin |
| USERS_MANAGE | Manage users | super_admin, admin |
| PROPERTIES_MANAGE | Manage properties | super_admin, admin |
| ADS_MANAGE | Manage advertisements | super_admin, admin |
| ORGANIZATIONS_MANAGE | Manage organizations | super_admin, admin |
| CONTENT_MANAGE | Manage content | super_admin, admin |
| ANALYTICS_VIEW | View analytics | super_admin, admin |
| VERIFICATION_MANAGE | Manage verifications | super_admin, admin |

**Source:** `src/constants/roles.ts` lines 99-120

### 2.3 V2.0 Admin Pages

| Page | Purpose | Capabilities |
|---|---|---|
| `/admin` | Admin dashboard | Overview, stats |
| `/admin/users` | User management | User listing, role changes |
| `/admin/properties` | Property management | Property listing, moderation |
| `/admin/ads` | Ad management | Ad listing, campaign management |
| `/admin/auction-organizers` | Auction organizer management | Grant/revoke auction permissions |
| `/admin/moderators` | Moderator management | Moderator listing |
| `/admin/roles` | Role management | Role listing |
| `/admin/verifications` | Verification management | Verification queue |
| `/admin/settings` | System settings | Platform configuration |

---

## 3. Critical Differences

### 3.1 V1 Had Dedicated Moderators Table

V1 stored moderator assignments in a separate `moderators` table, allowing:
- Multiple moderators per role
- Moderator-specific capabilities
- Moderator activity tracking

### 3.2 V2.0 Uses Role Field

V2.0 stores the role directly on the `users` table. This is simpler but less flexible.

### 3.3 V1 Had JSON Permissions

V1 stored permissions as JSON in the `roles` table. This allowed dynamic permission assignment without schema changes.

### 3.4 V2.0 Has Hardcoded Permissions

V2.0 has a hardcoded permission catalog in `src/constants/roles.ts`. This is more type-safe but less flexible.

### 3.5 V1 Had Activity Logging

V1 had an `activity_logs` table for tracking admin actions:

```sql
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  details JSON,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 3.6 V2.0 Lacks Activity Logging

V2.0 has no equivalent activity logging system. Admin actions are not tracked.

---

## 4. Recommended Moderator Architecture

### 4.1 Moderator Roles

| Role | Description | Capabilities |
|---|---|---|
| SUPER_ADMIN | Full platform access | All permissions |
| PLATFORM_ADMIN | Platform administration | User management, settings |
| TRUST_SAFETY_MODERATOR | Trust & safety | User reports, sanctions |
| PROPERTY_MODERATOR | Property moderation | Property approval/rejection |
| SERVICES_MODERATOR | Service moderation | Service approval/rejection |
| ORGANIZATION_MODERATOR | Organization moderation | Organization verification |
| COMMUNITY_MODERATOR | Community moderation | Forum moderation |
| ADVERTISING_MANAGER | Advertising management | Ad campaign management |
| NEWS_KNOWLEDGE_EDITOR | Content editing | News, knowledge base |
| VERIFICATION_OFFICER | Verification management | Identity verification |
| OFFICE_INTEGRATION_SUPPORT | Office integration | Office support |
| ANALYST_AUDITOR | Analytics & auditing | Read-only analytics |

### 4.2 Permission Naming Convention

Permissions should follow the pattern:

```
<domain>.<action>
```

Examples:
- `properties.read`
- `properties.create`
- `properties.review`
- `properties.approve`
- `properties.reject`
- `properties.archive`
- `services.provider.review`
- `services.dispute.manage`
- `organizations.review`
- `organizations.verify`
- `community.moderate`
- `ads.campaign.read`
- `ads.campaign.create`
- `ads.campaign.approve`
- `ads.campaign.pause`
- `users.suspend`
- `users.verify`
- `users.role.assign`
- `audit.read`
- `office.devices.manage`
- `translations.manage`

### 4.3 Scoped Authorization

Permission evaluation should follow:

```
USER
→ ROLE(S)
→ PERMISSION
→ DOMAIN
→ ACTION
→ optional ENTITY SCOPE
→ optional GEO SCOPE
```

Example:
```
PROPERTY_MODERATOR
permission: properties.review
scope: COUNTRY:SA, REGION:MAKKAH, CITY:JEDDAH
```

### 4.4 Geographic Scope

Moderators should be scoped to specific geographic areas:

| Scope Type | Description | Example |
|---|---|---|
| COUNTRY | Country-level scope | SA (Saudi Arabia) |
| REGION | Region/governorate scope | MAKKAH |
| CITY | City-level scope | JEDDAH |
| ORGANIZATION | Organization-level scope | Office X |

### 4.5 Entity Scope

Moderators should be scoped to specific entities:

| Entity Type | Description | Example |
|---|---|---|
| PROPERTY | Specific property | Property ID |
| ORGANIZATION | Specific organization | Office ID |
| USER | Specific user | User ID |
| CAMPAIGN | Specific ad campaign | Campaign ID |

---

## 5. Recommended RBAC Schema

### 5.1 Roles Table

```sql
CREATE TABLE roles (
  id UUID PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 5.2 Permissions Table

```sql
CREATE TABLE permissions (
  id UUID PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  domain VARCHAR(50) NOT NULL,
  action VARCHAR(50) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 5.3 Role Permissions Table

```sql
CREATE TABLE role_permissions (
  id UUID PRIMARY KEY,
  role_id UUID REFERENCES roles(id),
  permission_id UUID REFERENCES permissions(id),
  scope_type VARCHAR(50), -- country/region/city/organization
  scope_value VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(role_id, permission_id, scope_type, scope_value)
);
```

### 5.4 User Roles Table

```sql
CREATE TABLE user_roles (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  role_id UUID REFERENCES roles(id),
  granted_at TIMESTAMP DEFAULT NOW(),
  granted_by UUID REFERENCES users(id),
  expires_at TIMESTAMP,
  UNIQUE(user_id, role_id)
);
```

### 5.5 Audit Log Table

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  actor_user_id UUID REFERENCES users(id),
  actor_role VARCHAR(50),
  permission_used VARCHAR(100),
  action VARCHAR(100) NOT NULL,
  domain VARCHAR(50),
  entity_type VARCHAR(50),
  entity_id UUID,
  old_value JSON,
  new_value JSON,
  reason TEXT,
  ip VARCHAR(45),
  user_agent TEXT,
  request_id UUID,
  metadata JSON,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 6. Conflict of Interest Prevention

### 6.1 Self-Review Prevention

A reviewer should NOT approve:
- Their own organization
- Their own professional profile
- Their own property (when approval is required)
- An entity where they are an active member

### 6.2 Two-Person Approval

High-risk actions should require two-person approval:
- User banning
- Organization verification
- Large ad campaign approval
- Auction dispute resolution

---

## 7. V1 Moderator Capabilities (Detailed)

### 7.1 Property Moderation

| Action | Permission | Evidence |
|---|---|---|
| View pending properties | properties.review | `AdminProperties.tsx` |
| Approve property | properties.approve | `api/properties.ts` |
| Reject property | properties.reject | `api/properties.ts` |
| Toggle featured | properties.feature | `api/properties.ts` |
| Delete property | properties.delete | `api/properties.ts` |

### 7.2 User Moderation

| Action | Permission | Evidence |
|---|---|---|
| View users | users.read | `AdminUsers.tsx` |
| Approve user | users.approve | `api/admin.ts` |
| Reject user | users.reject | `api/admin.ts` |
| Ban user | users.ban | `api/admin.ts` |
| Change role | users.role.assign | `api/admin.ts` |
| Change status | users.status.change | `api/admin.ts` |

### 7.3 Verification Moderation

| Action | Permission | Evidence |
|---|---|---|
| View verification requests | verification.read | `AdminVerification.tsx` |
| Approve verification | verification.approve | `api/admin.ts` |
| Reject verification | verification.reject | `api/admin.ts` |

### 7.4 Ad Moderation

| Action | Permission | Evidence |
|---|---|---|
| View ads | ads.read | `AdminAds.tsx` |
| Create ad | ads.create | `api/ads.ts` |
| Update ad | ads.update | `api/ads.ts` |
| Delete ad | ads.delete | `api/ads.ts` |

### 7.5 Chat Moderation

| Action | Permission | Evidence |
|---|---|---|
| View conversations | chat.read | `AdminChat.tsx` |
| Access logged | chat.access.log | `moderation_access_logs` table |

---

**Status:** COMPLETE  
**Application Source Files Modified:** ZERO
