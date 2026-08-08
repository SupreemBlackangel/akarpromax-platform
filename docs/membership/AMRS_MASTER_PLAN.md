# AMRS MASTER PLAN

## AkarProMax Membership & Reputation System

### Vision

AkarProMax Membership & Reputation System (AMRS) transforms platform membership from a simple account into a **digital professional identity** with real accumulated value.

### Core Principles

1. **ONE IDENTITY** — One user, one login, one AkarPromax identity
2. **VERIFICATION ≠ REPUTATION** — Verification is trust signal, not reputation
3. **REPUTATION ≠ ACTIVITY** — Reputation is trust + performance, not usage
4. **ACTIVITY ≠ AVAILABILITY** — Activity is history, availability is current state
5. **PROFILE STRENGTH ≠ REPUTATION** — Completeness is not trustworthiness
6. **COMMERCIAL PLAN ≠ REPUTATION** — Paid plans are separate from organic reputation
7. **SPONSORED ≠ ORGANIC** — Sponsored placement is separate from organic ranking
8. **PLATFORM ROLE ≠ ORGANIZATION ROLE** — Admin access is separate from org membership
9. **PROMAX CANNOT BE BOUGHT** — Elite tier is earned, not purchased

---

## 1. Product Vision

### For Users

> "حسابي في AkarProMax أصبح أصلًا مهنيًا مهمًا."
> (My account in AkarProMax has become an important professional asset.)

### For Professionals

> "سمعتي وأعمالي هنا تبني مستقبلي المهني."
> (My reputation and work here build my professional future.)

### For Offices

> "AkarProMax أصبح قناة أعمال وعملاء وسمعة."
> (AkarProMax has become a channel for business, customers, and reputation.)

### For Companies

> "صفحتي في AkarProMax هي وجود تجاري حقيقي."
> (My page in AkarProMax is a real business presence.)

### Ultimate Goal

> "AkarProMax becomes difficult to leave because genuine accumulated value exists, not because of artificial lock-in."

---

## 2. Account Types

| Type | Arabic | Description |
|------|--------|-------------|
| NORMAL_USER | مستخدم | Regular platform user |
| PROFESSIONAL | حرفي / مهني | Individual service provider |
| REAL_ESTATE_ORGANIZATION | مكتب أو شركة عقارية | Real estate company/office |
| BUSINESS_ORGANIZATION | شركة / مؤسسة | General business entity |

**Account Type ≠ Profession.** Profession is an attribute, not an account type.

---

## 3. Reputation Levels

| Level | Arabic | Score Range | Description |
|-------|--------|-------------|-------------|
| NEW | جديد | 0-199 | New member, building history |
| RISING | صاعد | 200-449 | Growing presence, earning trust |
| DISTINGUISHED | متميز | 450-699 | Established, consistent quality |
| GOLD | ذهبي | 700-899 | Premium tier, proven track record |
| PROMAX | ProMax | 900-1000 | Elite tier, exceptional performance |

**ProMax is earned, not purchasable.**

---

## 4. Core Concepts

### Identity

```
User
├── ProfessionalProfile (optional)
├── OrganizationMemberships[]
└── VerificationRecords[]
```

### Verification

```
VerificationRecord
├── type (email, phone, identity, professional, license, address)
├── status (pending, verified, failed, expired, revoked)
├── verified_at, expires_at
└── verified_by
```

### Reputation

```
ReputationProfile
├── level (new, rising, distinguished, gold, promax)
├── score (0-1000, internal)
├── last_evaluated_at
└── policy_version
```

### Activity

```
ActivityState
├── state (active, recently_active, low_activity, inactive)
├── last_meaningful_action_at
└── action_count_30d
```

### Availability

```
AvailabilityState
├── state (available, limited, unavailable)
└── updated_at
```

### Profile Strength

```
ProfileStrength
├── score (0-100)
├── completed_fields[]
└── missing_fields[]
```

---

## 5. Architecture

