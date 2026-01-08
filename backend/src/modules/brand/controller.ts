import { Request, Response } from 'express';
import { BrandService } from './service';
import { ApiResponse } from '../../utils/response';
import { asyncHandler } from '../../middlewares/error.middleware';
import { AuthRequest } from '../../middlewares/auth.middleware';

export class BrandController {
  private service: BrandService;

  constructor() {
    this.service = new BrandService();
  }

  getAll = asyncHandler(async (req: Request, res: Response) => {
    const includeInactive = req.query.includeInactive === 'true';
    const brands = await this.service.getAllBrands(includeInactive);
    return ApiResponse.success(res, brands);
  });

  getById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const brand = await this.service.getBrandById(id);
    return ApiResponse.success(res, brand);
  });

  create = asyncHandler(async (req: AuthRequest, res: Response) => {
    const brand = await this.service.createBrand(req.body);
    return ApiResponse.created(res, brand, 'Brand created successfully');
  });

  update = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const brand = await this.service.updateBrand(id, req.body);
    return ApiResponse.success(res, brand, 'Brand updated successfully');
  });

  delete = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    await this.service.deleteBrand(id);
    return ApiResponse.success(res, null, 'Brand deleted successfully');
  });
}
