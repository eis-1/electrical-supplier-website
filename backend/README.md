# Backend Setup Guide

## Electrical Supplier Website - Backend API

---

## Prerequisites

- Node.js 18+ installed
- PostgreSQL installed and running
- npm or yarn package manager

---

## Installation Steps

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and update with your configuration:

```env
# Database Connection
DATABASE_URL="postgresql://username:password@localhost:5432/electrical_supplier?schema=public"

# JWT Secret (generate a strong random string)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# SMTP Configuration (for email notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
ADMIN_EMAIL=admin@yourdomain.com
```

### 3. Setup Database

**Option A: If PostgreSQL is running locally**

Create a new database:

```sql
CREATE DATABASE electrical_supplier;
```

**Option B: Update DATABASE_URL in .env**

Run migrations to create tables:

```bash
npm run prisma:migrate
```

Generate Prisma Client:

```bash
npm run prisma:generate
```

### 4. Seed Initial Data

Seed the database with admin user, categories, and brands:

```bash
npm run prisma:seed
```

**Default Admin Credentials:**

- Email: `admin@electricalsupplier.com`
- Password: `admin123`

⚠️ **IMPORTANT:** Change the default password after first login!

---

## Running the Server

### Development Mode (with auto-reload)

```bash
npm run dev
```

The server will start at: `http://localhost:5000`

### Production Build

```bash
npm run build
npm start
```

---

## API Endpoints

Once running, access the API at: `http://localhost:5000/api/v1`

### Public Endpoints:

- `GET /health` - Health check
- `GET /api/v1/categories` - Get all categories
- `GET /api/v1/brands` - Get all brands
- `GET /api/v1/products` - Get products (with filters)
- `GET /api/v1/products/:slug` - Get product by slug
- `POST /api/v1/quotes` - Submit quote request

### Admin Endpoints (requires authentication):

- `POST /api/v1/auth/login` - Admin login
- `POST /api/v1/categories` - Create category
- `POST /api/v1/brands` - Create brand
- `POST /api/v1/products` - Create product
- `GET /api/v1/quotes` - Get all quotes

Full API documentation: [docs/api-contract.md](../docs/api-contract.md)

---

## Testing the API

### Using curl:

**Login:**

```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@electricalsupplier.com","password":"admin123"}'
```

**Get Categories:**

```bash
curl http://localhost:5000/api/v1/categories
```

**Create Product (with auth token):**

```bash
curl -X POST http://localhost:5000/api/v1/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Test Product",
    "slug": "test-product",
    "model": "TP-001"
  }'
```

---

## Database Management

### View database in Prisma Studio:

```bash
npm run prisma:studio
```

This opens a GUI at `http://localhost:5555` to view and edit data.

### Create new migration:

```bash
npx prisma migrate dev --name description_of_change
```

### Reset database (⚠️ deletes all data):

```bash
npx prisma migrate reset
```

---

## Troubleshooting

### Database Connection Error

- Check if PostgreSQL is running
- Verify DATABASE_URL in .env
- Ensure database exists

### Port Already in Use

Change PORT in .env:

```env
PORT=5000
```

### JWT Token Issues

Regenerate JWT_SECRET in .env with a strong random string

### Module Not Found Errors

```bash
npm install
npx prisma generate
```

---

## Project Structure

```
backend/
├── src/
│   ├── modules/          # Feature modules
│   │   ├── auth/         # Authentication
│   │   ├── brand/        # Brands CRUD
│   │   ├── category/     # Categories CRUD
│   │   ├── product/      # Products CRUD
│   │   └── quote/        # Quote requests
│   ├── config/           # Configuration
│   ├── middlewares/      # Express middlewares
│   ├── utils/            # Utility functions
│   ├── app.ts            # Express app setup
│   └── server.ts         # Server entry point
├── prisma/
│   ├── schema.prisma     # Database schema
│   └── seed.ts           # Seed data
└── package.json
```

---

## Next Steps

1. ✅ Backend API is now running
2. 🔄 Proceed to frontend setup
3. 🔗 Connect frontend to backend API
4. 🚀 Deploy to production

---

For deployment instructions, see the main [README.md](../README.md)
