# PRODUCT DECISION REGISTER

## AkarProMax Membership & Reputation System (AMRS)

**Status:** PENDING PRODUCT OWNER APPROVAL

---

## DECISION 1 — IDENTITY MODEL

**DECISION:** ONE AKARPROMAX IDENTITY

**STATUS:** RECOMMENDED

**RECOMMENDATION:** One User, one login, one AkarProMax identity. Professional and Organization are relationships, not separate accounts.

**User** → **ProfessionalProfile** (optional, 1:1) → **OrganizationMemberships[]** (0:N)

**Professional as Account Type:** PROFESSIONAL is an **Account Type** that unlocks a ProfessionalProfile capability and Organization membership capability. It is NOT just a profile or just a membership — it is a combination that enables professional identity.

**ALTERNATIVES:**
- Separate accounts per role (REJECTED — violates ONE IDENTITY)
- Profile-only without account type (REJECTED — no clear identity model)
- Membership-only without profile (REJECTED — no professional identity)

**RATIONALE:** Single identity reduces friction, prevents account proliferation, and enables cumulative value across all platform roles.

**RISKS:** Migration from existing role-based system requires careful backward compatibility.

**RECOMMENDED ACTION:** RECOMMENDED_APPROVE

**PRODUCT OWNER APPROVAL:** PENDING

---

## DECISION 2 — ACCOUNT TYPE VS CAPABILITY

**DECISION:** Account Type is identity layer. Capability is permission layer. They are separate.

**STATUS:** RECOMMENDED

**RECOMMENDATION:**

For the scenario: "User searches properties, provides surveying services, owns engineering company, member of real-estate office":

```
Primary identity: User (one login)
Professional capability: ProfessionalProfile (surveying services)
Organization memberships:
  - XYZ Engineering (OWNER)
  - ABC Properties (AGENT)
Current working context: Switchable between personal/professional/org
```

**Where NOT to use accountType:**
- NOT for permission checks (use RBAC)
- NOT for feature gating (use verification/reputation)
- NOT for directory filtering alone (use capability flags)

**ALTERNATIVES:**
- Single accountType forces user into one box (REJECTED)
- Multiple accountTypes per user (ACCEPTED — via ProfessionalProfile + OrganizationMemberships)

**RATIONALE:** Users are complex. Account type identifies what they ARE, capability identifies what they CAN DO.

**RISKS:** UI complexity if switching between contexts is not intuitive.

**RECOMMENDED ACTION:** RECOMMENDED_APPROVE

**PRODUCT OWNER APPROVAL:** PENDING

---

## DECISION 3 — ORGANIZATION DOMAIN

**DECISION:** NEW Organization entity, not reusing sponsor_profiles

**STATUS:** RECOMMENDED

**RECOMMENDATION:**

Create new `organizations`, `organization_members`, `organization_branches` tables.

**Existing structures reused:**
- `sponsor_profiles` → Extended for legacy sponsor data
- `sponsor_branches` → Reused for legacy branch data
- `service_provider_profiles` → Kept for individual professional profiles

**What overlaps:**
- `sponsor_profiles.company_name_ar/en` overlaps with `organizations.name_ar/en`
- `sponsor_branches` overlaps with `organization_branches`
- `sponsor_users` overlaps with `organization_members`

**What must be merged:**
- `sponsor_users` → `organization_members` (during migration)

**What must remain domain-owned:**
- Services marketplace owns: requests, offers, orders, disputes
- Properties domain owns: property listings
- Office integration owns: devices, sync, radar
- AMRS owns: organizations, membership, verification, reputation

**ALTERNATIVES:**
- Extend sponsor_profiles to be generic organizations (REJECTED — too many sponsor-specific columns)
- Use service_provider_profiles for organizations (REJECTED — designed for individuals)
- Create separate tables per org type (REJECTED — violates ONE ORGANIZATION ENGINE)

**RATIONALE:** New organization entity provides clean separation from legacy sponsor data while enabling future consolidation.

**RISKS:** Dual entity (sponsor + organization) during migration period.

**RECOMMENDED ACTION:** RECOMMENDED_APPROVE

**PRODUCT OWNER APPROVAL:** PENDING

---

## DECISION 4 — ORGANIZATION TYPES

