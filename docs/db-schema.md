# Database Schema

## Electrical Supplier Website

**Database**: PostgreSQL  
**ORM**: Prisma

---

## Tables Overview

1. **Admin** - Admin users for authentication
2. **Category** - Product categories
3. **Brand** - Product brands
4. **Product** - Main product catalog
5. **ProductSpec** - Detailed specifications for products
6. **QuoteRequest** - Customer quote submissions

---

## Table Definitions

### 1. Admin

| Field     | Type         | Constraints      | Description           |
| --------- | ------------ | ---------------- | --------------------- |
| id        | UUID         | PRIMARY KEY      | Unique identifier     |
| email     | VARCHAR(255) | UNIQUE, NOT NULL | Admin email           |
| password  | VARCHAR(255) | NOT NULL         | Hashed password       |
| name      | VARCHAR(100) | NOT NULL         | Admin name            |
| role      | VARCHAR(50)  | DEFAULT 'admin'  | Admin role            |
| isActive  | BOOLEAN      | DEFAULT true     | Active status         |
| createdAt | TIMESTAMP    | DEFAULT NOW()    | Creation timestamp    |
| updatedAt | TIMESTAMP    | DEFAULT NOW()    | Last update timestamp |

**Indexes**:

- `email` (unique)

---

### 2. Category

| Field        | Type         | Constraints      | Description           |
| ------------ | ------------ | ---------------- | --------------------- |
| id           | UUID         | PRIMARY KEY      | Unique identifier     |
| name         | VARCHAR(100) | UNIQUE, NOT NULL | Category name         |
| slug         | VARCHAR(100) | UNIQUE, NOT NULL | URL-friendly slug     |
| icon         | VARCHAR(255) | NULL             | Icon/image path       |
| description  | TEXT         | NULL             | Category description  |
| displayOrder | INTEGER      | DEFAULT 0        | Sort order            |
| isActive     | BOOLEAN      | DEFAULT true     | Active status         |
| createdAt    | TIMESTAMP    | DEFAULT NOW()    | Creation timestamp    |
| updatedAt    | TIMESTAMP    | DEFAULT NOW()    | Last update timestamp |

**Indexes**:

- `slug` (unique)
- `isActive`

---

### 3. Brand

| Field        | Type         | Constraints      | Description              |
| ------------ | ------------ | ---------------- | ------------------------ |
| id           | UUID         | PRIMARY KEY      | Unique identifier        |
| name         | VARCHAR(100) | UNIQUE, NOT NULL | Brand name               |
| slug         | VARCHAR(100) | UNIQUE, NOT NULL | URL-friendly slug        |
| logo         | VARCHAR(255) | NULL             | Logo image path          |
| description  | TEXT         | NULL             | Brand description        |
| website      | VARCHAR(255) | NULL             | Brand website URL        |
| isAuthorized | BOOLEAN      | DEFAULT true     | Authorized dealer status |
| displayOrder | INTEGER      | DEFAULT 0        | Sort order               |
| isActive     | BOOLEAN      | DEFAULT true     | Active status            |
| createdAt    | TIMESTAMP    | DEFAULT NOW()    | Creation timestamp       |
| updatedAt    | TIMESTAMP    | DEFAULT NOW()    | Last update timestamp    |

**Indexes**:

- `slug` (unique)
- `isActive`

---

### 4. Product

| Field        | Type         | Constraints      | Description                    |
| ------------ | ------------ | ---------------- | ------------------------------ |
| id           | UUID         | PRIMARY KEY      | Unique identifier              |
| name         | VARCHAR(255) | NOT NULL         | Product name                   |
| slug         | VARCHAR(255) | UNIQUE, NOT NULL | URL-friendly slug              |
| model        | VARCHAR(100) | NULL             | Model number                   |
| categoryId   | UUID         | FOREIGN KEY      | References Category.id         |
| brandId      | UUID         | FOREIGN KEY      | References Brand.id            |
| description  | TEXT         | NULL             | Product description            |
| keyFeatures  | TEXT         | NULL             | Key features (JSON or text)    |
| image        | VARCHAR(255) | NULL             | Main product image             |
| images       | TEXT         | NULL             | Additional images (JSON array) |
| datasheetUrl | VARCHAR(255) | NULL             | Datasheet PDF URL              |
| isActive     | BOOLEAN      | DEFAULT true     | Active status                  |
| isFeatured   | BOOLEAN      | DEFAULT false    | Featured product               |
| createdAt    | TIMESTAMP    | DEFAULT NOW()    | Creation timestamp             |
| updatedAt    | TIMESTAMP    | DEFAULT NOW()    | Last update timestamp          |

