# Deployment Readiness Guide

---

## Quick overview

This guide outlines a practical path from a development setup to a production deployment. Exact timelines and costs depend on your hosting provider, traffic profile, and operational requirements.

---

## Step-by-step implementation plan

### Phase 1: Database migration

**Why:** For production deployments, PostgreSQL is recommended for reliability, concurrency, and operational tooling.

**Steps:**

```bash
# 1. Install PostgreSQL (Windows)
# Download from: https://www.postgresql.org/download/windows/
# OR use a managed PostgreSQL service (recommended for most production environments)

# 2. Create database
psql -U postgres
CREATE DATABASE electrical_supplier;
CREATE USER app_user WITH PASSWORD 'strong_password_here';
GRANT ALL PRIVILEGES ON DATABASE electrical_supplier TO app_user;
\q

# 3. Update backend/.env
DATABASE_URL="postgresql://app_user:strong_password_here@localhost:5432/electrical_supplier?connection_limit=10&pool_timeout=20"

# 4. Run migration
cd backend
npm run prisma:migrate

# 5. Seed data (if needed)
npm run prisma:seed

# 6. Test connection
npm run dev
```

**Verification:**

```bash
# Check backend logs for:
# - "Database connected successfully"
# - No SQLite file path

# Test API:
curl http://localhost:5000/api/v1/products
# Should return products
```

**Result:**

- Improved concurrency and reliability under load
- Reduced risk of write contention

---

### Phase 2: Redis setup

**Why:** Distributed rate limiting, session storage, caching.

**Steps:**

```bash
# Option A: Local Redis (Development/Small Traffic)
# Windows: Download from https://github.com/microsoftarchive/redis/releases
# OR use WSL: wsl --install then apt install redis-server

# Start Redis
redis-server

# Option B: Managed Redis (recommended for production)

# Update backend/.env
REDIS_URL=redis://localhost:6379
# OR for managed:
REDIS_URL=redis://:password@your-redis-host.com:6379

# Test connection
redis-cli ping
# Should return: PONG
```

**Verification:**

```bash
# Check backend logs for:
# - "Redis connected successfully"
# - "Using Redis store for rate limiting"

# Test rate limiting:
# Make 6 rapid login requests - should get 429 error
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"wrong"}' \
  --repeat 6
```

**Result:**

- Distributed rate limiting via a Redis-backed store
- Foundation for an optional caching layer

---

### Phase 3: Cloud storage

**Why:** Production deployments typically store uploads in object storage to avoid local-disk constraints and simplify scaling.

**Steps:**

```bash
# Option A: AWS S3 (Most common)
# 1. Create AWS account
# 2. Create S3 bucket: electrical-supplier-uploads
# 3. Create IAM user with S3 permissions
# 4. Get access keys

# Update backend/.env
STORAGE_PROVIDER=s3
AWS_S3_BUCKET=electrical-supplier-uploads
AWS_S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key

# Option B: Cloudflare R2
# 1. Create Cloudflare account
# 2. Go to R2 Object Storage
# 3. Create bucket: electrical-supplier
# 4. Create API token

# Update backend/.env
STORAGE_PROVIDER=r2
R2_ACCOUNT_ID=your_account_id
R2_BUCKET_NAME=electrical-supplier
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_PUBLIC_URL=https://pub-xxx.r2.dev

# Option C: Azure Blob Storage
STORAGE_PROVIDER=azure
AZURE_STORAGE_ACCOUNT_NAME=electricalsupplier
AZURE_STORAGE_ACCOUNT_KEY=your_key
AZURE_STORAGE_CONTAINER=uploads
```

**Migrate Existing Files:**

```bash
# Install AWS CLI or Cloudflare CLI
# AWS S3:
aws s3 sync ./backend/uploads s3://electrical-supplier-uploads/

# Cloudflare R2:
wrangler r2 object put electrical-supplier/uploads --file=./backend/uploads/* --recursive
```

**Verification:**

```bash
# Upload test file via API
curl -X POST http://localhost:5000/api/v1/products \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "image=@test.jpg"

# Check:
# - File URL should start with your storage provider domain
# - File is accessible (if meant to be public)
# - Local uploads/ folder does not receive new files
```

**Result:**

- Uploads stored outside the application server
- Better durability and operational flexibility

---

### Phase 4: Environment configuration

