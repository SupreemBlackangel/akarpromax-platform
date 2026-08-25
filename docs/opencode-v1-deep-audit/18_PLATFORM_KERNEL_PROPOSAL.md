# 18_PLATFORM_KERNEL_PROPOSAL.md
# Platform Kernel Proposal

**Audit Date:** 2026-08-19  
**Mode:** READ-ONLY

---

## 1. Recommended Platform Kernels

### 1.1 IDENTITY_ACCESS_KERNEL

**Responsibility:** User authentication, authorization, sessions, roles, permissions

**Owned Tables:**
- `users`
- `sessions`
- `verification_challenges`
- `user_oauth_accounts`
- `user_roles`
- `role_permissions`
- `audit_logs`

**Owned APIs:**
- `/api/auth/*`
- `/api/users/*`
- `/api/roles/*`
- `/api/permissions/*`

**Consumer Modules:**
- All modules depend on identity access

**Forbidden Duplication:**
- No separate auth systems
- No duplicate user tables
- No hardcoded permissions

---

### 1.2 TRUST_REPUTATION_KERNEL

**Responsibility:** Verification, ranks, trust scores, reputation

**Owned Tables:**
- `verification_requests`
- `user_ranks`
- `trust_scores`
- `reviews`
- `sanctions`

**Owned APIs:**
- `/api/verification/*`
- `/api/ranks/*`
- `/api/trust/*`
- `/api/reviews/*`
- `/api/sanctions/*`

**Consumer Modules:**
- Properties (verification badges)
- Services (provider reputation)
- Organizations (office verification)
- Auctions (bidder trust)

**Forbidden Duplication:**
- No separate verification systems
- No duplicate rank tables
- No hardcoded rank logic

---

### 1.3 MESSAGING_KERNEL

**Responsibility:** Real-time chat, notifications, email

**Owned Tables:**
- `threads`
- `thread_participants`
- `messages`
- `message_attachments`
- `message_read_states`
- `message_reports`
- `notifications`
- `push_subscriptions`
- `email_logs`

**Owned APIs:**
- `/api/messages/*`
- `/api/notifications/*`
- `/api/push/*`
- `/api/email/*`

**Consumer Modules:**
- Properties (inquiry messaging)
- Services (service messaging)
- Organizations (office messaging)
- Auctions (auction notifications)

**Forbidden Duplication:**
- No separate chat systems
- No duplicate message tables
- No hardcoded notification logic

---

### 1.4 NOTIFICATIONS_EVENT_KERNEL

**Responsibility:** Event-driven notifications, domain events

**Owned Tables:**
- `domain_events`
- `notification_rules`
- `notification_channels`

**Owned APIs:**
- `/api/events/*`
- `/api/notification-rules/*`

**Consumer Modules:**
- All modules emit events
- All modules consume notifications

**Forbidden Duplication:**
- No separate event systems
- No duplicate event tables
- No hardcoded event logic

---

### 1.5 ADVERTISING_KERNEL

**Responsibility:** Campaigns, creatives, targeting, analytics

**Owned Tables:**
- `ad_campaigns`
- `ad_creatives`
- `ad_placements`
- `ad_impressions`
- `ad_clicks`
- `ad_requests`

**Owned APIs:**
- `/api/ads/*`
- `/api/admin/ads/*`

**Consumer Modules:**
- Properties (property ads)
- Services (service ads)
- Organizations (office ads)
- Desktop (office ads)

**Forbidden Duplication:**
- No separate ad systems
- No duplicate ad tables
- No hardcoded ad logic

---

### 1.6 MODERATION_AUDIT_KERNEL

**Responsibility:** Admin actions, audit logs, sanctions, content moderation

**Owned Tables:**
- `audit_logs`
- `sanctions`
- `content_reports`
- `moderation_requests`

**Owned APIs:**
- `/api/admin/*`
- `/api/audit/*`
- `/api/sanctions/*`
- `/api/reports/*`

**Consumer Modules:**
- All modules log actions
- All modules report content

