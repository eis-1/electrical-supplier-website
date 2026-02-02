# User Acceptance Testing (UAT) Execution Checklist

**Project**: Electrical Supplier Website  
**Version**: 1.0.0

**Environment**: Production Build (localhost:5000)

---

## ✅ Pre-Test Setup

- [ ] Backend server running: `cd backend && npm run dev`
- [ ] Frontend built for production: `cd frontend && npm run build`
- [ ] Production server running: `cd electrical-supplier-website && node backend/dist/server.js`
- [ ] Database seeded with test data: `cd backend && npx prisma db seed`
- [ ] Browser opened: http://localhost:5000
- [ ] Network tab open in browser DevTools
- [ ] Backend logs monitoring: `tail -f backend/logs/app.log`

---

## 1. Public Website Flows

### 1.1 Homepage & Navigation ✅

**Test Case**: Verify homepage loads and navigation works

- [ ] Homepage loads successfully (status 200)
- [ ] Hero section visible with company tagline
- [ ] Navigation menu displays all links (Home, Products, About, Quote)
- [ ] Click "Products" → navigates to /products
- [ ] Click "About" → navigates to /about
- [ ] Click "Request Quote" → navigates to /quote
- [ ] Logo click → returns to homepage
- [ ] Footer displays company info and copyright

**Expected Result**: All navigation links work, no 404 errors

**Actual Result**: **\*\***\_\_\_\_**\*\***

**Status**: ⬜ Pass ⬜ Fail

---

### 1.2 Product Browse & Filter ✅

**Test Case**: Browse products with category filtering

- [ ] Navigate to /products
- [ ] Products displayed in grid layout (responsive)
- [ ] Filter by category "Cables & Wires"
- [ ] Products filtered correctly (only cables shown)
- [ ] Filter by brand "Schneider Electric"
- [ ] Products filtered correctly
- [ ] Clear filters → all products displayed again
- [ ] Product cards show: image, name, brand, category
- [ ] Hover over product → see details

**Expected Result**: Filtering works, products display correctly

**Actual Result**: **\*\***\_\_\_\_**\*\***

**Status**: ⬜ Pass ⬜ Fail

---

### 1.3 Product Search ✅

**Test Case**: Search for specific products

- [ ] Enter "circuit breaker" in search box
- [ ] Search results show relevant products
- [ ] Enter non-existent product name "xyz123"
- [ ] "No products found" message displayed
- [ ] Clear search → all products shown again

**Expected Result**: Search works accurately, handles empty results

**Actual Result**: **\*\***\_\_\_\_**\*\***

**Status**: ⬜ Pass ⬜ Fail

---

### 1.4 Quote Request Submission ✅

**Test Case**: Submit valid quote request

**Steps**:

1. Navigate to /quote
2. Fill form:
   - Name: "UAT Test Customer"
   - Company: "UAT Test Ltd"
   - Email: "uat@example.com"
   - Phone: "+8801234567890"
   - Product Name: "MCB 32A"
   - Quantity: 100
   - Project Details: "Testing quote flow for UAT"
3. Submit form

**Checklist**:

- [ ] Form validation works (required fields marked)
- [ ] Honeypot field hidden (anti-spam)
- [ ] Submit after 1.5 seconds (spam protection)
- [ ] Success message displayed: "Quote Request Submitted"
- [ ] Reference number shown (format: QR-XXXXXXX)
- [ ] WhatsApp link displayed with pre-filled message
- [ ] Form cleared after submission

**Expected Result**: Quote submitted successfully, ref number shown

**Actual Result**: **\*\***\_\_\_\_**\*\***

**Reference Number**: **\*\***\_\_\_\_**\*\***

**Status**: ⬜ Pass ⬜ Fail

---

### 1.5 Quote Request Validation ✅

**Test Case**: Test form validation rules

- [ ] Submit empty form → validation errors shown
- [ ] Enter invalid email → error message
- [ ] Enter invalid phone format → error message
- [ ] Enter quantity = 0 → error message
- [ ] Fill honeypot field → submission blocked (spam detected)

**Expected Result**: All validation rules enforced

**Actual Result**: **\*\***\_\_\_\_**\*\***

**Status**: ⬜ Pass ⬜ Fail

---

### 1.6 SEO & Meta Tags ✅

**Test Case**: Verify SEO implementation

**View Page Source** (Ctrl+U):

