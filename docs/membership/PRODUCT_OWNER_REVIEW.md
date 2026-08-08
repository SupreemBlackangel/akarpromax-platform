# PRODUCT OWNER REVIEW — AMRS 22 DECISIONS

## Quick Reference for Product Owner Approval

---

## DECISION 1 — IDENTITY MODEL
**Recommendation:** RECOMMENDED_APPROVE
**Why:** One identity reduces friction, prevents account proliferation, enables cumulative value. ProfessionalProfile as relationship (not account type) is cleaner.
**Risk:** Migration complexity from existing role system
**MVP impact:** Foundation — all other decisions depend on this
**Approval:** PENDING

---

## DECISION 2 — ACCOUNT/CAPABILITY MODEL
**Recommendation:** RECOMMENDED_APPROVE
**Why:** Separating identity (what you ARE) from capability (what you CAN DO) is correct. `user.accountType` column is unnecessary — existence of ProfessionalProfile IS the type.
**Risk:** UI complexity if context switching is not intuitive
**MVP impact:** Affects profile design and registration flows
**Approval:** PENDING

---

## DECISION 3 — ORGANIZATION MODEL
**Recommendation:** RECOMMENDED_APPROVE
**Why:** New Organization entity provides clean separation from legacy sponsor data. Reusing sponsor_profiles for legacy maintains backward compatibility.
**Risk:** Dual entity (sponsor + organization) during migration
**MVP impact:** Foundation for organization features
**Approval:** PENDING

---

## DECISION 4 — ORGANIZATION TYPES
**Recommendation:** RECOMMENDED_APPROVE
**Why:** ONE Organization Engine + type field + categories + specializations is the right abstraction. Separate tables per type would create duplication.
**Risk:** Schema may need extension for type-specific fields
**MVP impact:** Organization creation and profile design
**Approval:** PENDING

---

## DECISION 5 — REPUTATION OWNERSHIP
**Recommendation:** RECOMMENDED_APPROVE
**Why:** Professional reputation independent of Organization reputation prevents gaming and reflects actual performance per context. Normal users do NOT need reputation levels.
**Risk:** Users may expect reputation to transfer
**MVP impact:** Reputation engine design
**Approval:** PENDING

---

## DECISION 6 — NORMAL USER LEVEL MODEL
**Recommendation:** RECOMMENDED_MODIFY
**Why:** Same engine, different display vocabulary is correct. BUT normal users should NOT have public reputation levels displayed. Only professionals and organizations display levels. Normal users show verification status and activity only.
**Modification:** Remove public reputation level display for normal users. Keep internal trust scoring for anti-abuse only.
**Risk:** Reduced complexity for normal users
**MVP impact:** Simplifies normal user profile
**Approval:** PENDING

---

## DECISION 7 — PROMAX MODEL
**Recommendation:** RECOMMENDED_APPROVE
**Why:** Hybrid (threshold + sustained performance + periodic review) balances fairness with sustainability. Fixed threshold only is too rigid. Top percentile is unfair in small markets.
**Risk:** Complexity in implementation, threshold tuning needed
**MVP impact:** Reputation engine core logic
**Approval:** PENDING

---

## DECISION 8 — GOLD / DISTINGUISHED
**Recommendation:** RECOMMENDED_APPROVE
**Why:** Product-meaningful definitions help users understand levels beyond numbers.
- DISTINGUISHED: "Consistently good performance with verified track record"
- GOLD: "High sustained trust and performance that others rely on"
- PROMAX: "Top sustained professional standard that sets the benchmark"
**Risk:** Communication clarity in UI
**MVP impact:** Level display and user education
**Approval:** PENDING

---

## DECISION 9 — VERIFICATION
**Recommendation:** RECOMMENDED_APPROVE
**Why:** VerificationRecord with MVP subset covers essential trust types. Auto for email/phone, manual for identity/professional/license/organization. 1-year expiry default.
**Risk:** Users may expect more verification types immediately
**MVP impact:** Verification system and trust display
**Approval:** PENDING

