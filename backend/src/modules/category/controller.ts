import { Request, Response } from 'express';
import { CategoryService } from './service';
import { ApiResponse } from '../../utils/response';
import { asyncHandler } from '../../middlewares/error.middleware';
import { AuthRequest } from '../../middlewares/auth.middleware';

export class CategoryController {
  private service: CategoryService;

  constructor() {
    this.service = new CategoryService();
  }

  getAll = asyncHandler(async (req: Request, res: Response) => {
    const includeInactive = req.query.includeInactive === 'true';
    const categories = await this.service.getAllCategories(includeInactive);
    return ApiResponse.success(res, categories);
  });

  getById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const category = await this.service.getCategoryById(id);
    return ApiResponse.success(res, category);
  });

  create = asyncHandler(async (req: AuthRequest, res: Response) => {
    const category = await this.service.createCategory(req.body);
    return ApiResponse.created(res, category, 'Category created successfully');
  });

  update = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const category = await this.service.updateCategory(id, req.body);
    return ApiResponse.success(res, category, 'Category updated successfully');
  });

  delete = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    await this.service.deleteCategory(id);
    return ApiResponse.success(res, null, 'Category deleted successfully');
  });
}
