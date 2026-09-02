import { test } from "node:test";
import assert from "node:assert/strict";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import VisuallyHidden from "../src/components/ui/VisuallyHidden.tsx";
import SkipLink from "../src/components/ui/SkipLink.tsx";
import FormError from "../src/components/ui/FormError.tsx";
import FormField from "../src/components/ui/FormField.tsx";
// shared/Input and shared/Modal were removed by the design-system refactor
// (f4eda11) and this file still imported them, so the whole suite failed to
// load and every accessibility guarantee in it stopped being checked -- silently
// and for as long as the refactor has been in. FormField and Dialog are their
// replacements and carry the same contracts, so the guarantees move with them
// rather than being deleted along with the old files.
import Dialog from "../src/components/ui/Dialog.tsx";
import AccountDialog from "../src/components/AccountDialog.tsx";
import { clampFocusIndex } from "../src/components/ui/focus-trap.ts";

const r = (node) => renderToStaticMarkup(node);

test("VisuallyHidden renders the sr-only utility class", () => {
  const html = r(createElement(VisuallyHidden, null, "loading"));
  assert.match(html, /class="sr-only"/);
  assert.match(html, /loading/);
});

test("SkipLink points at the main content landmark and is visually hidden until focused", () => {
  const html = r(createElement(SkipLink));
  assert.match(html, /<a href="#main-content"/);
  assert.match(html, /class="skip-link"/);
});

test("FormError renders role=alert with the provided id", () => {
  const html = r(createElement(FormError, { id: "email-error" }, "Invalid email"));
  assert.match(html, /role="alert"/);
  assert.match(html, /id="email-error"/);
  assert.match(html, /class="input-error-text"/);
});

test("FormField wires label, aria-invalid and aria-describedby to the control", () => {
  const control = createElement("input", { type: "email", defaultValue: "" });
  const html = r(createElement(FormField, { label: "Email", error: "Invalid email" }, control));
  assert.match(html, /<label for="[^"]+"[^>]*>Email<\/label>/);
  assert.match(html, /aria-invalid="true"/);
  assert.match(html, /aria-describedby="[^"]+-error"/);
  assert.match(html, /role="alert"/);
  const describedBy = html.match(/aria-describedby="([^"]+)"/)[1];
  assert.ok(html.includes(`id="${describedBy}"`), "describedby target element exists");
});

test("FormField links the hint into aria-describedby and renders the hint", () => {
  const control = createElement("input", { defaultValue: "" });
  const html = r(createElement(FormField, { label: "Phone", hint: "Country code first" }, control));
  assert.match(html, /class="input-hint"/);
  assert.match(html, /aria-describedby="[^"]+-hint"/);
  assert.match(html, /Country code first/);
});

test("a field with an error is marked invalid and the error is announced", () => {
  const html = r(createElement(FormField, { label: "Password", id: "pw", error: "Too short" },
    createElement("input", { type: "password" })));
  assert.match(html, /aria-invalid="true"/);
  assert.match(html, /aria-describedby="[^"]*pw-error/);
  assert.match(html, /id="pw-error"[^>]*role="alert"|role="alert"[^>]*id="pw-error"/);
  assert.match(html, /Too short/);
});

test("a valid field carries no error wiring at all", () => {
  // aria-invalid="false" is not the same as absent: a screen reader should have
  // nothing to say about a field the user has not got wrong.
  const html = r(createElement(FormField, { label: "Email", id: "em" },
    createElement("input", { type: "email" })));
  assert.doesNotMatch(html, /aria-invalid/);
  assert.doesNotMatch(html, /aria-describedby/);
});

test("a closed dialog renders nothing", () => {
  const html = r(createElement(Dialog, { open: false, onClose: () => {} }, "body"));
  assert.equal(html, "");
});

test("an open dialog exposes dialog semantics and an accessible title", () => {
  const html = r(
    createElement(Dialog, { open: true, onClose: () => {}, title: "Settings" }, "body"),
  );
  assert.match(html, /role="dialog"/);
  assert.match(html, /aria-modal="true"/);
  assert.match(html, /aria-labelledby="([^"]+)"/);
  const labelledBy = html.match(/aria-labelledby="([^"]+)"/)[1];
  assert.ok(html.includes(`id="${labelledBy}"`), "title element carries the labelledby id");
  assert.match(html, /Settings/);
});

test("dialog title ids do not collide within a single tree", () => {
  const html = r(
    createElement(
      React.Fragment,
      null,
      createElement(Dialog, { open: true, onClose: () => {}, title: "A" }),
      createElement(Dialog, { open: true, onClose: () => {}, title: "B" }),
    ),
  );
  const ids = [...html.matchAll(/id="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(new Set(ids).size, ids.length);
});

test("AccountDialog exposes an accessible labelled dialog", () => {
  const viewer = {
    authenticated: false,
    email: null,
    displayName: "Guest",
    role: "guest",
    countryCode: null,
    permissions: [],
  };
  const html = r(
    createElement(AccountDialog, {
      locale: "ar",
      open: true,
      viewer,
      onClose: () => {},
      onAuthenticated: () => {},
    }),
  );
  assert.match(html, /role="dialog"/);
  assert.match(html, /aria-modal="true"/);
  assert.match(html, /aria-label="/);
});

test("clampFocusIndex wraps focus both directions and handles edge counts", () => {
  assert.equal(clampFocusIndex(0, 3, false), 1);
  assert.equal(clampFocusIndex(2, 3, false), 0);
  assert.equal(clampFocusIndex(0, 3, true), 2);
  assert.equal(clampFocusIndex(1, 3, true), 0);
  assert.equal(clampFocusIndex(0, 1, false), 0);
  assert.equal(clampFocusIndex(0, 0, false), -1);
});
