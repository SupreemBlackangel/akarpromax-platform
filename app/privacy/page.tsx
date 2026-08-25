export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="bg-[var(--color-surface)] rounded-xl shadow-lg p-8 space-y-6">
          <h1 className="text-3xl font-bold text-center mb-8">سياسة الخصوصية</h1>
          <div className="space-y-6 text-gray-700">
            <section><h2 className="text-xl font-semibold text-[var(--color-primary)]">1. المعلومات التي نجمعها</h2><p>نجمع المعلومات التي تقدمها عند التسجيل مثل: الاسم، البريد الالكتروني، رقم الهاتف. كما نجمع معلومات الاستخدام مثل: الصفحات التي تزورها، العقارات التي تشاهدها، والبحث الذي تقوم به.</p></section>
            <section><h2 className="text-xl font-semibold text-[var(--color-primary)]">2. كيفية استخدام المعلومات</h2><p>نستخدم المعلومات لتحسين خدماتنا، وتخصيص تجربتك، والتواصل معك حول العروض والخدمات. كما نستخدمها لاامن ولمنع الاحتيال.</p></section>
            <section><h2 className="text-xl font-semibold text-[var(--color-primary)]">3. مشاركة المعلومات</h2><p>نشارك معلوماتك مع الاطراف الاخرى فقط عند الضرورة لاتمام صفقة (مثل: البائع والمشتري). لا نبيع معلوماتك لاي طرف ثالث. قد نشارك معلومات مجمعة غير شخصية لاغراض تحليلية.</p></section>
            <section><h2 className="text-xl font-semibold text-[var(--color-primary)]">4. امان المعلومات</h2><p>نتخذ اجراءات امنية مشددة لحماية معلوماتك من الوصول غير المصرح به. تشمل هذه الاجراءات: التشفير، وجدران الحماية، والمراقبة المستمرة. ومع ذلك، لا يمكننا ضمان الامان المطلق للبيانات المنقولة عبر الانترنت.</p></section>
            <section><h2 className="text-xl font-semibold text-[var(--color-primary)]">5. حقوقك</h2><p>لديك الحق في: طلب نسخة من معلوماتك، تعديل معلوماتك، حذف حسابك، الغاء الاشتراك في الرسائل التسويقية. يمكنك ممارسة هذه الحقوق من خلال لوحة التحكم او بالتواصل معنا.</p></section>
            <section><h2 className="text-xl font-semibold text-[var(--color-primary)]">6. ملفات تعريف الارتباط (Cookies)</h2><p>نستخدم ملفات تعريف الارتباط لتحسين تجربتك وتذكر تفضيلاتك. يمكنك تعطيلها من اعدادات المتصفح، لكن ذلك قد يؤثر على بعض وظائف الموقع.</p></section>
            <div className="bg-[var(--color-primary-soft)] p-4 rounded"><p className="text-blue-800 text-sm"><strong>التزامنا:</strong> نحن ملتزمون بحماية خصوصيتك وامان معلوماتك. اذا كان لديك اي استفسار، يرجى التواصل معنا على: privacy@akarpromax.com</p></div>
          </div>
        </div>
      </div>
    </div>
  );
}
