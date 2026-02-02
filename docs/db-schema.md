# Database Schema Documentation

> **Purpose:** Comprehensive database design documentation explaining the WHY behind architectural decisions, not just the WHAT.

**Database Engine:** SQLite (development) / PostgreSQL (production)  
**ORM:** Prisma 5.x  
**Migration System:** Prisma Migrate  
**Last Updated:** February 3, 2026

---

## Table of Contents

1. [Design Philosophy](#design-philosophy)
2. [Database Choice: SQLite vs PostgreSQL](#database-choice-sqlite-vs-postgresql)
3. [Tables Overview](#tables-overview)
4. [Detailed Schema](#detailed-schema)
5. [Relationships & Foreign Keys](#relationships--foreign-keys)
6. [Indexing Strategy](#indexing-strategy)
7. [Data Integrity & Constraints](#data-integrity--constraints)
8. [Migration Strategy](#migration-strategy)
9. [Connection Pooling](#connection-pooling)
10. [Security Considerations](#security-considerations)

---

## Design Philosophy

### Core Principles

**1. Relational Over Document-Based**

- **Decision:** Use relational database (PostgreSQL/SQLite) instead of NoSQL (MongoDB, DynamoDB)
- **Rationale:**
  - Strong ACID guarantees for e-commerce operations (quotes must be consistent)
  - Structured data with clear relationships (products → categories, brands)
  - Complex queries with JOINs (filter products by category + brand + specs)
  - Foreign key constraints prevent orphaned records
  - Better for reporting and analytics (product views by category/brand)

**2. Normalized Schema (3NF)**

- **Decision:** Follow Third Normal Form normalization
- **Rationale:**
  - Eliminate data redundancy (brand info stored once, referenced by products)
  - Update anomalies prevented (change brand logo once, affects all products)
  - Storage efficiency (UUID references cheaper than duplicating strings)
  - Trade-off: Requires JOINs but acceptable for < 100k products

**3. UUIDs for Primary Keys**

- **Decision:** Use UUID v4 instead of auto-increment integers
- **Rationale:**
  - **Security:** No enumeration attacks (can't guess `/products/1`, `/products/2`)
  - **Distributed systems:** Can generate IDs client-side before DB insert
  - **Merging databases:** No ID conflicts when consolidating data
  - **URL obfuscation:** Hard to guess next/previous resource
  - Trade-off: 16 bytes vs 4 bytes, but negligible for < 1M records

**4. Soft Deletes via Status Flags**

- **Decision:** Use `isActive` boolean instead of hard deletes
- **Rationale:**
  - **Audit trail:** Can see when category/brand was deactivated
  - **Recovery:** Easy to reactivate accidentally deleted items
  - **History preservation:** Old orders can still reference deleted products
  - **Analytics:** Track product lifecycle (active → inactive)
  - Quote requests use status enum (never deleted for legal/compliance)

**5. Timestamps on Every Table**

- **Decision:** `createdAt` and `updatedAt` on all entities
- **Rationale:**
  - **Audit compliance:** Track when records created/modified
  - **Debugging:** Identify when bugs introduced data issues
  - **Analytics:** Measure growth rate (products added per month)
  - **Data quality:** Find stale records (products not updated in 2 years)

---

## Database Choice: SQLite vs PostgreSQL

### SQLite (Development)

**Why SQLite for Development:**

```prisma
datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}
```

**Advantages:**

- ✅ Zero configuration (no Docker, no server process)
- ✅ Fast setup (developers can start coding immediately)
- ✅ Portable (entire DB in one file, easy to backup/share)
- ✅ Sufficient for < 100k records (typical for this app)
- ✅ Supports transactions, foreign keys, indexes
- ✅ Same Prisma queries work in production (abstraction layer)

**Limitations:**

- ❌ No concurrent writes (single-writer lock)
- ❌ No user authentication (file-based access control)
- ❌ Limited full-text search (no advanced indexing)
- ❌ Not suitable for production with multiple app instances

### PostgreSQL (Production)

**Why PostgreSQL for Production:**

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

**Advantages:**

- ✅ **Concurrent writes:** Multiple app instances can write simultaneously
- ✅ **Connection pooling:** Handle 1000+ concurrent users
- ✅ **Advanced indexing:** GIN/GiST indexes for full-text search
- ✅ **JSONB type:** Efficient storage for `keyFeatures`, `images` arrays
- ✅ **Replication:** Master-slave setup for high availability
- ✅ **Backup tools:** pg_dump, point-in-time recovery
- ✅ **Monitoring:** pg_stat_statements for query optimization

**Production Configuration:**

```env
DATABASE_URL=postgresql://user:pass@host:5432/dbname?connection_limit=10&pool_timeout=20
```

**Why Not MySQL?**

- PostgreSQL has better JSON support (JSONB vs JSON)
- PostgreSQL supports more advanced features (CTEs, window functions)
- Better full-text search (built-in vs requires external engines)
- More permissive license (PostgreSQL License vs GPL)

**Why Not NoSQL (MongoDB)?**

- No ACID guarantees (eventual consistency not acceptable for quotes)
- No foreign key constraints (application-level integrity error-prone)
- Schema flexibility not needed (our data structure is stable)
- JOINs require aggregation pipelines (complex, harder to optimize)

---

## Tables Overview

**Entity Count:** 8 tables (as of Feb 2026)

| Table            | Purpose                   | Row Estimate  | Write Frequency                 |
| ---------------- | ------------------------- | ------------- | ------------------------------- |
| **Admin**        | Authentication & RBAC     | ~10           | Rare (onboarding only)          |
| **Category**     | Product categorization    | ~20           | Rare (setup phase)              |
| **Brand**        | Product manufacturer info | ~50           | Occasional (new brands)         |
| **Product**      | Main product catalog      | ~5,000        | Daily (inventory updates)       |
| **ProductSpec**  | Product specifications    | ~50,000       | Daily (with products)           |
| **QuoteRequest** | Customer inquiries        | ~10,000/year  | High (24/7 submissions)         |
| **RefreshToken** | Auth token management     | ~1,000        | Very high (every login/refresh) |
| **AuditLog**     | Compliance & security     | ~100,000/year | High (all admin actions)        |

---

## Detailed Schema

### 1. Admin (Authentication & RBAC)

**Purpose:** Store admin user accounts with role-based access control.

| Field     | Type         | Constraints      | Description                    |
| --------- | ------------ | ---------------- | ------------------------------ |
| id        | UUID         | PRIMARY KEY      | Unique identifier              |
| email     | VARCHAR(255) | UNIQUE, NOT NULL | Admin email (login)            |
| password  | VARCHAR(255) | NOT NULL         | bcrypt hash (cost=12)          |
| name      | VARCHAR(100) | NOT NULL         | Display name                   |
| role      | ENUM         | NOT NULL         | superadmin/admin/editor/viewer |
| isActive  | BOOLEAN      | DEFAULT true     | Account status                 |
| createdAt | TIMESTAMP    | DEFAULT NOW()    | Creation timestamp             |
| updatedAt | TIMESTAMP    | DEFAULT NOW()    | Last update timestamp          |

**Indexes:**

- `email` (UNIQUE) - Fast login lookups, enforce uniqueness
- `isActive` - Filter active admins for dashboards

**Design Decisions:**

**Why bcrypt for passwords?**

- Industry standard for password hashing (vs SHA256, MD5)
- Built-in salt (prevents rainbow table attacks)
- Adaptive cost factor (can increase as hardware improves)
- Cost=12 balances security (0.3s hash time) vs UX (acceptable login delay)
- Alternative considered: Argon2 (better but bcrypt more mature ecosystem)

**Why ENUM for role?**

```prisma
enum AdminRole {
  SUPERADMIN  // Full system access + user management
  ADMIN       // Manage products, quotes, categories
  EDITOR      // Edit products, view quotes (no delete)
  VIEWER      // Read-only access (reports, dashboards)
}
```

- Type safety: Can't insert invalid roles
- Query optimization: Database knows all possible values
- UI generation: Can auto-generate role dropdowns
- Permission checking: Simple string comparison in code

**Why no lastLogin field?**

- Stored in RefreshToken table (session-based tracking)
- Separates authentication data from session data
- One admin can have multiple active sessions (different devices)

**Why isActive instead of deletedAt?**

- Simpler queries: `WHERE isActive = true` vs `WHERE deletedAt IS NULL`
- Clear semantics: Active/inactive more intuitive
- Allows future states: Could add "suspended", "locked" without schema change

---

### 2. Category (Product Classification)

**Purpose:** Organize products into hierarchical categories for navigation and filtering.

| Field        | Type         | Constraints      | Description           |
| ------------ | ------------ | ---------------- | --------------------- |
| id           | UUID         | PRIMARY KEY      | Unique identifier     |
| name         | VARCHAR(100) | UNIQUE, NOT NULL | Display name          |
| slug         | VARCHAR(100) | UNIQUE, NOT NULL | URL-friendly slug     |
| icon         | VARCHAR(255) | NULL             | Icon filename/URL     |
| description  | TEXT         | NULL             | SEO-friendly text     |
| displayOrder | INTEGER      | DEFAULT 0        | Manual sort order     |
| isActive     | BOOLEAN      | DEFAULT true     | Visibility toggle     |
| createdAt    | TIMESTAMP    | DEFAULT NOW()    | Creation timestamp    |
| updatedAt    | TIMESTAMP    | DEFAULT NOW()    | Last update timestamp |

**Indexes:**

- `slug` (UNIQUE) - Fast URL lookups (`/category/circuit-breakers`)
- `isActive, displayOrder` (COMPOSITE) - Efficiently fetch sorted active categories
- `name` - Search autocomplete for admin panel

**Design Decisions:**

**Why slug field?**

- **SEO benefit:** `/category/circuit-breakers` vs `/category/a1b2c3d4`
- **User-friendly URLs:** Readable and memorable
- **Immutable:** Slug doesn't change even if name changes (avoid broken links)
- **Unique constraint:** Prevents duplicate URLs

**Why displayOrder instead of alphabetical?**

- Business flexibility: Feature popular categories first
- Manual control: Marketing can A/B test category order
- Alternative considered: Auto-sort by product count (rejected - inconsistent UX)

**Why no parent_id (hierarchical categories)?**

- **Current scope:** Flat structure sufficient for ~20 categories
- **YAGNI principle:** Don't build features before they're needed
- **Future-proof:** Can add `parentId UUID` if nested categories required

---

### 3. Brand (Manufacturer Information)

**Purpose:** Store brand/manufacturer data for product attribution and filtering.

| Field        | Type         | Constraints      | Description            |
| ------------ | ------------ | ---------------- | ---------------------- |
| id           | UUID         | PRIMARY KEY      | Unique identifier      |
| name         | VARCHAR(100) | UNIQUE, NOT NULL | Brand name             |
| slug         | VARCHAR(100) | UNIQUE, NOT NULL | URL-friendly slug      |
| logo         | VARCHAR(255) | NULL             | Logo filename          |
| description  | TEXT         | NULL             | Brand story/info       |
| website      | VARCHAR(255) | NULL             | Official website       |
| isAuthorized | BOOLEAN      | DEFAULT true     | Authorized dealer flag |
| displayOrder | INTEGER      | DEFAULT 0        | Manual sort order      |
| isActive     | BOOLEAN      | DEFAULT true     | Visibility toggle      |
| createdAt    | TIMESTAMP    | DEFAULT NOW()    | Creation timestamp     |
| updatedAt    | TIMESTAMP    | DEFAULT NOW()    | Last update timestamp  |

**Indexes:**

- `slug` (UNIQUE) - Fast URL lookups
- `isActive, isAuthorized` (COMPOSITE) - Filter authorized active brands

**Design Decisions:**

**Why isAuthorized field?**

- **Business need:** Distinguish official dealers from gray market resellers
- **Trust indicator:** Display "Authorized Dealer" badge
- **Legal compliance:** Some manufacturers require dealer authorization disclosure

**Why separate Brand from Product?**

- **Normalization:** One brand → many products (avoid duplicate data)
- **Consistency:** Change Siemens logo once, affects all 500 products
- **Analytics:** Count products per brand, track brand performance

---

### 4. Product (Main Catalog)

**Purpose:** Core product catalog with relationships to categories and brands.

| Field        | Type         | Constraints      | Description              |
| ------------ | ------------ | ---------------- | ------------------------ |
| id           | UUID         | PRIMARY KEY      | Unique identifier        |
| name         | VARCHAR(255) | NOT NULL         | Product name             |
| slug         | VARCHAR(255) | UNIQUE, NOT NULL | URL-friendly slug        |
| model        | VARCHAR(100) | NULL             | Model/part number        |
| categoryId   | UUID         | FOREIGN KEY      | References Category.id   |
| brandId      | UUID         | FOREIGN KEY      | References Brand.id      |
| description  | TEXT         | NULL             | Rich text description    |
| keyFeatures  | JSON/TEXT    | NULL             | Array of feature strings |
| image        | VARCHAR(255) | NULL             | Main product image       |
| images       | JSON/TEXT    | NULL             | Additional images array  |
| datasheetUrl | VARCHAR(255) | NULL             | PDF specification sheet  |
| isActive     | BOOLEAN      | DEFAULT true     | Visibility toggle        |
| isFeatured   | BOOLEAN      | DEFAULT false    | Homepage/banner display  |
| createdAt    | TIMESTAMP    | DEFAULT NOW()    | Creation timestamp       |
| updatedAt    | TIMESTAMP    | DEFAULT NOW()    | Last update timestamp    |

**Indexes:**

- `slug` (UNIQUE) - Fast URL lookups
- `categoryId` - Filter by category
- `brandId` - Filter by brand
- `isActive, isFeatured` (COMPOSITE) - Homepage featured products
- `categoryId, brandId, isActive` (COMPOSITE) - Multi-filter queries

**Design Decisions:**

**Why nullable categoryId and brandId?**

- **Flexibility:** Can add products before categorizing (draft mode)
- **ON DELETE SET NULL:** If category deleted, product survives
- **Migration safety:** Can import products without all metadata

**Why keyFeatures as JSON?**

- **Read optimization:** Single query gets all features (no JOIN)
- **Flexibility:** Variable number of features per product
- **Update simplicity:** Replace entire array vs insert/delete rows

**Why isFeatured flag?**

- **Homepage control:** Marketing can manually select showcase products
- **Query performance:** `WHERE isFeatured = true LIMIT 6` (instant with index)

---

### 5. ProductSpec (Detailed Specifications)

**Purpose:** Store structured key-value specifications for filtering and comparison.

| Field        | Type         | Constraints   | Description           |
| ------------ | ------------ | ------------- | --------------------- |
| id           | UUID         | PRIMARY KEY   | Unique identifier     |
| productId    | UUID         | FOREIGN KEY   | References Product.id |
| specKey      | VARCHAR(100) | NOT NULL      | Specification name    |
| specValue    | TEXT         | NOT NULL      | Specification value   |
| displayOrder | INTEGER      | DEFAULT 0     | Sort order            |
| createdAt    | TIMESTAMP    | DEFAULT NOW() | Creation timestamp    |
| updatedAt    | TIMESTAMP    | DEFAULT NOW() | Last update timestamp |

**Unique Constraint:**

```prisma
@@unique([productId, specKey])
```

**Design Decisions:**

**Why separate table instead of JSON?**

- ✅ **Filterable:** Can query `WHERE specKey='Voltage' AND specValue='230V'`
- ✅ **Indexable:** Can create index on specKey for fast lookups
- ✅ **Sortable:** `ORDER BY displayOrder` for consistent presentation
- ✅ **Future-proof:** Can add units, data types, min/max ranges later

---

### 6. QuoteRequest (Customer Inquiries)

**Purpose:** Capture and track customer quote requests with spam prevention.

| Field          | Type         | Constraints   | Description                        |
| -------------- | ------------ | ------------- | ---------------------------------- |
| id             | UUID         | PRIMARY KEY   | Unique identifier                  |
| name           | VARCHAR(100) | NOT NULL      | Customer name                      |
| company        | VARCHAR(150) | NULL          | Company name                       |
| phone          | VARCHAR(20)  | NOT NULL      | Phone number                       |
| whatsapp       | VARCHAR(20)  | NULL          | WhatsApp number                    |
| email          | VARCHAR(255) | NOT NULL      | Email address                      |
| productName    | VARCHAR(255) | NULL          | Product/model requested            |
| quantity       | VARCHAR(50)  | NULL          | Requested quantity                 |
| projectDetails | TEXT         | NULL          | Additional details                 |
| status         | ENUM         | DEFAULT 'new' | new/contacted/quoted/closed        |
| notes          | TEXT         | NULL          | Admin notes                        |
| ipAddress      | VARCHAR(50)  | NULL          | Submitter IP                       |
| userAgent      | VARCHAR(255) | NULL          | Submitter browser                  |
| createdDay     | STRING       | NOT NULL      | YYYY-MM-DD for duplicate detection |
| createdAt      | TIMESTAMP    | DEFAULT NOW() | Submission timestamp               |
| updatedAt      | TIMESTAMP    | DEFAULT NOW() | Last update timestamp              |

**Unique Constraint:**

```prisma
@@unique([email, phone, createdDay])
```

**Design Decisions:**

**Why unique constraint on email+phone+createdDay?**

- **Duplicate prevention:** Same email+phone can't submit multiple quotes same day
- **Atomic enforcement:** Database-level constraint prevents race conditions
- **Why createdDay?** Allow daily quotes but prevent spam minutes apart

**Why store ipAddress and userAgent?**

- **Spam prevention:** Detect bot patterns
- **Fraud detection:** Identify VPN/proxy usage
- **Analytics:** Geographic distribution
- **Legal compliance:** Some jurisdictions require request metadata retention

**Why never delete quotes?**

- **Legal requirement:** Sales records must be retained
- **Customer history:** See all past interactions
- **Business intelligence:** Analyze quote-to-order conversion

---

## Relationships & Foreign Keys

### Entity-Relationship Diagram

```
Category (1) ──< (N) Product ──> (1) Brand
                     │
                     │ (1:N)
                     │
              ProductSpec (N)

Admin (1) ──< (N) RefreshToken
  │
  │ (1:N)
  │
AuditLog (N)

QuoteRequest (Independent - no foreign keys)
```

### Foreign Key Constraints

**Product → Category (ON DELETE SET NULL):**

- Deleting category doesn't delete products
- Products exist independently, category is metadata

**Product → Brand (ON DELETE SET NULL):**

- Deleting brand doesn't delete products
- Historical data preservation

**ProductSpec → Product (ON DELETE CASCADE):**

- Deleting product deletes all specs
- Specs meaningless without parent product

**RefreshToken → Admin (ON DELETE CASCADE):**

- Deleting admin invalidates all sessions
- Security: Prevent token reuse after account deletion

---

## Indexing Strategy

### Index Types

**1. Unique Indexes (Data Integrity)**

- `Admin.email`
- `Category.slug`, `Brand.slug`, `Product.slug`
- `RefreshToken.token`
- `QuoteRequest(email, phone, createdDay)`

**2. Single-Column Indexes**

- `Admin.isActive`
- `Product.categoryId`
- `Product.brandId`
- `QuoteRequest.status`

**3. Composite Indexes (Complex Queries)**

```sql
CREATE INDEX idx_product_featured ON Product(isActive, isFeatured);
CREATE INDEX idx_category_active_order ON Category(isActive, displayOrder);
CREATE INDEX idx_audit_admin_time ON AuditLog(adminId, timestamp DESC);
```

---

## Data Integrity & Constraints

### Check Constraints

**Email validation:**

```sql
CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')
```

**Future date validation:**

```sql
CHECK (expiresAt > createdAt)
```

### Default Values

- Timestamps: `@default(now())` and `@updatedAt`
- Status fields: `@default(true)` for isActive
- Enums: `@default(NEW)` for QuoteStatus

---

## Migration Strategy

### Development Workflow

```bash
# Create migration
npx prisma migrate dev --name add_feature

# Review SQL
cat prisma/migrations/*/migration.sql

# Test
npm test
```

### Production Deployment

```bash
# Backup first
pg_dump production_db > backup.sql

# Deploy
npx prisma migrate deploy

# Verify
npm run test:smoke
```

### Zero-Downtime Migrations

**Adding nullable column:**

```sql
-- Add column (instant)
ALTER TABLE Product ADD COLUMN newField TEXT NULL;

-- Backfill (can run during traffic)
UPDATE Product SET newField = 'default';

-- Make required (fast)
ALTER TABLE Product ALTER COLUMN newField SET NOT NULL;
```

---

## Connection Pooling

### Pool Sizing Formula

```
connections = ((core_count * 2) + spindle_count)

Example:
- 4 CPU cores
- SSD (1 spindle)
- connections = (4 * 2) + 1 = 9 → Use 10
```

### Configuration

```env
DATABASE_URL=postgresql://user:pass@host:5432/db?connection_limit=10&pool_timeout=20
```

---

## Security Considerations

### 1. SQL Injection Prevention

**Prisma ORM protection:**

```typescript
// ✅ Safe: Parameterized
await prisma.product.findMany({
  where: { name: { contains: userInput } },
});
```

### 2. Password Storage

```typescript
// Hash with bcrypt cost 12
const hash = await bcrypt.hash(password, 12);
```

### 3. Sensitive Data

- Never log passwords or tokens
- Redact SQL queries in error messages
- Use environment variables for credentials

### 4. Connection Security

- Use SSL/TLS: `?sslmode=require`
- Rotate credentials quarterly
- Restrict IP whitelist

---

## Performance Optimization

### Query Patterns

**Avoid N+1 queries:**

```typescript
// ✅ Eager load with include
const products = await prisma.product.findMany({
  include: { category: true, brand: true },
});
```

**Pagination:**

```typescript
// Cursor-based for large datasets
const products = await prisma.product.findMany({
  take: 20,
  cursor: { id: lastId },
});
```

**Select only needed fields:**

```typescript
const products = await prisma.product.findMany({
  select: { id: true, name: true, slug: true },
});
```

### Caching Strategy

```typescript
// Redis cache (5 min TTL)
const cached = await redis.get("products:featured");
if (!cached) {
  const data = await prisma.product.findMany({ where: { isFeatured: true } });
  await redis.setex("products:featured", 300, JSON.stringify(data));
}
```

---

## Backup & Recovery

### Backup Strategy

```bash
# Daily backups
pg_dump database > backup_$(date +%Y%m%d).sql
gzip backup_*.sql
aws s3 cp backup_*.sql.gz s3://backups/
```

**Retention:**

- Daily: 7 days
- Weekly: 4 weeks
- Monthly: 12 months
- Yearly: 7 years

### Recovery Testing

```bash
# Monthly drill
psql test_db < backup.sql
psql test_db -c "SELECT COUNT(*) FROM Product;"
npm run test:smoke
```

---

**Document Version:** 2.0

**Maintained By:** Engineering Team  
**Related:** [ENGINEERING_NOTES.md](./ENGINEERING_NOTES.md), [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
