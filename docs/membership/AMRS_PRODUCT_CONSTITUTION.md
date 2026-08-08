# AKARPROMAX AMRS PRODUCT CONSTITUTION

## Foundational Principles — Do Not Break

---

### IDENTITY

**1. One User, One Login, One AkarProMax Identity.**
A person has one account. Professional and Organization are relationships, not separate accounts.

**2. ProfessionalProfile is a capability, not an account type.**
If `ProfessionalProfile` exists, the user can provide services. If not, they cannot. The column `user.accountType` is unnecessary — the existence of the profile IS the type.

**3. Organization is independent from User.**
An Organization exists as its own entity. Users relate to Organizations via `OrganizationMembership`. An Organization is not a user, and a user is not an organization.

**4. Platform Role ≠ Organization Role.**
`super_admin` does not mean `ORGANIZATION_OWNER`. `viewer` does not mean `MEMBER`. These are parallel systems.

---

### VERIFICATION

**5. Verification is evidence, not endorsement.**
"موثق" means "AkarProMax verified this information." It does NOT mean "AkarProMax guarantees this company" or "best company" or "risk-free."

**6. Verification is a record, not a boolean.**
Each verification type (email, phone, identity, professional, license, organization) has its own status, expiry, and audit trail. No single `verified=true`.

**7. Verification is server-controlled.**
No client can mark themselves as verified. All verification changes happen server-side with admin approval where required.

---

### REPUTATION

**8. Reputation cannot be purchased.**
Gold and ProMax are earned through verified performance and trust. Commercial plans (FREE/BUSINESS/PROFESSIONAL/ENTERPRISE) are separate systems that do NOT affect organic reputation.

**9. Professional reputation ≠ Organization reputation.**
Ahmed can be GOLD while XYZ Engineering is RISING. No automatic inheritance. No automatic transfer.

**10. Reputation ≠ Activity.**
Daily login does not increase reputation. 100 page views do not equal Gold. Reputation is trust + performance + compliance. Activity is platform usage.

**11. Reputation is server-controlled.**
No client can set `level=promax`. All reputation transitions are computed server-side from verified signals.

**12. No automatic reputation inheritance.**
Employee → Organization: NO direct level transfer.
Organization → Employee: NO direct level transfer.
Owner → Organization: NO direct level transfer.
Contextual signals may exist in the future, but source of truth remains independent.

**13. Sponsored ≠ Organic.**
Paid promotion is clearly labeled. Sponsored placement does NOT improve organic reputation or ranking.

---

### PROFILES

**14. Profile Strength ≠ Reputation.**
A user can have 100% profile strength and NEW reputation. This is valid. Profile strength answers "How complete is this profile?" not "How trustworthy?"

**15. Activity ≠ Availability.**
A user can be Gold, Active, and Unavailable. This is valid. Availability is current willingness to accept work, not historical activity.

**16. One Adaptive Profile Engine.**
No separate pages per level (new-profile.tsx, gold-profile.tsx). One design system, four presentation variants (Base/Enhanced/Premium/ProMax), content-driven adaptation.

**17. Empty sections are hidden.**
If a section has no content, it is not displayed. No empty states unless actionable.

---

### ORGANIZATION

**18. One Organization Engine.**
No separate RealEstateCompanyEngine, ContractorCompanyEngine, EngineeringCompanyEngine. One Organization adapts via type + categories + specializations.

**19. Branches are not independent organizations.**
Branches share verification and reputation with their parent organization. They are physical locations, not separate entities.

**20. Country-aware, not country-hardcoded.**
The system supports multiple countries. No single country is assumed in core domain logic.

---

### DIRECTORY & DISCOVERY

**21. One Directory Engine.**
No duplicate directory pages. All discovery views (startups, verified, gold, ProMax, nearby, available, top-rated) are filters of the same engine.

**22. Newcomers receive fair discovery opportunity.**
Verified newcomers get visibility boosts. Profile quality and relevance are weighted. Rich-get-richer loops are prevented.

**23. ProMax always first is wrong.**
Ranking considers relevance, distance, availability, verification, reputation, rating, and response. No single factor dominates.

---

### BUSINESS PRESENCE

**24. Business Presence is a mini-site inside AkarProMax.**
Not a separate website. Not a separate domain. Not a separate app. Not a separate design system.

**25. NEW profiles are not deliberately poor.**
Every profile level provides a professional, complete experience. Benefits are enhancements, not gates for basic functionality.

**26. Gold does not mean gold everywhere.**
Subtle premium accent. Badge. Professional header treatment. Enhanced statistics. NOT casino look, NOT luxury overload.

**27. ProMax does not mean flashy.**
Premium. Professional. Calm. High trust. Exclusive without neon, gaming, or excessive animation.

---

### REVIEWS

**28. Service reviews are the proven review system.**
For MVP, organization and professional reputation uses service reviews where available. New review types require domain-specific interaction models before implementation.

**29. Verified interaction reviews > generic public comments.**
Reviews tied to actual transactions carry more weight than ungrounded public comments.

---

### RETENTION

**30. Real value loops, not dark patterns.**
No fake urgency. No fake achievements. No notification spam. No manipulation. Retention through accumulated genuine value.

**31. Next Best Action is deterministic, not AI.**
Real data only. Actionable. Timely. Respectful. No fake recommendations.

---

### SECURITY

**32. Server-controlled trust fields.**
Client cannot set: level, verification status, reputation score, organization verification. All trust-related fields are server-computed or server-approved.

**33. Public DTOs minimize personal data.**
Public profiles show: display name, verification summary, reputation level, activity status. NEVER: document numbers, raw licenses, private contact, admin notes.

**34. Ownership checks on every private endpoint.**
IDOR prevention is mandatory. Cross-organization access requires membership verification.

---

### COMMERCIAL

**35. Commercial plans are separate from reputation.**
What can be sold: analytics, portfolio limits, team features, CRM, support, business tools.
What CANNOT be sold: verification truth, Gold level, ProMax level, fake reviews, fake performance, fake ranking.

---

### ADMIN

**36. Admin override is exceptional, not routine.**
Manual override requires: reason, admin ID, audit log, optional expiry. Does NOT erase automated history.

**37. Policy versioning is mandatory.**
Every reputation evaluation records which policy version was used. Every policy change is versioned.

---

### MIGRATION

**38. Backward compatibility is non-negotiable.**
Existing auth, services providers, service reviews, property ownership, platform RBAC, admin, and office integration must continue working during AMRS rollout.

**39. Additive changes preferred over replacement.**
New tables are added. Existing tables are extended, not replaced. Parallel systems during migration.

---

### SCOPE

**40. MVP is minimal.**
10 new tables. Core identity + verification + reputation + profiles + directory + admin. No badges, no achievements, no commercial billing, no anti-fraud AI, no advanced analytics.

**41. Deferred items are deferred, not forgotten.**
Badges, achievements, commercial plans, advanced analytics, custom themes, API access, white-label — planned for post-MVP.

**42. Implementation order is sequential with identified critical path.**
AMRS-1 → AMRS-2 → AMRS-3 → AMRS-5 → AMRS-6 → AMRS-7 → AMRS-10 → AMRS-11 → AMRS-12.

---

**This Constitution is the reference for all AMRS implementation decisions.**

**Deviations require explicit justification and Product Owner approval.**
