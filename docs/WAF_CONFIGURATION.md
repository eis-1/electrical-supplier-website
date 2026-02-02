# Web Application Firewall (WAF) Configuration Guide

## Overview

This guide provides production-ready WAF rules for the Electrical Supplier B2B website across multiple platforms.

---

## Option 1: Cloudflare WAF (Recommended for Quick Setup)

### Prerequisites

- Cloudflare account with Pro plan or higher
- Domain DNS managed by Cloudflare

### Cloudflare Firewall Rules

#### 1. Rate Limiting Rules

```javascript
// Admin Login Protection
(http.request.uri.path eq "/api/v1/auth/login" and http.request.method eq "POST")
Rate limit: 5 requests per 15 minutes
Action: Block for 1 hour

// Quote Submission Protection
(http.request.uri.path eq "/api/v1/quotes" and http.request.method eq "POST")
Rate limit: 3 requests per 1 hour
Action: Challenge (CAPTCHA)

// API Global Rate Limit
(http.request.uri.path contains "/api/v1/")
Rate limit: 100 requests per 15 minutes per IP
Action: Challenge
```

#### 2. WAF Custom Rules (Firewall Rules → Create)

```javascript
// Block known bad bots
(cf.client.bot) and not (cf.verified_bot_category in {"Search Engine Crawler" "Monitoring & Analytics"})
Action: Block

// Block requests without User-Agent (common in bot attacks)
(not http.user_agent contains "Mozilla" and not http.user_agent contains "curl") and http.request.uri.path contains "/api/"
Action: Challenge

// SQL Injection Protection (additional to built-in OWASP)
(http.request.uri.query contains "union" or http.request.uri.query contains "select" or http.request.body contains "'; drop table")
Action: Block

// Path Traversal Protection
(http.request.uri.path contains "../" or http.request.uri.path contains "..\\")
Action: Block

// Admin Panel Geographic Restriction (optional - adjust country codes)
(http.request.uri.path contains "/admin" and ip.geoip.country notin {"US" "CA" "GB" "BD"})
Action: Challenge

// Block requests with suspicious headers
(any(http.request.headers.names[*] contains "X-Forwarded-Host") or any(http.request.headers.names[*] contains "X-Original-URL"))
Action: Block

// File Upload Size Protection (adjust for your MAX_FILE_SIZE)
(http.request.uri.path eq "/api/v1/upload" and http.request.body.size gt 10485760)
Action: Block
```

#### 3. Managed Rulesets (Enable These)

- ✅ **Cloudflare Managed Ruleset** (OWASP Core Rule Set)
- ✅ **Cloudflare OWASP Core Ruleset**
- ✅ **Cloudflare Exposed Credentials Check**
- ✅ **Cloudflare Leaked Credentials Check**

#### 4. Security Level Settings

```
Security Level: High
Challenge Passage: 30 minutes
Browser Integrity Check: ON
```

#### 5. Page Rules for Admin

```
URL Pattern: *yoursite.com/admin*
Settings:
  - Security Level: I'm Under Attack
  - Browser Integrity Check: On
  - Disable Apps: Off
```

---

## Option 2: AWS WAF (For AWS-Hosted Applications)

### AWS WAF Web ACL Configuration

