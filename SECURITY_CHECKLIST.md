# Security Audit Checklist

Use this checklist before deploying to production to ensure all security measures are in place.

---

## 🔐 Secrets & Credentials

- [ ] All default secrets replaced with strong random values (32+ chars)
- [ ] JWT_SECRET is unique and never committed to Git
- [ ] JWT_REFRESH_SECRET is different from JWT_SECRET
- [ ] COOKIE_SECRET is unique
- [ ] Admin password changed from any default value
- [ ] Database password is strong (16+ chars, mixed case, numbers, symbols)
- [ ] Redis password configured (if using Redis)
- [ ] All API keys rotated from development values
- [ ] Secrets stored in password manager or secret management service
- [ ] `.env` file is in `.gitignore`
- [ ] No secrets in code comments or logs

---

## 🌐 HTTPS & Transport Security

- [ ] HTTPS enabled with valid SSL certificate
- [ ] Certificate not expired (check validity period)
- [ ] Certificate chain is complete
- [ ] HSTS enabled (Strict-Transport-Security header)
- [ ] HTTP redirects to HTTPS
- [ ] SSL/TLS configuration tested (SSL Labs A/A+ rating)
- [ ] TLS 1.2+ only (TLS 1.0/1.1 disabled)
- [ ] Strong cipher suites configured
- [ ] Certificate auto-renewal configured (Let's Encrypt)

---

## 🛡️ Security Headers

Verify these headers are present on all responses:

- [ ] `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
- [ ] `X-Frame-Options: DENY`
- [ ] `X-Content-Type-Options: nosniff`
- [ ] `X-XSS-Protection: 1; mode=block`
- [ ] `Content-Security-Policy` configured
- [ ] `Referrer-Policy: strict-origin-when-cross-origin`
- [ ] `Permissions-Policy` configured (optional)

Test with:

```bash
curl -I https://yourdomain.com/
```

---

## 🔒 Authentication & Authorization

- [ ] Admin routes require authentication
- [ ] JWT tokens expire appropriately (15m for access, 7d for refresh)
- [ ] Refresh token rotation implemented
- [ ] 2FA available and encouraged for admins
- [ ] Password requirements enforced (min length, complexity)
- [ ] Bcrypt rounds appropriate for production (12+)
- [ ] Failed login attempts limited
- [ ] Account lockout after repeated failures (optional)
- [ ] Session invalidation on logout works
- [ ] No authentication bypass vulnerabilities

---

## 🚦 Rate Limiting

- [ ] Rate limiting enabled on all public endpoints
- [ ] Rate limiting enabled on auth endpoints (stricter)
- [ ] Quote submission rate limited (per IP + per email)
- [ ] Redis used for distributed rate limiting (multi-server)
- [ ] Rate limits appropriate for production traffic
- [ ] 429 responses include Retry-After header
- [ ] Rate limit bypass not possible

Test with:

```bash
# Should eventually return 429
for i in {1..200}; do curl https://yourdomain.com/api/v1/health; done
```

---

## 📤 File Uploads

- [ ] File size limits enforced
- [ ] File type validation by magic bytes (not just extension)
- [ ] Path traversal protection enabled
- [ ] Upload directory outside web root or protected
- [ ] Uploaded files served with correct Content-Type
- [ ] No script execution in upload directory
- [ ] Filename sanitization implemented
- [ ] Virus scanning enabled (optional but recommended)
- [ ] Upload rate limiting enforced

Test path traversal:

```bash
curl -X POST https://yourdomain.com/api/v1/upload \
  -F "file=@evil.txt" \
  -F "filename=../../../etc/passwd"
# Should be blocked
```

---

## 🗄️ Database Security

- [ ] Database connection uses strong password
- [ ] Database not exposed to public internet
- [ ] Database user has minimum required privileges
- [ ] SQL injection protection via Prisma ORM
- [ ] Sensitive data encrypted at rest (optional)
- [ ] Database backups enabled and encrypted
- [ ] Backup restoration tested
- [ ] Connection pooling configured
- [ ] Database logs reviewed for suspicious queries

---

## 🌍 CORS Configuration

- [ ] CORS_ORIGIN set to specific domain (not `*`)
- [ ] Credentials allowed only for trusted origins
- [ ] Pre-flight requests handled correctly
- [ ] No CORS bypass possible

Test:

```bash
curl -H "Origin: https://evil.com" \
     -H "Access-Control-Request-Method: POST" \
     -I https://yourdomain.com/api/v1/auth/login
# Should not allow evil.com
```

---

## 🔍 Input Validation

- [ ] All user inputs validated (express-validator)
- [ ] Email validation implemented
- [ ] Phone number validation implemented
- [ ] File upload validation implemented
- [ ] SQL injection not possible (using Prisma)
- [ ] XSS protection enabled
- [ ] NoSQL injection not applicable (using SQL)
- [ ] Command injection not possible
- [ ] LDAP injection not applicable

---

## 🚨 Error Handling

- [ ] Error messages don't leak sensitive information
- [ ] Stack traces not exposed in production
- [ ] Generic error messages for auth failures
- [ ] Logging enabled for all errors
- [ ] Error logs don't contain secrets/passwords
- [ ] 500 errors return generic message
- [ ] Error monitoring configured (optional: Sentry)

---

## 📊 Logging & Monitoring

- [ ] Request logging enabled
- [ ] Request ID tracking implemented
- [ ] Failed auth attempts logged
- [ ] Suspicious activity logged
- [ ] Logs don't contain sensitive data (passwords, tokens)
- [ ] Log rotation configured
- [ ] Log retention policy defined
- [ ] Health check endpoint available
- [ ] Uptime monitoring configured
- [ ] Alert notifications configured

---

## 🔧 Infrastructure Security

- [ ] Server firewall configured (only 80/443 open)
- [ ] SSH key-based authentication (password disabled)
- [ ] Non-root user runs the application
- [ ] Automatic security updates enabled
- [ ] Server hardening applied
- [ ] Reverse proxy configured (Nginx/Cloudflare)
- [ ] Trust proxy set correctly in Express
- [ ] DDoS protection enabled (Cloudflare)

---

## 🔄 Dependencies

- [ ] All dependencies up to date
- [ ] No high/critical vulnerabilities (`npm audit`)
- [ ] Lock files committed (package-lock.json)
- [ ] Automated dependency updates configured (Dependabot)
- [ ] Security advisories monitored
- [ ] Unused dependencies removed

Test:

```bash
npm audit --production
# Should show 0 high/critical vulnerabilities
```

---

## 🎯 Admin Panel Security

- [ ] Admin routes protected by authentication
- [ ] Admin pages have `noindex` meta tag
- [ ] Admin routes not in sitemap.xml
- [ ] Admin routes return X-Robots-Tag: noindex
- [ ] Admin access logged
- [ ] Admin actions auditable (optional: audit log)
- [ ] RBAC implemented (optional: if multiple admin roles)

---

## 📧 Email Security

- [ ] SMTP credentials secured
- [ ] SPF record configured
- [ ] DKIM configured
- [ ] DMARC configured
- [ ] Email rate limiting enabled
- [ ] No email injection possible
- [ ] Email templates don't execute user input

---

## 🧪 Security Testing

- [ ] Automated security scans in CI (CodeQL, Snyk, OWASP)
- [ ] Manual penetration testing performed (optional)
- [ ] Security headers tested (securityheaders.com)
- [ ] SSL/TLS tested (ssllabs.com)
- [ ] OWASP Top 10 vulnerabilities checked
- [ ] Authentication bypass attempts tested
- [ ] Authorization bypass attempts tested
- [ ] Rate limiting tested
- [ ] File upload exploits tested

---

## 📋 Compliance (if applicable)

- [ ] GDPR compliance reviewed (if EU users)
- [ ] Privacy policy published
- [ ] Terms of service published
- [ ] Cookie consent implemented (if tracking)
- [ ] Data retention policy defined
- [ ] Data deletion process implemented

---

## 🔄 Incident Response

- [ ] Security incident response plan documented
- [ ] Contact information for security issues published
- [ ] Backup and recovery process tested
- [ ] Rollback procedure documented
- [ ] Emergency contact list maintained

---

## ✅ Final Verification

Run these commands to verify security:

```bash
# 1. Check security headers
curl -I https://yourdomain.com/

# 2. Check SSL rating
# Visit: https://www.ssllabs.com/ssltest/analyze.html?d=yourdomain.com

# 3. Check security headers rating
# Visit: https://securityheaders.com/?q=yourdomain.com

# 4. Check for vulnerabilities
npm audit --production

# 5. Check rate limiting
for i in {1..150}; do curl -s -o /dev/null -w "%{http_code}\n" https://yourdomain.com/api/v1/health; done | tail -20
# Should see 429 responses

# 6. Test authentication
curl https://yourdomain.com/api/v1/admin/products
# Should return 401 Unauthorized

# 7. Check HSTS preload eligibility
# Visit: https://hstspreload.org/?domain=yourdomain.com
```

---

## Security readiness review

If any items in this checklist remain incomplete, treat them as deployment blockers unless there is an explicit, documented risk acceptance.

---

## Post-deployment

After deployment:

1. Monitor logs for 24 hours
2. Review error rates
3. Check for unusual traffic patterns
4. Verify all functionality works over HTTPS
5. Test from different geographic locations
6. Verify email notifications work
7. Test rate limiting is working
8. Confirm backups are running

---

## Security contact

Publish security contact information:

```
Security issues: eafte1@outlook.com
Response time: Within 24-48 hours
Project: electrical-supplier-website
```

Consider:

- `security.txt` file at `/.well-known/security.txt`
- Bug bounty program (optional)
- Responsible disclosure policy

---

**Review Frequency:** Every deployment + quarterly audit
