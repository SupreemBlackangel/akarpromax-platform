import { redirect } from "next/navigation";

export default function FindMyLandPage() {
  redirect("/tools?tool=findmyland");
}
