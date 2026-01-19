import rateLimit, { MemoryStore } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { env } from "../config/env";
import { getRedisClient } from "../config/redis";
import { logger } from "../utils/logger";

/**
 * Get rate limit store (Redis if available, otherwise in-memory)
 *
 * IMPORTANT: Each limiter must have its own store instance.
 * Sharing a single store across multiple limiters can cause counters/options
 * to collide, producing unexpected 429s (especially in tests).
 */
const storesToShutdown: any[] = [];

const getStore = (prefix: string): any => {
  const redisClient = getRedisClient();

  if (redisClient) {
    logger.info("Using Redis for rate limiting");
    const store = new RedisStore({
      sendCommand: (...args: string[]) => redisClient.sendCommand(args),
      // Namespace keys per limiter to avoid collisions.
      prefix: `rl:${prefix}:`,
    } as any);
    storesToShutdown.push(store);
    return store;
  }

  logger.info("Using in-memory store for rate limiting");
  // Use an explicit MemoryStore so we can clean it up in tests (prevents Jest open-handle warnings)
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
 * Initialize all rate limiters (call this after Redis is ready)
 */
export const initializeRateLimiters = (): void => {
  const apiStore = getStore("api");
  const quoteStore = getStore("quote");
  const authStore = getStore("auth");
  const twoFactorStore = getStore("2fa");

  // General API rate limiter (more lenient for development)
  apiLimiterInstance = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.NODE_ENV === "development" ? 1000 : env.RATE_LIMIT_MAX_REQUESTS, // 1000 for dev
    message: {
      success: false,
      error: "Too many requests, please try again later",
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => env.NODE_ENV === "development", // Skip rate limiting in development
    store: apiStore,
  });

  // Quote submission rate limiter (stricter)
  quoteLimiterInstance = rateLimit({
    windowMs: env.QUOTE_RATE_LIMIT_WINDOW_MS,
    max: env.QUOTE_RATE_LIMIT_MAX_REQUESTS,
    message: {
      success: false,
      error: "Too many quote submissions. Please try again later",
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    store: quoteStore,
  });

  // Auth rate limiter (login attempts)
  authLimiterInstance = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: env.NODE_ENV === "development" ? 1000 : 5, // lenient in dev, strict in prod
    message: {
      success: false,
      error: "Too many login attempts, please try again after 15 minutes",
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    store: authStore,
  });

  // 2FA verification rate limiter (very strict)
  twoFactorLimiterInstance = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: env.NODE_ENV === "development" ? 1000 : 5, // lenient in dev, strict in prod
    message: {
      success: false,
      error: "Too many 2FA verification attempts. Please try again later",
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    keyGenerator: (req) => {
      // Rate limit by IP + email/adminId to prevent distributed attacks
      const email = req.body.email || req.body.adminId || "unknown";
      return `2fa:${req.ip}:${email}`;
    },
    store: twoFactorStore,
  });

  logger.info("Rate limiters initialized successfully");
};

/**
 * Shutdown any resources created by rate limiting (notably MemoryStore timers).
 *
 * This is especially important in Jest, where lingering timers can cause
 * "A worker process has failed to exit gracefully" warnings.
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
    throw new Error(
      "Rate limiters not initialized. Call initializeRateLimiters() first.",
    );
  }
  return apiLimiterInstance(req, res, next);
};

export const quoteLimiter = (req: any, res: any, next: any) => {
  if (!quoteLimiterInstance) {
    throw new Error(
      "Rate limiters not initialized. Call initializeRateLimiters() first.",
    );
  }
  return quoteLimiterInstance(req, res, next);
};

export const authLimiter = (req: any, res: any, next: any) => {
  if (!authLimiterInstance) {
    throw new Error(
      "Rate limiters not initialized. Call initializeRateLimiters() first.",
    );
  }
  return authLimiterInstance(req, res, next);
};

export const twoFactorLimiter = (req: any, res: any, next: any) => {
  if (!twoFactorLimiterInstance) {
    throw new Error(
      "Rate limiters not initialized. Call initializeRateLimiters() first.",
    );
  }
  return twoFactorLimiterInstance(req, res, next);
};
