import { Request, Response } from "express";
import { AuthService } from "./service";
import { ApiResponse } from "../../utils/response";
import { asyncHandler } from "../../middlewares/error.middleware";
import { env } from "../../config/env";
import { clearCsrfToken } from "../../middlewares/csrf.middleware";
import { logger } from "../../utils/logger";

export class AuthController {
  private service: AuthService;

  constructor() {
    this.service = new AuthService();
  }

  login = asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;

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
    const { adminId, code } = req.body;

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
