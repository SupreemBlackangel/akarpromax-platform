# AKARPROMAX — PRODUCT CONSTITUTION

**Status:** governing document. Ratified by Phase 0.5 on 19 August 2026.
**Scope:** the whole AkarProMax ecosystem — the Web Platform and AkarProMax Office (AkarApp_LIVE).
**Applies to:** every future engineering session, human or AI, on this repository.

This document takes precedence over any historical plan, roadmap, certification, ADR or README in
`docs/**`. Where it conflicts with an older document, this document wins and the older document is
to be treated as historical.

---

## Article 0 — The non-negotiable product rule

> **AkarProMax must preserve all useful capabilities that existed in any previous AkarProMax
> version — web, desktop or admin — plus every improvement implemented in the current version.**

A capability that shipped in an older version may have its **code**, its **architecture**, its
**API shape**, its **database** and its **UI** replaced. The *functional capability itself* may
never disappear silently.

If an old capability has no equivalent in the current system, it is classified as `RESTORE` or
`REDESIGN WITH FULL PARITY`. It is **never** classified as unimportant because the code looks old,
because nothing imports it, because no test covers it, or because no one has mentioned it recently.
**Only the product owner may approve the removal of a capability.**

---

## Article 1 — The eighteen governing rules

1. **All verified features are protected capabilities.** The **2,563 rows** of
   `MASTER-FEATURE-REGISTRY.md` — 1,334 from the V2 lineage and 1,229 from the V1 source and the
   desktop C# source — are the register of protected capabilities. A row is not a suggestion; it is a
   commitment.

2. **No protected capability may be removed silently.** Removal requires: a written product-owner
   approval, a recorded registry ID, and a note in the phase result document. Absence of a consumer,
   absence of a test, and absence of a UI entry point are **not** approvals.

3. **Old code may be replaced if functional parity is maintained.** Replacing an implementation is
   encouraged. Replacing a capability is a product decision. Before deleting any file, check whether
   it is the last surviving specification of a behaviour — `REGRESSION-RISK-REGISTER.md` lists the
   known cases.

4. **Every major refactor requires regression tests, written first.** A refactor whose regression
   test was written after the change proves nothing. For every capability with
   `regression_risk = High`, the test must exist and fail before the change lands.

5. **Web and AkarApp_LIVE are one ecosystem.** They are one product with one user, one identity, one
   set of properties, one advertising inventory and one notion of "my office". Neither may be
   designed as if the other did not exist.

6. **Web and Office must remain independently buildable.** One product, two independently buildable
   and independently deployable applications. Neither build may depend on the other's build output.

7. **API changes require consumer analysis.** No Web API contract may change without checking its
   AkarApp_LIVE consumer, and no AkarApp_LIVE networking change may be made without checking the
   corresponding Web route. `WEB-OFFICE-CONTRACT-MATRIX.md` is the register of those consumers.
   Where a consumer cannot be verified because the desktop C# source is absent, the change is
   **blocked**, not assumed safe.

8. **Messaging is a Platform Core feature.** It is not a sub-feature of Services, of Properties, or
   of Organizations. It has its own registry section, its own authorization model, its own privacy
   guarantees, and its own regression suite. Every conversation context — member↔member,
   buyer↔owner, buyer↔office, buyer↔company, customer↔provider, request, offer, order, organization
   — is a first-class capability.

9. **Geo is shared infrastructure.** Countries, regions, cities, districts, coordinates and radius
   are one model serving Properties, Services, Advertising, Radar, Offices, Companies and
   Professionals. No domain may fork it.

10. **Storage is shared infrastructure.** One server-side object store serves property media, ad
    creatives, office media, messaging attachments, provider documents, land documents and profile
    imagery. No domain may substitute a client-supplied URL string, a fabricated path, or an
    in-process map for it.

11. **Notifications are shared infrastructure.** One notification model, one delivery pipeline, one
    read/unread contract, across in-app, e-mail, web push and desktop. A domain may declare a new
    event type; it may not build a second notification system.

12. **Identity and ownership must be canonical.** One human is one identity across web, services,
    office, advertising and admin. Every owned object — property, listing, request, offer, order,
    thread, campaign, organization, device — must resolve to a canonical responsible party for
    **editing**, **messaging** and **notification**. If it cannot, that is a defect, not a design.

13. **A page returning HTTP 200 is not proof a feature works.** Phase 0 demonstrated that every page
    in this application returns 200 in ~20 ms with the database completely unreachable. Evidence of
    a working feature is executed behaviour with data, asserted by a test.

