"use client";
/* eslint-disable @next/next/no-img-element -- Local object URL previews are not optimizable. */

import { useCallback, useEffect, useRef, useState } from "react";
import { AD_PLACEMENTS } from "@/src/constants/advertising";

type Locale = "ar" | "en" | "tr";
type Step = 0 | 1 | 2;

type Props = {
  locale: Locale;
  open: boolean;
  placement: string;
  countryCode: string;
  /** Canonical frame id (HERO, LEFT_01, ...) shown to the visitor and stored with the request. */
  canonical?: string;
  /** Standard ad-layout family (home, properties, ...) of the page the slot was clicked on. */
  family?: string;
  city?: string;
  path?: string;
  onClose: () => void;
};

type CountryOption = {
  code: string;
  nameAr: string;
  nameEn: string;
  nameTr: string;
  isActive?: boolean;
  displayOrder?: number;
};

type Labels = {
  aria: string;
  close: string;
  kicker: string;
  title: string;
  sub: string;
  steps: readonly [string, string, string];
  spot: string;
  countries: string;
  countriesHint: string;
  countriesLoading: string;
  countriesError: string;
  name: string;
  namePlaceholder: string;
  email: string;
  emailPlaceholder: string;
  phone: string;
  phonePlaceholder: string;
  targetUrl: string;
  targetUrlPlaceholder: string;
  descriptionsTitle: string;
  descriptionArLabel: string;
  descriptionEnLabel: string;
  descriptionTrLabel: string;
  optional: string;
  optionalHint: string;
  upload: string;
  uploadSub: string;
  review: string;
  note: string;
  back: string;
  next: string;
  submit: string;
  submitting: string;
  successTitle: string;
  successBody: string;
  done: string;
  errorCountry: string;
  errorName: string;
  errorEmail: string;
  errorPhone: string;
  errorUrl: string;
  errorDescription: string;
  errorImage: string;
  errorRequired: string;
  errorNetwork: string;
};