```json
{
  "Name": "ElectricalSupplierWAF",
  "Scope": "REGIONAL",
  "DefaultAction": {
    "Allow": {}
  },
  "Rules": [
    {
      "Name": "AWSManagedRulesCommonRuleSet",
      "Priority": 0,
      "Statement": {
        "ManagedRuleGroupStatement": {
          "VendorName": "AWS",
          "Name": "AWSManagedRulesCommonRuleSet"
        }
      },
      "OverrideAction": {
        "None": {}
      },
      "VisibilityConfig": {
        "SampledRequestsEnabled": true,
        "CloudWatchMetricsEnabled": true,
        "MetricName": "AWSManagedRulesCommonRuleSetMetric"
      }
    },
    {
      "Name": "AWSManagedRulesKnownBadInputsRuleSet",
      "Priority": 1,
      "Statement": {
        "ManagedRuleGroupStatement": {
          "VendorName": "AWS",
          "Name": "AWSManagedRulesKnownBadInputsRuleSet"
        }
      },
      "OverrideAction": {
        "None": {}
      },
      "VisibilityConfig": {
        "SampledRequestsEnabled": true,
        "CloudWatchMetricsEnabled": true,
        "MetricName": "AWSManagedRulesKnownBadInputsRuleSetMetric"
      }
    },
    {
      "Name": "RateLimitAdminLogin",
      "Priority": 2,
      "Statement": {
        "RateBasedStatement": {
          "Limit": 100,
          "AggregateKeyType": "IP",
          "ScopeDownStatement": {
            "ByteMatchStatement": {
              "SearchString": "/api/v1/auth/login",
              "FieldToMatch": {
                "UriPath": {}
              },
              "TextTransformations": [
                {
                  "Priority": 0,
                  "Type": "LOWERCASE"
                }
              ],
              "PositionalConstraint": "CONTAINS"
            }
          }
        }
      },
      "Action": {
        "Block": {}
      },
      "VisibilityConfig": {
        "SampledRequestsEnabled": true,
        "CloudWatchMetricsEnabled": true,
        "MetricName": "RateLimitAdminLoginMetric"
      }
    },
    {
      "Name": "GeoBlockingRule",
      "Priority": 3,
      "Statement": {
        "AndStatement": {
          "Statements": [
            {
              "ByteMatchStatement": {
                "SearchString": "/admin",
                "FieldToMatch": {
                  "UriPath": {}
                },
                "TextTransformations": [
                  {
                    "Priority": 0,
                    "Type": "LOWERCASE"
                  }
                ],
                "PositionalConstraint": "STARTS_WITH"
              }
            },
            {
              "NotStatement": {
                "Statement": {
                  "GeoMatchStatement": {
                    "CountryCodes": ["US", "CA", "GB", "BD"]
                  }
                }
              }
            }
          ]
        }
      },
      "Action": {
        "Block": {}
      },
      "VisibilityConfig": {
        "SampledRequestsEnabled": true,
        "CloudWatchMetricsEnabled": true,
        "MetricName": "GeoBlockingMetric"
      }
    }
  ],
  "VisibilityConfig": {
    "SampledRequestsEnabled": true,
    "CloudWatchMetricsEnabled": true,
    "MetricName": "ElectricalSupplierWAF"
  }
}
```

### Deploy with AWS CLI

```bash
# Create Web ACL
aws wafv2 create-web-acl --cli-input-json file://waf-config.json --region us-east-1

# Associate with Application Load Balancer
aws wafv2 associate-web-acl \
  --web-acl-arn arn:aws:wafv2:us-east-1:123456789012:regional/webacl/ElectricalSupplierWAF/a1b2c3d4 \
  --resource-arn arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/app/my-alb/1234567890abcdef
```

---

## Option 3: ModSecurity (Nginx/Apache)

### Installation (Ubuntu/Debian)

```bash
# Install ModSecurity for Nginx
sudo apt update
sudo apt install -y libnginx-mod-security2

# Enable ModSecurity
sudo mkdir -p /etc/nginx/modsec
cd /etc/nginx/modsec

# Download OWASP Core Rule Set
wget https://github.com/coreruleset/coreruleset/archive/v4.0.0.tar.gz
tar -xvzf v4.0.0.tar.gz
mv coreruleset-4.0.0 owasp-crs
cd owasp-crs
cp crs-setup.conf.example crs-setup.conf
```

### Nginx Configuration

