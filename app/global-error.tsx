"use client";

/**
 * Root error boundary — replaces the entire document when the root layout
 * itself fails, so it must render its own <html>/<body> and cannot rely on
 * globals.css being present. Styles are inlined for that reason.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body style={{ margin: 0, minHeight: "100vh", display: "grid", placeItems: "center", background: "#fbfcff", color: "#0b214c", fontFamily: "Cairo, Tahoma, Arial, sans-serif" }}>
        <div style={{ maxWidth: 420, padding: 40, borderRadius: 22, border: "1px solid #d8e3f3", background: "#ffffff", textAlign: "center", boxShadow: "0 14px 40px rgba(11,42,92,.09)" }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 900, letterSpacing: 4, color: "#dc2626" }}>خطأ</p>
          <h1 style={{ margin: "12px 0 8px", fontSize: 24, fontWeight: 900 }}>تعذر تحميل المنصة</h1>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.8, color: "#475970" }}>
            حدث خطأ غير متوقع. أعد المحاولة، وإن استمرت المشكلة تواصل معنا.
          </p>
          {error?.digest && (
            <p style={{ marginTop: 10, fontSize: 11, color: "#7e8ca5" }} dir="ltr">digest: {error.digest}</p>
          )}
          <button
            type="button"
            onClick={() => reset()}
            style={{ marginTop: 24, padding: "10px 22px", border: 0, borderRadius: 8, background: "#1769ff", color: "#fff", fontSize: 14, fontWeight: 900, cursor: "pointer" }}
          >
            إعادة المحاولة
          </button>
        </div>
      </body>
    </html>
  );
}
