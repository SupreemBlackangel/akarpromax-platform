import type { Locale } from "@/lib/email/templates";

export type AuthLabels = {
  login: string;
  loginTitle: string;
  loginSubtitle: string;
  loginSubmit: string;
  loginNoAccount: string;
  loginToRegister: string;
  register: string;
  registerTitle: string;
  registerSubtitle: string;
  registerSubmit: string;
  registerHasAccount: string;
  registerToLogin: string;
  emailLabel: string;
  emailPlaceholder: string;
  phoneLabel: string;
  phonePlaceholder: string;
  nameLabel: string;
  namePlaceholder: string;
  passwordLabel: string;
  passwordPlaceholder: string;
  passwordHint: string;
  rememberMe: string;
  forgotPassword: string;
  verifyEmailTitle: string;
  verifyEmailSubtitle: string;
  verifyEmailNote: string;
  verifyEmailResend: string;
  verifyOtpTitle: string;
  verifyOtpSubtitle: string;
  verifyOtpSubmit: string;
  verifyOtpResend: string;
  otpPlaceholder: string;
  forgotTitle: string;
  forgotSubtitle: string;
  forgotSubmit: string;
  forgotSent: string;
  resetTitle: string;
  resetSubtitle: string;
  resetSubmit: string;
  resetPasswordLabel: string;
  resetPasswordPlaceholder: string;
  onboardingTitle: string;
  onboardingSubtitle: string;
  onboardingComplete: string;
  accountSecurity: string;
  accountSecuritySubtitle: string;
  accountTitle: string;
  accountDescription: string;
  emailVerification: string;
  registerDate: string;
  dashboardTitle: string;
  providerTitle: string;
  accountSecurityTitle: string;
  changePasswordTitle: string;
  changePasswordSubmit: string;
  currentPasswordLabel: string;
  newPasswordLabel: string;
  changeEmailTitle: string;
  changeEmailSubmit: string;
  newEmailLabel: string;
  newEmailPlaceholder: string;
  verifyOtpPrompt: string;
  localeAr: string;
  localeEn: string;
  localeTr: string;
  or: string;
  error: {
    invalidCredentials: string;
    accountBlocked: string;
    rateLimited: string;
    originRejected: string;
    serviceUnavailable: string;
    invalidToken: string;
    invalidCode: string;
    tooManyAttempts: string;
    notVerified: string;
    emailInUse: string;
    wrongPassword: string;
    mustVerify: string;
    generic: string;
  };
};

