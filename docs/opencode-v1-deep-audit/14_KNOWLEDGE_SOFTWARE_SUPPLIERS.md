# 14_KNOWLEDGE_SOFTWARE_SUPPLIERS.md
# Knowledge, Software & Suppliers Audit

**Audit Date:** 2026-08-19  
**Mode:** READ-ONLY

---

## 1. V1 Software System

### 1.1 Database Schema

#### Software Products Table
```sql
CREATE TABLE software_products (
  id UUID PRIMARY KEY,
  name VARCHAR(255),
  nameAr VARCHAR(255),
  description TEXT,
  descriptionAr TEXT,
  category VARCHAR(100),
  version VARCHAR(50),
  fileUrl VARCHAR(500),
  imageUrl VARCHAR(500),
  downloadCount INTEGER DEFAULT 0,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);
```

**Source:** `prisma/schema.prisma` `software_products` model (inferred)

#### Licenses Table
```sql
CREATE TABLE software_licenses (
  id UUID PRIMARY KEY,
  key VARCHAR(255) UNIQUE,
  status VARCHAR(50),
  type VARCHAR(50),
  hwid VARCHAR(255),
  expiresAt TIMESTAMP,
  userId UUID REFERENCES users(id),
  createdAt TIMESTAMP DEFAULT NOW()
);
```

**Source:** `prisma/schema.prisma` `software_licenses` model

#### License Codes Table
```sql
CREATE TABLE license_codes (
  id UUID PRIMARY KEY,
  code VARCHAR(255) UNIQUE,
  duration INTEGER,
  plan VARCHAR(50),
  status VARCHAR(50),
  usedById UUID REFERENCES users(id),
  createdAt TIMESTAMP DEFAULT NOW()
);
```

**Source:** `prisma/schema.prisma` `license_codes` model

#### Desktop Versions Table
```sql
CREATE TABLE desktop_versions (
  id UUID PRIMARY KEY,
  version VARCHAR(50),
  minVersion VARCHAR(50),
  forceUpdate BOOLEAN DEFAULT false,
  downloadUrl VARCHAR(500),
  releaseNotes TEXT,
  createdAt TIMESTAMP DEFAULT NOW()
);
```

**Source:** `prisma/schema.prisma` `desktop_versions` model

### 1.2 API Endpoints

| Endpoint | Method | Auth | Purpose |
|---|---|---|---|
| `/api/licenses` | POST | Auth | Create license |
| `/api/licenses/validate` | POST | Auth | Validate license key |
| `/api/licenses/redeem` | POST | Auth | Redeem license code |
| `/api/licenses` | GET | Admin | List licenses |

**Source:** `server/api/src/routes/licenses.ts`

### 1.3 Features

| Feature | Implementation | Evidence |
|---|---|---|
| License creation | Authenticated | `api/licenses.ts` |
| License validation | HWID-bound | `software_licenses` table |
| License redemption | Code-based | `license_codes` table |
| HWID binding | Hardware ID | `software_licenses.hwid` |
| HWID reset | Admin function | `api/desktop.ts` |
| Free trial | 30-day trial | `api/desktop.ts` |
| Version management | Desktop versions | `desktop_versions` table |
| Force update | Mandatory update | `desktop_versions.forceUpdate` |

---

## 2. V1 Supplier System

### 2.1 Database Schema

#### Suppliers Table
```sql
CREATE TABLE suppliers (
  id UUID PRIMARY KEY,
  name VARCHAR(255),
  nameAr VARCHAR(255),
  category VARCHAR(100),
  city VARCHAR(100),
  phone VARCHAR(50),
  email VARCHAR(255),
  rating DECIMAL DEFAULT 0,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);
```

**Source:** `prisma/schema.prisma` `suppliers` model

#### Supplier Products Table
```sql
CREATE TABLE supplier_products (
  id UUID PRIMARY KEY,
  supplierId UUID REFERENCES suppliers(id),
  name VARCHAR(255),
  nameAr VARCHAR(255),
  price DECIMAL,
  currency VARCHAR(10),
  imageUrl VARCHAR(500),
  createdAt TIMESTAMP DEFAULT NOW()
);
```

**Source:** `prisma/schema.prisma` `supplier_products` model

### 2.2 API Endpoints

| Endpoint | Method | Auth | Purpose |
|---|---|---|---|
| `/api/suppliers` | GET | Public | List suppliers |
| `/api/suppliers/:id` | GET | Public | Supplier detail |
| `/api/suppliers` | POST | Auth | Create supplier |
| `/api/suppliers/:id` | PUT | Auth | Update supplier |

**Source:** `server/api/src/routes/suppliers.ts`

### 2.3 Features

| Feature | Implementation | Evidence |
|---|---|---|
| Supplier CRUD | Full CRUD | `api/suppliers.ts` |
| Supplier products | Product listing | `supplier_products` table |
| Category filtering | By category | `Suppliers.tsx` |
| City filtering | By city | `Suppliers.tsx` |
| Rating system | Supplier rating | `suppliers.rating` |

---

## 3. V1 Blog System

### 3.1 Database Schema

#### Blog Posts Table
```sql
CREATE TABLE blog_posts (
  id UUID PRIMARY KEY,
  title VARCHAR(255),
  titleAr VARCHAR(255),
  content TEXT,
  contentAr TEXT,
  category VARCHAR(100),
  slug VARCHAR(255) UNIQUE,
  authorId UUID REFERENCES users(id),
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);
```

