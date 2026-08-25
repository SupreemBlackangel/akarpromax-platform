export type Locale = "ar" | "en" | "tr";

export type EmailVariables = {
  brandTitle: string;
  brandUrl: string;
  recipientName?: string;
  verificationUrl?: string;
  otpCode?: string;
  otpExpirySeconds?: number;
  tokenExpiryMinutes?: number;
  resetUrl?: string;
  userEmail?: string;
};

export type EmailKind =
  | "verification"
  | "otp"
  | "welcome"
  | "reset"
  | "password_changed"
  | "email_changed"
  | "email_change_confirm";

const BRAND = "AkarProMax";
const BRAND_URL = "https://akarpromax.om";

const T = {
  ar: {
    verification: {
      subject: "تفعيل بريدك الإلكتروني على أكار برو ماكس",
      preheader: "أهلاً بك! فعّل بريدك الإلكتروني للمتابعة.",
    },
    otp: {
      subject: "رمز التحقق الخاص بك على أكار برو ماكس",
      preheader: "استخدم هذا الرمز لإتمام العملية.",
    },
    welcome: {
      subject: "مرحباً بك في أكار برو ماكس — حسابك جاهز!",
      preheader: "تم تفعيل حسابك ويمكنك الآن الوثول إلى لوحة التحكم.",
    },
    reset: {
      subject: "استعادة كلمة المرور — أكار برو ماكس",
      preheader: "اضغط لتعيين كلمة مرور جديدة.",
    },
    password_changed: {
      subject: "تم تغيير كلمة المرور بنجاح",
      preheader: "تم تحديث كلمة المرور لحسابك.",
    },
    email_changed: {
      subject: "تم تغيير بريدك الإلكتروني",
      preheader: "تم تحديث بريدك الإلكتروني على حسابك.",
    },
    email_change_confirm: {
      subject: "تأكيد بريد إلكتروني جديد على أكار برو ماكس",
      preheader: "اضغط لتأكيد بريدك الإلكتروني الجديد.",
    },
  },
  en: {
    verification: {
      subject: "Verify your email on AkarProMax",
      preheader: "Welcome! Verify your email to continue.",
    },
    otp: {
      subject: "Your one-time code for AkarProMax",
      preheader: "Use this code to complete your action.",
    },
    welcome: {
      subject: "Welcome to AkarProMax — your account is ready!",
      preheader: "Your account is verified and you can now access your dashboard.",
    },
    reset: {
      subject: "Password reset — AkarProMax",
      preheader: "Click to set a new password.",
    },
    password_changed: {
      subject: "Your password was changed successfully",
      preheader: "Your account password has been updated.",
    },
    email_changed: {
      subject: "Your email was changed",
      preheader: "Your account email has been updated.",
    },
    email_change_confirm: {
      subject: "Confirm your new email on AkarProMax",
      preheader: "Click to confirm your new email address.",
    },
  },
  tr: {
    verification: {
      subject: "E-postanızı AkarProMax'ta doğrulayın",
      preheader: "Hoş geldiniz! E-postanızı doğrulayın.",
    },
    otp: {
      subject: "Tek kullanımlık kodunuz — AkarProMax",
      preheader: "Bu kodu eylemi tamamlamak için kullanın.",
    },
    welcome: {
      subject: "AkarProMax'a hoş geldiniz — hesabınız hazır!",
      preheader: "Hesabınız doğrulandı, şimdi panele erişebilirsiniz.",
    },
    reset: {
      subject: "Şifre sıfırlama — AkarProMax",
      preheader: "Yeni bir şifre ayırmak için tıklayın.",
    },
    password_changed: {
      subject: "Şifreniz başarıyla değiştirildi",
      preheader: "Hesabınızın şifresi güncellendi.",
    },
    email_changed: {
      subject: "E-postanız değiştirildi",
      preheader: "Hesabınızın e-postası güncellendi.",
    },
    email_change_confirm: {
      subject: "Yeni e-postanızı AkarProMax'ta doğrulayın",
      preheader: "Yeni e-posta adresinizi onaylamak için tıklayın.",
    },
  },
};

