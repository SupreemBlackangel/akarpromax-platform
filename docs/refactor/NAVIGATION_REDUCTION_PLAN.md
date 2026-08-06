# NAVIGATION REDUCTION PLAN

> **Status — Phase 4 (navigation reduction) largely done.** Public landing nav is
> admin-free: `adminNav`, `sidebarIndexes`, the header admin chip, and all admin sidebar
> links were removed from `app/page.tsx`; `translations.sidebar` (mixed public/admin) was
> deleted from every locale and from `SiteCopy`; the public sidebar is a text-led
> `publicNav` (Home / Properties / Services / Offices & companies / About / Join us)
> targeting real section anchors; lucide usage in `app/page.tsx` is reduced to `Wrench`.
> Admin now has a **single shared layout**: `app/admin/layout.tsx` (server) fetches
> `getSessionIdentity()` and renders one `AdminSidebar` (`app/admin/admin-sidebar.tsx`)
> with six grouped nav groups (see below) around a `sponsor-admin-canvas`. All
> per-client duplicated sidebars/shells were retired — dashboard, users, roles, reports,
> settings, sponsors and ads clients now render only their page header + panels inside
> the shared canvas; sponsors/ads keep their internal sub-views as page-level
> `admin-subnav` tabs instead of sidebars.
> Remaining work: decide the المزادات / المنتدى / المزيد public items once those routes
> exist, and consolidate admin pages under the group routes below
> (`/admin/organizations`, `/admin/content`), which is deferred.

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

## Admin Navigation Groups (current shared sidebar)
1. الإدارة العامة — لوحة الإحصاءات.
2. المستخدمون والصلاحيات — المستخدمون، الأدوار والصلاحيات.
3. الخدمات والمنظمات — سوق الخدمات، نظام الرعاة، طلبات الرعاة، شريط الرعاة.
4. المحتوى والقانون — إدارة الأخبار، إدارة الترجمات.
5. الإعلانات والتقارير — مركز الإعلانات، التقارير.
6. إعدادات النظام — الإعدادات.
(مجموعة «العقارات والمزادات» لا تظهر بعد لغياب المسارات المقابلة.)

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
- `translations.sidebar` as a mixed public/admin navigation structure — DONE
- public landing page `adminNav` embedded in `app/page.tsx` — DONE
- duplicated admin sidebar definitions in multiple admin clients — DONE (single `app/admin/admin-sidebar.tsx`)
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
