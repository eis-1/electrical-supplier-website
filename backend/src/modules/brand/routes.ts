import { Router } from 'express';
import { BrandController } from './controller';
import { authenticateAdmin } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validation.middleware';
import { createBrandValidation, updateBrandValidation } from './dto';

const router = Router();
const controller = new BrandController();

// Public routes
router.get('/', controller.getAll);
router.get('/:id', controller.getById);

// Admin routes
router.post('/', authenticateAdmin, validate(createBrandValidation), controller.create);
router.put('/:id', authenticateAdmin, validate(updateBrandValidation), controller.update);
router.delete('/:id', authenticateAdmin, controller.delete);

export default router;
