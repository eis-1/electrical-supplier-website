import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { ApiResponse } from "../utils/response";
import { logger } from "../utils/logger";
import { env } from "../config/env";

/**
 * CSRF (Cross-Site Request Forgery) Protection Middleware
 *
 * Implements Double Submit Cookie pattern:
 * 1. Server generates a random CSRF token
 * 2. Token is sent both as a cookie and expected in request header/body
 * 3. Server validates both match for state-changing operations
 *
 * Use this for any endpoint that:
 * - Uses cookies for authentication (refresh token)
 * - Performs state-changing operations (POST/PUT/PATCH/DELETE)
 */

const CSRF_TOKEN_LENGTH = 32;
const CSRF_COOKIE_NAME = "csrf-token";
const CSRF_HEADER_NAME = "x-csrf-token";
const CSRF_BODY_FIELD = "csrfToken";

/**
 * Generate a cryptographically secure CSRF token
 */
function generateCsrfToken(): string {
  return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString("hex");
}

/**
 * Middleware: Generate and set CSRF token
 * Call this on routes that need CSRF protection (usually auth routes)
 *
 * The token is set as:
 * 1. HttpOnly cookie (for server-side validation)
 * 2. Response header (for client to read and include in subsequent requests)
 */
export function setCsrfToken(_req: Request, res: Response, next: NextFunction) {
  // Generate new CSRF token
  const csrfToken = generateCsrfToken();

  // Set as HttpOnly cookie (secure in production)
  res.cookie(CSRF_COOKIE_NAME, csrfToken, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  });

  // Also expose in response header so client can read it
  res.setHeader(CSRF_HEADER_NAME, csrfToken);

  next();
}

/**
 * Middleware: Validate CSRF token
 * Use this to protect state-changing operations
 *
 * Expects token in either:
 * - Request header: x-csrf-token
 * - Request body: csrfToken
 */
export function validateCsrfToken(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  // Skip CSRF validation for safe methods (GET, HEAD, OPTIONS)
  const safeMethods = ["GET", "HEAD", "OPTIONS"];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  // Get token from cookie (set by server)
  const cookieToken = req.cookies[CSRF_COOKIE_NAME];

  // Get token from request (header or body)
  const requestToken =
    req.headers[CSRF_HEADER_NAME.toLowerCase()] || req.body?.[CSRF_BODY_FIELD];

  // Validate both tokens exist
  if (!cookieToken) {
    logger.security({
      type: "csrf",
      action: "missing_cookie_token",
      details: { method: req.method, path: req.path, ip: req.ip },
    });
    return ApiResponse.forbidden(res, "CSRF token missing in cookie");
  }

  if (!requestToken) {
    logger.security({
      type: "csrf",
      action: "missing_request_token",
      details: { method: req.method, path: req.path, ip: req.ip },
    });
    return ApiResponse.forbidden(res, "CSRF token missing in request");
  }

  // Validate tokens match (constant-time comparison to prevent timing attacks)
  const isValid = crypto.timingSafeEqual(
    Buffer.from(cookieToken),
    Buffer.from(requestToken as string),
  );

  if (!isValid) {
    logger.security({
      type: "csrf",
      action: "token_mismatch",
      details: { method: req.method, path: req.path, ip: req.ip },
    });
    return ApiResponse.forbidden(res, "Invalid CSRF token");
  }

  // Token is valid, proceed
  next();
}

/**
 * Middleware: CSRF protection with auto token generation
 * Combines setCsrfToken + validateCsrfToken
 * Use this on routes that need both generation and validation
 */
export function csrfProtection(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  // For safe methods or if token doesn't exist yet, generate one
  const safeMethods = ["GET", "HEAD", "OPTIONS"];
  if (safeMethods.includes(req.method) || !req.cookies[CSRF_COOKIE_NAME]) {
    return setCsrfToken(req, res, next);
  }

  // For unsafe methods, validate existing token
  return validateCsrfToken(req, res, next);
}

/**
 * Helper: Get current CSRF token from request
 * Useful for endpoints that need to return the token to client
 */
export function getCsrfToken(req: Request): string | undefined {
  return req.cookies[CSRF_COOKIE_NAME];
}

/**
 * Helper: Clear CSRF token (e.g., on logout)
 */
export function clearCsrfToken(res: Response): void {
  res.clearCookie(CSRF_COOKIE_NAME, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "strict",
  });
}