- [ ] `<title>` tag present on all pages
- [ ] Meta description present
- [ ] Open Graph tags for social sharing
- [ ] Canonical URL set correctly
- [ ] No duplicate title tags
- [ ] robots.txt accessible: http://localhost:5000/robots.txt
- [ ] sitemap.xml accessible: http://localhost:5000/sitemap.xml

**Expected Result**: All SEO tags properly configured

**Actual Result**: **\*\***\_\_\_\_**\*\***

**Status**: ⬜ Pass ⬜ Fail

---

### 1.7 Mobile Responsiveness ✅

**Test Case**: Test mobile layout (DevTools → Toggle device toolbar)

**Test Devices**:

- [ ] iPhone 12 Pro (390x844)
- [ ] Samsung Galaxy S20 (360x800)
- [ ] iPad (768x1024)
- [ ] Desktop (1920x1080)

**Checklist**:

- [ ] Navigation collapses to hamburger menu on mobile
- [ ] Product grid adjusts to single column on mobile
- [ ] Forms fully usable on mobile (no horizontal scroll)
- [ ] Footer stacks vertically on mobile
- [ ] Touch targets large enough (min 44x44px)

**Expected Result**: Fully responsive across all breakpoints

**Actual Result**: **\*\***\_\_\_\_**\*\***

**Status**: ⬜ Pass ⬜ Fail

---

## 2. Admin Panel Flows

### 2.1 Admin Login (Basic Auth) ✅

**Test Case**: Login with standard credentials

**Credentials**:

- Email: `admin@electricalsupplier.com`
- Password: Set via `SEED_ADMIN_PASSWORD` during seed/admin creation
- **⚠️ Security**: Use a strong password in production and rotate it if ever exposed

**Steps**:

1. Navigate to /admin/login
2. Enter credentials
3. Click "Login"

**Checklist**:

- [ ] Login page accessible
- [ ] Email/password fields visible
- [ ] Login successful → redirect to /admin/dashboard
- [ ] JWT token stored (check DevTools → Application → Local Storage)
- [ ] Refresh token cookie set (check DevTools → Application → Cookies)
- [ ] Invalid credentials → error message shown

**Expected Result**: Login successful, dashboard loads

**Actual Result**: **\*\***\_\_\_\_**\*\***

**Status**: ⬜ Pass ⬜ Fail

---

### 2.2 Admin Dashboard Overview ✅

**Test Case**: Verify dashboard displays stats

**Checklist**:

- [ ] Dashboard loads successfully
- [ ] Statistics cards visible (products, brands, categories, quotes)
- [ ] Sidebar navigation present
- [ ] User info displayed in header
- [ ] Logout button visible

**Expected Result**: Dashboard shows all metrics

**Actual Result**: **\*\***\_\_\_\_**\*\***

**Status**: ⬜ Pass ⬜ Fail

---

### 2.3 Product CRUD (Create) ✅

**Test Case**: Create new product as admin

**Steps**:

1. Navigate to /admin/products
2. Click "Add Product"
3. Fill form:
   - Name: "UAT Test Product"
   - Brand: "Schneider Electric"
   - Category: "Circuit Breakers"
   - Description: "Test product for UAT"
   - Status: Active
4. Submit

**Checklist**:

- [ ] Product form loads
- [ ] Brand dropdown populated
- [ ] Category dropdown populated
- [ ] Product created successfully
- [ ] Success toast/notification shown
- [ ] Product appears in product list
- [ ] New product has unique ID

**Expected Result**: Product created and visible in list

**Actual Result**: **\*\***\_\_\_\_**\*\***

**Product ID**: **\*\***\_\_\_\_**\*\***

**Status**: ⬜ Pass ⬜ Fail

---

### 2.4 Product CRUD (Read) ✅

**Test Case**: View product list and details

**Checklist**:

- [ ] Product list loads with all products
- [ ] Pagination works (if >10 products)
- [ ] Search products by name
- [ ] Filter by category
- [ ] Filter by brand
- [ ] Click product → view details

**Expected Result**: All products visible and filterable

**Actual Result**: **\*\***\_\_\_\_**\*\***

**Status**: ⬜ Pass ⬜ Fail

---

### 2.5 Product CRUD (Update) ✅

**Test Case**: Edit existing product

**Steps**:

1. From product list, click "Edit" on UAT Test Product
2. Modify name to "UAT Test Product (Updated)"
3. Change category
4. Save changes

**Checklist**:

- [ ] Edit form loads with current values
- [ ] All fields editable
- [ ] Changes saved successfully
- [ ] Updated product visible in list
- [ ] Audit trail logged (check backend logs)

