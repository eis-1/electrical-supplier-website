import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { env } from '../config/env';
import { getRedisClient } from '../config/redis';
import { logger } from '../utils/logger';

/**
 * Get rate limit store (Redis if available, otherwise in-memory)
 */
const getStore = (): any => {
  const redisClient = getRedisClient();
  
  if (redisClient) {
    logger.info('Using Redis for rate limiting');
    return new RedisStore({
      sendCommand: (...args: string[]) => redisClient.sendCommand(args),
    });
  }
  
  logger.info('Using in-memory store for rate limiting');
  return undefined; // express-rate-limit will use default MemoryStore
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
  const store = getStore();

  // General API rate limiter (more lenient for development)
  apiLimiterInstance = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.NODE_ENV === 'development' ? 1000 : env.RATE_LIMIT_MAX_REQUESTS, // 1000 for dev
    message: {
      success: false,
      error: 'Too many requests, please try again later',
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => env.NODE_ENV === 'development', // Skip rate limiting in development
    store,
  });

  // Quote submission rate limiter (stricter)
  quoteLimiterInstance = rateLimit({
    windowMs: env.QUOTE_RATE_LIMIT_WINDOW_MS,
    max: env.QUOTE_RATE_LIMIT_MAX_REQUESTS,
    message: {
      success: false,
      error: 'Too many quote submissions. Please try again later',
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    store,
  });

  // Auth rate limiter (login attempts)
  authLimiterInstance = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: env.NODE_ENV === 'development' ? 1000 : 5, // lenient in dev, strict in prod
    message: {
      success: false,
      error: 'Too many login attempts, please try again after 15 minutes',
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    store,
  });

  // 2FA verification rate limiter (very strict)
  twoFactorLimiterInstance = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: env.NODE_ENV === 'development' ? 1000 : 5, // lenient in dev, strict in prod
    message: {
      success: false,
      error: 'Too many 2FA verification attempts. Please try again later',
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    keyGenerator: (req) => {
      // Rate limit by IP + email/adminId to prevent distributed attacks
      const email = req.body.email || req.body.adminId || 'unknown';
      return `2fa:${req.ip}:${email}`;
    },
    store,
  });

  logger.info('Rate limiters initialized successfully');
};

// Export getter functions instead of direct instances
export const apiLimiter = (req: any, res: any, next: any) => {
  if (!apiLimiterInstance) {
    throw new Error('Rate limiters not initialized. Call initializeRateLimiters() first.');
  }
  return apiLimiterInstance(req, res, next);
};

export const quoteLimiter = (req: any, res: any, next: any) => {
  if (!quoteLimiterInstance) {
    throw new Error('Rate limiters not initialized. Call initializeRateLimiters() first.');
  }
  return quoteLimiterInstance(req, res, next);
};

export const authLimiter = (req: any, res: any, next: any) => {
  if (!authLimiterInstance) {
    throw new Error('Rate limiters not initialized. Call initializeRateLimiters() first.');
  }
  return authLimiterInstance(req, res, next);
};

export const twoFactorLimiter = (req: any, res: any, next: any) => {
  if (!twoFactorLimiterInstance) {
    throw new Error('Rate limiters not initialized. Call initializeRateLimiters() first.');
  }
  return twoFactorLimiterInstance(req, res, next);
};
