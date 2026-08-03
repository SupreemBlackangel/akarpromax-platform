"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { citiesForCountry, countryOptions, detectCityByName } from "@/src/data/locations";
import {
  detectCountryByLanguage,
  detectCountryByTimezone,
  getCachedLocation,
  setCachedLocation,
} from "@/src/location-utils";
import type { LocationInfo } from "@/src/location-utils";
import type { Locale, ViewerContext } from "@/src/types/site";

type Props = {
  locale: Locale;
  open: boolean;
  initialMode?: "login" | "register";
  viewer: ViewerContext;
  onClose: () => void;
  onAuthenticated: (viewer: ViewerContext) => void;
};

type Mode = "login" | "register";
type RegisterStep = 0 | 1 | 2;

type AuthUser = {
  id: string;
  email: string;
  name?: string | null;
  phone?: string | null;
  role?: string;
  isActive?: boolean;
  createdAt?: string;
  permissions?: string[];
};

type RegisterResponse = {
  user?: AuthUser;
  challenge?: { id: string; channel: string; expiresAt: string };
  verificationCode?: string;
  error?: string;
};

type LoginResponse = {
  token?: string;
  user?: AuthUser;
  error?: string;
};

type VerifyResponse = {
  verified?: boolean;
  error?: string;
};

