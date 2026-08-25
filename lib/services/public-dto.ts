type DataRow = Record<string, unknown>;

/**
 * Public Services API projections. Keep these serializers allowlist-only: a
 * newly added database column must never become public without an explicit
 * decision here.
 */
export function toPublicProviderProfile(row: DataRow) {
  return {
    id: row.id,
    display_name_ar: row.display_name_ar,
    display_name_en: row.display_name_en,
    bio_ar: row.bio_ar,
    bio_en: row.bio_en,
    logo_url: row.logo_url,
    cover_url: row.cover_url,
    website: row.website,
    country_code: row.country_code,
    city_id: row.city_id,
    district_id: row.district_id,
    governorate: row.governorate,
    service_radius_km: row.service_radius_km,
    status: row.status,
    verified_at: row.verified_at,
    approved_at: row.approved_at,
    rating_avg: row.rating_avg,
    rating_count: row.rating_count,
    jobs_completed: row.jobs_completed,
    completion_rate: row.completion_rate,
    response_rate: row.response_rate,
    avg_response_time_min: row.avg_response_time_min,
    founded_year: row.founded_year,
    team_size: row.team_size,
    is_business: row.is_business,
    business_name: row.business_name,
    is_featured: row.is_featured,
    featured_rank: row.featured_rank,
    is_accepting_requests: row.is_accepting_requests,
  };
}

export function toPublicProviderCategory(row: DataRow) {
  return {
    id: row.id,
    category_id: row.category_id,
    price_from: row.price_from,
    price_to: row.price_to,
    instant_price: row.instant_price,
    currency: row.currency,
    pricing_unit: row.pricing_unit,
    min_duration_min: row.min_duration_min,
    category_code: row.category_code,
    category_name_ar: row.category_name_ar,
    category_name_en: row.category_name_en,
    category_icon: row.category_icon,
    booking_mode: row.booking_mode,
  };
}

export function toPublicPortfolioItem(row: DataRow) {
  return {
    id: row.id,
    category_id: row.category_id,
    city_id: row.city_id,
    title: row.title,
    description: row.description,
    image_url: row.image_url,
    before_image_url: row.before_image_url,
    after_image_url: row.after_image_url,
    video_url: row.video_url,
    year: row.year,
    tags: row.tags,
    is_featured: row.is_featured,
  };
}

export function toPublicServiceListing(row: DataRow) {
  return {
    id: row.id,
    category_id: row.category_id,
    country_code: row.country_code,
    city_id: row.city_id,
    district_id: row.district_id,
    title_key: row.title_key,
    description_key: row.description_key,
    price: row.price,
    currency: row.currency,
    unit: row.unit,
    status: row.status,
    is_featured: row.is_featured,
    tags: row.tags,
    title_ar: row.title_ar,
    title_en: row.title_en,
    title_tr: row.title_tr,
    description_ar: row.description_ar,
    description_en: row.description_en,
    description_tr: row.description_tr,
    media: row.media,
    approved_at: row.approved_at,
    published_at: row.published_at,
    is_promoted: row.is_promoted,
    view_count: row.view_count,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function toPublicServiceReview(row: DataRow) {
  return {
    id: row.id,
    rating: row.rating,
    comment: row.comment,
    quality_rating: row.quality_rating,
    punctuality_rating: row.punctuality_rating,
    communication_rating: row.communication_rating,
    value_rating: row.value_rating,
    recommend: row.recommend,
    created_at: row.created_at,
  };
}
