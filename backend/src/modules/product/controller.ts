import { Request, Response } from "express";
import { ProductService } from "./service";
import { ApiResponse } from "../../utils/response";
import { asyncHandler } from "../../middlewares/error.middleware";
import { AuthRequest } from "../../middlewares/auth.middleware";
import { logger } from "../../utils/logger";
import { env } from "../../config/env";

export class ProductController {
  private service: ProductService;

  constructor() {
    this.service = new ProductService();
  }

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
    const product = await this.service.createProduct(req.body);
    logger.audit("product_created", req.admin?.id || "unknown", {
      productId: product.id,
      productName: product.name,
    });
    return ApiResponse.created(res, product, "Product created successfully");
  });

  update = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const product = await this.service.updateProduct(id, req.body);
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
