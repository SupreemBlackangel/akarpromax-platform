# ADR-000: Project Charter — AkarProMax

Generated: 2026-08-05
Updated: 2026-08-05
Status: ACCEPTED

## Vision

AkarProMax is an integrated real estate ecosystem for the Oman market,
comprising five interconnected products that serve different audiences
and use cases.

## Product Portfolio

```
AkarProMax Ecosystem
│
├── Product 1: AkarProMax Web
├── Product 2: AkarProMax Admin
├── Product 3: AkarProMax Office
├── Product 4: Public API
└── Product 5: Future Mobile Apps
```

---

## Core Domains (المجالات الأساسية)

| # | Domain | Arabic | Description |
|---|--------|--------|-------------|
| 1 | Properties | العقارات | Property listings, search, detail |
| 2 | Users | المستخدمون | User accounts, profiles, roles |
| 3 | Administration | الإدارة | Admin dashboard, management |
| 4 | Advertising | الإعلانات | Ad creation, targeting, tracking |
| 5 | Radar | الرادار | Monitoring, alerts, analytics |
| 6 | Desktop App | التطبيق المكتبي | AkarProMax Office |
| 7 | Auctions | المزادات | Property auctions, bidding |
| 8 | Services | الخدمات | Services marketplace |
| 9 | Forum | المنتدى | Community discussions |
| 10 | Knowledge | الكتب | Documentation, guides |

### Domain Descriptions

#### 1. العقارات (Properties)

- Property listings with details
- Search and filtering
- Gallery and maps
- Price history
- Agent contact

#### 2. المستخدمون (Users)

- Registration and login
- Profile management
- Role-based access
- Activity history
- Preferences

#### 3. الإدارة (Administration)

- Dashboard with KPIs
- User management
- Sponsor management
- Content management
- Settings

#### 4. الإعلانات (Advertising)

- Ad creation
- Targeting rules
- Impression tracking
- Click tracking
- Billing

#### 5. الرادار (Radar)

- Price monitoring
- New listing alerts
- Market trends
- Competitor tracking

#### 6. التطبيق المكتبي (Desktop App)

- Property management
- Client CRM
- Document generation
- Offline support

#### 7. المزادات (Auctions)

- Auction listings
- Bidding system
- Time-based ending
- Winner notification

#### 8. الخدمات (Services)

- Service providers
- Service requests
- Offers and orders
- Reviews and ratings

#### 9. المنتدى (Forum)

- Topics and threads
- User posts
- Moderation
- Reputation system

#### 10. الكتب (Knowledge)

- Articles and guides
- Tutorials
- FAQ
- Glossary

---

## Non-Goals (النسخة الأولى)

المشروع لن يقوم في النسخة الأولى بالآتي:

| # | Non-Goal | السبب |
|---|----------|-------|
| 1 | إضافة عشرات الأدوات الجديدة | التركيز على الأدوات الأساسية (8 أدوات حالية كافية) |
| 2 | بناء تطبيق الهاتف الآن | Deferred to Phase 3 |
| 3 | دعم عدة قواعد данных | PostgreSQL هو القرار الإلزامي |
| 4 | دعم أكثر من نظام Auth | نظام مصادقة واحد فقط |
| 5 | تخصيص تصميم لكل صفحة | استخدام PublicPageShell و Layouts المشتركة |
| 6 | إنشاء Dashboard مستقلة لكل دور | AdminDashboard واحد مع صلاحيات مختلفة |

### لماذا هذه القيود؟

1. **منع التوسع بلا ضوابط** — كل إضافة جديدة تزيد التعقيد
2. **التركيز على الجودة** — أفضل من كمية الميزات
3. **تسريع التطوير** — قواعد واضحة تقلل القرارات
4. **سهولة الصيانة** — بنية متناسقة أسهل في العناية
5. **تجربة مستخدم موحدة** — كل المنتجات تبدو متشابهة

### ما هو مسموح به في النسخة الأولى؟

- تحسين الأدوات الهندسية الحالية (8 أدوات)
- تحسين الأداء والسرعة
- إصلاح الأخطاء
- تحسين الوثائق
- إضافة اختبارات
- تحسين RTL والوصولية

---

## Definition of Done (معايير الإنجاز)

