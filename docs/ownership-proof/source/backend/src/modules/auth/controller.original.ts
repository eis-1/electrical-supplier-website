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
 * AuthController - Handles admin authentication and session management
 *
 * Endpoints:
 * - POST /api/auth/login - Admin login with optional 2FA
 * - POST /api/auth/verify-2fa - Verify 2FA code
 * - POST /api/auth/verify - Verify JWT token validity
 * - POST /api/auth/refresh - Refresh access token using refresh token
 * - POST /api/auth/logout - Invalidate session and clear tokens
 */
export class AuthController {
  private service: AuthService;

  constructor() {
    this.service = new AuthService();
  }

  login = asyncHandler(async (req: Request, res: Response) => {
    const sanitizedBody = sanitizeObject<{ email: string; password: string }>(req.body);
    const { email, password } = sanitizedBody;

    const result = await this.service.login(
      email,
      password,
      req.ip,
      req.headers["user-agent"],
    );

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
      "Login successful",
    );
  });

  verify = asyncHandler(async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return ApiResponse.unauthorized(res, "No token provided");
    }

    const token = authHeader.substring(7);
    const decoded = await this.service.verifyToken(token);

    return ApiResponse.success(res, { valid: true, admin: decoded });
  });

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

    if (refreshToken) {
      try {
        await this.service.revokeRefreshToken(refreshToken);
      } catch (error) {
        logger.error("Failed to revoke token on logout", error);
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
