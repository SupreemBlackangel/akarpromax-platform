# Services Data Model

## Entity Relationship Diagram

```
┌─────────────────┐       ┌──────────────────┐       ┌─────────────────┐
│  Service        │       │  Service         │       │  Service        │
│  Category       │◄──────│  Provider        │──────►│  Request        │
│                 │       │  Profile         │       │                 │
└─────────────────┘       └──────────────────┘       └────────┬────────┘
                                                               │
                    ┌──────────────────┐       ┌─────────────────┐
                    │  Service         │       │  Service        │
                    │  Offer           │◄──────│  Order          │
                    └──────────────────┘       └────────┬────────┘
                                                         │
                    ┌──────────────────┐       ┌─────────▼────────┐
                    │  Service         │       │  Service         │
                    │  Review          │       │  Dispute         │
                    └──────────────────┘       └──────────────────┘
```

## Core Tables

### service_categories
```sql
id              UUID PK
parent_id       UUID FK (self)
country_code    CHAR(2)        -- ISO 3166-1 alpha-2
code            VARCHAR(128)   -- unique per country, slug
name_ar         TEXT
name_en         TEXT
name_tr         TEXT
description_ar  TEXT
description_en  TEXT
description_tr  TEXT
icon            TEXT           -- Lucide icon name
image_url       TEXT
requires_license BOOLEAN
requires_visit   BOOLEAN
price_min        INTEGER       -- OMR * 1000 (baisa)
price_max        INTEGER
dynamic_fields   JSON          -- DynamicField[]
sort_order       INTEGER
is_active        BOOLEAN
created_at       DATETIME
updated_at       DATETIME

Indexes:
  UNIQUE (country_code, code)
  INDEX (parent_id)
```

### service_provider_profiles
```sql
id                     UUID PK
user_id                UUID UNIQUE FK (sponsor_access)
display_name_ar        TEXT
display_name_en        TEXT
bio_ar                 TEXT
bio_en                 TEXT
logo_url               TEXT
cover_url              TEXT
phone                  VARCHAR(32)
whatsapp               VARCHAR(32)
email                  VARCHAR(255)
website                TEXT
country_code           CHAR(2)
city_id                VARCHAR(100)
district_id            VARCHAR(100)
governorate            TEXT
latitude               REAL
longitude              REAL
service_radius_km      REAL DEFAULT 50
status                 VARCHAR(24)  -- draft, submitted, under_review, approved, rejected, suspended
verified_at            DATETIME
approved_at            DATETIME
suspended_at           DATETIME
rejection_reason       TEXT
rating_avg             REAL DEFAULT 0
rating_count           INTEGER DEFAULT 0
jobs_completed         INTEGER DEFAULT 0
completion_rate        REAL DEFAULT 100
response_rate          REAL DEFAULT 100
avg_response_time_min  INTEGER
licenses_text          TEXT
insurance_text         TEXT
founded_year           INTEGER
team_size              INTEGER
is_business            BOOLEAN DEFAULT FALSE
business_name          TEXT
tax_number             TEXT
commercial_registration TEXT
created_at             DATETIME
updated_at             DATETIME

Indexes:
  UNIQUE (user_id)
  INDEX (status, country_code)
```

### service_provider_categories
```sql
id                     UUID PK
provider_id            UUID FK (service_provider_profiles)
category_id            UUID FK (service_categories)
price_from             INTEGER
price_to               INTEGER
pricing_unit           VARCHAR(32)  -- hour, visit, project, fixed
min_duration_min       INTEGER
notes                  TEXT
is_active              BOOLEAN DEFAULT TRUE
created_at             DATETIME

Indexes:
  UNIQUE (provider_id, category_id)
  INDEX (category_id)
```

### service_provider_documents
```sql
id                     UUID PK
provider_id            UUID FK
type                   VARCHAR(32)  -- commercial_registration, license, insurance, id_card, other
file_name              TEXT
file_url               TEXT
file_size              INTEGER DEFAULT 0
mime_type              TEXT
notes                  TEXT
verified               BOOLEAN DEFAULT FALSE
verified_by            UUID FK (user)
verified_at            DATETIME
uploaded_by            UUID FK (user)
created_at             DATETIME

Indexes:
  INDEX (provider_id)
```

