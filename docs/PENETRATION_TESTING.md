# Automated Penetration Testing Guide

## Overview

Comprehensive guide for setting up automated security testing and penetration testing for the Electrical Supplier B2B platform.

---

## Quick Start

### Run All Security Tests Locally

```bash
# 1. Start the application
cd backend
npm run build
npm start

# 2. Run custom OWASP tests
node security-test.js

# 3. Run OWASP ZAP baseline scan
docker run --rm -v $(pwd):/zap/wrk:rw \
  -t zaproxy/zap-stable zap-baseline.py \
  -t http://host.docker.internal:5000 \
  -r zap-report.html

# 4. Run Nuclei vulnerability scan
nuclei -u http://localhost:5000 \
  -t cves/ -t vulnerabilities/ \
  -severity critical,high,medium
```

---

## Automated Testing Tools

### 1. Custom OWASP Top 10 Tests

**Location:** `backend/security-test.js`

**What it tests:**

- A01: Broken Access Control
- A02: Cryptographic Failures
- A03: Injection vulnerabilities
- A04: Insecure Design (rate limiting, anti-spam)
- A05: Security Misconfiguration
- A06: Vulnerable Components (manual checks)
- A07: Authentication Failures
- A08: Software/Data Integrity
- A09: Security Logging (manual checks)
- A10: Server-Side Request Forgery (SSRF)
- CORS configuration
- CSRF protection

**Usage:**

```bash
# Run against local development
TEST_URL=http://localhost:5000 node security-test.js

# Run against staging
TEST_URL=https://staging.yourcompany.com node security-test.js

# With authentication
TEST_URL=https://staging.yourcompany.com \
ADMIN_EMAIL=<ADMIN_EMAIL> \
ADMIN_PASSWORD=<ADMIN_PASSWORD> \
node security-test.js
```

**CI/CD Integration:**

The test runs automatically on:

- Every push to `main` branch
- Every pull request
- Weekly schedule (Sundays at 2 AM UTC)
- Manual workflow dispatch

---

### 2. OWASP ZAP (Zed Attack Proxy)

**Type:** Dynamic Application Security Testing (DAST)

**Installation:**

```bash
# Option 1: Docker (recommended)
docker pull zaproxy/zap-stable

# Option 2: Native (Linux/macOS)
wget https://github.com/zaproxy/zaproxy/releases/download/v2.14.0/ZAP_2.14.0_Linux.tar.gz
tar -xvf ZAP_2.14.0_Linux.tar.gz
```

**Baseline Scan:**

```bash
# Basic scan
docker run --rm -v $(pwd):/zap/wrk:rw \
  -t zaproxy/zap-stable zap-baseline.py \
  -t http://host.docker.internal:5000 \
  -r baseline-report.html

# Authenticated scan with custom rules
docker run --rm -v $(pwd):/zap/wrk:rw \
  -t zaproxy/zap-stable zap-baseline.py \
  -t http://host.docker.internal:5000 \
  -r auth-baseline-report.html \
  -c zap-config.conf \
  -z "-config replacer.full_list(0).description=auth1 \
      -config replacer.full_list(0).enabled=true \
      -config replacer.full_list(0).matchtype=REQ_HEADER \
      -config replacer.full_list(0).matchstr=Authorization \
      -config replacer.full_list(0).replacement='Bearer YOUR_JWT_TOKEN'"
```

**Full Scan (More Aggressive):**

```bash
docker run --rm -v $(pwd):/zap/wrk:rw \
  -t zaproxy/zap-stable zap-full-scan.py \
  -t http://host.docker.internal:5000 \
  -r full-scan-report.html \
  -m 10  # 10 minute timeout
```

**Custom Rules File (`.zap/rules.tsv`):**

```tsv
10001	IGNORE	(Informational - Base URL Redirect)
10021	IGNORE	(Informational - Charset Mismatch)
10015	WARN	(Re-examine Later - Incomplete or No Cache-control)
```

---

### 3. Nuclei - Vulnerability Scanner

**Type:** Template-based vulnerability scanning

**Installation:**

```bash
# Linux/macOS
curl -L https://github.com/projectdiscovery/nuclei/releases/latest/download/nuclei_linux_amd64.zip -o nuclei.zip
unzip nuclei.zip
sudo mv nuclei /usr/local/bin/

# Update templates
nuclei -update-templates
```

