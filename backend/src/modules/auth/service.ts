import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { AuthRepository } from './repository';
import { AppError } from '../../middlewares/error.middleware';

interface LoginResponse {
  token: string;
  admin: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

export class AuthService {
  private repository: AuthRepository;

  constructor() {
    this.repository = new AuthRepository();
  }

  async login(email: string, password: string): Promise<LoginResponse> {
    // Find admin by email
    const admin = await this.repository.findAdminByEmail(email);

    if (!admin) {
      throw new AppError(401, 'Invalid credentials');
    }

    // Check if admin is active
    if (!admin.isActive) {
      throw new AppError(401, 'Account is inactive');
    }

    // Verify password
    const isPasswordValid = await this.repository.verifyPassword(password, admin.password);

    if (!isPasswordValid) {
      throw new AppError(401, 'Invalid credentials');
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: admin.id,
        email: admin.email,
        role: admin.role,
      },
      env.JWT_SECRET
    );

    return {
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
    };
  }

  async verifyToken(token: string): Promise<any> {
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET);
      return decoded;
    } catch (error) {
      throw new AppError(401, 'Invalid or expired token');
    }
  }
}
