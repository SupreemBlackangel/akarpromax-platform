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

  function boot() {
    if (isLoggedIn()) mountChip();
    else showLogin();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
