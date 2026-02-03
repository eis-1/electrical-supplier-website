# Complete Testing & Validation Guide

## Quick Start

### 1. Server Health Check

Open browser: `http://localhost:5000/health`

Expected response:

```json
{
  "status": "ok",
  "timestamp": "2026-01-15T...",
  "environment": "development",
  "security": {
    "hsts": false,
    "helmet": true,
    "rateLimiting": true,
    "jwtExpiry": true,
    "uploadValidation": true,
    "auditLogging": true
  }
}
```

### 2. Install Test Dependencies

```bash
cd backend
npm install --save-dev jest axios
```

### 3. Run Automated Tests

```bash
npm test
```

---

## Three Testing Approaches

You have three ways to test the API:

### Option 1: Browser Testing (Simplest)

- Navigate to endpoints in browser
- Check health, view responses
- Limited to GET requests

### Option 2: Postman (Recommended)

- Import collection from `docs/Electrical_Supplier_API.postman_collection.json`
- Visual interface, easy debugging
- Automatic token management
- Test scripts included

### Option 3: Automated Tests (Most Thorough)

- Run Jest test suite
- Tests all endpoints automatically
- Includes security tests
- Best for CI/CD

---

## Step-by-Step Manual Testing

### Phase 1: Basic Server Verification

**1.1 Check Server is Running**

```bash
# Open new terminal
cd backend
npm run dev

# Should see:
# Database connected successfully
# Rate limiters initialized successfully
# Server running on port 5000
```

**1.2 Test Health Endpoint**

```
Browser: http://localhost:5000/health
PowerShell: Invoke-WebRequest -Uri "http://localhost:5000/health"
```

- Status should be 200 OK
- Response should include security features

---

### Phase 2: Database Migration

**2.1 Check Current Schema**

```bash
cd backend
npx prisma studio
```

**2.2 Apply 2FA Migration**
The migration file has been created at:
`prisma/migrations/20260115000000_add_2fa_fields/migration.sql`

Apply it:

```bash
npx prisma db push
```

This adds:

- `twoFactorSecret` (TEXT, nullable)
- `twoFactorEnabled` (BOOLEAN, default false)
- `backupCodes` (TEXT, nullable)

**2.3 Verify Migration**

```bash
npx prisma studio
# Check admins table has new columns
```

---

### Phase 3: Authentication Testing

#### 3.1 Bootstrap Admin (Local/Dev)

There is **no public** `POST /api/v1/auth/register` endpoint in this project.

For local testing, bootstrap the default admin user using the script:

```bash
cd backend
node setup-admin.js
```

This creates (or recreates):

- Email: `<ADMIN_EMAIL>`
- Password: Set via seed script configuration
- **Note**: Use the password configured in your seed script or `.env` file

- Admin exists in database
- Password is hashed in DB
- `twoFactorEnabled` defaults to `false`

---

#### 3.2 Login (Without 2FA)

```powershell
$body = @{
  email = "<ADMIN_EMAIL>"
  password = "your-admin-password"  # Use password from seed script
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri "http://localhost:5000/api/v1/auth/login" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body

$json = $response.Content | ConvertFrom-Json
$token = $json.data.token
Write-Host "Token: $token"
```

**Expected Response:**

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "admin": {...},
    "token": "eyJhbGc..."
  }
}
```

- Status: 200 OK
- Token returned
- `refreshToken` cookie set (HttpOnly)

**Save the token** for next requests!

---

### Phase 4: Two-Factor Authentication Testing

#### 4.1 Setup 2FA

```powershell
$headers = @{
    "Authorization" = "Bearer $token"
}

$response = Invoke-WebRequest -Uri "http://localhost:5000/api/v1/auth/2fa/setup" `
    -Method POST `
    -Headers $headers

