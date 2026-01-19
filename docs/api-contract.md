# API Contract Documentation

## Electrical Supplier Website Backend API

**Base URL**: `/api/v1`  
**Authentication**: JWT Bearer Token (Admin routes only)  
**Content-Type**: `application/json`

---

## Authentication

All admin routes require:

```
Authorization: Bearer <JWT_TOKEN>
```

---

## API Endpoints

### 1. Authentication

#### POST `/auth/login`

Admin login

**Request Body**:

```json
{
  "email": "admin@example.com",
  "password": "your-secure-password"
}
```

**Success Response** (200):

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "admin": {
      "id": "uuid",
      "email": "admin@example.com",
      "name": "Admin Name",
      "role": "admin"
    }
  }
}
```

**Error Response** (401):

```json
{
  "success": false,
  "error": "Invalid credentials"
}
```

---

#### POST `/auth/verify`

Verify JWT token

**Headers**: `Authorization: Bearer <token>`

**Success Response** (200):

```json
{
  "success": true,
  "data": {
    "valid": true,
    "admin": {
      "id": "uuid",
      "email": "admin@example.com"
    }
  }
}
```

---

### 2. Categories

#### GET `/categories`

Get all active categories

**Query Parameters**:

- `includeInactive` (boolean, optional) - Include inactive categories (admin only)

**Success Response** (200):

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Cables & Wires",
      "slug": "cables-wires",
      "icon": "/uploads/icons/cables.svg",
      "description": "All types of electrical cables",
      "displayOrder": 1,
      "isActive": true
    }
  ]
}
```

---

#### POST `/categories` 🔒 (Admin)

Create new category

**Request Body**:

```json
{
  "name": "Cables & Wires",
  "slug": "cables-wires",
  "icon": "/uploads/icons/cables.svg",
  "description": "All types of electrical cables",
  "displayOrder": 1
}
```

**Success Response** (201):

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Cables & Wires",
    "slug": "cables-wires"
  }
}
```

---

#### PUT `/categories/:id` 🔒 (Admin)

Update category

**Request Body**: Same as POST

**Success Response** (200): Category object

---

#### DELETE `/categories/:id` 🔒 (Admin)

Delete category

**Success Response** (200):

```json
{
  "success": true,
  "message": "Category deleted successfully"
}
```

---

### 3. Brands

#### GET `/brands`

Get all active brands

**Query Parameters**:

- `includeInactive` (boolean, optional)

**Success Response** (200):

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Siemens",
      "slug": "siemens",
      "logo": "/uploads/brands/siemens.png",
      "description": "German engineering excellence",
      "website": "https://siemens.com",
      "isAuthorized": true,
      "displayOrder": 1
    }
  ]
}
```

---

#### POST `/brands` 🔒 (Admin)

Create new brand

**Request Body**:

```json
{
  "name": "Siemens",
  "slug": "siemens",
  "logo": "/uploads/brands/siemens.png",
  "description": "German engineering excellence",
  "website": "https://siemens.com",
  "isAuthorized": true,
  "displayOrder": 1
}
```

**Success Response** (201): Brand object

---

#### PUT `/brands/:id` 🔒 (Admin)

Update brand

#### DELETE `/brands/:id` 🔒 (Admin)

Delete brand

---

### 4. Products

#### GET `/products`

Get products with filtering

**Query Parameters**:

- `category` (string, optional) - Category slug
- `brand` (string, optional) - Brand slug (multiple: `brand=siemens&brand=abb`)
- `search` (string, optional) - Keyword search
- `page` (number, default: 1)
- `limit` (number, default: 12)
- `featured` (boolean, optional)

**Success Response** (200):

```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": "uuid",
        "name": "Industrial Cable 4mm",
        "slug": "industrial-cable-4mm",
        "model": "IC-4MM-100M",
        "brand": {
          "id": "uuid",
          "name": "Polycab",
          "slug": "polycab",
          "logo": "/uploads/brands/polycab.png"
        },
        "category": {
          "id": "uuid",
          "name": "Cables & Wires",
          "slug": "cables-wires"
        },
        "description": "Heavy duty industrial cable",
        "keyFeatures": ["Fire retardant", "100m length"],
        "image": "/uploads/products/cable-001.jpg",
        "isFeatured": false
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 12,
      "total": 45,
      "totalPages": 4
    }
  }
}
```

---

#### GET `/products/:slug`

Get single product details

