# Find My Land — AI Rule (non-negotiable)

## The Rule

**AI/LLM must NEVER invent coordinates.**

- The resolver (`lib/land/intelligence/resolver.ts`) is fully deterministic.
  It parses and converts only what is written in the document text.
- `extraction.aiUsed` is **always `false`**. There is no LLM call anywhere in
  the pipeline and no synthetic/generated coordinate output.
- A document with **no coordinates** does NOT get coordinates. It goes down the
  geocoding/parcel path (advisory candidates from address hints) or ends as
  `UNRESOLVED` / `NOT_LAND_DOCUMENT`.

## Why

Invented coordinates are a real hazard: they point a user to the wrong land,
cause boundary disputes, wasted surveyor visits, and legal liability. FindMyLand
must be trustworthy: every number shown on the map either comes from the deed
or is clearly an advisory candidate.

## Enforcement points

| Layer | Enforcement |
|---|---|
| Resolver | Only `toWgs84Point` output on parsed evidence becomes `coordinatePairs`/`center`; never synthesized. |
| Confidence | `locationConfidence` never exceeds what the evidence supports; `UNRESOLVED` when no evidence. |
| UI | "We never invent coordinates — we only read what is written in the deed" hint; `UNRESOLVED`/partial states render without a map pin. |
| Extraction badges | OCR / AI-generated / Geocoded badges shown; `aiUsed` never renders. |
| Tests | Assert `extraction.aiUsed === false` across resolver outcomes. |

## Geocoding is advisory, not generative

`geocodingProvider.searchCandidates` maps extracted country/city/district
strings to candidate points with scores. These are shown as candidates when
explicit coordinates are absent — never silently merged into the resolved
center. The UI only pins the map when a real center exists; otherwise it shows
the "no explicit coordinates found" state.

## What to do when a doc has no coordinates

1. Prefer parcel/plan identifiers (e.g. `planId`, `parcelId`) → present them
   for manual confirmation.
2. Geocode the extracted address hints → candidates with scores.
3. If none of the above, return `UNRESOLVED` with warnings explaining why.

## Contract

`LandLocationResult.extraction.aiUsed` must remain `false` in every branch.
Any future change that could set it `true` (e.g. an optional LLM enrichment
feature) must be opt-in, explicitly labeled in the UI, and never allowed to
synthesize coordinates. A synthetic coordinate is a release-blocking defect.