14. **`npm test` must eventually represent all intended release tests.** A test file that is not in
    the release gate does not exist for release purposes. Test discovery must be automatic; a
    hard-coded file list is prohibited.

15. **Historical certification documents are not release evidence.** Every certification, readiness
    statement and release manifest written before 19 August 2026 certifies a runtime that no longer
    exists. They are historical. They may never be cited as proof of current behaviour.

16. **Current source + current tests + executed behaviour are the source of truth.** Documentation —
    including this document — describes intent. Only source, tests and observed runtime behaviour
    describe reality. When they disagree, the source wins and the document is corrected.

17. **No `UNKNOWN` core feature is allowed at final release.** Every capability in a core domain
    (Identity, Properties, Land/FindMyLand, Services, Messaging, Notifications, Organizations,
    Advertising, Office integration, Admin) must have a determined status before GO. `UNKNOWN` means
    the audit is not finished.

18. **No `PARTIAL`, `BROKEN` or `REGRESSION` critical feature is allowed at final GO.** A critical
    capability is one whose failure loses user data, exposes another user's data, breaks a paid or
    contractual obligation, or makes a core journey impossible. These must be `FULL` — or carry a
    written, dated product-owner deferral naming the registry ID.

---

## Article 2 — Controlled vocabularies

These are the only permitted values. Anything else is a documentation defect.

### 2.1 Parity decisions

`KEEP` · `KEEP + IMPROVE` · `RESTORE` · `FIX REGRESSION` · `MERGE INTO NEW SYSTEM` ·
`SUPERSEDED WITH FULL PARITY` · `NEW IMPROVEMENT` · `BLOCKED` · `OLD SOURCE REQUIRED` ·
`PRODUCT OWNER DECISION`

**Prohibited without explicit product-owner approval:** *irrelevant · not important · probably
unused · delete · obsolete · legacy so ignore · dead code · safe to remove.*

### 2.2 Capability status

`FULL` · `PARTIAL` · `REGRESSION` · `MISSING` · `BROKEN` · `BETTER THAN OLD` · `STUB` ·
`INTENDED ONLY` · `NOT APPLICABLE` · `OLD SOURCE REQUIRED`

`FULL` may never be recorded without `path:line` evidence.

### 2.3 Implementation depth (added Round 2)

`L0 IDEA_ONLY` · `L1 UI_ONLY` · `L2 DATA_MODEL_ONLY` · `L3 PARTIAL_FLOW` · `L4 END_TO_END_WIRED` ·
`L5 PRODUCTION_LIKE`

A bare "FULL" is not a depth. Invented labels (`L3_CODE_REVIEW`, `L2_DESIGN_VALIDATED`, `STUB` as a depth)
are documentation defects.

### 2.4 Evidence labels

`SOURCE VERIFIED` · `RUNTIME VERIFIED` · `TEST VERIFIED` · `HISTORICAL ONLY` · `INTENDED ONLY` ·
`STUB` · `UNKNOWN`

`HISTORICAL ONLY` and `INTENDED ONLY` can never support a claim that a feature works.

---

## Article 3 — The feature-preservation gate

Every implementation phase, without exception, defines and satisfies all seven:

| # | Gate element |
|---|---|
| 1 | **Pre-change feature baseline** — the phase's registry rows and their statuses, committed before the first change |
| 2 | **Regression tests** — written first, failing first, for every High-risk capability the phase touches |
| 3 | **New tests** — one per newly restored or newly built capability |
| 4 | **Expected retained features** — the explicit registry IDs that must remain `FULL` |
| 5 | **Expected improvements** — the explicit registry IDs whose status must advance |
| 6 | **Forbidden regressions** — the explicit registry IDs that may not move backwards |
| 7 | **Exit criteria** — behavioural, not structural |

A phase may **not** be marked PASS because:

- the build succeeds,
- TypeScript reports zero errors,
- a page returns HTTP 200,
- a lint run is clean,
- a previous document says the area was already certified.

A phase is marked PASS when the seven elements above are demonstrated and the before/after status
diff is attached.

---

## Article 4 — Ecosystem architecture

```
AKARPROMAX ECOSYSTEM
│
├── AkarProMax Web Platform            — Next.js 16 / React 19 / PostgreSQL
│
├── AkarProMax Office (AkarApp_LIVE)   — .NET 8 / WPF + WebView2 / local SQLite
│
├── previous AkarProMax web implementations   — recoverable from git history and snapshots
│
├── legacy / reference modules still present in the repository
│
└── historical git versions and recoverable implementation history
```

