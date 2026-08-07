# Services Seed Data

## Overview

Comprehensive seed data for development and testing environments. Provides realistic test coverage across all service workflows.

## Seed Command

```bash
# Development only - refuses production
npm run seed:services

# Or directly
npx tsx lib/services/seed-marketplace.ts
```

## Production Protection

```typescript
if (process.env.NODE_ENV === "production") {
  throw new Error("Seed refused: production environment detected");
}
```

## Seed Users

| Email | Role | Purpose |
|-------|------|---------|
| `admin@localhost.akarpromax` | `super_admin` | Full platform access |
| `supervisor@localhost.akarpromax` | `service_supervisor` | Services moderation |
| `customer@localhost.akarpromax` | `viewer` | Customer test account |
| `provider1@localhost.akarpromax` | `service_provider` | Cleaning/maintenance |
| `provider2@localhost.akarpromax` | `service_provider` | Construction/renovation |
| `provider3@localhost.akarpromax` | `service_provider` | Technical (AC/electrical/plumbing) |
| `provider4@localhost.akarpromax` | `service_provider` | Moving/landscaping/security |

**Password**: All test users use `SEED_TEST_PASSWORD` from environment (not committed).

## Seed Categories (30)

Root categories covering all required domains:

| Code | Name (AR) | Name (EN) | License | Visit | Price Range |
|------|-----------|-----------|---------|-------|-------------|
| cleaning | تنظيف | Cleaning | No | No | 10-50 |
| maintenance | صيانة | Maintenance | No | Yes | 20-200 |
| moving | نقل أثاث | Moving | No | Yes | 50-300 |
| renovation | تشطيب وترميم | Renovation | Yes | Yes | 500-20000 |
| home-services | خدمات منزلية | Home services | No | No | 5-80 |
| ac-repair | تكييف وتبريد | AC & cooling | Yes | Yes | 15-150 |
| electrical | كهرباء | Electrical | Yes | Yes | 10-150 |
| plumbing | سباكة | Plumbing | No | Yes | 10-120 |
| carpentry | نجارة | Carpentry | No | No | 20-300 |
| painting | دهان | Painting | No | Yes | 50-500 |
| pest-control | مكافحة آفات | Pest control | No | No | 15-120 |
| landscaping | تنسيق حدائق | Landscaping | No | No | 50-1000 |
| pool-cleaning | تنظيف مسابح | Pool cleaning | No | No | 20-150 |
| security | أنظمة أمنية | Security systems | Yes | No | 80-2000 |
| smart-home | أنظمة المنزل الذكي | Smart home | No | No | 100-3000 |
| interior-design | تصميم داخلي | Interior design | No | No | 100-5000 |
| architectural | استشارات معمارية | Architectural consulting | Yes | No | 150-4000 |
| surveying | مساحة | Surveying | Yes | Yes | 80-800 |
| inspection | فحص العقارات | Property inspection | Yes | Yes | 60-500 |
| property-management | إدارة أملاك | Property management | No | No | 200-5000 |
| legal-services | خدمات قانونية | Legal services | Yes | No | 100-3000 |
| accounting | محاسبة وضرائب | Accounting & tax | Yes | No | 80-2000 |
| real-estate-marketing | تسويق عقاري | Real-estate marketing | No | No | 100-3000 |
| photography | تصوير عقاري | Property photography | No | No | 30-400 |
| it-services | خدمات تقنية | IT services | No | No | 20-500 |

Each category includes:
- AR/EN/TR names
- Dynamic fields (property type, area, rooms, service type, etc.)
- Price ranges
- License/visit requirements
- Icons (Lucide names)

## Seed Providers (4)

### Provider 1: شركة النور للخدمات
- **Location**: Muscat (23.578, 58.387), 30km radius
- **Categories**: Cleaning, Maintenance, Home services, Pest control
- **Stats**: 214 jobs, 98% completion, 96% response, 4.8★ (87 reviews)

### Provider 2: مؤسسة البناء الحديث
- **Location**: Muscat (23.616, 58.459), 40km radius
- **Categories**: Renovation, Painting, Carpentry, Interior design
- **Stats**: 156 jobs, 96% completion, 92% response, 4.6★ (63 reviews)

### Provider 3: مجموعة الصيانة الفنية
- **Location**: Muscat (23.548, 58.287), 25km radius
- **Categories**: AC repair, Electrical, Plumbing, Pool cleaning
- **Stats**: 301 jobs, 99% completion, 98% response, 4.9★ (132 reviews)

