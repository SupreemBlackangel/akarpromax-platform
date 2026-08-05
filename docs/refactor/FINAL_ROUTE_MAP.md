# FINAL ROUTE MAP

## Rule
- This file is a target route map only.
- It does not authorize creating any page now.
- Routes missing today are future implementation targets after architectural repair.

## Public
| Target Route | Current Status | Current Source / Note |
| --- | --- | --- |
| `/` | Exists, rebuild in place | Current `app/page.tsx` |
| `/properties` | Missing, create later | No current listing route |
| `/properties/[id]` | Exists, rebuild in place | Current property detail prototype |
| `/auctions` | Missing, create later | No current route |
| `/services` | Exists, rebuild in place | Current standalone services page |
| `/offices` | Missing, create later | No current route |
| `/companies` | Missing, create later | No current route |
| `/community` | Missing, create later | No current route |
| `/knowledge` | Missing, create later | No current route |
| `/legal/[slug]` | Missing, create later | Footer/legal content not yet routed |

## Account
| Target Route | Current Status | Current Source / Note |
| --- | --- | --- |
| `/account` | Missing, create later | Account currently dialog-driven only |
| `/account/profile` | Missing, create later | No dedicated account route |
| `/account/properties` | Missing, create later | No dedicated account route |
| `/account/favorites` | Missing, create later | No dedicated account route |
| `/account/bids` | Missing, create later | No dedicated account route |
| `/account/service-requests` | Missing, create later | No dedicated account route |
| `/account/notifications` | Missing, create later | No dedicated account route |
| `/account/settings` | Missing, create later | No dedicated account route |

## Workspace
| Target Route | Current Status | Current Source / Note |
| --- | --- | --- |
| `/workspace/office` | Missing, create later | No workspace route yet |
| `/workspace/engineer` | Missing, create later | `/tools` will become deferred workspace-accessible module, not primary nav |
| `/workspace/valuer` | Missing, create later | No route yet |
| `/workspace/marketer` | Missing, create later | No route yet |
| `/workspace/artisan` | Missing, create later | No route yet |

## Admin
| Target Route | Current Status | Current Source / Note |
| --- | --- | --- |
| `/admin` | Exists, keep and rebuild on `AdminLayout` | Current dashboard |
| `/admin/users` | Exists, keep and rebuild on `AdminLayout` | Current users admin |
| `/admin/roles` | Exists, keep and rebuild on `AdminLayout` | Current roles matrix |
| `/admin/properties` | Missing, create later | No current route |
| `/admin/auctions` | Missing, create later | No current route |
| `/admin/services` | Missing, create later | No current route; current `/services` is public |
| `/admin/organizations` | Missing, create later | Target consolidation home for sponsor domain |
| `/admin/legal` | Missing, create later | No current route |
| `/admin/ads` | Exists, keep and rebuild on `AdminLayout` | Current ad center |
| `/admin/content` | Missing, create later | Target consolidation home for news + translations + content ops |
| `/admin/reports` | Exists, keep and rebuild on `AdminLayout` | Current analytics page |
| `/admin/settings` | Exists, rebuild in place | Current route currently hosts pricing/plans only |

## Legacy Routes Outside the Final Map
| Current Route | Final Disposition |
| --- | --- |
| `/tools` | Keep as deferred module, not in primary navigation |
| `/admin/news` | Merge into `/admin/content` |
| `/admin/i18n` | Merge into `/admin/content` |
| `/admin/sponsors` | Merge into `/admin/organizations` |
| `/admin/sponsors/banner` | Merge into `/admin/organizations` |
| `/admin/sponsors/new` | Merge into `/admin/organizations` unified wizard mode |
| `/admin/sponsors/requests` | Merge into `/admin/organizations` requests tab |
| `/admin/sponsors/[id]` | Merge into `/admin/organizations` organization detail tabs |
| `/admin/sponsors/[id]/edit` | Merge into `/admin/organizations` organization detail edit mode |

## Route Ownership Rules
- Public routes use `PublicLayout` and `PublicPageShell` only.
- Account routes use `AccountLayout` only.
- Workspace routes use `WorkspaceLayout` only.
- Admin routes use `AdminLayout` only.
- No route may infer audience by role checks inside a page shell after the refactor.
