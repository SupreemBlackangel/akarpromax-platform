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
      + ".akar-acct-chip button{border:0;background:#eef3fb;color:#c0392b;font-size:11px;font-weight:800;font-family:inherit;padding:5px 10px;border-radius:999px;cursor:pointer}"
      + ".akar-acct-chip button:hover{background:#fdecec}";
    var s = document.createElement("style");
    s.id = "akar-office-auth-styles";
    s.textContent = css;
    document.head.appendChild(s);
  }

  // ---- login overlay ------------------------------------------------------
  function showLogin() {
    if (document.getElementById("akar-auth-backdrop")) return;
    injectStyles();
    var wrap = document.createElement("div");
    wrap.id = "akar-auth-backdrop";
    wrap.className = "akar-auth-backdrop";
    wrap.innerHTML =
      '<div class="akar-auth-card" role="dialog" aria-label="تسجيل الدخول">' +
      '  <div class="akar-auth-logo">' +
      '    <img src="' + PLATFORM + '/icons/icon-192.png" alt="" onerror="this.style.display=\'none\'"/>' +
      "    <div><b>عقار بروماكس</b><span>المكتب العقاري</span></div>" +
      "  </div>" +
      '  <p class="akar-auth-h">تسجيل الدخول بحساب المنصة</p>' +
      '  <p class="akar-auth-sub">استخدم بريد وكلمة مرور حسابك في عقار بروماكس لربط المكتب بالمنصة تلقائيًا: رفع العقارات، الأخبار، والفرص حسب منطقتك.</p>' +
      '  <div class="akar-auth-err" id="akar-auth-err"></div>' +
      '  <div class="akar-auth-field"><label>البريد الإلكتروني أو الهاتف</label><input id="akar-auth-id" type="text" autocomplete="username" dir="ltr"/></div>' +
      '  <div class="akar-auth-field"><label>كلمة المرور</label><input id="akar-auth-pw" type="password" autocomplete="current-password"/></div>' +
      '  <button class="akar-auth-btn" id="akar-auth-go">تسجيل الدخول</button>' +
      '  <p class="akar-auth-foot">ليس لديك حساب؟ <a href="' + PLATFORM + '/register" target="_blank" rel="noopener">أنشئ حسابًا</a></p>' +
      "</div>";
    document.body.appendChild(wrap);

    var idEl = document.getElementById("akar-auth-id");
    var pwEl = document.getElementById("akar-auth-pw");
    var btn = document.getElementById("akar-auth-go");
    var err = document.getElementById("akar-auth-err");

    function fail(msg) {
      err.textContent = msg;
      err.style.display = "block";
      btn.disabled = false;
      btn.textContent = "تسجيل الدخول";
    }

    function submit() {
      var identifier = (idEl.value || "").trim();
      var password = pwEl.value || "";
      if (!identifier || !password) { fail("أدخل البريد/الهاتف وكلمة المرور."); return; }
      btn.disabled = true;
      btn.textContent = "جارٍ الدخول...";
      err.style.display = "none";
      fetch(PLATFORM + "/api/program/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier, password: password }),
      })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (res) {
          if (res.ok && res.j && res.j.success && res.j.token) {
            persistSession(res.j.token, res.j.user || null);
            wrap.remove();
            mountChip();
            // Reload so the office UI picks up the new token everywhere.
            setTimeout(function () { try { window.location.reload(); } catch (e) {} }, 150);
          } else {
            fail((res.j && res.j.message) || "تعذّر تسجيل الدخول. تحقق من البيانات والاتصال.");
          }
        })
        .catch(function () { fail("تعذّر الاتصال بالمنصة. تأكد من الإنترنت."); });
    }

    btn.addEventListener("click", submit);
    pwEl.addEventListener("keydown", function (e) { if (e.key === "Enter") submit(); });
    setTimeout(function () { try { idEl.focus(); } catch (e) {} }, 60);
  }

  // ---- account chip (logout) ---------------------------------------------
  function mountChip() {
    var existing = document.getElementById("akar-acct-chip");
    if (existing) existing.remove();
    if (!isLoggedIn()) return;
    injectStyles();
    var profile = {};
    try { profile = JSON.parse(ls("get", "akar_platform_profile") || "{}"); } catch (e) {}
    var name = profile.displayName || profile.name || profile.email || "حساب المنصة";
    var chip = document.createElement("div");
    chip.id = "akar-acct-chip";
    chip.className = "akar-acct-chip";
    chip.innerHTML = '<small title="' + name + '">🟢 ' + name + "</small><button>خروج</button>";
    chip.querySelector("button").addEventListener("click", function () {
      clearSession();
      chip.remove();
      showLogin();
    });
    document.body.appendChild(chip);
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
      + ".akar-update-bar .akar-update-x{background:transparent;color:#fff;font-size:16px;padding:4px 8px}";
    var s = document.createElement("style");
    s.id = "akar-update-styles";
    s.textContent = css;
    document.head.appendChild(s);
  }

  function showUpdateBar(info) {
    if (document.getElementById("akar-update-bar")) return;
    injectUpdateStyles();
    var setupUrl = info.setupUrl && /^https?:/i.test(info.setupUrl) ? info.setupUrl : (PLATFORM + (info.setupUrl || "/downloads/AkarProMaxOffice-Setup.exe"));
    var bar = document.createElement("div");
    bar.id = "akar-update-bar";
    bar.className = "akar-update-bar";
    bar.innerHTML =
      "<b>تحديث جديد متوفر (" + info.version + ")</b>" +
      "<span>" + (info.notes || "يوصى بالتحديث للحصول على آخر التحسينات.") + "</span>" +
      '<button id="akar-update-now">تنزيل وتثبيت التحديث</button>' +
      (info.mandatory ? "" : '<button class="akar-update-x" id="akar-update-skip" title="لاحقًا">✕</button>');
    document.body.appendChild(bar);

    document.getElementById("akar-update-now").addEventListener("click", function () {
      // Trigger the installer download; the WebView hands it to the OS. The
      // user runs it and Inno Setup upgrades in place (same AppId).
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
    // cache-bust so every launch sees the latest manifest.
    fetch(PLATFORM + "/office-app/version.json?t=" + Date.now(), { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (info) {
        if (!info || !info.version) return;
        if (cmpVersion(info.version, INSTALLED_VERSION) <= 0) return; // up to date
        if (!info.mandatory && ls("get", "akar_update_skipped") === info.version) return;
        showUpdateBar(info);
      })
      .catch(function () {});
  }

  function boot() {
    checkForUpdate();
    if (isLoggedIn()) mountChip();
    else showLogin();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