### service_provider_portfolio
```sql
id                     UUID PK
provider_id            UUID FK
category_id            UUID FK (nullable)
city_id                VARCHAR(100)
title                  TEXT
description            TEXT
image_url              TEXT
before_image_url       TEXT
after_image_url        TEXT
video_url              TEXT
year                   INTEGER
tags                   JSON          -- string[]
is_featured            BOOLEAN DEFAULT FALSE
status                 VARCHAR(16)   -- active, archived
created_at             DATETIME

Indexes:
  INDEX (provider_id)
```

### service_requests
```sql
id                     UUID PK
customer_user_id       UUID FK
category_id            UUID FK
country_code           CHAR(2)
city_id                VARCHAR(100)
district_id            VARCHAR(100) NULL
latitude               REAL NULL
longitude              REAL NULL
title                  TEXT
description            TEXT
title_key              VARCHAR(255)  -- i18n key (legacy)
description_key        VARCHAR(255)  -- i18n key (legacy)
budget_min             INTEGER NULL  -- baisa
budget_max             INTEGER NULL
currency               CHAR(3) DEFAULT 'OMR'
preferred_date         DATETIME NULL
status                 VARCHAR(32)   -- draft, published, receiving_offers, offer_selected, scheduled, in_progress, waiting_customer_confirmation, completed, cancelled, expired, disputed
urgency                VARCHAR(16)   -- urgent, asap, today, this_week, normal, flexible
preferred_period       VARCHAR(32)
needs_visit            BOOLEAN DEFAULT FALSE
access_notes           TEXT
short_address          TEXT
pricing_type           VARCHAR(16) DEFAULT 'fixed'
reference_number       VARCHAR(32)   -- SR-YYYY-NNNN
answers                JSON          -- {key, label, type, value}[]
published_at           DATETIME NULL
matched_at             DATETIME NULL
created_at             DATETIME
updated_at             DATETIME

Indexes:
  INDEX (category_id, country_code, city_id, status)
  INDEX (customer_user_id)
```

### service_request_answers
```sql
id                     UUID PK
request_id             UUID FK
field_key              VARCHAR(64)
field_label            TEXT
field_type             VARCHAR(24)
value                  TEXT
created_at             DATETIME

Indexes:
  INDEX (request_id)
```

### service_request_attachments
```sql
id                     UUID PK
request_id             UUID FK
file_name              TEXT
file_url               TEXT
file_size              INTEGER DEFAULT 0
mime_type              TEXT
uploaded_by            UUID FK
created_at             DATETIME

Indexes:
  INDEX (request_id)
```

### service_request_matches
```sql
id                     UUID PK
request_id             UUID FK
provider_id            UUID FK (service_provider_profiles)
score                  INTEGER DEFAULT 0
distance_km            REAL NULL
category_match         BOOLEAN DEFAULT FALSE
rating_bonus           INTEGER DEFAULT 0
urgency_bonus          INTEGER DEFAULT 0
budget_fit             BOOLEAN DEFAULT FALSE
is_contacted           BOOLEAN DEFAULT FALSE
contacted_at           DATETIME NULL
provider_ignored       BOOLEAN DEFAULT FALSE
created_at             DATETIME

Indexes:
  UNIQUE (request_id, provider_id)
  INDEX (request_id, score DESC)
```

### service_request_status_history
```sql
id                     UUID PK
request_id             UUID FK
from_status            VARCHAR(32) NULL
to_status              VARCHAR(32)
note                   TEXT
changed_by             UUID FK NULL
created_at             DATETIME

Indexes:
  INDEX (request_id, created_at)
```

### service_offers
```sql
id                     UUID PK
request_id             UUID FK
provider_user_id       UUID FK
listing_id             UUID FK NULL
price                  INTEGER DEFAULT 0
currency               CHAR(3) DEFAULT 'OMR'
duration_days          INTEGER NULL
message_key            VARCHAR(255) NULL
status                 VARCHAR(32)   -- sent, withdrawn, accepted, rejected, revised, expired
materials_included     BOOLEAN DEFAULT FALSE
material_cost          INTEGER NULL
labor_cost             INTEGER NULL
visit_fee              INTEGER NULL
tax_amount             INTEGER NULL
total_price            INTEGER DEFAULT 0
duration_text          VARCHAR(64) NULL
nearest_date           DATETIME NULL
offer_notes            TEXT NULL
terms                  TEXT NULL
valid_until            DATETIME NULL
needs_visit            BOOLEAN DEFAULT FALSE
created_at             DATETIME
updated_at             DATETIME

Indexes:
  INDEX (request_id)
  INDEX (provider_user_id)
  UNIQUE (request_id, provider_user_id) WHERE status != 'withdrawn'
```

