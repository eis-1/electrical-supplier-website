# Project Structure

This document provides a comprehensive overview of the project's file and directory organization.

## Root Directory

```
electrical-supplier-website/
├── backend/                 # Backend API server
├── frontend/                # Frontend React application
├── docs/                    # Documentation files
├── .gitignore              # Git ignore rules
├── CHANGELOG.md            # Version history and changes
├── CONTRIBUTING.md         # Contribution guidelines
├── LICENSE                 # MIT License
├── README.md               # Main project documentation
├── start-server.sh         # Server startup script (Linux/Mac)
└── start-server.ps1        # Server startup script (Windows)
```

## Backend Structure

```
backend/
├── src/
│   ├── app.ts                      # Express application setup
│   ├── server.ts                   # Server entry point
│   ├── config/
│   │   ├── db.ts                   # Database configuration
│   │   └── env.ts                  # Environment variables
│   ├── middlewares/
│   │   ├── auth.middleware.ts      # JWT authentication
│   │   ├── error.middleware.ts     # Error handling
│   │   ├── rateLimit.middleware.ts # Rate limiting
│   │   └── validation.middleware.ts # Input validation
│   ├── modules/
│   │   ├── auth/                   # Authentication module
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.routes.ts
│   │   │   └── auth.types.ts
│   │   ├── brand/                  # Brand management module
│   │   ├── category/               # Category management module
│   │   ├── product/                # Product management module
│   │   └── quote/                  # Quote request module
│   ├── routes/
│   │   └── upload.routes.ts        # File upload routes
│   └── utils/
│       ├── email.service.ts        # Email sending utility
│       ├── logger.ts               # Winston logger setup
│       ├── response.ts             # API response formatter
│       └── upload.controller.ts    # File upload handler
├── prisma/
│   ├── schema.prisma               # Database schema
│   ├── seed.ts                     # Database seeding script
│   └── migrations/                 # Database migrations
├── uploads/                        # Uploaded files directory
├── .env                            # Environment variables (not in git)
├── .env.example                    # Environment template
├── package.json                    # Node.js dependencies
├── tsconfig.json                   # TypeScript configuration
└── README.md                       # Backend-specific documentation
```

## Frontend Structure

```
frontend/
├── src/
│   ├── main.tsx                    # Application entry point
│   ├── vite-env.d.ts              # Vite type definitions
│   ├── app/
│   │   ├── App.tsx                 # Root component
│   │   └── router.tsx              # Route definitions
│   ├── components/
│   │   ├── common/                 # Shared components
│   │   │   ├── SEO.tsx
│   │   │   └── ErrorBoundary.tsx
│   │   ├── layout/                 # Layout components
│   │   │   ├── Navbar.tsx
│   │   │   ├── Navbar.module.css
│   │   │   ├── Footer.tsx
│   │   │   └── Footer.module.css
│   │   └── ui/                     # UI components
│   │       ├── Button.tsx
│   │       ├── Button.module.css
│   │       ├── Card.tsx
│   │       ├── Card.module.css
│   │       ├── Input.tsx
│   │       ├── Modal.tsx
│   │       └── FileUpload.tsx
│   ├── pages/
│   │   ├── Home/                   # Home page
│   │   │   ├── Home.tsx
│   │   │   └── Home.module.css
│   │   ├── Products/               # Products page
│   │   ├── Brands/                 # Brands page
│   │   ├── Contact/                # Contact page
│   │   ├── About/                  # About page
│   │   ├── ProductDetails/         # Product details page
│   │   └── Admin/                  # Admin pages
│   │       ├── AdminLogin.tsx
│   │       ├── AdminDashboard.tsx
│   │       ├── AdminProducts.tsx
│   │       ├── AdminCategories.tsx
│   │       └── AdminQuotes.tsx
│   ├── services/
│   │   ├── api.ts                  # Axios configuration
│   │   ├── product.service.ts      # Product API calls
│   │   ├── category.service.ts     # Category API calls
│   │   ├── brand.service.ts        # Brand API calls
│   │   ├── quote.service.ts        # Quote API calls
│   │   ├── auth.service.ts         # Authentication API calls
│   │   └── upload.service.ts       # File upload API calls
│   ├── hooks/
│   │   └── useAdminAuth.ts         # Authentication hook
│   ├── types/
│   │   └── index.ts                # TypeScript type definitions
│   ├── styles/
│   │   └── globals.css             # Global styles and animations
│   └── utils/
│       └── validation.ts           # Form validation utilities
├── public/                         # Static assets
├── dist/                           # Build output (generated)
├── .env                            # Environment variables (not in git)
├── .env.example                    # Environment template
├── index.html                      # HTML template
├── package.json                    # Node.js dependencies
├── tsconfig.json                   # TypeScript configuration
├── tsconfig.node.json              # TypeScript config for Vite
└── vite.config.ts                  # Vite build configuration
```

