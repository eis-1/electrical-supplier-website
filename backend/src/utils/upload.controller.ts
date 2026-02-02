/**
 * Upload Controller
 *
 * Secure file upload handling with multi-layer validation and storage support.
 *
 * **Security Pipeline:**
 * 1. Multer file size limit (10MB default)
 * 2. MIME type whitelist validation
 * 3. Extension sanitization (removes path traversal characters)
 * 4. Magic byte verification (file-type library)
 * 5. Malware scanning (VirusTotal, ClamAV, or none)
 * 6. Storage upload (local, S3, or Cloudflare R2)
 *
 * **File Type Support:**
 * - Images: JPG, PNG, WebP, GIF (configurable via ALLOWED_IMAGE_TYPES)
 * - Documents: PDF (configurable via ALLOWED_DOC_TYPES)
 *
 * **Storage Providers:**
 * - local: Filesystem storage in UPLOAD_DIR
 * - s3: Amazon S3 compatible storage
 * - r2: Cloudflare R2 storage
 *
 * **Attack Prevention:**
 * - Double extension attacks: Sanitized extension extraction
 * - Path traversal: Extension sanitization removes ../ and special chars
 * - MIME type spoofing: Magic byte verification with file-type
 * - Malware uploads: Optional VirusTotal/ClamAV scanning
 * - Zip bombs/large files: Multer size limit enforcement
 *
 * **Workflow:**
 * 1. Client uploads file to /api/upload endpoint
 * 2. Multer saves to temp location with size check
 * 3. MIME type filtered by whitelist
 * 4. File extension sanitized
 * 5. Magic bytes verified (prevents MIME type spoofing)
 * 6. Malware scan performed (if configured)
 * 7. File uploaded to storage provider
 * 8. Temp file cleaned up
 * 9. URL returned to client
 *
 * @module UploadController
 */

import { Request, Response, NextFunction } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import FileType from "file-type";
import { env } from "../config/env";
import { AppError } from "../middlewares/error.middleware";
import { logger } from "./logger";
import { storageService } from "./storage.service";
import { malwareService } from "./malware.service";

/**
 * Ensure upload directory exists
 * Creates directory structure if not present (uploads/images, uploads/documents)
 */
const uploadDir = path.resolve(env.UPLOAD_DIR);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/**
 * Multer Storage Configuration
 *
 * **Destination Strategy:**
 * - Images: uploads/images/
 * - Documents: uploads/documents/
 * - Creates subfolders automatically if missing
 *
 * **Filename Strategy:**
 * - Pattern: {fieldname}-{timestamp}-{random}.{ext}
 * - Example: avatar-1703001234567-987654321.jpg
 * - Ensures uniqueness to prevent overwrites
 * - Sanitizes extension to prevent path traversal (removes ../)
 */
const storage = multer.diskStorage({
  destination: (_req, file, cb) => {
    const subfolder = file.mimetype.startsWith("image/")
      ? "images"
      : "documents";
    const dest = path.join(uploadDir, subfolder);

    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }

    cb(null, dest);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    // Sanitize extension to prevent path traversal
    const ext = path
      .extname(file.originalname)
      .replace(/[^a-zA-Z0-9.]/g, "")
      .toLowerCase();
    const sanitizedExt = ext.startsWith(".") ? ext : "";
    cb(null, file.fieldname + "-" + uniqueSuffix + sanitizedExt);
  },
});

/**
 * Multer File Filter
 *
 * First-pass MIME type validation before file is saved.
 * Rejects disallowed file types immediately to save processing.
 *
 * **Allowed File Types:**
 * - Images: Configured via ALLOWED_IMAGE_TYPES (default: image/jpeg, image/png, image/webp, image/gif)
 * - Documents: application/pdf only
 *
 * **Note:**
 * This is not sufficient security alone - MIME types can be spoofed.
 * Magic byte verification happens after upload (see verifyFileType middleware).
 */
const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  const isImage = file.mimetype.startsWith("image/");
  const isDocument = file.mimetype === "application/pdf";

  if (isImage) {
    if (env.ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new AppError(
          400,
          `Invalid image type. Allowed types: ${env.ALLOWED_IMAGE_TYPES.join(", ")}`,
        ),
      );
    }
  } else if (isDocument) {
    if (env.ALLOWED_DOC_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new AppError(
          400,
          `Invalid document type. Allowed types: ${env.ALLOWED_DOC_TYPES.join(", ")}`,
        ),
      );
    }
  } else {
    cb(
      new AppError(400, "Invalid file type. Only images and PDFs are allowed."),
    );
  }
};

// Multer upload instance
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: env.MAX_FILE_SIZE,
  },
});

// Upload controller
export class UploadController {
  async uploadImage(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        throw new AppError(400, "No file uploaded");
      }

