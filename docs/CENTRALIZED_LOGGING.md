# Centralized Logging & Monitoring Setup

## Overview

Production-grade logging architecture for the Electrical Supplier B2B platform with integration guides for popular log aggregation services.

---

## Architecture

```
Application Logs → Log Shipper → Log Aggregation → Monitoring & Alerting
    (JSON)       (Filebeat/     (ELK/DataDog/      (Dashboards/
                  Fluentd)       Splunk/Cloud)       Alerts)
```

---

## Step 1: Enable Structured JSON Logging

### Environment Configuration

```bash
# .env (Production)
NODE_ENV=production
LOG_FORMAT=json  # Enables structured JSON output
LOG_LEVEL=info   # Minimum log level (debug/info/warn/error)
```

### Usage in Application Code

```typescript
import { logger } from "./utils/logger";

// Simple logging
logger.info("Server started", { port: 5000 });

// Error logging with stack trace
try {
  // ... code
} catch (error) {
  logger.error("Database connection failed", error, {
    dbHost: "localhost",
    dbPort: 5432,
  });
}

// Request-scoped logging (preserves context across logs)
import { RequestLogger } from "./utils/logger";

app.use((req, res, next) => {
  const traceId = req.headers["x-trace-id"] || crypto.randomUUID();
  const requestLogger = logger.child({
    traceId,
    path: req.path,
    method: req.method,
    ip: req.ip,
  });

  req.logger = requestLogger; // Attach to request
  next();
});

// Later in route handlers
req.logger.info("Processing quote submission", { quoteId: "123" });
// Output: {"timestamp":"2026-01-18T12:00:00.000Z","level":"INFO","message":"Processing quote submission","traceId":"abc-123","path":"/api/v1/quotes","method":"POST","ip":"1.2.3.4","quoteId":"123"}
```

---

## Option 1: ELK Stack (Elasticsearch, Logstash, Kibana)

### Prerequisites

```bash
# Install Docker Compose
sudo apt install docker-compose

# Create logging directory
mkdir -p ~/elk-stack && cd ~/elk-stack
```

### Docker Compose Configuration

```yaml
# docker-compose.yml
version: "3.8"

services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
    container_name: elasticsearch
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
      - xpack.security.enabled=false
    ports:
      - "9200:9200"
    volumes:
      - esdata:/usr/share/elasticsearch/data
    networks:
      - elk

  logstash:
    image: docker.elastic.co/logstash/logstash:8.11.0
    container_name: logstash
    ports:
      - "5044:5044"
      - "9600:9600"
    volumes:
      - ./logstash/pipeline:/usr/share/logstash/pipeline
      - ./logstash/config:/usr/share/logstash/config
    networks:
      - elk
    depends_on:
      - elasticsearch

  kibana:
    image: docker.elastic.co/kibana/kibana:8.11.0
    container_name: kibana
    ports:
      - "5601:5601"
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    networks:
      - elk
    depends_on:
      - elasticsearch

  filebeat:
    image: docker.elastic.co/beats/filebeat:8.11.0
    container_name: filebeat
    user: root
    volumes:
      - ./filebeat/filebeat.yml:/usr/share/filebeat/filebeat.yml:ro
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - /var/log:/var/log:ro
    networks:
      - elk
    depends_on:
      - logstash

networks:
  elk:
    driver: bridge

volumes:
  esdata:
    driver: local
```

### Logstash Pipeline Configuration

```ruby
# logstash/pipeline/logstash.conf
input {
  beats {
    port => 5044
  }
}

filter {
  # Parse JSON logs
  json {
    source => "message"
  }

  # Add geolocation for IP addresses
  if [ip] {
    geoip {
      source => "ip"
      target => "geoip"
    }
  }

  # Parse timestamps
  date {
    match => ["timestamp", "ISO8601"]
    target => "@timestamp"
  }

  # Tag security events
  if [level] == "SECURITY" {
    mutate {
      add_tag => ["security"]
    }
  }

  # Tag errors
  if [level] == "ERROR" {
    mutate {
      add_tag => ["error"]
    }
  }
}

output {
  elasticsearch {
    hosts => ["http://elasticsearch:9200"]
    index => "electrical-supplier-%{+YYYY.MM.dd}"
  }

  # Optional: Output to stdout for debugging
  stdout {
    codec => rubydebug
  }
}
```

