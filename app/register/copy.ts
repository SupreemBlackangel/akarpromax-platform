import type { Locale } from "@/lib/email/templates";

/**
 * Register-form copy that `authLabels` does not cover (validation messages,
 * password-strength labels, consent lines, social buttons). The shared titles
 * and field labels still come from `authLabels` so both auth pages stay in sync.
 */
export type RegisterCopy = {
  confirmPasswordLabel: string;
  namePlaceholder: string;
  emailPlaceholder: string;
  strength: [string, string, string, string, string];
  errNameRequired: string;
  errEmailRequired: string;
  errEmailInvalid: string;
  errPasswordShort: string;
  errPasswordMismatch: string;
  errTermsRequired: string;
  errEmailTaken: string;
  errEmailTakenCta: string;
  errEmailUnverified: string;
  errEmailUnverifiedCta: string;
  errGeneric: string;
  errNetwork: string;
  agreePrefix: string;
  termsLink: string;
  and: string;
  privacyLink: string;
  marketingOptIn: string;
  submitting: string;
  or: string;
  google: string;
  facebook: string;
};

export const REGISTER_COPY: Record<Locale, RegisterCopy> = {
  ar: {
    confirmPasswordLabel: "تأكيد كلمة المرور",
    namePlaceholder: "أحمد محمد",
    emailPlaceholder: "example@email.com",
    strength: ["ضعيفة", "ضعيفة", "متوسطة", "قوية", "قوية جداً"],
    errNameRequired: "الاسم مطلوب",
    errEmailRequired: "البريد الإلكتروني مطلوب",
    errEmailInvalid: "بريد إلكتروني غير صحيح",
    errPasswordShort: "كلمة المرور يجب أن تكون 8 أحرف على الأقل",
    errPasswordMismatch: "كلمتا المرور غير متطابقتين",
    errTermsRequired: "يجب الموافقة على الشروط والأحكام",
    errEmailTaken: "هذا البريد الإلكتروني مسجل مسبقاً.",
    errEmailTakenCta: "تسجيل الدخول",
    errEmailUnverified: "هذا البريد مسجل ولكن لم يتم تفعيله.",
    errEmailUnverifiedCta: "إعادة إرسال التفعيل",
    errGeneric: "حدث خطأ، حاول مرة أخرى",
    errNetwork: "حدث خطأ في الاتصال بالخادم",
    agreePrefix: "أوافق على",
    termsLink: "شروط الاستخدام",
    and: "و",
    privacyLink: "سياسة الخصوصية",
    marketingOptIn: "أرغب في تلقي الأخبار والعروض والتحديثات (اختياري)",
    submitting: "جاري الإنشاء...",
    or: "أو",
    google: "المتابعة عبر Google",
    facebook: "المتابعة عبر Facebook",
  },
  en: {
    confirmPasswordLabel: "Confirm password",
    namePlaceholder: "John Smith",
    emailPlaceholder: "example@email.com",
    strength: ["Weak", "Weak", "Medium", "Strong", "Very strong"],
    errNameRequired: "Name is required",
    errEmailRequired: "Email is required",
    errEmailInvalid: "Invalid email address",
    errPasswordShort: "Password must be at least 8 characters",
    errPasswordMismatch: "Passwords do not match",
    errTermsRequired: "You must accept the terms and conditions",
    errEmailTaken: "This email is already registered.",
    errEmailTakenCta: "Sign in",
    errEmailUnverified: "This email is registered but not activated.",
    errEmailUnverifiedCta: "Resend activation",
    errGeneric: "Something went wrong, please try again",
    errNetwork: "Could not reach the server",
    agreePrefix: "I agree to the",
    termsLink: "Terms of Use",
    and: "and",
    privacyLink: "Privacy Policy",
    marketingOptIn: "Send me news, offers and updates (optional)",
    submitting: "Creating...",
    or: "or",
    google: "Continue with Google",
    facebook: "Continue with Facebook",
  },
  tr: {
    confirmPasswordLabel: "Şifreyi doğrula",
    namePlaceholder: "Ahmet Yılmaz",
    emailPlaceholder: "ornek@email.com",
    strength: ["Zayıf", "Zayıf", "Orta", "Güçlü", "Çok güçlü"],
    errNameRequired: "Ad gerekli",
    errEmailRequired: "E-posta gerekli",
    errEmailInvalid: "Geçersiz e-posta adresi",
    errPasswordShort: "Şifre en az 8 karakter olmalı",
    errPasswordMismatch: "Şifreler eşleşmiyor",
    errTermsRequired: "Şartları kabul etmelisiniz",
    errEmailTaken: "Bu e-posta zaten kayıtlı.",
    errEmailTakenCta: "Giriş yap",
    errEmailUnverified: "Bu e-posta kayıtlı ancak etkinleştirilmemiş.",
    errEmailUnverifiedCta: "Etkinleştirmeyi tekrar gönder",
    errGeneric: "Bir hata oluştu, tekrar deneyin",
    errNetwork: "Sunucuya ulaşılamadı",
    agreePrefix: "Şunları kabul ediyorum:",
    termsLink: "Kullanım Şartları",
    and: "ve",
    privacyLink: "Gizlilik Politikası",
    marketingOptIn: "Haber, teklif ve güncellemeleri almak istiyorum (isteğe bağlı)",
    submitting: "Oluşturuluyor...",
    or: "veya",
    google: "Google ile devam et",
    facebook: "Facebook ile devam et",
  },
};
