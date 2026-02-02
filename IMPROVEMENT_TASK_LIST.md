# Project Improvement Task List

**Created:** February 3, 2026  
**Status:** Planning Phase  
**Total Tasks:** 47 tasks across 6 categories

---

## 📋 Task Categories

1. **Critical Security Fixes** (4 tasks) - Fix today
2. **High Priority Security** (8 tasks) - This week
3. **Code Quality Improvements** (12 tasks) - This week
4. **Documentation Cleanup** (10 tasks) - This week
5. **Engineering Ownership Proof** (8 tasks) - Within 2 weeks
6. **Production Readiness** (5 tasks) - Within 2 weeks

---

## 🚨 PHASE 1: Critical Security Fixes (Fix Today)

### Task 1.1: Replace Generic Error Throws with AppError

**Priority:** CRITICAL  
**Estimated Time:** 2-3 hours  
**Files to Fix:** 16 files

**Subtasks:**

- [ ] 1.1.1 - Fix `backend/src/utils/storage.service.ts` (Lines 175, 199, 248, 271)
  - Replace 4 occurrences of `throw new Error()` with `AppError`
- [ ] 1.1.2 - Fix `backend/src/utils/malware.service.ts` (Line 118)
  - Replace unknown provider error with `AppError`
- [ ] 1.1.3 - Fix `backend/src/modules/auth/twoFactor.service.ts` (Lines 40, 163)
  - Replace QR code and decryption errors with `AppError`
- [ ] 1.1.4 - Fix `backend/src/config/env.ts` (Lines 133, 145, 151, 157, 279)
  - Replace environment validation errors with `AppError`
- [ ] 1.1.5 - Fix `backend/src/middlewares/rateLimit.middleware.ts` (Lines 255, 264, 273, 282)
  - Replace rate limiter initialization errors with `AppError`
- [ ] 1.1.6 - Run tests after each fix to verify no breakage
- [ ] 1.1.7 - Test error responses return clean JSON (no stack traces)

**Verification:**

```bash
# Search for remaining generic errors
grep -r "throw new Error\|throw Error" backend/src --include="*.ts" --exclude-dir=node_modules
```

---

### Task 1.2: Implement Refresh Token Blacklist on Logout

**Priority:** CRITICAL  
**Estimated Time:** 2 hours

**Subtasks:**

- [ ] 1.2.1 - Create `RefreshToken` Prisma model with fields:
  - `id`, `token`, `adminId`, `isRevoked`, `expiresAt`, `createdAt`
- [ ] 1.2.2 - Generate and run Prisma migration
  - `npx prisma migrate dev --name add-refresh-token-model`
- [ ] 1.2.3 - Update `AuthService.login()` to save refresh token to database
- [ ] 1.2.4 - Update `AuthService.refresh()` to check if token is revoked
- [ ] 1.2.5 - Create `AuthService.invalidateRefreshToken(token)` method
- [ ] 1.2.6 - Update `AuthController.logout()` to call invalidate method
- [ ] 1.2.7 - Add cleanup job to delete expired tokens (optional cron)
- [ ] 1.2.8 - Write tests for token revocation flow
- [ ] 1.2.9 - Test: Login → Logout → Try to refresh with old token → Should fail

**Verification:**

```bash
# Test flow
1. Login (get refresh token)
2. Call /auth/logout
3. Try /auth/refresh with old token
4. Should return 401 Unauthorized
```

---

### Task 1.3: Fix Race Condition in Quote Duplicate Detection

**Priority:** CRITICAL  
**Estimated Time:** 2-3 hours

**Subtasks:**

- [ ] 1.3.1 - Add unique constraint to Prisma schema:
  ```prisma
  @@unique([email, phone, createdAtDay])
  ```
- [ ] 1.3.2 - Add `createdAtDay` computed field (YYYY-MM-DD format)
- [ ] 1.3.3 - Generate and run migration
- [ ] 1.3.4 - Update `QuoteService.createQuote()` to handle unique constraint error
- [ ] 1.3.5 - Catch Prisma `P2002` error and throw 429 with clear message
- [ ] 1.3.6 - Write concurrent request test:
  ```javascript
  Promise.all([
    createQuote(sameData),
    createQuote(sameData),
    createQuote(sameData),
  ]);
  // Only 1 should succeed
  ```
