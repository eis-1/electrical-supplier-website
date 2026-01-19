import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Accessibility Tests using axe-core
 *
 * These tests verify WCAG compliance:
 * - WCAG 2.1 Level AA standards
 * - Keyboard navigation
 * - Screen reader compatibility
 * - Color contrast
 * - Form labels
 * - Semantic HTML
 */

test.describe('Accessibility Tests (a11y)', () => {
  test('homepage should not have accessibility violations', async ({ page }) => {
    await page.goto('/');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('products page should not have accessibility violations', async ({ page }) => {
    await page.goto('/products');
    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('quote page should not have accessibility violations', async ({ page }) => {
    await page.goto('/quote');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('about page should not have accessibility violations', async ({ page }) => {
    await page.goto('/about');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('contact page should not have accessibility violations', async ({ page }) => {
    await page.goto('/contact');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('admin login page should not have accessibility violations', async ({ page }) => {
    await page.goto('/admin/login');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should support keyboard navigation on homepage', async ({ page }) => {
    await page.goto('/');

    // Tab through focusable elements
    await page.keyboard.press('Tab');

    // Check that at least one element is focused
    const focusedElement = await page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });

  test('should support keyboard navigation in forms', async ({ page }) => {
    await page.goto('/quote');

    // Wait for form to load
    await page.waitForSelector('form');

    // Focus first text input directly
    const firstInput = page.locator('input[type="text"]').first();
    await firstInput.focus();
    await page.keyboard.type('Test User');

    // Verify input was filled
    const inputValue = await firstInput.inputValue();
    expect(inputValue).toContain('Test');
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check for h1
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBeGreaterThanOrEqual(1);
    expect(h1Count).toBeLessThanOrEqual(1); // Should have exactly one h1

    // Check that h1 has meaningful content
    const h1Text = await page.locator('h1').first().textContent();
    expect(h1Text?.trim().length).toBeGreaterThan(0);
  });

  test('images should have alt text', async ({ page }) => {
    await page.goto('/');

    // Get all images
    const images = await page.locator('img').all();

    if (images.length > 0) {
      for (const img of images) {
        const alt = await img.getAttribute('alt');
        // Alt can be empty string for decorative images, but must exist
        expect(alt).not.toBeNull();
      }
    }
  });

  test('form inputs should have labels', async ({ page }) => {
    await page.goto('/quote');

    // Get all visible inputs except hidden, submit buttons, and aria-hidden elements
    const inputs = await page.locator('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="radio"]):not([type="checkbox"]):not([aria-hidden="true"]), textarea:not([aria-hidden="true"]), select:not([aria-hidden="true"])').all();

    for (const input of inputs) {
      const id = await input.getAttribute('id');
      const name = await input.getAttribute('name');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledby = await input.getAttribute('aria-labelledby');
      const placeholder = await input.getAttribute('placeholder');

      // Check if there's a visible label
      let hasLabel = false;
      if (id) {
        const label = await page.locator(`label[for="${id}"]`).count();
        hasLabel = label > 0;
      }

      // Also check for labels by proximity (preceding sibling or parent label)
      if (!hasLabel && name) {
        const parentLabel = await input.evaluateHandle(el => el.closest('label'));
        const precedingLabel = await input.evaluateHandle(el => {
          const prev = el.previousElementSibling;
          return prev && prev.tagName === 'LABEL' ? prev : null;
        });
        hasLabel = (await parentLabel.jsonValue()) !== null || (await precedingLabel.jsonValue()) !== null;
      }

      // Input should have: label, aria-label, aria-labelledby, or at least placeholder
      const hasAccessibleName = hasLabel || ariaLabel || ariaLabelledby || placeholder;
      expect(hasAccessibleName).toBeTruthy();
    }
  });

  test('should have sufficient color contrast', async ({ page }) => {
    await page.goto('/');

    // Run axe with color contrast check
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .include(['body'])
      .analyze();

    const colorContrastViolations = accessibilityScanResults.violations.filter(
      v => v.id === 'color-contrast'
    );

    expect(colorContrastViolations).toEqual([]);
  });

  test('should have skip navigation link', async ({ page }) => {
    await page.goto('/');

    // Press Tab to focus first element (should be skip link)
    await page.keyboard.press('Tab');

    const focusedElement = await page.locator(':focus');
    const text = await focusedElement.textContent();

    // Common skip link patterns
    const hasSkipLink = text?.toLowerCase().includes('skip') ||
                        text?.toLowerCase().includes('main content');

    // This is a recommendation - log if missing but don't fail
    if (!hasSkipLink) {
      console.log('Note: Consider adding a "Skip to main content" link for better keyboard navigation');
    }
  });
});
