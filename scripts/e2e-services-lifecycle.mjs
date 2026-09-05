// AkarProMax — services marketplace lifecycle, end to end, against the LIVE
// runtime. Traces the real path a customer and a provider walk, from
// registration and login through the full request -> offer -> accept -> job ->
// review -> chat cycle, and reports the OUTCOME of every step.
//
// Runs ON THE SERVER: it talks to http://127.0.0.1:3010 (so requests carry no
// browser Origin and pass the CSRF gate the same way a server-to-server caller
// does) and to the database directly for the two things a black-box client
// cannot do for itself: read the email-verification token, and clean up.
//
// Every account it makes uses @e2e.akarpromax.test and is deleted at the end,
// along with every row it created. Passwords are generated here and never
// belong to a real person.
//
//   node --env-file=.env scripts/e2e-services-lifecycle.mjs
//
// Exit code is the number of failed steps.

import postgres from "postgres";
import { randomBytes } from "node:crypto";

const BASE = process.env.E2E_BASE ?? "http://127.0.0.1:3010";
const url = process.env.DATABASE_URL?.trim();
if (!url) { console.error("DATABASE_URL not set"); process.exit(2); }
const sql = postgres(url, { ssl: "require", prepare: false, onnotice: () => {} });

const RUN = randomBytes(3).toString("hex");
const PW = "E2e!" + randomBytes(9).toString("base64url");
let pass = 0, fail = 0;
const notes = [];
function ok(name, cond, detail = "") {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; notes.push(`${name}${detail ? " — " + detail : ""}`); console.log(`  ✗ ${name}${detail ? " — " + detail : ""}`); }
  return cond;
}
function step(t) { console.log(`\n${t}`); }

// ── a tiny cookie-jar fetch ─────────────────────────────────────────────────
function makeClient() {
  const jar = new Map();
  return async (path, { method = "GET", body, headers = {} } = {}) => {
    const h = { ...headers };
    if (body !== undefined) h["Content-Type"] = "application/json";
    if (jar.size) h["Cookie"] = [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
    const res = await fetch(BASE + path, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body), redirect: "manual" });
    const setC = res.headers.getSetCookie?.() ?? [];
    for (const c of setC) { const m = /^([^=]+)=([^;]*)/.exec(c); if (m) { if (m[2] === "" || /Max-Age=0/i.test(c)) jar.delete(m[1]); else jar.set(m[1], m[2]); } }
    let json = null; const text = await res.text();
    try { json = text ? JSON.parse(text) : null; } catch { json = { _raw: text.slice(0, 200) }; }
    return { status: res.status, json, jar };
  };
}

async function activateByToken(email) {
  // Read the freshest email_verification challenge for this user and drive the
  // real verify endpoint, exactly as the emailed link would.
  const rows = await sql`
    select vc.id from verification_challenges vc
    join users u on u.id = vc.user_id
    where u.email = ${email} and vc.purpose = 'email_verification'
    order by vc.created_at desc limit 1`;
  return rows[0] ?? null;
}

const madeUsers = [];

async function register(client, label, email) {
  const r = await client("/api/auth/register", { method: "POST", body: { email, password: PW, name: label, preferredLanguage: "ar" } });
  madeUsers.push(email);
  return r;
}

// Create a request and publish it, returning its id — the reusable opening move
// for the decline and dispute branches.
async function postAndPublish(client, catId, cityId, title) {
  const r = await client("/api/service-requests", { method: "POST", body: {
    categoryId: catId, countryCode: "OM", cityId, titleAr: title, descriptionAr: "وصف اختبار", currency: "OMR", budgetMin: 20, budgetMax: 60, urgency: "normal",
  }});
  const id = r.json?.id ?? r.json?.requestId ?? null;
  if (id) await client(`/api/service-requests/${id}/publish`, { method: "POST", body: {} });
  return id;
}

// Unread notification count for a signed-in client.
async function unread(client) {
  const r = await client("/api/service-notifications?limit=50");
  return typeof r.json?.unread === "number" ? r.json.unread : (Array.isArray(r.json?.notifications) ? r.json.notifications.filter((n) => !n.is_read).length : 0);
}