function greeting(locale: Locale, name?: string): string {
  const localeName = name ? (locale === "ar" ? `عزيزنا ${name}` : locale === "tr" ? `Sevgili ${name}` : `Dear ${name}`) : locale === "ar" ? "عزيزنا" : locale === "tr" ? "Sevgili" : "Dear";
  return localeName;
}

function linkButton(url: string, locale: Locale, label: string): string {
  const align = locale === "ar" ? "right" : "left";
  return `<a href="${escapeHtml(url)}" style="display:inline-block;background:#1f6feb;color:#ffffff;font-family:ui-text-contrast,ui-sans,system-ui,sans-serif;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;text-align:${align};">${escapeHtml(label)}</a>`;
}

function textLink(url: string, locale: Locale, label: string): string {
  return locale === "ar" ? `${label}: ${url}` : `${label}: ${url}`;
}

function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const DIR: Record<Locale, string> = { ar: "rtl", en: "ltr", tr: "ltr" };
const LANG: Record<Locale, string> = { ar: "ar", en: "en", tr: "tr" };

function htmlDocument(locale: Locale, preheader: string, body: string): string {
  return `<!doctype html><html lang="${LANG[locale]}" dir="${DIR[locale]}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(preheader)}</title><style>body{font-family:Tahoma,Arial,sans-serif;margin:0;padding:24px;background:#f7f7f9;color:#1a1a2e;line-height:1.6}${locale === "ar" ? "body{text-align:right;}" : ""}a{color:#1f6feb}</style></head><body><div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;border:1px solid #e5e5ed">${body}</div><p style="color:#888;font-size:12px;margin-top:24px">${escapeHtml(preheader)}</p></body></html>`;
}

export function renderEmail(
  locale: Locale,
  kind: EmailKind,
  vars: EmailVariables,
  urls?: {
    verificationUrl?: string;
    otpExpirySeconds?: number;
    tokenExpiryMinutes?: number;
    resetUrl?: string;
  },
): { subject: string; html: string; text: string } {
  const t = T[locale];
  const url = urls?.verificationUrl ?? vars.verificationUrl;
  const resetUrl = urls?.resetUrl ?? vars.resetUrl;

  const base = {
    brandTitle: vars.brandTitle || BRAND,
    brandUrl: vars.brandUrl || BRAND_URL,
  };

  if (kind === "verification" || kind === "email_change_confirm") {
    const label = kind === "verification" ? tKeys(locale, "verify_email") : tKeys(locale, "confirm_email");
    const confirmUrl = kind === "verification" ? url : url;
    const subject = t.verification.subject;
    const html = htmlDocument(
      locale,
      t.verification.preheader,
      `<h1>${escapeHtml(label.title)}</h1><p>${greeting(locale, vars.recipientName)}</p><p>${escapeHtml(label.body)}</p>${confirmUrl ? linkButton(confirmUrl, locale, label.cta) : ""}<p style="margin-top:24px;font-size:12px;color:#666">${label.expiry(tokensExpiry(urls))}</p>`,
    );
    const txt = `${label.title}\n\n${greeting(locale, vars.recipientName)}\n${label.body}\n\n${confirmUrl ? textLink(confirmUrl, locale, label.cta) : ""}\n\n${label.expiry(tokensExpiry(urls))}`;
    return { subject, html, text: txt };
  }

  if (kind === "otp") {
    const subject = t.otp.subject;
    const code = vars.otpCode ?? "";
    const expiry = otpExpiryLabel(locale, urls?.otpExpirySeconds ?? vars.otpExpirySeconds ?? 600);
    const html = htmlDocument(
      locale,
      t.otp.preheader,
      `<h1>${tKeys(locale, "otp_title").title}</h1><p>${greeting(locale, vars.recipientName)}</p><p>${tKeys(locale, "otp_body").body}</p><p style="font-size:32px;font-weight:700;letter-spacing:8px;background:#f0f4ff;border-radius:8px;padding:16px;text-align:center">${escapeHtml(code)}</p><p style="font-size:12px;color:#666">${expiry}</p>`,
    );
    const txt = `${tKeys(locale, "otp_title").title}\n\n${code}\n\n${expiry}`;
    return { subject, html, text: txt };
  }

  if (kind === "welcome") {
    const subject = t.welcome.subject;
    const label = tKeys(locale, "welcome");
    const html = htmlDocument(
      locale,
      t.welcome.preheader,
      `<h1>${label.title}</h1><p>${greeting(locale, vars.recipientName)}</p><p>${label.body}</p><a href="${base.brandUrl}" style="display:inline-block;background:#1f6feb;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">${label.cta}</a>`,
    );
    const txt = `${label.title}\n\n${greeting(locale, vars.recipientName)}\n${label.body}\n\n${base.brandUrl}`;
    return { subject, html, text: txt };
  }

  if (kind === "reset") {
    const subject = t.reset.subject;
    const label = tKeys(locale, "reset");
    const html = htmlDocument(
      locale,
      t.reset.preheader,
      `<h1>${label.title}</h1><p>${greeting(locale, vars.recipientName)}</p><p>${label.body}</p>${resetUrl ? linkButton(resetUrl, locale, label.cta) : ""}<p style="font-size:12px;color:#666">${label.expiry(tokensExpiry({ tokenExpiryMinutes: urls?.tokenExpiryMinutes ?? 1440 }))}</p>`,
    );
    const txt = `${label.title}\n\n${label.body}\n\n${resetUrl ? textLink(resetUrl, locale, label.cta) : ""}\n\n${label.expiry(tokensExpiry({ tokenExpiryMinutes: urls?.tokenExpiryMinutes ?? 1440 }))}`;
    return { subject, html, text: txt };
  }

  if (kind === "password_changed") {
    const subject = t.password_changed.subject;
    const label = tKeys(locale, "password_changed");
    const html = htmlDocument(locale, t.password_changed.preheader, `<h1>${label.title}</h1><p>${greeting(locale, vars.recipientName)}</p><p>${label.body}</p>`);
    const txt = `${label.title}\n\n${label.body}`;
    return { subject, html, text: txt };
  }

  if (kind === "email_changed") {
    const subject = t.email_changed.subject;
    const label = tKeys(locale, "email_changed");
    const html = htmlDocument(locale, t.email_changed.preheader, `<h1>${label.title}</h1><p>${greeting(locale, vars.recipientName)}</p><p>${label.body}</p>`);
    const txt = `${label.title}\n\n${label.body}`;
    return { subject, html, text: txt };
  }

  throw new Error(`Unknown email kind: ${kind}`);
}

