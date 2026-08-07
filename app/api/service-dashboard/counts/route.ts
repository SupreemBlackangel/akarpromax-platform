import { NextRequest, NextResponse } from "next/server";
import { getSessionIdentity } from "@/lib/sponsor-auth";
import { getRuntimeDb } from "@/lib/runtime-db";
import { PERMISSIONS } from "@/src/constants/permissions";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const identity = await getSessionIdentity();
  if (!identity.authenticated || !identity.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = await getRuntimeDb();
  const email = identity.email;

  try {
    const [
      requestsResult,
      matchedResult,
      jobsResult,
      offersResult,
      notificationsResult,
      unreadResult,
      disputesResult,
    ] = await Promise.all([
      db.prepare("SELECT COUNT(*) AS count FROM service_requests WHERE customer_user_id = ?1").bind(email).first<{ count: number }>(),
      db.prepare("SELECT COUNT(*) AS count FROM service_request_matches m JOIN service_requests r ON r.id = m.request_id JOIN service_provider_profiles p ON p.id = m.provider_id WHERE p.user_id = ?1 AND m.provider_ignored = 0 AND r.status IN ('published','receiving_offers')").bind(email).first<{ count: number }>(),
      db.prepare("SELECT COUNT(*) AS count FROM service_orders WHERE (customer_user_id = ?1 OR provider_user_id = ?1) AND status IN ('accepted','scheduled','in_progress','waiting_customer_confirmation','delivered')").bind(email, email).first<{ count: number }>(),
      db.prepare("SELECT COUNT(*) AS count FROM service_offers WHERE provider_user_id = ?1 AND status = 'sent'").bind(email).first<{ count: number }>(),
      db.prepare("SELECT COUNT(*) AS count FROM service_notifications WHERE user_id = ?1").bind(email).first<{ count: number }>(),
      db.prepare("SELECT COUNT(*) AS count FROM service_notifications WHERE user_id = ?1 AND is_read = 0").bind(email).first<{ count: number }>(),
      db.prepare("SELECT COUNT(*) AS count FROM service_disputes WHERE opened_by_user_id = ?1 AND status IN ('open','in_review')").bind(email).first<{ count: number }>(),
    ]);

    const counts = {
      openRequests: requestsResult?.count ?? 0,
      matchedRequests: matchedResult?.count ?? 0,
      activeJobs: jobsResult?.count ?? 0,
      pendingOffers: offersResult?.count ?? 0,
      totalNotifications: notificationsResult?.count ?? 0,
      unreadNotifications: unreadResult?.count ?? 0,
      openDisputes: disputesResult?.count ?? 0,
      unreadMessages: 0, // placeholder for inbox unread
    };

    return NextResponse.json(counts);
  } catch (error) {
    console.error("[api/service-dashboard/counts] error:", error);
    return NextResponse.json({ error: "Failed to fetch counts" }, { status: 500 });
  }
}