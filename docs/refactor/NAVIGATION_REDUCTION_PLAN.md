# NAVIGATION REDUCTION PLAN

## Principles
- Public navigation and admin navigation must be fully separated.
- Navigation schemas must be scope-specific:
  - Public
  - Account
  - Workspace
  - Admin
- No admin item appears in public navigation.
- No deferred module appears in the primary public navigation.
- One icon library only after execution; no mixed emoji/Unicode/lucide systems.

## Public Navigation Maximum
1. الرئيسية.
2. العقارات.
3. المزادات.
4. سوق الخدمات.
5. المكاتب والشركات.
6. المنتدى والمعرفة.
7. المزيد.

## Public Navigation Mapping From Current State
| Current Item / Pattern | Target Placement |
| --- | --- |
| Home | الرئيسية |
| Services marketplace | سوق الخدمات |
| Offices + companies future routes | المكاتب والشركات |
| Books and programs | المزيد أو المعرفة حسب القرار التحريري |
| About us | المزيد |
| Contact us | المزيد |
| FAQ | المزيد |
| Advertise with us | المزيد |
| Admin links currently embedded in `/` | removed from public navigation entirely |
| Tools | deferred module, hidden from main public nav |

## Account Navigation
- حسابي.
- عقاراتي.
- المفضلة.
- طلباتي.
- الإشعارات.
- تسجيل الخروج.

## Workspace Navigation
- Workspace navigation is role-specific and must stay out of the public top-level navigation.
- Deferred tools and professional modules are entered from workspace context, not from the primary public menu.

## Admin Navigation Groups
1. الإدارة العامة.
2. المستخدمون والصلاحيات.
3. العقارات والمزادات.
4. الخدمات والمنظمات.
5. المحتوى والقانون.
6. الإعلانات والتقارير.
7. إعدادات النظام.

## Admin Group-to-Route Mapping
| Group | Final Routes |
| --- | --- |
| الإدارة العامة | `/admin` |
| المستخدمون والصلاحيات | `/admin/users`, `/admin/roles` |
| العقارات والمزادات | `/admin/properties`, `/admin/auctions` |
| الخدمات والمنظمات | `/admin/services`, `/admin/organizations` |
| المحتوى والقانون | `/admin/content`, `/admin/legal` |
| الإعلانات والتقارير | `/admin/ads`, `/admin/reports` |
| إعدادات النظام | `/admin/settings` |

## Icon Reduction Rules
- No more than 12 directly visible icons without opening a group.
- Public top-level navigation should be primarily text-led, not icon-heavy.
- Admin group headers may carry one icon each.
- One icon library only after consolidation.
- All emoji and ad hoc Unicode nav icons must be retired.

## Current Navigation Structures To Retire
- `translations.sidebar` as a mixed public/admin navigation structure
- public landing page `adminNav` embedded in `app/page.tsx`
- duplicated admin sidebar definitions in multiple admin clients
- tools-local emoji navigation in primary app surfaces

## Breadcrumb Rule
- Breadcrumbs are not part of navigation ownership files.
- They are rendered by the page shell/layout layer only.
- No page manually defines its own breadcrumb shell.

## "More" Menu Scope
- `المزيد` collects secondary public items only, such as:
  - عن المنصة
  - اتصل بنا
  - أعلن معنا
  - الأسئلة الشائعة
  - الصفحات القانونية
  - التحميلات غير الأساسية
- Deferred modules remain out of this menu unless explicitly approved later.

## Migration Notes
- `/admin/news` and `/admin/i18n` disappear as primary admin menu items and move under `/admin/content`.
- `/admin/sponsors*` disappears as a primary route family and moves under `/admin/organizations`.
- `/tools` remains accessible but is removed from primary navigation exposure.
