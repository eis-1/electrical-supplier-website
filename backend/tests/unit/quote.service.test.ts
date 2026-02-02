import { QuoteService } from "../../src/modules/quote/service";
import { QuoteRepository } from "../../src/modules/quote/repository";
import { AppError } from "../../src/middlewares/error.middleware";
import { emailService } from "../../src/utils/email.service";
import { logger } from "../../src/utils/logger";

// Mock dependencies
jest.mock("../../src/modules/quote/repository");
jest.mock("../../src/utils/email.service");
jest.mock("../../src/utils/logger");
jest.mock("../../src/config/env", () => ({
  env: {
    QUOTE_MAX_PER_EMAIL_PER_DAY: 5,
    QUOTE_DEDUP_WINDOW_MS: 300000, // 5 minutes
  },
}));

describe("QuoteService", () => {
  let service: QuoteService;
  let mockRepository: jest.Mocked<QuoteRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRepository = new QuoteRepository() as jest.Mocked<QuoteRepository>;
    service = new QuoteService();
    (service as any).repository = mockRepository;
  });

  describe("getAllQuotes", () => {
    it("should return paginated quotes with default parameters", async () => {
      const mockResult: any = {
        quotes: [
          {
            id: "1",
            name: "John Doe",
            email: "john@example.com",
            phone: "+1234567890",
            status: "pending",
            createdAt: new Date(),
          },
          {
            id: "2",
            name: "Jane Smith",
            email: "jane@example.com",
            phone: "+0987654321",
            status: "contacted",
            createdAt: new Date(),
          },
        ],
        total: 2,
      };

      mockRepository.findAll.mockResolvedValue(mockResult);

      const result = await service.getAllQuotes({}, 1, 20, "createdAt", "desc");

      expect(mockRepository.findAll).toHaveBeenCalledWith(
        {},
        1,
        20,
        "createdAt",
        "desc",
      );
      expect(result).toEqual(mockResult);
      expect(result.quotes).toHaveLength(2);
    });

    it("should filter quotes by status", async () => {
      const mockResult: any = {
        quotes: [
          {
            id: "1",
            name: "John Doe",
            email: "john@example.com",
            phone: "+1234567890",
            status: "pending",
            createdAt: new Date(),
          },
        ],
        total: 1,
      };

      mockRepository.findAll.mockResolvedValue(mockResult);

      const result = await service.getAllQuotes(
        { status: "pending" },
        1,
        20,
        "createdAt",
        "desc",
      );

      expect(mockRepository.findAll).toHaveBeenCalledWith(
        { status: "pending" },
        1,
        20,
        "createdAt",
        "desc",
      );
      expect(result.quotes[0].status).toBe("pending");
    });

    it("should handle custom pagination", async () => {
      const mockResult: any = {
        quotes: [],
        total: 50,
      };

      mockRepository.findAll.mockResolvedValue(mockResult);

      const result = await service.getAllQuotes({}, 2, 10, "createdAt", "asc");

      expect(mockRepository.findAll).toHaveBeenCalledWith(
        {},
        2,
        10,
        "createdAt",
        "asc",
      );
      expect(result.total).toBe(50);
    });

    it("should handle empty results", async () => {
      const mockResult: any = {
        quotes: [],
        total: 0,
      };

      mockRepository.findAll.mockResolvedValue(mockResult);

      const result = await service.getAllQuotes({}, 1, 20, "createdAt", "desc");

      expect(result.quotes).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe("getQuoteById", () => {
    it("should return quote when found", async () => {
      const mockQuote: any = {
        id: "123",
        name: "John Doe",
        email: "john@example.com",
        phone: "+1234567890",
        status: "pending",
        createdAt: new Date(),
      };

      mockRepository.findById.mockResolvedValue(mockQuote);

      const result = await service.getQuoteById("123");

      expect(mockRepository.findById).toHaveBeenCalledWith("123");
      expect(result).toEqual(mockQuote);
    });

    it("should throw 404 error when quote not found", async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.getQuoteById("nonexistent")).rejects.toThrow(
        AppError,
      );
      await expect(service.getQuoteById("nonexistent")).rejects.toThrow(
        "Quote request not found",
      );

      try {
        await service.getQuoteById("nonexistent");
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).statusCode).toBe(404);
      }
    });
  });

  describe("createQuote", () => {
    const validQuoteData = {
      name: "John Doe",
      company: "ACME Corp",
      phone: "+1234567890",
      whatsapp: "+1234567890",
      email: "john@example.com",
      productName: "Industrial Switch",
      quantity: "100",
      projectDetails: "Need for warehouse project",
      ipAddress: "192.168.1.1",
      userAgent: "Mozilla/5.0",
    };

    it("should create quote successfully with all fields", async () => {
      const mockCreatedQuote: any = {
        id: "abc123",
        ...validQuoteData,
        status: "pending",
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.countByEmailSince.mockResolvedValue(0);
      mockRepository.findRecentDuplicate.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue(mockCreatedQuote);
      (emailService.sendQuoteNotification as jest.Mock).mockResolvedValue(
        undefined,
      );
      (emailService.sendQuoteConfirmation as jest.Mock).mockResolvedValue(
        undefined,
      );

      const result = await service.createQuote(validQuoteData);

      expect(mockRepository.countByEmailSince).toHaveBeenCalled();
      expect(mockRepository.findRecentDuplicate).toHaveBeenCalled();
      expect(mockRepository.create).toHaveBeenCalledWith(validQuoteData);
      expect(emailService.sendQuoteNotification).toHaveBeenCalled();
      expect(emailService.sendQuoteConfirmation).toHaveBeenCalledWith(
        validQuoteData.email,
        expect.stringContaining("QR-"),
      );
      expect(result).toEqual(mockCreatedQuote);
    });

    it("should create quote with only required fields", async () => {
      const minimalQuoteData = {
        name: "John Doe",
        phone: "+1234567890",
        email: "john@example.com",
      };

      const mockCreatedQuote: any = {
        id: "abc123",
        ...minimalQuoteData,
        company: null,
        whatsapp: null,
        productName: null,
        quantity: null,
        projectDetails: null,
        ipAddress: null,
        userAgent: null,
        status: "pending",
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.countByEmailSince.mockResolvedValue(0);
      mockRepository.findRecentDuplicate.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue(mockCreatedQuote);
      (emailService.sendQuoteNotification as jest.Mock).mockResolvedValue(
        undefined,
      );
      (emailService.sendQuoteConfirmation as jest.Mock).mockResolvedValue(
        undefined,
      );

      const result = await service.createQuote(minimalQuoteData);

      expect(result.name).toBe("John Doe");
      expect(result.email).toBe("john@example.com");
    });

    it("should throw 429 error if email exceeds daily limit", async () => {
      mockRepository.countByEmailSince.mockResolvedValue(5); // At limit

      await expect(service.createQuote(validQuoteData)).rejects.toThrow(
        AppError,
      );
      await expect(service.createQuote(validQuoteData)).rejects.toThrow(
        "Too many quote submissions",
      );

      try {
        await service.createQuote(validQuoteData);
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).statusCode).toBe(429);
      }

      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it("should throw 429 error for duplicate rapid submissions", async () => {
      const recentDuplicate: any = {
        id: "recent123",
        email: validQuoteData.email,
        phone: validQuoteData.phone,
        createdAt: new Date(),
      };

      mockRepository.countByEmailSince.mockResolvedValue(0);
      mockRepository.findRecentDuplicate.mockResolvedValue(recentDuplicate);

      await expect(service.createQuote(validQuoteData)).rejects.toThrow(
        AppError,
      );
      await expect(service.createQuote(validQuoteData)).rejects.toThrow(
        "We already received your request",
      );

      try {
        await service.createQuote(validQuoteData);
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).statusCode).toBe(429);
      }

      expect(logger.security).toHaveBeenCalledWith({
        type: "quote",
        action: "spam_blocked_duplicate",
        ip: validQuoteData.ipAddress,
        details: { email: validQuoteData.email },
      });
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it("should continue even if email notification fails", async () => {
      const mockCreatedQuote: any = {
        id: "abc123",
        ...validQuoteData,
        status: "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.countByEmailSince.mockResolvedValue(0);
      mockRepository.findRecentDuplicate.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue(mockCreatedQuote);
      (emailService.sendQuoteNotification as jest.Mock).mockRejectedValue(
        new Error("SMTP error"),
      );

      const result = await service.createQuote(validQuoteData);

      expect(result).toEqual(mockCreatedQuote);
      expect(logger.error).toHaveBeenCalledWith(
        "Failed to send quote notification email",
        expect.any(Error),
        expect.objectContaining({
          quoteId: mockCreatedQuote.id,
          email: validQuoteData.email,
        }),
      );
    });

    it("should generate correct reference number format", async () => {
      const mockCreatedQuote: any = {
        id: "abc123",
        ...validQuoteData,
        status: "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.countByEmailSince.mockResolvedValue(0);
      mockRepository.findRecentDuplicate.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue(mockCreatedQuote);
      (emailService.sendQuoteNotification as jest.Mock).mockResolvedValue(
        undefined,
      );
      (emailService.sendQuoteConfirmation as jest.Mock).mockResolvedValue(
        undefined,
      );

      await service.createQuote(validQuoteData);

      const emailCall = (emailService.sendQuoteConfirmation as jest.Mock).mock
        .calls[0];
      const referenceNumber = emailCall[1];

      expect(referenceNumber).toMatch(/^QR-\d{8}-[A-Z0-9]{6}$/);
    });

    it("should handle quotes without email or phone gracefully", async () => {
      const dataWithoutEmail = {
        name: "John Doe",
        phone: "+1234567890",
        email: "",
      };

      const mockCreatedQuote: any = {
        id: "abc123",
        ...dataWithoutEmail,
        status: "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.create.mockResolvedValue(mockCreatedQuote);
      (emailService.sendQuoteNotification as jest.Mock).mockResolvedValue(
        undefined,
      );

      const result = await service.createQuote(dataWithoutEmail);

      expect(result).toEqual(mockCreatedQuote);
      // Should not check for spam if no email
      expect(mockRepository.countByEmailSince).not.toHaveBeenCalled();
    });
  });

  describe("updateQuote", () => {
    it("should update quote successfully", async () => {
      const existingQuote: any = {
        id: "123",
        name: "John Doe",
        email: "john@example.com",
        phone: "+1234567890",
        status: "pending",
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updateData = {
        status: "contacted",
        notes: "Called customer, waiting for callback",
      };

      const mockUpdatedQuote: any = {
        ...existingQuote,
        ...updateData,
        updatedAt: new Date(),
      };

      mockRepository.findById.mockResolvedValue(existingQuote);
      mockRepository.update.mockResolvedValue(mockUpdatedQuote);

      const result = await service.updateQuote("123", updateData);

      expect(mockRepository.findById).toHaveBeenCalledWith("123");
      expect(mockRepository.update).toHaveBeenCalledWith("123", updateData);
      expect(result.status).toBe("contacted");
      expect(result.notes).toBe("Called customer, waiting for callback");
    });

    it("should throw 404 if quote to update does not exist", async () => {
      mockRepository.findById.mockResolvedValue(null);

      const updateData = { status: "contacted" };

      await expect(
        service.updateQuote("nonexistent", updateData),
      ).rejects.toThrow(AppError);
      await expect(
        service.updateQuote("nonexistent", updateData),
      ).rejects.toThrow("Quote request not found");

      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it("should handle partial updates", async () => {
      const existingQuote: any = {
        id: "123",
        name: "John Doe",
        status: "pending",
        notes: "Initial note",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updateData = { status: "resolved" };

      const mockUpdatedQuote: any = {
        ...existingQuote,
        status: "resolved",
        updatedAt: new Date(),
      };

      mockRepository.findById.mockResolvedValue(existingQuote);
      mockRepository.update.mockResolvedValue(mockUpdatedQuote);

      const result = await service.updateQuote("123", updateData);

      expect(result.status).toBe("resolved");
      expect(result.notes).toBe("Initial note");
    });
  });

  describe("deleteQuote", () => {
    it("should delete quote successfully", async () => {
      const mockQuote: any = {
        id: "123",
        name: "John Doe",
        email: "john@example.com",
        phone: "+1234567890",
        status: "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.findById.mockResolvedValue(mockQuote);
      mockRepository.delete.mockResolvedValue(undefined as any);

      await service.deleteQuote("123");

      expect(mockRepository.findById).toHaveBeenCalledWith("123");
      expect(mockRepository.delete).toHaveBeenCalledWith("123");
    });

    it("should throw 404 if quote to delete does not exist", async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.deleteQuote("nonexistent")).rejects.toThrow(
        AppError,
      );
      await expect(service.deleteQuote("nonexistent")).rejects.toThrow(
        "Quote request not found",
      );

      expect(mockRepository.delete).not.toHaveBeenCalled();
    });

    it("should not return any value", async () => {
      mockRepository.findById.mockResolvedValue({ id: "123" } as any);
      mockRepository.delete.mockResolvedValue(undefined as any);

      const result = await service.deleteQuote("123");

      expect(result).toBeUndefined();
    });
  });

  describe("Anti-Spam Features", () => {
    const spamQuoteData = {
      name: "Spammer",
      phone: "+1234567890",
      email: "spammer@example.com",
      ipAddress: "1.2.3.4",
    };

    it("should check daily email limit before creating quote", async () => {
      mockRepository.countByEmailSince.mockResolvedValue(4); // Just under limit
      mockRepository.findRecentDuplicate.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue({
        id: "123",
        ...spamQuoteData,
        status: "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
      (emailService.sendQuoteNotification as jest.Mock).mockResolvedValue(
        undefined,
      );
      (emailService.sendQuoteConfirmation as jest.Mock).mockResolvedValue(
        undefined,
      );

      await service.createQuote(spamQuoteData);

      expect(mockRepository.countByEmailSince).toHaveBeenCalledWith({
        email: spamQuoteData.email,
        since: expect.any(Date),
      });
    });

    it("should check for duplicate submissions within time window", async () => {
      mockRepository.countByEmailSince.mockResolvedValue(0);
      mockRepository.findRecentDuplicate.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue({
        id: "123",
        ...spamQuoteData,
        status: "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
      (emailService.sendQuoteNotification as jest.Mock).mockResolvedValue(
        undefined,
      );
      (emailService.sendQuoteConfirmation as jest.Mock).mockResolvedValue(
        undefined,
      );

      await service.createQuote(spamQuoteData);

      expect(mockRepository.findRecentDuplicate).toHaveBeenCalledWith({
        email: spamQuoteData.email,
        phone: spamQuoteData.phone,
        since: expect.any(Date),
      });
    });

    it("should log security event when blocking duplicate", async () => {
      const recentDuplicate: any = {
        id: "recent123",
        email: spamQuoteData.email,
        phone: spamQuoteData.phone,
        createdAt: new Date(),
      };

      mockRepository.countByEmailSince.mockResolvedValue(0);
      mockRepository.findRecentDuplicate.mockResolvedValue(recentDuplicate);

      await expect(service.createQuote(spamQuoteData)).rejects.toThrow();

      expect(logger.security).toHaveBeenCalledWith({
        type: "quote",
        action: "spam_blocked_duplicate",
        ip: spamQuoteData.ipAddress,
        details: { email: spamQuoteData.email },
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle very long project details", async () => {
      const longDetails = "A".repeat(5000);
      const quoteData = {
        name: "John Doe",
        phone: "+1234567890",
        email: "john@example.com",
        projectDetails: longDetails,
      };

      mockRepository.countByEmailSince.mockResolvedValue(0);
      mockRepository.findRecentDuplicate.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue({
        id: "123",
        ...quoteData,
        status: "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
      (emailService.sendQuoteNotification as jest.Mock).mockResolvedValue(
        undefined,
      );
      (emailService.sendQuoteConfirmation as jest.Mock).mockResolvedValue(
        undefined,
      );

      const result = await service.createQuote(quoteData);

      expect(result.projectDetails).toBe(longDetails);
    });

    it("should handle special characters in contact info", async () => {
      const quoteData = {
        name: "O'Brien & Sons",
        company: "Tech <> Solutions",
        phone: "+1 (234) 567-8900",
        email: "test+tag@example.com",
      };

      mockRepository.countByEmailSince.mockResolvedValue(0);
      mockRepository.findRecentDuplicate.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue({
        id: "123",
        ...quoteData,
        status: "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
      (emailService.sendQuoteNotification as jest.Mock).mockResolvedValue(
        undefined,
      );
      (emailService.sendQuoteConfirmation as jest.Mock).mockResolvedValue(
        undefined,
      );

      const result = await service.createQuote(quoteData);

      expect(result.name).toBe("O'Brien & Sons");
      expect(result.company).toBe("Tech <> Solutions");
    });
  });
});
