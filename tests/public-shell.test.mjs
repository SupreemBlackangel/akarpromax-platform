import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { PublicShellLayout } from "../src/components/public/public-shell-layout.tsx";
import { PUBLIC_NAV, SEARCH_ROUTE, isNavPathActive, buildBreadcrumbs } from "../src/config/public-navigation.ts";
import { FOOTER_COLUMNS, FOOTER_SOCIAL } from "../src/config/footer-navigation.ts";

const r = (node) => renderToStaticMarkup(node);

const labels = {
  brandTitle: "AkarPromax",
  brandSubtitle: "Smart real estate",
  brandDescription: "",
  mainNavAria: "Main navigation",
  searchAria: "Search",
  skipToContent: "Skip to main content",
  showMenu: "Open menu",
  closeMenu: "Close menu",
  login: "Login",
  register: "Register",
  logout: "Log out",
  adLabel: "Ad",
  breadcrumbAria: "Breadcrumb",
  navHome: "Home",
  navServices: "Services",
  navCatalog: "Catalog",
  navRequests: "Requests",
  navTools: "Tools",
  navApply: "Become a provider",
  ticker: [],
  tickerAria: "News",
  tickerLabel: "News",
  tickerPause: "Pause",
  tickerPlay: "Play",
  tickerPrev: "Previous news",
  tickerNext: "Next news",
  quickTitle: "Quick links",
  usefulTitle: "Useful",
  footerLegalTitle: "Legal",
  contactTitle: "Contact",
  contactEmail: "info@akarpromax.om",
  contactLocation: "Muscat, Oman",
  footerDescription: "Desc",
  footerRights: "Rights",
  footerTagline: "Tagline",
  cookieTitle: "Cookies",
  cookieDescription: "Cookie description",
  cookieAccept: "Accept",
  cookieReject: "Reject",
  cookieManage: "Manage",
  toastAria: "Notifications",
  officeAppAria: "Office app",
};

const viewer = { authenticated: false, email: null, displayName: "", role: "guest", countryCode: null, permissions: [] };

const noop = () => {};

function renderShell(props = {}) {
  const merged = {
    labels,
    locale: "en",
    country: "om",
    city: "",
    deviceType: "desktop",
    navItems: PUBLIC_NAV,
    currentPath: "/services",
    viewer,
    searchHref: SEARCH_ROUTE,
    onLogin: noop,
    onLogout: noop,
    mobileMenuOpen: false,
    onOpenMenu: noop,
    onCloseMenu: noop,
    cookieNoticeVisible: false,
    onCookieAccept: noop,
    onCookieReject: noop,
    onCookieManage: noop,
    ...props,
  };
  return r(createElement(PublicShellLayout, merged, createElement("div", { className: "page-body" }, "Page content")));
}

test("shell renders skip link targeting #main-content and the target exists", () => {
  const html = renderShell();
  assert.match(html, /href="#main-content"/);
  assert.match(html, /id="main-content"/);
});

