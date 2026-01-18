# API Testing Guide - Electrical Supplier Website

## Overview

This guide provides comprehensive testing procedures for all API endpoints, with special focus on authentication, 2FA, and security features.

**Base URL**: `http://localhost:5000`  
**API Version**: `v1`  
**API Prefix**: `/api/v1`

---

## 1. Health Check

### Endpoint: `GET /health`

**Purpose**: Verify server status and security features

**Request**:

```http
GET http://localhost:5000/health
```

**Expected Response** (200 OK):

```json
{
  "status": "ok",
  "timestamp": "2026-01-15T10:30:00.000Z",
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

**Verification**:

- ✅ Status is "ok"
- ✅ Security features are enabled
- ✅ Response time < 100ms

---

## 2. Authentication Flow (Without 2FA)

### 2.1 Admin Bootstrap (Development)

There is **no public** `POST /api/v1/auth/register` endpoint in this project.

To create a local admin for testing, use the bootstrap script:

- File: `backend/setup-admin.js`
- Creates (or recreates) the default admin:
  - Email: `admin@electricalsupplier.com`
  - Password: `admin123`

**Verification**:

- ✅ Admin exists in database
- ✅ Password is hashed (not returned by any API)
- ✅ `twoFactorEnabled` defaults to `false`

---

### 2.2 Admin Login (Without 2FA)

**Endpoint**: `POST /api/v1/auth/login`

**Purpose**: Authenticate and receive JWT tokens

**Request**:

```http
POST http://localhost:5000/api/v1/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "SecureP@ssw0rd123!"
}
```

**Expected Response** (200 OK):

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "admin": {
      "id": "uuid-string",
      "email": "admin@example.com",
      "name": "Test Administrator",
      "role": "admin",
      "twoFactorEnabled": false
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Set-Cookie Headers**:

```
Set-Cookie: refreshToken=refresh-jwt; HttpOnly; Secure; SameSite=Strict; Max-Age=604800
```

**Verification**:

- ✅ `token` returned in response body
- ✅ `refreshToken` set as HttpOnly cookie
- ✅ Invalid credentials return 401
- ✅ Tokens can be verified with JWT decoder

---

### 2.3 Token Refresh

**Endpoint**: `POST /api/v1/auth/refresh`

**Purpose**: Refresh access token using refresh token

**Request**:

```http
POST http://localhost:5000/api/v1/auth/refresh
Cookie: refreshToken=your-refresh-token-here
```

**Expected Response** (200 OK):

```json
{
  "success": true,
  "message": "Token refreshed",
  "data": {
    "token": "new-jwt-token"
  }
}
```

**Verification**:

- ✅ New `token` issued
- ✅ Old token no longer valid
- ✅ Missing/invalid refreshToken returns 401

---

## 3. Two-Factor Authentication (2FA) Flow

### 3.1 Setup 2FA (Get QR Code)

**Endpoint**: `POST /api/v1/auth/2fa/setup`

**Purpose**: Generate TOTP secret and QR code for authenticator app

**Request**:

```http
POST http://localhost:5000/api/v1/auth/2fa/setup
Authorization: Bearer your-access-token
```

**Expected Response** (200 OK):

```json
{
  "success": true,
  "message": "2FA setup initiated",
  "data": {
    "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg...",
    "secret": "JBSWY3DPEHPK3PXP"
  }
}
```

**Verification**:

- ✅ QR code is base64-encoded PNG image
- ✅ Secret is a base32 TOTP secret (typically 32 chars)
- ✅ Unauthorized request returns 401
- ✅ QR code can be scanned with Google Authenticator/Authy

**Manual Test**: Scan QR code with authenticator app and note the 6-digit code

---

### 3.2 Enable 2FA

**Endpoint**: `POST /api/v1/auth/2fa/enable`

**Purpose**: Verify TOTP code and activate 2FA

**Request**:

```http
POST http://localhost:5000/api/v1/auth/2fa/enable
Authorization: Bearer your-access-token
Content-Type: application/json

