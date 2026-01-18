# Security Hardening Implementation Guide

## Overview

This document outlines the comprehensive security improvements implemented in the Electrical Supplier B2B website project. These enhancements bring the application to near-production-grade security standards.

---

## ✅ Completed Security Enhancements

### 1. **Production Secret Validation** (Critical)

**Problem:** Application could start in production with insecure default secrets.

**Solution:**

- Enforced minimum secret length (32+ characters) in production
- Fail-fast on startup if secrets use known insecure defaults
- Validation for: `JWT_SECRET`, `JWT_REFRESH_SECRET`, `COOKIE_SECRET`

**Files Modified:**

- `backend/src/config/env.ts`

**Usage:**

```bash
# Development (lenient)
NODE_ENV=development npm start  # Works with defaults

# Production (strict)
NODE_ENV=production \
  JWT_SECRET="your-strong-32-char-secret-here-min" \
  JWT_REFRESH_SECRET="another-strong-32-char-refresh-secret" \
  COOKIE_SECRET="cookie-signing-32-char-secret-here" \
  npm start
```

**Testing:**

```bash
# This will FAIL in production:
NODE_ENV=production JWT_SECRET="weak" npm start

# Error: SECURITY ERROR: JWT_SECRET must be at least 32 characters in production. Current: 4
```

---

### 2. **Refresh Token Rotation & Server-Side Sessions** (High Impact)

**Problem:** JWT refresh tokens were stateless and couldn't be revoked. Token theft = persistent access.

**Solution:**

- **Server-side token storage** in database (hashed)
- **Automatic token rotation** on every refresh (one-time use)
- **Revocation support** (logout single session or all sessions)
- **Session tracking** (IP address, user agent, expiration)

**Database Schema:**

```sql
CREATE TABLE refresh_tokens (
  id TEXT PRIMARY KEY,
  token TEXT UNIQUE,              -- bcrypt hash (one-way)
  adminId TEXT NOT NULL,
  ipAddress TEXT,
  userAgent TEXT,
  isRevoked BOOLEAN DEFAULT false,
  expiresAt DATETIME NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**New Files:**

- `backend/src/modules/auth/refreshToken.repository.ts`
- `backend/prisma/migrations/20260118000000_add_refresh_tokens/migration.sql`

**Modified Files:**

- `backend/src/modules/auth/service.ts` (token generation & rotation)
- `backend/src/modules/auth/controller.ts` (IP/UA tracking)
- `backend/prisma/schema.prisma` (RefreshToken model)

**How It Works:**

1. **Login:**

   ```typescript
   // Service generates cryptographically random token
   const token = crypto.randomBytes(64).toString("hex");
   const hashedToken = bcrypt.hashSync(token, 10);

   // Store hash in DB
   await prisma.refreshToken.create({
     data: { token: hashedToken, adminId, ipAddress, userAgent, expiresAt },
   });

   // Return plain token to client (sent as HttpOnly cookie)
   return token;
   ```

2. **Refresh (Token Rotation):**

   ```typescript
   // Client sends token from cookie
   const hashedToken = bcrypt.hashSync(clientToken, 10);
   const record = await prisma.refreshToken.findUnique({
     where: { token: hashedToken },
   });

   // Validate: not revoked, not expired, admin active
   if (record.isRevoked || Date.now() > record.expiresAt) throw Error();

   // REVOKE old token (one-time use)
   await prisma.refreshToken.update({
     where: { id: record.id },
     data: { isRevoked: true },
   });

   // Issue NEW refresh token
   const newToken = generateNewToken();
   ```

3. **Logout:**

   ```typescript
   // Revoke single session
   await prisma.refreshToken.update({
     where: { id },
     data: { isRevoked: true },
   });

   // OR revoke all sessions (logout everywhere)
   await prisma.refreshToken.updateMany({
     where: { adminId },
     data: { isRevoked: true },
   });
   ```

**Security Benefits:**

- ✅ Stolen refresh token = one-time use, then invalid
- ✅ Logout = immediate token revocation (no waiting for expiry)
- ✅ Audit trail: see all active sessions per admin
- ✅ Session hijacking detection (IP/UA tracking)

**API Changes:**

```typescript
// NEW: Refresh now returns BOTH new access token AND new refresh token
POST /api/v1/auth/refresh
Response: {
  token: "new-access-token",
  refreshToken: "new-refresh-token"  // <-- UPDATED
}
```

---

### 3. **Role-Based Access Control (RBAC)** (Authorization Layer)

**Problem:** No permission enforcement beyond "is logged in". All admins had full access.

**Solution:**

- **4 role levels:** `superadmin > admin > editor > viewer`
- **Permission system:** resource + action (`product:create`, `quote:update`, etc.)
- **Middleware:** `authorizeRoles()`, `authorizePermission()`, `authorizeAnyPermission()`

**New File:**

- `backend/src/middlewares/rbac.middleware.ts`

**Role Permissions:**

| Role         | Permissions                                                    |
| ------------ | -------------------------------------------------------------- |
| `superadmin` | All resources, all actions                                     |
| `admin`      | Manage products, quotes, categories, brands; view other admins |
| `editor`     | Create/update products & quotes; read categories & brands      |
| `viewer`     | Read-only access to all resources                              |

**Usage Examples:**

```typescript
import {
  authorizeRoles,
  authorizePermission,
} from "../middlewares/rbac.middleware";

