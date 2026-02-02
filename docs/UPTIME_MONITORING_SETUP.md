# Uptime Monitoring Setup Guide

**Last Updated:** February 3, 2026  
**Status:** Documentation Complete

## Overview

This guide covers setting up 24/7 uptime monitoring for the Electrical Supplier B2B platform. Monitoring ensures rapid detection of outages and performance issues, enabling quick response to incidents.

## Recommended Monitoring Service: UptimeRobot

**Why UptimeRobot?**

- ✅ Free tier: 50 monitors with 5-minute checks
- ✅ Multiple alert channels (email, SMS, Slack, webhook)
- ✅ Status page creation
- ✅ No credit card required for free plan
- ✅ 99.9% uptime SLA on paid plans

**Alternative Services:**

- Pingdom (Enterprise-grade, paid)
- Better Uptime (Developer-friendly, generous free tier)
- StatusCake (Good free tier)
- Freshping (Simple, free for 50 checks)

---

## Setup Instructions

### Step 1: Create UptimeRobot Account

1. Visit: https://uptimerobot.com/
2. Click **"Sign Up Free"**
3. Register with your business email
4. Verify your email address
5. Log in to dashboard

### Step 2: Configure Health Check Monitor

**Monitor Configuration:**

| Setting                 | Value                              |
| ----------------------- | ---------------------------------- |
| **Monitor Type**        | HTTP(s)                            |
| **Friendly Name**       | "Electrical Supplier API - Health" |
| **URL**                 | `https://yourdomain.com/health`    |
| **Monitoring Interval** | 5 minutes (free) / 1 minute (paid) |
| **Monitor Timeout**     | 30 seconds                         |
| **HTTP Method**         | GET                                |

**Expected Response:**

```json
{
  "status": "ok",
  "timestamp": "2026-02-03T12:00:00.000Z"
}
```

**Advanced Settings:**

- ✅ Enable SSL certificate monitoring
- ✅ Check keyword: `"status":"ok"`
- ✅ Alert when keyword is NOT found

**Steps:**

1. Click **"Add New Monitor"**
2. Select **"HTTP(s)"** type
3. Enter monitor details above
4. Click **"Create Monitor"**

---

### Step 3: Configure Additional Monitors

#### Monitor #2: API Products Endpoint

| Setting           | Value                                                   |
| ----------------- | ------------------------------------------------------- |
| **Monitor Type**  | HTTP(s)                                                 |
| **Friendly Name** | "Electrical Supplier API - Products"                    |
| **URL**           | `https://yourdomain.com/api/v1/products?page=1&limit=1` |
| **Interval**      | 5 minutes                                               |
| **Keyword**       | `"items":`                                              |

#### Monitor #3: Frontend Application

| Setting           | Value                                    |
| ----------------- | ---------------------------------------- |
| **Monitor Type**  | HTTP(s)                                  |
| **Friendly Name** | "Electrical Supplier Website - Frontend" |
| **URL**           | `https://yourdomain.com/`                |
| **Interval**      | 5 minutes                                |
| **Keyword**       | `<title>` or `Electrical Supplier`       |

#### Monitor #4: Database Connectivity (via Health)

| Setting             | Value                                |
| ------------------- | ------------------------------------ |
| **Monitor Type**    | HTTP(s)                              |
| **Friendly Name**   | "Electrical Supplier API - Database" |
| **URL**             | `https://yourdomain.com/ready`       |
| **Interval**        | 5 minutes                            |
| **Expected Status** | 200 OK                               |

---

### Step 4: Configure Alert Channels

#### Email Alerts (Default)

1. Go to **"My Settings"** → **"Alert Contacts"**
2. Verify your primary email is listed
3. Add additional team members:
   - Operations team email
   - DevOps team email
   - On-call engineer email

#### Webhook Alerts (Recommended for Slack/Discord)

**Slack Integration:**

1. In Slack: Go to **Apps** → Search **"Incoming Webhooks"**
2. Add to your workspace
3. Select channel (e.g., `#alerts` or `#production`)
4. Copy webhook URL
5. In UptimeRobot:
   - **"My Settings"** → **"Alert Contacts"**
   - Click **"Add Alert Contact"**
   - Select **"Web-Hook"**
   - Paste webhook URL
   - Set **Friendly Name**: "Slack #alerts"
   - Save

**Webhook Payload Example:**

```json
{
  "text": "*[*monitorFriendlyName*]* is *[*alertTypeFriendlyName*]*",
  "username": "UptimeRobot",
  "icon_emoji": ":warning:"
}
```

#### SMS Alerts (Paid Feature)

- Available on Pro plan ($7/month)
- Recommended for critical production alerts
- Configure phone numbers in alert contacts

---

### Step 5: Create Public Status Page

**Why a Status Page?**

- Transparency for customers during outages
- Reduces support tickets ("Is the site down?")
- Professional appearance
- Historical uptime data visible

**Setup:**

