/**
 * QuoteService (archived reference)
 *
 * This file is preserved as an internal reference copy of a prior iteration.
 * It is intentionally stored under docs/ so it is excluded from compilation and runtime.
 */

import { QuoteRepository } from "./repository";
import { AppError } from "../../middlewares/error.middleware";
import { emailService } from "../../utils/email.service";
import { QuoteRequest } from "@prisma/client";
import { env } from "../../config/env";
import { logger } from "../../utils/logger";

interface QuoteCreationData {
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

interface QuoteUpdateData {
  status?: string;
  notes?: string;
}

interface QuoteQueryFilters {
  status?: string;
}

export class QuoteService {
  private repository: QuoteRepository;

  constructor() {
    this.repository = new QuoteRepository();
  }

  async getAllQuotes(
    filters: QuoteQueryFilters,
    page: number = 1,
    limit: number = 20,
    sortBy: string = "createdAt",
    order: "asc" | "desc" = "desc"
  ) {
    return this.repository.findAll(filters, page, limit, sortBy, order);
  }

  async getQuoteById(id: string): Promise<QuoteRequest> {
    const quote = await this.repository.findById(id);

    if (!quote) {
      throw new AppError(404, "Quote request not found");
    }

    return quote;
  }

  async createQuote(data: QuoteCreationData): Promise<QuoteRequest> {
    if (data.email) {
      const currentTime = new Date();

      const startOfToday = new Date(
        currentTime.getFullYear(),
        currentTime.getMonth(),
        currentTime.getDate(),
        0, 0, 0, 0
      );

      const quotesTodayCount = await this.repository.countByEmailSince({
        email: data.email,
        since: startOfToday,
      });

      const dailyLimit = env.QUOTE_MAX_PER_EMAIL_PER_DAY;

      if (quotesTodayCount >= dailyLimit) {
        logger.security({
          type: "quote",
          action: "spam_blocked_daily_limit",
          ip: data.ipAddress,
          details: {
            email: data.email,
            count: quotesTodayCount,
            limit: dailyLimit,
          },
        });

        throw new AppError(
          429,
          "Too many quote submissions. Please try again later."
        );
      }
    }

    if (data.email && data.phone) {
      const duplicateWindowMs = env.QUOTE_DEDUP_WINDOW_MS;
      const duplicateThreshold = new Date(Date.now() - duplicateWindowMs);

      const recentDuplicate = await this.repository.findRecentDuplicate({
        email: data.email,
        phone: data.phone,
        since: duplicateThreshold,
      });

      if (recentDuplicate) {
        logger.security({
          type: "quote",
          action: "spam_blocked_duplicate",
          ip: data.ipAddress,
          details: {
            email: data.email,
          },
        });

        throw new AppError(
          429,
          "We already received your request. Please wait for our response."
        );
      }
    }

    try {
      const createdQuote = await this.repository.create(data);

      const dateString = new Date()
        .toISOString()
        .split("T")[0]
        .replace(/-/g, "");

      const shortId = createdQuote.id.substring(0, 6).toUpperCase();
      const referenceNumber = `QR-${dateString}-${shortId}`;

      try {
        await emailService.sendQuoteNotification({
          referenceNumber,
          name: createdQuote.name,
          company: createdQuote.company || undefined,
          phone: createdQuote.phone,
          email: createdQuote.email,
          productName: createdQuote.productName || undefined,
          quantity: createdQuote.quantity || undefined,
          projectDetails: createdQuote.projectDetails || undefined,
        });

        await emailService.sendQuoteConfirmation(createdQuote.email, referenceNumber);

        logger.info("Quote notification emails sent successfully", {
          quoteId: createdQuote.id,
          referenceNumber,
        });
      } catch (emailError) {
        logger.error(
          "Failed to send quote notification email",
          emailError as Error,
          {
            quoteId: createdQuote.id,
            email: data.email,
          }
        );
      }

      return createdQuote;
    } catch (databaseError: any) {
      if (databaseError.code === "P2002") {
        logger.security({
          type: "quote",
          action: "spam_blocked_duplicate_db_constraint",
          ip: data.ipAddress,
          details: {
            email: data.email,
            constraintViolation: databaseError.meta?.target,
          },
        });

        throw new AppError(
          429,
          "We already received your request today. Please wait for our response."
        );
      }

      throw databaseError;
    }
  }

  async updateQuote(id: string, data: QuoteUpdateData): Promise<QuoteRequest> {
    await this.getQuoteById(id);
    return this.repository.update(id, data);
  }

  async deleteQuote(id: string): Promise<void> {
    await this.getQuoteById(id);
    await this.repository.delete(id);
  }
}