**Indexes**:

- `slug` (unique)
- `categoryId`
- `brandId`
- `isActive`

**Relations**:

- `categoryId` → Category.id (ON DELETE SET NULL)
- `brandId` → Brand.id (ON DELETE SET NULL)

---

### 5. ProductSpec

| Field        | Type         | Constraints   | Description           |
| ------------ | ------------ | ------------- | --------------------- |
| id           | UUID         | PRIMARY KEY   | Unique identifier     |
| productId    | UUID         | FOREIGN KEY   | References Product.id |
| specKey      | VARCHAR(100) | NOT NULL      | Specification name    |
| specValue    | TEXT         | NOT NULL      | Specification value   |
| displayOrder | INTEGER      | DEFAULT 0     | Sort order            |
| createdAt    | TIMESTAMP    | DEFAULT NOW() | Creation timestamp    |
| updatedAt    | TIMESTAMP    | DEFAULT NOW() | Last update timestamp |

**Indexes**:

- `productId`

**Relations**:

- `productId` → Product.id (ON DELETE CASCADE)

**Unique Constraint**:

- (`productId`, `specKey`) - No duplicate spec keys for same product

---

### 6. QuoteRequest

| Field          | Type         | Constraints   | Description                                   |
| -------------- | ------------ | ------------- | --------------------------------------------- |
| id             | UUID         | PRIMARY KEY   | Unique identifier                             |
| name           | VARCHAR(100) | NOT NULL      | Customer name                                 |
| company        | VARCHAR(150) | NULL          | Company name                                  |
| phone          | VARCHAR(20)  | NOT NULL      | Phone number                                  |
| whatsapp       | VARCHAR(20)  | NULL          | WhatsApp number                               |
| email          | VARCHAR(255) | NOT NULL      | Email address                                 |
| productName    | VARCHAR(255) | NULL          | Product/model requested                       |
| quantity       | VARCHAR(50)  | NULL          | Requested quantity                            |
| projectDetails | TEXT         | NULL          | Additional details                            |
| status         | VARCHAR(50)  | DEFAULT 'new' | Quote status (new, contacted, quoted, closed) |
| notes          | TEXT         | NULL          | Admin notes                                   |
| ipAddress      | VARCHAR(50)  | NULL          | Submitter IP                                  |
| userAgent      | VARCHAR(255) | NULL          | Submitter browser                             |
| createdAt      | TIMESTAMP    | DEFAULT NOW() | Submission timestamp                          |
| updatedAt      | TIMESTAMP    | DEFAULT NOW() | Last update timestamp                         |

**Indexes**:

- `status`
- `createdAt` (for sorting)
- `email`

---

## Relationships Summary

```
Category (1) ──< (N) Product
Brand (1) ──< (N) Product
Product (1) ──< (N) ProductSpec
```

---

## Initial Seed Data Requirements

### Categories (Example):

- Cables & Wires
- Switches & Sockets
- Circuit Breakers
- Lighting Solutions
- Distribution Boards
- Industrial Controls

### Brands (Example):

- Siemens
- Schneider Electric
- ABB
- Legrand
- Havells
- Polycab

---

## Data Integrity Rules

1. Deleting a Category sets Product.categoryId to NULL (not cascade)
2. Deleting a Brand sets Product.brandId to NULL (not cascade)
3. Deleting a Product cascades to delete all ProductSpec entries
4. Admin account cannot be deleted if it's the last active admin
5. Quote requests are never deleted (soft delete via status if needed)

---

## Migration Strategy

1. Create tables in order: Admin → Category → Brand → Product → ProductSpec → QuoteRequest
2. Add indexes after data population for better performance
3. Seed admin account before first deployment
4. Backup database before any schema changes
