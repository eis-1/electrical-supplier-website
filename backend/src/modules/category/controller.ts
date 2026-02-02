import { Request, Response } from "express";
import { CategoryService } from "./service";
import { ApiResponse } from "../../utils/response";
import { asyncHandler } from "../../middlewares/error.middleware";
import { AuthRequest } from "../../middlewares/auth.middleware";
import { sanitizeObject } from "../../utils/sanitize";

/**
 * CategoryController - HTTP request handlers for category endpoints
 *
 * Responsibilities:
 * - Handle category CRUD operations
 * - Manage active/inactive category filtering
 * - Coordinate with service layer for business logic
 *
 * Endpoints:
 * - GET /api/v1/categories - List all categories
 * - GET /api/v1/categories/:id - Get category by ID
 * - POST /api/v1/categories - Create category (admin only)
 * - PUT /api/v1/categories/:id - Update category (admin only)
 * - DELETE /api/v1/categories/:id - Delete category (admin only)
 *
 * Categories are used to:
 * - Organize products into logical groups
 * - Enable category-based navigation
 * - Display category icons in UI
 * - Control product display order
 */
export class CategoryController {
  private service: CategoryService;

  constructor() {
    this.service = new CategoryService();
  }

  /**
   * Get all categories
   *
   * Query Parameters:
   * - includeInactive: Include inactive categories (admin view)
   *
   * @route GET /api/v1/categories
   * @access Public
   */
  getAll = asyncHandler(async (req: Request, res: Response) => {
    const includeInactive = req.query.includeInactive === "true";
    const categories = await this.service.getAllCategories(includeInactive);
    return ApiResponse.success(res, categories);
  });

  getById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const category = await this.service.getCategoryById(id);
    return ApiResponse.success(res, category);
  });

  create = asyncHandler(async (req: AuthRequest, res: Response) => {
    // Sanitize input to prevent prototype pollution
    const sanitizedBody = sanitizeObject(req.body);
    const category = await this.service.createCategory(sanitizedBody);
    return ApiResponse.created(res, category, "Category created successfully");
  });

  update = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    // Sanitize input to prevent prototype pollution
    const sanitizedBody = sanitizeObject(req.body);
    const category = await this.service.updateCategory(id, sanitizedBody);
    return ApiResponse.success(res, category, "Category updated successfully");
  });

  delete = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    await this.service.deleteCategory(id);
    return ApiResponse.success(res, null, "Category deleted successfully");
  });
}
