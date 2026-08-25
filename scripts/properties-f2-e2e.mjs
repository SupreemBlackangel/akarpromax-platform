import fs from "node:fs";
import crypto from "node:crypto";
import postgres from "postgres";
import bcrypt from "bcryptjs";

function loadEnvFile(path) {
  if (!fs.existsSync(path)) return;
  for (const raw of fs.readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;

    const i = line.indexOf("=");
    if (i < 1) continue;

    const key = line.slice(0, i).trim();
    let value = line.slice(i + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(".env");
loadEnvFile(".env.production");
loadEnvFile(".env.local");
loadEnvFile(".env.production.local");

const DATABASE_URL = process.env.DATABASE_URL;
const BASE = process.env.PROPERTIES_E2E_BASE || "http://localhost:3013";

if (!DATABASE_URL) {
  console.error("PROPERTIES E2E: FAIL - DATABASE_URL missing");
  process.exit(2);
}

const localDb = /localhost|127\.0\.0\.1/i.test(DATABASE_URL);

const sql = postgres(DATABASE_URL, {
  max: 1,
  prepare: false,
  ssl: localDb ? false : "require",
});

const stamp = `${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;

const ownerEmail = `props.owner.${stamp}@example.invalid`;
const attackerEmail = `props.attacker.${stamp}@example.invalid`;
const adminEmail = `props.admin.${stamp}@example.invalid`;

const password = `Akar!${crypto.randomBytes(8).toString("hex")}`;

let ownerId;
let attackerId;
let adminId;
let propertyId;
let requestId;
let savedSearchId;

const passes = [];

function pass(condition, name, detail = "") {
  if (!condition) {
    throw new Error(`${name}${detail ? ` :: ${detail}` : ""}`);
  }

  passes.push(name);
  console.log(`PASS  ${name}`);
}

async function api(path, options = {}) {
  const headers = {
    Accept: "application/json",
    Origin: BASE,
    ...(options.headers || {}),
  };

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (options.cookie) {
    headers.Cookie = options.cookie;
  }

  const response = await fetch(`${BASE}${path}`, {
    method: options.method || "GET",
    headers,
    body:
      options.body === undefined
        ? undefined
        : JSON.stringify(options.body),
    redirect: "manual",
  });

  const text = await response.text();

  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {}

  return {
    status: response.status,
    response,
    json,
    text,
  };
}

function getCookie(response) {
  const values =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : [response.headers.get("set-cookie")].filter(Boolean);

  const hit = values.find((v) => v.startsWith("akar_session="));

  return hit ? hit.split(";", 1)[0] : null;
}

async function createUser(email, role) {
  const hash = await bcrypt.hash(password, 12);

  const rows = await sql`
    insert into users
    (
      email,
      email_verified_at,
      name,
      password_hash,
      role,
      status,
      is_active,
      preferred_language,
      created_at
    )
    values
    (
      ${email},
      now(),
      ${`E2E ${role}`},
      ${hash},
      ${role},
      'active',
      true,
      'ar',
      now()
    )
    returning id
  `;

  return rows[0].id;
}

async function login(email) {
  const r = await api("/api/auth/login", {
    method: "POST",
    body: {
      identifier: email,
      password,
    },
  });

  pass(r.status === 200, `LOGIN ${email}`, `HTTP ${r.status} ${r.text}`);

  const cookie = getCookie(r.response);

  pass(Boolean(cookie), `SESSION COOKIE ${email}`);

  return cookie;
}

async function cleanup() {
  console.log("");
  console.log("CLEANUP...");

  try {
    if (requestId) {
      await sql`
        delete from property_request_offers
        where request_id = ${requestId}
      `;

      await sql`
        delete from property_requests
        where id = ${requestId}
      `;
    }
  } catch {}

  try {
    if (savedSearchId) {
      await sql`
        delete from saved_searches
        where id = ${savedSearchId}
      `;
    }
  } catch {}

  try {
    if (propertyId) {
      await sql`
        delete from property_favorites
        where property_id = ${propertyId}
      `;

      await sql`
        delete from property_views
        where property_id = ${propertyId}
      `;

      await sql`
        delete from property_offers
        where property_id = ${propertyId}
      `;

      await sql`
        delete from property_media
        where property_id = ${propertyId}
      `;

      await sql`
        delete from properties
        where id = ${propertyId}
      `;
    }
  } catch {}

  for (const id of [ownerId, attackerId, adminId].filter(Boolean)) {
    try {
      await sql`
        delete from session_revocations
        where user_id = ${id}
      `;
    } catch {}

    try {
      await sql`
        delete from users
        where id = ${id}
      `;
    } catch {}
  }

  console.log("CLEANUP: DONE");
}

try {
  console.log("");
  console.log("======================================");
  console.log("AKARPROMAX PROPERTIES F2 E2E");
  console.log("======================================");

  ownerId = await createUser(ownerEmail, "user");
  attackerId = await createUser(attackerEmail, "user");
  adminId = await createUser(adminEmail, "super_admin");

  pass(Boolean(ownerId && attackerId && adminId), "TEST USERS CREATED");

  const ownerCookie = await login(ownerEmail);
  const attackerCookie = await login(attackerEmail);
  const adminCookie = await login(adminEmail);

  // ------------------------------------------------------
  // CANONICAL OFFER TYPES
  // ------------------------------------------------------

  let r = await api("/api/offer-types");

  pass(
    r.status === 200 && r.json?.success === true,
    "OFFER TYPES API"
  );

  const offerTypes = r.json?.data || [];

  pass(
    offerTypes.length === 11,
    "CANONICAL OFFER TYPES 11/11",
    `count=${offerTypes.length}`
  );

  const saleType = offerTypes.find((x) => x.code === "SALE");

  pass(Boolean(saleType?.id), "SALE OFFER TYPE");

  // ------------------------------------------------------
  // INVALID OFFER POLICY
  // ------------------------------------------------------

  r = await api("/api/properties", {
    method: "POST",
    cookie: ownerCookie,
    body: {
      titleAr: `عقار اختبار غير صالح ${stamp}`,
      descriptionAr:
        "وصف اختبار طويل بما يكفي للتحقق من رفض سياسة العرض غير الصحيحة.",
      dealType: "sale",
      category: "residential",
      propertyType: "apartment",
      country: "SA",
      governorate: "Makkah",
      city: "Jeddah",
      price: 800000,
      area: 120,
      offers: [
        {
          offerTypeId: saleType.id,
          marketingMethod: "direct",
          auctionType: "fixed",
          price: 800000,
          currency: "SAR",
          isActive: true,
        },
      ],
    },
  });

  pass(r.status === 400, "INVALID OFFER POLICY REJECTED");

  // ------------------------------------------------------
  // CREATE DRAFT
  // ------------------------------------------------------

  const uniqueTitle = `شقة اختبار عقار بروماكس ${stamp}`;

  r = await api("/api/properties", {
    method: "POST",
    cookie: ownerCookie,
    body: {
      titleAr: uniqueTitle,
      titleEn: `AkarProMax E2E ${stamp}`,
      descriptionAr:
        "هذا عقار اختبار آلي كامل للتحقق من دورة العقارات من المسودة حتى النشر والبحث.",
      descriptionEn:
        "Automated property lifecycle verification record.",
      dealType: "sale",
      category: "residential",
      propertyType: "apartment",
      country: "SA",
      governorate: "Makkah",
      city: "Jeddah",
      district: "Al Rawdah",
      latitude: null,
      longitude: null,
      address: "Jeddah E2E Test",
      price: 750000,
      currency: "SAR",
      area: 125,
      bedrooms: 3,
      bathrooms: 2,
      media: [
        {
          url: "https://example.com/akarpromax-e2e-1.jpg",
          type: "image",
          altText: "AkarProMax E2E",
        },
      ],
      offers: [
        {
          offerTypeId: saleType.id,
          marketingMethod: "direct",
          price: 750000,
          currency: "SAR",
          negotiable: true,
          isActive: true,
        },
      ],
    },
  });

  pass(
    r.status === 200 && r.json?.success === true,
    "CREATE PROPERTY",
    `HTTP ${r.status} ${r.text}`
  );

  propertyId = r.json?.data?.id;

  pass(Boolean(propertyId), "PROPERTY UUID CREATED");

  pass(
    r.json?.data?.status === "draft",
    "PROPERTY STATUS DRAFT",
    `status=${r.json?.data?.status}`
  );

  // ------------------------------------------------------
  // DRAFT NOT PUBLIC
  // ------------------------------------------------------

  r = await api(`/api/properties/${propertyId}`);

  pass(r.status === 403, "DRAFT DETAIL PRIVATE");

  r = await api(
    `/api/properties?search=${encodeURIComponent(uniqueTitle)}`
  );

  pass(
    r.status === 200 &&
      !(r.json?.data || []).some((x) => x.id === propertyId),
    "DRAFT ABSENT FROM PUBLIC LIST"
  );

  // ------------------------------------------------------
  // OWNER CAN VIEW DRAFT
  // ------------------------------------------------------

  r = await api(`/api/properties/${propertyId}`, {
    cookie: ownerCookie,
  });

  pass(
    r.status === 200 &&
      r.json?.data?.id === propertyId,
    "OWNER VIEWS DRAFT"
  );

  pass(
    Array.isArray(r.json?.data?.offers) &&
      r.json.data.offers.length === 1,
    "PROPERTY OFFER PERSISTED"
  );

  // ------------------------------------------------------
  // ATTACKER CANNOT MODIFY / DELETE / SUBMIT
  // ------------------------------------------------------

  r = await api(`/api/properties/${propertyId}`, {
    method: "PATCH",
    cookie: attackerCookie,
    body: {
      titleAr: "محاولة اختراق تعديل العقار",
    },
  });

  pass(r.status === 403, "OWNERSHIP PATCH BLOCKED");

  r = await api(`/api/properties/${propertyId}`, {
    method: "DELETE",
    cookie: attackerCookie,
  });

  pass(r.status === 403, "OWNERSHIP DELETE BLOCKED");

  r = await api(`/api/properties/${propertyId}/submit`, {
    method: "POST",
    cookie: attackerCookie,
  });

  pass(r.status === 403, "OWNERSHIP SUBMIT BLOCKED");

  // ------------------------------------------------------
  // OWNER EDIT
  // ------------------------------------------------------

  const editedTitle = `${uniqueTitle} معدل`;

  r = await api(`/api/properties/${propertyId}`, {
    method: "PATCH",
    cookie: ownerCookie,
    body: {
      titleAr: editedTitle,
      latitude: 21.543333,
      longitude: 39.172779,
      price: 765000,
      media: [
        {
          url: "https://example.com/akarpromax-e2e-updated.jpg",
          type: "image",
          altText: "Updated E2E image",
        },
      ],
      offers: [
        {
          offerTypeId: saleType.id,
          marketingMethod: "direct",
          price: 765000,
          currency: "SAR",
          negotiable: false,
          isActive: true,
        },
      ],
    },
  });

  pass(
    r.status === 200 && r.json?.success === true,
    "EDIT PROPERTY",
    `HTTP ${r.status} ${r.text}`
  );

  r = await api(`/api/properties/${propertyId}`, {
    cookie: ownerCookie,
  });

  pass(r.json?.data?.titleAr === editedTitle, "EDIT TITLE PERSISTED");

  pass(
    String(r.json?.data?.latitude).startsWith("21.543"),
    "GEO LOCATION PERSISTED"
  );

  pass(
    r.json?.data?.media?.length === 1 &&
      r.json.data.media[0].url.includes("updated"),
    "MEDIA UPDATE PERSISTED"
  );

  // ------------------------------------------------------
  // SUBMIT FOR REVIEW
  // ------------------------------------------------------

  r = await api(`/api/properties/${propertyId}/submit`, {
    method: "POST",
    cookie: ownerCookie,
  });

  pass(
    r.status === 200 &&
      r.json?.data?.status === "pending_review",
    "SUBMIT FOR REVIEW",
    `HTTP ${r.status} ${r.text}`
  );

  r = await api(`/api/properties/${propertyId}/submit`, {
    method: "POST",
    cookie: ownerCookie,
  });

  pass(r.status === 409, "DOUBLE SUBMIT BLOCKED");

  // ------------------------------------------------------
  // PENDING PROPERTY CANNOT BE EDITED
  // ------------------------------------------------------

  r = await api(`/api/properties/${propertyId}`, {
    method: "PATCH",
    cookie: ownerCookie,
    body: {
      titleAr: `${editedTitle} محاولة`,
    },
  });

  pass(r.status === 409, "EDIT WHILE PENDING BLOCKED");

  r = await api(`/api/properties/${propertyId}`);

  pass(r.status === 403, "PENDING PROPERTY NOT PUBLIC");

  // ------------------------------------------------------
  // OWNER CANNOT ADMIN-APPROVE
  // ------------------------------------------------------

  r = await api(`/api/admin/properties/${propertyId}/review`, {
    method: "POST",
    cookie: ownerCookie,
    body: {
      action: "approve",
    },
  });

  pass(r.status === 403, "OWNER SELF APPROVAL BLOCKED");

  // ------------------------------------------------------
  // ADMIN APPROVES
  // ------------------------------------------------------

  r = await api(`/api/admin/properties/${propertyId}/review`, {
    method: "POST",
    cookie: adminCookie,
    body: {
      action: "approve",
    },
  });

  pass(
    r.status === 200 &&
      r.json?.data?.status === "approved",
    "ADMIN APPROVAL",
    `HTTP ${r.status} ${r.text}`
  );

  // ------------------------------------------------------
  // PUBLIC DETAIL
  // ------------------------------------------------------

  r = await api(`/api/properties/${propertyId}`);

  pass(
    r.status === 200 &&
      r.json?.data?.id === propertyId &&
      r.json?.data?.status === "approved",
    "PUBLIC UUID DETAIL"
  );

  // ------------------------------------------------------
  // PUBLIC LIST
  // ------------------------------------------------------

  r = await api(
    `/api/properties?search=${encodeURIComponent(editedTitle)}`
  );

  pass(
    r.status === 200 &&
      (r.json?.data || []).some((x) => x.id === propertyId),
    "PUBLIC LIST CONTAINS PROPERTY"
  );

  // ------------------------------------------------------
  // SEARCH SAME OFFER ROW
  // ------------------------------------------------------

  r = await api(
    `/api/properties/search?q=${encodeURIComponent(stamp)}` +
      `&offerTypeId=${saleType.id}` +
      `&marketingMethod=direct`
  );

  pass(
    r.status === 200 &&
      (r.json?.data || []).some((x) => x.id === propertyId),
    "SEARCH DIRECT SALE MATCH"
  );

  r = await api(
    `/api/properties/search?q=${encodeURIComponent(stamp)}` +
      `&offerTypeId=${saleType.id}` +
      `&marketingMethod=auction`
  );

  pass(
    r.status === 200 &&
      !(r.json?.data || []).some((x) => x.id === propertyId),
    "SEARCH WRONG METHOD EXCLUDED"
  );

  // ------------------------------------------------------
  // FAVORITE
  // ------------------------------------------------------

  r = await api("/api/properties/favorites", {
    method: "POST",
    cookie: attackerCookie,
    body: {
      propertyId,
    },
  });

  pass(
    r.status === 200 &&
      r.json?.isFavorite === true,
    "FAVORITE ADD"
  );

  r = await api(
    `/api/properties/favorites?propertyId=${propertyId}`,
    {
      cookie: attackerCookie,
    }
  );

  pass(r.json?.isFavorite === true, "FAVORITE READ");

  r = await api("/api/properties/favorites", {
    method: "DELETE",
    cookie: attackerCookie,
    body: {
      propertyId,
    },
  });

  pass(r.json?.isFavorite === false, "FAVORITE REMOVE");

  // ------------------------------------------------------
  // SAVED SEARCH
  // ------------------------------------------------------

  r = await api("/api/saved-searches", {
    method: "POST",
    cookie: attackerCookie,
    body: {
      name: `بحث اختبار ${stamp}`,
      filters: {
        city: "Jeddah",
        offerTypeId: saleType.id,
        marketingMethod: "direct",
      },
      notify: true,
    },
  });

  pass(
    r.status === 200 &&
      r.json?.success === true &&
      Boolean(r.json?.data?.id),
    "SAVED SEARCH CREATE"
  );

  savedSearchId = r.json.data.id;

  r = await api("/api/saved-searches", {
    cookie: attackerCookie,
  });

  pass(
    r.status === 200 &&
      (r.json?.data || []).some((x) => x.id === savedSearchId),
    "SAVED SEARCH READ"
  );

  // ------------------------------------------------------
  // PROPERTY REQUEST
  // ------------------------------------------------------

  r = await api("/api/property-requests", {
    method: "POST",
    cookie: attackerCookie,
    body: {
      dealType: "sale",
      propertyType: "apartment",
      country: "SA",
      governorate: "Makkah",
      city: "Jeddah",
      district: "Al Rawdah",
      budget: 900000,
      area: 100,
      bedrooms: 2,
      bathrooms: 2,
      description:
        "طلب عقار اختبار آلي للتحقق من دورة طلبات العقارات في عقار بروماكس.",
    },
  });

  pass(
    r.status === 200 &&
      r.json?.success === true &&
      Boolean(r.json?.data?.id),
    "PROPERTY REQUEST CREATE",
    `HTTP ${r.status} ${r.text}`
  );

  requestId = r.json.data.id;

  r = await api("/api/property-requests", {
    method: "PATCH",
    cookie: attackerCookie,
    body: {
      id: requestId,
      status: "closed",
    },
  });

  pass(
    r.status === 200 &&
      r.json?.success === true,
    "PROPERTY REQUEST CLOSE"
  );

  // ------------------------------------------------------
  // REAL PUBLIC PAGES
  // ------------------------------------------------------

  let page = await fetch(`${BASE}/properties`, {
    redirect: "manual",
  });

  pass(page.status === 200, "PUBLIC PROPERTIES PAGE HTTP 200");

  page = await fetch(`${BASE}/properties/${propertyId}`, {
    redirect: "manual",
  });

  pass(page.status === 200, "PROPERTY DETAIL PAGE HTTP 200");

  console.log("");
  console.log("======================================");
  console.log("PROPERTIES F2 FUNCTIONAL E2E: PASS");
  console.log(`CHECKS: ${passes.length}/${passes.length}`);
  console.log("SAFE TO LOCK PROPERTIES: YES");
  console.log("======================================");
} catch (error) {
  console.error("");
  console.error("======================================");
  console.error("PROPERTIES F2 FUNCTIONAL E2E: FAIL");
  console.error(error?.stack || error);
  console.error("SAFE TO LOCK PROPERTIES: NO");
  console.error("======================================");

  process.exitCode = 1;
} finally {
  await cleanup();
  await sql.end({ timeout: 5 });
}
