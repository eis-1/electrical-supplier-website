# Monitoring & Alerting Configuration

## Overview

Production monitoring and alerting setup for the Electrical Supplier B2B platform with multiple observability stack options.

---

## Architecture

```
Application → Metrics/Logs → Time-Series DB → Visualization & Alerts
  (Node.js)    (Prom/Logger)   (Prometheus/   (Grafana/CloudWatch/
                                 CloudWatch)    DataDog/PagerDuty)
```

---

## Option 1: Prometheus + Grafana (Open Source)

### Step 1: Install Prometheus Metrics in Application

```bash
cd backend
npm install prom-client
```

```typescript
// backend/src/utils/metrics.ts
import promClient from "prom-client";

// Create registry
const register = new promClient.Registry();

// Collect default metrics (CPU, memory, event loop lag)
promClient.collectDefaultMetrics({ register });

// Custom metrics
export const metrics = {
  // HTTP metrics
  httpRequestDuration: new promClient.Histogram({
    name: "http_request_duration_seconds",
    help: "Duration of HTTP requests in seconds",
    labelNames: ["method", "route", "status_code"],
    buckets: [0.1, 0.5, 1, 2, 5],
    registers: [register],
  }),

  httpRequestTotal: new promClient.Counter({
    name: "http_requests_total",
    help: "Total number of HTTP requests",
    labelNames: ["method", "route", "status_code"],
    registers: [register],
  }),

  // Business metrics
  quotesSubmitted: new promClient.Counter({
    name: "quotes_submitted_total",
    help: "Total number of quotes submitted",
    labelNames: ["category"],
    registers: [register],
  }),

  quotesProcessingTime: new promClient.Histogram({
    name: "quotes_processing_duration_seconds",
    help: "Time to process quote submissions",
    buckets: [0.5, 1, 2, 5, 10],
    registers: [register],
  }),

  // Security metrics
  authFailures: new promClient.Counter({
    name: "auth_failures_total",
    help: "Total authentication failures",
    labelNames: ["type", "ip"],
    registers: [register],
  }),

  rateLimitHits: new promClient.Counter({
    name: "rate_limit_hits_total",
    help: "Total rate limit violations",
    labelNames: ["endpoint", "ip"],
    registers: [register],
  }),

  csrfFailures: new promClient.Counter({
    name: "csrf_failures_total",
    help: "CSRF validation failures",
    registers: [register],
  }),

  // Database metrics
  dbQueryDuration: new promClient.Histogram({
    name: "db_query_duration_seconds",
    help: "Database query execution time",
    labelNames: ["operation", "table"],
    buckets: [0.01, 0.05, 0.1, 0.5, 1],
    registers: [register],
  }),

  dbConnectionsActive: new promClient.Gauge({
    name: "db_connections_active",
    help: "Number of active database connections",
    registers: [register],
  }),
};

export { register };
```

```typescript
// backend/src/server.ts - Add metrics endpoint
import { register, metrics } from "./utils/metrics";

// Metrics endpoint (restrict access in production)
app.get("/metrics", async (req, res) => {
  // Optional: Add basic auth or IP whitelist
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});
```

```typescript
// backend/src/middlewares/metrics.middleware.ts - Track HTTP requests
import { Request, Response, NextFunction } from "express";
import { metrics } from "../utils/metrics";

export function metricsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const start = Date.now();

  res.on("finish", () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path;

    // Record request duration
    metrics.httpRequestDuration
      .labels(req.method, route, res.statusCode.toString())
      .observe(duration);

    // Increment request counter
    metrics.httpRequestTotal
      .labels(req.method, route, res.statusCode.toString())
      .inc();
  });

  next();
}

// Usage in app.ts
import { metricsMiddleware } from "./middlewares/metrics.middleware";
app.use(metricsMiddleware);
```

### Step 2: Deploy Prometheus Server

