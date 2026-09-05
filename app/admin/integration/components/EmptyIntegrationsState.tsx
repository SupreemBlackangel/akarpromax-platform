import { PlugZap } from "lucide-react";
import { EmptyState } from "@/src/components/ui/Feedback";
import Button from "@/src/components/ui/Button";

/**
 * Shown when no office application has connected yet. It says what will
 * populate the page and points at the one thing that does: the download.
 */
export default function EmptyIntegrationsState() {
  return (
    <div className="rounded-2xl border border-dashed border-[color:var(--color-border)] bg-[color:var(--color-surface)] py-4">
      <EmptyState
        icon={<PlugZap className="size-6" aria-hidden="true" />}
        title="لا توجد تكاملات متصلة بعد"
        description="عندما يربط مكتب تطبيقه المكتبي بحسابه على المنصة، سيظهر هنا كبطاقة بحالته وآخر مزامنة له."
        action={
          <Button variant="primary" size="sm" onClick={() => { if (typeof window !== "undefined") window.location.assign("/download"); }}>
            صفحة تحميل التطبيق المكتبي
          </Button>
        }
      />
    </div>
  );
}
