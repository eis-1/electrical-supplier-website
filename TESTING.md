# Testing Guide

This document provides a comprehensive overview of the testing strategy and how to run all tests.

## 🎯 Testing Philosophy

This project implements a **multi-layered testing approach** to ensure quality at every level:

1. **Unit/Integration Tests** - Backend API functionality
2. **End-to-End Tests** - Complete user workflows
3. **Performance Tests** - Load times and Core Web Vitals
4. **Accessibility Tests** - WCAG 2.1 AA compliance
5. **Security Tests** - Vulnerability scanning and penetration testing

## 📊 Test Coverage Overview

| Test Type           | Tool                | Coverage            | Status         |
| ------------------- | ------------------- | ------------------- | -------------- |
| Backend Integration | Jest                | 70%+ lines          | ✅ Enforced    |
| E2E User Flows      | Playwright          | All critical paths  | ✅ Automated   |
| Performance Budget  | Lighthouse CI       | Desktop + Mobile    | ✅ Enforced    |
| Accessibility       | axe-core            | WCAG 2.1 AA         | ✅ Automated   |
| Security Scanning   | CodeQL, Snyk, OWASP | Dependencies + Code | ✅ CI Pipeline |

---

## 1️⃣ Backend Integration Tests

### Quick Start

```bash
cd backend
npm test                    # Run all tests
npm run test:coverage       # Run with coverage report
npm run test:watch          # Watch mode for development
```

### What's Tested

- ✅ Health check endpoint
- ✅ Authentication (login, JWT, refresh tokens)
- ✅ Two-Factor Authentication (2FA setup, enable, verify, backup codes, disable)
- ✅ Category management (CRUD)
- ✅ Product management (CRUD with auto-slug generation)
- ✅ Quote requests (submit, list, update status)
- ✅ Upload security (path traversal, magic-byte validation)
- ✅ Security headers (Helmet)
- ✅ Rate limiting
- ✅ Request ID tracking

### Coverage Thresholds (Enforced)

```javascript
{
  lines: 70%,
  functions: 65%,
  branches: 60%,
  statements: 70%
}
```

CI will fail if coverage drops below these thresholds.

### Test Files

- `backend/tests/api.test.js` - Main integration test suite (23 tests)

---

## 2️⃣ End-to-End Tests (Playwright)

### Quick Start

```bash
# Run all E2E tests (headless)
npm run test:e2e

# Interactive UI mode (best for debugging)
npm run test:e2e:ui

# Run with visible browser
npm run test:e2e:headed

# Run specific test file
npx playwright test e2e/public-flow.spec.ts

# Debug mode
npx playwright test --debug
```

### Test Suites

#### Public Flow (`e2e/public-flow.spec.ts`)

- Homepage loading and navigation
- Product catalog browsing
- Category/brand filtering
- Product detail views
- Quote submission form
- SEO meta tags validation
- robots.txt and sitemap.xml
- Mobile responsiveness

#### Admin Flow (`e2e/admin-flow.spec.ts`)

- Admin login/logout
- Dashboard access
- Product management (CRUD)
- Category management
- Quote management
- Route protection (unauthorized access)
- Admin page noindex verification

#### Accessibility (`e2e/accessibility.spec.ts`)

- WCAG 2.1 Level AA compliance
- Keyboard navigation
- Form label validation
- Heading hierarchy
- Color contrast
- Alt text for images
- Screen reader compatibility

### Configuration

See `playwright.config.ts` for:

- Browser configuration (Chromium)
- Timeout settings
- Retry logic (2 retries on CI)
- Screenshot/video on failure
- Automatic server startup

### Viewing Reports

After running tests:

```bash
npx playwright show-report
```

### CI Behavior

- Screenshots captured on failure
- Videos recorded on failure
- Test traces uploaded as artifacts
- Automatic retry on flaky tests

---

## 3️⃣ Performance Testing (Lighthouse CI)

### Quick Start

```bash
# Desktop performance audit
npm run lighthouse

# Mobile performance audit
npm run lighthouse:mobile
```

### Performance Budgets (Enforced)

#### Core Web Vitals

- First Contentful Paint (FCP): < 2s
- Largest Contentful Paint (LCP): < 2.5s
- Cumulative Layout Shift (CLS): < 0.1
- Total Blocking Time (TBT): < 300ms

#### Category Scores

- Performance: ≥ 90
- Accessibility: ≥ 90
- Best Practices: ≥ 95
- SEO: ≥ 95

#### Resource Budgets

- JavaScript: < 500KB
- Images: < 1MB
- Document: < 100KB

### Tested Pages

- Homepage (`/`)
- Products (`/products`)
- About (`/about`)
- Contact (`/contact`)
- Quote (`/quote`)

### Configuration

See `lighthouserc.js` for detailed budget configuration.

### Viewing Reports

Lighthouse generates:

- HTML reports in `.lighthouseci/` directory
- Temporary public URLs for sharing
- JSON reports for programmatic analysis

---

## 4️⃣ Accessibility Testing

### Automated Checks (axe-core)

Accessibility tests run automatically as part of E2E suite:

```bash
npm run test:e2e  # Includes accessibility tests
```

### What's Tested

✅ **WCAG 2.1 Level AA Compliance:**

- Color contrast ratios
- Form labels and ARIA attributes
- Heading hierarchy (single h1, proper nesting)
- Keyboard navigation support
- Alt text for images
- Skip navigation links
- Focus management
- Screen reader compatibility

### Manual Testing Checklist

In addition to automated tests, manually verify:

