# AMRS MVP SCOPE

## AkarProMax Membership & Reputation System — Minimum Viable Product

---

## MUST HAVE (MVP)

### Identity
- ONE user identity (one login, one account)
- ProfessionalProfile as optional relationship
- Organization as new entity
- OrganizationMembership for multi-org support
- Backward compatibility with existing role system

### Verification
- VerificationRecord table
- Email verification (auto)
- Phone verification (auto)
- Identity verification (manual)
- Professional verification (manual)
- Organization verification (manual)
- License verification (manual)
- Public trust display (✓/✗ per type)
- Verification expiry (1 year default)

### Reputation
- 5 levels: NEW, RISING, DISTINGUISHED, GOLD, PROMAX
- ReputationProfile per entity (Professional, Organization)
- Basic policy engine (configurable signals/weights)
- Server-controlled level transitions
- 90-day evaluation window
- 30-day grace period before downgrade
- Policy versioning
- Reputation history tracking
- Public level display
- Private level explanation

### Activity
- ActivityState per entity
- Configurable windows (active/recently_active/low/inactive)
- Meaningful activity signals
- Public activity status

### Availability
- AvailabilityState for Professional and Organization
- States: available, limited, unavailable
- Public availability display

### Profile Strength
- ProfileStrength per entity
- Score 0-100 based on completed fields
- Independent of reputation
- Display on profile

### Adaptive Profiles
- ONE design system
- 4 presentation variants (Base/Enhanced/Premium/ProMax)
- Content-driven adaptation
- Empty section hiding
- Responsive (1100/780/480px)
- RTL/LTR support
- Dark mode support

### Business Presence
- Professional profile page
- Organization profile page
- Adaptive sections based on level
- Verification summary
- Reputation badge
- Activity status
- Availability display
- Basic metrics

### Directory
- One directory engine
- MVP filters: type, category, city, verification, reputation, availability, rating
- Basic search
- Discovery views (same engine, different params)

### Registration
- Normal user registration (existing, extend)
- Professional upgrade wizard (8 steps)
- Organization creation wizard (11 steps)
- Progressive onboarding

### Admin
- Membership & Reputation workspace
- Level management (view/edit)
- Policy management (view/edit)
- Verification management (approve/reject)
- Audit trail
- Manual override (exceptional)

### Integration
- Command Center: membership metrics summary
- Services: read-only (professional profile context)
- Properties: read-only (organization identity context)
- Office: read-only (organization summary)

---

## SHOULD HAVE (Post-MVP)

### Enhanced Verification
- Address verification
- Third-party verification adapters
- Country-specific verification

### Enhanced Reputation
- Advanced signal weighting
- Category-normalized reputation
- Cross-entity reputation signals (indirect)
- Advanced fraud detection

### Enhanced Directory
- Specialization filter
- Radius search
- Advanced geo
- Multiple filter combinations
- Sort options

### Enhanced Profiles
- Portfolio management
- Achievement display
- Analytics dashboard
- Advanced metrics

### Enhanced Retention
- Next Best Action engine
- Weekly digest
- Achievement system
- Progress tracking
- Notification preferences

### Enhanced Admin
- Bulk operations
- Import/export
- Advanced reporting
- Emergency controls

---

## DEFERRED (Not in Scope)

### Badges & Achievements
- Badge system
- Achievement system
- Badge rules
- Achievement progress
- Badge display

### Commercial Plans
- Billing integration
- Plan management
- Subscription handling
- Payment processing
- Plan-based feature gating

### Advanced Features
- Anti-fraud AI
- ML-based detection
- Advanced analytics
- Custom reports
- API access
- White-label options
- Custom integrations

### Advanced Profiles
- Custom profile themes
- Advanced SEO features
- Profile customization
- Advanced media support

### Advanced Directory
- Advanced ranking algorithm
- Personalized recommendations
- Saved searches
- Alert system

### Advanced Retention
- Gamification system
- Leaderboards
- Social features
- Community features

---

## EXPLICITLY OUT OF SCOPE

- ❌ Separate accounts per role
- ❌ Pay-to-win reputation
- ❌ Dark patterns
- ❌ Notification spam
- ❌ Fake urgency
- ❌ Fake achievements
- ❌ Manual reputation entry
- ❌ Client-controlled level
- ❌ Reputation inheritance
- ❌ Separate organization engines
- ❌ Duplicate profile pages
- ❌ Separate directory systems
- ❌ Anti-fraud AI platform
- ❌ ML-based detection
- ❌ Billing integration
- ❌ Plan-based reputation

---

## MVP SUCCESS CRITERIA

### Technical
- All existing tests pass (185/185)
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

---

## MVP TIMELINE ESTIMATE

| Phase | Duration | Dependencies |
|-------|----------|-------------|
| AMRS-1 | 1 week | None |
| AMRS-2 | 2 weeks | AMRS-1 |
| AMRS-3 | 2 weeks | AMRS-2 |
| AMRS-4 | 1 week | AMRS-2 |
| AMRS-5 | 2 weeks | AMRS-2, AMRS-4 |
| AMRS-6 | 3 weeks | AMRS-3, AMRS-5 |
| AMRS-7 | 2 weeks | AMRS-6 |
| AMRS-8 | 1 week | AMRS-5, AMRS-6 |
| AMRS-9 | 2 weeks | AMRS-5, AMRS-6 |
| AMRS-10 | 2 weeks | AMRS-6, AMRS-7 |
| AMRS-11 | 2 weeks | AMRS-10 |
| AMRS-12 | 1 week | AMRS-11 |
| **Total** | **~21 weeks** | |

**Critical path:** AMRS-1 → AMRS-2 → AMRS-3 → AMRS-5 → AMRS-6 → AMRS-7 → AMRS-10 → AMRS-11 → AMRS-12

---

## MVP TEAM REQUIREMENTS

| Role | Count | Responsibility |
|------|-------|---------------|
| Backend Developer | 2 | Database, API, business logic |
| Frontend Developer | 2 | UI components, pages, responsive |
| Full-stack Developer | 1 | Integration, testing |
| Product Owner | 1 | Decisions, priorities, acceptance |
| QA | 1 | Testing, validation |

**Total: 7 people**

---

## MVP RISK REGISTER

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Schema migration breaks existing | HIGH | MEDIUM | Careful testing, rollback plan |
| Reputation weights wrong | MEDIUM | HIGH | Start conservative, tune from data |
| UX complexity confuses users | MEDIUM | MEDIUM | User testing, iterate |
| Performance degrades | HIGH | LOW | Load testing, optimization |
| Security vulnerability | HIGH | LOW | Security audit, penetration testing |
| Timeline overrun | MEDIUM | MEDIUM | Phased delivery, scope management |
