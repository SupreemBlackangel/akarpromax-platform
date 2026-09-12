# بروتوكول برنامج المكتب — `/api/office/v1`

المرجع لما يتبادله برنامج المكتب المكتبي مع المنصة. كل مسار هنا يُصادَق عبر
`authenticateOfficeRequest` (رمز جهاز `apd_…` مقترن) ثم `requireScope`. لا مفتاح
مشترك، ولا مسار خارج هذا البروتوكول.

## `GET /api/office/v1/reference` — القوائم المرجعية

**الصلاحية**: `office.properties.read` — وهي ضمن `OFFICE_DEFAULT_SCOPES`، أي أن
كل جهاز مقترن **قبل اليوم** يملكها. نطاق جديد كان سيقفل هذا المسار في وجه كل
جهاز مقترن سابقًا، لأن نطاقات الجهاز تُجمَّد لحظة الاقتران.

### لماذا هذا المسار موجود

كان البرنامج المكتبي يعرض أربع شرائح مثبّتة لـ«نوع العرض» (بيع · إيجار · إدارة
أملاك · استثمار)، بينما تعرض المنصة **أحد عشر** نوعًا من `property_offer_types`.
فالعقار المنشور من البرنامج لم يكن يستطيع أن يقول «تقبيل» أو «فروغ» أصلًا،
والمنتجان كانا يختلفان على تعريف العقار نفسه.

### مصدر كل قائمة

| القائمة | المصدر | ملاحظة |
|---|---|---|
| `offerTypes` | `property_offer_types` عبر **الاستعلام نفسه** الذي يشغّله `/api/offer-types` | الدالة `activeOfferTypes` في `lib/integration/reference.ts`، ويستوردها المساران معًا — استعلامان منفصلان كانا سينحرفان |
| `categories` / `propertyTypes` | `lib/taxonomy/property-taxonomy.ts` | التصنيفات القديمة (`legacy`) قيمة مخزّنة صالحة لكنها **لا تُعرض** لعقار جديد |
| `listingStatuses` | `OFFICE_LISTING_STATUSES` | انظر أدناه |
| `currencies` | `lib/market/currency-registry.ts` | بترتيب `displayOrder` نفسه الذي يعرضه الموقع |

### حالات العقار عند المكتب

ثلاث حالات، وهي **غير** `properties.status`:

| المعرّف | عربي | `platformStatus` |
|---|---|---|
| `active_market` | السوق النشط | `approved` |
| `under_management` | إدارة أملاك | `null` |
| `completed` | مكتمل | `null` |

`properties.status` حالة **مراجعة المنصة** وتبقى بيد المنصة. مكتب يضع عقارًا
تحت «إدارة أملاك» لا يعتمده، وعقار بانتظار المراجعة لا يزال تحت الإدارة من وجهة
نظر المكتب. واحدة فقط من الثلاث لها مقابل على المنصة.

### التخزين المؤقت

الرد يحمل `version` — بصمة `sha256` بستّ عشرة خانة **على محتوى الرد نفسه** لا
على طابع زمني، لأن التصنيفات تعيش في الكود ولا `updated_at` لها، ونسخة تتحرك
بلا تغيير تُبطل الغرض.

```
GET /api/office/v1/reference
Authorization: Bearer apd_…
x-protocol-version: 1
x-app-version: 3.0.1

200 OK
ETag: "9f2c1ab34de5f607"
Cache-Control: private, max-age=0, must-revalidate

{
  "version": "9f2c1ab34de5f607",
  "offerTypes": [
    { "code": "SALE", "nameAr": "بيع", "nameEn": "Sale", "nameTr": null,
      "allowDirect": true, "allowAuction": true, "sortOrder": 0, "isActive": true },
    { "code": "RENT", "nameAr": "إيجار", … },
    { "code": "TAQBEEL", "nameAr": "تقبيل", … }
  ],
  "categories":    [ { "id": "residential", "labelAr": "سكني", "labelEn": "Residential", "labelTr": "Konut", "sortOrder": 10 } ],
  "propertyTypes": [ { "id": "villa", "categoryId": "residential", "labelAr": "فيلا", … } ],
  "listingStatuses": [ { "id": "active_market", "labelAr": "السوق النشط", …, "platformStatus": "approved" } ],
  "currencies":    [ { "code": "OMR", "symbolAr": "ر.ع", "symbolEn": "OMR" } ]
}
```

والطلب التالي:

```
GET /api/office/v1/reference
If-None-Match: "9f2c1ab34de5f607"

304 Not Modified
ETag: "9f2c1ab34de5f607"
```

الوسم يُقارَن بعد تجريده من علامتَي الاقتباس وبادئة `W/`، فالعميل الذي يرسله
بأيّ من الشكلين يحصل على 304. ووسمٌ قديم يحصل على الفهرس كاملاً لا على 304 بلا
شيء يطبّقه.

**لماذا يهم**: البرنامج يستعلم كل ست ساعات من **كل نسخة مثبّتة**؛ الفهرس غير
المتغيّر يكلّف عندئذٍ بضعة بايتات بدل بضعة كيلوبايتات في كل مرة.

### رموز الحالة

| الرمز | متى |
|---|---|
| 200 | فهرس جديد أو `If-None-Match` غير مطابق |
| 304 | الوسم مطابق — بلا جسم |
| 401 | لا رمز، أو رمز غير مقترن/منتهٍ |
| 403 | الجهاز لا يملك `office.properties.read` |
| 409 | إصدار البروتوكول أو التطبيق يحتاج تحديثًا |

## ما لم يُنفَّذ بعد

| المرحلة | الحالة |
|---|---|
| A2 — توسيع `dealType` إلى الأكواد الأحد عشر و`listingStatus` | لم تُنفَّذ |
| A3 — `GET/PUT /api/office/v1/settings` | لم تُنفَّذ |
