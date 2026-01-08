import { Request, Response } from 'express';
import { QuoteService } from './service';
import { ApiResponse } from '../../utils/response';
import { asyncHandler } from '../../middlewares/error.middleware';
import { AuthRequest } from '../../middlewares/auth.middleware';

export class QuoteController {
  private service: QuoteService;

  constructor() {
    this.service = new QuoteService();
  }

  // Public route - Submit quote request
  create = asyncHandler(async (req: Request, res: Response) => {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const quoteData = {
      ...req.body,
      ipAddress,
      userAgent,
    };

    const quote = await this.service.createQuote(quoteData);

    return ApiResponse.created(
      res,
      {
        id: quote.id,
        referenceNumber: `QR-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${quote.id.substring(0, 6).toUpperCase()}`,
      },
      'Quote request submitted successfully. We will contact you soon.'
    );
  });

  // Admin routes
  getAll = asyncHandler(async (req: AuthRequest, res: Response) => {
    const {
      status,
      page = '1',
      limit = '20',
      sortBy = 'createdAt',
      order = 'desc',
    } = req.query;

    const filters = {
      status: status as string,
    };

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const sortOrder = order === 'asc' ? 'asc' : 'desc';

    const { quotes, total } = await this.service.getAllQuotes(
      filters,
      pageNum,
      limitNum,
      sortBy as string,
      sortOrder
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
    return ApiResponse.success(res, quote, 'Quote updated successfully');
  });

  delete = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    await this.service.deleteQuote(id);
    return ApiResponse.success(res, null, 'Quote deleted successfully');
  });
}
