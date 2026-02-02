import { Request, Response } from "express";
import { BrandService } from "./service";
import { ApiResponse } from "../../utils/response";
import { asyncHandler } from "../../middlewares/error.middleware";
import { AuthRequest } from "../../middlewares/auth.middleware";
import { sanitizeObject } from "../../utils/sanitize";

/**
 * BrandController - HTTP request handlers for brand endpoints
 *
 * Responsibilities:
 * - Handle brand CRUD operations
 * - Manage authorized brand status
 * - Filter active/inactive brands
 *
 * Endpoints:
 * - GET /api/v1/brands - List all brands
 * - GET /api/v1/brands/:id - Get brand by ID
 * - POST /api/v1/brands - Create brand (admin only)
 * - PUT /api/v1/brands/:id - Update brand (admin only)
 * - DELETE /api/v1/brands/:id - Delete brand (admin only)
 *
 * Brands represent:
 * - Electrical equipment manufacturers
 * - Authorized distributors
 * - Product filtering options
 */
export class BrandController {
  private service: BrandService;

  constructor() {
    this.service = new BrandService();
  }

  getAll = asyncHandler(async (req: Request, res: Response) => {
    const includeInactive = req.query.includeInactive === "true";
    const brands = await this.service.getAllBrands(includeInactive);
    return ApiResponse.success(res, brands);
  });

  getById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const brand = await this.service.getBrandById(id);
    return ApiResponse.success(res, brand);
  });

  create = asyncHandler(async (req: AuthRequest, res: Response) => {
    // Sanitize input to prevent prototype pollution
    const sanitizedBody = sanitizeObject(req.body);
    const brand = await this.service.createBrand(sanitizedBody);
    return ApiResponse.created(res, brand, "Brand created successfully");
  });

  update = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    // Sanitize input to prevent prototype pollution
    const sanitizedBody = sanitizeObject(req.body);
    const brand = await this.service.updateBrand(id, sanitizedBody);
    return ApiResponse.success(res, brand, "Brand updated successfully");
  });

  delete = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    await this.service.deleteBrand(id);
    return ApiResponse.success(res, null, "Brand deleted successfully");
  });
}
