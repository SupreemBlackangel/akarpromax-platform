"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle,
  AlertCircle,
  Loader2,
  User,
  Briefcase,
  Building2,
  Users,
  Send,
  X,
} from "lucide-react";

const ONBOARDING_URL = "/api/auth/onboarding/complete";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [choice, setChoice] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    bio: "",
    residence: "",
    workplace: "",
    avatar: null as File | null,
    avatarPreview: "",
  });
  const [error, setError] = useState("");

  const handleChoice = (value: string) => {
    setChoice(value);
    if (value === "skip") {
      handleComplete();
    } else {
      setStep(2);
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(ONBOARDING_URL, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        router.push("/dashboard");
      } else {
        const data = await res.json().catch(() => ({}));
        if (res.status === 401) {
          router.push("/login");
        } else {
          setError(data.error || "حدث خطأ، حاول مرة أخرى");
        }
      }
    } catch (e) {
      setError("حدث خطأ في الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({
        ...formData,
        avatar: file,
        avatarPreview: URL.createObjectURL(file),
      });
    }
  };

  if (step === 1) {
    return (
      <div
        className="min-h-screen bg-gray-50 flex items-center justify-center p-4"
        dir="rtl"
      >
        <div className="w-full max-w-2xl bg-[var(--color-surface)] rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-800">
              مرحباً بك في عقار بروماكس
            </h1>
            <p className="text-gray-500 mt-1">
              كيف ترغب في استخدام المنصة؟
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                value: "normal",
                label: "أبحث عن عقار أو أعرض عقاري",
                icon: "🏠",
                desc: "تصفح العقارات واعرض عقارك",
              },
              {
                value: "professional",
                label: "أنا حرفي أو مهني",
                icon: "🛠️",
                desc: "أنشئ ملفك المهني واستقبل طلبات العملاء",
              },
              {
                value: "office",
                label: "أمثل مكتباً عقارياً",
                icon: "🏢",
                desc: "أضف مكتبك العقاري وأدره",
              },
              {
                value: "company",
                label: "أمثل شركة",
                icon: "🏭",
                desc: "أضف شركتك وخدماتها",
              },
              {
                value: "skip",
                label: "تخطي الآن",
                icon: "⏭️",
                desc: "أكمل الملف لاحقاً",
              },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleChoice(opt.value)}
                className="p-4 border-2 rounded-xl hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] transition text-right"
              >
                <div className="text-2xl mb-1">{opt.icon}</div>
                <div className="font-semibold text-sm text-gray-700">
                  {opt.label}
                </div>
                <div className="text-xs text-gray-400">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-gray-50 flex items-center justify-center p-4"
      dir="rtl"
    >
      <div className="w-full max-w-2xl bg-[var(--color-surface)] rounded-2xl shadow-xl p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-800">
            أكمل ملفك الشخصي
          </h2>
          <button
            onClick={() => handleComplete()}
            className="text-gray-400 hover:text-gray-600 text-sm font-medium"
          >
            تخطي
          </button>
        </div>
        {error && (
          <div className="mb-4 p-3 bg-[var(--color-error-soft)] border border-[var(--color-error)]/30 rounded-lg text-[var(--color-error)] text-sm flex items-start gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            {error}
          </div>
        )}
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              الصورة الشخصية (اختياري)
            </label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 overflow-hidden flex items-center justify-center">
                {formData.avatarPreview ? (
                  <img
                    src={formData.avatarPreview}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-8 h-8 text-gray-400" />
                )}
              </div>
              <label className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 cursor-pointer text-sm">
                رفع الصورة
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              نبذة عني (اختياري)
            </label>
            <textarea
              value={formData.bio}
              onChange={(e) =>
                setFormData({ ...formData, bio: e.target.value })
              }
              className="w-full p-3 border rounded-lg h-24"
              placeholder="اكتب نبذة قصيرة عن نفسك..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              مكان الإقامة (اختياري)
            </label>
            <input
              type="text"
              value={formData.residence}
              onChange={(e) =>
                setFormData({ ...formData, residence: e.target.value })
              }
              className="w-full p-3 border rounded-lg"
              placeholder="المدينة، المنطقة، الدولة"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              مكان العمل (اختياري)
            </label>
            <input
              type="text"
              value={formData.workplace}
              onChange={(e) =>
                setFormData({ ...formData, workplace: e.target.value })
              }
              className="w-full p-3 border rounded-lg"
              placeholder="اسم جهة العمل والمسمى الوظيفي"
            />
          </div>

          <button
            onClick={handleComplete}
            disabled={loading}
            className="w-full py-3 bg-[var(--color-primary)] text-white rounded-lg font-semibold hover:bg-[var(--color-primary-hover)] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> جاري الحفظ...
              </>
            ) : (
              "حفظ ومتابعة"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
