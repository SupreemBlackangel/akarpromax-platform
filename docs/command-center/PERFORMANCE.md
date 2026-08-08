# Command Center Performance

## Query Performance

### Parallel Execution
All 35+ database queries execute in parallel using `Promise.all()`. This reduces total response time from ~35 sequential queries to ~max(query times).

### Index Coverage
All `GROUP BY` columns are indexed:

- `sponsors.status`, `sponsors.country_code`
- `ad_campaigns.status`, `ad_campaigns.campaign_type`, `ad_campaigns.approval_status`, `ad_campaigns.end_at`
- `property_listings.status`, `property_listings.property_type`, `property_listings.listing_type`, `property_listings.country_code`, `property_listings.city_id`, `property_listings.is_featured`, `property_listings.created_at`, `property_listings.updated_at`
- `service_requests.status`, `service_requests.city_id`
- `service_offers.status`, `service_orders.status`
- `service_provider_profiles.status`, `service_provider_profiles.city_id`, `service_provider_profiles.created_at`
- `service_disputes.status`, `service_disputes.opened_at`
- `users.role`, `users.status`, `users.created_at`
- `office_devices.status`, `office_devices.last_seen_at`
- `office_sync_operations.status`
- `office_pairing_codes.status`
- `office_notification_deliveries.status`
- `audit_logs.action`, `audit_logs.created_at`

### Query Patterns
- All queries use `SELECT` only (no mutations)
- Parameterized queries prevent SQL injection
- `GROUP BY` with `COUNT(*)` for aggregations
- `ORDER BY ... LIMIT` for top-N queries
- `datetime('now', '-N day')` for relative time windows

## Client Performance

### Polling
- **Interval**: 30 seconds
- **Method**: `setInterval` with cleanup on unmount
- **Loading state**: Skeleton UI during fetch
- **Error state**: Toast notification with retry

### Rendering
- **CSS**: Pure CSS with utility classes (no CSS-in-JS)
- **Responsive**: Three breakpoints (1100px, 780px, 480px)
- **Dark mode**: CSS variables for theme switching
- **RTL**: Bidirectional layout support
- **Reduced motion**: Respects `prefers-reduced-motion`

### Memory
- No state management library (React state only)
- No client-side data caching (fetch on mount + interval)
- Cleanup on unmount prevents memory leaks

## Scalability Considerations

### Current Limits
- ~35 queries per request
- 30-second polling interval
- Top 10 limits on geographic data
- 90-day maximum time windows

### Optimization Opportunities
- **Caching**: Redis/memcached for frequently accessed metrics
- **Materialized views**: Pre-computed aggregations for heavy queries
- **WebSocket**: Push-based updates instead of polling
- **Pagination**: For large result sets (audit logs, notifications)

### Monitoring
- Response time logging in API route
- Query count tracking in service
- Client-side performance metrics (FID, LCP, CLS)

## Security Performance

- RBAC check is O(1) (permission array lookup)
- No client-side filtering (server returns pre-aggregated data)
- SQL injection prevented at query preparation time
- No PII exposure in aggregated results
