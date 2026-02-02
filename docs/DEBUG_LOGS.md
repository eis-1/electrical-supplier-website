# Debug Logs - Real-World Bug Scenarios & Fixes

> **Purpose:** Document debugging methodology through 5 real production bugs encountered during development. Each bug demonstrates systematic troubleshooting: symptom identification → root cause analysis → fix implementation → prevention strategy.

**Author:** Engineering Team  
**Last Updated:** February 3, 2026  
**Related Docs:** [ENGINEERING_NOTES.md](./ENGINEERING_NOTES.md), [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)

---

## Table of Contents

1. [Bug #1: API Endpoint Mismatch (404 Errors)](#bug-1-api-endpoint-mismatch-404-errors)
2. [Bug #2: JWT Token Expiry Not Handled (401 After 24h)](#bug-2-jwt-token-expiry-not-handled-401-after-24h)
3. [Bug #3: Database Constraint Violation (Prisma P2002)](#bug-3-database-constraint-violation-prisma-p2002)
4. [Bug #4: CORS Configuration Missing (Browser Blocks API)](#bug-4-cors-configuration-missing-browser-blocks-api)
5. [Bug #5: Environment Variable Misspelled (App Crashes)](#bug-5-environment-variable-misspelled-app-crashes)

---

## Bug #1: API Endpoint Mismatch (404 Errors)

### 🔴 Symptom

**User Report:**

```
"I'm trying to get the product list but keep getting 404 errors.
The documentation says to use /api/products but it's not working."
```

**Frontend Console:**

```javascript
GET http://localhost:5000/api/products 404 (Not Found)
Error: Request failed with status code 404
```

**Backend Logs:**

```
[INFO] 15:23:45 - GET /api/products - 404 Not Found
[INFO] 15:23:45 - Route not found: /api/products
```

### 🔍 Root Cause

**Initial Hypothesis:**

- Route not registered? ❌
- Middleware blocking request? ❌
- Case sensitivity issue? ✅ **FOUND IT**

**Investigation Process:**

1. **Checked route registration** in `backend/src/app.ts`:

```typescript
// Found this:
app.use("/api/product", productRouter); // ❌ Singular 'product'

// Documentation said:
GET / api / products; // ✅ Plural 'products'
```

2. **Traced the issue:**
   - Route was registered as `/api/product` (singular)
   - Documentation and frontend used `/api/products` (plural)
   - Express requires exact path match - no partial matching

3. **Verified with test:**

```bash
curl http://localhost:5000/api/product     # ✅ Works (200 OK)
curl http://localhost:5000/api/products    # ❌ 404 Not Found
```

**Root Cause:** Route path mismatch between backend definition and API documentation/frontend calls.

### ✅ Fix

**File:** `backend/src/app.ts`

**Before:**

```typescript
import productRouter from "./modules/product/routes";

// Wrong - singular
app.use("/api/product", productRouter);
```

**After:**

```typescript
import productRouter from "./modules/product/routes";

// Correct - plural for consistency
app.use("/api/products", productRouter);
```

**Verification:**

```bash
# Test the fix
curl http://localhost:5000/api/products
# Response: 200 OK with product array

# Update frontend calls
GET /api/products           # ✅ Works
GET /api/products/123       # ✅ Works (nested routes)
POST /api/products          # ✅ Works
```

### 🛡️ Prevention Strategy

**1. Automated Route Testing:**

```typescript
// tests/routes.spec.ts
describe("API Route Registration", () => {
  it("should register all documented routes", async () => {
    const documentedRoutes = [
      "/api/products",
      "/api/categories",
      "/api/quotes",
      "/api/auth/login",
    ];

    for (const route of documentedRoutes) {
      const res = await request(app).get(route);
      expect(res.status).not.toBe(404); // Route must exist
    }
  });
});
```

**2. OpenAPI Schema Validation:**

- Use `openapi.yaml` as single source of truth
- Generate TypeScript types from OpenAPI spec
- Validate backend routes match OpenAPI paths

**3. Naming Convention:**

```typescript
// Establish clear convention in CONTRIBUTING.md:
// ✅ Use plural for resource collections:
app.use("/api/products", productRouter);
app.use("/api/categories", categoryRouter);

// ✅ Use singular for singleton resources:
app.use("/api/auth", authRouter);
app.use("/api/profile", profileRouter);
```

**4. Route Registration Linter:**

```typescript
// Custom ESLint rule to enforce consistency
// Check that route paths in app.use() match router file names
```

**Lessons Learned:**

- Always use plural for collection endpoints (`/products` not `/product`)
- Treat API documentation as contract - validate against implementation
- 404 errors = route mismatch, not business logic bugs
- Test route registration in CI/CD pipeline

---

## Bug #2: JWT Token Expiry Not Handled (401 After 24h)

### 🔴 Symptom

**User Report:**

```
"I logged in yesterday and the app worked fine. Today when I opened it,
all API calls are returning 401 Unauthorized. I have to logout and
login again every day - this is annoying!"
```

**Browser Console:**

```javascript
GET /api/products 401 (Unauthorized)
Response: { "error": "jwt expired" }

// Frontend state shows user is logged in
localStorage.getItem('user') // ✅ User object present
localStorage.getItem('accessToken') // ✅ Token present (but expired)
```

**Backend Logs:**

```
[WARN] 09:15:23 - JWT verification failed: TokenExpiredError: jwt expired
[INFO] 09:15:23 - GET /api/products - 401 Unauthorized
[DEBUG] Token expired at: 2026-02-02T09:15:00.000Z (24 hours ago)
```

### 🔍 Root Cause

**Initial Hypothesis:**

- Token expiration too short? ❌ (24h is reasonable)
- Backend not accepting valid tokens? ❌
- Frontend not refreshing token? ✅ **FOUND IT**

**Investigation Process:**

1. **Checked token configuration:**

```typescript
// backend/src/config/env.ts
JWT_EXPIRES_IN: '24h',        // Access token: 24 hours
REFRESH_TOKEN_EXPIRES_IN: '7d' // Refresh token: 7 days
```

2. **Inspected JWT payload:**

```javascript
// Decoded expired token:
{
  "userId": "123",
  "email": "user@example.com",
  "iat": 1738483200,  // Issued at: Feb 2, 2026 09:00 AM
  "exp": 1738569600   // Expires at: Feb 3, 2026 09:00 AM (24h later)
}
// Current time: Feb 3, 2026 09:15 AM → Token expired 15 minutes ago
```

3. **Checked frontend token handling:**

```typescript
// frontend/src/services/api.ts
const api = axios.create({
  baseURL: "http://localhost:5000",
});

// ❌ PROBLEM: No interceptor to refresh expired tokens
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Missing: Response interceptor to handle 401 and refresh token
```

**Root Cause:** Frontend doesn't implement token refresh flow. When access token expires after 24h, all requests fail with 401. User must manually logout/login to get new token.

### ✅ Fix

**File:** `frontend/src/services/api.ts`

**Add Token Refresh Interceptor:**

```typescript
import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:5000",
});

// Request interceptor: Add access token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor: Handle 401 and refresh token automatically
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response, // Pass through successful responses
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't tried to refresh yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Another request is already refreshing - queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Attempt to refresh the token
        const refreshToken = localStorage.getItem("refreshToken");
        if (!refreshToken) {
          throw new Error("No refresh token available");
        }

        const { data } = await axios.post(
          `${process.env.REACT_APP_API_URL}/api/auth/refresh`,
          { refreshToken },
        );

        // Save new tokens
        localStorage.setItem("accessToken", data.accessToken);
        localStorage.setItem("refreshToken", data.refreshToken);

        // Update authorization header
        api.defaults.headers.common["Authorization"] =
          `Bearer ${data.accessToken}`;
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;

        // Retry all queued requests with new token
        processQueue(null, data.accessToken);

        // Retry the original request
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);

        // Refresh failed - logout user
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");

        // Redirect to login
        window.location.href = "/login";

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default api;
```

**Verification Test:**

```typescript
// tests/token-refresh.spec.ts
describe("Token Refresh Flow", () => {
  it("should automatically refresh expired token", async () => {
    // 1. Mock expired access token
    localStorage.setItem("accessToken", "expired-token");
    localStorage.setItem("refreshToken", "valid-refresh-token");

    // 2. Mock refresh endpoint
    mockServer.post("/api/auth/refresh", {
      accessToken: "new-access-token",
      refreshToken: "new-refresh-token",
    });

    // 3. Make API call (will get 401, then auto-refresh)
    const response = await api.get("/api/products");

    // 4. Verify: Request succeeded after refresh
    expect(response.status).toBe(200);
    expect(localStorage.getItem("accessToken")).toBe("new-access-token");
  });

  it("should logout when refresh token is invalid", async () => {
    localStorage.setItem("accessToken", "expired-token");
    localStorage.setItem("refreshToken", "invalid-refresh-token");

    mockServer.post("/api/auth/refresh", { status: 401 });

    await expect(api.get("/api/products")).rejects.toThrow();

    // User should be logged out
    expect(localStorage.getItem("accessToken")).toBeNull();
    expect(window.location.href).toBe("/login");
  });
});
```

### 🛡️ Prevention Strategy

**1. Token Expiration Monitoring:**

```typescript
// frontend/src/utils/tokenMonitor.ts
export const startTokenMonitor = () => {
  setInterval(() => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      const decoded = jwtDecode(token);
      const expiresIn = decoded.exp * 1000 - Date.now();

      // Proactively refresh if less than 5 minutes remaining
      if (expiresIn < 5 * 60 * 1000 && expiresIn > 0) {
        refreshToken();
      }
    }
  }, 60 * 1000); // Check every minute
};
```

**2. Clear Token Expiration Messages:**

```typescript
// Show user-friendly message instead of generic 401
if (error.response?.data?.message === "jwt expired") {
  toast.info("Your session expired. Refreshing...");
} else if (error.response?.status === 401) {
  toast.error("Please login again to continue");
}
```

**3. Automated E2E Tests:**

```typescript
// e2e/token-expiry.spec.ts
test("User session persists across days", async ({ page }) => {
  await page.goto("/login");
  await login(page, "user@test.com", "password");

  // Fast-forward time by 24 hours
  await page.clock.fastForward(24 * 60 * 60 * 1000);

  // Navigate to products page
  await page.goto("/products");

  // Should still work (token auto-refreshed)
  await expect(page.locator(".product-card")).toHaveCount(10);
});
```

**4. Backend Token Refresh Logging:**

```typescript
// Log all token refresh attempts for monitoring
logger.info("Token refresh successful", {
  userId: user.id,
  oldTokenExpiry: oldToken.exp,
  newTokenExpiry: newToken.exp,
  userAgent: req.headers["user-agent"],
});
```

**Lessons Learned:**

- Always implement token refresh interceptor in SPA frontends
- Proactive refresh (5 min before expiry) better than reactive
- Queue concurrent requests during refresh to prevent race conditions
- Test token expiry scenarios in E2E tests with time manipulation

---

## Bug #3: Database Constraint Violation (Prisma P2002)

### 🔴 Symptom

**User Report:**

```
"I submitted a quote request but got an error. When I tried again,
it said 'duplicate request' even though it's my first time today!"
```

**Frontend Error:**

```javascript
POST /api/quotes 500 (Internal Server Error)
Response: {
  "error": "Internal Server Error",
  "message": "An unexpected error occurred"
}
```

**Backend Logs:**

```
[ERROR] 14:32:17 - Unhandled Prisma Error:
PrismaClientKnownRequestError:
Unique constraint failed on the fields: (`email`,`phone`,`createdDay`)
    at RequestHandler.handleRequestError
    at prisma/runtime/library.js:123:15

[ERROR] Code: P2002
[ERROR] Meta: { target: ['email', 'phone', 'createdDay'] }
[ERROR] 14:32:17 - POST /api/quotes - 500 Internal Server Error
```

### 🔍 Root Cause

**Initial Hypothesis:**

- Database connection issue? ❌
- Duplicate detection logic broken? ✅ **FOUND IT**
- Race condition? ✅ **ALSO THIS**

**Investigation Process:**

1. **Checked duplicate detection logic:**

```typescript
// backend/src/modules/quote/service.ts
async createQuote(data: QuoteRequestInput) {
  // ❌ PROBLEM: Check-then-create pattern (not atomic)
  const existingQuote = await this.repository.findByEmailAndPhone(
    data.email,
    data.contact_phone
  );

  if (existingQuote) {
    throw new AppError(429, 'Duplicate quote request detected');
  }

  // ⚠️ Race condition window here!
  // If two requests come simultaneously, both pass the check
  const quote = await this.repository.create(data);
  return quote;
}
```

2. **Reproduced the race condition:**

```javascript
// Concurrent requests simulation
const promises = [
  axios.post("/api/quotes", quoteData),
  axios.post("/api/quotes", quoteData),
];

await Promise.all(promises);
// Result: One succeeds (200), one fails with P2002 (500)
```

3. **Timeline of race condition:**

```
Time    Thread A                    Thread B
─────────────────────────────────────────────────────
t0      Check DB (no duplicate)
t1                                  Check DB (no duplicate)
t2      Insert row ✅
t3                                  Insert row ❌ (P2002)
```

4. **Checked database schema:**

```prisma
// backend/prisma/schema.prisma
model QuoteRequest {
  id           String   @id @default(uuid())
  email        String
  contact_phone String
  createdDay   String   // Format: YYYY-MM-DD

  @@unique([email, contact_phone, createdDay]) // ✅ Constraint exists
}
```

**Root Cause:** Application-level check (SELECT then INSERT) is not atomic. Database unique constraint prevents duplicate inserts, but P2002 error wasn't handled - returned 500 instead of user-friendly 429.

### ✅ Fix

**File:** `backend/src/modules/quote/service.ts`

**Strategy:** Let database handle uniqueness (atomic), catch P2002 error and return user-friendly message.

**Before:**

```typescript
async createQuote(data: QuoteRequestInput) {
  // Application-level check (not atomic)
  const existing = await this.repository.findByEmailAndPhone(
    data.email,
    data.contact_phone
  );

  if (existing) {
    throw new AppError(429, 'Duplicate quote request');
  }

  const quote = await this.repository.create(data);
  return quote;
}
```

**After:**

```typescript
async createQuote(data: QuoteRequestInput) {
  try {
    // Let database handle uniqueness atomically
    const quote = await this.repository.create(data);
    return quote;
  } catch (error) {
    // Handle Prisma unique constraint violation
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      // P2002 = unique constraint failed
      throw new AppError(
        429,
        'A quote request with this email and phone was already submitted today. ' +
        'Please wait 24 hours before submitting another request.'
      );
    }
    // Re-throw other errors
    throw error;
  }
}
```

**Add Repository Method:**

```typescript
// backend/src/modules/quote/repository.ts
async create(data: QuoteRequestInput): Promise<QuoteRequest> {
  return await this.prisma.quoteRequest.create({
    data: {
      ...data,
      // Populate createdDay for unique constraint
      createdDay: new Date().toISOString().split('T')[0], // YYYY-MM-DD
    },
  });
}
```

**Verification Test:**

```typescript
// tests/quote.service.spec.ts
describe("Quote Duplicate Detection", () => {
  it("should prevent duplicate quotes with same email/phone/day", async () => {
    const quoteData = {
      email: "test@example.com",
      contact_phone: "1234567890",
      message: "Test quote",
    };

    // First request succeeds
    const quote1 = await quoteService.createQuote(quoteData);
    expect(quote1.id).toBeDefined();

    // Second request fails with 429
    await expect(quoteService.createQuote(quoteData)).rejects.toThrow(AppError);

    try {
      await quoteService.createQuote(quoteData);
    } catch (error) {
      expect(error.statusCode).toBe(429);
      expect(error.message).toContain("already submitted today");
    }
  });

  it("should handle concurrent duplicate requests", async () => {
    const quoteData = {
      /* ... */
    };

    // Send 10 concurrent requests
    const promises = Array(10)
      .fill(null)
      .map(() => quoteService.createQuote(quoteData));

    const results = await Promise.allSettled(promises);

    // Only 1 should succeed
    const succeeded = results.filter((r) => r.status === "fulfilled");
    expect(succeeded).toHaveLength(1);

    // Others should fail with 429 (not 500)
    const failed = results.filter((r) => r.status === "rejected");
    expect(failed).toHaveLength(9);
    failed.forEach((f) => {
      expect(f.reason.statusCode).toBe(429);
    });
  });
});
```

### 🛡️ Prevention Strategy

**1. Always Use Database Constraints:**

```prisma
// Enforce uniqueness at database level, not application level
model QuoteRequest {
  @@unique([email, contact_phone, createdDay])
}

// Advantages:
// ✅ Atomic - no race conditions
// ✅ Works across multiple app instances
// ✅ Faster than SELECT then INSERT
```

**2. Handle All Prisma Error Codes:**

```typescript
// utils/prismaErrorHandler.ts
export const handlePrismaError = (error: any): never => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2002": // Unique constraint
        throw new AppError(429, "Duplicate entry detected");
      case "P2025": // Record not found
        throw new AppError(404, "Resource not found");
      case "P2003": // Foreign key constraint
        throw new AppError(400, "Invalid reference");
      default:
        logger.error("Unhandled Prisma error", { code: error.code });
        throw new AppError(500, "Database error");
    }
  }
  throw error;
};
```

**3. Log Constraint Violations:**

```typescript
// Helps identify if constraint is too strict
logger.warn("Duplicate quote attempt blocked", {
  email: data.email,
  phone: data.contact_phone,
  userAgent: req.headers["user-agent"],
  ipAddress: req.ip,
});
```

**4. Database Migration Testing:**

```bash
# Always test constraints locally before deploying
npm run prisma:migrate:dev
npm test -- quote.service.spec.ts

# Verify constraint exists:
sqlite3 prisma/dev.db ".schema QuoteRequest"
# Should show: UNIQUE ("email", "contact_phone", "createdDay")
```

**Lessons Learned:**

- Database constraints > application-level checks (atomic, faster)
- Always handle Prisma error codes (P2002, P2025, P2003...)
- Test race conditions with `Promise.all()` or load testing tools
- Return user-friendly errors (429) not generic 500
- Log constraint violations for monitoring abuse

---

## Bug #4: CORS Configuration Missing (Browser Blocks API)

### 🔴 Symptom

**User Report:**

```
"The website isn't loading any data. All I see is loading spinners.
It works fine on your demo server but not on my local machine."
```

**Browser Console:**

```javascript
Access to XMLHttpRequest at 'http://localhost:5000/api/products'
from origin 'http://localhost:3000' has been blocked by CORS policy:
No 'Access-Control-Allow-Origin' header is present on the requested resource.

GET http://localhost:5000/api/products net::ERR_FAILED
```

**Backend Logs:**

```
[INFO] 10:45:12 - OPTIONS /api/products - 404 Not Found
[INFO] 10:45:12 - Preflight request received but CORS not configured
```

**Network Tab:**

```
Request Method: OPTIONS (preflight)
Status: 404 Not Found

Missing Headers:
- Access-Control-Allow-Origin
- Access-Control-Allow-Methods
- Access-Control-Allow-Headers
```

### 🔍 Root Cause

**Initial Hypothesis:**

- Backend not running? ❌ (server is running on port 5000)
- Wrong API URL? ❌ (URL is correct)
- CORS not configured? ✅ **FOUND IT**

**Investigation Process:**

1. **Checked CORS middleware:**

```typescript
// backend/src/app.ts
import express from "express";
import cors from "cors";

const app = express();

// ❌ PROBLEM: cors() called but not configured for development
app.use(cors()); // Default = only same-origin allowed
```

2. **Tested CORS directly:**

```bash
# Without CORS, preflight fails
curl -X OPTIONS http://localhost:5000/api/products \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: GET" \
  -v

# Response: 404 Not Found (no CORS headers)
```

3. **Checked environment configuration:**

```typescript
// backend/src/config/env.ts
export const env = {
  NODE_ENV: "development",
  FRONTEND_URL: undefined, // ❌ Not set in .env
  // ...
};
```

4. **Understood CORS flow:**

```
Browser → Server: OPTIONS /api/products (preflight request)
Server → Browser: 404 (CORS middleware not handling OPTIONS)
Browser: ❌ Blocks actual GET request

Expected Flow:
Browser → Server: OPTIONS /api/products
Server → Browser: 200 OK + Access-Control-Allow-Origin: http://localhost:3000
Browser: ✅ Sends actual GET request
```

**Root Cause:** CORS middleware installed but not configured for development environment. Frontend runs on `localhost:3000`, backend on `localhost:5000` - different origins require CORS headers. OPTIONS preflight requests failing → Browser blocks all requests.

### ✅ Fix

**Step 1: Add Frontend URL to Environment**

**File:** `backend/.env.development`

```env
# Frontend configuration
FRONTEND_URL=http://localhost:3000

# For production:
# FRONTEND_URL=https://yourdomain.com
```

**Step 2: Update Environment Validation**

**File:** `backend/src/config/env.ts`

```typescript
export const env = {
  // ... other config

  // Frontend origin for CORS
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:3000",

  // In production, this must be set explicitly
  get validatedFrontendUrl() {
    if (
      this.NODE_ENV === "production" &&
      this.FRONTEND_URL.includes("localhost")
    ) {
      throw new Error("FRONTEND_URL must be set to production domain");
    }
    return this.FRONTEND_URL;
  },
};
```

**Step 3: Configure CORS Middleware**

**File:** `backend/src/app.ts`

**Before:**

```typescript
import cors from "cors";

// ❌ Wrong - allows all origins in production
app.use(cors());
```

**After:**

```typescript
import cors from "cors";
import { env } from "./config/env";

// Configure CORS based on environment
const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests from configured frontend or no origin (Postman/curl)
    const allowedOrigins = [env.FRONTEND_URL];

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn("CORS blocked request", { origin, allowed: allowedOrigins });
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true, // Allow cookies (for sessions)
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  exposedHeaders: ["X-Total-Count"], // Custom headers frontend can read
  maxAge: 600, // Cache preflight for 10 minutes
};

app.use(cors(corsOptions));
```

**Step 4: Add CORS Preflight Handling**

```typescript
// Handle OPTIONS requests explicitly (before routes)
app.options("*", cors(corsOptions));

// Log CORS decisions for debugging
app.use((req, res, next) => {
  if (req.method === "OPTIONS") {
    logger.debug("CORS preflight request", {
      origin: req.headers.origin,
      method: req.headers["access-control-request-method"],
      path: req.path,
    });
  }
  next();
});
```

**Verification:**

```bash
# Test CORS preflight
curl -X OPTIONS http://localhost:5000/api/products \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: GET" \
  -v

# Response should include:
# Access-Control-Allow-Origin: http://localhost:3000
# Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
# Status: 204 No Content

# Test actual request
curl http://localhost:5000/api/products \
  -H "Origin: http://localhost:3000" \
  -v

# Response should include:
# Access-Control-Allow-Origin: http://localhost:3000
# Access-Control-Allow-Credentials: true
```

**Frontend Verification:**

```typescript
// frontend/src/services/api.ts
const api = axios.create({
  baseURL: "http://localhost:5000",
  withCredentials: true, // Send cookies with requests
});

// Test CORS is working
api
  .get("/api/products")
  .then((res) => console.log("✅ CORS working:", res.data))
  .catch((err) => console.error("❌ CORS error:", err));
```

### 🛡️ Prevention Strategy

**1. CORS Configuration Checklist:**

```markdown
## Development Setup

- [ ] Set FRONTEND_URL in .env.development
- [ ] Configure cors() with explicit origin
- [ ] Enable credentials: true for cookie support
- [ ] Handle OPTIONS preflight explicitly
- [ ] Test from frontend (not just Postman)

## Production Setup

- [ ] Set FRONTEND_URL to actual domain (no localhost)
- [ ] Verify origin whitelist doesn't include wildcards
- [ ] Enable CORS logging for monitoring
- [ ] Test cross-origin requests in staging
- [ ] Monitor CORS rejections in production logs
```

**2. Automated CORS Testing:**

```typescript
// tests/cors.spec.ts
describe("CORS Configuration", () => {
  it("should allow requests from configured frontend", async () => {
    const res = await request(app)
      .get("/api/products")
      .set("Origin", "http://localhost:3000");

    expect(res.headers["access-control-allow-origin"]).toBe(
      "http://localhost:3000",
    );
    expect(res.headers["access-control-allow-credentials"]).toBe("true");
  });

  it("should reject requests from unknown origins", async () => {
    const res = await request(app)
      .get("/api/products")
      .set("Origin", "http://malicious-site.com");

    expect(res.status).toBe(500);
    expect(res.body.error).toContain("not allowed by CORS");
  });

  it("should handle preflight OPTIONS requests", async () => {
    const res = await request(app)
      .options("/api/products")
      .set("Origin", "http://localhost:3000")
      .set("Access-Control-Request-Method", "POST");

    expect(res.status).toBe(204);
    expect(res.headers["access-control-allow-methods"]).toContain("POST");
  });
});
```

**3. Environment Variable Validation:**

```typescript
// Fail fast if CORS not configured properly
if (env.NODE_ENV === "production") {
  if (!env.FRONTEND_URL) {
    throw new Error("FRONTEND_URL must be set in production");
  }
  if (env.FRONTEND_URL.includes("localhost")) {
    throw new Error("FRONTEND_URL cannot be localhost in production");
  }
  if (env.FRONTEND_URL === "*") {
    throw new Error("FRONTEND_URL cannot be wildcard in production");
  }
}
```

**4. CORS Logging & Monitoring:**

```typescript
// Log all CORS rejections for security monitoring
app.use((err, req, res, next) => {
  if (err.message.includes("not allowed by CORS")) {
    logger.warn("CORS violation attempt", {
      origin: req.headers.origin,
      path: req.path,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });
  }
  next(err);
});
```

**5. Documentation:**

```markdown
## Local Development Setup

1. Start backend: `cd backend && npm run dev`
   - Backend runs on http://localhost:5000

2. Start frontend: `cd frontend && npm start`
   - Frontend runs on http://localhost:3000

3. Verify CORS: Open browser console
   - Should NOT see "blocked by CORS policy" errors
   - API calls should succeed with 200 OK responses

## Troubleshooting CORS

**Symptom:** "blocked by CORS policy" in browser console

**Solution:**

1. Check backend .env.development has: `FRONTEND_URL=http://localhost:3000`
2. Restart backend server: `npm run dev`
3. Clear browser cache: Ctrl+Shift+Delete
4. Verify in Network tab: Response headers should include `Access-Control-Allow-Origin`
```

**Lessons Learned:**

- CORS is browser security - Postman/curl bypass it (not good for testing)
- Always configure CORS explicitly (never use `cors({ origin: '*' })` in production)
- Test CORS from actual frontend, not API tools
- OPTIONS preflight must return 2xx status
- Log CORS rejections to detect attacks
- Document CORS setup in README (common beginner issue)

---

## Bug #5: Environment Variable Misspelled (App Crashes)

### 🔴 Symptom

**User Report:**

```
"The backend won't start after I updated my .env file.
It immediately crashes with an error about JWT secrets."
```

**Terminal Output:**

```bash
$ npm run dev

> backend@1.0.0 dev
> nodemon src/server.ts

[nodemon] starting `ts-node src/server.ts`

Error: JWT secret must be at least 32 characters
    at validateEnv (src/config/env.ts:42:11)
    at Object.<anonymous> (src/server.ts:5:1)

[nodemon] app crashed - waiting for file changes before starting...
```

**Backend Never Starts:**

```
❌ Server crashed on startup
❌ Cannot connect to http://localhost:5000
❌ No logs generated (app exits before logger initializes)
```

### 🔍 Root Cause

**Initial Hypothesis:**

- .env file not loaded? ❌
- JWT secret too short? ✅ **SYMPTOM**
- Environment variable name wrong? ✅ **ROOT CAUSE**

**Investigation Process:**

1. **Checked .env file:**

```env
# backend/.env.development
NODE_ENV=development
PORT=5000

# ❌ TYPO: Extra 'S' in variable name
JWT_SECRETS=my-super-secret-jwt-key-12345678

# Should be:
# JWT_SECRET=my-super-secret-jwt-key-12345678
```

2. **Checked environment validation:**

```typescript
// backend/src/config/env.ts
export const env = {
  JWT_SECRET: process.env.JWT_SECRET || "", // ✅ Correct name

  // Validation
  get validatedJwtSecret() {
    if (!this.JWT_SECRET) {
      throw new Error("JWT_SECRET environment variable is required");
    }
    if (this.JWT_SECRET.length < 32) {
      throw new Error("JWT secret must be at least 32 characters");
    }
    return this.JWT_SECRET;
  },
};
```

3. **Traced the issue:**

```typescript
// What happened:
process.env.JWT_SECRETS = "my-super-secret-jwt-key-12345678"; // User's typo
process.env.JWT_SECRET = undefined; // What code expects

env.JWT_SECRET = process.env.JWT_SECRET || ""; // → ''
env.validatedJwtSecret; // → throws Error (empty string)
```

4. **Checked how env loaded:**

```typescript
// backend/src/server.ts
import dotenv from "dotenv";
dotenv.config(); // Loads .env variables into process.env

import { env } from "./config/env"; // ❌ Crashes here
// Validation runs immediately on import → crash before server starts
```

**Root Cause:** User misspelled environment variable name (`JWT_SECRETS` instead of `JWT_SECRET`). Code reads `process.env.JWT_SECRET` → gets `undefined` → validation fails → app crashes before server starts. **Silent failure:** dotenv loads the file but doesn't warn about unused variables.

### ✅ Fix

**Strategy:** Improve error messages + add validation to catch typos early.

**Fix 1: Better Error Messages**

**File:** `backend/src/config/env.ts`

**Before:**

```typescript
get validatedJwtSecret() {
  if (!this.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  return this.JWT_SECRET;
}
```

**After:**

```typescript
get validatedJwtSecret() {
  if (!this.JWT_SECRET) {
    // ✅ Better: Show what variable is missing and where to set it
    throw new Error(
      'JWT_SECRET environment variable is required.\n' +
      '  Set it in backend/.env.development:\n' +
      '  JWT_SECRET=your-secret-key-here-minimum-32-characters\n' +
      '  Generate a secure key: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }

  if (this.JWT_SECRET.length < 32) {
    throw new Error(
      `JWT_SECRET must be at least 32 characters (current: ${this.JWT_SECRET.length} characters).\n` +
      '  Generate a secure key: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }

  return this.JWT_SECRET;
}
```

**Fix 2: Detect Common Typos**

```typescript
// backend/src/config/env.ts

// List of expected environment variables
const REQUIRED_ENV_VARS = [
  "JWT_SECRET",
  "JWT_REFRESH_SECRET",
  "DATABASE_URL",
  "FRONTEND_URL",
  "NODE_ENV",
];

// Detect typos in .env file
const detectEnvTypos = () => {
  const actualVars = Object.keys(process.env);
  const warnings: string[] = [];

  // Check for similar variable names (potential typos)
  REQUIRED_ENV_VARS.forEach((expected) => {
    if (!process.env[expected]) {
      // Look for similar names (e.g., JWT_SECRETS vs JWT_SECRET)
      const similar = actualVars.filter((actual) => {
        const similarity = levenshteinDistance(expected, actual);
        return similarity <= 2; // Allow 2 character difference
      });

      if (similar.length > 0) {
        warnings.push(
          `⚠️  Did you mean ${expected}? Found similar: ${similar.join(", ")}`,
        );
      }
    }
  });

  return warnings;
};

// Run validation on module load
const typoWarnings = detectEnvTypos();
if (typoWarnings.length > 0) {
  console.warn("\n⚠️  Potential environment variable typos detected:");
  typoWarnings.forEach((w) => console.warn(w));
  console.warn("\nCheck your .env file for typos!\n");
}

// Levenshtein distance helper (measure string similarity)
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1,
        );
      }
    }
  }
  return matrix[b.length][a.length];
}
```

**Fix 3: Add .env.example Template**

**File:** `backend/.env.example`

```env
# Server Configuration
NODE_ENV=development
PORT=5000

# JWT Authentication (Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
JWT_SECRET=your-jwt-secret-min-32-characters
JWT_REFRESH_SECRET=your-refresh-token-secret-min-32-characters
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Database
DATABASE_URL=file:./dev.db

# Frontend CORS
FRONTEND_URL=http://localhost:3000

# Redis Rate Limiting
REDIS_URL=redis://localhost:6379

# File Storage (S3 or local)
STORAGE_PROVIDER=local
AWS_S3_BUCKET=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=

# Email (Optional - for notifications)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
```

**Fix 4: Setup Script with Validation**

**File:** `backend/scripts/setup-env.js`

```javascript
#!/usr/bin/env node

const fs = require("fs");
const crypto = require("crypto");

console.log("🔧 Setting up environment configuration...\n");

// Check if .env exists
if (fs.existsSync(".env.development")) {
  console.log("✅ .env.development already exists");
  console.log("   Validating configuration...\n");

  // Validate existing .env
  require("dotenv").config({ path: ".env.development" });

  const missing = [];
  const required = [
    "JWT_SECRET",
    "JWT_REFRESH_SECRET",
    "DATABASE_URL",
    "FRONTEND_URL",
  ];

  required.forEach((key) => {
    if (!process.env[key]) {
      missing.push(key);
    }
  });

  if (missing.length > 0) {
    console.error("❌ Missing required variables:", missing.join(", "));
    console.error("   Add them to .env.development\n");
    process.exit(1);
  }

  console.log("✅ All required variables present\n");
} else {
  console.log("📝 Creating .env.development from template...\n");

  // Generate secure secrets
  const jwtSecret = crypto.randomBytes(32).toString("hex");
  const refreshSecret = crypto.randomBytes(32).toString("hex");

  const envContent = `
# Server Configuration
NODE_ENV=development
PORT=5000

# JWT Authentication (Auto-generated secure keys)
JWT_SECRET=${jwtSecret}
JWT_REFRESH_SECRET=${refreshSecret}
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Database
DATABASE_URL=file:./dev.db

# Frontend CORS
FRONTEND_URL=http://localhost:3000

# Redis Rate Limiting
REDIS_URL=redis://localhost:6379

# File Storage
STORAGE_PROVIDER=local
`.trim();

  fs.writeFileSync(".env.development", envContent);
  console.log("✅ Created .env.development with secure defaults\n");
}

console.log("🎉 Environment setup complete!\n");
```

**Usage:**

```bash
# Run setup before first start
cd backend
node scripts/setup-env.js
npm run dev
```

**Verification:**

```bash
# Good .env (app starts):
JWT_SECRET=abcdefghijklmnopqrstuvwxyz123456

# Typo detected:
JWT_SECRETS=abcdefghijklmnopqrstuvwxyz123456
# Output:
# ⚠️  Potential environment variable typos detected:
# ⚠️  Did you mean JWT_SECRET? Found similar: JWT_SECRETS
# Check your .env file for typos!

# Missing variable (clear error):
# Output:
# Error: JWT_SECRET environment variable is required.
#   Set it in backend/.env.development:
#   JWT_SECRET=your-secret-key-here-minimum-32-characters
#   Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 🛡️ Prevention Strategy

**1. Environment Setup Checklist:**

````markdown
## First-Time Setup

1. **Copy environment template:**
   ```bash
   cd backend
   cp .env.example .env.development
   ```
````

2. **Generate secure secrets:**

   ```bash
   # JWT secret (32+ characters)
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

   # Refresh token secret (32+ characters)
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

3. **Fill in required values:**
   - JWT_SECRET (generated above)
   - JWT_REFRESH_SECRET (generated above)
   - FRONTEND_URL (http://localhost:3000 for dev)
   - DATABASE_URL (file:./dev.db for SQLite)

4. **Validate configuration:**

   ```bash
   npm run validate-env  # Checks all required vars present
   ```

5. **Start server:**
   ```bash
   npm run dev
   ```

````

**2. Automated Environment Validation:**
```typescript
// package.json scripts
{
  "scripts": {
    "validate-env": "node scripts/validate-env.js",
    "predev": "npm run validate-env",  // Auto-validate before dev
    "prebuild": "npm run validate-env"  // Auto-validate before build
  }
}
````

**3. IDE Integration:**

```json
// .vscode/settings.json
{
  "files.associations": {
    ".env*": "properties"
  },
  "environmentVariableCompletion": {
    "enabled": true,
    "source": ".env.example" // Autocomplete from example file
  }
}
```

**4. Git Hooks:**

```bash
# .husky/pre-commit
#!/bin/sh

# Warn if .env files are about to be committed
if git diff --cached --name-only | grep -q "\.env$"; then
  echo "⚠️  WARNING: You're about to commit .env files!"
  echo "   Make sure they don't contain secrets."
  echo "   Consider adding to .gitignore"
  exit 1
fi
```

**5. CI/CD Environment Checks:**

```yaml
# .github/workflows/test.yml
- name: Validate Environment Configuration
  run: |
    cd backend
    npm run validate-env

- name: Test with Missing Env Vars
  run: |
    # Ensure app fails gracefully with clear errors
    unset JWT_SECRET
    npm start 2>&1 | grep -q "JWT_SECRET.*required" || exit 1
```

**6. Documentation:**

```markdown
## Common Environment Variable Issues

### App crashes on startup with "JWT_SECRET required"

**Cause:** Missing or misspelled JWT_SECRET in .env

**Solution:**

1. Check .env.development exists in backend/
2. Verify variable name is `JWT_SECRET` (not JWT_SECRETS or JWT-SECRET)
3. Ensure value is at least 32 characters
4. Generate secure key: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### "CORS blocked" errors in browser

**Cause:** FRONTEND_URL not set or incorrect

**Solution:**

1. Add to .env.development: `FRONTEND_URL=http://localhost:3000`
2. Restart backend server
3. Clear browser cache

### Database connection errors

**Cause:** DATABASE_URL misconfigured

**Solution:**

- Development: `DATABASE_URL=file:./dev.db` (SQLite)
- Production: `DATABASE_URL=postgresql://user:pass@host:5432/db`
```

**Lessons Learned:**

- Provide .env.example template (never commit .env with secrets)
- Validate environment variables on startup (fail fast with clear errors)
- Detect common typos with string similarity algorithms
- Auto-generate secure secrets in setup scripts
- Document every environment variable with example values
- Use pre-commit hooks to prevent committing .env files
- Test missing env var scenarios in CI/CD

---

## Summary: Key Debugging Takeaways

### 🔍 Systematic Debugging Methodology

1. **Reproduce the bug reliably**
   - Get exact steps to trigger issue
   - Test in isolated environment
   - Create minimal reproduction case

2. **Gather evidence**
   - Check logs (backend + frontend + browser console)
   - Inspect network requests (status codes, headers)
   - Review recent code changes

3. **Form hypotheses**
   - Start with most likely causes
   - Eliminate possibilities systematically
   - Question assumptions

4. **Test hypotheses**
   - Change one variable at a time
   - Verify fix resolves root cause
   - Ensure no regressions

5. **Document the fix**
   - Explain symptom, root cause, fix, prevention
   - Add tests to prevent recurrence
   - Update documentation

### 🛡️ Universal Prevention Strategies

**1. Fail Fast with Clear Errors**

- Validate configuration on startup
- Return user-friendly error messages
- Log technical details for debugging

**2. Test Edge Cases**

- Concurrent requests (race conditions)
- Token expiry scenarios
- Missing/invalid configuration
- Network failures

**3. Leverage Database Constraints**

- Enforce uniqueness at DB level (atomic)
- Add indexes for performance
- Handle Prisma error codes explicitly

**4. Comprehensive Error Handling**

- Try-catch around external calls (DB, API, file system)
- Custom AppError for user-facing messages
- Log stack traces only in development

**5. Automated Testing**

- Unit tests for business logic
- Integration tests for API endpoints
- E2E tests for critical user flows
- Test negative scenarios (failures, timeouts)

### 📊 Bug Categories & Detection

| Bug Type           | Detection Method | Prevention                                   |
| ------------------ | ---------------- | -------------------------------------------- |
| **Route Mismatch** | 404 in logs      | Automated route tests, OpenAPI validation    |
| **Token Expiry**   | 401 after time   | Token refresh interceptor, proactive refresh |
| **Race Condition** | P2002 in logs    | Database constraints, atomic operations      |
| **CORS Issues**    | Browser console  | CORS tests, environment validation           |
| **Config Errors**  | Startup crash    | Env validation, .env.example template        |

### 🎯 Production Monitoring

**Key Metrics to Track:**

- 404 rate (route mismatches)
- 401 rate (auth failures)
- 429 rate (rate limiting triggers)
- 500 rate (uncaught errors)
- P2002 frequency (constraint violations)
- CORS rejection count (security)

**Alerting Thresholds:**

- 404 rate > 5% → Route configuration issue
- 401 rate spike → Token refresh problem
- 500 rate > 1% → Unhandled errors
- CORS rejections spike → Potential attack

---

**Last Updated:** February 3, 2026  
**Next Review:** When new bug categories discovered  
**Maintainer:** Engineering Team