const LABELS: Record<Locale, Labels> = {
  ar: {
    aria: "طلب مساحة إعلانية",
    close: "إغلاق",
    kicker: "الإعلان على عقار بروماكس",
    title: "اطلب مساحة إعلانية هنا",
    sub: "معالج سريع وآمن لإرسال إعلانك",
    steps: ["الدول المستهدفة", "بيانات التواصل", "التصميم والمراجعة"],
    spot: "الموضع المطلوب",
    countries: "دول عرض الإعلان",
    countriesHint: "يمكنك اختيار دولة واحدة أو عدة دول لعرض الإعلان",
    countriesLoading: "جارٍ تحميل قائمة الدول...",
    countriesError: "تعذر تحميل قائمة الدول، حاول مرة أخرى",
    name: "اسم النشاط التجاري",
    namePlaceholder: "مثال: مؤسسة الركن العقاري",
    email: "البريد الإلكتروني للتواصل",
    emailPlaceholder: "you@example.com",
    phone: "رقم الهاتف (اختياري)",
    phonePlaceholder: "+968 9XXX XXXX",
    targetUrl: "رابط موقعك أو صفحتك",
    targetUrlPlaceholder: "https://example.com",
    descriptionsTitle: "وصف الإعلان",
    descriptionArLabel: "العربية",
    descriptionEnLabel: "English",
    descriptionTrLabel: "Türkçe",
    optional: "اختياري",
    optionalHint: "الوصف العربي مطلوب، وسيُستخدم تلقائياً للغات المتروكة فارغة",
    upload: "اسحب صورة الإعلان هنا",
    uploadSub: "أو اضغط للاختيار — JPG أو PNG أو WebP، بحد أقصى 5MB",
    review: "ملخص الطلب",
    note: "سيُرسل طلبك للمراجعة من قبل المدير العام أو مدير الدولة، وسيتم إشعارك عند الاعتماد.",
    back: "السابق",
    next: "التالي",
    submit: "إرسال للمراجعة",
    submitting: "جارٍ الرفع والإرسال...",
    successTitle: "تم استلام طلبك",
    successBody: "أصبح طلبك قيد المراجعة. بمجرد اعتماده من الإدارة سيظهر إعلانك في هذا الموضع.",
    done: "تم",
    errorCountry: "يرجى اختيار دولة واحدة على الأقل",
    errorName: "يرجى إدخال اسم النشاط التجاري (حرفان على الأقل)",
    errorEmail: "يرجى إدخال بريد إلكتروني صحيح",
    errorPhone: "تحقق من رقم الهاتف ومفتاح الدولة",
    errorUrl: "يجب أن يبدأ الرابط بـ https:// أو http://",
    errorDescription: "يرجى كتابة الوصف العربي للإعلان",
    errorImage: "يرجى اختيار صورة صحيحة لا تتجاوز 5MB",
    errorRequired: "يرجى إكمال الحقول المطلوبة بصورة صحيحة",
    errorNetwork: "تعذر إرسال الطلب، حاول مرة أخرى",
  },
  en: {
    aria: "Request an ad spot",
    close: "Close",
    kicker: "Advertise on AkarPromax",
    title: "Request an ad spot here",
    sub: "A quick, secure wizard for your campaign",
    steps: ["Target countries", "Contact details", "Creative & review"],
    spot: "Requested spot",
    countries: "Campaign countries",
    countriesHint: "Select one or multiple countries for this ad",
    countriesLoading: "Loading countries...",
    countriesError: "Could not load the country list, please try again",
    name: "Business name",
    namePlaceholder: "e.g. Real Estate Corner Co.",
    email: "Contact email",
    emailPlaceholder: "you@example.com",
    phone: "Phone (optional)",
    phonePlaceholder: "+968 9XXX XXXX",
    targetUrl: "Your website or page URL",
    targetUrlPlaceholder: "https://example.com",
    descriptionsTitle: "Ad description",
    descriptionArLabel: "العربية",
    descriptionEnLabel: "English",
    descriptionTrLabel: "Türkçe",
    optional: "optional",
    optionalHint: "The Arabic description is required and fills any language left empty",
    upload: "Drop your ad image here",
    uploadSub: "or click to browse — JPG, PNG or WebP, up to 5MB",
    review: "Request summary",
    note: "Your request is reviewed by the General Manager or Country Manager and you will be notified once approved.",
    back: "Back",
    next: "Next",
    submit: "Send for review",
    submitting: "Uploading and submitting...",
    successTitle: "Request received",
    successBody: "Your request is now pending review. Once approved it will appear in this spot.",
    done: "Done",
    errorCountry: "Please select at least one country",
    errorName: "Please enter the business name (at least two characters)",
    errorEmail: "Please enter a valid email",
    errorPhone: "Check the phone number and country code",
    errorUrl: "URL must start with https:// or http://",
    errorDescription: "Please write the Arabic ad description",
    errorImage: "Choose a valid image up to 5MB",
    errorRequired: "Please complete all required fields correctly",
    errorNetwork: "Could not send your request, please try again",
  },
  tr: {
    aria: "Reklam alanı talebi",
    close: "Kapat",
    kicker: "AkarPromax'ta reklam verin",
    title: "Burada reklam alanı talep edin",
    sub: "Kampanyanız için hızlı ve güvenli sihirbaz",
    steps: ["Hedef ülkeler", "İletişim bilgileri", "Görsel ve inceleme"],
    spot: "Talep edilen alan",
    countries: "Reklam ülkeleri",
    countriesHint: "Reklam için bir veya birden fazla ülke seçebilirsiniz",
    countriesLoading: "Ülkeler yükleniyor...",
    countriesError: "Ülke listesi yüklenemedi, lütfen tekrar deneyin",
    name: "İşletme adı",
    namePlaceholder: "örn. Emlak Köşesi A.Ş.",
    email: "İletişim e-postası",
    emailPlaceholder: "you@example.com",
    phone: "Telefon (isteğe bağlı)",
    phonePlaceholder: "+90 5XX XXX XXXX",
    targetUrl: "Web sitenizin bağlantısı",
    targetUrlPlaceholder: "https://example.com",
    descriptionsTitle: "Reklam açıklaması",
    descriptionArLabel: "العربية",
    descriptionEnLabel: "English",
    descriptionTrLabel: "Türkçe",
    optional: "isteğe bağlı",
    optionalHint: "Arapça açıklama zorunludur; boş bırakılan diller için otomatik kullanılır",
    upload: "Reklam görselini buraya bırakın",
    uploadSub: "veya seçmek için tıklayın — JPG, PNG, WebP; en fazla 5MB",
    review: "Talep özeti",
    note: "Talebiniz Genel Müdür veya Ülke Müdürü tarafından incelenir ve onaylandığında bu alanda yayınlanır.",
    back: "Geri",
    next: "İleri",
    submit: "İncelemeye gönder",
    submitting: "Yükleniyor ve gönderiliyor...",
    successTitle: "Talebiniz alındı",
    successBody: "Talebiniz incelemede. Onaylandığında reklamınız bu alanda görünecek.",
    done: "Tamam",
    errorCountry: "Lütfen en az bir ülke seçin",
    errorName: "Lütfen işletme adını girin (en az iki karakter)",
    errorEmail: "Lütfen geçerli bir e-posta girin",
    errorPhone: "Telefon numarasını kontrol edin",
    errorUrl: "Bağlantı https:// veya http:// ile başlamalı",
    errorDescription: "Lütfen Arapça reklam açıklamasını yazın",
    errorImage: "5MB'a kadar geçerli bir görsel seçin",
    errorRequired: "Gerekli alanları doğru doldurun",
    errorNetwork: "Talebiniz gönderilemedi, lütfen tekrar deneyin",
  },
};

