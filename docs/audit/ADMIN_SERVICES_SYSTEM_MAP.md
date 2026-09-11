# خريطة النظام: الخدمات والطلبات والإعلانات والإشعارات

> تدقيق المرحلة الأولى، 2026-09-11، على فرع `refactor/architecture-foundation`.
> أُنتج بثمانية قرّاء للشيفرة (قراءة فقط)، ثم وُضعت كل نتيجة حرجة/عالية أمام مدقّق مستقل مهمّته دحضها؛ المؤكَّد ما لم يستطع دحضه.
> **لم يُفحص الإنتاج**: لا قاعدة البيانات الحيّة ولا الحملات الفعلية — وكل ما يتوقف على ذلك موسوم في موضعه.

---

## خريطة النظام — AkarPromax (المرحلة الأولى)

### 1. زمن تشغيل قاعدة البيانات حسب النطاق

| النطاق | المحرّك الفعلي | مصدر الـDDL | ملاحظات |
|---|---|---|---|
| services (26 جدول `service_*`) | Postgres (Neon) عبر مهايئ D1 `lib/pg-runtime.ts` | `drizzle-pg-forward/0003..0013` **و** DDL وقت التشغيل في `lib/services-schema.ts` + `lib/services-marketplace-schema.ts` | مصدران متوازيان منحرفان (أعمدة الموجات وجدول الحظر في الهجرات فقط) |
| ads (`ad_campaigns`, `ad_creatives`, `ad_assets`, `ad_events`, `ad_impressions`, `ad_clicks`, `ad_conversions`, `ad_daily_statistics`) | Postgres عبر نفس المهايئ | **DDL وقت التشغيل حصريًّا** (`lib/content-schema.ts`, `lib/ad-schema.ts`) | لا هجرة واحدة تنشئ جدول إعلانات؛ خلف قفل `ak_content_schema_meta` نسخة 3 |
| identity / organizations / leads / messaging | Postgres عبر Drizzle (`lib/db/index.ts`) | `drizzle-pg/` + `drizzle-pg-forward/0008,0009` | تجمّع اتصال منفصل تمامًا عن مهايئ D1 |
| audit | `audit_logs` (DDL وقت التشغيل) + `audit_events` (Drizzle) | `lib/content-schema.ts:54` · `lib/db/schema.ts:67` | مخزنان لا يقرأهما مستهلك واحد |
| office / integration | Postgres عبر مهايئ D1 | `lib/integration/schema.ts` | `office_notification_deliveries` |
| legacy (`admin_roles`, `admin_role_assignments`, `ad_analytics`, `news_ticker_items`, `featured_properties`) | Postgres | `drizzle-pg/0004` المجمّد وحده | لا هجرة أمامية ولا DDL وقت تشغيل ينشئها |

`DB_PROVIDER=postgres` في `.env`؛ `lib/runtime-db.ts:55-58` يختار `getPgRuntimeDb()`. مساران لـMySQL/D1 موجودان في الشيفرة ولا يختارهما الإنتاج.

### 2. الكيانات ومفردات الحالات

**service_provider_profiles** (`lib/services-marketplace-schema.ts:119-163`) — `status`: `draft | submitted | under_review | approved | rejected | suspended`. `user_id` = بريد المستخدم داخل `VARCHAR(36)`. أعمدة: `approved_at`, `suspended_at`, `rejection_reason`, `is_featured`, `featured_rank`, `is_accepting_requests`. **لا** `reviewed_by`/`reviewed_at`/`approval_history`. الانتقالات: `PROVIDER_FLOW` (`lib/services/constants.ts:191-205`).

**service_listings** (`lib/services-schema.ts:12-31`) — `status`: `draft | active | paused | removed`. `approved_at`/`published_at` موجودان ولا يُكتبان. لا دورة اعتماد.

**service_requests** (`drizzle-pg-forward/0003:114`) — `status` المكتوب فعلاً: `draft | published | receiving_offers | offer_selected | completed | cancelled | expired`. معرَّف ولا يُكتب: `scheduled`, `in_progress`, `waiting_customer_confirmation`, `disputed` (+ الإرث `open/offered/ordered`). `reference_number` = `SR-YYYY-` + `1001 + COUNT(*)` بلا فهرس فريد. لا `reviewed_by`/`assigned_to`/`deleted_at`.