### service_offer_revisions
```sql
id                     UUID PK
offer_id               UUID FK
revision_number        INTEGER DEFAULT 1
request_id             UUID FK
provider_user_id       UUID FK
price                  INTEGER
currency               CHAR(3) DEFAULT 'OMR'
total_price            INTEGER
duration_text          VARCHAR(64)
material_cost          INTEGER NULL
labor_cost             INTEGER NULL
visit_fee              INTEGER NULL
tax_amount             INTEGER NULL
materials_included     BOOLEAN
nearest_date           DATETIME NULL
offer_notes            TEXT
terms                  TEXT
needs_visit            BOOLEAN
reason                 TEXT
created_by             UUID FK NULL
created_at             DATETIME

Indexes:
  INDEX (offer_id)
```

### service_orders
```sql
id                     UUID PK
request_id             UUID FK
offer_id               UUID FK
customer_user_id       UUID FK
provider_user_id       UUID FK
price                  INTEGER
currency               CHAR(3) DEFAULT 'OMR'
status                 VARCHAR(32)   -- created, accepted, scheduled, in_progress, waiting_customer_confirmation, delivered, completed, cancelled, disputed
accepted_at            DATETIME NULL
started_at             DATETIME NULL
completed_at           DATETIME NULL
cancelled_at           DATETIME NULL
created_at             DATETIME
updated_at             DATETIME

Indexes:
  INDEX (request_id)
  INDEX (customer_user_id, provider_user_id)
```

### service_messages
```sql
id                     UUID PK
thread_type            VARCHAR(16)  -- request, order
thread_id              UUID
sender_user_id         UUID FK
body                   TEXT
is_system              BOOLEAN DEFAULT FALSE
is_read                BOOLEAN DEFAULT FALSE
read_at                DATETIME NULL
created_at             DATETIME

Indexes:
  INDEX (thread_type, thread_id, created_at)
  INDEX (sender_user_id)
```

### service_reviews
```sql
id                     UUID PK
order_id               UUID FK
reviewer_user_id       UUID FK
reviewee_user_id       UUID FK
rating                 INTEGER      -- 1-5
comment                TEXT NULL
quality_rating         INTEGER NULL
punctuality_rating     INTEGER NULL
communication_rating   INTEGER NULL
value_rating           INTEGER NULL
recommend              BOOLEAN NULL
is_hidden              BOOLEAN DEFAULT FALSE
hidden_reason          TEXT NULL
created_at             DATETIME

Indexes:
  UNIQUE (order_id, reviewer_user_id)
  INDEX (reviewee_user_id)
```

### service_disputes
```sql
id                     UUID PK
order_id               UUID FK
opened_by_user_id      UUID FK
reason                 VARCHAR(64)
description            TEXT NULL
status                 VARCHAR(32)   -- open, in_review, waiting_customer, waiting_provider, resolved, rejected, closed
resolution_note        TEXT NULL
opened_at              DATETIME
resolved_at            DATETIME NULL
created_at             DATETIME
updated_at             DATETIME

Indexes:
  INDEX (order_id)
  INDEX (status)
```

### service_reports
```sql
id                     UUID PK
target_type            VARCHAR(32)  -- review, listing, request, offer, provider, order
target_id              UUID
reporter_user_id       UUID FK
reason                 VARCHAR(64)
description            TEXT NULL
status                 VARCHAR(24)   -- open, in_review, resolved
resolution_note        TEXT NULL
resolved_by            UUID FK NULL
resolved_at            DATETIME NULL
created_at             DATETIME
updated_at             DATETIME

Indexes:
  INDEX (target_type, target_id)
  INDEX (status)
```

### service_notifications
```sql
id                     UUID PK
user_id                UUID FK
type                   VARCHAR(48)  -- SERVICE_REQUEST_MATCHED, SERVICE_OFFER_RECEIVED, etc.
title                  TEXT NULL
body                   TEXT NULL
link                   TEXT NULL
entity_type            VARCHAR(32) NULL
entity_id              UUID NULL
is_read                BOOLEAN DEFAULT FALSE
read_at                DATETIME NULL
created_at             DATETIME

Indexes:
  INDEX (user_id, is_read, created_at DESC)
```