```yaml
# docker-compose.monitoring.yml
version: "3.8"

services:
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    ports:
      - "9090:9090"
    command:
      - "--config.file=/etc/prometheus/prometheus.yml"
      - "--storage.tsdb.path=/prometheus"
      - "--storage.tsdb.retention.time=30d"
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./monitoring/grafana/datasources:/etc/grafana/provisioning/datasources
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_ADMIN_PASSWORD:-changeme}
      - GF_USERS_ALLOW_SIGN_UP=false
    restart: unless-stopped
    depends_on:
      - prometheus

  alertmanager:
    image: prom/alertmanager:latest
    container_name: alertmanager
    volumes:
      - ./monitoring/alertmanager.yml:/etc/alertmanager/alertmanager.yml
    ports:
      - "9093:9093"
    restart: unless-stopped

volumes:
  prometheus_data:
  grafana_data:
```

```yaml
# monitoring/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

# Load alert rules
rule_files:
  - "alerts.yml"

# Alertmanager configuration
alerting:
  alertmanagers:
    - static_configs:
        - targets: ["alertmanager:9093"]

# Scrape configurations
scrape_configs:
  - job_name: "electrical-supplier-api"
    static_configs:
      - targets: ["host.docker.internal:5000"]
    metrics_path: "/metrics"
    scrape_interval: 10s
```

### Step 3: Configure Alert Rules

```yaml
# monitoring/alerts.yml
groups:
  - name: application
    interval: 30s
    rules:
      # High error rate
      - alert: HighErrorRate
        expr: rate(http_requests_total{status_code=~"5.."}[5m]) > 1
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "{{ $value }} errors/sec in last 5 minutes"

      # Slow API responses
      - alert: SlowAPIResponses
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "95th percentile response time above 2s"
          description: "API is responding slowly: {{ $value }}s"

      # Database connection issues
      - alert: DatabaseConnectionsHigh
        expr: db_connections_active > 80
        for: 1m
        labels:
          severity: warning
        annotations:
          summary: "High database connection count"
          description: "{{ $value }} active connections"

  - name: security
    interval: 1m
    rules:
      # Brute force attack
      - alert: HighAuthFailureRate
        expr: rate(auth_failures_total[5m]) > 10
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Possible brute force attack"
          description: "{{ $value }} failed auth attempts/sec from {{ $labels.ip }}"

      # Rate limit abuse
      - alert: RateLimitAbuse
        expr: rate(rate_limit_hits_total[5m]) > 50
        for: 3m
        labels:
          severity: warning
        annotations:
          summary: "Excessive rate limiting"
          description: "{{ $value }} rate limit hits/sec"

      # CSRF attacks
      - alert: CSRFAttackDetected
        expr: rate(csrf_failures_total[5m]) > 5
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Possible CSRF attack"
          description: "{{ $value }} CSRF failures/sec"

  - name: business
    interval: 1m
    rules:
      # Quote submission spike
      - alert: QuoteSubmissionSpike
        expr: rate(quotes_submitted_total[5m]) > 100
        for: 5m
        labels:
          severity: info
        annotations:
          summary: "High quote submission rate"
          description: "{{ $value }} quotes/sec - possible spam or marketing campaign"

      # Slow quote processing
      - alert: SlowQuoteProcessing
        expr: histogram_quantile(0.95, rate(quotes_processing_duration_seconds_bucket[5m])) > 5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Quote processing is slow"
          description: "95th percentile: {{ $value }}s"
```

### Step 4: Configure AlertManager

```yaml
# monitoring/alertmanager.yml
global:
  resolve_timeout: 5m
  slack_api_url: "YOUR_SLACK_WEBHOOK_URL"

route:
  group_by: ["alertname", "cluster", "service"]
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 12h
  receiver: "default"
  routes:
    - match:
        severity: critical
      receiver: "pagerduty-critical"
      continue: true

    - match:
        severity: warning
      receiver: "slack-warnings"

    - match:
        severity: info
      receiver: "email-info"

receivers:
  - name: "default"
    slack_configs:
      - channel: "#alerts"
        title: "{{ .GroupLabels.alertname }}"
        text: "{{ range .Alerts }}{{ .Annotations.description }}{{ end }}"

  - name: "pagerduty-critical"
    pagerduty_configs:
      - service_key: "YOUR_PAGERDUTY_SERVICE_KEY"
        description: "{{ .GroupLabels.alertname }}"

  - name: "slack-warnings"
    slack_configs:
      - channel: "#warnings"
        title: "⚠️ {{ .GroupLabels.alertname }}"
        text: "{{ range .Alerts }}{{ .Annotations.description }}{{ end }}"

  - name: "email-info"
    email_configs:
      - to: "team@yourcompany.com"
        from: "alerts@yourcompany.com"
        smarthost: "smtp.gmail.com:587"
        auth_username: "alerts@yourcompany.com"
        auth_password: "YOUR_EMAIL_PASSWORD"
```

