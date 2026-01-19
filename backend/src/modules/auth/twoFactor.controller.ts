import { Request, Response } from "express";
import { asyncHandler } from "../../middlewares/error.middleware";
import { ApiResponse } from "../../utils/response";
import { TwoFactorService } from "./twoFactor.service";
import { AuthRepository } from "./repository";
import { AppError } from "../../middlewares/error.middleware";
import { logger } from "../../utils/logger";

export class TwoFactorController {
  private twoFactorService: TwoFactorService;
  private authRepository: AuthRepository;

  constructor() {
    this.twoFactorService = new TwoFactorService();
    this.authRepository = new AuthRepository();
  }

  /**
   * Setup 2FA - Generate secret and QR code
   * POST /api/v1/auth/2fa/setup
   */
  setup = asyncHandler(async (req: Request, res: Response) => {
    const adminId = (req as any).admin.id;

    // Get admin details
    const admin = await this.authRepository.findAdminById(adminId);
    if (!admin) {
      throw new AppError(404, "Admin not found");
    }

    // Check if 2FA is already enabled
    if (admin.twoFactorEnabled) {
      return ApiResponse.error(
        res,
        "Two-factor authentication is already enabled",
        400,
      );
    }

    // Generate new TOTP secret
    const { secret, otpauth_url } = this.twoFactorService.generateSecret(
      admin.email,
    );

    // Generate QR code
    const qrCode = await this.twoFactorService.generateQRCode(otpauth_url);

    // Store encrypted secret temporarily (will be confirmed with verify endpoint)
    const encryptedSecret = this.twoFactorService.encryptSecret(secret);
    await this.authRepository.updateAdmin(adminId, {
      twoFactorSecret: encryptedSecret,
    });

    logger.security({
      type: "auth",
      action: "2fa_setup_initiated",
      userId: adminId.toString(),
      details: { email: admin.email },
    });

    return ApiResponse.success(
      res,
      {
        secret, // Send plain secret for manual entry
        qrCode, // Data URL for QR code display
      },
      "2FA setup initiated. Scan QR code with authenticator app.",
    );
  });

  /**
   * Enable 2FA - Verify token and generate backup codes
   * POST /api/v1/auth/2fa/enable
   */
  enable = asyncHandler(async (req: Request, res: Response) => {
    const adminId = (req as any).admin.id;
    const { token } = req.body;

    if (!token) {
      throw new AppError(400, "Token is required");
    }

    // Get admin with secret
    const admin = await this.authRepository.findAdminById(adminId);
    if (!admin || !admin.twoFactorSecret) {
      throw new AppError(400, "2FA setup not initiated. Call /setup first.");
    }

    if (admin.twoFactorEnabled) {
      return ApiResponse.error(
        res,
        "Two-factor authentication is already enabled",
        400,
      );
    }

    // Decrypt secret and verify token
    const secret = this.twoFactorService.decryptSecret(admin.twoFactorSecret);
    const isValid = this.twoFactorService.verifyToken(secret, token);

    if (!isValid) {
      logger.security({
        type: "auth",
        action: "2fa_enable_failed",
        userId: adminId.toString(),
        details: { reason: "invalid_token" },
      });
      throw new AppError(400, "Invalid token. Please try again.");
    }

    // Generate backup codes
    const backupCodes = this.twoFactorService.generateBackupCodes(10);
    const hashedBackupCodes =
      this.twoFactorService.hashBackupCodes(backupCodes);

    // Enable 2FA
    await this.authRepository.updateAdmin(adminId, {
      twoFactorEnabled: true,
      backupCodes: hashedBackupCodes,
    });

    logger.security({
      type: "auth",
      action: "2fa_enabled",
      userId: adminId.toString(),
      details: { email: admin.email },
    });

    return ApiResponse.success(
      res,
      {
        backupCodes, // Show once, user must save them
      },
      "2FA enabled successfully. Save your backup codes in a secure location.",
    );
  });

