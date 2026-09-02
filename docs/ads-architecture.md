# Ads architecture

How an ad gets from a campaign row to a visitor's screen, and which module owns
which decision. Companion documents: [targeting](./ads-targeting.md),
[campaign delivery](./ads-campaign-delivery.md), [admin](./ads-admin.md).

## The pipeline

```
AdSlot (client)
  └─ requestAdMatch ──────────► src/lib/ad-match-batcher.ts
                                  one POST per render tick, all slots batched
                                       │
                                       ▼
                                app/api/ads/match-batch/route.ts
                                  resolveServerAdContext  (device, host, session)
                                  buildContext            (per slot, index-aligned)
                                       │
                                       ▼
                                lib/ads/engine.ts  matchAdsBatch → matchAds
                                       │
             ┌─────────────────────────┼──────────────────────────┐
             ▼                         ▼                          ▼
   loadActiveAds (30 s)      loadEngineStats (5 s)        signTrackingToken
   campaigns + creatives     daily stats + frequency       lib/ads/events.ts
                                       │
                                       ▼
                       ┌───────────────┴───────────────┐
                       ▼                               ▼
          lib/ads/eligibility.ts             lib/ads/selection.ts
          MAY this campaign serve?           WHICH eligible one serves?
```

## Separation of concerns

The single most important rule in this system: **eligibility never picks a
winner, and selection never re-checks a rule.**

| Module | Owns | Must not |
|---|---|---|
| `lib/ads/eligibility.ts` | The twelve ordered checks that decide whether a campaign *may* serve here | Rank, score, or choose |
| `lib/ads/selection.ts` | Specificity tier → priority tier → weighted rotation | Re-examine targeting |
| `lib/ads/engine.ts` | Loading, caching, creative choice, result shaping | Contain targeting rules inline |
| `lib/ads/server-context.ts` | What the *request* proves: device, host, session | Trust the request body |
| `lib/ads/events.ts` | Recording impressions, clicks, spend; signing tokens | Decide what serves |
| `lib/ads/conflicts.ts` | Reporting configurations that can never serve | Change a campaign |

These were one fused scoring loop. Merging them is what produced the original
bug: an untargeted campaign scored 315, a canonical `HERO` campaign 360 and an
exact page placement 365, and everything within 50 points competed as equals —
so all three tied and one untargeted campaign could take the hero of every page.
Specificity is now a *tier*, not points, so a campaign that named this exact
placement always beats one that named the canonical slot, which always beats one
that named nothing.

Priority had the same defect for the same reason: `priority * 10` sat inside the
banded score, so a priority gap of 5 exactly equalled the band and a gap of 6
excluded a campaign outright. Priority behaved as a cliff and `weight` — the
field that is supposed to divide traffic — almost never mattered. Priority is
now a tier and weight divides traffic within it.

## Per-page independence

There is no global hero. Every page family owns its own placements, generated as
`${family.prefix}_${slot.placementSuffix}` (21 families × 8 canonical slots =
168 placements) in `src/constants/advertising.ts`. A page renders `AdSlot` with
its own placement key, and the batch endpoint keys results **by context index**,
not by placement string — so a page may render the same placement twice (a
desktop rail and its mobile twin) and each occurrence gets its own result.

Adding a page family means adding a registry entry. It requires no engine change.

## Caching

| Cache | TTL | Why |
|---|---|---|
| `loadActiveAds` | 30 s | Campaign rows change rarely; this is the expensive query |
| `loadDailyStats` | 5 s | Budget pacing must react quickly without a query per slot |

There is deliberately **no response cache** on `/api/ads/match-batch`. The heavy
queries are already cached above; caching responses would additionally share
time-limited tracking tokens between users and freeze rotation.

## Known limitations

- The nonce ledger that makes tracking tokens single-use is per-process and
  in-memory (`lib/ads/nonce-ledger.ts`). A restart forgets spent nonces, and
  multiple app instances would each keep their own view.
- There are no foreign keys on any ad table, and no `advertisers` entity —
  `advertiser_name` is free text on the campaign.
- `ad_campaigns` and `ad_creatives` resolve to the `akarpromax` schema while the
  tracking tables resolve to `public`. See
  [campaign delivery](./ads-campaign-delivery.md#schema-shadowing).
