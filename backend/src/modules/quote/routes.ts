import { Router } from 'express';
import { QuoteController } from './controller';
import { authenticateAdmin } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validation.middleware';
import { createQuoteValidation, updateQuoteValidation } from './dto';
import { quoteLimiter } from '../../middlewares/rateLimit.middleware';

const router = Router();
const controller = new QuoteController();

// Public route - Submit quote (with strict rate limiting)
router.post('/', quoteLimiter, validate(createQuoteValidation), controller.create);

// Admin routes
router.get('/', authenticateAdmin, controller.getAll);
router.get('/:id', authenticateAdmin, controller.getById);
router.put('/:id', authenticateAdmin, validate(updateQuoteValidation), controller.update);
router.delete('/:id', authenticateAdmin, controller.delete);

export default router;