**Why:** Production needs different settings than development.

**Create production environment file:**

```bash
# backend/.env.production
NODE_ENV=production
PORT=5000
API_VERSION=v1

# Database (PostgreSQL with connection pooling)
DATABASE_URL="postgresql://app_user:password@your-db-host.com:5432/electrical_supplier?connection_limit=10&pool_timeout=20"

# Redis (Managed service)
REDIS_URL=redis://:password@your-redis-host.com:6379

# Storage (Cloud provider)
STORAGE_PROVIDER=r2
R2_ACCOUNT_ID=your_account_id
R2_BUCKET_NAME=electrical-supplier
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_PUBLIC_URL=https://pub-xxx.r2.dev

# JWT (generate new strong secrets for each environment)
# Do not commit real secrets to the repository.
JWT_SECRET=<generate-32-byte-base64>
JWT_REFRESH_SECRET=<generate-32-byte-base64>
COOKIE_SECRET=<generate-32-byte-base64>

# Security
CORS_ORIGIN=https://yourdomain.com
FRONTEND_URL=https://yourdomain.com
SESSION_SECURE=true
COOKIE_SECURE=true

# Rate Limiting (Production stricter)
RATE_LIMIT_WINDOW_MS=900000  # 15 min
RATE_LIMIT_MAX_REQUESTS=100
LOGIN_RATE_LIMIT_MAX_REQUESTS=5

# File Upload
MAX_FILE_SIZE=10485760  # 10MB
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/webp,application/pdf

# Email (Configure your SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@yourdomain.com

# Monitoring
SENTRY_DSN=https://your-sentry-dsn
LOG_LEVEL=info
```

**Frontend environment:**

```bash
# frontend/.env.production
VITE_API_URL=https://api.yourdomain.com/api/v1
VITE_SITE_URL=https://yourdomain.com
VITE_UPLOAD_MAX_SIZE=10485760
NODE_ENV=production
```

---

### Phase 5: Add pagination limits

**Why:** Prevent users from requesting too much data at once.

**Update backend configuration:**

```typescript
// backend/src/config/env.ts
// Add to env validation:

export const env = {
  // ... existing config ...

  // Pagination limits
  MAX_PAGE_SIZE: parseInt(process.env.MAX_PAGE_SIZE || "100", 10),
  DEFAULT_PAGE_SIZE: parseInt(process.env.DEFAULT_PAGE_SIZE || "12", 10),
  MAX_QUERY_RESULTS: parseInt(process.env.MAX_QUERY_RESULTS || "1000", 10),
};
```

**Update product controller:**

```typescript
// backend/src/modules/product/product.controller.ts
// Find the getProducts method and update:

const limitNum = Math.min(
  parseInt(limit as string, 10) || env.DEFAULT_PAGE_SIZE,
  env.MAX_PAGE_SIZE,
);
```

**Add to .env:**

```bash
MAX_PAGE_SIZE=100
DEFAULT_PAGE_SIZE=12
MAX_QUERY_RESULTS=1000
```

**Result:**

- Reduces the risk of overly large queries
- Helps keep API performance predictable

---

### Phase 6: Production build and verification

**Build production bundles:**

```bash
# Frontend build
cd frontend
npm run build
# Check dist/ folder

# Backend build
cd ../backend
npm run build
# Check dist/ folder - compiled TypeScript

# Test production build locally
npm run start:prod
```

**Performance testing:**

```bash
# Install Apache Bench (load testing tool)
# Windows: Download from Apache website
# Mac: Already installed
# Linux: apt install apache2-utils

# Example load test (adjust to your environment)
ab -n 1000 -c 100 http://localhost:5000/api/v1/products

# Review results for latency distribution and error rates
```

**Load test with more realistic scenario:**

```bash
# Install k6 (modern load testing)
# Windows: choco install k6
# Mac: brew install k6
# Linux: snap install k6

# Create test script: load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 100 },  // Ramp up to 100 users
    { duration: '5m', target: 100 },  // Stay at 100 users
    { duration: '2m', target: 0 },    // Ramp down
  ],
};

export default function () {
  let res = http.get('http://localhost:5000/api/v1/products');
  check(res, { 'status is 200': (r) => r.status === 200 });
  sleep(1);
}

# Run test
k6 run load-test.js

# Review results for latency distribution and error rates
```

---

## Long-term reliability checklist

