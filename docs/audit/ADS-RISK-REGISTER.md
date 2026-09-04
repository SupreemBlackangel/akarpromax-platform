# Ads — what can go wrong, and what to do about it

2026-09-04. Every entry below was measured against the running system, not
imagined. Where something is already fixed it says so and names the commit;
where it is not, it says what would have to be built.

---

## 1. The question that started this: two campaigns, one slot

A campaign targeting **Saudi Arabia** and a campaign targeting **Jeddah only**,
both approved, both active, both on `web_home_hero`, at the same moment, for a
visitor in Jeddah. Which one serves?

Both are eligible. Nothing in the fourteen eligibility gates separates them —
`isGeoMatch` returns ok for both. The decision is made afterwards, in
`selectCampaign`, and its order is:

```
placement specificity  →  priority  →  relevance  →  weighted random
```

Only the third of those knows anything about geography. `isGeoMatch` scores
country 40, region 60, city 75, district 90 — so the narrower campaign is more
relevant. But **relevance is consulted only after priority has been settled,
and priority is a hard tier, not a nudge.**

| Saudi priority | Jeddah priority | Who serves in Jeddah |
|---|---|---|
| 10 | 10 | **Jeddah** — the narrower wins, as expected |
| 10 | 11 | Jeddah in Jeddah; Saudi everywhere else |
| **11** | **10** | **Saudi. The Jeddah campaign never serves, anywhere, ever.** |

The third row is the trap. One point of priority on a country-wide campaign
suppresses a city campaign completely and permanently. The local advertiser
sees a campaign that is approved, active, funded, eligible — and has zero
impressions, with nothing in the product explaining why.

Pinned in `tests/ads-geo-conflict.test.mjs`.

### What was done

`detectCampaignConflicts` flags it — but it was flagging far more than that, and
wrongly. It grouped by placement alone and ignored geography entirely, so:

* A **Cairo** campaign and a **Riyadh** campaign were reported as "Cairo will
  never appear", at severity `blocked`. They never compete for one impression.
* A **Saudi-wide** campaign outranked by a **Jeddah** campaign was reported as
  starved. It is not — it serves everywhere in Saudi Arabia except Jeddah.

With only Saudi Arabia in the location catalogue this was rare. After seeding
22 countries it would have been the common case, and **a panel full of false
alarms teaches an operator to stop reading it** — at which point the real case
hides among them.

Starvation now requires *coverage*: the winner's targeting must be a superset of
the loser's across country, region, city, district, language, device, channel,
page type, section and the date window. Fixed in `2099007`.

### What is still open

**Priority should probably not outrank geographic specificity.** The current
order is defensible — priority is the operator's explicit lever, and an
operator who sets it high presumably means it. But nothing in the admin says
"setting this to 11 will silence every city campaign under it", and the
conflict panel only tells you afterwards.

Two options, and this is a product decision rather than a technical one:

1. **Leave the order, improve the warning.** Show the conflict at the moment
   priority is typed, in the form, not only in the simulator panel.
2. **Move specificity above priority for geography.** A city campaign would
   then always beat a country campaign in its city, and priority would only
   break ties within the same geographic tier. This is what most ad servers
   do. It changes the behaviour of every existing campaign, so it needs a
   deliberate decision and a migration note.

I did not change it, because which campaign should win is a commercial question.

---

## 2. The visitor decided their own location

Your rule: «لا تثق في أي targeting parameters قادمة من Client».

It held for four fields and not for the four that decide geographic billing.
`resolveServerAdContext` derives:

| Field | Source |
|---|---|
| device type | User-Agent — **server** |
| domain | Host header — **server** |
| session | signed cookie — **server** |
| client IP | proxy headers — **server** |
| country | the request body — **client**, labelled `countrySource: "client"` |
| region, city, district | the request body — **client, unchecked** |

Measured, with a campaign targeting only `cities: ["jeddah"]`:

