import { CategoryRepository } from "./repository";
import { Category } from "@prisma/client";
import { AppError } from "../../middlewares/error.middleware";

/**
 * Data structure for creating a new product category
 * Contains category information and display settings
 */
interface CreateCategoryData {
  name: string;
  slug: string;
  icon?: string;
  description?: string;
  displayOrder?: number;
}

/**
 * CategoryService - Business logic for product category management
 *
 * Handles all category-related operations including:
 * - CRUD operations for categories
 * - Slug uniqueness validation
 * - Active/inactive category filtering
 * - Display order management
 *
 * Categories are used to:
 * - Organize products into logical groups
 * - Enable category-based filtering and navigation
 * - Display category icons in the UI
 * - Control product display order
 *
 * Examples of categories: Circuit Breakers, Contactors, Cables, etc.
 */
export class CategoryService {
  private repository: CategoryRepository;

  /**
   * Initialize the service with a repository instance
   */
  constructor() {
    this.repository = new CategoryRepository();
  }

  /**
   * Retrieve all product categories
   *
   * By default, returns only active categories.
   * Can optionally include inactive categories for admin views.
   *
   * @param includeInactive - Include inactive categories, default: false
   * @returns Array of categories sorted by displayOrder
   *
   * @example
   * // Get active categories for public display
   * const categories = await service.getAllCategories();
   *
   * // Get all categories including inactive (admin view)
   * const allCategories = await service.getAllCategories(true);
   */
  async getAllCategories(
    includeInactive: boolean = false,
  ): Promise<Category[]> {
    return this.repository.findAll(includeInactive);
  }

  /**
   * Retrieve a single category by ID
   *
   * @param id - Category UUID
   * @returns Category data
   * @throws {AppError} 404 if category not found
   *
   * @example
   * const category = await service.getCategoryById('123e4567-e89b-12d3-a456-426614174000');
   */
  async getCategoryById(id: string): Promise<Category> {
    const category = await this.repository.findById(id);

    if (!category) {
      throw new AppError(404, "Category not found");
    }

    return category;
  }

  /**
   * Retrieve a single category by URL slug
   *
   * Used for category pages with SEO-friendly URLs
   *
   * @param slug - URL-friendly category identifier
   * @returns Category data
   * @throws {AppError} 404 if category not found
   *
   * @example
   * const category = await service.getCategoryBySlug('circuit-breakers');
   */
  async getCategoryBySlug(slug: string): Promise<Category> {
    const category = await this.repository.findBySlug(slug);

    if (!category) {
      throw new AppError(404, "Category not found");
    }

    return category;
  }

  /**
   * Create a new product category
   *
   * Validates that the slug is unique before creating.
   * Slug must be manually provided (no auto-generation).
   *
   * @param data - Category information (name, slug, icon, etc.)
   * @returns Created category with generated ID
   * @throws {AppError} 409 if slug already exists
   *
   * @example
   * const category = await service.createCategory({
   *   name: 'Circuit Breakers',
   *   slug: 'circuit-breakers',
   *   icon: 'breaker-icon.svg',
   *   description: 'Electrical circuit protection devices',
   *   displayOrder: 1
   * });
   */
  async createCategory(data: CreateCategoryData): Promise<Category> {
    // Validate slug uniqueness
    const existing = await this.repository.findBySlug(data.slug);
    if (existing) {
      throw new AppError(409, "Category with this slug already exists");
    }

    return this.repository.create(data);
  }

  /**
   * Update an existing category
   *
   * Allows partial updates to any category field.
   * Validates slug uniqueness if slug is being changed.
   *
   * @param id - Category UUID
   * @param data - Fields to update (partial data allowed)
   * @returns Updated category
   * @throws {AppError} 404 if category not found
   * @throws {AppError} 409 if new slug already exists
   *
   * @example
   * const updated = await service.updateCategory(id, {
   *   name: 'Updated Category Name',
   *   displayOrder: 5
   * });
   */
  async updateCategory(
    id: string,
    data: Partial<CreateCategoryData>,
  ): Promise<Category> {
    // Verify category exists
    await this.getCategoryById(id);

    // Validate slug uniqueness if being changed
    if (data.slug) {
      const existing = await this.repository.findBySlug(data.slug);
      // Ensure the slug isn't taken by another category (exclude current)
      if (existing && existing.id !== id) {
        throw new AppError(409, "Category with this slug already exists");
      }
    }

    return this.repository.update(id, data);
  }

  /**
   * Delete a category
   *
   * Warning: Check if products are assigned to this category first.
   * Database constraints may prevent deletion if products exist.
   *
   * @param id - Category UUID
   * @throws {AppError} 404 if category not found
   * @throws May throw database constraint error if products reference this category
   *
   * @example
   * await service.deleteCategory('123e4567-e89b-12d3-a456-426614174000');
   */
  async deleteCategory(id: string): Promise<void> {
    // Verify category exists before deletion
    await this.getCategoryById(id);
    await this.repository.delete(id);
  }
}
