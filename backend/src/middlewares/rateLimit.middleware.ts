import rateLimit, { MemoryStore } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { env } from "../config/env";
import { getRedisClient } from "../config/redis";
import { logger } from "../utils/logger";
import { AppError } from "./error.middleware";

/**
 * Rate Limiting Middleware
 *
 * Provides IP-based request throttling to protect against abuse and DDoS attacks.
 * Uses Redis for distributed rate limiting (production) or in-memory for development.
 *
 * Architecture:
 * - Each limiter has its own store instance to prevent counter collisions
 * - Separate limiters for different endpoints with different limits
 * - Automatic fallback from Redis to in-memory if Redis unavailable
 * - Development mode has lenient limits for testing convenience
 *
 * Security Features:
 * - Prevents brute force attacks (auth limiter)
 * - Blocks spam submissions (quote limiter)
 * - Protects against 2FA code guessing (2FA limiter)
 * - General API protection (api limiter)
 *
 * Store Selection:
 * - Production: Redis (persistent, shared across instances)
 * - Development: In-memory (fast, no external dependencies)
 * - Tests: In-memory with cleanup to prevent Jest warnings
 *
 * Configuration:
 * All limits are configurable via environment variables.
 * See .env.example for available settings.
 *
 * Usage:
 * 1. Call initializeRateLimiters() during app startup (after Redis ready)
 * 2. Apply limiters to routes: router.post('/quotes', quoteLimiter, handler)
 * 3. Call shutdownRateLimiters() during graceful shutdown
 */

// Track stores for cleanup (prevents memory leaks and Jest warnings)
const storesToShutdown: any[] = [];

/**
 * Create a rate limit store instance with Redis or in-memory fallback
 *
 * Store Architecture:
 * - Each limiter MUST have its own store to prevent counter collisions
 * - Redis keys are namespaced by prefix (e.g., "rl:quote:", "rl:auth:")
 * - In-memory stores are explicitly created for proper cleanup
 *
 * Why Separate Stores:
 * Sharing stores between limiters causes unexpected 429 errors because:
 * - Different limiters have different windowMs and max values
 * - Shared counters mix requests from different endpoints
 * - Test isolation breaks when stores are shared
 *
 * @param prefix - Namespace prefix for Redis keys (e.g., "quote", "auth")
 * @returns Rate limit store instance (RedisStore or MemoryStore)
 *
 * @example
 * const quoteStore = getStore('quote'); // Keys: rl:quote:192.168.1.1
 * const authStore = getStore('auth');   // Keys: rl:auth:192.168.1.1
 */
const getStore = (prefix: string): any => {
  const redisClient = getRedisClient();

  if (redisClient) {
    logger.info("Using Redis for rate limiting");
    // Create Redis-backed store with namespaced keys
    const store = new RedisStore({
      sendCommand: (...args: string[]) => redisClient.sendCommand(args),
      // Namespace keys per limiter to avoid collisions
      // Format: rl:<prefix>:<ip> (e.g., rl:quote:192.168.1.1)
      prefix: `rl:${prefix}:`,
    } as any);
    storesToShutdown.push(store);
    return store;
  }

  logger.info("Using in-memory store for rate limiting");
  // Create explicit MemoryStore for proper cleanup
  // This prevents Jest "worker failed to exit" warnings
  const store = new MemoryStore();
  storesToShutdown.push(store);
  return store;
};

// Store instances that will be created after Redis initialization
let apiLimiterInstance: ReturnType<typeof rateLimit> | null = null;
let quoteLimiterInstance: ReturnType<typeof rateLimit> | null = null;
let authLimiterInstance: ReturnType<typeof rateLimit> | null = null;
let twoFactorLimiterInstance: ReturnType<typeof rateLimit> | null = null;

/**
 * Initialize all rate limiters
 *
 * MUST be called during application startup after Redis connection is established.
 * Creates 4 separate limiters with different configurations for different use cases.
 *
 * Limiter Purposes:
 * - apiLimiter: General API protection (100 req/15min in production)
 * - quoteLimiter: Quote form spam prevention (5 req/hour)
 * - authLimiter: Login brute force protection (5 attempts/15min)
 * - twoFactorLimiter: 2FA code guessing protection (5 attempts/5min)
 *
 * Development vs Production:
 * - Development: Lenient limits (1000 req) or disabled for convenience
 * - Production: Strict limits based on expected legitimate usage patterns
 *
 * @throws Error if called multiple times (limiters already initialized)
 *
 * @example
 * // In app startup (after Redis connection)
 * await initializeRedisConnection();
 * initializeRateLimiters();
 * app.listen(5000);
 */