### service_outbox_events
```sql
id                     UUID PK
event_type             VARCHAR(64)
payload                JSON
status                 VARCHAR(24)  -- pending, processed, failed
attempts               INTEGER DEFAULT 0
error                  TEXT NULL
created_at             DATETIME
processed_at           DATETIME NULL

Indexes:
  INDEX (status, created_at)
```

### service_bookmarks
```sql
id                     UUID PK
user_id                UUID FK
listing_id             UUID FK
created_at             DATETIME

Indexes:
  UNIQUE (user_id, listing_id)
```

### service_job_timeline
```sql
id                     UUID PK
order_id               UUID FK
event                  VARCHAR(64)
actor_user_id          UUID FK NULL
from_status            VARCHAR(32) NULL
to_status              VARCHAR(32) NULL
note                   TEXT NULL
created_at             DATETIME

Indexes:
  INDEX (order_id, created_at)
```

## Status Enumerations

### RequestStatus
```
DRAFT → PUBLISHED → RECEIVING_OFFERS → OFFER_SELECTED → SCHEDULED → IN_PROGRESS → WAITING_CUSTOMER_CONFIRMATION → COMPLETED
                    ↘ CANCELLED        ↘ CANCELLED     ↘ CANCELLED      ↘ CANCELLED       ↘ DISPUTED → COMPLETED
                    ↘ EXPIRED
```

### OfferStatus
```
SENT → ACCEPTED
   ↘ WITHDRAWN
   ↘ REJECTED
   ↘ REVISED → (back to SENT)
   ↘ EXPIRED
```

### OrderStatus
```
CREATED → ACCEPTED → SCHEDULED → IN_PROGRESS → WAITING_CUSTOMER_CONFIRMATION → COMPLETED
                    ↘ CANCELLED     ↘ CANCELLED      ↘ CANCELLED          ↘ CANCELLED
                              ↘ DISPUTED → COMPLETED
                              ↘ DELIVERED → COMPLETED
```

### ProviderStatus
```
DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED → SUSPENDED
               ↘ REJECTED → (can resubmit)
```

### DisputeStatus
```
OPEN → UNDER_REVIEW → WAITING_CUSTOMER → RESOLVED → CLOSED
       ↘ WAITING_PROVIDER → RESOLVED
       ↘ REJECTED → CLOSED
```

## Key Relationships

1. **Category → Provider**: Many-to-Many via `service_provider_categories`
2. **Category → Request**: One-to-Many
3. **Category → Listing**: One-to-Many
4. **Provider → Request**: Many-to-Many via `service_request_matches`
5. **Request → Offer**: One-to-Many (unique provider per request)
6. **Request → Order**: One-to-One (via accepted offer)
7. **Offer → Order**: One-to-One
8. **Order → Review**: One-to-Many (one per participant)
9. **Order → Dispute**: One-to-One
10. **Order → Timeline**: One-to-Many
11. **Order → Messages**: One-to-Many (thread_type='order')
12. **Request → Messages**: One-to-Many (thread_type='request')
13. **Request → Answers**: One-to-Many
14. **Request → Attachments**: One-to-Many
15. **Request → History**: One-to-Many
16. **Offer → Revisions**: One-to-Many
17. **Provider → Categories**: One-to-Many
18. **Provider → Documents**: One-to-Many
19. **Provider → Portfolio**: One-to-Many
20. **User → Notifications**: One-to-Many

## Denormalized Fields (for performance)

- `service_provider_profiles.rating_avg`, `rating_count`, `jobs_completed`, `completion_rate`, `response_rate`
- `service_requests.reference_number` (human-readable SR-YYYY-NNNN)
- `service_offers.total_price` (computed: price + material + visit + tax)
- `service_orders` denormalized from offer + request
- `service_provider_profiles.is_business`, `business_name`, `tax_number`, `commercial_registration`

## Soft Deletes
- `service_reviews.is_hidden` + `hidden_reason`
- `service_provider_categories.is_active`
- `service_provider_documents.verified`
- `service_provider_portfolio.status` ('active'|'archived')
- `service_orders.cancelled_at` (not hard delete)
- `service_disputes.resolved_at` (not hard delete)

## Audit Trail
All state changes logged via `writeAudit()` to `audit_logs` table with:
- `action` (e.g., "service_request.create", "service_offer.create")
- `entity_type`, `entity_id`
- `metadata` (JSON with context)
- `actor_user_id`, `ip_address`
- `created_at`