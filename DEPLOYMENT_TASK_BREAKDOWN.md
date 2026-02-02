# 🚀 Deployment Task Breakdown - Step by Step Guide

**Goal:** Transform from development setup to production-ready system  
**Total Time:** ~20 hours (spread over 1-2 weeks)  
**Priority:** Follow order exactly for best results

---

## 🔴 PHASE 1: CRITICAL FIXES (6 hours) - **DO BEFORE LAUNCH**

### Task 1: PostgreSQL Setup (2 hours)

**Why:** SQLite crashes with >100 concurrent users. PostgreSQL handles 10,000+.

**Option A: Managed PostgreSQL (Recommended - Easiest)**

```bash
# 1. Sign up for managed PostgreSQL
# Choose one:
# - DigitalOcean: https://www.digitalocean.com/products/managed-databases
#   Cost: $15/month, 1GB RAM, 10GB storage
# - Render: https://render.com/pricing
#   Cost: $7/month, 256MB RAM
# - Supabase: https://supabase.com/pricing
#   Cost: Free tier, then $25/month

# 2. After signup, get your DATABASE_URL
# Example: postgresql://user:pass@db-host.com:25060/electrical_supplier

# 3. Update backend/.env
DATABASE_URL="postgresql://user:pass@db-host.com:25060/electrical_supplier?sslmode=require&connection_limit=10&pool_timeout=20"

# 4. Run migrations
cd backend
npx prisma migrate deploy

# 5. Test connection
npm run dev
curl http://localhost:5000/api/v1/products
```

**Option B: Local PostgreSQL (Free but requires maintenance)**

```bash
# 1. Download PostgreSQL
# Windows: https://www.postgresql.org/download/windows/
# Mac: brew install postgresql
# Linux: apt install postgresql

# 2. Start PostgreSQL service
# Windows: Services → PostgreSQL → Start
# Mac: brew services start postgresql
# Linux: systemctl start postgresql

# 3. Create database
psql -U postgres
CREATE DATABASE electrical_supplier;
CREATE USER app_user WITH PASSWORD 'your_strong_password';
GRANT ALL PRIVILEGES ON DATABASE electrical_supplier TO app_user;
\q

# 4. Update backend/.env
DATABASE_URL="postgresql://app_user:your_strong_password@localhost:5432/electrical_supplier?connection_limit=10&pool_timeout=20"

# 5. Run migrations
cd backend
npx prisma migrate deploy

# 6. Seed database (if needed)
npm run prisma:seed

# 7. Test connection
npm run dev
curl http://localhost:5000/api/v1/products
```

**Verification:**

- ✅ Backend starts without errors
- ✅ API returns products
- ✅ Check logs: "Database connected successfully"
- ✅ No SQLite file path in logs

**Time:** 2 hours  
**Cost:** $0-15/month

---

### Task 2: Redis Setup (1 hour)

**Why:** Distributed rate limiting, prevents bypass attacks, enables caching.

**Option A: Upstash Redis (Recommended - Free Tier)**

```bash
# 1. Sign up: https://upstash.com
# 2. Create Redis database
# 3. Copy REDIS_URL from dashboard
# Example: redis://:password@us1-xxx.upstash.io:6379

# 4. Update backend/.env
REDIS_URL=redis://:password@us1-xxx.upstash.io:6379

# 5. Restart server
npm run dev

# 6. Check logs - should see:
# "Redis connected successfully"
# "Using Redis store for rate limiting"
```

**Option B: Local Redis (Free)**

```bash
# 1. Install Redis
# Windows: https://github.com/microsoftarchive/redis/releases
# Mac: brew install redis
# Linux: apt install redis-server

# 2. Start Redis
# Windows: redis-server.exe
# Mac: brew services start redis
# Linux: systemctl start redis

# 3. Test connection
redis-cli ping
# Should return: PONG

# 4. Update backend/.env
REDIS_URL=redis://localhost:6379

# 5. Restart server
npm run dev
```

**Verification:**

```bash
# Test rate limiting (should block after 5 attempts)
for i in {1..6}; do
  curl -X POST http://localhost:5000/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}'
done
# 6th request should return 429 Too Many Requests
```

