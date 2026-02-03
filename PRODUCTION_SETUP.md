# Production Deployment Setup Guide

This guide covers the complete process of deploying this application to production with proper security, secrets management, and HTTPS configuration.

---

## 🔐 Part 1: Secrets Management

### Generate Strong Secrets

**Option 1: Use the generator scripts**

Windows (PowerShell):

```powershell
./scripts/generate-secrets.ps1
```

Linux/Mac:

```bash
chmod +x scripts/generate-secrets.sh
./scripts/generate-secrets.sh
```

**Option 2: Generate manually**

```bash
# JWT secrets (32 bytes each)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Configure Production Environment

1. **Copy the production template:**

   ```bash
   cd backend
   cp .env.production.example .env
   ```

2. **Update ALL secrets in `.env`:**

   ```dotenv
   NODE_ENV=production
   PORT=5000

   # Use the generated secrets (NOT the examples!)
   JWT_SECRET=<generated-secret-1>
   JWT_REFRESH_SECRET=<generated-secret-2>
   COOKIE_SECRET=<generated-secret-3>

   # PostgreSQL connection (recommended for production)
   DATABASE_URL="postgresql://user:password@host:5432/dbname?schema=public"

   # CORS (your actual domain)
   CORS_ORIGIN=https://yourdomain.com

   # Redis (REQUIRED for production rate limiting)
   REDIS_URL=redis://username:password@host:6379
   ```

3. **Change default admin credentials:**

   ```bash
   cd backend

   # Generate bcrypt hash for new password
   node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('YOUR_STRONG_PASSWORD', 12).then(console.log)"

   # Update admin in database or via admin panel
   ```

### Secrets Management Best Practices

**Do:**

- Use a password manager (1Password, LastPass, Bitwarden)
- Use different secrets for each environment (dev/staging/prod)
- Rotate secrets every 90 days
- Use environment variables or secret management services (AWS Secrets Manager, HashiCorp Vault)
- Store database backups encrypted
- Use `.env` files ONLY locally, never commit them

**Avoid:**

- Commit secrets to Git (check `.gitignore` includes `.env`)
- Share secrets via email, Slack, or chat
- Use default/example secrets in production
- Reuse secrets across different applications
- Store secrets in plain text files on servers

---

## Part 2: HTTPS configuration

### Why HTTPS is Required

- Encrypts data in transit (prevents man-in-the-middle attacks)
- Required for secure cookies
- Required for modern browser features
- Improves SEO ranking
- Required for HSTS (HTTP Strict Transport Security)

### Option A: Using Nginx Reverse Proxy (Recommended)

1. **Install Nginx:**

   ```bash
   sudo apt update
   sudo apt install nginx
   ```

2. **Configure Nginx site:**

   ```nginx
   # /etc/nginx/sites-available/yourdomain.com

   # HTTP → HTTPS redirect
   server {
       listen 80;
       server_name yourdomain.com www.yourdomain.com;
       return 301 https://$server_name$request_uri;
   }

   # HTTPS server
   server {
       listen 443 ssl http2;
       server_name yourdomain.com www.yourdomain.com;

       # SSL certificates
       ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

       # SSL configuration (Mozilla Intermediate)
       ssl_protocols TLSv1.2 TLSv1.3;
       ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
       ssl_prefer_server_ciphers off;
       ssl_session_cache shared:SSL:10m;
       ssl_session_timeout 10m;

       # HSTS (uncomment after confirming HTTPS works)
       # add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

       # Security headers
       add_header X-Frame-Options "DENY" always;
       add_header X-Content-Type-Options "nosniff" always;
       add_header X-XSS-Protection "1; mode=block" always;
       add_header Referrer-Policy "strict-origin-when-cross-origin" always;

       # Backend proxy
       location / {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;

           # Forward real client IP
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;

           # Timeouts
           proxy_connect_timeout 60s;
           proxy_send_timeout 60s;
           proxy_read_timeout 60s;
       }

       # Static file serving (optional optimization)
       location /uploads {
           alias /path/to/backend/uploads;
           expires 30d;
           add_header Cache-Control "public, immutable";
       }
   }
   ```

3. **Enable site:**

   ```bash
   sudo ln -s /etc/nginx/sites-available/yourdomain.com /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