---

## DECISION 10 — ACTIVITY
**Recommendation:** RECOMMENDED_APPROVE
**Why:** Configurable windows per entity type is correct. Professional activity windows should be shorter (14/30/90/180 days) than normal users (30/90/180/365 days). Meaningful activity signals (not just login) are required.
**Risk:** Windows may need adjustment based on real data
**MVP impact:** Activity tracking and display
**Approval:** PENDING

---

## DECISION 11 — AVAILABILITY
**Recommendation:** RECOMMENDED_APPROVE
**Why:** Professional + Organization only, not Branch. Branch-level availability is too granular for MVP. Real-time online/offline is deferred.
**Risk:** Users may expect real-time availability
**MVP impact:** Availability display on profiles
**Approval:** PENDING

---

## DECISION 12 — PROFILE STRENGTH
**Recommendation:** RECOMMENDED_APPROVE
**Why:** Completion system 0-100, independent of reputation. Guides profile completion without conflating with trust.
**Risk:** Users may confuse profile strength with reputation
**MVP impact:** Profile completion UX
**Approval:** PENDING

---

## DECISION 13 — BUSINESS PRESENCE
**Recommendation:** RECOMMENDED_APPROVE
**Why:** One adaptive engine, 4 variants. Professional mini-site inside AkarProMax. Not separate website/domain/app.
**Risk:** Design complexity in adaptive rendering
**MVP impact:** Profile pages and directory
**Approval:** PENDING

---

## DECISION 14 — REVIEWS
**Recommendation:** RECOMMENDED_APPROVE
**Why:** Extend service_reviews for Professional reputation. Defer organization/property reviews until verified interaction models are designed.
**Risk:** Organizations may lack social proof in MVP
**MVP impact:** Reputation signals
**Approval:** PENDING

---

## DECISION 15 — DIRECTORY
**Recommendation:** RECOMMENDED_APPROVE
**Why:** One engine, MVP filters (type, category, city, verification, reputation, availability, rating). Advanced filters deferred.
**Risk:** Limited filtering may frustrate power users
**MVP impact:** Discovery and search
**Approval:** PENDING

---

## DECISION 16 — ORGANIC RANKING
**Recommendation:** RECOMMENDED_APPROVE
**Why:** Multi-factor scoring (relevance, distance, availability, verification, reputation, rating, response). Newcomer boost for verified profiles. Sponsored clearly separated.
**Risk:** Algorithm may need tuning
**MVP impact:** Search results quality
**Approval:** PENDING

---

## DECISION 17 — LEVEL BENEFITS
**Recommendation:** RECOMMENDED_APPROVE
**Why:** Progressive benefits, core features for all. No lockout. Benefits are enhancements, not gates.
**Risk:** Two-class perception if benefits are too different
**MVP impact:** Profile features and directory eligibility
**Approval:** PENDING

---

## DECISION 18 — COMMERCIAL PLANS
**Recommendation:** RECOMMENDED_DEFER
**Why:** Commercial plans are separate from reputation. Deferred to post-MVP. No billing integration in MVP.
**Risk:** Revenue model unclear
**MVP impact:** None (deferred)
**Approval:** PENDING

---

## DECISION 19 — RETENTION
**Recommendation:** RECOMMENDED_APPROVE
**Why:** Real value loops, no dark patterns. Per-entity retention cadence. Next Best Action deterministic.
**Risk:** Notification frequency tuning
**MVP impact:** User engagement
**Approval:** PENDING

---

## DECISION 20 — ADMIN CONTROL
**Recommendation:** RECOMMENDED_APPROVE
**Why:** Dynamic (no deploy) + Versioned (policy version) + Structural (deploy required). Appropriate separation of concerns.
**Risk:** Admin may make changes without understanding impact
**MVP impact:** Admin workspace
**Approval:** PENDING