### Daily Monitoring (Automated)

**Set up health checks:**

```typescript
// backend/src/routes/health.ts
router.get("/health", async (req, res) => {
  const health = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    database: "unknown",
    redis: "unknown",
  };

  // Check database
  try {
    await prisma.$queryRaw`SELECT 1`;
    health.database = "connected";
  } catch (error) {
    health.database = "disconnected";
    health.status = "unhealthy";
  }

  // Check Redis
  try {
    await redis.ping();
    health.redis = "connected";
  } catch (error) {
    health.redis = "disconnected";
  }

  res.status(health.status === "healthy" ? 200 : 503).json(health);
});
```

**Use uptime monitoring (free options):**

- UptimeRobot: Free, checks every 5 minutes
- Pingdom: Free tier available
- Better Uptime: Free tier available

```bash
# Configure alert to:
1. Check /health endpoint every 5 minutes
2. Alert if down for >5 minutes
3. Send email/SMS/Slack notification
```

---

### Weekly Maintenance (15 min/week)

**Database maintenance:**

```bash
# Run weekly (automate with cron)
# Vacuum database (PostgreSQL)
psql -U app_user -d electrical_supplier -c "VACUUM ANALYZE;"

# Check database size
psql -U app_user -d electrical_supplier -c "SELECT pg_size_pretty(pg_database_size('electrical_supplier'));"

# Should be: <1GB (normal), <5GB (OK), >10GB (investigate)
```

**Log review:**

```bash
# Check error logs
tail -n 100 logs/error.log

# Look for:
# - Repeated errors (fix root cause)
# - Elevated 5xx rates
# - Database connection errors
# - Resource saturation (CPU/memory)
```

**Performance check:**

```bash
# Check response times
curl -w "@curl-format.txt" -o /dev/null -s http://yourdomain.com/api/v1/products

# curl-format.txt:
time_total: %{time_total}s
time_connect: %{time_connect}s
time_starttransfer: %{time_starttransfer}s

# Track results against your SLOs
```

---

### Monthly review

**Storage audit:**

```bash
# Check cloud storage usage
aws s3 ls s3://electrical-supplier-uploads/ --recursive --summarize

# Clean up old/unused files if needed
# Review storage growth and lifecycle policies. Consider:
1. Compress images (e.g., WebP)
2. Archive old files
3. Delete unused uploads
```

**Security updates:**

```bash
# Update dependencies
cd backend
npm audit
npm update

cd ../frontend
npm audit
npm update

# Update system packages
apt update && apt upgrade  # Linux
brew update && brew upgrade  # Mac
```

**Performance optimization:**

```bash
# Review slow queries (PostgreSQL)
SELECT query, calls, mean_exec_time, max_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

# Add indexes for slow queries
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
```

---

### Periodic operations review

**Capacity review:**

```bash
# Check growth metrics
- Monthly active users: ___ (growing/stable/declining)
- Daily API requests: ___ (growing/stable)
- Database size: ___ GB (growing/stable)
- Storage size: ___ GB (growing/stable)

# Plan upgrades if growth or load trends indicate it (e.g., increased latency, higher error rates, resource saturation).
```

**Backup verification:**

```bash
# Test database backup restoration
pg_dump electrical_supplier > backup-test.sql
dropdb electrical_supplier_test
createdb electrical_supplier_test
psql electrical_supplier_test < backup-test.sql

# Verify tables and data are restored and the application starts cleanly
```

**Security audit:**

```bash
# Run security scan
npm audit --production
# Fix all HIGH and CRITICAL vulnerabilities

# Review access logs for suspicious activity
grep "401\|403\|429" logs/access.log | tail -n 100

# Update SSL certificates (if self-managed)
certbot renew --dry-run
```

---

## Performance targets (SLOs)

Define and document service-level objectives (SLOs) appropriate to your deployment (uptime, latency, error rate, and key user journeys). Use monitoring and load testing to validate the system meets those targets under realistic traffic.

---

## Budgeting notes

Infrastructure costs vary widely based on provider choice, region, redundancy requirements, and traffic. Typical cost categories include:

- Database (managed vs self-hosted)
- Cache/rate limiting store (optional)
- Object storage/CDN (if used)
- Compute (VM/container platform)
- Domain and TLS
- Monitoring/logging
- Backups and retention

---