### Step 5: Create Grafana Dashboard

```json
// monitoring/grafana/dashboards/api-dashboard.json
{
  "dashboard": {
    "title": "Electrical Supplier API Monitoring",
    "panels": [
      {
        "title": "Request Rate",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "{{ method }} {{ route }}"
          }
        ],
        "type": "graph"
      },
      {
        "title": "Error Rate",
        "targets": [
          {
            "expr": "rate(http_requests_total{status_code=~\"5..\"}[5m])",
            "legendFormat": "{{ status_code }}"
          }
        ],
        "type": "graph"
      },
      {
        "title": "Response Time (95th percentile)",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "{{ route }}"
          }
        ],
        "type": "graph"
      },
      {
        "title": "Authentication Failures",
        "targets": [
          {
            "expr": "rate(auth_failures_total[5m])",
            "legendFormat": "{{ ip }}"
          }
        ],
        "type": "graph"
      }
    ]
  }
}
```

### Start Monitoring Stack

```bash
# Start Prometheus + Grafana
docker-compose -f docker-compose.monitoring.yml up -d

# Access dashboards
# Prometheus: http://localhost:9090
# Grafana: http://localhost:3000 (admin / password from GRAFANA_ADMIN_PASSWORD env)
# AlertManager: http://localhost:9093
```

---

## Option 2: AWS CloudWatch (Cloud Native)

### Configure CloudWatch Agent

```bash
# Install CloudWatch Agent (EC2)
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i -E ./amazon-cloudwatch-agent.deb
```

```json
// /opt/aws/amazon-cloudwatch-agent/etc/config.json
{
  "agent": {
    "metrics_collection_interval": 60,
    "run_as_user": "cwagent"
  },
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/electrical-supplier/app.log",
            "log_group_name": "/aws/ec2/electrical-supplier",
            "log_stream_name": "{instance_id}/app.log",
            "timezone": "UTC"
          }
        ]
      }
    }
  },
  "metrics": {
    "namespace": "ElectricalSupplier",
    "metrics_collected": {
      "cpu": {
        "measurement": [
          {
            "name": "cpu_usage_idle",
            "rename": "CPU_IDLE",
            "unit": "Percent"
          }
        ],
        "totalcpu": false
      },
      "disk": {
        "measurement": [
          {
            "name": "used_percent",
            "rename": "DISK_USED",
            "unit": "Percent"
          }
        ],
        "resources": ["*"]
      },
      "mem": {
        "measurement": [
          {
            "name": "mem_used_percent",
            "rename": "MEM_USED",
            "unit": "Percent"
          }
        ]
      }
    }
  }
}
```

### Create CloudWatch Alarms (Terraform)

```hcl
# monitoring/cloudwatch-alarms.tf
resource "aws_cloudwatch_metric_alarm" "high_error_rate" {
  alarm_name          = "electrical-supplier-high-error-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "5XXError"
  namespace           = "AWS/ApplicationELB"
  period              = 300
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "Alert when 5XX errors exceed 10 in 5 minutes"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
  }
}

resource "aws_cloudwatch_metric_alarm" "high_cpu" {
  alarm_name          = "electrical-supplier-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "Alert when CPU exceeds 80%"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    InstanceId = aws_instance.app.id
  }
}

resource "aws_sns_topic" "alerts" {
  name = "electrical-supplier-alerts"
}

resource "aws_sns_topic_subscription" "email" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = "team@yourcompany.com"
}
```

---

## Option 3: DataDog (SaaS)

### Install DataDog Agent

