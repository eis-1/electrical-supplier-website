# Production Deployment Guide

## Security Checklist

### 1. Environment Variables - CRITICAL ⚠️

Before deploying to production, you **MUST** change the following secrets in `backend/.env`:

```bash
# Generate strong random secrets (32+ characters)
JWT_SECRET=<USE_STRONG_RANDOM_SECRET_HERE>
JWT_REFRESH_SECRET=<USE_DIFFERENT_RANDOM_SECRET_HERE>
COOKIE_SECRET=<USE_ANOTHER_RANDOM_SECRET_HERE>

# Set proper CORS origin (your actual domain)
CORS_ORIGIN=https://yourdomain.com

# Database - Use PostgreSQL in production
DATABASE_URL="postgresql://username:password@host:5432/dbname?schema=public"

# Redis - REQUIRED for production (multi-instance rate limiting)
REDIS_URL=redis://username:password@host:6379

# Email - Configure SMTP for notifications
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@yourdomain.com
ADMIN_EMAIL=admin@yourdomain.com

# Captcha - Enable to prevent spam
CAPTCHA_SITE_KEY=your-cloudflare-turnstile-site-key
CAPTCHA_SECRET_KEY=your-cloudflare-turnstile-secret-key
```

### 2. Secret Generation Commands

Generate strong secrets using Node.js:

```bash
# Generate 3 random secrets (run this 3 times)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Or using OpenSSL:

```bash
openssl rand -base64 32
```

### 3. Admin Account Setup

Create your first admin account:

```bash
cd backend
npm run prisma:generate
npx tsx create-admin.ts
```

Follow the prompts to create an admin with email, password, and optional 2FA.

### 4. Database Migration

```bash
cd backend