## Documentation Structure

```
docs/
├── API_DOCUMENTATION.md            # Complete API reference
├── api-contract.md                 # API endpoints and contracts
├── db-schema.md                    # Database schema documentation
├── DEPLOYMENT_CHECKLIST.md         # Production deployment guide
└── scope.md                        # Project scope and requirements
```

## Key Files Explained

### Configuration Files

- **package.json**: Node.js project metadata and dependencies
- **tsconfig.json**: TypeScript compiler configuration
- **vite.config.ts**: Vite build tool configuration
- **schema.prisma**: Database schema and ORM configuration
- **.env**: Environment-specific variables (secret keys, API URLs)
- **.gitignore**: Files and directories excluded from version control

### Entry Points

- **backend/src/server.ts**: Backend application starts here
- **frontend/src/main.tsx**: Frontend application starts here
- **backend/src/app.ts**: Express app configuration
- **frontend/src/app/App.tsx**: Root React component

### Build Outputs

- **backend/dist/**: Compiled TypeScript (ignored by git)
- **frontend/dist/**: Production build of frontend (ignored by git)
- **backend/uploads/**: User-uploaded files (ignored by git)

### Database Files

- **backend/dev.db**: SQLite database (ignored by git)
- **backend/prisma/migrations/**: Database migration history
- **backend/prisma/seed.ts**: Sample data for development

## Module Organization

Each backend module follows this pattern:

```
modules/[feature]/
├── [feature].controller.ts    # Request handlers
├── [feature].service.ts       # Business logic
├── [feature].routes.ts        # Route definitions
└── [feature].types.ts         # TypeScript types
```

Example: `modules/product/`

- `product.controller.ts` - Handles HTTP requests/responses
- `product.service.ts` - Contains product business logic
- `product.routes.ts` - Defines API routes for products
- `product.types.ts` - Product-related TypeScript interfaces

## Component Organization

Frontend components use CSS Modules for styling:

```
components/[ComponentName]/
├── ComponentName.tsx          # React component
└── ComponentName.module.css   # Component styles
```

Or co-located in the same directory:

```
components/ui/
├── Button.tsx
├── Button.module.css
├── Card.tsx
└── Card.module.css
```

## Build Process

1. **Frontend Build**:

   ```bash
   cd frontend
   npm run build
   # Outputs to frontend/dist/
   ```

2. **Backend Build**:

   ```bash
   cd backend
   npm run build
   # Outputs to backend/dist/
   ```

3. **Production Deployment**:
   - Frontend built to static files in `frontend/dist/`
   - Backend serves both API and frontend static files
   - Single process on port 5000

## Important Directories

### Do Not Commit

- `node_modules/` - Dependencies (installed via npm)
- `dist/` - Build outputs
- `.env` - Secret credentials
- `uploads/` - User-uploaded files
- `*.log` - Log files
- `*.db` - Database files

### Always Commit

- `src/` - Source code
- `public/` - Static assets
- `.env.example` - Environment template
- `prisma/schema.prisma` - Database schema
- `prisma/migrations/` - Migration history
- Documentation files

## Navigation Guide

### Finding Specific Functionality

- **API Endpoints**: `backend/src/modules/[feature]/[feature].routes.ts`
- **Business Logic**: `backend/src/modules/[feature]/[feature].service.ts`
- **Database Queries**: `backend/src/modules/[feature]/[feature].service.ts` (Prisma calls)
- **Page Components**: `frontend/src/pages/[PageName]/[PageName].tsx`
- **UI Components**: `frontend/src/components/ui/`
- **API Calls**: `frontend/src/services/[feature].service.ts`
- **Type Definitions**: `backend/src/modules/[feature]/[feature].types.ts` or `frontend/src/types/index.ts`

### Adding New Features

1. **Backend**: Create new module in `backend/src/modules/`
2. **Frontend**: Create page in `frontend/src/pages/` or component in `frontend/src/components/`
3. **Database**: Update `backend/prisma/schema.prisma` and run migration
4. **API Service**: Add to or create service in `frontend/src/services/`
5. **Routes**: Add to `frontend/src/app/router.tsx`

---

This structure follows industry best practices for full-stack TypeScript projects and maintains clear separation of concerns between frontend, backend, and data layers.
