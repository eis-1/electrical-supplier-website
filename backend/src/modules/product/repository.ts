import { prisma } from '../../config/db';
import { Product, Prisma } from '@prisma/client';

export interface ProductWithRelations extends Product {
  category?: any;
  brand?: any;
  specs?: any[];
}

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

export class ProductRepository {
  async findAll(
    filters: ProductFilters,
    page: number = 1,
    limit: number = 12
  ): Promise<{ items: ProductWithRelations[]; total: number; page: number; limit: number }> {
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
        orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
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
          orderBy: { displayOrder: 'asc' },
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
          orderBy: { displayOrder: 'asc' },
        },
      },
    });
  }

  async create(data: CreateProductData): Promise<Product> {
    const { specs, ...productData } = data;

    return prisma.product.create({
      data: {
        ...productData,
        ...(specs && specs.length > 0 && {
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
        ...(specs && specs.length > 0 && {
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
