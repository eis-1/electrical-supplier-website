import jwt, { type SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../../config/env';
import { AuthRepository } from './repository';
import { RefreshTokenRepository } from './refreshToken.repository';
import { AppError } from '../../middlewares/error.middleware';
import { logger } from '../../utils/logger';

interface LoginResponse {
  token?: string;
  refreshToken?: string;
  requiresTwoFactor?: boolean;
  admin: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

export class AuthService {
  private repository: AuthRepository;
  private refreshTokenRepository: RefreshTokenRepository;

  constructor() {
    this.repository = new AuthRepository();
    this.refreshTokenRepository = new RefreshTokenRepository();
  }

  /**
   * Generate a cryptographically secure refresh token
   */
  private generateRefreshToken(): string {
    return crypto.randomBytes(64).toString('hex');
  }

  /**
   * Hash refresh token for storage (one-way hash)
   */
  private hashToken(token: string): string {
    // Deterministic hash so we can look up the token efficiently.
    // Use an HMAC "pepper" (refresh secret) to prevent offline guessing.
    return crypto
      .createHmac('sha256', env.JWT_REFRESH_SECRET)
      .update(token)
      .digest('hex');
  }

  /**
   * Create refresh token session in database
   */
  private async createRefreshTokenSession(
    adminId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<string> {
    // Generate random token
    const token = this.generateRefreshToken();
    const hashedToken = this.hashToken(token);

    // Calculate expiration (7 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Store in database
    await this.refreshTokenRepository.create({
      token: hashedToken,
      adminId,
      ipAddress,
      userAgent,
      expiresAt,
    });

    // Return unhashed token to send to client
    return token;
  }

  async login(
    email: string,
    password: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<LoginResponse> {
    // Find admin by email
    const admin = await this.repository.findAdminByEmail(email);

    if (!admin) {
      logger.security({
        type: 'auth',
        action: 'login_failed',
        details: { email, reason: 'user_not_found' },
      });
      throw new AppError(401, 'Invalid credentials');
    }

    // Check if admin is active
    if (!admin.isActive) {
      logger.security({
        type: 'auth',
        action: 'login_failed',
        userId: admin.id,
        details: { email, reason: 'account_inactive' },
      });
      throw new AppError(401, 'Account is inactive');
    }

    // Verify password
    const isPasswordValid = await this.repository.verifyPassword(password, admin.password);

    if (!isPasswordValid) {
      logger.security({
        type: 'auth',
        action: 'login_failed',
        userId: admin.id,
        details: { email, reason: 'invalid_password' },
      });
      throw new AppError(401, 'Invalid credentials');
    }

    // Check if 2FA is enabled for this admin
    if (admin.twoFactorEnabled) {
      logger.security({
        type: 'auth',
        action: 'login_2fa_required',
        userId: admin.id,
        details: { email },
      });

      // Return response requiring 2FA verification (no tokens yet)
      return {
        requiresTwoFactor: true,
        admin: {
          id: admin.id,
          email: admin.email,
          name: admin.name,
          role: admin.role,
        },
      };
    }

    // Generate JWT token (short-lived for security)
    const token = jwt.sign(
      {
        id: admin.id,
        email: admin.email,
        role: admin.role,
      },
      env.JWT_SECRET,
      {
        // @types/jsonwebtoken uses a stricter string type (ms StringValue)
        expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
        algorithm: 'HS256',
      }
    );

    // Create server-side refresh token session
    const refreshToken = await this.createRefreshTokenSession(
      admin.id,
      ipAddress,
      userAgent
    );

    // Log successful login
    logger.security({
      type: 'auth',
      action: 'login_success',
      userId: admin.id,
      details: { email },
    });

    return {
      token,
      refreshToken,
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
      const decoded = jwt.verify(token, env.JWT_SECRET, {
        algorithms: ['HS256'],
      });
      return decoded;
    } catch {
      throw new AppError(401, 'Invalid or expired token');
    }
  }

  async refreshAccessToken(
    refreshToken: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ token: string; refreshToken: string }> {
    try {
      // Hash the incoming token to find it in DB
      const hashedToken = this.hashToken(refreshToken);

      // Find token in database
      const tokenRecord = await this.refreshTokenRepository.findByToken(hashedToken);

      if (!tokenRecord) {
        throw new AppError(401, 'Invalid refresh token');
      }

      // Check if token is revoked
      if (tokenRecord.isRevoked) {
        logger.security({
          type: 'auth',
          action: 'refresh_token_revoked_used',
          userId: tokenRecord.adminId,
          details: { tokenId: tokenRecord.id },
        });
        throw new AppError(401, 'Refresh token has been revoked');
      }

      // Check if token is expired
      if (new Date() > tokenRecord.expiresAt) {
        throw new AppError(401, 'Refresh token expired');
      }

      // Check if admin is still active
      const admin = tokenRecord.admin;
      if (!admin || !admin.isActive) {
        throw new AppError(401, 'Invalid refresh token');
      }

      // **Token rotation**: Revoke old token (one-time use)
      await this.refreshTokenRepository.revoke(tokenRecord.id);

      // Generate new access token
      const token = jwt.sign(
        {
          id: admin.id,
          email: admin.email,
          role: admin.role,
        },
        env.JWT_SECRET,
        {
          expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
          algorithm: 'HS256',
        }
      );

      // Generate new refresh token (rotation)
      const newRefreshToken = await this.createRefreshTokenSession(
        admin.id,
        ipAddress,
        userAgent
      );

      logger.security({
        type: 'auth',
        action: 'token_refreshed',
        userId: admin.id,
        details: { email: admin.email },
      });

      return { token, refreshToken: newRefreshToken };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(401, 'Invalid or expired refresh token');
    }
  }

  async verify2FA(
    adminId: string,
    code: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<LoginResponse> {
    // Get admin with 2FA details
    const admin = await this.repository.findAdminById(adminId);
    if (!admin || !admin.isActive) {
      throw new AppError(401, 'Invalid admin');
    }

    if (!admin.twoFactorEnabled || !admin.twoFactorSecret) {
      throw new AppError(400, '2FA is not enabled for this account');
    }

    // Import TwoFactorService here to avoid circular dependencies
    const { TwoFactorService } = await import('./twoFactor.service');
    const twoFactorService = new TwoFactorService();

    // Verify the code
    // Secret is stored encrypted in DB; decrypt before verifying.
    const secret = twoFactorService.decryptSecret(admin.twoFactorSecret);
    const isValid = twoFactorService.verifyToken(secret, code);
    if (!isValid) {
      logger.security({
        type: 'auth',
        action: 'two_factor_failed',
        userId: admin.id,
        details: { email: admin.email, reason: 'invalid_code' },
      });
      throw new AppError(401, 'Invalid 2FA code');
    }

    // Generate tokens after successful 2FA verification
    const token = jwt.sign(
      {
        id: admin.id,
        email: admin.email,
        role: admin.role,
      },
      env.JWT_SECRET,
      {
        expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
        algorithm: 'HS256',
      }
    );

    // Create server-side refresh token session
    const refreshToken = await this.createRefreshTokenSession(
      admin.id,
      ipAddress,
      userAgent
    );

    logger.security({
      type: 'auth',
      action: 'two_factor_success',
      userId: admin.id,
      details: { email: admin.email },
    });

    return {
      token,
      refreshToken,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
    };
  }

  /**
   * Revoke a specific refresh token (logout single session)
   */
  async revokeRefreshToken(refreshToken: string): Promise<void> {
    const hashedToken = this.hashToken(refreshToken);
    const tokenRecord = await this.refreshTokenRepository.findByToken(hashedToken);

    if (tokenRecord) {
      await this.refreshTokenRepository.revoke(tokenRecord.id);
    }
  }

  /**
   * Revoke all refresh tokens for an admin (logout all devices)
   */
  async revokeAllRefreshTokens(adminId: string): Promise<void> {
    await this.refreshTokenRepository.revokeAllForAdmin(adminId);
  }
}