$json = $response.Content | ConvertFrom-Json
Write-Host "QR Code: $($json.data.qrCode)"
Write-Host "Secret: $($json.data.secret)"
```

**Expected Response:**

```json
{
  "success": true,
  "message": "2FA setup initiated",
  "data": {
    "qrCode": "data:image/png;base64,iVBORw0KG...",
    "secret": "JBSWY3DPEHPK3PXP"
  }
}
```

- QR code is base64 PNG
- Secret is a base32 TOTP secret (typically 32 chars)

**Action Required:**

1. **Save the secret and backup codes!**
2. **Scan QR code** with Google Authenticator/Authy:
   - Open authenticator app
   - Tap "+" or "Add account"
   - Scan QR code from response
   - Or manually enter the secret
3. Note the 6-digit code displayed

---

#### 4.2 Enable 2FA

Get current TOTP code from your authenticator app, then:

```powershell
$body = @{
    token = "123456"  # Replace with actual TOTP code
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:5000/api/v1/auth/2fa/enable" `
    -Method POST `
    -Headers $headers `
    -ContentType "application/json" `
    -Body $body
```

**Expected Response:**

```json
{
  "success": true,
  "message": "2FA enabled successfully",
  "data": {
    "backupCodes": ["A1B2-C3D4-E5F6", "...more..."]
  }
}
```

- Status: 200 OK
- Backup codes returned (save them securely)
- Wrong code returns 400

---

#### 4.3 Test Login with 2FA (Two-Step Process)

**Step 1: Login with credentials**

```powershell
$body = @{
  email = "<ADMIN_EMAIL>"
  password = "<ADMIN_PASSWORD>"
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri "http://localhost:5000/api/v1/auth/login" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body

$json = $response.Content | ConvertFrom-Json
$adminId = $json.data.admin.id
Write-Host "Admin ID: $adminId"
Write-Host "Requires 2FA: $($json.data.requiresTwoFactor)"
```

**Expected Response:**

```json
{
  "success": true,
  "message": "Two-factor authentication required",
  "data": {
    "requiresTwoFactor": true,
    "admin": {
      "id": "uuid-here",
      "email": "<ADMIN_EMAIL>",
      "name": "System Administrator",
      "role": "admin",
      "twoFactorEnabled": true
    }
  }
}
```

- requiresTwoFactor is true
- adminId provided
- No access token yet

---

**Step 2: Verify TOTP code**

Get fresh TOTP code from authenticator, then:

```powershell
$body = @{
    adminId = $adminId
  code = "654321"  # Replace with current TOTP code
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri "http://localhost:5000/api/v1/auth/verify-2fa" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body

$json = $response.Content | ConvertFrom-Json
$newToken = $json.data.token
Write-Host "New Token: $newToken"
```

**Expected Response:**

```json
{
  "success": true,
  "message": "2FA verification successful",
  "data": {
    "admin": {...},
    "token": "eyJhbGc..."
  }
}
```

- Status: 200 OK
- Access token issued
- Can now access protected routes
- Wrong code returns 401

---

#### 4.4 Test Backup Code

This endpoint verifies a TOTP token/backup code against an email and returns `{ verified: true }`.
It **does not** issue a JWT. JWT issuance happens via `POST /api/v1/auth/verify-2fa`.

```powershell
$body = @{
  email = "<ADMIN_EMAIL>"
  token = "A1B2-C3D4-E5F6"  # Use one of your backup codes
  useBackupCode = $true
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:5000/api/v1/auth/2fa/verify" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body
```

- Backup code works
- Same code fails second time (single-use)

---

### Phase 5: Rate Limiting Testing

#### 5.1 Test 2FA Rate Limit (5 attempts per 5 minutes)

```powershell
# Make 6 attempts with wrong code
for ($i = 1; $i -le 6; $i++) {
    Write-Host "Attempt $i"

    $body = @{
        adminId = $adminId
      code = "000000"
    } | ConvertTo-Json

    try {
        $response = Invoke-WebRequest -Uri "http://localhost:5000/api/v1/auth/verify-2fa" `
            -Method POST `
            -ContentType "application/json" `
            -Body $body `
            -ErrorAction SilentlyContinue

        Write-Host "Status: $($response.StatusCode)"
    } catch {
        Write-Host "Status: $($_.Exception.Response.StatusCode.Value__)"
        Write-Host "Rate limited!" -ForegroundColor Red
    }

    Start-Sleep -Seconds 1
}
```

**Expected Behavior:**

- Attempts 1-5: 401 "Invalid verification code"
- Attempt 6: 429 "Too many requests"
- Response includes `Retry-After: 300` header

- Rate limit triggered at 6th attempt
- Retry-After header present
- Can retry after 5 minutes

---

### Phase 6: Security Testing

#### 6.1 Path Traversal Test

```powershell
$headers = @{
    "Authorization" = "Bearer $token"
}

$body = @{
    filename = "../../etc/passwd"
    type = "product"
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri "http://localhost:5000/api/v1/upload" `
    -Method DELETE `
    -Headers $headers `
    -ContentType "application/json" `
    -Body $body `
    -ErrorAction SilentlyContinue
```

- Should return 400 "Invalid filename or type"
- Attack blocked and logged
- Never returns 200 or deletes file

---

#### 6.2 Invalid Token Test

```powershell
$headers = @{
    "Authorization" = "Bearer invalid-token-here"
}

$response = Invoke-WebRequest -Uri "http://localhost:5000/api/v1/categories" `
    -Method POST `
    -Headers $headers `
    -ErrorAction SilentlyContinue
```

- Should return 401 "Invalid or expired token"
- No access to protected routes

---

#### 6.3 Security Headers Test

```powershell
$response = Invoke-WebRequest -Uri "http://localhost:5000/health"
$response.Headers
```

**Expected Headers:**

```
X-DNS-Prefetch-Control: off
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
X-Download-Options: noopen
X-XSS-Protection: 0
Content-Security-Policy: default-src 'self'
```

- All security headers present
- Helmet middleware active

---

### Phase 7: Category & Product Testing

#### 7.1 Create Category

```powershell
$headers = @{
    "Authorization" = "Bearer $token"
}

$body = @{
    name = "Test LED Lights"
    slug = "test-led-lights"
    description = "Test category for LED products"
    displayOrder = 1
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri "http://localhost:5000/api/v1/categories" `
    -Method POST `
    -Headers $headers `
    -ContentType "application/json" `
    -Body $body

$json = $response.Content | ConvertFrom-Json
$categoryId = $json.data.category.id
Write-Host "Category ID: $categoryId"
```

- Status: 201 Created
- Category has UUID
- Without auth returns 401

---

#### 7.2 List Categories

```
Browser: http://localhost:5000/api/v1/categories?page=1&limit=10
```

- Returns array of categories
- Includes pagination data
- No auth required (public endpoint)

---

### Phase 8: Quote Request Testing

```powershell
# No auth needed - public endpoint
$body = @{
    name = "John Doe"
    company = "Test Company"
    phone = "+1234567890"
    whatsapp = "+1234567890"
    email = "<CUSTOMER_EMAIL>"
    productName = "LED Panel Light"
    quantity = "50 units"
    projectDetails = "Office renovation"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:5000/api/v1/quotes" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body
```

- Status: 201 Created
- Email notification sent/queued (depends on email configuration)
- Status is "new"

---

## Postman Testing

### Import Collection

1. Open Postman
2. File → Import
3. Select `docs/Electrical_Supplier_API.postman_collection.json`
4. Collection loads with all endpoints

### Configure Environment

1. Click "Environments" → "+" New Environment
2. Name: "Local Development"
3. Add variables:
   - `baseUrl`: `http://localhost:5000`
   - `apiPrefix`: `/api/v1`

- `token`: (leave empty, auto-populated)

4. Save and select environment

### Run Tests

1. **01. Authentication (No 2FA)**

- Run "Login (No 2FA)" → saves token
- Run "Refresh Token"

2. **02. Two-Factor Authentication**
   - Run "Setup 2FA" → check Console for secret
   - **Scan QR code** with authenticator app
   - Get TOTP code from app
   - Edit "Enable 2FA" request body with code
   - Run "Enable 2FA"
   - Run "Get 2FA Status"

3. **03. Categories**
   - Run "List Categories"
   - Run "Create Category" (requires auth)

4. **06. File Upload**
   - Run "Delete File - Path Traversal Attack"
   - Should return 400 (attack blocked)

### Test Scripts

The collection includes test scripts that automatically:

- Save tokens to variables
- Verify response status codes
- Check response structure
- Display TOTP secrets in Console

View results in "Test Results" tab.

---

## Automated Testing

### Run Full Test Suite

```bash
cd backend

# Install test dependencies
npm install --save-dev jest axios speakeasy

# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

### Example output (varies by environment)

```
PASS  tests/api.test.js
  Electrical Supplier API Tests
    1. Health Check
      - should return server health status
    2. Authentication (No 2FA)
      - should login without 2FA
      - should reject invalid credentials
    3. Two-Factor Authentication Setup
      - should setup 2FA and get QR code
      - should enable 2FA with valid TOTP
      - should get 2FA status
    4. Login with 2FA
      - should require 2FA on login (step 1)
      - should complete login with valid TOTP (step 2)
      - should verify with backup code
      - should reject reused backup code
    5. Rate Limiting
      - should block after 5 failed 2FA attempts
    6. Category Management
      - should list categories
      - should create category (admin only)
    7. Upload Security
      - should block path traversal in delete
      - should block invalid file type

Test Suites: 1 passed
Tests:       all passed
Time:        (varies)
```

### What Tests Cover

- Health endpoint
- Admin login
- 2FA setup/enable/verify
- TOTP code validation
- Backup code usage
- Rate limiting (5 attempts)
- Category CRUD
- Quote requests
- Path traversal protection
- Token validation
- Security headers

---

## Troubleshooting

### Server Won't Start

**Error: "Missing required environment variable: DATABASE_URL"**

```bash
# Check .env file exists
cd backend
cat .env

# Should have:
DATABASE_URL="file:./dev.db"
JWT_SECRET=your-secret-here
```

**Error: "Port 5000 already in use"**

```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <process-id> /F

# Preferred: keep PORT=5000 and free the port
# You can also use backend/kill-port.ps1 (defaults to 5000)
```

---

### Database Issues

**Error: "Table does not exist"**

```bash
# Apply migrations
cd backend
npx prisma migrate deploy

# Or push schema
npx prisma db push
```

**Error: "Column 'twoFactorSecret' not found"**

```bash
# Migration not applied
npx prisma db push

# Verify in Prisma Studio
npx prisma studio
```

---

### 2FA Issues

**Error: "Invalid verification code" (but code is correct)**

- **Clock skew**: Ensure system time is correct
- **Code expired**: TOTP codes change every 30 seconds
- **Wrong secret**: Verify you scanned correct QR code
- **Already used**: TOTP codes have 30s window, don't reuse

**Can't scan QR code**

- Copy base64 string from response
- Paste into online base64-to-image converter
- Or manually enter secret in authenticator app

---

### Rate Limiting

**Error: "Too many requests" during normal testing**

```bash
# Wait 5 minutes, or restart server
# Or flush Redis (if using)
redis-cli FLUSHDB

# Or test with different IP (use VPN)
```

---

### Terminal Output Issues

If PowerShell/curl commands show no output:

```powershell
# Try explicit encoding
$response = Invoke-WebRequest -Uri "http://localhost:5000/health"
$response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10

# Or use Invoke-RestMethod
Invoke-RestMethod -Uri "http://localhost:5000/health"
```

---

## Summary Checklist

### Basic Functionality

- [ ] Server starts without errors
- [ ] Health endpoint responds
- [ ] Database connected
- [ ] Migrations applied
- [ ] Admin bootstrap works (`backend/setup-admin.js`)
- [ ] Admin login works

### 2FA Functionality

- [ ] 2FA setup generates QR code
- [ ] QR code can be scanned
- [ ] TOTP codes work in authenticator
- [ ] 2FA enable succeeds
- [ ] Login requires 2FA after enable
- [ ] TOTP verification works
- [ ] Backup codes work
- [ ] Used backup codes rejected
- [ ] 2FA disable works

### Security

- [ ] Rate limiting blocks after limit
- [ ] Path traversal attacks blocked
- [ ] Invalid tokens rejected
- [ ] Expired tokens rejected
- [ ] Security headers present
- [ ] HttpOnly cookies set
- [ ] Admin endpoints require auth

### Performance

- [ ] Health check < 100ms
- [ ] Login < 500ms
- [ ] List endpoints < 300ms
- [ ] No memory leaks

---

## Next Steps

1. **Complete Manual Testing**: Follow Phase 1-8 above
2. **Run Automated Tests**: `npm test`
3. **Import Postman Collection**: Use for ongoing testing
4. **Deploy to Production**: After all tests pass

---

**Need Help?**

- Check `docs/API_TESTING_GUIDE.md` for API reference
- Check `backend/tests/README.md` for test documentation
- Review `backend/backend.log` for server errors

---

**Last Updated**: January 15, 2026  
**Version**: 1.0.0