test("shell renders exactly the 6 real-route nav links and no broken /properties link", () => {
  const html = renderShell();
  for (const item of PUBLIC_NAV) {
    assert.match(html, new RegExp(`href="${item.href}"`), `nav must link ${item.href}`);
  }
  assert.doesNotMatch(html, /href="\/properties[^a-zA-Z0-9]/, "no broken /properties link");
  assert.doesNotMatch(html, /href="#"/, "no placeholder hash links");
});

test("nav links never include nonexistent routes from the excluded inventory", () => {
  const html = renderShell();
  for (const bad of ["/about", "/contact", "/news", "/search", "/offices", "/providers", "/blog", "/auctions", "/admin"]) {
    assert.doesNotMatch(html, new RegExp(`href="${bad.replace("/", "\\/")}"`), `must not link ${bad} exactly`);
  }
});

test("active route marks aria-current for the current section and its trail", () => {
  const html = renderShell({ currentPath: "/services/catalog" });
  assert.match(html, /aria-current="page"[^>]*href="\/services\/catalog"|href="\/services\/catalog"[^>]*aria-current="page"/);
  assert.match(html, /aria-current="page"[^>]*href="\/services"|href="\/services"[^>]*aria-current="page"/);
  assert.doesNotMatch(html, /aria-current="page"[^>]*href="\/service-requests"|href="\/service-requests"[^>]*aria-current="page"/);
  assert.doesNotMatch(html, /aria-current="page"[^>]*href="\/"|href="\/"[^>]*aria-current="page"/);
});

test("isNavPathActive matches home exactly and section prefixes otherwise", () => {
  assert.equal(isNavPathActive("/", "/"), true);
  assert.equal(isNavPathActive("/", "/services"), false);
  assert.equal(isNavPathActive("/services", "/services"), true);
  assert.equal(isNavPathActive("/services", "/services/catalog"), true);
  assert.equal(isNavPathActive("/services", "/service-requests"), false);
});

test("footer renders only real routes and no social/legal placeholders", () => {
  const html = renderShell();
  for (const column of FOOTER_COLUMNS) {
    for (const link of column.links) {
      assert.match(html, new RegExp(`href="${link.href}"`), `footer must link ${link.href}`);
    }
  }
  assert.equal(FOOTER_SOCIAL.length, 0, "no social config yet");
  assert.doesNotMatch(html, /aria-label="(Facebook|X|Instagram|LinkedIn)"/, "no placeholder social icons");
});

test("header brand links to / and is accessible", () => {
  const html = renderShell();
  assert.match(html, /href="\/"[^>]*aria-label="AkarPromax"/);
});

test("cookie notice is absent when not visible and present when visible", () => {
  const hidden = renderShell({ cookieNoticeVisible: false });
  assert.doesNotMatch(hidden, /aria-label="Cookies"/, "banner must not render when hidden");
  const shown = renderShell({ cookieNoticeVisible: true });
  assert.match(shown, /aria-label="Cookies"/);
  assert.match(shown, />Accept</);
});

test("mobile navigation is not SSR-rendered when closed", () => {
  const html = renderShell();
  assert.doesNotMatch(html, /role="dialog"/, "closed sheet must not render");
  assert.match(html, /aria-label="Open menu"/, "hamburger trigger always present");
});

test("toast live region is present with a polite announcement", () => {
  const html = renderShell();
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /aria-label="Notifications"/);
});

test("ad frames render their placement skeleton in SSR output", () => {
  const html = renderShell();
  assert.match(html, /ad-slot-skeleton/, "public top ad region renders");
});

test("office promotion renders only when provided with an action", () => {
  const without = renderShell();
  assert.doesNotMatch(without, /aria-label="Office app"/);
  const withPromo = renderShell({
    officePromotion: { cta: "Open office", description: "Manage your office", href: "/office" },
  });
  assert.match(withPromo, /aria-label="Office app"/);
  assert.match(withPromo, />Open office</);
  assert.match(withPromo, /href="\/office"/);
});

test("pageHeader renders a single h1 only when provided", () => {
  const without = renderShell();
  assert.doesNotMatch(without, /<h1/, "no h1 from shell by default");
  const withHeader = renderShell({ pageHeader: { title: "Services page", eyebrow: "Explore" } });
  assert.match(withHeader, /<h1[^>]*>Services page<\/h1>/);
});

test("breadcrumbs build from real routes and render the breadcrumb nav", () => {
  const crumbs = buildBreadcrumbs("/services/catalog/abc", labels);
  assert.equal(crumbs[0].href, "/");
  assert.equal(crumbs[1].href, "/services");
  assert.equal(crumbs[2].href, "/services/catalog");
  assert.equal(crumbs[3].current, true);
  const html = renderShell({ currentPath: "/services/catalog/abc", breadcrumbs: crumbs });
  assert.match(html, /aria-label="Breadcrumb"/);
});

test("search trigger is absent until a search route exists", () => {
  const html = renderShell();
  assert.doesNotMatch(html, /aria-label="Search"/, "SEARCH_ROUTE is undefined");
  const withSearch = renderShell({ searchHref: "/search" });
  assert.match(withSearch, /aria-label="Search"/);
});

test("shell renders children verbatim inside main", () => {
  const html = renderShell();
  assert.match(html, /class="page-body">Page content<\/div>/);
});
