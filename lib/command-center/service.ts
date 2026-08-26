import { getRuntimeDb } from "@/lib/runtime-db";

export type CommandCenterOverview = {
  generatedAt: string;
  advertisers: {
    total: number;
    active: number;
    byStatus: Record<string, number>;
    byCountry: { country: string; count: number }[];
  };
  ads: {
    total: number;
    active: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
    byApprovalStatus: Record<string, number>;
    endingSoon: number;
    totalImpressions: number;
    totalClicks: number;
    ctr: number;
    totalConversions: number;
  };
  properties: {
    total: number;
    active: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
    byListingType: Record<string, number>;
    byCountry: Record<string, number>;
    featured: number;
    missingCoordinates: number;
    staleCount: number;
    recentCount: number;
  };
  services: {
    totalRequests: number;
    openRequests: number;
    byRequestStatus: Record<string, number>;
    totalOffers: number;
    byOfferStatus: Record<string, number>;
    totalOrders: number;
    activeOrders: number;
    byOrderStatus: Record<string, number>;
    totalProviders: number;
    approvedProviders: number;
    byProviderStatus: Record<string, number>;
    totalDisputes: number;
    openDisputes: number;
    byDisputeStatus: Record<string, number>;
    totalReviews: number;
    avgRating: number;
    oldestDisputeAge: string | null;
    oldestPendingVerificationAge: string | null;
  };
  users: {
    total: number;
    byRole: Record<string, number>;
    byStatus: Record<string, number>;
    recentRegistrations: number;
    suspendedCount: number;
    pendingVerification: number;
  };
  integration: {
    totalDevices: number;
    activeDevices: number;
    byDeviceStatus: Record<string, number>;
    staleDevices: number;
    totalSyncs: number;
    successfulSyncs: number;
    bySyncStatus: Record<string, number>;
    failedSyncs: number;
    conflictSyncs: number;
    deadLetterSyncs: number;
    totalRadars: number;
    pendingPairings: number;
    notificationDeliveries: number;
    failedDeliveries: number;
  };
  geo: {
    propertiesByCity: { city: string; count: number }[];
    demandByCity: { city: string; count: number }[];
    providersByCity: { city: string; count: number }[];
    coverageGaps: { city: string; demand: number; providers: number }[];
  };
  news: {
    total: number;
    active: number;
  };
  health: {
    status: "healthy" | "degraded" | "unavailable";
    schemaMode: string;
    schemaReady: boolean;
    database: "healthy" | "degraded" | "unavailable";
    authentication: "healthy" | "degraded" | "unavailable";
    realtime: "healthy" | "degraded" | "unavailable";
    officeIntegration: "healthy" | "degraded" | "unavailable";
    email: "healthy" | "degraded" | "unavailable";
    uptime: string;
  };
  audit: {
    recent: { action: string; entityType: string; entityId: string | null; createdAt: string }[];
    todayCount: number;
  };
};

type CountRow = { name: string; total: number };

async function countByStatus(db: D1Database, table: string, column: string): Promise<Record<string, number>> {
  try {
    const rows = await db.prepare(
      `SELECT ${column} AS name, COUNT(*) AS total FROM ${table} GROUP BY ${column}`,
    ).all<CountRow>();
    const result: Record<string, number> = {};
    rows.results.forEach((row) => { result[row.name] = Number(row.total); });
    return result;
  } catch {
    return {};
  }
}