const LABELS: Record<Locale, {
  aria: string;
  close: string;
  loginTab: string;
  registerTab: string;
  titleLogin: string;
  titleRegister: string;
  titleVerify: string;
  titleAccount: string;
  name: string;
  email: string;
  phone: string;
  password: string;
  country: string;
  city: string;
  countryPlaceholder: string;
  cityPlaceholder: string;
  identifier: string;
  identifierHint: string;
  loginSubmit: string;
  registerSubmit: string;
  verifySubmit: string;
  cancel: string;
  back: string;
  next: string;
  stepAccount: string;
  stepLocation: string;
  stepVerify: string;
  locationTitle: string;
  locationHint: string;
  detectLocation: string;
  detectingLocation: string;
  locationError: string;
  locationDetected: string;
  verifyHint: string;
  verifyDevHint: string;
  verifyPlaceholder: string;
  haveAccount: string;
  noAccount: string;
  switchLogin: string;
  switchRegister: string;
  logout: string;
  memberSince: string;
  notVerified: string;
  emailError: string;
  phoneError: string;
  passwordError: string;
  nameError: string;
  missingError: string;
  genericError: string;
  invalidCredentials: string;
  alreadyRegistered: string;
  challengeExpired: string;
  tooManyAttempts: string;
  wrongCode: string;
  welcome: string;
}> = {
  ar: {
    aria: "نافذة الحساب",
    close: "إغلاق النافذة",
    loginTab: "دخول",
    registerTab: "تسجيل",
    titleLogin: "تسجيل الدخول",
    titleRegister: "إنشاء حساب جديد",
    titleVerify: "تأكيد حسابك",
    titleAccount: "حسابي",
    name: "الاسم الكامل",
    email: "البريد الإلكتروني",
    phone: "رقم الهاتف",
    password: "كلمة المرور",
    country: "الدولة",
    city: "المدينة",
    countryPlaceholder: "اختر الدولة",
    cityPlaceholder: "اختر المدينة",
    identifier: "البريد أو الهاتف",
    identifierHint: "بريدك الإلكتروني أو رقم هاتفك المسجل",
    loginSubmit: "دخول",
    registerSubmit: "إنشاء الحساب",
    verifySubmit: "تأكيد الرمز",
    cancel: "إلغاء",
    back: "السابق",
    next: "التالي",
    stepAccount: "الحساب",
    stepLocation: "الموقع",
    stepVerify: "التحقق",
    locationTitle: "حدّد موقعك",
    locationHint: "نكتشف موقعك تلقائيًا لنضع دولتك ومدينتك، أو اخترهما يدويًا.",
    detectLocation: "كشف الموقع تلقائيًا",
    detectingLocation: "جارٍ الكشف...",
    locationError: "تعذر كشف الموقع، حدّده يدويًا",
    locationDetected: "تم كشف موقعك",
    verifyHint: "أدخل رمز التحقق المكوّن من 6 أرقام الذي أرسلناه إلى بريدك.",
    verifyDevHint: "وضع التطوير: رمزك هو",
    verifyPlaceholder: "000000",
    haveAccount: "لديك حساب بالفعل؟",
    noAccount: "ليس لديك حساب؟",
    switchLogin: "سجّل الدخول",
    switchRegister: "أنشئ حسابًا",
    logout: "تسجيل الخروج",
    memberSince: "عضو جديد",
    notVerified: "بانتظار التحقق",
    emailError: "بريد إلكتروني غير صالح",
    phoneError: "رقم هاتف غير صالح",
    passwordError: "كلمة المرور 8 أحرف على الأقل",
    nameError: "أدخل اسمًا صحيحًا",
    missingError: "أكمل جميع الحقول المطلوبة",
    genericError: "حدث خطأ، حاول مجددًا",
    invalidCredentials: "بيانات الدخول غير صحيحة",
    alreadyRegistered: "هذا البريد أو الهاتف مسجل مسبقًا",
    challengeExpired: "انتهت صلاحية الرمز، سجّل من جديد",
    tooManyAttempts: "محاولات كثيرة، أعد التسجيل",
    wrongCode: "الرمز غير صحيح",
    welcome: "أهلًا بك",
  },
  en: {
    aria: "Account dialog",
    close: "Close dialog",
    loginTab: "Log in",
    registerTab: "Register",
    titleLogin: "Log in",
    titleRegister: "Create an account",
    titleVerify: "Verify your account",
    titleAccount: "My account",
    name: "Full name",
    email: "Email",
    phone: "Phone number",
    password: "Password",
    country: "Country",
    city: "City",
    countryPlaceholder: "Select country",
    cityPlaceholder: "Select city",
    identifier: "Email or phone",
    identifierHint: "Your registered email or phone number",
    loginSubmit: "Log in",
    registerSubmit: "Create account",
    verifySubmit: "Verify code",
    cancel: "Cancel",
    back: "Back",
    next: "Next",
    stepAccount: "Account",
    stepLocation: "Location",
    stepVerify: "Verify",
    locationTitle: "Set your location",
    locationHint: "We detect your location automatically to fill your country and city, or choose them manually.",
    detectLocation: "Detect location automatically",
    detectingLocation: "Detecting...",
    locationError: "Could not detect location, set it manually",
    locationDetected: "Location detected",
    verifyHint: "Enter the 6-digit verification code we sent to your email.",
    verifyDevHint: "Development mode: your code is",
    verifyPlaceholder: "000000",
    haveAccount: "Already have an account?",
    noAccount: "Don't have an account?",
    switchLogin: "Log in",
    switchRegister: "Create one",
    logout: "Sign out",
    memberSince: "New member",
    notVerified: "Pending verification",
    emailError: "Invalid email address",
    phoneError: "Invalid phone number",
    passwordError: "Password must be at least 8 characters",
    nameError: "Enter a valid name",
    missingError: "Please fill in all required fields",
    genericError: "Something went wrong, try again",
    invalidCredentials: "Incorrect email/phone or password",
    alreadyRegistered: "This email or phone is already registered",
    challengeExpired: "Verification expired, please register again",
    tooManyAttempts: "Too many attempts, please register again",
    wrongCode: "Incorrect code",
    welcome: "Welcome",
  },
  tr: {
    aria: "Hesap penceresi",
    close: "Pencereyi kapat",
    loginTab: "Giriş",
    registerTab: "Kayıt",
    titleLogin: "Giriş yap",
    titleRegister: "Hesap oluştur",
    titleVerify: "Hesabını doğrula",
    titleAccount: "Hesabım",
    name: "Ad soyad",
    email: "E-posta",
    phone: "Telefon numarası",
    password: "Şifre",
    country: "Ülke",
    city: "Şehir",
    countryPlaceholder: "Ülke seçin",
    cityPlaceholder: "Şehir seçin",
    identifier: "E-posta veya telefon",
    identifierHint: "Kayıtlı e-posta adresiniz veya telefonunuz",
    loginSubmit: "Giriş yap",
    registerSubmit: "Hesap oluştur",
    verifySubmit: "Kodu doğrula",
    cancel: "İptal",
    back: "Geri",
    next: "İleri",
    stepAccount: "Hesap",
    stepLocation: "Konum",
    stepVerify: "Doğrulama",
    locationTitle: "Konumunuzu ayarlayın",
    locationHint: "Ülkenizi ve şehrinizi doldurmak için konumunuzu otomatik algılıyoruz, veya elle seçin.",
    detectLocation: "Konumu otomatik algıla",
    detectingLocation: "Algılanıyor...",
    locationError: "Konum algılanamadı, elle ayarlayın",
    locationDetected: "Konumunuz algılandı",
    verifyHint: "E-postanıza gönderdiğimiz 6 haneli doğrulama kodunu girin.",
    verifyDevHint: "Geliştirme modu: kodunuz",
    verifyPlaceholder: "000000",
    haveAccount: "Zaten hesabınız var mı?",
    noAccount: "Hesabınız yok mu?",
    switchLogin: "Giriş yapın",
    switchRegister: "Oluşturun",
    logout: "Çıkış yap",
    memberSince: "Yeni üye",
    notVerified: "Doğrulama bekliyor",
    emailError: "Geçersiz e-posta adresi",
    phoneError: "Geçersiz telefon numarası",
    passwordError: "Şifre en az 8 karakter olmalı",
    nameError: "Geçerli bir ad girin",
    missingError: "Lütfen tüm zorunlu alanları doldurun",
    genericError: "Bir hata oluştu, tekrar deneyin",
    invalidCredentials: "E-posta/telefon veya şifre hatalı",
    alreadyRegistered: "Bu e-posta veya telefon zaten kayıtlı",
    challengeExpired: "Doğrulama süresi doldu, lütfen yeniden kayıt olun",
    tooManyAttempts: "Çok fazla deneme, lütfen yeniden kayıt olun",
    wrongCode: "Kod hatalı",
    welcome: "Hoş geldin",
  },
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?\d{7,15}$/;
const FALLBACK_COUNTRY = "om";

function currentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation not supported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 8000,
      maximumAge: 300000,
    });
  });
}

