# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability within this project, please send an email to eafte1@outlook.com. All security vulnerabilities will be promptly addressed.

Please include the following information:

- Type of issue (e.g., SQL injection, XSS, authentication bypass)
- Full paths of source file(s) related to the manifestation of the issue
- The location of the affected source code (tag/branch/commit or direct URL)
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue

## Security Measures Implemented

This project implements the following security controls:

### Authentication & Authorization

- JWT-based authentication with token expiration
- Password hashing with bcrypt
- Rate limiting on authentication endpoints
- Algorithm-restricted JWT verification (HS256 only)

### Input Validation & Sanitization

- Server-side validation using express-validator
- File upload restrictions (type, size, magic-byte validation)
- SQL injection prevention via Prisma ORM

### Anti-Spam & Rate Limiting

- Global API rate limiting
- Quote-specific rate limiting
- Honeypot fields
- Timing validation
- Duplicate submission prevention
- Per-email daily submission caps

### Security Headers

- Helmet.js security headers
- HSTS (production only)
- Content Security Policy
- X-Frame-Options
- X-Content-Type-Options
- Safe file serving headers for uploads

### Logging & Monitoring

- Structured security event logging
- Admin action audit trails
- Failed authentication logging
- Spam detection logging

### Infrastructure

- Proxy trust configuration for correct IP handling
- Environment-based security configurations
- Secure file upload handling with magic-byte validation

## Automated Security Checks

This project uses GitHub Actions for:

- Dependency vulnerability scanning (npm audit)
- Secret scanning (Gitleaks)
- Build and lint verification
- Weekly scheduled security audits

## Best Practices for Deployment

1. **Use HTTPS in production** - Configure your reverse proxy (Nginx/Cloudflare) to handle SSL/TLS
2. **Rotate JWT secrets regularly** - Change `JWT_SECRET` periodically
3. **Keep dependencies updated** - Run `npm audit fix` regularly
4. **Configure strong admin passwords** - Use at least 12 characters
5. **Enable monitoring** - Set up log aggregation and alerting
6. **Backup regularly** - Implement automated database backups
7. **Use environment variables** - Never commit secrets to version control
8. **Implement IP whitelisting** - For admin routes if possible
9. **Set up WAF rules** - Use Cloudflare or similar for DDoS protection

## Incident Response

In case of a security incident:

1. Immediately revoke compromised credentials
2. Review security logs for the attack timeline
3. Patch the vulnerability
4. Notify affected users if personal data was compromised
5. Document the incident and response
6. Update security measures to prevent recurrence