// Require specific role(s)
router.delete(
  "/products/:id",
  authenticateAdmin,
  authorizeRoles("superadmin", "admin"), // <-- Only superadmin or admin
  deleteProduct
);

// Require specific permission (more granular)
router.post(
  "/products",
  authenticateAdmin,
  authorizePermission("product", "create"), // <-- Must have product:create
  createProduct
);

// Require ANY of multiple permissions (OR logic)
router.get(
  "/dashboard",
  authenticateAdmin,
  authorizeAnyPermission(
    { resource: "product", action: "read" },
    { resource: "quote", action: "read" }
  ),
  getDashboard
);
```

**Service Layer Check:**

```typescript
import { canPerform } from "../middlewares/rbac.middleware";

// Check permission in business logic
if (!canPerform(admin.role, "brand", "delete")) {
  throw new AppError(403, "Cannot delete brands");
}
```

**Extending Permissions:**

```typescript
// Add new role
const ROLE_PERMISSIONS: Record<AdminRole, Permission[]> = {
  // ... existing roles
  moderator: [
    { resource: "quote", action: "read" },
    { resource: "quote", action: "update" },
  ],
};
```

---

### 4. **CSRF Protection** (Cookie-Based Auth Security)

**Problem:** Refresh tokens use HttpOnly cookies. Without CSRF protection, vulnerable to cross-site attacks.

**Solution:**

- **Double Submit Cookie pattern**
- Token in both cookie (HttpOnly) + request header/body
- Constant-time comparison (timing attack resistant)
- Auto-generated on first request, validated on state-changing ops

**New File:**

- `backend/src/middlewares/csrf.middleware.ts`

**How It Works:**

1. **Server generates token:**

   ```typescript
   const csrfToken = crypto.randomBytes(32).toString("hex");
   res.cookie("csrf-token", csrfToken, { httpOnly: true, sameSite: "strict" });
   res.setHeader("x-csrf-token", csrfToken); // Client reads this
   ```

2. **Client includes token in requests:**

   ```typescript
   // Frontend stores token from response header
   const csrfToken = response.headers["x-csrf-token"];

   // Include in subsequent requests
   fetch("/api/v1/auth/refresh", {
     method: "POST",
     headers: { "x-csrf-token": csrfToken }, // <-- REQUIRED
     credentials: "include", // Send cookies
   });
   ```

3. **Server validates:**

   ```typescript
   const cookieToken = req.cookies["csrf-token"];
   const requestToken = req.headers["x-csrf-token"];

   // Constant-time comparison (prevents timing attacks)
   crypto.timingSafeEqual(Buffer.from(cookieToken), Buffer.from(requestToken));
   ```

**Usage:**

```typescript
import {
  csrfProtection,
  setCsrfToken,
  validateCsrfToken,
} from "../middlewares/csrf.middleware";

// Option 1: Auto-protection (generates + validates)
router.post("/auth/refresh", csrfProtection, refreshAccessToken);

// Option 2: Manual control
router.get("/auth/login-form", setCsrfToken, renderLoginForm); // Generate
router.post("/auth/login", validateCsrfToken, handleLogin); // Validate

// Option 3: Protect entire route group
authRouter.use(csrfProtection);
```

**Security Benefits:**

- ✅ Prevents unauthorized state changes via cookie-based auth
- ✅ Timing-safe comparison (no side-channel leaks)
- ✅ Works with `SameSite=Strict` cookies for defense-in-depth

---

### 5. **Advanced Security Automation** (CI/CD Enhancements)

**Problem:** Manual security checks are inconsistent and error-prone.

**Solution:**

- **CodeQL SAST** (GitHub Advanced Security)
- **Snyk dependency scanning**
- **OWASP Dependency Check**
- **License compliance verification**
- **Daily automated scans**

**New File:**

- `.github/workflows/advanced-security.yml`

**What It Does:**

1. **Static Analysis (SAST):**

   - CodeQL scans for: SQL injection, XSS, auth bypasses, crypto misuse
   - Runs on every push/PR + daily schedule

2. **Dependency Vulnerabilities:**

   - Snyk checks npm packages for known CVEs
   - Severity threshold: HIGH+ only

3. **OWASP Dependency Check:**

   - Cross-references dependencies against NVD (National Vulnerability Database)
   - Generates HTML report

4. **License Compliance:**
   - Ensures no GPL/copyleft licenses in production dependencies
   - Summary report on every build

**Setup:**

```bash
# 1. Enable CodeQL in GitHub repo settings:
#    Settings → Security → Code scanning → CodeQL analysis

# 2. Add Snyk token as GitHub secret:
#    Settings → Secrets → New repository secret
#    Name: SNYK_TOKEN
#    Value: <your-snyk-api-token>

