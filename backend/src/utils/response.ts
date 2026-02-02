import { Response } from "express";

/**
 * Standardized success response format
 */
interface SuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
}

/**
 * Standardized error response format
 */
interface ErrorResponse {
  success: false;
  error: string;
  details?: any;
}

/**
 * Paginated response data structure
 */
interface PaginationData<T = any> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * ApiResponse - Standardized HTTP response formatter
 *
 * Purpose:
 * - Enforce consistent response structure across all endpoints
 * - Simplify response creation in controllers
 * - Provide clear success/error indicators
 * - Include standard HTTP status codes
 *
 * Response Format:
 * Success: { success: true, data: T, message?: string }
 * Error: { success: false, error: string, details?: any }
 * Paginated: { success: true, data: { items: T[], pagination: {...} } }
 *
 * Benefits:
 * - Frontend can check response.success for all endpoints
 * - Consistent error handling across API
 * - Type-safe responses with TypeScript
 * - Standard pagination format
 *
 * Usage:
 * @example
 * // Success response
 * return ApiResponse.success(res, product, 'Product found');
 *
 * // Created response (201)
 * return ApiResponse.created(res, product, 'Product created');
 *
 * // Error response
 * return ApiResponse.badRequest(res, 'Invalid input');
 *
 * // Paginated response
 * return ApiResponse.paginated(res, products, 1, 12, 100);
 */
export class ApiResponse {
  static success<T>(
    res: Response,
    data: T,
    message?: string,
    statusCode: number = 200,
  ): Response {
    const response: SuccessResponse<T> = {
      success: true,
      data,
      ...(message && { message }),
    };
    return res.status(statusCode).json(response);
  }

  static created<T>(res: Response, data: T, message?: string): Response {
    return this.success(res, data, message, 201);
  }

  static error(
    res: Response,
    error: string,
    statusCode: number = 400,
    details?: any,
  ): Response {
    const response: ErrorResponse = {
      success: false,
      error,
      ...(details && { details }),
    };
    return res.status(statusCode).json(response);
  }

  static badRequest(res: Response, error: string, details?: any): Response {
    return this.error(res, error, 400, details);
  }

  static unauthorized(res: Response, error: string = "Unauthorized"): Response {
    return this.error(res, error, 401);
  }

  static forbidden(res: Response, error: string = "Forbidden"): Response {
    return this.error(res, error, 403);
  }

  static notFound(
    res: Response,
    error: string = "Resource not found",
  ): Response {
    return this.error(res, error, 404);
  }

  static conflict(res: Response, error: string): Response {
    return this.error(res, error, 409);
  }

  static serverError(
    res: Response,
    error: string = "Internal server error",
  ): Response {
    return this.error(res, error, 500);
  }

  static paginated<T>(
    res: Response,
    items: T[],
    page: number,
    limit: number,
    total: number,
  ): Response {
    const totalPages = Math.ceil(total / limit);
    const paginatedData: PaginationData<T> = {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
    return this.success(res, paginatedData);
  }
}
