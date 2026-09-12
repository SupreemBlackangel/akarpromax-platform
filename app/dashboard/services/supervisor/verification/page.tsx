import { redirect } from "next/navigation";

// The verification queue is the providers list filtered to the two statuses an
// application can be waiting in: `submitted` (just arrived) and `under_review`
// (already being read). Asking for the second alone hid every new application.
export default function SupervisorVerificationPage() {
  redirect("/dashboard/services/supervisor/providers?status=submitted,under_review");
}
