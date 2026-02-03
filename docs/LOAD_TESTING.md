# Load Testing Guide

## Overview

This guide provides instructions for load testing the Electrical Supplier API to validate performance under stress.

## Tools

### Recommended: k6 (Grafana k6)

[k6](https://k6.io/) is a modern load testing tool with excellent developer experience.

**Installation:**

```bash
# Windows (via Chocolatey)
choco install k6

# macOS
brew install k6

# Linux
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

## Test Scenarios

### Scenario 1: API Health Check (Smoke Test)

**File: `load-tests/01-smoke-test.js`**

```javascript
import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  vus: 10, // 10 virtual users
  duration: "30s",
  thresholds: {
    http_req_duration: ["p(95)<500"], // 95% of requests < 500ms
    http_req_failed: ["rate<0.01"], // Less than 1% failure rate
  },
};

export default function () {
  const res = http.get("http://localhost:5000/health");

  check(res, {
    "status is 200": (r) => r.status === 200,
    "response time < 500ms": (r) => r.timings.duration < 500,
  });

  sleep(1);
}
```

**Run:**

```bash
k6 run load-tests/01-smoke-test.js
```

### Scenario 2: Product Listing (Read-Heavy)

**File: `load-tests/02-product-listing.js`**

```javascript
import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  stages: [
    { duration: "1m", target: 50 }, // Ramp up to 50 users
    { duration: "3m", target: 50 }, // Stay at 50 users
    { duration: "1m", target: 100 }, // Ramp to 100 users
    { duration: "2m", target: 100 }, // Stay at 100
    { duration: "1m", target: 0 }, // Ramp down
  ],
  thresholds: {
    http_req_duration: ["p(95)<2000"],
    http_req_failed: ["rate<0.05"],
  },
};

const BASE_URL = "http://localhost:5000";

export default function () {
  // Get all products
  const productsRes = http.get(`${BASE_URL}/api/products`);
  check(productsRes, {
    "products status 200": (r) => r.status === 200,
  });

  sleep(2);

  // Get categories
  const categoriesRes = http.get(`${BASE_URL}/api/categories`);
  check(categoriesRes, {
    "categories status 200": (r) => r.status === 200,
  });

  sleep(1);

  // Get brands
  const brandsRes = http.get(`${BASE_URL}/api/brands`);
  check(brandsRes, {
    "brands status 200": (r) => r.status === 200,
  });

  sleep(3);
}
```

**Run:**

```bash
k6 run load-tests/02-product-listing.js
```

### Scenario 3: Authentication Flow

**File: `load-tests/03-auth-flow.js`**

```javascript
import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  vus: 20,
  duration: "2m",
  thresholds: {
    http_req_duration: ["p(95)<3000"],
    http_req_failed: ["rate<0.1"], // 10% tolerance for auth failures (rate limiting)
  },
};

const BASE_URL = "http://localhost:5000";

export default function () {
  const loginPayload = JSON.stringify({
    email: "<ADMIN_EMAIL>",
    // Set this in your environment when running k6:
    //   SEED_ADMIN_PASSWORD="..."
    password: __ENV.SEED_ADMIN_PASSWORD || "<YOUR_ADMIN_PASSWORD>",
  });

  const params = {
    headers: {
      "Content-Type": "application/json",
    },
  };

  const loginRes = http.post(
    `${BASE_URL}/api/v1/auth/login`,
    loginPayload,
    params,
  );

  check(loginRes, {
    "login status 200 or 401": (r) => r.status === 200 || r.status === 401,
    "login response time < 3s": (r) => r.timings.duration < 3000,
  });

  sleep(5); // Respect rate limits
}
```

**Run:**

```bash
k6 run load-tests/03-auth-flow.js
```

### Scenario 4: Quote Submission (Write-Heavy)

**File: `load-tests/04-quote-submission.js`**

```javascript
import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  vus: 10,
  duration: "3m",
  thresholds: {
    http_req_duration: ["p(95)<5000"],
    http_req_failed: ["rate<0.2"], // Higher tolerance due to rate limiting
  },
};

const BASE_URL = "http://localhost:5000";

export default function () {
  const quotePayload = JSON.stringify({
    name: `Load Test User ${__VU}`,
    email: `loadtest${__VU}_${Date.now()}@example.com`,
    phone: "+1234567890",
    company: "Load Test Co",
    message: "This is a load test quote request",
    productIds: [1, 2, 3],
  });

  const params = {
    headers: {
      "Content-Type": "application/json",
    },
  };

  const quoteRes = http.post(`${BASE_URL}/api/quotes`, quotePayload, params);

  check(quoteRes, {
    "quote submitted or rate limited": (r) =>
      [200, 201, 429].includes(r.status),
    "response time < 5s": (r) => r.timings.duration < 5000,
  });

  sleep(60); // 1 minute between quote submissions (respect rate limit: 3/hour)
}
```

**Run:**

```bash
k6 run load-tests/04-quote-submission.js
```

### Scenario 5: Spike Test

**File: `load-tests/05-spike-test.js`**

```javascript
import http from "k6/http";
import { check } from "k6";