أي مهمة لا تعتبر منتهية إلا إذا تحقق كل الآتي:

| # | المعيار | الحد الأقصى |
|---|---------|-------------|
| 1 | TypeScript Errors | = 0 |
| 2 | ESLint Errors | = 0 |
| 3 | Build Success | Required |
| 4 | Broken Links | = 0 |
| 5 | Console Errors | = 0 |
| 6 | Hydration Errors | = 0 |
| 7 | Security Critical | = 0 |
| 8 | تمت إضافة الاختبارات المطلوبة | Unit/Integration tests |
| 9 | تم تحديث الوثائق | README, ADR, inline |
| 10 | تمت مراجعة الأداء | Performance review |

### تفاصيل المعايير

#### 1. TypeScript Errors = 0

```bash
npx tsc --noEmit
# Expected: Zero TypeScript errors
# Note: Script not in package.json, run manually
```

**Rules:**
- No `any` types without justification
- No `@ts-ignore` or `@ts-expect-error` without ADR
- All functions properly typed
- All props interfaces defined

#### 2. ESLint Errors = 0

```bash
npm run lint
# Expected: Zero ESLint errors
# Note: Warnings allowed only with justification
```

**Rules:**
- No `eslint-disable` without comment
- No unused variables
- No console.log in production code
- React hooks rules followed

#### 3. Build Success = Required

```bash
npm run build
# Expected: Build completes successfully
# Note: Must pass before any commit
```

**Rules:**
- No build warnings (unless documented)
- All routes compile
- All assets included
- Bundle size within budget

#### 4. Broken Links = 0

**Check:**
- All internal routes resolve
- All API endpoints exist
- All images load
- All external links valid (if time permits)

#### 5. Console Errors = 0

**Check:**
- Open browser DevTools → Console
- Navigate through affected pages
- No red errors or warnings
- Network tab: no failed requests

#### 6. Hydration Errors = 0

**Check:**
- No server/client mismatch
- Consistent rendering
- No `useEffect` for client-only code
- Proper `suppressHydrationWarning` usage

#### 7. Security Critical = 0

**Check:**
- No hardcoded secrets
- No XSS vulnerabilities
- No CSRF issues
- Proper input validation
- Secure headers set

#### 8. Tests Added

| Change Type | Test Required |
|-------------|---------------|
| New API endpoint | Unit test for handler |
| New UI component | Render test |
| Bug fix | Regression test |
| Refactor | Existing tests pass |
| Database change | Migration test |

#### 9. Documentation Updated

- README.md (if public-facing change)
- ADR (if architectural decision)
- Inline comments (if complex logic)
- CHANGELOG (if user-facing change)

#### 10. Performance Review

- No N+1 database queries
- Images use lazy loading
- API responses cached where appropriate
- Bundle size increase < 5%
- Lighthouse score > 90

### Quality Gates

```
Task Done = TypeScript(0) AND ESLint(0) AND Build(✓) AND
            Links(0) AND Console(0) AND Hydration(0) AND
            Security(0) AND Tests(✓) AND Docs(✓) AND Perf(✓)
```

If any gate fails, the task is NOT done.

---

## Product 1: AkarProMax Web

**Type:** Consumer-facing web application
**Audience:** Property seekers, tenants, buyers, service consumers
**Status:** ACTIVE

### Features

| Module | Description |
|--------|-------------|
| Property Listings | Search, filter, view property details |
| Property Detail (`/properties/[id]`) | Full property page with gallery, map, contact |
| Services Marketplace | Browse and request local services |
| Engineering Tools (`/tools`) | Calculators for concrete, beams, tiles, etc. |
| News Ticker | Regional real estate news |
| Sponsor Profiles | Company pages, branches, contact info |
| Advertising | Targeted ad delivery |
| User Accounts | Registration, login, profile management |
| Multi-language | Arabic (RTL), English, Turkish |

### Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | vinext (Next.js compatible) |
| UI | Tailwind CSS + lucide-react |
| Auth | JWT cookies (HttpOnly) |
| Database | PostgreSQL (auth), MySQL/D1 (content) |
| i18n | Custom DB-backed translation system |

### Routes

