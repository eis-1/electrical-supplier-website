import { prisma } from "../config/db";
import { logger } from "./logger";
import { Request } from "express";

/**
 * Audit Log Service
 *
 * Automatically tracks admin actions for security and compliance.
 * All CRUD operations on sensitive resources are logged.
 */

export interface AuditLogData {
  adminId: string;
  action: string; // e.g., 'product.create', 'quote.update', 'admin.delete'
  resource?: string; // Resource type (product, quote, admin, etc.)
  resourceId?: string; // ID of affected resource
  changes?: any; // Before/after changes
  ipAddress?: string;
  userAgent?: string;
  status?: "success" | "failure";
  errorMsg?: string;
  metadata?: any; // Additional context
}

class AuditLogService {
  /**
   * Create audit log entry
   */
  async log(data: AuditLogData): Promise<void> {
    try {
      // Prepare changes as JSON string
      const changesJson = data.changes ? JSON.stringify(data.changes) : null;
      const metadataJson = data.metadata ? JSON.stringify(data.metadata) : null;

      // Create audit log entry
      await prisma.auditLog.create({
        data: {
          adminId: data.adminId,
          action: data.action,
          resource: data.resource || null,
          resourceId: data.resourceId || null,
          changes: changesJson,
          ipAddress: data.ipAddress || null,
          userAgent: data.userAgent || null,
          status: data.status || "success",
          errorMsg: data.errorMsg || null,
          metadata: metadataJson,
        },
      });

      // Also log to security logger
      logger.audit(data.action, data.adminId, {
        resource: data.resource,
        resourceId: data.resourceId,
        status: data.status || "success",
      });
    } catch (error) {
      // Don't throw errors - audit logging should not break app functionality
      logger.error("Failed to create audit log", error, {
        action: data.action,
        adminId: data.adminId,
      });
    }
  }

  /**
   * Log successful action
   */
  async logSuccess(
    adminId: string,
    action: string,
    resource: string,
    resourceId: string,
    changes?: any,
    req?: Request,
  ): Promise<void> {
    await this.log({
      adminId,
      action,
      resource,
      resourceId,
      changes,
      ipAddress: req?.ip,
      userAgent: req?.get("user-agent"),
      status: "success",
    });
  }

  /**
   * Log failed action
   */
  async logFailure(
    adminId: string,
    action: string,
    resource: string,
    errorMsg: string,
    req?: Request,
  ): Promise<void> {
    await this.log({
      adminId,
      action,
      resource,
      ipAddress: req?.ip,
      userAgent: req?.get("user-agent"),
      status: "failure",
      errorMsg,
    });
  }

  /**
   * Get audit logs with filtering and pagination
   */
  async getLogs(options: {
    adminId?: string;
    action?: string;
    resource?: string;
    status?: "success" | "failure";
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const {
      adminId,
      action,
      resource,
      status,
      startDate,
      endDate,
      page = 1,
      limit = 50,
    } = options;

    const where: any = {};

    if (adminId) where.adminId = adminId;
    if (action) where.action = { contains: action };
    if (resource) where.resource = resource;
    if (status) where.status = status;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          admin: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      logs: logs.map((log) => ({
        ...log,
        changes: log.changes ? JSON.parse(log.changes) : null,
        metadata: log.metadata ? JSON.parse(log.metadata) : null,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get recent activity for an admin
   */
  async getAdminActivity(adminId: string, limit = 20) {
    const logs = await prisma.auditLog.findMany({
      where: { adminId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return logs.map((log) => ({
      ...log,
      changes: log.changes ? JSON.parse(log.changes) : null,
      metadata: log.metadata ? JSON.parse(log.metadata) : null,
    }));
  }

  /**
   * Get activity statistics
   */
  async getStats(adminId?: string, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const where: any = {
      createdAt: { gte: startDate },
    };
    if (adminId) where.adminId = adminId;

    const [total, byAction, byResource, byStatus] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.groupBy({
        by: ["action"],
        where,
        _count: true,
        orderBy: { _count: { action: "desc" } },
        take: 10,
      }),
      prisma.auditLog.groupBy({
        by: ["resource"],
        where: { ...where, resource: { not: null } },
        _count: true,
        orderBy: { _count: { resource: "desc" } },
      }),
      prisma.auditLog.groupBy({
        by: ["status"],
        where,
        _count: true,
      }),
    ]);

    return {
      total,
      byAction: byAction.map((item) => ({
        action: item.action,
        count: item._count,
      })),
      byResource: byResource.map((item) => ({
        resource: item.resource,
        count: item._count,
      })),
      byStatus: byStatus.map((item) => ({
        status: item.status,
        count: item._count,
      })),
    };
  }

  /**
   * Clean up old audit logs (for data retention compliance)
   */
  async cleanup(olderThanDays = 365) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await prisma.auditLog.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
      },
    });

    logger.info(
      `Audit log cleanup: deleted ${result.count} logs older than ${olderThanDays} days`,
    );
    return result.count;
  }
}

export const auditLogService = new AuditLogService();
