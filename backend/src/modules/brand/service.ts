import { BrandRepository } from "./repository";
import { Brand } from "@prisma/client";
import { AppError } from "../../middlewares/error.middleware";

/**
 * Data structure for creating a new brand
 * Contains brand information and authorization status
 */
interface CreateBrandData {
  name: string;
  slug: string;
  logo?: string;
  description?: string;
  website?: string;
  isAuthorized?: boolean;
  displayOrder?: number;
}

/**
 * BrandService - Business logic for electrical equipment brand management
 *
 * Handles all brand-related operations including:
 * - CRUD operations for brands
 * - Slug uniqueness validation
 * - Active/inactive brand filtering
 * - Authorized distributor management
 *
 * Brands represent:
 * - Equipment manufacturers (Siemens, ABB, Schneider Electric, etc.)
 * - Authorized distributors
 * - Product filtering criteria
 *
 * Similar to CategoryService but for brands instead of product categories.
 */
export class BrandService {
  private repository: BrandRepository;

  constructor() {
    this.repository = new BrandRepository();
  }

  /**
   * Retrieve all brands
   *
   * @param includeInactive - Include inactive brands, default: false
   * @returns Array of brands sorted by displayOrder
   */
  async getAllBrands(includeInactive: boolean = false): Promise<Brand[]> {
    return this.repository.findAll(includeInactive);
  }

  /**
   * Retrieve a single brand by ID
   *
   * @param id - Brand UUID
   * @returns Brand data
   * @throws {AppError} 404 if brand not found
   */
  async getBrandById(id: string): Promise<Brand> {
    const brand = await this.repository.findById(id);

    if (!brand) {
      throw new AppError(404, "Brand not found");
    }

    return brand;
  }

  /**
   * Retrieve a single brand by URL slug
   *
   * @param slug - URL-friendly brand identifier
   * @returns Brand data
   * @throws {AppError} 404 if brand not found
   */
  async getBrandBySlug(slug: string): Promise<Brand> {
    const brand = await this.repository.findBySlug(slug);

    if (!brand) {
      throw new AppError(404, "Brand not found");
    }

    return brand;
  }

  /**
   * Create a new brand
   *
   * Validates slug uniqueness before creating.
   *
   * @param data - Brand information (name, slug, logo, etc.)
   * @returns Created brand with generated ID
   * @throws {AppError} 409 if slug already exists
   */
  async createBrand(data: CreateBrandData): Promise<Brand> {
    // Validate slug uniqueness
    const existing = await this.repository.findBySlug(data.slug);
    if (existing) {
      throw new AppError(409, "Brand with this slug already exists");
    }

    return this.repository.create(data);
  }

  /**
   * Update an existing brand
   *
   * Validates slug uniqueness if slug is being changed.
   *
   * @param id - Brand UUID
   * @param data - Fields to update (partial data allowed)
   * @returns Updated brand
   * @throws {AppError} 404 if brand not found
   * @throws {AppError} 409 if new slug already exists
   */
  async updateBrand(
    id: string,
    data: Partial<CreateBrandData>,
  ): Promise<Brand> {
    // Verify brand exists
    await this.getBrandById(id);

    // Validate slug uniqueness if being changed
    if (data.slug) {
      const existing = await this.repository.findBySlug(data.slug);
      // Ensure the slug isn't taken by another brand (exclude current)
      if (existing && existing.id !== id) {
        throw new AppError(409, "Brand with this slug already exists");
      }
    }

    return this.repository.update(id, data);
  }

  /**
   * Delete a brand
   *
   * Warning: Check if products reference this brand first.
   * Database constraints may prevent deletion if products exist.
   *
   * @param id - Brand UUID
   * @throws {AppError} 404 if brand not found
   */
  async deleteBrand(id: string): Promise<void> {
    // Verify brand exists before deletion
    await this.getBrandById(id);
    await this.repository.delete(id);
  }
}