  /**
   * Disable 2FA
   * POST /api/v1/auth/2fa/disable
   */
  disable = asyncHandler(async (req: Request, res: Response) => {
    const adminId = (req as any).admin.id;
    const { token } = req.body;

    if (!token) {
      throw new AppError(400, "Token is required to disable 2FA");
    }

    // Get admin
    const admin = await this.authRepository.findAdminById(adminId);
    if (!admin || !admin.twoFactorEnabled || !admin.twoFactorSecret) {
      throw new AppError(400, "2FA is not enabled");
    }

    // Verify token before disabling
    const secret = this.twoFactorService.decryptSecret(admin.twoFactorSecret);
    const isValid = this.twoFactorService.verifyToken(secret, token);

    if (!isValid) {
      logger.security({
        type: "auth",
        action: "2fa_disable_failed",
        userId: adminId.toString(),
        details: { reason: "invalid_token" },
      });
      throw new AppError(400, "Invalid token");
    }

    // Disable 2FA
    await this.authRepository.updateAdmin(adminId, {
      twoFactorEnabled: false,
      twoFactorSecret: null,
      backupCodes: null,
    });

    logger.security({
      type: "auth",
      action: "2fa_disabled",
      userId: adminId.toString(),
      details: { email: admin.email },
    });

    return ApiResponse.success(res, null, "2FA disabled successfully");
  });

  /**
   * Verify 2FA token during login
   * POST /api/v1/auth/2fa/verify
   */
  verify = asyncHandler(async (req: Request, res: Response) => {
    const { email, token, useBackupCode } = req.body;

    if (!email || !token) {
      throw new AppError(400, "Email and token are required");
    }

    // Get admin
    const admin = await this.authRepository.findAdminByEmail(email);
    if (!admin || !admin.twoFactorEnabled || !admin.twoFactorSecret) {
      throw new AppError(400, "Invalid request");
    }

    let isValid = false;

    if (useBackupCode && admin.backupCodes) {
      // Verify backup code
      const backupIndex = this.twoFactorService.verifyBackupCode(
        token,
        admin.backupCodes,
      );

      if (backupIndex !== -1) {
        isValid = true;

        // Remove used backup code
        const updatedCodes = this.twoFactorService.removeBackupCode(
          admin.backupCodes,
          backupIndex,
        );
        await this.authRepository.updateAdmin(admin.id, {
          backupCodes: updatedCodes,
        });

        logger.security({
          type: "auth",
          action: "2fa_backup_code_used",
          userId: admin.id,
          details: {
            email: admin.email,
            remaining: JSON.parse(updatedCodes).length,
          },
        });
      }
    } else {
      // Verify TOTP token
      const secret = this.twoFactorService.decryptSecret(admin.twoFactorSecret);
      isValid = this.twoFactorService.verifyToken(secret, token);
    }

    if (!isValid) {
      logger.security({
        type: "auth",
        action: "2fa_verification_failed",
        userId: admin.id,
        details: { email, useBackupCode },
      });
      throw new AppError(400, "Invalid token");
    }

    logger.security({
      type: "auth",
      action: "2fa_verification_success",
      userId: admin.id,
      details: { email },
    });

    return ApiResponse.success(
      res,
      { verified: true },
      "2FA verification successful",
    );
  });

  /**
   * Get 2FA status for current admin
   * GET /api/v1/auth/2fa/status
   */
  status = asyncHandler(async (req: Request, res: Response) => {
    const adminId = (req as any).admin.id;

    const admin = await this.authRepository.findAdminById(adminId);
    if (!admin) {
      throw new AppError(404, "Admin not found");
    }

    const backupCodesCount = admin.backupCodes
      ? JSON.parse(admin.backupCodes).length
      : 0;

    return ApiResponse.success(res, {
      enabled: admin.twoFactorEnabled,
      backupCodesRemaining: backupCodesCount,
    });
  });
}
