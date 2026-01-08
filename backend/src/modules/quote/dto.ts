import { body } from 'express-validator';

export const createQuoteValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('company')
    .optional()
    .trim()
    .isLength({ max: 150 })
    .withMessage('Company name must not exceed 150 characters'),
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/)
    .withMessage('Please provide a valid phone number'),
  body('whatsapp')
    .optional()
    .trim()
    .matches(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/)
    .withMessage('Please provide a valid WhatsApp number'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('productName')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Product name must not exceed 255 characters'),
  body('quantity')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Quantity must not exceed 50 characters'),
  body('projectDetails')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Project details must not exceed 1000 characters'),
];

export const updateQuoteValidation = [
  body('status')
    .optional()
    .isIn(['new', 'contacted', 'quoted', 'closed'])
    .withMessage('Invalid status value'),
  body('notes')
    .optional()
    .trim(),
];