{
  "token": "123456"
}
```

**Expected Response** (200 OK):

```json
{
  "success": true,
  "message": "2FA enabled successfully",
  "data": {
    "backupCodes": ["A1B2-C3D4-E5F6", "1234-5678-90AB", "...more..."]
  }
}
```

**Verification**:

- ✅ Valid TOTP code enables 2FA
- ✅ Invalid code returns 400 "Invalid verification code"
- ✅ Database updated with `twoFactorEnabled=true`
- ✅ Secret is encrypted in database
- ✅ Backup codes are hashed

---

### 3.3 Login with 2FA (Step 1: Initial Login)

**Endpoint**: `POST /api/v1/auth/login`

**Purpose**: Initial authentication with credentials

**Request**:

```http
POST http://localhost:5000/api/v1/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "SecureP@ssw0rd123!"
}
```

**Expected Response** (200 OK):

```json
{
  "success": true,
  "message": "Two-factor authentication required",
  "data": {
    "requiresTwoFactor": true,
    "admin": {
      "id": "uuid-string",
      "email": "admin@example.com",
      "name": "Test Administrator",
      "role": "admin",
      "twoFactorEnabled": true
    }
  }
}
```

**Verification**:

- ✅ No access token returned
- ✅ requiresTwoFactor is true
- ✅ `admin.id` provided for 2FA verification
- ✅ Cannot access protected routes yet

---

### 3.4 Login with 2FA (Step 2: Verify TOTP)

**Endpoint**: `POST /api/v1/auth/verify-2fa`

**Purpose**: Complete login with TOTP code

**Request**:

```http
POST http://localhost:5000/api/v1/auth/verify-2fa
Content-Type: application/json