```bash
DD_AGENT_MAJOR_VERSION=7 \
DD_API_KEY=YOUR_API_KEY \
DD_SITE="datadoghq.com" \
bash -c "$(curl -L https://s3.amazonaws.com/dd-agent/scripts/install_script.sh)"
```

### Configure DataDog Monitors (API)

```bash
# Create monitor via API
curl -X POST "https://api.datadoghq.com/api/v1/monitor" \
  -H "Content-Type: application/json" \
  -H "DD-API-KEY: ${DD_API_KEY}" \
  -H "DD-APPLICATION-KEY: ${DD_APP_KEY}" \
  -d '{
    "type": "metric alert",
    "query": "avg(last_5m):avg:system.cpu.user{service:electrical-supplier-api} > 80",
    "name": "High CPU Usage",
    "message": "@slack-alerts @pagerduty CPU usage is above 80%: {{value}}%",
    "tags": ["service:electrical-supplier-api", "env:production"],
    "priority": 2,
    "options": {
      "notify_no_data": true,
      "no_data_timeframe": 10
    }
  }'
```

---

## Uptime Monitoring

### Option 1: Self-Hosted (Uptime Kuma)

```bash
docker run -d --restart=always \
  -p 3001:3001 \
  -v uptime-kuma:/app/data \
  --name uptime-kuma \
  louislam/uptime-kuma:1
```

### Option 2: Cloud Services

- **Pingdom** - Global uptime monitoring
- **UptimeRobot** - Free tier available
- **StatusCake** - Advanced SSL monitoring
- **Better Uptime** - Status page + monitoring

---

## Health Check Endpoints

```typescript
// backend/src/routes/health.routes.ts
import { Router } from "express";
import { prisma } from "../config/db";
import { redis } from "../config/redis";

const router = Router();

// Basic health check
router.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Detailed health check (for monitoring systems)
router.get("/health/detailed", async (req, res) => {
  const health = {
    status: "ok",
    timestamp: new Date().toISOString(),
    services: {
      database: "unknown",
      redis: "unknown",
    },
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  };

  try {
    // Check database
    await prisma.$queryRaw`SELECT 1`;
    health.services.database = "ok";
  } catch (error) {
    health.services.database = "error";
    health.status = "degraded";
  }

  try {
    // Check Redis
    await redis.ping();
    health.services.redis = "ok";
  } catch (error) {
    health.services.redis = "error";
    health.status = "degraded";
  }

  const statusCode = health.status === "ok" ? 200 : 503;
  res.status(statusCode).json(health);
});

export default router;
```

---

## On-Call Rotation & Incident Response

### PagerDuty Integration

```yaml
# monitoring/alertmanager.yml (updated)
receivers:
  - name: "pagerduty-critical"
    pagerduty_configs:
      - service_key: "YOUR_PAGERDUTY_SERVICE_KEY"
        severity: "critical"
        description: "{{ .GroupLabels.alertname }}: {{ .CommonAnnotations.summary }}"
        details:
          firing: "{{ .Alerts.Firing | len }}"
          resolved: "{{ .Alerts.Resolved | len }}"
```

### Incident Response Runbook

```markdown
# Incident Response Playbook

## High Error Rate (5XX)

1. Check application logs: `tail -f /var/log/electrical-supplier/app.log`
2. Check database connectivity: `systemctl status postgresql`
3. Review recent deployments: `git log --since="1 hour ago"`
4. Rollback if needed: `git revert HEAD && npm run deploy`

## High CPU Usage

1. Check process list: `top -c`
2. Review slow queries: Check Prisma query logs
3. Scale horizontally if sustained

## Database Connection Pool Exhausted

1. Check active connections: `SELECT count(*) FROM pg_stat_activity;`
2. Restart application: `systemctl restart electrical-supplier-api`
3. Increase pool size if recurring

## Security Alert (Brute Force)

1. Identify attacking IP: Check auth logs
2. Block IP in WAF/firewall
3. Review account lockout policy
4. Notify security team
```

---

**Last Updated:** January 18, 2026  
**Maintained By:** DevOps & SRE Team
