export default function DisclaimerPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="bg-[var(--color-surface)] rounded-xl shadow-lg p-8 space-y-6">
          <h1 className="text-3xl font-bold text-center mb-8">اخلاء المسؤولية</h1>
          <div className="bg-[var(--color-error-soft)] border-r-4 border-[var(--color-error)] p-4 rounded"><p className="text-red-800 text-lg font-semibold">تنبيه هام: عقار بروماكس منصة وسيطة فقط</p></div>
          <div className="space-y-6 text-gray-700">
            <section><p><strong>عقار بروماكس</strong> هو منصة الكترونية تعمل كوسيط بين المستخدمين، وليست طرفا في اي صفقة او عقد. جميع المعلومات والبيانات المنشورة على المنصة يتحمل مسؤوليتها المستخدمون انفسهم.</p></section>
            <section><h2 className="text-xl font-semibold text-red-600">ما لا نتحمله مسؤوليته:</h2><ul className="list-disc list-inside space-y-2"><li>دقة او صحة المعلومات المنشورة عن العقارات</li><li>جودة الخدمات المقدمة من الحرفيين والمقاولين</li><li>اتمام الصفقات او المزادات</li><li>اي خسائر مالية او اضرار ناتجة عن التعاملات</li><li>اي غش او تلاعب او احتيال يحدث بين المستخدمين</li><li>انتهاك حقوق الملكية الفكرية</li></ul></section>
            <section><h2 className="text-xl font-semibold text-red-600">توصياتنا للمستخدمين:</h2><ul className="list-disc list-inside space-y-2"><li>تحقق دائما من هوية الطرف الآخر</li><li>اطلب مستندات رسمية تثبت ملكية العقار</li><li>لا ترسل اموالا قبل التأكد من صحة المعلومات</li><li>استخدم قنوات التواصل الرسمية داخل المنصة</li><li>ابلاغ عن اي نشاط مشبوه فورا</li></ul></section>
            <section><h2 className="text-xl font-semibold text-red-600">اجراءات الابلاغ عن الاحتيال:</h2><p>اذا اكتشفت اي عملية احتيال او تلاعب، يرجى التواصل معنا فورا على: <strong>report@akarpromax.com</strong>. سنقوم باتخاذ الاجراءات المناسبة بحق المخالفين، والتي قد تشمل تعليق الحساب او الحظر الدائم.</p></section>
            <div className="bg-yellow-50 border-r-4 border-yellow-400 p-4 rounded"><p className="text-yellow-800 text-sm"><strong>تنبيه اخير:</strong> باستخدامك للمنصة، فإنك توافق على ان عقار بروماكس غير مسؤول عن اي نزاع او خسارة تنشأ عن استخدامك للمنصة. انت تتحمل المسؤولية الكاملة عن جميع تعاملاتك.</p></div>
          </div>
        </div>
      </div>
    </div>
  );
}
