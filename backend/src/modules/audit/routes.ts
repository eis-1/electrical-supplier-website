import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { authorizePermission } from "../../middlewares/rbac.middleware";
import { auditLogController } from "./controller";

const router = Router();

// All audit log routes require authentication
router.use(authMiddleware);

/**
 * @route   GET /api/v1/audit-logs
 * @desc    Get audit logs with filtering
 * @access  Superadmin only
 */
router.get(
  "/",
  authorizePermission("audit", "read"),
  auditLogController.getLogs,
);

/**
 * @route   GET /api/v1/audit-logs/stats
 * @desc    Get audit log statistics
 * @access  Superadmin only
 */
router.get(
  "/stats",
  authorizePermission("audit", "read"),
  auditLogController.getStats,
);

/**
 * @route   GET /api/v1/audit-logs/admin/:adminId
 * @desc    Get activity for specific admin
 * @access  Superadmin only
 */
router.get(
  "/admin/:adminId",
  authorizePermission("audit", "read"),
  auditLogController.getAdminActivity,
);

/**
 * @route   GET /api/v1/audit-logs/me
 * @desc    Get current admin's activity
 * @access  Authenticated admin
 */
router.get("/me", auditLogController.getMyActivity);

export default router;