```
countryCode=sa  cityId=jeddah  ->  served and billed
countryCode=eg  cityId=jeddah  ->  served and billed    (not a place)
countryCode=—   cityId=jeddah  ->  served and billed
```

An advertiser paying CPM for Jeddah was billed for an impression from anyone
who typed `jeddah` into a request body, from anywhere.

### What was done — `c24d85f`

The location registry now decides. A city it does not know is dropped; a city
it knows decides its own governorate and country, overriding the body. And the
resolved location is **sealed into the tracking token**, the same mechanism
that already protected placement, section, page type and channel — so the
impression is reported for the place the decision was made in, not whatever
the reporting body says a moment later.

Verified live: sent `countryCode=EG, regionId=EG-C, cityId=jeddah`; the token
came back carrying `co=sa, rg=makkah, ci=jeddah`.

### What is still open, and it is the important half

**This does not solve attribution.** A visitor can still claim to be in a city
they are not in. What is closed is being in a city and a country that do not
contain each other, and being in a city that does not exist.

Closing the rest needs a real geo source, and there are three routes:

1. **MaxMind GeoLite2 read on the server.** A ~70 MB database file, a monthly
   refresh, a lookup on `x-forwarded-for`. No third party on the request path.
   Country-level accuracy is high; city-level is roughly 60–80% and worse on
   mobile networks — which matters, because city targeting is where the money
   is.
2. **nginx GeoIP module.** The reverse proxy sets a header the app trusts.
   Cheapest at request time. **This server's nginx has no GeoIP module
   compiled in**, so it means rebuilding nginx.
3. **Cloudflare in front.** `CF-IPCountry` arrives for free and is trustworthy.
   Changes the deployment topology.

Whichever is chosen, the design should be: **the derived location wins, the
visitor's choice is a filter on top of it, and the impression row records which
one it used.** Then a campaign can be billed on verified geography and reported
on both.

There is a related item: ad city targeting on the website currently depends on
an `ipinfo.io` call **made from the browser**. Ad blockers break it and the
free tier has a quota. When either happens, every city-targeted campaign
silently disappears for that visitor. The desktop office app is better off
here — it uses the office's own declared location.

---

## 3. Nobody could enter a location the matcher would accept

The admin form's own placeholders read `om-muscat, sa-riyadh` and
`om-muscat-governorate`. `AdSlot` sends `cityId: geo.city`, and `geo.city` is a
bare registry code — `JEDDAH`. `isGeoMatch` lowercases both sides and compares
for equality. No prefix stripping, no alias table.

```
cityId=jeddah     ->  the ad is served
cityId=JEDDAH     ->  the ad is served
cityId=sa-jeddah  ->  nothing
```

**A campaign filled in exactly as the form instructed was approved, activated,
and invisible to everyone, forever.**

Fixed in `39bae8b` — the three free-text boxes are now a picker fed by the
registry, so what is stored *is* what the matcher will be handed. Values saved
before it are shown and removable rather than silently kept or silently
dropped.

---

## 4. There was nowhere to target

Migration 0007 says environments own their location catalogue, and nobody ever
filled one in. Measured:

| | Before | After |
|---|---|---|
| Countries selectable | 23 | 23 |
| Countries with any governorate | **1** | 23 |
| Governorates | 13 | 265 |
| Cities | 11 | 436 |

Eight of Saudi Arabia's thirteen governorates held **no cities at all** — Asir,
Qassim, Tabuk, Hail, Jazan, Najran, Baha, Jouf and the Northern Borders. Abha,
Khamis Mushait and Buraidah could not be targeted by any advertiser, in the
country the platform actually serves.

Seeded in `5465b48` and `39bae8b`.

### What is still open

**The catalogue is a skeleton, not a directory.** One to two cities per
governorate. Aleppo has seven entries; it has dozens of towns. Rif Dimashq has
three. No districts exist anywhere outside the six that were already in Saudi
Arabia.

