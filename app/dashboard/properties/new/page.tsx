'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FileText, MapPin, Ruler, Tag, Image as ImageIcon, CheckCircle2,
  ArrowLeft, Sparkles, ShieldCheck, Info, ChevronLeft, ChevronRight,
} from 'lucide-react';

import { PropertyFormWithOffers } from '@/components/properties/PropertyFormWithOffers';

type StepDef = {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
};

const steps: StepDef[] = [
  {
    id: 'step-basic',
    label: 'المعلومات الأساسية',
    description: 'عنوان العقار، الفئة، النوع، والوصف',
    icon: FileText,
  },
  {
    id: 'step-location',
    label: 'الموقع',
    description: 'الدولة، المنطقة، المدينة، والعنوان التفصيلي',
    icon: MapPin,
  },
  {
    id: 'step-specs',
    label: 'المواصفات',
    description: 'المساحة، الغرف، الدور، وسنة البناء',
    icon: Ruler,
  },
  {
    id: 'step-offers',
    label: 'العروض والأسعار',
    description: 'أنواع العروض، السعر، وطريقة التسويق',
    icon: Tag,
  },
  {
    id: 'step-media',
    label: 'الصور والوسائط',
    description: 'إضافة روابط الصور والفيديوهات',
    icon: ImageIcon,
  },
];

const stepTips: Record<number, string[]> = {
  1: [
    'استخدم عنواناً واضحاً يصف الموقع والنوع.',
    'الوصف المفصّل يزيد من ثقة الباحثين.',
    'اختر الفئة والنوع بدقة لتظهر في البحث.',
  ],
  2: [
    'حدد الموقع بدقة لتظهر على الخريطة.',
    'أدخل العنوان التفصيلي لسهولة الوصول.',
    'الإحداثيات اختيارية لكنها مفيدة.',
  ],
  3: [
    'المساحة بالمتر المربع مطلوبة.',
    'حدد عدد الغرف والدورات المياه.',
    'سنة البناء تؤثر على قرار المشتري.',
  ],
  4: [
    'يمكنك إضافة أكثر من عرض (بيع + إيجار).',
    'اختر طريقة التسويق: مباشر أو مزاد.',
    'حدد العملة وإن كان السعر قابلاً للتفاوض.',
  ],
  5: [
    'أضف صوراً حقيقية للواجهة والداخل.',
    'الفيديوهات تزيد التفاعل بشكل كبير.',
    'راجع بياناتك قبل النشر.',
  ],
};

