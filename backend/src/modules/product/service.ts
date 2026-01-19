import { ProductRepository, ProductWithRelations } from "./repository";
import { AppError } from "../../middlewares/error.middleware";

interface ProductFilters {
  category?: string;
  brand?: string[];
  search?: string;
  featured?: boolean;
}

interface CreateProductData {
  name: string;
  slug?: string;
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

  private slugify(input: string): string {
    return (input || "")
      .toLowerCase()
      .trim()
      .replace(/['"]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  private async generateUniqueSlug(base: string): Promise<string> {
    const cleaned = this.slugify(base);
    const fallback = cleaned || `product-${Date.now()}`;

    // Try base, then base-2, base-3, ...
    let candidate = fallback;
    for (let i = 0; i < 50; i++) {
      const existing = await this.repository.findBySlug(candidate);
      if (!existing) return candidate;
      candidate = `${fallback}-${i + 2}`;
    }

    // Extremely unlikely fallback
    return `${fallback}-${Date.now()}`;
  }

  async getAllProducts(
    filters: ProductFilters,
    page: number = 1,
    limit: number = 12,
  ): Promise<{
    items: ProductWithRelations[];
    total: number;
    page: number;
    limit: number;
  }> {
    return this.repository.findAll(filters, page, limit);
  }

  async getProductById(id: string): Promise<ProductWithRelations> {
    const product = await this.repository.findById(id);

    if (!product) {
      throw new AppError(404, "Product not found");
    }

    return product;
  }

  async getProductBySlug(slug: string): Promise<ProductWithRelations> {
    const product = await this.repository.findBySlug(slug);

    if (!product) {
      throw new AppError(404, "Product not found");
    }

    return product;
  }

  async createProduct(data: CreateProductData) {
    const desiredSlug = (data.slug || "").trim();
    const baseForSlug = [data.name, data.model].filter(Boolean).join(" ");

    const slug = desiredSlug
      ? this.slugify(desiredSlug)
      : await this.generateUniqueSlug(baseForSlug);

    // If the caller provided a slug, still enforce uniqueness.
    if (desiredSlug) {
      const existing = await this.repository.findBySlug(slug);
      if (existing) {
        throw new AppError(409, "Product with this slug already exists");
      }
    }

    return this.repository.create({
      ...data,
      slug,
    });
  }

  async updateProduct(id: string, data: Partial<CreateProductData>) {
    // Check if product exists
    await this.getProductById(id);

    // Check if slug is being updated and if it's already taken
    if (typeof data.slug === "string" && data.slug.trim().length > 0) {
      const normalizedSlug = this.slugify(data.slug);
      data.slug = normalizedSlug;
      const existing = await this.repository.findBySlug(normalizedSlug);
      if (existing && existing.id !== id) {
        throw new AppError(409, "Product with this slug already exists");
      }
    }

    return this.repository.update(id, data);
  }

  async deleteProduct(id: string): Promise<void> {
    await this.getProductById(id);
    await this.repository.delete(id);
  }
}