| Route | Type | Description |
|-------|------|-------------|
| `/` | Public | Landing page with property search |
| `/properties/[id]` | Public | Property detail page |
| `/services` | Public | Services marketplace |
| `/tools` | Public | Engineering calculators |
| `/signin-with-chatgpt` | Auth | ChatGPT OAuth callback |
| `/signout-with-chatgpt` | Auth | Logout |

---

## Product 2: AkarProMax Admin

**Type:** Internal management dashboard
**Audience:** Platform administrators, content managers
**Status:** ACTIVE

### Features

| Module | Description |
|--------|-------------|
| Dashboard | KPIs, charts, recent activity |
| User Management | List, edit, role assignment |
| Role Management | Permission configuration |
| Sponsor Management | Approve, edit, contracts, billing |
| Sponsor Requests | New sponsor applications |
| Ad Management | Create, target, approve, track |
| News Management | Create, edit, publish news |
| i18n Management | Translation version control |
| Settings | Platform configuration |
| Reports | Analytics and reporting |

### Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | vinext (shared with Web) |
| UI | Tailwind CSS + lucide-react |
| Auth | Same JWT cookie system |
| Database | PostgreSQL (auth), MySQL/D1 (content) |

### Routes

| Route | Type | Description |
|-------|------|-------------|
| `/admin` | Admin | Dashboard overview |
| `/admin/users` | Admin | User management |
| `/admin/roles` | Admin | Role management |
| `/admin/sponsors` | Admin | Sponsor list |
| `/admin/sponsors/new` | Admin | Create sponsor |
| `/admin/sponsors/[id]` | Admin | Sponsor detail |
| `/admin/sponsors/[id]/edit` | Admin | Edit sponsor |
| `/admin/sponsors/requests` | Admin | Sponsor applications |
| `/admin/sponsors/banner` | Admin | Sponsor banner management |
| `/admin/ads` | Admin | Ad management |
| `/admin/news` | Admin | News management |
| `/admin/i18n` | Admin | Translation management |
| `/admin/reports` | Admin | Reports |
| `/admin/settings` | Admin | Platform settings |

---

## Product 3: AkarProMax Office

**Type:** Desktop application
**Audience:** Office staff, property managers, sales teams
**Status:** PLANNED

### Features

| Module | Description |
|--------|-------------|
| Property Management | CRUD operations |
| Client Management | CRM integration |
| Document Generation | Contracts, reports |
| Offline Support | Local data cache |
| Sync Engine | Cloud synchronization |
| Multi-user | Role-based access |

### Tech Stack (Proposed)

| Layer | Technology |
|-------|------------|
| Framework | Electron or Tauri |
| UI | Shared component library |
| Auth | JWT tokens |
| Database | SQLite (local) + PostgreSQL (sync) |

### Status

- [ ] Architecture decision pending
- [ ] UI/UX design pending
- [ ] Development not started

---

## Product 4: Public API

**Type:** RESTful API service
**Audience:** Third-party developers, partners, integrations
**Status:** PARTIAL (internal API exists)

### Features

| Endpoint | Description |
|----------|-------------|
| `/api/properties` | Property data |
| `/api/sponsors` | Sponsor profiles |
| `/api/ads` | Ad inventory |
| `/api/services` | Service listings |
| `/api/news` | News content |
| `/api/i18n` | Translations |

### Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | vinext API routes |
| Auth | API keys + JWT |
| Rate Limiting | TBD |
| Documentation | OpenAPI/Swagger (planned) |

### Status

- [x] Internal API routes exist
- [ ] Public API design pending
- [ ] Rate limiting pending
- [ ] API documentation pending
- [ ] SDK generation pending

---

## Product 5: Future Mobile Apps

**Type:** Native mobile applications
**Audience:** On-the-go users, property seekers
**Status:** FUTURE (not in current scope)

### Features

| Module | Description |
|--------|-------------|
| Property Search | Location-based search |
| Push Notifications | New listings, messages |
| Camera Integration | Property photos |
| Offline Mode | Cached listings |
| Maps Integration | Property locations |
| AR View | Virtual property tours (future) |

### Tech Stack (Proposed)

| Layer | Technology |
|-------|------------|
| Framework | React Native or Flutter |
| Auth | OAuth + biometrics |
| Database | SQLite (local) |
| Maps | Google Maps / Mapbox |
| Push | Firebase Cloud Messaging |

