# Electrical Supplier Website (B2B)

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=0B0F14)](https://react.dev/)
[![Express](https://img.shields.io/badge/Express-4.x-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-5.x-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A full-stack B2B electrical supplier website with a product catalog, brand & category management, quote request workflow, file uploads, and a secure admin panel.

**Author:** MD EAFTEKHIRUL ISLAM © 2026

---

## ✨ Features

- **Product Catalog**: Browse products by category and brand (B2B-friendly: quote-first, not cart-first)
- **Quote Requests**: Customers submit quote requests; admins manage quote pipeline
- **Admin Panel**: Secure admin login with CRUD for products, categories, brands
- **Uploads**: Upload product assets (e.g., datasheets) via backend
- **Single-Port Deployment**: Express serves the API and the built frontend on the same port
- **Modern UI**: React + Vite frontend with responsive layout and clean design

---

## 📋 Table of Contents

- [Quick Start](#-quick-start)
- [Installation](#-installation)
- [Usage](#-usage)
- [Project Structure](#-project-structure)
- [Development](#-development)
- [Testing](#-testing)
- [Documentation](#-documentation)
- [Contributing](#-contributing)
- [License](#-license)
- [Roadmap](#-roadmap)
- [Contact](#-contact)

---

## 🚀 Quick Start

### Windows (recommended)

```powershell
# Clone
git clone https://github.com/eis-1/electrical-supplier-website.git
cd electrical-supplier-website

# Install dependencies
cd backend
npm install
cd ..\frontend
npm install
cd ..

# Configure environment files
Copy-Item backend\.env.example backend\.env
Copy-Item frontend\.env.example frontend\.env

# Initialize DB (SQLite)
cd backend
npx prisma generate
npx prisma migrate dev
npm run prisma:seed
cd ..

# Build frontend and start everything on http://localhost:5000
./start-server.ps1
```

### macOS / Linux

```bash
# Clone
git clone https://github.com/eis-1/electrical-supplier-website.git
cd electrical-supplier-website

# Install dependencies
cd backend && npm install
cd ../frontend && npm install
cd ..

# Configure environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Initialize DB (SQLite)
cd backend
npx prisma generate
npx prisma migrate dev
npm run prisma:seed
cd ..

# Build frontend and start everything on http://localhost:5000
./start-server.sh
```

---

## 📦 Installation

### Prerequisites

- **Node.js 18+**
- **npm** (comes with Node)
- **Git**

### Environment Variables

This repo includes templates:

- `backend/.env.example`
- `frontend/.env.example`

Copy them to `.env` and adjust values as needed.

---

## 💻 Usage

After starting the server:

- **Website**: http://localhost:5000
- **Admin Login**: http://localhost:5000/admin/login
- **API Base**: http://localhost:5000/api/v1
- **Health Check**: http://localhost:5000/health

### Default Admin Credentials (development)

These are printed by the start scripts:

```text
Email:    admin@electricalsupplier.com
Password: admin123
```

Important: change credentials for any real deployment.

---

## 📁 Project Structure

The repo is organized into three main areas:

```text
electrical-supplier-website/
├── backend/   # Express + TypeScript + Prisma API
├── frontend/  # React + Vite SPA
└── docs/      # Project documentation
```

For a detailed, navigable layout, see: **[`PROJECT_STRUCTURE.md`](PROJECT_STRUCTURE.md)**.

---

## 🛠️ Development

### Typical dev workflow (two terminals)

Terminal A (backend):

- Run the backend dev server:
  - `backend` → `npm run dev`

Terminal B (frontend):

- Run the Vite dev server:
  - `frontend` → `npm run dev`

Note: production uses the single-port flow (build frontend and let Express serve `frontend/dist`).

### Code Quality

- Backend lint: `backend` → `npm run lint`
- Frontend lint: `frontend` → `npm run lint`
- Formatting:
  - Backend: `backend` → `npm run format`
  - Frontend: `frontend` → `npm run format`

---

## 🧪 Testing

This project currently focuses on:

- API functionality checks (manual/smoke testing)
- Linting and TypeScript builds

Recommended checks before pushing:

- `backend` → `npm run build`
- `frontend` → `npm run build`
- `backend` → `npm run lint`
- `frontend` → `npm run lint`

---

## 📚 Documentation

Available docs:

- **API docs**: `docs/API_DOCUMENTATION.md`
- **API contract**: `docs/api-contract.md`
- **DB schema**: `docs/db-schema.md`
- **Deployment checklist**: `docs/DEPLOYMENT_CHECKLIST.md`
- **Scope**: `docs/scope.md`

---

## 🤝 Contributing

Contributions are welcome.

1. Fork the repo
2. Create a branch (`git checkout -b feature/my-change`)
3. Make changes
4. Run build/lint checks
5. Open a pull request

See **[`CONTRIBUTING.md`](CONTRIBUTING.md)** for standards and workflow.

---

## 📄 License

This project is licensed under the MIT License - see **[`LICENSE`](LICENSE)**.

---

## 🗺️ Roadmap

- Pagination and improved filtering in admin tables
- Full-text product search (PostgreSQL-ready)
- Better upload validation (size/type) and progress UI
- Multiple admin users + role-based access control (RBAC)
- Cloud storage option for uploads (S3/R2)
- Better admin session UX (token refresh / graceful expiry handling)

---

## 📞 Contact

- **Author**: MD EAFTEKHIRUL ISLAM
- **Repo**: https://github.com/eis-1/electrical-supplier-website
- **Issues**: https://github.com/eis-1/electrical-supplier-website/issues

# Electrical Supplier B2B Website

A full-stack web application designed for B2B electrical and electronics supply businesses. This project provides a complete platform for product catalog management, brand showcase, quote request handling, and administrative operations.

---

## Project Background and Motivation

In the B2B electrical supply industry, businesses require specialized digital platforms that differ significantly from consumer e-commerce solutions. Traditional e-commerce platforms focus on direct sales with shopping carts and payment processing, which does not align with B2B wholesale operations where pricing is negotiated, orders are large-scale, and relationships are built through quotations and direct communication.

This project was developed to address the specific needs of electrical suppliers who:

- Work with contractors, engineers, and procurement officers
- Require quote-based workflows rather than direct online sales
- Need to showcase extensive product catalogs with technical specifications
- Manage relationships with multiple brands and manufacturers
- Operate through consultation and custom pricing rather than fixed public prices

The motivation was to build a complete, production-ready system that handles these B2B-specific requirements while maintaining professional standards in code quality, architecture, and user experience.

---

## Objectives

The primary objectives of this project are:

1. **Product Catalog Management**: Provide a structured system for organizing and presenting electrical products with categories, brands, specifications, and technical documentation.

2. **Quote Request System**: Implement a workflow where potential clients can request quotations for multiple products, which are then managed through an administrative interface.

3. **Brand Showcase**: Allow the business to display relationships with major electrical equipment manufacturers and brands.

4. **Administrative Operations**: Provide a secure admin panel for managing products, categories, brands, and customer quote requests.

5. **Professional B2B Interface**: Create a user interface that conveys technical competence and industrial professionalism rather than consumer-focused marketing aesthetics.

6. **Technical Demonstration**: Serve as a comprehensive demonstration of full-stack development capabilities including database design, RESTful API architecture, authentication, and modern frontend development.

---

## System Overview

### Architecture

The system follows a three-tier architecture:

**Presentation Layer (Frontend)**:

- React-based single-page application
- Component-based UI with TypeScript for type safety
- Client-side routing with React Router
- Responsive design for desktop and mobile devices

**Application Layer (Backend)**:

- Express.js REST API server
- JWT-based authentication for admin operations
- Middleware for validation, error handling, and rate limiting
- File upload handling for product datasheets and brand logos

**Data Layer (Database)**:

- SQLite database (development) with Prisma ORM
- Relational schema with proper foreign key constraints
- Support for PostgreSQL in production environments

### Data Flow

1. **Public Data Flow**:

   - Client requests product/brand/category data
   - API queries database through Prisma
   - Data returned as JSON with proper error handling
   - Frontend renders data in React components

2. **Quote Request Flow**:

   - User submits quote form with product selections
   - API validates and stores quote in database
   - Email notification sent to business (if configured)
   - Admin can view and manage quotes through dashboard

3. **Admin Data Flow**:
   - Admin logs in with credentials
   - JWT token issued and stored client-side
   - Protected API routes verify token on each request
   - CRUD operations on products, categories, and brands
   - Changes immediately reflected in public-facing site

### Component Interaction

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Browser   │────────▶│   Express   │────────▶│   SQLite    │
│  (React UI) │◀────────│  (REST API) │◀────────│  (Database) │
└─────────────┘         └─────────────┘         └─────────────┘
      │                        │
      │                        │
      ▼                        ▼
┌─────────────┐         ┌─────────────┐
│  Static     │         │    JWT      │
│  Assets     │         │    Auth     │
└─────────────┘         └─────────────┘
```

---

## Design Decisions and Architecture

### Single-Port Deployment

**Decision**: Serve both frontend static files and API from a single Express server on port 5000.

**Rationale**:

- Simplified deployment (single process to manage)
- No CORS complexity in production
- Reduced infrastructure requirements
- Frontend built to static files and served by Express

**Trade-off**: Less flexibility in independent scaling, but appropriate for the expected traffic volume of a B2B site.

### SQLite for Development, PostgreSQL for Production

**Decision**: Use SQLite in development but design schema for PostgreSQL deployment.

**Rationale**:

- SQLite requires no separate database server for development
- Prisma ORM abstracts database differences
- PostgreSQL provides production-grade features (full-text search, better concurrent writes)

**Implementation**: Schema designed with PostgreSQL constraints in mind; migration path documented.

### JWT Authentication vs Session-Based

**Decision**: Implement JWT tokens for admin authentication.

**Rationale**:

- Stateless authentication suitable for API architecture
- Easy to scale horizontally if needed
- Frontend can store token and include in requests
- No server-side session storage required

**Trade-off**: Token invalidation is more complex, but admin tokens have reasonable expiration times.

### File Storage Approach

**Decision**: Store uploaded files (datasheets, logos) on local filesystem with database storing paths.

**Rationale**:

- Simplifies initial implementation
- No dependency on cloud storage services
- Easily migrated to S3/CDN later if needed

**Current Limitation**: Files stored in `backend/uploads/` directory; requires backup strategy.

### Frontend Build Strategy

**Decision**: Build frontend to static files served by backend Express app.

**Rationale**:

- Single deployment artifact
- Backend handles API and frontend serving
- Proper SPA routing with Express middleware
- Static files benefit from Express's static file serving optimizations

### API Design Pattern

**Decision**: RESTful API with consistent response structure and error handling.

**Rationale**:

- Industry-standard approach
- Predictable endpoint naming (`/api/v1/resource`)
- Consistent error responses aid debugging
- Version prefix (`/v1/`) allows future API evolution

**Response Format**:

```json
{
  "success": true,
  "data": {},
  "message": "Operation successful"
}
```

### Database Schema Normalization

**Decision**: Properly normalized schema with foreign key relationships.

**Example**:

- Products reference Categories and Brands
- Quote items reference Products and Quotes
- Cascading deletes configured appropriately

**Rationale**:

- Data integrity enforced at database level
- Avoids data duplication
- Supports complex queries (e.g., "all products from brand X in category Y")

---

## Technologies and Tools

### Frontend Technologies

**React 18**

- Role: UI library for building component-based interface
- Choice Rationale: Industry standard, large ecosystem, excellent TypeScript support

**TypeScript**

- Role: Type-safe JavaScript for frontend code
- Choice Rationale: Catches errors at compile time, improves code maintainability, better IDE support

**Vite 6.4**

- Role: Build tool and development server
- Choice Rationale: Extremely fast hot module replacement, modern ESM-based architecture, better than Create React App

**React Router 6**

- Role: Client-side routing for single-page application
- Choice Rationale: De facto standard for React routing, supports nested routes and protected routes

**CSS Modules**

- Role: Component-scoped styling
- Choice Rationale: Prevents style conflicts, co-located with components, no runtime overhead

**Axios**

- Role: HTTP client for API requests
- Choice Rationale: Better error handling than fetch, interceptors for auth tokens, request cancellation

### Backend Technologies

**Node.js 18+**

- Role: JavaScript runtime for server-side code
- Choice Rationale: JavaScript on both frontend and backend, large package ecosystem, good performance

**Express.js 4**

- Role: Web application framework
- Choice Rationale: Minimal and flexible, industry standard, extensive middleware ecosystem

**TypeScript**

- Role: Type-safe JavaScript for backend code
- Choice Rationale: Same as frontend - type safety, better refactoring, improved documentation

**Prisma 5**

- Role: Database ORM and schema management
- Choice Rationale: Type-safe database queries, automatic migrations, excellent TypeScript integration

**bcryptjs**

- Role: Password hashing
- Choice Rationale: Secure password storage, adjustable work factor, no native dependencies

**jsonwebtoken**

- Role: JWT token generation and verification
- Choice Rationale: Standard for stateless authentication, widely supported

**multer**

- Role: File upload handling middleware
- Choice Rationale: De facto standard for Express file uploads, good documentation

**winston**

- Role: Logging library
- Choice Rationale: Flexible log formatting, multiple transports, production-ready

**nodemailer**

- Role: Email sending for quote notifications
- Choice Rationale: Support for multiple mail services, good API, widely used

### Development Tools

**tsx**

- Role: TypeScript execution for development
- Choice Rationale: Hot reload during development, no separate build step needed

**ESLint**

- Role: Code linting and style checking
- Choice Rationale: Catches common errors, enforces consistent code style

**Prettier**

- Role: Code formatting
- Choice Rationale: Automatic formatting, eliminates style debates, integrates with editors

---

## Installation and Setup

### Prerequisites

- Node.js 18 or higher
- npm 9 or higher
- Git (for cloning repository)

### Step 1: Clone Repository

```bash
git clone <repository-url>
cd electrical-supplier-website
```

### Step 2: Install Backend Dependencies

```bash
cd backend
npm install
```

### Step 3: Configure Backend Environment

Create a `.env` file in the `backend` directory:

```env
# Database
DATABASE_URL="file:./dev.db"

# Server Configuration
PORT=5000
NODE_ENV=development

# JWT Configuration
JWT_SECRET="your-secret-key-change-in-production"
JWT_EXPIRES_IN="7d"

# Email Configuration (optional for development)
SMTP_HOST="smtp.example.com"
SMTP_PORT=587
SMTP_USER="your-email@example.com"
SMTP_PASS="your-password"
SMTP_FROM="noreply@example.com"
```

### Step 4: Initialize Database

```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Seed database with sample data
npm run prisma:seed
```

### Step 5: Install Frontend Dependencies

```bash
cd ../frontend
npm install
```

### Step 6: Configure Frontend Environment

Create a `.env` file in the `frontend` directory:

```env
# API Configuration
VITE_API_BASE_URL=/api/v1

# Application Information
VITE_APP_NAME=Electrical Supplier
VITE_APP_DESCRIPTION=Professional B2B Electrical & Electronics Supplier

# Contact Information
VITE_COMPANY_NAME=Your Company Name
VITE_COMPANY_PHONE=+1234567890
VITE_COMPANY_WHATSAPP=+1234567890
VITE_COMPANY_EMAIL=info@example.com
VITE_COMPANY_ADDRESS=123 Business Street, City, Country
```

### Step 7: Build Frontend

```bash
npm run build
```

This creates a `dist` folder with production-ready static files.

### Step 8: Start Backend Server

```bash
cd ../backend
npm run dev
```

The server will start on `http://localhost:5000` and serve both the API and frontend.

### Step 9: Access Application

- **Public Website**: http://localhost:5000
- **Admin Panel**: http://localhost:5000/admin/login
- **API Base**: http://localhost:5000/api/v1

### Default Admin Credentials

```
Email: admin@electricalsupplier.com
Password: admin123
```

**Important**: Change these credentials immediately in production by updating the database directly or creating a new admin user.

---

## Usage Guide

### For End Users (Public Site)

**Browsing Products**:

1. Navigate to the home page
2. Browse featured categories or use the products page
3. Filter products by category or brand
4. View detailed product specifications and datasheets

**Requesting a Quote**:

1. Navigate to Products page
2. Select desired products
3. Click "Request Quote" in navigation
4. Fill in company details and requirements
5. Submit form - quote request is stored and admin is notified

**Contacting via WhatsApp**:

1. Click green WhatsApp button in navbar
2. Pre-filled message opens in WhatsApp
3. Modify message and send to business

### For Administrators

**Logging In**:

1. Navigate to http://localhost:5000/admin/login
2. Enter admin credentials
3. JWT token is issued and stored in browser

**Managing Products**:

1. From dashboard, click "Products"
2. View all products in table format
3. Click "Add New Product" to create
4. Fill in product details (name, model, description, category, brand)
5. Upload datasheet (optional)
6. Mark as featured (optional)
7. Submit form
8. Edit or delete products using action buttons

**Managing Categories**:

1. From dashboard, click "Categories & Brands"
2. Switch to Categories tab
3. Add new category with name, description, and slug
4. Edit or delete existing categories
5. Active/inactive toggle controls visibility

**Managing Brands**:

1. From Categories page, switch to Brands tab
2. Add new brand with name, description, logo URL
3. Edit or delete existing brands
4. Active/inactive toggle controls visibility

**Viewing Quotes**:

1. From dashboard, click "Quotes"
2. View all quote requests with customer details
3. Click quote to see full details including selected products
4. Update status (Pending → In Progress → Completed)

**Logging Out**:

- Click "Logout" button in any admin page
- Token is cleared from browser

---

## Features

### Public-Facing Features

**Product Catalog**:

- Hierarchical organization by categories
- Brand associations for each product
- Detailed product specifications
- Downloadable technical datasheets
- Featured product highlighting
- Search and filter capabilities

**Quote Request System**:

- Multi-product quote requests
- Customer information collection (company, contact details)
- Custom message/requirements field
- Email notification to administrator
- Persistent storage of all quote requests

**Brand Showcase**:

- Display of manufacturer partnerships
- Brand logos and descriptions
- Link to brand-specific product listings

**Responsive Design**:

- Mobile-first approach
- Touch-friendly interfaces on mobile
- Optimized layouts for tablets and desktops

**Professional UI**:

- Modern design with 3D CSS animations
- Smooth transitions and hover effects
- Glass morphism effects on navigation
- Clean typography and spacing

### Administrative Features

**Authentication System**:

- JWT-based secure login
- Protected routes requiring valid tokens
- Token expiration and refresh
- Password hashing with bcrypt

**Product Management**:

- Full CRUD operations on products
- Category and brand assignment
- Featured product designation
- File upload for datasheets
- Bulk viewing and editing

**Category Management**:

- Create and edit product categories
- URL-friendly slug generation
- Active/inactive status control
- Description and metadata

**Brand Management**:

- Manage manufacturer/brand relationships
- Logo image handling
- Website URL linking
- Active/inactive status control

**Quote Management**:

- View all customer quote requests
- Detailed quote information display
- Status tracking workflow
- Customer contact information access

**Dashboard Analytics**:

- Quick statistics on products, categories, brands
- Recent quote requests overview
- System status indicators

---

## Limitations and Known Issues

### Current Limitations

**Email Functionality**:

- Email notifications for quotes require SMTP configuration
- Development environment uses placeholder SMTP settings
- No email queue system; emails sent synchronously

**File Storage**:

- Uploaded files (datasheets, logos) stored on local filesystem
- No cloud storage integration (S3, etc.)
- File paths stored as strings in database
- Requires manual backup of uploads directory

**Search Functionality**:

- Basic product filtering by category and brand
- No full-text search across product descriptions
- No advanced search with multiple criteria

**User Management**:

- Single admin account system
- No role-based access control (RBAC)
- No user registration or multiple admin support
- Password changes require database manipulation

**Performance**:

- No caching layer (Redis, etc.)
- Database queries not optimized for large datasets
- No pagination on admin product lists (loads all products)

**Database**:

- SQLite used in development has concurrency limitations
- No automatic database backups
- Migration to PostgreSQL required for production

### Known Issues

**WhatsApp Integration**:

- WhatsApp button uses environment variable for phone number
- Requires manual configuration in .env file
- No fallback if WhatsApp not installed on device

**File Uploads**:

- Large file uploads may timeout
- No progress indicator for file uploads
- No file type or size validation on client side

**Admin Session**:

- JWT tokens stored in localStorage (vulnerable to XSS)
- No refresh token mechanism
- Token expiration not handled gracefully in UI

**Mobile Experience**:

- Admin panel not fully optimized for mobile devices
- Some tables require horizontal scrolling on small screens

---

## Future Work and Improvements

### Short-Term Improvements

**Enhanced Search**:

- Implement full-text search using PostgreSQL's built-in capabilities
- Add autocomplete suggestions
- Search across product names, descriptions, and specifications

**Pagination**:

- Add pagination to product lists (both public and admin)
- Configurable page sizes
- Improved performance with large datasets

**File Validation**:

- Client-side file type checking
- File size limits and validation
- Image optimization for logos
- Preview before upload

**Email Queue**:

- Implement background job queue for email sending
- Retry mechanism for failed emails
- Email templates for different notification types

**Admin Improvements**:

- Password change functionality in admin panel
- Session management improvements
- Activity logging for admin actions

### Long-Term Enhancements

**Multi-tenancy**:

- Support for multiple business entities
- Separate product catalogs per tenant
- Branded subdomain per tenant

**Advanced Analytics**:

- Track quote conversion rates
- Popular products and categories analytics
- User behavior tracking (with consent)
- Export reports to CSV/PDF

**CRM Integration**:

- Export quotes to external CRM systems
- Integration with email marketing platforms
- Customer relationship tracking

**Cloud Infrastructure**:

- Migrate to cloud storage (AWS S3, Cloudflare R2)
- Implement CDN for static assets
- Database replication for high availability
- Container orchestration with Docker/Kubernetes

**API Enhancements**:

- GraphQL API alongside REST
- API rate limiting per client
- Comprehensive API documentation with Swagger
- Webhook support for third-party integrations

**Security Hardening**:

- Two-factor authentication for admin
- Role-based access control
- Audit logs for all data modifications
- Regular security scanning

**Internationalization**:

- Multi-language support
- Currency and unit conversions
- Region-specific product catalogs

---

## Learning Outcomes

### Technical Skills Acquired

**Full-Stack Development**:

- Gained comprehensive understanding of building complete web applications from database to user interface
- Learned to integrate frontend and backend with proper API design
- Developed skills in project organization and code structure

**Database Design**:

- Designed normalized relational schema with proper foreign key relationships
- Learned Prisma ORM for type-safe database operations
- Understood migration strategies and seed data management

**Authentication and Security**:

- Implemented JWT-based authentication system
- Learned password hashing with bcrypt
- Understood security considerations for API endpoints

**TypeScript**:

- Applied TypeScript in both frontend and backend code
- Gained experience with type definitions and interfaces
- Understood benefits of compile-time type checking

**React Architecture**:

- Built component-based UI with proper state management
- Implemented client-side routing with protected routes
- Learned custom hooks for authentication and data fetching

**API Design**:

- Designed RESTful API with consistent patterns
- Implemented proper error handling and validation
- Structured responses for clarity and debugging

**File Handling**:

- Implemented file upload functionality
- Learned multipart form data handling
- Understood file storage strategies

**Build and Deployment**:

- Configured build pipelines for frontend and backend
- Learned static file serving from Express
- Understood production vs development configurations

### Problem-Solving Experience

**SPA Routing with Express**:

- Solved the problem of serving both API and frontend from single server
- Implemented middleware to distinguish between file requests and SPA routes
- Learned regex patterns for route matching

**Authentication Flow**:

- Designed complete login/logout workflow with token management
- Implemented protected routes on both frontend and backend
- Handled token expiration and unauthorized access

**Database Relationships**:

- Modeled complex relationships (products, categories, brands, quotes)
- Implemented cascading deletes and referential integrity
- Optimized queries with proper joins

**Cross-Origin Requests**:

- Solved CORS issues in development environment
- Learned single-port deployment to avoid CORS in production
- Configured proper CORS headers when needed

### Conceptual Knowledge

**B2B vs B2C Systems**:

- Understood differences between consumer and business-focused applications
- Learned quote-based workflows vs direct sales
- Appreciated importance of technical documentation in B2B

**System Architecture**:

- Learned three-tier architecture principles
- Understood separation of concerns
- Appreciated importance of modularity and maintainability

**Production Considerations**:

- Learned differences between development and production setups
- Understood importance of environment variables
- Appreciated security considerations in production

---

## Contribution Guidelines

This project welcomes contributions from developers interested in improving the codebase, adding features, or fixing bugs.

### Code Standards

**TypeScript**:

- Use explicit types for function parameters and return values
- Avoid `any` type; use `unknown` or proper types
- Define interfaces for all data structures

**Formatting**:

- Code is formatted with Prettier
- Run `npm run format` before committing
- Follow existing code style and patterns

**Naming Conventions**:

- Use camelCase for variables and functions
- Use PascalCase for components and classes
- Use UPPER_SNAKE_CASE for environment variables

**Error Handling**:

- Use try-catch blocks for async operations
- Return proper error responses from API
- Log errors with appropriate context

### Commit Messages

- Use clear, descriptive commit messages
- Format: `[Component] Brief description`
- Examples:
  - `[Backend] Add pagination to product endpoints`
  - `[Frontend] Fix responsive layout on mobile`
  - `[Database] Add index to improve query performance`

### Pull Request Process

1. Fork the repository
2. Create a feature branch from `main`
3. Make your changes with tests if applicable
4. Ensure code passes linting and builds successfully
5. Submit pull request with clear description of changes
6. Reference any related issues

### Areas for Contribution

- Implementing features from Future Work section
- Writing tests for backend and frontend
- Improving documentation
- Fixing bugs from Known Issues section
- Optimizing database queries
- Enhancing UI/UX

---

## License

This project is licensed under the MIT License.

Copyright (c) 2026 MD EAFTEKHIRUL ISLAM

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

---

## Acknowledgments

This project was developed as a demonstration of full-stack web development capabilities, incorporating modern tools and best practices in software engineering. Special appreciation to the open-source community for the excellent libraries and frameworks that made this project possible.

---

**Project Repository**: [GitHub Link]  
**Developer**: MD EAFTEKHIRUL ISLAM  
**Year**: 2026

electrical-supplier-website/
├── docs/ # Project documentation
│ ├── scope.md # Project scope and requirements
│ ├── db-schema.md # Database schema definition
│ └── api-contract.md # API endpoint specifications
│
├── backend/ # Node.js backend application
│ ├── src/
│ │ ├── modules/ # Feature modules (auth, product, etc.)
│ │ ├── config/ # Configuration files
│ │ ├── middlewares/ # Express middlewares
│ │ ├── utils/ # Utility functions
│ │ ├── app.ts # Express app setup
│ │ └── server.ts # Server entry point
│ └── prisma/ # Database schema and migrations
│
└── frontend/ # React frontend application
├── src/
│ ├── app/ # App setup and routing
│ ├── components/ # Reusable UI components
│ ├── pages/ # Page components
│ ├── services/ # API service layer
│ ├── hooks/ # Custom React hooks
│ ├── types/ # TypeScript type definitions
│ ├── styles/ # Global styles
│ └── utils/ # Utility functions
└── public/ # Static assets

````

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ installed
- PostgreSQL installed and running
- Git installed

### Installation

1. **Clone the repository**

   ```bash
   cd electrical-supplier-website
````

2. **Setup Backend**

   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Edit .env with your database credentials
   npx prisma migrate dev
   npm run dev
   ```

3. **Setup Frontend**
   ```bash
   cd frontend
   npm install
   cp .env.example .env
   # Edit .env with backend API URL
   npm run dev
   ```

---

## 📄 Key Pages

1. **Home** - Hero, trust indicators, product categories, brands
2. **Products** - Filterable catalog with no pricing
3. **Product Details** - Specifications, datasheet, inquiry form
4. **Brands** - Authorized brand showcase
5. **Request a Quote** - Lead generation form
6. **About Us** - Business overview and credibility
7. **Contact** - Address, map, contact information
8. **Admin Panel** - Product and quote management

---

## 🎨 Design Principles

- Modern industrial look
- Clean layout with strong hierarchy
- White background with large spacing
- Minimal animations (micro-interactions only)
- No outdated UI patterns

### Color System

- **Primary**: Deep Engineering Blue
- **Secondary**: Industrial Green
- **Accent**: Orange/Yellow (CTAs only)
- **Background**: White with light gray sections

---

## 📊 Development Phases

### Phase 1 ✅ (Current)

- Project structure setup
- Documentation creation
- Folder architecture

### Phase 2 (Next)

- Backend API development
- Database schema implementation
- Authentication system

### Phase 3

- Frontend layout (Navbar, Footer)
- Routing setup
- Core pages development

### Phase 4

- Integration and testing
- Performance optimization
- Deployment preparation

---

## 🔒 Security Features

- HTTPS mandatory
- JWT authentication for admin
- Input sanitization
- SQL injection prevention
- Rate limiting on quote submissions
- Regular database backups

---

## 📈 Performance Targets

- Page load time: < 2 seconds
- Image lazy loading
- Asset compression
- Minimal third-party scripts
- Mobile-first responsive design

---

## 🤝 Development Workflow

1. **Read Documentation First** - Check `/docs` folder
2. **Backend Development** - API endpoints before UI
3. **Frontend Development** - Layout → Pages → Polish
4. **Testing** - Manual testing checklist
5. **Deployment** - VPS with Nginx + Cloudflare

---

## 📞 Support & Contact

For project-related questions, refer to the documentation in the `/docs` folder.

---

## 📝 License

Proprietary - All rights reserved

---

**Last Updated**: January 8, 2026
