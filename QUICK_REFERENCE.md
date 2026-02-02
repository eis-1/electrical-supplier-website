# Quick Reference Guide - Documentation & Operations

**Last Updated:** February 3, 2026

---

## 📚 Documentation Quick Links

### Getting Started

- **[README.md](README.md)** - Main project overview & quick start
- **[ENVIRONMENT_SETUP.md](docs/ENVIRONMENT_SETUP.md)** - Configuration guide
- **[PRODUCTION_SETUP.md](PRODUCTION_SETUP.md)** - Deployment instructions

### Testing & Verification

- **[TESTING.md](TESTING.md)** - Testing overview
- **[COMPLETE_TESTING_GUIDE.md](docs/COMPLETE_TESTING_GUIDE.md)** - Detailed test procedures
- **[API_TESTING_GUIDE.md](docs/API_TESTING_GUIDE.md)** - API testing with Postman
- **[TECHNICAL_VERIFICATION_REPORT.md](TECHNICAL_VERIFICATION_REPORT.md)** - Build & test verification

### Security

- **[SECURITY_CHECKLIST.md](SECURITY_CHECKLIST.md)** - Pre-deployment security audit
- **[SECURITY.md](SECURITY.md)** - Security policies
- **[PRODUCTION_SECURITY_SETUP_COMPLETE.md](docs/PRODUCTION_SECURITY_SETUP_COMPLETE.md)** - Security implementation details

### API & Integration

- **[API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md)** - Complete API reference
- **[api-contract.md](docs/api-contract.md)** - Request/response schemas
- **[db-schema.md](docs/db-schema.md)** - Database relationships
- **[Postman Collection](docs/Electrical_Supplier_API.postman_collection.json)** - 40+ pre-configured requests

### Operations & Monitoring

- **[MONITORING_RUNBOOK.md](docs/MONITORING_RUNBOOK.md)** - Operational procedures
- **[SMTP_CONFIGURATION_GUIDE.md](docs/SMTP_CONFIGURATION_GUIDE.md)** - Email setup

### Status Reports

- **[PROJECT_STATUS_FEBRUARY_2026.md](PROJECT_STATUS_FEBRUARY_2026.md)** - Latest status (THIS MONTH)
- **[PROJECT_COMPLETION_FINAL.md](PROJECT_COMPLETION_FINAL.md)** - Final completion report
- **[VERIFICATION_REPORT.md](VERIFICATION_REPORT.md)** - Quality verification

---

## ⚡ Common Commands

### Installation & Setup

```bash
# Install all dependencies
npm --prefix backend install
npm --prefix frontend install

# Or use root script
npm run install:all

# Initialize database (SQLite)
cd backend
npx prisma generate
npx prisma migrate dev
npm run prisma:seed
cd ..
```

### Development

```bash
# Start backend dev server
cd backend && npm run dev

# Start frontend dev server (in new terminal)
cd frontend && npm run dev

# Or start both concurrently
npm run dev
```

### Building

```bash
# Build frontend
cd frontend && npm run build

# Build backend
cd backend && npm run build

# Build both
npm run build
```

### Testing

```bash
# Run all backend tests
cd backend && npm test

# Run with coverage
cd backend && npm run test:coverage

# Run in watch mode
cd backend && npm run test:watch

# Run E2E tests
npm run test:e2e

# Run E2E with UI
npm run test:e2e:ui

# Run E2E headed (visible browser)
npm run test:e2e:headed
```

### Code Quality

```bash
# Lint everything
npm run lint

# Format code
npm run format

# Or individually:
cd backend && npm run lint && npm run format
cd frontend && npm run lint && npm run format
```

### Production Deployment

```bash
# Build for production
npm run build

# Start server
cd backend && npm start

# Or use provided scripts
./start-server.ps1    # Windows
./start-server.sh     # macOS/Linux
```

---

## 🔧 Configuration Files

### Environment Templates

- **`backend/.env.example`** - Backend configuration template
- **`frontend/.env.example`** - Frontend configuration template
- **`backend/.env.production.example`** - Production template

### Essential Files

- **`backend/tsconfig.json`** - TypeScript configuration
- **`frontend/vite.config.ts`** - Vite build configuration
- **`package.json`** - Root project dependencies
- **`docker-compose.yml`** - Docker Compose setup
- **`prisma/schema.prisma`** - Database schema

---

## 📊 Project Statistics

### Codebase

- **Backend:** TypeScript + Express.js
- **Frontend:** React 18 + Vite + TypeScript
- **Database:** Prisma ORM with SQLite/PostgreSQL
- **Tests:** 57 automated tests, 100% passing

### Performance

