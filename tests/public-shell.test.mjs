import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { PublicShellLayout } from "../src/components/public/public-shell-layout.tsx";
import { PUBLIC_NAV, SEARCH_ROUTE, buildBreadcrumbs, getPublicNav, isNavItemActive, isNavPathActive, shouldUsePublicSidebar } from "../src/config/public-navigation.ts";
import { PERMISSIONS } from "../src/constants/permissions.ts";
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
  navServices: "Services",
  navDirectory: "Directory",
  navOrganizations: "Companies",
  navProviders: "Professionals",
  navFindMyLand: "Find My Land",
  navWorkspace: "Workspace",
  navMyRequests: "My requests",
  navAccount: "Account",
  navNews: "News",
  navTools: "Tools",
  navSectionMain: "Main",
  navSectionDiscover: "Discover",
  navSectionMy: "My AkarProMax",
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
const signedInViewer = { authenticated: true, email: "user@example.com", displayName: "User", role: "viewer", countryCode: "om", permissions: [PERMISSIONS.TOOLS_USE] };
const providerViewer = {
  authenticated: true,
  email: "provider@example.com",
  displayName: "Provider",
  role: "service_provider",
  countryCode: "om",
  permissions: [PERMISSIONS.TOOLS_USE, PERMISSIONS.SERVICE_PROVIDERS_APPLY, PERMISSIONS.SERVICE_OFFERS_MANAGE_OWN],
};

const noop = () => {};

function renderShell(props = {}) {
  const resolvedViewer = props.viewer ?? viewer;
  const merged = {
    labels,
    locale: "en",
    country: "om",
    city: "",
    deviceType: "desktop",
    navItems: props.navItems ?? getPublicNav(resolvedViewer),
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

test("shell renders skip link targeting #main-content and the target exists", () => {
  const html = renderShell();
  assert.match(html, /href="#main-content"/);
  assert.match(html, /id="main-content"/);
});

test("shell renders the real-route nav links and no broken /properties link", () => {
  const html = renderShell();
  for (const item of getPublicNav(viewer)) {
    assert.match(html, new RegExp(`href="${escapeRegExp(item.href)}"`), `nav must link ${item.href}`);
  }
  assert.doesNotMatch(html, /href="\/properties[^a-zA-Z0-9]/, "no broken /properties link");
  assert.doesNotMatch(html, /href="#"/, "no placeholder hash links");
});

test("nav links never include nonexistent routes from the excluded inventory", () => {
  const html = renderShell();
  for (const bad of ["/about", "/contact", "/search", "/offices", "/blog", "/auctions", "/admin"]) {
    assert.doesNotMatch(html, new RegExp(`href="${bad.replace("/", "\\/")}"`), `must not link ${bad} exactly`);
  }
});

test("active route marks aria-current for the current section and its trail", () => {
  const html = renderShell({ currentPath: "/services/catalog" });
  assert.match(html, /aria-current="page"[^>]*href="\/services"|href="\/services"[^>]*aria-current="page"/);
  assert.doesNotMatch(html, /aria-current="page"[^>]*href="\/dashboard\/services\/my-requests"|href="\/dashboard\/services\/my-requests"[^>]*aria-current="page"/);
  assert.doesNotMatch(html, /aria-current="page"[^>]*href="\/"|href="\/"[^>]*aria-current="page"/);
});

test("path helpers keep core sections active without false positives", () => {
  assert.equal(isNavPathActive("/", "/"), true);
  assert.equal(isNavPathActive("/", "/services"), false);
  assert.equal(isNavPathActive("/services", "/services"), true);
  assert.equal(isNavPathActive("/services", "/services/catalog"), true);
  assert.equal(isNavPathActive("/services", "/service-requests"), false);

  const propertiesItem = PUBLIC_NAV.find((item) => item.key === "properties");
  const toolsItem = PUBLIC_NAV.find((item) => item.key === "tools");
  const findMyLandItem = PUBLIC_NAV.find((item) => item.key === "findmyland");
  assert.ok(propertiesItem);
  assert.ok(toolsItem);
  assert.ok(findMyLandItem);
  assert.equal(isNavItemActive(propertiesItem, "/properties/test-slug"), true);
  assert.equal(isNavItemActive(propertiesItem, "/#properties"), true);
  assert.equal(isNavItemActive(findMyLandItem, "/tools?tool=findmyland"), true);
  assert.equal(isNavItemActive(toolsItem, "/tools?tool=findmyland"), false);
  assert.equal(isNavItemActive(toolsItem, "/tools?tool=calculator"), true);
});

test("desktop public sidebar is rendered by default outside dashboard routes", () => {
  const html = renderShell();
  assert.equal(shouldUsePublicSidebar("/services"), true);
  assert.equal(shouldUsePublicSidebar("/dashboard/services"), false);
  assert.match(html, /data-public-sidebar-state="expanded"/);
  assert.match(html, /href="\/organizations"/);
  assert.match(html, /href="\/providers"/);
  assert.match(html, /href="\/tools\?tool=findmyland"/);
});

test("guest and authenticated viewers see only the routes appropriate to them", () => {
  const guestNav = getPublicNav(viewer).map((item) => item.href);
  const userNav = getPublicNav(signedInViewer).map((item) => item.href);
  const providerNav = getPublicNav(providerViewer).map((item) => item.href);

  assert.ok(!guestNav.includes("/dashboard/services"));
  assert.ok(!guestNav.includes("/account/security"));
  assert.ok(userNav.includes("/dashboard/services"));
  assert.ok(userNav.includes("/dashboard/services/my-requests"));
  assert.ok(userNav.includes("/account/security"));
  assert.ok(!userNav.includes("/dashboard/services/provider-profile"));
  assert.ok(providerNav.includes("/dashboard/services/provider-profile"));
  assert.ok(!providerNav.includes("/admin"));
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

test("mobile navigation renders grouped destinations when opened", () => {
  const html = renderShell({ mobileMenuOpen: true, currentPath: "/tools?tool=findmyland", navItems: getPublicNav(providerViewer), viewer: providerViewer });
  assert.match(html, /role="dialog"/);
  assert.match(html, />Main</);
  assert.match(html, />Discover</);
  assert.match(html, />My AkarProMax</);
  assert.match(html, /href="\/tools\?tool=findmyland"/);
  assert.match(html, /href="\/dashboard\/services\/provider-profile"/);
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

test("standard public ad layout renders the managed 8-slot shell and replaces legacy top/bottom ads", () => {
  const html = renderShell({ adLayout: { mode: "standard", family: "services" }, currentPath: "/services" });
  assert.match(html, /data-standard-public-ad-layout="services"/);
  assert.equal((html.match(/standard-public-ad-hero/g) ?? []).length, 1, "one hero slot");
  assert.equal((html.match(/standard-public-ad-bottom/g) ?? []).length, 3, "three bottom slots");
  assert.equal((html.match(/class="public-ad-slot standard-public-ad-rail /g) ?? []).length, 4, "four desktop rail slots");
  assert.equal((html.match(/standard-public-ad-inline/g) ?? []).length, 4, "four responsive inline rail slots");
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