- [ ] 1.3.7 - Remove old duplicate check code (now handled by DB)
- [ ] 1.3.8 - Update documentation to reflect database-level protection

**Alternative Approach (if constraint not feasible):**

- [ ] 1.3.1-alt - Use Redis `SET NX` for atomic duplicate check
- [ ] 1.3.2-alt - Key format: `quote:dedup:{email}:{phone}:{date}`
- [ ] 1.3.3-alt - TTL: 24 hours
- [ ] 1.3.4-alt - Test concurrent requests with Redis lock

---

### Task 1.4: Add Request Size Limits to Express

**Priority:** HIGH  
**Estimated Time:** 30 minutes

**Subtasks:**

- [ ] 1.4.1 - Open `backend/src/server.ts` or app initialization file
- [ ] 1.4.2 - Add limits to JSON parser:
  ```typescript
  app.use(express.json({ limit: "10kb" }));
  ```
- [ ] 1.4.3 - Add limits to URL-encoded parser:
  ```typescript
  app.use(express.urlencoded({ extended: true, limit: "10kb" }));
  ```
- [ ] 1.4.4 - Update multer file upload limit (already 10MB, verify)
- [ ] 1.4.5 - Test: Send 11kb JSON payload → Should return 413 Payload Too Large
- [ ] 1.4.6 - Document limits in API documentation

---

## ⚡ PHASE 2: High Priority Security (This Week)

### Task 2.1: Replace All process.env with env Config

**Priority:** HIGH  
**Estimated Time:** 3 hours  
**Files:** 16 files

**Subtasks:**

- [ ] 2.1.1 - Fix `backend/src/utils/logger.ts` (5 occurrences)
- [ ] 2.1.2 - Fix `backend/src/middlewares/error.middleware.ts` (1 occurrence)
- [ ] 2.1.3 - Fix `backend/src/middlewares/csrf.middleware.ts` (2 occurrences)
- [ ] 2.1.4 - Fix `backend/src/config/sentry.ts` (5 occurrences)
- [ ] 2.1.5 - Fix `backend/src/config/db.ts` (1 occurrence)
- [ ] 2.1.6 - Fix `backend/src/config/env.ts` (2 occurrences - self-reference okay)
- [ ] 2.1.7 - Run full test suite to verify no crashes
- [ ] 2.1.8 - Document pattern in ENGINEERING_NOTES.md

**Verification:**

```bash
# Find remaining direct process.env access
grep -r "process\.env\." backend/src --include="*.ts" | grep -v "env.ts" | grep -v "config/env"
```

---

### Task 2.2: Add Input Validation to All Controllers

**Priority:** HIGH  
**Estimated Time:** 4 hours

**Subtasks:**

- [ ] 2.2.1 - Create validation helper: `sanitizeObject(obj)` to prevent prototype pollution
- [ ] 2.2.2 - Add validation to `ProductController.create()`
- [ ] 2.2.3 - Add validation to `ProductController.update()`
- [ ] 2.2.4 - Add validation to `CategoryController.create()`
- [ ] 2.2.5 - Add validation to `CategoryController.update()`
- [ ] 2.2.6 - Add validation to `BrandController.create()`
- [ ] 2.2.7 - Add validation to `BrandController.update()`
- [ ] 2.2.8 - Add validation to `QuoteController.create()`
- [ ] 2.2.9 - Test: Send `{"__proto__": {"isAdmin": true}}` → Should be rejected
- [ ] 2.2.10 - Test: Send nested malicious payload → Should be sanitized

---

### Task 2.3: Verify and Enhance Helmet Security Headers

**Priority:** HIGH  
**Estimated Time:** 1 hour

**Subtasks:**

