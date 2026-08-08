# IMPLEMENTATION PLAN

## 1. Implementation Phases

### AMRS-0: Audit (CURRENT)

**Goal:** Complete audit and architecture design

**Scope:**
- Current state audit
- Domain model design
- Reputation model design
- Organization model design
- Adaptive profile design
- Retention strategy
- Implementation roadmap

**Files affected:** Documentation only

**Dependencies:** None

**Data changes:** None

**Risks:** None

**Security concerns:** None

**Tests:** Documentation quality review

**Acceptance criteria:**
- All 14 documentation files created
- Architecture approved by product owner
- No production code changes

**Rollback:** N/A

---

### AMRS-1: Domain Contracts

**Goal:** Define contracts between AMRS and other modules

**Scope:**
- Define entity interfaces
- Define API contracts
- Define event contracts
- Define permission extensions

**Files likely affected:**
- `shared/contracts/` (new)
- `shared/types/` (new)
- `shared/events/` (new)

**Dependencies:** AMRS-0

**Data changes:** None

**Risks:** Contract design may need iteration

**Security concerns:** Contract permissions must be correct

**Tests:** Contract validation tests

**Acceptance criteria:**
- All contracts defined
- Contracts pass validation
- No production code changes

**Rollback:** Remove contract files

---

### AMRS-2: Database Foundation

**Goal:** Create AMRS database tables

**Scope:**
- Organizations table
- Organization_members table
- Organization_branches table
- Verification_records table
- Reputation_profiles table
- Reputation_evaluations table
- Reputation_history table
- Activity_states table
- Availability_states table
- Profile_strength table
- Badges table
- Entity_badges table
- Achievements table
- Achievement_progress table

**Files likely affected:**
- `lib/amrs-schema.ts` (new)
- `lib/runtime-db.ts` (extend)
- `lib/content-schema.ts` (extend)

**Dependencies:** AMRS-1

**Data changes:** 14 new tables

**Risks:** Schema design may need iteration

**Security concerns:** Table access must be permission-gated

**Tests:** Schema validation, migration tests

**Acceptance criteria:**
- All tables created
- Migrations run successfully
- Existing tests pass

**Rollback:** Drop new tables

---

### AMRS-3: Registration & Upgrade Flows

**Goal:** Implement registration and professional upgrade

**Scope:**
- Normal user registration (existing, extend)
- Professional upgrade wizard
- Organization creation wizard
- Profile strength computation

**Files likely affected:**
- `app/api/auth/register/route.ts` (extend)
- `app/api/amrs/professional/upgrade/route.ts` (new)
- `app/api/amrs/organization/create/route.ts` (new)
- `lib/amrs/service.ts` (new)
- `app/dashboard/services/provider-profile/page.tsx` (extend)

**Dependencies:** AMRS-2

**Data changes:** New records in organizations, verification_records, reputation_profiles

**Risks:** Wizard UX may need iteration

**Security concerns:** Role assignment must be server-controlled

**Tests:** Registration flow tests, upgrade flow tests

**Acceptance criteria:**
- Normal user registration works
- Professional upgrade works
- Organization creation works
- Profile strength computed correctly

**Rollback:** Revert route changes

---

### AMRS-4: Verification

**Goal:** Implement verification record system

**Scope:**
- VerificationRecord CRUD
- Email/phone auto-verification
- Manual verification workflow
- Verification expiry

**Files likely affected:**
- `lib/amrs/verification.ts` (new)
- `app/api/amrs/verification/route.ts` (new)
- `app/api/admin/verification/route.ts` (new)
- `lib/auth/verification.ts` (extend)

**Dependencies:** AMRS-2

**Data changes:** New records in verification_records

**Risks:** Verification workflow may need iteration

**Security concerns:** Verification mutation must be server-only

**Tests:** Verification flow tests, expiry tests

**Acceptance criteria:**
- Auto-verification works
- Manual verification works
- Expiry works
- Verification summary displayed correctly

**Rollback:** Revert verification changes

---

### AMRS-5: Reputation Policy Engine

**Goal:** Implement reputation evaluation system

**Scope:**
- ReputationPolicy management
- Reputation evaluation engine
- Level transitions
- Grace periods
- Policy versioning