# Generate Prisma Client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# (Optional) Seed initial data
npm run prisma:seed
```

### 5. Build Frontend

```bash
cd frontend
npm install
npm run build
```

The built files will be in `frontend/dist`. The backend serves these automatically.

---

## Architecture Improvements Implemented

### ✅ 1. Security Hardening

- **Request ID tracking**: Every request gets a unique `X-Request-ID` for tracing
- **Admin route protection**: All admin API routes require JWT authentication
- **Upload validation**: File type, size, and content-type validation enforced
- **CORS strict mode**: Only allowed origins can access the API
- **Rate limiting**: Distributed rate limiting with Redis (fallback to in-memory)
- **Admin/API noindex**: Prevents search engines from indexing sensitive routes

### ✅ 2. SEO & Discoverability

- **Dynamic SEO meta tags**: Each page has contextual title/description/keywords
- **Canonical URLs**: Normalized (no query params/hash) for better indexing
- **Open Graph & Twitter Cards**: Rich social media previews
- **Schema.org markup**: LocalBusiness structured data for rich snippets
- **Dynamic sitemap**: `/sitemap.xml` adapts to request domain (no hardcoded URLs)
- **Robots.txt**: Dynamic `/robots.txt` with proper admin/API disallow

### ✅ 3. Performance & Caching

- **Asset caching strategy**:
  - Hashed `/assets/*`: 1 year immutable cache
  - `index.html`: no-cache (always fresh)
  - Other files: revalidate on each request
- **Compression ready**: Code prepared for gzip/brotli (install `compression` package)
- **Lazy loading**: Images use LazyImage component

### ✅ 4. Reliability

- **Graceful shutdown**: SIGTERM/SIGINT handlers close connections cleanly
- **Health endpoints**:
  - `/health` - Liveness probe (always returns 200)
  - `/ready` - Readiness probe (checks DB + Redis)
- **30-second shutdown timeout**: Forces exit if graceful shutdown hangs
- **Database connection pooling**: Prisma manages connections efficiently

### ✅ 5. Observability

- **Request ID middleware**: Unique ID per request for log correlation
- **Structured logging**: JSON logs in production, human-readable in dev
- **Security audit logs**: `logger.security()` for auth/admin actions
- **Performance metrics**: `logger.metric()` for tracking response times
- **Error stack traces**: Full error context in logs

### ✅ 6. Scalability

- **Stateless auth**: JWT tokens (no server-side sessions)
- **Redis-based rate limiting**: Works across multiple server instances
- **Database indexes**: Prisma schema includes indexes on common lookups
- **Refresh token rotation**: Secure long-lived sessions without exposing main token

### ✅ 7. Developer Experience

- **TypeScript throughout**: Type safety for both frontend and backend
- **ESLint + Prettier**: Code quality and formatting enforced
- **Test structure**: Jest configured for backend tests
- **Hot reload**: `tsx watch` for backend, Vite HMR for frontend
- **Prisma Studio**: GUI for database management

---

## Deployment Options

### Option A: Single Server (VPS/Cloud VM)

1. **Setup Node.js 18+**:

   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

2. **Setup PostgreSQL**:

   ```bash
   sudo apt install postgresql postgresql-contrib
   sudo -u postgres createdb electrical_supplier
   ```

3. **Setup Redis**:

   ```bash
   sudo apt install redis-server
   sudo systemctl enable redis-server
   ```

4. **Clone & Build**:

   ```bash
   git clone <your-repo-url>
   cd electrical-supplier-website

   # Backend
   cd backend
   npm install --production
   npm run prisma:generate
   npm run prisma:migrate
   npm run build

   # Frontend
   cd ../frontend
   npm install
   npm run build
   ```

5. **Run with PM2**:

   ```bash
   npm install -g pm2
   cd backend
   pm2 start dist/server.js --name electrical-supplier-api
   pm2 save
   pm2 startup
   ```

6. **Setup Nginx reverse proxy**:

   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;

       location / {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

7. **Setup SSL with Certbot**:
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d yourdomain.com
   ```

### Option B: Docker Deployment

Create `docker-compose.yml`:

```yaml
version: "3.8"

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: electrical_supplier
      POSTGRES_USER: user
      # Set POSTGRES_PASSWORD in your environment/.env (do not use weak defaults)
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data

  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://user:${POSTGRES_PASSWORD}@postgres:5432/electrical_supplier
      REDIS_URL: redis://redis:6379
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

---

## Monitoring & Logs

### Production Logging

Set `LOG_FORMAT=json` in `.env` for structured logs:

```bash
LOG_FORMAT=json
```

This outputs JSON logs suitable for:

- **ELK Stack** (Elasticsearch, Logstash, Kibana)
- **Datadog**
- **Logtail / BetterStack**
- **Splunk**

### Health Check Monitoring

Use monitoring services to ping these endpoints:

- **Liveness**: `GET /health` (should always return 200)
- **Readiness**: `GET /ready` (returns 503 if DB/Redis down)

### Request Tracing

Every response includes `X-Request-ID` header. Use this to correlate:

- Client-side errors
- Backend logs
- Database queries

Example client-side error tracking:

```typescript
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestId = error.response?.headers["x-request-id"];
    console.error("Request failed:", { requestId, error });
    // Send to error tracking service (Sentry, etc.)
  },
);
```

---

## Testing Production Build Locally

Before deploying:

1. **Build everything**:

   ```bash
   cd frontend && npm run build
   cd ../backend && npm run build
   ```

2. **Set production env**:

   ```bash
   export NODE_ENV=production
   ```

3. **Start server**:

   ```bash
   cd backend
   npm start
   ```

4. **Verify endpoints**:
   ```bash
   curl http://localhost:5000/health
   curl http://localhost:5000/ready
   curl http://localhost:5000/robots.txt
   curl http://localhost:5000/sitemap.xml
   ```

---

## Security Best Practices

1. **Never commit `.env` files** (already in `.gitignore`)
2. **Rotate secrets regularly** (every 90 days recommended)
3. **Enable 2FA for all admin accounts**
4. **Keep dependencies updated**: `npm audit fix`
5. **Review logs for suspicious activity** (rate limit violations, auth failures)
6. **Backup database daily** (PostgreSQL pg_dump)
7. **Use HTTPS only in production** (enforce via Nginx/reverse proxy)
8. **Restrict database access** (firewall rules, VPC, etc.)

---

## Troubleshooting

### Backend won't start

Check logs:

```bash
pm2 logs electrical-supplier-api
```

Common issues:

- Database connection failed: Check `DATABASE_URL` and PostgreSQL status
- Redis connection failed: Check `REDIS_URL` and Redis status
- Port already in use: Change `PORT` in `.env` or kill existing process

### Frontend not loading

1. Verify build exists: `ls frontend/dist/index.html`
2. Check backend is serving static files: `curl -I http://localhost:5000/`
3. Check browser console for errors

### Rate limit errors

If you're hitting rate limits during testing:

- Increase limits in `.env`: `RATE_LIMIT_MAX_REQUESTS=1000`
- Or disable rate limiting temporarily (not recommended for prod)

### Database migrations fail

Reset database (⚠️ DESTROYS DATA):

```bash
cd backend
npx prisma migrate reset
```

---

## Next Steps (Optional Enhancements)

1. **Response compression**: Install `compression` package and uncomment in `app.ts`
2. **CDN for assets**: Serve `/assets` from CloudFlare/AWS CloudFront
3. **Database read replicas**: For high-traffic sites
4. **Background job queue**: For email sending (Bull + Redis)
5. **Admin analytics dashboard**: Track quotes, products, etc.
6. **Multi-language support**: i18n for frontend

---

## Support

For issues or questions:

- Check logs: `pm2 logs` or `docker-compose logs`
- Review this guide: `docs/PRODUCTION_DEPLOYMENT.md`
- Check API docs: `docs/API_DOCUMENTATION.md`