**service_offers** — `sent | accepted | rejected | withdrawn`؛ فهرس فريد `(request_id, provider_user_id)`.
**service_orders** — `created | accepted | scheduled | in_progress | waiting_customer_confirmation | delivered | completed | cancelled | disputed` + مفردة الحجز المباشر `pending_provider | confirmed | declined`؛ فريد `(request_id)`؛ القيد الوحيد من نوع CHECK في نطاق الخدمات هو `source_type`.
**service_request_matches** — أعلام `is_contacted`/`provider_ignored`/`declined_at` + `wave`؛ فريد `(request_id, provider_id)`.
**service_request_blocks** — `blocked_until`؛ يُفحص عند إنشاء الطلب فقط لا عند النشر.
**service_categories** — `is_active` / `is_featured`؛ حذف صلب محروس بفحص الاستخدام.
**service_notifications** — `is_read`؛ الأنواع المكتوبة: `PROVIDER_APPROVED/REJECTED/SUSPENDED`, `SERVICE_REQUEST_MATCHED`, `SERVICE_OFFER_RECEIVED`, `SERVICE_OFFER_ACCEPTED`, `SERVICE_JOB_COMPLETED`, `SERVICE_REVIEW_RECEIVED`, `SERVICE_MESSAGE`, `DIRECT_BOOKING_*`.
**service_outbox_events** — `pending | processed | failed | skipped`؛ قناة البريد فقط.
**ad_campaigns** — `status`: `draft | active | paused | expired | archived`؛ `approval_status`: `pending | approved | rejected` (الافتراضي `'approved'`)؛ `is_active`, `deleted_at`, نافذة `start_at/end_at`. الاستهداف أعمدة JSON نصية. لا كيان معلن ولا مفاتيح أجنبية.
**ad_creatives** — `status: active`؛ نسخ وسائط لا كيان اعتماد مستقل.
**Placement / Slot** — **لا جدول**؛ سجل شيفرة في `src/constants/advertising.ts` (إرث + 21 عائلة × 8 خانات + 8 مفاتيح قانونية).
**organizations** (Drizzle) — `draft | pending_review | active | rejected | suspended | deleted`؛ دورة منفصلة بمسار مراجعة خاص وبلا أي رابط بـ`service_provider_profiles`.
**office_notification_deliveries** — `queued | deferred | delivered | failed`.
**audit_logs** — الفاعل/الإجراء/الكيان/metadata/IP/الوقت، بلا before/after/reason. **audit_events** — أحداث المصادقة بـ`detail` jsonb.
**leads** — `new … won/lost`؛ نظام CRM موازٍ ميّت (`lead.service.ts` بلا مستوردين؛ نموذج الاتصال وحده يكتب الجدول).

### 3. المسارات (مختصرة حسب النطاق)

**المزوّدون:** `GET/POST /api/service-providers` (عام مقيّد بـ`approved`؛ `admin=1` يتطلّب `SERVICE_PROVIDERS_REVIEW`) · `GET /api/service-providers/[id]` (404 لغير المعتمد) · `PATCH /[id]/status` · `POST /[id]/apply` · `GET/POST/PATCH /[id]/documents` · `GET/POST/DELETE /[id]/categories` (الـGET عام بلا بوابة حالة) · `GET /[id]/portfolio` (المثل) · `GET /api/service-providers/me(/matched-requests)`.
**الطلبات:** `GET/POST /api/service-requests` · `GET/PATCH /[id]` · `POST /[id]/{publish,renew,cancel,matching,matches/[providerId],attachments}` · `GET /[id]/history` · **لا وجود لـ** `/api/admin/service-requests/*`.
**العروض والمهام:** `GET/POST /api/service-offers` · `POST /[id]/{accept,decline,revise,withdraw}` · `/api/service-jobs/**` · `/api/service-bookings/**`.
**الفئات والإعدادات والبلاغات:** `/api/service-categories(/[id])` · `/api/service-marketplace-settings` · `/api/service-reports(/[id]/resolve)` · `/api/service-admin`.
**الإعلانات — العرض:** `POST /api/ads/match-batch` (المسار الرئيسي) · `POST /api/ads/match` (مذكّرة 30 ث) · `GET /api/advertising/match` (الإرث) · `GET/POST /api/office/v1/ads`.
**الإعلانات — التتبّع:** `/api/ads/{impression,click,conversion}` برمز موقّع + nonce + حدّ معدّل.
**الإعلانات — الإدارة:** `GET/POST/PATCH/DELETE /api/admin/ads` · `POST /api/admin/ads/{approve,restore,simulate}` · `GET /api/admin/ads/stats` · `POST /api/ads/request(-asset)` (عام).
**الإشعارات والتدقيق:** `/api/service-notifications(/[id]/read,/read-all)` · `POST /api/service-outbox/drain` · `/api/program/notifications` · `/api/office/v1/notifications` · `/api/admin/office-notifications` · `GET /api/admin/audit`.
**التوافق:** `/api/services/*` تُحوَّل داخل العملية إلى المسارات القانونية عبر `lib/services/forward.ts`؛ باستثناء `/api/services/listings` الذي يستورد `core.ts` القديم مباشرة.

