# IMPLEMENTATION READINESS

## AkarProMax Membership & Reputation System (AMRS)

**Status:** AMRS-2 COMPLETE — DATABASE FOUNDATION DELIVERED

**Last updated:** 2026-08-08

### Implementation Progress

| Phase | Status | Commit | Description |
|-------|--------|--------|-------------|
| AMRS-0 | COMPLETE | — | Audit & Documentation |
| AMRS-1 | COMPLETE | `ca14f14` | Domain Contracts & Compatibility |
| AMRS-2 | COMPLETE | (pending) | Database Foundation & Safe Migration |
| AMRS-3 | NOT STARTED | — | Registration & Upgrade Flows |
| AMRS-4 | NOT STARTED | — | Verification System |
| AMRS-5 | NOT STARTED | — | Reputation Policy Engine |
| AMRS-6 | NOT STARTED | — | Adaptive Profiles |
| AMRS-7 | NOT STARTED | — | Directory & Discovery |
| AMRS-8 | NOT STARTED | — | Admin Controls |
| AMRS-9 | NOT STARTED | — | Retention & Notifications |
| AMRS-10 | NOT STARTED | — | Integration Contracts |
| AMRS-11 | NOT STARTED | — | Security & Performance |
| AMRS-12 | NOT STARTED | — | Final Integration |

### AMRS-2 Deliverables

- 7 MVP tables created via Drizzle ORM
- 18 indexes for query optimization
- 7 FK constraints for data integrity
- 24 DB schema validation tests
- Migration generated and validated
- Rollback strategy documented
- Data ownership matrix defined

---

## 1. WHAT IS FULLY DECIDED?

### Identity Model
- ✅ One user, one login, one AkarPromax identity
- ✅ ProfessionalProfile as optional relationship
- ✅ Organization as new entity
- ✅ OrganizationMembership for multi-org support
- ✅ Backward compatibility with existing role system

### Account Types
- ✅ NORMAL_USER, PROFESSIONAL, REAL_ESTATE_ORGANIZATION, BUSINESS_ORGANIZATION
- ✅ Account Type ≠ Profession
- ✅ Multi-account-type user supported

### Reputation Levels
- ✅ 5 levels: NEW, RISING, DISTINGUISHED, GOLD, PROMAX
- ✅ Score ranges: 0-199, 200-449, 450-699, 700-899, 900-1000
- ✅ ProMax is earned, not purchasable
- ✅ Gold is earned reputation, not tied to paid plan
- ✅ Reputation per entity, no inheritance
- ✅ Server-controlled level transitions

### Verification
- ✅ VerificationRecord model (entity_type + entity_id + type + status)
- ✅ MVP types: email, phone, identity, professional, organization, license
- ✅ Auto verification for email/phone
- ✅ Manual verification for identity/professional/license/organization
- ✅ Public trust display (✓/✗ per type)
- ✅ Data minimization (no document numbers)

### Activity
- ✅ ActivityState per entity
- ✅ States: active, recently_active, low_activity, inactive
- ✅ Configurable windows per entity type
- ✅ Meaningful activity signals (not just login)

### Availability
- ✅ AvailabilityState for Professional and Organization
- ✅ States: available, limited, unavailable
- ✅ Not for Branch (deferred)

### Profile Strength
- ✅ ProfileStrength per entity
- ✅ Score 0-100 based on completed fields
- ✅ Independent of reputation

### Adaptive Profiles
- ✅ ONE design system, 4 variants
- ✅ Base (NEW), Enhanced (RISING), Premium (DISTINGUISHED/GOLD), ProMax (PROMAX)
- ✅ Content-driven adaptation
- ✅ Empty section hiding

### Business Presence
- ✅ Professional profile page
- ✅ Organization profile page
- ✅ Adaptive sections based on level
- ✅ Verification summary + reputation badge

### Directory
- ✅ One directory engine
- ✅ MVP filters: type, category, city, verification, reputation, availability, rating
- ✅ Discovery views (same engine, different params)

### Admin
- ✅ Membership & Reputation workspace
- ✅ Level/policy/verification management
- ✅ Audit trail
- ✅ Manual override (exceptional)

### Database
- ✅ 10 new MVP tables (organizations, organization_members, organization_branches, verification_records, reputation_profiles, reputation_evaluations, reputation_history, activity_states, availability_states, profile_strength)
- ✅ Reuse existing: users, service_provider_profiles, sponsor_profiles, audit_logs
- ✅ Forbidden duplicates: companies, offices, business_profiles