**Time:** 1 hour  
**Cost:** $0-10/month

---

### Task 3: Cloud Storage Setup (2 hours)

**Why:** Local disk fills up. Cloud storage is unlimited and backed up.

**Option A: Cloudflare R2 (Recommended - Cheapest)**

```bash
# 1. Sign up: https://cloudflare.com
# 2. Go to R2 Object Storage
# 3. Create bucket: electrical-supplier-uploads
# 4. Create API token (Read & Write permissions)

# 5. Update backend/.env
STORAGE_PROVIDER=r2
R2_ACCOUNT_ID=your_account_id_here
R2_BUCKET_NAME=electrical-supplier-uploads
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_PUBLIC_URL=https://pub-xxxxxxxxxxxx.r2.dev

# 6. Test upload
# Use Postman or curl to upload test image
curl -X POST http://localhost:5000/api/v1/uploads \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@test.jpg"

# 7. Verify URL starts with https://pub-xxxx.r2.dev/
```

**Option B: AWS S3**

```bash
# 1. Sign up: https://aws.amazon.com
# 2. Go to S3 → Create bucket
# 3. Create IAM user with S3 permissions
# 4. Get access keys

# 5. Update backend/.env
STORAGE_PROVIDER=s3
AWS_S3_BUCKET=electrical-supplier-uploads
AWS_S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXXXXXXXX
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AWS_S3_PUBLIC_URL=https://electrical-supplier-uploads.s3.amazonaws.com
```

**Migrate Existing Files (if any):**

```bash
# Install Cloudflare CLI (for R2)
npm install -g wrangler

# Upload existing files
cd backend/uploads
wrangler r2 object put electrical-supplier-uploads/products/image.jpg --file=image.jpg

# OR use AWS CLI (for S3)
aws s3 sync ./backend/uploads s3://electrical-supplier-uploads/
```

**Verification:**

- ✅ Upload test file via API
- ✅ File URL starts with cloud provider domain
- ✅ File accessible from browser
- ✅ No new files in local uploads/ folder

**Time:** 2 hours  
**Cost:** $1-5/month

---

### Task 4: SMTP Configuration (30 minutes)

**Why:** Enable email sending for quote notifications, password resets, etc.

**Option A: Gmail (Free, Easy)**

```bash
# 1. Enable 2FA on your Gmail account
# 2. Generate App Password:
#    Google Account → Security → 2-Step Verification → App passwords
#    Create password for "Mail"

# 3. Update backend/.env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-char-app-password
EMAIL_FROM=noreply@yourdomain.com
ADMIN_EMAIL=admin@yourdomain.com

# 4. Test email
node backend/src/test-smtp-send.ts
```

**Option B: SendGrid (Free tier: 100 emails/day)**

```bash
# 1. Sign up: https://sendgrid.com
# 2. Create API key
# 3. Verify sender email

# 4. Update backend/.env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=verified-email@yourdomain.com
```

**Verification:**

- ✅ Test email sent successfully
- ✅ Check spam folder if not received
- ✅ Run test suite (email test should pass)

**Time:** 30 minutes  
**Cost:** $0 (free tiers)

---

### Task 5: Final Testing (30 minutes)

**Verify all critical systems working together**

```bash
# 1. Run full test suite
cd backend
npm test
# Should see: 57/57 tests passing (all green)

# 2. Test health endpoint
curl http://localhost:5000/health
# Should return:
# {
#   "status": "healthy",
#   "database": "connected",
#   "redis": "connected"
# }

# 3. Test API endpoints
curl http://localhost:5000/api/v1/products
curl http://localhost:5000/api/v1/categories

# 4. Test authentication
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@electricalsupplier.com","password":"your_password"}'

# 5. Test rate limiting (should block after 5 attempts)
# Run 6 login attempts with wrong password

# 6. Test file upload
# Use Postman to upload test image

# 7. Check logs for errors
tail -f logs/error.log
# Should be empty or only old errors
```

**Verification Checklist:**

- ✅ PostgreSQL: Database connected
- ✅ Redis: Rate limiting working
- ✅ Cloud Storage: Files uploading to cloud
- ✅ SMTP: Emails sending
- ✅ Tests: 57/57 passing
- ✅ API: All endpoints responding
- ✅ Logs: No errors

