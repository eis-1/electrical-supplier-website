# Environment Configuration Guide

## Overview

This guide covers environment variable configuration for development and production deployments.

## Backend Environment Variables

### Required Variables

#### Database

```bash
DATABASE_URL="postgresql://user:password@localhost:5432/electrical_supplier"
# Or for SQLite (development):
DATABASE_URL="file:./dev.db"
```

#### Authentication

```bash
JWT_SECRET="your-super-secret-jwt-key-min-32-chars"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_SECRET="your-refresh-token-secret-min-32-chars"
JWT_REFRESH_EXPIRES_IN="7d"
COOKIE_SECRET="your-cookie-secret-min-32-chars"
```

#### Server

```bash
NODE_ENV="production"  # Options: development, production, test
PORT="5000"
# CORS allowlist. Supports comma-separated origins.
# Example: "https://yourdomain.com,https://www.yourdomain.com"
CORS_ORIGIN="https://yourdomain.com"

# Reverse proxy trust
# If true, Express will trust X-Forwarded-* headers (req.ip, req.secure, etc.).
# Set this to true ONLY when running behind a real reverse proxy/load balancer.
# Defaults: true in production/test, false in development.
TRUST_PROXY="true"
```

### Optional Variables

#### Redis (Rate Limiting & Caching)

```bash
REDIS_URL="redis://localhost:6379"
# If not set, in-memory rate limiting is used
```

#### Rate limiting

```bash
# Global API limiter
RATE_LIMIT_WINDOW_MS="900000"      # 15 minutes
RATE_LIMIT_MAX_REQUESTS="100"      # requests per window per IP

# Auth endpoints (login/refresh/etc)
AUTH_RATE_LIMIT_WINDOW_MS="900000" # 15 minutes
AUTH_RATE_LIMIT_MAX_REQUESTS="5"   # failed attempts per window per IP

# Two-Factor endpoints (verification)
TWO_FACTOR_RATE_LIMIT_WINDOW_MS="300000" # 5 minutes
TWO_FACTOR_RATE_LIMIT_MAX_REQUESTS="5"   # attempts per window per IP/identifier

# Quote submission limiter
QUOTE_RATE_LIMIT_WINDOW_MS="3600000" # 1 hour
QUOTE_RATE_LIMIT_MAX_REQUESTS="5"    # submissions per window per IP
```

Note: the integration tests use `X-Forwarded-For` to simulate distinct client IPs.
If you set `TRUST_PROXY=false`, rate limiting will fall back to the direct socket IP
(often `127.0.0.1` locally), which can change rate-limit behavior.

#### Email Service

```bash
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_SECURE="false"  # true for port 465
EMAIL_FROM="noreply@yourdomain.com"
```

#### File Storage (S3/R2)

```bash
# For S3-compatible storage (AWS S3 / Cloudflare R2 / MinIO)
STORAGE_PROVIDER="s3"
S3_ACCESS_KEY_ID="your-access-key-id"
S3_SECRET_ACCESS_KEY="your-secret-access-key"
S3_REGION="us-east-1"
S3_BUCKET="your-bucket-name"
S3_PUBLIC_URL="https://cdn.yourdomain.com"
S3_PUBLIC_BUCKET="true"

# For Cloudflare R2 (S3-compatible)
STORAGE_PROVIDER="r2"
S3_ACCESS_KEY_ID="your-r2-access-key-id"
S3_SECRET_ACCESS_KEY="your-r2-secret-access-key"
S3_REGION="auto"
S3_BUCKET="your-bucket-name"
# R2 endpoint example: https://<accountid>.r2.cloudflarestorage.com
S3_ENDPOINT="https://<accountid>.r2.cloudflarestorage.com"
S3_PUBLIC_URL="https://your-public-domain-or-r2-public-url"
S3_PUBLIC_BUCKET="true"

# For local storage (development)
STORAGE_PROVIDER="local"
UPLOAD_DIR="./uploads"
```

#### Malware Scanning

```bash
# VirusTotal
MALWARE_SCAN_PROVIDER="virustotal"  # Options: virustotal, clamav, none
VIRUSTOTAL_API_KEY="your-virustotal-api-key"

# ClamAV (self-hosted)
MALWARE_SCAN_PROVIDER="clamav"
CLAMAV_HOST="localhost"
CLAMAV_PORT="3310"

# Fail mode behavior
MALWARE_SCAN_FAIL_MODE="fail_open"  # Options: fail_open, fail_closed
```

#### Monitoring (Sentry)

```bash
SENTRY_DSN="https://your-sentry-dsn@sentry.io/project"
SENTRY_ENVIRONMENT="production"
SENTRY_TRACES_SAMPLE_RATE="0.1"
```