### Filebeat Configuration

```yaml
# filebeat/filebeat.yml
filebeat.inputs:
  - type: log
    enabled: true
    paths:
      - /var/log/electrical-supplier/*.log
      - /var/log/electrical-supplier/**/*.log
    json.keys_under_root: true
    json.add_error_key: true
    fields:
      service: electrical-supplier-api
    fields_under_root: true

  # Docker container logs (if running in containers)
  - type: container
    paths:
      - "/var/lib/docker/containers/*/*.log"
    processors:
      - add_docker_metadata: ~

output.logstash:
  hosts: ["logstash:5044"]

logging.level: info
logging.to_files: true
logging.files:
  path: /var/log/filebeat
  name: filebeat
  keepfiles: 7
  permissions: 0644
```

### Start ELK Stack

```bash
# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f filebeat

# Access Kibana: http://localhost:5601
```

### Kibana Dashboard Setup

1. Open Kibana: `http://localhost:5601`
2. Create Index Pattern:
   - Management → Stack Management → Index Patterns
   - Pattern: `electrical-supplier-*`
   - Time field: `@timestamp`
3. Import dashboard template (see below)

---

## Option 2: DataDog

### Installation

```bash
# Install DataDog Agent (Ubuntu)
DD_AGENT_MAJOR_VERSION=7 DD_API_KEY=<YOUR_API_KEY> DD_SITE="datadoghq.com" bash -c "$(curl -L https://s3.amazonaws.com/dd-agent/scripts/install_script.sh)"
```

### Application Configuration

```typescript
// backend/src/utils/datadog.ts
import tracer from "dd-trace";

// Initialize DataDog APM (Application Performance Monitoring)
tracer.init({
  service: "electrical-supplier-api",
  env: process.env.NODE_ENV,
  version: process.env.npm_package_version,
  logInjection: true, // Inject trace IDs into logs
});

export default tracer;
```

```typescript
// backend/src/server.ts
import "./utils/datadog"; // Import FIRST (before other imports)
import express from "express";
// ... rest of imports
```

### DataDog Agent Configuration

```yaml
# /etc/datadog-agent/conf.d/nodejs.d/conf.yaml
logs:
  - type: file
    path: /var/log/electrical-supplier/*.log
    service: electrical-supplier-api
    source: nodejs
    sourcecategory: sourcecode
    tags:
      - env:production
      - team:backend

# Enable log collection
# /etc/datadog-agent/datadog.yaml
logs_enabled: true
```

### Custom Metrics

```typescript
import { logger } from "./utils/logger";

// Log custom metrics
logger.metric("quote.submitted", 1, {
  category: "electrical",
  source: "web",
});

logger.metric("api.response_time", 234, {
  endpoint: "/api/v1/products",
  method: "GET",
  status: 200,
});
```

---

## Option 3: Splunk

### Splunk Forwarder Configuration

```bash
# Install Splunk Universal Forwarder
wget -O splunkforwarder.tgz 'https://www.splunk.com/bin/splunk/DownloadActivityServlet?architecture=x86_64&platform=linux&version=9.1.2&product=universalforwarder&filename=splunkforwarder-9.1.2-linux-x86_64.tgz'
tar -xvzf splunkforwarder.tgz -C /opt
cd /opt/splunkforwarder

# Start forwarder
./bin/splunk start --accept-license

# Configure log monitoring
./bin/splunk add monitor /var/log/electrical-supplier/*.log -index main -sourcetype _json

# Set forwarding server
./bin/splunk add forward-server splunk.yourcompany.com:9997
```

### Splunk Query Examples

```spl
# Security events in last 24 hours
index=main sourcetype=_json level=SECURITY earliest=-24h
| stats count by type, action
| sort -count

# Failed login attempts
index=main level=SECURITY action="login_failed"
| stats count by details.reason, ip
| where count > 5

# API error rate
index=main level=ERROR
| timechart span=5m count by path

# Slow requests (> 1 second)
index=main metric="api.response_time" value>1000
| stats avg(value) as avg_ms, max(value) as max_ms by path
| sort -avg_ms
```

---

## Option 4: Cloud-Native Solutions

### AWS CloudWatch Logs

