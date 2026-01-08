import { prisma } from '../../config/db';
import { Brand } from '@prisma/client';

interface CreateBrandData {
  name: string;
  slug: string;
  logo?: string;
  description?: string;
  website?: string;
  isAuthorized?: boolean;
  displayOrder?: number;
}

export class BrandRepository {
  async findAll(includeInactive: boolean = false): Promise<Brand[]> {
    return prisma.brand.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async findById(id: string): Promise<Brand | null> {
    return prisma.brand.findUnique({
      where: { id },
    });
  }

  async findBySlug(slug: string): Promise<Brand | null> {
    return prisma.brand.findUnique({
      where: { slug },
    });
  }

  async create(data: CreateBrandData): Promise<Brand> {
    return prisma.brand.create({
      data,
    });
  }

  async update(id: string, data: Partial<CreateBrandData>): Promise<Brand> {
    return prisma.brand.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<Brand> {
    return prisma.brand.delete({
      where: { id },
    });
  }
}