**Rule 5 in practice.** The Office application is not "an integration". It is the second half of the
product, and today it is the larger half by data model: 55 local tables covering client CRM,
ownerships, rent and sale contracts, contract templates and legal clauses, e-signatures, powers of
attorney, installments, post-dated checks, treasury, agency and client ledgers, staff commissions,
tax and fee types, maintenance tickets, handover schedules, a technician directory, co-broking
requests, lead claims, radar matches, local ad campaigns and impressions, branch users and
permissions, and a cloud sync queue. **None of that has a web counterpart.** Any statement about
"what AkarProMax does" that omits it is incomplete.

**Rule 7 in practice.** As of this audit the two applications share **no API surface at all**. Every
endpoint the shipped desktop calls is absent from the web, and every route under
`app/api/office/v1/**` has no desktop caller. Closing that gap is a design task that cannot begin
until the desktop C# source is attached (`REFERENCE-SOURCES.md` §6.1–§6.2).

---

## Article 5 — Reading order for any future session

1. `docs/release/PHASE-0-BASELINE.md` — what is verifiably true and verifiably broken today.
2. **This document** — the rules, including the nine kernels in Article 8.
3. `docs/product-audit/MASTER-FEATURE-REGISTRY.md` — what the product is.
4. `docs/product-audit/OLD-VS-CURRENT-PARITY.md` — what was lost and what improved.
5. `docs/product-audit/REGRESSION-RISK-REGISTER.md` — what a careless change would destroy.
6. `docs/product-audit/RESTORE-OR-MERGE-LIST.md` — what to restore, merge, preserve, consolidate,
   and what to ask the product owner.
7. `docs/product-audit/FEATURE-DEPENDENCY-MAP.md` and `IMPLEMENTATION-ORDER.md` — in what order.
8. `docs/product-audit/WEB-OFFICE-CONTRACT-MATRIX.md` — before touching any API either application
   consumes.
9. `docs/product-audit/FEATURE-COVERAGE-MAP.md` — to find UI without backend, backend without UI,
   tables without consumers, and tests covering dead implementations.
10. `docs/product-audit/FEATURE-PARITY-MATRIX.csv` — the machine-readable form of 3–4, for baselines
    and gate diffs.
11. `docs/product-audit/REFERENCE-SOURCES.md` — where every claim's evidence lives, and what is still
    missing.

Everything else under `docs/**` is historical unless it is dated after 19 August 2026 and cites
executed behaviour.

---

## Article 6 — Amendment

This document is amended only by:

1. a product-owner decision recorded against a registry ID, or
2. a subsequent audit phase that supersedes a rule with evidence.

Amendments are appended with a date and a reason. Rules are never silently rewritten — which is the
same standard this document imposes on the product itself.


---

# PART II — RATIFIED 19 AUGUST 2026 (ROUND 2)

Added after the **actual V1 full-stack source** and the **actual AkarProMax Office C# source** became
available. Part I above is unchanged and still binding. Where Part II is more specific, it governs.

---

## Article 7 — The three-generation doctrine

AkarProMax exists in three generations, and each contributes something the others cannot:

| Generation | Role in the target system | Never |
|---|---|---|
| **V1** (`E:\Akarpromax new 2027\V1.0`) — Vite/React + Express/Prisma/Socket.IO | **Product DNA.** Ideas, UX, workflows, business mechanics, the shape of the ecosystem. 413 capabilities were wired end-to-end here. | Never resurrect V1 code, V1 architecture, V1 authorization or V1 data access. V1's authorization is materially worse than V2's. |
| **V2** (current tree) — Next.js 16 / React 19 / PostgreSQL | **Technical core** wherever it is stronger: typing, schema discipline, service layering, the services state machine, the ad targeting engine, the AMRS contracts layer, security headers, rate limiting. | Never downgrade a V2 subsystem in order to make a V1 capability fit. |
| **AkarApp_LIVE / AkarApp_Next** — .NET 8 WPF + WebView2 + SQLite | **Desktop operating ecosystem.** 178 capabilities the web has never had: office CRM, contracts, e-signature, treasury and ledgers, installments, commissions, maintenance, licensing. | Never treat the desktop as "an integration". It is the second half of the product. |

**The target is not a copy of V1.** It is the strongest coherent AkarProMax system: V1's product capability
without V1's technical debt.

### Article 7.1 — What "preserve the capability" means in practice

A V1 capability is preserved when a user can accomplish the same outcome in the target system. It is **not**
preserved by keeping the V1 file, the V1 route name, the V1 table, or the V1 component. Every Round-2 row in
`MASTER-FEATURE-REGISTRY.md` carries a `V1 depth` label (`L0`–`L5`) precisely so that "how real was it?" can
never be argued about later.