## Pre-launch checklist

**Before deploying to production, verify:**

### Database

- [ ] PostgreSQL configured and tested
- [ ] Connection pooling enabled
- [ ] Migrations run successfully
- [ ] Indexes created for all foreign keys
- [ ] Backup strategy in place (daily automated)
- [ ] Test data removed

### Redis

- [ ] Redis connected and tested
- [ ] Rate limiting using Redis (not in-memory)
- [ ] Session storage configured
- [ ] Persistence enabled (AOF or RDB)

### Storage

- [ ] Cloud storage configured (S3/R2/Azure)
- [ ] File uploads working
- [ ] Old local files migrated
- [ ] CDN configured (optional but recommended)
- [ ] Backup strategy for uploads

### Security

- [ ] Strong JWT secrets
- [ ] Strong admin password
- [ ] HTTPS/SSL configured
- [ ] CORS configured for your domain only
- [ ] Rate limiting tested and working
- [ ] File upload validation working
- [ ] No .env files in Git
- [ ] Security headers enabled (Helmet)

### Performance

- [ ] Pagination limits configured appropriately
- [ ] Load testing completed and reviewed against your SLOs
- [ ] Latency and error rates meet your targets
- [ ] Frontend build output reviewed and optimized
- [ ] Images optimized (WebP format)

### Monitoring

- [ ] Health check endpoint working
- [ ] Uptime monitoring configured
- [ ] Error logging configured (Sentry optional)
- [ ] Performance monitoring configured
- [ ] Alerts configured (email/SMS/Slack)

### Testing

- [ ] Backend and frontend test suites passing
- [ ] E2E tests passing
- [ ] API endpoints tested
- [ ] File upload tested
- [ ] Authentication tested
- [ ] Rate limiting tested
- [ ] Admin panel tested

### Documentation

- [ ] README updated with deployment info
- [ ] API documentation up to date
- [ ] Environment variables documented
- [ ] Backup/restore procedures documented
- [ ] Troubleshooting guide created

---

## Deployment day

**Step-by-step deployment process:**

```bash
# 1. Final local test
npm run test
npm run build
npm run start:prod
# Verify everything works

# 2. Push to Git (WITHOUT .env files)
git add .
git commit -m "Production ready deployment"
git push origin main

# 3. Set up production server
ssh user@your-server.com

# Install Node.js, PostgreSQL, Redis
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs postgresql redis-server

# 4. Clone repository
git clone https://github.com/yourusername/electrical-supplier-website.git
cd electrical-supplier-website

# 5. Install dependencies
cd backend && npm install --production
cd ../frontend && npm install --production

# 6. Configure environment
# Copy your .env.production to .env
nano backend/.env
# Paste your production environment variables

# 7. Run migrations
cd backend
npx prisma migrate deploy

# 8. Build frontend
cd ../frontend
npm run build

# 9. Set up reverse proxy (Nginx)
sudo apt install nginx

# /etc/nginx/sites-available/electrical-supplier
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Frontend
    location / {
        root /path/to/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Enable site
sudo ln -s /etc/nginx/sites-available/electrical-supplier /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# 10. Set up SSL (Let's Encrypt)
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# 11. Start backend with PM2 (process manager)
npm install -g pm2
cd backend
pm2 start dist/server.js --name electrical-supplier-api
pm2 save
pm2 startup

# 12. Verify deployment
curl https://yourdomain.com/api/v1/health
# Should return: {"status":"healthy","database":"connected","redis":"connected"}

# 13. Set up monitoring
# Configure UptimeRobot to ping: https://yourdomain.com/api/v1/health
```

**Post-deployment verification:**

```bash
# Check all critical endpoints
curl https://yourdomain.com/api/v1/products
curl https://yourdomain.com/api/v1/categories
curl https://yourdomain.com/api/v1/health

# Check logs
pm2 logs electrical-supplier-api

# Monitor closely after launch and confirm core user journeys work end-to-end
```

---

## Summary

After completing the steps above, you should have a production deployment that includes:

- A production-grade database configuration
- Redis-backed rate limiting (and optional caching)
- Object storage for uploads (if applicable)
- Production environment variables and secrets management
- Build artifacts for backend and frontend
- Reverse proxy/TLS and a process manager
- Monitoring and alerting

Revisit operational reviews periodically (updates, backups, monitoring, and access audits).
