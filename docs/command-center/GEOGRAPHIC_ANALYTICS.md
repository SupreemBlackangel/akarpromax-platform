# Command Center Geographic Analytics

## Overview

The Command Center provides geographic intelligence across three dimensions: property listings, service demand, and provider coverage. Coverage gaps are identified by comparing demand against supply at the city level.

## Data Sources

### Properties by City
- **Table**: `property_listings`
- **Grouping**: `city_id`
- **Metrics**: Total count, active count
- **Limit**: Top 10 cities by listing count

### Demand by City
- **Table**: `service_requests`
- **Grouping**: `city_id`
- **Metrics**: Total count, open count
- **Limit**: Top 10 cities by request count

### Providers by City
- **Table**: `service_provider_profiles`
- **Filter**: `status = 'approved'`
- **Grouping**: `city_id`
- **Metrics**: Total approved providers
- **Limit**: Top 10 cities by provider count

## Coverage Gap Detection

Coverage gaps are computed by comparing demand against supply:

```sql
-- High demand + low supply = coverage gap
SELECT 
  city_id,
  COUNT(*) as demand_count
FROM service_requests
WHERE status IN ('open', 'in_progress')
GROUP BY city_id
HAVING COUNT(*) >= 2
```

Cities with demand >= 2 requests but no approved providers are flagged as coverage gaps.

## Visualization

### Mini Bar Charts
- Horizontal bar charts showing top cities by count
- Color-coded by category (properties, demand, providers)
- Responsive layout (stacks on mobile)

### Coverage Gaps Panel
- List view with city name and demand count
- Warning styling to highlight underserved areas
- Action-oriented: suggests where to recruit providers

## Use Cases

1. **Market Expansion**: Identify cities with high property listings but low service demand
2. **Provider Recruitment**: Find cities with demand but no approved providers
3. **Resource Allocation**: Prioritize support in high-activity cities
4. **Marketing**: Target campaigns in underserved areas

## Limitations

- City IDs require a separate lookup table for human-readable names
- Coverage gaps use a simple threshold (demand >= 2)
- No historical trend analysis (point-in-time snapshot)
- Geographic boundaries are city-level, not neighborhood-level
