import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { ApiResponse } from "../utils/response";
import { asyncHandler } from "./error.middleware";

/**
 * Extended Request interface with admin information
 * Used after authentication to access admin details in controllers
 */
export interface AuthRequest extends Request {
  admin?: {
    id: string;
    email: string;
    role: string;
  };
}

/**
 * Authenticate Admin Middleware
 *
 * Purpose:
 * - Protect admin routes from unauthorized access
 * - Validate JWT access token from Authorization header
 * - Attach admin information to request for use in controllers
 *
 * Token Verification:
 * - Expects: "Authorization: Bearer <token>" header
 * - Verifies: Signature, expiration, format
 * - Algorithm: HS256 (HMAC with SHA-256)
 *
 * Request Flow:
 * 1. Extract token from Authorization header
 * 2. Verify token signature and expiration
 * 3. Decode admin info (id, email, role)
 * 4. Attach to req.admin for controller access
 * 5. Call next() to proceed to route handler
 *
 * Error Handling:
 * - No token: 401 "No token provided"
 * - Expired token: 401 "Token expired"
 * - Invalid token: 401 "Invalid token"
 * - Malformed token: 401 "Invalid token"
 *
 * Usage:
 * @example
 * // Protect admin routes
 * router.get('/admin/products', authenticateAdmin, productController.getAll);
 *
 * // Access admin info in controller
 * async getProducts(req: AuthRequest, res: Response) {
 *   const adminId = req.admin?.id; // Available after authentication
 *   logger.audit('view_products', adminId);
 * }
 *
 * Security Notes:
 * - Access tokens are short-lived (24 hours)
 * - Expired tokens require refresh using /auth/refresh
 * - Tokens are stateless (no database lookup)
 * - Secret key must be strong (JWT_SECRET in .env)
 */
export const authenticateAdmin = asyncHandler(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      ApiResponse.unauthorized(res, "No token provided");
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      // Verify token
      const decoded = jwt.verify(token, env.JWT_SECRET, {
        algorithms: ["HS256"],
      }) as {
        id: string;
        email: string;
        role: string;
      };

      // Attach admin info to request
      req.admin = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
      };

      next();
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        ApiResponse.unauthorized(res, "Token expired");
        return;
      }
      ApiResponse.unauthorized(res, "Invalid token");
    }
  },
);

// Export alias for backward compatibility
export const authMiddleware = authenticateAdmin;
