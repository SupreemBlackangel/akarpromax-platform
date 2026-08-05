# MASTER REFACTOR PLAN

## Scope
- This plan is architecture-only.
- No feature development is allowed before architectural stabilization is complete.
- The target production architecture is fixed:
  - Production database: PostgreSQL + PostGIS only
  - Identity: AkarProMax Identity only
  - Session transport: secure HttpOnly cookies only
  - Layout count: `PublicLayout`, `AccountLayout`, `WorkspaceLayout`, `AdminLayout`
  - Public shell: `PublicPageShell`
  - Ads entry point: centralized `AdSlot`

## Baseline From Audit
- Current page routes: 18
- Current API routes: 52
- Current layouts: 1 global layout only
- Current auth systems: 4 active identity paths
- Current database systems: PostgreSQL, MySQL, Cloudflare D1/SQLite
- Current public ad patterns: 3 different patterns
- Current duplicate groups: sponsor domain, sponsor forms, sponsor detail/edit, repeated admin shells

## Phase 0
- إنشاء فرع Git للإصلاح.
- إنشاء Tag للنسخة الحالية.
- أخذ نسخة احتياطية من قواعد البيانات.
- تسجيل جميع متغيرات البيئة دون كشف قيمها.
- منع أي Feature Development.

### Phase 0 Deliverables
- Dedicated refactor branch.
- Restorable Git tag.
- Verified database backup artifacts for PostgreSQL, MySQL, and D1/SQLite legacy sources.
- Environment-variable inventory document listing names only.
- Team-wide feature freeze notice.

### Phase 0 Exit Gate
- No new product work may be merged until the branch, tag, backups, and freeze are confirmed.

## Phase 1
- تنظيف الملفات غير الإنتاجية.
- إزالة Logs وBuild Artifacts وnode_modules من Git والحزم.
- تحديث gitignore.
- عدم حذف أي Schema بعد.

### Phase 1 Deliverables
- Clean repository and deployment package rules.
- Packaging checklist proving `node_modules`, logs, `.wrangler`, and build outputs are excluded from release artifacts.
- Updated ignore policy with explicit coverage for logs and local runtime state.
- Schema inventory preserved unchanged.

### Phase 1 Exit Gate
- The repo and deployment bundle rules must be clean before any structural refactor begins.

## Phase 2
- إنشاء Shared Design System.
- إنشاء Layouts الأربعة.
- إنشاء PublicPageShell.
- إنشاء AdSlot.
- توحيد Header وFooter وBreadcrumb وPageHeader.

### Phase 2 Deliverables
- Shared design tokens and shared neutral UI primitives.
- `PublicLayout`, `AccountLayout`, `WorkspaceLayout`, `AdminLayout`.
- `PublicPageShell` with mandatory ad and content order.
- Shared `AdSlot` contract that accepts placement/context only.
- Shared header/footer/breadcrumb/page-header components.

### Phase 2 Exit Gate
- No public-facing page may render its own local header/footer/ad placement structure after this phase is applied.

## Phase 3
- فصل Public وAccount وWorkspace وAdmin.
- إزالة جميع Admin imports من صفحات المستخدم.
- إنشاء Middleware مركزي للصلاحيات.

### Phase 3 Deliverables
- Route-scope ownership map enforced by layouts and middleware.
- Server-side authorization guard pattern for all protected routes.
- Removal plan for public/admin navigation mixing.
- Shared neutral components list that is allowed across scopes.

### Phase 3 Exit Gate
- Public, Account, Workspace, and Admin surfaces must no longer leak layout or navigation logic across boundaries.

## Phase 4
- توحيد Navigation.
- تقليص الأيقونات.
- دمج الصفحات المتكررة.
- إنشاء Redirects للمسارات القديمة.

### Phase 4 Deliverables
- Public navigation reduced to 7 primary items.
- Account navigation reduced to the approved account menu.
- Admin navigation reduced to the approved 7 groups.
- Duplicate route families consolidated with documented redirects.
- One icon library and one navigation schema per scope.

### Phase 4 Exit Gate
- No mixed admin/public navigation structures remain.
- No duplicate create/edit/detail routes remain for merged domains.

## Phase 5
- توحيد نظام المصادقة.
- تعطيل أنظمة الهوية الثلاثة غير المعتمدة.
- ترحيل الجلسات والمستخدمين إن وجدت بيانات حقيقية.

### Phase 5 Deliverables
- AkarProMax Identity becomes the only accepted identity source.
- `localStorage` bearer-token path disabled and removed.
- OpenAI/ChatGPT header identity disabled and removed from production.
- Localhost auto-admin fallback removed from production.
- Secure cookie-only session model with server-side authorization.
- Migration playbook for users, sessions, verification state, and restrictions.

### Phase 5 Exit Gate
- All protected routes and APIs must rely on the same identity/session path.

## Phase 6
- توحيد قاعدة البيانات إلى PostgreSQL/PostGIS.
- إعداد Migrations.
- نقل البيانات.
- التحقق من عدد السجلات والقيم.
- عدم حذف المصادر القديمة قبل نجاح التحقق.

### Phase 6 Deliverables
- PostgreSQL/PostGIS target schema.
- Versioned migrations.
- Data migration scripts and reconciliation reports.
- Record-count, checksum, and spot-validation evidence.
- Read-only legacy-source retention until cutover is signed off.

### Phase 6 Exit Gate
- PostgreSQL/PostGIS must be the single write authority before any legacy source is retired.

## Phase 7
- إعادة بناء صفحات المستخدم الحالية بالنمط الموحد.
- توحيد المساحات الإعلانية.
- اختبار الجوال وRTL/LTR.

### Phase 7 Deliverables
- Rebuilt `/`, `/services`, `/properties/[id]`, and all active public surfaces on `PublicPageShell`.
- Unified ad ordering on every public page.
- Mobile-first QA pack for 360px, 390px, 768px, and desktop.
- RTL/LTR validation and hydration checks.

### Phase 7 Exit Gate
- No public page may keep a custom shell or a route-specific ad order.

## Phase 8
- حذف الملفات والمسارات القديمة بعد نجاح الاختبارات والـRedirects.
- تحديث الوثائق.
- تثبيت الإصدار المعماري الجديد.

### Phase 8 Deliverables
- Legacy routes/components deleted only after redirects and verification succeed.
- Final documentation set updated.
- Stable architectural release tag created.

### Phase 8 Exit Gate
- Only the approved route map, auth model, DB model, layouts, and navigation systems remain.

## Cross-Phase Validation Rules
- Typecheck, lint, tests, and build must pass after each execution phase.
- Redirects must be validated before deleting any legacy route.
- No schema source is dropped before migration verification succeeds.
- No admin/public/shared boundary may be changed without corresponding authorization tests.
