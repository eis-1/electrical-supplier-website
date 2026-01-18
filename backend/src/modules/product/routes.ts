import { Router } from 'express';
import { ProductController } from './controller';
import { authenticateAdmin } from '../../middlewares/auth.middleware';
import { authorizePermission } from '../../middlewares/rbac.middleware';
import { validate } from '../../middlewares/validation.middleware';
import { createProductValidation, updateProductValidation } from './dto';

const router = Router();
const controller = new ProductController();

// Public routes
router.get('/', controller.getAll);
router.get('/:slug', controller.getBySlug);

// Admin routes
router.post('/', authenticateAdmin, authorizePermission('product', 'create'), validate(createProductValidation), controller.create);
router.put('/:id', authenticateAdmin, authorizePermission('product', 'update'), validate(updateProductValidation), controller.update);
router.delete('/:id', authenticateAdmin, authorizePermission('product', 'delete'), controller.delete);

export default router;
