# REDIRECT MAP

## Rules
- Admin route consolidations prefer `internal` redirects because they are authenticated operational routes, not SEO pages.
- Public route redirects use `301` only when a stable public path is being permanently replaced.
- No page is deleted without either a redirect or an explicit rationale for no redirect.

| Old path | New path | Redirect type | Query mapping | Permission impact | SEO impact | Fallback |
| --- | --- | --- | --- | --- | --- | --- |
| `/admin/news` | `/admin/content` | internal | `tab=news` | same content permissions (`NEWS_*`) must be enforced on target tab | none / admin-only | if tab unavailable, land on `/admin/content` default dashboard |
| `/admin/i18n` | `/admin/content` | internal | `tab=translations` | keep `I18N_*` guard on target tab only | none / admin-only | if translations are deferred, land on `/admin/content?tab=news` with notice |
| `/admin/sponsors` | `/admin/organizations` | internal | `scope=sponsors` | `SPONSORS_VIEW` maps to sponsor-scoped organizations view | none / admin-only | land on organizations list without selected entity |
| `/admin/sponsors/banner` | `/admin/organizations` | internal | `scope=sponsors&tab=sponsorship` | preserve sponsor/admin sponsorship permissions | none / admin-only | land on sponsor-scoped organizations overview |
| `/admin/sponsors/requests` | `/admin/organizations` | internal | `scope=sponsors&tab=requests` | preserve approval permissions | none / admin-only | land on sponsor-scoped organizations list if requests tab is blocked |
| `/admin/sponsors/new` | `/admin/organizations` | internal | `scope=sponsors&mode=create` | requires create permission on target flow | none / admin-only | land on sponsor-scoped organizations list with create CTA hidden if forbidden |
| `/admin/sponsors/[id]` | `/admin/organizations` | internal | `scope=sponsors&organizationId=:id&tab=overview` | preserve view permission and entity scoping rules | none / admin-only | land on sponsor-scoped organizations list if entity not found |
| `/admin/sponsors/[id]/edit` | `/admin/organizations` | internal | `scope=sponsors&organizationId=:id&tab=profile&mode=edit` | preserve update permission and entity scoping rules | none / admin-only | land on sponsor-scoped organization overview if edit mode is blocked |

## No Redirect Planned
- `/tools`
  - remains a deferred module route
- `/properties/[id]`
  - stays in the final route map and is rebuilt in place
- `/services`
  - stays in the final route map and is rebuilt in place

## Validation Requirements
- Every redirect must preserve authorization boundaries.
- No redirected admin route may expose a target tab to a user lacking the required permission.
- Legacy URLs must resolve without redirect loops.
- Query-state reconstruction must be deterministic so that bookmarked operational views still open to the correct target context.