**Expected Result**: Product updated successfully

**Actual Result**: **\*\***\_\_\_\_**\*\***

**Status**: ⬜ Pass ⬜ Fail

---

### 2.6 Product CRUD (Delete) ✅

**Test Case**: Delete product

**Steps**:

1. From product list, click "Delete" on UAT Test Product
2. Confirm deletion in modal

**Checklist**:

- [ ] Confirmation modal appears
- [ ] Click "Cancel" → product not deleted
- [ ] Click "Delete" → product removed from list
- [ ] Product no longer visible in public products page
- [ ] Deletion logged (check backend logs)

**Expected Result**: Product deleted successfully

**Actual Result**: **\*\***\_\_\_\_**\*\***

**Status**: ⬜ Pass ⬜ Fail

---

### 2.7 Quote Management ✅

**Test Case**: View and manage quotes

**Steps**:

1. Navigate to /admin/quotes
2. View quote list

**Checklist**:

- [ ] All submitted quotes visible
- [ ] Quote details: customer name, email, product, quantity
- [ ] Click quote → view full details
- [ ] Reference number displayed correctly
- [ ] Timestamp shown (date submitted)
- [ ] Export to CSV button works (if implemented)

**Expected Result**: All quotes visible with complete details

**Actual Result**: **\*\***\_\_\_\_**\*\***

**Status**: ⬜ Pass ⬜ Fail

---

### 2.8 RBAC - Viewer Role ✅

**Test Case**: Test read-only viewer permissions

**Credentials**:

- Email: `viewer@electricalsupplier.com`
- Password: Set via `SEED_ADMIN_PASSWORD` (seed creates this user with the same seed password)

**Steps**:

1. Logout as admin
2. Login as viewer
3. Navigate to /admin/products

**Checklist**:

- [ ] Login successful
- [ ] Dashboard accessible (read-only stats)
- [ ] Product list visible
- [ ] "Add Product" button hidden/disabled
- [ ] "Edit" button hidden/disabled
- [ ] "Delete" button hidden/disabled
- [ ] Attempt direct POST request → 403 Forbidden

**Expected Result**: Viewer can only view, no modifications allowed

**Actual Result**: **\*\***\_\_\_\_**\*\***

**Status**: ⬜ Pass ⬜ Fail

---

### 2.9 RBAC - Editor Role ✅

**Test Case**: Test editor permissions

**Credentials**:

- Email: `editor@electricalsupplier.com`
- Password: Set via `SEED_ADMIN_PASSWORD` (seed creates this user with the same seed password)

**Steps**:

1. Logout and login as editor
2. Navigate to /admin/products

**Checklist**:

- [ ] Login successful
- [ ] Can create new product
- [ ] Can edit existing product
- [ ] "Delete" button hidden/disabled
- [ ] Attempt direct DELETE request → 403 Forbidden

**Expected Result**: Editor can create/update but not delete

**Actual Result**: **\*\***\_\_\_\_**\*\***

**Status**: ⬜ Pass ⬜ Fail

---

## 3. Two-Factor Authentication (2FA)

### 3.1 2FA Setup ✅

**Test Case**: Enable 2FA for admin account

**Prerequisites**:

- Authenticator app installed (Google Authenticator, Microsoft Authenticator, Authy)

**Steps**:

1. Login as admin
2. Navigate to /admin/settings or /admin/security
3. Click "Enable 2FA"
4. QR code displayed
5. Scan QR code with authenticator app
6. App generates 6-digit TOTP code
7. Enter code in verification field
8. Submit

**Checklist**:

- [ ] 2FA setup page accessible
- [ ] QR code displayed correctly
- [ ] Manual entry key shown (if QR fails)
- [ ] Authenticator app adds account successfully
- [ ] Valid TOTP code accepted
- [ ] Invalid code rejected with error message
- [ ] Backup codes generated (5-10 codes)
- [ ] Backup codes displayed once (user must save)
- [ ] 2FA status shows "Enabled"

**Expected Result**: 2FA enabled, backup codes saved

**Backup Codes**: **\*\***\_\_\_\_**\*\***

**Status**: ⬜ Pass ⬜ Fail

---

### 3.2 2FA Login Flow ✅

**Test Case**: Login with 2FA enabled

**Steps**:

1. Logout
2. Navigate to /admin/login
3. Enter email and password
4. Submit (Step 1)
5. 2FA code input appears
6. Open authenticator app → get current code
7. Enter 6-digit code
8. Submit (Step 2)