**DECISION:** ONE Organization Engine + organizationType field

**STATUS:** RECOMMENDED

**RECOMMENDATION:** Option C — ONE Organization + capabilities/categories

```
Organization {
  type: "real_estate" | "business" | "other"
  categories: [...]  // service/property categories
  specializations: [...]  // what they do
}
```

**ALTERNATIVES:**
- Separate tables per type (REJECTED — violates ONE ENGINE)
- Single type + classification (INSUFFICIENT — need capabilities)
- Hybrid with separate tables (REJECTED — duplicate logic)

**RATIONALE:** ONE ENGINE adapts via type + categories + specializations. Presentation and capabilities differ, but core entity is shared.

**RISKS:** Schema may need extension for type-specific fields.

**RECOMMENDED ACTION:** RECOMMENDED_APPROVE

**PRODUCT OWNER APPROVAL:** PENDING

---

## DECISION 5 — REPUTATION OWNERSHIP

**DECISION:** Reputation per entity, no inheritance

**STATUS:** RECOMMENDED

**RECOMMENDATION:**

```
User reputation: OPTIONAL (0..1 ProfessionalProfile → 1:1 ReputationProfile)
Professional reputation: MANDATORY (ProfessionalProfile → 1:1 ReputationProfile)
Organization reputation: MANDATORY (Organization → 1:1 ReputationProfile)
```

**User reputation:** NOT needed for normal users. Only Professionals and Organizations have reputation. Normal users have verification and activity, but NOT a reputation level.

**Professional reputation:** INDEPENDENT of Organization reputation.

**Organization reputation:** INDEPENDENT of Professional reputation.

**Example:**
```
Ahmed (ProfessionalProfile): GOLD
XYZ Engineering (Organization): RISING
```
This is correct and intended.

**ALTERNATIVES:**
- Shared reputation across entities (REJECTED — gaming risk)
- No reputation for organizations (REJECTED — businesses need trust signals)
- Reputation inheritance (REJECTED — manipulation risk)

**RATIONALE:** Independent reputation prevents gaming and reflects actual performance per context.

**RISKS:** Users may expect reputation to transfer. Education needed.

**RECOMMENDED ACTION:** RECOMMENDED_APPROVE

**PRODUCT OWNER APPROVAL:** PENDING

---

## DECISION 6 — NORMAL USER LEVEL MODEL

**DECISION:** Model C — Same engine, different display vocabulary

**STATUS:** RECOMMENDED

**RECOMMENDATION:**

Shared engine/policy framework. Different signals. Different public presentation.

| Level | Professional Display | Normal User Display |
|-------|---------------------|---------------------|
| NEW | جديد | جديد |
| RISING | صاعد | صاعد |
| DISTINGUISHED | متميز | متميز |
| GOLD | مهني ذهبي | عضو متميز |
| PROMAX | ProMax | ProMax |

**Normal user signals:** Email verified, phone verified, valid listings, completed interactions, authentic reviews, policy compliance.

**Professional signals:** All normal signals + profile completeness, response rate, completed jobs, customer rating, cancellation rate.

**ALTERNATIVES:**
- Same display for all (ACCEPTED with different wording)
- Completely separate system for normal users (REJECTED — unnecessary complexity)
- No reputation for normal users (REJECTED — they need trust signals too)

**RATIONALE:** Shared engine reduces complexity. Different display avoids confusing normal users with professional terminology.

**RISKS:** May confuse users if they see different labels for same level.

**RECOMMENDED ACTION:** RECOMMENDED_MODIFY

**MODIFICATION:** Normal users should NOT display public reputation levels. Only professionals and organizations display levels. Normal users show verification status and activity only. Keep internal trust scoring for anti-abuse.

**PRODUCT OWNER APPROVAL:** PENDING

---

## DECISION 7 — PROMAX

**DECISION:** Hybrid model (threshold + sustained performance + periodic review)

**STATUS:** RECOMMENDED

**RECOMMENDATION:**

**Eligibility philosophy:**
- Eligibility gates (minimum requirements)
- Minimum performance threshold
- Minimum sustained period
- Category-normalized performance where required

**Scarcity:** Threshold-based (not top percentile)

**Evaluation:** 90-day rolling window, versioned policies

