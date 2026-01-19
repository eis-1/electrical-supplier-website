import { Response, NextFunction } from "express";
import { ApiResponse } from "../utils/response";
import { AuthRequest } from "./auth.middleware";

/**
 * Role-Based Access Control (RBAC) Middleware
 * Ensures authenticated admin has required role(s) or permission(s)
 */

export type AdminRole = "superadmin" | "admin" | "editor" | "viewer";

export interface Permission {
  resource: string; // e.g., 'product', 'quote', 'category', 'brand'
  action: "create" | "read" | "update" | "delete" | "manage";
}

/**
 * Role hierarchy and permissions mapping
 * Higher roles inherit permissions from lower roles
 */
const ROLE_PERMISSIONS: Record<AdminRole, Permission[]> = {
  superadmin: [
    { resource: "*", action: "manage" }, // Full access to everything
  ],
  admin: [
    { resource: "product", action: "manage" },
    { resource: "quote", action: "manage" },
    { resource: "category", action: "manage" },
    { resource: "brand", action: "manage" },
    { resource: "admin", action: "read" }, // Can view other admins but not modify
    { resource: "audit", action: "read" }, // Can view audit logs
  ],
  editor: [
    { resource: "product", action: "create" },
    { resource: "product", action: "read" },
    { resource: "product", action: "update" },
    { resource: "quote", action: "read" },
    { resource: "quote", action: "update" },
    { resource: "category", action: "read" },
    { resource: "brand", action: "read" },
  ],
  viewer: [
    { resource: "product", action: "read" },
    { resource: "quote", action: "read" },
    { resource: "category", action: "read" },
    { resource: "brand", action: "read" },
  ],
};

/**
 * Check if admin role has required permission
 */
function hasPermission(adminRole: string, required: Permission): boolean {
  const role = adminRole as AdminRole;
  const permissions = ROLE_PERMISSIONS[role] || [];

  return permissions.some(
    (p) =>
      // Wildcard resource grants all permissions
      (p.resource === "*" && p.action === "manage") ||
      // Exact match
      (p.resource === required.resource && p.action === required.action) ||
      // manage action includes all other actions
      (p.resource === required.resource && p.action === "manage"),
  );
}

/**
 * Middleware: Require specific role(s)
 *
 * @example
 * router.delete('/products/:id', authenticateAdmin, authorizeRoles('superadmin', 'admin'), deleteProduct);
 */
export function authorizeRoles(...allowedRoles: AdminRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.admin) {
      ApiResponse.unauthorized(res, "Authentication required");
      return;
    }

    const adminRole = req.admin.role as AdminRole;

    if (!allowedRoles.includes(adminRole)) {
      ApiResponse.forbidden(
        res,
        `Access denied. Required role: ${allowedRoles.join(" or ")}`,
      );
      return;
    }

    next();
  };
}

/**
 * Middleware: Require specific permission (resource + action)
 * More granular than role-based; recommended for fine-grained control
 *
 * @example
 * router.post('/products', authenticateAdmin, authorizePermission('product', 'create'), createProduct);
 * router.delete('/products/:id', authenticateAdmin, authorizePermission('product', 'delete'), deleteProduct);
 */
export function authorizePermission(
  resource: string,
  action: Permission["action"],
) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.admin) {
      ApiResponse.unauthorized(res, "Authentication required");
      return;
    }

    const adminRole = req.admin.role;
    const requiredPermission: Permission = { resource, action };

    if (!hasPermission(adminRole, requiredPermission)) {
      ApiResponse.forbidden(
        res,
        `Access denied. Required permission: ${resource}:${action}`,
      );
      return;
    }

    next();
  };
}

/**
 * Middleware: Require ANY of the specified permissions (OR logic)
 * Useful when an endpoint can be accessed by multiple permission sets
 *
 * @example
 * router.get('/dashboard', authenticateAdmin, authorizeAnyPermission(
 *   { resource: 'product', action: 'read' },
 *   { resource: 'quote', action: 'read' }
 * ), getDashboard);
 */
export function authorizeAnyPermission(...permissions: Permission[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.admin) {
      ApiResponse.unauthorized(res, "Authentication required");
      return;
    }

    const adminRole = req.admin.role;
    const hasAnyPermission = permissions.some((p) =>
      hasPermission(adminRole, p),
    );

    if (!hasAnyPermission) {
      const permDesc = permissions
        .map((p) => `${p.resource}:${p.action}`)
        .join(" or ");
      ApiResponse.forbidden(
        res,
        `Access denied. Required permission: ${permDesc}`,
      );
      return;
    }

    next();
  };
}

/**
 * Helper: Get all permissions for a role (useful for debugging/admin UI)
 */
export function getRolePermissions(role: AdminRole): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Helper: Check if user can perform action (for use in service layer)
 */
export function canPerform(
  adminRole: string,
  resource: string,
  action: Permission["action"],
): boolean {
  return hasPermission(adminRole, { resource, action });
}