#### Security Headers

```bash
HELMET_CSP_ENABLED="true"
HELMET_HSTS_MAX_AGE="31536000"
```

## Frontend Environment Variables

Create `.env` in the `frontend/` directory:

```bash
# API endpoint
VITE_API_URL="http://localhost:5000"  # Development
# VITE_API_URL="https://api.yourdomain.com"  # Production
```

## Environment Validation

The backend validates required environment variables on startup. Missing critical variables will cause the server to exit with an error message.

### Validation Rules

1. **JWT_SECRET** must be at least 32 characters
2. **DATABASE_URL** must be a valid connection string
3. **PORT** must be a valid number between 1-65535
4. **NODE_ENV** must be one of: development, production, test

## Security Best Practices

### Secret Generation

Generate strong secrets using:

```bash
# Generate 32-byte random secret (Node.js)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Or using OpenSSL
openssl rand -hex 32
```

### Secret Management

#### Development

- Use `.env` file (never commit to git)
- Copy `.env.example` and fill in values

#### Production

- Use environment variables (cloud platform secrets)
- AWS: AWS Secrets Manager or Parameter Store
- Vercel/Netlify: Platform environment variables
- Docker: Use secrets or environment files

### Never Commit Secrets

Ensure these patterns are in `.gitignore`:

```
.env
.env.local
.env.production
*.key
*.pem
secrets/
```

## Environment Examples

### Development (.env)

```bash
NODE_ENV=development
PORT=5000
DATABASE_URL="file:./dev.db"
JWT_SECRET="dev-secret-change-in-production-min-32-chars"
JWT_REFRESH_SECRET="dev-refresh-secret-change-in-production"
COOKIE_SECRET="dev-cookie-secret-change-in-production-32"
CORS_ORIGIN="http://localhost:5173"
STORAGE_PROVIDER="local"
```

### Production (Platform Secrets)

```bash
NODE_ENV=production
PORT=5000
DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require"
JWT_SECRET="<64-char-random-hex>"
JWT_REFRESH_SECRET="<64-char-random-hex>"
COOKIE_SECRET="<64-char-random-hex>"
CORS_ORIGIN="https://yourdomain.com"
REDIS_URL="redis://redis-host:6379"
STORAGE_PROVIDER="s3"
S3_ACCESS_KEY_ID="<YOUR_ACCESS_KEY_ID>"
S3_SECRET_ACCESS_KEY="<YOUR_SECRET_ACCESS_KEY>"
S3_REGION="us-east-1"
S3_BUCKET="prod-uploads"
MALWARE_SCAN_PROVIDER="virustotal"
VIRUSTOTAL_API_KEY="<YOUR_VIRUSTOTAL_API_KEY>"
MALWARE_SCAN_FAIL_MODE="fail_closed"
SENTRY_DSN="https://...@sentry.io/..."
SMTP_HOST="smtp.sendgrid.net"
SMTP_USER="apikey"
SMTP_PASS="<YOUR_SENDGRID_API_KEY>"
```

## Troubleshooting

### Server Won't Start

- Check `.env` file exists in `backend/` directory
- Verify all required variables are set
- Check for syntax errors (no spaces around `=`)

### Database Connection Errors

- Verify `DATABASE_URL` format is correct
- Test connection manually using `psql` or database client
- Check network/firewall rules for remote databases

### File Upload Errors

- Verify storage provider credentials
- Check bucket permissions (S3/R2)
- Ensure upload directory exists (local storage)

### Email Not Sending

- Verify SMTP credentials
- Check `EMAIL_ENABLED=true`
- Test SMTP connection using telnet or mail client

## Validation Script

Run this script to validate your environment setup:

```bash
cd backend
npm run validate-env  # If script is added to package.json
```

Or create `backend/scripts/validate-env.ts`:

```typescript
import { config } from "dotenv";
config();

const requiredVars = [
  "DATABASE_URL",
  "JWT_SECRET",
  "JWT_REFRESH_SECRET",
  "CSRF_SECRET",
  "FRONTEND_URL",
];

const missing = requiredVars.filter((v) => !process.env[v]);

if (missing.length > 0) {
  console.error("Missing required environment variables:");
  missing.forEach((v) => console.error(`   - ${v}`));
  process.exit(1);
}

// Validate JWT_SECRET length
if (process.env.JWT_SECRET!.length < 32) {
  console.error("JWT_SECRET must be at least 32 characters");
  process.exit(1);
}

console.log("All required environment variables are set");
```

## References

- [Twelve-Factor App: Config](https://12factor.net/config)
- [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [Node.js Environment Variables Best Practices](https://nodejs.org/en/learn/command-line/how-to-read-environment-variables-from-nodejs)
