# Quote Request Security Features

**Status:** Implemented controls overview (verify in your environment)

---

## Executive Summary

The quote request system uses multiple layers of protection to reduce spam, abuse, and automated submissions. Controls and thresholds should be validated and tuned for your environment and traffic patterns.

---

## Security Layers Overview

### 5-Layer Defense System

```
┌─────────────────────────────────────────┐
│  Layer 1: Rate Limiting (IP-based)     │  ← Blocks rapid submissions
├─────────────────────────────────────────┤
│  Layer 2: Honeypot Detection           │  ← Catches simple bots
├─────────────────────────────────────────┤
│  Layer 3: Timing Analysis               │  ← Detects automated forms
├─────────────────────────────────────────┤
│  Layer 4: Duplicate Detection           │  ← Prevents repeated submissions
├─────────────────────────────────────────┤
│  Layer 5: Daily Email Limit             │  ← Caps per-email submissions
└─────────────────────────────────────────┘
```

---

## Layer 1: Rate Limiting (IP-Based)

### Configuration

**File:** `backend/src/middlewares/rateLimit.middleware.ts`

```typescript
quoteLimiterInstance = rateLimit({
  windowMs: 3600000, // 1 hour
  max: 5, // 5 requests per hour
  message: "Too many quote submissions. Please try again later",
});
```

### How It Works

- Tracks requests **by IP address**
- Limits to **5 quote submissions per hour** per IP
- Uses Redis for distributed rate limiting (or in-memory fallback)
- Returns `HTTP 429` (Too Many Requests) when limit exceeded

### Protection Against

- Automated bot attacks
- Script-based spamming
- Distributed attacks from the same IP
- Accidental form resubmissions

### Environment Variables

```env
QUOTE_RATE_LIMIT_WINDOW_MS=3600000    # 1 hour
QUOTE_RATE_LIMIT_MAX_REQUESTS=5        # 5 requests max
```

---

## Layer 2: Honeypot Field

### Configuration

**File:** `backend/src/middlewares/quoteSpam.middleware.ts`

```typescript
const honeypot = req.body?.honeypot || "";
if (honeypot.trim().length > 0) {
  logger.security({
    type: "quote",
    action: "spam_blocked_honeypot",
    ip: req.ip,
  });
  return ApiResponse.badRequest(res, "Invalid request");
}
```

### How It Works

- Frontend includes a **hidden field** (`honeypot`) styled with CSS to be invisible
- Human users never see or fill this field
- Bots that auto-fill forms will populate it
- If filled, request is **instantly rejected**

### Frontend Implementation

```tsx
// Quote.tsx
<input
  type="text"
  name="honeypot"
  className={styles.honeypot} // position: absolute; left: -10000px
  value={honeypot}
  onChange={(e) => setHoneypot(e.target.value)}
  tabIndex={-1}
  autoComplete="off"
/>
```

### Protection Against

- Simple spam bots
- Form auto-fill scripts
- Web scrapers with auto-submit
- Low-sophistication attacks

---

## Layer 3: Timing Analysis

### Configuration

**File:** `backend/src/middlewares/quoteSpam.middleware.ts`

```typescript
const formStartTs = req.body?.formStartTs;
const elapsedMs = Date.now() - formStartTs;

// Too fast (< 1.5 seconds)
if (elapsedMs >= 0 && elapsedMs < 1500) {
  logger.security({
    type: "quote",
    action: "spam_blocked_too_fast",
    ip: req.ip,
    details: { elapsedMs },
  });
  return ApiResponse.badRequest(res, "Invalid request");
}

// Too old (> 1 hour)
if (elapsedMs > 60 * 60 * 1000) {
  logger.security({
    type: "quote",
    action: "spam_blocked_stale",
    ip: req.ip,
  });
  return ApiResponse.badRequest(res, "Invalid request");
}
```

### How It Works

- Form includes hidden timestamp when page loads
- Backend calculates time between form load and submission
- **Rejects if < 1.5 seconds** (too fast = bot)
- **Rejects if > 1 hour** (stale/replayed request)

### Protection Against

