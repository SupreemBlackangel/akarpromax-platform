import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { PublicShellLayout } from "../src/components/public/public-shell-layout.tsx";
import { PUBLIC_NAV, PUBLIC_NAV_CONSTITUTION_IDS, SEARCH_ROUTE, buildBreadcrumbs, getPublicNav, isNavItemActive, isNavPathActive, shouldUsePublicSidebar } from "../src/config/public-navigation.ts";
import { FOOTER_COLUMNS, FOOTER_SOCIAL } from "../src/config/footer-navigation.ts";

const r = (node) => renderToStaticMarkup(node);
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

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
  navProperties: "Properties",
  navEngineeringTools: "Engineering Tools",
  navServices: "Services Market",
  navDirectory: "Directory",
  navOrganizations: "Companies",
  navProviders: "Professionals",
  navRealEstateCompanies: "Real Estate Companies & Offices",
  navOtherCompanies: "Other Companies",
  navCommunity: "Construction & Real Estate Forum",
  navKnowledge: "Books & Software",
  navAdvertise: "Advertise with Us",
  navAbout: "About Us",
  navContact: "Contact Us",
  navFindMyLand: "Find My Land",
  navWorkspace: "Workspace",
  navMyRequests: "My requests",
  navAccount: "Account",
  navNews: "News",
  navTools: "Tools",
  navCatalog: "Catalog",
  navRequests: "Requests",
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
  contactEmail: "info@akarpromax.com",
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
  const resolvedViewer = props.viewer ?? viewer;
  const merged = {
    labels,
    locale: "en",
    country: "om",
    city: "",
    deviceType: "desktop",
    navItems: props.navItems ?? getPublicNav(),
    currentPath: "/services",
    viewer: resolvedViewer,
    searchHref: SEARCH_ROUTE,
    onLogin: noop,
    onLogout: noop,
    mobileMenuOpen: false,
    onOpenMenu: noop,
    onCloseMenu: noop,
    adLayout: undefined,
    cookieNoticeVisible: false,
    onCookieAccept: noop,
    onCookieReject: noop,
    onCookieManage: noop,
    ...props,
  };
  return r(createElement(PublicShellLayout, merged, createElement("div", { className: "page-body" }, "Page content")));
}

test("public navigation constitution keeps the exact 11 primary items in order", () => {
  assert.equal(PUBLIC_NAV.length, 11);
  assert.deepEqual(PUBLIC_NAV.map((item) => item.key), PUBLIC_NAV_CONSTITUTION_IDS);
});

test("shell renders skip link targeting #main-content and the target exists", () => {
  const html = renderShell();
  assert.match(html, /href="#main-content"/);
  assert.match(html, /id="main-content"/);
});

test("shell renders the real-route nav links and no broken /properties link", () => {
  const html = renderShell();
  for (const item of getPublicNav()) {
    assert.match(html, new RegExp(`href="${escapeRegExp(item.href)}"`), `nav must link ${item.href}`);
  }
  assert.doesNotMatch(html, /href="#"/, "no placeholder hash links");
});

test("primary nav excludes internal architecture routes from the main product map", () => {
  const html = renderShell();
  for (const bad of ["/directory", "/providers", "/organizations", "/news", "/legal", "/dashboard/services", "/admin", "/blog", "/auctions"]) {
    assert.doesNotMatch(html, new RegExp(`href="${bad.replace("/", "\\/")}"`), `must not link ${bad} exactly`);
  }
});

test("active route marks aria-current for the current section and its trail", () => {
  const html = renderShell({ currentPath: "/services/catalog" });
  assert.match(html, /aria-current="page"[^>]*href="\/services"|href="\/services"[^>]*aria-current="page"/);
  assert.doesNotMatch(html, /aria-current="page"[^>]*href="\/"|href="\/"[^>]*aria-current="page"/);
});

test("path helpers keep core sections active without false positives", () => {
  assert.equal(isNavPathActive("/", "/"), true);
  assert.equal(isNavPathActive("/", "/services"), false);
  assert.equal(isNavPathActive("/services", "/services"), true);
  assert.equal(isNavPathActive("/services", "/services/catalog"), true);
  assert.equal(isNavPathActive("/services", "/service-requests"), false);

  const propertiesItem = PUBLIC_NAV.find((item) => item.key === "properties");
  const toolsItem = PUBLIC_NAV.find((item) => item.key === "engineering-tools");
  const servicesItem = PUBLIC_NAV.find((item) => item.key === "services-market");
  const officesItem = PUBLIC_NAV.find((item) => item.key === "real-estate-companies");
  const companiesItem = PUBLIC_NAV.find((item) => item.key === "other-companies");
  assert.ok(propertiesItem && toolsItem && servicesItem && officesItem && companiesItem);
  assert.equal(isNavItemActive(propertiesItem, "/properties/test-slug"), true);
  assert.equal(isNavItemActive(toolsItem, "/tools?tool=findmyland"), true);
  assert.equal(isNavItemActive(servicesItem, "/service-requests/abc"), true);
  assert.equal(isNavItemActive(servicesItem, "/providers/abc"), true);
  assert.equal(isNavItemActive(officesItem, "/offices/abc"), true);
  assert.equal(isNavItemActive(companiesItem, "/companies/abc"), true);
});

