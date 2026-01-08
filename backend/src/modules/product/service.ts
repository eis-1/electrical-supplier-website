import { ProductRepository, ProductWithRelations } from './repository';
import { AppError } from '../../middlewares/error.middleware';

interface ProductFilters {
  category?: string;
  brand?: string[];
  search?: string;
  featured?: boolean;
}

interface CreateProductData {
  name: string;
  slug: string;
  model?: string;
  categoryId?: string;
  brandId?: string;
  description?: string;
  keyFeatures?: string;
  image?: string;
  images?: string;
  datasheetUrl?: string;
  isFeatured?: boolean;
  specs?: Array<{ specKey: string; specValue: string; displayOrder?: number }>;
}

export class ProductService {
  private repository: ProductRepository;

  constructor() {
    this.repository = new ProductRepository();
  }

  async getAllProducts(filters: ProductFilters, page: number = 1, limit: number = 12): Promise<{ items: ProductWithRelations[]; total: number; page: number; limit: number }> {
    return this.repository.findAll(filters, page, limit);
  }

  async getProductById(id: string): Promise<ProductWithRelations> {
    const product = await this.repository.findById(id);

    if (!product) {
      throw new AppError(404, 'Product not found');
    }

    return product;
  }

  async getProductBySlug(slug: string): Promise<ProductWithRelations> {
    const product = await this.repository.findBySlug(slug);

    if (!product) {
      throw new AppError(404, 'Product not found');
    }

    return product;
  }

  async createProduct(data: CreateProductData) {
    // Check if slug already exists
    const existing = await this.repository.findBySlug(data.slug);
    if (existing) {
      throw new AppError(409, 'Product with this slug already exists');
    }

    return this.repository.create(data);
  }

  async updateProduct(id: string, data: Partial<CreateProductData>) {
    // Check if product exists
    await this.getProductById(id);

    // Check if slug is being updated and if it's already taken
    if (data.slug) {
      const existing = await this.repository.findBySlug(data.slug);
      if (existing && existing.id !== id) {
        throw new AppError(409, 'Product with this slug already exists');
      }
    }

    return this.repository.update(id, data);
  }

  async deleteProduct(id: string): Promise<void> {
    await this.getProductById(id);
    await this.repository.delete(id);
  }
}
