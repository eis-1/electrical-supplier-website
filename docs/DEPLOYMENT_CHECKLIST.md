# Production Deployment Checklist

## Pre-Deployment Checklist

### 1. Code Quality & Testing

- [ ] All TypeScript builds pass without errors
- [ ] No console errors or warnings in browser
- [ ] All features tested manually
- [ ] Admin panel fully functional
- [ ] Quote submission and email notifications working
- [ ] File upload/download tested
- [ ] Mobile responsiveness verified

### 2. Environment Configuration

- [ ] Production `.env` files created (backend & frontend)
- [ ] All environment variables properly set
- [ ] API URLs updated to production domains
- [ ] CORS origins configured correctly
- [ ] Database connection string updated

### 3. Security Hardening

- [ ] Changed default admin credentials
- [ ] Strong JWT secret (minimum 32 characters, random)
- [ ] HTTPS enabled on production server
- [ ] Secure cookie settings configured
- [ ] Rate limiting enabled and configured
- [ ] Reverse-proxy headers validated (real client IP available; trust proxy configured)
- [ ] Helmet security headers enabled
- [ ] File upload restrictions verified
- [ ] Upload magic-byte validation enabled
- [ ] Upload serving headers configured (prevent XSS/inline execution)
- [ ] SQL injection prevention verified (Prisma ORM handles this)
- [ ] XSS prevention verified
- [ ] CSRF protection (if using cookies)
- [ ] Quote anti-spam controls verified (rate limit + dedupe + per-email/day cap)

### 4. Database Migration

- [ ] Production database created (PostgreSQL/MySQL)
- [ ] Database backup strategy implemented
- [ ] Prisma migrations run successfully
- [ ] Database seeded with initial data
- [ ] Database connection pooling configured
- [ ] Database indexes optimized
- [ ] Regular backup schedule configured

### 5. Email Configuration

- [ ] SMTP settings configured
- [ ] Email templates tested
- [ ] Sender email verified
- [ ] Quote notification emails working
- [ ] Admin notification emails working
- [ ] Error notification emails configured

### 6. File Storage

- [ ] Upload directory created with proper permissions
- [ ] File size limits configured
- [ ] Allowed file types restricted
- [ ] File type validation by magic bytes (not only mimetype)
- [ ] Upload serving headers configured (X-Content-Type-Options, Content-Disposition)
- [ ] Consider cloud storage (S3, Cloudinary) for production
- [ ] CDN configured for static assets (optional)

### 7. Performance Optimization

- [ ] Frontend production build optimized
- [ ] Code splitting implemented
- [ ] Images optimized and compressed
- [ ] Lazy loading implemented where appropriate
- [ ] API response caching strategy
- [ ] Database query optimization
- [ ] Gzip compression enabled

---

## Backend Deployment

### Option A: VPS (DigitalOcean, AWS EC2, Linode)