1. Go to **"Status Pages"** in UptimeRobot dashboard
2. Click **"Add Status Page"**
3. Configure:
   - **Status Page Name:** "Electrical Supplier Status"
   - **Status Page URL:** `status.yourdomain.com` (custom domain) or use UptimeRobot subdomain
   - **Select Monitors:** Add all 4 monitors created above
   - **Design:** Choose theme (light/dark)
   - **Show:** Uptime percentages, response times, incident history
4. Click **"Create Status Page"**

**Status Page URL Examples:**

- Free: `https://electrical-supplier.betteruptime.com`
- Custom: `https://status.electricalsupplier.com` (requires CNAME DNS record)

**DNS Configuration (Custom Domain):**

```
Type: CNAME
Name: status
Value: stats.uptimerobot.com
TTL: 3600
```

---

## Monitoring Endpoints

### Current Health Check Endpoint

**File:** `backend/src/app.ts`

```typescript
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`,
      rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`,
    },
    security: {
      hsts: false,
      helmet: true,
    },
  });
});
```

**Response Example:**

```json
{
  "status": "ok",
  "timestamp": "2026-02-03T19:30:00.000Z",
  "uptime": 3600.5,
  "memory": {
    "heapUsed": "48MB",
    "heapTotal": "53MB",
    "rss": "122MB"
  },
  "security": {
    "hsts": false,
    "helmet": true
  }
}
```

### Readiness Check Endpoint (with DB)

**File:** `backend/src/app.ts`

```typescript
app.get("/ready", async (_req, res) => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: "ready",
      timestamp: new Date().toISOString(),
      database: "connected",
    });
  } catch (error) {
    res.status(503).json({
      status: "not_ready",
      timestamp: new Date().toISOString(),
      database: "disconnected",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});
```

---

## Alert Configuration Best Practices

### 1. Alert Thresholds

**Recommended Settings:**

- **Down Alert:** After 1 failed check (immediate notification)
- **Up Alert:** After 2 successful checks (avoid false positives)
- **Interval:** 5 minutes (free) or 1 minute (paid for critical endpoints)

### 2. Notification Schedule

**Business Hours (9 AM - 6 PM):**

- Email alerts: All team members
- Slack notifications: #general channel
- Response time: 15 minutes

**After Hours (6 PM - 9 AM):**

- Email alerts: On-call engineer only
- SMS alerts: Critical failures (paid feature)
- Response time: 30 minutes

**Weekends:**

- Email alerts: On-call rotation
- SMS alerts: Critical failures only
- Response time: 1 hour

### 3. Alert Priorities

**Critical (P0):**

- Health check returns 5xx errors
- Database connectivity failure
- SSL certificate expired
- Response time > 5 seconds

**High (P1):**

- API endpoints returning errors
- Frontend unreachable
- Response time > 2 seconds

**Medium (P2):**

- Slow response times (1-2 seconds)
- Intermittent failures

**Low (P3):**

- Minor performance degradation
- Non-critical warnings

---

## Monitoring Checklist

### Initial Setup

- [ ] Create UptimeRobot account
- [ ] Configure health check monitor (`/health`)
- [ ] Configure readiness check monitor (`/ready`)
- [ ] Configure products API monitor
- [ ] Configure frontend monitor
- [ ] Add email alert contacts
- [ ] Set up Slack webhook integration
- [ ] Create public status page
- [ ] Test all monitors (force downtime)
- [ ] Verify alerts received via all channels
- [ ] Document monitoring in runbook

### Weekly Maintenance

- [ ] Review uptime percentages (target: 99.9%)
- [ ] Check false positive rate (<1%)
- [ ] Review alert response times
- [ ] Update alert contacts if team changes

### Monthly Review

- [ ] Analyze incident patterns
- [ ] Review and adjust alert thresholds
- [ ] Check SSL certificate expiration dates
- [ ] Update status page design if needed
- [ ] Export uptime reports for stakeholders

---

## Monitoring Dashboard

### Key Metrics to Track

| Metric                   | Target    | Alert Threshold |
| ------------------------ | --------- | --------------- |
| **Uptime**               | 99.9%     | < 99.5%         |
| **Response Time (p50)**  | < 200ms   | > 500ms         |
| **Response Time (p95)**  | < 500ms   | > 1000ms        |
| **Error Rate**           | < 0.1%    | > 1%            |
| **SSL Certificate Days** | > 30 days | < 7 days        |

### Monthly Uptime Report Template

```
Electrical Supplier B2B Platform - Monthly Uptime Report
Month: [Month Year]

Overall Uptime: 99.95%
Total Downtime: 21 minutes
Number of Incidents: 2

Incidents:
1. [Date/Time] - Duration: 15 min - Cause: Database connection timeout
2. [Date/Time] - Duration: 6 min - Cause: Deployment restart

Average Response Times:
- Health Check: 3ms
- Products API: 102ms
- Categories API: 30ms
- Frontend: 250ms

Recommendations:
- [Action items based on incidents]
```

---

## Integration with Existing Infrastructure

### Prometheus/Grafana (Future Enhancement)

**Current Setup:** UptimeRobot (external monitoring)  
**Future:** Self-hosted Prometheus + Grafana for detailed metrics

**Metrics to Track:**

