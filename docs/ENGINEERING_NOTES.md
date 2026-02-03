# Engineering Architecture & Design Decisions

**Project:** Electrical Supplier B2B E-commerce Platform  
**Author:** Development Team

**Purpose:** Explain WHY architectural decisions were made, not just WHAT was implemented

---

## Table of Contents

1. [Authentication & Authorization Architecture](#1-authentication--authorization-architecture)
2. [Quote Request 5-Layer Security](#2-quote-request-5-layer-security)
3. [File Upload Multi-Layer Validation](#3-file-upload-multi-layer-validation)
4. [Database & ORM Choice](#4-database--orm-choice)
5. [Express + React Separation Strategy](#5-express--react-separation-strategy)
6. [Error Handling Philosophy](#6-error-handling-philosophy)
7. [Rate Limiting Architecture](#7-rate-limiting-architecture)
8. [Database Schema Design](#8-database-schema-design)
9. [Security Headers & CORS](#9-security-headers--cors)
10. [Logging & Observability](#10-logging--observability)

---

## 1. Authentication & Authorization Architecture

### JWT + Refresh Token Pattern

**Decision:** Use short-lived JWT access tokens (24h) + long-lived refresh tokens (7d) with database-backed revocation.

**Why This Approach?**

1. **Access Token (JWT - 24h lifespan):**
   - Stateless verification (no database lookup on every request)
   - Contains user ID, email, role for authorization
   - Short lifespan limits damage if stolen
   - Signed with HS256 (HMAC-SHA256) - faster than RSA for single-server setup

2. **Refresh Token (Random 64-byte hex - 7d lifespan):**
   - Stored in database with hashed value (HMAC-SHA256 with pepper)
   - Allows server-side revocation (logout, password change)
   - HttpOnly cookie prevents JavaScript access (XSS protection)
   - Strict SameSite prevents CSRF on refresh endpoint

**Why Not Just JWT for Everything?**

- JWTs cannot be revoked before expiration
- If access token leaked, only valid for 24 hours
- If refresh token leaked AND we detect it, we can revoke immediately

**Why Not Session-Based Auth?**

- Requires sticky sessions or shared session store (Redis)
- More complex for horizontal scaling
- JWT allows frontend to know user info without API call

**Token Rotation Strategy:**

- Every refresh generates NEW refresh token
- Old refresh token marked as revoked (`isRevoked = true`)
- Prevents replay attacks after token theft detection

**Security Trade-offs:**

- 24h access token means users stay logged in even after password change (until token expires)
- Solution: Force logout on password change by revoking ALL refresh tokens
- Alternative considered: 1h access token (rejected - too many refresh calls, poor UX)

**Implementation Files:**

- `backend/src/modules/auth/service.ts` - Token generation & validation
- `backend/src/modules/auth/refreshToken.repository.ts` - Token storage
- `backend/prisma/schema.prisma` - RefreshToken model with indexes

---

## 2. Quote Request 5-Layer Security

**Decision:** Stack 5 independent security layers instead of relying on single mechanism.

**Why Defense in Depth?**

Each layer catches different attack vectors. If attacker bypasses one layer, others provide backup.

### Layer 1: Cloudflare Turnstile (Optional)

**What:** Invisible CAPTCHA before form submission  
**Why:** Stops automated bots without annoying humans  
**Catches:** Script kiddies, basic bots, scraping tools  
**Limitation:** Can be bypassed by determined attackers with CAPTCHA solving services

### Layer 2: Rate Limiting (IP-based)

**What:** Max 3 quote submissions per IP per 15 minutes  
**Why:** Blocks rapid-fire submissions from single source  
**Catches:** DoS attacks, aggressive spam scripts  
**Limitation:** Shared IPs (offices, schools) hit limit together

**Implementation:**

```typescript
// Separate Redis store to avoid counter collisions
const quoteStore = new RedisStore({
  prefix: "ratelimit:quote:",
  client: redisClient,
});
```

### Layer 3: Honeypot Field

**What:** Hidden field that bots fill but humans don't  
**Why:** Simple, effective bot detection without user friction  
**Catches:** Dumb bots that auto-fill all form fields  
**Limitation:** Smart bots that check field visibility can bypass

**Why Named `website`?**

- Looks like legit field (bots expect it)
- Frontend hides with `display: none` (not just `visibility: hidden`)
- Backend rejects if filled: `if (website) throw 429`

### Layer 4: Timing Analysis

**What:** Reject submissions faster than 1.5 seconds or slower than 1 hour  
**Why:** Humans need time to read and fill form; bots are instant  
**Catches:** Automated scripts (too fast), pre-filled spam (too fast), abandoned forms (too slow)

**Thresholds Explained:**

- **Min 1.5s:** Fastest human can't read + fill + click in < 1.5s
- **Max 1h:** Abandoned forms likely spam or duplicate

### Layer 5: Duplicate Detection (Database-Level)

**What:** Unique constraint on `email + phone + createdDay`  
**Why:** Prevents double-click submissions and accidental duplicates  
**Catches:** Race conditions, multiple browser tabs, impatient users

**Why Database Constraint vs Application Check?**

```typescript
// OLD: Race condition vulnerability
const existing = await findDuplicate(email, phone);
if (existing) throw error;
await create(quote); // Note: two requests can both pass the check

// NEW: Atomic database constraint
@@unique([email, phone, createdDay]) // Only 1 succeeds
```

**Why Per-Day Instead of Per-10-Minutes?**

- 10-minute window in application code (Layer 5a)
- 24-hour window in database (Layer 5b)
- Allows legitimate re-quote next day
- Prevents brute force with slightly different timing

**Trade-off:**

- Legitimate user with typo can't resubmit same day
- Solution: Admin can see duplicate attempts and contact user

---

## 3. File Upload Multi-Layer Validation

**Decision:** Validate at 3 checkpoints instead of trusting single method.

### Layer 1: Client-Side Extension Check

**What:** Browser checks file extension before upload  
**Why:** Fast feedback, saves bandwidth  
**Security Value:** Zero (easily bypassed)  
**Purpose:** UX only

### Layer 2: MIME Type + Magic Bytes

**What:** Check `Content-Type` header AND first bytes of file  
**Why:** MIME type can be spoofed; magic bytes are harder to fake

**Example:**

```typescript
// MIME type: image/jpeg (claimed by attacker)
// Magic bytes: %PDF-1.4 (actual file content)
// Verdict: REJECT - mismatch detected
```

**Supported Formats:**

- Images: JPEG (FFD8FF), PNG (89504E47), WebP (52494646)
- PDF: 25504446 (hex for %PDF)

**Why Not Trust MIME Type Alone?**

- Attacker can set any MIME type in HTTP headers
- Example: Upload `malware.exe` with `Content-Type: image/jpeg`

**Why Not Trust Extension Alone?**

- `malware.exe.jpg` bypasses extension check
- `script.php.jpg` executed by misconfigured servers

### Layer 3: Malware Scanning

**What:** Send file to VirusTotal or ClamAV before accepting  
**Why:** Detect known malware signatures

**Providers:**

1. **VirusTotal (60+ engines):**
   - Cloud-based, most comprehensive
   - Rate limited (4 requests/min free tier)
   - Sends files to third party (privacy concern)
   - Best for: Low-volume, high-security

2. **ClamAV (Open-source):**
   - Self-hosted, no rate limits
   - Single engine (less coverage)
   - Private (files never leave server)
   - Best for: High-volume, privacy-sensitive

3. **None (Skip scanning):**
   - Fast, no dependencies
   - Zero malware protection
   - Best for: Development only

**Fail Modes:**

```typescript
// fail_open: Allow upload if scan fails (availability > security)
// fail_closed: Block upload if scan fails (security > availability)
```

**Why Configurable Fail Mode?**

- Production: `fail_closed` (paranoid)
- Staging: `fail_open` (test without scanner)

**Why Not Scan Inline?**

- VirusTotal API takes 5-30 seconds
- Blocks user waiting
- Better: Accept upload → Scan async → Quarantine if malware
- Current: Scan inline (simpler, acceptable for low volume)

### Layer 4: Unique Filename Generation

**What:** Replace user filename with timestamp + random ID  
**Why:** Prevents path traversal and filename collisions

**Pattern:**

```typescript
// User uploads: ../../../../etc/passwd.jpg
// We store as: 1675458923000-a1b2c3d4e5.jpg
const filename = `${Date.now()}-${randomBytes(6).toString("hex")}${ext}`;
```

**Why Not Keep Original Filename?**

- `../../etc/passwd` attempts directory traversal
- `script.php.jpg` might be executed on misconfigured server
- Same filename from multiple users causes collisions

**Trade-off:**

- Lose original filename for download
- Solution: Store `originalFilename` in database, set `Content-Disposition` header

---

## 4. Database & ORM Choice

### Why Prisma ORM?

**Decision:** Use Prisma instead of raw SQL or other ORMs (TypeORM, Sequelize).

**Advantages:**

1. **Type Safety:**

   ```typescript
   // Prisma auto-generates types from schema
   const product: Product = await prisma.product.findUnique({
     where: { slug: "circuit-breaker" },
   }); // TypeScript knows all fields
   ```

2. **SQL Injection Prevention:**
   - All queries parameterized automatically
   - No manual escaping needed
   - Example:

   ```typescript
   // DANGEROUS (raw SQL):
   db.query(`SELECT * FROM products WHERE name = '${userInput}'`);

   // SAFE (Prisma):
   prisma.product.findMany({ where: { name: userInput } });
   ```

3. **Migration Management:**
   - Schema changes tracked in migrations/ folder
   - Version controlled
   - Rollback support
   - Example: `prisma migrate dev --name add-indexes`

4. **Developer Experience:**
   - IntelliSense auto-completion
   - Compile-time errors for invalid queries
   - One source of truth (schema.prisma)

**Disadvantages:**

1. **Performance Overhead:**
   - Generates longer SQL than hand-written queries
   - Trade-off: Safety > 5ms query time difference

2. **Complex Queries:**
   - Raw SQL needed for advanced aggregations
   - Solution: `prisma.$queryRaw<T>` for edge cases

3. **Bundle Size:**
   - 4MB query engine binary
   - Trade-off: Acceptable for backend (not browser)

### Why SQLite (Dev) + PostgreSQL (Prod)?

**SQLite for Development:**

- Zero setup (no server installation)
- Fast for small datasets (< 10k records)
- File-based (easy to backup/restore)
- Perfect for local testing

**PostgreSQL for Production:**

- True concurrent writes (SQLite locks entire DB)
- Better performance for large datasets
- JSON columns, full-text search, advanced features
- Industry standard for scalability

**Migration Strategy:**

```prisma
// Single schema works for both:
datasource db {
  provider = "sqlite" // Change to "postgresql" for prod
  url      = env("DATABASE_URL")
}
```

### Why Relational DB vs NoSQL?

**Decision:** Use relational (SQLite/PostgreSQL) instead of MongoDB/DynamoDB.

**Rationale:**

1. **Data Relationships:**
   - Product → Category (many-to-one)
   - Product → Brand (many-to-one)
   - Admin → RefreshTokens (one-to-many)
   - Foreign keys enforce referential integrity

2. **ACID Transactions:**
   - Quote creation must be atomic
   - Token revocation must be consistent
   - NoSQL "eventual consistency" unacceptable

3. **Complex Queries:**
   - Filter products by category + brand + price
   - Join operations needed
   - NoSQL requires application-level joins

**When NoSQL Would Be Better:**

- Unstructured data (logs, events)
- Horizontal scaling across 100+ servers
- Schema changes every day
- **Not applicable to this project**

---

## 5. Express + React Separation Strategy

### Single-Port Deployment

**Decision:** Express serves React build from `/` and API from `/api/v1`.

**Architecture:**

```
https://example.com/          → React (index.html)
https://example.com/products  → React (client-side routing)
https://example.com/api/v1/*  → Express API
```

**Why Not Separate Ports (Frontend :3000, Backend :5000)?**

1. **CORS Complexity:**
   - Separate origins = CORS headers required
   - More attack surface (CSRF, CORS misconfig)
   - Single origin = no CORS needed for same-origin requests

2. **Deployment Simplicity:**
   - One server process
   - One SSL certificate
   - One domain
   - One Dockerfile

3. **Session/Cookie Sharing:**
   - HttpOnly cookies work seamlessly
   - No `credentials: include` needed

**Development vs Production:**

**Development:**

- Frontend: Vite dev server (port 5173)
- Backend: tsx watch (port 5000)
- CORS enabled for `localhost:5173`

**Production:**

- Frontend: Build static files (`npm run build` → dist/)
- Backend: Express serves static files + API
- No CORS needed (same origin)

**Middleware Order:**

```typescript
// 1. Serve static files FIRST (no CORS check)
app.use(express.static("frontend/dist"));

// 2. API routes with CORS
app.use("/api/v1", cors(), apiRouter);

// 3. Fallback to index.html (SPA routing)
app.get("*", (req, res) => res.sendFile("index.html"));
```

**Why Static Files Before CORS?**

- CSS/JS files don't need CORS headers
- Faster response (skip CORS logic)
- Browser's same-origin policy allows it

---

## 6. Error Handling Philosophy

### AppError vs Generic Error

**Decision:** Never throw generic `Error`, always use `AppError` with status code.

**Problem with Generic Error:**

```typescript
throw new Error("Database connection failed");
// Returns: 500 Internal Server Error
// Risk: stack trace may leak to client
// Missing context for logging
```

**Solution with AppError:**

```typescript
throw new AppError(503, "Database temporarily unavailable");
// Returns: 503 Service Unavailable
// Clean JSON: { success: false, message: "..." }
// Stack trace only in logs (not client response)
```

### Error Hierarchy

```typescript
class AppError extends Error {
  statusCode: number; // HTTP status (400, 401, 403, 500)
  isOperational: true; // Expected error (not bug)
}
```

**Why `isOperational` Flag?**

- Distinguishes expected errors from bugs
- Expected: Invalid input, duplicate entry, not found
- Unexpected: Null pointer, syntax error, out of memory
- Only operational errors sent to client

### HTTP Status Code Strategy

**400 Bad Request:**

- Malformed JSON
- Missing required fields
- Invalid data types
- Example: `{ email: "not-an-email" }`

**401 Unauthorized:**

- Missing auth token
- Invalid credentials
- Expired token
- Example: Login with wrong password

**403 Forbidden:**

- Valid auth but insufficient permissions
- Example: Editor trying to delete admin

**404 Not Found:**

- Resource doesn't exist
- Example: GET /api/v1/products/nonexistent-slug

**409 Conflict:**

- Duplicate entry (unique constraint)
- Example: Create category with existing name

**422 Unprocessable Entity:**

- Validation failed (not malformed)
- Example: Password too short, email already taken

**429 Too Many Requests:**

- Rate limit exceeded
- Example: 5 login attempts in 1 minute

**500 Internal Server Error:**

- Unexpected error (bug)
- Database connection failed
- File system error
- **Never expose details to client**

### Client-Facing vs Internal Errors

```typescript
// NEVER send to client:
res.json({ error: "ECONNREFUSED: Database at 192.168.1.5:5432" });

// Send generic message:
res.json({ error: "Service temporarily unavailable" });

// Log full details internally:
logger.error("DB connection failed", { host, port, error });
```

**Why Hide Internal Details?**

- Prevents information disclosure
- Attacker learns server IPs, ports, tech stack
- Generic message is user-friendly anyway

---

## 7. Rate Limiting Architecture

### Why Separate Redis Stores Per Limiter?

**Decision:** Each rate limiter has its own Redis key prefix.

**Implementation:**

```typescript
const apiStore = new RedisStore({ prefix: "ratelimit:api:" });
const authStore = new RedisStore({ prefix: "ratelimit:auth:" });
const quoteStore = new RedisStore({ prefix: "ratelimit:quote:" });
```

**Why Not Single Store?**

**Problem:**

```typescript
// Single store - counters collide!
const store = new RedisStore({ prefix: 'ratelimit:' });

// User makes API call:
Redis: SET ratelimit:192.168.1.100 1 EX 900

// Same user makes auth call:
Redis: INCR ratelimit:192.168.1.100 → 2

// Result: API limit (100/15min) depleted by auth calls!
```

**Solution:**

```typescript
// Separate prefixes - no collision
Redis: SET ratelimit:api:192.168.1.100 1 EX 900
Redis: SET ratelimit:auth:192.168.1.100 1 EX 900
// Independent counters
```

### Rate Limit Thresholds

**API (General):**

- Limit: 100 requests / 15 minutes
- Why: Generous for normal browsing, blocks basic scraping
- Trade-off: Power users might hit limit (rare)

**Auth (Login/Logout):**

- Limit: 5 attempts / 15 minutes
- Why: Prevents brute-force password guessing
- Trade-off: Legitimate users with typos locked out (acceptable)

**Quote Submission:**

- Limit: 3 requests / 15 minutes
- Why: Low-frequency action, aggressive limit acceptable
- Trade-off: Legitimate user with error can't retry immediately

**2FA Verification:**

- Limit: 5 attempts / 15 minutes
- Why: TOTP codes valid for 30s, 5 attempts enough
- Trade-off: Prevents brute-force of 6-digit codes (1M combinations)

### Redis vs In-Memory Trade-offs

**Redis (Production):**

Pros:

- Shared across multiple server instances
- Persistent (survives restart)

Cons:

- Requires Redis server running
- Network latency (1-2ms)

**In-Memory (Development):**

Pros:

- Zero setup
- Faster (no network)

Cons:

- Lost on restart
- Per-process (load balancer defeats it)

**Auto-Detection:**

```typescript
const store = env.REDIS_URL
  ? new RedisStore({ client: redisClient })
  : new MemoryStore(); // Fallback
```

---

## 8. Database Schema Design

### Product-Category-Brand Relationships

**Decision:** Many-to-one relationships with foreign keys.

**Schema:**

```prisma
model Product {
  categoryId String
  brandId    String

  category   Category @relation(fields: [categoryId], references: [id])
  brand      Brand    @relation(fields: [brandId], references: [id])
}
```

**Why Not Many-to-Many?**

- Product belongs to ONE category (no cross-category products)
- Product has ONE brand (no multi-brand products)
- Simpler queries, fewer joins

**Why Foreign Keys?**

```typescript
// Without FK: Orphaned products possible
await prisma.category.delete({ where: { id: 'cat-1' } });
// Products with categoryId='cat-1' still exist (broken relationship)

// With FK + onDelete: Cascade:
@@relation(..., onDelete: Cascade)
// Deleting category automatically deletes products
```

### Slug Fields for SEO

**Decision:** Every content model has `slug` field.

**Example:**

- Product: `/products/50a-circuit-breaker`
- Category: `/category/circuit-breakers`
- Brand: `/brand/schneider-electric`

**Why Slug vs ID?**

```
Bad:  /products/a1b2c3d4-e5f6-7890-abcd-ef1234567890
Good: /products/50a-circuit-breaker
```

**Benefits:**

1. SEO (keywords in URL)
2. User-friendly (shareable links)
3. Readable (know what page it is)

**Slug Generation:**

```typescript
// User inputs: "50A Circuit Breaker (Type C)"
// Generated slug: "50a-circuit-breaker-type-c"

slug = name
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-") // Replace special chars with dash
  .replace(/^-|-$/g, ""); // Trim dashes
```

**Uniqueness:**

```prisma
model Product {
  slug String @unique
}
```

**Why Unique Constraint?**

- Prevents duplicate slugs causing routing conflicts
- If collision, append number: `circuit-breaker-2`

### Indexes for Query Performance

**Decision:** Index all frequently-queried and filtered fields.

**Examples:**

```prisma
@@index([slug])          // Lookup by slug (most common)
@@index([categoryId])    // Filter by category
@@index([isActive])      // Filter active/inactive
@@index([categoryId, isActive]) // Composite for both filters
```

**Query Optimization:**

```typescript
// WITHOUT index:
SELECT * FROM products WHERE categoryId = 'cat-1';
// Full table scan (slow for large tables)

// WITH index:
SELECT * FROM products WHERE categoryId = 'cat-1';
// Index seek (fast even for large tables)
```

**Trade-offs:**

- Faster reads (SELECT queries)
- Slower writes (INSERT/UPDATE must update index)
- More disk space (index storage)
- **Acceptable:** Reads >> writes in e-commerce

### Soft Delete vs Hard Delete

**Decision:** Use `isActive` flag instead of deleting records.

```prisma
model Product {
  isActive Boolean @default(true)
}
```

**Why Not DELETE?**

- Preserve history (audit trail)
- Recover accidentally deleted items
- Analytics (which products were tried then removed?)

**Queries:**

```typescript
// Frontend: Only show active
prisma.product.findMany({ where: { isActive: true } });

// Admin: Show all (including inactive)
prisma.product.findMany(); // No filter
```

**Hard Delete Use Cases:**

- GDPR "right to be forgotten" (user data)
- Spam/abuse content (malicious quotes)

---

## 9. Security Headers & CORS

### Helmet.js Configuration

**Decision:** Use Helmet with strict CSP (Content Security Policy).

**Headers Enabled:**

1. **Content-Security-Policy:**

   ```typescript
   defaultSrc: ["'self'"],
   scriptSrc: ["'self'"], // No inline scripts
   styleSrc: ["'self'", "'unsafe-inline'"], // CSS allowed inline
   ```

   **Why 'unsafe-inline' for styles?**
   - Vite generates inline styles in dev mode
   - React styled-components need it
   - Trade-off: XSS via CSS is low risk

2. **X-Content-Type-Options: nosniff**
   - Prevents MIME sniffing attacks
   - Browser won't execute `image.jpg` as JavaScript

3. **X-Frame-Options: DENY**
   - Prevents clickjacking (iframe embedding)
   - Alternative: `SAMEORIGIN` if iframes needed

4. **Strict-Transport-Security (HSTS):**

   ```typescript
   max-age=31536000; includeSubDomains; preload
   ```

   - Forces HTTPS for 1 year
   - Subdomains included
   - Why: Prevents SSL stripping attacks

### CORS Configuration Strategy

**Development:**

```typescript
CORS_ORIGIN=http://localhost:5173,http://localhost:5000
```

**Production:**

```typescript
CORS_ORIGIN=https://yourdomain.com
```

**Why Explicit Origins vs Wildcard?**

```typescript
// NEVER in production:
Access-Control-Allow-Origin: *

// Explicit origin:
Access-Control-Allow-Origin: https://yourdomain.com
```

**Why No Wildcard?**

- Allows ANY website to call your API
- Attacker creates evil.com → calls your API → steals user data
- `credentials: true` (cookies) requires explicit origin anyway

**Runtime Validation:**

```typescript
if (env.NODE_ENV === "production" && CORS_ORIGIN.includes("*")) {
  throw new AppError(500, "CORS wildcard not allowed in production");
}
```

---

## 10. Logging & Observability

### Pino Logger vs Console.log

**Decision:** Use Pino structured logging instead of console.

**Why Not Console?**

```typescript
console.log("User logged in");
// No timestamp
// No log level
// No context (which user?)
// Hard to filter/search in production
```

**Pino Advantages:**

```typescript
logger.info("User logged in", { userId, email });
// {"level":"info","time":"2026-02-03T10:30:00.000Z",...}
// JSON format (parseable by log aggregators)
// Fast in typical workloads
```

### Log Levels Strategy

**ERROR:**

- Unexpected failures (bugs)
- Database connection lost
- Third-party API down
- **Action:** Page on-call engineer

**WARN:**

- Expected failures (handled gracefully)
- Rate limit triggered
- Invalid input rejected
- **Action:** Review daily

**INFO:**

- Important events (audit trail)
- User logged in
- Order placed
- **Action:** Dashboards/analytics

**DEBUG:**

- Verbose details (development)
- SQL queries executed
- HTTP requests/responses
- **Action:** Local troubleshooting only

### Security Event Logging

**Decision:** Separate security events from application logs.

```typescript
logger.security({
  type: "auth",
  action: "login_failed",
  userId: "user-123",
  ip: "192.168.1.100",
  details: { reason: "invalid_password" },
});
```

**Why Separate?**

- Send to SIEM (Security Information and Event Management)
- Alert on suspicious patterns (10 failed logins)
- Compliance requirements (audit trail)

**Events Logged:**

- All authentication attempts
- Permission denied (403)
- Rate limit triggered
- Token revocation
- 2FA events

### PII (Personal Identifiable Information) Redaction

**Decision:** Never log passwords, tokens, or sensitive data.

```typescript
redact: {
  paths: [
    'req.headers.authorization',  // JWT tokens
    'req.headers.cookie',          // Session cookies
    'req.body.password',           // User passwords
    'req.body.token',              // 2FA tokens
    'res.headers["set-cookie"]',   // Response cookies
  ],
  censor: '[REDACTED]'
}
```

**Why Redact?**

- Logs stored in plaintext (compromise = all tokens leaked)
- Compliance (GDPR, CCPA)
- Debugging doesn't need actual token values

---

## Summary: Key Engineering Principles

1. **Defense in Depth:** Multiple layers better than single strong layer
2. **Fail Secure:** If validation fails, reject (don't allow by default)
3. **Least Privilege:** Users/systems only access what they need
4. **Explicit Over Implicit:** Clear error messages, no magic defaults
5. **Type Safety:** Compile-time checks prevent runtime bugs
6. **Observability:** Log everything (except secrets) for debugging
7. **Graceful Degradation:** Service continues even if component fails
8. **Performance Trade-offs:** Favor security and maintainability over 5ms speed gains

---

**Next Steps:**

- See `DEBUG_LOGS.md` for intentional bugs and troubleshooting examples
- See `db-schema.md` for detailed database relationships
- See `SECURITY_CHECKLIST.md` for deployment hardening

**Questions?** Read the code comments inline - every security decision is documented at point of implementation.
