import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

// General API rate limiter (more lenient for development)
export const apiLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.NODE_ENV === 'development' ? 1000 : env.RATE_LIMIT_MAX_REQUESTS, // 1000 for dev
  message: {
    success: false,
    error: 'Too many requests, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => env.NODE_ENV === 'development', // Skip rate limiting in development
});

// Quote submission rate limiter (stricter)
export const quoteLimiter = rateLimit({
  windowMs: env.QUOTE_RATE_LIMIT_WINDOW_MS,
  max: env.QUOTE_RATE_LIMIT_MAX_REQUESTS,
  message: {
    success: false,
    error: 'Too many quote submissions. Please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
});

// Auth rate limiter (login attempts)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: {
    success: false,
    error: 'Too many login attempts, please try again after 15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});
