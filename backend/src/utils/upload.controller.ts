import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { env } from '../config/env';
import { AppError } from '../middlewares/error.middleware';

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
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
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

      const fileUrl = `/uploads/${req.file.mimetype.startsWith('image/') ? 'images' : 'documents'}/${req.file.filename}`;

      res.json({
        success: true,
        data: {
          filename: req.file.filename,
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
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

      const filesData = req.files.map((file) => ({
        filename: file.filename,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        url: `/uploads/${file.mimetype.startsWith('image/') ? 'images' : 'documents'}/${file.filename}`,
      }));

      res.json({
        success: true,
        data: filesData,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteFile(req: Request, res: Response, next: NextFunction) {
    try {
      const { filename, type } = req.params;
      const filePath = path.join(uploadDir, type, filename);

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
