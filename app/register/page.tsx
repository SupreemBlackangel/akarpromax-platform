"use client";
import { useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";

const REGISTER_URL = "/api/auth/register";

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]" />
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite") || "";

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    acceptTerms: false,
    acceptMarketing: false,
    inviteToken,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);


  const checkPasswordStrength = (pass: string) => {
    let score = 0;
    if (pass.length >= 8) score++;
    if (pass.match(/[a-z]/) && pass.match(/[A-Z]/)) score++;
    if (pass.match(/\d/)) score++;
    if (pass.match(/[^a-zA-Z\d]/)) score++;
    const levels = [
      { score: 0, label: "ضعيفة", color: "red" },
      { score: 1, label: "ضعيفة", color: "red" },
      { score: 2, label: "متوسطة", color: "yellow" },
      { score: 3, label: "قوية", color: "green" },
      { score: 4, label: "قوية جداً", color: "green" },
    ];
    return levels[score] || levels[0];
  };

  const passwordStrength = useMemo(
    () => checkPasswordStrength(formData.password),
    [formData.password],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = "الاسم مطلوب";
    if (!formData.email.trim()) {
      newErrors.email = "البريد الإلكتروني مطلوب";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "بريد إلكتروني غير صحيح";
    }
    if (formData.password.length < 8)
      newErrors.password = "كلمة المرور يجب أن تكون 8 أحرف على الأقل";
    if (formData.password !== formData.confirmPassword)
      newErrors.confirmPassword = "كلمتا المرور غير متطابقتين";
    if (!formData.acceptTerms)
      newErrors.acceptTerms = "يجب الموافقة على الشروط والأحكام";
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(REGISTER_URL, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
          preferredLanguage: "ar",
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (data.error === "already_registered") {
          setErrors({
            email: "هذا البريد الإلكتروني مسجل مسبقاً. تسجيل الدخول",
          });
        } else if (data.error === "EMAIL_UNVERIFIED") {
          setErrors({
            email:
              "هذا البريد مسجل ولكن لم يتم تفعيله. إعادة إرسال التفعيل",
          });
        } else {
          setErrors({
            general: data.error || "حدث خطأ، حاول مرة أخرى",
          });
        }
        setLoading(false);
        return;
      }

      if (data.requiresVerification) {
        router.push(
          `/verify-email?email=${encodeURIComponent(formData.email.trim().toLowerCase())}`,
        );
      } else {
        router.push("/onboarding");
      }
    } catch (error) {
      setErrors({ general: "حدث خطأ في الاتصال بالخادم" });
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-gray-50 flex items-center justify-center p-4"
      dir="rtl"
    >
      <div className="w-full max-w-5xl bg-[var(--color-surface)] rounded-2xl shadow-xl overflow-hidden flex flex-col md:flex-row">
        {/* Brand Side */}
        <div className="md:w-5/11 bg-gradient-to-br from-blue-700 to-blue-900 p-8 md:p-12 text-white flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-[var(--color-surface)]/20 rounded-xl flex items-center justify-center text-2xl font-bold">
                ع
              </div>
              <span className="text-2xl font-bold">عقار بروماكس</span>
            </div>
            <h1 className="text-3xl font-bold mb-4">مرحباً بك</h1>
            <p className="text-[var(--color-primary)]/80 text-lg mb-8">
              عقارك، خدماتك، أعمالك ومجتمعك المهني في منصة واحدة
            </p>
            <ul className="space-y-4 text-[var(--color-primary)]/80">
              <li className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-[var(--color-primary)]" />
                اكتشف العقارات للبيع والإيجار
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-[var(--color-primary)]" />
                تواصل مع المحترفين والمكاتب العقارية
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-[var(--color-primary)]" />
                أنشئ ملفك المهني وطور أعمالك
              </li>
            </ul>
          </div>
          <div className="text-[var(--color-primary)] text-sm">
            © 2026 عقار بروماكس. جميع الحقوق محفوظة
          </div>
        </div>

        {/* Form Side */}
        <div className="md:w-6/11 p-8 md:p-12">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-800">إنشاء حساب</h2>
            <p className="text-gray-500 text-sm mt-1">
              أدخل بياناتك لإنشاء حساب جديد
            </p>
          </div>

          {errors.general && (
            <div className="mb-4 p-3 bg-[var(--color-error-soft)] border border-[var(--color-error)]/30 rounded-lg text-[var(--color-error)] text-sm flex items-start gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              {errors.general}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                الاسم الكامل
              </label>
              <div className="relative">
                <User className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className={`w-full p-3 pr-10 border rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] ${
                    errors.name ? "border-[var(--color-error)]" : "border-gray-300"
                  }`}
                  placeholder="أحمد محمد"
                  required
                />
              </div>
              {errors.name && (
                <p className="text-red-500 text-sm mt-1">{errors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                البريد الإلكتروني
              </label>
              <div className="relative">
                <Mail className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className={`w-full p-3 pr-10 border rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] ${
                    errors.email ? "border-[var(--color-error)]" : "border-gray-300"
                  }`}
                  placeholder="example@email.com"
                  required
                />
              </div>
              {errors.email && (
                <p
                  className="text-red-500 text-sm mt-1"
                  dangerouslySetInnerHTML={{ __html: errors.email }}
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                كلمة المرور
              </label>
              <div className="relative">
                <Lock className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className={`w-full p-3 pr-10 pl-12 border rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] ${
                    errors.password ? "border-[var(--color-error)]" : "border-gray-300"
                  }`}
                  placeholder="••••••••"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-3 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {formData.password && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        passwordStrength.color === "red"
                          ? "bg-[var(--color-error-soft)]0"
                          : passwordStrength.color === "yellow"
                            ? "bg-yellow-500"
                            : "bg-green-500"
                      }`}
                      style={{ width: `${(passwordStrength.score + 1) * 25}%` }}
                    />
                  </div>
                  <span
                    className={`text-xs font-medium ${
                      passwordStrength.color === "red"
                        ? "text-red-500"
                        : passwordStrength.color === "yellow"
                          ? "text-yellow-600"
                          : "text-green-600"
                    }`}
                  >
                    {passwordStrength.label}
                  </span>
                </div>
              )}
              {errors.password && (
                <p className="text-red-500 text-sm mt-1">{errors.password}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                تأكيد كلمة المرور
              </label>
              <div className="relative">
                <Lock className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type={showConfirm ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      confirmPassword: e.target.value,
                    })
                  }
                  className={`w-full p-3 pr-10 pl-12 border rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] ${
                    errors.confirmPassword
                      ? "border-[var(--color-error)]"
                      : "border-gray-300"
                  }`}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute left-3 top-3 text-gray-400 hover:text-gray-600"
                >
                  {showConfirm ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="flex items-start gap-2 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.acceptTerms}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      acceptTerms: e.target.checked,
                    })
                  }
                  className="mt-0.5 w-4 h-4 text-[var(--color-primary)] border-gray-300 rounded focus:ring-[var(--color-primary)]"
                  required
                />
                <span>
                  أوافق على{" "}
                  <a
                    href="/terms"
                    className="text-[var(--color-primary)] hover:underline"
                  >
                    شروط الاستخدام
                  </a>{" "}
                  و{" "}
                  <a
                    href="/privacy"
                    className="text-[var(--color-primary)] hover:underline"
                  >
                    سياسة الخصوصية
                  </a>
                </span>
              </label>
              {errors.acceptTerms && (
                <p className="text-red-500 text-sm">{errors.acceptTerms}</p>
              )}
              <label className="flex items-start gap-2 text-sm text-gray-500 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.acceptMarketing}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      acceptMarketing: e.target.checked,
                    })
                  }
                  className="mt-0.5 w-4 h-4 text-[var(--color-primary)] border-gray-300 rounded focus:ring-[var(--color-primary)]"
                />
                <span>أرغب في تلقي الأخبار والعروض والتحديثات (اختياري)</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[var(--color-primary)] text-white rounded-lg font-semibold hover:bg-[var(--color-primary-hover)] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> جاري الإنشاء...
                </>
              ) : (
                "إنشاء حساب"
              )}
            </button>

            {/* Social Login Divider */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-[var(--color-surface)] px-3 text-gray-500">أو</span>
              </div>
            </div>

            {/* Social Login Buttons */}
            <div className="space-y-3">
              <a
                href="/api/auth/google"
                className="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-300 bg-[var(--color-surface)] px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                المتابعة عبر Google
              </a>
              <a
                href="/api/auth/facebook"
                className="flex w-full items-center justify-center gap-3 rounded-lg border border-transparent bg-[#1877F2] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#166FE5]"
              >
                <svg className="h-5 w-5" fill="white" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                المتابعة عبر Facebook
              </a>
            </div>

            <p className="text-center text-sm text-gray-500">
              لديك حساب بالفعل؟{" "}
              <a
                href="/login"
                className="text-[var(--color-primary)] hover:underline font-medium"
              >
                تسجيل الدخول
              </a>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