**Checklist**:

- [ ] After credentials: 2FA code input shown (not full login)
- [ ] No JWT token issued yet (Step 1)
- [ ] Valid TOTP code → login successful
- [ ] Invalid code → error message, try again
- [ ] Expired code → error message
- [ ] Code used twice → rejected (replay protection)
- [ ] After successful 2FA: dashboard accessible

**Expected Result**: Two-step login works, dashboard accessible after 2FA

**Actual Result**: **\*\***\_\_\_\_**\*\***

**Status**: ⬜ Pass ⬜ Fail

---

### 3.3 2FA Backup Code Usage ✅

**Test Case**: Use backup code for login

**Steps**:

1. Logout
2. Login with email/password (Step 1)
3. Instead of TOTP code, click "Use backup code"
4. Enter one backup code
5. Submit

**Checklist**:

- [ ] Backup code input displayed
- [ ] Valid backup code accepted
- [ ] Login successful → dashboard accessible
- [ ] Backup code marked as used (cannot reuse)
- [ ] Remaining backup codes count decremented
- [ ] Invalid backup code → error message

**Expected Result**: Backup code works, single-use enforced

**Actual Result**: **\*\***\_\_\_\_**\*\***

**Status**: ⬜ Pass ⬜ Fail

---

### 3.4 2FA Disable ✅

**Test Case**: Disable 2FA

**Steps**:

1. Login (with 2FA)
2. Navigate to security settings
3. Click "Disable 2FA"
4. Enter current TOTP code to confirm
5. Submit

**Checklist**:

- [ ] Disable button visible when 2FA enabled
- [ ] Confirmation prompt requires TOTP code
- [ ] Valid code → 2FA disabled
- [ ] Invalid code → error, 2FA remains enabled
- [ ] After disable: 2FA status shows "Disabled"
- [ ] Next login: no 2FA prompt (single-step login)

**Expected Result**: 2FA disabled successfully

**Actual Result**: **\*\***\_\_\_\_**\*\***

**Status**: ⬜ Pass ⬜ Fail

---

## 4. Security & Uploads

### 4.1 File Upload Security ✅

**Test Case**: Test file upload restrictions

**Steps**:

1. Navigate to product creation/edit form
2. Attempt to upload various file types

**Test Files**:

- [ ] Valid image (PNG, 1MB) → ✅ Accepted
- [ ] Valid image (JPG, 2MB) → ✅ Accepted
- [ ] Oversized image (10MB) → ❌ Rejected (max 5MB)
- [ ] Executable file (.exe) → ❌ Rejected
- [ ] PHP script (.php) → ❌ Rejected
- [ ] SVG with embedded script → ❌ Sanitized or rejected
- [ ] Malformed image header → ❌ Rejected

**Checklist**:

- [ ] Only allowed file types accepted (images only)
- [ ] File size limit enforced (5MB default)
- [ ] Files stored in secure location (`/uploads`)
- [ ] Filenames sanitized (no path traversal: `../../../etc/passwd`)
- [ ] Files served with correct Content-Type header
- [ ] No direct script execution possible from upload directory

**Expected Result**: Only safe images accepted, malicious files rejected

**Actual Result**: **\*\***\_\_\_\_**\*\***

**Status**: ⬜ Pass ⬜ Fail

---

### 4.2 File Download/Access ✅

**Test Case**: Verify uploaded files accessible

**Steps**:

1. Upload valid product image
2. Save product
3. View product on public website
4. Inspect image src URL

**Checklist**:

- [ ] Image displays correctly on product card
- [ ] Image accessible at `/uploads/products/[filename]`
- [ ] Image served with correct MIME type
- [ ] Images from other products not accessible directly (if private)
- [ ] Directory listing disabled (`/uploads/` returns 403)
- [ ] Files deleted when product deleted (cleanup)

**Expected Result**: Images accessible, secure serving

**Actual Result**: **\*\***\_\_\_\_**\*\***

**Status**: ⬜ Pass ⬜ Fail

---

## 5. Performance & Accessibility

### 5.1 Lighthouse Audit ✅

**Test Case**: Run Lighthouse audit

**Steps**:

1. Open Chrome DevTools
2. Navigate to Lighthouse tab
3. Run audit (Desktop mode)

**Target Scores**:

- [ ] Performance: ≥ 90
- [ ] Accessibility: ≥ 90
- [ ] Best Practices: ≥ 90
- [ ] SEO: ≥ 90

