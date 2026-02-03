/**
 * Jest pre-test environment setup.
 *
 * Important: env config is evaluated at import time in `src/config/env.ts`.
 * Setting defaults here keeps test runs deterministic even when a developer's
 * shell environment has NODE_ENV/TRUST_PROXY unset.
 */

process.env.NODE_ENV = process.env.NODE_ENV || 'test';

// Tests often send X-Forwarded-For to simulate distinct client IPs for rate limiting.
// Only used if a caller hasn't explicitly set TRUST_PROXY already.
process.env.TRUST_PROXY = process.env.TRUST_PROXY || 'true';
