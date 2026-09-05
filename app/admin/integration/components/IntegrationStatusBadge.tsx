import { AlertTriangle, CheckCircle2, PlugZap, XCircle } from "lucide-react";
import Badge from "@/src/components/ui/Badge";

/** The four states an integration can be in, each with an icon AND a word — never colour alone. */
export type IntegrationStatus = "connected" | "disconnected" | "needs_setup" | "error";

const STATUS: Record<IntegrationStatus, { label: string; variant: "success" | "neutral" | "warning" | "danger"; Icon: typeof CheckCircle2 }> = {
  connected: { label: "متصل", variant: "success", Icon: CheckCircle2 },
  disconnected: { label: "غير متصل", variant: "neutral", Icon: XCircle },
  needs_setup: { label: "يحتاج إعداداً", variant: "warning", Icon: PlugZap },
  error: { label: "خطأ", variant: "danger", Icon: AlertTriangle },
};

export function statusLabel(status: IntegrationStatus): string {
  return STATUS[status].label;
}

export default function IntegrationStatusBadge({ status, className = "" }: { status: IntegrationStatus; className?: string }) {
  const { label, variant, Icon } = STATUS[status];
  return (
    <Badge variant={variant} className={className} aria-label={`الحالة: ${label}`}>
      <Icon className="size-3.5" aria-hidden="true" />
      <span>{label}</span>
    </Badge>
  );
}
