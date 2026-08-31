# هوية عقار بروماكس البصرية — المرجع المصغر

المرجع الواحد لكل قرار بصري في المنصة (الويب، البريد، البرنامج المكتبي).
أي أسلوب خارج هذا الملف يُعد ديناً تقنياً يُصحَّح عند أول لمسة للملف.

## الألوان

| الدور | القيمة | متغير CSS | الاستخدام |
|---|---|---|---|
| الأزرق الأساسي | `#1769FF` | `--color-primary` / `--blue` | الأزرار الرئيسية، الروابط، الحالة النشطة |
| الأزرق الداكن (هوفر) | `#0E4BB8` | `--color-primary-hover` / `--blue-dark` | تفاعل الأزرار |
| الكحلي | `#0B214C` | `--brand-navy` | العناوين الكبرى، خلفيات الهيرو، البريد |
| الذهبي | `#D8AF55` | `--accent` | لمسات التمييز فقط (شارة، خط سفلي، نجمة) — لا يُستخدم كنص على أبيض |
| خلفية ناعمة زرقاء | `#E8F0FF` | `--color-primary-soft` | خلفيات الشارات والأيقونات |

الدلالات: نجاح `--color-success #1E7A3C`، تحذير كهرماني، خطأ `--color-error #C03434` — لا تُستخدم أبداً كألوان علامة.

**ممنوع**: رمادي Tailwind الخام (`bg-gray-100`, `text-gray-600`...) في أي كود جديد — استخدم توكنز `var(--color-*)` حصراً.

## الخطوط

| الدور | الخط | الأوزان |
|---|---|---|
| العناوين والعلامة | **Cairo** | 700 / 800 / 900 |
| النصوص والواجهات | **IBM Plex Sans Arabic** (احتياط: Tahoma) | 400 / 500 / 700 |
| الأرقام الجدولية | نفس الخط + `font-variant-numeric: tabular-nums` | — |

## الشعار

- الملف: `public/brand/logo.svg` — علامة «A» على هيئة سقف فوق مدخل، بتدرج كحلي→أزرق وخط ذهبي.
- لا يُعاد رسم الشعار نصاً (حرف A في مربع ملوّن) في أي مكون جديد.
- الحد الأدنى للعرض 24px؛ لا يوضع على خلفية زرقاء مشبعة بدون حاويته.

## الأيقونات

- **lucide-react فقط**. لا إيموجي في القوائم أو الأزرار أو الجداول (الإيموجي مسموح في المحتوى التحريري فقط).
- المقاس الافتراضي 16–20px، `strokeWidth` الافتراضي.

## الأشكال والظلال

- نصف القطر: بطاقات `rounded-2xl` (16px)، أزرار وحقول `rounded-xl` (12px)، شارات `rounded-full`.
- الظل: خفيف على البطاقات (`shadow-sm`) ويكبر عند الهوفر (`shadow-md`) مع رفع `-translate-y-0.5`.
- الحدود: `1px var(--color-border)` دائماً — لا حدود ملونة إلا للحالة النشطة.

## اللغة والاتجاه

- ثلاث لغات: العربية (الأصل)، الإنجليزية، التركية. أي نص واجهة جديد يُكتب ثلاثياً من أول يوم.
- الاتجاه من `dir` المحسوب — لا `dir="rtl"` مثبتاً في مكونات جديدة.
- خصائص CSS منطقية (`ms-`, `me-`, `start-`, `end-`) بدل `left/right` حيثما أمكن.
- اللغة المختارة تُخزَّن في كوكي `akarpromax-locale` (يقرؤه الخادم) + `localStorage` (للتبديل الحي).

## أنماط جاهزة (انسخ منها)

- زر رئيسي: `rounded-xl bg-[var(--color-primary)] px-5 py-2.5 text-sm font-bold text-white hover:bg-[var(--color-primary-hover)]`
- زر ثانوي: `rounded-xl border border-[var(--color-border)] px-5 py-2.5 text-sm font-bold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)]`
- شارة: `rounded-full bg-[var(--color-primary-soft)] px-2.5 py-1 text-xs font-black text-[var(--color-primary)]`
- بطاقة: `rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5`
- أيقونة داخل مربع: `grid h-11 w-11 place-items-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]`