### Status

- [ ] Architecture decision pending
- [ ] UI/UX design pending
- [ ] Development not started

---

## Shared Systems

### Advertising System (نظام الإعلانات)

Used by: Web, Admin, API, Mobile

| Feature | Description |
|---------|-------------|
| Ad Creation | Multi-format ad builder |
| Targeting | Location, category, audience |
| Delivery | Impression/click tracking |
| Billing | CPM/CPC payment models |
| Reporting | Performance analytics |

**Status:** ACTIVE (47 ad placements defined)

### Services Marketplace (سوق الخدمات)

Used by: Web, Admin, API, Mobile

| Feature | Description |
|---------|-------------|
| Listings | Service provider profiles |
| Requests | User service requests |
| Offers | Provider bids |
| Orders | Transaction management |
| Reviews | Rating system |

**Status:** ACTIVE (seed data in place)

### Radar System (نظام الرادار)

Used by: Web, Admin, Office, Mobile

| Feature | Description |
|---------|-------------|
| Price Monitoring | Track price changes |
| New Listing Alerts | Notify matching criteria |
| Market Analysis | Trend detection |
| Competitor Tracking | Sponsor activity |

**Status:** PLANNED (not yet implemented)

### Forum (المنتدى)

Used by: Web, Mobile

| Feature | Description |
|---------|-------------|
| Topics | Category-based discussions |
| Posts | Threaded replies |
| User Profiles | Reputation system |
| Moderation | Content management |

**Status:** PLANNED (not yet implemented)

### Knowledge Center (مركز المعرفة)

Used by: Web, Mobile, Office

| Feature | Description |
|---------|-------------|
| Articles | Real estate guides |
| Tutorials | Platform how-tos |
| FAQ | Common questions |
| Glossary | Industry terms |

**Status:** PLANNED (not yet implemented)

---

## Product Roadmap

### Phase 1 — Core (Current)

| Product | Status | Completeness |
|---------|--------|--------------|
| AkarProMax Web | ACTIVE | 80% |
| AkarProMax Admin | ACTIVE | 70% |
| AkarProMax Office | PLANNED | 0% |
| Public API | PARTIAL | 30% |
| Mobile Apps | FUTURE | 0% |

### Phase 2 — Enhancement (Next)

| Product | Goal |
|---------|------|
| AkarProMax Web | Radar, Forum, Knowledge Center |
| AkarProMax Admin | Advanced analytics, bulk operations |
| AkarProMax Office | Architecture decision, MVP |
| Public API | OpenAPI docs, rate limiting, SDK |
| Mobile Apps | Architecture decision, prototype |

### Phase 3 — Expansion (Future)

| Product | Goal |
|---------|------|
| AkarProMax Web | Performance optimization, A/B testing |
| AkarProMax Admin | Automation, AI-assisted moderation |
| AkarProMax Office | Full release, offline sync |
| Public API | Partner integrations, webhooks |
| Mobile Apps | iOS/Android release, push notifications |

---

## Mandatory Architectural Decisions (القرارات الإلزامية)

| # | Decision | Status | Description |
|---|----------|--------|-------------|
| 1 | قاعدة بيانات واحدة | ✅ إلزامي | Single source of truth for all data |
| 2 | نظام مصادقة واحد | ✅ إلزامي | Unified auth across all products |
| 3 | أربعة Layouts فقط | ✅ إلزامي | PublicLayout, AccountLayout, WorkspaceLayout, AdminLayout |
| 4 | PublicPageShell | ✅ إلزامي | All public pages use consistent shell |
| 5 | AdSlot واحد | ✅ إلزامي | Single ad component across all products |
| 6 | عدم منطق الأعمال داخل React Components | ✅ إلزامي | Business logic in API/services, not UI |
| 7 | جميع العمليات الإدارية تسجل Audit Log | ✅ إلزامي | Full audit trail for admin actions |
| 8 | API First | ✅ إلزامي | Design API before UI |
| 9 | Mobile First | ✅ إلزامي | Responsive design from start |
| 10 | RTL من البداية | ✅ إلزامي | RTL support in all components |
| 11 | Metadata Driven | ✅ إلزامي | Configuration over code |

### Decision Details