**Files likely affected:**
- `lib/amrs/reputation.ts` (new)
- `lib/amrs/reputation-engine.ts` (new)
- `app/api/admin/reputation/policy/route.ts` (new)
- `app/api/admin/reputation/evaluate/route.ts` (new)

**Dependencies:** AMRS-2, AMRS-4

**Data changes:** New records in reputation_profiles, reputation_evaluations, reputation_history

**Risks:** Reputation weights may need tuning

**Security concerns:** Level transitions must be server-controlled

**Tests:** Evaluation tests, level transition tests, grace period tests

**Acceptance criteria:**
- Reputation evaluation works
- Level transitions work
- Grace periods work
- Policy versioning works

**Rollback:** Revert reputation changes

---

### AMRS-6: Adaptive Profiles & Business Presence

**Goal:** Implement adaptive profile system

**Scope:**
- AdaptiveProfileEngine
- Profile variants (Base/Enhanced/Premium/ProMax)
- Business presence pages
- Profile strength display

**Files likely affected:**
- `components/amrs/AdaptiveProfile.tsx` (new)
- `components/amrs/ProfileHeader.tsx` (new)
- `components/amrs/VerificationSummary.tsx` (new)
- `components/amrs/ReputationBadge.tsx` (new)
- `app/profile/[username]/page.tsx` (new)
- `app/professionals/[slug]/page.tsx` (new)
- `app/organizations/[slug]/page.tsx` (new)

**Dependencies:** AMRS-3, AMRS-4, AMRS-5

**Data changes:** None (reads from existing tables)

**Risks:** UX may need iteration

**Security concerns:** Public DTOs must not leak private data

**Tests:** Profile rendering tests, adaptive behavior tests

**Acceptance criteria:**
- Adaptive profiles work
- Business presence works
- Profile strength displayed
- No private data leakage

**Rollback:** Revert profile changes

---

### AMRS-7: Directory & Discovery

**Goal:** Implement directory and search

**Scope:**
- Directory engine
- Search filters
- Discovery views
- Geo search
- Ranking algorithm

**Files likely affected:**
- `lib/amrs/directory.ts` (new)
- `app/api/amrs/directory/route.ts` (new)
- `app/directory/page.tsx` (new)
- `components/amrs/DirectoryFilters.tsx` (new)

**Dependencies:** AMRS-6

**Data changes:** None (reads from existing tables)

**Risks:** Search quality may need tuning

**Security concerns:** Search must respect privacy settings

**Tests:** Search tests, filter tests, ranking tests

**Acceptance criteria:**
- Directory works
- Search works
- Filters work
- Ranking works

**Rollback:** Revert directory changes

---

### AMRS-8: Admin Policy Controls

**Goal:** Implement admin management interface

**Scope:**
- Admin workspace
- Level management
- Policy management
- Badge management
- Verification management
- Audit trail

**Files likely affected:**
- `app/admin/membership/page.tsx` (new)
- `components/admin/MembershipAdmin.tsx` (new)
- `app/api/admin/membership/route.ts` (new)

**Dependencies:** AMRS-5, AMRS-6

**Data changes:** Admin-created records

**Risks:** Admin UX may need iteration

**Security concerns:** Admin actions must be audit-logged

**Tests:** Admin flow tests, audit trail tests

**Acceptance criteria:**
- Admin workspace works
- Level management works
- Policy management works
- Audit trail works

**Rollback:** Revert admin changes

---

### AMRS-9: Retention & Notifications

**Goal:** Implement retention and notification system

**Scope:**
- Next Best Action engine
- Weekly digest
- Notification preferences
- Achievement system
- Progress tracking

**Files likely affected:**
- `lib/amrs/retention.ts` (new)
- `lib/amrs/achievements.ts` (new)
- `app/api/amrs/notifications/preferences/route.ts` (new)
- `components/amrs/ProgressTracker.tsx` (new)

**Dependencies:** AMRS-5, AMRS-6

**Data changes:** New records in achievements, achievement_progress

**Risks:** Notification frequency may need tuning

**Security concerns:** Notifications must respect preferences

**Tests:** Retention tests, notification tests, achievement tests

**Acceptance criteria:**
- Next Best Action works
- Weekly digest works
- Achievements work
- Progress tracking works

**Rollback:** Revert retention changes

---

### AMRS-10: Office / Services / Properties Contracts