      // Magic-byte validation: verify actual file type
      const fileType = await FileType.fromFile(req.file.path);

      if (!fileType) {
        fs.unlinkSync(req.file.path);
        throw new AppError(400, "Unable to verify file type");
      }

      const isValidImage = env.ALLOWED_IMAGE_TYPES.includes(fileType.mime);
      const isValidDoc = env.ALLOWED_DOC_TYPES.includes(fileType.mime);

      if (!isValidImage && !isValidDoc) {
        fs.unlinkSync(req.file.path);
        throw new AppError(
          400,
          `File type ${fileType.mime} not allowed. Allowed: ${[...env.ALLOWED_IMAGE_TYPES, ...env.ALLOWED_DOC_TYPES].join(", ")}`,
        );
      }

      // Malware scan
      const scanResult = await malwareService.scanFile(req.file.path);

      if (!scanResult.clean) {
        fs.unlinkSync(req.file.path);
        logger.security({
          type: "upload",
          action: "malware_detected",
          details: {
            filename: req.file.originalname,
            threats: scanResult.threats,
            provider: scanResult.provider,
          },
        });
        throw new AppError(
          400,
          "File failed security scan: potential threat detected",
        );
      }

      // Upload to storage (local, S3, or R2)
      const subfolder = fileType.mime.startsWith("image/")
        ? "images"
        : "documents";
      const uploadResult = await storageService.upload(req.file.path, {
        filename: req.file.filename,
        mimetype: fileType.mime,
        subfolder,
      });

      res.json({
        success: true,
        data: {
          filename: uploadResult.key.split("/").pop(),
          originalname: req.file.originalname,
          mimetype: uploadResult.mimetype,
          size: uploadResult.size,
          url: uploadResult.url,
          key: uploadResult.key,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async uploadMultiple(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        throw new AppError(400, "No files uploaded");
      }

      // Validate all files with magic-byte detection and malware scanning
      const validatedFiles = [];
      for (const file of req.files) {
        const fileType = await FileType.fromFile(file.path);

        if (!fileType) {
          // Clean up all uploaded files if validation fails
          req.files.forEach(
            (f) => fs.existsSync(f.path) && fs.unlinkSync(f.path),
          );
          throw new AppError(
            400,
            `Unable to verify file type for ${file.originalname}`,
          );
        }

        const isValidImage = env.ALLOWED_IMAGE_TYPES.includes(fileType.mime);
        const isValidDoc = env.ALLOWED_DOC_TYPES.includes(fileType.mime);

        if (!isValidImage && !isValidDoc) {
          req.files.forEach(
            (f) => fs.existsSync(f.path) && fs.unlinkSync(f.path),
          );
          throw new AppError(
            400,
            `File type ${fileType.mime} not allowed for ${file.originalname}`,
          );
        }

        // Malware scan
        const scanResult = await malwareService.scanFile(file.path);

        if (!scanResult.clean) {
          req.files.forEach(
            (f) => fs.existsSync(f.path) && fs.unlinkSync(f.path),
          );
          logger.security({
            type: "upload",
            action: "malware_detected",
            details: {
              filename: file.originalname,
              threats: scanResult.threats,
              provider: scanResult.provider,
            },
          });
          throw new AppError(
            400,
            `File ${file.originalname} failed security scan`,
          );
        }

        // Upload to storage
        const subfolder = fileType.mime.startsWith("image/")
          ? "images"
          : "documents";
        const uploadResult = await storageService.upload(file.path, {
          filename: file.filename,
          mimetype: fileType.mime,
          subfolder,
        });

        validatedFiles.push({
          filename: uploadResult.key.split("/").pop(),
          originalname: file.originalname,
          mimetype: uploadResult.mimetype,
          size: uploadResult.size,
          url: uploadResult.url,
          key: uploadResult.key,
        });
      }

      res.json({
        success: true,
        data: validatedFiles,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteFile(req: Request, res: Response, next: NextFunction) {
    try {
      const { filename, type } = req.params;

      // Whitelist type to prevent directory traversal
      if (type !== "images" && type !== "documents") {
        throw new AppError(
          400,
          'Invalid file type. Must be "images" or "documents"',
        );
      }

      // Sanitize filename: reject any path separators or traversal attempts
      if (
        !filename ||
        filename.includes("/") ||
        filename.includes("\\") ||
        filename.includes("..") ||
        filename.includes("%2f") ||
        filename.includes("%2F") ||
        filename.includes("%5c") ||
        filename.includes("%5C")
      ) {
        throw new AppError(400, "Invalid filename");
      }

      const key = `${type}/${filename}`;

      // Check if file exists
      const exists = await storageService.exists(key);
      if (!exists) {
        throw new AppError(404, "File not found");
      }

      // Delete from storage
      await storageService.delete(key);

      res.json({
        success: true,
        message: "File deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  }
}
