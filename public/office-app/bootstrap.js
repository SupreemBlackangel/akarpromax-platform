/*
 * AkarProMax Office — server-hosted integration bootstrap.
 *
 * The desktop app's index.html loads THIS file from the live platform on
 * every launch, so changing it here updates every installed desktop app
 * automatically — no reinstall. It runs inside the app's WebView (origin
 * https://akarapp.local) and talks to the live platform.
 *
 * Responsibilities:
 *   - Platform login/logout overlay (email + password) — the account IS the
 *     key: on success it writes `user_token` (captured by the C# bridge as
 *     the website auth token) and `akar_website_api_settings` (baseUrl +
 *     apiKey) so the existing news/ads sync and property upload authenticate
 *     automatically.
 *   - A small account chip (logout) once signed in.
 *
 * No secrets live here; auth is the user's own platform credentials.
 */
(function () {
  "use strict";

  var PLATFORM = "https://akarpromax.com";
  var TOKEN_KEY = "user_token";
  var API_SETTINGS_KEY = "akar_website_api_settings";
  // The installed version is declared by the shipped index.html
  // (window.__AKAR_APP_VERSION__). Absent = treat as very old.
  var INSTALLED_VERSION = (typeof window.__AKAR_APP_VERSION__ === "string" && window.__AKAR_APP_VERSION__) || "0.0.0";

  // Compare dotted version strings: returns 1 if a>b, -1 if a<b, 0 if equal.
  function cmpVersion(a, b) {
    var pa = String(a).split(".").map(function (n) { return parseInt(n, 10) || 0; });
    var pb = String(b).split(".").map(function (n) { return parseInt(n, 10) || 0; });
    for (var i = 0; i < Math.max(pa.length, pb.length); i++) {
      var d = (pa[i] || 0) - (pb[i] || 0);
      if (d) return d > 0 ? 1 : -1;
    }
    return 0;
  }

  function ls(op, key, val) {
    try {
      if (op === "get") return window.localStorage.getItem(key);
      if (op === "set") return window.localStorage.setItem(key, val);
      if (op === "del") return window.localStorage.removeItem(key);
    } catch (e) { return null; }
  }

  // The shipped portal bundle seeds demo properties ("prop-NNN") into
  // localStorage on first load. This office tool must start empty: real
  // listings live on the platform and are published up from here. Strip the
  // seeded rows, keeping anything the office actually added (whose ids are not
  // the "prop-<number>" demo shape). Writing back a non-empty-string value —
  // "[]" when nothing real remains — also satisfies the bundle's own
  // `getItem(key) || seed` guard, so the demo set never comes back.
  function readArr(key) {
    try { var v = JSON.parse(window.localStorage.getItem(key) || "[]"); return Array.isArray(v) ? v : []; }
    catch (e) { return []; }
  }
  function writeArr(key, val) {
    try { window.localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }

  // Remove the bundle's seeded demo rows (properties "prop-N", clients "cNNN")
  // and the client-linked side stores, keeping anything the office actually
  // added. Returns true if it changed anything. From v2.0.4 the bundle's own
  // seeds are no-ops, so a cleared store stays cleared.
  function purgeDemoData() {
    var changed = false;
    // properties — the seed guard is `getItem||seed`, so a "[]" write also
    // stops it re-seeding even on the pre-2.0.4 bundle.
    try {
      var praw = window.localStorage.getItem("akar_properties");
      if (praw === null) { window.localStorage.setItem("akar_properties", "[]"); }
      else {
        var props = readArr("akar_properties");
        var realProps = props.filter(function (p) { return !(p && typeof p.id === "string" && /^prop-\d+$/.test(p.id)); });
        if (realProps.length !== props.length) { writeArr("akar_properties", realProps); changed = true; }
      }
    } catch (e) {}
    // clients + dependent records
    try {
      var clients = readArr("akar_v2_clients");
      var demo = {};
      clients.forEach(function (c) { if (c && typeof c.id === "string" && /^c\d+$/.test(c.id)) demo[c.id] = 1; });
      if (Object.keys(demo).length) {
        changed = true;
        writeArr("akar_v2_clients", clients.filter(function (c) { return !demo[c.id]; }));
        ["akar_v2_phones", "akar_v2_addresses", "akar_v2_group_members", "akar_v2_poa", "akar_v2_timeline"].forEach(function (k) {
          var rows = readArr(k);
          var kept = rows.filter(function (r) { return !(r && demo[r.clientId]); });
          if (kept.length !== rows.length) writeArr(k, kept);
        });
      }
    } catch (e) {}
    return changed;
  }

  function persistSession(token, profile) {
    ls("set", TOKEN_KEY, token);
    var settings = {
      enabled: true,
      baseUrl: PLATFORM,
      apiKey: token,
      autoSync: true,
      lastSync: null,
    };
    ls("set", API_SETTINGS_KEY, JSON.stringify(settings));
    if (profile) ls("set", "akar_platform_profile", JSON.stringify(profile));
  }

  function clearSession() {
    ls("del", TOKEN_KEY);
    ls("del", "akar_platform_profile");
    // Keep baseUrl but drop the key so the app is "logged out".
    ls("set", API_SETTINGS_KEY, JSON.stringify({ enabled: true, baseUrl: PLATFORM, apiKey: "", autoSync: false, lastSync: null }));
  }

  function isLoggedIn() {
    var t = ls("get", TOKEN_KEY);
    return !!(t && t.length > 10);
  }

  // ---- styles -------------------------------------------------------------
  function injectStyles() {
    if (document.getElementById("akar-office-auth-styles")) return;
    var css = ""
      + ".akar-auth-backdrop{position:fixed;inset:0;z-index:2147483000;background:linear-gradient(135deg,#0b1f3a,#0e2f5c);display:flex;align-items:center;justify-content:center;font-family:Tajawal,system-ui,sans-serif}"
      + ".akar-auth-card{width:min(400px,92vw);background:#fff;border-radius:20px;box-shadow:0 24px 60px rgba(0,0,0,.35);padding:30px 26px;direction:rtl;text-align:right}"
      + ".akar-auth-logo{display:flex;align-items:center;gap:12px;margin-bottom:18px}"
      + ".akar-auth-logo img{width:46px;height:46px;border-radius:12px}"
      + ".akar-auth-logo b{font-size:19px;color:#0e2f5c;font-weight:800}"
      + ".akar-auth-logo span{display:block;font-size:11px;color:#5a6d87;font-weight:700}"
      + ".akar-auth-h{font-size:16px;font-weight:800;color:#122d5e;margin:0 0 4px}"
      + ".akar-auth-sub{font-size:12px;color:#6a7d97;margin:0 0 18px;line-height:1.6}"
      + ".akar-auth-field{margin-bottom:12px}"
      + ".akar-auth-field label{display:block;font-size:12px;font-weight:700;color:#33507d;margin-bottom:5px}"
      + ".akar-auth-field input{width:100%;box-sizing:border-box;padding:11px 12px;border:1px solid #d5deea;border-radius:11px;font-size:14px;font-family:inherit;outline:none;transition:border-color .15s}"
      + ".akar-auth-field input:focus{border-color:#1a6dff}"
      + ".akar-auth-btn{width:100%;padding:12px;border:0;border-radius:12px;background:#1a6dff;color:#fff;font-size:15px;font-weight:800;font-family:inherit;cursor:pointer;transition:background .15s;margin-top:4px}"
      + ".akar-auth-btn:hover{background:#0f57d6}"
      + ".akar-auth-btn:disabled{opacity:.6;cursor:default}"
      + ".akar-auth-err{background:#fdecec;color:#c0392b;font-size:12.5px;font-weight:700;padding:9px 11px;border-radius:10px;margin-bottom:12px;display:none}"
      + ".akar-auth-foot{margin-top:16px;text-align:center;font-size:12px;color:#6a7d97}"
      + ".akar-auth-foot a{color:#1a6dff;font-weight:800;text-decoration:none}"
      + ".akar-acct-chip{position:fixed;bottom:16px;inset-inline-start:16px;z-index:2147482000;display:flex;align-items:center;gap:8px;background:#fff;border:1px solid #e2e8f2;border-radius:999px;padding:6px 8px 6px 14px;box-shadow:0 6px 20px rgba(20,45,94,.14);font-family:Tajawal,system-ui,sans-serif;direction:rtl}"
      + ".akar-acct-chip small{font-size:12px;font-weight:800;color:#243b63;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}"
      + ".akar-acct-chip button{border:0;background:#eef3fb;color:#0e2f5c;font-size:11px;font-weight:800;font-family:inherit;padding:5px 10px;border-radius:999px;cursor:pointer}"
      + ".akar-acct-chip button:hover{background:#e4ecfb}"
      + ".akar-acct-chip button.akar-chip-logout{color:#c0392b}"
      + ".akar-acct-chip button.akar-chip-logout:hover{background:#fdecec}"
      + ".akar-profile-card{width:min(460px,92vw);max-height:88vh;overflow-y:auto}"
      + ".akar-profile-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px 12px}"
      + ".akar-profile-grid .akar-auth-field.akar-full{grid-column:1/-1}"
      + ".akar-auth-field select,.akar-auth-field textarea{width:100%;box-sizing:border-box;padding:11px 12px;border:1px solid #d5deea;border-radius:11px;font-size:14px;font-family:inherit;outline:none;background:#fff}"
      + ".akar-auth-field textarea{resize:vertical;min-height:56px}"
      + ".akar-logo-row{display:flex;align-items:center;gap:12px;margin-bottom:14px}"
      + ".akar-logo-preview{width:56px;height:56px;border-radius:14px;background:#eef3fb;display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0;border:1px dashed #c7d4e8}"
      + ".akar-logo-preview img{width:100%;height:100%;object-fit:cover}"
      + ".akar-logo-btn{border:1px solid #d5deea;background:#fff;color:#33507d;font-weight:700;font-size:12.5px;font-family:inherit;padding:8px 14px;border-radius:10px;cursor:pointer}"
      + ".akar-logo-btn:hover{background:#f3f7fc}";
    var s = document.createElement("style");
    s.id = "akar-office-auth-styles";
    s.textContent = css;
    document.head.appendChild(s);
  }

  // ---- login overlay ------------------------------------------------------
  // Sign the office in with a platform session token, then hand off to the
  // office-profile step. Shared by both the login and register paths.
  function completeAuth(wrap, token, user) {
    persistSession(token, user || null);
    wrap.remove();
    mountChip();
    ensureProfile();
  }

  function programLogin(identifier, password) {
    return fetch(PLATFORM + "/api/program/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: identifier, password: password }),
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j }; });
    });
  }

  function showLogin() {
    if (document.getElementById("akar-auth-backdrop")) return;
    injectStyles();
    var mode = "login"; // "login" | "register"
    var wrap = document.createElement("div");
    wrap.id = "akar-auth-backdrop";
    wrap.className = "akar-auth-backdrop";
    wrap.innerHTML =
      '<div class="akar-auth-card" role="dialog" aria-label="حساب المكتب">' +
      '  <div class="akar-auth-logo">' +
      '    <img src="' + PLATFORM + '/icons/icon-192.png" alt="" onerror="this.style.display=\'none\'"/>' +
      "    <div><b>عقار بروماكس</b><span>المكتب العقاري</span></div>" +
      "  </div>" +
      '  <p class="akar-auth-h" id="akar-auth-title">تسجيل الدخول بحساب المنصة</p>' +
      '  <p class="akar-auth-sub" id="akar-auth-sub">استخدم بريد وكلمة مرور حسابك في عقار بروماكس لربط المكتب بالمنصة تلقائيًا: رفع العقارات، الأخبار، والفرص حسب منطقتك.</p>' +
      '  <div class="akar-auth-err" id="akar-auth-err"></div>' +
      '  <div class="akar-auth-field akar-reg-only" style="display:none"><label>اسم المكتب / المسؤول</label><input id="akar-auth-name" type="text" autocomplete="name"/></div>' +
      '  <div class="akar-auth-field"><label id="akar-auth-idlabel">البريد الإلكتروني أو الهاتف</label><input id="akar-auth-id" type="text" autocomplete="username" dir="ltr"/></div>' +
      '  <div class="akar-auth-field akar-reg-only" style="display:none"><label>رقم الهاتف (اختياري)</label><input id="akar-auth-phone" type="text" autocomplete="tel" dir="ltr"/></div>' +
      '  <div class="akar-auth-field"><label>كلمة المرور</label><input id="akar-auth-pw" type="password" autocomplete="current-password"/></div>' +
      '  <button class="akar-auth-btn" id="akar-auth-go">تسجيل الدخول</button>' +
      '  <p class="akar-auth-foot" id="akar-auth-foot">ليس لديك حساب؟ <a id="akar-auth-toggle" href="#">أنشئ حساب مكتب جديد</a></p>' +
      "</div>";
    document.body.appendChild(wrap);

    var nameEl = document.getElementById("akar-auth-name");
    var idEl = document.getElementById("akar-auth-id");
    var phoneEl = document.getElementById("akar-auth-phone");
    var pwEl = document.getElementById("akar-auth-pw");
    var btn = document.getElementById("akar-auth-go");
    var err = document.getElementById("akar-auth-err");
    var titleEl = document.getElementById("akar-auth-title");
    var subEl = document.getElementById("akar-auth-sub");
    var idLabelEl = document.getElementById("akar-auth-idlabel");
    var footEl = document.getElementById("akar-auth-foot");
    var regOnly = wrap.querySelectorAll(".akar-reg-only");

    function busyLabel() { return mode === "register" ? "جارٍ إنشاء الحساب..." : "جارٍ الدخول..."; }
    function actionLabel() { return mode === "register" ? "إنشاء الحساب والدخول" : "تسجيل الدخول"; }

    function fail(msg) {
      err.textContent = msg;
      err.style.display = "block";
      btn.disabled = false;
      btn.textContent = actionLabel();
    }

    function applyMode() {
      var reg = mode === "register";
      for (var i = 0; i < regOnly.length; i++) regOnly[i].style.display = reg ? "" : "none";
      titleEl.textContent = reg ? "إنشاء حساب مكتب جديد" : "تسجيل الدخول بحساب المنصة";
      subEl.textContent = reg
        ? "أنشئ حساب المكتب لأول مرة — بريد وكلمة مرور، ويُفعَّل مباشرة بلا انتظار بريد تفعيل."
        : "استخدم بريد وكلمة مرور حسابك في عقار بروماكس لربط المكتب بالمنصة تلقائيًا: رفع العقارات، الأخبار، والفرص حسب منطقتك.";
      idLabelEl.textContent = reg ? "البريد الإلكتروني" : "البريد الإلكتروني أو الهاتف";
      btn.textContent = actionLabel();
      footEl.innerHTML = reg
        ? 'لديك حساب؟ <a id="akar-auth-toggle" href="#">سجّل الدخول</a>'
        : 'ليس لديك حساب؟ <a id="akar-auth-toggle" href="#">أنشئ حساب مكتب جديد</a>';
      wireToggle();
      err.style.display = "none";
    }

    function wireToggle() {
      var t = document.getElementById("akar-auth-toggle");
      if (!t) return;
      t.addEventListener("click", function (e) {
        e.preventDefault();
        mode = mode === "register" ? "login" : "register";
        applyMode();
        try { (mode === "register" ? nameEl : idEl).focus(); } catch (ee) {}
      });
    }

    function doLogin(identifier, password) {
      return programLogin(identifier, password).then(function (res) {
        if (res.ok && res.j && res.j.success && res.j.token) {
          completeAuth(wrap, res.j.token, res.j.user || null);
          return true;
        }
        fail((res.j && res.j.message) || "تعذّر تسجيل الدخول. تحقق من البيانات والاتصال.");
        return false;
      });
    }

    function submit() {
      var password = pwEl.value || "";
      btn.disabled = true;
      btn.textContent = busyLabel();
      err.style.display = "none";

      if (mode === "login") {
        var identifier = (idEl.value || "").trim();
        if (!identifier || !password) { fail("أدخل البريد/الهاتف وكلمة المرور."); return; }
        doLogin(identifier, password).catch(function () { fail("تعذّر الاتصال بالمنصة. تأكد من الإنترنت."); });
        return;
      }

      // register mode
      var name = (nameEl.value || "").trim();
      var email = (idEl.value || "").trim();
      var phone = (phoneEl.value || "").trim();
      if (!name) { fail("أدخل اسم المكتب أو المسؤول."); return; }
      if (!email || email.indexOf("@") < 0) { fail("أدخل بريدًا إلكترونيًا صحيحًا."); return; }
      if (password.length < 8) { fail("كلمة المرور يجب ألا تقل عن 8 أحرف."); return; }

      var payload = { email: email, password: password, name: name };
      if (phone) payload.phone = phone;
      fetch(PLATFORM + "/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { status: r.status, j: j }; }); })
        .then(function (res) {
          // 200/201 = created; 409 = already exists — both proceed to login,
          // where the account is auto-activated on first password sign-in.
          if (res.status < 500) {
            return doLogin(email, password);
          }
          fail((res.j && (res.j.error || res.j.message)) || "تعذّر إنشاء الحساب. جرّب لاحقًا.");
          return false;
        })
        .catch(function () { fail("تعذّر الاتصال بالمنصة. تأكد من الإنترنت."); });
    }

    btn.addEventListener("click", submit);
    pwEl.addEventListener("keydown", function (e) { if (e.key === "Enter") submit(); });
    wireToggle();
    setTimeout(function () { try { idEl.focus(); } catch (e) {} }, 60);
  }

  // ---- account chip (profile + logout) ------------------------------------
  function mountChip() {
    var existing = document.getElementById("akar-acct-chip");
    if (existing) existing.remove();
    if (!isLoggedIn()) return;
    injectStyles();
    var office = {};
    try { office = JSON.parse(ls("get", OFFICE_PROFILE_CACHE_KEY) || "{}"); } catch (e) {}
    var platformProfile = {};
    try { platformProfile = JSON.parse(ls("get", "akar_platform_profile") || "{}"); } catch (e) {}
    var name = office.name || platformProfile.displayName || platformProfile.name || platformProfile.email || "حساب المنصة";
    var chip = document.createElement("div");
    chip.id = "akar-acct-chip";
    chip.className = "akar-acct-chip";
    chip.innerHTML =
      '<small title="' + name + '">🟢 ' + name + "</small>" +
      '<button id="akar-chip-profile">بيانات المكتب</button>' +
      '<button class="akar-chip-logout" id="akar-chip-logout">خروج</button>';
    chip.querySelector("#akar-chip-profile").addEventListener("click", function () { showProfileForm(false); });
    chip.querySelector("#akar-chip-logout").addEventListener("click", function () {
      clearSession();
      ls("del", OFFICE_PROFILE_CACHE_KEY);
      chip.remove();
      showLogin();
    });
    document.body.appendChild(chip);
  }

  // ---- office profile (name/logo/contact/location) ------------------------
  var OFFICE_PROFILE_CACHE_KEY = "akar_office_profile";
  var geoCache = { countries: null };

  function authedFetch(path, options) {
    var token = ls("get", TOKEN_KEY) || "";
    options = options || {};
    var headers = options.headers || {};
    headers["X-API-Key"] = token;
    if (!options.body || typeof options.body !== "string" || options.method === "GET" || !options.method) {
      // no content-type needed for GET
    } else {
      headers["Content-Type"] = "application/json";
    }
    options.headers = headers;
    return fetch(PLATFORM + path, options);
  }

  function fetchProfile() {
    return authedFetch("/api/program/profile", { method: "GET" })
      .then(function (r) { return r.ok ? r.json() : { success: false }; })
      .then(function (j) { return (j && j.success) ? j.profile : null; })
      .catch(function () { return null; });
  }

  // ---- pull the office's published properties down for display ------------
  // The portal only ever showed local rows; a property published from here
  // then "vanished" because nothing read it back. Map each platform property
  // into the portal's own property shape and merge it into akar_properties so
  // it appears in the Properties list, tagged so a later sync can refresh it
  // without touching rows the office is still drafting locally.
  var DEAL_LIFECYCLE = { sale: "active_market", rent: "active_market" };
  var CATEGORY_AR = { residential: "سكني", commercial: "تجاري", industrial: "صناعي", land: "أرض", agricultural: "زراعي" };
  var TYPE_AR = {
    apartment: "شقة", villa: "فيلا", townhouse: "تاون هاوس", duplex: "دوبلكس", penthouse: "بنتهاوس", building: "عمارة",
    shop: "محل", office: "مكتب", hotel: "فندق", resort: "منتجع", restaurant: "مطعم",
    warehouse: "مستودع", factory: "مصنع", land: "أرض", ranch: "مزرعة", farm: "مزرعة"
  };

  function mapPlatformProperty(p) {
    var lat = p.latitude != null ? Number(p.latitude) : null;
    var lng = p.longitude != null ? Number(p.longitude) : null;
    var price = Number(p.price) || 0;
    return {
      id: "site-" + p.id,
      remoteId: p.id,
      __fromPlatform: true,
      displayName: p.title || "عقار",
      title: p.title || "عقار",
      description: p.description || "",
      category: CATEGORY_AR[p.category] || p.category || "",
      subCategory: TYPE_AR[p.propertyType] || p.propertyType || "",
      type: p.propertyType || "apartment",
      status: "active",
      lifecycle: DEAL_LIFECYCLE[p.dealType] || "active_market",
      offer: {
        type: p.dealType === "rent" ? "rent" : "sale",
        paymentMethod: "cash",
        cashPrice: price,
        cashCurrency: p.currency || "SAR"
      },
      price: price,
      askingPrice: price,
      currency: p.currency || "SAR",
      area: { value: Number(p.area) || 0, unit: "م²" },
      totalArea: Number(p.area) || 0,
      rooms: p.bedrooms || 0,
      bathrooms: p.bathrooms || 0,
      city: p.city || "",
      district: p.district || "",
      neighborhood: p.district || "",
      address: p.address || "",
      coordinatesLegacy: (lat != null && lng != null) ? { lat: lat, lng: lng } : null,
      mapUrl: (lat != null && lng != null) ? ("https://maps.google.com/?q=" + lat + "," + lng) : "",
      trueOwnerName: "",
      mandatedAgentName: "",
      ownerType: "individual",
      media: [], photos: [], videos: [], documents: [], attachments: [],
      boundaries: {}, coordinates: [], financialRecords: [], sections: [],
      createdAt: p.createdAt || new Date().toISOString(),
      updatedAt: p.createdAt || new Date().toISOString()
    };
  }

  // Returns a Promise<boolean> — true when the displayed set of platform rows
  // changed (so the caller can refresh the view).
  function syncPlatformProperties() {
    return authedFetch("/api/program/properties", { method: "GET" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data || !Array.isArray(data.properties)) return false;
        var mapped = data.properties.map(mapPlatformProperty);
        var existing = readArr("akar_properties");
        var localOnly = existing.filter(function (p) { return !(p && p.__fromPlatform); });
        var prevRemote = existing.filter(function (p) { return p && p.__fromPlatform; })
          .map(function (p) { return p.remoteId; }).sort().join(",");
        var nextRemote = mapped.map(function (p) { return p.remoteId; }).sort().join(",");
        writeArr("akar_properties", localOnly.concat(mapped));
        return prevRemote !== nextRemote;
      })
      .catch(function () { return false; });
  }

  // Geo requests never resolve to a silent empty list on failure: a network
  // or server error rejects, so the form can tell the user and offer a retry
  // (an empty select with only the placeholder is otherwise indistinguishable
  // from "no data").
  function geoRequest(query) {
    return fetch(PLATFORM + "/api/geo?" + query, { cache: "no-store" })
      .then(function (r) {
        return r.json().catch(function () { return null; }).then(function (j) {
          if (!r.ok || !j || j.success === false) {
            throw new Error((j && j.message) || ("geo " + r.status));
          }
          return Array.isArray(j.data) ? j.data : [];
        });
      });
  }

  function fetchCountries() {
    if (geoCache.countries && geoCache.countries.length) return Promise.resolve(geoCache.countries);
    return geoRequest("type=countries").then(function (rows) {
      geoCache.countries = rows;
      return rows;
    });
  }

  function fetchGeoRows(type, parentId) {
    return geoRequest("type=" + type + "&parentId=" + encodeURIComponent(parentId));
  }

  function fillSelect(select, rows, placeholder, selectedCode) {
    select.innerHTML = "";
    var opt0 = document.createElement("option");
    opt0.value = "";
    opt0.textContent = placeholder;
    select.appendChild(opt0);
    rows.forEach(function (row) {
      var opt = document.createElement("option");
      opt.value = row.code || row.id;
      opt.textContent = row.nameAr || row.nameEn || row.code;
      if (selectedCode && String(opt.value).toUpperCase() === String(selectedCode).toUpperCase()) opt.selected = true;
      select.appendChild(opt);
    });
  }

  function showProfileForm(isFirstRun, existing) {
    if (document.getElementById("akar-profile-backdrop")) return;
    injectStyles();
    existing = existing || {};
    var wrap = document.createElement("div");
    wrap.id = "akar-profile-backdrop";
    wrap.className = "akar-auth-backdrop";
    wrap.innerHTML =
      '<div class="akar-auth-card akar-profile-card" role="dialog" aria-label="بيانات المكتب">' +
      '  <div class="akar-auth-logo"><img src="' + PLATFORM + '/icons/icon-192.png" alt="" onerror="this.style.display=\'none\'"/>' +
      "    <div><b>بيانات المكتب</b><span>تُعرض مع كل عقار تنشره من التطبيق</span></div></div>" +
      '  <div class="akar-auth-err" id="akar-profile-err"></div>' +
      '  <div class="akar-logo-row">' +
      '    <div class="akar-logo-preview" id="akar-logo-preview">' + (existing.logoData ? '<img src="' + existing.logoData + '"/>' : "🏢") + "</div>" +
      '    <button type="button" class="akar-logo-btn" id="akar-logo-pick">اختر شعار المكتب</button>' +
      '    <input type="file" id="akar-logo-file" accept="image/png,image/jpeg,image/webp" style="display:none"/>' +
      "  </div>" +
      '  <div class="akar-profile-grid">' +
      '    <div class="akar-auth-field akar-full"><label>اسم المكتب *</label><input id="akar-p-name" type="text" value="' + (existing.name || "").replace(/"/g, "&quot;") + '"/></div>' +
      '    <div class="akar-auth-field"><label>الهاتف</label><input id="akar-p-phone" type="tel" dir="ltr" value="' + (existing.phone || "") + '"/></div>' +
      '    <div class="akar-auth-field"><label>واتساب</label><input id="akar-p-whatsapp" type="tel" dir="ltr" value="' + (existing.whatsapp || "") + '"/></div>' +
      '    <div class="akar-auth-field"><label>البريد الإلكتروني</label><input id="akar-p-email" type="email" dir="ltr" value="' + (existing.email || "") + '"/></div>' +
      '    <div class="akar-auth-field"><label>الموقع الإلكتروني</label><input id="akar-p-website" type="text" dir="ltr" value="' + (existing.website || "") + '"/></div>' +
      '    <div class="akar-auth-field"><label>الدولة *</label><select id="akar-p-country"><option value="">جارٍ التحميل...</option></select></div>' +
      '    <div class="akar-auth-field"><label>المنطقة *</label><select id="akar-p-governorate" disabled><option value="">اختر الدولة أولًا</option></select></div>' +
      '    <div class="akar-auth-field akar-full"><label>المدينة *</label><select id="akar-p-city" disabled><option value="">اختر المنطقة أولًا</option></select></div>' +
      '    <div class="akar-auth-field akar-full"><label>العنوان التفصيلي</label><textarea id="akar-p-address">' + (existing.address || "") + "</textarea></div>" +
      "  </div>" +
      '  <button class="akar-auth-btn" id="akar-p-save">حفظ بيانات المكتب</button>' +
      (isFirstRun ? "" : '  <button class="akar-auth-btn" id="akar-p-close" style="background:transparent;color:#6a7d97;margin-top:8px">إغلاق</button>') +
      "</div>";
    document.body.appendChild(wrap);

    var logoData = existing.logoData || "";
    var fileInput = document.getElementById("akar-logo-file");
    document.getElementById("akar-logo-pick").addEventListener("click", function () { fileInput.click(); });
    fileInput.addEventListener("change", function () {
      var file = fileInput.files && fileInput.files[0];
      if (!file) return;
      if (file.size > 380000) { showProfileErr("الصورة كبيرة جدًا، اختر صورة أصغر من 380 كيلوبايت."); return; }
      var reader = new FileReader();
      reader.onload = function () {
        logoData = String(reader.result || "");
        document.getElementById("akar-logo-preview").innerHTML = '<img src="' + logoData + '"/>';
      };
      reader.readAsDataURL(file);
    });

    function showProfileErr(msg) {
      var err = document.getElementById("akar-profile-err");
      err.textContent = msg;
      err.style.display = "block";
    }

    var countrySel = document.getElementById("akar-p-country");
    var govSel = document.getElementById("akar-p-governorate");
    var citySel = document.getElementById("akar-p-city");

    function hideProfileErr() {
      var err = document.getElementById("akar-profile-err");
      if (err) err.style.display = "none";
    }

    function geoFailed(select, label) {
      select.innerHTML = '<option value="">تعذّر تحميل ' + label + ' — اضغط لإعادة المحاولة</option>';
      select.disabled = false;
      showProfileErr("تعذّر تحميل قائمة " + label + " من المنصة. تحقق من الاتصال بالإنترنت ثم أعد المحاولة.");
    }

    function loadCountries() {
      countrySel.innerHTML = '<option value="">جارٍ التحميل...</option>';
      countrySel.disabled = true;
      fetchCountries()
        .then(function (rows) {
          countrySel.disabled = false;
          if (!rows.length) {
            geoFailed(countrySel, "الدول");
            return;
          }
          hideProfileErr();
          fillSelect(countrySel, rows, "اختر الدولة", existing.country);
          if (existing.country) loadGovernorates(existing.country, existing.governorate);
        })
        .catch(function () { geoFailed(countrySel, "الدول"); });
    }
    loadCountries();

    // A select that failed to load reloads on the next open/click.
    countrySel.addEventListener("mousedown", function () {
      if (!(geoCache.countries && geoCache.countries.length)) loadCountries();
    });

    function loadGovernorates(countryCode, selectedGov) {
      var country = (geoCache.countries || []).filter(function (c) { return String(c.code).toUpperCase() === String(countryCode).toUpperCase(); })[0];
      if (!country) { govSel.disabled = true; return; }
      govSel.disabled = true;
      govSel.innerHTML = '<option value="">جارٍ التحميل...</option>';
      fetchGeoRows("governorates", country.id)
        .then(function (rows) {
          govSel.disabled = false;
          fillSelect(govSel, rows, "اختر المنطقة", selectedGov);
          govSel._rows = rows;
          if (selectedGov) {
            var match = rows.filter(function (r) { return String(r.code || r.id).toUpperCase() === String(selectedGov).toUpperCase(); })[0];
            if (match && existing.city) loadCities(match.id, existing.city);
          }
        })
        .catch(function () {
          govSel._rows = [];
          geoFailed(govSel, "المناطق");
          govSel._retry = function () { loadGovernorates(countryCode, selectedGov); };
        });
    }

    function loadCities(governorateId, selectedCity) {
      citySel.disabled = true;
      citySel.innerHTML = '<option value="">جارٍ التحميل...</option>';
      fetchGeoRows("cities", governorateId)
        .then(function (rows) {
          citySel.disabled = false;
          fillSelect(citySel, rows, "اختر المدينة", selectedCity);
        })
        .catch(function () {
          geoFailed(citySel, "المدن");
          citySel._retry = function () { loadCities(governorateId, selectedCity); };
        });
    }

    govSel.addEventListener("mousedown", function () {
      if (govSel._retry) { var f = govSel._retry; govSel._retry = null; f(); }
    });
    citySel.addEventListener("mousedown", function () {
      if (citySel._retry) { var f = citySel._retry; citySel._retry = null; f(); }
    });

    countrySel.addEventListener("change", function () {
      govSel.innerHTML = '<option value="">اختر الدولة أولًا</option>';
      govSel.disabled = true;
      citySel.innerHTML = '<option value="">اختر المنطقة أولًا</option>';
      citySel.disabled = true;
      if (countrySel.value) loadGovernorates(countrySel.value, null);
    });
    govSel.addEventListener("change", function () {
      citySel.innerHTML = '<option value="">اختر المنطقة أولًا</option>';
      citySel.disabled = true;
      var rows = govSel._rows || [];
      var match = rows.filter(function (r) { return String(r.code || r.id) === govSel.value; })[0];
      if (match) loadCities(match.id, null);
    });

    var saveBtn = document.getElementById("akar-p-save");
    saveBtn.addEventListener("click", function () {
      var name = (document.getElementById("akar-p-name").value || "").trim();
      var country = countrySel.value;
      var governorate = govSel.value;
      var city = citySel.value;
      if (!name) { showProfileErr("اسم المكتب مطلوب."); return; }
      if (!country || !governorate || !city) { showProfileErr("الدولة والمنطقة والمدينة مطلوبة."); return; }
      saveBtn.disabled = true;
      saveBtn.textContent = "جارٍ الحفظ...";
      var payload = {
        name: name,
        logoData: logoData,
        phone: document.getElementById("akar-p-phone").value || "",
        whatsapp: document.getElementById("akar-p-whatsapp").value || "",
        email: document.getElementById("akar-p-email").value || "",
        website: document.getElementById("akar-p-website").value || "",
        country: country,
        governorate: governorate,
        city: city,
        address: document.getElementById("akar-p-address").value || "",
      };
      authedFetch("/api/program/profile", { method: "POST", body: JSON.stringify(payload) })
        .then(function (r) { return r.json().catch(function () { return {}; }); })
        .then(function (j) {
          if (j && j.success) {
            ls("set", OFFICE_PROFILE_CACHE_KEY, JSON.stringify(payload));
            wrap.remove();
            mountChip();
          } else {
            saveBtn.disabled = false;
            saveBtn.textContent = "حفظ بيانات المكتب";
            showProfileErr((j && j.message) || "تعذّر الحفظ.");
          }
        })
        .catch(function () {
          saveBtn.disabled = false;
          saveBtn.textContent = "حفظ بيانات المكتب";
          showProfileErr("تعذّر الاتصال بالمنصة.");
        });
    });

    var closeBtn = document.getElementById("akar-p-close");
    if (closeBtn) closeBtn.addEventListener("click", function () { wrap.remove(); });
  }

  // After login, ensure the office has a profile; first run is mandatory
  // (no close button) since publishing needs the location on file.
  function ensureProfile() {
    fetchProfile().then(function (profile) {
      if (profile && profile.name && profile.country && profile.governorate && profile.city) {
        ls("set", OFFICE_PROFILE_CACHE_KEY, JSON.stringify(profile));
        return;
      }
      showProfileForm(true, profile || {});
    });
  }

  // ---- auto-update check --------------------------------------------------
  function injectUpdateStyles() {
    if (document.getElementById("akar-update-styles")) return;
    var css = ""
      + ".akar-update-bar{position:fixed;top:0;inset-inline:0;z-index:2147483600;display:flex;align-items:center;gap:12px;justify-content:center;flex-wrap:wrap;background:linear-gradient(90deg,#0e2f5c,#1a6dff);color:#fff;font-family:Tajawal,system-ui,sans-serif;direction:rtl;padding:10px 16px;box-shadow:0 4px 16px rgba(0,0,0,.25)}"
      + ".akar-update-bar b{font-weight:800;font-size:14px}"
      + ".akar-update-bar span{font-size:12.5px;opacity:.9}"
      + ".akar-update-bar button{border:0;border-radius:999px;padding:7px 16px;font-family:inherit;font-weight:800;font-size:13px;cursor:pointer;background:#fff;color:#0e2f5c}"
      + ".akar-update-bar button:hover{background:#eaf2ff}"
      + ".akar-update-bar .akar-update-x{background:transparent;color:#fff;font-size:16px;padding:4px 8px}"
      // Mandatory update: full-screen gate — nothing behind it is reachable.
      + ".akar-update-gate{position:fixed;inset:0;z-index:2147483646;display:flex;align-items:center;justify-content:center;background:linear-gradient(160deg,#081c38 0%,#0e2f5c 55%,#123c74 100%);direction:rtl;font-family:Tajawal,system-ui,sans-serif}"
      + ".akar-update-card{width:min(460px,92vw);background:#fff;border-radius:22px;padding:36px 32px 30px;text-align:center;box-shadow:0 30px 80px rgba(0,0,0,.45)}"
      + ".akar-update-ico{width:88px;height:88px;margin:0 auto 18px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at 30% 25%,#3b8bff,#0e2f5c);box-shadow:0 10px 26px rgba(26,109,255,.35);animation:akarUpPulse 2.2s ease-in-out infinite}"
      + "@keyframes akarUpPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}"
      + ".akar-update-card h1{margin:0 0 6px;font-size:22px;font-weight:800;color:#0e2f5c}"
      + ".akar-update-card .akar-up-msg{margin:0 0 14px;font-size:14px;color:#5a6b85;line-height:1.7}"
      + ".akar-update-vers{display:flex;align-items:center;justify-content:center;gap:10px;margin:0 0 16px}"
      + ".akar-update-vers b{background:#eef4ff;color:#0e2f5c;border-radius:999px;padding:5px 14px;font-size:13px;font-weight:800}"
      + ".akar-update-vers b.akar-up-new{background:#0e6b3a;color:#fff}"
      + ".akar-update-vers svg{opacity:.5}"
      + ".akar-update-notes{margin:0 0 20px;padding:12px 14px;background:#f5f8ff;border:1px solid #dfe9ff;border-radius:12px;font-size:12.5px;color:#41537a;line-height:1.8;text-align:right}"
      + ".akar-update-btn{display:inline-flex;align-items:center;justify-content:center;gap:9px;width:100%;border:0;border-radius:14px;padding:14px 20px;font-family:inherit;font-weight:800;font-size:15px;cursor:pointer;color:#fff;background:linear-gradient(90deg,#1a6dff,#0e4bb8);box-shadow:0 8px 22px rgba(26,109,255,.35)}"
      + ".akar-update-btn:hover{filter:brightness(1.08)}"
      + ".akar-update-btn[disabled]{cursor:default;filter:grayscale(.25);opacity:.85}"
      + ".akar-update-hint{margin:14px 0 0;font-size:11.5px;color:#8b98ad;line-height:1.7}";
    var s = document.createElement("style");
    s.id = "akar-update-styles";
    s.textContent = css;
    document.head.appendChild(s);
  }

  var UPDATE_SVG = {
    rocket: '<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>',
    arrowLeft: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#41537a" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>',
    download: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
    spinner: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.9s" repeatCount="indefinite"/></path></svg>'
  };

  function resolveSetupUrl(info) {
    return info.setupUrl && /^https?:/i.test(info.setupUrl) ? info.setupUrl : (PLATFORM + (info.setupUrl || "/downloads/AkarProMaxOffice-Setup.exe"));
  }

  function triggerSetupDownload(setupUrl) {
    try {
      var a = document.createElement("a");
      a.href = setupUrl;
      a.download = "AkarProMaxOffice-Setup.exe";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      try { window.open(setupUrl, "_blank"); } catch (e2) {}
    }
  }

  // Mandatory update: the app is not usable until the new version is
  // installed. Full-screen gate, no close button, focus trapped behind it.
  function showUpdateGate(info) {
    if (document.getElementById("akar-update-gate")) return;
    injectUpdateStyles();
    var bar = document.getElementById("akar-update-bar");
    if (bar) bar.remove();
    var setupUrl = resolveSetupUrl(info);
    var gate = document.createElement("div");
    gate.id = "akar-update-gate";
    gate.className = "akar-update-gate";
    gate.innerHTML =
      '<div class="akar-update-card" role="alertdialog" aria-modal="true" aria-labelledby="akar-up-title">' +
        '<div class="akar-update-ico">' + UPDATE_SVG.rocket + '</div>' +
        '<h1 id="akar-up-title">يجب تحديث البرنامج</h1>' +
        '<p class="akar-up-msg">تتوفر نسخة أحدث من تطبيق عقار بروماكس المكتبي.<br>لا يمكن متابعة استخدام البرنامج قبل تثبيت التحديث.</p>' +
        '<div class="akar-update-vers">' +
          '<b>نسختك ' + INSTALLED_VERSION + '</b>' + UPDATE_SVG.arrowLeft +
          '<b class="akar-up-new">الجديدة ' + info.version + '</b>' +
        '</div>' +
        (info.notes ? '<div class="akar-update-notes">' + info.notes + '</div>' : '') +
        '<button class="akar-update-btn" id="akar-update-now">' + UPDATE_SVG.download + '<span>تنزيل وتثبيت التحديث الآن</span></button>' +
        '<p class="akar-update-hint">بعد اكتمال التنزيل شغّل ملف AkarProMaxOffice-Setup.exe،<br>وسيقوم بالترقية مباشرة ثم أعد فتح البرنامج.</p>' +
      '</div>';
    document.body.appendChild(gate);

    document.getElementById("akar-update-now").addEventListener("click", function () {
      triggerSetupDownload(setupUrl);
      var btn = document.getElementById("akar-update-now");
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = UPDATE_SVG.spinner + '<span>جارٍ التنزيل... شغّل ملف التثبيت بعد اكتماله</span>';
      }
    });
  }

  // Optional update: dismissible top bar; the app keeps working.
  function showUpdateBar(info) {
    if (document.getElementById("akar-update-bar") || document.getElementById("akar-update-gate")) return;
    injectUpdateStyles();
    var setupUrl = resolveSetupUrl(info);
    var bar = document.createElement("div");
    bar.id = "akar-update-bar";
    bar.className = "akar-update-bar";
    bar.innerHTML =
      "<b>تحديث جديد متوفر (" + info.version + ")</b>" +
      "<span>" + (info.notes || "يوصى بالتحديث للحصول على آخر التحسينات.") + "</span>" +
      '<button id="akar-update-now">تنزيل وتثبيت التحديث</button>' +
      '<button class="akar-update-x" id="akar-update-skip" title="لاحقًا">✕</button>';
    document.body.appendChild(bar);

    document.getElementById("akar-update-now").addEventListener("click", function () {
      // Trigger the installer download; the WebView hands it to the OS. The
      // user runs it and Inno Setup upgrades in place (same AppId).
      triggerSetupDownload(setupUrl);
      var btn = document.getElementById("akar-update-now");
      if (btn) { btn.textContent = "يُنزّل... شغّل الملف بعد اكتماله"; btn.disabled = true; }
    });

    var skip = document.getElementById("akar-update-skip");
    if (skip) skip.addEventListener("click", function () {
      try { ls("set", "akar_update_skipped", info.version); } catch (e) {}
      bar.remove();
    });
  }

  function checkForUpdate() {
    // cache-bust so every launch sees the latest manifest. Resolves true when
    // a mandatory update gates the app (boot must not continue past it).
    return fetch(PLATFORM + "/office-app/version.json?t=" + Date.now(), { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (info) {
        if (!info || !info.version) return false;
        if (cmpVersion(info.version, INSTALLED_VERSION) <= 0) return false; // up to date
        if (info.mandatory) {
          showUpdateGate(info);
          return true;
        }
        if (ls("get", "akar_update_skipped") === info.version) return false;
        showUpdateBar(info);
        return false;
      })
      .catch(function () { return false; });
  }

  function boot() {
    // Clear seeded demo listings before anything renders. If rows were removed
    // and the bundle has already painted them this session, reload once so the
    // portal re-reads the now-clean store (guarded so it never loops).
    var purged = purgeDemoData();
    if (purged) {
      try {
        if (!window.sessionStorage.getItem("akar_demo_purged")) {
          window.sessionStorage.setItem("akar_demo_purged", "1");
          window.location.reload();
          return;
        }
      } catch (e) {}
    }
    checkForUpdate().then(function (gated) {
      if (gated) return; // mandatory update: the gate replaces the app
      if (isLoggedIn()) {
        mountChip();
        ensureProfile();
        // Pull the office's published properties down so they show in the
        // portal. One guarded reload lets the list re-read them this session.
        syncPlatformProperties().then(function (changed) {
          if (!changed) return;
          try {
            if (!window.sessionStorage.getItem("akar_props_synced")) {
              window.sessionStorage.setItem("akar_props_synced", "1");
              window.location.reload();
            }
          } catch (e) {}
        });
      } else {
        showLogin();
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
