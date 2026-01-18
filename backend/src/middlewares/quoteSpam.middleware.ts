import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../utils/response';
import { logger } from '../utils/logger';

/**
 * Basic anti-spam checks for the public quote endpoint.
 *
 * This is intentionally lightweight and low-risk (no third-party captcha), but it blocks:
 * - Simple bots that fill hidden fields (honeypot)
 * - Extremely fast submissions (bot-like)
 * - Extremely old/stale submissions
 */
export const quoteSpamGuard = (req: Request, res: Response, next: NextFunction) => {
  const honeypot = typeof req.body?.honeypot === 'string' ? req.body.honeypot : '';
  if (honeypot.trim().length > 0) {
    logger.security({
      type: 'quote',
      action: 'spam_blocked_honeypot',
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    // Don't reveal the reason to the client.
    return ApiResponse.badRequest(res, 'Invalid request');
  }

  const formStartTsRaw = req.body?.formStartTs;
  const formStartTs =
    typeof formStartTsRaw === 'number'
      ? formStartTsRaw
      : typeof formStartTsRaw === 'string'
        ? Number(formStartTsRaw)
        : NaN;

  if (!Number.isNaN(formStartTs)) {
    const elapsedMs = Date.now() - formStartTs;

    // Too fast -> likely automation
    if (elapsedMs >= 0 && elapsedMs < 1500) {
      logger.security({
        type: 'quote',
        action: 'spam_blocked_too_fast',
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        details: { elapsedMs },
      });
      return ApiResponse.badRequest(res, 'Invalid request');
    }

    // Too old -> stale/replayed
    if (elapsedMs > 60 * 60 * 1000) {
      logger.security({
        type: 'quote',
        action: 'spam_blocked_stale',
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        details: { elapsedMs },
      });
      return ApiResponse.badRequest(res, 'Invalid request');
    }
  }

  return next();
};