**Usage:**

```bash
# Scan for CVEs
nuclei -u http://localhost:5000 -t cves/

# Full vulnerability scan
nuclei -u http://localhost:5000 \
  -t cves/ \
  -t vulnerabilities/ \
  -t exposures/ \
  -t misconfiguration/ \
  -severity critical,high,medium \
  -o nuclei-report.txt

# Export JSON for automation
nuclei -u http://localhost:5000 \
  -t cves/ -t vulnerabilities/ \
  -json -o nuclei-report.json
```

**Custom Templates:**

```yaml
# custom-tests/api-auth-bypass.yaml
id: electrical-supplier-auth-bypass

info:
  name: Authentication Bypass Test
  severity: critical
  description: Tests for authentication bypass in admin endpoints

http:
  - method: GET
    path:
      - "{{BaseURL}}/api/v1/admin/products"
      - "{{BaseURL}}/api/v1/admin/brands"

    matchers-condition: and
    matchers:
      - type: status
        status:
          - 200

      - type: word
        words:
          - "products"
          - "success"
        condition: or

# Run custom template
nuclei -u http://localhost:5000 -t custom-tests/
```

---

### 4. SQLMap - SQL Injection Testing

**Installation:**

```bash
git clone --depth 1 https://github.com/sqlmapproject/sqlmap.git
cd sqlmap
```

**Usage:**

```bash
# Test specific parameter
python sqlmap.py -u "http://localhost:5000/api/v1/products?search=test" \
  --batch --random-agent

# Test all parameters in POST request
python sqlmap.py -u "http://localhost:5000/api/v1/auth/login" \
  --data="email=test@test.com&password=test" \
  --batch --risk=2 --level=2

# With authentication
python sqlmap.py -u "http://localhost:5000/api/v1/admin/products" \
  --headers="Authorization: Bearer YOUR_TOKEN" \
  --batch
```

---

### 5. Nikto - Web Server Scanner

**Installation:**

```bash
# Ubuntu/Debian
sudo apt install nikto

# macOS
brew install nikto
```

**Usage:**

```bash
# Basic scan
nikto -h http://localhost:5000

# Detailed scan with tuning
nikto -h http://localhost:5000 \
  -Tuning 123bde \
  -output nikto-report.html \
  -Format html
```

---

## Advanced Testing

### SSL/TLS Security Testing

```bash
# Install testssl.sh
git clone https://github.com/drwetter/testssl.sh.git
cd testssl.sh

# Run comprehensive SSL/TLS test
./testssl.sh --severity MEDIUM https://your-production-domain.com

# Test specific protocols
./testssl.sh --protocols https://your-production-domain.com

# Check for vulnerabilities
./testssl.sh --vulnerabilities https://your-production-domain.com
```

### API Fuzzing with ffuf

```bash
# Install ffuf
go install github.com/ffuf/ffuf@latest

# Fuzz API endpoints
ffuf -w /usr/share/wordlists/dirb/common.txt \
  -u http://localhost:5000/api/v1/FUZZ \
  -mc 200,204,301,302,307,401,403

# Parameter fuzzing
ffuf -w /usr/share/wordlists/burp-parameter-names.txt \
  -u http://localhost:5000/api/v1/products?FUZZ=test \
  -mc 200
```

### Dependency Scanning

```bash
# npm audit (built-in)
cd backend
npm audit
npm audit fix

# Snyk (advanced)
npm install -g snyk
snyk auth
snyk test
snyk monitor

# OWASP Dependency-Check
wget https://github.com/jeremylong/DependencyCheck/releases/download/v8.4.0/dependency-check-8.4.0-release.zip
unzip dependency-check-8.4.0-release.zip
./dependency-check/bin/dependency-check.sh \
  --project "Electrical Supplier API" \
  --scan ./backend \
  --out ./dependency-check-report.html
```

---

## Scheduled Penetration Testing

### GitHub Actions Workflow

**File:** `.github/workflows/security-testing.yml`

Automatically runs:

- **On every push:** Custom OWASP tests, Nuclei scan
- **Weekly:** Full OWASP ZAP scan, SSL/TLS check
- **Monthly:** Comprehensive pentest with all tools

### Manual Pentest Checklist

