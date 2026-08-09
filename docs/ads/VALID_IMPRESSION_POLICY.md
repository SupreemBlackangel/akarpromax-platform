# Valid Impression Policy

A **decision** (a matched ad in an API response) is not a render, and a render
is not a valid impression. Impressions are recorded only after the ad is
actually visible to the user.

## Pipeline

1. **Decision** — `/api/ads/match` returns matched ads (may be rotated client-side).
2. **Render** — `src/components/AdSlot.tsx` renders the ad frame.
3. **Valid impression** — the client observes real visibility, then posts to
   `/api/ads/impression` (or `/api/office/v1/ads` on the Office channel) with a
   signed tracking token. The server verifies the token and records the row in
   `ad_impressions`.

## Visibility rules (client)

`src/components/AdSlot.tsx`:

- `IntersectionObserver` with threshold `>= 0.5` plus a 1-second debounce before
  an impression is reported.
- The tab must be visible: `document.visibilityState === "visible"` is checked
  at fire time.
- Per-ad dedup: each matched ad records at most one impression per slot render
  (`impressedRef`), so rotation and re-observations cannot double count.
- Hidden tab pauses rotation entirely; no impression is sent while hidden.
- `prefers-reduced-motion` disables rotation (the first ad is shown statically).
- Hover pauses rotation (no new impression from that ad).
- A `sessionId` (`akar-ad-session` in session storage) is attached so per-session
  frequency caps can be enforced server-side.

## Click policy

Clicks are recorded via `/api/ads/click`. The tracking token is verified; the
server returns the destination and the client redirects. A click is only valid
after the user actually interacts with a rendered ad.

## Server-side validity

`verifyTrackingToken` (`lib/ads/events.ts`) validates signature and expiry and
binds the event to the exact campaign (`cid`), placement, channel and inventory
class that were served. Events for unknown/expired tokens are rejected.