---

## DECISION 21 — DATABASE
**Recommendation:** RECOMMENDED_MODIFY
**Why:** 10 new MVP tables is correct. BUT reduce to 7 core tables for MVP:
1. organizations
2. organization_members
3. organization_branches
4. verification_records
5. reputation_profiles
6. reputation_evaluations
7. reputation_history

DEFER (not MVP): activity_states, availability_states, profile_strength — these can be computed from existing data or added as columns on existing tables during MVP.

**Modification:** Defer activity_states, availability_states, profile_strength to post-MVP. Compute from existing data during MVP.
**Risk:** Reduced schema complexity for MVP
**MVP impact:** Simpler MVP, faster delivery
**Approval:** PENDING

---

## DECISION 22 — MIGRATION ORDER
**Recommendation:** RECOMMENDED_APPROVE
**Why:** Sequential phases with identified critical path. First slice: AMRS-1 (contracts) + AMRS-2 (database) + AMRS-3 partial (registration) = 4 weeks.
**Risk:** Timeline uncertainty
**MVP impact:** Implementation planning
**Approval:** PENDING

---

## SUMMARY

| Decision | Recommendation | Risk |
|----------|---------------|------|
| 1. Identity | APPROVE | Migration |
| 2. Account/Capability | APPROVE | UI complexity |
| 3. Organization | APPROVE | Dual entity |
| 4. Organization Types | APPROVE | Schema extension |
| 5. Reputation Ownership | APPROVE | User education |
| 6. Normal User Levels | MODIFY | — |
| 7. ProMax | APPROVE | Complexity |
| 8. Gold/Distinguished | APPROVE | Communication |
| 9. Verification | APPROVE | User expectations |
| 10. Activity | APPROVE | Tuning |
| 11. Availability | APPROVE | Future enhancement |
| 12. Profile Strength | APPROVE | User confusion |
| 13. Business Presence | APPROVE | Design complexity |
| 14. Reviews | APPROVE | Limited social proof |
| 15. Directory | APPROVE | Limited filtering |
| 16. Organic Ranking | APPROVE | Algorithm tuning |
| 17. Level Benefits | APPROVE | Two-class perception |
| 18. Commercial Plans | DEFER | Revenue model |
| 19. Retention | APPROVE | Notification tuning |
| 20. Admin Control | APPROVE | Impact understanding |
| 21. Database | MODIFY | — |
| 22. Migration Order | APPROVE | Timeline |

**Approve:** 19
**Modify:** 2 (Decisions 6 and 21)
**Defer:** 1 (Decision 18)
**Reject:** 0

---

## PRODUCT OWNER QUESTIONS

1. **Should normal users publicly display reputation levels, or only professionals and organizations?**
   - My recommendation: Normal users do NOT display reputation levels. Only verification status and activity.
   - Reason: Avoids confusing normal users with professional terminology.

2. Should portfolio item limits (5/15/50/unlimited) be per profile type or total across all profiles a user owns?
   - My recommendation: Per profile type. A ProfessionalProfile has its own limit. An Organization has its own limit.
   - Reason: Prevents gaming by spreading items across profiles.

3. Should organization classification (startup/SME/established/enterprise) be admin-configurable or fixed thresholds?
   - My recommendation: Fixed thresholds in code, adjustable via admin policy version.
   - Reason: Too important to be fully dynamic, but needs periodic adjustment.

4. Should the first implementation slice include verification (AMRS-4) or just contracts + database + registration?
   - My recommendation: Include AMRS-4 (verification) in the first slice. Verification is needed for reputation signals.
   - Reason: Reputation engine needs verification data.

5. Should we commit the 17 documentation files now or wait for final approval?
   - My recommendation: Commit now. Documentation is complete and internally consistent.
   - Reason: Creates clean baseline for implementation.