```nginx
# /etc/nginx/nginx.conf
user www-data;
worker_processes auto;
pid /run/nginx.pid;

events {
    worker_connections 2048;
    use epoll;
}

http {
    # ModSecurity Configuration
    modsecurity on;
    modsecurity_rules_file /etc/nginx/modsec/main.conf;

    # Security Headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;

    # Hide Nginx version
    server_tokens off;

    # Rate Limiting Zones
    limit_req_zone $binary_remote_addr zone=admin_login:10m rate=5r/m;
    limit_req_zone $binary_remote_addr zone=api_general:10m rate=100r/m;
    limit_req_zone $binary_remote_addr zone=quote_submit:10m rate=3r/h;

    # Connection Limiting
    limit_conn_zone $binary_remote_addr zone=addr:10m;

    # Upstream Backend
    upstream backend {
        server 127.0.0.1:5000;
        keepalive 32;
    }

    # Main Server Block
    server {
        listen 443 ssl http2;
        listen [::]:443 ssl http2;
        server_name yoursite.com www.yoursite.com;

        # SSL Configuration (use certbot for Let's Encrypt)
        ssl_certificate /etc/letsencrypt/live/yoursite.com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/yoursite.com/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;
        ssl_prefer_server_ciphers on;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;

        # HSTS
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

        # Connection limiting
        limit_conn addr 10;

        # Frontend (React)
        location / {
            root /var/www/frontend/dist;
            try_files $uri $uri/ /index.html;

            # Cache static assets
            location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf)$ {
                expires 1y;
                add_header Cache-Control "public, immutable";
            }
        }

        # API with rate limiting
        location /api/v1/ {
            limit_req zone=api_general burst=20 nodelay;

            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        # Admin Login (strict rate limiting)
        location = /api/v1/auth/login {
            limit_req zone=admin_login burst=2 nodelay;

            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Quote Submission (very strict)
        location = /api/v1/quotes {
            limit_req zone=quote_submit burst=1 nodelay;

            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Block direct access to sensitive files
        location ~ /\. {
            deny all;
            access_log off;
            log_not_found off;
        }

        location ~ \.(env|git|gitignore|md|sql|conf)$ {
            deny all;
            access_log off;
            log_not_found off;
        }
    }

    # HTTP to HTTPS redirect
    server {
        listen 80;
        listen [::]:80;
        server_name yoursite.com www.yoursite.com;
        return 301 https://$server_name$request_uri;
    }
}
```

### ModSecurity Main Config

```nginx
# /etc/nginx/modsec/main.conf
Include /etc/nginx/modsec/modsecurity.conf
Include /etc/nginx/modsec/owasp-crs/crs-setup.conf
Include /etc/nginx/modsec/owasp-crs/rules/*.conf

# Custom Rules for Electrical Supplier
SecRule REQUEST_URI "@contains /admin" \
    "id:1001,phase:1,deny,status:403,msg:'Admin access restricted',chain"
SecRule REMOTE_ADDR "!@ipMatch 1.2.3.4,5.6.7.8"

# Block suspicious User-Agents
SecRule REQUEST_HEADERS:User-Agent "@pmFromFile /etc/nginx/modsec/blocked-agents.txt" \
    "id:1002,phase:1,deny,status:403,msg:'Blocked User-Agent'"

# Protect against SQL Injection in JSON payloads
SecRule REQUEST_BODY "@rx (?i:union.*select|insert.*into|delete.*from)" \
    "id:1003,phase:2,deny,status:403,msg:'SQL Injection Attempt in Body'"
```

---

## WAF Testing & Validation

### Test Rate Limiting

```bash
# Test admin login rate limit (should block after 5 attempts)
for i in {1..10}; do
  curl -X POST https://yoursite.com/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}' \
    -w "\nStatus: %{http_code}\n"
  sleep 1
done
```

### Test SQL Injection Protection

```bash
# Should return 403
curl "https://yoursite.com/api/v1/products?search='; DROP TABLE users--"
```

### Test Path Traversal Protection

```bash
# Should return 403
curl "https://yoursite.com/api/v1/../../../etc/passwd"
```

### Check Security Headers

```bash
curl -I https://yoursite.com | grep -E "(Strict-Transport-Security|X-Frame-Options|X-Content-Type-Options)"
```

---

## Monitoring & Alerts

### Cloudflare Notifications

Set up email/webhook alerts for:

- Rate limit threshold exceeded
- WAF rule triggered > 10 times in 5 minutes
- DDoS attack detected

### AWS CloudWatch Alarms

```bash
# Alert when blocked requests > 100 in 5 minutes
aws cloudwatch put-metric-alarm \
  --alarm-name WAF-HighBlockRate \
  --metric-name BlockedRequests \
  --namespace AWS/WAFV2 \
  --statistic Sum \
  --period 300 \
  --threshold 100 \
  --comparison-operator GreaterThanThreshold
```

---

## Maintenance

### Weekly Tasks

- [ ] Review WAF logs for false positives
- [ ] Update OWASP CRS to latest version
- [ ] Analyze top blocked IPs for patterns

### Monthly Tasks

- [ ] Review and tune rate limits based on traffic
- [ ] Update geo-blocking rules if needed
- [ ] Audit admin IP whitelist

---

**Maintained By:** DevOps Team
