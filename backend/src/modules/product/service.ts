import { ProductRepository, ProductWithRelations } from "./repository";
import { AppError } from "../../middlewares/error.middleware";

/**
 * Filter options for querying products
 * Supports category, brand, search text, and featured flag filtering
 */
interface ProductFilters {
  category?: string;
  brand?: string[];
  search?: string;
  featured?: boolean;
}

/**
 * Data structure for creating a new product
 * Contains all product information including specs and images
 */
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

/**
 * ProductService - Business logic for product catalog management
 *
 * Handles all product-related operations including:
 * - CRUD operations for products
 * - Automatic slug generation from product names
 * - Search and filtering with pagination
 * - Product specifications management
 * - Category and brand associations
 *
 * Features:
 * - URL-friendly slug generation (e.g., "Circuit Breaker MCB" -> "circuit-breaker-mcb")
 * - Automatic slug uniqueness with numeric suffixes
 * - Validation for duplicate slugs
 * - Related data loading (category, brand, specs)
 */
export class ProductService {
  private repository: ProductRepository;

  /**
   * Initialize the service with a repository instance
   */
  constructor() {
    this.repository = new ProductRepository();
  }

  /**
   * Convert text to URL-friendly slug format
   *
   * Rules:
   * - Converts to lowercase
   * - Removes quotes
   * - Replaces non-alphanumeric characters with hyphens
   * - Removes leading/trailing hyphens
   * - Collapses multiple hyphens into one
   *
   * @param input - Text to convert to slug
   * @returns URL-friendly slug
   *
   * @example
   * slugify("Circuit Breaker (MCB)") // returns "circuit-breaker-mcb"
   * slugify("50A - 3 Phase") // returns "50a-3-phase"
   */
  private slugify(input: string): string {
    return (input || "")
      .toLowerCase()
      .trim()
      .replace(/['"]/g, "") // Remove quotes
      .replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumeric with hyphens
      .replace(/-+/g, "-") // Collapse multiple hyphens
      .replace(/^-|-$/g, ""); // Remove leading/trailing hyphens
  }

  /**
   * Generate a unique slug by checking database and adding numeric suffixes
   *
   * Process:
   * 1. Slugify the base text
   * 2. Check if slug exists
   * 3. If exists, try slug-2, slug-3, etc. up to 50 attempts
   * 4. If all taken, append timestamp as last resort
   *
   * @param base - Base text for slug (usually product name + model)
   * @returns Unique slug that doesn't exist in database
   *
   * @example
   * // If "circuit-breaker" exists
   * await generateUniqueSlug("Circuit Breaker") // returns "circuit-breaker-2"
   *
   * // If "circuit-breaker-2" also exists
   * await generateUniqueSlug("Circuit Breaker") // returns "circuit-breaker-3"
   */
  private async generateUniqueSlug(base: string): Promise<string> {
    const cleaned = this.slugify(base);
    const fallback = cleaned || `product-${Date.now()}`;

    // Try base slug first, then add numeric suffixes
    let candidate = fallback;
    for (let i = 0; i < 50; i++) {
      const existing = await this.repository.findBySlug(candidate);
      if (!existing) return candidate; // Found available slug
      candidate = `${fallback}-${i + 2}`; // Try next number (start from -2)
    }

    // Extremely unlikely: all 50 attempts failed, use timestamp
    return `${fallback}-${Date.now()}`;
  }

  /**
   * Retrieve all products with filtering, search, and pagination
   *
   * Supports:
   * - Category filtering (by slug)
   * - Brand filtering (by slug, multiple brands)
   * - Text search (name, description, model)
   * - Featured products only
   * - Pagination (page & limit)
   *
   * @param filters - Filter criteria (category, brand, search, featured)
   * @param page - Page number (1-based index), default: 1
   * @param limit - Items per page, default: 12
   * @returns Paginated list with items, total count, page info
   *
   * @example
   * // Get all circuit breakers, page 1
   * const products = await service.getAllProducts({ category: 'circuit-breakers' }, 1, 12);
   *
   * // Search for "MCB" products
   * const results = await service.getAllProducts({ search: 'MCB' });
   */
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

  /**
   * Retrieve a single product by ID
   *
   * Includes related data:
   * - Category information
   * - Brand information
   * - Product specifications
   *
   * @param id - Product UUID
   * @returns Product with all related data
   * @throws {AppError} 404 if product not found
   *
   * @example
   * const product = await service.getProductById('123e4567-e89b-12d3-a456-426614174000');
   */
  async getProductById(id: string): Promise<ProductWithRelations> {
    const product = await this.repository.findById(id);

    if (!product) {
      throw new AppError(404, "Product not found");
    }

    return product;
  }

  /**
   * Retrieve a single product by URL slug
   *
   * Used for public product detail pages with SEO-friendly URLs
   *
   * @param slug - URL-friendly product identifier
   * @returns Product with all related data
   * @throws {AppError} 404 if product not found
   *
   * @example
   * const product = await service.getProductBySlug('circuit-breaker-mcb-50a');
   */
  async getProductBySlug(slug: string): Promise<ProductWithRelations> {
    const product = await this.repository.findBySlug(slug);

    if (!product) {
      throw new AppError(404, "Product not found");
    }

    return product;
  }

  /**
   * Create a new product with automatic slug generation
   *
   * Slug Generation Logic:
   * - If slug provided: Use it after validation (must be unique)
   * - If no slug: Auto-generate from name + model
   * - Auto-generated slugs get numeric suffixes if duplicate
   *
   * @param data - Product information including name, category, specs, etc.
   * @returns Created product with generated slug and ID
   * @throws {AppError} 409 if provided slug already exists
   *
   * @example
   * const product = await service.createProduct({
   *   name: 'Circuit Breaker MCB',
   *   model: 'CB-50A',
   *   categoryId: 'cat-uuid',
   *   brandId: 'brand-uuid',
   *   description: 'High-quality circuit breaker',
   *   specs: [
   *     { specKey: 'Current Rating', specValue: '50A', displayOrder: 1 },
   *     { specKey: 'Poles', specValue: '3', displayOrder: 2 }
   *   ]
   * });
   */
  async createProduct(data: CreateProductData) {
    // Determine base text for slug generation
    const desiredSlug = (data.slug || "").trim();
    const baseForSlug = [data.name, data.model].filter(Boolean).join(" ");

    // Generate slug based on provided slug or auto-generate
    const slug = desiredSlug
      ? this.slugify(desiredSlug) // Use provided slug (cleaned)
      : await this.generateUniqueSlug(baseForSlug); // Auto-generate from name+model

    // If caller provided a custom slug, verify it's unique
    if (desiredSlug) {
      const existing = await this.repository.findBySlug(slug);
      if (existing) {
        throw new AppError(409, "Product with this slug already exists");
      }
    }

    // Create product with finalized slug
    return this.repository.create({
      ...data,
      slug,
    });
  }

  /**
   * Update an existing product
   *
   * Allows partial updates to any product field.
   * Special handling for slug updates to ensure uniqueness.
   *
   * @param id - Product UUID
   * @param data - Fields to update (partial data allowed)
   * @returns Updated product
   * @throws {AppError} 404 if product not found
   * @throws {AppError} 409 if new slug already exists
   *
   * @example
   * const updated = await service.updateProduct(id, {
   *   name: 'Updated Product Name',
   *   isFeatured: true,
   *   specs: [{ specKey: 'New Spec', specValue: 'Value', displayOrder: 1 }]
   * });
   */
  async updateProduct(id: string, data: Partial<CreateProductData>) {
    // Verify product exists
    await this.getProductById(id);

    // Check if slug is being updated and ensure uniqueness
    if (typeof data.slug === "string" && data.slug.trim().length > 0) {
      const normalizedSlug = this.slugify(data.slug);
      data.slug = normalizedSlug;
      const existing = await this.repository.findBySlug(normalizedSlug);
      // Ensure the slug isn't taken by another product (exclude current product)
      if (existing && existing.id !== id) {
        throw new AppError(409, "Product with this slug already exists");
      }
    }

    return this.repository.update(id, data);
  }

  /**
   * Delete a product
   *
   * Note: This may be a soft delete or hard delete depending on
   * repository implementation. Check cascade rules for related
   * data (specs, images, etc.)
   *
   * @param id - Product UUID
   * @throws {AppError} 404 if product not found
   *
   * @example
   * await service.deleteProduct('123e4567-e89b-12d3-a456-426614174000');
   */
  async deleteProduct(id: string): Promise<void> {
    // Verify product exists before deletion
    await this.getProductById(id);
    await this.repository.delete(id);
  }
}