const MAX_COUNTRIES = 23;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^\+?[0-9\s()-]{7,24}$/;
const URL_RE = /^https?:\/\/[^\s]+$/i;

function flagEmoji(code: string): string {
  const cc = code.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return "";
  return String.fromCodePoint(...[...cc].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

function countryName(option: CountryOption, locale: Locale): string {
  if (locale === "ar") return option.nameAr || option.nameEn || option.code;
  if (locale === "tr") return option.nameTr || option.nameEn || option.code;
  return option.nameEn || option.nameAr || option.code;
}

export default function AdRequestDialog({ locale, open, placement, countryCode, canonical, family, city, path, onClose }: Props) {
  const labels = LABELS[locale];
  const [step, setStep] = useState<Step>(0);
  const [countryList, setCountryList] = useState<CountryOption[]>([]);
  const [countriesStatus, setCountriesStatus] = useState<"loading" | "ready" | "error">("loading");
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [descriptionAr, setDescriptionAr] = useState("");
  const [descriptionEn, setDescriptionEn] = useState("");
  const [descriptionTr, setDescriptionTr] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const initialCode = /^[a-z]{2}$/i.test(countryCode) ? countryCode.toLowerCase() : "";

  const reset = useCallback(() => {
    setStep(0);
    setSelectedCodes(initialCode ? [initialCode] : []);
    setName("");
    setEmail("");
    setPhone("");
    setTargetUrl("");
    setDescriptionAr("");
    setDescriptionEn("");
    setDescriptionTr("");
    setFile(null);
    setPreview((current) => {
      if (current) URL.revokeObjectURL(current);
      return "";
    });
    setError("");
    setBusy(false);
    setSubmitted(false);
    setCountriesStatus((current) => (current === "error" ? "loading" : current));
  }, [initialCode]);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [onClose, reset]);

  useEffect(() => {
    if (!open) return;
    window.queueMicrotask(() => reset());
    const previous = document.activeElement as HTMLElement | null;
    requestAnimationFrame(() => closeRef.current?.focus());
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("keydown", handleKey);
      previous?.focus?.();
    };
  }, [open, handleClose, reset]);

  // Country list — same endpoint and shape GeoContext consumes.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetch("/api/geo?type=countries", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("geo failed");
        const json = await response.json() as CountryOption[] | { data?: CountryOption[] };
        const source = Array.isArray(json) ? json : json.data ?? [];
        const rows = source
          .map((country) => ({ ...country, code: String(country.code || "").trim().toLowerCase() }))
          .filter((country) => /^[a-z]{2}$/.test(country.code) && country.isActive !== false)
          .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
        if (!cancelled) {
          setCountryList(rows);
          setCountriesStatus("ready");
        }
      })
      .catch(() => {
        if (!cancelled) setCountriesStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  if (!open) return null;

  const placementName = AD_PLACEMENTS[placement]?.label[locale] ?? canonical ?? placement;
  const selectedCountries = selectedCodes.map((code) => {
    const match = countryList.find((option) => option.code === code);
    return match ?? { code, nameAr: code.toUpperCase(), nameEn: code.toUpperCase(), nameTr: code.toUpperCase() };
  });

  const toggleCountry = (code: string) => {
    setError("");
    setSelectedCodes((current) => {
      if (current.includes(code)) return current.filter((item) => item !== code);
      if (current.length >= MAX_COUNTRIES) return current;
      return [...current, code];
    });
  };

  const chooseFile = (candidate?: File | null) => {
    setError("");
    if (!candidate) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(candidate.type) || candidate.size > 5 * 1024 * 1024 || candidate.size < 1) {
      setError(labels.errorImage);
      return;
    }
    setFile(candidate);
    setPreview((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(candidate);
    });
  };

  const nameInvalid = name.trim().length < 2;
  const emailInvalid = !EMAIL_RE.test(email.trim());
  const phoneInvalid = Boolean(phone.trim()) && !PHONE_RE.test(phone.trim());
  const urlInvalid = !URL_RE.test(targetUrl.trim());
  const descriptionInvalid = !descriptionAr.trim();
  const detailsValid = !nameInvalid && !emailInvalid && !phoneInvalid && !urlInvalid && !descriptionInvalid;

  const readJson = async <T,>(response: Response): Promise<T & { error?: string }> => {
    const text = await response.text();
    try {
      return JSON.parse(text) as T & { error?: string };
    } catch {
      return { error: response.status === 413 ? labels.errorImage : labels.errorNetwork } as T & { error?: string };
    }
  };

  const submit = async () => {
    if (!detailsValid || !selectedCodes.length || !file) {
      setError(!file ? labels.errorImage : labels.errorRequired);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const upload = await fetch("/api/ads/request-asset", { method: "POST", body: form });
      const uploaded = await readJson<{ asset?: { url: string } }>(upload);
      if (!upload.ok || !uploaded.asset) throw new Error(uploaded.error || labels.errorImage);
      const ar = descriptionAr.trim();
      const response = await fetch("/api/ads/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          placement,
          countryCodes: selectedCodes,
          canonical,
          family,
          city,
          path,
          advertiserName: name.trim(),
          contactEmail: email.trim(),
          contactPhone: phone.trim(),
          targetUrl: targetUrl.trim(),
          mediaUrl: uploaded.asset.url,
          descriptionAr: ar,
          descriptionEn: descriptionEn.trim() || ar,
          descriptionTr: descriptionTr.trim() || ar,
        }),
      });
      const data = await readJson<Record<string, never>>(response);
      if (!response.ok) throw new Error(data.error || labels.errorNetwork);
      setSubmitted(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : labels.errorNetwork);
    } finally {
      setBusy(false);
    }
  };

  const advance = () => {
    if (step === 0 && !selectedCodes.length) {
      setError(labels.errorCountry);
      return;
    }
    if (step === 1 && !detailsValid) {
      setError(labels.errorRequired);
      return;
    }
    setError("");
    if (step < 2) setStep((step + 1) as Step);
    else void submit();
  };

  const showFieldErrors = Boolean(error) && step === 1;

  return (
    <div className="account-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) handleClose(); }}>
      <div ref={rootRef} className="account-dialog ad-request-dialog" role="dialog" aria-modal="true" aria-label={labels.aria}>
        <button ref={closeRef} className="account-close" type="button" aria-label={labels.close} onClick={handleClose}>×</button>

        {submitted ? (
          <div className="account-panel ad-request-success">
            <span className="account-avatar" aria-hidden="true">✓</span>
            <p className="account-kicker">{labels.kicker}</p>
            <h3>{labels.successTitle}</h3>
            <p className="account-subline">{labels.successBody}</p>
            <button className="account-logout" type="button" onClick={handleClose}>{labels.done}</button>
          </div>
        ) : (
          <div className="account-panel">
            <p className="account-kicker">{labels.kicker}</p>
            <h3>{labels.title}</h3>
            <p className="account-subline">{labels.sub}</p>
            <ol className="account-steps">
              {labels.steps.map((label, index) => (
                <li key={label} className={index === step ? "active" : index < step ? "done" : ""}>
                  <span className="account-step-num">{index < step ? "✓" : index + 1}</span>
                  <span className="account-step-label">{label}</span>
                </li>
              ))}
            </ol>

            {step === 0 && (
              <section className="ad-wizard-pane">
                <div className="ad-spot-summary">
                  <span>{labels.spot}: <strong>{placementName}</strong></span>
                  <div className="ad-selected-countries">
                    {selectedCountries.map((option) => (
                      <strong key={option.code}><span aria-hidden="true">{flagEmoji(option.code)}</span> {countryName(option, locale)}</strong>
                    ))}
                  </div>
                </div>
                <p className="account-location-hint">{labels.countriesHint}</p>
                <span className="ad-section-label">{labels.countries} <b className="selection-count">{selectedCodes.length}</b></span>
                {countriesStatus === "loading" && <p className="account-location-hint">{labels.countriesLoading}</p>}
                {countriesStatus === "error" && <p className="ad-request-error" role="alert">{labels.countriesError}</p>}
                {countriesStatus === "ready" && (
                  <div className="country-picker" role="listbox" aria-multiselectable="true" aria-label={labels.countries}>
                    {countryList.map((option) => {
                      const selected = selectedCodes.includes(option.code);
                      return (
                        <button
                          key={option.code}
                          type="button"
                          role="option"
                          aria-selected={selected}
                          className={selected ? "country-choice active" : "country-choice"}
                          onClick={() => toggleCountry(option.code)}
                        >
                          <span aria-hidden="true">{flagEmoji(option.code)}</span>
                          <span>{countryName(option, locale)}</span>
                          <b aria-hidden="true">{selected ? "✓" : "+"}</b>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>
            )}

            {step === 1 && (
              <section className="ad-wizard-pane">
                <div className="account-grid">
                  <div className="account-field">
                    <label htmlFor="ad-req-name">{labels.name}</label>
                    <input id="ad-req-name" required minLength={2} maxLength={140} aria-invalid={showFieldErrors && nameInvalid} value={name} placeholder={labels.namePlaceholder} onChange={(event) => { setName(event.target.value); setError(""); }} />
                    {showFieldErrors && nameInvalid ? <small className="field-error">{labels.errorName}</small> : <small className="field-hint">2–140</small>}
                  </div>
                  <div className="account-field">
                    <label htmlFor="ad-req-email">{labels.email}</label>
                    <input id="ad-req-email" required type="email" maxLength={255} dir="ltr" aria-invalid={showFieldErrors && emailInvalid} value={email} placeholder={labels.emailPlaceholder} onChange={(event) => { setEmail(event.target.value); setError(""); }} />
                    {showFieldErrors && emailInvalid && <small className="field-error">{labels.errorEmail}</small>}
                  </div>
                </div>
                <div className="account-grid">
                  <div className="account-field">
                    <label htmlFor="ad-req-phone">{labels.phone}</label>
                    <input id="ad-req-phone" type="tel" dir="ltr" maxLength={24} aria-invalid={showFieldErrors && phoneInvalid} value={phone} placeholder={labels.phonePlaceholder} onChange={(event) => { setPhone(event.target.value); setError(""); }} />
                    {showFieldErrors && phoneInvalid && <small className="field-error">{labels.errorPhone}</small>}
                  </div>
                  <div className="account-field">
                    <label htmlFor="ad-req-url">{labels.targetUrl}</label>
                    <input id="ad-req-url" required type="url" maxLength={800} dir="ltr" aria-invalid={showFieldErrors && urlInvalid} value={targetUrl} placeholder={labels.targetUrlPlaceholder} onChange={(event) => { setTargetUrl(event.target.value); setError(""); }} />
                    {showFieldErrors && urlInvalid && <small className="field-error">{labels.errorUrl}</small>}
                  </div>
                </div>
                <div className="ad-description-head">
                  <strong>{labels.descriptionsTitle}</strong>
                  <small className="field-hint">{labels.optionalHint}</small>
                </div>
                <div className="ad-language-fields">
                  <div className="account-field">
                    <label htmlFor="ad-req-desc-ar">{labels.descriptionArLabel} <span>AR</span></label>
                    <textarea id="ad-req-desc-ar" dir="rtl" rows={3} required maxLength={320} aria-invalid={showFieldErrors && descriptionInvalid} value={descriptionAr} onChange={(event) => { setDescriptionAr(event.target.value); setError(""); }} />
                    {showFieldErrors && descriptionInvalid ? <small className="field-error">{labels.errorDescription}</small> : <small className="field-counter">{descriptionAr.length}/320</small>}
                  </div>
                  <div className="account-field">
                    <label htmlFor="ad-req-desc-en">{labels.descriptionEnLabel} <span>EN — {labels.optional}</span></label>
                    <textarea id="ad-req-desc-en" dir="ltr" rows={3} maxLength={320} value={descriptionEn} onChange={(event) => { setDescriptionEn(event.target.value); setError(""); }} />
                    <small className="field-counter">{descriptionEn.length}/320</small>
                  </div>
                  <div className="account-field">
                    <label htmlFor="ad-req-desc-tr">{labels.descriptionTrLabel} <span>TR — {labels.optional}</span></label>
                    <textarea id="ad-req-desc-tr" dir="ltr" rows={3} maxLength={320} value={descriptionTr} onChange={(event) => { setDescriptionTr(event.target.value); setError(""); }} />
                    <small className="field-counter">{descriptionTr.length}/320</small>
                  </div>
                </div>
              </section>
            )}

            {step === 2 && (
              <section className="ad-wizard-pane">
                <input ref={fileInputRef} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => chooseFile(event.target.files?.[0])} />
                <button
                  type="button"
                  className={preview ? "ad-dropzone has-preview" : "ad-dropzone"}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => { event.preventDefault(); chooseFile(event.dataTransfer.files[0]); }}
                >
                  {preview ? <img src={preview} alt="" /> : <span className="ad-upload-icon" aria-hidden="true">↥</span>}
                  <strong>{labels.upload}</strong>
                  <small>{file?.name || labels.uploadSub}</small>
                </button>
                <div className="ad-review-card">
                  <span className="ad-section-label">{labels.review}</span>
                  <div className="ad-selected-countries">
                    {selectedCountries.map((option) => (
                      <strong key={option.code}><span aria-hidden="true">{flagEmoji(option.code)}</span> {countryName(option, locale)}</strong>
                    ))}
                  </div>
                  <span>{placementName}</span>
                  <span>{name}</span>
                  <p className="ad-review-description">{(locale === "en" ? descriptionEn : locale === "tr" ? descriptionTr : descriptionAr) || descriptionAr}</p>
                  <div className="ad-review-languages">
                    <span>AR ✓</span>
                    <span>EN {descriptionEn.trim() ? "✓" : "= AR"}</span>
                    <span>TR {descriptionTr.trim() ? "✓" : "= AR"}</span>
                  </div>
                </div>
                <p className="ad-request-note">✓ {labels.note}</p>
              </section>
            )}

            {error && <p className="ad-request-error" role="alert">{error}</p>}
            <div className="account-actions">
              {step > 0 && (
                <button className="account-cancel" type="button" disabled={busy} onClick={() => { setError(""); setStep((step - 1) as Step); }}>{labels.back}</button>
              )}
              <button className="account-submit" type="button" disabled={busy} onClick={advance}>
                {busy ? labels.submitting : step === 2 ? labels.submit : labels.next}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
