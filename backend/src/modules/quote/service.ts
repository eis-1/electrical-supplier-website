import { QuoteRepository } from "./repository";
import { AppError } from "../../middlewares/error.middleware";
import { emailService } from "../../utils/email.service";
import { QuoteRequest } from "@prisma/client";
import { env } from "../../config/env";
import { logger } from "../../utils/logger";

/**
 * Data structure for creating a new quote request
 * Contains customer information and optional project details
 */
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

/**
 * Data structure for updating an existing quote
 * Only status and internal notes can be updated
 */
interface UpdateQuoteData {
  status?: string;
  notes?: string;
}

/**
 * Filter options for querying quotes
 * Currently supports filtering by status
 */
interface QuoteFilters {
  status?: string;
}

/**
 * QuoteService - Business logic for quote request management
 *
 * Handles all quote-related operations including:
 * - Creating new quote requests with anti-spam protection
 * - Retrieving quotes with pagination and filtering
 * - Updating quote status and notes
 * - Sending email notifications
 *
 * Security Features:
 * - Daily email limit (5 quotes per email per day)
 * - Duplicate detection (10-minute window)
 * - Security event logging for all spam attempts
 */
export class QuoteService {
  private repository: QuoteRepository;

  /**
   * Initialize the service with a repository instance
   */
  constructor() {
    this.repository = new QuoteRepository();
  }

  /**
   * Retrieve all quote requests with pagination and filtering
   *
   * @param filters - Filter criteria (status, etc.)
   * @param page - Page number (1-based index), default: 1
   * @param limit - Items per page, default: 20
   * @param sortBy - Field to sort by, default: "createdAt"
   * @param order - Sort direction (asc/desc), default: "desc"
   * @returns Paginated list of quotes with total count
   *
   * @example
   * const quotes = await service.getAllQuotes({ status: 'pending' }, 1, 20);
   */
  async getAllQuotes(
    filters: QuoteFilters,
    page: number = 1,
    limit: number = 20,
    sortBy: string = "createdAt",
    order: "asc" | "desc" = "desc",
  ) {
    return this.repository.findAll(filters, page, limit, sortBy, order);
  }

  /**
   * Retrieve a single quote request by ID
   *
   * @param id - Quote request UUID
   * @returns Quote request data
   * @throws {AppError} 404 if quote not found
   *
   * @example
   * const quote = await service.getQuoteById('123e4567-e89b-12d3-a456-426614174000');
   */
  async getQuoteById(id: string): Promise<QuoteRequest> {
    const quote = await this.repository.findById(id);

    if (!quote) {
      throw new AppError(404, "Quote request not found");
    }

    return quote;
  }

  /**
   * Create a new quote request with comprehensive anti-spam protection
   *
   * Security Layers (5-layer defense system):
   * 1. Rate limiting - Handled by middleware (5 requests/hour per IP)
   * 2. Honeypot detection - Handled by middleware
   * 3. Timing analysis - Handled by middleware (1.5s-1hour window)
   * 4. Daily email limit - Checked here (5 quotes per email per day)
   * 5. Duplicate detection - Checked here (same email+phone within 10 minutes)
   *
   * After successful creation:
   * - Generates unique reference number (QR-YYYYMMDD-XXXXXX)
   * - Sends notification email to admin
   * - Sends confirmation email to customer
   *
   * @param data - Quote request data with customer information
   * @returns Created quote request with generated ID
   * @throws {AppError} 429 if daily limit exceeded or duplicate detected
   *
   * @example
   * const quote = await service.createQuote({
   *   name: 'John Doe',
   *   email: 'john@example.com',
   *   phone: '+1234567890',
   *   productName: 'Circuit Breaker',
   *   quantity: '100',
   *   ipAddress: '192.168.1.1'
   * });
   */
  async createQuote(data: CreateQuoteData): Promise<QuoteRequest> {
    // SECURITY LAYER 4: Daily email limit check
    // Prevents spam by limiting quotes from same email address
    // Default: 5 quotes per email per day
    if (data.email) {
      const now = new Date();
      // Calculate start of current day (00:00:00)
      const startOfDay = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
      );
      // Count quotes from this email since start of day
      const countToday = await this.repository.countByEmailSince({
        email: data.email,
        since: startOfDay,
      });

      // Reject if daily limit reached (configurable via QUOTE_MAX_PER_EMAIL_PER_DAY)
      if (countToday >= env.QUOTE_MAX_PER_EMAIL_PER_DAY) {
        throw new AppError(
          429,
          "Too many quote submissions. Please try again later.",
        );
      }
    }

    // SECURITY LAYER 5: Duplicate detection
    // Prevents accidental double-clicks and rapid resubmissions
    // Default: 10-minute window
    if (data.email && data.phone) {
      // Calculate time threshold for duplicate detection
      const since = new Date(Date.now() - env.QUOTE_DEDUP_WINDOW_MS);
      // Check if same email+phone combination exists in recent submissions
      const recent = await this.repository.findRecentDuplicate({
        email: data.email,
        phone: data.phone,
        since,
      });
      if (recent) {
        // Log security event for monitoring
        logger.security({
          type: "quote",
          action: "spam_blocked_duplicate",
          ip: data.ipAddress,
          details: { email: data.email },
        });
        throw new AppError(
          429,
          "We already received your request. Please wait for our response.",
        );
      }
    }

    // Create the quote record in database
    const quote = await this.repository.create(data);

    // Generate human-readable reference number
    // Format: QR-YYYYMMDD-XXXXXX (e.g., QR-20260203-A1B2C3)
    const referenceNumber = `QR-${new Date().toISOString().split("T")[0].replace(/-/g, "")}-${quote.id.substring(0, 6).toUpperCase()}`;

    // Send email notifications (non-blocking - don't fail request if email fails)
    try {
      // 1. Notify admin about new quote request
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

      // 2. Send confirmation to customer with reference number
      await emailService.sendQuoteConfirmation(quote.email, referenceNumber);
    } catch (error) {
      // Log email failure but don't block the quote creation
      logger.error("Failed to send quote notification email", error as Error, {
        quoteId: quote.id,
        email: data.email,
        referenceNumber,
      });
      // Continue - quote is saved, email can be retried manually
    }

    return quote;
  }

  /**
   * Update an existing quote request
   *
   * Typically used by admin to:
   * - Change status (pending -> contacted -> completed)
   * - Add internal notes for tracking
   *
   * @param id - Quote request UUID
   * @param data - Fields to update (status, notes)
   * @returns Updated quote request
   * @throws {AppError} 404 if quote not found
   *
   * @example
   * const updated = await service.updateQuote(id, {
   *   status: 'contacted',
   *   notes: 'Called customer, will send proposal tomorrow'
   * });
   */
  async updateQuote(id: string, data: UpdateQuoteData): Promise<QuoteRequest> {
    // Verify quote exists before updating
    await this.getQuoteById(id);
    return this.repository.update(id, data);
  }

  /**
   * Delete a quote request (soft or hard delete depending on repository implementation)
   *
   * @param id - Quote request UUID
   * @throws {AppError} 404 if quote not found
   *
   * @example
   * await service.deleteQuote('123e4567-e89b-12d3-a456-426614174000');
   */
  async deleteQuote(id: string): Promise<void> {
    // Verify quote exists before deleting
    await this.getQuoteById(id);
    await this.repository.delete(id);
  }
}
