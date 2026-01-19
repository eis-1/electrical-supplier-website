import { test, expect } from '@playwright/test';

test.describe('Public Website Flow', () => {
  test('should load homepage and navigate to products', async ({ page }) => {
    // Capture console errors for debugging
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    page.on('pageerror', err => {
      consoleErrors.push(`Page error: ${err.message}`);
    });

    await page.goto('/', { waitUntil: 'networkidle' });

    // Log any console errors
    if (consoleErrors.length > 0) {
      console.log('Console errors detected:', consoleErrors);
    }

    // Wait for React to hydrate - check for either nav or main content
    await page.waitForSelector('nav, header, main, [id="root"] > *', { timeout: 10000 });
    await expect(page.locator('nav, header')).toBeVisible();

    // Click nav link specifically (there are multiple "Products" links on page)
    await page.locator('nav').getByRole('link', { name: /products/i }).click();
    await expect(page).toHaveURL(/\/products/);

    // Either products grid renders, or empty state.
    const productsOrEmpty = page.locator(
      '[class*="productsGrid"], [class*="productCard"], [class*="noResults"], [class*="empty"]',
    );
    await expect(productsOrEmpty.first()).toBeVisible({ timeout: 10000 });
  });

  test('should view product details (slug route)', async ({ page }) => {
    await page.goto('/products');
    await page.waitForLoadState('networkidle');

    const productLinks = page.locator('a[href^="/products/"][class*="productLink"]');
    const count = await productLinks.count();

    if (count > 0) {
      await productLinks.first().click();
      await expect(page).toHaveURL(/\/products\/[^/]+$/);
      await expect(page.locator('h1, h2').first()).toBeVisible();
    } else {
      console.log('No products available to test detail view');
    }
  });

  test('should filter products by category (radio filters)', async ({ page }) => {
    await page.goto('/products');
    await page.waitForLoadState('networkidle');

    const categoryRadios = page.locator('input[type="radio"][name="category"]');
    if ((await categoryRadios.count()) > 0) {
      await categoryRadios.first().check();
      await page.waitForTimeout(500);
      await expect(page).toHaveURL(/category=/);
    }
  });

  test('should submit quote request', async ({ page }) => {
    await page.goto('/quote');

    const unique = Date.now();
    await page.fill('input[name="name"]', 'Test Customer');
    await page.fill('input[name="company"]', 'Test Company Ltd');
    await page.fill('input[name="phone"]', '+1234567890');
    await page.fill('input[name="email"]', `test${unique}@example.com`);
    await page.fill('input[name="productName"]', `E2E Product ${unique}`);
    await page.fill('input[name="quantity"]', '10');
    await page.fill(
      'textarea[name="projectDetails"], #projectDetails',
      'This is a test quote request from Playwright E2E',
    );

    // Wait 1.5s to pass spam protection (minimum form fill time)
    await page.waitForTimeout(1500);

    // Quote submission can take ~10s+ in test/dev (email sending), so wait for the API response
    await Promise.all([
      page.waitForResponse(
        (res) => res.url().includes('/api/v1/quotes') && res.status() === 201,
        { timeout: 30000 },
      ),
      page.click('button[type="submit"]'),
    ]);

    // Wait for success message - quote component shows success state
    await page.waitForSelector('text=/Quote Request Submitted|Thank you|Reference Number|QR-/i', {
      timeout: 30000,
      state: 'visible',
    });

    // Verify success indicators are visible
    const successVisible = await page.locator('text=/Quote Request Submitted|Thank you|QR-/i').count();
    expect(successVisible).toBeGreaterThan(0);
  });

  test('should have proper SEO meta tags', async ({ page }) => {
    await page.goto('/');

    // Check for essential SEO elements
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);

    // Check meta description (use first() for duplicate tags)
    const metaDescription = await page.locator('meta[name="description"]').first().getAttribute('content');
    expect(metaDescription).toBeTruthy();

    // Check Open Graph tags
    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
    expect(ogTitle).toBeTruthy();
  });

  test('should have robots.txt and sitemap.xml', async ({ page }) => {
    // Check robots.txt
    const robotsResponse = await page.goto('/robots.txt');
    expect(robotsResponse?.status()).toBe(200);
    const robotsText = await page.textContent('body');
    expect(robotsText).toContain('User-agent');

    // Check sitemap.xml
    const sitemapResponse = await page.goto('/sitemap.xml');
    expect(sitemapResponse?.status()).toBe(200);
    const sitemapText = await page.textContent('body');
    expect(sitemapText).toContain('urlset');
  });

  test('should be mobile responsive', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/');

    // Check that navigation is accessible (might be hamburger menu)
    const nav = page.locator('nav, header');
    await expect(nav).toBeVisible();

    // Check that content is visible and not cut off
    const mainContent = page.locator('main, [role="main"]');
    await expect(mainContent).toBeVisible();
  });
});