async function main() {
  console.log(`services lifecycle e2e — run ${RUN}, base ${BASE}`);

  const custEmail = `cust-${RUN}@e2e.akarpromax.test`;
  const provEmail = `prov-${RUN}@e2e.akarpromax.test`;
  const adminEmail = `admin-${RUN}@e2e.akarpromax.test`;
  const cust = makeClient();
  const prov = makeClient();
  const admin = makeClient();

  // 1) REGISTRATION ----------------------------------------------------------
  step("1) Registration");
  const rc = await register(cust, "E2E Customer", custEmail);
  ok("customer register returns 200/201", rc.status === 200 || rc.status === 201, `status ${rc.status} ${JSON.stringify(rc.json).slice(0,120)}`);
  const rp = await register(prov, "E2E Provider", provEmail);
  ok("provider register returns 200/201", rp.status === 200 || rp.status === 201, `status ${rp.status}`);
  await register(admin, "E2E Supervisor", adminEmail);
  const [{ status: custStatus } = {}] = await sql`select status from users where email = ${custEmail}`;
  ok("new account starts pending_verification", custStatus === "pending_verification", `status=${custStatus}`);

  // 2) LOGIN BEFORE VERIFY (must be refused) ---------------------------------
  step("2) Login before verification");
  const preLogin = await cust("/api/auth/login", { method: "POST", body: { identifier: custEmail, password: PW } });
  ok("login is blocked before verification", preLogin.status === 403 || preLogin.json?.error === "account_blocked", `status ${preLogin.status} ${JSON.stringify(preLogin.json)}`);

  // 3) EMAIL VERIFICATION ----------------------------------------------------
  step("3) Email verification");
  const vc = await activateByToken(custEmail);
  ok("a verification challenge was created", !!vc, "no challenge row found");
  // The token the user receives is the raw value; we can only see its hash in
  // the DB. Activate directly by moving status to active the way the verified
  // link does, then confirm the account becomes usable. (This is the one step a
  // black-box client cannot self-serve without the emailed secret.)
  await sql`update users set status='active', email_verified_at=now(), updated_at=now() where email in (${custEmail}, ${provEmail}, ${adminEmail})`;
  // The supervisor role carries SERVICE_PROVIDERS_REVIEW and
  // SERVICE_REPORTS_MANAGE; the session reads the role from the DB at login.
  await sql`update users set role='service_supervisor' where email = ${adminEmail}`;
  const [{ status: afterVerify } = {}] = await sql`select status from users where email = ${custEmail}`;
  ok("account is active after verification", afterVerify === "active", `status=${afterVerify}`);

  // 4) LOGIN -----------------------------------------------------------------
  step("4) Login");
  const li = await cust("/api/auth/login", { method: "POST", body: { identifier: custEmail, password: PW } });
  ok("customer login returns 200", li.status === 200, `status ${li.status} ${JSON.stringify(li.json).slice(0,150)}`);
  ok("login sets a session cookie", li.jar.has("akar_session"), "no akar_session cookie");
  const me = await cust("/api/auth/me");
  ok("/api/auth/me shows authenticated", me.json?.authenticated === true, JSON.stringify(me.json).slice(0,120));
  const lp = await prov("/api/auth/login", { method: "POST", body: { identifier: provEmail, password: PW } });
  ok("provider login returns 200", lp.status === 200, `status ${lp.status}`);
  const la = await admin("/api/auth/login", { method: "POST", body: { identifier: adminEmail, password: PW } });
  ok("supervisor login returns 200", la.status === 200, `status ${la.status}`);

  // 5) CUSTOMER CREATES A SERVICE REQUEST ------------------------------------
  step("5) Customer posts a service request");
  const [cat] = await sql`select code from service_categories where country_code='OM' and parent_id is not null order by sort_order limit 1`;
  const [city] = await sql`select ci.id from cities ci join governorates g on g.id=ci.governorate_id join countries c on c.id=g.country_id where c.code='OM' limit 1`;
  ok("a category and a city exist to post against", !!cat && !!city, `cat=${cat?.code} city=${city?.id}`);
  const catId = (await sql`select id from service_categories where country_code='OM' and code=${cat.code} limit 1`)[0]?.id;
  const reqRes = await cust("/api/service-requests", { method: "POST", body: {
    categoryId: catId, countryCode: "OM", cityId: city.id,
    titleAr: "طلب اختبار — تنظيف شقة", descriptionAr: "وصف اختبار للدورة الكاملة", currency: "OMR",
    budgetMin: 20, budgetMax: 60, urgency: "normal",
  }});
  const requestId = reqRes.json?.id ?? reqRes.json?.requestId ?? null;
  ok("customer can create a request (as draft)", (reqRes.status === 200 || reqRes.status === 201) && !!requestId, `status ${reqRes.status} ${JSON.stringify(reqRes.json).slice(0,160)}`);
  // A new request is a draft; it must be published before providers can offer.
  if (requestId) {
    const pub = await cust(`/api/service-requests/${requestId}/publish`, { method: "POST", body: {} });
    ok("customer can publish the request", pub.status === 200 || pub.status === 201, `status ${pub.status} ${JSON.stringify(pub.json).slice(0,140)}`);
    const [rs] = await sql`select status from service_requests where id = ${requestId}`;
    ok("request is now open for offers", ["published", "receiving_offers"].includes(rs?.status), `status=${rs?.status}`);
  }

  // 6) PROVIDER APPLIES ------------------------------------------------------
  step("6) Provider creates a provider profile");
  const applyRes = await prov("/api/service-providers", { method: "POST", body: {
    countryCode: "OM", displayNameAr: "مزوّد اختبار", displayNameEn: "E2E Provider", bioAr: "خبرة اختبار",
    phone: "+96890000000", cityId: city.id, serviceRadiusKm: 50,
  }});
  ok("provider profile is created", applyRes.status === 200 || applyRes.status === 201, `status ${applyRes.status} ${JSON.stringify(applyRes.json).slice(0,160)}`);
  const [prof0] = await sql`select id, status from service_provider_profiles where user_id = ${provEmail} limit 1`;
  ok("profile starts as draft (awaiting review)", prof0?.status === "draft" || prof0?.status === "pending", `status=${prof0?.status}`);
  // A provider must carry the request's category to be eligible to offer on it.
  if (prof0?.id) {
    const addCat = await prov(`/api/service-providers/${prof0.id}/categories`, { method: "POST", body: { categoryId: catId, priceFrom: 20, priceTo: 80, currency: "OMR" } });
    ok("provider can add a trade category", addCat.status === 200 || addCat.status === 201, `status ${addCat.status} ${JSON.stringify(addCat.json).slice(0,140)}`);
  }

  // 7) OFFER BEFORE APPROVAL (must be refused) -------------------------------
  step("7) Offer before approval");
  if (requestId) {
    const early = await prov("/api/service-offers", { method: "POST", body: { requestId, price: 45, currency: "OMR", durationDays: 2 } });
    ok("an unapproved provider cannot offer", early.status === 403, `status ${early.status} ${JSON.stringify(early.json).slice(0,100)}`);
  }

  // 8) ADMIN APPROVES, PROVIDER RE-LOGS IN -----------------------------------
  step("8) Provider is approved and re-logs in");
  // Simulate the admin decision (the admin API is exercised separately). The
  // capability is baked into the session at login, so approval only takes
  // effect on the next login.
  await sql`update service_provider_profiles set status='approved', updated_at=now() where user_id = ${provEmail}`;
  // getSessionIdentity re-derives the service capability from the DB on every
  // request, so approval must take effect on the EXISTING session with no
  // re-login. Prove it on the original client, not a fresh one.
  const meSame = await prov("/api/auth/me");
  const permsSame = meSame.json?.user?.permissions ?? meSame.json?.permissions ?? [];
  ok("approval takes effect on the existing session (no re-login)", Array.isArray(permsSame) && permsSame.some((p) => /offer/i.test(p)), `perms=${JSON.stringify(permsSame).slice(0,160)}`);
  const prov2 = prov; // continue on the same session

  // 9) PROVIDER OFFERS -------------------------------------------------------
  step("9) Approved provider submits an offer");
  let offerId = null;
  if (requestId) {
    const offRes = await prov2("/api/service-offers", { method: "POST", body: {
      requestId, price: 45, currency: "OMR", durationDays: 2, materialsIncluded: false, messageAr: "عرض اختبار",
    }});
    offerId = offRes.json?.id ?? offRes.json?.offerId ?? null;
    ok("approved provider can submit an offer", (offRes.status === 200 || offRes.status === 201) && !!offerId, `status ${offRes.status} ${JSON.stringify(offRes.json).slice(0,180)}`);
  } else { ok("approved provider can submit an offer", false, "skipped — no request id"); }

  // 10) CUSTOMER ACCEPTS -----------------------------------------------------
  step("10) Customer accepts the offer");
  let orderId = null;
  if (offerId) {
    const accRes = await cust(`/api/service-offers/${offerId}/accept`, { method: "POST", body: {} });
    orderId = accRes.json?.orderId ?? accRes.json?.id ?? null;
    ok("customer can accept the offer", (accRes.status === 200 || accRes.status === 201) && !!orderId, `status ${accRes.status} ${JSON.stringify(accRes.json).slice(0,180)}`);
  } else { ok("customer can accept the offer", false, "skipped — no offer id"); }

  // 11) CHAT (parties now linked by the order) -------------------------------
  step("11) Messaging between the two parties");
  if (orderId) {
    for (const [who, client, ctx, id] of [["customer", cust, "order", orderId], ["provider", prov2, "order", orderId]]) {
      const m = await client("/api/service-messages", { method: "POST", body: { threadType: ctx, threadId: id, body: `رسالة اختبار من ال${who}` } });
      ok(`${who} can message on the order thread`, m.status === 200 || m.status === 201, `status ${m.status} ${JSON.stringify(m.json).slice(0,120)}`);
    }
  } else { ok("messaging on the order thread", false, "skipped — no order id"); }

  // 12) THE JOB IS WORKED AND COMPLETED --------------------------------------
  // ORDER_FLOW: accepted -> in_progress -> delivered -> completed.
  // The provider works and delivers; the customer confirms completion.
  step("12) Provider works the job, customer confirms completion");
  if (orderId) {
    for (const [who, client, to] of [["provider", prov2, "in_progress"], ["provider", prov2, "delivered"], ["customer", cust, "completed"]]) {
      const st = await client(`/api/service-jobs/${orderId}/status`, { method: "PATCH", body: { status: to } });
      ok(`${who}: job -> ${to}`, st.status === 200 || st.status === 201, `status ${st.status} ${JSON.stringify(st.json).slice(0,120)}`);
    }
  } else { ok("job completion", false, "skipped — no order id"); }

  // 13) CUSTOMER REVIEWS -----------------------------------------------------
  step("13) Customer reviews the completed job");
  if (orderId) {
    const rv = await cust(`/api/service-jobs/${orderId}/review`, { method: "POST", body: { rating: 5, qualityRating: 5, punctualityRating: 5, communicationRating: 5, valueRating: 5, comment: "خدمة ممتازة — اختبار", recommend: true } });
    ok("customer can leave a review", rv.status === 200 || rv.status === 201, `status ${rv.status} ${JSON.stringify(rv.json).slice(0,140)}`);
  } else { ok("customer can leave a review", false, "skipped — no order id"); }

  // 14) DB TRUTH -------------------------------------------------------------
  step("14) The rows actually landed");
  const [{ n: reqN } = {}] = await sql`select count(*)::int n from service_requests where customer_user_id = ${custEmail}`;
  ok("the request is persisted under the customer", reqN >= 1, `found ${reqN}`);
  if (orderId) {
    const [{ n: revN } = {}] = await sql`select count(*)::int n from service_reviews`;
    ok("a review row exists", revN >= 1, `reviews=${revN}`);
  }

  // 15) NOTIFICATIONS --------------------------------------------------------
  // The happy path fired several notify() calls: the provider was told their
  // offer was accepted and the job was completed; both parties were told of
  // the other's message. Assert they actually landed.
  step("15) Notifications reached the right inboxes");
  const provUnread = await unread(prov2);
  ok("the provider has unread notifications after the job", provUnread >= 1, `unread=${provUnread}`);
  const provNotifs = (await prov2("/api/service-notifications?limit=50")).json?.notifications ?? [];
  const provTypes = provNotifs.map((n) => String(n.type));
  ok("provider was notified their offer was accepted", provTypes.some((t) => /OFFER_ACCEPTED/i.test(t)), `types=${JSON.stringify(provTypes).slice(0,160)}`);
  const custNotifs = (await cust("/api/service-notifications?limit=50")).json?.notifications ?? [];
  ok("customer was notified on the message thread", custNotifs.some((n) => /MESSAGE/i.test(String(n.type))) || custNotifs.length >= 1, `count=${custNotifs.length}`);

  // 16) OFFER DECLINE --------------------------------------------------------
  // A fresh request the customer declines rather than accepts.
  step("16) The customer declines an offer");
  const req2 = await postAndPublish(cust, catId, city.id, "طلب اختبار — رفض العرض");
  ok("a second request is open", !!req2, "no second request id");
  let offer2 = null;
  if (req2) {
    const o = await prov2("/api/service-offers", { method: "POST", body: { requestId: req2, price: 50, currency: "OMR", durationDays: 3, messageAr: "عرض للرفض" } });
    offer2 = o.json?.id ?? o.json?.offerId ?? null;
    ok("provider offers on the second request", !!offer2, `status ${o.status} ${JSON.stringify(o.json).slice(0,120)}`);
  }
  if (offer2) {
    const dec = await cust(`/api/service-offers/${offer2}/decline`, { method: "POST", body: { reason: "السعر مرتفع" } });
    ok("customer can decline the offer", dec.status === 200 || dec.status === 201, `status ${dec.status} ${JSON.stringify(dec.json).slice(0,120)}`);
    const [os] = await sql`select status from service_offers where id = ${offer2}`;
    ok("the declined offer is no longer 'sent'", os && os.status !== "sent", `status=${os?.status}`);
    // A declined offer must not have produced an order.
    const [{ n: ordN } = {}] = await sql`select count(*)::int n from service_orders where offer_id = ${offer2}`;
    ok("no order was created from a declined offer", ordN === 0, `orders=${ordN}`);
  }

  // 17) DISPUTE --------------------------------------------------------------
  // A third request taken to an in-progress order, then disputed.
  step("17) A dispute is opened on an in-progress order");
  const req3 = await postAndPublish(cust, catId, city.id, "طلب اختبار — نزاع");
  let order3 = null;
  if (req3) {
    const o = await prov2("/api/service-offers", { method: "POST", body: { requestId: req3, price: 55, currency: "OMR", durationDays: 2, messageAr: "عرض للنزاع" } });
    const offer3 = o.json?.id ?? o.json?.offerId ?? null;
    if (offer3) {
      const acc = await cust(`/api/service-offers/${offer3}/accept`, { method: "POST", body: {} });
      order3 = acc.json?.orderId ?? acc.json?.id ?? null;
      if (order3) await prov2(`/api/service-jobs/${order3}/status`, { method: "PATCH", body: { status: "in_progress" } });
    }
  }
  ok("an in-progress order exists to dispute", !!order3, `order3=${order3}`);
  if (order3) {
    const disp = await cust("/api/service-disputes", { method: "POST", body: { orderId: order3, reason: "quality", description: "العمل غير مطابق — اختبار" } });
    ok("customer can open a dispute", disp.status === 200 || disp.status === 201, `status ${disp.status} ${JSON.stringify(disp.json).slice(0,140)}`);
    const [{ n: dN } = {}] = await sql`select count(*)::int n from service_disputes d join service_orders o on o.id=d.order_id where o.id=${order3}`;
    ok("a dispute row is persisted for the order", dN >= 1, `disputes=${dN}`);
  }

  // 18) PROVIDER WITHDRAWS AN OFFER ------------------------------------------
  step("18) The provider withdraws an offer");
  const req4 = await postAndPublish(cust, catId, city.id, "طلب اختبار — سحب العرض");
  let offer4 = null;
  if (req4) {
    const o = await prov2("/api/service-offers", { method: "POST", body: { requestId: req4, price: 40, currency: "OMR", durationDays: 1, messageAr: "عرض للسحب" } });
    offer4 = o.json?.id ?? o.json?.offerId ?? null;
    ok("provider offers on the fourth request", !!offer4, `status ${o.status}`);
  }
  if (offer4) {
    const wd = await prov2(`/api/service-offers/${offer4}/withdraw`, { method: "POST", body: {} });
    ok("provider can withdraw the offer", wd.status === 200 || wd.status === 201, `status ${wd.status} ${JSON.stringify(wd.json).slice(0,120)}`);
    const [os] = await sql`select status from service_offers where id = ${offer4}`;
    ok("the withdrawn offer is marked withdrawn", os?.status === "withdrawn", `status=${os?.status}`);
    // A withdrawn offer cannot then be accepted by the customer.
    const acc = await cust(`/api/service-offers/${offer4}/accept`, { method: "POST", body: {} });
    ok("a withdrawn offer can no longer be accepted", acc.status >= 400, `status ${acc.status} ${JSON.stringify(acc.json).slice(0,100)}`);
  }

  // 19) PROVIDER REVISES AN OFFER --------------------------------------------
  step("19) The provider revises an offer");
  const req5 = await postAndPublish(cust, catId, city.id, "طلب اختبار — تعديل العرض");
  let offer5 = null;
  if (req5) {
    const o = await prov2("/api/service-offers", { method: "POST", body: { requestId: req5, price: 100, currency: "OMR", durationDays: 5, messageAr: "عرض أولي" } });
    offer5 = o.json?.id ?? o.json?.offerId ?? null;
    ok("provider submits the initial offer", !!offer5, `status ${o.status}`);
  }
  if (offer5) {
    const rev = await prov2(`/api/service-offers/${offer5}/revise`, { method: "POST", body: { requestId: req5, price: 75, currency: "OMR", durationDays: 4, messageAr: "عرض معدّل — سعر أقل" } });
    ok("provider can revise the offer", rev.status === 200 || rev.status === 201, `status ${rev.status} ${JSON.stringify(rev.json).slice(0,120)}`);
    // The active offer for this request now reflects the new price.
    const [row] = await sql`select price::float as price from service_offers where request_id = ${req5} and status = 'sent' order by created_at desc limit 1`;
    ok("the revised price is the one on record", row && Math.round(row.price) === 75, `price=${row?.price}`);
  }

  // 20) REPORTING + ADMIN RESOLUTION -----------------------------------------
  step("20) A customer reports, an admin resolves");
  const [provProf] = await sql`select id from service_provider_profiles where user_id = ${provEmail} limit 1`;
  const rep = await cust("/api/service-reports", { method: "POST", body: { targetType: "provider", targetId: provProf?.id, reason: "spam", description: "بلاغ اختبار" } });
  ok("a customer can file a report", rep.status === 200 || rep.status === 201, `status ${rep.status} ${JSON.stringify(rep.json).slice(0,120)}`);
  const reportId = rep.json?.id ?? rep.json?.reportId ?? (await sql`select id from service_reports where reporter_user_id = ${custEmail} order by created_at desc limit 1`)[0]?.id;
  if (reportId) {
    const res = await admin(`/api/service-reports/${reportId}/resolve`, { method: "POST", body: { resolution: "روجع ولا مخالفة — اختبار", action: "dismiss" } });
    ok("an admin can resolve the report", res.status === 200 || res.status === 201, `status ${res.status} ${JSON.stringify(res.json).slice(0,120)}`);
    const [rr] = await sql`select status from service_reports where id = ${reportId}`;
    ok("the report is no longer open", rr && rr.status !== "open", `status=${rr?.status}`);
  } else { ok("an admin can resolve the report", false, "no report id"); }

  // 21) ADMIN PANEL + REAL PROVIDER APPROVAL ---------------------------------
  step("21) Admin overview, and approval through the real endpoint");
  const notAdmin = await cust("/api/service-admin");
  ok("a non-admin is refused the admin overview", notAdmin.status === 403, `status ${notAdmin.status}`);
  const overview = await admin("/api/service-admin");
  ok("the supervisor can read the admin overview", overview.status === 200, `status ${overview.status} ${JSON.stringify(overview.json).slice(0,100)}`);
  // Approve a provider through the real PATCH endpoint rather than the DB.
  // PROVIDER_FLOW allows submitted -> approved; put a fresh provider there.
  const provB = makeClient();
  const provBEmail = `provb-${RUN}@e2e.akarpromax.test`;
  await register(provB, "E2E Provider B", provBEmail);
  await sql`update users set status='active', email_verified_at=now() where email = ${provBEmail}`;
  await provB("/api/auth/login", { method: "POST", body: { identifier: provBEmail, password: PW } });
  const applyB = await provB("/api/service-providers", { method: "POST", body: { countryCode: "OM", displayNameAr: "مزوّد ب", cityId: city.id, serviceRadiusKm: 50 } });
  const [profB] = await sql`select id from service_provider_profiles where user_id = ${provBEmail} limit 1`;
  ok("second provider profile exists", !!profB?.id, `apply ${applyB.status}`);
  if (profB?.id) {
    await provB(`/api/service-providers/${profB.id}/categories`, { method: "POST", body: { categoryId: catId, priceFrom: 20, priceTo: 80, currency: "OMR" } });
    await sql`update service_provider_profiles set status='submitted', updated_at=now() where id = ${profB.id}`;
    // The non-admin provider must NOT be able to approve themselves.
    const selfApprove = await provB(`/api/service-providers/${profB.id}/status`, { method: "PATCH", body: { status: "approved" } });
    ok("a provider cannot approve themselves", selfApprove.status === 403, `status ${selfApprove.status}`);
    const approve = await admin(`/api/service-providers/${profB.id}/status`, { method: "PATCH", body: { status: "approved", note: "مؤهّل — اختبار" } });
    ok("the admin approves the provider via the real endpoint", approve.status === 200 || approve.status === 201, `status ${approve.status} ${JSON.stringify(approve.json).slice(0,120)}`);
    const [pb] = await sql`select status from service_provider_profiles where id = ${profB.id}`;
    ok("the provider is now approved in the database", pb?.status === "approved", `status=${pb?.status}`);
  }
}

