# RISK AND ROLLBACK PLAN

## Risk Matrix
| Risk | Probability | Impact | Prevention | Detection | Rollback |
| --- | --- | --- | --- | --- | --- |
| فقدان بيانات المستخدمين | Medium | Critical | full PostgreSQL/MySQL/D1 backups, dry-run migration, staged reconciliation tables | row-count mismatch, missing-user audit, login failure spikes | restore DB backup, restore previous release tag, re-run migration after root cause fix |
| تعطل تسجيل الدخول | High | Critical | replace auth behind staged cutover, pre-cutover auth test pack, keep feature freeze | synthetic login checks, auth API 5xx/4xx monitoring, Sentry alarms | redeploy previous release, restore previous auth config, force session invalidation if needed |
| تعارض Cookies | Medium | High | one canonical cookie name/path/domain policy, cookie cleanup during cutover | duplicate cookie presence, inconsistent `authenticated` state, browser QA failures | revert cookie naming/policy change, clear conflicting cookies, redeploy previous release |
| فقدان صلاحيات الإدارة | Medium | Critical | migrate RBAC with explicit mapping table, admin permission verification script, seeded admin validation set | admin access denial after cutover, missing modules in admin menu, failed permission tests | restore previous RBAC snapshot, re-enable last known-good release, patch mapping before retry |
| اختلاف IDs بين قواعد البيانات | High | High | create legacy-to-target ID mapping tables, use immutable source references, avoid lossy merges | orphan rows, broken foreign references, failed entity lookups | restore staging data, rerun migration with corrected mapping rules |
| تعطل روابط قديمة | Medium | Medium | maintain redirect map, test all legacy admin URLs, add redirect regression tests | 404 logs, redirect loops, QA bookmark failures | reintroduce temporary compatibility redirects, redeploy previous routing config |
| فقدان إحصاءات الإعلانات | Medium | High | migrate ad event/stat tables separately, freeze ad writes during final sync window, verify totals before cutover | mismatch in campaign totals, dashboard KPI drift, missing daily stats rows | restore analytics tables from backup, keep legacy read-only reporting source until corrected |
| اختلاف بيانات الموقع الجغرافي | High | High | normalize country/city/lat/lng fields, design PostGIS transformation rules, stage unresolved geodata | branch/service map points missing, invalid coordinates, geofence mismatch | restore legacy location fields, mark unresolved rows for manual review, rerun geo transform |
| فشل SSR أو Hydration | Medium | High | replace client-only page shells gradually, test server/client parity, avoid mixed auth/layout states | hydration warnings, broken interactive UI, console errors | revert affected layout/page shell deployment, restore prior page implementation |
| تعطل RTL | Medium | High | direction-aware design tokens, RTL QA on every rebuilt public page, shared shell ownership | visual QA failures, alignment regressions, snapshot differences | revert shell styling changes, restore previous CSS/layout version |
| أخطاء الهاتف | High | High | mobile-first shell contract, fixed breakpoint QA, shared responsive grid | overflow, clipped controls, sticky overlap, Lighthouse/mobile QA failures | roll back responsive shell changes, hotfix token/layout regressions before retry |
| فشل Build | Medium | Critical | phase-by-phase typecheck/lint/build gates, no mixed legacy/new imports, migration branch discipline | CI build failure, local production build failure | revert last refactor batch, isolate failing phase changes, re-run from previous green checkpoint |

## Cross-Phase Rollback Rules
- Every execution phase must start from a tagged, deployable baseline.
- Database-affecting phases require fresh backups immediately before migration.
- Redirect changes must be reversible independently of data migration.
- Cookie/auth changes must be reversible independently of UI/layout changes.
- Legacy DB sources are not deleted until post-cutover validation passes.

## Operational Rollback Sequence
1. Stop rollout and freeze writes if data integrity is at risk.
2. Revert application deployment to the previous signed tag.
3. Restore PostgreSQL and/or legacy source backups if data corruption occurred.
4. Clear or invalidate incompatible sessions if auth/session behavior changed.
5. Re-run smoke tests on the rolled-back release.
6. Document root cause before the next retry window.

## Minimum Detection Signals To Monitor During Execution Phases
- login success rate
- admin authorization failure rate
- redirect 404/loop rate
- ad impression/click ingestion rate
- page hydration/console error rate
- mobile overflow and RTL visual QA results
- build/typecheck/lint status