function toViewer(user: AuthUser): ViewerContext {
  return {
    authenticated: true,
    email: user.email,
    displayName: user.name || user.email,
    role: user.role ?? "viewer",
    countryCode: null,
    permissions: user.permissions ?? [],
  };
}

function bearerHeader(): Record<string, string> {
  try {
    const token = localStorage.getItem("akar_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

export default function AccountDialog({
  locale,
  open,
  initialMode = "login",
  viewer,
  onClose,
  onAuthenticated,
}: Props) {
  const labels = LABELS[locale];
  const dialogId = useId();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [registerStep, setRegisterStep] = useState<RegisterStep>(0);
  const [challengeId, setChallengeId] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [countryCode, setCountryCode] = useState(FALLBACK_COUNTRY);
  const [city, setCity] = useState("");
  const [code, setCode] = useState("");
  const [identifier, setIdentifier] = useState("");

  const [loading, setLoading] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [locationDetected, setLocationDetected] = useState(false);
  const [error, setError] = useState("");

  const rootRef = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const firstInputRef = useRef<HTMLInputElement | null>(null);
  const mountedRef = useRef(true);
  const [prevOpen, setPrevOpen] = useState(open);

  const cities = citiesForCountry(countryCode);

  if (prevOpen !== open) {
    setPrevOpen(open);
    if (open) {
      setMode(initialMode);
      setRegisterStep(0);
      setError("");
      setLocationError("");
      setLocationDetected(false);
      setCode("");
      setChallengeId("");
      setDevCode(null);
    }
  }

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const focusTarget = firstInputRef.current ?? closeRef.current;
    focusTarget?.focus();
  }, [open, registerStep, mode]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  const switchMode = useCallback((next: Mode) => {
    setMode(next);
    setRegisterStep(0);
    setError("");
    setLocationError("");
    setLocationDetected(false);
    setCode("");
    setChallengeId("");
    setDevCode(null);
  }, []);

  const setFieldError = useCallback((key: "emailError" | "phoneError" | "passwordError" | "nameError" | "missingError" | "genericError" | "invalidCredentials" | "alreadyRegistered" | "challengeExpired" | "tooManyAttempts" | "wrongCode") => {
    setError(labels[key]);
  }, [labels]);

  const validateAccountStep = useCallback(() => {
    if (name.trim().length < 2) {
      setFieldError("nameError");
      return false;
    }
    if (!EMAIL_PATTERN.test(email.trim())) {
      setFieldError("emailError");
      return false;
    }
    if (!PHONE_PATTERN.test(phone.trim())) {
      setFieldError("phoneError");
      return false;
    }
    if (password.length < 8) {
      setFieldError("passwordError");
      return false;
    }
    return true;
  }, [name, email, phone, password, setFieldError]);

  const applyDetected = useCallback((info: LocationInfo) => {
    const candidate = info.countryCode || info.country.toLowerCase();
    const known = countryOptions.some((option) => option.id === candidate) ? candidate : "";
    const code = known || detectCountryByTimezone() || detectCountryByLanguage() || FALLBACK_COUNTRY;
    setCachedLocation({ ...info, country: code, countryCode: code });
    setCountryCode(code);
    setCity(detectCityByName(code, info.city));
    setLocationDetected(true);
    setLocationError("");
  }, []);

  const handleDetectLocation = async () => {
    setDetectingLocation(true);
    setLocationError("");
    setLocationDetected(false);
    try {
      const geo = await currentPosition();
      const { latitude, longitude } = geo.coords;
      const cached = getCachedLocation(latitude, longitude);
      if (cached) {
        if (!mountedRef.current) return;
        applyDetected(cached);
        return;
      }
      const res = await fetch(`/api/location?lat=${latitude}&lng=${longitude}`);
      if (!res.ok) throw new Error("Geocoding failed");
      const data: LocationInfo = await res.json();
      if (!mountedRef.current) return;
      applyDetected(data);
    } catch {
      if (!mountedRef.current) return;
      setLocationError(labels.locationError);
      const code = detectCountryByTimezone() || detectCountryByLanguage();
      if (code) {
        setCountryCode(code);
        setCity("");
      }
    } finally {
      if (mountedRef.current) setDetectingLocation(false);
    }
  };

  const handleAccountNext = () => {
    if (!validateAccountStep()) return;
    setError("");
    setRegisterStep(1);
  };

  const handleRegister = async () => {
    if (!validateAccountStep()) return;

    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          password,
          countryCode,
          city: city || null,
        }),
      });
      const data: RegisterResponse = await response.json();
      if (!response.ok) {
        if (data.error === "already_registered") return setFieldError("alreadyRegistered");
        return setFieldError("genericError");
      }
      if (data.challenge) {
        setChallengeId(data.challenge.id);
        setDevCode(typeof data.verificationCode === "string" ? data.verificationCode : null);
        setRegisterStep(2);
      } else if (data.user) {
        onAuthenticated(toViewer(data.user));
        onClose();
      }
    } catch {
      if (!mountedRef.current) return;
      setFieldError("genericError");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!/^\d{6}$/.test(code.trim())) return setFieldError("wrongCode");

    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId, code: code.trim() }),
      });
      const data: VerifyResponse = await response.json();
      if (!response.ok) {
        if (data.error === "challenge_expired") return setFieldError("challengeExpired");
        if (data.error === "too_many_attempts") return setFieldError("tooManyAttempts");
        if (data.error === "wrong_code") return setFieldError("wrongCode");
        return setFieldError("genericError");
      }
      const me = await fetch("/api/auth/me", {
        cache: "no-store",
        headers: bearerHeader(),
      });
      const meData = await me.json();
      if (meData.authenticated && meData.user) {
        onAuthenticated(toViewer(meData.user as AuthUser));
      } else {
        onAuthenticated({
          authenticated: true,
          email,
          displayName: name,
          role: "viewer",
          countryCode: countryCode || null,
          permissions: [],
        });
      }
      onClose();
    } catch {
      if (!mountedRef.current) return;
      setFieldError("genericError");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!identifier.trim() || !password) return setFieldError("missingError");

    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim(), password }),
      });
      const data: LoginResponse = await response.json();
      if (!response.ok) {
        if (data.error === "invalid_credentials") return setFieldError("invalidCredentials");
        return setFieldError("genericError");
      }
      if (data.user) {
        if (data.token) {
          try {
            localStorage.setItem("akar_token", data.token);
          } catch {
            // Private mode: session cookie still covers authentication.
          }
        }
        onAuthenticated(toViewer(data.user));
      }
      onClose();
    } catch {
      if (!mountedRef.current) return;
      setFieldError("genericError");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    setError("");
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Session cookie is cleared by the server route; still reset locally.
    }
    try {
      localStorage.removeItem("akar_token");
    } catch {
      // Private mode: nothing to clear.
    }
    onAuthenticated({ authenticated: false, email: null, displayName: "Guest", role: "guest", countryCode: null, permissions: [] });
    onClose();
    if (mountedRef.current) setLoading(false);
  };

  if (!open) return null;

  const loggedIn = viewer.authenticated;
  const stepTitles = [labels.stepAccount, labels.stepLocation, labels.stepVerify];

  return (
    <div className="account-backdrop" aria-hidden="true">
      <div
        ref={rootRef}
        id={dialogId}
        className="account-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={labels.aria}
      >
        <button
          ref={closeRef}
          className="account-close"
          type="button"
          aria-label={labels.close}
          onClick={onClose}
        >
          ×
        </button>

        {loggedIn ? (
          <div className="account-panel">
            <span className="account-avatar" aria-hidden="true">
              {(viewer.displayName || "A").slice(0, 1).toUpperCase()}
            </span>
            <p className="account-kicker">{labels.welcome}</p>
            <h3>{viewer.displayName}</h3>
            <p className="account-subline">{viewer.email}</p>
            <p className="account-chip">{viewer.role === "guest" ? labels.notVerified : labels.memberSince}</p>
            <button className="account-logout" type="button" onClick={handleLogout} disabled={loading}>
              {labels.logout}
            </button>
          </div>
        ) : (
          <div className="account-panel">
            <div className="account-tabs" role="tablist" aria-label={labels.aria}>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "login"}
                className={mode === "login" ? "account-tab active" : "account-tab"}
                onClick={() => switchMode("login")}
              >
                {labels.loginTab}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "register"}
                className={mode === "register" ? "account-tab active" : "account-tab"}
                onClick={() => switchMode("register")}
              >
                {labels.registerTab}
              </button>
            </div>

            {mode === "register" && (
              <ol className="account-steps" aria-label={labels.titleRegister}>
                {stepTitles.map((title, index) => {
                  const step = index as RegisterStep;
                  const current = registerStep === step;
                  const done = registerStep > step;
                  return (
                    <li key={title} className={current ? "active" : done ? "done" : ""} aria-current={current ? "step" : undefined}>
                      <span className="account-step-num">{done ? "✓" : index + 1}</span>
                      <span className="account-step-label">{title}</span>
                    </li>
                  );
                })}
              </ol>
            )}

            {mode === "login" ? (
              <form
                className="account-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleLogin();
                }}
              >
                <h3>{labels.titleLogin}</h3>
                <div className="account-field">
                  <label htmlFor={`${dialogId}-identifier`}>{labels.identifier}</label>
                  <input
                    id={`${dialogId}-identifier`}
                    ref={firstInputRef}
                    type="text"
                    autoComplete="username"
                    value={identifier}
                    onChange={(event) => setIdentifier(event.target.value)}
                    placeholder={labels.identifierHint}
                  />
                </div>
                <div className="account-field">
                  <label htmlFor={`${dialogId}-login-password`}>{labels.password}</label>
                  <input
                    id={`${dialogId}-login-password`}
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </div>
                {error && <p className="account-error" role="alert">{error}</p>}
                <button className="account-submit account-submit-wide" type="submit" disabled={loading}>
                  {loading ? "…" : labels.loginSubmit}
                </button>
                <p className="account-switch">
                  {labels.haveAccount} <button type="button" onClick={() => switchMode("register")}>{labels.switchRegister}</button>
                </p>
              </form>
            ) : registerStep === 0 ? (
              <form
                className="account-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  handleAccountNext();
                }}
              >
                <h3>{labels.titleRegister}</h3>
                <div className="account-field">
                  <label htmlFor={`${dialogId}-name`}>{labels.name}</label>
                  <input
                    id={`${dialogId}-name`}
                    ref={firstInputRef}
                    type="text"
                    autoComplete="name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                  />
                </div>
                <div className="account-grid">
                  <div className="account-field">
                    <label htmlFor={`${dialogId}-email`}>{labels.email}</label>
                    <input
                      id={`${dialogId}-email`}
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                    />
                  </div>
                  <div className="account-field">
                    <label htmlFor={`${dialogId}-phone`}>{labels.phone}</label>
                    <input
                      id={`${dialogId}-phone`}
                      type="tel"
                      autoComplete="tel"
                      inputMode="tel"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                    />
                  </div>
                </div>
                <div className="account-field">
                  <label htmlFor={`${dialogId}-password`}>{labels.password}</label>
                  <input
                    id={`${dialogId}-password`}
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </div>
                {error && <p className="account-error" role="alert">{error}</p>}
                <div className="account-actions account-actions-end">
                  <button className="account-submit" type="submit">
                    {labels.next}
                  </button>
                </div>
                <p className="account-switch">
                  {labels.noAccount} <button type="button" onClick={() => switchMode("login")}>{labels.switchLogin}</button>
                </p>
              </form>
            ) : registerStep === 1 ? (
              <form
                className="account-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleRegister();
                }}
              >
                <h3>{labels.locationTitle}</h3>
                <p className="account-location-hint">{labels.locationHint}</p>
                <button
                  className="account-detect"
                  type="button"
                  onClick={() => void handleDetectLocation()}
                  disabled={detectingLocation}
                >
                  {detectingLocation ? (
                    <span className="account-spinner" aria-hidden="true" />
                  ) : (
                    <span aria-hidden="true">⌖</span>
                  )}
                  {detectingLocation ? labels.detectingLocation : labels.detectLocation}
                </button>
                {locationError && <p className="account-error" role="alert">{locationError}</p>}
                {locationDetected && !locationError && (
                  <p className="account-detect-success" role="status">✓ {labels.locationDetected}</p>
                )}
                <div className="account-grid">
                  <div className="account-field">
                    <label htmlFor={`${dialogId}-country`}>{labels.country}</label>
                    <select
                      id={`${dialogId}-country`}
                      value={countryCode}
                      onChange={(event) => {
                        setCountryCode(event.target.value);
                        setCity("");
                        setLocationDetected(false);
                      }}
                    >
                      {countryOptions.map((option) => (
                        <option key={option.id} value={option.id}>{option.names[locale]}</option>
                      ))}
                    </select>
                  </div>
                  <div className="account-field">
                    <label htmlFor={`${dialogId}-city`}>{labels.city}</label>
                    <select
                      id={`${dialogId}-city`}
                      value={city}
                      onChange={(event) => {
                        setCity(event.target.value);
                        setLocationDetected(false);
                      }}
                    >
                      <option value="">{labels.cityPlaceholder}</option>
                      {cities.map((option) => (
                        <option key={option.id} value={option.id}>{option.names[locale]}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {error && <p className="account-error" role="alert">{error}</p>}
                <div className="account-actions">
                  <button className="account-cancel" type="button" onClick={() => setRegisterStep(0)}>
                    {labels.back}
                  </button>
                  <button className="account-submit" type="submit" disabled={loading}>
                    {loading ? "…" : labels.registerSubmit}
                  </button>
                </div>
              </form>
            ) : (
              <div className="account-form">
                <h3>{labels.titleVerify}</h3>
                <p className="account-location-hint">{labels.verifyHint}</p>
                {devCode && (
                  <p className="account-dev-hint">
                    {labels.verifyDevHint} <b>{devCode}</b>
                  </p>
                )}
                <div className="account-field">
                  <label htmlFor={`${dialogId}-code`}>{labels.verifyPlaceholder}</label>
                  <input
                    id={`${dialogId}-code`}
                    ref={firstInputRef}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={code}
                    onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
                    placeholder={labels.verifyPlaceholder}
                  />
                </div>
                {error && <p className="account-error" role="alert">{error}</p>}
                <div className="account-actions">
                  <button className="account-cancel" type="button" onClick={() => setRegisterStep(1)}>
                    {labels.back}
                  </button>
                  <button className="account-submit" type="button" onClick={() => void handleVerify()} disabled={loading}>
                    {loading ? "…" : labels.verifySubmit}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