```typescript
// backend/src/utils/cloudwatch-logger.ts
import {
  CloudWatchLogsClient,
  PutLogEventsCommand,
} from "@aws-sdk/client-cloudwatch-logs";

const client = new CloudWatchLogsClient({ region: "us-east-1" });

export async function sendToCloudWatch(
  logGroup: string,
  logStream: string,
  message: any
) {
  const command = new PutLogEventsCommand({
    logGroupName: logGroup,
    logStreamName: logStream,
    logEvents: [
      {
        message: JSON.stringify(message),
        timestamp: Date.now(),
      },
    ],
  });

  await client.send(command);
}
```

### Azure Monitor

```bash
# Install Azure Monitor Agent
wget https://aka.ms/dependencyagentlinux -O InstallDependencyAgent-Linux64.bin
sudo sh InstallDependencyAgent-Linux64.bin -s
```

### Google Cloud Logging

```typescript
// backend/src/utils/gcp-logger.ts
import { Logging } from "@google-cloud/logging";

const logging = new Logging({ projectId: "your-project-id" });
const log = logging.log("electrical-supplier-api");

export function logToGCP(severity: string, message: string, metadata: any) {
  const entry = log.entry(
    { resource: { type: "global" }, severity },
    { message, ...metadata }
  );
  log.write(entry);
}
```

---

## Alerting & Monitoring

### Alert Rules (ELK Example - Watcher)

```json
{
  "trigger": {
    "schedule": {
      "interval": "5m"
    }
  },
  "input": {
    "search": {
      "request": {
        "indices": ["electrical-supplier-*"],
        "body": {
          "query": {
            "bool": {
              "must": [
                { "match": { "level": "ERROR" } },
                { "range": { "@timestamp": { "gte": "now-5m" } } }
              ]
            }
          }
        }
      }
    }
  },
  "condition": {
    "compare": {
      "ctx.payload.hits.total": {
        "gt": 10
      }
    }
  },
  "actions": {
    "email_admin": {
      "email": {
        "to": "admin@yourcompany.com",
        "subject": "High Error Rate Detected",
        "body": "{{ctx.payload.hits.total}} errors in last 5 minutes"
      }
    }
  }
}
```

### DataDog Monitors

```yaml
# Create monitor via API
curl -X POST "https://api.datadoghq.com/api/v1/monitor" \
  -H "Content-Type: application/json" \
  -H "DD-API-KEY: ${DD_API_KEY}" \
  -H "DD-APPLICATION-KEY: ${DD_APP_KEY}" \
  -d '{
    "type": "log alert",
    "query": "logs(\"service:electrical-supplier-api status:error\").rollup(\"count\").last(\"5m\") > 10",
    "name": "High Error Rate",
    "message": "Error rate is above threshold. @slack-alerts",
    "tags": ["service:electrical-supplier-api", "env:production"],
    "priority": 2
  }'
```

---

## Log Rotation (If not using log shipper)

```bash
# /etc/logrotate.d/electrical-supplier
/var/log/electrical-supplier/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        systemctl reload electrical-supplier-api
    endscript
}
```

---

## Performance Optimization

### Async Logging (High-Traffic Scenarios)

```typescript
// backend/src/utils/async-logger.ts
import { Worker } from "worker_threads";

class AsyncLogger {
  private worker: Worker;

  constructor() {
    this.worker = new Worker("./log-worker.js");
  }

  log(logEntry: any): void {
    this.worker.postMessage(logEntry); // Non-blocking
  }
}
```

### Sampling (Reduce Log Volume)

```typescript
// Log only 10% of successful requests
if (Math.random() < 0.1 || res.statusCode >= 400) {
  logger.info("Request completed", {
    path: req.path,
    status: res.statusCode,
    duration: Date.now() - startTime,
  });
}
```

---

## Security Best Practices

- ✅ **Never log sensitive data**: passwords, tokens, credit cards, PII
- ✅ **Redact sensitive fields**: use log scrubbing/masking
- ✅ **Encrypt logs in transit**: TLS for log shipping
- ✅ **Encrypt logs at rest**: in log storage
- ✅ **Access control**: RBAC for log viewing
- ✅ **Retention policy**: 90 days hot, 1 year cold, then delete

---

**Last Updated:** January 18, 2026  
**Maintained By:** DevOps Team
