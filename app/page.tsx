'use client';

import Link from "next/link";
import PublicPageShell from "@/src/components/PublicPageShell";
import { useServicesPage } from "@/src/components/services/useServicesPage";

const SERVICES = [
  { href: "/offices", num: "01", title: "المكاتب العقارية", desc: "ملفات ومواقع مهنية تظهر للمستخدم الأقرب." },
  { href: "/services", num: "02", title: "سوق الخدمات", desc: "طلبات عروض أسعار للحرفيين والمهنيين.", badge: "اطلب خدمة أو أنشئ ملفك المهني" },
  { href: "/auctions", num: "03", title: "المزادات", desc: "مزايدة واضحة بإقرارات وسجل عمليات." },
  { href: "/tools", num: "04", title: "التقارير العقارية", desc: "معاينة هندسية وتثمين قابلان للتوثيق." },
  { href: "/tools", num: "05", title: "أدوات المنصة", desc: "حاسبات ومحولات وأدوات عقارية ذكية في مكان واحد" },
];

export default function HomePage() {
  const { locale, viewer, copy, dir, country, city, openLogin, handleLogout, AccountDialog } = useServicesPage();

  return (
    <>
      <PublicPageShell
        locale={locale}
        copy={copy}
        viewer={viewer}
        country={country}
        city={city}
        currentPath="/"
        adLayout={{ mode: "standard", family: "home" }}
        officePromotion={{
          cta: "جرب مكتب بروماكس",
          description: "أدر عقارك وعروضك من مكتبك الاحترافي مع أدوات ذكية وربط مباشر بالمنصة.",
          href: "/offices",
        }}
        onLogin={() => openLogin("login")}
        onLogout={handleLogout}
      >
        <div dir={dir} className="bg-background">
          {/* Welcome Band */}
          <section className="welcome-band">
            <div className="container welcome-grid">
              <div className="welcome-copy">
                <p className="section-kicker">منصة العقار والخدمات الذكية</p>
                <h1>نرتّب قرارك العقاري<br /><em>في مكان واحد.</em></h1>
                <p>عقارات، مكاتب، خدمات، وأدوات مهنية بتجربة هادئة وواضحة، مع بيانات قابلة للتدقيق واتصال مباشر مع المكتب.</p>
                <div className="welcome-actions">
                  <Link href="/properties" className="button-primary">
                    تصفح العقارات <b>←</b>
                  </Link>
                  <Link href="/register" className="button-quiet">انضم إلينا</Link>
                </div>
              </div>
              <div className="welcome-visual" aria-label="صورة توضيحية للعقار">
                <div className="visual-ring" />
                <div className="visual-card">
                  <span>نظرة أوضح</span>
                  <strong>OM</strong>
                  <small>اختيارات عقارية مختارة</small>
                </div>
              </div>
            </div>
          </section>

          {/* Properties Section */}
          <section className="content-section container" id="properties">
            <div className="section-title-row">
              <div>
                <p className="section-kicker">مختارات المنصة</p>
                <h2>اكتشف العقار<br />بالطريقة التي تناسبك.</h2>
              </div>
              <Link href="/properties" className="section-link">
                عرض كل العقارات <b>←</b>
              </Link>
            </div>
            <div className="property-grid reference-cards">
              <Link href="/properties" className="reference-card feature-card">
                <div className="card-image card-house">
                  <span>عقار مميز</span>
                </div>
                <div className="card-body">
                  <p>مسقط · للبيع</p>
                  <h3>مساحات تستحق أن تراها بوضوح.</h3>
                  <span>اعرف المزيد <b>←</b></span>
                </div>
              </Link>
              <Link href="/properties/search" className="reference-card">
                <div className="card-image card-map">
                  <span>بحث منظم</span>
                </div>
                <div className="card-body">
                  <p>بحث متطوّر</p>
                  <h3>حقول مطابقة ونتائج أسهل.</h3>
                  <span>ابدأ البحث <b>←</b></span>
                </div>
              </Link>
              <Link href="/offices" className="reference-card">
                <div className="card-image card-coast">
                  <span>للوسطاء</span>
                </div>
                <div className="card-body">
                  <p>مكتبك في المنصة</p>
                  <h3>ملف مهني وصلاحيات واضحة.</h3>
                  <span>اعرف المزيد <b>←</b></span>
                </div>
              </Link>
            </div>
          </section>

          {/* Services Band */}
          <section className="services-band" id="services">
            <div className="container">
              <div className="section-title-row">
                <div>
                  <p className="section-kicker">مسارات جديدة</p>
                  <h2>أدوات المنصة<br />تتوسع معك.</h2>
                </div>
                <span className="muted-note">
                  كل وحدة تُبنى بشكل مستقل<br />وتتصل بالنواة بأمان.
                </span>
              </div>
              <div className="service-grid">
                {SERVICES.map((s) => (
                  <Link href={s.href} key={s.num} className="service-module">
                    <span className="module-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        {s.num === "01" && <path d="M4 20V10l8-6 8 6v10M8 20v-6h8v6" />}
                        {s.num === "02" && <path d="M5 8h14M7 4h10l2 16H5L7 4m2 8h6m-6 4h4" />}
                        {s.num === "03" && <path d="M4 18v-7l8-6 8 6v7M8 18v-4h8v4M3 21h18" />}
                        {s.num === "04" && <path d="M4 6h16v12H4zM8 10h8m-8 4h5" />}
                        {s.num === "05" && <path d="M4 7h16M7 4v6m10-6v6M6 11h12v9H6zM9 14h2m2 0h2m-6 3h2m2 0h2" />}
                      </svg>
                      <i>{s.num}</i>
                    </span>
                    <div>
                      <h3>{s.title}</h3>
                      <p>{s.desc}</p>
                      {s.badge && <small>{s.badge}</small>}
                    </div>
                    <b aria-hidden="true">↗</b>
                  </Link>
                ))}
              </div>
            </div>
          </section>

          {/* Office Band */}
          <section className="office-band" id="offices">
            <div className="container office-grid">
              <div className="office-copy">
                <p className="section-kicker">امتداد المكتب العقاري</p>
                <h2>AkarPromax<br />Office</h2>
                <p>التطبيق المكتبي يستقبل أخبار المنصة وإعلاناتها، ويرفع مسودات العقارات بحدود آمنة، ويربط الرادار بفرص المناطق القريبة من مكتبك.</p>
                <Link href="/offices" className="button-primary">
                  اعرف عن التكامل <b>←</b>
                </Link>
              </div>
              <div className="office-panel">
                <span className="panel-orbit orbit-one" />
                <span className="panel-orbit orbit-two" />
                <div className="office-panel-label">مزامنة آمنة</div>
                <div className="office-panel-value">24<span>/</span>7</div>
                <div className="office-panel-foot">
                  <span>أخبار</span>
                  <span>إعلانات</span>
                  <span>رادار</span>
                </div>
              </div>
            </div>
          </section>

          {/* Account Band */}
          <section className="account-band" id="account">
            <div className="container account-inner">
              <div>
                <p className="section-kicker">ابدأ بخطوة موثقة</p>
                <h2>حسابك هو مفتاح<br />المنصة.</h2>
              </div>
              <div className="account-copy">
                <p>سيكون التسجيل عبر البريد والهاتف، مع التحقق قبل منح أي صلاحيات. نبدأ بحساب عادي ثم تُضاف الأدوار من الإدارة بعد المراجعة.</p>
                <Link href="/register" className="button-primary">
                  اطلب الانضمام المبكر <b>←</b>
                </Link>
              </div>
            </div>
          </section>
        </div>
      </PublicPageShell>
      {AccountDialog}
    </>
  );
}