# 3. Workflow runs automatically on:
#    - Every push to main/develop
#    - Every PR
#    - Daily at 2 AM UTC
```

**Manual Trigger:**

```bash
# Run security checks locally
npm audit --audit-level=moderate
npx snyk test --severity-threshold=high
```

---

## 📋 Deployment Checklist (Production)

### Pre-Deployment

- [ ] Set strong secrets (min 32 chars each):

  ```bash
  JWT_SECRET=$(openssl rand -hex 32)
  JWT_REFRESH_SECRET=$(openssl rand -hex 32)
  COOKIE_SECRET=$(openssl rand -hex 32)
  ```

- [ ] Run Prisma migration:

  ```bash
  npx prisma migrate deploy
  ```

- [ ] Enable HTTPS (required for secure cookies)
- [ ] Set `NODE_ENV=production`
- [ ] Configure `CORS_ORIGIN` to your frontend domain
- [ ] Enable rate limiting (ensure Redis is configured)

### Post-Deployment

- [ ] Verify HSTS header: `curl -I https://your-domain.com | grep Strict-Transport-Security`
- [ ] Verify CSRF protection: Attempt request without token → should return 403
- [ ] Test token rotation: Refresh access token → old refresh token should fail
- [ ] Test logout: Verify refresh token is revoked in database
- [ ] Monitor security logs for unusual activity

### Optional (Recommended)

- [ ] Set up log aggregation (DataDog, Splunk, ELK)
- [ ] Configure admin 2FA for all accounts
- [ ] Implement IP whitelisting for admin routes
- [ ] Set up automated database backups
- [ ] Enable Snyk/CodeQL GitHub alerts

---

## 🛡️ Security Posture Summary

### Before

- ❌ Insecure default secrets accepted in production
- ❌ Refresh tokens couldn't be revoked (no server-side tracking)
- ❌ No role-based access control (all-or-nothing admin access)
- ❌ CSRF protection missing for cookie-based auth
- ❌ Manual security audits only

### After ✅

- ✅ Production fails on weak secrets (enforced min 32 chars)
- ✅ Refresh tokens: server-side storage + automatic rotation + revocation
- ✅ RBAC: 4 role levels + granular permission system
- ✅ CSRF protection: double-submit cookie pattern with timing-safe comparison
- ✅ Automated security: SAST, dependency scanning, license checks (daily)

---

## 🔧 Developer Guide

### Testing RBAC Locally

```typescript
// 1. Create test admin with different roles
npx tsx backend/create-admin.ts --email editor@test.com --role editor

// 2. Test permission enforcement
// Try deleting a product as 'editor' → should get 403

// 3. Check service layer
import { canPerform } from './middlewares/rbac.middleware';
console.log(canPerform('editor', 'product', 'delete'));  // false
console.log(canPerform('admin', 'product', 'delete'));   // true
```

### Testing Token Rotation

```typescript
// 1. Login
const loginRes = await fetch("/api/v1/auth/login", {
  method: "POST",
  body: JSON.stringify({ email, password }),
  credentials: "include", // Important: send cookies
});

// 2. Refresh token
const refreshRes1 = await fetch("/api/v1/auth/refresh", {
  method: "POST",
  credentials: "include",
});
// → Returns: { token: "new-access-1", refreshToken: "new-refresh-1" }

// 3. Try refreshing with OLD token (from step 1)
const refreshRes2 = await fetch("/api/v1/auth/refresh", {
  method: "POST",
  credentials: "include", // Old refresh token cookie
});
// → Should FAIL with 401 (token already revoked)
```

### Cleaning Up Expired Tokens

```typescript
// Add to cron job or scheduled task
import { RefreshTokenRepository } from "./modules/auth/refreshToken.repository";

const repo = new RefreshTokenRepository();
await repo.deleteExpired(); // Deletes all tokens past expiresAt
```

---

## 📚 Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [JWT Best Practices](https://datatracker.ietf.org/doc/html/rfc8725)
- [CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [Refresh Token Rotation](https://auth0.com/docs/secure/tokens/refresh-tokens/refresh-token-rotation)

---

## 🐛 Troubleshooting

### "SECURITY ERROR: JWT_SECRET must be at least 32 characters"

**Cause:** Production mode requires strong secrets.  
**Fix:** Set environment variables with 32+ character values.

### "Invalid refresh token" after successful login

**Cause:** Token rotation removed old token but client still using it.  
**Fix:** Frontend must update stored refresh token on every `/auth/refresh` response.

### RBAC 403 errors for valid admin

**Cause:** Admin role doesn't have required permission.  
**Fix:** Update role permissions in `rbac.middleware.ts` or upgrade admin role.

### CSRF token mismatch

**Cause:** Token not included in request header/body, or cookie expired.  
**Fix:** Frontend must read `x-csrf-token` from login response and include in subsequent requests.

---

**Document Version:** 1.0  
**Last Updated:** January 18, 2026  
**Maintained By:** Security Team