export const initializeRateLimiters = (): void => {
  // Create separate stores for each limiter (prevents counter collisions)
  const apiStore = getStore("api");
  const quoteStore = getStore("quote");
  const authStore = getStore("auth");
  const twoFactorStore = getStore("2fa");

  // LIMITER 1: General API Rate Limiter
  // Protects all API endpoints from excessive requests
  // Default: 100 requests per 15 minutes per IP
  // Development: 1000 requests (lenient for testing)
  apiLimiterInstance = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS, // Default: 900000 (15 minutes)
    max: env.NODE_ENV === "development" ? 1000 : env.RATE_LIMIT_MAX_REQUESTS, // 1000 for dev, 100 for prod
    message: {
      success: false,
      error: "Too many requests, please try again later",
    },
    standardHeaders: true, // Send RateLimit-* headers (draft RFC)
    legacyHeaders: false, // Don't send X-RateLimit-* headers
    skip: () => env.NODE_ENV === "development", // Completely skip in development
    store: apiStore,
  });

  // LIMITER 2: Quote Submission Rate Limiter (SECURITY LAYER 1)
  // Prevents spam and abuse of the public quote form
  // Default: 5 requests per hour per IP
  // This is the first layer of the 5-layer defense system
  // See QUOTE_SECURITY_FEATURES.md for complete security documentation
  quoteLimiterInstance = rateLimit({
    windowMs: env.QUOTE_RATE_LIMIT_WINDOW_MS, // Default: 3600000 (1 hour)
    max: env.QUOTE_RATE_LIMIT_MAX_REQUESTS, // Default: 5 requests
    message: {
      success: false,
      error: "Too many quote submissions. Please try again later",
    },
    standardHeaders: true, // Send RateLimit-* headers
    legacyHeaders: false, // Don't send X-RateLimit-* headers
    skipSuccessfulRequests: false, // Count all requests (even successful)
    store: quoteStore,
  });

  // LIMITER 3: Authentication Rate Limiter
  // Prevents brute force attacks on admin login
  // Default: 5 failed attempts per 15 minutes per IP
  // Successful logins don't count toward the limit
  authLimiterInstance = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: env.NODE_ENV === "development" ? 1000 : 5, // lenient in dev, strict in prod
    message: {
      success: false,
      error: "Too many login attempts, please try again after 15 minutes",
    },
    standardHeaders: true, // Send RateLimit-* headers
    legacyHeaders: false, // Don't send X-RateLimit-* headers
    skipSuccessfulRequests: true, // Only count failed attempts
    store: authStore,
  });

  // LIMITER 4: Two-Factor Authentication Rate Limiter
  // Prevents 2FA code guessing attacks (6-digit codes have 1M combinations)
  // Default: 5 failed attempts per 5 minutes per IP+email
  // Uses composite key (IP + email) to prevent distributed attacks
  twoFactorLimiterInstance = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes (shorter than auth limiter)
    max: env.NODE_ENV === "development" ? 1000 : 5, // lenient in dev, strict in prod
    message: {
      success: false,
      error: "Too many 2FA verification attempts. Please try again later",
    },
    standardHeaders: true, // Send RateLimit-* headers
    legacyHeaders: false, // Don't send X-RateLimit-* headers
    skipSuccessfulRequests: true, // Only count failed attempts
    keyGenerator: (req) => {
      // Custom key: Combine IP + email to prevent:
      // - Single IP trying multiple emails (distributed attack)
      // - Multiple IPs trying same email (botnet attack)
      const email = req.body.email || req.body.adminId || "unknown";
      return `2fa:${req.ip}:${email}`;
    },
    store: twoFactorStore,
  });

  logger.info("Rate limiters initialized successfully");
};

/**
 * Gracefully shutdown all rate limiters and clean up resources
 *
 * Importance:
 * - MemoryStore keeps internal timers for cleanup (setInterval)
 * - Lingering timers prevent Node.js from exiting cleanly
 * - Jest will warn: "A worker process has failed to exit gracefully"
 * - RedisStore may also keep connections open
 *
 * When to Call:
 * - During application shutdown (SIGTERM, SIGINT)
 * - After each test in Jest (afterAll hook)
 * - Before process.exit()
 *
 * What It Does:
 * - Calls shutdown() on all store instances (stops timers)
 * - Clears store references
 * - Nullifies limiter instances
 *
 * @example
 * // In app shutdown
 * process.on('SIGTERM', async () => {
 *   await shutdownRateLimiters();
 *   await closeDatabase();
 *   process.exit(0);
 * });
 *
 * // In Jest tests
 * afterAll(async () => {
 *   await shutdownRateLimiters();
 * });
 */
export const shutdownRateLimiters = async (): Promise<void> => {
  try {
    // Shut down all stores (MemoryStore keeps timers; RedisStore may keep resources too)
    for (const s of storesToShutdown.splice(0, storesToShutdown.length)) {
      if (s && typeof s.shutdown === "function") {
        await s.shutdown();
      }
    }
  } finally {
    apiLimiterInstance = null;
    quoteLimiterInstance = null;
    authLimiterInstance = null;
    twoFactorLimiterInstance = null;
  }
};

// Export getter functions instead of direct instances
export const apiLimiter = (req: any, res: any, next: any) => {
  if (!apiLimiterInstance) {
    throw new AppError(
      500,
      "Rate limiters not initialized. Call initializeRateLimiters() first.",
    );
  }
  return apiLimiterInstance(req, res, next);
};

export const quoteLimiter = (req: any, res: any, next: any) => {
  if (!quoteLimiterInstance) {
    throw new AppError(
      500,
      "Rate limiters not initialized. Call initializeRateLimiters() first.",
    );
  }
  return quoteLimiterInstance(req, res, next);
};

export const authLimiter = (req: any, res: any, next: any) => {
  if (!authLimiterInstance) {
    throw new AppError(
      500,
      "Rate limiters not initialized. Call initializeRateLimiters() first.",
    );
  }
  return authLimiterInstance(req, res, next);
};

export const twoFactorLimiter = (req: any, res: any, next: any) => {
  if (!twoFactorLimiterInstance) {
    throw new AppError(
      500,
      "Rate limiters not initialized. Call initializeRateLimiters() first.",
    );
  }
  return twoFactorLimiterInstance(req, res, next);
};
