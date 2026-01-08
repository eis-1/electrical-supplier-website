# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-01-09

### Added

#### Backend

- Express.js REST API server with TypeScript
- JWT-based authentication system
- Prisma ORM integration with SQLite
- Product management endpoints (CRUD operations)
- Category management endpoints
- Brand management endpoints
- Quote request handling system
- File upload functionality for datasheets and logos
- Email notification system using Nodemailer
- Winston logger for structured logging
- Rate limiting middleware
- Error handling middleware
- CORS configuration
- Environment variable management

#### Frontend

- React 18 single-page application with TypeScript
- Vite build tooling
- React Router for client-side routing
- Product catalog pages with filtering
- Brand showcase page
- Quote request form
- Admin login page
- Admin dashboard with statistics
- Admin product management interface
- Admin category and brand management
- Admin quote management interface
- Responsive design for mobile and desktop
- 3D CSS animations and transitions
- Glass morphism effects on navbar
- WhatsApp contact integration
- Smooth page transitions

#### Database

- Prisma schema with proper relationships
- Categories table
- Brands table
- Products table with foreign keys
- Quotes table for customer requests
- Quote items table for product selections
- Admin users table with hashed passwords
- Database seeding scripts

#### Documentation

- Comprehensive README.md
- API documentation in /docs
- Database schema documentation
- Deployment guides
- Contributing guidelines
- MIT License

### Changed

- Migrated from two-port setup to single-port deployment
- Optimized animations for smoother 60fps performance
- Enhanced WhatsApp button with better visibility
- Improved admin navigation with prominent back buttons

### Fixed

- SPA routing issues with static file serving
- WhatsApp button click handler
- Admin back button visibility
- Animation timing for professional feel
- CORS issues in development
- Mobile responsive layout issues

### Security

- Password hashing with bcrypt
- JWT token expiration
- Protected admin routes
- Input validation on all endpoints
- SQL injection prevention via Prisma
- XSS protection

## [Unreleased]

### Planned Features

- Pagination for large product lists
- Full-text search across products
- Email queue for background processing
- Multiple admin users with roles
- Product image gallery
- Enhanced analytics dashboard
- Export quotes to CSV/PDF
- Cloud storage integration (S3)
- Two-factor authentication
- API rate limiting per client

### Known Issues

- Admin panel not fully optimized for mobile
- No automatic database backups
- Email requires manual SMTP configuration
- Files stored locally without cloud backup
- No refresh token mechanism

---

## Version History

- **1.0.0** (2026-01-09): Initial release with full B2B functionality