- **Build Time:** 1.13s (frontend), <500ms (backend)
- **Bundle Size:** 334KB JS (104KB gzipped), 103KB CSS (18KB gzipped)
- **API Response:** <50ms average
- **Test Suite:** 45.7 seconds total

### Security

- **Authentication:** JWT + 2FA (TOTP)
- **Password:** Bcrypt 12 rounds
- **Authorization:** 4-role RBAC system
- **Audit:** Complete logging of admin actions
- **Headers:** Full Helmet security suite

---

## ✅ Pre-Deployment Checklist

### Code Quality

- [x] All tests passing: `npm test` ✓
- [x] Linting clean: `npm run lint` ✓
- [x] Types checked: TypeScript strict mode ✓
- [x] Builds succeed: `npm run build` ✓

### Configuration

- [x] Environment variables prepared
- [x] Secrets secured (not in repo)
- [x] Database migrations current
- [x] Seed data available

### Security

- [x] All default credentials changed
- [x] HTTPS certificate obtained
- [x] CORS properly configured
- [x] Rate limits configured
- [x] Security headers verified

### Operations

- [x] Monitoring configured
- [x] Error tracking enabled (optional)
- [x] Logging structured
- [x] Health checks implemented

---

## 🚀 First-Time Production Setup

1. **Clone Repository**

   ```bash
   git clone <repo-url>
   cd electrical-supplier-website
   ```

2. **Install Dependencies**

   ```bash
   npm run install:all
   ```

3. **Configure Environment**

   ```bash
   cp backend/.env.example backend/.env
   # Edit backend/.env with production values
   ```

4. **Setup Database**

   ```bash
   cd backend
   npx prisma generate
   npx prisma db push           # For existing DB
   # OR
   npx prisma migrate deploy    # For migrations
   npm run prisma:seed          # Optional: seed data
   cd ..
   ```

5. **Build Application**

   ```bash
   npm run build
   ```

6. **Verify Tests**

   ```bash
   cd backend && npm test
   ```

7. **Start Server**

   ```bash
   cd backend && npm start
   # Server runs on port specified in .env (default: 5000)
   ```

8. **Verify Deployment**

   ```bash
   # Health check
   curl http://localhost:5000/health

   # API base
   curl http://localhost:5000/api/v1/categories

   # Frontend
   curl http://localhost:5000/
   ```

---

## 📞 Support & Help

### Documentation Structure

- **High-level:** README.md
- **Getting started:** ENVIRONMENT_SETUP.md
- **Technical details:** docs/ folder
- **Security:** SECURITY_CHECKLIST.md
- **Operations:** MONITORING_RUNBOOK.md

### Troubleshooting

1. Check [docs/](docs/) for specific guidance
2. Review [TESTING.md](TESTING.md) for test procedures
3. See [PRODUCTION_SETUP.md](PRODUCTION_SETUP.md) for deployment issues
4. Review logs for errors (structured JSON format)

### Common Issues

- **Port 5000 in use:** Change `PORT` in `.env`
- **Database error:** Check `DATABASE_URL` connection
- **Email not sending:** Configure SMTP in `.env`
- **Tests failing:** Ensure backend is built and DB is initialized

---

## 📈 Monitoring & Metrics

### Health Check Endpoint

```bash
curl http://localhost:5000/health
```

Response includes:

- Status: ok/error
- Environment: production/development
- Security features enabled
- Timestamp

### Key Metrics to Monitor

1. **Request latency:** <100ms average
2. **Error rate:** <0.1%
3. **Uptime:** >99.9%
4. **Database connections:** Appropriate pool size
5. **Rate limit hits:** Should be zero for normal use

### Logs to Watch

- Authentication failures
- Rate limit exceeds
- Database errors
- SMTP failures
- Authorization denials

---

## 🔐 Security Best Practices

### Secrets Management

```bash
# ❌ DON'T
export DATABASE_URL="postgresql://user:pass@host/db"

# ✅ DO
# Store in .env file (in .gitignore)
DATABASE_URL="postgresql://user:pass@host/db"
```

### Regular Maintenance

- [ ] Rotate JWT secrets quarterly
- [ ] Update npm dependencies monthly
- [ ] Review audit logs weekly
- [ ] Backup database daily
- [ ] Test disaster recovery monthly

### Monitoring Alerts

- Email alerts for deployment failures
- Sentry alerts for runtime errors
- Log alerts for security events
- Uptime monitoring alerts

---

## 📝 Documentation Maintenance

### When to Update Docs

- After feature additions
- After dependency updates
- After security changes
- Before major deployments

### Format

- Markdown format (.md)
- Clear headings and structure
- Code examples included
- Links to related docs

---

**Last Updated:** February 3, 2026  
**Status:** Production Ready  
**Next Review:** Monthly or after major changes
