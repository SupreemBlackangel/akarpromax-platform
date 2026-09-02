# ADR-001 — What the WinForms migration actually targets

**Status:** Decided 2026-09-02. Supersedes risk R1 in the
[discovery report](../baseline/DISCOVERY_REPORT.md).

## The problem

The mandate says "convert the existing WPF application to VB.NET WinForms".
Discovery found that phrase does not resolve to one thing, because **the office
product exists twice**:

| | WPF (`AkarApp_SOURCE`) | React SPA (`webui/`) |
|---|---|---|
| Reachable by users | **No** | **Yes** — this is what they use |
| Source available | Yes, 172 C# files (decompiled) | **No** — built bundles only |
| UI source | **No** — 37 views are BAML, XAML lost | No — 1.5 MB minified |
| Modules | Dashboard, Clients, Properties, Contracts, Treasury, Vouchers, Reports, Maintenance, Users, Settings | Dashboard, Clients, Properties, PropertyRequests, Contracts, Invoices, Ledger, Radar, Reports, Settings |

`MainWindow_Loaded` opens the WebView2 portal immediately and shuts the app down
when it closes, so the WPF screens are unreachable. The two implementations
cover the same domain.

The SPA source was searched for across every sibling folder
(`AkarApp_INSTALLER`, `AkarApp_PUBLISH_TEST`, `AkarApp_Patcher`, `V1.0`,
`V 3.0 GPT 2027`, `V4.0 GPT 2027`, `handoff`, `ops`) and is **not on this
machine**. `V1.0` is the old web platform, not the office app.

## Decision

**Build the native WinForms application against the WPF domain code, and measure
feature parity against the SPA.**

Concretely:

- **Domain, application and data layers** port from the readable C#:
  48 `Models/` (EF entities + `AkarDbContext`), 25 `Services/`, ~30 `ViewModels/`
  and the EF `Migrations/`. This is real, inspectable business logic and it is
  the part that can proceed on evidence rather than reconstruction.
- **Every screen is built new** in VB.NET WinForms with DevExpress.
- **Parity is measured against the SPA**, not against the dormant WPF screens,
  because the SPA is what users have today. Shipping "parity" with screens
  nobody can open would remove features people currently use.
- **The WebView2 portal survives as one section**, not as the entry point.

## Why not the alternatives

**Port the SPA.** Rejected: no source. It would mean reverse-engineering a
1.5 MB minified bundle — that is not a migration, it is archaeology, and the
result could not be verified against anything.

**Revive the WPF screens as-is.** Rejected as a *target*, though its code is the
input. Those screens are dormant and their XAML is gone, so "reviving" them
means rebuilding them anyway — and rebuilding them to a spec users abandoned.

**Keep the WebView2 shell.** Rejected as an answer to this mandate: hardening a
browser window is not a WinForms desktop application. Several of its defects are
fixed anyway, because they break users today (see below).

## What the lost XAML actually costs

Less than it first appears. A WinForms migration rewrites every screen
regardless — XAML does not port to WinForms in any form. What is lost is
**reference**: the exact layout, styling and binding of each screen can no
longer be read, only observed by running the app.

Since parity is measured against the SPA rather than those screens, the loss is
mostly moot. It matters in one place: any business rule expressed as a XAML
trigger, converter binding or validation rule is invisible. The four
`Converters/` are readable C#; anything else must be found by running the
original.

## Consequences

- The migration is a **rewrite of the presentation layer** and a **port of the
  domain layer**. Estimates and gates should reflect that, not a mechanical
  conversion.
- The SPA must keep working until WinForms reaches parity. It cannot be removed
  early.
- Feature parity needs a screen-by-screen inventory of the **SPA**, which does
  not exist yet and must be produced by running it.
- The three business rules held in SQLite triggers (ownership totalling 100%,
  max two lead claims, append-only client timeline) must be lifted into
  documented domain rules before the Domain layer is written, or it will not
  know they exist.

## Done first, ahead of any of this

Three defects break users today, are independent of the migration, and two are
server-side. Fixing them was not deferred:

1. The app called `akar-promax.com`, which does not resolve. Fixed on
   `develop/office-winforms`; the address now lives in `ApiEndpoints` and is
   overridable through `AKARPROMAX_API_BASE`.
2. `/api/program/subscription-status` did not exist. Implemented, reporting
   account standing — the platform has no subscription entity, and inventing a
   plan or expiry would be fabricating business data.
3. A shared secret compiled into every installed copy travelled as a URL query
   parameter beside the user token. Removed; the session token authenticates on
   its own, in an `Authorization` header.

None of this is released. `master` is untagged at the shipped state, work is on
`develop/office-winforms`, and per §51 a release needs explicit approval.
