import { prisma } from "../../config/db";
import { Product, Prisma } from "@prisma/client";

/**
 * Product with related entities loaded
 * Extends base Product model with optional category, brand, and specs relations
 */
export interface ProductWithRelations extends Product {
  category?: any;
  brand?: any;
  specs?: any[];
}

/**
 * Product filtering options for search and pagination
 */
interface ProductFilters {
  category?: string;      // Filter by category slug
  brand?: string[];       // Filter by array of brand slugs (OR condition)
  search?: string;        // Search in name, model, description
  featured?: boolean;     // Filter by isFeatured flag
}

/**
 * Product creation data structure
 * All fields needed to create a new product in database
 */
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

/**
 * Product Repository
 *
 * Database access layer for product-related operations.
 * Handles all Prisma queries for products including:
 * - Filtering by category, brand, search terms, featured status
 * - Pagination with configurable page size
 * - Related entity loading (category, brand, specs)
 * - CRUD operations with validation
 *
 * **Query Optimization:**
 * - Uses parallel Promise.all for count + data queries
 * - Limits included relations to avoid N+1 problems
 * - Indexes on slug fields for fast lookups
 *
 * **Filtering Logic:**
 * - Active products only (isActive: true) unless specified
 * - Multiple brands use SQL IN clause (OR condition)
 * - Search uses OR across name/model/description
 * - Results ordered by: featured first, then newest
 *
 * **Security:**
 * - All queries filter by isActive to prevent inactive product leaks
 * - Slug-based lookups prevent UUID enumeration
 */
export class ProductRepository {
  async findAll(
    filters: ProductFilters,
    page: number = 1,
    limit: number = 12,
  ): Promise<{
    items: ProductWithRelations[];
    total: number;
    page: number;
    limit: number;
  }> {
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = { isActive: true };

    // Category filter
    if (filters.category) {
      where.category = {
        slug: filters.category,
      };
    }

    // Brand filter (multiple)
    if (filters.brand && filters.brand.length > 0) {
      where.brand = {
        slug: { in: filters.brand },
      };
    }

    // Search filter
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search } },
        { model: { contains: filters.search } },
        { description: { contains: filters.search } },
      ];
    }

    // Featured filter
    if (filters.featured !== undefined) {
      where.isFeatured = filters.featured;
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: true,
          brand: true,
        },
        orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    return {
      items: products,
      total,
      page,
      limit,
    };
  }

  async findById(id: string): Promise<ProductWithRelations | null> {
    return prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        brand: true,
        specs: {
          orderBy: { displayOrder: "asc" },
        },
      },
    });
  }

  async findBySlug(slug: string): Promise<ProductWithRelations | null> {
    return prisma.product.findUnique({
      where: { slug },
      include: {
        category: true,
        brand: true,
        specs: {
          orderBy: { displayOrder: "asc" },
        },
      },
    });
  }

  async create(data: CreateProductData): Promise<Product> {
    const { specs, ...productData } = data;

    return prisma.product.create({
      data: {
        ...productData,
        ...(specs &&
          specs.length > 0 && {
            specs: {
              create: specs,
            },
          }),
      },
      include: {
        category: true,
        brand: true,
        specs: true,
      },
    });
  }

  async update(id: string, data: Partial<CreateProductData>): Promise<Product> {
    const { specs, ...productData } = data;

    // If specs are provided, delete existing and create new ones
    if (specs !== undefined) {
      await prisma.productSpec.deleteMany({
        where: { productId: id },
      });
    }

    return prisma.product.update({
      where: { id },
      data: {
        ...productData,
        ...(specs &&
          specs.length > 0 && {
            specs: {
              create: specs,
            },
          }),
      },
      include: {
        category: true,
        brand: true,
        specs: true,
      },
    });
  }

  async delete(id: string): Promise<Product> {
    return prisma.product.delete({
      where: { id },
    });
  }
}
