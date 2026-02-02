import {
  S3Client,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import fs from "fs";
import path from "path";
import { env } from "../config/env";
import { logger } from "./logger";

/**
 * Storage provider types
 * - local: Filesystem storage
 * - s3: Amazon S3 or S3-compatible storage
 * - r2: Cloudflare R2 (S3-compatible)
 */
export type StorageProvider = "local" | "s3" | "r2";

/**
 * Upload result returned by all storage providers
 */
interface UploadResult {
  key: string;
  url: string;
  size: number;
  mimetype: string;
}

/**
 * Storage Service Class
 *
 * Provides unified interface for file storage across multiple backends.
 *
 * **Initialization:**
 * - Reads STORAGE_PROVIDER from environment
 * - Configures S3 client if using s3 or r2 provider
 * - R2 uses forcePathStyle for compatibility
 *
 * **Methods:**
 * - upload(): Store file and return URL
 * - delete(): Remove file from storage
 * - exists(): Check if file exists
 * - getSignedUrl(): Generate temporary access URL (S3/R2 only)
 */
class StorageService {
  private s3Client?: S3Client;
  private provider: StorageProvider;

  constructor() {
    this.provider = env.STORAGE_PROVIDER;

    if (this.provider === "s3" || this.provider === "r2") {
      this.s3Client = new S3Client({
        region: env.S3_REGION,
        endpoint: env.S3_ENDPOINT,
        credentials: {
          accessKeyId: env.S3_ACCESS_KEY_ID,
          secretAccessKey: env.S3_SECRET_ACCESS_KEY,
        },
        // Force path style for R2 and MinIO compatibility
        forcePathStyle: this.provider === "r2",
      });
    }
  }

  /**
   * Upload a file to the configured storage provider
   */
  async upload(
    filePath: string,
    options: {
      filename: string;
      mimetype: string;
      subfolder?: string;
    },
  ): Promise<UploadResult> {
    const { filename, mimetype, subfolder = "general" } = options;

    if (this.provider === "local") {
      return this.uploadLocal(filePath, filename, mimetype, subfolder);
    }

    return this.uploadS3(filePath, filename, mimetype, subfolder);
  }

  /**
   * Delete a file from storage
   */
  async delete(key: string): Promise<void> {
    if (this.provider === "local") {
      return this.deleteLocal(key);
    }

    return this.deleteS3(key);
  }

  /**
   * Check if a file exists in storage
   */
  async exists(key: string): Promise<boolean> {
    if (this.provider === "local") {
      return this.existsLocal(key);
    }

    return this.existsS3(key);
  }

  /**
   * Get the public URL for a file
   */
  getUrl(key: string): string {
    if (this.provider === "local") {
      return `/uploads/${key}`;
    }

    if (env.S3_PUBLIC_URL) {
      return `${env.S3_PUBLIC_URL}/${key}`;
    }

    // For S3, construct URL from bucket and region
    if (this.provider === "s3") {
      return `https://${env.S3_BUCKET}.s3.${env.S3_REGION}.amazonaws.com/${key}`;
    }

    // For R2, use the endpoint
    return `${env.S3_ENDPOINT}/${env.S3_BUCKET}/${key}`;
  }

  // ========== Local Storage Methods ==========

  private async uploadLocal(
    filePath: string,
    filename: string,
    mimetype: string,
    subfolder: string,
  ): Promise<UploadResult> {
    const uploadDir = path.resolve(env.UPLOAD_DIR);
    const destDir = path.join(uploadDir, subfolder);

    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    const destPath = path.join(destDir, filename);
    const key = `${subfolder}/${filename}`;

    // Move file to final destination
    fs.renameSync(filePath, destPath);

    const stats = fs.statSync(destPath);

    logger.info("File uploaded to local storage", {
      key,
      size: stats.size,
    });

    return {
      key,
      url: this.getUrl(key),
      size: stats.size,
      mimetype,
    };
  }

  private async deleteLocal(key: string): Promise<void> {
    const uploadDir = path.resolve(env.UPLOAD_DIR);
    const filePath = path.join(uploadDir, key);

    // Security check: ensure path is within upload directory
    const resolvedPath = path.resolve(filePath);
    const resolvedUploadDir = path.resolve(uploadDir);

    if (!resolvedPath.startsWith(resolvedUploadDir)) {
      throw new Error("Invalid file path");
    }

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      logger.info("File deleted from local storage", { key });
    }
  }

  private existsLocal(key: string): boolean {
    const uploadDir = path.resolve(env.UPLOAD_DIR);
    const filePath = path.join(uploadDir, key);
    return fs.existsSync(filePath);
  }

  // ========== S3/R2 Storage Methods ==========

  private async uploadS3(
    filePath: string,
    filename: string,
    mimetype: string,
    subfolder: string,
  ): Promise<UploadResult> {
    if (!this.s3Client) {
      throw new Error("S3 client not initialized");
    }

    const fileStream = fs.createReadStream(filePath);
    const stats = fs.statSync(filePath);
    const key = `${subfolder}/${filename}`;

    try {
      const upload = new Upload({
        client: this.s3Client,
        params: {
          Bucket: env.S3_BUCKET,
          Key: key,
          Body: fileStream,
          ContentType: mimetype,
          // Make files publicly readable if bucket is configured for public access
          ACL: env.S3_PUBLIC_BUCKET ? "public-read" : undefined,
        },
      });

      await upload.done();

      // Clean up temp file
      fs.unlinkSync(filePath);

      logger.info(`File uploaded to ${this.provider.toUpperCase()}`, {
        key,
        bucket: env.S3_BUCKET,
        size: stats.size,
      });

      return {
        key,
        url: this.getUrl(key),
        size: stats.size,
        mimetype,
      };
    } catch (error) {
      // Clean up temp file on error
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      logger.error("S3 upload failed", error, { key });
      throw error;
    }
  }

  private async deleteS3(key: string): Promise<void> {
    if (!this.s3Client) {
      throw new Error("S3 client not initialized");
    }

    try {
      const command = new DeleteObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: key,
      });

      await this.s3Client.send(command);

      logger.info(`File deleted from ${this.provider.toUpperCase()}`, {
        key,
        bucket: env.S3_BUCKET,
      });
    } catch (error) {
      logger.error("S3 delete failed", error, { key });
      throw error;
    }
  }

  private async existsS3(key: string): Promise<boolean> {
    if (!this.s3Client) {
      throw new Error("S3 client not initialized");
    }

    try {
      const command = new HeadObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: key,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error: any) {
      if (error.name === "NotFound") {
        return false;
      }
      throw error;
    }
  }
}

export const storageService = new StorageService();