**Downgrade:** Automatic if signals fall below threshold, 30-day grace period

**Why not other models:**
- Fixed threshold only: Too rigid, doesn't account for market differences
- Top percentile: Unfair in small markets, creates artificial scarcity
- Invitation/editorial: Not scalable, biased

**ALTERNATIVES:**
- Fixed threshold (ACCEPTED as component)
- Top percentile (REJECTED — unfair in small markets)
- Invitation only (REJECTED — not scalable)

**RATIONALE:** Hybrid combines fairness (thresholds) with sustainability (periodic review) and gaming resistance (sustained performance).

**RISKS:** Complexity in implementation. Threshold tuning needed.

**RECOMMENDED ACTION:** RECOMMENDED_APPROVE

**PRODUCT OWNER APPROVAL:** PENDING

---

## DECISION 8 — GOLD / DISTINGUISHED

**DECISION:** Product-meaningful definitions

**STATUS:** RECOMMENDED

**RECOMMENDATION:**

**DISTINGUISHED:** "Consistently good performance with verified track record."

**GOLD:** "High sustained trust and performance that others rely on."

**PROMAX:** "Top sustained professional standard that sets the benchmark."

**Not just score numbers.** Each level has real meaning:
- DISTINGUISHED: You've proven you're reliable
- GOLD: You're someone others depend on
- PROMAX: You're the standard others aspire to

**ALTERNATIVES:**
- Score-only definitions (REJECTED — no product meaning)
- Arbitrary labels (REJECTED — confusing)
- Feature-gating only (REJECTED — loses trust meaning)

**RATIONALE:** Product meaning helps users understand what each level represents beyond numbers.

**RISKS:** May be hard to communicate clearly in UI.

**RECOMMENDED ACTION:** RECOMMENDED_APPROVE

**PRODUCT OWNER APPROVAL:** PENDING

---

## DECISION 9 — VERIFICATION

**DECISION:** VerificationRecord with MVP subset

**STATUS:** RECOMMENDED

**RECOMMENDATION:**

**MVP verification types:**

| Entity | Types |
|--------|-------|
| Normal User | email, phone |
| Professional | email, phone, identity, professional |
| Real Estate Org | email, phone, organization, license |
| Business Org | email, phone, organization, license |

**Deferred:** address verification, third-party verification adapters

**Public trust display:**
```
✓ البريد (Email)
✓ الهاتف (Phone)
✓ المنشأة (Organization) [org only]
✓ الترخيص (License) [org/professional]
```

**NOT displayed:** Document numbers, national ID, raw license, verification evidence.

**ALTERNATIVES:**
- Boolean verified flag (REJECTED — too coarse)
- All 7 types from day 1 (DEFERRED — unnecessary complexity)
- No verification records (REJECTED — need audit trail)

**RATIONALE:** MVP subset covers essential trust signals. Additional types can be added incrementally.

**RISKS:** Users may expect more verification types immediately.

**RECOMMENDED ACTION:** RECOMMENDED_APPROVE

**PRODUCT OWNER APPROVAL:** PENDING

---

## DECISION 10 — ACTIVITY

**DECISION:** Configurable windows, different per entity type

**STATUS:** RECOMMENDED

**RECOMMENDATION:**

| Entity | Active | Recently Active | Low Activity | Inactive |
|--------|--------|----------------|--------------|----------|
| Normal User | 30 days | 90 days | 180 days | 365 days |
| Professional | 14 days | 30 days | 90 days | 180 days |
| Organization | 14 days | 30 days | 90 days | 180 days |

**Meaningful activity signals:**
- Responding to lead
- Updating listing
- Replying to service request
- Managing office
- Publishing property
- Using professional workspace

**Login alone is NOT enough.** Must include meaningful actions.

**Activity ≠ Trust signal.** Activity is platform usage, not reputation.

**ALTERNATIVES:**
- Same windows for all (REJECTED — different usage patterns)
- Login-only activity (REJECTED — not meaningful)
- No activity model (REJECTED — need engagement signals)

**RATIONALE:** Different entities have different usage patterns. Configurable windows allow tuning.

**RISKS:** Windows may need adjustment based on real usage data.

**RECOMMENDED ACTION:** RECOMMENDED_APPROVE