{
  "adminId": "uuid-string-from-step-1",
  "code": "654321"
}
```

**Expected Response** (200 OK):

```json
{
  "success": true,
  "message": "2FA verification successful",
  "data": {
    "admin": {
      "id": "uuid-string",
      "email": "admin@example.com",
      "name": "Test Administrator",
      "role": "admin",
      "twoFactorEnabled": true
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Verification**:

- ✅ Access token (`token`) issued after verification
- ✅ `refreshToken` cookie set
- ✅ Invalid TOTP returns 401
- ✅ Can now access protected routes

---

### 3.5 Verify with Backup Code

**Endpoint**: `POST /api/v1/auth/2fa/verify`

**Purpose**: Verify a TOTP token or a backup code against an email.

Note: This endpoint returns `{ verified: true }` and **does not** issue a JWT.
For completing login and receiving a JWT, use `POST /api/v1/auth/verify-2fa`.

**Request**:

```http
POST http://localhost:5000/api/v1/auth/2fa/verify
Content-Type: application/json

{
  "email": "admin@example.com",
  "token": "A1B2-C3D4-E5F6",
  "useBackupCode": true
}
```

**Expected Response** (200 OK):

```json
{
  "success": true,
  "message": "2FA verification successful",
  "data": {
    "verified": true
  }
}
```

**Verification**:

- ✅ Valid backup code accepted
- ✅ Used backup code is invalidated
- ✅ Invalid backup code returns 400
- ✅ Same code cannot be used twice

---

### 3.6 Check 2FA Status

**Endpoint**: `GET /api/v1/auth/2fa/status`

**Purpose**: Get current 2FA configuration

**Request**:

```http
GET http://localhost:5000/api/v1/auth/2fa/status
Authorization: Bearer your-access-token
```

**Expected Response** (200 OK):

```json
{
  "success": true,
  "data": {
    "enabled": true,
    "backupCodesRemaining": 4
  }
}
```

---

### 3.7 Disable 2FA

**Endpoint**: `POST /api/v1/auth/2fa/disable`

**Purpose**: Disable two-factor authentication

**Request**:

```http
POST http://localhost:5000/api/v1/auth/2fa/disable
Authorization: Bearer your-access-token
Content-Type: application/json

{
  "token": "789012"
}
```

**Expected Response** (200 OK):

```json
{
  "success": true,
  "message": "2FA disabled successfully",
  "data": null
}
```

**Verification**:

- ✅ Requires valid TOTP to disable
- ✅ Secret and backup codes cleared from database
- ✅ Future logins don't require 2FA

---

## 4. Rate Limiting Tests

### 4.1 2FA Rate Limit (5 attempts per 5 minutes)

**Test**: Attempt 2FA verification 6 times rapidly

**Requests**:

```http
POST http://localhost:5000/api/v1/auth/verify-2fa
Content-Type: application/json

{
  "adminId": "uuid-string",
  "token": "000000"
}
```

**Expected Behavior**:

- ✅ Requests 1-5: 401 "Invalid verification code"
- ✅ Request 6: 429 "Too many requests"
- ✅ Response includes "Retry-After" header
- ✅ After 5 minutes, can retry

**Headers on 429 Response**:

```
Retry-After: 300
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 0
X-RateLimit-Reset: <timestamp>
```

---

### 4.2 General Rate Limit

**Test**: Make rapid requests to any endpoint

**Expected**: 100 requests per 15 minutes per IP

---

## 5. Category Management

### 5.1 List Categories

**Endpoint**: `GET /api/v1/categories`

**Request**:

```http
GET http://localhost:5000/api/v1/categories?page=1&limit=10&isActive=true
```

**Expected Response** (200 OK):

```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "id": "uuid",
        "name": "Switches",
        "slug": "switches",
        "icon": "icon-url",
        "description": "Electrical switches",
        "displayOrder": 1,
        "isActive": true,
        "productCount": 15
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 5,
      "totalPages": 1
    }
  }
}
```

---

### 5.2 Create Category (Admin Only)

**Endpoint**: `POST /api/v1/categories`

**Request**:

```http
POST http://localhost:5000/api/v1/categories
Authorization: Bearer your-admin-token
Content-Type: application/json

{
  "name": "LED Lights",
  "slug": "led-lights",
  "description": "Energy-efficient LED lighting solutions",
  "icon": "/uploads/icons/led.png",
  "displayOrder": 1
}
```

**Expected Response** (201 Created):

```json
{
  "success": true,
  "message": "Category created successfully",
  "data": {
    "category": {
      "id": "new-uuid",
      "name": "LED Lights",
      "slug": "led-lights",
      "icon": "/uploads/icons/led.png",
      "description": "Energy-efficient LED lighting solutions",
      "displayOrder": 1,
      "isActive": true,
      "createdAt": "2026-01-15T10:00:00.000Z",
      "updatedAt": "2026-01-15T10:00:00.000Z"
    }
  }
}
```

**Verification**:

- ✅ Requires authentication
- ✅ Slug is unique
- ✅ Duplicate slug returns 400

---

## 6. Product Management

### 6.1 List Products

**Endpoint**: `GET /api/v1/products`

**Request**:

```http
GET http://localhost:5000/api/v1/products?page=1&limit=20&categoryId=uuid&brandId=uuid&search=LED
```

**Query Parameters**:

- `page` (default: 1)
- `limit` (default: 20, max: 100)
- `categoryId` (optional filter)
- `brandId` (optional filter)
- `search` (optional search term)
- `isFeatured` (optional: true/false)
- `isActive` (optional: true/false)

---

### 6.2 Get Product by Slug

**Endpoint**: `GET /api/v1/products/:slug`

**Request**:

```http
GET http://localhost:5000/api/v1/products/led-panel-light-20w
```

**Expected Response** (200 OK):

```json
{
  "success": true,
  "data": {
    "product": {
      "id": "uuid",
      "name": "LED Panel Light 20W",
      "slug": "led-panel-light-20w",
      "model": "LP-20W-6000K",
      "description": "Energy efficient LED panel light",
      "keyFeatures": ["20W power", "6000K cool white"],
      "image": "/uploads/products/led-panel.jpg",
      "images": ["/uploads/products/led-panel-1.jpg"],
      "datasheetUrl": "/uploads/datasheets/led-panel.pdf",
      "category": {
        "id": "uuid",
        "name": "LED Lights",
        "slug": "led-lights"
      },
      "brand": {
        "id": "uuid",
        "name": "Philips",
        "logo": "/uploads/brands/philips.png"
      },
      "specifications": [
        {
          "specKey": "Wattage",
          "specValue": "20W",
          "displayOrder": 1
        }
      ],
      "isActive": true,
      "isFeatured": true
    }
  }
}
```

---

## 7. Quote Request

### 7.1 Submit Quote Request

**Endpoint**: `POST /api/v1/quotes`

**Request**:

```http
POST http://localhost:5000/api/v1/quotes
Content-Type: application/json

{
  "name": "John Doe",
  "company": "ABC Electrical",
  "phone": "+1234567890",
  "whatsapp": "+1234567890",
  "email": "john@abc.com",
  "productName": "LED Panel Light 20W",
  "quantity": "50 units",
  "projectDetails": "Office renovation project"
}
```

**Expected Response** (201 Created):

```json
{
  "success": true,
  "message": "Quote request submitted successfully",
  "data": {
    "quoteRequest": {
      "id": "uuid",
      "name": "John Doe",
      "company": "ABC Electrical",
      "phone": "+1234567890",
      "email": "john@abc.com",
      "status": "new",
      "createdAt": "2026-01-15T10:00:00.000Z"
    }
  }
}
```

**Verification**:

- ✅ No authentication required (public endpoint)
- ✅ Email validation
- ✅ Rate limited to prevent spam
- ✅ Admin receives email notification

---

## 8. File Upload

### 8.1 Upload Image

**Endpoint**: `POST /api/v1/upload`

**Purpose**: Upload product images, brand logos, datasheets

**Request**:

```http
POST http://localhost:5000/api/v1/upload
Authorization: Bearer your-admin-token
Content-Type: multipart/form-data

{
  "file": <binary-file-data>,
  "type": "product"
}
```

**Supported Types**:

- `product` - Product images
- `brand` - Brand logos
- `datasheet` - PDF datasheets
- `icon` - Category icons

**Expected Response** (200 OK):

```json
{
  "success": true,
  "message": "File uploaded successfully",
  "data": {
    "filename": "product_1736937600000_abc123.jpg",
    "path": "/uploads/products/product_1736937600000_abc123.jpg",
    "url": "http://localhost:5000/uploads/products/product_1736937600000_abc123.jpg"
  }
}
```

**Verification**:

- ✅ Requires authentication
- ✅ Magic-byte validation (checks actual file type, not extension)
- ✅ Max file size: 5MB
- ✅ Allowed images: JPEG, PNG, WebP, GIF
- ✅ Allowed documents: PDF
- ✅ Path traversal protection

---

### 8.2 Delete File (Admin Only)

**Endpoint**: `DELETE /api/v1/upload`

**Request**:

```http
DELETE http://localhost:5000/api/v1/upload
Authorization: Bearer your-admin-token
Content-Type: application/json

{
  "filename": "product_1736937600000_abc123.jpg",
  "type": "product"
}
```

**Expected Response** (200 OK):

```json
{
  "success": true,
  "message": "File deleted successfully"
}
```

**Security Tests**:

**Test 1: Path Traversal Attack**

```json
{
  "filename": "../../etc/passwd",
  "type": "product"
}
```

Expected: 400 "Invalid filename or type"

**Test 2: Null Byte Attack**

```json
{
  "filename": "file.jpg\u0000.exe",
  "type": "product"
}
```

Expected: 400 "Invalid filename or type"

**Test 3: Invalid Type**

```json
{
  "filename": "valid.jpg",
  "type": "../../uploads/brands"
}
```

Expected: 400 "Invalid filename or type"

---

## 9. Security Verification Tests

### 9.1 JWT Token Validation

**Test**: Access protected endpoint with expired token

**Expected**: 401 "Invalid or expired token"

---

### 9.2 Cookie Security

**Test**: Inspect Set-Cookie headers

**Expected Flags**:

- ✅ `HttpOnly` - Prevents JavaScript access
- ✅ `Secure` - HTTPS only (production)
- ✅ `SameSite=Strict` - CSRF protection
- ✅ Proper Max-Age values

---

### 9.3 Helmet Security Headers

**Test**: Check response headers on any endpoint

**Expected Headers**:

```
X-DNS-Prefetch-Control: off
X-Frame-Options: SAMEORIGIN
Strict-Transport-Security: max-age=15552000; includeSubDomains
X-Download-Options: noopen
X-Content-Type-Options: nosniff
X-XSS-Protection: 0
Content-Security-Policy: default-src 'self'
```

---

### 9.4 CORS Configuration

**Test**: Make request from unauthorized origin

**Request**:

```http
GET http://localhost:5000/api/v1/categories
Origin: http://malicious-site.com
```

**Expected**: CORS error, request blocked

**Test with authorized origin**:

```http
GET http://localhost:5000/api/v1/categories
Origin: http://localhost:5173
```

**Expected**: Success with CORS headers

---

## 10. Error Handling Tests

### 10.1 Validation Errors

**Test**: Submit invalid data

**Request**:

```http
POST http://localhost:5000/api/v1/auth/login
Content-Type: application/json

{
  "email": "not-an-email",
  "password": ""
}
```

**Expected Response** (400 Bad Request):

```json
{
  "success": false,
  "message": "Validation error",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    },
    {
      "field": "password",
      "message": "Password must be at least 8 characters"
    },
    {
      "field": "name",
      "message": "Name is required"
    }
  ]
}
```

---

### 10.2 404 Not Found

**Test**: Access non-existent endpoint

**Request**:

```http
GET http://localhost:5000/api/v1/nonexistent
```

**Expected Response** (404):

```json
{
  "success": false,
  "message": "Route not found: GET /api/v1/nonexistent"
}
```

---

### 10.3 500 Internal Server Error

**Test**: Trigger database error (stop database)

**Expected Response** (500):

```json
{
  "success": false,
  "message": "Internal server error"
}
```

---

## Summary Checklist

### Basic Functionality

- [ ] Health endpoint responds
- [ ] Admin bootstrap works (`backend/setup-admin.js`)
- [ ] Admin login works
- [ ] Token refresh works
- [ ] Categories CRUD works
- [ ] Products CRUD works
- [ ] Quote submission works
- [ ] File upload works

### 2FA Functionality

- [ ] 2FA setup generates QR code
- [ ] QR code can be scanned
- [ ] 2FA enable works with valid TOTP
- [ ] Login with 2FA requires two steps
- [ ] Backup codes work
- [ ] Used backup codes are invalidated
- [ ] 2FA disable works
- [ ] 2FA status endpoint works

### Security

- [ ] Rate limiting blocks after limit
- [ ] Invalid tokens rejected
- [ ] Expired tokens rejected
- [ ] HttpOnly cookies set
- [ ] Security headers present
- [ ] CORS blocks unauthorized origins
- [ ] Path traversal blocked
- [ ] Magic-byte validation works
- [ ] Admin-only endpoints protected

### Performance

- [ ] Health check < 100ms
- [ ] Login < 500ms
- [ ] List endpoints < 300ms
- [ ] No memory leaks
- [ ] Database queries optimized

---

## Notes

1. **Testing Order**: Follow the sequence above to ensure dependencies are met
2. **Authenticator Apps**: Google Authenticator, Authy, Microsoft Authenticator
3. **JWT Decoder**: Use jwt.io to inspect token contents
4. **Database Reset**: To start fresh, delete `prisma/dev.db` and run migrations
5. **Log Files**: Check `backend/backend.log` for server logs

---

**Last Updated**: January 15, 2026  
**API Version**: v1  
**Author**: Development Team
