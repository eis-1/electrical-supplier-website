import { prisma } from '../../config/db';
import { Category } from '@prisma/client';

interface CreateCategoryData {
  name: string;
  slug: string;
  icon?: string;
  description?: string;
  displayOrder?: number;
}

export class CategoryRepository {
  async findAll(includeInactive: boolean = false): Promise<Category[]> {
    return prisma.category.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
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

  async update(id: string, data: Partial<CreateCategoryData>): Promise<Category> {
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