**Time:** 30 minutes

---

## 🟠 PHASE 2: HIGH PRIORITY (8 hours) - **FIRST MONTH**

### Task 6: Database Optimization (2 hours)

**Why:** Indexes make queries 10-100x faster.

```typescript
// Update backend/prisma/schema.prisma
// Add these indexes:

model Product {
  // ... existing fields ...

  @@index([categoryId])
  @@index([slug])
  @@index([createdAt])
  @@index([featured])
  @@fulltext([name, description])
}

model Category {
  // ... existing fields ...

  @@index([slug])
  @@index([parentId])
}

model Brand {
  // ... existing fields ...

  @@index([slug])
}

model Quote {
  // ... existing fields ...

  @@index([status])
  @@index([email])
  @@index([createdAt])
}

model AuditLog {
  // ... existing fields ...

  @@index([userId])
  @@index([action])
  @@index([createdAt])
}
```

```bash
# Apply migration
npx prisma migrate dev --name add_performance_indexes

# Deploy to production
npx prisma migrate deploy
```

**Verification:**

```sql
-- Check indexes created (PostgreSQL)
SELECT tablename, indexname FROM pg_indexes
WHERE schemaname = 'public';
```

**Time:** 2 hours  
**Performance Gain:** 10-100x faster queries

---

### Task 7: Implement Caching (4 hours)

**Why:** Reduces database load by 80-90%, 100x faster response times.

Create caching service:

```typescript
// backend/src/services/cache.service.ts
import { redis } from "../config/redis";

export class CacheService {
  private prefix = "cache:";

  async get<T>(key: string): Promise<T | null> {
    if (!redis) return null;
    const data = await redis.get(this.prefix + key);
    return data ? JSON.parse(data) : null;
  }

  async set(key: string, value: any, ttl: number = 300): Promise<void> {
    if (!redis) return;
    await redis.setex(this.prefix + key, ttl, JSON.stringify(value));
  }

  async del(key: string): Promise<void> {
    if (!redis) return;
    await redis.del(this.prefix + key);
  }

  async clear(pattern: string): Promise<void> {
    if (!redis) return;
    const keys = await redis.keys(this.prefix + pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
}

export const cache = new CacheService();
```

Update product service:

```typescript
// backend/src/modules/product/service.ts
import { cache } from '../../services/cache.service';

async getAllProducts(filters: any, page: number, limit: number) {
  // Create cache key based on filters
  const cacheKey = `products:${page}:${limit}:${JSON.stringify(filters)}`;

  // Try cache first
  const cached = await cache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Query database
  const result = await this.repository.findAll(filters, page, limit);

  // Cache for 5 minutes
  await cache.set(cacheKey, result, 300);

  return result;
}

async createProduct(data: any) {
  const product = await this.repository.create(data);

  // Clear product cache
  await cache.clear('products:*');

  return product;
}
```

**Cache Strategy:**

```typescript
// Products: 5 minutes
cache.set("products:*", data, 300);

// Categories: 1 hour (rarely change)
cache.set("categories", data, 3600);

// Product details: 10 minutes
cache.set("product:" + slug, data, 600);

// Homepage featured: 5 minutes
cache.set("featured:products", data, 300);
```

**Verification:**

```bash
# Monitor Redis
redis-cli monitor

# Make request
curl http://localhost:5000/api/v1/products

# First request: Cache MISS (hits database)
# Second request: Cache HIT (returns instantly)

# Check response time
# Without cache: 50-200ms
# With cache: 1-5ms
```

**Time:** 4 hours  
**Performance Gain:** 100x faster for cached requests

---

### Task 8: Load Testing (1 hour)

**Why:** Verify system handles expected traffic before launch.

