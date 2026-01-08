import { body } from 'express-validator';

export const createBrandValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Brand name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Brand name must be between 2 and 100 characters'),
  body('slug')
    .trim()
    .notEmpty()
    .withMessage('Slug is required')
    .matches(/^[a-z0-9-]+$/)
    .withMessage('Slug must contain only lowercase letters, numbers, and hyphens'),
  body('logo')
    .optional()
    .trim(),
  body('description')
    .optional()
    .trim(),
  body('website')
    .optional()
    .trim()
    .isURL()
    .withMessage('Must be a valid URL'),
  body('isAuthorized')
    .optional()
    .isBoolean()
    .withMessage('isAuthorized must be a boolean'),
  body('displayOrder')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Display order must be a positive integer'),
];

export const updateBrandValidation = createBrandValidation;
