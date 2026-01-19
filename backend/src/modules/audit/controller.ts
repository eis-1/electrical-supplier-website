import { Response } from "express";
import { AuthRequest } from "../../middlewares/auth.middleware";
import { ApiResponse } from "../../utils/response";
import { auditLogService } from "../../utils/auditLog.service";

class AuditLogController {
  /**
   * Get audit logs with filtering and pagination
   */
  async getLogs(req: AuthRequest, res: Response) {
    try {
      const {
        adminId,
        action,
        resource,
        status,
        startDate,
        endDate,
        page = "1",
        limit = "50",
      } = req.query;

      const options = {
        adminId: adminId as string | undefined,
        action: action as string | undefined,
        resource: resource as string | undefined,
        status: status as "success" | "failure" | undefined,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        page: parseInt(page as string, 10),
        limit: Math.min(parseInt(limit as string, 10), 100), // Max 100 per page
      };

      const result = await auditLogService.getLogs(options);
      ApiResponse.success(res, result, "Audit logs retrieved successfully");
    } catch {
      ApiResponse.error(res, "Failed to retrieve audit logs", 500);
    }
  }

  /**
   * Get audit log statistics
   */
  async getStats(req: AuthRequest, res: Response) {
    try {
      const { adminId, days = "30" } = req.query;

      const stats = await auditLogService.getStats(
        adminId as string | undefined,
        parseInt(days as string, 10),
      );

      ApiResponse.success(
        res,
        stats,
        "Audit statistics retrieved successfully",
      );
    } catch {
      ApiResponse.error(res, "Failed to retrieve audit statistics", 500);
    }
  }

  /**
   * Get activity for a specific admin
   */
  async getAdminActivity(req: AuthRequest, res: Response) {
    try {
      const { adminId } = req.params;
      const { limit = "20" } = req.query;

      const activity = await auditLogService.getAdminActivity(
        adminId,
        parseInt(limit as string, 10),
      );

      ApiResponse.success(
        res,
        { activity },
        "Admin activity retrieved successfully",
      );
    } catch {
      ApiResponse.error(res, "Failed to retrieve admin activity", 500);
    }
  }

  /**
   * Get current admin's activity
   */
  async getMyActivity(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.admin) {
        ApiResponse.unauthorized(res, "Authentication required");
        return;
      }

      const { limit = "20" } = req.query;

      const activity = await auditLogService.getAdminActivity(
        req.admin.id,
        parseInt(limit as string, 10),
      );

      ApiResponse.success(
        res,
        { activity },
        "Your activity retrieved successfully",
      );
    } catch {
      ApiResponse.error(res, "Failed to retrieve your activity", 500);
    }
  }
}

export const auditLogController = new AuditLogController();