**Actual Scores**:

- Performance: **\_\_**
- Accessibility: **\_\_**
- Best Practices: **\_\_**
- SEO: **\_\_**

**Critical Issues**: **\*\***\_\_\_\_**\*\***

**Status**: ⬜ Pass ⬜ Fail

---

### 5.2 Accessibility (A11y) Testing ✅

**Test Case**: Keyboard navigation and screen reader support

**Checklist**:

- [ ] Tab key navigates through all interactive elements
- [ ] Focus indicators visible (outline on focused elements)
- [ ] Skip to main content link present
- [ ] All images have alt text
- [ ] Form labels properly associated with inputs (click label → focus input)
- [ ] Error messages announced to screen readers
- [ ] Color contrast ratio ≥ 4.5:1 (text on background)
- [ ] Headings hierarchy correct (h1 → h2 → h3)

**Tools Used**:

- [ ] axe DevTools extension
- [ ] WAVE Web Accessibility Evaluation Tool
- [ ] Keyboard only (no mouse)

**Expected Result**: WCAG 2.1 AA compliance

**Actual Result**: **\*\***\_\_\_\_**\*\***

**Status**: ⬜ Pass ⬜ Fail

---

## 6. Error Handling & Edge Cases

### 6.1 Network Errors ✅

**Test Case**: Test offline/network failure scenarios

**Steps**:

1. Open DevTools → Network tab
2. Set throttling to "Offline"
3. Attempt to submit quote

**Checklist**:

- [ ] Error message displayed: "Network error, please try again"
- [ ] Form data preserved (not lost)
- [ ] Retry button available
- [ ] Graceful degradation (no app crash)

**Expected Result**: Friendly error messages, no data loss

**Actual Result**: **\*\***\_\_\_\_**\*\***

**Status**: ⬜ Pass ⬜ Fail

---

### 6.2 Invalid API Responses ✅

**Test Case**: Handle backend errors gracefully

**Scenarios**:

- [ ] 400 Bad Request → validation error shown
- [ ] 401 Unauthorized → redirect to login
- [ ] 403 Forbidden → "Access denied" message
- [ ] 404 Not Found → "Resource not found" page
- [ ] 500 Internal Server Error → "Something went wrong" message
- [ ] Rate limit exceeded (429) → "Too many requests" message

**Expected Result**: User-friendly error messages for all error codes

**Actual Result**: **\*\***\_\_\_\_**\*\***

**Status**: ⬜ Pass ⬜ Fail

---

### 6.3 SQL Injection Prevention ✅

**Test Case**: Attempt SQL injection attacks

**Attack Payloads** (in quote form):

- Name: `'; DROP TABLE quotes; --`
- Email: `' OR '1'='1`
- Product: `1' UNION SELECT * FROM admins --`

**Checklist**:

- [ ] Input sanitized automatically
- [ ] No SQL errors displayed
- [ ] Database not compromised
- [ ] Parameterized queries used (Prisma ORM)

**Expected Result**: All injection attempts blocked

**Actual Result**: **\*\***\_\_\_\_**\*\***

**Status**: ⬜ Pass ⬜ Fail

---

### 6.4 XSS Prevention ✅

**Test Case**: Attempt cross-site scripting attacks

**Attack Payloads**:

- Name: `<script>alert('XSS')</script>`
- Project Details: `<img src=x onerror="alert('XSS')">`

**Checklist**:

- [ ] Script tags escaped/stripped
- [ ] No alert popups appear
- [ ] Content displayed as plain text
- [ ] React auto-escaping working

**Expected Result**: All XSS attempts blocked

**Actual Result**: **\*\***\_\_\_\_**\*\***

**Status**: ⬜ Pass ⬜ Fail

---

## 7. API Contract Testing

### 7.1 OpenAPI Spec Coverage ✅

**Test Case**: Verify API documentation completeness

**Checklist**:

- [ ] Swagger UI accessible: http://localhost:5000/api-docs
- [ ] All endpoints documented
- [ ] Request/response schemas defined
- [ ] Authentication requirements specified
- [ ] Example requests/responses present
- [ ] Error responses documented (4xx, 5xx)

**Missing Endpoints**: **\*\***\_\_\_\_**\*\***

**Status**: ⬜ Pass ⬜ Fail

---

### 7.2 API Rate Limiting ✅

**Test Case**: Verify rate limits enforced

**Endpoints to Test**:

