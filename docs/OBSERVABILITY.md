# Observability Guide

Complete guide to monitoring, logging, and troubleshooting the Electrical Supplier API in production.

## Table of Contents

1. [Logging](#logging)
2. [Error Tracking (Sentry)](#error-tracking-sentry)
3. [Performance Monitoring](#performance-monitoring)
4. [Health Checks](#health-checks)
5. [Metrics & Dashboards](#metrics--dashboards)
6. [Alerts & Notifications](#alerts--notifications)
7. [Troubleshooting](#troubleshooting)

---

## Logging

### Overview

The application uses **Pino** for structured logging with the following features:

- **Fast & efficient**: One of the fastest Node.js loggers
- **Structured JSON logs**: Perfect for log aggregation tools (ELK, DataDog, Splunk)
- **Request correlation**: Every request has a unique `requestId` for tracing
- **Environment-aware**: Pretty-printed in dev, JSON in production
- **Security-focused**: Automatically logs security events and audit trails

### Log Levels

```
trace < debug < info < warn < error < fatal
```

- **trace**: Very detailed debugging
- **debug**: Development debugging information
- **info**: General informational messages (requests, operations)
- **warn**: Warning messages (deprecated usage, potential issues)
- **error**: Error messages (exceptions, failures)
- **fatal**: Fatal errors (application crash)

### Configuration

Set environment variables in `.env`:

```bash
# Log level (default: debug in dev, info in prod)
LOG_LEVEL=info

# Log format (json or pretty)
# Default: json in production, pretty in development
LOG_FORMAT=json
```

### Log Output Examples

#### Development (Pretty Format)

```
[2025-01-15 10:30:45] INFO: Server running on port 5000
    environment: "development"
    apiVersion: "v1"
    url: "http://localhost:5000/api/v1"

[2025-01-15 10:30:50] INFO: GET /api/v1/products 200 - 45ms
    requestId: "abc123-def456-789"
    userId: "user_123"
```

#### Production (JSON Format)

```json
{
  "level": "INFO",
  "time": "2025-01-15T10:30:45.123Z",
  "service": "electrical-supplier-api",
  "environment": "production",
  "version": "1.0.0",
  "msg": "Server running on port 5000",
  "environment": "production",
  "apiVersion": "v1"
}
```

### Request Logging

All HTTP requests are automatically logged with:

- Method & URL
- Status code
- Response time
- Request ID (for correlation)
- User ID (if authenticated)
- Client IP

**Automatic log levels**:

- 200-399: `info`
- 400-499: `warn`
- 500+: `error`

Health check requests (`/health`, `/ready`) are **not logged** to reduce noise.

### Security Event Logging

Security-relevant events are automatically logged:

```typescript
// Authentication
logger.security({
  type: "auth",
  action: "login_success",
  userId: "user_123",
  ip: "192.168.1.1",
});

// Admin actions (audit trail)
logger.audit("quote_status_changed", adminId, {
  quoteId: "quote_456",
  oldStatus: "pending",
  newStatus: "approved",
});
```

**Security event types**:

- `auth`: Login, logout, 2FA, password reset
- `upload`: File uploads
- `quote`: Quote submissions
- `admin_action`: Admin operations (audit trail)
- `rate_limit`: Rate limit violations
- `validation`: Input validation failures
- `captcha`: Captcha failures
- `csrf`: CSRF token violations

### Log Aggregation

For production, send logs to a centralized system:

#### Option 1: ELK Stack (Elasticsearch, Logstash, Kibana)

```bash
# Pipe JSON logs to Logstash
npm start | logstash -f logstash.conf

# Or use filebeat to ship logs
filebeat -c filebeat.yml
```

#### Option 2: DataDog

```bash
# Install DataDog agent
DD_API_KEY=<your-key> bash -c "$(curl -L https://s3.amazonaws.com/dd-agent/scripts/install_script.sh)"

# Logs are auto-collected from stdout
```

#### Option 3: Splunk

```bash
# Install Splunk Universal Forwarder
# Configure to monitor application logs
```

### Custom Logging

```typescript
import { logger } from "./utils/logger";

// Info log
logger.info("User registered", {
  userId: user.id,
  email: user.email,
});

// Warning log
logger.warn("Deprecated API usage", {
  endpoint: "/api/v1/old-endpoint",
  userId: user.id,
});

// Error log
logger.error("Database query failed", error, {
  query: "SELECT * FROM products",
  userId: user.id,
});

// Debug log (dev only)
logger.debug("Cache hit", {
  key: "products:all",
  ttl: 3600,
});
```

---

## Error Tracking (Sentry)

### Overview

**Sentry** provides real-time error tracking and performance monitoring:

- Automatic error capture
- Stack traces with source maps
- User context (correlate errors with users)
- Breadcrumbs (actions leading to error)
- Release tracking (know which version has issues)
- Performance monitoring (slow requests, DB queries)
- Alerts via email/Slack/PagerDuty

### Setup

#### 1. Create Sentry Account

1. Go to https://sentry.io
2. Create account (free tier available)
3. Create new project: **Node.js / Express**
4. Copy your **DSN** (Data Source Name)

#### 2. Configure Environment

Add to `.env` or `.env.production`:

```bash
# Sentry DSN from your project settings
SENTRY_DSN=https://abc123@o123456.ingest.sentry.io/7890123

# Environment name (for filtering in Sentry dashboard)
SENTRY_ENVIRONMENT=production

# Release version (tracks which deployment has issues)
SENTRY_RELEASE=electrical-supplier-api@1.2.3

# Optional: Enable in development for testing
SENTRY_ENABLED=false
```

#### 3. Deploy

Sentry is automatically initialized in `server.ts`. No code changes needed!

### Features

#### Automatic Error Capture

All uncaught exceptions and unhandled promise rejections are automatically sent to Sentry with:

- Full stack trace
- Request context (URL, method, headers)
- User context (ID, email)
- Environment info
- Release version

#### Performance Monitoring

Monitor slow requests and identify bottlenecks:

- **Transaction traces**: See how long each part of a request takes
- **Database queries**: Identify slow queries
- **External API calls**: Track third-party API latency
- **Custom spans**: Measure specific operations

Sample rates (configured in `config/sentry.ts`):

```typescript
tracesSampleRate: 0.1, // Monitor 10% of requests
profilesSampleRate: 0.1, // Profile 10% of traced requests
```

**Why 10%?** In high-traffic production, sampling reduces cost while still capturing representative data.

#### User Context

Errors are automatically associated with users:

```typescript
// Automatically set on login (in auth middleware)
Sentry.setUser({
  id: user.id,
  email: user.email,
  username: user.name,
});

// Clear on logout
Sentry.setUser(null);
```

#### Breadcrumbs

Sentry automatically records "breadcrumbs" (actions leading to error):

- HTTP requests
- Database queries
- Console logs
- Navigation (frontend)

Example breadcrumb trail before error:

```
1. GET /api/v1/products
2. Database query: SELECT * FROM products
3. GET /api/v1/products/123
4. Error: Product not found
```

### Sentry Dashboard

#### Issues Tab

- See all errors grouped by type
- Click issue to see:
  - Stack trace
  - Request context
  - User affected
  - First seen / last seen
  - Frequency graph

#### Performance Tab

- See slowest transactions
- Identify bottlenecks
- Compare performance across releases

#### Releases Tab

- Track errors per deployment
- See if new release introduced issues
- Compare error rates between versions

### Alerts

Configure alerts in Sentry dashboard:

1. **Project Settings** → **Alerts**
2. **Create Alert Rule**

Example rules:

- Email when new error occurs
- Slack when error rate > 10/min
- PagerDuty for critical errors

### Manual Error Capture

```typescript
import {
  captureException,
  captureMessage,
  addBreadcrumb,
} from "./config/sentry";

// Capture exception with context
try {
  await processPayment(order);
} catch (error) {
  captureException(error, {
    orderId: order.id,
    amount: order.total,
  });
  throw error;
}

// Capture message (non-error)
captureMessage("Payment threshold exceeded", "warning");

// Add custom breadcrumb
addBreadcrumb("User clicked checkout", "user", "info");
```

### Privacy & Security

Sensitive data is **automatically filtered** (see `config/sentry.ts`):

```typescript
beforeSend(event) {
  // Remove sensitive fields
  const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'cookie'];
  sensitiveFields.forEach(field => {
    delete event.request?.data?.[field];
  });
  return event;
}
```

---

## Performance Monitoring

### Application Performance

#### Request Duration

Pino automatically logs request duration:

```json
{
  "method": "GET",
  "url": "/api/v1/products",
  "statusCode": 200,
  "responseTime": 45
}
```

Look for slow requests (>1000ms) and optimize:

1. Add database indexes
2. Implement caching
3. Optimize queries (N+1 problem)
4. Use CDN for static assets

#### Memory Usage

Health endpoint shows real-time memory:

```bash
curl http://localhost:5000/health
```

```json
{
  "status": "ok",
  "uptime": 86400,
  "memory": {
    "heapUsed": "45MB",
    "heapTotal": "60MB",
    "rss": "120MB"
  }
}
```

**Warning signs**:

- Heap usage constantly increasing (memory leak)
- RSS > 512MB for small traffic (investigate)

#### CPU Profiling (Sentry)

Sentry profiling shows CPU-intensive operations:

1. Go to **Performance** tab in Sentry
2. Click slow transaction
3. View **Profiling** tab
4. See which functions use most CPU

### Database Performance

Monitor slow queries:

```typescript
// Log query duration
logger.metric("db_query_duration", duration, {
  query: "findManyProducts",
  rowCount: results.length,
});
```

#### Prisma Query Logging

Enable in `config/db.ts`:

```typescript
const prisma = new PrismaClient({
  log: ["query", "info", "warn", "error"],
});
```

---

## Health Checks

### Liveness Probe (`/health`)

**Purpose**: Is the server alive?

```bash
curl http://localhost:5000/health
```

**Success (200)**:

```json
{
  "status": "ok",
  "timestamp": "2025-01-15T10:30:45.123Z",
  "uptime": 86400,
  "memory": { ... },
  "security": { ... }
}
```

**Use case**: Container orchestration (Docker, Kubernetes) restarts if this fails.

### Readiness Probe (`/ready`)

**Purpose**: Is the server ready to serve traffic?

Checks:

- Database connection
- Redis connection (if configured)

```bash
curl http://localhost:5000/ready
```

**Success (200)**:

```json
{
  "status": "ready",
  "timestamp": "2025-01-15T10:30:45.123Z",
  "environment": "production",
  "checks": {
    "database": "ok",
    "redis": "ok"
  }
}
```

**Failure (503)**:

```json
{
  "status": "not_ready",
  "checks": {
    "database": "error",
    "redis": "not_configured"
  }
}
```

**Use case**: Load balancer removes server from rotation if not ready.

### Monitoring with Uptime Tools

Use external monitoring:

- **UptimeRobot** (free)
- **Pingdom**
- **DataDog Synthetics**
- **New Relic**

Monitor both `/health` and `/ready` every 1-5 minutes.

---

## Metrics & Dashboards

### Key Metrics to Track

| Metric                   | Description          | Target   |
| ------------------------ | -------------------- | -------- |
| **Request Rate**         | Requests per second  | -        |
| **Error Rate**           | % of 5xx responses   | < 0.1%   |
| **Response Time (p50)**  | Median response time | < 200ms  |
| **Response Time (p95)**  | 95th percentile      | < 1000ms |
| **Response Time (p99)**  | 99th percentile      | < 2000ms |
| **CPU Usage**            | % CPU utilization    | < 70%    |
| **Memory Usage**         | MB used              | < 512MB  |
| **Database Connections** | Active connections   | < 10     |
| **Uptime**               | % availability       | > 99.9%  |

### Dashboard Tools

#### Option 1: Grafana + Prometheus

1. Install Prometheus (metrics collector)
2. Install Grafana (visualization)
3. Use `prom-client` to expose metrics:

```typescript
import { register, Counter, Histogram } from "prom-client";

const httpRequestsTotal = new Counter({
  name: "http_requests_total",
  help: "Total HTTP requests",
  labelNames: ["method", "route", "status"],
});

// Expose metrics endpoint
app.get("/metrics", async (req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});
```

#### Option 2: DataDog

DataDog provides pre-built dashboards for Node.js apps:

1. Install DataDog agent
2. Dashboard shows automatically:
   - Request rate
   - Error rate
   - Response time (p50, p95, p99)
   - Memory / CPU usage

#### Option 3: New Relic

Similar to DataDog with automatic instrumentation.

---

## Alerts & Notifications

### Critical Alerts

Set up alerts for:

| Alert                         | Threshold       | Action                  |
| ----------------------------- | --------------- | ----------------------- |
| **High Error Rate**           | >1% 5xx errors  | Investigate immediately |
| **Slow Response Time**        | p95 > 2s        | Check database/caching  |
| **High Memory Usage**         | RSS > 80%       | Check for memory leak   |
| **Service Down**              | `/health` fails | Restart server          |
| **Database Connection Error** | `/ready` fails  | Check DB connection     |
| **Disk Space Low**            | < 10% free      | Clear old logs/uploads  |

### Notification Channels

#### Email

```bash
# Sentry: Project Settings → Alerts → Email
```

#### Slack

```bash
# Sentry: Project Settings → Integrations → Slack
# Webhook URL: https://hooks.slack.com/...
```

#### PagerDuty (on-call)

```bash
# For critical production issues
# Sentry: Project Settings → Integrations → PagerDuty
```

#### SMS (Twilio)

```bash
# For critical alerts when on-call
```

---

## Troubleshooting

### Common Issues

#### 1. High Error Rate

**Symptoms**: Sentry shows spike in errors

**Debug steps**:

1. Check Sentry dashboard for error details
2. Check logs: `grep ERROR production.log`
3. Check recent deployments (bad release?)
4. Check database health: `curl /ready`

#### 2. Slow Response Time

**Symptoms**: Requests taking >2s

**Debug steps**:

1. Check Sentry **Performance** tab for slow transactions
2. Look for slow database queries in logs
3. Check database indexes: `EXPLAIN ANALYZE query`
4. Check external API latency
5. Add caching (Redis) for frequently accessed data

#### 3. Memory Leak

**Symptoms**: Memory usage constantly increasing

**Debug steps**:

1. Take heap snapshot: `node --inspect server.js`
2. Use Chrome DevTools to analyze
3. Look for retained objects
4. Check for event listener leaks

#### 4. Database Connection Issues

**Symptoms**: `/ready` returns 503, "database error"

**Debug steps**:

1. Check database is running: `pg_isready`
2. Check connection string: `.env DATABASE_URL`
3. Check connection limit (PostgreSQL default: 100)
4. Check network connectivity

#### 5. High CPU Usage

**Symptoms**: CPU at 100%, server slow

**Debug steps**:

1. Check Sentry profiling for CPU-intensive operations
2. Look for infinite loops or synchronous operations
3. Check for regex DoS (ReDoS) attacks
4. Scale horizontally (add more servers)

### Log Analysis

#### Find errors in last hour

```bash
# Production JSON logs
cat production.log | jq 'select(.level == "ERROR" and .time > "2025-01-15T09:00:00Z")'
```

#### Find slow requests (>1s)

```bash
cat production.log | jq 'select(.responseTime > 1000)'
```

#### Count requests per endpoint

```bash
cat production.log | jq -r '.url' | sort | uniq -c | sort -rn
```

#### Find security events

```bash
cat production.log | jq 'select(.logType == "security")'
```

### Emergency Procedures

#### Server Down

```bash
# Check if process is running
pm2 status

# Restart server
pm2 restart electrical-supplier-api

# Check logs
pm2 logs electrical-supplier-api --lines 100
```

#### Database Down

```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Restart PostgreSQL
sudo systemctl restart postgresql

# Check connections
psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;"
```

#### Out of Disk Space

```bash
# Check disk usage
df -h

# Clear old logs
find /var/log -name "*.log" -mtime +30 -delete

# Clear old uploads (if safe)
find ./uploads -mtime +90 -delete

# Rotate logs with logrotate
```

---

## Best Practices

### Development

- Use `LOG_FORMAT=pretty` for readable logs
- Use `LOG_LEVEL=debug` to see all logs
- Test Sentry integration with `SENTRY_ENABLED=true`
- Monitor `/health` and `/ready` locally

### Production

- Use `LOG_FORMAT=json` for log aggregation
- Use `LOG_LEVEL=info` (avoid debug in prod)
- Set `SENTRY_DSN` for error tracking
- Set `SENTRY_RELEASE` to track deployments
- Ship logs to a centralized system (ELK, DataDog)
- Set up alerts for critical metrics
- Monitor uptime with an external tool
- Review Sentry issues regularly
- Rotate logs to prevent disk full

### Security

- Never log passwords or tokens
- Use Sentry's `beforeSend` to filter sensitive data
- Log security events (auth, admin actions)
- Restrict `/metrics` endpoint (if using Prometheus)
- Use HTTPS for log shipping

---

## Resources

### Documentation

- **Pino**: https://getpino.io
- **Sentry Node.js**: https://docs.sentry.io/platforms/node/
- **ELK Stack**: https://www.elastic.co/elk-stack
- **DataDog**: https://docs.datadoghq.com
- **Grafana**: https://grafana.com/docs

### Tools

- **Sentry**: https://sentry.io (Free tier: 5K errors/month)
- **UptimeRobot**: https://uptimerobot.com (Free: 50 monitors)
- **Better Stack (Logtail)**: https://betterstack.com (Free: 1GB logs/month)

---

## Summary

- **Logging**: Pino structured logs for development and production
- **Error tracking**: Sentry for error monitoring
- **Performance**: Monitor request duration, memory, CPU
- **Health checks**: Liveness (`/health`) and readiness (`/ready`) probes
- **Dashboards**: Grafana, DataDog, or Sentry performance tab
- **Alerts**: Email/Slack/PagerDuty for critical issues
- **Troubleshooting**: Log analysis, heap snapshots, Sentry profiling

Validate these integrations and thresholds in your environment and operations workflow.