- [ ] Tab order is logical
- [ ] Focus indicators are visible
- [ ] All interactive elements are keyboard accessible
- [ ] Screen reader announces content correctly (test with NVDA/JAWS/VoiceOver)
- [ ] Forms can be filled using only keyboard
- [ ] Error messages are announced to screen readers
- [ ] Color is not the only means of conveying information

### Tools

- **Automated:** axe-core (integrated in Playwright)
- **Browser Extensions:** axe DevTools, WAVE
- **Screen Readers:** NVDA (Windows), JAWS (Windows), VoiceOver (Mac)

---

## 5️⃣ Security Testing

### Automated Security Scans (CI)

Security tests run automatically in GitHub Actions:

#### Static Analysis

- **CodeQL:** SAST scanning for security vulnerabilities
- **Snyk:** Dependency vulnerability scanning
- **OWASP Dependency Check:** Known vulnerability detection
- **Gitleaks:** Secret scanning in commit history

#### Dynamic Analysis

- **OWASP ZAP:** Web application security testing (optional)
- **SSL/TLS Scan:** Certificate and protocol validation (when deployed)

### Manual Security Testing

Use the Postman collection for security testing:

```bash
# Import: docs/Electrical_Supplier_API.postman_collection.json
```

**Test scenarios:**

- SQL injection attempts
- XSS payloads
- Path traversal in file uploads
- CSRF token validation
- Rate limiting enforcement
- JWT token expiration
- 2FA bypass attempts
- Privilege escalation

### Security Checklist

Before deployment:

- [ ] All secrets rotated (JWT_SECRET, COOKIE_SECRET, etc.)
- [ ] HTTPS enabled with HSTS
- [ ] Rate limiting configured
- [ ] File upload validation enabled (magic bytes)
- [ ] Security headers configured (Helmet)
- [ ] Admin routes protected and noindexed
- [ ] Database backups enabled
- [ ] Error messages don't leak sensitive info
- [ ] CORS properly configured
- [ ] Dependencies updated (no high/critical vulnerabilities)

---

## 🚀 CI/CD Integration

### GitHub Actions Workflows

All tests run automatically on push/PR:

#### 1. CI Workflow (`.github/workflows/ci.yml`)

- Lint (backend + frontend)
- Build (TypeScript compilation)
- Backend integration tests
- Coverage gate enforcement

#### 2. E2E & Performance Workflow (`.github/workflows/e2e-performance.yml`)

- Playwright E2E tests
- Lighthouse performance budget
- Accessibility validation

#### 3. Security Workflow (`.github/workflows/security.yml`)

- Dependency audit
- Secret scanning
- Build security validation

#### 4. Advanced Security Workflow (`.github/workflows/advanced-security.yml`)

- CodeQL analysis
- Snyk scanning (if token configured)
- OWASP dependency check
- License compliance

### Quality Gates

CI will **fail** if any of these conditions are not met:

- ❌ Lint errors
- ❌ Build errors
- ❌ Test failures
- ❌ Coverage below threshold (70% lines)
- ❌ E2E test failures
- ❌ Performance budget exceeded
- ❌ Accessibility violations
- ❌ Security vulnerabilities (high/critical)

---

## 📝 Pre-Push Checklist

Run these commands before pushing:

```bash
# 1. Lint
npm run lint

# 2. Build
npm run build

# 3. Backend tests with coverage
npm run test:coverage

# 4. E2E tests
npm run test:e2e

# 5. Performance budget
npm run lighthouse
```

**Shortcut:** Create a pre-push git hook to automate this.

---

## 🐛 Debugging Failed Tests

### Backend Tests

```bash
# Run specific test
cd backend
npx jest -t "test name pattern"

# Watch mode
npm run test:watch

# Verbose output
npm test -- --verbose
```

### E2E Tests

```bash
# Debug mode (pauses at breakpoints)
npx playwright test --debug

# Run specific test
npx playwright test e2e/public-flow.spec.ts

# Headed mode (see browser)
npm run test:e2e:headed

# Update snapshots (if using)
npx playwright test --update-snapshots
```

### Lighthouse

```bash
# Single URL
npx lhci collect --url=http://localhost:5000/

# Verbose output
npx lhci autorun --config=lighthouserc.js
```

---

## 📚 Additional Resources

### Documentation

- [E2E Test Suite](e2e/README.md)
- [Backend Test Suite](backend/tests/README.md)
- [Complete Testing Guide](docs/COMPLETE_TESTING_GUIDE.md)
- [API Testing Guide](docs/API_TESTING_GUIDE.md)

### Tools

- [Playwright Documentation](https://playwright.dev/)
- [Jest Documentation](https://jestjs.io/)
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)
- [axe-core](https://github.com/dequelabs/axe-core)

### Standards

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Core Web Vitals](https://web.dev/vitals/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)

---

## 🎓 Testing Best Practices

1. **Write tests first** (TDD) when implementing new features
2. **Keep tests independent** - no shared state between tests
3. **Use descriptive names** - tests are documentation
4. **Avoid flaky tests** - use proper waits, not arbitrary timeouts
5. **Test user flows, not implementation** - focus on behavior
6. **Mock external services** - keep tests fast and reliable
7. **Review test coverage** - aim for meaningful coverage, not just numbers
8. **Update tests when requirements change** - keep them in sync

---

## 📞 Support

If tests fail unexpectedly:

1. Check the test output and error messages
2. Review the HTML reports (Playwright, Lighthouse)
3. Look at screenshots/videos (for E2E failures)
4. Check CI artifacts for detailed logs
5. Run tests locally to reproduce
6. Consult this guide and linked documentation

**Remember:** Tests are there to help you ship with confidence! 🚀
