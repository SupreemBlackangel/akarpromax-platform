import { notFound } from "next/navigation";
import { cn } from "@/src/utils/cn";

type DemoSectionProps = {
  title: string;
  children: React.ReactNode;
};

function DemoSection({ title, children }: DemoSectionProps) {
  return (
    <section className="space-y-4">
      <h2 className="text-[var(--font-size-lg)] font-semibold text-[color:var(--color-text-primary)]">{title}</h2>
      <div className="rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-[var(--space-6)] shadow-[var(--shadow-sm)]">
        {children}
      </div>
    </section>
  );
}

export default function DesignSystemPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return (
    <div dir="rtl" lang="ar" className="min-h-screen bg-[color:var(--color-background)] text-[color:var(--color-text-primary)]">
      <main className={cn("mx-auto w-full max-w-[1140px] px-[var(--space-5)] py-[var(--space-12)]", "")}>
        <div className="mb-[var(--space-12)] flex flex-col gap-2">
          <h1 className="text-[var(--font-size-2xl)] font-bold text-[color:var(--color-text-primary)]">Design System</h1>
          <p className="text-[var(--font-size-sm)] text-[color:var(--color-text-muted)]">
            Dev-only showcase of the Phase 1 primitives. Not rendered in production (notFound below the NODE_ENV guard).
          </p>
        </div>

        <div className="space-y-[var(--space-12)]">
          <DemoSection title="Buttons">
            <div className="flex flex-wrap items-center gap-4">
              <button className="h-10 rounded-[var(--radius-md)] bg-[color:var(--color-primary)] px-[var(--space-5)] text-[var(--font-size-md)] font-medium text-[color:var(--color-primary-foreground)] hover:bg-[color:var(--color-primary-hover)]">إرسال</button>
              <button className="h-10 rounded-[var(--radius-md)] border border-[color:var(--color-border-strong)] px-[var(--space-5)] text-[var(--font-size-md)] font-medium text-[color:var(--color-text-primary)] hover:bg-[color:var(--color-surface-muted)]">إلغاء</button>
              <button className="h-10 rounded-[var(--radius-md)] bg-[color:var(--color-danger)] px-[var(--space-5)] text-[var(--font-size-md)] font-medium text-[color:var(--color-danger-foreground)]">حذف</button>
            </div>
          </DemoSection>

          <DemoSection title="Cards">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-[var(--space-6)] shadow-[var(--shadow-sm)]">
                <h3 className="text-[var(--font-size-lg)] font-semibold">بطاقة تجريبية</h3>
                <p className="mt-2 text-[var(--font-size-sm)] text-[color:var(--color-text-muted)]">نص وصفي قصير</p>
              </div>
              <div className="rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-[var(--space-6)] shadow-[var(--shadow-sm)]">
                <h3 className="text-[var(--font-size-lg)] font-semibold">بطاقة ثانية</h3>
                <p className="mt-2 text-[var(--font-size-sm)] text-[color:var(--color-text-muted)]">نص وصفي قصير</p>
              </div>
            </div>
          </DemoSection>

          <DemoSection title="Forms">
            <div className="flex flex-col gap-4">
              <label className="text-[var(--font-size-sm)] font-medium">
                اسم المستخدم
                <input className="mt-1 h-10 w-full rounded-[var(--radius-md)] border border-[color:var(--color-border-strong)] bg-[color:var(--color-surface-input)] px-[var(--space-4)] text-[var(--font-size-md)]" placeholder="اكتب هنا" />
              </label>
              <label className="text-[var(--font-size-sm)] font-medium">
                بريد إلكتروني
                <input className="mt-1 h-10 w-full rounded-[var(--radius-md)] border border-[color:var(--color-border-strong)] bg-[color:var(--color-surface-input)] px-[var(--space-4)] text-[var(--font-size-md)]" placeholder="you@example.com" />
              </label>
            </div>
          </DemoSection>

          <DemoSection title="Feedback">
            <div className="flex flex-col gap-4">
              <div className="rounded-[var(--radius-md)] border border-[color:var(--color-danger)]/30 bg-[color:var(--color-danger-soft)] p-[var(--space-4)] text-[var(--font-size-sm)]">
                حدث خطأ ما
              </div>
              <div className="rounded-[var(--radius-md)] border border-[color:var(--color-success)]/30 bg-[color:var(--color-success-soft)] p-[var(--space-4)] text-[var(--font-size-sm)]">
                تم الحفظ بنجاح
              </div>
            </div>
          </DemoSection>

          <DemoSection title="Overlays">
            <button className="h-10 rounded-[var(--radius-md)] bg-[color:var(--color-primary)] px-[var(--space-5)] text-[var(--font-size-md)] font-medium text-[color:var(--color-primary-foreground)] hover:bg-[color:var(--color-primary-hover)]">
              فتح نافذة
            </button>
            <p className="mt-2 text-[var(--font-size-xs)] text-[color:var(--color-text-muted)]">
              Dialog / DropdownMenu / Tooltip are client components with interactive wiring; see tests.
            </p>
          </DemoSection>
        </div>
      </main>
    </div>
  );
}
