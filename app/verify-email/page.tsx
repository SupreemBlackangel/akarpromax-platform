"use client";
import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CheckCircle,
  AlertCircle,
  Mail,
  Loader2,
  RefreshCw,
  ArrowRight,
  Clipboard,
} from "lucide-react";

const VERIFY_URL = "/api/auth/verify-email";
const RESEND_URL = "/api/auth/verify-email/resend";

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      }
    >
      <VerifyEmailForm />
    </Suspense>
  );
}

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const tokenParam = searchParams.get("token") || "";

  const [token, setToken] = useState(tokenParam);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [status, setStatus] = useState<
    "idle" | "verifying" | "success" | "error"
  >(tokenParam ? "verifying" : "idle");
  const [message, setMessage] = useState("");
  const [resendTimer, setResendTimer] = useState(0);
  const [error, setError] = useState("");
  const [pasted, setPasted] = useState("");

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const handleVerify = useCallback(async () => {
    if (!token.trim()) {
      setError("الرجاء إدخال رمز التحقق");
      return;
    }
    setError("");
    setLoading(true);
    setStatus("verifying");
    try {
      const res = await fetch(VERIFY_URL, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus("error");
        setError(
          data.error === "invalid_or_expired_token"
            ? "رمز التحقق غير صالح أو منتهي الصلاحية"
            : data.error || "حدث خطأ، حاول مرة أخرى",
        );
        setLoading(false);
        return;
      }
      setStatus("success");
      setMessage("تم تفعيل حسابك بنجاح!");
      setTimeout(() => router.push("/login"), 1500);
    } catch (e) {
      setStatus("error");
      setError("حدث خطأ في الاتصال بالخادم");
      setLoading(false);
    }
  }, [token, router]);

  useEffect(() => {
    (async () => {
      if (tokenParam) {
        await handleVerify();
      }
    })();
  }, [tokenParam, handleVerify]);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const trimmed = text.trim();
      setPasted(trimmed);
      if (trimmed) {
        setToken(trimmed);
      }
    } catch {
      setError("لم يتم العثور على شيء في الحافظة");
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0 || !email) return;
    setResending(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch(RESEND_URL, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, locale: "ar" }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setResendTimer(60);
        setMessage("تم إرسال رابط تفعيل جديد إلى بريدك الإلكتروني");
      } else {
        setError(data.error || "فشل إعادة إرسال الرمز");
      }
    } catch (e) {
      setError("حدث خطأ في الاتصال بالخادم");
    } finally {
      setResending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleVerify();
    }
  };

  return (
    <div
      className="min-h-screen bg-gray-50 flex items-center justify-center p-4"
      dir="rtl"
    >
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">
            تحقق من بريدك الإلكتروني
          </h1>
          <p className="text-gray-500 mt-1">
            أدخل رمز التحقق المرسل إلى{" "}
            <span className="font-medium text-gray-700">
              {email || "بريدك"}
            </span>
          </p>
        </div>

        {message && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center gap-2">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            {message}
          </div>
        )}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {status === "verifying" ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">جارٍ تفعيل حسابك…</p>
          </div>
        ) : status === "success" ? (
          <div className="text-center py-12">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h2 className="font-semibold text-green-700">{message}</h2>
            <p className="text-sm text-gray-500 mt-2">
              جاري تحويلك إلى صفحة تسجيل الدخول…
            </p>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                رمز التحقق
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${error ? "border-red-500" : "border-gray-300"}`}
                  placeholder="ألصق رمز التحقق من بريدك"
                />
                <button
                  type="button"
                  onClick={handlePaste}
                  className="absolute left-3 top-3 text-gray-400 hover:text-gray-600"
                  title="لصق من الحافظة"
                >
                  <Clipboard className="w-5 h-5" />
                </button>
              </div>
              {pasted && (
                <p className="text-xs text-gray-400 mt-1">تم اللصق: {pasted.substring(0, 20)}…</p>
              )}
            </div>

            <button
              onClick={handleVerify}
              disabled={loading || !token.trim()}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> جاري التحقق...
                </>
              ) : (
                "تحقق وتفعيل"
              )}
            </button>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500">
                لم يصلك رابط التفعيل؟
              </p>
              <button
                onClick={handleResend}
                disabled={resendTimer > 0 || resending || !email}
                className={`text-sm font-medium mt-1 ${
                  resendTimer > 0
                    ? "text-gray-400"
                    : "text-blue-600 hover:underline"
                }`}
              >
                {resending ? (
                  <Loader2 className="w-4 h-4 animate-spin inline" />
                ) : resendTimer > 0 ? (
                  `إعادة الإرسال بعد ${resendTimer} ثانية`
                ) : (
                  "إعادة إرسال رابط التفعيل"
                )}
              </button>
              <div className="mt-3">
                <button
                  onClick={() =>
                    router.push(
                      `/register?email=${encodeURIComponent(email)}`,
                    )
                  }
                  className="text-sm text-gray-500 hover:text-blue-600 flex items-center justify-center gap-1 mx-auto"
                >
                  <ArrowRight className="w-4 h-4" />
                  البريد غير صحيح؟ تغيير البريد الإلكتروني
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