4. **Get SSL certificate (Let's Encrypt):**

   ```bash
   # Install Certbot
   sudo apt install certbot python3-certbot-nginx

   # Get certificate (automatic Nginx configuration)
   sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

   # Test auto-renewal
   sudo certbot renew --dry-run
   ```

### Option B: Cloudflare (Easiest)

1. **Add your domain to Cloudflare**
2. **Update nameservers** to Cloudflare's
3. **Enable "Full (Strict)" SSL mode** in SSL/TLS settings
4. **Enable HSTS** in SSL/TLS → Edge Certificates
5. **Enable "Always Use HTTPS"** in SSL/TLS → Edge Certificates

Benefits:

- Free SSL certificate
- DDoS protection
- CDN (faster global delivery)
- Web Application Firewall (WAF)
- Automatic HTTPS rewrites

### Option C: AWS/Cloud Platforms

**AWS ALB (Application Load Balancer):**

- Use AWS Certificate Manager (ACM) for free SSL
- Configure ALB with HTTPS listener
- Point ALB to EC2 instances running the app

**Heroku:**

- Automatic SSL (Heroku ACM)
- Upgrade to paid plan for custom domain SSL

**DigitalOcean App Platform:**

- Automatic Let's Encrypt SSL
- Zero configuration needed

---

## Part 3: Production deployment

### Prerequisites Checklist

Before deploying:

- [ ] All secrets generated and stored securely
- [ ] Production `.env` file configured
- [ ] Admin credentials changed from defaults
- [ ] Database (PostgreSQL) provisioned and accessible
- [ ] Redis instance provisioned (required for rate limiting)
- [ ] SMTP configured for email notifications
- [ ] Domain name purchased and DNS configured
- [ ] SSL certificate obtained
- [ ] Backup strategy planned

### Deployment Steps

1. **Server setup:**

   ```bash
   # Install Node.js 18+
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt install -y nodejs

   # Install PM2 (process manager)
   sudo npm install -g pm2
   ```

2. **Deploy application:**

   ```bash
   # Clone repository
   git clone <your-repo-url>
   cd electrical-supplier-website

   # Install dependencies
   cd backend && npm ci --production
   cd ../frontend && npm ci
   cd ..

   # Build frontend
   cd frontend && npm run build

   # Build backend
   cd ../backend && npm run build

   # Setup environment
   cp .env.production.example .env
   nano .env  # Edit with production values

   # Run database migrations
   cd backend
   npx prisma generate
   npx prisma migrate deploy

   # Seed initial data (if needed)
   npm run prisma:seed
   ```

3. **Start with PM2:**

   ```bash
   cd backend

   # Start application
   pm2 start dist/server.js --name electrical-api -i max

   # Save PM2 configuration
   pm2 save

   # Setup PM2 to start on boot
   pm2 startup
   # Follow the command it outputs
   ```

4. **Verify deployment:**

   ```bash
   # Check PM2 status
   pm2 status
   pm2 logs electrical-api

   # Check health endpoint
   curl http://localhost:5000/health

   # Check HTTPS (after Nginx/SSL setup)
   curl -I https://yourdomain.com/health
   ```

### Post-Deployment Verification

Test these endpoints:

```bash
# Health check (should return 200)
curl https://yourdomain.com/health

# API health (should return JSON)
curl https://yourdomain.com/api/v1/health

# Frontend (should return HTML)
curl https://yourdomain.com/

# Security headers (should include HSTS)
curl -I https://yourdomain.com/ | grep -i "strict-transport"
```

---

## Part 4: Security Verification

### SSL/TLS Testing

**Test your SSL configuration:**

- https://www.ssllabs.com/ssltest/
- Target: A or A+ rating

**Check HSTS:**

```bash
curl -I https://yourdomain.com | grep -i strict-transport-security
# Should see: Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

### Security Headers Check

Verify all security headers are present:

```bash
curl -I https://yourdomain.com/
```

Expected headers:

```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Content-Security-Policy: (should be present)
```

### Application Security Checklist

- [ ] All secrets rotated from defaults
- [ ] Admin password changed (not a default value)
- [ ] Database uses strong password
- [ ] Redis requires authentication
- [ ] Rate limiting working (test by hitting API rapidly)
- [ ] File uploads restricted to allowed types
- [ ] CORS only allows your domain
- [ ] HTTPS working with valid certificate
- [ ] HSTS enabled
- [ ] Security headers present
- [ ] Admin routes return 401/403 when not authenticated
- [ ] No sensitive data in error messages
- [ ] Logs don't contain secrets/passwords

---

## Part 5: Monitoring & maintenance

### Health Monitoring

Set up monitoring for:

1. **Application health:**

   ```bash
   # Add to cron (check every 5 minutes)
   */5 * * * * curl -f https://yourdomain.com/health || echo "Health check failed" | mail -s "Alert" admin@yourdomain.com
   ```

2. **SSL certificate expiry:**

   ```bash
   # Check certificate validity
   echo | openssl s_client -servername yourdomain.com -connect yourdomain.com:443 2>/dev/null | openssl x509 -noout -dates
   ```

3. **Server resources:**
   ```bash
   # Monitor CPU, memory, disk
   pm2 monit
   ```

### Log Management

```bash
# View PM2 logs
pm2 logs electrical-api

# Clear logs
pm2 flush

# Rotate logs (automatic with PM2)
pm2 install pm2-logrotate
```

### Backup Strategy

**Database backups:**

```bash
# PostgreSQL backup (run daily via cron)
pg_dump -h localhost -U username -d electrical_supplier > backup_$(date +%Y%m%d).sql

# Automated backup script
0 2 * * * /path/to/backup-script.sh
```

**Application files:**

- Backup `backend/uploads/` directory
- Backup `.env` file (encrypted)
- Keep database backups for 30 days

### Security Maintenance

**Regular tasks:**

- [ ] Update dependencies monthly: `npm update`
- [ ] Rotate secrets every 90 days
- [ ] Review access logs for suspicious activity
- [ ] Test backups monthly
- [ ] Review and update security headers
- [ ] Check for security advisories: `npm audit`
- [ ] Renew SSL certificate (auto with Let's Encrypt)

---

## 🆘 Troubleshooting

### Issue: HTTPS not working

**Check:**

1. Certificate files exist and are readable
2. Nginx configuration syntax: `sudo nginx -t`
3. Firewall allows port 443: `sudo ufw allow 443/tcp`
4. DNS points to correct server IP

### Issue: "502 Bad Gateway"

**Check:**

1. Backend is running: `pm2 status`
2. Backend is listening on correct port: `netstat -tlnp | grep 5000`
3. Nginx can reach backend: `curl http://localhost:5000/health`

### Issue: Rate limiting not working

**Check:**

1. Redis is running: `redis-cli ping`
2. Redis URL is correct in `.env`
3. Backend can connect to Redis: check logs

### Issue: Slow performance

**Optimize:**

1. Enable Nginx caching
2. Use Redis for session storage
3. Optimize database queries
4. Enable gzip compression in Nginx
5. Use CDN for static assets

---

## Additional Resources

- [OWASP Security Cheat Sheet](https://cheatsheetseries.owasp.org/)
- [Mozilla SSL Configuration Generator](https://ssl-config.mozilla.org/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/)
- [Nginx Documentation](https://nginx.org/en/docs/)

---

## Summary checklist

Consider deployment complete when you have verified:

- [ ] Strong secrets generated and secured
- [ ] Production environment configured
- [ ] HTTPS working with a valid certificate
- [ ] HSTS enabled
- [ ] Security headers verified
- [ ] Application deployed and running
- [ ] Health checks passing
- [ ] Monitoring configured
- [ ] Backup strategy implemented
- [ ] Documentation updated

If you completed the steps above, your application should be configured for production deployment with security controls enabled. Validate the behavior in your environment.
