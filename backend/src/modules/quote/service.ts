import { QuoteRepository } from './repository';
import { AppError } from '../../middlewares/error.middleware';
import { emailService } from '../../utils/email.service';
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

export class QuoteService {
  private repository: QuoteRepository;

  constructor() {
    this.repository = new QuoteRepository();
  }

  async getAllQuotes(
    filters: QuoteFilters,
    page: number = 1,
    limit: number = 20,
    sortBy: string = 'createdAt',
    order: 'asc' | 'desc' = 'desc'
  ) {
    return this.repository.findAll(filters, page, limit, sortBy, order);
  }

  async getQuoteById(id: string): Promise<QuoteRequest> {
    const quote = await this.repository.findById(id);

    if (!quote) {
      throw new AppError(404, 'Quote request not found');
    }

    return quote;
  }

  async createQuote(data: CreateQuoteData): Promise<QuoteRequest> {
    const quote = await this.repository.create(data);

    // Generate reference number from ID
    const referenceNumber = `QR-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${quote.id.substring(0, 6).toUpperCase()}`;

    // Send email notifications
    try {
      await emailService.sendQuoteNotification({
        referenceNumber,
        name: quote.name,
        company: quote.company || undefined,
        phone: quote.phone,
        email: quote.email,
        productName: quote.productName || undefined,
        quantity: quote.quantity || undefined,
        projectDetails: quote.projectDetails || undefined,
      });

      await emailService.sendQuoteConfirmation(quote.email, referenceNumber);
    } catch (error) {
      console.error('Failed to send email notifications:', error);
      // Don't fail the request if email fails
    }

    return quote;
  }

  async updateQuote(id: string, data: UpdateQuoteData): Promise<QuoteRequest> {
    await this.getQuoteById(id);
    return this.repository.update(id, data);
  }

  async deleteQuote(id: string): Promise<void> {
    await this.getQuoteById(id);
    await this.repository.delete(id);
  }
}
