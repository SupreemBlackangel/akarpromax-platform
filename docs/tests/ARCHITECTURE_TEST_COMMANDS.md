# Architecture Test Commands

Generated: 2026-08-05

## Available Commands

### Main Architecture Test

```bash
node scripts/check-architecture.mjs
```

**Checks:**
- Module boundary imports
- Circular dependencies
- Public/Admin separation
- Layout count
- Local Header/Footer
- AdSlot usage
- Auth patterns
- Database systems
- Business logic in React
- File size limits

**Exit code:** 0 = PASS, 1 = FAIL

### Module Boundary Test

```bash
node scripts/check-module-boundaries.mjs
```

**Checks:**
- Cross-module direct imports
- Internal folder imports
- Public API exports

**Exit code:** 0 = PASS, 1 = FAIL

## Running All Tests

```bash
# Run all architecture tests
node scripts/check-architecture.mjs && node scripts/check-module-boundaries.mjs

# Or with npm (if scripts added to package.json)
npm run test:architecture
```

## CI Integration

Add to CI pipeline:

```yaml
- name: Architecture Tests
  run: |
    node scripts/check-architecture.mjs
    node scripts/check-module-boundaries.mjs
```

## Interpreting Results

### PASS
All architectural rules are satisfied. No new violations detected.

### PASS WITH LEGACY EXCEPTIONS
All rules satisfied except documented legacy exceptions with target removal phases.

### FAIL
New violations detected that must be addressed before proceeding.

## Exception Management

### Adding Exceptions

1. Edit `architecture-exceptions.json`
2. Add entry with:
   - `id`: Unique identifier
   - `rule`: Rule being excepted
   - `path`: File or directory path
   - `reason`: Clear explanation
   - `targetPhase`: When to remove
   - `expiresAfterPhase`: Maximum allowed phase

### Removing Exceptions

1. Fix the violation in code
2. Remove entry from `architecture-exceptions.json`
3. Run tests to verify

## Warnings vs Failures

| Severity | Action |
|----------|--------|
| WARNING | Log for review, does not fail build |
| VIOLATION | Must be fixed or have exception |
| BLOCKING | Cannot proceed without fix |

## Current Status

- Total rules: 25
- Automated: 25
- Manual: 0
- Legacy exceptions: 16
- Blocking violations: 0