### Reviews
- ✅ Extend existing service_reviews for Professional reputation
- ✅ Defer new review types (organization, property) to post-MVP

### Commercial Plans
- ✅ Separate from reputation
- ✅ Deferred to post-MVP

---

## 2. WHAT STILL NEEDS PRODUCT APPROVAL?

### Reputation Signal Weights
- **Status:** PENDING
- **Decision needed:** Exact weights for each signal per entity type
- **Current:** Ranges provided (e.g., email verified 0-50)
- **Needed:** Final values or tuning approach

### Portfolio Item Limits
- **Status:** PENDING
- **Decision needed:** Exact limits per level per entity type
- **Current:** 5/15/50/unlimited
- **Needed:** Confirmation or adjustment

### Organization Classification Thresholds
- **Status:** PENDING
- **Decision needed:** Startup/SME/Established/Enterprise boundaries per country
- **Current:** Suggested (< 2 years, > 5 years)
- **Needed:** Confirmation or country-specific rules

### Grace Period Durations
- **Status:** PENDING
- **Decision needed:** Default grace period before downgrade
- **Current:** 30 days
- **Needed:** Confirmation or adjustment

### Activity Windows
- **Status:** PENDING
- **Decision needed:** Exact time windows per entity type
- **Current:** Suggested (14/30/90/180 days for professionals)
- **Needed:** Confirmation or adjustment

### Achievement System Scope
- **Status:** DEFERRED (not MVP)
- **Decision needed:** How many achievements to start with post-MVP
- **Current:** Deferred
- **Needed:** Future planning

### Next Best Action Priority Algorithm
- **Status:** DEFERRED (not MVP)
- **Decision needed:** How to determine high/medium/low priority
- **Current:** Deferred
- **Needed:** Future design

### Weekly Digest Content Rules
- **Status:** DEFERRED (not MVP)
- **Decision needed:** How to personalize without spam
- **Current:** Deferred
- **Needed:** Future design

### GDPR/Data Residency Scope
- **Status:** PENDING
- **Decision needed:** Which countries, what requirements
- **Current:** Architecture supports country-aware design
- **Needed:** Legal/business input

### Encryption Technology
- **Status:** PENDING
- **Decision needed:** Application-level or database-level encryption
- **Current:** Architecture requires encrypted sensitive fields
- **Needed:** Technical decision

---

## 3. WHAT DATA MIGRATIONS WOULD BE REQUIRED?

### Phase 1: Database Foundation (AMRS-2)
- Create 10 new tables
- No data migration (empty tables)

### Phase 2: Registration & Upgrade (AMRS-3)
- No migration (new records created on upgrade)

### Phase 3: Verification (AMRS-4)
- Migrate existing verification data:
  - `users.email_verified_at` → `verification_records` (type: email)
  - `users.phone_verified_at` → `verification_records` (type: phone)
  - `service_provider_profiles.verified_at` → `verification_records` (type: professional)
  - `sponsor_profiles.verified_at` → `verification_records` (type: organization)

### Phase 4: Reputation (AMRS-5)
- No migration (new records created on first evaluation)

### Phase 5: Profiles (AMRS-6)
- No migration (reads from existing + new tables)

### Phase 6: Directory (AMRS-7)
- No migration (reads from existing + new tables)

### Phase 7: Admin (AMRS-8)
- No migration (new admin interface)

### Phase 8: Retention (AMRS-9)
- No migration (new records created)

### Phase 9: Integrations (AMRS-10)
- No migration (read-only access)

### Migration Risks
- **HIGH:** Existing auth flows must not break
- **HIGH:** Existing service provider profiles must not lose data
- **MEDIUM:** Sponsor profiles must remain accessible
- **LOW:** New tables are additive

### Rollback Strategy
- Each phase has specific rollback procedures
- New tables can be dropped without affecting existing data
- Existing tables are extended, not replaced
- Backward compatibility layer maintains existing API contracts

---

## 4. WHAT ARCHITECTURE RISKS REMAIN?

### HIGH RISK
1. **Schema migration complexity** — 10 new tables + data migration from 4 existing sources
2. **Reputation weight tuning** — Wrong weights could make system unfair
3. **Performance impact** — Additional queries on every request

### MEDIUM RISK
4. **UX complexity** — Adaptive profiles may confuse users
5. **Admin override abuse** — Manual override requires careful controls
6. **Cross-module integration** — AMRS reads from Services/Properties/Office