### Domain Model

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
```

### Key Design Decisions

1. **Reputation per entity** — Professional reputation independent of Organization reputation
2. **No automatic inheritance** — Reputation does not transfer between entities
3. **Server-controlled transitions** — Client cannot set level directly
4. **Policy versioning** — Every evaluation records which policy was used
5. **Grace periods** — Warning before downgrade (except fraud)

---

## 6. Adaptive Profile Engine

### Variants

| Variant | Level | Features |
|---------|-------|----------|
| BASE | NEW | Standard layout, basic info |
| ENHANCED | RISING | Progress indicators, achievements |
| PREMIUM | DISTINGUISHED/GOLD | Premium layout, enhanced metrics |
| PROMAX | PROMAX | Elite layout, advanced analytics |

### Rules

- Same design system, same components, same tokens
- Visual differences are subtle, not dramatic
- Empty sections hidden
- Content-driven adaptation

---

## 7. Business Presence

### Concept

Professional Organization Mini-Site inside AkarProMax:
- Trust signals
- Company capability
- Performance metrics
- Portfolio showcase
- Verification display
- Service offerings
- Team visibility
- Branch locations
- Customer reviews
- Business CTA

### Not

- Separate website
- Separate domain
- Separate app
- Separate design system

---

## 8. Directory & Discovery

### Filters

- Entity type
- Organization type
- Organization classification
- Verification status
- Reputation level
- Activity status
- Availability
- Category
- Specialization
- Country/Region/City
- Rating

### Discovery Views

- Companies near you
- Verified companies
- Distinguished companies
- Gold companies
- ProMax companies
- Available professionals
- Top rated

### Ranking

- Relevance
- Distance
- Availability
- Quality
- Reputation
- Response
- Rating

---

## 9. Implementation Roadmap

| Phase | Goal | Scope |
|-------|------|-------|
| AMRS-0 | Audit | Current state + architecture design |
| AMRS-1 | Contracts | Entity interfaces + API contracts |
| AMRS-2 | Database | 14 new tables |
| AMRS-3 | Registration | Normal + Professional + Organization flows |
| AMRS-4 | Verification | VerificationRecord system |
| AMRS-5 | Reputation | Policy engine + evaluation |
| AMRS-6 | Profiles | Adaptive profiles + business presence |
| AMRS-7 | Directory | Search + discovery + ranking |
| AMRS-8 | Admin | Policy controls + audit |
| AMRS-9 | Retention | Next Best Action + achievements |
| AMRS-10 | Integrations | Office + Services + Properties |
| AMRS-11 | Security | Hardening + testing |
| AMRS-12 | Final | Integration + deployment |

---

## 10. Database Impact

### New Tables (14)

1. organizations
2. organization_members
3. organization_branches
4. verification_records
5. reputation_profiles
6. reputation_evaluations
7. reputation_history
8. activity_states
9. availability_states
10. profile_strength
11. badges
12. entity_badges
13. achievements
14. achievement_progress

### Reused Tables

- users (extended)
- service_provider_profiles (extended)
- sponsor_profiles (extended)
- audit_logs (extended)

### Forbidden Duplicates

- ❌ companies (use organizations)
- ❌ offices (use branches)
- ❌ business_profiles (use organization profiles)

---

## 11. Security

### Data Classification

- PUBLIC: Display name, verification summary, reputation level
- PRIVATE: Identity documents, raw licenses, private contact
- SENSITIVE: Document numbers, verification evidence
- ADMIN ONLY: Internal scores, override records

### Protection

- Server-controlled transitions
- Ownership checks
- Permission gates
- Audit logging
- Data minimization

---

## 12. Documentation

| File | Content |
|------|---------|
| AMRS_MASTER_PLAN.md | This file |
| CURRENT_STATE_AUDIT.md | Existing system audit |
| DOMAIN_MODEL.md | Entity relationships |
| ACCOUNT_TYPES_AND_ROLES.md | Concept separation |
| REGISTRATION_FLOWS.md | Registration workflows |
| VERIFICATION_MODEL.md | Verification system |
| REPUTATION_MODEL.md | Reputation system |
| ADAPTIVE_PROFILE_SYSTEM.md | Profile engine |
| ORGANIZATION_MODEL.md | Organization system |
| LEVEL_BENEFITS.md | Level benefits |
| RETENTION_STRATEGY.md | Retention strategy |
| ADMIN_CONTROL_MODEL.md | Admin controls |
| SECURITY_AND_PRIVACY.md | Security & privacy |
| IMPLEMENTATION_PLAN.md | Implementation roadmap |

---

## 13. Success Metrics

### Technical

- All tests pass
- No security vulnerabilities
- Performance meets targets
- Architecture validated

### Product

- Users understand reputation system
- Users see value in progression
- No dark pattern perception
- Trust increased

### Business

- Professional retention increased
- Organization creation increased
- Verification rate increased
- Directory engagement increased

---

## 14. What We Are NOT Building

- ❌ LinkedIn clone
- ❌ Badge marketplace
- ❌ Pay-to-win reputation
- ❌ Gamification for engagement
- ❌ Dark patterns
- ❌ Fake urgency
- ❌ Notification spam

## 15. What We ARE Building

- ✅ Digital professional identity
- ✅ Real accumulated value
- ✅ Trust-based reputation
- ✅ Professional business presence
- ✅ Discovery and directory
- ✅ Retention through value

---

**AMRS Architecture Ready for Product Review: YES**

**Implementation Started: NO**

**Ready for Discussion with Product Owner: YES**
