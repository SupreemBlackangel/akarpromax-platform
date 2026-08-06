import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const css = readFileSync(new URL("../src/styles/tokens.css", import.meta.url), "utf8");

function extractBlock(source, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(?:^|\\n)\\s*${escaped}\\s*\\{`);
  const match = pattern.exec(source);
  assert.ok(match, `selector ${selector} must exist in tokens.css`);
  const open = match.index + match[0].indexOf("{");
  const close = source.indexOf("}", open);
  return source.slice(open + 1, close);
}

function parseVars(block) {
  const vars = {};
  for (const match of block.matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/g)) {
    vars[match[1]] = match[2].trim();
  }
  return vars;
}

const rootVars = parseVars(extractBlock(css, ":root"));
const darkVars = parseVars(extractBlock(css, '[data-theme="dark"]'));

function hexToRgb(hex) {
  const value = hex.replace("#", "");
  const full = value.length === 3 ? value.split("").map((c) => c + c).join("") : value;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(hexA, hexB) {
  const [lighter, darker] = [luminance(hexA), luminance(hexB)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

test("tokens.css defines the core semantic color token set", () => {
  for (const name of [
    "color-background",
    "color-surface",
    "color-surface-muted",
    "color-surface-input",
    "color-text-primary",
    "color-text-secondary",
    "color-text-muted",
    "color-border",
    "color-border-strong",
    "color-border-focus",
    "color-primary",
    "color-primary-hover",
    "color-primary-foreground",
    "color-secondary",
    "color-secondary-foreground",
    "color-accent",
    "color-danger",
    "color-success",
    "color-warning",
    "color-info",
    "color-overlay",
  ]) {
    assert.ok(rootVars[name], `missing :root token --${name}`);
  }
});

test("tokens.css defines spacing, radius, shadow, typography, motion and layer scales", () => {
  for (const group of [
    ["space-0", "space-1", "space-2", "space-3", "space-4", "space-5", "space-6", "space-8", "space-10", "space-12", "space-16", "space-20", "space-24"],
    ["radius-none", "radius-sm", "radius-md", "radius-lg", "radius-xl", "radius-2xl", "radius-pill"],
    ["shadow-sm", "shadow-md", "shadow-lg", "shadow-overlay", "shadow-focus"],
    ["font-size-xs", "font-size-sm", "font-size-md", "font-size-lg", "font-size-xl", "font-size-2xl"],
    ["font-weight-regular", "font-weight-medium", "font-weight-semibold", "font-weight-bold"],
    ["motion-fast", "motion-normal", "motion-slow"],
    ["layer-base", "layer-sticky", "layer-dropdown", "layer-overlay", "layer-dialog", "layer-toast", "layer-tooltip"],
  ]) {
    for (const name of group) {
      assert.ok(rootVars[name], `missing :root token --${name}`);
    }
  }
});

test("dark theme overrides the full color surface and text set", () => {
  for (const name of [
    "color-background",
    "color-surface",
    "color-surface-muted",
    "color-surface-input",
    "color-text-primary",
    "color-text-secondary",
    "color-text-muted",
    "color-border",
    "color-primary",
    "color-primary-hover",
  ]) {
    assert.ok(darkVars[name], `missing dark token --${name}`);
    assert.notEqual(darkVars[name], rootVars[name], `dark ${name} should differ from light`);
  }
});

test("light theme text on surface passes WCAG AA", () => {
  const pairs = [
    [rootVars["color-text-primary"], rootVars["color-background"]],
    [rootVars["color-text-secondary"], rootVars["color-surface"]],
    [rootVars["color-text-primary"], rootVars["color-surface"]],
    [rootVars["color-primary-foreground"], rootVars["color-primary"]],
  ];
  for (const [fg, bg] of pairs) {
    assert.ok(contrastRatio(fg, bg) >= 4.5, `contrast ${fg} on ${bg} must be >= 4.5`);
  }
});

test("dark theme text on surface passes WCAG AA", () => {
  const pairs = [
    [darkVars["color-text-primary"], darkVars["color-background"]],
    [darkVars["color-text-primary"], darkVars["color-surface"]],
    [darkVars["color-text-secondary"], darkVars["color-surface"]],
  ];
  for (const [fg, bg] of pairs) {
    assert.ok(contrastRatio(fg, bg) >= 4.5, `contrast ${fg} on ${bg} must be >= 4.5`);
  }
});

test("reduced-motion block neutralizes motion tokens", () => {
  const match = css.match(/@media \(prefers-reduced-motion: reduce\)\s*\{\s*:root\s*\{([^}]*)\}/);
  assert.ok(match, "reduced-motion block exists");
  assert.match(match[1], /--motion-fast:\s*0\.01ms/);
  assert.match(match[1], /--motion-normal:\s*0\.01ms/);
  assert.match(match[1], /--motion-slow:\s*0\.01ms/);
});

test("z-index values are only expressed via layer tokens in new primitives", () => {
  const found = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && entry.name.endsWith(".tsx")) found.push(full);
    }
  };
  for (const sub of ["ui", "layout"]) {
    walk(join(process.cwd(), "src", "components", sub));
  }
  for (const file of found) {
    const source = readFileSync(file, "utf8");
    for (const line of source.split("\n")) {
      const trimmed = line.trim();
      if (trimmed.startsWith("//") || trimmed.startsWith("*")) continue;
      assert.ok(
        !/\bz-\d+/.test(trimmed),
        `raw z-index utility in ${file}: ${trimmed}`,
      );
    }
  }
});
