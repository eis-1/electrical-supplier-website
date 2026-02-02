# API Documentation

## Base URL

- Development: `http://localhost:5000/api/v1`
- Production: `https://api.yourcompany.com/api/v1`

## Authentication

All admin endpoints require JWT authentication via Bearer token in Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

---

## Auth Endpoints

### POST /auth/login

Admin login to get JWT token.

**Request Body:**

```json
{
  "email": "admin@electrical-supplier.com",
  "password": "your-secure-password"
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "admin": {
      "id": "uuid",
      "email": "admin@electrical-supplier.com",
      "name": "Admin User",
      "role": "admin"
    }
  }
}
```

### POST /auth/verify

Verify JWT token validity.

**Headers:**

```
Authorization: Bearer <token>
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "valid": true,
    "admin": {
      "id": "uuid",
      "email": "admin@electrical-supplier.com"
    }
  }
}
```

---

## Product Endpoints

### GET /products

Get paginated list of products with optional filters.

**Query Parameters:**

- `page` (number, default: 1)
- `limit` (number, default: 12, max: 50)
- `category` (string) - Category slug
- `brand` (string|string[]) - Brand slug(s)
- `search` (string) - Search in name, model, description
- `featured` (boolean) - Filter featured products

**Example:**

```
GET /products?page=1&limit=12&category=circuit-breakers&brand=schneider&search=MCB
```

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "MCB Circuit Breaker 32A",
      "slug": "mcb-circuit-breaker-32a",
      "model": "MCB-32A-C",
      "description": "High-quality miniature circuit breaker...",
      "image": "/uploads/images/product-123.jpg",
      "datasheetUrl": "/uploads/documents/datasheet-123.pdf",
      "isFeatured": true,
      "isActive": true,
      "categoryId": "uuid",
      "brandId": "uuid",
      "category": {
        "id": "uuid",
        "name": "Circuit Breakers",
        "slug": "circuit-breakers"
      },
      "brand": {
        "id": "uuid",
        "name": "Schneider Electric",
        "slug": "schneider",
        "logo": "/uploads/images/schneider-logo.png"
      },
      "specs": [
        {
          "id": "uuid",
          "specKey": "Voltage",
          "specValue": "230V AC"
        }
      ],
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 12,
    "total": 48,
    "totalPages": 4
  }
}
```

### GET /products/:id

Get product by ID.

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "MCB Circuit Breaker 32A",
    ...
  }
}
```

### GET /products/slug/:slug

Get product by slug.

**Example:**

```
GET /products/slug/mcb-circuit-breaker-32a
```

**Response (200):** Same as GET /products/:id

### POST /products 🔒

Create new product (Admin only).

**Headers:**

```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "name": "MCB Circuit Breaker 32A",
  "slug": "mcb-circuit-breaker-32a",
  "model": "MCB-32A-C",
  "categoryId": "uuid",
  "brandId": "uuid",
  "description": "High-quality miniature circuit breaker",
  "image": "/uploads/images/product-123.jpg",
  "datasheetUrl": "/uploads/documents/datasheet-123.pdf",
  "isFeatured": true,
  "specs": [
    {
      "specKey": "Voltage",
      "specValue": "230V AC",
      "displayOrder": 1
    }
  ]
}
```

**Response (201):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "MCB Circuit Breaker 32A",
    ...
  }
}
```

### PUT /products/:id 🔒

Update existing product (Admin only).

**Request Body:** Same as POST (all fields optional)

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Updated Product Name",
    ...
  }
}
```

### DELETE /products/:id 🔒

Delete product (Admin only).

**Response (200):**

```json
{
  "success": true,
  "message": "Product deleted successfully"
}
```

---

## Category Endpoints

### GET /categories

Get all active categories.

**Query Parameters:**

- `active` (boolean, default: true) - Filter by active status

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Circuit Breakers",
      "slug": "circuit-breakers",
      "description": "Electrical circuit protection devices",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### POST /categories 🔒

Create category (Admin only).

**Request Body:**

```json
{
  "name": "Circuit Breakers",
  "slug": "circuit-breakers",
  "description": "Electrical circuit protection devices",
  "isActive": true
}
```

### PUT /categories/:id 🔒

Update category (Admin only).

### DELETE /categories/:id 🔒

Delete category (Admin only).

---

## Brand Endpoints

### GET /brands

Get all active brands.

**Response Structure:** Similar to categories

### POST /brands 🔒

Create brand (Admin only).

**Request Body:**

