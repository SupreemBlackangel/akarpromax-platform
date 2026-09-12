/**
 * The design-token rule, as ESLint config rather than as a code review.
 *
 * docs/brand-identity.md: colours come from `var(--color-*)`, never from
 * Tailwind's raw palette (`bg-gray-100`, `text-red-500`) and never as a hex
 * literal in a className. This rule fails a `className` string or template
 * that carries either. It runs on new code; the files that predate it are
 * listed in eslint-raw-colour-allowlist.json and are expected to shrink —
 * remove a file from the list when you clean it, and the rule holds it there.
 *
 * Both patterns are shared with tests/design-tokens-literals.test.mjs's
 * intent: the test guards CSS, this guards JSX.
 */
const PALETTE = "(?:gray|slate|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)";
// No "/" inside the pattern: esquery ends a regex attribute at the first
// slash. `\b` after the digits already matches before an opacity suffix
// ("border-amber-200/40"), so nothing is lost.
const RAW_TAILWIND = `\\b(?:bg|text|border|from|to|via|ring|fill|stroke|divide|outline|shadow|accent|caret|decoration|placeholder)-${PALETTE}-\\d{2,3}\\b`;
const RAW_HEX = "#[0-9a-fA-F]{3,8}\\b";

const CLASS_ATTR = "JSXAttribute[name.name='className']";

export const noRawColours = [
  {
    selector: `${CLASS_ATTR} Literal[value=/${RAW_TAILWIND}/]`,
    message: "Raw Tailwind palette colour in className — use var(--color-*) (docs/brand-identity.md).",
  },
  {
    selector: `${CLASS_ATTR} TemplateElement[value.raw=/${RAW_TAILWIND}/]`,
    message: "Raw Tailwind palette colour in className — use var(--color-*) (docs/brand-identity.md).",
  },
  {
    selector: `${CLASS_ATTR} Literal[value=/${RAW_HEX}/]`,
    message: "Hex colour in className — colours live in src/styles/tokens.css only.",
  },
  {
    selector: `${CLASS_ATTR} TemplateElement[value.raw=/${RAW_HEX}/]`,
    message: "Hex colour in className — colours live in src/styles/tokens.css only.",
  },
];