- Login: 5 requests per 15 minutes
- Quote submission: 5 per hour per IP
- 2FA verification: 10 attempts per 15 minutes

**Steps**:

1. Send multiple rapid requests to /api/v1/auth/login
2. Exceed rate limit (6th request)

**Checklist**:

- [ ] 6th request returns 429 Too Many Requests
- [ ] Response includes `Retry-After` header
- [ ] Rate limit resets after time window
- [ ] Different endpoints have independent limits

**Expected Result**: Rate limits enforced per endpoint

**Actual Result**: **\*\***\_\_\_\_**\*\***

**Status**: ⬜ Pass ⬜ Fail

---

## 8. Environment Configuration

### 8.1 .env Templates Alignment ✅

**Test Case**: Verify all .env examples match

**Files to Check**:

- `backend/.env.example`
- `backend/.env.production.example`
- `frontend/.env.example`

**Checklist**:

- [ ] All required variables documented
- [ ] Example values provided
- [ ] Comments explain each variable
- [ ] No sensitive defaults (e.g., real API keys)
- [ ] Production examples include security notes

**Expected Result**: Complete and aligned templates

**Actual Result**: **\*\***\_\_\_\_**\*\***

**Status**: ⬜ Pass ⬜ Fail

---

## 9. Final Handover Readiness

### 9.1 Documentation Complete ✅

**Checklist**:

- [ ] README.md comprehensive
- [ ] API documentation available
- [ ] Setup guide for new developers
- [ ] Environment configuration guide
- [ ] Deployment instructions
- [ ] Troubleshooting guide
- [ ] Security best practices documented

**Missing Documentation**: **\*\***\_\_\_\_**\*\***

**Status**: ⬜ Pass ⬜ Fail

---

### 9.2 Clean Default Credentials ✅

**Test Case**: Ensure no hardcoded secrets in repo

**Checklist**:

- [ ] No API keys in source code
- [ ] .env files in .gitignore
- [ ] Default admin password documented (change after setup)
- [ ] JWT secrets are placeholders in examples
- [ ] Database URLs use relative paths or env vars

**Expected Result**: No secrets committed to git

**Actual Result**: **\*\***\_\_\_\_**\*\***

**Status**: ⬜ Pass ⬜ Fail

---

### 9.3 CI/CD Readiness ✅

**Test Case**: Verify project can be built and tested

**Commands**:

```bash
# Backend
cd backend
npm install
npm run lint
npm run test
npm run build

# Frontend
cd frontend
npm install
npm run lint
npm run build

# E2E Tests
npm run test:e2e
```

**Checklist**:

- [ ] All dependencies install successfully
- [ ] Linting passes (no errors)
- [ ] Unit tests pass (if implemented)
- [ ] Build completes without errors
- [ ] E2E tests pass: 27/27 ✅

**Expected Result**: All commands succeed

**Actual Result**: **\*\***\_\_\_\_**\*\***

**Status**: ⬜ Pass ⬜ Fail

---

## Summary

### Test Execution Statistics

- **Total Test Cases**: 35
- **Passed**: **\_\_**
- **Failed**: **\_\_**
- **Blocked**: **\_\_**
- **Not Executed**: **\_\_**

### Pass Rate

**Pass Percentage**: **\_\_**% (Target: ≥ 95%)

### Critical Issues Found

1. ***
2. ***
3. ***

### Recommendations

1. ***
2. ***
3. ***

### Sign-Off

**Tester Name**: **\*\***\_\_\_\_**\*\***  
**Date**: **\*\***\_\_\_\_**\*\***  
**Signature**: **\*\***\_\_\_\_**\*\***

**Project Manager**: **\*\***\_\_\_\_**\*\***  
**Date**: **\*\***\_\_\_\_**\*\***  
**Signature**: **\*\***\_\_\_\_**\*\***

---

## Appendix

### Test Data Used

- Admin Email: `admin@electricalsupplier.com`
- Viewer Email: `viewer@electricalsupplier.com`
- Editor Email: `editor@electricalsupplier.com`
- Test Customer Email: `uat@example.com`

### Tools Used

- Browser: Chrome (version: **\_\_**)
- Playwright: v1.48.2
- Node.js: v18+
- Lighthouse: Latest
- axe DevTools: Latest

### References

- API Testing Guide: `docs/API_TESTING_GUIDE.md`
- Complete Testing Guide: `docs/COMPLETE_TESTING_GUIDE.md`
- OpenAPI Spec: http://localhost:5000/api-docs