```json
{
  "name": "Schneider Electric",
  "slug": "schneider",
  "logo": "/uploads/images/schneider-logo.png",
  "description": "Global specialist in energy management",
  "isActive": true
}
```

### PUT /brands/:id 🔒

Update brand (Admin only).

### DELETE /brands/:id 🔒

Delete brand (Admin only).

---

## Quote Endpoints

### POST /quotes

Submit quote request (Public).

**Request Body:**

```json
{
  "name": "John Doe",
  "company": "ABC Industries",
  "email": "john@abcindustries.com",
  "phone": "+1-234-567-8900",
  "whatsapp": "+1-234-567-8900",
  "productName": "MCB Circuit Breaker 32A",
  "quantity": "100 units",
  "projectDetails": "Need for new facility project..."
}
```

**Response (201):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "referenceNumber": "QR-20240101-ABC123",
    "message": "Quote request submitted successfully"
  }
}
```

### GET /quotes 🔒

Get all quote requests (Admin only).

**Query Parameters:**

- `status` (string) - Filter by status (new, pending, processing, completed, rejected)
- `page` (number)
- `limit` (number)

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "John Doe",
      "company": "ABC Industries",
      "email": "john@abcindustries.com",
      "phone": "+1-234-567-8900",
      "status": "new",
      "notes": null,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### GET /quotes/:id 🔒

Get quote by ID (Admin only).

### PUT /quotes/:id 🔒

Update quote status/notes (Admin only).

**Request Body:**

```json
{
  "status": "processing",
  "notes": "Preparing quotation..."
}
```

### DELETE /quotes/:id 🔒

Delete quote (Admin only).

---

## File Upload Endpoints

### POST /upload/single 🔒

Upload single file (Admin only).

**Headers:**

```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Form Data:**

- `file` - File to upload (image or PDF)

**Response (200):**

```json
{
  "success": true,
  "data": {
    "filename": "file-1234567890-abc123.pdf",
    "originalname": "product-datasheet.pdf",
    "mimetype": "application/pdf",
    "size": 524288,
    "url": "/uploads/documents/file-1234567890-abc123.pdf"
  }
}
```

### POST /upload/multiple 🔒

Upload multiple files (Admin only, max 10).

**Form Data:**

- `files` - Array of files

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "filename": "file-1234567890-abc123.jpg",
      "originalname": "product-image-1.jpg",
      "mimetype": "image/jpeg",
      "size": 204800,
      "url": "/uploads/images/file-1234567890-abc123.jpg"
    }
  ]
}
```

### DELETE /upload/:type/:filename 🔒

Delete uploaded file (Admin only).

**Parameters:**

- `type` - File type (`images` or `documents`)
- `filename` - Filename to delete

---

## Error Responses

All endpoints return consistent error responses:

**400 Bad Request:**

```json
{
  "success": false,
  "error": "Invalid input data",
  "message": "Email is required"
}
```

**401 Unauthorized:**

```json
{
  "success": false,
  "error": "Unauthorized",
  "message": "No token provided"
}
```

**404 Not Found:**

```json
{
  "success": false,
  "error": "Not Found",
  "message": "Product not found"
}
```

**409 Conflict:**

```json
{
  "success": false,
  "error": "Conflict",
  "message": "A record with this value already exists"
}
```

**500 Internal Server Error:**

```json
{
  "success": false,
  "error": "Internal Server Error",
  "message": "An unexpected error occurred"
}
```

---

## Rate Limiting

- **Window**: 15 minutes
- **Max Requests**: 100 per IP
- **Headers**:
  - `X-RateLimit-Limit`: Total requests allowed
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Timestamp when limit resets

---

## File Upload Limits

- **Max File Size**: 10MB
- **Allowed Image Types**: JPEG, JPG, PNG, WebP, GIF
- **Allowed Document Types**: PDF only

---

## Best Practices

1. **Always** include `Authorization` header for admin endpoints
2. **Validate** input data before sending requests
3. **Handle** pagination for large datasets
4. **Implement** retry logic for failed requests
5. **Cache** responses where appropriate
6. **Use** slugs instead of IDs in public URLs for SEO

---

## Testing with cURL

### Login Example:

```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@electrical-supplier.com","password":"your-admin-password"}'
```

### Get Products Example:

```bash
curl http://localhost:5000/api/v1/products?page=1&limit=12
```

### Create Product Example:

```bash
curl -X POST http://localhost:5000/api/v1/products \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Product","slug":"test-product","categoryId":"uuid","brandId":"uuid"}'
```

---
