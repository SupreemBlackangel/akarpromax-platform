# Feature Freeze Declaration

Generated: 2026-08-05

## Effective Immediately

All feature development is frozen until the architecture refactoring is complete.

## What is Frozen

- No new pages or routes
- No new UI components
- No new API endpoints
- No new database schemas or migrations
- No new authentication systems
- No new database connections (PostgreSQL, MySQL, D1)
- No new external service integrations

## What is Allowed

- Architecture refactoring tasks (approved phases only)
- Bug fixes for critical production issues (requires ADR)
- Security patches (requires ADR)
- Documentation updates

## Exception Process

Any exception requires:
1. An Architecture Decision Record (ADR)
2. Explicit written approval
3. Documentation of the exception in this file

## Exception Log

| Date | Request | Decision | Approved By |
|------|---------|----------|-------------|
| (none) | - | - | - |

## Enforcement

This freeze is enforced by the refactoring team. All commits during the
refactoring period will be reviewed for compliance.