- [ ] 2.3.1 - Find helmet configuration in `server.ts`
- [ ] 2.3.2 - Verify all headers are configured:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `X-XSS-Protection: 1; mode=block`
  - `Strict-Transport-Security` (HSTS)
  - `Content-Security-Policy`
- [ ] 2.3.3 - Run security headers test:
  ```bash
  curl -I http://localhost:5000/api/health
  ```
- [ ] 2.3.4 - Document headers in SECURITY.md

---

### Task 2.4: Add Database Indexes for Performance

**Priority:** MEDIUM  
**Estimated Time:** 2 hours

**Subtasks:**

- [ ] 2.4.1 - Add indexes to Prisma schema:
  ```prisma
  @@index([slug]) // Product, Category, Brand
  @@index([email]) // QuoteRequest, Admin
  @@index([createdAt]) // QuoteRequest for date filtering
  @@index([status]) // QuoteRequest for status filtering
  ```
- [ ] 2.4.2 - Generate migration
- [ ] 2.4.3 - Test query performance before/after
- [ ] 2.4.4 - Document indexing strategy in db-schema.md

---

### Task 2.5: Implement Token Rotation on Refresh

**Priority:** MEDIUM  
**Estimated Time:** 2 hours

**Subtasks:**

- [ ] 2.5.1 - Update `AuthService.refresh()` to:
  - Invalidate old refresh token
  - Generate new refresh token
  - Return both new access + new refresh token
- [ ] 2.5.2 - Update frontend to handle new refresh token
- [ ] 2.5.3 - Test: Refresh → Old token no longer works
- [ ] 2.5.4 - Document rotation strategy in ENGINEERING_NOTES.md

---

### Task 2.6: Add Device/Session Tracking

**Priority:** LOW  
**Estimated Time:** 3 hours

**Subtasks:**

- [ ] 2.6.1 - Add fields to RefreshToken model:
  - `deviceName`, `ipAddress`, `userAgent`, `lastUsedAt`
- [ ] 2.6.2 - Capture device info on login
- [ ] 2.6.3 - Create endpoint: `GET /auth/sessions` (list active sessions)
- [ ] 2.6.4 - Create endpoint: `DELETE /auth/sessions/:id` (revoke device)
- [ ] 2.6.5 - Add admin UI to view/revoke sessions
- [ ] 2.6.6 - Test multi-device scenario

---

### Task 2.7: Add SQL Injection Protection Audit

**Priority:** MEDIUM  
**Estimated Time:** 1 hour

**Subtasks:**

- [ ] 2.7.1 - Search for raw SQL queries:
  ```bash
  grep -r "\$queryRaw\|\$executeRaw" backend/src
  ```
- [ ] 2.7.2 - If found, ensure parameters are properly escaped
- [ ] 2.7.3 - Document: "No raw SQL used, Prisma handles escaping"
- [ ] 2.7.4 - Add test for SQL injection attempt

---

### Task 2.8: Improve File Upload Security

**Priority:** MEDIUM  
**Estimated Time:** 2 hours

**Subtasks:**

- [ ] 2.8.1 - Sanitize full filename (not just extension):
  ```typescript
  const baseName = path
    .basename(file.originalname, ext)
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .substring(0, 100);
  ```
- [ ] 2.8.2 - Add per-user upload limits (e.g., 10 files per hour)
- [ ] 2.8.3 - Add cleanup job for orphaned temp files
- [ ] 2.8.4 - Make malware scanning fail_closed by default
- [ ] 2.8.5 - Document file upload security in ENGINEERING_NOTES.md

---

## 🔧 PHASE 3: Code Quality Improvements (This Week)

### Task 3.1: Enforce Function Length Limits

**Priority:** MEDIUM  
**Estimated Time:** 4 hours

**Subtasks:**

- [ ] 3.1.1 - Find functions longer than 40 lines:
  ```bash
  # Manual review or use linter
  eslint backend/src --rule "max-lines-per-function: [error, 40]"
  ```
- [ ] 3.1.2 - Refactor long functions into smaller helper functions
- [ ] 3.1.3 - Add ESLint rule to enforce 40-line limit
- [ ] 3.1.4 - Document rationale in ENGINEERING_NOTES.md

