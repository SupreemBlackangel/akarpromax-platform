# ADR-003 — My recommendation on the WinForms rewrite

**Status:** Recommendation, 2026-09-02. Asked for explicitly; the decision
remains the owner's.

---

## Recommendation

**Do not do the VB.NET WinForms + DevExpress rewrite as specified.** Not yet,
and — for the VB.NET part — not at all.

This is not a judgement about ambition. It is that discovery changed the facts
the plan was written against, in three ways that each move the answer.

---

## Why

### 1. It is a from-scratch rewrite, not a migration

The plan assumes existing UI is being converted. There is nothing to convert:

- The 37 WPF views are **compiled BAML**. No XAML, so no layout, style, binding
  or validation rule can be read — only observed by running the app.
- The **live** product is a React SPA whose **source is not on this machine**.
- So every screen would be rebuilt by observing a running application.

Nothing ports except the domain layer. "Migration" implies leverage that does
not exist here.

### 2. At completion, it does what today already does

Feature parity with the SPA *is* the finish line (ADR-001). Months of work, a
DevExpress licence, and a data migration with no fallback copy — to arrive at
the product the office already runs. Every genuine improvement in the plan
(offline, sync, updates, theming, RTL, DPI) is achievable without changing UI
technology.

### 3. The real risks are elsewhere, and they are cheap

What actually threatened this business, found today:

| Found | Severity | Cost to fix |
|---|---|---|
| Non-atomic writes — one power cut destroys every client record | **Existential** | Fixed today |
| No automatic backup of any kind, ever | **Existential** | Fixed today |
| API domain does not resolve; sync never worked | High | Fixed today |
| Subscription never enforced on any installation, ever | High — revenue | Endpoint shipped today |
| Shared secret in every copy, sent in a URL | High | Fixed today |
| Live data has no schema, constraints or transactions | High | Design work |
| No automated tests anywhere in the desktop tree | High | Ongoing |

Every one of these was invisible from the outside, and none needed a rewrite.
A month spent here returns more than a year spent on WinForms.

---

## If a rewrite does go ahead, two changes

### Write it in C#, not VB.NET

The mandate says VB.NET and forbids C#. I would push back on exactly this point:

- The 172 existing files **are C#**. In C# the domain layer — 48 models, 25
  services, the EF context and migrations — ports directly. In VB.NET every one
  is translated by hand, which is pure cost and pure risk, and translation
  errors in accounting and ledger code are the expensive kind.
- The hiring pool for VB.NET desktop work is a fraction of C#'s, and shrinking.
- Nothing in the requirements needs VB.NET. DevExpress, WinForms, .NET 8,
  offline, sync, updates and DPI are all identical in either language.

Keep WinForms and DevExpress if you want them — DevExpress's grids genuinely
suit a data-heavy office application. The language is the part that only costs.

### Settle the SPA source question first

This is the strongest argument *for* a rewrite, and it was not in the brief:
**the source of the product your customers use is missing.** You cannot fix,
build or audit it. If it is genuinely lost, the product is unmaintainable and
must be rebuilt — that is a real reason, unlike UI fashion.

Before committing, establish whether it exists on another machine or with
whoever built it. The answer changes the decision more than anything else in
this document.

---

## What I recommend instead, in order

1. **Data safety.** Atomic writes ✅, daily snapshots ✅. Next: validate what the
   SPA sends before committing it, and a restore path a non-technical user can
   operate.
2. **Find the SPA source.** Highest-value hour available. It decides everything.
3. **Close the server loop.** Domain ✅ and endpoint ✅ are done, but no installed
   copy benefits until a release ships. That release is the next real decision.
4. **Enforce the subscription.** It has never been enforced. Straight revenue.
5. **Give the data a schema.** Move the JSON documents into SQLite — the EF model
   and its triggers already encode the intended rules. This is the largest
   genuine improvement available and it is independent of any UI work.
6. **Then**, with a healthy base, decide on a native desktop application with
   clear eyes.

---

## What I did without waiting

The items above marked ✅ were not deferred to a decision, because they are
correct under every option and two of them were live data loss:

| Commit | |
|---|---|
| `a5be2d4` | Dead API domain; shared secret removed from the URL |
| `d9d0fdc` | Atomic writes; failed saves reported instead of swallowed |
| `8f4d7a7` | Daily snapshots, seven retained |
| *(web)* | `/api/program/subscription-status` implemented and deployed |

`master` is untouched at `1faef4c`, tagged `baseline-2.0.6`. Nothing has been
released to any customer — that needs your approval, and the mandatory-update
gate makes a careless release worse than no release.

---

## The honest summary

The brief asked how to migrate to WinForms. The more useful answer discovery
produced is that **the office application has been quietly losing the conditions
for its own survival** — unbacked data, unenforced subscriptions, a sync that
has never once connected, and a product whose source nobody can find — and that
none of it would have been fixed by changing the UI framework.

Fix that first. Then choose a UI.