**Forbidden Duplication:**
- No separate audit systems
- No duplicate audit tables
- No hardcoded moderation logic

---

### 1.7 GEO_KERNEL

**Responsibility:** Location hierarchy, geo-targeting, maps

**Owned Tables:**
- `countries`
- `governorates`
- `cities`
- `districts`
- `streets`

**Owned APIs:**
- `/api/geo/*`

**Consumer Modules:**
- Properties (location filtering)
- Services (area targeting)
- Ads (geo-targeting)
- Organizations (office locations)

**Forbidden Duplication:**
- No separate geo systems
- No duplicate location tables
- No hardcoded geo logic

---

### 1.8 STORAGE_MEDIA_KERNEL

**Responsibility:** File uploads, images, documents, media processing

**Owned Tables:**
- `media_uploads`
- `media_processing_jobs`

**Owned APIs:**
- `/api/media/*`
- `/api/upload/*`

**Consumer Modules:**
- Properties (property images)
- Messages (message attachments)
- Profiles (profile images)
- Documents (contracts, licenses)

**Forbidden Duplication:**
- No separate upload systems
- No duplicate media tables
- No hardcoded upload logic

---

## 2. Dependency Order

```
Identity
→ Authorization
→ Ownership
→ Trust
→ Messaging
→ Notifications
→ Moderation
→ Properties/Services/Organizations
→ Ads
→ Office integration
```

---

## 3. Implementation Phases

### Phase 1: Identity & Access (Weeks 1-2)
- Stabilize user model
- Implement role-based access
- Add activity logging

### Phase 2: Trust & Verification (Weeks 3-4)
- Implement verification workflow
- Add reputation scoring
- Build trust system

### Phase 3: Messaging Core (Weeks 5-8)
- Build real-time chat (Socket.IO)
- Implement message encryption
- Add moderation oversight

### Phase 4: Notifications (Weeks 9-10)
- Event-driven notifications
- Email integration
- Push notifications

### Phase 5: Moderation (Weeks 11-12)
- Admin dashboard
- Audit logging
- Sanctions system

### Phase 6: Properties & Services (Weeks 13-16)
- Enhance property search
- Improve service marketplace
- Add property requests

### Phase 7: Organizations (Weeks 17-18)
- Office management
- Company management
- Member permissions

### Phase 8: Advertising (Weeks 19-20)
- Geo-targeted ads
- Campaign management
- Analytics

### Phase 9: Desktop Integration (Weeks 21-22)
- License management
- Property sync
- Ad sync

### Phase 10: Engineering & Advanced (Weeks 23-26)
- Engineering tools
- Market analysis
- Advanced features

---

## 4. Critical Rules

### 4.1 One User, One Login, One Identity

A user should have:
- ONE identity (email/password)
- ONE login (JWT session)
- MULTIPLE capabilities (assigned via roles/permissions)
- MULTIPLE profiles (personal, professional, office member, company member)
- MULTIPLE memberships (organizations they belong to)

### 4.2 Rank ≠ Permission

A user may be:
- GOLD reputation rank
- WITHOUT platform moderator permissions

### 4.3 Verification ≠ Rank

Verification and reputation rank MUST be separate concepts:
- Verification = Identity confirmation (KYC)
- Rank = Trust level (earned through activity)

### 4.4 Subscription ≠ Permission

Subscription and permissions MUST be separate concepts:
- Subscription = Paid plan (monthly/yearly)
- Permission = Specific action allowed

### 4.5 Moderator ≠ Admin

Moderator and admin MUST be separate concepts:
- Moderator = Content moderation
- Admin = Platform administration

### 4.6 Default Deny

All permission checks should default to deny:
- If no explicit permission → deny
- If no explicit role → deny
- If no explicit capability → deny

### 4.7 Server Enforcement

All permission checks MUST be server-side:
- Never rely on hidden UI only
- Never trust client-side role checks
- Always verify on the server

---

**Status:** COMPLETE  
**Application Source Files Modified:** ZERO