### Article 7.2 — Depth honesty

Implementation depth is recorded with exactly six values: `L0 IDEA_ONLY` · `L1 UI_ONLY` ·
`L2 DATA_MODEL_ONLY` · `L3 PARTIAL_FLOW` · `L4 END_TO_END_WIRED` · `L5 PRODUCTION_LIKE`.
A surface that reads and writes only `localStorage` is **L1 or L2**, however polished it looks. A page that
calls an endpoint which does not exist is **L1**, not L4. "RESOLVED" never means "an authorization check was
found" — it means the product purpose is understood and written down.

---

## Article 8 — The nine shared architectural kernels

These nine are **kernels**, not modules: each has one owner, one implementation, and many consumers. No
domain may fork one. This article defines them; it does not implement them.

### 1. `IDENTITY_ACCESS`
**Responsibility.** One canonical identity per human; authentication; session; account status; the
`ROLE → PERMISSION → ACTION → optional ENTITY SCOPE → optional GEO SCOPE` decision, default deny, enforced
server-side.
**Consumers.** Every domain without exception.
**Forbidden duplication.** A second identity key space; a second permission table; client-side authorization
as the only gate; a role read from a token claim instead of the database; any surface that can act because
"the user is logged in".
**Standing defects this kernel must retire.** Four uncorrelated V2 key spaces (uuid, e-mail-as-id,
`sponsor_access.email`, `office_device_credentials.sponsor_id`); V1's 30-day un-revocable role claim; the
desktop's `Perm.Has` substring match that grants everything on the string `"admin"`.

### 2. `ORGANIZATIONS_OWNERSHIP`
**Responsibility.** Offices, companies, professional practices, partners, marketers, suppliers, advertisers;
membership; organization role; branches; and the resolution of **every owned object to a responsible party**
for editing, messaging and notification.
**Consumers.** Properties, Services, Auctions, Advertising, Office integration, Admin.
**Forbidden duplication.** Accepting an owner id from a request body; a per-domain notion of "my
organization"; a second membership table; ownership expressed as a free-text string.

### 3. `TRUST_REPUTATION_VERIFICATION`
**Responsibility.** Ratings, reviews, reputation scores, ranks, badges, verification records, trust signals,
and their recomputation.
**Consumers.** Properties, Services, Auctions, Organizations, Search ranking, Advertising eligibility.
**Forbidden duplication.** A per-domain rating table; a rank vocabulary invented inside one feature;
**and above all, rank granting authority.**

> **RANK ≠ PERMISSION.** A reputation tier — gold, ProMax, elite, distinguished, featured, verified — may
> change visibility, ordering, limits, pricing and presentation. It may **never** grant an administrative
> capability. Twelve violations of this rule are recorded across V1, V2 and the desktop; every one of them is
> a defect, not a design.

Membership, rank, verification, subscription and account status are **five separate concepts** and must never
be collapsed into one field or one admin screen.

### 4. `MESSAGING`
**Responsibility.** One messaging core: threads keyed by an explicit context, explicit participants,
contextual metadata, delivery, read state, attachments, and moderation hooks.
**Consumers.** Properties, Property Requests, Services, Service Jobs, Professionals, Organizations, Auctions,
Tenders, Support.
**Forbidden duplication.** A second message table; a per-domain inbox; a proxy that re-issues a request to
another messaging route; a thread whose participants are implied rather than stored.
**Non-negotiable property.** **Isolation is a property of the thread key, not of the guard.** On one service
request, Customer↔ProviderA must be structurally incapable of exposing Customer↔ProviderB — not merely
guarded against it. The required contexts are at minimum `GENERAL`, `PROPERTY`, `PROPERTY_REQUEST`,
`SERVICE_REQUEST`, `SERVICE_JOB`, `PROFESSIONAL`, `ORGANIZATION`; the evidence supports adding `AUCTION`,
`TENDER` and `SUPPORT`.
**What the core must carry forward.** From V1: realtime delivery, presence, typing, per-message read receipts,
edit, delete, reply, attachments, voice notes, block/unblock, the moderation-request workflow and the
moderation **access log**. From V2: the context taxonomy, server-side validation, length caps, and real
participant authorization. From the Drizzle family: attachments, archive, per-participant read state.

### 5. `EVENTS_NOTIFICATIONS`
**Responsibility.** One event vocabulary; one notification model; one delivery pipeline across in-app,
e-mail, web push and desktop; one read/unread contract; user preferences.
**Consumers.** Every domain that has ever wanted to tell a user something.
**Forbidden duplication.** A second notification table; a domain-local "outbox"; an event type declared and
never emitted; a UI that reads a different field name than the API returns.