function tokensExpiry(urls: { tokenExpiryMinutes?: number } | undefined): number {
  if (!urls?.tokenExpiryMinutes) return 1440;
  return urls?.tokenExpiryMinutes;
}

function otpExpiryLabel(locale: Locale, seconds: number): string {
  const label = tKeys(locale, "otp_expiry");
  return label.body.replace("{seconds}", String(seconds));
}

function tKeys(locale: Locale, key: string): { title: string; body: string; cta: string; expiry: (n: number) => string } {
  const LABELS: Record<Locale, Record<string, { title: string; body: string; cta: string; expiry: (n: number) => string }>> = {
    ar: {
      verify_email: { title: "تفعيل البريد الإلكتروني", body: "شكراً لتسجيلك في أكار برو ماكس. اضغط الزر أدناه لتفعيل بريدك الإلكتروني وتفعيل حسابك.", cta: "تفعيل البريد الإلكتروني", expiry: (n) => `ينتهي هذا الرابط بعد ${n} دقيقة.` },
      confirm_email: { title: "تأكيد البريد الإلكتروني الجديد", body: "لقد طلبت تغيير بريدك الإلكتروني. اضغط الزر أدناه لتأكيد العنوان الجديد.", cta: "تأكيد البريد الإلكتروني", expiry: (n) => `ينتهي هذا الرابط بعد ${n} دقيقة.` },
      otp_title: { title: "رمز التحقق", body: "", cta: "", expiry: () => "" },
      otp_body: { title: "", body: "استخدم الرمز أدناه لتأكيد عمليقتك. لا تشاركه مع أحد.", cta: "", expiry: () => "" },
      otp_expiry: { title: "", body: "ينتهاء الصلاحية خلال {seconds} ثوانٍ", cta: "", expiry: () => "" },
      welcome: { title: "مرحباً بك!", body: "تم تفعيل حسابك بنجاح. يمكنك الآن الوثول إلى لوحة التحكم.", cta: "الذهاب إلى لوحة التحكم", expiry: () => "" },
      reset: { title: "استعادة كلمة المرور", body: "لقد طلبت استعادة كلمة المرور. اضغط الزر أدناه لتعيين كلمة مرور جديدة.", cta: "استعادة كلمة المرور", expiry: (n) => `ينتهي هذا الرابط بعد ${n} دقيقة.` },
      password_changed: { title: "تم تغيير كلمة المرور", body: "تم تحديث كلمة مرور حسابك بنجاح. إذا لم تقم بذلك، يرجى التواصل معنا فوراً.", cta: "", expiry: () => "" },
      email_changed: { title: "تم تغيير البريد الإلكتروني", body: "تم تحديث بريدك الإلكتروني على حسابك بنجاح.", cta: "", expiry: () => "" },
    },
    en: {
      verify_email: { title: "Verify your email", body: "Thank you for registering on AkarProMax. Click below to verify your email and activate your account.", cta: "Verify email", expiry: (n) => `This link expires in ${n} minutes.` },
      confirm_email: { title: "Confirm new email", body: "You requested to change your email address. Click below to confirm the new address.", cta: "Confirm email", expiry: (n) => `This link expires in ${n} minutes.` },
      otp_title: { title: "One-time code", body: "", cta: "", expiry: () => "" },
      otp_body: { title: "", body: "Use the code below to confirm your action. Never share it with anyone.", cta: "", expiry: () => "" },
      otp_expiry: { title: "", body: "Expires in {seconds} seconds", cta: "", expiry: () => "" },
      welcome: { title: "Welcome!", body: "Your account has been verified successfully. You can now access your dashboard.", cta: "Go to dashboard", expiry: () => "" },
      reset: { title: "Reset your password", body: "You requested a password reset. Click below to set a new password.", cta: "Reset password", expiry: (n) => `This link expires in ${n} minutes.` },
      password_changed: { title: "Password changed", body: "Your account password was updated successfully. If you did not do this, please contact us immediately.", cta: "", expiry: () => "" },
      email_changed: { title: "Email changed", body: "Your account email was updated successfully.", cta: "", expiry: () => "" },
    },
    tr: {
      verify_email: { title: "E-postayı doğrula", body: "AkarProMax'e kaydolduğunuz için teşekkürler. E-postanızı doğrulamak ve hesabınızı etkinleştirmek için tıklayın.", cta: "E-postayı doğrula", expiry: (n) => `Bu bağlantı ${n} dakika sonra sona erer.` },
      confirm_email: { title: "Yeni e-postayı onayla", body: "E-posta adresinizi değiştirmek istediniz. Yeni adresi onaylamak için tıklayın.", cta: "E-postayı onayla", expiry: (n) => `Bu bağlantı ${n} dakika sonra sona erer.` },
      otp_title: { title: "Tek kullanımlık kod", body: "", cta: "", expiry: () => "" },
      otp_body: { title: "", body: "Eyleminizi onaylamak için aşağıdaki kodu kullanın. Kimseyle paylaşmayın.", cta: "", expiry: () => "" },
      otp_expiry: { title: "", body: "{seconds} saniye içinde sona erer", cta: "", expiry: () => "" },
      welcome: { title: "Hoş geldiniz!", body: "Hesabınız başarıyla doğrulandı. Şimdi panele erişebilirsiniz.", cta: "Panele git", expiry: () => "" },
      reset: { title: "Şifreyi sıfırla", body: "Şifre sıfırlama talep ettiniz. Yeni bir şifre ayırmak için tıklayın.", cta: "Şifreyi sıfırla", expiry: (n) => `Bu bağlantı ${n} dakika sonra sona erer.` },
      password_changed: { title: "Şifre değiştirildi", body: "Hesabınızın şifresi başarıyla güncellendi. Eğer bu işlem siz değilseniz, lütfen hemen bizimle iletişime geçin.", cta: "", expiry: () => "" },
      email_changed: { title: "E-posta değiştirildi", body: "Hesabınızın e-postası başarıyla güncellendi.", cta: "", expiry: () => "" },
    },
  };
  const found = LABELS[locale][key];
  if (!found) throw new Error(`Missing label ${key} for locale ${locale}`);
  return found;
}