export const AUTH_LABELS: Record<Locale, AuthLabels> = {
  ar: {
    login: "تسجيل الدخول",
    loginTitle: "مرحباً بعودتك",
    loginSubtitle: "سجّل الدخول للاستمرار في استخدام حسابك.",
    loginSubmit: "تسجيل الدخول",
    loginNoAccount: "ليس لديك حساب؟",
    loginToRegister: "أنشئ حسابك",
    register: "إنشاء حساب",
    registerTitle: "أنشئ حساباً جديداً",
    registerSubtitle: "سجّل لتفعيل حسابك عبر بريدك الإلكتروني.",
    registerSubmit: "إنشاء الحساب",
    registerHasAccount: "لديك حساب؟",
    registerToLogin: "سجّل الدخول",
    emailLabel: "البريد الإلكتروني",
    emailPlaceholder: "example@akarpromax.com",
    phoneLabel: "الهاتف",
    phonePlaceholder: "+968 1234 5678",
    nameLabel: "الاسم",
    namePlaceholder: "اسمك الكامل",
    passwordLabel: "كلمة المرور",
    passwordPlaceholder: "••••••••",
    passwordHint: "يجب أن تكون 8 أحرف على الأقل",
    rememberMe: "تذكرني",
    forgotPassword: "نسيت كلمة المرور؟",
    verifyEmailTitle: "تفعيل البريد الإلكتروني",
    verifyEmailSubtitle: "أرسلنا رابط تفعيل إلى بريدك الإلكتروني.",
    verifyEmailNote: "اضغط على الرابط لتفعيل حسابك.",
    verifyEmailResend: "إعادة إرسال رابط التفعيل",
    verifyOtpTitle: "رمز التحقق",
    verifyOtpSubtitle: "أرسلنا رمزاً مكوّناً مكوّناً إلى بريدك.",
    verifyOtpSubmit: "تأكيد",
    verifyOtpResend: "إعادة إرسال الرمز",
    otpPlaceholder: "الرمز ستة أرقام",
    forgotTitle: "استعادة كلمة المرور",
    forgotSubtitle: "أدخل بريدك وسنرسل لك رابطاً لاستعادة كلمة المرور.",
    forgotSubmit: "إرسال الرابط",
    forgotSent: "إذا كان البريد مسجّلاً، تم إرسال الرابط.",
    resetTitle: "تعيين كلمة مرور جديدة",
    resetSubtitle: "أدخل كلمة المرور الجديدة.",
    resetSubmit: "حفظ كلمة المرور",
    resetPasswordLabel: "كلمة المرور الجديدة",
    resetPasswordPlaceholder: "••••••••",
    onboardingTitle: "مرحباً بك",
    onboardingSubtitle: "حسابك جاهز. أنهِ إعداداتك للمتابعة.",
    onboardingComplete: "الانتهاء",
    accountSecurity: "أمان الحساب",
    accountSecuritySubtitle: "إدارة كلمة المرور والبريد الإلكتروني.",
    accountTitle: "ملفي الشخصي",
    accountDescription: "بيانات حسابك على منصة أكار بروماكس.",
    emailVerification: "توثيق البريد",
    registerDate: "تاريخ التسجيل",
    dashboardTitle: "لوحة التحكم",
    providerTitle: "الملف المهني",
    accountSecurityTitle: "الأمان",
    changePasswordTitle: "تغيير كلمة المرور",
    changePasswordSubmit: "حفظ",
    currentPasswordLabel: "كلمة المرور الحالية",
    newPasswordLabel: "كلمة المرور الجديدة",
    changeEmailTitle: "تغيير البريد الإلكتروني",
    changeEmailSubmit: "إرسال رمز التحقق",
    newEmailLabel: "البريد الإلكتروني الجديد",
    newEmailPlaceholder: "example@akarpromax.com",
    verifyOtpPrompt: "أدخل الرمز المرسل إلى بريدك الإلكتروني الجديد.",
    localeAr: "العربية",
    localeEn: "English",
    localeTr: "Türkçe",
    or: "أو",
    error: {
      invalidCredentials: "بيانات الاعتماد غير صحيحة",
      accountBlocked: "الحساب غير مفعّل",
      rateLimited: "طلباتك كثيرة، حاول لاحقاً",
      originRejected: "تعذّر تسجيل الدخول من هذا العنوان. افتح الموقع من عنوانه الرسمي بدون www ثم حاول مجدداً.",
      serviceUnavailable: "الخدمة غير متاحة مؤقتاً، والخطأ مسجَّل لدينا. حاول بعد قليل.",
      invalidToken: "رابط غير صالح أو منتهٍ",
      invalidCode: "رمز غير صحيح",
      tooManyAttempts: "محاولات كثيرة، حاول لاحقاً",
      notVerified: "يجب تفعيل البريد الإلكتروني",
      emailInUse: "هذا البريد مستخدم بالفع",
      wrongPassword: "كلمة المرور الحالية غير صحيحة",
      mustVerify: "يجب تفعيل البريد الإلكتروني قبل تسجيل الدخول",
      generic: "حدث خطأ غير متوقع",
    },
  },
  en: {
    login: "Login",
    loginTitle: "Welcome back",
    loginSubtitle: "Sign in to continue using your account.",
    loginSubmit: "Sign in",
    loginNoAccount: "Don't have an account?",
    loginToRegister: "Create your account",
    register: "Register",
    registerTitle: "Create an account",
    registerSubtitle: "Register to activate your account via email.",
    registerSubmit: "Create account",
    registerHasAccount: "Already have an account?",
    registerToLogin: "Log in",
    emailLabel: "Email",
    emailPlaceholder: "example@akarpromax.com",
    phoneLabel: "Phone",
    phonePlaceholder: "+968 1234 5678",
    nameLabel: "Full name",
    namePlaceholder: "Your full name",
    passwordLabel: "Password",
    passwordPlaceholder: "••••••••",
    passwordHint: "Must be at least 8 characters",
    rememberMe: "Remember me",
    forgotPassword: "Forgot your password?",
    verifyEmailTitle: "Verify your email",
    verifyEmailSubtitle: "We sent an activation link to your email.",
    verifyEmailNote: "Click the link to activate your account.",
    verifyEmailResend: "Resend activation link",
    verifyOtpTitle: "One-time code",
    verifyOtpSubtitle: "We sent a one-time code to your email.",
    verifyOtpSubmit: "Confirm",
    verifyOtpResend: "Resend code",
    otpPlaceholder: "6-digit code",
    forgotTitle: "Reset your password",
    forgotSubtitle: "Enter your email and we’ll send you a reset link.",
    forgotSubmit: "Send link",
    forgotSent: "If the email is registered, a reset link has been sent.",
    resetTitle: "Set a new password",
    resetSubtitle: "Enter your new password.",
    resetSubmit: "Save password",
    resetPasswordLabel: "New password",
    resetPasswordPlaceholder: "••••••••",
    onboardingTitle: "Welcome",
    onboardingSubtitle: "Your account is ready. Finish your setup to continue.",
    onboardingComplete: "Finish",
    accountSecurity: "Account security",
    accountSecuritySubtitle: "Manage your password and email.",
    accountTitle: "My profile",
    accountDescription: "Your account details on the AkarProMax platform.",
    emailVerification: "Email verification",
    registerDate: "Member since",
    dashboardTitle: "Dashboard",
    providerTitle: "Professional profile",
    accountSecurityTitle: "Security",
    changePasswordTitle: "Change password",
    changePasswordSubmit: "Save",
    currentPasswordLabel: "Current password",
    newPasswordLabel: "New password",
    changeEmailTitle: "Change email",
    changeEmailSubmit: "Send verification code",
    newEmailLabel: "New email",
    newEmailPlaceholder: "example@akarpromax.com",
    verifyOtpPrompt: "Enter the code sent to your new email.",
    localeAr: "Arabic",
    localeEn: "English",
    localeTr: "Türkçe",
    or: "or",
    error: {
      invalidCredentials: "Invalid credentials",
      accountBlocked: "Account is not active",
      rateLimited: "Too many requests, please try again later",
      originRejected: "Sign-in is not accepted from this address. Open the site at its official address without www and try again.",
      serviceUnavailable: "The service is temporarily unavailable and the error has been recorded. Please try again shortly.",
      invalidToken: "Invalid or expired link",
      invalidCode: "Incorrect code",
      tooManyAttempts: "Too many attempts, please try again later",
      notVerified: "Email must be verified",
      emailInUse: "This email is already in use",
      wrongPassword: "Current password is incorrect",
      mustVerify: "Verify your email before signing in",
      generic: "An unexpected error occurred",
    },
  },
  tr: {
    login: "Giriş",
    loginTitle: "Hoş geldiniz",
    loginSubtitle: "Hesabınızı kullanmaya devam etmek için oturum açın.",
    loginSubmit: "Oturum aç",
    loginNoAccount: "Hesabınız yok mu?",
    loginToRegister: "Hesabınızı oluşturun",
    register: "Kayıt ol",
    registerTitle: "Yeni hesap oluştur",
    registerSubtitle: "E-postanızla hesabınızı etkinleştirin.",
    registerSubmit: "Hesap oluştur",
    registerHasAccount: "Zaten hesabınız var mı?",
    registerToLogin: "Giriş yap",
    emailLabel: "E-posta",
    emailPlaceholder: "example@akarpromax.com",
    phoneLabel: "Telefon",
    phonePlaceholder: "+968 1234 5678",
    nameLabel: "Adınız",
    namePlaceholder: "Tam adınız",
    passwordLabel: "Şifre",
    passwordPlaceholder: "••••••••",
    passwordHint: "En az 8 karakter",
    rememberMe: "Beni hatırla",
    forgotPassword: "Şifrenizi mi unuttunuz?",
    verifyEmailTitle: "E-postanızı doğrulayın",
    verifyEmailSubtitle: "E-postanıza bir etkinleştirme bağlantısı gönderdik.",
    verifyEmailNote: "Hesabınızı etkinleştirmek için bağlantıya tıklayın.",
    verifyEmailResend: "Etkinleştirme bağlantısını yeniden gönder",
    verifyOtpTitle: "Tek kullanımlık kod",
    verifyOtpSubtitle: "E-postanıza bir tek kullanımlık kod gönderdik.",
    verifyOtpSubmit: "Onayla",
    verifyOtpResend: "Kodu yeniden gönder",
    otpPlaceholder: "6 haneli kod",
    forgotTitle: "Şifreyi sıfırla",
    forgotSubtitle: "E-postanızı girin, size sıfırlama bağlantısı gönderelim.",
    forgotSubmit: "Bağlantı gönder",
    forgotSent: "E-posta kayıtlıysa, sıfırlama bağlantısı gönderildi.",
    resetTitle: "Yeni şifre belirle",
    resetSubtitle: "Yeni şifrenizi girin.",
    resetSubmit: "Şifreyi kaydet",
    resetPasswordLabel: "Yeni şifre",
    resetPasswordPlaceholder: "••••••••",
    onboardingTitle: "Hoş geldiniz",
    onboardingSubtitle: "Hesabınız hazır. Devam etmek için ayarlarınızı bitirin.",
    onboardingComplete: "Bitir",
    accountSecurity: "Hesap güvenliği",
    accountSecuritySubtitle: "Şifrenizi ve e-postanızı yönetin.",
    accountTitle: "Profilim",
    accountDescription: "AkarProMax platformundaki hesap bilgileriniz.",
    emailVerification: "E-posta doğrulaması",
    registerDate: "Kayıt tarihi",
    dashboardTitle: "Panel",
    providerTitle: "Profesyonel profil",
    accountSecurityTitle: "Güvenlik",
    changePasswordTitle: "Şifreyi değiştir",
    changePasswordSubmit: "Kaydet",
    currentPasswordLabel: "Mevcut şifre",
    newPasswordLabel: "Yeni şifre",
    changeEmailTitle: "E-postayı değiştir",
    changeEmailSubmit: "Doğrulama kodu gönder",
    newEmailLabel: "Yeni e-posta",
    newEmailPlaceholder: "example@akarpromax.com",
    verifyOtpPrompt: "Yeni e-postanıza gönderilen kodu girin.",
    localeAr: "Arapça",
    localeEn: "English",
    localeTr: "Türkçe",
    or: "veya",
    error: {
      invalidCredentials: "Geçersiz kimlik bilgileri",
      accountBlocked: "Hesap etkin değil",
      rateLimited: "Çok fazla istek, lütfen daha sonra tekrar deneyin",
      originRejected: "Bu adresten giriş kabul edilmiyor. Siteyi www olmadan resmi adresinden açıp tekrar deneyin.",
      serviceUnavailable: "Hizmet geçici olarak kullanılamıyor, hata kaydedildi. Lütfen kısa süre sonra tekrar deneyin.",
      invalidToken: "Geçersiz veya süresi dolmuş bağlantı",
      invalidCode: "Hatalı kod",
      tooManyAttempts: "Çok fazla deneme, lütfen daha sonra tekrar deneyin",
      notVerified: "E-posta doğrulaması gerekli",
      emailInUse: "Bu e-posta zaten kullanımda",
      wrongPassword: "Mevcut şifre hatalı",
      mustVerify: "Giriş yapmadan önce e-postanızı doğrulayın",
      generic: "Beklenmeyen bir hata oluştu",
    },
  },
};

export function authLabels(locale: Locale): AuthLabels {
  return AUTH_LABELS[locale];
}