- Automated form submissions
- Headless browser attacks
- Pre-filled form spam
- Replay attacks (reusing old requests)

---

## Layer 4: Duplicate Detection

### Configuration

**File:** `backend/src/modules/quote/service.ts`

```typescript
// Anti-spam: deduplicate rapid repeated submissions
if (data.email && data.phone) {
  const since = new Date(Date.now() - env.QUOTE_DEDUP_WINDOW_MS);
  const recent = await this.repository.findRecentDuplicate({
    email: data.email,
    phone: data.phone,
    since,
  });

  if (recent) {
    logger.security({
      type: "quote",
      action: "spam_blocked_duplicate",
      ip: data.ipAddress,
      details: { email: data.email },
    });
    throw new AppError(
      429,
      "We already received your request. Please wait for our response.",
    );
  }
}
```

### How It Works

- Checks if **same email + phone** submitted recently
- Default window: **10 minutes**
- Prevents accidental double-clicks
- Prevents intentional spam from same user

### Database Query

```typescript
async findRecentDuplicate(params: {
  email: string;
  phone: string;
  since: Date;
}): Promise<QuoteRequest | null> {
  return prisma.quoteRequest.findFirst({
    where: {
      email,
      phone,
      createdAt: { gte: since },
    },
    orderBy: { createdAt: "desc" },
  });
}
```

### Protection Against

- Accidental double submissions
- Impatient users clicking multiple times
- Intentional spam from the same person
- Form submission errors causing retries

### Environment Variables

```env
QUOTE_DEDUP_WINDOW_MS=600000  # 10 minutes
```

---

## Layer 5: Daily Email Limit

### Configuration

**File:** `backend/src/modules/quote/service.ts`

```typescript
// Anti-spam: per-email daily cap
if (data.email) {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const countToday = await this.repository.countByEmailSince({
    email: data.email,
    since: startOfDay,
  });

  if (countToday >= env.QUOTE_MAX_PER_EMAIL_PER_DAY) {
    throw new AppError(
      429,
      "Too many quote submissions. Please try again later.",
    );
  }
}
```

### How It Works

- Counts **total submissions per email address per day**
- Default limit: **5 quotes per day**
- Resets at midnight (server time)
- Prevents email-based spam campaigns

### Database Query

```typescript
async countByEmailSince(params: {
  email: string;
  since: Date;
}): Promise<number> {
  return prisma.quoteRequest.count({
    where: {
      email,
      createdAt: { gte: since }
    }
  });
}
```

### Protection Against

- Email-based spam campaigns
- Single user submitting many quotes
- Automated scripts using the same email
- Resource exhaustion attacks

### Environment Variables

```env
QUOTE_MAX_PER_EMAIL_PER_DAY=5  # 5 quotes per email per day
```

---

## Additional Security Features

### 1. Input Validation

**File:** `backend/src/modules/quote/controller.ts`

```typescript
// Whitelist fields - prevents mass assignment attacks
const {
  name,
  company,
  phone,
  whatsapp,
  email,
  productName,
  quantity,
  projectDetails,
} = req.body;
```

**Protection:**

- Only whitelisted fields accepted
- Prevents mass assignment attacks
- Blocks unexpected database fields
- Type validation via TypeScript

### 2. IP Address Logging

```typescript
const ipAddress = req.ip || req.socket.remoteAddress;
const userAgent = req.headers["user-agent"];

const quoteData = {
  ...fields,
  ipAddress, // Logged for forensics
  userAgent, // Browser fingerprinting
};
```

**Benefits:**

- Track malicious actors
- Identify attack patterns
- Geographic analysis
- Security forensics

### 3. Security Event Logging

```typescript
logger.security({
  type: "quote",
  action: "spam_blocked_honeypot", // or duplicate, too_fast, stale
  ip: req.ip,
  userAgent: req.headers["user-agent"],
  details: { email, elapsedMs },
});
```

**Logged Events:**

- `spam_blocked_honeypot` - Bot filled hidden field
- `spam_blocked_too_fast` - Submission < 1.5 seconds
- `spam_blocked_stale` - Submission > 1 hour old
- `spam_blocked_duplicate` - Duplicate email+phone within 10 minutes

