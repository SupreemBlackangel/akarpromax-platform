import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "حذف البيانات | عقار بروماكس",
  description: "كيفية حذف بياناتك أو حسابك من منصة عقار بروماكس، وما يُحذف وما يبقى ولماذا.",
};

export const dynamic = "force-dynamic";

/**
 * The data deletion page.
 *
 * Facebook requires every app reading user data to publish either deletion
 * instructions or a callback. This platform has both: the callback at
 * /api/auth/facebook/data-deletion runs automatically when somebody removes the
 * app from their Facebook account, and this page is where they are sent
 * afterwards, and where anyone can read what actually happens.
 *
 * It says plainly what is NOT deleted, and why. A page that implied contracts
 * and ledger entries vanish when a login is detached would be making a promise
 * the business cannot keep -- brokerage records are retained by law -- and a
 * privacy commitment that cannot be honoured is worse than none.
 */
export default async function DataDeletionPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const params = await searchParams;
  const code = typeof params.code === "string" ? params.code.slice(0, 64) : "";

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="bg-[var(--color-surface)] rounded-xl shadow-lg p-8 space-y-6">
          <h1 className="text-3xl font-bold text-center mb-8">حذف البيانات</h1>

          {code ? (
            <div className="bg-green-50 border border-green-200 p-4 rounded" dir="rtl">
              <p className="text-green-900 font-semibold mb-1">تم استلام طلب الحذف وتنفيذه.</p>
              <p className="text-green-800 text-sm">
                رقم التأكيد:{" "}
                <span className="font-mono bg-white px-2 py-0.5 rounded border border-green-200">
                  {code}
                </span>
              </p>
              <p className="text-green-800 text-sm mt-2">
                احتفظ بهذا الرقم إن أردت مراجعتنا بشأن الطلب.
              </p>
            </div>
          ) : null}

          <div className="space-y-6 text-gray-700" dir="rtl">
            <section>
              <h2 className="text-xl font-semibold text-[var(--color-primary)]">
                إزالة الربط مع فيسبوك
              </h2>
              <p>
                إذا سجّلت دخولك عبر فيسبوك، يمكنك إزالة الربط من إعدادات حسابك في فيسبوك:
                {" "}<span className="font-medium">الإعدادات ← التطبيقات والمواقع ← عقار بروماكس ← إزالة</span>.
                عند ذلك يصلنا إشعار تلقائي، فنحذف ارتباط حسابك بفيسبوك ورموز الوصول المرتبطة به،
                ولا يعود بإمكاننا قراءة أي شيء من حسابك على فيسبوك.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[var(--color-primary)]">
                ما الذي يُحذف بهذا الإجراء
              </h2>
              <ul className="list-disc pr-6 space-y-1">
                <li>ارتباط حسابك في المنصة بحسابك في فيسبوك.</li>
                <li>رمز الوصول (access token) الذي كان يسمح لنا بالقراءة من فيسبوك.</li>
                <li>الاسم وصورة الحساب والبريد اللذان وصلانا من فيسبوك ضمن هذا الارتباط.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[var(--color-primary)]">
                ما الذي لا يُحذف — ولماذا نقولها بوضوح
              </h2>
              <p>
                إزالة الربط <span className="font-semibold">لا تحذف حسابك في المنصة</span> ولا ما يتعلق به
                من عقارات أو عقود أو قيود مالية. هذه سجلات عمل، وبعضها يخضع لمُدد حفظ نظامية
                تلزم المكتب العقاري بالاحتفاظ بها. لو ادّعينا حذفها لكان وعدًا لا نستطيع الوفاء به.
              </p>
              <p className="mt-2">
                يبقى بإمكانك الدخول إلى حسابك بكلمة المرور أو بوسيلة دخول أخرى.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[var(--color-primary)]">
                حذف الحساب بالكامل
              </h2>
              <p>
                إن أردت حذف حسابك ومعه بياناتك الشخصية، أرسل طلبًا من البريد المسجَّل لدينا إلى{" "}
                <a className="text-[var(--color-primary)] underline" href="mailto:privacy@akarpromax.com">
                  privacy@akarpromax.com
                </a>{" "}
                بعنوان «طلب حذف حساب». نؤكد استلام الطلب خلال ثلاثة أيام عمل، وننفّذه خلال ثلاثين يومًا.
              </p>
              <p className="mt-2">
                الإرسال من البريد المسجَّل شرط للتحقق من هويتك — فطلب حذف يقبله أي شخص عن أي شخص
                هو ثغرة لا حماية.
              </p>
            </section>

            <div className="bg-[var(--color-primary-soft)] p-4 rounded">
              <p className="text-blue-800 text-sm">
                لمزيد من التفاصيل حول ما نجمعه وكيف نستخدمه، راجع{" "}
                <a className="underline font-medium" href="/privacy">
                  سياسة الخصوصية
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
