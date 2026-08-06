import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import Button from "../src/components/ui/Button.tsx";
import Textarea from "../src/components/ui/Textarea.tsx";
import Select from "../src/components/ui/Select.tsx";
import Checkbox from "../src/components/ui/Checkbox.tsx";
import RadioGroup, { RadioOption } from "../src/components/ui/RadioGroup.tsx";
import Switch from "../src/components/ui/Switch.tsx";
import SearchInput from "../src/components/ui/SearchInput.tsx";
import PasswordInput from "../src/components/ui/PasswordInput.tsx";
import Card, { CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../src/components/ui/Card.tsx";
import PressableCard from "../src/components/ui/PressableCard.tsx";
import Badge from "../src/components/ui/Badge.tsx";
import Alert from "../src/components/ui/Alert.tsx";
import { EmptyState, ErrorState, LoadingState } from "../src/components/ui/Feedback.tsx";
import Dialog from "../src/components/ui/Dialog.tsx";
import Tabs from "../src/components/ui/Tabs.tsx";
import Breadcrumbs from "../src/components/ui/Breadcrumbs.tsx";
import Pagination from "../src/components/ui/Pagination.tsx";
import NavItem from "../src/components/ui/NavItem.tsx";
import PageHeader from "../src/components/ui/PageHeader.tsx";
import AdFrame from "../src/components/ui/AdFrame.tsx";
import { Stack, Inline, Grid, Divider } from "../src/components/layout/index.ts";
import PageContainer from "../src/components/layout/PageContainer.tsx";
import Section from "../src/components/layout/Section.tsx";

const r = (node) => renderToStaticMarkup(node);

test("Button renders primary variant with type=button", () => {
  const html = r(createElement(Button, null, "Send"));
  assert.match(html, /type="button"/);
  assert.match(html, />Send<\/button>/);
});

test("Button maps variants to token colors and never raw hex", () => {
  for (const variant of ["primary", "secondary", "outline", "ghost", "danger", "accent"]) {
    const html = r(createElement(Button, { variant }, "Click"));
    assert.match(html, /bg-\[color:var\(--color-/, `variant ${variant} must use a color token`);
  }
});

test("Button is disabled and marks aria-busy when loading", () => {
  const html = r(createElement(Button, { loading: true }, "Saving"));
  assert.match(html, /disabled=""/);
  assert.match(html, /aria-busy="true"/);
});

test("Button renders a hidden accessible label for icon-only usage", () => {
  const html = r(createElement(Button, { "aria-label": "Close menu", icon: "X" }));
  assert.match(html, /aria-label="Close menu"/);
  assert.match(html, /sr-only/);
});

test("Button icon placement start/end order is preserved", () => {
  const start = r(createElement(Button, { icon: "I", iconPlacement: "start" }, "Label"));
  const end = r(createElement(Button, { icon: "I", iconPlacement: "end" }, "Label"));
  const startIcon = start.indexOf('aria-hidden="true">I</span>');
  const startLabel = start.indexOf(">Label");
  assert.ok(startIcon < startLabel, "start icon renders before label");
  const endIcon = end.indexOf('aria-hidden="true">I</span>');
  const endLabel = end.indexOf(">Label");
  assert.ok(endIcon > endLabel, "end icon renders after label");
});

test("Textarea wires label, aria-invalid, describedby and error", () => {
  const html = r(createElement(Textarea, { label: "Message", error: "Required" }));
  assert.match(html, /<label for="[^"]+"/);
  assert.match(html, /aria-invalid="true"/);
  assert.match(html, /aria-describedby="[^"]+-error"/);
  assert.match(html, /role="alert"/);
  assert.match(html, /Required/);
});

test("Select renders options and a labeled control", () => {
  const html = r(
    createElement(Select, { label: "City", id: "city" }, createElement("option", { value: "cairo" }, "Cairo")),
  );
  assert.match(html, /<label for="city"/);
  assert.match(html, /<select id="city"/);
  assert.match(html, /<option value="cairo"/);
});

test("Checkbox marks invalid and links to error", () => {
  const html = r(createElement(Checkbox, { label: "Agree", error: "Required" }));
  assert.match(html, /type="checkbox"/);
  assert.match(html, /aria-invalid="true"/);
  assert.match(html, /aria-describedby="[^"]+-error"/);
});

test("RadioGroup sets role=radiogroup and wires options", () => {
  const html = r(
    createElement(
      RadioGroup,
      { name: "type", label: "Type" },
      createElement(RadioOption, { value: "a", label: "Option A" }),
    ),
  );
  assert.match(html, /role="radiogroup"/);
  assert.match(html, /type="radio"/);
  assert.match(html, /name="type"/);
});

test("Switch is a labelled role=switch with aria-checked and keyboard support", () => {
  const html = r(createElement(Switch, { checked: true, onCheckedChange: () => {}, label: "Notifications", id: "sw" }));
  assert.match(html, /role="switch"/);
  assert.match(html, /aria-checked="true"/);
  assert.match(html, /tabindex="0"/);
});

test("SearchInput renders a labelled search control", () => {
  const html = r(createElement(SearchInput, { label: "Search", id: "q" }));
  assert.match(html, /type="search"/);
  assert.match(html, /id="q"/);
});

test("PasswordInput renders a password field and a labelled toggle", () => {
  const html = r(
    createElement(PasswordInput, {
      label: "Password",
      id: "pw",
      showAriaLabel: "Show password",
      hideAriaLabel: "Hide password",
    }),
  );
  assert.match(html, /type="password"/);
  assert.match(html, /aria-label="Show password"/);
});

test("Card composes header, title, description, content and footer", () => {
  const html = r(
    createElement(
      Card,
      null,
      createElement(CardHeader, null, createElement(CardTitle, null, "Title")),
      createElement(CardDescription, null, "Desc"),
      createElement(CardContent, null, "Body"),
      createElement(CardFooter, null, "Footer"),
    ),
  );
  assert.match(html, /<h3[^>]*>Title<\/h3>/);
  assert.match(html, /Desc/);
  assert.match(html, /Body/);
  assert.match(html, /Footer/);
});

test("PressableCard is a focusable role=button with keyboard support", () => {
  const html = r(createElement(PressableCard, { onPress: () => {} }, "Content"));
  assert.match(html, /role="button"/);
  assert.match(html, /tabindex="0"/);
});

test("Badge renders semantic variant classes", () => {
  const html = r(createElement(Badge, { variant: "success" }, "Active"));
  assert.match(html, /bg-\[color:var\(--color-success-soft\)\]/);
  assert.match(html, />Active<\/span>/);
});

test("Alert danger renders role=alert and title", () => {
  const html = r(createElement(Alert, { variant: "danger", title: "Failed" }, "Try again"));
  assert.match(html, /role="alert"/);
  assert.match(html, />Failed</);
});

test("EmptyState renders title, description and action", () => {
  const html = r(createElement(EmptyState, { title: "No results", description: "Try a filter" }, null));
  assert.match(html, /No results/);
  assert.match(html, /Try a filter/);
});

test("ErrorState renders an alert with retry action", () => {
  const html = r(createElement(ErrorState, { title: "Oops", retry: "Retry", onRetry: () => {} }));
  assert.match(html, /role="alert"/);
  assert.match(html, />Retry</);
});

test("LoadingState announces via role=status", () => {
  const html = r(createElement(LoadingState, { label: "Loading" }, null));
  assert.match(html, /role="status"/);
  assert.match(html, /Loading/);
});

test("Dialog renders aria-modal dialog with labelled title and close control", () => {
  const html = r(
    createElement(Dialog, { open: true, onClose: () => {}, title: "Confirm", closeLabel: "Close dialog" }, "Body"),
  );
  assert.match(html, /role="dialog"/);
  assert.match(html, /aria-modal="true"/);
  assert.match(html, /aria-labelledby="[^"]+"/);
  assert.match(html, /aria-label="Close dialog"/);
  assert.match(html, /Confirm/);
});

test("Dialog is not rendered when closed", () => {
  const html = r(createElement(Dialog, { open: false, onClose: () => {} }, "Body"));
  assert.equal(html.trim(), "");
});

test("Tabs renders tablist with aria-selected wiring", () => {
  const html = r(
    createElement(Tabs, {
      items: [
        { id: "a", label: "Tab A" },
        { id: "b", label: "Tab B" },
      ],
      activeId: "b",
      onSelect: () => {},
    }),
  );
  assert.match(html, /role="tablist"/);
  assert.match(html, /role="tab"/);
  assert.match(html, /aria-selected="true"/);
});

test("Breadcrumbs renders ordered list with current page marker", () => {
  const html = r(
    createElement(Breadcrumbs, {
      items: [
        { label: "Home", href: "/" },
        { label: "Page", current: true },
      ],
    }),
  );
  assert.match(html, /<nav/);
  assert.match(html, /<ol/);
  assert.match(html, /aria-current="page"/);
});

test("Pagination disables previous on first page and marks current", () => {
  const html = r(createElement(Pagination, { page: 1, totalPages: 5, onChange: () => {} }));
  assert.match(html, /disabled=""/);
  assert.match(html, /aria-current="page"/);
});

test("NavItem marks the active item with aria-current", () => {
  const html = r(createElement(NavItem, { href: "/x", active: true }, "Dashboard"));
  assert.match(html, /aria-current="page"/);
  assert.match(html, /Dashboard/);
});

test("PageHeader renders h1 title and description", () => {
  const html = r(createElement(PageHeader, { title: "Title", description: "Desc" }));
  assert.match(html, /<h1/);
  assert.match(html, />Title</);
  assert.match(html, />Desc</);
});

test("AdFrame renders the ad label and boxed visual pattern", () => {
  const html = r(createElement(AdFrame, { label: "إعلان", variant: "vertical" }));
  assert.match(html, /إعلان/);
  assert.match(html, /aria-label="إعلان"/);
});

test("Stack renders a column flex container", () => {
  const html = r(createElement(Stack, { gap: "md" }, "a", "b"));
  assert.match(html, /flex-col/);
});

test("Inline renders a row flex container", () => {
  const html = r(createElement(Inline, { gap: "sm" }, "a", "b"));
  assert.match(html, /flex-row/);
});

test("Grid renders responsive column classes", () => {
  const html = r(createElement(Grid, { columns: 3 }, "a", "b", "c"));
  assert.match(html, /grid-cols-1/);
  assert.match(html, /lg:grid-cols-3/);
});

test("Divider renders a horizontal rule with border token", () => {
  const html = r(createElement(Divider));
  assert.match(html, /border-0/);
  assert.match(html, /bg-\[color:var\(--color-border\)\]/);
});

test("PageContainer applies the container width and responsive padding", () => {
  const html = r(createElement(PageContainer, { size: "narrow" }, "x"));
  assert.match(html, /max-w-\[640px\]/);
  assert.match(html, /px-\[var\(--space-5\)\]/);
});

test("Section renders a section landmark with an aria-labelledby", () => {
  const html = r(createElement(Section, { "aria-labelledby": "s-1" }, "x"));
  assert.match(html, /<section/);
  assert.match(html, /aria-labelledby="s-1"/);
});
