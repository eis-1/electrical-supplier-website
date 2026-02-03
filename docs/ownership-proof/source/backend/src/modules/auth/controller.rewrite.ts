/**
 * AuthController (archived reference)
 *
 * This file is preserved as an internal reference copy of a prior iteration.
 * It is intentionally stored under docs/ so it is excluded from compilation and runtime.
 */

import { Request, Response } from "express";
import { AuthService } from "./service";
import { ApiResponse } from "../../utils/response";
import { asyncHandler } from "../../middlewares/error.middleware";
import { env } from "../../config/env";
import { clearCsrfToken } from "../../middlewares/csrf.middleware";
import { logger } from "../../utils/logger";
import { sanitizeObject } from "../../utils/sanitize";

/**
 * ARCHITECTURE DECISION: Why separate controller and service layers?
 *
 * Controller Layer (this file):
 * - Handles HTTP request/response
 * - Extracts data from request (body, cookies, headers)
 * - Calls service layer for business logic
 * - Formats responses (status codes, cookies, JSON)
 * - Input sanitization and validation
 *
 * Service Layer (service.ts):
 * - Contains business logic (password verification, token generation)
 * - Database operations (via repository pattern)
 * - Independent of HTTP concerns (can be used in CLI, tests, etc.)
 * - Throws AppError for known failures
 *
 * WHY: Separation of concerns, testability, reusability
 */
export class AuthController {
  private authService: AuthService;

  constructor() {
    // Initialize service layer
    // WHY instantiate here? Each controller instance manages its own dependencies
    this.authService = new AuthService();
  }

  /**
   * LOGIN ENDPOINT - Step 1 of Authentication
   *
   * Route: POST /api/v1/auth/login
   * Access: Public (no authentication required)
   * Rate Limit: 5 requests per 15 minutes per IP (configured in routes)
   *
   * FLOW:
   * 1. Extract email and password from request body
   * 2. Sanitize input to prevent prototype pollution attacks
   * 3. Call service layer to validate credentials
   * 4. If 2FA enabled: Return admin data without tokens (require 2FA code)
   * 5. If 2FA disabled: Issue tokens immediately
   * 6. Set refresh token in HttpOnly cookie
   * 7. Return access token in response body
   *
   * WHY TWO TOKENS?
   * - Access Token (short-lived, 24h):
   *   * Sent in Authorization header with each API request
   *   * Stored in memory or localStorage on frontend
   *   * Can't be revoked (stateless JWT)
   *   * Short lifetime limits damage if stolen
   *
   * - Refresh Token (long-lived, 7 days):
   *   * Stored in HttpOnly cookie (JavaScript can't access)
   *   * Used only to get new access tokens
   *   * Stored in database (can be revoked)
   *   * Rotated on each use (one-time use tokens)
   *
   * WHY HTTPONLY COOKIE FOR REFRESH TOKEN?
   * - XSS Protection: JavaScript can't access HttpOnly cookies
   * - If attacker injects malicious script, they can't steal refresh token
   * - Even if access token stolen from localStorage, damage limited to 24h
   *
   * SECURITY CONSIDERATIONS:
   * - Rate limiting prevents brute force password attacks
   * - Input sanitization prevents prototype pollution
   * - IP and user agent logged for audit trail
   * - Passwords never sent in response or logged
   * - Cookie security flags (httpOnly, secure, sameSite)
   */
  login = asyncHandler(async (req: Request, res: Response) => {
    // STEP 1: Extract and sanitize input
    // WHY sanitize? Prevents {"__proto__": {"isAdmin": true}} attacks
    const sanitizedInput = sanitizeObject<{
      email: string;
      password: string;
    }>(req.body);

    const { email, password } = sanitizedInput;

    // STEP 2: Extract client information for audit trail
    const clientIp = req.ip;
    const clientUserAgent = req.headers["user-agent"];

    // STEP 3: Call service layer for credential validation
    const loginResult = await this.authService.login(
      email,
      password,
      clientIp,
      clientUserAgent
    );

    // STEP 4: Handle 2FA requirement
    if (loginResult.requiresTwoFactor) {
      return ApiResponse.success(
        res,
        {
          requiresTwoFactor: true,
          admin: loginResult.admin,
        },
        "Two-factor authentication required"
      );
    }

    // STEP 5: Set refresh token as HttpOnly cookie
    res.cookie("refreshToken", loginResult.refreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // STEP 6: Return access token in response body
    return ApiResponse.success(
      res,
      {
        token: loginResult.token,
        admin: loginResult.admin,
      },
      "Login successful"
    );
  });

  verify = asyncHandler(async (req: Request, res: Response) => {
    const authorizationHeader = req.headers.authorization;

    if (!authorizationHeader || !authorizationHeader.startsWith("Bearer ")) {
      return ApiResponse.unauthorized(res, "No token provided");
    }

    const accessToken = authorizationHeader.substring(7);
    const decodedToken = await this.authService.verifyToken(accessToken);

    return ApiResponse.success(res, {
      valid: true,
      admin: decodedToken,
    });
  });

  refresh = asyncHandler(async (req: Request, res: Response) => {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return ApiResponse.unauthorized(res, "No refresh token provided");
    }

    const clientIp = req.ip;
    const clientUserAgent = req.headers["user-agent"];

    const refreshResult = await this.authService.refreshAccessToken(
      refreshToken,
      clientIp,
      clientUserAgent
    );

    res.cookie("refreshToken", refreshResult.refreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return ApiResponse.success(
      res,
      {
        token: refreshResult.token,
      },
      "Token refreshed"
    );
  });

  logout = asyncHandler(async (req: Request, res: Response) => {
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken) {
      try {
        await this.authService.revokeRefreshToken(refreshToken);
      } catch (error) {
        logger.error("Failed to revoke refresh token during logout", error);
      }
    }

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "strict",
    });

    clearCsrfToken(res);

    return ApiResponse.success(res, null, "Logout successful");
  });

  verify2FA = asyncHandler(async (req: Request, res: Response) => {
    const sanitizedInput = sanitizeObject<{
      adminId: string;
      code: string;
    }>(req.body);

    const { adminId, code } = sanitizedInput;

    if (!adminId || !code) {
      return ApiResponse.badRequest(res, "Admin ID and 2FA code required");
    }

    const clientIp = req.ip;
    const clientUserAgent = req.headers["user-agent"];

    const verifyResult = await this.authService.verify2FA(
      adminId,
      code,
      clientIp,
      clientUserAgent
    );

    res.cookie("refreshToken", verifyResult.refreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return ApiResponse.success(
      res,
      {
        token: verifyResult.token,
        admin: verifyResult.admin,
      },
      "2FA verification successful"
    );
  });
}
