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

---

## 🙏 Acknowledgments

Built with help from the open-source community, especially:

- React, Vite, React Router
- Express.js
- Prisma ORM
- ESLint and Prettier

For deeper technical notes and architecture details, see **[`docs/PROJECT_OVERVIEW.md`](docs/PROJECT_OVERVIEW.md)**.
