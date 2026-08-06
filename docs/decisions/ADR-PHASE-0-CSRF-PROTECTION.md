# ADR-Phase-0: CSRF / Cross-Origin Request Protection

Generated: 2026-08-06

## Status

ACCEPTED (implemented in Phase 0)

## Context

State-changing auth endpoints (`login`, `register`, `verify`, `logout`) rely on
a cookie session and therefore need cross-site request forgery (CSRF)
protection. The app previously had **no Origin/Referer validation**. It also
had no canonical definition of "this app's origins", so a future origin check
would be un-configurable.

## Decision

1. **Origin header validation on state-changing requests** via
   `lib/security/origin.ts`:
   - Safe methods (`GET`, `HEAD`, `OPTIONS`) bypass the check.
   - Browsers always send `Origin` on cross-site state-changing requests.
     A **missing** `Origin` is treated as a non-browser (curl/server-to-server)
     caller and passes (documented trade-off — see Consequences).
   - An explicit **webhook path exemption set** (`isWebhookPath`) exists as the
     extension point for trusted server-to-server callers that send no browser
     `Origin`. The set is empty today; no webhooks exist yet.
   - `localhost` origins are trusted **in development only**.
   - Otherwise the origin must be `http(s)` and match the trusted set.
2. **Trusted origins are config**: `APP_URL` (canonical) plus a
   comma-separated `TRUSTED_ORIGINS` list, both validated at boot by
   `lib/config/runtime-env.ts` (`TRUSTED_ORIGINS` is **required in
   production**). Origins are normalized to their `URL.origin` (no trailing
   slash, no path).
3. **Uniform rejection**: untrusted origins → `403`
   `{ error: "origin_rejected", code: "AUTH_ORIGIN_REJECTED" }` and a
   `AUTH_ORIGIN_REJECTED` security audit event.
4. **Enforcement point**: `assertSafeOrigin(request)` is the first guard in the
   unified API handler (`lib/api/handler.ts`), so every route that uses it is
   covered. Auth routes were migrated to the handler in this phase.
5. SameSite `Lax` cookies (see ADR-Phase-0-SESSION-COOKIE) are the second,
   complementary layer. Origin validation protects against cases SameSite
   cannot (subdomain compromise, older clients, non-cookie flows).

## Alternatives considered

- **Synchronizer token / double-submit cookie**: stronger for browser flows but
  adds a token lifecycle and breaks the curl/server-to-server pattern the app
  relies on. Deferred as an optional hardening layer.
- **Referer checking only**: unreliable (stripped by privacy settings/referrer
  policy) and breaks the missing-Origin caller story.
- **SameSite=Strict only**: insufficient on its own for subdomain scenarios and
  can degrade UX on top-level navigations.

## Consequences

### Positive
- State-changing auth requests now require a same-app origin (or documented
  non-browser caller), with a single configurable trust list.
- Boot-time validation rejects production starts with missing/invalid origins
  (fail-fast, no silently-open CSRF posture).
- Audit trail records every rejection.

### Negative / accepted risks
- Missing-Origin pass-through means a naive CSRF-capable script that omits
  `Origin` is not blocked by this layer alone (SameSite + rate limiting still
  apply). Documented in `docs/security/SECURITY_HEADERS_POLICY.md`.
- Under `vinext dev`/Workers the `Host`/forwarded-proto handling differs from
  `vinext start`; the trust list is explicit and does not depend on `Host`, so
  behavior is consistent.

## Related

- `docs/security/AUTH_RATE_LIMIT_POLICY.md` (brute-force layer)
- `ADR-Phase-0-SESSION-COOKIE.md` (cookie layer)
- `docs/security/SECURITY_HEADERS_POLICY.md`