**Source:** `prisma/schema.prisma` `blog_posts` model

### 3.2 API Endpoints

| Endpoint | Method | Auth | Purpose |
|---|---|---|---|
| `/api/blog` | GET | Public | List posts |
| `/api/blog/:id` | GET | Public | Single post |
| `/api/blog` | POST | Auth | Create post |
| `/api/blog/:id` | PUT | Auth | Update post |
| `/api/blog/:id` | DELETE | Auth/Admin | Delete post |

**Source:** `server/api/src/routes/blog.ts`

### 3.3 Features

| Feature | Implementation | Evidence |
|---|---|---|
| Blog CRUD | Full CRUD | `api/blog.ts` |
| Categories | Post categories | `Blog.tsx` |
| Slug URLs | SEO-friendly | `blog_posts.slug` |
| Bilingual | Arabic/English | `blog_posts.titleAr` |
| Author tracking | Author reference | `blog_posts.authorId` |

---

## 4. V1 Free Resources

### 4.1 Database Schema

#### Free Resources Table
```sql
CREATE TABLE free_resources (
  id UUID PRIMARY KEY,
  title VARCHAR(255),
  titleAr VARCHAR(255),
  description TEXT,
  descriptionAr TEXT,
  fileUrl VARCHAR(500),
  category VARCHAR(100),
  downloadCount INTEGER DEFAULT 0,
  createdAt TIMESTAMP DEFAULT NOW()
);
```

**Source:** `prisma/schema.prisma` `free_resources` model

### 4.2 Features

| Feature | Implementation | Evidence |
|---|---|---|
| Resource listing | Public | `FreeResources.tsx` |
| Download tracking | Counter | `free_resources.downloadCount` |
| Categories | Resource categories | `FreeResources.tsx` |

---

## 5. V2.0 Knowledge System

### 5.1 Database Schema

V2.0 has knowledge via content runtime:

```sql
CREATE TABLE knowledge_items (
  id UUID PRIMARY KEY,
  title VARCHAR(255),
  title_ar VARCHAR(255),
  description TEXT,
  description_ar TEXT,
  type VARCHAR(50), -- book/software/resource
  category VARCHAR(100),
  file_url VARCHAR(500),
  image_url VARCHAR(500),
  download_count INTEGER DEFAULT 0,
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Source:** `lib/content-schema.ts`

### 5.2 API Endpoints

| Endpoint | Method | Auth | Purpose |
|---|---|---|---|
| `/api/knowledge` | GET | Public | List items |
| `/api/knowledge/[id]` | GET | Public | Item detail |
| `/api/knowledge` | POST | Auth | Create item |
| `/api/knowledge/[id]` | PATCH | Auth | Update item |

**Source:** `app/api/knowledge/`

### 5.3 Features

| Feature | Implementation | Evidence |
|---|---|---|
| Knowledge CRUD | Full CRUD | `api/knowledge/` |
| Type filtering | Book/Software/Resource | `knowledge_items.type` |
| Category filtering | By category | `knowledge_items.category` |
| Download tracking | Counter | `knowledge_items.download_count` |

---

## 6. Critical Differences

### 6.1 V1 Had Separate Software/Licensing

V1 had:
- Software products table
- License management
- HWID binding
- License codes
- Version management

### 6.2 V2.0 Unified in Knowledge

V2.0 unified software into knowledge base without licensing.

### 6.3 V1 Had Supplier Directory

V1 had a full supplier directory with:
- Supplier CRUD
- Product listing
- Rating system

### 6.4 V2.0 Lacks Supplier Directory

V2.0 has no supplier directory.

### 6.5 V1 Had Blog System

V1 had a full blog system with:
- CRUD operations
- Categories
- Slug URLs
- Bilingual content

### 6.6 V2.0 Lacks Blog System

V2.0 has no blog system.

---

## 7. Recommended Architecture

### 7.1 Knowledge Types

| Type | Description |
|---|---|
| BOOK | PDF/EPUB books |
| SOFTWARE | Desktop software with licensing |
| RESOURCE | Free downloadable resources |
| ARTICLE | Blog articles |

### 7.2 Software Licensing

| Feature | Description |
|---|---|
| License key | Unique key per license |
| HWID binding | Hardware ID binding |
| Expiration | License expiry date |
| Activation codes | Redemption codes |
| Version tracking | Software versions |

### 7.3 Supplier Categories

| Category | Description |
|---|---|
| Materials | Building materials |
| Equipment | Construction equipment |
| Tools | Hand/power tools |
| Finishes | Finishing materials |
| MEP | Mechanical/Electrical/Plumbing |

---

## 8. V1 Features Missing in V2.0

| Feature | V1 Status | V2.0 Status | Gap |
|---|---|---|---|
| Software licensing | FULL | MISSING | MEDIUM |
| HWID binding | FULL | MISSING | MEDIUM |
| License codes | FULL | MISSING | MEDIUM |
| Version management | FULL | MISSING | LOW |
| Supplier directory | FULL | MISSING | MEDIUM |
| Supplier products | FULL | MISSING | MEDIUM |
| Blog system | FULL | MISSING | MEDIUM |
| Free resources | FULL | FULL | NONE |

---

**Status:** COMPLETE  
**Application Source Files Modified:** ZERO
