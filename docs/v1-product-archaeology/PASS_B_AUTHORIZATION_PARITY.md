# PASS B — Authorization Parity

## Static Findings

- Current registration sanitizes client-supplied roles to `user` in `lib/auth/access-control.ts`.
- Current RBAC catalog and permission constants exist in `src/constants/roles.ts` and `src/constants/permissions.ts`.
- Guest runtime calls were denied by admin, role, message, and Office sync endpoints.
- Positive-path role enforcement was not tested because no controlled privileged identities were supplied.
- `hasScopedPermission` currently returns `true` once a permission is present and does not enforce the supplied scope; geo/entity scope parity therefore needs focused review.

## Decision

Authorization parity is **OPEN**. Negative guest boundaries passed, but moderator/supervisor/country/organization scope boundaries require authenticated matrix tests.

## Related Capabilities

- `CAP-001` AdminEmperor — **LOST** (P2)
- `CAP-005` AdminActivityLog — **NEEDS_RUNTIME_PROOF** (P1)
- `CAP-007` AdminAnalytics — **NEEDS_RUNTIME_PROOF** (P1)
- `CAP-010` AdminBlog — **NEEDS_RUNTIME_PROOF** (P1)
- `CAP-011` AdminCategories — **NEEDS_RUNTIME_PROOF** (P1)
- `CAP-013` AdminContent — **NEEDS_RUNTIME_PROOF** (P1)
- `CAP-014` AdminDiscounts — **NEEDS_RUNTIME_PROOF** (P1)
- `CAP-015` AdminFreeResources — **NEEDS_RUNTIME_PROOF** (P1)
- `CAP-017` AdminLookups — **NEEDS_RUNTIME_PROOF** (P1)
- `CAP-018` AdminMarketRates — **NEEDS_RUNTIME_PROOF** (P1)
- `CAP-019` AdminModerators — **NEEDS_RUNTIME_PROOF** (P1)
- `CAP-020` AdminNewsTicker — **NEEDS_RUNTIME_PROOF** (P1)
- `CAP-022` AdminPayments — **NEEDS_RUNTIME_PROOF** (P1)
- `CAP-026` AdminReports — **NEEDS_RUNTIME_PROOF** (P1)
- `CAP-027` AdminSEO — **NEEDS_RUNTIME_PROOF** (P1)
- `CAP-030` AdminSettings — **NEEDS_RUNTIME_PROOF** (P1)
- `CAP-033` AdminTickets — **NEEDS_RUNTIME_PROOF** (P1)
- `CAP-034` AdminUsers — **NEEDS_RUNTIME_PROOF** (P1)
- `CAP-035` AdminUsersPage — **V1_STUB** (P4)
- `CAP-036` AdminVerification — **NEEDS_RUNTIME_PROOF** (P1)
- `CAP-057` DashboardProfile — **NEEDS_RUNTIME_PROOF** (P1)
- `CAP-060` DevLogin — **NEEDS_RUNTIME_PROOF** (P1)
- `CAP-071` Login — **NEEDS_RUNTIME_PROOF** (P1)
- `CAP-074` ModeratorPanel — **NEEDS_RUNTIME_PROOF** (P1)
- `CAP-089` Profile — **NEEDS_RUNTIME_PROOF** (P1)
- `CAP-090` ProfilePage — **NEEDS_RUNTIME_PROOF** (P1)
- `CAP-091` ProjectVerify — **NEEDS_RUNTIME_PROOF** (P1)
- `CAP-094` Register — **NEEDS_RUNTIME_PROOF** (P1)
- `CAP-095` ResetPassword — **NEEDS_RUNTIME_PROOF** (P1)
- `CAP-116` AdminMarketers — **NEEDS_RUNTIME_PROOF** (P1)
- `CAP-121` MarketerProfile — **NEEDS_RUNTIME_PROOF** (P1)
- `CAP-123` MarketerRegister — **NEEDS_RUNTIME_PROOF** (P1)
- `CAP-125` SmartLandingBanner — **NEEDS_RUNTIME_PROOF** (P1)
- `CAP-126` GeoAdBanner — **NEEDS_RUNTIME_PROOF** (P1)
- `CAP-147` BankingSecurityEngine — **NEEDS_RUNTIME_PROOF** (P1)
- `CAP-176` UserPreferences — **NEEDS_RUNTIME_PROOF** (P1)
- `CAP-186` AuthContext — **NEEDS_RUNTIME_PROOF** (P1)
- `CAP-192` Email verification lifecycle — **NEEDS_RUNTIME_PROOF** (P0)
- `CAP-193` Password recovery lifecycle — **NEEDS_RUNTIME_PROOF** (P0)
- `CAP-194` Social OAuth login — **IMPROVED** (P3)
- `CAP-195` Server-side RBAC enforcement — **NEEDS_RUNTIME_PROOF** (P0)
- `CAP-196` Blocked account enforcement — **NEEDS_RUNTIME_PROOF** (P0)
- `CAP-226` Admin command and analytics surface — **NEEDS_RUNTIME_PROOF** (P0)