function computeAge(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "1 day";
  if (days < 30) return `${days} days`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo`;
  const years = Math.floor(months / 12);
  return `${years}y ${months % 12}mo`;
}

export async function getCommandCenterOverview(): Promise<CommandCenterOverview> {
  const db = await getRuntimeDb();

  const [
    advertiserByStatus,
    advertiserByCountry,
    campaignByStatus,
    adImpressionsTotal,
    campaignByType,
    campaignByApproval,
    campaignEndingSoon,
    propertyByType,
    propertyByCountry,
    propertyStatuses,
    propertyByListingType,
    propertyFeatured,
    propertyMissingCoords,
    propertyStale,
    propertyRecent,
    serviceRequests,
    serviceOffers,
    serviceOrders,
    serviceProviders,
    serviceReviews,
    disputeByStatus,
    oldestDispute,
    oldestPendingVerification,
    usersByRole,
    usersByStatus,
    userRecentRegistrations,
    officeDevices,
    officeSyncs,
    officeRadars,
    officeStaleDevices,
    officePendingPairings,
    officeNotificationStats,
    newsByStatus,
    auditRecent,
    auditToday,
    propertiesByCity,
    demandByCity,
    providersByCity,
  ] = await Promise.all([
    countByStatus(db, "sponsors", "status"),
    db.prepare(
      `SELECT country_code AS name, COUNT(*) AS total FROM sponsors GROUP BY country_code ORDER BY total DESC`,
    ).all<CountRow>(),
    countByStatus(db, "ad_campaigns", "status"),
    db.prepare(
      `SELECT COALESCE(SUM(total_impressions), 0) AS impressions, COALESCE(SUM(total_clicks), 0) AS clicks FROM ad_campaigns`,
    ).first<{ impressions: number; clicks: number }>(),
    db.prepare(
      `SELECT campaign_type AS name, COUNT(*) AS total FROM ad_campaigns GROUP BY campaign_type`,
    ).all<CountRow>(),
    db.prepare(
      `SELECT approval_status AS name, COUNT(*) AS total FROM ad_campaigns GROUP BY approval_status`,
    ).all<CountRow>(),
    db.prepare(
      `SELECT COUNT(*) AS total FROM ad_campaigns WHERE end_at IS NOT NULL AND datetime(end_at) <= datetime('now', '+7 days') AND datetime(end_at) >= datetime('now') AND status = 'active'`,
    ).first<{ total: number }>(),
    db.prepare(
      `SELECT property_type AS name, COUNT(*) AS total FROM property_listings GROUP BY property_type`,
    ).all<CountRow>(),
    db.prepare(
      `SELECT country_code AS name, COUNT(*) AS total FROM property_listings GROUP BY country_code`,
    ).all<CountRow>(),
    countByStatus(db, "property_listings", "status"),
    db.prepare(
      `SELECT listing_type AS name, COUNT(*) AS total FROM property_listings GROUP BY listing_type`,
    ).all<CountRow>(),
    db.prepare(
      `SELECT COUNT(*) AS total FROM property_listings WHERE is_featured = 1`,
    ).first<{ total: number }>(),
    db.prepare(
      `SELECT COUNT(*) AS total FROM property_listings WHERE latitude IS NULL OR longitude IS NULL`,
    ).first<{ total: number }>(),
    db.prepare(
      `SELECT COUNT(*) AS total FROM property_listings WHERE datetime(updated_at) < datetime('now', '-30 days') AND status != 'deleted'`,
    ).first<{ total: number }>(),
    db.prepare(
      `SELECT COUNT(*) AS total FROM property_listings WHERE datetime(created_at) >= datetime('now', '-30 days')`,
    ).first<{ total: number }>(),
    countByStatus(db, "service_requests", "status"),
    countByStatus(db, "service_offers", "status"),
    countByStatus(db, "service_orders", "status"),
    db.prepare(
      `SELECT status AS name, COUNT(*) AS total FROM service_provider_profiles GROUP BY status`,
    ).all<CountRow>(),
    db.prepare(
      `SELECT COALESCE(AVG(rating), 0) AS avg_rating, COUNT(*) AS total FROM service_reviews`,
    ).first<{ avg_rating: number; total: number }>(),
    countByStatus(db, "service_disputes", "status"),
    db.prepare(
      `SELECT opened_at FROM service_disputes WHERE status IN ('open', 'in_review') ORDER BY opened_at ASC LIMIT 1`,
    ).first<{ opened_at: string }>(),
    db.prepare(
      `SELECT created_at FROM service_provider_profiles WHERE status IN ('submitted', 'under_review') ORDER BY created_at ASC LIMIT 1`,
    ).first<{ created_at: string }>(),
    countByStatus(db, "users", "role"),
    countByStatus(db, "users", "status"),
    db.prepare(
      `SELECT COUNT(*) AS total FROM users WHERE created_at >= datetime('now', '-30 days')`,
    ).first<{ total: number }>(),
    db.prepare(
      `SELECT status AS name, COUNT(*) AS total FROM office_devices GROUP BY status`,
    ).all<CountRow>(),
    db.prepare(
      `SELECT status AS name, COUNT(*) AS total FROM office_sync_operations GROUP BY status`,
    ).all<CountRow>(),
    db.prepare(`SELECT COUNT(*) AS total FROM office_radar_queries`).first<{ total: number }>(),
    db.prepare(
      `SELECT COUNT(*) AS total FROM office_devices WHERE datetime(last_seen_at) < datetime('now', '-7 days') OR last_seen_at IS NULL`,
    ).first<{ total: number }>(),
    db.prepare(
      `SELECT COUNT(*) AS total FROM office_pairing_codes WHERE status = 'pending' AND datetime(expires_at) > datetime('now')`,
    ).first<{ total: number }>(),
    db.prepare(
      `SELECT status AS name, COUNT(*) AS total FROM office_notification_deliveries GROUP BY status`,
    ).all<CountRow>(),
    countByStatus(db, "news", "status"),
    db.prepare(
      `SELECT action, entity_type, entity_id, created_at FROM audit_logs ORDER BY created_at DESC LIMIT 10`,
    ).all<{ action: string; entity_type: string; entity_id: string | null; created_at: string }>(),
    db.prepare(
      `SELECT COUNT(*) AS total FROM audit_logs WHERE date(created_at) = date('now')`,
    ).first<{ total: number }>(),
    db.prepare(
      `SELECT city_id AS city, COUNT(*) AS total FROM property_listings WHERE status = 'active' AND city_id IS NOT NULL GROUP BY city_id ORDER BY total DESC LIMIT 10`,
    ).all<{ city: string; total: number }>(),
    db.prepare(
      `SELECT city_id AS city, COUNT(*) AS total FROM service_requests WHERE city_id IS NOT NULL GROUP BY city_id ORDER BY total DESC LIMIT 10`,
    ).all<{ city: string; total: number }>(),
    db.prepare(
      `SELECT city_id AS city, COUNT(*) AS total FROM service_provider_profiles WHERE city_id IS NOT NULL AND status = 'approved' GROUP BY city_id ORDER BY total DESC LIMIT 10`,
    ).all<{ city: string; total: number }>(),
  ]);

  const advertiserTotal = Object.values(advertiserByStatus).reduce((s, n) => s + n, 0);
  const adTotal = Object.values(campaignByStatus).reduce((s, n) => s + n, 0);
  const impressions = Number(adImpressionsTotal?.impressions ?? 0);
  const clicks = Number(adImpressionsTotal?.clicks ?? 0);
  const propertyTotal = propertyByType.results.reduce((s, r) => s + Number(r.total), 0);
  const providerRows = serviceProviders.results;
  const providerTotal = providerRows.reduce((s, r) => s + Number(r.total), 0);
  const userTotal = Object.values(usersByRole).reduce((s, n) => s + n, 0);

  const deviceByStatus: Record<string, number> = {};
  officeDevices.results.forEach((r) => { deviceByStatus[r.name] = Number(r.total); });
  const syncByStatus: Record<string, number> = {};
  officeSyncs.results.forEach((r) => { syncByStatus[r.name] = Number(r.total); });

  return {
    generatedAt: new Date().toISOString(),
    advertisers: {
      total: advertiserTotal,
      active: advertiserByStatus.active ?? 0,
      byStatus: advertiserByStatus,
      byCountry: advertiserByCountry.results.map((r) => ({ country: r.name, count: Number(r.total) })),
    },
    ads: {
      total: adTotal,
      active: (campaignByStatus.active ?? 0) + (campaignByStatus.running ?? 0),
      byStatus: campaignByStatus,
      byType: Object.fromEntries(campaignByType.results.map((r) => [r.name, Number(r.total)])),
      byApprovalStatus: Object.fromEntries(campaignByApproval.results.map((r) => [r.name, Number(r.total)])),
      endingSoon: Number(campaignEndingSoon?.total ?? 0),
      totalImpressions: impressions,
      totalClicks: clicks,
      ctr: impressions > 0 ? Number(((clicks / impressions) * 100).toFixed(1)) : 0,
      totalConversions: 0,
    },
    properties: {
      total: propertyTotal,
      active: propertyStatuses.active ?? 0,
      byStatus: propertyStatuses,
      byType: Object.fromEntries(propertyByType.results.map((r) => [r.name, Number(r.total)])),
      byListingType: Object.fromEntries(propertyByListingType.results.map((r) => [r.name, Number(r.total)])),
      byCountry: Object.fromEntries(propertyByCountry.results.map((r) => [r.name, Number(r.total)])),
      featured: Number(propertyFeatured?.total ?? 0),
      missingCoordinates: Number(propertyMissingCoords?.total ?? 0),
      staleCount: Number(propertyStale?.total ?? 0),
      recentCount: Number(propertyRecent?.total ?? 0),
    },
    services: {
      totalRequests: Object.values(serviceRequests).reduce((s, n) => s + n, 0),
      openRequests: serviceRequests.open ?? 0,
      byRequestStatus: serviceRequests,
      totalOffers: Object.values(serviceOffers).reduce((s, n) => s + n, 0),
      byOfferStatus: serviceOffers,
      totalOrders: Object.values(serviceOrders).reduce((s, n) => s + n, 0),
      activeOrders: (serviceOrders.in_progress ?? 0) + (serviceOrders.active ?? 0),
      byOrderStatus: serviceOrders,
      totalProviders: providerTotal,
      approvedProviders: providerRows.find((r) => r.name === "approved")?.total ?? 0,
      byProviderStatus: Object.fromEntries(providerRows.map((r) => [r.name, Number(r.total)])),
      totalDisputes: Object.values(disputeByStatus).reduce((s, n) => s + n, 0),
      openDisputes: (disputeByStatus.open ?? 0) + (disputeByStatus.in_review ?? 0),
      byDisputeStatus: disputeByStatus,
      totalReviews: Number(serviceReviews?.total ?? 0),
      avgRating: Number(Number(serviceReviews?.avg_rating ?? 0).toFixed(1)),
      oldestDisputeAge: oldestDispute?.opened_at ? computeAge(oldestDispute.opened_at) : null,
      oldestPendingVerificationAge: oldestPendingVerification?.created_at ? computeAge(oldestPendingVerification.created_at) : null,
    },
    users: {
      total: userTotal,
      byRole: Object.fromEntries(Object.entries(usersByRole).map(([k, v]) => [k, Number(v)])),
      byStatus: Object.fromEntries(Object.entries(usersByStatus).map(([k, v]) => [k, Number(v)])),
      recentRegistrations: Number(userRecentRegistrations?.total ?? 0),
      suspendedCount: usersByStatus.suspended ?? 0,
      pendingVerification: usersByStatus.pending_verification ?? 0,
    },
    integration: {
      totalDevices: Object.values(deviceByStatus).reduce((s, n) => s + n, 0),
      activeDevices: deviceByStatus.active ?? 0,
      byDeviceStatus: deviceByStatus,
      staleDevices: Number(officeStaleDevices?.total ?? 0),
      totalSyncs: Object.values(syncByStatus).reduce((s, n) => s + n, 0),
      successfulSyncs: syncByStatus.synced ?? 0,
      bySyncStatus: syncByStatus,
      failedSyncs: syncByStatus.failed ?? 0,
      conflictSyncs: syncByStatus.conflict ?? 0,
      deadLetterSyncs: syncByStatus.dead_letter ?? 0,
      totalRadars: Number(officeRadars?.total ?? 0),
      pendingPairings: Number(officePendingPairings?.total ?? 0),
      notificationDeliveries: officeNotificationStats.results.reduce((s, r) => s + Number(r.total), 0),
      failedDeliveries: officeNotificationStats.results.find((r) => r.name === "failed")?.total ?? 0,
    },
    geo: (() => {
      const propCities = propertiesByCity.results.map((r) => ({ city: r.city, count: Number(r.total) }));
      const demandCities = demandByCity.results.map((r) => ({ city: r.city, count: Number(r.total) }));
      const provCities = providersByCity.results.map((r) => ({ city: r.city, count: Number(r.total) }));
      const provMap = new Map(provCities.map((p) => [p.city, p.count]));
      const demandMap = new Map(demandCities.map((d) => [d.city, d.count]));
      const allCities = new Set([...propCities.map((p) => p.city), ...demandCities.map((d) => d.city), ...provCities.map((p) => p.city)]);
      const gaps: { city: string; demand: number; providers: number }[] = [];
      allCities.forEach((city) => {
        const demand = demandMap.get(city) ?? 0;
        const providers = provMap.get(city) ?? 0;
        if (demand >= 2 && providers === 0) gaps.push({ city, demand, providers });
      });
      gaps.sort((a, b) => b.demand - a.demand);
      return {
        propertiesByCity: propCities,
        demandByCity: demandCities,
        providersByCity: provCities,
        coverageGaps: gaps.slice(0, 10),
      };
    })(),
    news: {
      total: Object.values(newsByStatus).reduce((s, n) => s + n, 0),
      active: newsByStatus.active ?? 0,
    },
    health: {
      status: "healthy",
      schemaMode: "unknown",
      schemaReady: false,
      database: "healthy",
      authentication: userTotal > 0 ? "healthy" : "degraded",
      realtime: Number(officeRadars?.total ?? 0) > 0 ? "healthy" : "degraded",
      officeIntegration: Object.values(deviceByStatus).reduce((s, n) => s + n, 0) > 0 ? "healthy" : "degraded",
      email: "degraded",
      uptime: "unknown",
    },
    audit: {
      recent: auditRecent.results.map((r) => ({
        action: r.action,
        entityType: r.entity_type,
        entityId: r.entity_id,
        createdAt: r.created_at,
      })),
      todayCount: Number(auditToday?.total ?? 0),
    },
  };
}
