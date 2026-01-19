import { Router } from "express";
import { AuthController } from "./controller";
import { validate } from "../../middlewares/validation.middleware";
import { loginValidation } from "./dto";
import {
  authLimiter,
  twoFactorLimiter,
} from "../../middlewares/rateLimit.middleware";
import twoFactorRoutes from "./twoFactor.routes";
import {
  setCsrfToken,
  validateCsrfToken,
} from "../../middlewares/csrf.middleware";

const router = Router();
const controller = new AuthController();

// POST /api/v1/auth/login
router.post(
  "/login",
  authLimiter,
  validate(loginValidation),
  setCsrfToken,
  controller.login,
);

// POST /api/v1/auth/verify
router.post("/verify", controller.verify);

// POST /api/v1/auth/refresh - Refresh access token using HttpOnly cookie
router.post("/refresh", validateCsrfToken, controller.refresh);

// POST /api/v1/auth/logout - Clear refresh token cookie
router.post("/logout", validateCsrfToken, controller.logout);

// POST /api/v1/auth/verify-2fa - Verify 2FA code after login (strict rate limiting)
router.post(
  "/verify-2fa",
  twoFactorLimiter,
  setCsrfToken,
  controller.verify2FA,
);

// 2FA routes
router.use("/2fa", twoFactorRoutes);

export default router;
