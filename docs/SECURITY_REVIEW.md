# Security Review: Headers & Logging

**Prepared by:** Automated review (AI-assisted)  
**Status:** Informational

## Overview

This document summarizes a review of HTTP security header configuration and logging practices intended to reduce credential leakage and improve secure defaults. Validate behavior in your deployment by inspecting response headers and reviewing runtime logs.

## Security Headers Review

### Headers configured

#### HSTS (HTTP Strict Transport Security)

```typescript
// Backend: src/app.ts
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

- **Enabled:** Production only, when HTTPS is detected
- **Max Age:** 31,536,000 seconds (1 year)
- **Scope:** Includes subdomains
- **Preload:** Ready for HSTS preload list

#### Content Security Policy (CSP)

```typescript
// Backend: src/app.ts (Helmet configuration)
defaultSrc: ["'self'"];
styleSrc: ["'self'", "'unsafe-inline'"]; // Allow inline styles for React
imgSrc: ["'self'", "data:", "https:"]; // Allow data URIs and HTTPS images
scriptSrc: ["'self'"]; // Block inline scripts
frameSrc: ["'none'"]; // Prevent framing
objectSrc: ["'none'"]; // Block plugins
connectSrc: ["'self'"]; // API calls to same origin
fontSrc: ["'self'"];
mediaSrc: ["'self'"];
manifestSrc: ["'self'"];
workerSrc: ["'self'"];
formAction: ["'self'"]; // Prevent form hijacking
frameAncestors: ["'none'"]; // Clickjacking protection
baseUri: ["'self'"]; // Base tag restriction
```

#### X-Frame-Options

```
X-Frame-Options: DENY
```

- Prevents clickjacking attacks
- No exceptions (frame-ancestors CSP also enforces)

#### X-Content-Type-Options

```
X-Content-Type-Options: nosniff
```

- Prevents MIME-type sniffing
- Forces browsers to respect declared Content-Type

#### X-XSS-Protection

```
X-XSS-Protection: 1; mode=block
```

- Legacy XSS filter (for older browsers)
- Modern browsers rely on CSP

#### Referrer-Policy

```
Referrer-Policy: strict-origin-when-cross-origin
```

- Send full URL only to same origin
- Send origin only to external sites (HTTPS→HTTPS)
- No referrer on HTTPS→HTTP downgrade

#### X-Permitted-Cross-Domain-Policies

```
X-Permitted-Cross-Domain-Policies: none
```

- Prevents Adobe Flash/PDF from loading cross-domain content

#### X-Robots-Tag

```
X-Robots-Tag: noindex, nofollow
```

- Applied to `/admin` and `/api` routes
- Prevents search engine indexing of sensitive endpoints

### Frontend (Nginx) Headers

**File: `frontend/nginx.conf`**

```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

## Logging Security Review

### Sensitive data redaction

#### Backend Logger Configuration

**File: `backend/src/utils/logger.ts`**

Implemented Pino redaction for sensitive fields:

```typescript
const redact = {
  paths: [
    "password",
    "*.password",
    "req.body.password",
    "token",
    "*.token",
    "req.body.token",
    "secret",
    "*.secret",
    "authorization",
    "*.authorization",
    "cookie",
    "*.cookie",
    "req.headers.cookie",
    "req.headers.authorization",
    "apiKey",
    "*.apiKey",
    "accessToken",
    "*.accessToken",
    "refreshToken",
    "*.refreshToken",
    "csrfToken",
    "*.csrfToken",
  ],
  censor: "[REDACTED]",
};
```

#### HTTP Request Logger Redaction

**File: `backend/src/app.ts`**

HTTP request logging (pino-http) redacts:

```typescript
redact: {
  paths: [
    'req.headers.authorization',
    'req.headers.cookie',
    'req.headers["x-api-key"]',
    'req.body.password',
    'req.body.token',
    'req.body.secret',
    'res.headers["set-cookie"]',
  ],
  censor: '[REDACTED]',
}
```

### What Gets Redacted

| Field Type           | Example                     | Logged As                     |
| -------------------- | --------------------------- | ----------------------------- |
| Passwords            | `password: "MySecret123"`   | `password: "[REDACTED]"`      |
| JWT Tokens           | `token: "eyJhbGc..."`       | `token: "[REDACTED]"`         |
| Authorization Header | `Authorization: Bearer xyz` | `authorization: "[REDACTED]"` |
| Cookies              | `Cookie: session=abc123`    | `cookie: "[REDACTED]"`        |
| API Keys             | `apiKey: "sk_live_..."`     | `apiKey: "[REDACTED]"`        |
| Refresh Tokens       | `refreshToken: "..."`       | `refreshToken: "[REDACTED]"`  |
| CSRF Tokens          | `csrfToken: "..."`          | `csrfToken: "[REDACTED]"`     |

