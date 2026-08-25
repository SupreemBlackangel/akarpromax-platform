import type { Locale } from "@/src/types/site";
import { PUBLIC_ROUTE_AD_POLICIES, type PublicAdPolicy } from "@/src/config/public-ad-policy";

type LocalizedText = Record<Locale, string>;

type DestinationCard = {
  title: LocalizedText;
  description: LocalizedText;
  href: string;
  linkLabel: LocalizedText;
};

type DestinationSection = {
  title: LocalizedText;
  description: LocalizedText;
  cards?: DestinationCard[];
};

export type PublicDestinationKey = "community" | "knowledge" | "advertise" | "about" | "contact";

export type PublicDestinationPage = {
  key: PublicDestinationKey;
  currentPath: string;
  adLayout: PublicAdPolicy;
  eyebrow: LocalizedText;
  title: LocalizedText;
  description: LocalizedText;
  sections: DestinationSection[];
};

function text(ar: string, en: string, tr: string): LocalizedText {
  return { ar, en, tr };
}

export const PUBLIC_DESTINATIONS: Record<PublicDestinationKey, PublicDestinationPage> = {
  community: {
    key: "community",
    currentPath: "/community",
    adLayout: PUBLIC_ROUTE_AD_POLICIES["/community"],
    eyebrow: text("منتدى البناء و العقار", "Construction & Real Estate Forum", "Insaat ve Gayrimenkul Forumu"),
    title: text("منتدى البناء و العقار", "Construction & Real Estate Forum", "Insaat ve Gayrimenkul Forumu"),
    description: text(
      "هذه الصفحة تمثل بوابة المجتمع العام في الإصدار الحالي: موضوعات واضحة، روابط حقيقية، وحضور منظم دون ادعاء منتدى كامل غير موجود بعد.",
      "This page is the public community gateway in the current release: real destinations and clear themes, without pretending a full discussion backend already exists.",
      "Bu sayfa, mevcut surumde halka acik topluluk girisidir: gercek baglantilar ve net temalar, ancak henuz var olmayan tam bir forum arka ucunu taklit etmez.",
    ),
    sections: [
      {
        title: text("محاور المجتمع الحالية", "Current Community Tracks", "Mevcut Topluluk Basliklari"),
        description: text(
          "الحوارات الحالية تدور حول الأخبار العقارية، احتياجات الخدمات، حضور الشركات، والأدوات المهنية. كل محور مرتبط اليوم بصفحات مطبقة فعلاً في المنصة.",
          "Current conversations revolve around market news, service needs, company presence, and professional tools. Each track links to a real implemented surface today.",
          "Mevcut sohbetler pazar haberleri, hizmet ihtiyaclari, sirket varligi ve profesyonel araclar etrafinda doner. Her baslik bugun gercek bir sayfaya baglidir.",
        ),
        cards: [
          { title: text("أخبار السوق", "Market News", "Pazar Haberleri"), description: text("تابع الأخبار والتحليلات والتحديثات العامة.", "Follow market news, analysis, and public updates.", "Pazar haberlerini, analizleri ve genel guncellemeleri takip edin."), href: "/news", linkLabel: text("اذهب إلى الأخبار", "Go to news", "Haberlere git") },
          { title: text("سوق الخدمات", "Services Market", "Hizmet Pazari"), description: text("استعرض الطلبات ومقدمي الخدمات والفئات العامة.", "Browse service requests, providers, and public categories.", "Hizmet taleplerini, saglayicilari ve acik kategorileri inceleyin."), href: "/services", linkLabel: text("اذهب إلى السوق", "Go to services", "Pazara git") },
          { title: text("الشركات والمكاتب", "Companies & Offices", "Sirketler ve Ofisler"), description: text("اكتشف الحضور التجاري والمهني المرتبط بالعقار والبناء.", "Discover the business and professional presence around real estate and construction.", "Gayrimenkul ve insaat cevresindeki ticari ve profesyonel yapilari kesfedin."), href: "/offices", linkLabel: text("استعرض الشركات العقارية", "Browse real estate companies", "Emlak sirketlerini gor") },
        ],
      },
      {
        title: text("المشاركة اليوم", "How to Participate Today", "Bugun Nasil Katilirsiniz"),
        description: text(
          "المجتمع في هذا الإصدار منظم وموجّه: تابع الأخبار، استخدم الروابط العامة، وتواصل مع الفريق عبر صفحة الاتصال لاقتراح الموضوعات والمحتوى.",
          "Community participation in this release is curated: follow news, use public routes, and contact the team to propose topics and content.",
          "Bu surumde topluluk katilimi yonetilidir: haberleri takip edin, acik rotalari kullanin ve konu onerileri icin ekiple iletisime gecin.",
        ),
      },
    ],
  },
  knowledge: {
    key: "knowledge",
    currentPath: "/knowledge",
    adLayout: PUBLIC_ROUTE_AD_POLICIES["/knowledge"],
    eyebrow: text("الكتب والبرامج", "Books & Software", "Kitaplar ve Yazilimlar"),
    title: text("الكتب والبرامج", "Books & Software", "Kitaplar ve Yazilimlar"),
    description: text(
      "وجهة معرفة مستقلة عن الأدوات الهندسية نفسها: تجمع الموارد والبرامج والروابط العملية التي تخدم محترفي عقار بروماكس.",
      "A knowledge destination kept distinct from the engineering tools themselves: resources, software, and practical links for AkarProMax professionals.",
      "Muhendislik araclarindan ayri tutulan bir bilgi sayfasi: AkarProMax profesyonelleri icin kaynaklar, yazilimlar ve pratik baglantilar.",
    ),
    sections: [
      {
        title: text("برامج وأدوات مرتبطة", "Related Software & Tooling", "Ilgili Yazilim ve Araclar"),
        description: text(
          "هذه الصفحة لا تستبدل الأدوات الهندسية. بل توجهك إلى البرمجيات والعمليات والصفحات التي تعمل فعلاً اليوم داخل المنصة.",
          "This page does not replace Engineering Tools. It routes you to software-adjacent workflows and pages that are genuinely available today.",
          "Bu sayfa Muhendislik Araclarinin yerine gecmez. Bugun gercekten mevcut yazilim odakli is akislari ve sayfalara yonlendirir.",
        ),
        cards: [
          { title: text("الأدوات الهندسية", "Engineering Tools", "Muhendislik Araclari"), description: text("حاسبات، تحويلات، ومعالجة مستندات عملية.", "Calculators, conversions, and practical document-processing tools.", "Hesaplayicilar, donusumler ve belge isleme araclari."), href: "/tools", linkLabel: text("فتح الأدوات", "Open tools", "Araclari ac") },
          { title: text("المعرفة القانونية", "Legal Knowledge", "Yasal Bilgi"), description: text("مركز السياسات القانونية والخصوصية والإعلانات.", "The current legal center for privacy, terms, and advertising policy.", "Gizlilik, kosullar ve reklam politikalari icin mevcut hukuk merkezi."), href: "/legal", linkLabel: text("فتح المركز القانوني", "Open legal center", "Hukuk merkezini ac") },
          { title: text("تحديثات المنصة", "Platform Updates", "Platform Guncellemeleri"), description: text("آخر الأخبار العامة وما يخص توسع المعرفة والمنتجات.", "Latest public updates relevant to knowledge and platform expansion.", "Bilgi ve platform gelisimiyle ilgili son guncellemeler."), href: "/news", linkLabel: text("اذهب إلى الأخبار", "Go to news", "Haberlere git") },
        ],
      },
    ],
  },
  advertise: {
    key: "advertise",
    currentPath: "/advertise",
    adLayout: PUBLIC_ROUTE_AD_POLICIES["/advertise"],
    eyebrow: text("اعلن معنا", "Advertise with Us", "Bizimle Reklam Verin"),
    title: text("اعلن معنا", "Advertise with Us", "Bizimle Reklam Verin"),
    description: text(
      "هذه الصفحة هي المدخل العام للمعلنين، وليست لوحة إدارة الحملات الداخلية. تعرض القدرات الإعلانية المفعلة فعلاً اليوم داخل AkarProMax.",
      "This is the public advertiser entry point, not the internal campaign admin. It presents only the advertising capabilities that genuinely exist today in AkarProMax.",
      "Bu sayfa dahili kampanya paneli degil, halka acik reklamveren girisidir. Yalnizca bugun gercekten mevcut reklam yeteneklerini sunar.",
    ),
    sections: [
      {
        title: text("القنوات المتاحة", "Available Channels", "Mevcut Kanallar"),
        description: text(
          "الإعلانات الحالية تُدار مركزياً للموقع الإلكتروني ولقناة AkarProMax Office، مع فصل واضح بين القناتين في الاستهداف والتحليلات.",
          "Current advertising is centrally managed for the website and the AkarProMax Office channel, with clear channel isolation in targeting and analytics.",
          "Mevcut reklamlar web sitesi ve AkarProMax Office kanali icin merkezi olarak yonetilir; hedefleme ve analiz tarafinda kanallar ayridir.",
        ),
      },
      {
        title: text("ما الذي يمكن للمعلن طلبه؟", "What Can an Advertiser Request?", "Reklamveren Ne Talep Edebilir?"),
        description: text(
          "مواضع موقع عامة، مواضع Office، استهداف جغرافي، حملات متعددة الإبداع، ومحتوى احتياطي House ضمن نفس الشبكة الإعلانية المعتمدة.",
          "Public website placements, Office placements, geo targeting, multi-creative campaigns, and House fallback inventory within the same certified ad network.",
          "Genel web yerlestirmeleri, Office yerlestirmeleri, cografi hedefleme, coklu kreatif kampanyalar ve House fallback envanteri ayni sertifikali reklam agi icinde sunulur.",
        ),
      },
      {
        title: text("تواصل الإعلان", "Advertising Contact", "Reklam Iletisimi"),
        description: text(
          "للإعلان والاستفسار التجاري الحالي استخدم قناة الشراكات المباشرة عبر البريد الإلكتروني، بدون بوابة دفع عامة في هذا الإصدار.",
          "For current advertising and commercial enquiries, use the direct partnerships contact. There is no public checkout or billing flow in this release.",
          "Mevcut reklam ve ticari talepler icin dogrudan is ortakligi iletisimini kullanin. Bu surumde acik odeme veya faturalama akisi yoktur.",
        ),
        cards: [
          { title: text("شراكات الإعلان", "Advertising Partnerships", "Reklam Ortakliklari"), description: text("راسل فريق الشراكات مباشرة.", "Contact the partnerships team directly.", "Ortaklik ekibiyle dogrudan iletisime gecin."), href: "mailto:partners@akarpromax.om?subject=AkarProMax%20Advertising%20Inquiry", linkLabel: text("راسلنا الآن", "Email us now", "Simdi e-posta gonder") },
        ],
      },
    ],
  },
  about: {
    key: "about",
    currentPath: "/about",
    adLayout: PUBLIC_ROUTE_AD_POLICIES["/about"],
    eyebrow: text("من نحن", "About Us", "Hakkimizda"),
    title: text("من نحن", "About Us", "Hakkimizda"),
    description: text(
      "عقار بروماكس منصة عربية عقارية شاملة تجمع الاكتشاف العقاري، الخدمات المهنية، حضور الشركات، والأدوات العملية في بنية واحدة واضحة.",
      "AkarProMax is a comprehensive Arabic real estate platform bringing together property discovery, professional services, company presence, and practical tools in one clear structure.",
      "AkarProMax; gayrimenkul kesfi, profesyonel hizmetler, sirket varligi ve pratik araclari tek yapida toplayan kapsamli bir Arapca gayrimenkul platformudur.",
    ),
    sections: [
      {
        title: text("هوية المنصة", "Platform Identity", "Platform Kimligi"),
        description: text(
          "المنصة ترتب رحلة المستخدم بين العقارات، الأدوات الهندسية، سوق الخدمات، الحضور التجاري، والإعلانات المدارة دون خلط بين الثقة والمدفوع.",
          "The platform organizes the journey across properties, engineering tools, services, company presence, and managed advertising without mixing trust and paid visibility.",
          "Platform; gayrimenkuller, muhendislik araclari, hizmet pazari, ticari varlik ve yonetilen reklami guven ile ucretli gorunurlugu karistirmadan duzenler.",
        ),
      },
      {
        title: text("المسارات الحالية", "Current Product Paths", "Mevcut Urun Yollari"),
        description: text(
          "يمكنك اليوم اكتشاف العقارات، استخدام الأدوات الهندسية، دخول سوق الخدمات، متابعة الأخبار، واستعراض الشركات والمكاتب العامة عبر صفحات منفصلة واضحة.",
          "Today you can discover properties, use engineering tools, enter the services market, follow news, and browse public companies and offices through distinct pages.",
          "Bugun gayrimenkulleri kesfedebilir, muhendislik araclarini kullanabilir, hizmet pazarina girebilir, haberleri takip edebilir ve halka acik sirketleri/ ofisleri ayri sayfalarda inceleyebilirsiniz.",
        ),
      },
    ],
  },
  contact: {
    key: "contact",
    currentPath: "/contact",
    adLayout: PUBLIC_ROUTE_AD_POLICIES["/contact"],
    eyebrow: text("اتصل بنا", "Contact Us", "Iletisim"),
    title: text("اتصل بنا", "Contact Us", "Iletisim"),
    description: text(
      "هذه صفحة تواصل عامة حقيقية تستخدم قنوات الاتصال الموجودة فعلاً اليوم في المشروع، بدون نموذج إرسال مزيف أو معلومات غير موثقة.",
      "This is a real public contact page built on the contact channels that truly exist today in the project, without a fake form or invented contact details.",
      "Bu sayfa, bugun projede gercekten mevcut iletisim kanallarina dayanan halka acik bir iletisim sayfasidir; sahte form veya uydurma bilgi kullanmaz.",
    ),
    sections: [
      {
        title: text("القناة العامة", "General Contact", "Genel Iletisim"),
        description: text(
          "البريد العام الحالي للمنصة هو info@akarpromax.om، ويمكن استخدامه للأسئلة العامة والتواصل الأولي.",
          "The current general platform mailbox is info@akarpromax.om and can be used for general enquiries and initial contact.",
          "Platformun mevcut genel e-posta kutusu info@akarpromax.om adresidir ve genel sorular icin kullanilabilir.",
        ),
        cards: [
          { title: text("البريد العام", "General Email", "Genel E-posta"), description: text("تواصل عام مع فريق عقار بروماكس.", "General contact with the AkarProMax team.", "AkarProMax ekibiyle genel iletisim."), href: "mailto:info@akarpromax.om", linkLabel: text("إرسال بريد", "Send email", "E-posta gonder") },
          { title: text("شراكات الإعلان", "Advertising Partnerships", "Reklam Ortakliklari"), description: text("للاستفسارات التجارية والإعلانية.", "For commercial and advertising enquiries.", "Ticari ve reklam talepleri icin."), href: "mailto:partners@akarpromax.om?subject=AkarProMax%20Partnership%20Inquiry", linkLabel: text("تواصل مع الشراكات", "Contact partnerships", "Ortakliklarla iletisim") },
        ],
      },
    ],
  },
};
