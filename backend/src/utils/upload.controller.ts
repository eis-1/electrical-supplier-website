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

// Ensure upload directory exists
const uploadDir = path.resolve(env.UPLOAD_DIR);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Storage configuration
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

// File filter
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
