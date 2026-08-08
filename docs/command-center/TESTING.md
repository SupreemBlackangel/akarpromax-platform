# Command Center Testing

## Test Coverage

The Command Center includes 25 comprehensive tests covering:

### API Tests (2 tests)
1. **RBAC enforcement**: Verifies 403 for unauthorized users
2. **Response structure**: Validates all metric sections present

### Service Tests (12 tests)
1. **Core structure**: Returns all required sections
2. **Sponsors**: Total, active, byStatus, byCountry, queries sponsors table
3. **Properties**: Total, active, byStatus, byType, queries property_listings
4. **Properties drill-down**: byListingType, featured, missingCoordinates, staleCount, recentCount
5. **Users**: Total, byRole, byStatus, queries users table
6. **Ads**: Campaign type, status, queries ad_campaigns
7. **Integration**: Total devices, byStatus, queries office_devices
8. **Geo**: Properties by city, queries property_listings with city_id
9. **Services**: Requests, offers, orders, providers, disputes metrics
10. **Health**: Status, database, authentication, realtime, officeIntegration, email
11. **User security**: RecentRegistrations, suspendedCount, pendingVerification
12. **Disputes**: Total disputes, open disputes, byStatus, queries service_disputes

### UI Tests (11 tests)
1. **Page renders**: Admin page renders
2. **Primary metrics**: Total properties, services, users displayed
3. **Sponsors section**: Active sponsors displayed
4. **Properties section**: Active properties, status/type breakdown
5. **Services section**: Requests, offers, orders, providers, disputes
6. **Ads section**: Active ads, status, type, approval breakdown
7. **Geographic section**: Properties by city, demand by city, providers by city, coverage gaps
8. **Users section**: Active users, role breakdown, status breakdown
9. **Integration section**: Devices, syncs, notifications, pending pairings
10. **Health section**: Database, auth, realtime, office integration, email health
11. **Audit section**: Recent actions, today count

### CSS Tests (7 tests)
1. **Responsive 780px**: cc-meta, cc-mini-bars, cc-audit
2. **Responsive 480px**: cc-metric, cc-bar-row, cc-kpi-row, cc-mini-bars
3. **Dark mode**: cc-status-ok, cc-status-warn
4. **RTL**: cc-bar-label, cc-bar-value, cc-metric-label, cc-metric-note (LTR overrides)
5. **Reduced motion**: All transitions and animations disabled
6. **Calculator Turkish**: All 10 calculators have tr translations
7. **Calculator Turkish content**: Sample translations verified

## Running Tests

```bash
# Run all tests
npm test

# Run only command center tests
node --import tsx --test tests/command-center.test.mjs

# Run in watch mode (requires node --watch)
node --import tsx --watch --test tests/command-center.test.mjs
```

## Test File

- **Location**: `tests/command-center.test.mjs`
- **Framework**: Node.js built-in test runner
- **Dependencies**: None (pure assert module)
- **Execution time**: ~6 seconds (full suite)

## Regression Testing

After any Phase 7 changes, verify:

1. **TypeScript**: `npx tsc --noEmit`
2. **ESLint**: `npx eslint lib/command-center/ app/admin/command-center-client.tsx app/admin/page.tsx`
3. **Tests**: `npm test`
4. **Architecture**: `node scripts/check-architecture.mjs`
5. **Boundaries**: `node scripts/check-module-boundaries.mjs`
6. **Phase 5 regression**: `npx vitest run tests/unit tests/integration tests/db tests/edge-cases tests/components tests/workflows`
7. **Phase 6 regression**: `npx vitest run tests/lighthouse-budget tests/html-validation tests/i18n-calculators tests/rendered-html`

## Known Issues

- `integrations-realtime.test.mjs` may occasionally fail due to timing issues in full suite (passes when run alone)
- Pre-existing `nodemailer` missing error in `lib/email.ts` (unrelated to Phase 7)