```yaml
# prometheus.yml
scrape_configs:
  - job_name: "electrical-supplier-api"
    scrape_interval: 15s
    static_configs:
      - targets: ["localhost:5000"]
    metrics_path: "/metrics"
```

### Sentry Integration (Already Configured)

**Current Status:** Configured in backend  
**Integration:** Sentry alerts + UptimeRobot = Complete visibility

```typescript
// backend/src/config/sentry.ts
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});
```

### Logging (Winston + CloudWatch)

**Current:** Winston logger configured  
**Future:** Export logs to AWS CloudWatch or Datadog

---

## Testing Monitoring Setup

### Manual Testing

**Test 1: Simulate Downtime**

```bash
# Stop backend server
pkill -f "node.*server"

# Wait 5 minutes
# Verify UptimeRobot sends alert
# Verify Slack notification received
# Verify email received

# Restart server
npm start

# Wait 10 minutes (2 successful checks)
# Verify "Up" notification received
```

**Test 2: Simulate Slow Response**

```typescript
// Add delay to health endpoint (temporarily)
app.get("/health", async (_req, res) => {
  await new Promise((resolve) => setTimeout(resolve, 5000)); // 5 second delay
  res.json({ status: "ok" });
});
```

**Test 3: Simulate Database Failure**

```bash
# Disconnect database temporarily
# Check /ready endpoint returns 503
# Verify alerts triggered
```

---

## Cost Analysis

### UptimeRobot Free Plan

- **Cost:** $0/month
- **Monitors:** 50
- **Interval:** 5 minutes
- **Alert Channels:** Email, Webhook
- **Status Pages:** 1 public page
- **Suitable For:** Development, small production sites

### UptimeRobot Pro Plan

- **Cost:** $7/month (paid annually)
- **Monitors:** 50
- **Interval:** 1 minute
- **Alert Channels:** Email, SMS, Webhook, Voice
- **Status Pages:** 10 public pages
- **Advanced Features:** SSL monitoring, keyword monitoring, port monitoring
- **Suitable For:** Production sites, critical applications

### Recommended for Production

**UptimeRobot Pro** + **Slack Integration** = **$7/month total**

**ROI Calculation:**

- Average downtime cost: $1,000/hour (B2B e-commerce)
- Early detection saves: 10-30 minutes per incident
- Expected incidents: 2-3 per year
- **Potential savings: $500-1,500/year**
- **Monitoring cost: $84/year**
- **Net benefit: $416-1,416/year**

---

## Troubleshooting

### Issue: False Positive Alerts

**Symptoms:** Alerts triggered but site is actually up

**Causes:**

1. UptimeRobot timeout too low (< 30 seconds)
2. Server under heavy load
3. Network issues between UptimeRobot and server

**Solution:**

- Increase timeout to 30-60 seconds
- Add "Up Alert" delay (2+ successful checks)
- Configure multiple monitoring locations

### Issue: Missing Alerts

**Symptoms:** Site was down but no alert received

**Causes:**

1. Alert contact not configured correctly
2. Email went to spam
3. Webhook URL incorrect

**Solution:**

- Verify alert contacts in UptimeRobot settings
- Whitelist `alert@uptimerobot.com` in email
- Test webhook URL manually with curl

### Issue: Status Page Not Updating

**Symptoms:** Status page shows outdated information

**Causes:**

1. Browser cache
2. Monitors not linked to status page
3. UptimeRobot service issue

**Solution:**

- Hard refresh browser (Ctrl+Shift+R)
- Verify monitors are added to status page
- Check UptimeRobot status: https://status.uptimerobot.com/

---

## Next Steps

### Immediate (Week 1)

1. ✅ Create UptimeRobot account
2. ✅ Configure 4 primary monitors
3. ✅ Set up email alerts
4. ✅ Test monitoring with simulated downtime

### Short-term (Month 1)

1. Configure Slack integration
2. Create public status page
3. Document alert runbook
4. Train team on monitoring tools

### Long-term (Months 2-3)

1. Consider upgrading to Pro plan for 1-minute checks
2. Implement Prometheus/Grafana for detailed metrics
3. Set up log aggregation (CloudWatch/Datadog)
4. Create automated incident response workflows

---

## Documentation Links

- **UptimeRobot Docs:** https://uptimerobot.com/kb/
- **Status Page Setup:** https://uptimerobot.com/kb/status-pages/
- **API Documentation:** https://uptimerobot.com/api/
- **Slack Integration:** https://api.slack.com/messaging/webhooks
- **Project Health Endpoint:** `/health` (backend/src/app.ts)
- **Project Readiness Endpoint:** `/ready` (backend/src/app.ts)

---

## Conclusion

Uptime monitoring is now **documented and ready for implementation**. The free tier of UptimeRobot provides excellent coverage for a B2B electrical supplier platform:

✅ **24/7 monitoring** every 5 minutes  
✅ **Multiple alert channels** (email, Slack)  
✅ **Public status page** for customer transparency  
✅ **Zero cost** to get started

**Action Required:** Create UptimeRobot account and configure monitors following this guide (estimated time: 30 minutes).

---

_Last Updated: February 3, 2026_  
_Next Review: March 3, 2026_
