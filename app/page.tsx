const sidebarItems = [
  ["⌂", "الرئيسية"],
  ["▥", "الكتب والبرامج"],
  ["◁", "أعلن معنا"],
  ["⌖", "من نحن"],
  ["♧", "اتصل بنا"],
  ["⌘", "الأسئلة الشائعة"],
  ["▦", "لوحة الإدارة"],
  ["♙", "إدارة المستخدمين"],
  ["◁", "إدارة الإعلانات"],
  ["◁", "admin.newsTicker"],
  ["▣", "إدارة الاشتراكات"],
  ["⚑", "إدارة العقارات"],
  ["⚒", "إدارة الخدمات"],
  ["♢", "إدارة المسوقين"],
  ["♧", "المشرفون والصلاحيات"],
  ["⚿", "مفاتيح التراخيص"],
  ["▤", "الخطط والأسعار"],
  ["◇", "الخصومات والكوبونات"],
  ["▱", "التقارير والتحليلات"],
  ["⚙", "إعدادات النظام"],
];

const quickLinks = ["الرئيسية", "عقارات للبيع", "عقارات للإيجار", "المكاتب العقارية", "خدمات أخرى", "المدونة العقارية"];
const usefulLinks = ["من نحن", "أعلن معنا", "اتصل بنا", "الشروط والأحكام", "سياسة الخصوصية", "تحميل البرنامج", "الأسئلة الشائعة"];

function Brand() {
  return (
    <a className="brand" href="#top" aria-label="عقار بروماكس">
      <span className="brand-mark">A</span>
      <span className="brand-copy"><strong>عقار بروماكس</strong><small>المنصة العقارية الرقمية الشاملة</small></span>
    </a>
  );
}

function AdSlot({ label = "اعلن هنا", tone = "light" }: { label?: string; tone?: "light" | "blue" }) {
  return <div className={`ad-slot ad-${tone}`} aria-label="مساحة إعلانية"><span>{label}</span><small>مساحة إعلانية قابلة للإدارة</small></div>;
}

