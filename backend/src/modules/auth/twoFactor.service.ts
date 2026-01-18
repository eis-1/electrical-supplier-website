import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import crypto from 'crypto';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';

/**
 * Two-Factor Authentication Service
 * Handles TOTP generation, verification, and backup codes
 */
export class TwoFactorService {
  /**
   * Generate a new TOTP secret for a user
   * @param email - User's email address
   * @returns Object with secret and otpauth URL
   */
  generateSecret(email: string): { secret: string; otpauth_url: string } {
    const secret = speakeasy.generateSecret({
      name: `${env.COMPANY_NAME} (${email})`,
      issuer: env.COMPANY_NAME,
      length: 32,
    });

    return {
      secret: secret.base32,
      otpauth_url: secret.otpauth_url || '',
    };
  }

  /**
   * Generate QR code data URL for TOTP setup
   * @param otpauthUrl - The otpauth:// URL
   * @returns Data URL for QR code image
   */
  async generateQRCode(otpauthUrl: string): Promise<string> {
    try {
      return await QRCode.toDataURL(otpauthUrl);
    } catch (error) {
      logger.error('Failed to generate QR code:', error);
      throw new Error('Failed to generate QR code');
    }
  }

  /**
   * Verify a TOTP token
   * @param secret - User's TOTP secret (base32)
   * @param token - 6-digit token from authenticator app
   * @returns True if token is valid
   */
  verifyToken(secret: string, token: string): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2, // Allow 2 time steps before/after for clock drift
    });
  }

  /**
   * Generate backup codes for account recovery
   * @param count - Number of backup codes to generate (default: 10)
   * @returns Array of backup codes (format: XXXX-XXXX-XXXX)
   */
  generateBackupCodes(count: number = 10): string[] {
    const codes: string[] = [];
    
    for (let i = 0; i < count; i++) {
      // Generate 12 random characters (alphanumeric)
      const code = crypto.randomBytes(6).toString('hex').toUpperCase();
      // Format as XXXX-XXXX-XXXX
      const formatted = `${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8, 12)}`;
      codes.push(formatted);
    }
    
    return codes;
  }

  /**
   * Hash backup codes for secure storage
   * @param codes - Array of plain text backup codes
   * @returns JSON string of hashed codes
   */
  hashBackupCodes(codes: string[]): string {
    const hashedCodes = codes.map(code => 
      crypto.createHash('sha256').update(code).digest('hex')
    );
    return JSON.stringify(hashedCodes);
  }

  /**
   * Verify a backup code against stored hashed codes
   * @param code - Plain text backup code
   * @param hashedCodesJson - JSON string of hashed codes
   * @returns Index of used code if valid, -1 otherwise
   */
  verifyBackupCode(code: string, hashedCodesJson: string): number {
    try {
      const hashedCodes: string[] = JSON.parse(hashedCodesJson);
      const codeHash = crypto.createHash('sha256').update(code).digest('hex');
      
      return hashedCodes.indexOf(codeHash);
    } catch {
      return -1;
    }
  }

  /**
   * Remove a used backup code from the list
   * @param hashedCodesJson - JSON string of hashed codes
   * @param index - Index of the code to remove
   * @returns Updated JSON string with code removed
   */
  removeBackupCode(hashedCodesJson: string, index: number): string {
    try {
      const hashedCodes: string[] = JSON.parse(hashedCodesJson);
      hashedCodes.splice(index, 1);
      return JSON.stringify(hashedCodes);
    } catch {
      return hashedCodesJson;
    }
  }

  /**
   * Encrypt TOTP secret for database storage
   * @param secret - Plain text TOTP secret
   * @returns Encrypted secret
   */
  encryptSecret(secret: string): string {
    // Simple encryption using AES-256-CBC
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(env.JWT_SECRET, 'salt', 32);
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(secret, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Return IV + encrypted data
    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt TOTP secret from database
   * @param encryptedSecret - Encrypted secret with IV
   * @returns Decrypted plain text secret
   */
  decryptSecret(encryptedSecret: string): string {
    try {
      const algorithm = 'aes-256-cbc';
      const key = crypto.scryptSync(env.JWT_SECRET, 'salt', 32);
      
      const parts = encryptedSecret.split(':');
      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];
      
      const decipher = crypto.createDecipheriv(algorithm, key, iv);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      logger.error('Failed to decrypt 2FA secret:', error);
      throw new Error('Failed to decrypt 2FA secret');
    }
  }
}
