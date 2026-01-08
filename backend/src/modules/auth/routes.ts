import { Router } from 'express';
import { AuthController } from './controller';
import { validate } from '../../middlewares/validation.middleware';
import { loginValidation } from './dto';
import { authLimiter } from '../../middlewares/rateLimit.middleware';

const router = Router();
const controller = new AuthController();

// POST /api/v1/auth/login
router.post('/login', authLimiter, validate(loginValidation), controller.login);

// POST /api/v1/auth/verify
router.post('/verify', controller.verify);

export default router;
