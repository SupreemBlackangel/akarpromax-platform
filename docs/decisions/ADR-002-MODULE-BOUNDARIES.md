# ADR-002: Module Boundaries

Generated: 2026-08-05
Updated: 2026-08-05
Status: ACCEPTED

## Context

AkarProMax consists of 10 core domains that must interact without creating
tight coupling. Clear module boundaries prevent:
- Circular dependencies
- Spaghetti code
- Difficult testing
- Hard deployment
- Scaling challenges

## Decision

Each core domain is a self-contained module with:
1. Public API (what others can use)
2. Private implementation (internal logic)
3. Database schema (owned tables)
4. Service layer (business logic)

## Module Dependency Hierarchy

```
Identity (الهوية)
    ↓
Properties (العقارات)
    ↓
Auctions (المزادات)
    ↓
Services (الخدمات)
    ↓
Organizations (المنظمات)
    ↓
Community (المجتمع)
    ↓
Knowledge (المعرفة)
    ↓
Advertisements (الإعلانات)
    ↓
Notifications (الإشعارات)
    ↓
Office Integration (التكامل المكتبي)
```

### Dependency Rules

1. **Downward Only** — Modules can only depend on modules above them
2. **No Circular** — Never create circular dependencies
3. **Event-Driven** — Use events for upward communication
4. **API Boundaries** — Use public APIs, not internal implementations
5. **No Cross-Module DB Access** — Never access another module's database tables directly

## Violations (الانتهاكات)

### ❌ WRONG: Cross-Module Database Access

```typescript
// Inside Auctions Module
db.properties.update(...)  // ❌ VIOLATION: Auctions accessing Properties DB
```

**Why it's wrong:**
- Auctions module owns `auctions` table, NOT `properties` table
- Creates tight coupling between modules
- Makes testing difficult
- Breaks data ownership

**Correct approach:**
```typescript
// Inside Auctions Module
// ✅ CORRECT: Use Properties Module API
const property = await propertiesModule.getById(propertyId);
await auctionsModule.create({ propertyId, startingPrice });
```

### ❌ WRONG: Direct Import Between Modules

```typescript
// Inside Auctions Module
import { PropertyService } from "@/modules/properties/service";  // ❌ VIOLATION
```

**Correct approach:**
```typescript
// Inside Auctions Module
// ✅ CORRECT: Use shared contract or API
interface PropertyContract {
  getById(id: string): Promise<Property>;
}
```

### ❌ WRONG: Circular Dependency

```
Properties → Auctions → Properties  ❌ VIOLATION
```

**Correct approach:**
```
Properties → Events → Auctions  ✅ CORRECT
```

### ❌ WRONG: Shared Database Table

```typescript
// Multiple modules writing to same table
// Properties Module: INSERT INTO property_images ...
// Admin Module: DELETE FROM property_images ...  ❌ VIOLATION
```

**Correct approach:**
```
// ✅ CORRECT: Single owner (Properties Module)
// Properties Module: owns property_images table
// Admin Module: calls Properties API to manage images
```

## Module Details

### 1. Identity (الهوية) — Foundation

**Purpose:** User authentication, authorization, and profile management