### Logging review notes

Searched codebase for potential credential leaks:

```bash
# No password/token/secret logged directly
grep -r "logger.*password" backend/src/
grep -r "logger.*token" backend/src/
grep -r "logger.*secret" backend/src/
```

**Results:**

- No direct password logging found in basic string searches
- Token references appear in safe contexts (e.g., operational messages)
- Secret-related messages should avoid printing actual secret values

## CORS Configuration

**File: `backend/src/app.ts`**

```typescript
cors({
  origin: env.CORS_ORIGIN, // Whitelist only
  credentials: true, // Allow cookies
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-CSRF-Token",
    "x-csrf-token",
  ],
  exposedHeaders: ["x-csrf-token"], // Allow frontend to read CSRF token
});
```

- Origin whitelist (not `*`)
- Credentials enabled for cookie-based auth
- Explicit allowed methods
- Explicit allowed headers
- CSRF token exposed for frontend consumption

## Rate Limiting

**File: `backend/src/middlewares/rateLimit.middleware.ts`**

- Redis-backed rate limiting (falls back to in-memory)
- IP-based (respects `X-Forwarded-For` when behind proxy)
- Different limits per endpoint type:
  - Authentication: 5 requests/15min
  - General API: 100 requests/15min
  - Quote submission: 3 requests/hour

## Cookie Security

**File: `backend/src/modules/auth/controller.ts`**

Refresh token cookie configuration:

```typescript
httpOnly: true,      // Prevent JavaScript access
secure: isProduction, // HTTPS only in production
sameSite: 'strict',  // CSRF protection
maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
path: '/api/auth',   // Limit cookie scope
```

- HttpOnly (prevents XSS cookie theft)
- Secure flag in production
- SameSite=strict (CSRF protection)
- Path restriction

## Request ID Tracing

**File: `backend/src/app.ts`**

```typescript
const requestId = (req.headers["x-request-id"] as string) || randomUUID();
req.headers["x-request-id"] = requestId;
res.setHeader("X-Request-ID", requestId);
```

- Every request gets a unique ID
- ID propagated to response headers
- Useful for distributed tracing and log correlation

## Testing

### Verification commands

Run these to validate behavior in your environment:

```bash
# 1. Build backend (verify TypeScript compiles)
cd backend && npm run build

# 2. Run tests (verify security changes don't break logic)
npm test

# 3. Check for credential logging
grep -r "logger.*password\|logger.*token\|logger.*secret" src/

# 4. Lint check
npm run lint
```

Note: Results depend on the current code and environment. Treat this section as a checklist.

## Recommendations

### Implemented (documented controls)

- [x] HSTS with 1-year max-age
- [x] CSP with restrictive default-src
- [x] Clickjacking protection (X-Frame-Options + CSP frame-ancestors)
- [x] MIME-type sniffing prevention
- [x] Referrer policy
- [x] Sensitive data redaction in logs
- [x] HttpOnly cookies for refresh tokens
- [x] SameSite cookie attribute
- [x] Rate limiting per endpoint
- [x] Request ID tracing

### Optional enhancements

1. **Subresource Integrity (SRI)**
   - Add integrity hashes for CDN-loaded scripts/styles
   - File: `frontend/index.html`

2. **Certificate Transparency (Expect-CT)**
   - Add `Expect-CT` header in production (requires CA monitoring)
   - File: `backend/src/app.ts`

3. **Feature Policy / Permissions Policy**
   - Restrict browser features (geolocation, camera, microphone)
   - File: `backend/src/app.ts`

4. **Security.txt**
   - Add `/.well-known/security.txt` for responsible disclosure
   - File: `frontend/public/.well-known/security.txt`

5. **Log Aggregation Alerting**
   - Set up alerts for high error rates, auth failures
   - Platform: Sentry, DataDog, or CloudWatch

## Summary of improvements

Key improvements reflected in this review include:

- Comprehensive log redaction
- Enhanced CSP directives
- Referrer-Policy header
- X-Permitted-Cross-Domain-Policies

Minor follow-ups to consider (as applicable to your deployment):

- Subresource Integrity (SRI) for externally loaded assets (if any are introduced)
- Automated dependency/security scanning in CI (e.g., Dependabot, Snyk)

## References

- [OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/)
- [MDN: CSP Reference](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
- [Helmet.js Documentation](https://helmetjs.github.io/)