---

### Task 3.2: Remove Duplicated Logic

**Priority:** MEDIUM  
**Estimated Time:** 3 hours

**Subtasks:**

- [ ] 3.2.1 - Search for duplicated code patterns
- [ ] 3.2.2 - Extract common logic into utility functions
- [ ] 3.2.3 - Create shared validation helpers
- [ ] 3.2.4 - Create shared response formatters
- [ ] 3.2.5 - Test all refactored code

---

### Task 3.3: Remove Magic Strings/Numbers

**Priority:** LOW  
**Estimated Time:** 2 hours

**Subtasks:**

- [ ] 3.3.1 - Find magic strings in code:
  ```bash
  grep -r '"pending"\|"active"\|"admin"\|"success"' backend/src
  ```
- [ ] 3.3.2 - Create constants file: `backend/src/constants.ts`
- [ ] 3.3.3 - Define enums for:
  - Quote statuses: `QUOTE_STATUS = { NEW, CONTACTED, QUOTED, CLOSED }`
  - Admin roles: `ADMIN_ROLES = { SUPERADMIN, ADMIN, EDITOR, VIEWER }`
  - HTTP status codes (or use existing library)
- [ ] 3.3.4 - Replace all magic strings with constants
- [ ] 3.3.5 - Test all affected code

---

### Task 3.4: Ensure Consistent Error Handling

**Priority:** MEDIUM  
**Estimated Time:** 2 hours

**Subtasks:**

- [ ] 3.4.1 - Verify all async routes use `asyncHandler`
- [ ] 3.4.2 - Verify all errors thrown are `AppError`
- [ ] 3.4.3 - Test error responses are consistent JSON format
- [ ] 3.4.4 - Document error handling pattern in ENGINEERING_NOTES.md

---

### Task 3.5: Verify API Response Consistency

**Priority:** MEDIUM  
**Estimated Time:** 1 hour

**Subtasks:**

- [ ] 3.5.1 - Audit all controller responses
- [ ] 3.5.2 - Ensure all use `ApiResponse.success()` or `ApiResponse.error()`
- [ ] 3.5.3 - Test: All responses have `success`, `data`, `message` fields
- [ ] 3.5.4 - Document response format in API_DOCUMENTATION.md

---

### Task 3.6: Frontend Service Layer Audit

**Priority:** LOW  
**Estimated Time:** 2 hours

**Subtasks:**

- [ ] 3.6.1 - Review frontend API calls
- [ ] 3.6.2 - Ensure all API calls go through service layer (not direct axios)
- [ ] 3.6.3 - Verify error handling in all API calls
- [ ] 3.6.4 - Verify loading states on all components
- [ ] 3.6.5 - Verify empty states on all lists
- [ ] 3.6.6 - Document frontend patterns in ENGINEERING_NOTES.md

---

### Task 3.7-3.12: Additional Code Quality Tasks

- [ ] 3.7 - Add TypeScript strict null checks
- [ ] 3.8 - Add ESLint rule for unused variables
- [ ] 3.9 - Add Prettier formatting enforcement
- [ ] 3.10 - Add pre-commit hooks (husky + lint-staged)
- [ ] 3.11 - Review and improve test coverage (target 80%+)
- [ ] 3.12 - Add integration tests for critical flows

---

## 📚 PHASE 4: Documentation Cleanup (This Week)

### Task 4.1: Remove Redundant Documentation Files

**Priority:** MEDIUM  
**Estimated Time:** 1 hour

**Files to Remove (16 total):**