### Provider 4: شركة التحرك السريع
- **Location**: Muscat (23.528, 58.31), 20km radius
- **Categories**: Moving, Landscaping, Security, Smart home
- **Stats**: 98 jobs, 94% completion, 90% response, 4.4★ (41 reviews)

All providers:
- Status: `approved`
- Verified documents (commercial registration)
- Portfolio items with images
- Business registration verified

## Seed Requests (4)

| Ref | Category | Title | Urgency | Budget | Status |
|-----|----------|-------|---------|--------|--------|
| SR-2026-1001 | cleaning | Weekly apartment cleaning | this_week | 15-40 | published |
| SR-2026-1002 | renovation | Full villa renovation | asap | 8000-25000 | published |
| SR-2026-1003 | ac-repair | AC not cooling | urgent | 20-120 | published |
| SR-2026-1004 | moving | Move furniture | this_week | 60-200 | published |

All requests:
- Location: Muscat area (different coordinates)
- Dynamic answers populated per category
- Matches computed for all providers
- Status history recorded

## Seed Offers

Each published request receives offers from matching providers:
- Multiple offers per request (2-4)
- Varied pricing strategies
- Some with materials included
- Different durations
- One accepted offer per request (SR-1001)

## Seed Orders & Jobs

### Demo Job (SR-1001)
- **Offer**: 25 OMR, 30 days, materials included
- **Timeline**:
  1. `offer_accepted` - Cleaning offer accepted
  2. `order_scheduled` - First visit Saturday
  3. `order_in_progress` - Weekly cleaning started
  4. `order_completed` - Service completed
- **Reviews**: 5★ both directions
- **Provider stats updated**: rating 4.8, count 88, jobs 215

## Seed Reviews

| Order | Reviewer | Reviewee | Rating | Comment (AR) | Quality | Punctuality | Communication | Value | Recommend |
|-------|----------|----------|--------|--------------|---------|-------------|---------------|-------|-----------|
| Demo | Customer | Provider 1 | 5 | فريق محترف | 5 | 5 | 5 | 4 | Yes |
| Demo | Provider 1 | Customer | 5 | عميل ملتزم | - | - | - | - | - |

## Seed Verification

All providers: `status = "approved"` with:
- Commercial registration document (verified)
- Portfolio item (featured)
- Complete profile (bio, contact, categories)

## Seed Disputes

None by default (clean state). Can be created via test scripts.

## Seed Notifications

Generated automatically during seeding:
- Match notifications for all request-provider pairs
- Offer received notifications
- Offer accepted notifications
- Job completion notifications
- Review received notifications

## Idempotency

All seed functions check for existing data:
```typescript
const existing = await db.prepare("SELECT COUNT(*) FROM ...").first();
if (existing && existing.count > 0) return;
```

Safe to run multiple times.

## Cleanup Command

```bash
npm run seed:services:clean
```

Removes:
- Test users (`*@localhost.akarpromax`)
- Test categories (`ROOT_CATEGORIES` codes)
- Test providers, requests, offers, orders
- Preserves production data

## Test Data Access

```bash
# Login as customer
email: customer@localhost.akarpromax
password: $SEED_TEST_PASSWORD

# Login as provider
email: provider1@localhost.akarpromax
password: $SEED_TEST_PASSWORD

# Login as supervisor
email: supervisor@localhost.akarpromax
password: $SEED_TEST_PASSWORD
```

## Test Coverage

Seed data enables testing:
- ✅ All request states (published, receiving_offers, offer_selected, scheduled, in_progress, completed, cancelled, disputed)
- ✅ All offer states (sent, accepted, rejected, withdrawn, revised, expired)
- ✅ All provider verification states (approved)
- ✅ All job states (accepted, scheduled, in_progress, completed, disputed)
- ✅ Geographic matching (same city, different distances, outside radius)
- ✅ Budget matching (fit, conflict, no budget)
- ✅ Category matching (match, no match)
- ✅ Urgency levels (urgent, asap, today, this_week, normal, flexible)
- ✅ Review system (1-5 stars, sub-ratings, bilingual)
- ✅ Disputes (none seeded, but creatable)
- ✅ Notifications (all types)
- ✅ Multi-language (AR/EN/TR)