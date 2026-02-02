import { Request, Response } from "express";
import { AuthService } from "./service";
import { ApiResponse } from "../../utils/response";
import { asyncHandler } from "../../middlewares/error.middleware";
import { env } from "../../config/env";
import { clearCsrfToken } from "../../middlewares/csrf.middleware";
import { logger } from "../../utils/logger";
import { sanitizeObject } from "../../utils/sanitize";

/**
 * AuthController - Handles admin authentication and session management
 *
 * Endpoints:
 * - POST /api/auth/login - Admin login with optional 2FA
 * - POST /api/auth/verify-2fa - Verify 2FA code
 * - POST /api/auth/verify - Verify JWT token validity
 * - POST /api/auth/refresh - Refresh access token using refresh token
 * - POST /api/auth/logout - Invalidate session and clear tokens
 *
 * Security Features:
 * - JWT-based authentication (access token + refresh token)
 * - Optional 2FA with TOTP (Time-based One-Time Password)
 * - Refresh token stored in HttpOnly cookie (XSS protection)
 * - Access token in response body (short-lived, 24h)
 * - Rate limiting on login/2FA endpoints
 * - IP and user agent logging for audit trail
 *
 * Token Strategy:
 * - Access Token: Short-lived (24h), stored in memory/localStorage, sent in Authorization header
 * - Refresh Token: Long-lived (7 days), stored in HttpOnly cookie, used to get new access tokens
 *
 * 2FA Flow:
 * 1. Admin enters email/password
 * 2. If 2FA enabled: return {requiresTwoFactor: true}
 * 3. Frontend prompts for 2FA code
 * 4. Admin enters 6-digit code
 * 5. Verify code and issue tokens
 */
export class AuthController {
  private service: AuthService;

  constructor() {
    this.service = new AuthService();
  }

  /**
   * Admin login endpoint
   *
   * Flow:
   * 1. Validate email and password
   * 2. Check if 2FA is enabled for admin
   * 3. If 2FA enabled: Return {requiresTwoFactor: true}, wait for 2FA code
   * 4. If 2FA disabled: Issue access + refresh tokens immediately
   *
   * Security:
   * - Rate limited (5 attempts per 15 minutes per IP)
   * - Logs IP and user agent for audit trail
   * - Password hashed with bcrypt (never stored plain text)
   * - Refresh token set as HttpOnly cookie (XSS protection)
   *
   * Response:
   * - Success: {token, admin} or {requiresTwoFactor: true, admin}
   * - Failure: 401 with error message
   *
   * Cookie Settings:
   * - httpOnly: true - Prevents JavaScript access (XSS protection)
   * - secure: production only - HTTPS only in production
   * - sameSite: strict - CSRF protection
   * - maxAge: 7 days - Refresh token lifetime
   *
   * @route POST /api/auth/login
   * @access Public
   */
  login = asyncHandler(async (req: Request, res: Response) => {
    // Sanitize input to prevent prototype pollution attacks
    const sanitizedBody = sanitizeObject<{ email: string; password: string }>(req.body);
    const { email, password } = sanitizedBody;

    const result = await this.service.login(
      email,
      password,
      req.ip,
      req.headers["user-agent"],
    );

    // If 2FA is required, return 2FA required response
    if (result.requiresTwoFactor) {
      return ApiResponse.success(
        res,
        {
          requiresTwoFactor: true,
          admin: result.admin,
        },
        "Two-factor authentication required",
      );
    }

    // Set refresh token as HttpOnly cookie (more secure than localStorage)
    res.cookie("refreshToken", result.refreshToken, {
      httpOnly: true, // Prevents JavaScript access (XSS protection)
      secure: env.NODE_ENV === "production", // HTTPS only in production
      sameSite: "strict", // CSRF protection
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    });

    // Return access token in response body (frontend stores in memory/localStorage)
    return ApiResponse.success(
      res,
      {
        token: result.token,
        admin: result.admin,
      },
      "Login successful",
    );
  });

  /**
   * Verify JWT token validity
   *
   * Used by frontend to:
   * - Check if current token is still valid
   * - Retrieve admin info from token
   * - Validate before protected operations
   *
   * Token Source: Authorization header (Bearer <token>)
   *
   * Response:
   * - Success: {valid: true, admin: {id, email, role}}
   * - Failure: 401 if token invalid/expired
   *
   * @route POST /api/auth/verify
   * @access Public
   */
  verify = asyncHandler(async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return ApiResponse.unauthorized(res, "No token provided");
    }

    const token = authHeader.substring(7);
    const decoded = await this.service.verifyToken(token);

    return ApiResponse.success(res, { valid: true, admin: decoded });
  });

  /**
   * Refresh access token using refresh token
   *
   * Token Refresh Flow:
   * 1. Frontend detects access token is expired (401 on API call)
   * 2. Calls /auth/refresh with refresh token in cookie
   * 3. Backend validates refresh token from database
   * 4. Issues new access token + new refresh token
   * 5. Frontend updates in-memory access token
   * 6. Retries original API call with new access token
   *
   * Security:
   * - Refresh token must exist in database (can be revoked)
   * - Validates IP and user agent match original login
   * - Issues new refresh token (refresh token rotation)
   * - Old refresh token invalidated automatically
   *
   * Token Source: refreshToken cookie (HttpOnly)
   *
   * Response:
   * - Success: {token, admin} with new tokens
   * - Failure: 401 if refresh token invalid/expired
   *
   * @route POST /api/auth/refresh
   * @access Public
   */
  refresh = asyncHandler(async (req: Request, res: Response) => {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return ApiResponse.unauthorized(res, "No refresh token provided");
    }

    const result = await this.service.refreshAccessToken(
      refreshToken,
      req.ip,
      req.headers["user-agent"],
    );

    // Set new refresh token (rotation)
    res.cookie("refreshToken", result.refreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return ApiResponse.success(res, { token: result.token }, "Token refreshed");
  });

  logout = asyncHandler(async (req: Request, res: Response) => {
    const refreshToken = req.cookies.refreshToken;

    // Revoke the refresh token if it exists
    if (refreshToken) {
      try {
        await this.service.revokeRefreshToken(refreshToken);
      } catch (error) {
        // Log but don't fail logout if token revocation fails
        logger.error("Failed to revoke token on logout", error);
      }
    }

    // Clear the refresh token cookie
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "strict",
    });

    // Clear CSRF token cookie as well
    clearCsrfToken(res);

    return ApiResponse.success(res, null, "Logout successful");
  });

  verify2FA = asyncHandler(async (req: Request, res: Response) => {
    // Sanitize input to prevent prototype pollution
    const sanitizedBody = sanitizeObject<{ adminId: string; code: string }>(req.body);
    const { adminId, code } = sanitizedBody;

    if (!adminId || !code) {
      return ApiResponse.badRequest(res, "Admin ID and 2FA code required");
    }

    const result = await this.service.verify2FA(
      adminId,
      code,
      req.ip,
      req.headers["user-agent"],
    );

    // Set refresh token as HttpOnly cookie
    res.cookie("refreshToken", result.refreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return ApiResponse.success(
      res,
      {
        token: result.token,
        admin: result.admin,
      },
      "2FA verification successful",
    );
  });
}