- [ ] 4.1.1 - Delete `PHASE_1_2_3_IMPLEMENTATION_COMPLETE.md`
- [ ] 4.1.2 - Delete `PROJECT_COMPLETION_FINAL.md`
- [ ] 4.1.3 - Delete `TODO_COMPLETION_SUMMARY.md`
- [ ] 4.1.4 - Delete `FINAL_HANDOVER_READINESS.md`
- [ ] 4.1.5 - Delete `FINAL_TODO_STATUS_REPORT.md`
- [ ] 4.1.6 - Delete `PROJECT_HANDOVER_PROGRESS.md`
- [ ] 4.1.7 - Delete `VERIFICATION_REPORT.md`
- [ ] 4.1.8 - Delete `TECHNICAL_VERIFICATION_REPORT.md`
- [ ] 4.1.9 - Delete `CI_LIGHTHOUSE_EXECUTION_RECORD.md`
- [ ] 4.1.10 - Delete `MANUAL_UAT_EXECUTION_RECORD.md`
- [ ] 4.1.11 - Delete `DEPLOYMENT_READINESS_SUMMARY.md`
- [ ] 4.1.12 - Delete `OBSERVABILITY_IMPLEMENTATION_COMPLETE.md`
- [ ] 4.1.13 - Delete `PRODUCTION_SECURITY_SETUP_COMPLETE.md`
- [ ] 4.1.14 - Merge `SECURITY_ASSESSMENT_REPORT.md` into `SECURITY_REVIEW.md`
- [ ] 4.1.15 - Merge `SECURITY_FIXES_APPLIED.md` into `CHANGELOG.md`
- [ ] 4.1.16 - Merge `SECURITY_HARDENING_SUMMARY.md` into `SECURITY_CHECKLIST.md`

**Verification:**

```bash
git rm docs/PHASE_1_2_3_IMPLEMENTATION_COMPLETE.md
# ... (repeat for all files)
git commit -m "docs: Remove redundant documentation files"
```

---

### Task 4.2: Create ENGINEERING_NOTES.md

**Priority:** HIGH  
**Estimated Time:** 4 hours

**Sections to Write:**

- [ ] 4.2.1 - **Why JWT + Refresh Token?**
  - Explain access/refresh token pattern
  - Security benefits of short-lived access tokens
  - Why HttpOnly cookies for refresh tokens
- [ ] 4.2.2 - **Why 5-Layer Quote Security?**
  - Each layer explained with reasoning
  - Why rate limiting alone isn't enough
  - Trade-offs made
- [ ] 4.2.3 - **Why Multi-Layer File Upload Validation?**
  - MIME type → Magic bytes → Malware scanning
  - Why each layer is necessary
  - Attack scenarios prevented
- [ ] 4.2.4 - **Why Prisma ORM?**
  - Type safety benefits
  - SQL injection prevention
  - Migration strategy
- [ ] 4.2.5 - **Why Express + React Separation?**
  - Single-port deployment strategy
  - Frontend build served by Express
  - Development vs production setup
- [ ] 4.2.6 - **Error Handling Philosophy**
  - AppError vs generic Error
  - When to use 400 vs 422 vs 500
  - Client-facing vs internal errors
- [ ] 4.2.7 - **Rate Limiting Architecture**
  - Why separate stores per limiter
  - Redis vs in-memory trade-offs
  - How to tune limits for your use case
- [ ] 4.2.8 - **Database Design Decisions**
  - Relational vs NoSQL choice
  - Table relationships explained
  - Why certain indexes were added

---

### Task 4.3: Create DEBUG_LOGS.md

**Priority:** HIGH  
**Estimated Time:** 3 hours

**Intentional Bugs to Document:**

- [ ] 4.3.1 - **Bug 1: API Endpoint Mismatch**
  - **Introduce:** Change `/api/v1/quotes` to `/api/quotes` in backend
  - **Symptom:** Frontend gets 404 on quote submission
  - **Root Cause:** Endpoint path mismatch
  - **Debug Process:** Check network tab, compare frontend/backend URLs
  - **Fix:** Restore correct endpoint
  - **Prevention:** Use constants for API base paths
- [ ] 4.3.2 - **Bug 2: JWT Token Expiry Not Handled**
  - **Introduce:** Comment out token refresh logic in frontend
  - **Symptom:** User gets 401 after 24 hours, must re-login
  - **Root Cause:** No automatic token refresh
  - **Debug Process:** Check token expiry, test refresh endpoint
  - **Fix:** Implement auto-refresh on 401
  - **Prevention:** Add tests for token refresh flow

