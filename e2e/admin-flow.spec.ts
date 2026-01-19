import { test, expect } from '@playwright/test';

test.describe('Admin Panel Flow', () => {
  const ADMIN_EMAIL = 'admin@electricalsupplier.com';
  const ADMIN_PASSWORD = process.env.ROLE_ADMIN_PASSWORD || process.env.SEED_ADMIN_PASSWORD || 'admin123';

  const EDITOR_EMAIL = 'editor@electricalsupplier.com';
  const VIEWER_EMAIL = 'viewer@electricalsupplier.com';
  const ROLE_PASSWORD = process.env.ROLE_ADMIN_PASSWORD || process.env.SEED_ADMIN_PASSWORD || 'admin123';

  async function loginAs(page: any, email: string, password: string) {
    await page.goto('/admin/login');
    await page.waitForSelector('form');
    await page.fill('input[name="email"], input[type="email"]', email);
    await page.fill('input[name="password"], input[type="password"]', password);

    // Wait for navigation after click
    await Promise.all([
      page.waitForURL(/\/admin(?!\/login)/, { timeout: 15000 }),
      page.click('button[type="submit"]')
    ]);

    await expect(page).toHaveURL(/\/admin(\/|$)/);
  }

  test('should login to admin panel', async ({ page }) => {
    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  });

  test('should view admin dashboard navigation', async ({ page }) => {
    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);

    await page.goto('/admin/dashboard');
    await expect(page.getByRole('button', { name: /products/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /quotes/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /categories/i })).toBeVisible();
  });

  test('should manage products (CRUD) as admin', async ({ page }) => {
    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);

    await page.goto('/admin/products');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/admin\/products/);

    const unique = Date.now();
    const productName = `E2E Product ${unique}`;
    const initialModel = `MODEL-${unique}`;
    const updatedModel = `MODEL-${unique}-EDIT`;

    // CREATE
    await page.getByRole('button', { name: /add new product/i }).click();

    await page.fill('input[placeholder="e.g., Circuit Breaker MCB 32A"]', productName);
    await page.fill('input[placeholder="e.g., MCB-32A-C"]', initialModel);
    await page.selectOption('#admin-product-category', { index: 1 });
    await page.selectOption('#admin-product-brand', { index: 1 });
    await page.fill('textarea[placeholder="Detailed product description..."]', `E2E description ${unique}`);

    page.once('dialog', (d: any) => d.accept());
    await page.getByRole('button', { name: /create product/i }).click();

    const createdRow = page.locator('tr', { hasText: productName });
    await expect(createdRow).toBeVisible({ timeout: 15000 });
    await expect(createdRow).toContainText(initialModel);

    // EDIT
    await createdRow.getByRole('button', { name: /^Edit$/ }).click();
    await page.fill('input[placeholder="e.g., MCB-32A-C"]', updatedModel);
    page.once('dialog', (d: any) => d.accept());
    await page.getByRole('button', { name: /update product/i }).click();
    await expect(createdRow).toContainText(updatedModel, { timeout: 15000 });

    // DELETE
    page.once('dialog', (d: any) => d.accept());
    await createdRow.getByRole('button', { name: /^Delete$/ }).click();
    await expect(page.locator('tr', { hasText: productName })).toHaveCount(0, { timeout: 15000 });
  });

  test('RBAC UI: viewer should be read-only', async ({ page }) => {
    await loginAs(page, VIEWER_EMAIL, ROLE_PASSWORD);

    // Products: no create/edit/delete controls.
    await page.goto('/admin/products');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('button', { name: /add new product/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Edit$/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Delete$/ })).toHaveCount(0);

    // Quotes: quick status select disabled + no delete.
    await page.goto('/admin/quotes');
    await page.waitForLoadState('networkidle');

    const readOnlyStatusSelect = page.locator('select[title="Read-only access"]');
    if ((await readOnlyStatusSelect.count()) > 0) {
      await expect(readOnlyStatusSelect.first()).toBeDisabled();
    }
    await expect(page.getByRole('button', { name: /delete/i })).toHaveCount(0);
  });

  test('RBAC UI: editor can create/update but cannot delete', async ({ page }) => {
    await loginAs(page, EDITOR_EMAIL, ROLE_PASSWORD);

    // Products: can create & edit, cannot delete.
    await page.goto('/admin/products');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('button', { name: /add new product/i })).toBeVisible();
    // There may be zero products in a fresh DB, so "Edit" could be absent.
    // But delete should always be hidden for editor.
    await expect(page.getByRole('button', { name: /^Delete$/ })).toHaveCount(0);

    // Quotes: can quick-update status, cannot delete.
    await page.goto('/admin/quotes');
    await page.waitForLoadState('networkidle');
    const editableStatusSelect = page.locator('select[title="Quick status update"]');
    if ((await editableStatusSelect.count()) > 0) {
      await expect(editableStatusSelect.first()).toBeEnabled();
    }
    await expect(page.getByRole('button', { name: /delete/i })).toHaveCount(0);
  });

  test('should protect admin routes when not logged in', async ({ page }) => {
    await page.goto('/admin/products');
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test('admin pages should have noindex meta tag', async ({ page }) => {
    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto('/admin/dashboard');
    const noindexMeta = await page
      .locator('meta[name="robots"][content*="noindex"]')
      .count();
    expect(noindexMeta).toBeGreaterThan(0);
  });
});
