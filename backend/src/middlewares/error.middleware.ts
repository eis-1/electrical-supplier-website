import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";
import { captureException } from "../config/sentry";
import { ApiResponse } from "../utils/response";

/**
 * AppError - Custom error class for operational errors
 *
 * Purpose:
 * - Distinguish operational errors (expected) from programmer errors (unexpected)
 * - Provide status codes for HTTP responses
 * - Enable structured error handling
 *
 * Operational Errors (expected):
 * - 400 Bad Request (validation failures)
 * - 401 Unauthorized (authentication required)
 * - 403 Forbidden (insufficient permissions)
 * - 404 Not Found (resource doesn't exist)
 * - 409 Conflict (duplicate key, constraint violation)
 * - 429 Too Many Requests (rate limit exceeded)
 *
 * Programmer Errors (unexpected):
 * - Syntax errors, type errors
 * - Unhandled promise rejections
 * - Memory leaks, segfaults
 * - Should be caught in development/testing
 *
 * @example
 * if (!user) {
 *   throw new AppError(404, 'User not found');
 * }
 *
 * if (slug exists) {
 *   throw new AppError(409, 'Slug already taken');
 * }
 */
export class AppError extends Error {
  /**
   * Create a new operational error
   *
   * @param statusCode - HTTP status code (400, 401, 404, etc.)
   * @param message - Human-readable error message
   * @param isOperational - True for expected errors (default), false for programmer errors
   */
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational: boolean = true,
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Global error handler middleware
 *
 * Purpose:
 * - Catch all errors from route handlers and middleware
 * - Log errors for monitoring and debugging
 * - Send errors to Sentry for tracking
 * - Return consistent error responses
 * - Handle framework-specific errors (Prisma, JWT, etc.)
 *
 * Error Handling Strategy:
 * 1. Log all errors locally
 * 2. Send unexpected/server errors to Sentry
 * 3. Convert framework errors to standard responses
 * 4. Return appropriate HTTP status codes
 *
 * Sentry Integration:
 * - Operational 400-level errors: Not sent (expected)
 * - 500-level errors: Sent (unexpected)
 * - Programmer errors: Always sent
 *
 * Framework Errors Handled:
 * - Prisma: P2002 (unique constraint), P2025 (not found)
 * - JWT: JsonWebTokenError, TokenExpiredError
 * - Validation: express-validator errors
 *
 * @example
 * // In app.ts
 * app.use(errorHandler);
 *
 * // Errors are caught automatically
 * router.get('/users/:id', async (req, res) => {
 *   const user = await userService.getById(req.params.id);
 *   // If error thrown, errorHandler catches it
 * });
 */
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  // Log error
  logger.error("Error occurred:", err, {
    url: req.originalUrl,
    method: req.method,
    requestId: (req as any).requestId,
  });

  // Send to Sentry (non-operational errors only)
  if (err instanceof AppError) {
    // Operational errors (400-level) are expected, don't send to Sentry
    if (!err.isOperational || err.statusCode >= 500) {
      captureException(err, {
        url: req.originalUrl,
        method: req.method,
        statusCode: err.statusCode,
      });
    }
  } else {
    // Unexpected errors always go to Sentry
    captureException(err, {
      url: req.originalUrl,
      method: req.method,
    });
  }

  // Handle AppError
  if (err instanceof AppError) {
    ApiResponse.error(res, err.message, err.statusCode);
    return;
  }

  // Handle Prisma errors
  if (err.name === "PrismaClientKnownRequestError") {
    const prismaError = err as any;

    if (prismaError.code === "P2002") {
      ApiResponse.conflict(res, "A record with this value already exists");
      return;
    }

    if (prismaError.code === "P2025") {
      ApiResponse.notFound(res, "Record not found");
      return;
    }
  }

  // Handle validation errors
  if (err.name === "ValidationError") {
    ApiResponse.badRequest(res, "Validation failed", err.message);
    return;
  }

  // Handle JWT errors
  if (err.name === "JsonWebTokenError") {
    ApiResponse.unauthorized(res, "Invalid token");
    return;
  }

  if (err.name === "TokenExpiredError") {
    ApiResponse.unauthorized(res, "Token expired");
    return;
  }

  // Default error
  const statusCode = 500;
  const message =
    process.env.NODE_ENV === "production"
      ? "Internal server error"
      : err.message;

  ApiResponse.error(res, message, statusCode);
};

// Not found handler
export const notFoundHandler = (
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  ApiResponse.notFound(res, `Route ${req.originalUrl} not found`);
};

// Async handler wrapper
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>,
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