- [ ] 4.3.3 - **Bug 3: Database Constraint Violation**
  - **Introduce:** Try to create category with duplicate slug
  - **Symptom:** 500 error, Prisma P2002 error
  - **Root Cause:** Unique constraint on slug field
  - **Debug Process:** Read Prisma error code, check schema
  - **Fix:** Catch P2002 and return 409 Conflict
  - **Prevention:** Handle all known Prisma errors

- [ ] 4.3.4 - **Bug 4: CORS Configuration Missing**
  - **Introduce:** Remove CORS middleware
  - **Symptom:** Browser blocks API calls from frontend
  - **Root Cause:** CORS headers not set
  - **Debug Process:** Check browser console for CORS error
  - **Fix:** Add CORS middleware with correct origin
  - **Prevention:** Document CORS setup in deployment guide

- [ ] 4.3.5 - **Bug 5: Environment Variable Not Loaded**
  - **Introduce:** Misspell `JWT_SECRET` as `JWT_SECRE`
  - **Symptom:** Application crashes on startup
  - **Root Cause:** Missing required environment variable
  - **Debug Process:** Check error message, verify .env file
  - **Fix:** Correct environment variable name
  - **Prevention:** Validate env on startup with clear errors

**Format for Each Bug:**

````markdown
## Bug #X: [Title]

### Symptom

[What the user sees]

### Root Cause

[What actually went wrong]

### Debug Process

1. [Step 1]
2. [Step 2]
3. [Step 3]

### Fix Applied

```code
[Code change]
```
````

### Prevention Strategy

[How to avoid this in future]

### Learning

[Key takeaway]