test("desktop public sidebar is rendered by default outside dashboard routes", () => {
  const html = renderShell();
  assert.equal(shouldUsePublicSidebar("/services"), true);
  assert.equal(shouldUsePublicSidebar("/dashboard/services"), false);
  assert.match(html, /data-public-sidebar-state="expanded"/);
  assert.match(html, /href="\/offices"/);
  assert.match(html, /href="\/companies"/);
  assert.match(html, /href="\/community"/);
  assert.match(html, /href="\/knowledge"/);
  assert.match(html, /href="\/advertise"/);
  assert.match(html, /href="\/about"/);
  assert.match(html, /href="\/contact"/);
});

test("the main public menu remains identical regardless of auth state", () => {
  assert.deepEqual(getPublicNav().map((item) => item.href), [
    "/",
    "/properties",
    "/tools",
    "/services",
    "/offices",
    "/companies",
    "/community",
    "/knowledge",
    "/advertise",
    "/about",
    "/contact",
  ]);
});

test("every visible public navigation item has a meaningful icon", () => {
  for (const entry of PUBLIC_NAV) {
    assert.ok(entry.icon, `missing icon for ${entry.key}`);
  }
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

test("mobile navigation renders the same 11-item public product map", () => {
  const html = renderShell({ mobileMenuOpen: true, currentPath: "/tools?tool=findmyland" });
  assert.match(html, /role="dialog"/);
  for (const href of ["/", "/properties", "/tools", "/services", "/offices", "/companies", "/community", "/knowledge", "/advertise", "/about", "/contact"]) {
    assert.match(html, new RegExp(`href="${escapeRegExp(href)}"`));
  }
});

test("toast live region is present with a polite announcement", () => {
  const html = renderShell();
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /aria-label="Notifications"/);
});

// AdSlotFrame (src/components/ads/ad-slot-frame.tsx) is loaded via
// next/dynamic(..., { ssr: false }), so its markup — including
// `ad-slot-skeleton` and the `standard-public-ad-*` class names it applies —
// never appears in server-rendered HTML, only after client hydration. These
// tests check the structural containers StandardPublicAdLayout itself
// renders server-side instead of the ad-slot internals it can't SSR.
test("ad layout container mounts with the requested family in SSR output", () => {
  const html = renderShell({ adLayout: { mode: "standard", family: "home" } });
  assert.match(html, /data-standard-public-ad-layout="home"/, "public ad layout container renders");
});

test("standard public ad layout renders the managed 8-slot container structure and replaces legacy top/bottom ads", () => {
  const html = renderShell({ adLayout: { mode: "standard", family: "services" }, currentPath: "/services" });
  assert.match(html, /data-standard-public-ad-layout="services"/);
  assert.equal((html.match(/public-ad-layout-container pt-\[var\(--space-6\)\]/g) ?? []).length, 1, "one hero container (heroEnabled)");
  assert.equal((html.match(/standard-public-ad-rail hidden xl:flex/g) ?? []).length, 2, "two desktop rail columns (left + right)");
  assert.match(html, /standard-public-ad-grid/, "desktop rail grid renders");
  assert.match(html, /xl:hidden pb-\[var\(--space-6\)\]/, "responsive inline rail container renders");
});

test("safe-no-ads suppresses inherited shell advertising on sensitive pages", () => {
  const html = renderShell({ adLayout: { mode: "safe-no-ads" }, currentPath: "/service-requests/new" });
  assert.doesNotMatch(html, /ad-slot-skeleton/);
  assert.doesNotMatch(html, /data-standard-public-ad-layout=/);
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
  const crumbs = buildBreadcrumbs("/offices/abc", labels);
  assert.equal(crumbs[0].href, "/");
  assert.equal(crumbs[1].href, "/offices");
  assert.equal(crumbs[2].current, true);
  const html = renderShell({ currentPath: "/offices/abc", breadcrumbs: crumbs });
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
