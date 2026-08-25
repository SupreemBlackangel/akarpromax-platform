# 08_V1_MODERATOR_OPERATING_MODEL.md
# V1 Moderator Operating Model

**Audit Date:** 2026-08-19  
**Mode:** READ-ONLY — V1 Source Archaeology

---

## 1. Moderator Assignment

### 1.1 Database Model

**Table:** `moderators`

| Field | Type | Purpose |
|---|---|---|
| id | Int | PK |
| userId | Int | FK → User |
| roleId | Int | FK → Role |
| createdAt | DateTime | Assignment date |

**Constraint:** `@@unique([userId])` — one role per user

### 1.2 Role Assignment

**Table:** `roles`

| Field | Type | Purpose |
|---|---|---|
| id | Int | PK |
| name | String | Role name |
| permissions | String (JSON) | Permission object |

---

## 2. Moderator Capabilities

### 2.1 Property Moderation

**Page:** `AdminProperties.tsx`

**Actions:**
- View pending properties
- Approve property
- Reject property
- Toggle featured
- Delete property

**API:** `api/properties.ts`

### 2.2 User Moderation

**Page:** `AdminUsers.tsx`

**Actions:**
- View all users
- Approve user
- Reject user
- Ban user
- Unban user
- Change role
- Change status

**API:** `api/admin.ts`

### 2.3 Verification Moderation

**Page:** `AdminVerification.tsx`

**Actions:**
- View verification requests
- Approve verification
- Reject verification

**API:** `api/admin.ts`

### 2.4 Auction Moderation

**Page:** `AdminAuctions.tsx`

**Actions:**
- View all auctions
- Suspend auction
- Unsuspend auction
- Extend deadline
- Resolve reports
- Block participants

**API:** `api/auctions.ts`

### 2.5 Ad Moderation

**Page:** `AdminAds.tsx`

**Actions:**
- View all ads
- Create ad
- Update ad
- Delete ad
- Activate/deactivate

**API:** `api/ads.ts`

### 2.6 Blog Moderation

**Page:** `AdminBlog.tsx`

**Actions:**
- View all posts
- Create post
- Update post
- Delete post
- Publish/unpublish

**API:** `api/blog.ts`

### 2.7 Chat Moderation

**Page:** `AdminChat.tsx`

**Actions:**
- View conversations (with logging)
- Access logged in `moderation_access_logs`

**API:** `chat-server.ts`

---

## 3. Moderator Workspace

### 3.1 Dashboard

**Page:** `/admin`

**Sections:**
- Overview statistics
- Pending verifications
- Pending properties
- Recent reports
- Activity log

### 3.2 User Management

**Page:** `/admin/users`

**Features:**
- User list with filters
- User detail view
- Ban/unban actions
- Role changes
- Status changes

### 3.3 Property Management

**Page:** `/admin/properties`

**Features:**
- Property list with filters
- Property detail view
- Approve/reject actions
- Feature toggle
- Delete action

### 3.4 Verification Queue

**Page:** `/admin/verification`

**Features:**
- Pending verifications list
- Verification detail view
- Approve/reject actions
- Rejection reason

### 3.5 Report Management

**Page:** `/admin/reports`

**Features:**
- Report list
- Report detail view
- Resolve/dismiss actions

---

## 4. Authorization Model

### 4.1 Permission Check Pattern

```typescript
if (user.role !== 'admin' && user.role !== 'moderator') {
  return res.status(403).json({ error: 'Forbidden' });
}
```

### 4.2 Ownership Check Pattern

```typescript
if (property.userId !== user.id && user.role !== 'admin') {
  return res.status(403).json({ error: 'Not owner' });
}
```

---

## 5. Audit Trail

### 5.1 Activity Logs

**Table:** `activity_logs`

| Field | Type | Purpose |
|---|---|---|
| id | Int | PK |
| userId | Int | Actor |
| action | String | Action type |
| details | String | Action details |
| createdAt | DateTime | Timestamp |

### 5.2 Chat Moderation Logs

**Table:** `moderation_access_logs`

| Field | Type | Purpose |
|---|---|---|
| id | String | PK |
| moderatorId | String | Moderator |
| conversationId | String | Conversation |
| reason | String | Access reason |
| accessedAt | DateTime | Timestamp |

---

## 6. Data Access Restrictions

### 6.1 What Moderators Could NOT Access

- Private messages (without moderation request)
- User passwords (only hash stored)
- Payment details (not stored)
- IP addresses (only in login_attempts)

---

**Status:** COMPLETE  
**Application Source Files Modified:** ZERO
