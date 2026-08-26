"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AD_PLACEMENTS } from "@/src/constants/advertising";

type Props = {
  locale: "ar" | "en" | "tr";
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

type Labels = {
  aria: string;
  close: string;
  kicker: string;
  title: string;
  spot: string;
  name: string;
  namePlaceholder: string;
  email: string;
  emailPlaceholder: string;
  phone: string;
  phonePlaceholder: string;
  targetUrl: string;
  targetUrlPlaceholder: string;
  mediaUrl: string;
  mediaUrlPlaceholder: string;
  message: string;
  messagePlaceholder: string;
  note: string;
  submit: string;
  submitting: string;
  successTitle: string;
  successBody: string;
  done: string;
  errorName: string;
  errorEmail: string;
  errorUrl: string;
  errorNetwork: string;
};

const LABELS: Record<"ar" | "en" | "tr", Labels> = {
  ar: {
    aria: "طلب مساحة إعلانية",
    close: "إغلاق",
    kicker: "الإعلان على عقار بروماكس",
    title: "اطلب مساحة إعلانية هنا",
    spot: "الموضع المطلوب",
    name: "اسم النشاط التجاري",
    namePlaceholder: "مثال: مؤسسة الركن العقاري",
    email: "البريد الإلكتروني للتواصل",
    emailPlaceholder: "you@example.com",
    phone: "رقم الهاتف (اختياري)",
    phonePlaceholder: "+968 9XXX XXXX",
    targetUrl: "رابط موقعك أو صفحتك",
    targetUrlPlaceholder: "https://example.com",
    mediaUrl: "رابط صورة الإعلان (اختياري)",
    mediaUrlPlaceholder: "https://.../banner.webp",
    message: "وصف مختصر للإعلان (اختياري)",
    messagePlaceholder: "مثال: إعلان عن عروض الشقق في مسقط",
    note: "سيُرسل طلبك للمراجعة من قبل المدير العام أو مدير الدولة، وسيتم إشعارك عند الاعتماد.",
    submit: "إرسال الطلب",
    submitting: "جارٍ الإرسال...",
    successTitle: "تم استلام طلبك",
    successBody: "أصبح طلبك قيد المراجعة. بمجرد اعتماده من الإدارة سيظهر إعلانك في هذا الموضع.",
    done: "تم",
    errorName: "يرجى إدخال اسم النشاط التجاري",
    errorEmail: "يرجى إدخال بريد إلكتروني صحيح",
    errorUrl: "يرجى إدخال رابط صحيح",
    errorNetwork: "تعذر إرسال الطلب، حاول مرة أخرى",
  },
  en: {
    aria: "Request an ad spot",
    close: "Close",
    kicker: "Advertise on AkarPromax",
    title: "Request an ad spot here",
    spot: "Requested spot",
    name: "Business name",
    namePlaceholder: "e.g. Real Estate Corner Co.",
    email: "Contact email",
    emailPlaceholder: "you@example.com",
    phone: "Phone (optional)",
    phonePlaceholder: "+968 9XXX XXXX",
    targetUrl: "Your website or page URL",
    targetUrlPlaceholder: "https://example.com",
    mediaUrl: "Ad image URL (optional)",
    mediaUrlPlaceholder: "https://.../banner.webp",
    message: "Short ad description (optional)",
    messagePlaceholder: "e.g. Apartments offers in Muscat",
    note: "Your request is reviewed by the General Manager or Country Manager and you will be notified once approved.",
    submit: "Submit request",
    submitting: "Submitting...",
    successTitle: "Request received",
    successBody: "Your request is now pending review. Once approved it will appear in this spot.",
    done: "Done",
    errorName: "Please enter the business name",
    errorEmail: "Please enter a valid email",
    errorUrl: "Please enter a valid URL",
    errorNetwork: "Could not send your request, please try again",
  },
  tr: {
    aria: "Reklam alanı talebi",
    close: "Kapat",
    kicker: "AkarPromax'ta reklam verin",
    title: "Burada reklam alanı talep edin",
    spot: "Talep edilen alan",
    name: "İşletme adı",
    namePlaceholder: "örn. Emlak Köşesi A.Ş.",
    email: "İletişim e-postası",
    emailPlaceholder: "you@example.com",
    phone: "Telefon (isteğe bağlı)",
    phonePlaceholder: "+90 5XX XXX XXXX",
    targetUrl: "Web sitenizin bağlantısı",
    targetUrlPlaceholder: "https://example.com",
    mediaUrl: "Reklam görseli bağlantısı (isteğe bağlı)",
    mediaUrlPlaceholder: "https://.../banner.webp",
    message: "Kısa reklam açıklaması (isteğe bağlı)",
    messagePlaceholder: "örn. Muskat'ta daire fırsatları",
    note: "Talebiniz Genel Müdür veya Ülke Müdürü tarafından incelenir ve onaylandığında bu alanda yayınlanır.",
    submit: "Talebi gönder",
    submitting: "Gönderiliyor...",
    successTitle: "Talebiniz alındı",
    successBody: "Talebiniz incelemede. Onaylandığında reklamınız bu alanda görünecek.",
    done: "Tamam",
    errorName: "Lütfen işletme adını girin",
    errorEmail: "Lütfen geçerli bir e-posta girin",
    errorUrl: "Lütfen geçerli bir bağlantı girin",
    errorNetwork: "Talebiniz gönderilemedi, lütfen tekrar deneyin",
  },
};

export default function AdRequestDialog({ locale, open, placement, countryCode, canonical, family, city, path, onClose }: Props) {
  const labels = LABELS[locale];
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const reset = useCallback(() => {
    setName("");
    setEmail("");
    setPhone("");
    setTargetUrl("");
    setMediaUrl("");
    setMessage("");
    setError("");
    setBusy(false);
    setSubmitted(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    window.queueMicrotask(() => reset());
    const previous = document.activeElement as HTMLElement | null;
    rootRef.current?.querySelector<HTMLInputElement>("input")?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("keydown", handleKey);
      previous?.focus?.();
    };
  }, [open, onClose, reset]);

  if (!open) return null;

  const placementName = AD_PLACEMENTS[placement]?.label[locale] ?? canonical ?? placement;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!name.trim()) {
      setError(labels.errorName);
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      setError(labels.errorEmail);
      return;
    }
    if (!/^(https?:\/\/|\/)/i.test(targetUrl.trim())) {
      setError(labels.errorUrl);
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/ads/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          placement,
          countryCode,
          canonical,
          family,
          city,
          path,
          advertiserName: name.trim(),
          contactEmail: email.trim(),
          contactPhone: phone.trim(),
          targetUrl: targetUrl.trim(),
          mediaUrl: mediaUrl.trim() || undefined,
          message: message.trim() || undefined,
        }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) {
        throw new Error(data.error || labels.errorNetwork);
      }
      setSubmitted(true);
    } catch (error) {
      setError(error instanceof Error ? error.message : labels.errorNetwork);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="account-backdrop" aria-hidden="true">
      <div ref={rootRef} className="account-dialog ad-request-dialog" role="dialog" aria-modal="true" aria-label={labels.aria}>
        <button className="account-close" type="button" aria-label={labels.close} onClick={onClose}>×</button>

        {submitted ? (
          <div className="account-panel ad-request-success">
            <span className="account-avatar" aria-hidden="true">✓</span>
            <p className="account-kicker">{labels.kicker}</p>
            <h3>{labels.successTitle}</h3>
            <p className="account-subline">{labels.successBody}</p>
            <button className="account-logout" type="button" onClick={onClose}>{labels.done}</button>
          </div>
        ) : (
          <div className="account-panel">
            <p className="account-kicker">{labels.kicker}</p>
            <h3>{labels.title}</h3>
            <p className="account-subline">{labels.spot}: <strong>{placementName}</strong></p>

            <form className="account-form ad-request-form" onSubmit={(event) => void handleSubmit(event)}>
              <label>
                <span>{labels.name}</span>
                <input type="text" value={name} onChange={(event) => setName(event.target.value)} placeholder={labels.namePlaceholder} required />
              </label>
              <label>
                <span>{labels.email}</span>
                <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder={labels.emailPlaceholder} dir="ltr" required />
              </label>
              <label>
                <span>{labels.phone}</span>
                <input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder={labels.phonePlaceholder} dir="ltr" />
              </label>
              <label>
                <span>{labels.targetUrl}</span>
                <input type="url" value={targetUrl} onChange={(event) => setTargetUrl(event.target.value)} placeholder={labels.targetUrlPlaceholder} dir="ltr" required />
              </label>
              <label>
                <span>{labels.mediaUrl}</span>
                <input type="url" value={mediaUrl} onChange={(event) => setMediaUrl(event.target.value)} placeholder={labels.mediaUrlPlaceholder} dir="ltr" />
              </label>
              <label>
                <span>{labels.message}</span>
                <textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder={labels.messagePlaceholder} rows={3} />
              </label>
              <p className="ad-request-note">{labels.note}</p>
              {error && <p className="ad-request-error" role="alert">{error}</p>}
              <button className="account-submit" type="submit" disabled={busy}>{busy ? labels.submitting : labels.submit}</button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