#### 1. قاعدة بيانات واحدة (Single Database)

- **What:** All products share one PostgreSQL database
- **Why:** Consistent data, no sync issues, single source of truth
- **Scope:** Auth, properties, sponsors, ads, services, content
- **Exception:** Local caches (SQLite/D1) for performance only

#### 2. نظام مصادقة واحد (Single Auth System)

- **What:** One JWT cookie-based auth system for all products
- **Why:** Unified user identity, single login, consistent permissions
- **Scope:** Web, Admin, Office, API, Mobile
- **Implementation:** HttpOnly cookies + RBAC roles

#### 3. أربعة Layouts فقط (Four Layouts Only)

- **What:** Maximum 4 layout components in the system
- **Why:** Consistent UX, easier maintenance, predictable routing
- **Layouts:**
  - `PublicLayout` — Marketing pages, property search
  - `AccountLayout` — User profile, settings
  - `WorkspaceLayout` — Service provider dashboard
  - `AdminLayout` — Admin dashboard

#### 4. PublicPageShell

- **What:** All public pages wrap in a consistent shell
- **Why:** Consistent navigation, footer, ads placement
- **Scope:** `/`, `/properties/*`, `/services`, `/tools`
- **Components:** Header, Footer, Sidebar, AdSlot

#### 5. AdSlot واحد (Single AdSlot)

- **What:** One `<AdSlot />` component for all advertising
- **Why:** Consistent ad delivery, centralized tracking
- **Scope:** All pages across all products
- **Features:** Auto-targeting, impression tracking, A/B testing

#### 6. No Business Logic in React Components

- **What:** UI components only render; logic lives in API/services
- **Why:** Testability, reusability, separation of concerns
- **Pattern:**
  - React: `fetch('/api/...')` → render result
  - API: Validate → Process → Return
  - Service: Business rules, calculations, decisions

#### 7. Audit Log for All Admin Operations

- **What:** Every admin action logs to audit table
- **Why:** Compliance, debugging, accountability
- **Scope:** CRUD on users, sponsors, ads, content
- **Data:** Who, what, when, before, after

#### 8. API First

- **What:** Design API contract before building UI
- **Why:** Parallel development, clear contracts, testability
- **Process:**
  1. Define OpenAPI spec
  2. Review with team
  3. Implement API
  4. Build UI against API

#### 9. Mobile First

- **What:** Design for mobile screens, then scale up
- **Why:** Better UX on small screens, progressive enhancement
- **Approach:**
  - Start with 320px width
  - Add breakpoints for tablet, desktop
  - Test on real devices

#### 10. RTL من البداية (RTL From Start)

- **What:** All components support right-to-left from day one
- **Why:** Arabic is primary language; retrofitting is expensive
- **Implementation:**
  - Tailwind RTL plugin
  - `dir="rtl"` on `<html>`
  - Logical CSS properties (start/end vs left/right)

#### 11. Metadata Driven

- **What:** Configuration-driven behavior, not hardcoded logic
- **Why:** Flexibility, easier updates, no code changes for config
- **Examples:**
  - Ad placements defined in DB
  - Feature flags in config
  - Role permissions in metadata
  - Route definitions in config

---

## Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Web Framework | vinext (Next.js compatible) | Workers-compatible, fast dev |
| Desktop Framework | TBD | Electron or Tauri |
| Mobile Framework | TBD | React Native or Flutter |
| Database (auth) | PostgreSQL + PostGIS | Geospatial queries, ACID |
| Database (runtime) | MySQL + D1/SQLite | Flexible content, local dev |
| Auth | JWT cookies (HttpOnly) | Security, SSR compatibility |
| API | REST (OpenAPI planned) | Industry standard |
| i18n | Custom DB-backed | Dynamic content translation |
| UI | Tailwind CSS + lucide-react | Rapid development, consistency |
| Deployment | Internal Node.js server | Full control, PG direct access |

---

## Constraints

1. **No new dependencies** without Architecture Decision Record (ADR)
2. **No feature additions** during refactoring freeze
3. **No schema changes** without migration plan
4. **No auth system changes** without security review
5. **No production data loss** at any point
6. **API versioning** required for public API
7. **Backward compatibility** for mobile apps
8. **Shared component library** across products
9. **All 11 mandatory decisions** must be followed