**Benefits:**

- Real-time attack monitoring
- Security audit trail
- Pattern analysis
- Incident response data

---

## Attack Scenarios & Defenses

### Scenario 1: Bot Spam Attack

**Attack:** Automated bot sends 100 quote requests per minute

**Defense:**

1. Rate limiter blocks after the configured threshold within the configured window
2. Honeypot rejects submissions that fill hidden fields
3. Timing checks reject submissions that are unrealistically fast
4. Security logs record the event for analysis

**Result:** Typically blocked by early layers

---

### Scenario 2: Manual Spam

**Attack:** Human manually submits 20 quotes in a row

**Defense:**

1. Rate limiter blocks after the configured threshold
2. Daily per-email limit caps repeated submissions
3. Duplicate detection reduces rapid repeated submissions
4. IP/user agent are logged for investigation and blocking decisions

**Result:** Typically blocked after repeated submissions

---

### Scenario 3: Distributed Attack

**Attack:** Multiple IPs submit spam using different emails

**Defense:**

1. Rate limiter limits each IP
2. Honeypot catches unsophisticated bots
3. Timing analysis detects automated submissions
4. Security logs help identify the pattern
5. Manual intervention may be needed (IP blocking, CAPTCHA/Turnstile)

**Result:** Often slowed and more detectable

---

### Scenario 4: Accidental Double-Click

**Attack:** (Not malicious) User accidentally submits twice

**Defense:**

1. Duplicate detection rejects the second submission within the configured window
2. User receives a clear message (for example: "We already received your request")
3. Logging policy can treat this as a UX event rather than a security alert

**Result:** Prevented with a user-friendly response

---

### Scenario 5: Old/Replayed Request

**Attack:** Attacker captures and replays old form submission

**Defense:**

1. Timing analysis rejects submissions older than the configured maximum
2. Timestamp validation helps prevent replay attempts
3. Security log records the attempt

**Result:** Typically blocked by timing checks

---

## Configuration Summary

### Current Settings (example defaults)

| Setting               | Default Value          | Purpose                       |
| --------------------- | ---------------------- | ----------------------------- |
| **Rate Limit Window** | 1 hour (3600000 ms)    | Time window for rate limiting |
| **Rate Limit Max**    | 5 requests             | Max quotes per IP per hour    |
| **Duplicate Window**  | 10 minutes (600000 ms) | Time to detect duplicates     |
| **Daily Email Limit** | 5 quotes               | Max quotes per email per day  |
| **Min Form Time**     | 1.5 seconds (1500 ms)  | Minimum time to fill form     |
| **Max Form Time**     | 1 hour (3600000 ms)    | Maximum form age              |

### Recommended for Higher Security

```env
# Stricter rate limiting
QUOTE_RATE_LIMIT_WINDOW_MS=3600000    # Keep at 1 hour
QUOTE_RATE_LIMIT_MAX_REQUESTS=3        # Reduce to 3 (from 5)

# Tighter duplicate detection
QUOTE_DEDUP_WINDOW_MS=1800000          # Increase to 30 minutes (from 10)

# Lower daily limit
QUOTE_MAX_PER_EMAIL_PER_DAY=3          # Reduce to 3 (from 5)
```

### Recommended for High-Volume Business

```env
# More lenient for legitimate users
QUOTE_RATE_LIMIT_WINDOW_MS=3600000    # Keep at 1 hour
QUOTE_RATE_LIMIT_MAX_REQUESTS=10       # Increase to 10 (from 5)

# Keep duplicate detection
QUOTE_DEDUP_WINDOW_MS=600000           # Keep at 10 minutes

# Higher daily limit
QUOTE_MAX_PER_EMAIL_PER_DAY=10         # Increase to 10 (from 5)
```

---

## Monitoring & Alerts

### Security Logs

All spam attempts are logged with:

- Timestamp
- IP address
- User agent
- Spam detection reason
- Email (if provided)

### Log Location

- **Production:** Sentry (error tracking)
- **Development:** Console + file logs
- **Format:** Structured JSON

### Example Log

