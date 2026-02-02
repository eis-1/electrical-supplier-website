import { Request, Response } from "express";
import { QuoteService } from "./service";
import { ApiResponse } from "../../utils/response";
import { asyncHandler } from "../../middlewares/error.middleware";
import { AuthRequest } from "../../middlewares/auth.middleware";

/**
 * QuoteController - HTTP request handlers for quote request endpoints
 *
 * Responsibilities:
 * - Handle customer quote requests (public endpoint)
 * - Manage quote CRUD operations (admin endpoints)
 * - Capture IP address and user agent for security
 * - Whitelist request body fields to prevent injection
 *
 * Endpoints:
 * - POST /api/v1/quotes - Submit quote request (public, protected by spam middleware)
 * - GET /api/v1/quotes - List all quotes (admin only)
 * - GET /api/v1/quotes/:id - Get quote by ID (admin only)
 * - PUT /api/v1/quotes/:id - Update quote (admin only)
 * - DELETE /api/v1/quotes/:id - Delete quote (admin only)
 *
 * Security:
 * - Public create endpoint protected by 5-layer defense system
 * - IP address and user agent captured for audit trail
 * - Body field whitelisting prevents unexpected data
 * - Admin endpoints require JWT authentication
 */
export class QuoteController {
  private service: QuoteService;

  constructor() {
    this.service = new QuoteService();
  }

  /**
   * Create a new quote request (public endpoint)
   *
   * Protected by 5-layer defense system:
   * 1. Rate limiting (5 req/hour per IP)
   * 2. Honeypot detection
   * 3. Timing analysis (1.5s-1hour window)
   * 4. Daily email limit (5 per day)
   * 5. Duplicate detection (10-minute window)
   *
   * Security Measures:
   * - Captures IP address for rate limiting and audit
   * - Captures user agent for fingerprinting
   * - Whitelists request body fields (prevents extra fields)
   * - Returns reference number for customer tracking
   *
   * @route POST /api/v1/quotes
   * @access Public (protected by spam middleware)
   */
  create = asyncHandler(async (req: Request, res: Response) => {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers["user-agent"];

    // Whitelist fields (prevents unexpected body keys from reaching Prisma create)
    const {
      name,
      company,
      phone,
      whatsapp,
      email,
      productName,
      quantity,
      projectDetails,
    } = req.body as Record<string, any>;

    const quoteData = {
      name,
      company,
      phone,
      whatsapp,
      email,
      productName,
      quantity,
      projectDetails,
      ipAddress,
      userAgent,
    };

    const quote = await this.service.createQuote(quoteData);

    return ApiResponse.created(
      res,
      {
        id: quote.id,
        referenceNumber: `QR-${new Date().toISOString().split("T")[0].replace(/-/g, "")}-${quote.id.substring(0, 6).toUpperCase()}`,
      },
      "Quote request submitted successfully. We will contact you soon.",
    );
  });

  // Admin routes
  getAll = asyncHandler(async (req: AuthRequest, res: Response) => {
    const {
      status,
      page = "1",
      limit = "20",
      sortBy = "createdAt",
      order = "desc",
    } = req.query;

    const filters = {
      status: status as string,
    };

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const sortOrder = order === "asc" ? "asc" : "desc";

    const { quotes, total } = await this.service.getAllQuotes(
      filters,
      pageNum,
      limitNum,
      sortBy as string,
      sortOrder,
    );

    return ApiResponse.paginated(res, quotes, pageNum, limitNum, total);
  });

  getById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const quote = await this.service.getQuoteById(id);
    return ApiResponse.success(res, quote);
  });

  update = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const quote = await this.service.updateQuote(id, req.body);
    return ApiResponse.success(res, quote, "Quote updated successfully");
  });

  delete = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    await this.service.deleteQuote(id);
    return ApiResponse.success(res, null, "Quote deleted successfully");
  });
}
