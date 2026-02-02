import { Request, Response, NextFunction } from "express";
import { ApiResponse } from "../utils/response";
import { logger } from "../utils/logger";

/**
 * Quote Spam Guard Middleware
 *
 * Provides lightweight, client-side focused anti-spam protection for the public quote endpoint.
 * This is intentionally simple and doesn't require third-party services like CAPTCHA.
 *
 * Security Layers Implemented:
 * 1. Honeypot Detection - Catches simple bots that auto-fill all fields
 * 2. Timing Analysis - Detects submissions that are too fast (bots) or too old (replay attacks)
 *
 * Additional Protection:
 * - All spam attempts are logged for security monitoring
 * - Generic error messages prevent revealing detection methods
 * - Works without JavaScript (progressive enhancement)
 *
 * This middleware is part of a 5-layer defense system. See QUOTE_SECURITY_FEATURES.md
 *
 * @example
 * router.post('/quotes', quoteSpamGuard, quoteLimiter, createQuote);
 */
export const quoteSpamGuard = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // SECURITY LAYER 2: Honeypot Detection
  // Hidden field that humans won't fill but bots will
  // Frontend renders: <input type="text" name="honeypot" style="display:none" />
  const honeypot =
    typeof req.body?.honeypot === "string" ? req.body.honeypot : "";

  if (honeypot.trim().length > 0) {
    // Honeypot was filled - likely a bot
    logger.security({
      type: "quote",
      action: "spam_blocked_honeypot",
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });
    // Return generic error - don't reveal the reason to attackers
    return ApiResponse.badRequest(res, "Invalid request");
  }

  // SECURITY LAYER 3: Timing Analysis
  // Frontend includes timestamp when form is rendered: formStartTs = Date.now()
  // We calculate elapsed time from page load to submission
  const formStartTsRaw = req.body?.formStartTs;
  const formStartTs =
    typeof formStartTsRaw === "number"
      ? formStartTsRaw
      : typeof formStartTsRaw === "string"
        ? Number(formStartTsRaw)
        : NaN;

  if (!Number.isNaN(formStartTs)) {
    const elapsedMs = Date.now() - formStartTs;

    // Check 1: Too fast submission (< 1.5 seconds)
    // Human users need at least 1.5s to read and fill a form
    // Faster submissions indicate automation/bots
    if (elapsedMs >= 0 && elapsedMs < 1500) {
      logger.security({
        type: "quote",
        action: "spam_blocked_too_fast",
        ip: req.ip,
        userAgent: req.headers["user-agent"],
        details: { elapsedMs },
      });
      return ApiResponse.badRequest(res, "Invalid request");
    }

    // Check 2: Too old submission (> 1 hour)
    // Forms older than 1 hour are considered stale
    // Prevents replay attacks and browser back-button abuse
    if (elapsedMs > 60 * 60 * 1000) {
      logger.security({
        type: "quote",
        action: "spam_blocked_stale",
        ip: req.ip,
        userAgent: req.headers["user-agent"],
        details: { elapsedMs },
      });
      return ApiResponse.badRequest(res, "Invalid request");
    }
  }

  // All checks passed - proceed to next middleware
  return next();
};