1. **Server Setup**

   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y

   # Install Node.js 18+
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt install -y nodejs

   # Install PostgreSQL
   sudo apt install postgresql postgresql-contrib -y

   # Install Nginx
   sudo apt install nginx -y

   # Install PM2 (process manager)
   sudo npm install -g pm2
   ```

2. **Deploy Backend**

   ```bash
   # Clone repository
   git clone <your-repo-url>
   cd electrical-supplier-website/backend

   # Install dependencies
   npm install --production

   # Configure environment
   cp .env.example .env
   nano .env  # Edit with production values

   # Build TypeScript
   npm run build

   # Run Prisma migrations
   npm run prisma:migrate

   # Seed database
   npm run prisma:seed

   # Start with PM2
   pm2 start dist/server.js --name electrical-api
   pm2 save
   pm2 startup
   ```

3. **Configure Nginx**

   ```nginx
   # /etc/nginx/sites-available/api.yourcompany.com
   server {
       listen 80;
       server_name api.yourcompany.com;

       location / {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }

       location /uploads {
           alias /path/to/backend/uploads;
           expires 30d;
           add_header Cache-Control "public, immutable";
       }
   }
   ```

4. **Enable HTTPS with Let's Encrypt**
   ```bash
   sudo apt install certbot python3-certbot-nginx -y
   sudo certbot --nginx -d api.yourcompany.com
   ```

### Option B: Platform as a Service (Heroku, Railway, Render)

1. **Install CLI tool**
2. **Create new app**
3. **Add PostgreSQL addon**
4. **Set environment variables**
5. **Deploy from Git**

Example for Heroku:

```bash
heroku create electrical-supplier-api
heroku addons:create heroku-postgresql:mini
heroku config:set JWT_SECRET=your-secret
git push heroku main
heroku run npm run prisma:migrate
```

---

## Frontend Deployment

### Option A: Vercel (Recommended)

1. **Install Vercel CLI**

   ```bash
   npm install -g vercel
   ```

2. **Configure**

   ```bash
   cd frontend
   # Create .env.production
   echo "VITE_API_URL=https://api.yourcompany.com/api/v1" > .env.production
   ```

3. **Deploy**
   ```bash
   vercel --prod
   ```

### Option B: Netlify

1. **Build locally**

   ```bash
   cd frontend
   npm run build
   ```

2. **Deploy dist folder via Netlify UI or CLI**

### Option C: Nginx + VPS

1. **Build frontend**

   ```bash
   cd frontend
   npm run build
   ```

2. **Copy to server**

   ```bash
   scp -r dist/* user@yourserver:/var/www/yourcompany.com
   ```

3. **Configure Nginx**

   ```nginx
   # /etc/nginx/sites-available/yourcompany.com
   server {
       listen 80;
       server_name yourcompany.com www.yourcompany.com;
       root /var/www/yourcompany.com;
       index index.html;

       location / {
           try_files $uri $uri/ /index.html;
       }

       location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf)$ {
           expires 1y;
           add_header Cache-Control "public, immutable";
       }
   }
   ```

4. **Enable HTTPS**
   ```bash
   sudo certbot --nginx -d yourcompany.com -d www.yourcompany.com
   ```

---

## Post-Deployment Checklist

### 1. Verification

- [ ] Website loads correctly at production URL
- [ ] API responds at production URL
- [ ] Admin login works
- [ ] Create/Edit/Delete operations work
- [ ] Quote submission sends emails
- [ ] File uploads work
- [ ] All pages load without errors
- [ ] Mobile view works correctly

### 2. Monitoring Setup

- [ ] Set up error tracking (Sentry, Bugsnag)
- [ ] Configure uptime monitoring (UptimeRobot, Pingdom)
- [ ] Set up server monitoring (New Relic, DataDog)
- [ ] Configure log aggregation
- [ ] Set up alerts for critical errors
- [ ] Monitor database performance

### 3. Backup Configuration

- [ ] Database backup automated (daily)
- [ ] File upload backup strategy
- [ ] Backup verification procedure
- [ ] Disaster recovery plan documented

### 4. Documentation

- [ ] Admin user guide created
- [ ] API documentation updated
- [ ] Deployment process documented
- [ ] Environment variables documented
- [ ] Contact information updated

### 5. SEO & Analytics

- [ ] Google Analytics installed
- [ ] Google Search Console configured
- [ ] Sitemap.xml generated and submitted
- [ ] robots.txt configured
- [ ] Meta tags verified
- [ ] Open Graph tags added

---

## Maintenance Schedule

### Daily

- [ ] Check error logs
- [ ] Monitor uptime
- [ ] Review quote requests

### Weekly

- [ ] Database backup verification
- [ ] Performance metrics review
- [ ] Security updates check

### Monthly

- [ ] Full system audit
- [ ] Dependency updates
- [ ] SSL certificate renewal check
- [ ] Unused data cleanup

---

## Rollback Plan

In case of critical issues:

1. **Quick Rollback**

   ```bash
   # Backend
   pm2 stop electrical-api
   git checkout previous-stable-tag
   npm install
   npm run build
   pm2 restart electrical-api

   # Frontend (Vercel)
   vercel rollback
   ```

2. **Database Rollback**

   ```bash
   # Restore from backup
   psql dbname < backup-file.sql
   ```

3. **Notify stakeholders**

---

## Emergency Contacts

- **System Admin**: [contact info]
- **Database Admin**: [contact info]
- **Hosting Support**: [provider support]
- **Domain Registrar**: [registrar support]

---

## Production URLs

- **Frontend**: https://www.yourcompany.com
- **Backend API**: https://api.yourcompany.com
- **Admin Panel**: https://www.yourcompany.com/admin/login

---

**Deployment Status**: Pending / Deployed / Issues

---

## Notes

Add deployment-specific notes here:

-
-
-
