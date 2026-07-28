export default function Home() {
  return (
    <main>
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-photo" aria-hidden="true" />
        <div className="hero-overlay" aria-hidden="true" />
        <header className="site-header container">
          <a className="brand" href="#top" aria-label="عقار بروماكس، الصفحة الرئيسية">
            <span className="brand-mark">A</span>
            <span>
              <strong>عقار بروماكس</strong>
              <small>AkarPromax</small>
            </span>
          </a>
          <nav aria-label="التنقل الرئيسي">
            <a href="#featured">العقارات</a>
            <a href="#platform">الخدمات</a>
            <a href="#office">AkarPromax Office</a>
          </nav>
          <a className="header-cta" href="#account">إنشاء حساب</a>
        </header>

        <div className="container hero-content" id="top">
          <p className="eyebrow light"><span /> منصة عُمانية تبدأ بثقة</p>
          <h1 id="hero-title">قرارك العقاري<br /><em>يبدأ بوضوح.</em></h1>
          <p className="hero-copy">عقار بروماكس تجمع العقارات والمكاتب والخدمات المهنية في تجربة واحدة مصممة للسوق العُماني.</p>

          <form className="search-panel" action="#featured" aria-label="ابحث عن عقار">
            <label>
              <span>أبحث عن</span>
              <select defaultValue="buy" aria-label="نوع الطلب">
                <option value="buy">شراء عقار</option>
                <option value="rent">استئجار عقار</option>
                <option value="office">مكتب عقاري</option>
              </select>
            </label>
            <label>
              <span>المدينة</span>
              <select defaultValue="muscat" aria-label="المدينة">
                <option value="muscat">مسقط</option>
                <option value="salalah">صلالة</option>
                <option value="sohar">صحار</option>
                <option value="nizwa">نزوى</option>
              </select>
            </label>
            <label className="search-text">
              <span>كلمة مفتاحية</span>
              <input type="search" placeholder="مثال: فيلا بإطلالة" aria-label="كلمة مفتاحية" />
            </label>
            <button type="submit">ابدأ البحث <b aria-hidden="true">←</b></button>
          </form>

          <div className="hero-signals" aria-label="مزايا المنصة">
            <span>حسابات موثقة</span><i />
            <span>بيانات منظمة</span><i />
            <span>خدمة عُمانية</span>
          </div>
        </div>
      </section>

      <section className="trust-strip" aria-label="أرقام عقار بروماكس">
        <div className="container trust-grid">
          <div><strong>01</strong><span>دولة في الإطلاق الأول<br />عُمان</span></div>
          <div><strong>3</strong><span>قنوات موحدة<br />ويب، إدارة، ومكتب</span></div>
          <div><strong>24/7</strong><span>نواة قابلة للنمو<br />والتدقيق</span></div>
          <p>نبني الثقة قبل أن نبني العدد.</p>
        </div>
      </section>

      <section className="featured-section container" id="featured" aria-labelledby="featured-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow"><span /> بداية منظمة</p>
            <h2 id="featured-title">عقارات مختارة<br />بحقائق واضحة.</h2>
          </div>
          <a className="text-link" href="#account">استكشف مسارات العقار <b aria-hidden="true">←</b></a>
        </div>
        <div className="property-grid">
          <article className="property-card wide-card">
            <div className="property-visual visual-one"><span>قريبًا</span></div>
            <div className="property-info">
              <p>تجربة العقار الجديدة</p>
              <h3>إضافة منظمة، بحث مطابق، ومعلومات يمكن الوثوق بها.</h3>
              <a href="#account">كيف ستعمل؟ <b aria-hidden="true">←</b></a>
            </div>
          </article>
          <article className="property-card">
            <div className="property-visual visual-two"><span>المرحلة ٢</span></div>
            <div className="property-info compact">
              <p>للوسطاء والمكاتب</p>
              <h3>ملفات موثقة وامتيازات واضحة.</h3>
            </div>
          </article>
          <article className="property-card">
            <div className="property-visual visual-three"><span>المرحلة ٣</span></div>
            <div className="property-info compact">
              <p>للخدمات المهنية</p>
              <h3>طلبات وعروض أسعار ضمن مسار عادل.</h3>
            </div>
          </article>
        </div>
      </section>

      <section className="platform-section" id="platform" aria-labelledby="platform-title">
        <div className="container platform-layout">
          <div className="platform-intro">
            <p className="eyebrow light"><span /> منصة واحدة، وحدات مستقلة</p>
            <h2 id="platform-title">نبدأ بالنواة.<br />ثم نتوسع بثبات.</h2>
            <p>كل وحدة ستملك صلاحياتها وحالاتها وسجل تدقيقها، بدل أن تتراكم الميزات داخل نظام هش.</p>
          </div>
          <div className="module-list">
            <article><b>01</b><div><h3>الحساب والصلاحيات</h3><p>تحقق بالبريد والهاتف وأدوار دقيقة قابلة للإدارة.</p></div><span>قيد البناء</span></article>
            <article><b>02</b><div><h3>العقارات والبحث</h3><p>معالج نشر، حقول ديناميكية، ودورة حياة للإعلان.</p></div><span>التالي</span></article>
            <article><b>03</b><div><h3>المكاتب والخدمات</h3><p>ملفات مهنية، طلبات خدمات، وعروض منظّمة.</p></div><span>لاحقًا</span></article>
            <article><b>04</b><div><h3>المزادات والتقارير</h3><p>إقرارات، مزايدة آمنة، وتقارير هندسية موثقة.</p></div><span>لاحقًا</span></article>
          </div>
        </div>
      </section>

      <section className="office-section container" id="office">
        <div className="office-index">AKP <span>01</span></div>
        <div>
          <p className="eyebrow"><span /> امتداد للمكتب العقاري</p>
          <h2>AkarPromax Office<br />ليس نظامًا منفصلًا.</h2>
          <p>التطبيق المكتبي سيكون امتدادًا آمنًا للمنصة: يستقبل الأخبار والإعلانات، ويرفع العقارات بحدود صلاحيات واضحة، وينبه المكتب بالفرص القريبة عبر الرادار.</p>
        </div>
        <div className="office-points">
          <span>مزامنة آمنة</span>
          <span>رادار الفرص</span>
          <span>إعلانات متزامنة</span>
        </div>
      </section>

      <section className="account-section" id="account" aria-labelledby="account-title">
        <div className="container account-card">
          <div>
            <p className="eyebrow"><span /> الخطوة القادمة</p>
            <h2 id="account-title">حساب واحد،<br />بداية موثقة.</h2>
          </div>
          <div className="account-copy">
            <p>سيتحقق الحساب عبر البريد الإلكتروني والهاتف قبل تفعيل أي صلاحيات. لا يتم منح أدوار المكتب أو الإشراف إلا من الإدارة.</p>
            <a className="primary-link" href="mailto:hello@akarpromax.om?subject=طلب%20الانضمام%20إلى%20عقار%20بروماكس">اطلب الانضمام المبكر <b aria-hidden="true">←</b></a>
          </div>
        </div>
      </section>

      <footer>
        <div className="container footer-inner">
          <div className="brand footer-brand"><span className="brand-mark">A</span><span><strong>عقار بروماكس</strong><small>AkarPromax</small></span></div>
          <p>منصة عقارية عُمانية تُبنى بعناية.</p>
          <span>© 2026 AkarPromax</span>
        </div>
      </footer>
    </main>
  );
}
