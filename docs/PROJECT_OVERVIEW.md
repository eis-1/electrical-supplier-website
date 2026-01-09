# Project Overview (B2B Electrical Supplier Website)

This document captures the **high-level goals, architecture, and key technical decisions** behind the Electrical Supplier Website.

## Why this project exists

B2B electrical supply workflows typically differ from B2C e-commerce:

- Pricing is often negotiated (quote-first, not cart-first)
- Orders can be large and specification-heavy
- Buyers care about authenticity, availability, and technical documents

This project is designed to support that reality with a catalog + quote pipeline + admin operations.

## Architecture

### Single-port production flow

In production the backend serves both:

- **API** (Express) under `/api/v1`
- **Frontend** (built Vite output) as static assets

Benefits:

- Simple deployment (one server/process)
- No production CORS complexity
- Easy reverse-proxy setup (Nginx/Cloudflare)

### Backend

- Node.js + Express + TypeScript
- Prisma ORM
- SQLite for development (schema compatible with PostgreSQL for production)
- Auth: JWT for admin routes
- Uploads: local filesystem in `backend/uploads/` (paths stored in DB)

### Frontend

- React + TypeScript + Vite
- React Router
- CSS Modules
- Services layer for API communication

## Key product flows

### Public browsing

- View products
- Filter by brand/category
- Open product details

### Quote request workflow

- Customer submits quote request
- Admin reviews requests in Admin panel
- Admin updates status (pending → processing → completed/rejected)

### Admin operations

- Authenticated admin login
- CRUD: Products, Categories, Brands
- Quote management

## Technology choices

- **React + Vite**: modern dev experience and fast builds
- **TypeScript**: safety across frontend and backend
- **Prisma**: type-safe DB access and migrations
- **Express**: lightweight, well-understood API framework

## Current limitations (good to know)

- Email notifications depend on SMTP configuration (optional)
- Upload storage is local filesystem (consider S3/R2 in production)
- Admin UX may require pagination for very large datasets

## Roadmap ideas

- Pagination and improved filtering for admin tables
- Full-text product search (PostgreSQL-ready)
- Upload validation (type/size) + progress UI
- Multiple admins + RBAC
- Cloud storage for uploads

## Links

- Main README: `../README.md`
- Backend notes: `../backend/README.md`
- API docs: `API_DOCUMENTATION.md`
- Deployment checklist: `DEPLOYMENT_CHECKLIST.md`
