# تقرير الفحص الشامل — سوق الخدمات المحلية + نظام الترجمة الديناميكي

التاريخ: 2026-08-01
الفرع: `feature/services-marketplace-and-translations` (مشتق من `fix/admin-sponsor-management` @ `2ffe528`)
النسخة: `site-creator-vinext-starter @ 0.1.0`
النسخ الاحتياطي: `C:\Users\zak\AppData\Local\Temp\opencode\akarpromax-backup-20260801-165311\` + `akarpromax-db-backup-20260801-165311.sql`

---

## 1. البنية الحالية

### 1.1 المكدس التقني
| عنصر | القيمة |
|---|---|
| Framework | `next 16.2.6` + `react 19.2.6` (App Router) |
| Build/Run | `vinext 0.0.50` CLI (`npm run build` / `start`) |
| ORM | `drizzle-orm 0.45.2` (مخطط static) + طبقة SQL يدوية عبر `lib/mysql-runtime.ts` |
| قاعدتا بيانات | (1) SQLite/D1 عبر `db/schema.ts` + `drizzle/` (تطوير/منتج)، (2) MySQL عبر `db/mysql/schema.ts` + `drizzle-mysql/` + `lib/mysql-runtime.ts` (الفعلية في localhost) |
| Frontend | React SPA داخل `app/page.tsx` (ملف رئيسي 542 سطرًا) + Tailwind 4.2.1 |
| Auth | `lib/auth/session.ts` (جلسات كوكي HttpOnly `akar_session`) + `lib/sponsor-auth.ts` (بوابة `requireSessionUser`) |
| المنصة | 23 دولة عربية + تركيا، 3 لغات (ar/en/tr) |

### 1.2 بنية قاعدة البيانات الفعلية (MySQL — `akarpromax`)
- **أساسية**: `roles`, `users`, `verification_challenges`, `sessions`, `policy_documents`, `audit_logs`
- **رعاة**: `sponsor_access`, `sponsors`, `sponsor_events`, `sponsor_profiles`, `sponsor_users`, `sponsor_branches`, `sponsor_plans`, `sponsor_subscriptions`, `sponsor_contracts`, `sponsor_documents`, `sponsor_payments`, `sponsor_invoices`, `sponsor_activity_logs`
- **إعلانات**: `ad_assets`, `ad_campaigns`, `ad_creatives`, `ad_events`
- **محتوى**: `news`, `office_links`

### 1.3 الملفات الحاسمة
- `app/page.tsx` — الواجهة الرئيسية أحادية الصفحة (RTL/LTR، قضبان جانبية، شرائح إعلانية، أخبار، خدمات دعائية، رعاة، حساب)
- `lib/sponsor-auth.ts` — بوابة المصادقة (جلسة فقط)
- `lib/sponsor-auth.ts` — تحويل الهوية إلى SponsorIdentity
- `lib/mysql-runtime.ts` — محاكي D1 فوق MySQL (translateSql + schema auto-create + seeds)
- `lib/runtime-db.ts` — اختيار D1 أو MySQL تلقائيًا
- `lib/ad-schema.ts` — إنشاء جداول الإعلانات الإضافية
- `src/data/translations.ts` + `src/types/site.ts` — **نظام الترجمة الثابت الحالي**
- `src/data/locations.ts` — الدول والمدن والعملات (بدون GIS حقيقي)
- `src/constants/roles.ts` + `permissions.ts` — RBAC

---

## 2. نقاط القوة
1. **طبقة DB مزدوجة أنيقة**: `mysql-runtime.ts` يقدّم واجهة `D1Database` فوق MySQL مع ترجمة SQL، فكل كود مكتوب لـ D1 يعمل على MySQL (الفعلية الآن).
2. **ترجمة سلسلة بسيطة**: `translateSql` تعالج `?N` و`INSERT OR IGNORE` و`ON CONFLICT` و`datetime('now')` بثبات.
3. **Audit موجود مسبقًا**: جدولا `audit_logs` (عام) و`sponsor_activity_logs` (رعاة) — سنعيد استخدام النمط لسوق الخدمات.
4. **RBAC واضح**: `ROLE_CATALOG` + `PERMISSIONS` منفصلة وقابلة للتوسيع.
5. **E2E جاهز**: سكربتات `tests/rendered-html.test.mjs` + سكربتات `_e2e_*.mjs`.
6. **Seed تلقائي**: الأخبار والخطط تُزرع عند أول إقلاع — نمط قابل للتكرار للخدمات.
7. **الترجمات مركزية اليوم**: كل نصوص الواجهة في ملف واحد `translations.ts` — أسهل للترحيل إلى نظام ديناميكي.

---

## 3. نقاط الضعف
1. **لا يوجد نظام خدمات نهائيًا**: قسم "الخدمات" في `page.tsx` هو مجرد بطاقات دعائية ثابتة (4 بطاقات) بلا صفحات/API/جداول.
2. **الترجمة ثابتة (code-level)**: `translations.ts` تُبنى في الـ bundle — أي تعديل يتطلب إعادة نشر. لا Namespaces، لا Versioning، لا Fallback تلقائي، لا Rollback، لا ICU للجمع/التمييز، ولا واجهة إدارة.
3. **نصوص Hardcoded كثيرة خارج `translations.ts`**: `page.tsx` يحتوي `locale === "ar" ? ... : ...` ثلاثيًا في عشرات المواضع (شرائح hero، عناصر تحكم، روابط إدارة، إلخ). الإعلانات في `lib/ads/admin.ts` و`ad_campaigns` تخزن أعمدة `*_ar/_en/_tr` بدل الترجمة الموحدة.
4. **لا GIS**: لا جداول `regions`/`districts`، لا إحداثيات في المدن، لا Spatial Index. التطابق الجغرافي الحالي نصّي (`cityId` نصّي فقط).
5. **نموذجان لنفس الكيان**: مخطط D1 (`db/schema.ts`) ومخطط MySQL (`db/mysql/schema.ts`) منفصلان يدويًا — خطر انحراف. الإعلانات تُدار حصريًا عبر SQL خام في `mysql-runtime.ts` خارج drizzle.
6. **`app/page.tsx` ملف ضخم**: 542 سطرًا من واجهة واحدة — صيانته وتوسيعه مكلف، وكل إضافة نظام تزيده.
7. **لا RLS/VPC-نطاق**: `country_manager` يُظهر كل الصلاحيات بدون فحص فعلي للنطاق (السماحية تُمنح حسب الدور فقط).
8. **الأدوار النصية**: `roleId: "member"` في الجداول لا يطابق `ROLE_CATALOG` (`viewer`...) — انحراف دلالي.

---

## 4. المخاطر
1. **انحراف المخططين** (D1/MySQL) عند إضافة جداول جديدة — يجب إضافة الجداول في الموضعين أو عبر طبقة SQL خام واحدة.
2. **`translateSql` غير مكتمل**: ترجمة `?N` فقط بترتيب تصاعدي؛ الدوال المتقدمة (JSON، ROUND، التجميع) تحتاج اختبارًا عند الاستخدام.
3. **ترحيل الترجمة قد يكسر الواجهة**: إذا فقد `t()` قيمة مفتاح، تظهر النصوص فارغة — نحتاج fallback فوري إلى `translations.ts`.
4. **أعمدة `*_ar/_en/_tr`** في `ad_campaigns`/`sponsors`/`news` تتعارض مع "لا ترجمة LLC كأعمدة" — يجب عدم تكرارها في الجداول الجديدة، والترحيل الكامل خارج النطاق.
5. **نطاق الجلسات**: تحت `vinext start` لا تُقرأ `cookies()` (قيد موثق) — الاختبارات على MySQL/auth تحتاج `vinext dev` لمسارات D1، وطرق auth عبر HTTP محكومة.
6. **توسع الجداول بدون `ON DELETE`**: العلاقات الحالية بلا قيود حذف — يجب إضافتها بحذر في الجداول الجديدة.

---

## 5. التعارضات (مع ضوابط البرومبت)
| ضابط البرومبت | الوضع الحالي | القرار |
|---|---|---|
| لا أنظمة موازية | لا توجد أنظمة خدمات اليوم | إنشاء نظام واحد متكامل داخل نفس البنية |
| لا GIS في Frontend | لا GIS إطلاقًا | تخزين إحداثيات اختيارية في جدول الخدمة (Backend) + مطابقة عبر المسافة باستعلام DB؛ الواجهة تستخدم LocationChip الحالي |
| لا ترجمة LLC كأعمدة | موجودة في `ad_campaigns`/`sponsors`/`news` (قديمة) | الجداول الجديدة تستخدم نظام الترجمة الديناميكي فقط |
| Error Codes ثابتة | أسلوب `{ error: "invalid_body" }` سائد | اعتماد رمز موحد `{ error: { code, message, details? } }` في الأنظمة الجديدة |
| Migrations + Rollback + Audit | Migrations موجودة للجدولين؛ Rollback غير موجود | إنشاء Migrations للجداول الجديدة + Rollback scripts + تسجيل Audit لكل إجراء |
| نصوص Hardcoded ممنوعة | موجودة كثيرة في `page.tsx` | ترحيل تدريجي للنصوص الموجودة إلى `t()`، والنصوص الجديدة كلها عبر `t()` |
| اختبارات E2E | نمط `tests/*` موجود | إضافة E2E للخدمات والترجمة الديناميكية |

---

## 6. الجداول والملفات المتأثرة

### جداول جديدة (سوق الخدمات)
| الجدول | الغرض | ملاحظات |
|---|---|---|
| `service_categories` | التصنيفات (مهرة/حرفيون/مهنيون) | متعدد المستويات، مرتبط بالدولة |
| `service_listings` | عروض مقدمي الخدمة | دولة/مدينة/حي + إحداثيات اختيارية |
| `service_requests` | طلبات العملاء | الحالة/الحجرة/الموعد |
| `service_offers` | عروض أسعار مقدمي الخدمة | مرتبط بالطلب |
| `service_orders` | العقود المنفَّذة | من الطلب/العرض |
| `service_messages` | المحادثة بين الأطراف | مرتبط بالطلب أو العرض أو الأمر |
| `service_reviews` | التقييمات | ثنائية (عميل/مقدم) |
| `service_disputes` | النزاعات | رفع للحالة: مفتوح/قيد المراجعة/محلول |
| `service_bookmarks` | المفضلة | `(userId, listingId)` |
| `service_geo_lookup` | مطابقة المنطقة | اختياري: تسهيل التطابق النصي → إحداثيات |

### جداول جديدة (الترجمة الديناميكية)
| الجدول | الغرض |
|---|---|
| `i18n_namespaces` | الحزم (home, services, admin, errors...) |
| `i18n_keys` | المفاتيح ضمن النطاق |
| `i18n_translations` | القيم حسب `(keyId, locale)` مع حالة (published/draft) |
| `i18n_versions` | إصدارات النشر للتراجع الفوري |
| `i18n_change_log` | سجل تغييرات المترجمين |

### ملفات جديدة
- `lib/i18n/*` — نواة الترجمة الديناميكية (cache, fallback, versioning)
- `lib/services/*` — منطق سوق الخدمات
- `app/api/services/*` — REST
- `app/api/i18n/*` — REST
- `app/services/*`, `app/admin/services/*`, `app/admin/i18n/*` — صفحات

### ملفات معدَّلة
- `app/page.tsx` (ربط الترجمة الديناميكية + رابط السوق)
- `src/data/translations.ts` (يبقى fallback)
- `src/types/site.ts` (توسيع `Locale`)
- `src/constants/permissions.ts` + `roles.ts` (صلاحيات الخدمات والترجمة)
- `lib/mysql-runtime.ts` (schema SQL للجداول الجديدة)
- `lib/runtime-db.ts` (نفسه إن أمكن — يعتمد تلقائيًا)
- `tests/*` (E2E)

---

## 7. خطة الترحيل (Migration)
1. **المرحلة C (DB)**: إضافة الجداول الجديدة في `db/mysql/schema.ts` (drizzle) + SQL التوأم في `lib/mysql-runtime.ts` + Migrations SQL في `drizzle-mysql/` — مع `CREATE TABLE IF NOT EXISTS` (آمن للتراجع).
2. **المرحلة D (Backend)**: بناء `lib/i18n` ثم `lib/services` ثم الـ Routes.
3. **المرحلة E (Frontend)**: استبدال `translations[locale]` بـ `useTranslations` محلي (fallback تلقائي) + صفحات السوق واللوحة.
4. **الهجرة النهائية**: تحويل النصوص الثابتة تدريجيًا عبر script `scripts/seed-i18n.ts` (يُسقِط `translations.ts` في الجداول) — مع بقاء الملف كـ fallback.
5. **التوافق**: لا تُحذف أعمدة `*_ar/_en/_tr` القديمة؛ الجداول الجديدة فقط تعتمد على i18n.

---

## 8. خطة التراجع (Rollback)
- **قاعدة البيانات**: جميع الجداول الجديدة `CREATE TABLE IF NOT EXISTS` فقط — حذفها لا يمس الجداول القديمة. Rollback SQL محفوظ في `drizzle-mysql/rollback-*`.
- **الكود**: كل الواجهات الجديدة خلف مسارات منفصلة (`/services`, `/admin/i18n`)؛ إعادة نشر القديم عبر `git checkout` للفرع `fix/admin-sponsor-management` يعيد كل شيء.
- **الترجمة**: النظام الجديد يقرأ الجداول مع Fallback كامل إلى `translations.ts` — إذا فشل الجدول، تعمل الواجهة القديمة دون تغيير.
- **إصدار النشر**: `i18n_versions` يسمح بالعودة إلى الإصدار السابق بـ `PATCH /api/i18n/publish` مع `version`.

---

## 9. الأولويات (ترتيب التنفيذ)
1. **C — الجداول + Migrations + Rollback** (الأساس؛ كل شيء يعتمد عليه)
2. **D1 — نواة الترجمة الديناميكية** (cache/fallback/version) + Routes للقراءة
3. **D2 — منطق سوق الخدمات** (تصنيفات → قوائم → طلبات → عروض → أوامر → محادثة → تقييم → نزاع) + Routes
4. **E1 — لوحة الترجمة الإدارية** (نطاقات/مفاتيح/قيم/إصدارات/تراجع)
5. **E2 — صفحات سوق الخدمات** (استعراض/تصفية/تفاصيل/طلب/عروض/محادثة/تقييم)
6. **F — الوصلات**: لوحة `admin/services`, `admin/i18n`, RBAC، أزرار القائمة
7. **G — E2E** للنقاط الحرجة (طلب→عرض→أمر→تقييم، وترجمة→نشر→تراجع)

---

## 10. معايير النجاح
- `npm run build` ينجح، و`tsc --noEmit` نظيف.
- الجداول الجديدة تُنشأ تلقائيًا عند أول طلب (MySQL فعلية) وفي D1 (dev).
- `GET /api/i18n/:locale` يعيد القيم مع fallback؛ `PATCH /api/i18n/values` يحدّث؛ `POST /api/i18n/publish` ينشئ إصدارًا؛ العودة لإصدار سابق تعمل.
- دورة خدمة كاملة E2E: إنشاء تصنيف → إنشاء عرض مقدم → إنشاء طلب → عرض سعر → قبول → أمر → رسالة → تقييم → (اختياري نزاع) — بلا أخطاء، مع Audit Logs لكل خطوة.
- لا توجد أي نصوص عربية/تركية/إنجليزية جديدة Hardcoded في صفحات السوق أو لوحة الترجمة (كلها عبر `t()`).