---

## Stakeholders

| Stakeholder | Role | Primary Products |
|-------------|------|------------------|
| Developers | Build and maintain | All |
| Admins | Manage platform | Admin Dashboard |
| Sponsors | Advertise properties | Web, API |
| Service Providers | Offer services | Web, API |
| End Users | Search properties | Web, Mobile |
| Office Staff | Daily operations | Office |
| Partners | Third-party integration | API |
| Investors | Track growth | Analytics |

---

## Success Metrics

| Metric | Target | Product | Phase |
|--------|--------|---------|-------|
| Property listings | 1,000+ | Web | 1 |
| Active sponsors | 50+ | Web, Admin | 1 |
| Monthly users | 10,000+ | Web | 1 |
| API integrations | 5+ | API | 2 |
| Mobile downloads | 5,000+ | Mobile | 3 |
| Office installations | 100+ | Office | 3 |
| Forum posts | 500+ | Web | 2 |
| Knowledge articles | 100+ | Web | 2 |
| Page load time | <2s | All | 1 |
| Uptime | 99.9% | All | 1 |

---

## Related ADRs

- ADR-001: Internal Runtime Target
- (Future) ADR-002: Authentication Consolidation
- (Future) ADR-003: Database Migration Strategy
- (Future) ADR-004: Layout System Standardization
- (Future) ADR-005: Public API Design
- (Future) ADR-006: Mobile App Architecture
- (Future) ADR-007: Desktop App Architecture
- (Future) ADR-008: Forum Integration
- (Future) ADR-009: Knowledge Center Structure
- (Future) ADR-010: Radar System Design
- (Future) ADR-011: Shared Component Library

---

## Future Capabilities (المستقبل)

النظام يجب أن يدعم مستقبلًا القدرات التالية **دون التأثير على معمارية النسخة الحالية**:

| # | Capability | Arabic | Description |
|---|------------|--------|-------------|
| 1 | AI | الذكاء الاصطناعي | Property valuation, chatbots, recommendations |
| 2 | Analytics | التحليلات | Advanced reporting, business intelligence |
| 3 | Open API | Open API | Public API for third-party integrations |
| 4 | Marketplace | Marketplace | Multi-vendor platform |
| 5 | Government Integration | التكامل مع الجهات الحكومية | Ministry of Housing, Municipality |
| 6 | GIS | GIS | Geographic Information System |
| 7 | BIM | BIM | Building Information Modeling |
| 8 | CRM | CRM | Customer Relationship Management |
| 9 | ERP | ERP | Enterprise Resource Planning |

### Design Principles for Future Capabilities

1. **Extension Points** — Design current system with hooks for future
2. **Plugin Architecture** — Future features as optional plugins
3. **API Boundaries** — Clear API contracts between components
4. **Feature Flags** — Toggle features without code changes
5. **Backward Compatibility** — Never break existing functionality

### Implementation Strategy

#### Phase 2 (Next)
- Public API documentation and rate limiting
- Basic analytics dashboard
- AI-powered property recommendations (simple)

#### Phase 3 (Future)
- GIS integration (map layers, spatial queries)
- Government API integration (property registration)
- Advanced analytics and reporting

#### Phase 4 (Far Future)
- BIM integration (3D property models)
- CRM module (lead management)
- ERP integration (accounting, inventory)
- Marketplace (multi-vendor)

### Architecture Constraints

1. **No breaking changes** to current API contracts
2. **No new dependencies** without ADR
3. **No performance degradation** for existing features
4. **Optional adoption** — features can be disabled
5. **Independent deployment** — features can be deployed separately

---

## Review Schedule

- **Monthly:** Review progress against metrics
- **Quarterly:** Review technical decisions
- **Annually:** Review project charter and roadmap

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-08-05 | Initial charter created | Refactoring Team |
| 2026-08-05 | Updated with full system architecture | Refactoring Team |
| 2026-08-05 | Restructured as 5-product portfolio | Refactoring Team |
| 2026-08-05 | Added 11 mandatory architectural decisions | Refactoring Team |
| 2026-08-05 | Added Non-Goals and Definition of Done | Refactoring Team |
| 2026-08-05 | Added 10 core domains and future capabilities | Refactoring Team |