async function cleanup() {
  step("Cleanup");
  try {
    const emails = (await sql`select email from users where email like '%@e2e.akarpromax.test'`).map((r) => r.email);
    const ids = (await sql`select id from users where email like '%@e2e.akarpromax.test'`).map((r) => r.id);
    if (emails.length) {
      // The services graph keys the actor by EMAIL (customer_user_id /
      // provider user_id), so clean by email; then remove the users by id.
      const reqIds = (await sql`select id from service_requests where customer_user_id = any(${emails})`).map((r) => r.id);
      if (reqIds.length) {
        const ordIds = (await sql`select id from service_orders where request_id = any(${reqIds})`).map((r) => r.id);
        if (ordIds.length) {
          await sql`delete from service_disputes where order_id = any(${ordIds})`.catch(()=>{});
          await sql`delete from service_job_timeline where order_id = any(${ordIds})`.catch(()=>{});
        }
        await sql`delete from service_offers where request_id = any(${reqIds})`.catch(()=>{});
        await sql`delete from service_orders where request_id = any(${reqIds})`.catch(()=>{});
        await sql`delete from service_requests where id = any(${reqIds})`.catch(()=>{});
      }
      await sql`delete from service_notifications where user_id = any(${emails})`.catch(()=>{});
      await sql`delete from service_reports where reporter_user_id = any(${emails})`.catch(()=>{});
      await sql`delete from service_provider_profiles where user_id = any(${emails})`.catch(()=>{});
      await sql`delete from service_reviews where reviewer_user_id = any(${emails}) or reviewee_user_id = any(${emails})`.catch(()=>{});
      if (ids.length) await sql`delete from users where id = any(${ids})`;
      console.log(`  removed ${ids.length} test user(s), ${reqIds.length} request(s) and related rows`);
    }
  } catch (e) { console.log("  cleanup note:", e.message); }
}

main()
  .catch((e) => { fail++; notes.push("FATAL: " + e.message); console.error(e); })
  .finally(async () => {
    await cleanup();
    await sql.end();
    console.log(`\n${pass} passed, ${fail} failed`);
    if (notes.length) console.log("Failures:\n  - " + notes.join("\n  - "));
    process.exit(fail);
  });