**PRODUCT OWNER APPROVAL:** PENDING

---

## DECISION 11 — AVAILABILITY

**DECISION:** Professional and Organization only, not Branch

**STATUS:** RECOMMENDED

**RECOMMENDATION:**

**Who has availability:**
- Professional: YES
- Organization: YES
- Branch: NO (availability is org-level, not branch-level)

**Organization availability:** Independent of team member availability. An organization can be "AVAILABLE" even if one team member is "UNAVAILABLE."

**Semantics:**
```
AVAILABLE: Accepting new work/requests
LIMITED: Partially available (e.g., limited hours)
UNAVAILABLE: Not accepting new work/requests temporarily
```

**ALTERNATIVES:**
- Branch-level availability (REJECTED — too granular for MVP)
- Individual-level only (REJECTED — organizations need availability)
- Real-time online/offline (DEFERRED — not MVP)

**RATIONALE:** Organization-level availability is sufficient for discovery. Branch-level can be added later.

**RISKS:** Users may expect real-time availability (future enhancement).

**RECOMMENDED ACTION:** RECOMMENDED_APPROVE

**PRODUCT OWNER APPROVAL:** PENDING

---

## DECISION 12 — PROFILE STRENGTH

**DECISION:** Completion system, independent of reputation

**STATUS:** RECOMMENDED

**RECOMMENDATION:**

**Score: 0-100, computed from completed fields.**

| Entity | Required Fields | Weight |
|--------|----------------|--------|
| Normal User | name, email, phone, preferredLanguage | 100% |
| Professional | name, email, phone, bio, location, specializations | 100% |
| Real Estate Org | name, email, phone, type, location, description, logo | 100% |
| Business Org | name, email, phone, type, location, description, logo | 100% |

**Profile Strength ≠ Reputation.**

Example: Profile Strength 100% + Reputation NEW = Valid.

**ALTERNATIVES:**
- Tie to reputation (REJECTED — different concepts)
- Manual entry (REJECTED — should be automatic)
- No profile strength (REJECTED — users need completion guidance)

**RATIONALE:** Profile strength guides completion. Reputation reflects trust. They are independent.

**RISKS:** Users may confuse profile strength with reputation.

**RECOMMENDED ACTION:** RECOMMENDED_APPROVE

**PRODUCT OWNER APPROVAL:** PENDING

---

## DECISION 13 — BUSINESS PRESENCE

**DECISION:** One adaptive organization profile with presentation variants

**STATUS:** RECOMMENDED

**RECOMMENDATION:**

**Professional:** AdaptiveProfile with verification, reputation, availability, portfolio, reviews.

**Real Estate Office:**
- MVP: Cover, Logo, Name, Type, Location, Verification, Reputation, Activity, Overview, Properties, Reviews, About
- Expansion: Agents/Team, Branches, Services, Performance, Office connectivity

**Business Organization:**
- MVP: Cover, Logo, Name, Type, Location, Verification, Reputation, Activity, Overview, Services, Reviews, About
- Expansion: Specializations, Projects, Portfolio, Team, Branches, Quote requests

**Presentation levels:** Base (NEW), Enhanced (RISING), Premium (DISTINGUISHED/GOLD), ProMax (PROMAX)

**What changes:** Visual treatment, statistics, sections, analytics exposure, portfolio presentation, business credibility.

**What does NOT change:** Core layout, design system, components, tokens, accessibility.

**ALTERNATIVES:**
- Separate pages per level (REJECTED — maintenance nightmare)
- Same presentation for all (REJECTED — no progression incentive)
- Feature-gating (REJECTED — blocks basic functionality)

**RATIONALE:** One adaptive engine with presentation variants provides progression incentive without fragmentation.

**RISKS:** Design complexity in adaptive rendering.

**RECOMMENDED ACTION:** RECOMMENDED_APPROVE

**PRODUCT OWNER APPROVAL:** PENDING

---

## DECISION 14 — REVIEWS

**DECISION:** Extend existing service reviews, defer new review types

**STATUS:** RECOMMENDED

**RECOMMENDATION:**

**Current reusable:** service_reviews (1-5 star + 4 sub-ratings)

**Missing review capabilities:**
- Property reviews
- Organization reviews
- Professional reviews (outside service context)