### 6. `MODERATION_AUDIT_SAFETY`
**Responsibility.** Reports, moderation queues, moderator domains and scopes, sanctions, bans, blacklists,
fraud and manipulation detection, and **one** append-only audit trail.
**Consumers.** Properties, Services, Auctions, Community, Messaging, Advertising, Organizations, Admin.
**Forbidden duplication.** Four parallel audit systems (the current state); an admin console that reads a
different table than the one the writers write; a moderation capability with no queue; a ban with no unban
path.
**Moderator domains the evidence supports** (each a role with its own permission set, not a rank):
Property Moderator · Services Moderator · Organization Moderator · Community Moderator ·
Advertising Manager · Verification Officer · Trust & Safety · News/Knowledge Editor ·
Office Integration Support · Auditor.

### 7. `GEO_INTELLIGENCE`
**Responsibility.** One geographic model — country, region/governorate, city, district, village, coordinates,
radius, projection — plus geocoding, distance, nearby search and geo scoping.
**Consumers.** Properties, Land, Services matching, Advertising targeting, Radar, Offices, Companies,
Professionals, Smart Landing, Moderator geo scope.
**Forbidden duplication.** Six parallel city vocabularies (the current state, two of which have drifted);
a hard-coded country list inside a feature; UTM on one side of a boundary and WGS84 on the other with no
projection; a geo filter that is accepted and silently ignored.

### 8. `ADVERTISING`
**Responsibility.** One advertising engine: campaigns, creatives, placements, targeting, delivery, pacing,
capping, tracking, analytics and the advertiser back-office — serving **both** the Web and the Office
channel from one campaign.
**Consumers.** Every public surface, plus the desktop.
**Forbidden duplication.** **No parallel ad engine.** Two engines with incompatible schemas for the same
table names is the single clearest architectural defect in the current tree.
**What the one engine must carry forward.** From V2: flight-window and cap enforcement at delivery, budget
and daily budget, frequency capping, signed tracking tokens, viewability-gated and unique impressions, daily
rollups, conversions, weighted ranking, house/fallback inventory, day-parting, device/OS/domain targeting,
campaign↔creative separation, granular permissions. From V1: sponsor tier as a sold product, the working
self-serve advertiser funnel, approve-with-price and revenue reporting, the news ticker as a promotional
channel, the per-page hero manager and hero playlist, creative-shape governance, the office/desktop ad
product with trigger semantics and inventory caps, screen-time as a sellable unit, macro-region and village
targeting, and the single-fetch delivery pattern that removes the current N+1.

### 9. `STORAGE_MEDIA`
**Responsibility.** One server-side object store: upload, validation, persistence, transformation, signed
access, and lifecycle — for property media, ad creatives, office media, messaging attachments, provider
documents, land documents, contract PDFs and profile imagery.
**Consumers.** At least nine domains.
**Forbidden duplication.** A client-supplied URL string standing in for storage; a fabricated path with the
bytes discarded; an in-process map holding user-authored data; a per-domain upload endpoint with its own
rules.

### Article 8.1 — Kernel discipline

1. A kernel has exactly one implementation. Adding a second is a defect regardless of how convenient it is.
2. A domain may request a new capability **from** a kernel; it may not build its own.
3. A kernel change requires consumer analysis across every listed consumer.
4. Kernels are repaired before the domains that sit on them. `IMPLEMENTATION-ORDER.md` derives the order.
5. None of the nine is implemented yet. This article defines responsibility, consumers and forbidden
   duplication — nothing more.

---

## Article 9 — Evidence rules added in Round 2

19. **Independent recount beats a coverage claim.** A CSV row is not proof of inspection. Any coverage claim
    must be reproducible by counting the source. Round 2 found a delivered archaeology whose own status
    document contradicted its own CSV in four places.
20. **A "complete" label from any agent — including a previous Claude session — is a claim, not a fact.**
    It is accepted only after the numbers are re-derived from source.
21. **Binary evidence is provisional.** Conclusions drawn from a compiled artefact are marked as such and are
    superseded the moment the source arrives. Round 2 disproved a Round-1 conclusion this way: the desktop
    *does* contain a purpose-built V2 office API client (`Services/OfficeApiClient.cs`), which the binary
    analysis had missed.
22. **Marketing copy in the UI is not a property of the system.** A banner reading "your messages are
    encrypted" does not make a scheme end-to-end encrypted; a page titled "AI Matchmaking" does not make an
    algorithm exist. Both were found and corrected in Round 2.