```bash
# Install Apache Bench
# Windows: Download from https://www.apachelounge.com/download/
# Mac: Already installed (ab)
# Linux: apt install apache2-utils

# Test 1: Light load (50 concurrent users)
ab -n 1000 -c 50 http://localhost:5000/api/v1/products

# Expected results:
# Requests per second: 200-500
# Time per request: <100ms
# Failed requests: 0

# Test 2: Medium load (100 concurrent users)
ab -n 2000 -c 100 http://localhost:5000/api/v1/products

# Expected results:
# Requests per second: 100-300
# Time per request: <200ms
# Failed requests: 0

# Test 3: Heavy load (200 concurrent users)
ab -n 5000 -c 200 http://localhost:5000/api/v1/products

# Expected results:
# Requests per second: 50-150
# Time per request: <500ms
# Failed requests: <1%

# Advanced: Install k6 for better load testing
# Windows: choco install k6
# Mac: brew install k6
# Linux: snap install k6

# Create test script: load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 100 },  // Ramp up
    { duration: '5m', target: 100 },  // Stay at 100 users
    { duration: '2m', target: 200 },  // Spike test
    { duration: '1m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% under 500ms
    http_req_failed: ['rate<0.01'],   // <1% errors
  },
};

export default function () {
  let res = http.get('http://localhost:5000/api/v1/products');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  sleep(1);
}

# Run test
k6 run load-test.js
```

**Success Criteria:**

- ✅ 100 concurrent users: <100ms avg response
- ✅ 200 concurrent users: <200ms avg response
- ✅ Error rate: <1%
- ✅ No 500 errors
- ✅ No memory leaks

**Time:** 1 hour

---

### Task 9: Monitoring Setup (1 hour)

**Why:** Get alerts when site goes down, catch errors early.

**Uptime Monitoring (Free):**

```bash
# 1. Sign up: https://uptimerobot.com (Free tier: 50 monitors)

# 2. Add monitor:
#    Type: HTTP(s)
#    URL: https://yourdomain.com/health
#    Interval: 5 minutes

# 3. Add alert contacts:
#    Email: your-email@gmail.com
#    (Optional) SMS, Slack, Discord

# 4. Test alert
#    Stop backend server
#    Wait 5 minutes
#    Should receive alert email
```

**Error Tracking (Optional but Recommended):**

```bash
# 1. Sign up: https://sentry.io (Free tier: 5,000 events/month)

# 2. Create project: Node.js + Express

# 3. Get DSN from dashboard

# 4. Update backend/.env
SENTRY_DSN=https://xxxxx@sentry.io/xxxxx

# 5. Restart server
npm run dev

# 6. Trigger test error
curl http://localhost:5000/api/v1/this-does-not-exist

# 7. Check Sentry dashboard for error
```

**Time:** 1 hour  
**Cost:** $0 (free tiers)

---

## 🟡 PHASE 3: MEDIUM PRIORITY (6 hours) - **WITHIN 3 MONTHS**

### Task 10: Unit Tests (4 hours)

**Why:** Catch bugs early, enable safe refactoring.

```typescript
// backend/tests/unit/product.service.test.ts
import { ProductService } from "../../src/modules/product/service";
import { ProductRepository } from "../../src/modules/product/repository";

jest.mock("../../src/modules/product/repository");

describe("ProductService", () => {
  let service: ProductService;
  let repository: jest.Mocked<ProductRepository>;

  beforeEach(() => {
    repository = new ProductRepository() as jest.Mocked<ProductRepository>;
    service = new ProductService();
    (service as any).repository = repository;
  });

  describe("getAllProducts", () => {
    it("should return paginated products", async () => {
      const mockProducts = [
        { id: "1", name: "Product 1", price: 100 },
        { id: "2", name: "Product 2", price: 200 },
      ];

      repository.findAll.mockResolvedValue({
        items: mockProducts,
        total: 2,
      });

      const result = await service.getAllProducts({}, 1, 10);

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(repository.findAll).toHaveBeenCalledWith({}, 1, 10);
    });

    it("should apply filters correctly", async () => {
      const filters = { category: "electronics", featured: true };

      await service.getAllProducts(filters, 1, 10);

      expect(repository.findAll).toHaveBeenCalledWith(filters, 1, 10);
    });
  });

  describe("getProductById", () => {
    it("should return product if found", async () => {
      const mockProduct = { id: "1", name: "Product 1" };
      repository.findById.mockResolvedValue(mockProduct);

      const result = await service.getProductById("1");

      expect(result).toEqual(mockProduct);
    });

    it("should throw NotFoundError if product not found", async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.getProductById("999")).rejects.toThrow(
        "Product not found",
      );
    });
  });
});
```

