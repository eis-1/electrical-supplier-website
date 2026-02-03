import { prisma } from "../../config/db";
import { logger } from "../../utils/logger";

/**
 * Repository for refresh token operations
 * Handles server-side session management with token rotation
 */
export class RefreshTokenRepository {
  /**
   * Create a new refresh token session
   */
  async create(data: {
    token: string; // Pre-hashed by service
    adminId: string;
    ipAddress?: string;
    userAgent?: string;
    expiresAt: Date;
  }) {
    return await prisma.refreshToken.create({
      data,
    });
  }

  /**
   * Find refresh token by hashed token value
   */
  async findByToken(hashedToken: string) {
    return await prisma.refreshToken.findUnique({
      where: { token: hashedToken },
      include: { admin: true },
    });
  }

  /**
   * Find all active (non-revoked, non-expired) tokens for an admin
   */
  async findActiveByAdminId(adminId: string) {
    return await prisma.refreshToken.findMany({
      where: {
        adminId,
        isRevoked: false,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  /**
   * Revoke a specific refresh token (logout single session)
   */
  async revoke(tokenId: string) {
    const result = await prisma.refreshToken.update({
      where: { id: tokenId },
      data: { isRevoked: true },
    });

    logger.security({
      type: "auth",
      action: "refresh_token_revoked",
      details: { tokenId },
    });

    return result;
  }

  /**
   * Revoke all refresh tokens for an admin (logout all sessions)
   */
  async revokeAllForAdmin(adminId: string) {
    const result = await prisma.refreshToken.updateMany({
      where: {
        adminId,
        isRevoked: false,
      },
      data: { isRevoked: true },
    });

    logger.security({
      type: "auth",
      action: "all_refresh_tokens_revoked",
      userId: adminId,
      details: { count: result.count },
    });

    return result;
  }

  /**
   * Delete expired refresh tokens (cleanup job)
   */
  async deleteExpired() {
    const result = await prisma.refreshToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    if (result.count > 0) {
      logger.info(`Deleted ${result.count} expired refresh tokens`);
    }

    return result;
  }

  /**
   * Delete all tokens for an admin (account deletion)
   */
  async deleteAllForAdmin(adminId: string) {
    return await prisma.refreshToken.deleteMany({
      where: { adminId },
    });
  }

  /**
   * Count active sessions for an admin
   */
  async countActiveSessions(adminId: string): Promise<number> {
    return await prisma.refreshToken.count({
      where: {
        adminId,
        isRevoked: false,
        expiresAt: {
          gt: new Date(),
        },
      },
    });
  }
}
