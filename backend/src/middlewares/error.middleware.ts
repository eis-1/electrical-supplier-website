import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";
import { captureException } from "../config/sentry";
import { ApiResponse } from "../utils/response";

export class AppError extends Error {
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
