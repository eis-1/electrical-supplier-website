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

### Core Functionality

- **Product Catalog**: Browse products by category and brand (B2B-friendly: quote-first, not cart-first)
- **Quote Requests**: Customers submit quote requests; admins manage quote pipeline
- **Admin Panel**: Secure admin login with CRUD for products, categories, brands, and quotes
- **File Uploads**: Upload product assets (e.g., datasheets) with magic-byte validation
- **Single-Port Deployment**: Express serves the API and built frontend on the same port
- **Modern UI**: React + Vite frontend with fully responsive mobile-first design

### Security Features

- **Two-Factor Authentication (2FA)**: TOTP-based MFA with QR code setup and backup codes
- **JWT Authentication**: Access tokens with secure refresh token rotation
- **Rate Limiting**: Protect against brute force and abuse
- **Enterprise Security**: Helmet headers, CSRF protection, input validation
- **File Security**: Magic-byte validation, path traversal protection
- **Password Security**: Bcrypt hashing with configurable rounds

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
- [Acknowledgments](#-acknowledgments)

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
# Or for existing database:
npx prisma db push
npm run prisma:seed
cd ..

# Build frontend and start everything on http://localhost:5000
./start-server.sh
```

**Testing**: See [docs/COMPLETE_TESTING_GUIDE.md](docs/COMPLETE_TESTING_GUIDE.md) for immediate testing steps.

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

This project includes comprehensive testing tools:

### Automated Tests

```bash
cd backend
npm install --save-dev jest axios speakeasy
npm test  # Runs the integration test suite
npm run test:coverage  # With coverage report
```

### Postman Collection

Import `docs/Electrical_Supplier_API.postman_collection.json` for:

- 40+ pre-configured requests
- Automatic token management
- Security attack simulations

### Manual Testing

See [docs/COMPLETE_TESTING_GUIDE.md](docs/COMPLETE_TESTING_GUIDE.md) for 8 phases of testing.

Recommended checks before pushing:

- `backend` → `npm test`
- `backend` → `npm run build`
- `frontend` → `npm run build`
- `backend` → `npm run lint`
- `frontend` → `npm run lint`

---

## 📚 Documentation

Available docs:

### Testing & API

- **Complete Testing Guide**: [docs/COMPLETE_TESTING_GUIDE.md](docs/COMPLETE_TESTING_GUIDE.md) - 8-phase testing workflow
- **API Testing Guide**: [docs/API_TESTING_GUIDE.md](docs/API_TESTING_GUIDE.md) - Complete API reference and examples
- **Test Suite Documentation**: [backend/tests/README.md](backend/tests/README.md) - Automated testing setup
- **Postman Collection**: [docs/Electrical_Supplier_API.postman_collection.json](docs/Electrical_Supplier_API.postman_collection.json) - 40+ pre-configured requests

### Project Information

- **Project Overview**: [docs/PROJECT_OVERVIEW.md](docs/PROJECT_OVERVIEW.md) - Architecture and design decisions
- **Project Structure**: [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) - Detailed folder layout
- **API Documentation**: [docs/API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md) - Full API specification
- **API Contract**: [docs/api-contract.md](docs/api-contract.md) - Request/response schemas
- **Database Schema**: [docs/db-schema.md](docs/db-schema.md) - Database design and relationships
- **Deployment Checklist**: [docs/DEPLOYMENT_CHECKLIST.md](docs/DEPLOYMENT_CHECKLIST.md) - Production deployment guide
- **Project Scope**: [docs/scope.md](docs/scope.md) - Original project requirements

### Security Documentation

- **Security Overview**: [SECURITY.md](SECURITY.md) - Security policies and reporting
- **Security Improvements**: [SECURITY_IMPROVEMENTS.md](SECURITY_IMPROVEMENTS.md) - Implemented security features
- **Security Audit**: [SECURITY_AUDIT_REPORT.md](SECURITY_AUDIT_REPORT.md) - Security assessment results

### Additional Resources

- **Completion Summary**: [PROJECT_COMPLETION_SUMMARY.md](PROJECT_COMPLETION_SUMMARY.md) - Project milestones
- **Mobile Responsive Guide**: [MOBILE_RESPONSIVE_GUIDE.md](MOBILE_RESPONSIVE_GUIDE.md) - Mobile optimization details
- **Contributing Guidelines**: [CONTRIBUTING.md](CONTRIBUTING.md) - How to contribute
- **Changelog**: [CHANGELOG.md](CHANGELOG.md) - Version history

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

### Planned Features

- [ ] **Advanced Search**: Full-text product search with PostgreSQL support
- [ ] **Improved Admin UX**: Better pagination and filtering in admin tables
- [ ] **File Upload Enhancements**: Progress indicators and drag-drop support
- [ ] **Multi-Admin Support**: Role-based access control (RBAC) for multiple admin users
- [ ] **Cloud Storage**: S3/R2 integration for scalable file storage
- [ ] **Email Templates**: HTML email templates for quotes and notifications
- [ ] **Analytics Dashboard**: Enhanced metrics and reporting for admins
- [ ] **API Rate Limiting**: Per-user rate limits with Redis integration
- [ ] **Audit Logging**: Comprehensive activity logs for compliance
- [ ] **Export Features**: CSV/Excel export for quotes and products

---

## 📞 Contact

- **Author**: MD EAFTEKHIRUL ISLAM
- **Email**: Contact through GitHub issues
- **GitHub**: [@eis-1](https://github.com/eis-1)
- **Repository**: [electrical-supplier-website](https://github.com/eis-1/electrical-supplier-website)
- **Issues**: [Report bugs or request features](https://github.com/eis-1/electrical-supplier-website/issues)

---

## 🙏 Acknowledgments

Built with modern open-source technologies:

### Core Technologies

- **[React 18](https://react.dev/)** - UI library
- **[Vite](https://vitejs.dev/)** - Build tool and dev server
- **[TypeScript](https://www.typescriptlang.org/)** - Type safety
- **[Express.js](https://expressjs.com/)** - Backend framework
- **[Prisma ORM](https://www.prisma.io/)** - Database toolkit

### Security & Authentication

- **[bcryptjs](https://github.com/dcodeIO/bcrypt.js)** - Password hashing
- **[jsonwebtoken](https://github.com/auth0/node-jsonwebtoken)** - JWT implementation
- **[speakeasy](https://github.com/speakeasyjs/speakeasy)** - 2FA/TOTP
- **[helmet](https://helmetjs.github.io/)** - Security headers

### Development Tools

- **[ESLint](https://eslint.org/)** & **[Prettier](https://prettier.io/)** - Code quality
- **[Jest](https://jestjs.io/)** - Testing framework

Special thanks to the open-source community for making modern web development accessible and secure.

For deeper technical notes and architecture details, see **[`docs/PROJECT_OVERVIEW.md`](docs/PROJECT_OVERVIEW.md)**.