Run tests:

```bash
npm test -- --testPathPattern=unit
```

**Time:** 4 hours  
**Coverage Goal:** 80%+

---

### Task 11: Architecture Diagram (2 hours)

**Why:** Visual documentation helps onboarding and system understanding.

Use these tools:

- **dbdiagram.io** - Database ERD (free)
- **draw.io** - System architecture (free)
- **Mermaid** - Diagrams in markdown (free)

Create ERD:

```
// Use https://dbdiagram.io/d
Table admins {
  id uuid [pk]
  email varchar
  password varchar
  role enum
  twoFactorEnabled boolean
}

Table products {
  id uuid [pk]
  name varchar
  slug varchar [unique]
  price decimal
  categoryId uuid [ref: > categories.id]
  brandId uuid [ref: > brands.id]
}

Table categories {
  id uuid [pk]
  name varchar
  slug varchar [unique]
  parentId uuid [ref: > categories.id]
}

Table brands {
  id uuid [pk]
  name varchar
  slug varchar [unique]
}

Table quotes {
  id uuid [pk]
  email varchar
  status enum
  products json
  adminId uuid [ref: > admins.id]
}

Table auditLogs {
  id uuid [pk]
  userId uuid [ref: > admins.id]
  action varchar
  details json
}
```

**Time:** 2 hours

---

## 🟢 PHASE 4: OPTIONAL (10+ hours) - **NICE TO HAVE**

### Task 12-20: Future Enhancements

- API rate limit response headers (2 hours)
- Query optimization and explain analyze (3 hours)
- CDN setup for static assets (1 hour)
- Automated database backups (2 hours)
- Admin dashboard improvements (8 hours)
- WebSocket real-time updates (8 hours)
- GraphQL endpoint (20 hours)
- Multi-language support (16 hours)

---

## 📋 Quick Reference Checklist

### Before Launch (Must Complete):

- [ ] Task 1: PostgreSQL setup
- [ ] Task 2: Redis setup
- [ ] Task 3: Cloud storage setup
- [ ] Task 4: SMTP configuration
- [ ] Task 5: Final testing (57/57 tests passing)

### First Month (High Priority):

- [ ] Task 6: Database indexes
- [ ] Task 7: Caching implementation
- [ ] Task 8: Load testing
- [ ] Task 9: Monitoring setup

### First 3 Months (Medium Priority):

- [ ] Task 10: Unit tests
- [ ] Task 11: Architecture diagrams

### Future (Optional):

- [ ] Task 12-20: Enhancements

---

## 🎯 Progress Tracking

**Total Tasks:** 20  
**Completed:** 0  
**In Progress:** 0  
**Remaining:** 20

**Estimated Time:**

- Critical (Phase 1): 6 hours
- High Priority (Phase 2): 8 hours
- Medium Priority (Phase 3): 6 hours
- Total: 20 hours

**Cost Breakdown:**

- PostgreSQL: $0-15/month
- Redis: $0-10/month
- Cloud Storage: $1-5/month
- SMTP: $0 (free tiers)
- Monitoring: $0 (free tiers)
- **Total: $1-30/month**

---

## 💡 Pro Tips

1. **Do tasks in order** - Dependencies exist (e.g., need PostgreSQL before indexes)
2. **Test after each task** - Don't move to next until current works
3. **Take breaks** - 6 hours is a lot, spread over 2-3 days
4. **Document issues** - Note any problems for future reference
5. **Backup database** - Before migrations, always backup
6. **Use managed services** - Easier than self-hosting
7. **Start with free tiers** - Upgrade when needed
8. **Monitor everything** - Set up alerts early

---

## 📞 Support Resources

- **PostgreSQL:** https://www.postgresql.org/docs/
- **Redis:** https://redis.io/docs/
- **Prisma:** https://www.prisma.io/docs/
- **Cloudflare R2:** https://developers.cloudflare.com/r2/
- **Express.js:** https://expressjs.com/
- **UptimeRobot:** https://uptimerobot.com/help/

---

**Next Review:** After Phase 1 completion
