import { BrandRepository } from "./repository";
import { Brand } from "@prisma/client";
import { AppError } from "../../middlewares/error.middleware";

interface CreateBrandData {
  name: string;
  slug: string;
  logo?: string;
  description?: string;
  website?: string;
  isAuthorized?: boolean;
  displayOrder?: number;
}

export class BrandService {
  private repository: BrandRepository;

  constructor() {
    this.repository = new BrandRepository();
  }

  async getAllBrands(includeInactive: boolean = false): Promise<Brand[]> {
    return this.repository.findAll(includeInactive);
  }

  async getBrandById(id: string): Promise<Brand> {
    const brand = await this.repository.findById(id);

    if (!brand) {
      throw new AppError(404, "Brand not found");
    }

    return brand;
  }

  async getBrandBySlug(slug: string): Promise<Brand> {
    const brand = await this.repository.findBySlug(slug);

    if (!brand) {
      throw new AppError(404, "Brand not found");
    }

    return brand;
  }

  async createBrand(data: CreateBrandData): Promise<Brand> {
    // Check if slug already exists
    const existing = await this.repository.findBySlug(data.slug);
    if (existing) {
      throw new AppError(409, "Brand with this slug already exists");
    }

    return this.repository.create(data);
  }

  async updateBrand(
    id: string,
    data: Partial<CreateBrandData>,
  ): Promise<Brand> {
    // Check if brand exists
    await this.getBrandById(id);

    // Check if slug is being updated and if it's already taken
    if (data.slug) {
      const existing = await this.repository.findBySlug(data.slug);
      if (existing && existing.id !== id) {
        throw new AppError(409, "Brand with this slug already exists");
      }
    }

    return this.repository.update(id, data);
  }

  async deleteBrand(id: string): Promise<void> {
    await this.getBrandById(id);
    await this.repository.delete(id);
  }
}