```

---

### Task 4.4: Improve db-schema.md
**Priority:** MEDIUM
**Estimated Time:** 2 hours

**Sections to Add:**
- [ ] 4.4.1 - **Why Relational Database?**
  - Data relationships require consistency
  - ACID properties needed for quotes/products
  - Complex queries benefit from SQL
- [ ] 4.4.2 - **Table Relationships Explained**
  - Product → Category (many-to-one)
  - Product → Brand (many-to-one)
  - Admin → RefreshToken (one-to-many)
  - Explain foreign key constraints
- [ ] 4.4.3 - **Indexing Strategy**
  - Which fields are indexed and why
  - Query performance impact
  - Trade-offs (write speed vs read speed)
- [ ] 4.4.4 - **Migration Strategy**
  - Development: `prisma migrate dev`
  - Production: `prisma migrate deploy`
  - How to handle schema changes
  - Backup strategy before migrations
- [ ] 4.4.5 - **Connection Pooling**
  - Prisma default pool size (10)
  - When to increase pool size
  - How to monitor connections

---

### Task 4.5: Create BUSINESS_READINESS.md
**Priority:** LOW
**Estimated Time:** 2 hours

**Sections:**
- [ ] 4.5.1 - Homepage professional copy improvements
- [ ] 4.5.2 - About section content
- [ ] 4.5.3 - Contact information requirements
- [ ] 4.5.4 - Trust signals checklist
- [ ] 4.5.5 - Admin UX consistency review
- [ ] 4.5.6 - B2B terminology audit

---

### Task 4.6-4.10: Additional Documentation Tasks
- [ ] 4.6 - Update README.md with new docs structure
- [ ] 4.7 - Update PROJECT_STATUS with completed tasks
- [ ] 4.8 - Create ARCHITECTURE_DECISIONS.md (ADR format)
- [ ] 4.9 - Consolidate security docs into single source
- [ ] 4.10 - Add deployment flowchart/diagram

---

## 🎓 PHASE 5: Engineering Ownership Proof (2 Weeks)

### Task 5.1: Manually Rewrite Auth Controller
**Priority:** HIGH
**Estimated Time:** 4 hours

**Subtasks:**
- [ ] 5.1.1 - Create new file: `auth.controller.v2.ts`
- [ ] 5.1.2 - Rewrite login flow from scratch (no copy-paste)
- [ ] 5.1.3 - Rewrite refresh flow from scratch
- [ ] 5.1.4 - Rewrite logout flow with token invalidation
- [ ] 5.1.5 - Add detailed inline comments explaining each decision
- [ ] 5.1.6 - Test both old and new controller side-by-side
- [ ] 5.1.7 - Switch to new controller in routes
- [ ] 5.1.8 - Delete old controller
- [ ] 5.1.9 - Document rewrite process in ENGINEERING_NOTES.md

**Success Criteria:**
- Code works identically to original
- Every line has a clear purpose you can explain
- No AI-generated patterns remain
- Comments explain "why" not just "what"

---

### Task 5.2: Manually Rewrite Quote Service Logic
**Priority:** HIGH
**Estimated Time:** 3 hours

**Subtasks:**
- [ ] 5.2.1 - Create new file: `quote.service.v2.ts`
- [ ] 5.2.2 - Rewrite spam detection logic from scratch
- [ ] 5.2.3 - Rewrite duplicate detection logic
- [ ] 5.2.4 - Rewrite email notification logic
- [ ] 5.2.5 - Add detailed comments on security decisions
- [ ] 5.2.6 - Test with concurrent requests
- [ ] 5.2.7 - Switch to new service
- [ ] 5.2.8 - Document security layers in ENGINEERING_NOTES.md

---

### Task 5.3: Manually Rewrite Upload Handler
**Priority:** MEDIUM
**Estimated Time:** 3 hours

**Subtasks:**
- [ ] 5.3.1 - Create new file: `upload.controller.v2.ts`
- [ ] 5.3.2 - Rewrite multer configuration from scratch
- [ ] 5.3.3 - Rewrite file validation logic
- [ ] 5.3.4 - Rewrite malware scanning integration
- [ ] 5.3.5 - Rewrite storage service integration
- [ ] 5.3.6 - Add detailed security comments
- [ ] 5.3.7 - Test upload flow end-to-end
- [ ] 5.3.8 - Document upload security in ENGINEERING_NOTES.md

---

### Task 5.4: Create Production Deployment Understanding Doc
**Priority:** MEDIUM
**Estimated Time:** 3 hours

**Subtasks:**
- [ ] 5.4.1 - Document production flow:
  - How frontend build is created
  - How Express serves built frontend
  - How single-port deployment works
- [ ] 5.4.2 - Document environment variables:
  - Which are required
  - Which have defaults
  - How secrets are managed
- [ ] 5.4.3 - Document database deployment:
  - SQLite → PostgreSQL migration
  - Connection string format
  - Migration execution in production
- [ ] 5.4.4 - Document monitoring setup:
  - What to monitor (CPU, memory, errors)
  - How to set up alerts
  - Log aggregation strategy
- [ ] 5.4.5 - Document scaling strategy:
  - When to add more servers
  - Load balancing considerations
  - Session management in cluster

---

### Task 5.5-5.8: Additional Ownership Tasks
- [ ] 5.5 - Explain every security decision in ENGINEERING_NOTES.md
- [ ] 5.6 - Create database backup/restore procedure
- [ ] 5.7 - Document incident response plan
- [ ] 5.8 - Create performance optimization guide

---

## 🚀 PHASE 6: Production Readiness Polish (2 Weeks)

### Task 6.1: Homepage Professional Copy
**Priority:** LOW
**Estimated Time:** 2 hours

**Subtasks:**
- [ ] 6.1.1 - Rewrite hero section in B2B professional tone
- [ ] 6.1.2 - Add value propositions for businesses
- [ ] 6.1.3 - Add social proof/testimonials section (placeholder)
- [ ] 6.1.4 - Add trust badges (secure, trusted suppliers, etc.)
- [ ] 6.1.5 - Improve call-to-action buttons

---

### Task 6.2: Admin UX Consistency Review
**Priority:** LOW
**Estimated Time:** 3 hours

**Subtasks:**
- [ ] 6.2.1 - Audit all admin pages for consistent layout
- [ ] 6.2.2 - Standardize button styles and positions
- [ ] 6.2.3 - Standardize table layouts and pagination
- [ ] 6.2.4 - Add loading skeletons to all async operations
- [ ] 6.2.5 - Add confirmation dialogs for destructive actions
- [ ] 6.2.6 - Test keyboard navigation throughout admin panel

---

### Task 6.3: Add About/Contact Sections
**Priority:** LOW
**Estimated Time:** 2 hours

**Subtasks:**
- [ ] 6.3.1 - Create About page with company information
- [ ] 6.3.2 - Create Contact page with form
- [ ] 6.3.3 - Add footer with company details
- [ ] 6.3.4 - Add social media links (placeholders)

---

### Task 6.4: Final Security Audit
**Priority:** HIGH
**Estimated Time:** 2 hours

**Subtasks:**
- [ ] 6.4.1 - Re-run security vulnerability scan
- [ ] 6.4.2 - Verify all critical/high issues fixed
- [ ] 6.4.3 - Test authentication flows
- [ ] 6.4.4 - Test rate limiting
- [ ] 6.4.5 - Test file upload security
- [ ] 6.4.6 - Update SECURITY_VULNERABILITIES_AUDIT.md with results

---

### Task 6.5: Performance Optimization
**Priority:** MEDIUM
**Estimated Time:** 3 hours

**Subtasks:**
- [ ] 6.5.1 - Run Lighthouse audit on all pages
- [ ] 6.5.2 - Optimize images (compression, lazy loading)
- [ ] 6.5.3 - Add caching headers for static assets
- [ ] 6.5.4 - Optimize database queries (check N+1 problems)
- [ ] 6.5.5 - Add Redis caching for frequently accessed data
- [ ] 6.5.6 - Document performance benchmarks

---

## 📊 Progress Tracking

### Summary by Phase:
- **Phase 1 (Today):** 4 tasks = ~8 hours
- **Phase 2 (This Week):** 8 tasks = ~18 hours
- **Phase 3 (This Week):** 12 tasks = ~22 hours
- **Phase 4 (This Week):** 10 tasks = ~16 hours
- **Phase 5 (2 Weeks):** 8 tasks = ~20 hours
- **Phase 6 (2 Weeks):** 5 tasks = ~12 hours

**Total Estimated Time:** ~96 hours (~12 working days)

---

## ✅ Task Completion Checklist

### Daily Progress:
```

