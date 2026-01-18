import { body } from 'express-validator';

export const createProductValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Product name is required')
    .isLength({ min: 2, max: 255 })
    .withMessage('Product name must be between 2 and 255 characters'),
  // Slug is optional: if not provided, it will be generated from name/model.
  body('slug')
    .optional()
    .trim()
    .matches(/^[a-z0-9-]+$/)
    .withMessage('Slug must contain only lowercase letters, numbers, and hyphens'),
  body('model')
    .optional()
    .trim(),
  body('categoryId')
    .optional()
    .isUUID()
    .withMessage('Category ID must be a valid UUID'),
  body('brandId')
    .optional()
    .isUUID()
    .withMessage('Brand ID must be a valid UUID'),
  body('description')
    .optional()
    .trim(),
  body('keyFeatures')
    .optional()
    .trim(),
  body('image')
    .optional()
    .trim(),
  body('datasheetUrl')
    .optional()
    .trim(),
  body('isFeatured')
    .optional()
    .isBoolean()
    .withMessage('isFeatured must be a boolean'),
  body('specs')
    .optional()
    .isArray()
    .withMessage('Specs must be an array'),
];

export const updateProductValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Product name must be between 2 and 255 characters'),
  body('slug')
    .optional()
    .trim()
    .matches(/^[a-z0-9-]+$/)
    .withMessage('Slug must contain only lowercase letters, numbers, and hyphens'),
  body('model')
    .optional()
    .trim(),
  body('categoryId')
    .optional()
    .isUUID()
    .withMessage('Category ID must be a valid UUID'),
  body('brandId')
    .optional()
    .isUUID()
    .withMessage('Brand ID must be a valid UUID'),
  body('description')
    .optional()
    .trim(),
  body('keyFeatures')
    .optional()
    .trim(),
  body('image')
    .optional()
    .trim(),
  body('datasheetUrl')
    .optional()
    .trim(),
  body('isFeatured')
    .optional()
    .isBoolean()
    .withMessage('isFeatured must be a boolean'),
  body('specs')
    .optional()
    .isArray()
    .withMessage('Specs must be an array'),
];