### LOW RISK
7. **Backward compatibility** — Existing role system must continue working
8. **Security vulnerabilities** — New attack surfaces from new tables/APIs
9. **Migration failure** — Data loss during migration

### Mitigation Strategies
1. **Schema migration:** Test on staging, rollback procedures, data validation
2. **Reputation weights:** Start conservative, tune from real data, admin-adjustable
3. **Performance:** Load testing, query optimization, caching where safe
4. **UX complexity:** User testing, progressive disclosure, clear documentation
5. **Admin override:** Audit logging, approval workflow, exception-only
6. **Cross-module:** Contract-based access, clear ownership, no direct DB access
7. **Backward compatibility:** Parallel systems during migration, feature flags
8. **Security:** Security audit, penetration testing, input validation
9. **Migration failure:** Backup before migration, validation after, rollback plan

---

## 5. WHAT IS THE RECOMMENDED FIRST IMPLEMENTATION SLICE?

### Recommended: AMRS-1 + AMRS-2 + AMRS-3 (Partial)

**AMRS-1: Domain Contracts (1 week)**
- Define entity interfaces
- Define API contracts
- Define permission extensions
- Validate contracts

**AMRS-2: Database Foundation (2 weeks)**
- Create 10 new tables
- Validate schema
- Test migrations
- Verify backward compatibility

**AMRS-3: Registration (Partial) (1 week)**
- Normal user registration (extend existing)
- Basic professional upgrade (simplified wizard)
- Basic organization creation (simplified wizard)

**Total: 4 weeks**

**Why this slice:**
- Establishes foundation (contracts + database)
- Enables basic user flows (registration + upgrade)
- Validates architecture decisions early
- Provides visible progress
- Low risk (additive changes)

**What's NOT in this slice:**
- Full verification system
- Reputation engine
- Adaptive profiles
- Directory
- Admin controls

**Acceptance criteria:**
- All existing tests pass
- New tables created successfully
- Normal user registration works
- Professional upgrade works (simplified)
- Organization creation works (simplified)
- No security vulnerabilities
- Performance acceptable

---

## 6. DECISION REGISTER STATUS

| Decision | Status | Approval Needed |
|----------|--------|----------------|
| Identity Model | RECOMMENDED | Product Owner |
| Account/Capability | RECOMMENDED | Product Owner |
| Organization Domain | RECOMMENDED | Product Owner |
| Organization Types | RECOMMENDED | Product Owner |
| Reputation Ownership | RECOMMENDED | Product Owner |
| Normal User Levels | RECOMMENDED | Product Owner |
| ProMax | RECOMMENDED | Product Owner |
| Gold/Distinguished | RECOMMENDED | Product Owner |
| Verification | RECOMMENDED | Product Owner |
| Activity | RECOMMENDED | Product Owner |
| Availability | RECOMMENDED | Product Owner |
| Profile Strength | RECOMMENDED | Product Owner |
| Business Presence | RECOMMENDED | Product Owner |
| Reviews | RECOMMENDED | Product Owner |
| Directory | RECOMMENDED | Product Owner |
| Organic Ranking | RECOMMENDED | Product Owner |
| Level Benefits | RECOMMENDED | Product Owner |
| Commercial Plans | DEFERRED | Product Owner |
| Retention | RECOMMENDED | Product Owner |
| Admin Control | RECOMMENDED | Product Owner |
| Database Foundation | RECOMMENDED | Product Owner |
| Migration Order | RECOMMENDED | Product Owner |

---

## 7. QUALITY ASSURANCE

### Pre-Implementation Checklist
- ✅ All 14 documentation files created
- ✅ Product Decision Register created
- ✅ MVP Scope defined
- ✅ Implementation Readiness documented
- ✅ All verification gates pass
- ✅ No production code modified
- ✅ No database migrations created
- ✅ No new routes created
- ✅ No new UI components created

### Post-Approval Checklist
- [ ] Team allocation confirmed
- [ ] Staging environment available
- [ ] Development branch created
- [ ] CI/CD pipeline configured
- [ ] Testing strategy defined
- [ ] Security review scheduled
- [ ] Performance baseline established

---

## 8. RECOMMENDED NEXT STEPS

1. **Product Owner reviews** all 14 documentation files
2. **Product Owner approves** Product Decision Register
3. **Product Owner confirms** MVP Scope
4. **Team allocation** for AMRS implementation
5. **Staging environment** setup
6. **AMRS-1 begins** (Domain Contracts)

---

**AMRS IMPLEMENTATION READINESS: YES**

**WAITING FOR: Product Owner Approval**
