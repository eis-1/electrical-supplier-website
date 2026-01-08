import { Request, Response } from 'express';
import { AuthService } from './service';
import { ApiResponse } from '../../utils/response';
import { asyncHandler } from '../../middlewares/error.middleware';

export class AuthController {
  private service: AuthService;

  constructor() {
    this.service = new AuthService();
  }

  login = asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;

    const result = await this.service.login(email, password);

    return ApiResponse.success(res, result, 'Login successful');
  });

  verify = asyncHandler(async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return ApiResponse.unauthorized(res, 'No token provided');
    }

    const token = authHeader.substring(7);
    const decoded = await this.service.verifyToken(token);

    return ApiResponse.success(res, { valid: true, admin: decoded });
  });
}