**Success Response** (200):

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Industrial Cable 4mm",
    "slug": "industrial-cable-4mm",
    "model": "IC-4MM-100M",
    "brand": {
      /* brand object */
    },
    "category": {
      /* category object */
    },
    "description": "Heavy duty industrial cable",
    "keyFeatures": ["Fire retardant", "100m length"],
    "image": "/uploads/products/cable-001.jpg",
    "images": ["/uploads/products/cable-001-1.jpg"],
    "datasheetUrl": "/uploads/datasheets/cable-ic-4mm.pdf",
    "specs": [
      {
        "id": "uuid",
        "specKey": "Voltage Rating",
        "specValue": "1100V",
        "displayOrder": 1
      },
      {
        "id": "uuid",
        "specKey": "Core Material",
        "specValue": "Copper",
        "displayOrder": 2
      }
    ]
  }
}
```

---

#### POST `/products` 🔒 (Admin)

Create new product

**Request Body**:

```json
{
  "name": "Industrial Cable 4mm",
  "slug": "industrial-cable-4mm",
  "model": "IC-4MM-100M",
  "categoryId": "uuid",
  "brandId": "uuid",
  "description": "Heavy duty industrial cable",
  "keyFeatures": ["Fire retardant", "100m length"],
  "image": "/uploads/products/cable-001.jpg",
  "images": [],
  "datasheetUrl": "/uploads/datasheets/cable-ic-4mm.pdf",
  "isFeatured": false,
  "specs": [
    {
      "specKey": "Voltage Rating",
      "specValue": "1100V",
      "displayOrder": 1
    }
  ]
}
```

**Success Response** (201): Product object

---

#### PUT `/products/:id` 🔒 (Admin)

Update product

#### DELETE `/products/:id` 🔒 (Admin)

Delete product

---

### 5. Quote Requests

#### POST `/quotes`

Submit quote request (Public)

**Request Body**:

```json
{
  "name": "John Doe",
  "company": "ABC Electrical Contractors",
  "phone": "+1234567890",
  "whatsapp": "+1234567890",
  "email": "john@abc.com",
  "productName": "Industrial Cable 4mm",
  "quantity": "500 meters",
  "projectDetails": "Needed for factory wiring project",

  // Optional anti-spam metadata (ignored by backend if not provided)
  "honeypot": "",
  "formStartTs": 1736820000000
}
```

**Validation Rules**:

- `name`: Required, 2-100 characters
- `phone`: Required, valid phone format
- `email`: Required, valid email format
- `company`: Optional, max 150 characters
- `quantity`: Optional, max 50 characters
- `projectDetails`: Optional, max 1000 characters

**Success Response** (201):

```json
{
  "success": true,
  "message": "Quote request submitted successfully",
  "data": {
    "id": "uuid",
    "referenceNumber": "QR-20260108-001"
  }
}
```

---

#### GET `/quotes` 🔒 (Admin)

Get all quote requests

**Query Parameters**:

- `status` (string, optional) - Filter by status (new, contacted, quoted, closed)
- `page` (number, default: 1)
- `limit` (number, default: 20)
- `sortBy` (string, default: "createdAt")
- `order` (string, default: "desc")

**Success Response** (200):

```json
{
  "success": true,
  "data": {
    "quotes": [
      {
        "id": "uuid",
        "name": "John Doe",
        "company": "ABC Electrical Contractors",
        "phone": "+1234567890",
        "email": "john@abc.com",
        "productName": "Industrial Cable 4mm",
        "quantity": "500 meters",
        "projectDetails": "Needed for factory wiring project",
        "status": "new",
        "createdAt": "2026-01-08T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8
    }
  }
}
```

---

#### PUT `/quotes/:id` 🔒 (Admin)

Update quote status/notes

**Request Body**:

```json
{
  "status": "contacted",
  "notes": "Called customer, discussing requirements"
}
```

---

### 6. File Upload

#### POST `/upload/image` 🔒 (Admin)

Upload image file

**Request**: `multipart/form-data`

- `file`: Image file (jpg, png, webp)
- `type`: "product" | "brand" | "category" | "other"

**Success Response** (200):

```json
{
  "success": true,
  "data": {
    "url": "/uploads/products/cable-001.jpg",
    "filename": "cable-001.jpg"
  }
}
```

---

#### POST `/upload/datasheet` 🔒 (Admin)

Upload PDF datasheet

**Request**: `multipart/form-data`

- `file`: PDF file

**Success Response** (200):

```json
{
  "success": true,
  "data": {
    "url": "/uploads/datasheets/cable-ic-4mm.pdf",
    "filename": "cable-ic-4mm.pdf"
  }
}
```

---

## Error Response Format

All error responses follow this structure:

```json
{
  "success": false,
  "error": "Error message here",
  "details": {} // Optional, for validation errors
}
```

### HTTP Status Codes:

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

---

## Rate Limiting

- Public endpoints: 100 requests per 15 minutes per IP
- Quote submission: 5 requests per hour per IP
- Admin endpoints: 1000 requests per 15 minutes per token

---

## Security Headers Required

```
Content-Security-Policy
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
```

---

## CORS Configuration

- Allow origin: Frontend domain only
- Allow credentials: true
- Allow methods: GET, POST, PUT, DELETE
- Allow headers: Content-Type, Authorization
