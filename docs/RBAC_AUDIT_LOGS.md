# RBAC & Audit Logs Documentation

Complete guide to Role-Based Access Control and audit logging in the Electrical Supplier API.

## Table of Contents

1. [Overview](#overview)
2. [Role-Based Access Control (RBAC)](#role-based-access-control-rbac)
3. [Audit Logging](#audit-logging)
4. [API Endpoints](#api-endpoints)
5. [Implementation Guide](#implementation-guide)
6. [Security & Compliance](#security--compliance)

---

## Overview

The application implements a comprehensive security and audit system with:

- **4-tier role hierarchy**: superadmin → admin → editor → viewer
- **Automatic audit logging**: All admin actions tracked
- **Granular permissions**: Resource-based access control
- **Compliance-ready**: Full audit trail for security compliance

---

## Role-Based Access Control (RBAC)

### Role Hierarchy

```
superadmin (Full Control)
    ↓
admin (Content + Audit Access)
    ↓
editor (Content Management)
    ↓
viewer (Read-Only)
```

### Role Permissions Matrix

| Resource       | superadmin | admin | editor                       | viewer |
| -------------- | ---------- | ----- | ---------------------------- | ------ |
| **Products**   | Full       | Full  | Create, Read, Update, Delete | Read   |
| **Categories** | Full       | Full  | Read                         | Read   |
| **Brands**     | Full       | Full  | Read                         | Read   |
| **Quotes**     | Full       | Full  | Read, Update                 | Read   |
| **Admins**     | Full       | Read  | -                            | -      |
| **Audit Logs** | Full       | Read  | -                            | -      |

### Role Definitions

#### 1. Superadmin

- **Purpose**: System owner, full control
- **Permissions**: Everything (`*:manage`)
- **Use Case**: Platform owner, can manage all admins
- **Count**: 1-2 accounts recommended

#### 2. Admin

- **Purpose**: Content manager with audit visibility
- **Permissions**:
  - All content operations (products, categories, brands, quotes)
  - View audit logs (security oversight)
  - View other admins (team visibility)
- **Use Case**: Senior staff, department managers
- **Count**: 2-5 accounts typical

#### 3. Editor

- **Purpose**: Day-to-day content management
- **Permissions**:
  - Create, read, update products
  - Read, update quotes
  - Read categories and brands
- **Use Case**: Content team, customer service
- **Count**: Unlimited

#### 4. Viewer

- **Purpose**: Read-only access for reporting
- **Permissions**:
  - Read all content
  - No create, update, or delete
- **Use Case**: Analysts, auditors, trainees
- **Count**: Unlimited

### Permission Model

Permissions follow the pattern: `resource:action`

**Actions**:

- `create`: Create new resources
- `read`: View resources
- `update`: Modify existing resources
- `delete`: Remove resources
- `manage`: All of the above (admin-level)

**Resources**:

- `product`, `category`, `brand`, `quote`, `admin`, `audit`

---

## Audit Logging

### What Gets Logged?

**Automatically logged actions**:

- ✅ Product CRUD (create, update, delete)
- ✅ Category CRUD
- ✅ Brand CRUD
- ✅ Quote status changes
- ✅ Admin login/logout
- ✅ Admin CRUD (user management)
- ✅ Permission changes
- ✅ Failed actions (security alerts)

**Log Entry Fields**:

```typescript
{
  id: string;
  adminId: string;
  action: string;        // "product.create", "quote.update"
  resource: string;      // "product", "quote"
  resourceId: string;    // ID of affected resource
  changes: object;       // Before/after snapshot
  ipAddress: string;
  userAgent: string;
  status: "success" | "failure";
  errorMsg?: string;
  metadata?: object;
  createdAt: Date;
}
```

### Audit Log Lifecycle

1. **Capture**: Action triggered → Log entry created
2. **Store**: Persisted to database (SQLite/PostgreSQL)
3. **Query**: Searchable via API with filtering
4. **Retention**: Auto-cleanup after 365 days (configurable)

### Benefits

- **Security**: Detect unauthorized access attempts
- **Compliance**: Meet regulatory requirements (SOC 2, ISO 27001)
- **Troubleshooting**: Track down when/who made changes
- **Accountability**: Clear ownership of actions

---

## API Endpoints

### Audit Log Endpoints

All audit log endpoints require authentication. Most require `superadmin` or `admin` role.

#### 1. Get Audit Logs (with filtering)

```http
GET /api/v1/audit-logs?page=1&limit=50
Authorization: Bearer <token>
```

**Query Parameters**:

- `adminId` (optional): Filter by specific admin
- `action` (optional): Filter by action type
- `resource` (optional): Filter by resource type
- `status` (optional): `success` or `failure`
- `startDate` (optional): ISO 8601 date
- `endDate` (optional): ISO 8601 date
- `page` (default: 1): Page number
- `limit` (default: 50, max: 100): Results per page

**Response**:

```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "abc123",
        "admin": {
          "id": "user123",
          "email": "admin@example.com",
          "name": "John Doe",
          "role": "admin"
        },
        "action": "product.create",
        "resource": "product",
        "resourceId": "prod456",
        "changes": {
          "before": null,
          "after": { "name": "New Product", "price": 100 }
        },
        "ipAddress": "192.168.1.1",
        "userAgent": "Mozilla/5.0...",
        "status": "success",
        "createdAt": "2026-01-19T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 1234,
      "totalPages": 25
    }
  }
}
```

**Access**: `superadmin` and `admin` only

#### 2. Get Audit Statistics

```http
GET /api/v1/audit-logs/stats?days=30
Authorization: Bearer <token>
```

**Query Parameters**:

- `adminId` (optional): Stats for specific admin
- `days` (default: 30): Time window

**Response**:

```json
{
  "success": true,
  "data": {
    "total": 1234,
    "byAction": [
      { "action": "product.update", "count": 456 },
      { "action": "quote.update", "count": 234 }
    ],
    "byResource": [
      { "resource": "product", "count": 567 },
      { "resource": "quote", "count": 345 }
    ],
    "byStatus": [
      { "status": "success", "count": 1200 },
      { "status": "failure", "count": 34 }
    ]
  }
}
```

**Access**: `superadmin` and `admin` only

#### 3. Get Admin Activity

```http
GET /api/v1/audit-logs/admin/:adminId?limit=20
Authorization: Bearer <token>
```

**Parameters**:

- `adminId`: Admin user ID

**Query Parameters**:

- `limit` (default: 20): Number of recent activities

**Response**: Array of recent actions by that admin

**Access**: `superadmin` and `admin` only

#### 4. Get My Activity

```http
GET /api/v1/audit-logs/me?limit=20
Authorization: Bearer <token>
```

**Query Parameters**:

- `limit` (default: 20): Number of recent activities

**Response**: Array of your recent actions

**Access**: All authenticated admins (view your own activity)

---

## Implementation Guide

### Using RBAC in Routes

#### Method 1: Role-based (Simple)

```typescript
import { authorizeRoles } from "../../middlewares/rbac.middleware";

// Only superadmin can access
router.delete(
  "/admins/:id",
  authMiddleware,
  authorizeRoles("superadmin"),
  deleteAdmin,
);

// Superadmin or admin can access
router.get(
  "/audit-logs",
  authMiddleware,
  authorizeRoles("superadmin", "admin"),
  getAuditLogs,
);
```

#### Method 2: Permission-based (Granular)

```typescript
import { authorizePermission } from "../../middlewares/rbac.middleware";

// Anyone with product:create permission
router.post(
  "/products",
  authMiddleware,
  authorizePermission("product", "create"),
  createProduct,
);

// Anyone with quote:update permission
router.put(
  "/quotes/:id",
  authMiddleware,
  authorizePermission("quote", "update"),
  updateQuote,
);
```

#### Method 3: Multiple permissions (OR logic)

```typescript
import { authorizeAnyPermission } from "../../middlewares/rbac.middleware";

// Anyone with ANY of these permissions
router.get(
  "/dashboard",
  authMiddleware,
  authorizeAnyPermission(
    { resource: "product", action: "read" },
    { resource: "quote", action: "read" },
  ),
  getDashboard,
);
```

### Adding Audit Logs to Controllers

#### Example: Product Create

```typescript
import { auditLogService } from '../../utils/auditLog.service';

async createProduct(req: AuthRequest, res: Response) {
  try {
    const product = await prisma.product.create({ ... });

    // Log successful action
    await auditLogService.logSuccess(
      req.admin!.id,
      'product.create',
      'product',
      product.id,
      { after: product }, // Changes (before/after)
      req
    );

    return ApiResponse.success(res, product);
  } catch (error) {
    // Log failed action
    await auditLogService.logFailure(
      req.admin!.id,
      'product.create',
      'product',
      error.message,
      req
    );

    throw error;
  }
}
```

#### Example: Product Update

```typescript
async updateProduct(req: AuthRequest, res: Response) {
  const { id } = req.params;

  // Get existing state
  const before = await prisma.product.findUnique({ where: { id } });

  // Update
  const after = await prisma.product.update({
    where: { id },
    data: req.body,
  });

  // Log with before/after
  await auditLogService.logSuccess(
    req.admin!.id,
    'product.update',
    'product',
    id,
    { before, after },
    req
  );

  return ApiResponse.success(res, after);
}
```

---

## Security & Compliance

### Best Practices

**1. Least Privilege Principle**

- ✅ Assign minimum required role
- ✅ Use `viewer` for read-only staff
- ✅ Use `editor` for content team
- ✅ Use `admin` only for senior staff
- ✅ Limit `superadmin` to 1-2 accounts

**2. Regular Audits**

- ✅ Review audit logs weekly
- ✅ Check for failed login attempts
- ✅ Verify admin access patterns
- ✅ Remove inactive admin accounts
- ✅ Rotate superadmin credentials

**3. Audit Log Retention**

```typescript
// Run monthly cleanup job
import { auditLogService } from "./utils/auditLog.service";

// Keep 1 year of logs (default: 365 days)
await auditLogService.cleanup(365);
```

**4. Monitoring & Alerts**

Set up alerts for:

- Multiple failed actions by same admin
- Unusual activity patterns
- Access from new IP addresses
- High-volume changes in short time

### Compliance Standards

This implementation supports:

**SOC 2 Type II**:

- ✅ Access control (RBAC)
- ✅ Audit trail (comprehensive logging)
- ✅ Change management (before/after snapshots)

**ISO 27001**:

- ✅ Access control (A.9)
- ✅ Logging and monitoring (A.12.4)
- ✅ User access management (A.9.2)

**GDPR**:

- ✅ Access logging (Article 30)
- ✅ Data change tracking
- ✅ Admin accountability

---

## Database Schema

### Admin Table

```sql
CREATE TABLE admins (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'editor', -- superadmin | admin | editor | viewer
  isActive BOOLEAN DEFAULT TRUE,
  twoFactorSecret TEXT,
  twoFactorEnabled BOOLEAN DEFAULT FALSE,
  backupCodes TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Audit Log Table

```sql
CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  adminId TEXT NOT NULL,
  action TEXT NOT NULL,
  resource TEXT,
  resourceId TEXT,
  changes TEXT, -- JSON
  ipAddress TEXT,
  userAgent TEXT,
  status TEXT DEFAULT 'success',
  errorMsg TEXT,
  metadata TEXT, -- JSON
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (adminId) REFERENCES admins(id) ON DELETE CASCADE
);

CREATE INDEX idx_audit_adminId ON audit_logs(adminId);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_resource ON audit_logs(resource);
CREATE INDEX idx_audit_createdAt ON audit_logs(createdAt);
```

---

## Examples

### Example 1: Create Editor Account

```bash
# Via admin panel or direct database
INSERT INTO admins (id, email, password, name, role)
VALUES (
  'uuid-here',
  'editor@example.com',
  '<bcrypt-hashed-password>',
  'Content Editor',
  'editor'
);
```

**What they can do**:

- ✅ Create/edit/delete products
- ✅ View and update quotes
- ✅ View categories and brands
- ❌ Cannot manage admins
- ❌ Cannot view audit logs

### Example 2: Query Failed Actions

```http
GET /api/v1/audit-logs?status=failure&days=7
Authorization: Bearer <superadmin-token>
```

**Use case**: Security review - check for unauthorized access attempts

### Example 3: Track Product Changes

```http
GET /api/v1/audit-logs?resource=product&resourceId=prod123
Authorization: Bearer <admin-token>
```

**Response**: All changes to product `prod123` with before/after snapshots

---

## Troubleshooting

### Issue: Permission Denied

**Symptom**: `403 Forbidden - Access denied. Required permission: product:create`

**Solution**:

1. Check admin role: `SELECT role FROM admins WHERE email = 'user@example.com'`
2. Verify permission matrix (see [Role Permissions](#role-permissions-matrix))
3. Update role if needed: `UPDATE admins SET role = 'editor' WHERE email = 'user@example.com'`

### Issue: Audit Logs Not Appearing

**Symptom**: Actions not logged

**Solution**:

1. Check `auditLogService.log()` is called in controller
2. Verify database table exists: `SELECT * FROM audit_logs LIMIT 1`
3. Check logs for errors: `grep "Failed to create audit log" production.log`

### Issue: Too Many Audit Logs

**Symptom**: Database size growing rapidly

**Solution**:

```typescript
// Run cleanup job (keep 6 months)
await auditLogService.cleanup(180);

// Or schedule with cron
// 0 0 1 * * - Run 1st of each month
```

---

## Summary

✅ **4-tier RBAC**: Superadmin, admin, editor, viewer  
✅ **Automatic audit logging**: All admin actions tracked  
✅ **Granular permissions**: Resource-based access control  
✅ **Compliance-ready**: SOC 2, ISO 27001, GDPR support  
✅ **Query & filter**: Powerful audit log API  
✅ **Security**: IP tracking, user agent, before/after snapshots

**Enterprise-grade access control and audit trail!** 🔐📊
