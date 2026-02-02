import { Request, Response } from "express";
import { ProductService } from "./service";
import { ApiResponse } from "../../utils/response";
import { asyncHandler } from "../../middlewares/error.middleware";
import { AuthRequest } from "../../middlewares/auth.middleware";
import { logger } from "../../utils/logger";
import { env } from "../../config/env";
import { sanitizeObject } from "../../utils/sanitize";

/**
 * ProductController - HTTP request handlers for product endpoints
 *
 * Responsibilities:
 * - Parse and validate request parameters
 * - Call service layer for business logic
 * - Format and return HTTP responses
 * - Handle pagination and filtering
 *
 * Endpoints:
 * - GET /api/v1/products - List products with filters and pagination
 * - GET /api/v1/products/:id - Get product by ID
 * - GET /api/v1/products/slug/:slug - Get product by slug
 * - POST /api/v1/products - Create product (admin only)
 * - PUT /api/v1/products/:id - Update product (admin only)
 * - DELETE /api/v1/products/:id - Delete product (admin only)
 *
 * Security:
 * - Public endpoints: getAll, getById, getBySlug
 * - Protected endpoints: create, update, delete (require JWT authentication)
 * - Input validation via DTOs (see product/dto.ts)
 * - Pagination limits enforced to prevent overflow attacks
 */
export class ProductController {
  private service: ProductService;

  constructor() {
    this.service = new ProductService();
  }

  /**
   * Get all products with filtering, search, and pagination
   *
   * Query Parameters:
   * - category: Filter by category slug
   * - brand: Filter by brand slug (can be array)
   * - search: Full-text search in name, model, description
   * - featured: Filter featured products (true/false)
   * - page: Page number (default: 1)
   * - limit: Items per page (default: 12, max: env.MAX_PAGE_SIZE)
   *
   * Security:
   * - Enforces max page size to prevent memory overflow
   * - Validates numeric inputs
   *
   * @route GET /api/v1/products
   * @access Public
   */
  getAll = asyncHandler(async (req: Request, res: Response) => {
    const {
      category,
      brand,
      search,
      featured,
      page = "1",
      limit = "12",
    } = req.query;

    const filters = {
      category: category as string,
      brand: brand
        ? Array.isArray(brand)
          ? (brand as string[])
          : [brand as string]
        : undefined,
      search: search as string,
      featured: featured === "true" ? true : undefined,
    };

    const pageNum = parseInt(page as string, 10);
    // Phase 2: Enforce maximum page size to prevent overflow attacks
    const requestedLimit = parseInt(limit as string, 10) || env.DEFAULT_PAGE_SIZE;
    const limitNum = Math.min(requestedLimit, env.MAX_PAGE_SIZE);

    const { items, total } = await this.service.getAllProducts(
      filters,
      pageNum,
      limitNum,
    );

    return ApiResponse.paginated(res, items, pageNum, limitNum, total);
  });

  getById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const product = await this.service.getProductById(id);
    return ApiResponse.success(res, product);
  });

  getBySlug = asyncHandler(async (req: Request, res: Response) => {
    const { slug } = req.params;
    const product = await this.service.getProductBySlug(slug);
    return ApiResponse.success(res, product);
  });

  create = asyncHandler(async (req: AuthRequest, res: Response) => {
    // Sanitize input to prevent prototype pollution
    const sanitizedBody = sanitizeObject(req.body);
    const product = await this.service.createProduct(sanitizedBody);
    logger.audit("product_created", req.admin?.id || "unknown", {
      productId: product.id,
      productName: product.name,
    });
    return ApiResponse.created(res, product, "Product created successfully");
  });

  update = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    // Sanitize input to prevent prototype pollution
    const sanitizedBody = sanitizeObject(req.body);
    const product = await this.service.updateProduct(id, sanitizedBody);
    logger.audit("product_updated", req.admin?.id || "unknown", {
      productId: id,
      productName: product.name,
    });
    return ApiResponse.success(res, product, "Product updated successfully");
  });

  delete = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    await this.service.deleteProduct(id);
    logger.audit("product_deleted", req.admin?.id || "unknown", {
      productId: id,
    });
    return ApiResponse.success(res, null, "Product deleted successfully");
  });
}
