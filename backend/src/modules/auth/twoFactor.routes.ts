import { Router } from 'express';
import { TwoFactorController } from './twoFactor.controller';
import { authenticateAdmin } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validation.middleware';
import { twoFactorLimiter } from '../../middlewares/rateLimit.middleware';
import { body } from 'express-validator';

const router = Router();
const controller = new TwoFactorController();

// Validation schemas
const enableValidation = [
  body('token').isString().isLength({ min: 6, max: 6 }).withMessage('Token must be 6 digits'),
];

const disableValidation = [
  body('token').isString().isLength({ min: 6, max: 6 }).withMessage('Token must be 6 digits'),
];

const verifyValidation = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('token').isString().notEmpty().withMessage('Token is required'),
  body('useBackupCode').optional().isBoolean(),
];

// Protected routes (require authentication)
// GET /api/v1/auth/2fa/status
router.get('/status', authenticateAdmin, controller.status);

// POST /api/v1/auth/2fa/setup
router.post('/setup', authenticateAdmin, controller.setup);

// POST /api/v1/auth/2fa/enable
router.post('/enable', authenticateAdmin, validate(enableValidation), controller.enable);

// POST /api/v1/auth/2fa/disable
router.post('/disable', authenticateAdmin, validate(disableValidation), controller.disable);

// Public route (used during login)
// POST /api/v1/auth/2fa/verify
router.post('/verify', twoFactorLimiter, validate(verifyValidation), controller.verify);

export default router;