**MVP recommendation:** Use service reviews for Professional reputation only. Organization reputation uses service reviews + verification + profile signals.

**Deferred:**
- Generic organization review model
- Property-office interaction review
- Real estate transaction review

**Verified interaction reviews > generic public comments.** Verified reviews carry more weight.

**ALTERNATIVES:**
- Create generic review table now (DEFERRED — design unclear)
- Use service reviews for everything (INSUFFICIENT — not all interactions are services)
- No reviews for organizations (REJECTED — businesses need social proof)

**RATIONALE:** Service reviews are proven. Extending to organizations requires careful design. Defer until patterns emerge.

**RISKS:** Organizations may lack social proof in MVP.

**RECOMMENDED ACTION:** RECOMMENDED_APPROVE

**PRODUCT OWNER APPROVAL:** PENDING

---

## DECISION 15 — DIRECTORY

**DECISION:** One directory engine with MVP filters

**STATUS:** RECOMMENDED

**RECOMMENDATION:**

**MVP Filters:**
- Type (Professional, Real Estate Org, Business Org)
- Category
- City
- Verification (verified only)
- Reputation (level filter)
- Availability (available only)
- Rating (minimum)

**Deferred:**
- Specialization filter
- Radius search
- Advanced geo
- Multiple filter combinations

**SEO/Discovery Views:**
- All use ONE directory engine
- Different URL params for different views
- Not separate page logic

**ALTERNATIVES:**
- Multiple directory pages (REJECTED — duplicate logic)
- No filters (REJECTED — unusable)
- Advanced filters from day 1 (DEFERRED — complexity)

**RATIONALE:** MVP filters cover essential discovery. Advanced filters add later.

**RISKS:** Limited filtering may frustrate power users.

**RECOMMENDED ACTION:** RECOMMENDED_APPROVE

**PRODUCT OWNER APPROVAL:** PENDING

---

## DECISION 16 — ORGANIC RANKING

**DECISION:** Multi-factor scoring, newcomer boost

**STATUS:** RECOMMENDED

**RECOMMENDATION:**

**Ranking factors:**
- Relevance (category match)
- Distance (geographic proximity)
- Availability (available > limited > unavailable)
- Verification (verified > unverified)
- Reputation (level-based)
- Rating (average rating)
- Response (response rate + speed)

**Newcomer strategy:**
- Verified newcomer boost (temporary)
- High profile quality signals
- Strong relevance weighting
- Availability priority
- Geographic proximity

**Sponsored separation:**
- Sponsored results clearly labeled
- Sponsored ≠ organic ranking
- Paid placement does NOT improve reputation

**ALTERNATIVES:**
- Reputation-only ranking (REJECTED — newcomers never get work)
- Distance-only ranking (REJECTED — ignores quality)
- Random rotation (REJECTED — poor user experience)

**RATIONALE:** Multi-factor scoring balances quality with fairness. Newcomer boost prevents cold start.

**RISKS:** Ranking algorithm may need tuning.

**RECOMMENDED ACTION:** RECOMMENDED_APPROVE

**PRODUCT OWNER APPROVAL:** PENDING

---

## DECISION 17 — LEVEL BENEFITS

**DECISION:** Progressive benefits, core features for all

**STATUS:** RECOMMENDED

**RECOMMENDATION:**

**NEW:** Base profile, 5 portfolio items, basic analytics, community support
**RISING:** Enhanced layout, 15 portfolio items, basic analytics, email support
**DISTINGUISHED:** Premium layout, 50 portfolio items, enhanced analytics, directory eligible, priority support
**GOLD:** Premium+ layout, unlimited portfolio, advanced analytics, featured directory, dedicated support
**PROMAX:** Elite layout, unlimited portfolio, advanced analytics, top directory, early access, dedicated support

**Core features for ALL:** Profile creation, property listing, service requests, tool usage, basic search, community participation.

**No core function lockout.** Level benefits are ENHANCEMENTS, not gates.

**ALTERNATIVES:**
- Feature-gating per level (REJECTED — blocks basic functionality)
- Same benefits for all (REJECTED — no progression incentive)
- Paid benefits only (REJECTED — loses trust meaning)

