# E2E Testing with Playwright

This directory contains end-to-end tests that verify the complete user flows of the application.

## Test Suites

### Public Flow Tests (`public-flow.spec.ts`)

- Homepage loading and navigation
- Product browsing and filtering
- Product detail views
- Quote submission
- SEO meta tags validation
- robots.txt and sitemap.xml
- Mobile responsiveness

### Admin Flow Tests (`admin-flow.spec.ts`)

- Admin login/logout
- Dashboard access
- Product management (CRUD)
- Quote management
- Route protection (unauthorized access)
- Admin page noindex verification

## Running Tests

### All tests (headless)

```bash
npm run test:e2e
```

### Interactive UI mode (recommended for development)

```bash
npm run test:e2e:ui
```

### Headed mode (see browser)

```bash
npm run test:e2e:headed
```

### Specific test file

```bash
npx playwright test e2e/public-flow.spec.ts
```

### Debug mode

```bash
npx playwright test --debug
```

## Requirements

Tests expect the server to be running on `http://localhost:5000`. The Playwright config will automatically start the backend before running tests.

**Default admin credentials used in tests:**

- Email: `admin@electricalsupplier.com`
- Password: set via `SEED_ADMIN_PASSWORD` during seed/admin creation (set this before running E2E locally)

## Reports

After running tests, view the HTML report:

```bash
npx playwright show-report
```

## CI Integration

Tests run automatically in CI with:

- Retry on failure (2 retries)
- Screenshot on failure
- Video on failure
- HTML and GitHub reporters

## Writing New Tests

Follow these patterns:

1. Use descriptive test names
2. Use data-testid attributes for stable selectors
3. Add proper waits (avoid arbitrary timeouts)
4. Clean up test data when needed
5. Make tests independent (no order dependency)