**Goal:** Integrate with existing modules

**Scope:**
- Office integration contracts
- Services integration contracts
- Properties integration contracts
- Command Center integration

**Files likely affected:**
- `lib/amrs/integrations/office.ts` (new)
- `lib/amrs/integrations/services.ts` (new)
- `lib/amrs/integrations/properties.ts` (new)
- `lib/command-center/service.ts` (extend)

**Dependencies:** AMRS-6, AMRS-7

**Data changes:** None (reads from existing tables)

**Risks:** Integration contracts may need iteration

**Security concerns:** Cross-module access must be permission-gated

**Tests:** Integration tests, command center tests

**Acceptance criteria:**
- Office integration works
- Services integration works
- Properties integration works
- Command Center displays AMRS data

**Rollback:** Revert integration changes

---

### AMRS-11: Security / Tests / Performance

**Goal:** Security hardening and testing

**Scope:**
- Security audit
- Penetration testing
- Performance optimization
- Load testing
- Comprehensive test suite

**Files likely affected:**
- All AMRS files (security review)
- `tests/amrs/` (new)

**Dependencies:** AMRS-10

**Data changes:** None

**Risks:** Security issues may require architecture changes

**Security concerns:** Full security audit required

**Tests:** Security tests, performance tests, load tests

**Acceptance criteria:**
- Security audit passed
- Performance meets targets
- Load tests passed
- Test coverage > 80%

**Rollback:** N/A

---

### AMRS-12: Final Integration

**Goal:** Final integration and polish

**Scope:**
- End-to-end testing
- Documentation update
- Migration scripts
- Deployment preparation
- Rollback procedures

**Files likely affected:**
- All AMRS files
- Documentation files
- Migration scripts

**Dependencies:** AMRS-11

**Data changes:** Production data migration

**Risks:** Migration may need iteration

**Security concerns:** Migration must be secure

**Tests:** E2E tests, migration tests

**Acceptance criteria:**
- E2E tests pass
- Documentation updated
- Migration tested
- Deployment ready

**Rollback:** Full rollback procedure documented

---

## 2. Dependencies Summary

```
AMRS-0 (Audit)
    ↓
AMRS-1 (Contracts)
    ↓
AMRS-2 (Database)
    ↓
AMRS-3 (Registration) → AMRS-6 (Profiles) → AMRS-7 (Directory)
    ↓                                              ↓
AMRS-4 (Verification) → AMRS-5 (Reputation) → AMRS-8 (Admin)
    ↓                                              ↓
AMRS-9 (Retention) ← ← ← ← ← ← ← ← ← ← ← ← ←
    ↓
AMRS-10 (Integrations)
    ↓
AMRS-11 (Security/Tests)
    ↓
AMRS-12 (Final Integration)
```

## 3. Risk Mitigation

### High Risk

- **Reputation weights:** Start with conservative weights, tune based on data
- **Schema migration:** Test thoroughly on staging before production
- **Performance:** Load test with realistic data volumes

### Medium Risk

- **UX iteration:** Plan for 2-3 iterations on wizard flows
- **Integration contracts:** May need adjustment during implementation
- **Admin controls:** May need additional controls based on feedback

### Low Risk

- **Database schema:** Well-understood patterns
- **Security:** Established best practices
- **Testing:** Standard test patterns

## 4. Rollback Strategy

### Per-Phase Rollback

Each phase has specific rollback procedures:
- AMRS-2: Drop new tables
- AMRS-3: Revert route changes
- AMRS-4: Revert verification changes
- AMRS-5: Revert reputation changes
- AMRS-6: Revert profile changes
- AMRS-7: Revert directory changes
- AMRS-8: Revert admin changes
- AMRS-9: Revert retention changes
- AMRS-10: Revert integration changes

### Full Rollback

If critical issues arise:
1. Revert all code changes
2. Drop all new tables
3. Restore from backup
4. Notify affected users

## 5. Success Criteria

### Technical

- All tests pass
- No security vulnerabilities
- Performance meets targets
- Architecture validated

### Product

- User can register as professional
- User can create organization
- Verification works end-to-end
- Reputation levels work
- Adaptive profiles display correctly
- Directory search works
- Admin controls work

### Business

- Users understand reputation system
- Users see value in level progression
- No dark pattern perception
- Trust increased