```json
{
  "level": "WARN",
  "time": "2026-02-03T10:30:00Z",
  "service": "electrical-supplier-api",
  "logType": "security",
  "type": "quote",
  "action": "spam_blocked_too_fast",
  "ip": "192.168.1.100",
  "userAgent": "Mozilla/5.0...",
  "details": {
    "elapsedMs": 500,
    "threshold": 1500
  }
}
```

### Recommended Monitoring

1. **Alert on spike** in `spam_blocked_*` events (>10/min)
2. **Dashboard** showing spam attempts per hour
3. **IP blacklist** for repeat offenders (manual or automated)
4. **Geographic analysis** to detect attack origins

---

## Optional Enhancements (Future)

### 1. CAPTCHA Integration

**Status:** Infrastructure ready, not activated

**Options:**

- Cloudflare Turnstile (recommended - privacy-friendly)
- hCaptcha (GDPR compliant)
- reCAPTCHA v3 (invisible)

**Implementation:**

```typescript
// Already prepared in quoteSpam.middleware.ts
// Just needs CAPTCHA_SECRET_KEY in .env
```

### 2. IP Reputation Check

**Services:**

- Project Honey Pot
- StopForumSpam API
- IP Quality Score

**Benefit:** Block known spam IPs before they submit

### 3. Email Verification

**Option:** Require email confirmation before quote is visible to admin

**Benefit:** Prevents fake/spam emails

### 4. Geographic Blocking

**Option:** Block submissions from specific countries

**Use Case:** If attacks come from specific regions

### 5. Machine Learning

**Advanced:** Train model to detect spam patterns

**Features:**

- Text analysis (project details, product name)
- Submission patterns
- Anomaly detection

---

## Testing

### Unit Tests

**File:** `backend/tests/unit/quote.service.test.ts`

```typescript
describe("Anti-Spam Features", () => {
  it("enforces daily email limit", async () => {
    // Test that 6th submission is rejected
  });

  it("detects duplicate submissions", async () => {
    // Test duplicate detection within 10 min window
  });
});
```

### Integration Tests

**File:** `backend/tests/api.test.js`

```typescript
describe("Quote Requests", () => {
  it("should rate limit quote submissions", async () => {
    // Submit 6 quotes rapidly
    // Expect 6th to return 429
  });
});
```

### Manual Testing

1. Submit 5 quotes rapidly → 6th should fail
2. Submit same email/phone twice → 2nd should fail
3. Submit with honeypot filled → Should fail
4. Submit instantly after page load → Should fail

---

## FAQ

### Q: Can legitimate users be blocked?

**A:** Very unlikely. Limits are generous:

- 5 quotes per hour per IP
- 5 quotes per day per email
- 10 minutes between duplicates

**Workaround:** Wait 10 minutes or use different email

### Q: What if user shares IP (corporate network)?

**A:** Rate limit is per IP, so corporate users share the quota. Increase `QUOTE_RATE_LIMIT_MAX_REQUESTS` if needed.

### Q: How to unblock an IP?

**A:**

1. Restart Redis (clears all rate limits)
2. Or wait for window to expire (1 hour default)
3. Or manually delete Redis key: `rl:quote:<ip>`

### Q: Are security logs GDPR compliant?

**A:** Email addresses are logged for security purposes (legitimate interest). Consider:

- Retention policy (30-90 days)
- Pseudonymization (hash emails in logs)
- Privacy policy disclosure

### Q: What if legitimate quote is blocked?

**A:** User sees clear message. Admin can:

1. Manually create quote from backend
2. Whitelist user's IP temporarily
3. Adjust rate limits if too strict

---

## Conclusion

The quote request system is protected against common spam and automated submission patterns using a layered approach:

1. **Rate limiting** - IP-based request throttling
2. **Honeypot** - bot detection via hidden field
3. **Timing analysis** - automated submission detection
4. **Duplicate detection** - prevents repeated submissions
5. **Daily limits** - email-based quotas

### Operational notes

- Ensure logging and alerting are enabled in the deployment environment.
- Re-validate these controls after major changes to the quote flow, rate limits, or email delivery configuration.
