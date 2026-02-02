import { prisma } from "../../config/db";
import { QuoteRequest } from "@prisma/client";

/**
 * Quote creation data structure
 * Captures customer details, product inquiry, and security metadata
 */
interface CreateQuoteData {
  name: string;           // Customer name
  company?: string;       // Optional company name
  phone: string;          // Contact phone number
  whatsapp?: string;      // Optional WhatsApp number
  email: string;          // Contact email
  productName?: string;   // Product of interest
  quantity?: string;      // Desired quantity
  projectDetails?: string; // Additional project information
  ipAddress?: string;     // Client IP for spam detection
  userAgent?: string;     // Browser info for spam detection
}

/**
 * Quote update data structure
 * Fields admin can modify when processing quote
 */
interface UpdateQuoteData {
  status?: string;  // Quote status (new, contacted, closed)
  notes?: string;   // Admin notes for internal tracking
}

/**
 * Quote filtering options for admin list view
 */
interface QuoteFilters {
  status?: string;  // Filter by status value
}

/**
 * Quote Repository
 *
 * Database access layer for quote request operations.
 * Handles spam detection queries and admin management functions.
 *
 * **Spam Detection Queries:**
 * - findRecentDuplicate: Checks for duplicate submissions from same email+phone
 * - countByEmailSince: Counts submissions from email within timeframe
 *
 * **Admin Features:**
 * - Status filtering (new, contacted, closed)
 * - Sorting by any field (default: createdAt desc)
 * - Pagination for large quote lists
 *
 * **Security Metadata:**
 * - Stores ipAddress and userAgent for abuse tracking
 * - Enables rate limit bypass analysis
 * - Helps identify bot patterns
 */
export class QuoteRepository {
  async findRecentDuplicate(params: {
    email: string;
    phone: string;
    since: Date;
  }): Promise<QuoteRequest | null> {
    const { email, phone, since } = params;

    return prisma.quoteRequest.findFirst({
      where: {
        email,
        phone,
        createdAt: { gte: since },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async countByEmailSince(params: {
    email: string;
    since: Date;
  }): Promise<number> {
    const { email, since } = params;
    return prisma.quoteRequest.count({
      where: {
        email,
        createdAt: { gte: since },
      },
    });
  }

  async findAll(
    filters: QuoteFilters,
    page: number = 1,
    limit: number = 20,
    sortBy: string = "createdAt",
    order: "asc" | "desc" = "desc",
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
    // Add createdDay field for database-level duplicate prevention
    const now = new Date();
    const createdDay = now.toISOString().split("T")[0]; // Format: YYYY-MM-DD

    return prisma.quoteRequest.create({
      data: {
        ...data,
        createdDay,
      },
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