Day 1 (Today):
[ ] Complete Phase 1 (Critical Security - 4 tasks)
[ ] Start Phase 2 (High Priority Security)

Day 2-3:
[ ] Complete Phase 2 (High Priority Security - 8 tasks)
[ ] Start Phase 3 (Code Quality)

Day 4-5:
[ ] Complete Phase 3 (Code Quality - 12 tasks)
[ ] Start Phase 4 (Documentation)

Day 6-7:
[ ] Complete Phase 4 (Documentation - 10 tasks)
[ ] Start Phase 5 (Ownership Proof)

Week 2:
[ ] Complete Phase 5 (Ownership Proof - 8 tasks)
[ ] Complete Phase 6 (Production Polish - 5 tasks)

Final:
[ ] Run full test suite (133 tests should pass)
[ ] Run security audit again
[ ] Update all documentation
[ ] Create final handover report

```

---

## 🎯 Success Criteria

**Project is "Ownership Proven" when:**
- ✅ All 4 critical security fixes applied
- ✅ All high-priority security tasks completed
- ✅ ENGINEERING_NOTES.md explains all key decisions
- ✅ DEBUG_LOGS.md has 5 real debugging scenarios
- ✅ Auth controller rewritten manually (full understanding)
- ✅ All tests passing (133/133)
- ✅ Documentation reduced by 37% (16 files removed)
- ✅ Security score improved from 6.0/10 to 8.5+/10
- ✅ Can explain any part of codebase without documentation

---

**Ready to start? Let's tackle Phase 1 (Critical Security) first! 🚀**
```