### 4. التدفّقات

**تسجيل مزوّد ← مراجعة ← ظهور عام:** `/providers/apply` → `POST /api/service-providers` (`draft`) → إضافة فئات ومستندات → `POST /[id]/apply` (`submitted`, يتطلّب فئة ومستندات) → **[كسر]** الطابور يبحث عن `under_review` وبلا `admin=1` → `PATCH /[id]/status` → إشعار المزوّد + تدقيق → العرض العام مقيّد بـ`approved`.

**طلب عميل ← مطابقة ← عرض ← مهمّة:** نموذج `/service-requests/new` → `POST /api/service-requests` (`draft`) → `POST /[id]/publish` (`published` + الموجة 1 من ثلاثة + إشعارات + outbox) → عرض مزوّد (`receiving_offers`) → قبول العميل (`service_orders` + `offer_selected`) → إتمام (`completed`). **[كسور]** فشل النشر مبتلَع؛ الحظر لا يُفحص عند النشر؛ صفر مطابقة لا يُبلَّغ؛ لا إجراء إداري.

**اعتماد حملة ← عرض:** `POST /api/admin/ads` (افتراضي `draft`) → `POST /approve` (`approved` + `is_active=1`، و`status` يتغيّر لنوع `request` فقط) → إبطال الكاش → `loadActiveAds` بخمس بوّابات SQL → `evaluateEligibility` بأربع عشرة بوابة → `competingSet` → اختيار مرجَّح → رمز تتبّع. **[كسور]** ADS-01 وADS-02.

**عرض صفحة عامة:** صفحة عميلة → `PublicPageShell` → `StandardPublicAdLayout` ثماني خانات → `ad-match-batcher` يجمعها في `POST` واحد. **[استثناء]** أربع عائلات ما زالت على `AdSidebar`/`AdBottom` بطلب لكل خانة.

**التدقيق:** الخدمات والإعلانات → `audit_logs`؛ المصادقة → `audit_events`؛ `/admin/audit` يقرأ الثاني فقط.

### 5. تغطية الاختبارات القائمة حسب النطاق

- **المزوّدون:** `services-provider-lifecycle` (جدول الانتقالات فقط) · `services-verification-requirements` (لا تختبر أن الاعتماد يستشير `canApprove`) · `services-public-privacy` · `scripts/e2e-lifecycle.mjs`.
- **الطلبات والمطابقة:** `services-state-machine` · `services-matching` · `services-matching-policy` · `services-request-waves` (مسار التجديد فقط؛ مسار `/matching` غير مغطّى) · `services-customer-requests` · `services-direct-booking` · `services-country-matching`.
- **الخدمات (listings):** `services-listings-route` — يمرّر فاعلاً غير مالك ويؤكّد النجاح، أي يكرّس SECURITY-01 · `services-canonical-truth` · `services-migration-authoring-guard`.
- **الإعلانات:** تغطية واسعة وجيّدة — `ads-approval-publishes` (نصّ مصدري) · `ads-engine` · `ads-page-independence` · `ads-batch-isolation` · `ads-geo-authority` (يعدّ مسارين فقط، والإرث خارجهما) · `ads-geo-targeting/-conflict` · `ads-placement-registry` · `ads-legacy-tracking` · `ads-tracking-hardening/-integrity` · `ads-server-context` · `ads-schema-contract` · `ads-base-ddl-contract` (يغطّي `ad_campaigns` فقط، والفجوة في `ad_creatives`) · `ads-campaign-boundaries` · `ads-daily-stats-key` · `ads-write-paths`.
- **الإشعارات والتدقيق:** `services-outbox-delivery` (تأكيدات نصّ مصدري لا تنفيذ) · `integrations-notifications` · `integrations-office-notify` · `audit-log` (تنقيح وسجلّ وحدة فقط؛ لا شيء عن الاستمرارية ولا عن `/api/admin/audit`).
- **الأمان:** `services-authz` (السيناريو 3 يستعمل ثابتًا غير موجود فيصير الاختبار السلبي أجوف) · `services-route-authorization` (مسح ثابت؛ لا يغطّي `/api/services/listings` ولا مسارات الإعلانات) · `admin-page-guards`.
- **البصريات والتنقّل:** `design-tokens` (يفحص وجود الأسماء المعيارية لا تحلّل المستعمل) · `design-tokens-literals` · `accessibility` (البدائيات فقط) · `navigation-links-resolve` (يؤكّد شريطًا جانبيًّا لا يراه المستخدم).
- **بلا تغطية إطلاقًا:** `/api/admin/audit` · مسار `POST /matching` · تخويل `PATCH /api/services/listings/[id]` · طابور مراجعة المشرف · دورة اتصال `lib/db/index.ts` · حالة إنشاء الخدمة.
