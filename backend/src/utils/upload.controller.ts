import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import FileType from 'file-type';
import { env } from '../config/env';
import { AppError } from '../middlewares/error.middleware';
import { logger } from './logger';

// Ensure upload directory exists
const uploadDir = path.resolve(env.UPLOAD_DIR);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Storage configuration
const storage = multer.diskStorage({
  destination: (_req, file, cb) => {
    const subfolder = file.mimetype.startsWith('image/') ? 'images' : 'documents';
    const dest = path.join(uploadDir, subfolder);
    
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    
    cb(null, dest);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    // Sanitize extension to prevent path traversal
    const ext = path.extname(file.originalname).replace(/[^a-zA-Z0-9.]/g, '').toLowerCase();
    const sanitizedExt = ext.startsWith('.') ? ext : '';
    cb(null, file.fieldname + '-' + uniqueSuffix + sanitizedExt);
  },
});

// File filter
const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const isImage = file.mimetype.startsWith('image/');
  const isDocument = file.mimetype === 'application/pdf';

  if (isImage) {
    if (env.ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError(400, `Invalid image type. Allowed types: ${env.ALLOWED_IMAGE_TYPES.join(', ')}`));
    }
  } else if (isDocument) {
    if (env.ALLOWED_DOC_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError(400, `Invalid document type. Allowed types: ${env.ALLOWED_DOC_TYPES.join(', ')}`));
    }
  } else {
    cb(new AppError(400, 'Invalid file type. Only images and PDFs are allowed.'));
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
        throw new AppError(400, 'No file uploaded');
      }

      // Magic-byte validation: verify actual file type
      const fileType = await FileType.fromFile(req.file.path);
      
      if (!fileType) {
        fs.unlinkSync(req.file.path);
        throw new AppError(400, 'Unable to verify file type');
      }

      const isValidImage = env.ALLOWED_IMAGE_TYPES.includes(fileType.mime);
      const isValidDoc = env.ALLOWED_DOC_TYPES.includes(fileType.mime);

      if (!isValidImage && !isValidDoc) {
        fs.unlinkSync(req.file.path);
        throw new AppError(
          400,
          `File type ${fileType.mime} not allowed. Allowed: ${[...env.ALLOWED_IMAGE_TYPES, ...env.ALLOWED_DOC_TYPES].join(', ')}`
        );
      }

      const fileUrl = `/uploads/${fileType.mime.startsWith('image/') ? 'images' : 'documents'}/${req.file.filename}`;

      res.json({
        success: true,
        data: {
          filename: req.file.filename,
          originalname: req.file.originalname,
          mimetype: fileType.mime,
          size: req.file.size,
          url: fileUrl,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async uploadMultiple(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        throw new AppError(400, 'No files uploaded');
      }

      // Validate all files with magic-byte detection
      const validatedFiles = [];
      for (const file of req.files) {
        const fileType = await FileType.fromFile(file.path);
        
        if (!fileType) {
          // Clean up all uploaded files if validation fails
          req.files.forEach(f => fs.existsSync(f.path) && fs.unlinkSync(f.path));
          throw new AppError(400, `Unable to verify file type for ${file.originalname}`);
        }

        const isValidImage = env.ALLOWED_IMAGE_TYPES.includes(fileType.mime);
        const isValidDoc = env.ALLOWED_DOC_TYPES.includes(fileType.mime);

        if (!isValidImage && !isValidDoc) {
          req.files.forEach(f => fs.existsSync(f.path) && fs.unlinkSync(f.path));
          throw new AppError(
            400,
            `File type ${fileType.mime} not allowed for ${file.originalname}`
          );
        }

        validatedFiles.push({
          filename: file.filename,
          originalname: file.originalname,
          mimetype: fileType.mime,
          size: file.size,
          url: `/uploads/${fileType.mime.startsWith('image/') ? 'images' : 'documents'}/${file.filename}`,
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
      if (type !== 'images' && type !== 'documents') {
        throw new AppError(400, 'Invalid file type. Must be "images" or "documents"');
      }

      // Sanitize filename: reject any path separators or traversal attempts
      if (!filename || 
          filename.includes('/') || 
          filename.includes('\\') || 
          filename.includes('..') || 
          filename.includes('%2f') || 
          filename.includes('%2F') ||
          filename.includes('%5c') ||
          filename.includes('%5C')) {
        throw new AppError(400, 'Invalid filename');
      }

      const filePath = path.join(uploadDir, type, filename);

      // Ensure the resolved path is still within uploadDir (defense in depth)
      const resolvedPath = path.resolve(filePath);
      const resolvedUploadDir = path.resolve(uploadDir);
      if (!resolvedPath.startsWith(resolvedUploadDir)) {
        logger.security({
          type: 'upload',
          action: 'path_traversal_attempt',
          details: { type, filename, resolvedPath },
        });
        throw new AppError(400, 'Invalid file path');
      }

      if (!fs.existsSync(filePath)) {
        throw new AppError(404, 'File not found');
      }

      fs.unlinkSync(filePath);

      res.json({
        success: true,
        message: 'File deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}