export default function NewPropertyPage() {
  const [wizardStep, setWizardStep] = useState(1);
  const [progress, setProgress] = useState(0);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrolled = window.scrollY;
      setProgress(docHeight > 0 ? Math.min(100, (scrolled / docHeight) * 100) : 0);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const completedSteps = useMemo(() => new Set(steps.slice(0, wizardStep - 1).map((_, i) => i + 1)), [wizardStep]);

  const goToStep = (step: number) => {
    if (step >= 1 && step <= steps.length) {
      setWizardStep(step);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleValidationError = (errors: Record<string, string>) => {
    const errorFields = Object.keys(errors);
    if (errorFields.length === 0) return;
    const field = errorFields[0];
    const stepMap: Record<string, number> = {
      titleAr: 1, titleEn: 1, descriptionAr: 1, descriptionEn: 1, category: 1, propertyType: 1, referenceNumber: 1,
      country: 2, governorate: 2, city: 2, district: 2, address: 2, latitude: 2, longitude: 2,
      area: 3, yearBuilt: 3, facade: 3, bedrooms: 3, bathrooms: 3, floor: 3, totalFloors: 3, direction: 3, advertisingLicense: 3,
    };
    let targetStep = 1;
    if (field.startsWith('offer_')) {
      targetStep = 4;
    } else if (stepMap[field]) {
      targetStep = stepMap[field];
    }
    goToStep(targetStep);
  };

  return (
    <div className="min-h-screen bg-[var(--color-surface-muted)]" dir="rtl">
      {/* Progress Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-[var(--color-surface)]/20">
        <div
          className="h-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%`, background: 'var(--brand-gradient)' }}
        />
      </div>

      {/* Hero Header */}
      <div
        className="relative overflow-hidden text-white px-6 pt-10 pb-16"
        style={{ background: 'var(--brand-gradient)' }}
      >
        <div className="pointer-events-none absolute -start-20 -top-28 h-72 w-72 rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -bottom-32 end-10 h-80 w-80 rounded-full bg-cyan-300/10 blur-2xl" />

        <div className="relative z-10 max-w-6xl mx-auto">
          <Link
            href="/dashboard/properties"
            className="inline-flex items-center gap-2 text-white/70 hover:text-white text-sm mb-6 transition"
          >
            <ArrowLeft className="w-4 h-4" /> العودة إلى عقاراتي
          </Link>

          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-[var(--color-surface)]/10 px-3 py-1.5 text-xs font-bold backdrop-blur mb-4">
                <Sparkles className="h-3.5 w-3.5 text-[var(--accent)]" />
                معالج إضافة عقار
              </div>
              <h1 className="text-3xl md:text-4xl font-black mb-2">إضافة عقار جديد</h1>
              <p className="text-white/80 text-sm md:text-base max-w-xl">
                أكمل الخطوات الخمس لإدراج عقارك. كلما كانت البيانات أكثر دقة، زادت فرص التفاعل.
              </p>
            </div>

            <div className="hidden md:flex items-center gap-3 rounded-2xl bg-[var(--color-surface)]/10 backdrop-blur border border-white/10 px-4 py-3">
              <ShieldCheck className="w-5 h-5 text-[var(--color-success)]" />
              <span className="text-xs font-semibold">بياناتك محمية ومراجَعة</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Stepper */}
      <div className="sticky top-0 z-40 bg-[var(--color-surface)]/95 backdrop-blur border-b border-[var(--color-border)] shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2">
            {steps.map((step, index) => {
              const stepNum = index + 1;
              const Icon = step.icon;
              const isActive = wizardStep === stepNum;
              const isCompleted = completedSteps.has(stepNum);
              const isLast = index === steps.length - 1;

              return (
                <div key={step.id} className="flex items-center shrink-0">
                  <button
                    type="button"
                    onClick={() => goToStep(stepNum)}
                    className="group flex items-center gap-3 px-3 py-2 rounded-xl transition-all focus:outline-none min-w-fit"
                    style={isActive ? { background: 'rgba(22, 114, 232, 0.08)' } : {}}
                  >
                    <div
                      className={`
                        relative w-10 h-10 rounded-full flex items-center justify-center text-sm font-black
                        border-2 transition-all duration-300 shrink-0
                        ${isActive
                          ? 'border-white text-white shadow-lg scale-110'
                          : isCompleted
                            ? 'border-emerald-500 bg-[var(--color-success-soft)]0 text-white'
                            : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] group-hover:border-[var(--color-primary)]/30 group-hover:text-[var(--color-primary)]'
                        }
                      `}
                      style={isActive ? { background: 'var(--brand-gradient)' } : {}}
                    >
                      {isCompleted && !isActive ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <Icon className="w-4 h-4" />
                      )}
                    </div>
                    <div className="hidden sm:block text-right">
                      <div
                        className={`
                          text-xs font-bold whitespace-nowrap transition-colors
                          ${isActive ? 'text-[--brand-navy]' : isCompleted ? 'text-[var(--color-success)]' : 'text-[var(--color-text-muted)]'}
                        `}
                      >
                        {step.label}
                      </div>
                      <div className="text-[10px] text-[var(--color-text-muted)] whitespace-nowrap">{step.description}</div>
                    </div>
                  </button>
                  {!isLast && (
                    <div className="w-4 md:w-8 h-0.5 mx-1 md:mx-2 bg-slate-200 relative overflow-hidden rounded">
                      <div
                        className="absolute inset-y-0 right-0 bg-emerald-400 transition-all duration-500"
                        style={{ width: isCompleted ? '100%' : '0%' }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
          {/* Form Wizard */}
          <div className="space-y-6">
            <div
              ref={formRef}
              className={`wizard-container wizard-step-${wizardStep}`}
              data-step={wizardStep}
            >
              <PropertyFormWithOffers onValidationError={handleValidationError} />
            </div>

            {/* Wizard Navigation */}
            <div className="flex items-center justify-between bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-4 shadow-sm">
              <button
                type="button"
                onClick={() => goToStep(wizardStep - 1)}
                disabled={wizardStep === 1}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-[var(--color-text-secondary)] bg-[var(--color-surface-muted)] border border-[var(--color-border)] hover:bg-[var(--color-background)] disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronRight className="w-4 h-4" /> السابق
              </button>

              <div className="text-xs font-bold text-[var(--color-text-muted)]">
                الخطوة {wizardStep} من {steps.length}
              </div>

              {wizardStep < steps.length ? (
                <button
                  type="button"
                  onClick={() => goToStep(wizardStep + 1)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white shadow-md hover:shadow-lg transition"
                  style={{ background: 'var(--brand-gradient)' }}
                >
                  التالي <ChevronLeft className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="submit"
                  form="property-form"
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm text-white shadow-md hover:shadow-lg transition"
                  style={{ background: 'var(--brand-gradient)' }}
                >
                  نشر العقار <CheckCircle2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="hidden lg:block">
            <div className="sticky top-36 space-y-4">
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <Info className="w-4 h-4 text-[var(--color-primary)]" />
                  <h3 className="font-bold text-sm text-[var(--color-text-primary)]">
                    نصائح: {steps[wizardStep - 1]?.label}
                  </h3>
                </div>
                <ul className="space-y-3 text-xs text-[var(--color-text-secondary)]">
                  {stepTips[wizardStep]?.map((tip, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-[var(--color-primary)]">•</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>

              <div
                className="rounded-2xl p-5 text-white shadow-md"
                style={{ background: 'var(--brand-gradient)' }}
              >
                <h3 className="font-bold text-sm mb-2">بحاجة إلى مساعدة؟</h3>
                <p className="text-xs text-white/80 mb-3">
                  فريق الدعم جاهز لمساعدتك في إدراج عقارك بشكل صحيح.
                </p>
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-1 text-xs font-bold bg-[var(--color-surface)]/20 hover:bg-[var(--color-surface)]/30 transition rounded-lg px-3 py-2"
                >
                  تواصل معنا
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Wizard CSS — plain style so it ships in initial HTML */}
      <style>{`
        .wizard-container [data-step] {
          animation: wizardFadeIn 0.35s ease-out;
        }
        .wizard-step-1 [data-step]:not([data-step="1"]),
        .wizard-step-2 [data-step]:not([data-step="2"]),
        .wizard-step-3 [data-step]:not([data-step="3"]),
        .wizard-step-4 [data-step]:not([data-step="4"]),
        .wizard-step-5 [data-step]:not([data-step="5"]) {
          display: none;
        }
        /* Hide the form's own submit buttons; use the wizard nav bar instead */
        .wizard-container form#property-form > div[data-step="5"] {
          display: none;
        }
        @keyframes wizardFadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
