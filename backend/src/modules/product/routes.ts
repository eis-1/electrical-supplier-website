import { Router } from 'express';
import { ProductController } from './controller';
import { authenticateAdmin } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validation.middleware';
import { createProductValidation, updateProductValidation } from './dto';

const router = Router();
const controller = new ProductController();

// Public routes
router.get('/', controller.getAll);
router.get('/:slug', controller.getBySlug);

// Admin routes
router.post('/', authenticateAdmin, validate(createProductValidation), controller.create);
router.put('/:id', authenticateAdmin, validate(updateProductValidation), controller.update);
router.delete('/:id', authenticateAdmin, controller.delete);

export default router;
