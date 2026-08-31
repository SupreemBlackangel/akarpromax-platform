import { redirect } from "next/navigation";

// The verification queue is the providers list filtered to under_review.
export default function SupervisorVerificationPage() {
  redirect("/dashboard/services/supervisor/providers?status=under_review");
}