export default function Home() {
  return (
    <main className="reference-app" id="top">
      <aside className="right-sidebar" aria-label="لوحة التنقل">
        <div className="sidebar-head"><Brand /><button type="button" aria-label="إغلاق القائمة">×</button></div>
        <div className="sidebar-scroll">
          {sidebarItems.map(([icon, label], index) => (
            <a className={index === 0 ? "sidebar-link active" : "sidebar-link"} href={index === 0 ? "#top" : `#module-${index}`} key={label}>
              <span className="sidebar-icon" aria-hidden="true">{icon}</span><span>{label}</span>
            </a>
          ))}
        </div>
        <div className="sidebar-foot">عقار بروماكس © 2026</div>
      </aside>

      <div className="site-canvas">
        <header className="reference-header">
          <div className="container header-inner">
            <button className="menu-trigger" type="button" aria-label="إظهار القائمة">☰</button>
            <Brand />
            <div className="header-tools" aria-label="أدوات الحساب والمنصة"><a href="#top" aria-label="الدولة">عُمان　⌖</a><a href="#top" aria-label="العملة">ر.ع</a><a href="#top" aria-label="اللغة">EN</a><a href="#top" aria-label="تطبيق المكتب">▣</a><a className="admin-chip" href="#account">Admin　♙</a></div>
            <div className="header-actions"><a href="#account">دخول</a><a className="header-register" href="#account">تسجيل جديد</a></div>
          </div>
        </header>

        <div className="news-ticker" role="status" aria-label="الشريط الإخباري">
          <div className="container ticker-inner"><span className="ticker-label">آخر الأخبار</span><span className="ticker-pulse" aria-hidden="true" />
            <div className="ticker-track"><span>منصة عقار بروماكس تستعد لإطلاق تجربة عقارية أوضح في عُمان</span><span>•</span><span>تحديثات السوق والخدمات العقارية أولًا بأول</span><span>•</span><span>تطبيق AkarPromax Office متصل بالمنصة</span></div>
            <button type="button" aria-label="إيقاف الشريط الإخباري">Ⅱ</button>
          </div>
        </div>

        <section className="hero-ad container" aria-label="إعلان الهيدر الرئيسي">
          <div className="hero-ad-copy"><p>إعلان مميز من عقار بروماكس</p><h2>اكتشف العقارات<br /><strong>للبيع والإيجار</strong></h2><span>المنصة العقارية الرائدة في عُمان</span><a href="#properties">استكشف الآن <b>←</b></a></div>
          <div className="hero-ad-footer"><span>●</span><span>●</span><span className="active">●</span><span>●</span></div>
        </section>

        <section className="welcome-band" id="about">
          <div className="container welcome-grid">
            <div className="welcome-copy"><p className="section-kicker">منصة عقارية عُمانية</p><h1>نرتّب قرارك العقاري<br /><em>في مكان واحد.</em></h1><p>عقارات، مكاتب، خدمات، وأدوات مهنية بتجربة هادئة وواضحة، مع بيانات قابلة للتدقيق واتصال مباشر مع المكتب.</p><div className="welcome-actions"><a className="button-primary" href="#properties">تصفح العقارات <b>←</b></a><a className="button-quiet" href="#account">انضم إلينا</a></div></div>
            <div className="welcome-visual" aria-label="صورة توضيحية للعقار"><div className="visual-ring" /><div className="visual-card"><span>نظرة أوضح</span><strong>OM</strong><small>اختيارات عقارية من عُمان</small></div></div>
          </div>
        </section>

        <section className="content-section container" id="properties" aria-labelledby="property-title">
          <div className="section-title-row"><div><p className="section-kicker">مختارات المنصة</p><h2 id="property-title">اكتشف العقار<br />بالطريقة التي تناسبك.</h2></div><a className="section-link" href="#account">عرض كل العقارات <b>←</b></a></div>
          <div className="property-grid reference-cards">
            <article className="reference-card feature-card"><div className="card-image card-house"><span>عقار مميز</span></div><div className="card-body"><p>مسقط · للبيع</p><h3>مساحات تستحق أن تراها بوضوح.</h3><a href="#account">اعرف المزيد <b>←</b></a></div></article>
            <article className="reference-card"><div className="card-image card-map"><span>قريبًا</span></div><div className="card-body"><p>بحث منظم</p><h3>حقول مطابقة ونتائج أسهل.</h3></div></article>
            <article className="reference-card"><div className="card-image card-coast"><span>للوسطاء</span></div><div className="card-body"><p>مكتبك في المنصة</p><h3>ملف مهني وصلاحيات واضحة.</h3></div></article>
          </div>
        </section>

        <section className="services-band" id="services" aria-labelledby="services-title">
          <div className="container"><div className="section-title-row"><div><p className="section-kicker">مسارات جديدة</p><h2 id="services-title">أدوات المنصة<br />تتوسع معك.</h2></div><span className="muted-note">كل وحدة تُبنى بشكل مستقل<br />وتتصل بالنواة بأمان.</span></div>
            <div className="service-grid"><article id="module-1"><span className="service-number">01</span><div><h3>المكاتب العقارية</h3><p>ملفات ومواقع مهنية تظهر للمستخدم الأقرب.</p></div><b>↗</b></article><article id="module-2"><span className="service-number">02</span><div><h3>سوق الخدمات</h3><p>طلبات عروض أسعار للحرفيين والمهنيين.</p></div><b>↗</b></article><article id="module-3"><span className="service-number">03</span><div><h3>المزادات</h3><p>مزايدة واضحة بإقرارات وسجل عمليات.</p></div><b>↗</b></article><article id="module-4"><span className="service-number">04</span><div><h3>التقارير العقارية</h3><p>معاينة هندسية وتثمين قابلان للتوثيق.</p></div><b>↗</b></article></div>
          </div>
        </section>

        <section className="office-band" id="offices"><div className="container office-grid"><div className="office-copy"><p className="section-kicker">امتداد المكتب العقاري</p><h2>AkarPromax<br />Office</h2><p>التطبيق المكتبي يستقبل أخبار المنصة وإعلاناتها، ويرفع مسودات العقارات بحدود آمنة، ويربط الرادار بفرص المناطق القريبة من مكتبك.</p><a className="button-primary" href="#account">اعرف عن التكامل <b>←</b></a></div><div className="office-panel"><span className="panel-orbit orbit-one" /><span className="panel-orbit orbit-two" /><div className="office-panel-label">مزامنة آمنة</div><div className="office-panel-value">24<span>/</span>7</div><div className="office-panel-foot"><span>أخبار</span><span>إعلانات</span><span>رادار</span></div></div></div></section>

        <section className="bottom-ads container" aria-label="الإعلانات السفلية"><AdSlot tone="blue" /><AdSlot tone="blue" /></section>

        <section className="account-band" id="account"><div className="container account-inner"><div><p className="section-kicker">ابدأ بخطوة موثقة</p><h2>حسابك هو مفتاح<br />المنصة.</h2></div><div className="account-copy"><p>سيكون التسجيل عبر البريد والهاتف، مع التحقق قبل منح أي صلاحيات. نبدأ بحساب عادي ثم تُضاف الأدوار من الإدارة بعد المراجعة.</p><a className="button-primary" href="mailto:hello@akarpromax.om?subject=طلب%20الانضمام">اطلب الانضمام المبكر <b>←</b></a></div></div></section>

        <footer className="reference-footer"><div className="container footer-grid"><div className="footer-about"><Brand /><p>المنصة العقارية الرقمية الشاملة. نرتّب رحلة البحث عن عقارك لتكون أسهل وأكثر موثوقية.</p><div className="socials"><a href="#top" aria-label="فيسبوك">f</a><a href="#top" aria-label="تويتر">𝕏</a><a href="#top" aria-label="انستغرام">◎</a><a href="#top" aria-label="لينكدإن">in</a></div></div><div><h3>روابط سريعة</h3>{quickLinks.map((item) => <a href="#top" key={item}>{item}</a>)}</div><div><h3>معلومات مفيدة</h3>{usefulLinks.map((item) => <a href="#top" key={item}>{item}</a>)}</div><div><h3>تواصل معنا</h3><a href="#top">نزوى · سلطنة عُمان　⌖</a><a href="mailto:info@akarpromax.om">info@akarpromax.om　✉</a><a href="#top">تحدث مع فريقنا</a></div></div><div className="container footer-bottom"><span>© 2026 عقار بروماكس. جميع الحقوق محفوظة.</span><span>منصة عُمانية للعقار والخدمات المهنية</span><div className="payments"><span>Visa</span><span>Mastercard</span></div></div></footer>
        <a className="floating-chat" href="mailto:hello@akarpromax.om" aria-label="تواصل مع عقار بروماكس">⌁</a>
      </div>
    </main>
  );
}