**RATIONALE:** Progressive benefits incentivize improvement without blocking basics.

**RISKS:** Benefits may create perception of two-class system.

**RECOMMENDED ACTION:** RECOMMENDED_APPROVE

**PRODUCT OWNER APPROVAL:** PENDING

---

## DECISION 18 — COMMERCIAL PLANS

**DECISION:** Separate from reputation, future concern

**STATUS:** DEFERRED

**RECOMMENDATION:**

**Allowed paid benefits (future):**
- Advanced analytics
- Larger portfolio limits
- Team features
- CRM features
- Priority support
- Business tools

**Forbidden paid trust benefits:**
- Verification truth
- Organic reputation
- Gold level
- ProMax level
- Fake reviews
- Fake performance

**Separation model:**
```
Level Benefits = Reputation-based (earned)
Commercial Benefits = Plan-based (purchased)
```

**ALTERNATIVES:**
- Combine reputation and plans (REJECTED — pay-to-win)
- No commercial plans (REJECTED — business model)
- Plans determine reputation (REJECTED — manipulation risk)

**RATIONALE:** Separation maintains trust integrity while enabling monetization.

**RISKS:** Users may confuse paid features with earned reputation.

**RECOMMENDED ACTION:** RECOMMENDED_DEFER

**DEFERRAL:** Commercial plans deferred to post-MVP. No billing integration in MVP. Revenue model to be defined separately.

**PRODUCT OWNER APPROVAL:** PENDING

---

## DECISION 19 — RETENTION

**DECISION:** Real value loops, no dark patterns

**STATUS:** RECOMMENDED

**RECOMMENDATION:**

**Normal User:**
- Daily: Saved property changes, new matches
- Weekly: Property market updates, service responses
- Monthly: Important auction updates, community activity

**Professional:**
- Daily: Nearby opportunities, quote responses
- Weekly: Performance progress, reputation progress
- Monthly: Monthly report, achievement updates

**Office:**
- Daily: New leads, unread inquiries
- Weekly: Profile views, response performance
- Monthly: Monthly report, team activity

**Company:**
- Daily: Profile views, quote requests
- Weekly: Service opportunities, performance
- Monthly: Monthly report, market analysis

**Next Best Action:** Real data only, actionable, timely, respectful.

**ALTERNATIVES:**
- Notification spam (REJECTED — dark pattern)
- Fake urgency (REJECTED — manipulation)
- No retention strategy (REJECTED — user churn)

**RATIONALE:** Real value retention builds loyalty without manipulation.

**RISKS:** Notification frequency may need tuning.

**RECOMMENDED ACTION:** RECOMMENDED_APPROVE

**PRODUCT OWNER APPROVAL:** PENDING

---

## DECISION 20 — ADMIN CONTROL

**DECISION:** Dynamic controls with policy versioning

**STATUS:** RECOMMENDED

**RECOMMENDATION:**

**Dynamic (no deployment):**
- Display labels
- Thresholds
- Weights
- Activity windows
- Grace periods

**Versioned (requires policy version):**
- Level definitions
- Benefit mappings
- Evaluation windows

**Deployment-required:**
- New entity types
- New verification types
- Schema changes
- New permission groups

**ALTERNATIVES:**
- All dynamic (REJECTED — too risky)
- All deployment-required (REJECTED — too slow)
- No admin controls (REJECTED — operational overhead)

**RATIONALE:** Dynamic for common changes, versioned for policy changes, deployment for structural changes.

**RISKS:** Admin may make changes without understanding impact.

**RECOMMENDED ACTION:** RECOMMENDED_APPROVE

**PRODUCT OWNER APPROVAL:** PENDING

---

## DECISION 21 — DATABASE FOUNDATION

**DECISION:** 14 new tables, reuse existing

**STATUS:** RECOMMENDED

**RECOMMENDATION:**

**New MVP tables:**
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

**Deferred (not MVP):**
- badges
- entity_badges
- achievements
- achievement_progress

**Reuse existing:**
- users (extended)
- service_provider_profiles (extended)
- sponsor_profiles (extended)
- audit_logs (extended)

**Forbidden duplicates:**
- ❌ companies
- ❌ offices
- ❌ business_profiles