That is fine for country and governorate targeting and thin for city
targeting. Filling it properly is data entry, not engineering: the seeder is
idempotent, has no DELETE and no UPDATE, and can be run again with more rows at
any time. The one rule is the code convention — **bare codes inside Saudi
Arabia** (live campaigns target `jeddah`), **country-prefixed everywhere else**
(Tripoli is in both Lebanon and Libya, and the matcher compares a bare string).

---

## 5. An entire channel had never served an ad

Five `office_*` placements have been selectable and targetable in the admin
since the engine was built. No installed desktop office has ever received one.
Three independent reasons:

1. `DesktopAdService` asks for
   `/api/desktop/ads/placement/desktop_portal_bottom_banner`. That route family
   does not exist — **404 against production** — and neither does that
   placement, anywhere in the registry.
2. It types its ad id as an `int`. Campaign ids are UUIDs. No route could
   satisfy it without inventing a second id space.
3. The shipped SPA renders no ads at all.

Fixed in `c4428d2`, in `public/office-app/bootstrap.js` — the file every
installed app fetches from the platform on each launch, so it took effect with
that deploy, with no reinstall and no new `Setup.exe`.

It uses the same engine and the same tracking contract as the website: one
signed, campaign-bound, single-use token per impression. A desktop client
reporting by campaign id alone would have reopened the `/api/ad-events` hole.

Its targeting is **better than the website's**: the office declared its country,
governorate and city in its profile, in registry codes, so there is no IP guess
and no third-party call on the serving path.

### What is still open

* **There is no office inventory.** All four campaigns in the database are
  `channels: ["website"]`. The channel returns no ad, correctly. Someone has to
  create a campaign for it.
* The dead C# path still fires four 404s an hour per installed office. Harmless
  and cheap, but it needs a new build to remove, and a build means a release.

---

## 6. Anyone could exhaust any campaign's budget

`/api/ad-events` accepted POST with no authentication, no permission, no rate
limit and no signed token, and wrote into the counters that decide budget
exhaustion — while its siblings were already protected. Fixed in `b1daa82`.

`/api/ads/conversion` had the token but no rate limit and no nonce claim, so
one valid token could be replayed without limit, on the event an advertiser is
billed on. Its `value` had no ceiling. Fixed in the same commit.

Verified live: all three answer 400 without a token.

---

## 7. Failures that look like success

The single most expensive property of this system, and the reason "approved ads
do not appear" took so long: **almost every failure produced the same
`200 { ads: [] }`**. A broken query, a schema drift, a wrong identifier format
and a genuinely empty match were indistinguishable from outside.

Three things changed that, and they are worth protecting:

* `/api/ads/match` logs the reason instead of `catch {}`.
* `explainAdMatch` walks the same fourteen gates in the same order and names
  the first refusal.
* `simulateMatch` runs the production engine rather than a second copy of the
  rules, and `tests/ads-simulator-conflicts.test.mjs` pins that they agree.

**The highest-value remaining piece of work in the whole ads system is to put
`explainAdMatch` in front of the moderator at the moment of approval.** A
moderator should read "this campaign targets Jeddah; only visitors known to be
there will see it" *before* clicking approve — not after an advertiser
complains. Everything else in this register is a defect; that one is the
difference between a system that can be operated and one that cannot.

---

## 8. Risks not yet examined

Recorded rather than implied.

* **No load or concurrency testing.** Every timing here is a single request
  against a database holding tens of rows. The 30-second match cache, the nonce
  ledger and the rate limiter have never been tested under contention.
* **The nonce ledger's growth.** Single-use tokens accumulate. There is a
  sweep; its behaviour under real volume is unmeasured.
* **Budget accounting is not transactional across impression and spend.** Two
  simultaneous impressions on a campaign with one impression of budget left
  have not been tested.
* **Creative rotation under frequency caps** is covered by unit tests and has
  never been observed on a real page over a real session.
* **No screen-reader or keyboard-only pass** on any ad surface.
