import { prisma } from "../../config/db";
import { Category } from "@prisma/client";

/**
 * Category creation/update data structure
 */
interface CreateCategoryData {
  name: string;          // Category display name
  slug: string;          // URL-safe identifier
  icon?: string;         // Icon identifier for UI
  description?: string;  // Optional description text
  displayOrder?: number; // Sort order (lower = higher in list)
}

/**
 * Category Repository
 *
 * Database access layer for category operations.
 * Manages product categories with slug-based lookups and display ordering.
 *
 * **Ordering Strategy:**
 * - Primary: displayOrder (ascending) - admin-controlled
 * - Secondary: name (alphabetical) - for same displayOrder values
 *
 * **Active/Inactive Filtering:**
 * - By default, only returns isActive = true categories
 * - includeInactive flag allows admin panels to show all
 *
 * **Use Cases:**
 * - Public website: Load active categories only
 * - Admin panel: Load all categories with isActive filtering
 * - Product filtering: Lookup by slug for URL routes
 */
export class CategoryRepository {
  async findAll(includeInactive: boolean = false): Promise<Category[]> {
    return prisma.category.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    });
  }

  async findById(id: string): Promise<Category | null> {
    return prisma.category.findUnique({
      where: { id },
    });
  }

  async findBySlug(slug: string): Promise<Category | null> {
    return prisma.category.findUnique({
      where: { slug },
    });
  }

  async create(data: CreateCategoryData): Promise<Category> {
    return prisma.category.create({
      data,
    });
  }

  async update(
    id: string,
    data: Partial<CreateCategoryData>,
  ): Promise<Category> {
    return prisma.category.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<Category> {
    return prisma.category.delete({
      where: { id },
    });
  }
}
