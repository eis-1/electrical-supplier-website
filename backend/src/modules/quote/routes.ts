import { Router } from 'express';
import { QuoteController } from './controller';
import { authenticateAdmin } from '../../middlewares/auth.middleware';
import { authorizePermission } from '../../middlewares/rbac.middleware';
import { validate } from '../../middlewares/validation.middleware';
import { createQuoteValidation, updateQuoteValidation } from './dto';
import { quoteLimiter } from '../../middlewares/rateLimit.middleware';
import { quoteSpamGuard } from '../../middlewares/quoteSpam.middleware';
import { verifyCaptcha } from '../../middlewares/captcha.middleware';

const router = Router();
const controller = new QuoteController();

// Public route - Submit quote (with strict rate limiting + optional captcha)
router.post('/', quoteLimiter, verifyCaptcha, quoteSpamGuard, validate(createQuoteValidation), controller.create);

// Admin routes
router.get('/', authenticateAdmin, authorizePermission('quote', 'read'), controller.getAll);
router.get('/:id', authenticateAdmin, authorizePermission('quote', 'read'), controller.getById);
router.put('/:id', authenticateAdmin, authorizePermission('quote', 'update'), validate(updateQuoteValidation), controller.update);
router.delete('/:id', authenticateAdmin, authorizePermission('quote', 'delete'), controller.delete);

export default router;