Run quarterly or before major releases:

```bash
# 1. Update all testing tools
nuclei -update-templates
docker pull zaproxy/zap-stable

# 2. Run all automated scans
./run-all-security-tests.sh

# 3. Manual testing
- [ ] Test business logic flaws (quote manipulation, price tampering)
- [ ] Test file upload restrictions (magic bytes, size limits)
- [ ] Test rate limiting across all endpoints
- [ ] Test session management (token expiry, refresh rotation)
- [ ] Test RBAC permissions (role escalation attempts)
- [ ] Test input validation (XSS, injection in all fields)

# 4. Review results
- [ ] Triage findings by severity
- [ ] Create GitHub issues for confirmed vulnerabilities
- [ ] Assign severity labels (critical/high/medium/low)
- [ ] Set remediation timelines

# 5. Generate pentest report
cat << EOF > pentest-report-$(date +%Y-%m-%d).md
# Penetration Test Report - $(date +%Y-%m-%d)

## Executive Summary
...

## Findings
### Critical (Priority 1)
...

### High (Priority 2)
...

### Medium (Priority 3)
...

## Recommendations
...

## Remediation Timeline
- Critical: 24 hours
- High: 7 days
- Medium: 30 days
- Low: 90 days
EOF
```

---

## Continuous Monitoring

### Security Metrics Dashboard

```bash
# Setup Prometheus metrics endpoint
# backend/src/server.ts
import promClient from 'prom-client';

const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });

const securityMetrics = {
  failedLogins: new promClient.Counter({
    name: 'security_failed_logins_total',
    help: 'Total failed login attempts',
    labelNames: ['ip', 'email']
  }),
  rateLimitHits: new promClient.Counter({
    name: 'security_rate_limit_hits_total',
    help: 'Total rate limit violations',
    labelNames: ['endpoint', 'ip']
  }),
  csrfFailures: new promClient.Counter({
    name: 'security_csrf_failures_total',
    help: 'Total CSRF validation failures'
  })
};

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

### Alert Rules (Prometheus/Grafana)

```yaml
# prometheus-alerts.yml
groups:
  - name: security
    interval: 1m
    rules:
      - alert: HighFailedLoginRate
        expr: rate(security_failed_logins_total[5m]) > 10
        for: 2m
        annotations:
          summary: "High failed login rate detected"
          description: "{{ $value }} failed logins/sec from {{ $labels.ip }}"

      - alert: RateLimitViolations
        expr: rate(security_rate_limit_hits_total[5m]) > 100
        for: 5m
        annotations:
          summary: "Excessive rate limit violations"
          description: "Possible DDoS or brute force attack"
```

---

## Third-Party Pentest Services

For production environments, schedule annual professional pentests:

### Recommended Services:

- **Bugcrowd / HackerOne:** Continuous bug bounty programs
- **Cobalt.io:** On-demand pentest platform
- **Synack:** Crowdsourced security testing
- **Bishop Fox / NCC Group:** Enterprise-grade penetration testing

### Scope Document Template:

```markdown
# Penetration Test Scope

**Target Application:** Electrical Supplier B2B Platform
**Test Type:** Black box / Gray box / White box
**Duration:** 2 weeks
**Test Window:** [Start Date] - [End Date]

## In-Scope

- Public web application (https://yourapp.com)
- API endpoints (https://api.yourapp.com)
- Admin panel (https://yourapp.com/admin)
- Mobile-responsive interfaces

## Out of Scope

- Social engineering
- Physical security
- DoS/DDoS attacks
- Third-party integrations (Stripe, Cloudflare)

## Test Accounts

- Standard user: user@test.com / [provided]
- Admin user: admin@test.com / [provided]

## Expected Deliverables

- Executive summary
- Detailed technical findings
- Proof-of-concept exploits
- Remediation guidance
- Retest results (after fixes)
```

---

## Security Testing Best Practices

1. **Never test production** without explicit authorization
2. **Use test accounts** only (never use real customer data)
3. **Rate limit testing** carefully to avoid DoS
4. **Document findings** immediately with reproduction steps
5. **Responsible disclosure** - report vulnerabilities privately
6. **Retest after fixes** to confirm remediation
7. **Maintain test history** for compliance audits

---

**Last Updated:** January 18, 2026  
**Maintained By:** Security Team
