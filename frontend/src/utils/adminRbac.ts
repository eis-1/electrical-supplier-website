export type AdminRole = "superadmin" | "admin" | "editor" | "viewer";

export type PermissionAction = "create" | "read" | "update" | "delete" | "manage";

export interface Permission {
  resource: string;
  action: PermissionAction;
}

const ROLE_PERMISSIONS: Record<AdminRole, Permission[]> = {
  superadmin: [{ resource: "*", action: "manage" }],
  admin: [
    { resource: "product", action: "manage" },
    { resource: "quote", action: "manage" },
    { resource: "category", action: "manage" },
    { resource: "brand", action: "manage" },
    { resource: "admin", action: "read" },
    { resource: "audit", action: "read" },
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

function isAdminRole(value: unknown): value is AdminRole {
  return (
    value === "superadmin" ||
    value === "admin" ||
    value === "editor" ||
    value === "viewer"
  );
}

export function getAdminRoleFromUser(admin: any): AdminRole | null {
  const role = admin?.role;
  return isAdminRole(role) ? role : null;
}

export function can(
  role: AdminRole | null | undefined,
  resource: string,
  action: PermissionAction,
): boolean {
  if (!role) return false;
  const permissions = ROLE_PERMISSIONS[role] || [];

  return permissions.some((p) => {
    // Wildcard manage grants everything
    if (p.resource === "*" && p.action === "manage") return true;

    // Exact match
    if (p.resource === resource && p.action === action) return true;

    // manage action includes all other actions
    if (p.resource === resource && p.action === "manage") return true;

    return false;
  });
}
