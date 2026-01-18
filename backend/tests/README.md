# Test Suite Documentation

## Overview

Comprehensive test suite for the Electrical Supplier Website API with focus on security and 2FA functionality.

## Prerequisites

1. **Install Test Dependencies**:

   ```bash
   cd backend
   npm install --save-dev jest axios speakeasy
   ```

2. **Server Running**:
   - Ensure backend server is running on `http://localhost:5000`
   - Database should be accessible
   - Redis is optional (falls back to in-memory)

## Running Tests

### Run All Tests

```bash
cd backend
npm test
```

### Run Specific Test Suite

```bash
npx jest tests/api.test.js
```

### Run with Coverage

```bash
npx jest --coverage
```

### Run in Watch Mode

```bash
npx jest --watch
```

## Test Structure

### 1. Health Check

- ✅ Server responds
- ✅ Security features enabled
- ✅ Response time acceptable

### 2. Authentication (No 2FA)

- ✅ Login with valid credentials
- ✅ Reject invalid credentials
- ✅ Verify access token

### 3. Two-Factor Authentication Setup

- ✅ Setup 2FA (get QR code and secret)
- ✅ Reject invalid TOTP code
- ✅ Enable 2FA with valid TOTP
- ✅ Get 2FA status

### 4. Login with 2FA

- ✅ Require 2FA on login (step 1)
- ✅ Reject invalid TOTP
- ✅ Complete login with valid TOTP (step 2)
- ✅ Verify with backup code
- ✅ Reject reused backup code

### 5. Rate Limiting

- ✅ Block after 5 failed 2FA attempts
- ✅ Return 429 status
- ✅ Include Retry-After header

### 6. Category Management

- ✅ List categories
- ✅ Create category (admin only)
- ✅ Reject without authentication
- ✅ Get by slug

### 7. Quote Requests

- ✅ Submit quote (public endpoint)
- ✅ List quotes (admin only)

### 8. Upload Security

- ✅ Block path traversal (..)
- ✅ Block invalid file types
- ✅ Block path separators in filename

### 9. Security Headers

- ✅ Helmet headers present
- ✅ Cookie security flags (manual check)

### 10. Cleanup

- ✅ Disable 2FA after tests

## Expected Output

```
PASS  tests/api.test.js
  Electrical Supplier API Tests
    1. Health Check
      ✓ should return server health status (45ms)
    ...

Test Suites: 1 passed, 1 total
Tests:       all passed
```

## Manual Testing Checklist

Some tests require manual verification:

### 1. Browser Testing

- [ ] Navigate to `http://localhost:5000/health`
- [ ] Check DevTools → Network → Response Headers for security headers
- [ ] Check DevTools → Application → Cookies for HttpOnly, Secure, SameSite flags

### 2. QR Code Scanning

- [ ] Run 2FA setup test
- [ ] Copy QR code from test output or response
- [ ] Scan with Google Authenticator/Authy
- [ ] Verify 6-digit codes work

### 3. Rate Limiting

- [ ] Try rapid requests to any endpoint
- [ ] Should get 429 after limit exceeded
- [ ] Wait for Retry-After time
- [ ] Verify can make requests again

### 4. File Upload

- [ ] Upload valid image (JPEG, PNG)
- [ ] Try uploading .exe renamed to .jpg (should fail magic-byte check)
- [ ] Try uploading >5MB file (should fail)

## Troubleshooting

### Test Failures

**"Connection refused"**

- Ensure backend server is running
- Check port 5000 is not blocked
- Verify DATABASE_URL in .env

**"Rate limit already active"**

- Wait 5 minutes between test runs
- Or restart server to reset rate limits
- Or flush Redis if using Redis store

**"Invalid TOTP code"**

- Clock skew issue - ensure system time is correct
- TOTP codes expire every 30 seconds
- speakeasy uses system time by default

**"Database locked"**

- SQLite limitation with concurrent writes
- Increase test timeout
- Or use PostgreSQL for testing

### Performance Issues

**Slow Tests**

- Check database performance
- Verify no other processes using port 5000
- Consider using test database

**Timeout Errors**

- Increase `testTimeout` in jest.config.js
- Check server logs for errors
- Verify network connectivity

## CI/CD Integration

### GitHub Actions Example

```yaml
name: API Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v2

      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: "18"

      - name: Install dependencies
        run: |
          cd backend
          npm ci

      - name: Run migrations
        run: |
          cd backend
          npx prisma migrate deploy

      - name: Start server
        run: |
          cd backend
          npm run dev &
          sleep 10

      - name: Run tests
        run: |
          cd backend
          npm test
```

## Code Coverage

Target coverage goals:

- Overall: 80%
- Critical paths (auth, 2FA): 95%
- Error handlers: 85%

Generate coverage report:

```bash
npm test -- --coverage
open coverage/lcov-report/index.html
```

## Security Testing

Additional security tests to run manually:

1. **SQL Injection**: Try malicious input in search fields
2. **XSS**: Try `<script>` tags in text fields
3. **CSRF**: Try requests without proper origin
4. **Brute Force**: Test rate limiting thoroughly
5. **Token Expiry**: Wait 15 minutes and verify token expires

## Load Testing

Use Artillery or k6 for load testing:

```bash
# Install Artillery
npm install -g artillery

# Run load test
artillery quick --count 100 --num 10 http://localhost:5000/health
```

Expected:

- 100 requests/second sustained
- <200ms avg response time
- 0% error rate

## Continuous Monitoring

Monitor in production:

- Error rates (should be <0.1%)
- Response times (p95 <500ms)
- Rate limit hits (normal usage shouldn't hit limits)
- Failed login attempts (detect brute force)

---

**Last Updated**: January 15, 2026  
**Test Suite Version**: 1.0.0  
**Maintainer**: Development Team
