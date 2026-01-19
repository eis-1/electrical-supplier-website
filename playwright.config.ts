import { defineConfig, devices } from '@playwright/test';

import fs from 'fs';
import path from 'path';

function loadEnvFileIfPresent(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, 'utf8');

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();

    // Strip surrounding quotes if present
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    // Do not override already-provided environment variables.
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

// Make E2E runs work with a local repo `.env` without requiring manual shell exports.
// Priority: already-set env vars > backend/.env > repo-root .env
loadEnvFileIfPresent(path.resolve(__dirname, 'backend', '.env'));
loadEnvFileIfPresent(path.resolve(__dirname, '.env'));

/**
 * Playwright E2E Test Configuration
 *
 * Tests the complete user flows:
 * - Public browsing (home, products, product details)
 * - Quote submission
 * - Admin operations (login, CRUD, quote management)
 */
export default defineConfig({
  testDir: './e2e',

  // Maximum time one test can run for
  timeout: 30 * 1000,

  // Run tests in files in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,

  // Reporter to use
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
    ...(process.env.CI ? [['github'] as [string]] : [])
  ],

  // Shared settings for all the projects below
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL: 'http://localhost:5000',

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'retain-on-failure',
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Add more browsers if needed:
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  // Run your local dev server before starting the tests
  webServer: {
    command: process.env.CI
      ? 'npm run build && cd backend && npm run start'
      : process.platform === 'win32'
      ? 'cd backend && npm run cleanup:ports && npm run e2e:server'
      : 'cd backend && npm run e2e:server',
    url: 'http://localhost:5000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