| Component | Description |
|-----------|-------------|
| Schema | users, roles, permissions, sessions, otp, email_verifications |
| API | /api/auth/*, /api/users/* |
| Events | user:created, user:updated, user:deleted |

**Depended on by:** ALL modules

**Owned Tables:**

| Table | Description |
|-------|-------------|
| users | User accounts and profiles |
| roles | User roles (admin, sponsor, user) |
| permissions | Role-based permissions |
| sessions | Active user sessions |
| otp | One-time passwords for verification |
| email_verifications | Email verification tokens |

```typescript
interface IdentityModule {
  // Core
  authenticate(credentials: Credentials): Promise<Session>;
  authorize(session: Session, permission: string): Promise<boolean>;
  getUser(id: ID): Promise<User>;
  
  // Events
  on("user:created", handler: UserCreatedHandler);
  on("user:updated", handler: UserUpdatedHandler);
  on("user:deleted", handler: UserDeletedHandler);
}
```

---

### 2. Properties (العقارات)

**Purpose:** Property listings, search, and management

| Component | Description |
|-----------|-------------|
| Schema | properties, property_images, property_features, property_status_history, property_documents |
| API | /api/properties/* |
| Events | property:created, property:updated, property:deleted |

**Depends on:** Identity

**Owned Tables:**

| Table | Description |
|-------|-------------|
| properties | Property listings |
| property_images | Property photos and gallery |
| property_features | Property amenities and features |
| property_status_history | Status change audit trail |
| property_documents | Property documents (deeds, contracts) |

```typescript
interface PropertiesModule {
  // Core
  getById(id: ID): Promise<Property>;
  search(filters: PropertyFilters): Promise<Property[]>;
  create(data: CreatePropertyInput): Promise<Property>;
  update(id: ID, data: UpdatePropertyInput): Promise<Property>;
  delete(id: ID): Promise<void>;
  
  // Events
  on("property:created", handler: PropertyCreatedHandler);
  on("property:updated", handler: PropertyUpdatedHandler);
  on("property:deleted", handler: PropertyDeletedHandler);
}
```

---

### 3. Auctions (المزادات)

**Purpose:** Property auctions and bidding system

| Component | Description |
|-----------|-------------|
| Schema | auctions, bids, proxy_bids, auction_consents, auction_events |
| API | /api/auctions/* |
| Events | auction:started, auction:bid, auction:ended |

**Depends on:** Properties, Identity

**Owned Tables:**

| Table | Description |
|-------|-------------|
| auctions | Auction listings |
| bids | User bids |
| proxy_bids | Automated bidding rules |
| auction_consents | Participant agreements |
| auction_events | Auction activity log |

```typescript
interface AuctionsModule {
  // Core
  getById(id: ID): Promise<Auction>;
  create(data: CreateAuctionInput): Promise<Auction>;
  placeBid(auctionId: ID, amount: Money): Promise<Bid>;
  end(auctionId: ID): Promise<AuctionResult>;
  
  // Events
  on("auction:started", handler: AuctionStartedHandler);
  on("auction:bid", handler: AuctionBidHandler);
  on("auction:ended", handler: AuctionEndedHandler);
}
```

---

### 4. Services (الخدمات)

**Purpose:** Services marketplace connecting providers and consumers

| Component | Description |
|-----------|-------------|
| Schema | service_listings, service_requests, orders, reviews |
| API | /api/services/* |
| Events | service:requested, service:offered, service:ordered |

**Depends on:** Identity

```typescript
interface ServicesModule {
  // Core
  getListings(filters: ServiceFilters): Promise<ServiceListing[]>;
  createRequest(data: CreateRequestInput): Promise<ServiceRequest>;
  createOffer(data: CreateOfferInput): Promise<ServiceOffer>;
  createOrder(data: CreateOrderInput): Promise<ServiceOrder>;
  
  // Events
  on("service:requested", handler: ServiceRequestedHandler);
  on("service:offered", handler: ServiceOfferedHandler);
  on("service:ordered", handler: ServiceOrderedHandler);
}
```

---

### 5. Organizations (المنظمات)

**Purpose:** Company profiles, branches, and team management

| Component | Description |
|-----------|-------------|
| Schema | organizations, branches, organization_members |
| API | /api/organizations/* |
| Events | organization:created, organization:updated |

**Depends on:** Identity

```typescript
interface OrganizationsModule {
  // Core
  getById(id: ID): Promise<Organization>;
  create(data: CreateOrganizationInput): Promise<Organization>;
  update(id: ID, data: UpdateOrganizationInput): Promise<Organization>;
  addMember(orgId: ID, userId: ID, role: string): Promise<void>;
  
  // Events
  on("organization:created", handler: OrganizationCreatedHandler);
  on("organization:updated", handler: OrganizationUpdatedHandler);
}
```

---

### 6. Community (المجتمع)

**Purpose:** Forum, discussions, and user interactions

| Component | Description |
|-----------|-------------|
| Schema | forum_topics, forum_posts, forum_reactions |
| API | /api/forum/* |
| Events | post:created, post:replied, post:reported |

**Depends on:** Identity

```typescript
interface CommunityModule {
  // Core
  getTopics(filters: TopicFilters): Promise<Topic[]>;
  createTopic(data: CreateTopicInput): Promise<Topic>;
  createPost(data: CreatePostInput): Promise<Post>;
  react(postId: ID, reaction: string): Promise<void>;
  
  // Events
  on("post:created", handler: PostCreatedHandler);
  on("post:replied", handler: PostRepliedHandler);
  on("post:reported", handler: PostReportedHandler);
}
```

---

### 7. Knowledge (المعرفة)

**Purpose:** Articles, documentation, and educational content

| Component | Description |
|-----------|-------------|
| Schema | articles, categories, article_views |
| API | /api/knowledge/* |
| Events | article:published, article:updated |

**Depends on:** Identity (for author tracking)

```typescript
interface KnowledgeModule {
  // Core
  getById(id: ID): Promise<Article>;
  search(query: string): Promise<Article[]>;
  create(data: CreateArticleInput): Promise<Article>;
  update(id: ID, data: UpdateArticleInput): Promise<Article>;
  
  // Events
  on("article:published", handler: ArticlePublishedHandler);
  on("article:updated", handler: ArticleUpdatedHandler);
}
```

---

### 8. Advertisements (الإعلانات)

**Purpose:** Ad creation, targeting, and delivery

| Component | Description |
|-----------|-------------|
| Schema | campaigns, placements, creatives, impressions, clicks |
| API | /api/ads/*, /api/admin/ads/* |
| Events | ad:impression, ad:click, ad:conversion |

**Depends on:** Properties, Services, Organizations, Identity

**Owned Tables:**

| Table | Description |
|-------|-------------|
| campaigns | Ad campaigns |
| placements | Ad placement rules |
| creatives | Ad creative assets |
| impressions | Impression tracking |
| clicks | Click tracking |

```typescript
interface AdvertisementsModule {
  // Core
  getActiveAds(context: AdContext): Promise<Ad[]>;
  create(data: CreateAdInput): Promise<Ad>;
  trackImpression(adId: ID, context: AdContext): Promise<void>;
  trackClick(adId: ID, context: AdContext): Promise<void>;
  
  // Events
  on("ad:impression", handler: AdImpressionHandler);
  on("ad:click", handler: AdClickHandler);
  on("ad:conversion", handler: AdConversionHandler);
}
```

---

### 9. Notifications (الإشعارات)

**Purpose:** Push notifications, emails, and in-app alerts

| Component | Description |
|-----------|-------------|
| Schema | notification_templates, notification_queue, delivery_logs, user_notification_preferences |
| API | /api/notifications/* |
| Events | notification:sent, notification:read |

**Depends on:** Identity (recipient)

**Owned Tables:**

| Table | Description |
|-------|-------------|
| notification_templates | Message templates |
| notification_queue | Pending notifications |
| delivery_logs | Delivery status tracking |
| user_notification_preferences | User notification settings |

```typescript
interface NotificationsModule {
  // Core
  send(notification: CreateNotificationInput): Promise<void>;
  getForUser(userId: ID): Promise<Notification[]>;
  markAsRead(notificationId: ID): Promise<void>;
  preferences(userId: ID): Promise<NotificationPreferences>;
  
  // Events
  on("notification:sent", handler: NotificationSentHandler);
  on("notification:read", handler: NotificationReadHandler);
}
```

---

### 10. Office Integration (التكامل المكتبي)

**Purpose:** Desktop app sync, offline support, and document generation

| Component | Description |
|-----------|-------------|
| Schema | office_sync, offline_data, documents |
| API | /api/office/* |
| Events | sync:started, sync:completed, document:generated |

**Depends on:** ALL modules (reads data from all)

```typescript
interface OfficeIntegrationModule {
  // Core
  syncData(userId: ID): Promise<SyncResult>;
  generateDocument(type: string, data: unknown): Promise<Document>;
  getOfflineData(userId: ID): Promise<OfflineData>;
  
  // Events
  on("sync:started", handler: SyncStartedHandler);
  on("sync:completed", handler: SyncCompletedHandler);
  on("document:generated", handler: DocumentGeneratedHandler);
}
```

## Event Bus

All inter-module communication goes through the event bus:

```typescript
// Event Bus Interface
interface EventBus {
  emit<T>(event: string, data: T): void;
  on<T>(event: string, handler: (data: T) => void): void;
  off(event: string, handler: Function): void;
}

// Usage
eventBus.on("user:created", (data) => {
  // Send welcome notification
  notificationsModule.send({
    userId: data.userId,
    type: "welcome",
    message: "Welcome to AkarProMax!"
  });
});
```

## Migration Path

### Phase 1: Define Boundaries (Current)
- [x] Document module interfaces
- [x] Identify cross-module dependencies
- [ ] Plan migration strategy

### Phase 2: Extract Modules
- [ ] Move database schemas to module directories
- [ ] Create service layers
- [ ] Implement event bus

### Phase 3: Decouple
- [ ] Remove direct imports between modules
- [ ] Implement API-based communication
- [ ] Add integration tests

## Benefits

1. **Testability** — Each module can be tested in isolation
2. **Scalability** — Modules can be scaled independently
3. **Deployment** — Modules can be deployed separately
4. **Team Structure** — Teams can own specific modules
5. **Code Organization** — Clear boundaries prevent chaos

## Related ADRs

- ADR-000: Project Charter
- ADR-001: Internal Runtime Target
- (Future) ADR-003: Database Migration Strategy
- (Future) ADR-004: Event Bus Design
- (Future) ADR-005: API Gateway Design

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-08-05 | Initial ADR created | Refactoring Team |
| 2026-08-05 | Updated with dependency hierarchy | Refactoring Team |
| 2026-08-05 | Added violations section and owned tables | Refactoring Team |
