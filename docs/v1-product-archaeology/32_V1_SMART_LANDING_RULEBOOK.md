# 32 — V1 SMART LANDING RULEBOOK

**Source:** `src/hooks/useSmartLanding.ts` (190 lines) + `src/components/SmartLandingBanner.tsx` (279 lines)

## How Smart Landing Works

Smart Landing is a **URL-parameter-driven content personalization system**. When a user arrives at AkarPromax via a URL containing specific parameters, the system:

1. Parses the URL parameters
2. Sets the user's geographic context (country, governorate, city)
3. Shows a targeted CTA banner matching the category
4. Logs an analytics event

## URL Parameters

| Parameter | Aliases | Effect |
|---|---|---|
| `city` | `مدينة` | Sets user's city context |
| `cat` | `category`, `فئة` | Sets category for CTA banner |
| `country` | `دولة` | Sets country context |
| `gov` | `region`, `منطقة` | Sets governorate context |
| `source` | — | Tracks traffic source |
| `utm_source` | — | UTM source tracking (also sets `source` as fallback) |
| `utm_campaign` | — | UTM campaign tracking |
| `utm_medium` | — | UTM medium tracking |

## Category Alias Resolution

| Canonical Key | Accepted Aliases |
|---|---|
| `maintenance` | maintenance, صيانة, maintain, repair |
| `apartment` | apartments, apartment, شقق, شقة |
| `villa` | villas, villa, فيلا, فلل |
| `land` | land, lands, أرض, اراضي |
| `commercial` | commercial, تجاري |
| `office` | offices, office, مكتب, مكاتب |
| `rent` | rent, إيجار |
| `sale` | sale, بيع |
| `chalet` | chalet, شاليه |
| `warehouse` | warehouse, مستودع |

**Total: 10 canonical categories, 26 aliases**

## City Resolution

### 20 Hardcoded Cities in 7 Countries

| City (AR) | City (EN) | Country |
|---|---|---|
| جدة | Jeddah | SA |
| الرياض | Riyadh | SA |
| مكة المكرمة | Makkah | SA |
| المدينة المنورة | Madinah | SA |
| الدمام | Dammam | SA |
| دبي | Dubai | AE |
| أبوظبي | Abu Dhabi | AE |
| مسقط | Muscat | OM |
| الكويت | Kuwait | KW |
| الدوحة | Doha | QA |
| القاهرة | Cairo | EG |
| عمان | Amman | JO |
| بيروت | Beirut | LB |
| Houston | Houston | US |
| Dallas | Dallas | US |
| Austin | Austin | US |
| Los Angeles | Los Angeles | US |
| San Francisco | San Francisco | US |

**Resolution:** rawCity → lowercase → trim → lookup in CITY_MAP → fallback = raw string

## Priority Chain

1. **URL parameters** (highest priority)
2. **Geo detection** (from `LocationContext`)
3. **Jeddah, Saudi Arabia** (hardcoded default fallback)

## Timing

- Country set immediately
- Governorate set after 50ms setTimeout
- City set after additional 50ms (nested)
- City without governorate: set after 100ms
- Parameters read once on mount (`useMemo([], [])`) — never re-read

## Analytics

Fires once per session:
- **Action:** `landing_entry` (if URL params present) or `organic_visit` (if no params)
- **Endpoint:** `POST /api/analytics/track`
- **Body:** `{ action, city, region, country, source, sessionId, deviceType, metadata: { category, utmSource, utmCampaign, utmMedium, urlParams, referrer } }`
- **Device detection:** `/Mobi|Android/i` → mobile, else desktop

## SmartLandingBanner Configurations

| Category | Icon | Gradient | CTA Target | Phone | Stars |
|---|---|---|---|---|---|
| maintenance | Wrench | #1e3a5f→#2563EB | /services | +966-12-XXX-XXXX | 5 |
| apartment | Building2 | #1e3a5f→#2563EB | /properties?category=apartment | — | — |
| villa | Home | #1e3a5f→#7c3aed | /properties?category=villa | — | — |
| land | MapPin | #14532d→#15803d | /properties?category=land | — | — |
| commercial | Building2 | #1c1917→#292524 | /properties?category=commercial | — | — |
| office | Building2 | #1e3a5f→#1d4ed8 | /properties?category=office | — | — |
| rent | Home | #1e3a5f→#0369a1 | /properties?type=rent | — | — |
| sale | Star | #1e3a5f→#7c2d12 | /properties?type=sale | — | — |

**Note:** `chalet` and `warehouse` categories are recognized by useSmartLanding but have NO banner configuration — they will show no banner.

## Banner Behavior

- Returns `null` if category not in BANNER_CONFIGS
- Dismissible (session-only `useState(false)`)
- Shows city label appended: "في جدة" / "in Jeddah"
- Bilingual: all text has AR + EN variants
- Phone button strips non-digits for `tel:` href
- Stars row only shown if `config.stars` truthy (only maintenance)

## Product Idea

Smart Landing enables **targeted marketing campaigns**. An advertiser can create a URL like:

```
https://akarpromax.com/?cat=maintenance&city=جدة&source=google_ads
```

When a user clicks this link:
1. Their city is set to Jeddah
2. Their category is set to maintenance
3. They see a banner saying "خدمات صيانة في جدة" with CTA to /services
4. An analytics event is logged with the campaign source

This creates a **closed-loop ad campaign**: Ad → Landing → Personalized CTA → Service page → Conversion.
