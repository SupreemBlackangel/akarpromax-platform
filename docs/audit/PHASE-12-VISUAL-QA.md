# PHASE 12 — Visual QA, RTL and touch targets

Date: 2026-09-04. Measured in a browser against the live site, not inferred from
source.

---

## 1. Right-to-left — clean at both widths

| | Desktop 1440×900 | Mobile 375×812 |
|---|---|---|
| `dir` | `rtl` | `rtl` |
| `lang` | `ar` | `ar` |
| Horizontal scroll | **none** | **none** |
| In-flow content past an edge | **0 elements** | **0 elements** |

The classic RTL failure is a page that scrolls sideways because something was
positioned with `left` instead of a logical property. There is none of it.

A first sweep reported 73 overflowing elements at desktop width. They are all
descendants of `aside.public-floating-sidebar`, which is `fixed … start-0` and
parked off-canvas on purpose. The sweep was wrong, not the layout: it excluded
positioned elements but not their children. Corrected by walking the ancestor
chain, the count is zero.

## 2. One real defect, found and fixed

On mobile the news ticker's three controls rendered at their glyph's own size
with nothing around them:

```
.ticker-nav   ‹    3 × 19 px
.ticker-pause Ⅱ    8 × 19 px
.ticker-nav   ›    3 × 19 px
```

WCAG 2.5.8 sets 24×24 as the minimum target and 2.5.5 asks for 44×44. Three
pixels wide cannot be hit by a finger at all.

Fixed in `app/globals.css` with `min-inline-size` / `min-block-size` of 32px and
centring, so the hit area grows and the glyph does not — the ticker looks
exactly as it did. Logical properties, not `padding-left`: this bar mirrors.

Guarded by `tests/rtl-and-touch-targets.test.mjs`.

## 3. What was NOT a defect

Recorded so nobody re-opens them.

* **The 1×1 skip link.** Correct: it is revealed on focus. A touch-target sweep
  that flags it teaches the reader to delete an accessibility feature.
* **Footer links at 29px height.** Below the 44px ideal, above the 24px AA
  minimum, spaced apart in a list. Standard practice.
* **The off-canvas sidebar.** Deliberately parked outside the viewport.

## 4. Dark-theme contrast — measured, and the measurement did not hold up

A per-element contrast sweep in dark theme first reported 31 failures, then 18
after excluding off-screen elements. **Neither number is trustworthy, and no
defect is claimed from them.**

Three reasons the tool was wrong:

1. `oklab()`. The header's background is `oklab(0.237 … / 0.95)`. The parser
   read `rgb`/`rgba` only, walked past it, and computed the text against a
   transparent ancestor — reporting 1.22 for near-white text on a dark header.
2. Translucent overlays. Property badges sit on `--color-overlay`, which is
   `rgba(7,18,38,0.6)` over a photograph. Contrast against a photograph cannot
   be computed from the DOM at all.
3. Off-screen text. The first pass measured the parked sidebar.

What CAN be stated, and is: the token palette's own contrast is verified by
`tests/design-tokens.test.mjs`, which checks text-on-background, text-on-surface
and foreground-on-primary against WCAG AA in **both** themes. Those tests
predate this work and were confirmed still passing.

The live stylesheet was read to confirm the tokens in the browser are the ones
in the file — `--color-primary: #1769ff`, `--color-text-primary: #0b214c`,
`--color-danger: #dc2626`, `--color-success: #16a34a`. They match.

## 5. Not covered

* No screen-reader pass. Structure and landmarks were not audited.
* No keyboard-only navigation pass.
* Text over photographic backgrounds is unverified, for the reason in §4. It
  needs a rendered-pixel sample, not the DOM.
* Only the home page was swept at both widths. Other pages returned 200 and
  were not laid out under measurement.
