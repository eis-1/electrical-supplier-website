import { prisma } from '../../config/db';
import { QuoteRequest } from '@prisma/client';

interface CreateQuoteData {
  name: string;
  company?: string;
  phone: string;
  whatsapp?: string;
  email: string;
  productName?: string;
  quantity?: string;
  projectDetails?: string;
  ipAddress?: string;
  userAgent?: string;
}

interface UpdateQuoteData {
  status?: string;
  notes?: string;
}

interface QuoteFilters {
  status?: string;
}

export class QuoteRepository {
  async findAll(
    filters: QuoteFilters,
    page: number = 1,
    limit: number = 20,
    sortBy: string = 'createdAt',
    order: 'asc' | 'desc' = 'desc'
  ): Promise<{ quotes: QuoteRequest[]; total: number }> {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (filters.status) {
      where.status = filters.status;
    }

    const [quotes, total] = await Promise.all([
      prisma.quoteRequest.findMany({
        where,
        orderBy: { [sortBy]: order },
        skip,
        take: limit,
      }),
      prisma.quoteRequest.count({ where }),
    ]);

    return { quotes, total };
  }

  async findById(id: string): Promise<QuoteRequest | null> {
    return prisma.quoteRequest.findUnique({
      where: { id },
    });
  }

  async create(data: CreateQuoteData): Promise<QuoteRequest> {
    return prisma.quoteRequest.create({
      data,
    });
  }

  async update(id: string, data: UpdateQuoteData): Promise<QuoteRequest> {
    return prisma.quoteRequest.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<QuoteRequest> {
    return prisma.quoteRequest.delete({
      where: { id },
    });
  }
}