export const options = {
  stages: [
    { duration: "10s", target: 10 }, // Warm up
    { duration: "1m", target: 10 }, // Steady state
    { duration: "10s", target: 200 }, // Spike!
    { duration: "30s", target: 200 }, // Hold spike
    { duration: "10s", target: 10 }, // Recover
    { duration: "30s", target: 10 }, // Steady recovery
  ],
  thresholds: {
    http_req_duration: ["p(95)<5000"],
    http_req_failed: ["rate<0.3"], // Allow some failures during spike
  },
};

export default function () {
  http.get("http://localhost:5000/api/products");
}
```

**Run:**

```bash
k6 run load-tests/05-spike-test.js
```

## Alternative: Artillery

If you prefer Artillery:

**Installation:**

```bash
npm install -g artillery
```

**Sample Config: `artillery.yml`**

```yaml
config:
  target: "http://localhost:5000"
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 120
      arrivalRate: 50
      name: "Load test"
  defaults:
    headers:
      Content-Type: "application/json"

scenarios:
  - name: "Product browsing"
    flow:
      - get:
          url: "/api/products"
      - think: 2
      - get:
          url: "/api/categories"
      - think: 3
      - get:
          url: "/api/brands"
```

**Run:**

```bash
artillery run artillery.yml
```

## Performance Baselines

### Example performance baselines (illustrative)

| Endpoint              | p50    | p95    | p99    | Requests/sec |
| --------------------- | ------ | ------ | ------ | ------------ |
| GET /health           | <50ms  | <100ms | <200ms | 1000+        |
| GET /api/products     | <200ms | <500ms | <1s    | 500+         |
| GET /api/products/:id | <100ms | <300ms | <500ms | 1000+        |
| POST /api/auth/login  | <500ms | <2s    | <3s    | 50+          |
| POST /api/quotes      | <1s    | <3s    | <5s    | 10+          |

**Note**: Treat these as rough reference points only. Actual performance will vary based on hardware, database size, caching, and network conditions.

## Interpreting Results

### Key Metrics

- **http_req_duration**: How long requests take (p50/p95/p99)
- **http_req_failed**: % of requests that failed (4xx/5xx)
- **http_reqs**: Total requests per second
- **vus**: Number of virtual users (concurrent)

### Good Indicators

- p95 response time remains within your chosen threshold
- Error rate remains low under normal load (for example, < 1%)
- System remains stable during a spike
- Recovery after a spike is quick (for example, under ~30s)

### Warning Signs

- p95 response time increases over time (possible leak, GC pressure, or resource exhaustion)
- Error rate increases materially under normal load (for example, > 5%)
- Slow recovery after a spike
- Database connection pool exhaustion

## Optimization Tips

### If Response Times are High

1. **Add Database Indexes**
   - Check Prisma query logs
   - Add indexes for frequently queried fields

2. **Enable Redis Caching**
   - Cache product listings
   - Cache category/brand data

3. **Optimize Queries**
   - Use `select` to limit returned fields
   - Add pagination to list endpoints

### If Error Rate is High

1. **Check Rate Limits**
   - Increase limits if too restrictive
   - Add more granular rate limiting

2. **Scale Database Connections**
   - Increase connection pool size
   - Add read replicas

3. **Add Circuit Breakers**
   - For external APIs (VirusTotal, email)

## Pre-Production Checklist

Before deploying to production:

- [ ] Run smoke test with 10 VUs for 5 minutes
- [ ] Run load test with expected peak traffic
- [ ] Run spike test to verify recovery
- [ ] Monitor database connection pool
- [ ] Monitor memory usage during load
- [ ] Verify rate limiting works correctly
- [ ] Check error logs for anomalies
- [ ] Test with production-like data volume

## Continuous Load Testing

### CI Integration

Add to `.github/workflows/performance.yml`:

```yaml
name: Performance Tests

on:
  schedule:
    - cron: "0 2 * * 1" # Weekly on Monday at 2 AM
  workflow_dispatch:

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install k6
        run: |
          sudo gpg -k
          sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6

      - name: Run load tests
        run: k6 run load-tests/01-smoke-test.js
```

## Resources

- [k6 Documentation](https://k6.io/docs/)
- [Artillery Documentation](https://artillery.io/docs/)
- [HTTP Load Testing Best Practices](https://k6.io/docs/testing-guides/load-testing/)