**ALTERNATIVES:**
- Extend existing tables only (REJECTED — too many sponsor-specific columns)
- Create all 14 tables (DEFERRED — 4 not needed for MVP)
- Create separate tables per entity (REJECTED — duplicate logic)

**RATIONALE:** 10 new tables cover MVP needs. 4 tables deferred until badges/achievements are designed.

**RISKS:** Schema migration requires careful execution.

**RECOMMENDED ACTION:** RECOMMENDED_MODIFY

**MODIFICATION:** Reduce from 10 to 7 core MVP tables. Defer activity_states, availability_states, profile_strength to post-MVP. These can be computed from existing data during MVP.

Core MVP tables:
1. organizations
2. organization_members
3. organization_branches
4. verification_records
5. reputation_profiles
6. reputation_evaluations
7. reputation_history

**PRODUCT OWNER APPROVAL:** PENDING

---

## DECISION 22 — MIGRATION ORDER

**DECISION:** Phased implementation with backward compatibility

**STATUS:** RECOMMENDED

**RECOMMENDATION:**

AMRS-1 → AMRS-2 → AMRS-3 → AMRS-4 → AMRS-5 → AMRS-6 → AMRS-7 → AMRS-8 → AMRS-9 → AMRS-10 → AMRS-11 → AMRS-12

**Critical path:** AMRS-1 (contracts) → AMRS-2 (database) → AMRS-3 (registration) → AMRS-5 (reputation)

**ALTERNATIVES:**
- Parallel implementation (REJECTED — dependency complexity)
- Big bang (REJECTED — too risky)
- Skip contracts (REJECTED — architecture foundation)

**RATIONALE:** Sequential phases reduce risk. Critical path identified.

**RISKS:** Timeline uncertainty. Resource allocation needed.

**RECOMMENDED ACTION:** RECOMMENDED_APPROVE

**PRODUCT OWNER APPROVAL:** PENDING

---

## SUMMARY

| # | Decision | Recommended Action | Risk | Approval |
|---|----------|-------------------|------|----------|
| 1 | Identity Model | RECOMMENDED_APPROVE | Migration | PENDING |
| 2 | Account/Capability | RECOMMENDED_APPROVE | UI complexity | PENDING |
| 3 | Organization Domain | RECOMMENDED_APPROVE | Dual entity | PENDING |
| 4 | Organization Types | RECOMMENDED_APPROVE | Schema extension | PENDING |
| 5 | Reputation Ownership | RECOMMENDED_APPROVE | User education | PENDING |
| 6 | Normal User Levels | RECOMMENDED_MODIFY | — | PENDING |
| 7 | ProMax | RECOMMENDED_APPROVE | Complexity | PENDING |
| 8 | Gold/Distinguished | RECOMMENDED_APPROVE | Communication | PENDING |
| 9 | Verification | RECOMMENDED_APPROVE | User expectations | PENDING |
| 10 | Activity | RECOMMENDED_APPROVE | Tuning needed | PENDING |
| 11 | Availability | RECOMMENDED_APPROVE | Future enhancement | PENDING |
| 12 | Profile Strength | RECOMMENDED_APPROVE | User confusion | PENDING |
| 13 | Business Presence | RECOMMENDED_APPROVE | Design complexity | PENDING |
| 14 | Reviews | RECOMMENDED_APPROVE | Limited social proof | PENDING |
| 15 | Directory | RECOMMENDED_APPROVE | Limited filtering | PENDING |
| 16 | Organic Ranking | RECOMMENDED_APPROVE | Algorithm tuning | PENDING |
| 17 | Level Benefits | RECOMMENDED_APPROVE | Two-class perception | PENDING |
| 18 | Commercial Plans | RECOMMENDED_DEFER | Revenue model | PENDING |
| 19 | Retention | RECOMMENDED_APPROVE | Notification tuning | PENDING |
| 20 | Admin Control | RECOMMENDED_APPROVE | Impact understanding | PENDING |
| 21 | Database | RECOMMENDED_MODIFY | — | PENDING |
| 22 | Migration Order | RECOMMENDED_APPROVE | Timeline | PENDING |

**Approve:** 19 | **Modify:** 2 (Decisions 6, 21) | **Defer:** 1 (Decision 18) | **Reject:** 0
