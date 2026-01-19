# Monitoring & Operations Runbook

## Overview

This runbook provides operational procedures for monitoring, alerting, and troubleshooting the Electrical Supplier B2B platform in production.

## Monitoring Stack

### Current Integrations

1. **Sentry** (Error Tracking & Performance)
   - Error reporting and stack traces
   - Performance transaction monitoring
   - Release tracking

2. **Structured Logging** (Pino)
   - JSON-formatted logs
   - Contextual metadata
   - Log levels: error, warn, info, debug

3. **Health Checks**
   - `/health` endpoint for backend
   - Database connectivity check
   - Redis connectivity check (if enabled)

## Key Metrics to Monitor

### Application Metrics

#### Backend (API)

- **Request Rate**: requests/second
- **Response Time**: p50, p95, p99 latency
- **Error Rate**: % of 5xx responses
- **Database Query Time**: slow queries > 1s
- **Queue Depth**: background job backlog (if applicable)

#### Frontend

- **Page Load Time**: First Contentful Paint (FCP)
- **Time to Interactive**: TTI
- **Bundle Size**: JS/CSS payload sizes
- **Error Rate**: client-side JavaScript errors

### Infrastructure Metrics

#### Server

- **CPU Usage**: target < 70% average
- **Memory Usage**: target < 80%
- **Disk Usage**: target < 85%
- **Network I/O**: bandwidth utilization

#### Database (PostgreSQL)

- **Connection Pool**: active/idle connections
- **Query Performance**: slow query log
- **Replication Lag**: if using replicas
- **Database Size**: growth rate

#### Redis (Cache/Rate Limiting)

- **Memory Usage**: current vs max memory
- **Hit Rate**: cache hit percentage
- **Eviction Rate**: keys evicted/second
- **Connection Count**: active connections

## Alerting Rules

### Critical Alerts (Page Immediately)

| Metric         | Threshold        | Action                                 |
| -------------- | ---------------- | -------------------------------------- |
| API Error Rate | > 5% for 5 min   | Check Sentry, review recent deploys    |
| Database Down  | Connection fails | Check DB health, restart if needed     |
| Disk Usage     | > 90%            | Free up space, expand volume           |
| Memory Usage   | > 95% for 5 min  | Check for memory leak, restart service |

### Warning Alerts (Investigate)

| Metric            | Threshold           | Action                          |
| ----------------- | ------------------- | ------------------------------- |
| API Response Time | p95 > 2s for 10 min | Check slow queries, review logs |
| Error Rate        | > 1% for 10 min     | Review Sentry errors            |
| CPU Usage         | > 80% for 15 min    | Check resource-heavy processes  |
| Redis Memory      | > 80%               | Review cache eviction policy    |

## Health Check Endpoints

### Backend Health

```bash
curl http://localhost:5000/health
```

**Expected Response:**

```json
{
  "status": "ok",
  "timestamp": "2026-01-19T10:30:00.000Z",
  "uptime": 3600,
  "database": "connected",
  "redis": "connected"
}
```

### Frontend Health

```bash
curl http://localhost:80/health
```

## Log Management

### Log Locations

#### Development

- Backend: Console output (pretty-printed)
- Frontend: Browser console

#### Production (Docker)

```bash
# Backend logs
docker logs -f electrical-supplier-backend --tail 100

# Frontend (Nginx) logs
docker logs -f electrical-supplier-frontend --tail 100

# Database logs
docker logs -f electrical-supplier-db --tail 100
```

#### Production (Cloud)

- **AWS**: CloudWatch Logs
- **Google Cloud**: Cloud Logging
- **Azure**: Application Insights

### Log Levels

- **error**: Critical errors requiring immediate attention
- **warn**: Potential issues that don't affect functionality
- **info**: General informational messages (startup, shutdown, config)
- **debug**: Detailed debugging information (disabled in production)

### Log Queries (Common Issues)

#### Authentication Failures

```bash
# Docker
docker logs electrical-supplier-backend | grep "Authentication failed"

# JSON logs (if shipped to log aggregator)
level: "error" AND msg: "Authentication failed"
```

#### Slow Queries

```bash
# Look for query duration > 1000ms
docker logs electrical-supplier-backend | grep "Query duration"
```

#### Rate Limit Hits

```bash
docker logs electrical-supplier-backend | grep "Rate limit exceeded"
```

## Incident Response

### Severity Levels

- **SEV-1 (Critical)**: Complete service outage, data loss
- **SEV-2 (High)**: Major feature broken, high error rate
- **SEV-3 (Medium)**: Minor feature broken, degraded performance
- **SEV-4 (Low)**: Cosmetic issue, minimal user impact

### Response Procedures

#### SEV-1: Service Down

1. **Verify Outage**

   ```bash
   curl -I https://yourdomain.com/health
   ```

2. **Check Backend Health**

   ```bash
   docker ps  # Check container status
   docker logs electrical-supplier-backend --tail 50
   ```

3. **Check Dependencies**
   - Database: `docker logs electrical-supplier-db --tail 20`
   - Redis: `docker logs electrical-supplier-redis --tail 20`

4. **Restart Services** (if needed)

   ```bash
   docker-compose restart backend
   # Or full restart:
   docker-compose down && docker-compose up -d
   ```

5. **Update Status Page** (if you have one)

6. **Post-Incident Review** (within 24 hours)

#### SEV-2: High Error Rate

1. **Check Sentry Dashboard**
   - Recent errors
   - Affected routes/endpoints

2. **Review Recent Deployments**

   ```bash
   git log --oneline -10  # Last 10 commits
   ```

3. **Consider Rollback** (if recent deploy)

   ```bash
   git checkout <previous-stable-commit>
   docker-compose up -d --build
   ```

4. **Monitor Error Rate** (should drop after fix/rollback)

#### SEV-3: Performance Degradation

1. **Check Resource Usage**

   ```bash
   docker stats
   ```

2. **Review Slow Query Logs**

   ```bash
   docker logs electrical-supplier-backend | grep "Query duration" | tail -50
   ```

3. **Check External Dependencies**
   - S3/R2 latency
   - Email service (SMTP)
   - VirusTotal API

4. **Scale Up** (if resource-bound)

### Common Issues & Solutions

#### Issue: Backend Won't Start

**Symptoms**: Container exits immediately or health check fails

**Debugging**:

```bash
docker logs electrical-supplier-backend
```

**Common Causes**:

- Missing environment variables
- Database connection failure
- Port already in use

**Solutions**:

- Verify `.env` file is present and complete
- Check database is running: `docker ps | grep postgres`
- Check port availability: `netstat -ano | findstr :5000` (Windows)

#### Issue: High Memory Usage

**Symptoms**: Container using > 1GB memory

**Debugging**:

```bash
docker stats electrical-supplier-backend
```

**Common Causes**:

- Memory leak in application code
- Large file uploads held in memory
- Prisma query result caching

**Solutions**:

- Restart container: `docker-compose restart backend`
- Review recent code changes for leaks
- Limit upload file sizes
- Add memory limit: `mem_limit: 1g` in docker-compose.yml

#### Issue: Database Connection Pool Exhausted

**Symptoms**: "Too many connections" errors

**Debugging**:

```bash
# Check Prisma connection pool
docker logs electrical-supplier-backend | grep "connection"
```

**Solutions**:

- Increase pool size in `db.ts`
- Check for connection leaks (unclosed transactions)
- Scale up database connections limit

#### Issue: File Uploads Failing

**Symptoms**: 413 Payload Too Large or 500 errors

**Debugging**:

- Check Nginx/reverse proxy upload limits
- Check disk space: `docker exec electrical-supplier-backend df -h`
- Review malware scan logs

**Solutions**:

- Increase `client_max_body_size` in nginx.conf
- Free up disk space
- Check S3/R2 credentials if using cloud storage

## Performance Optimization

### Database Optimization

1. **Add Indexes** for frequently queried fields
2. **Connection Pooling**: Tune `pool.max` and `pool.min`
3. **Query Optimization**: Use Prisma query logging
4. **Read Replicas**: Offload read queries

### Caching Strategy

1. **Redis Cache**: Enable for:
   - Product listings
   - Category trees
   - Brand data
2. **HTTP Cache Headers**: Set for static assets

3. **CDN**: Use CloudFlare/CloudFront for frontend

### Rate Limiting

Current limits (adjustable in `rateLimit.middleware.ts`):

- Authentication: 5 requests/15min per IP
- API General: 100 requests/15min per IP
- Quote Submission: 3 requests/hour per IP

## Maintenance Windows

### Recommended Schedule

- **Database Backups**: Daily at 2 AM UTC
- **Security Updates**: Weekly (Sunday 3-5 AM UTC)
- **Major Releases**: Bi-weekly (Tuesday 10 PM UTC)

### Pre-Deployment Checklist

- [ ] Run full test suite locally
- [ ] Review Sentry for existing errors
- [ ] Create database backup
- [ ] Announce maintenance window (if user-facing changes)
- [ ] Deploy to staging first
- [ ] Monitor error rate for 30 minutes post-deploy
- [ ] Have rollback plan ready

### Rollback Procedure

```bash
# 1. Stop current version
docker-compose down

# 2. Checkout previous stable release
git checkout <previous-tag>

# 3. Rebuild and start
docker-compose up -d --build

# 4. Verify health
curl http://localhost:5000/health

# 5. Monitor logs
docker logs -f electrical-supplier-backend
```

## Disaster Recovery

### Backup Strategy

#### Database Backups

```bash
# Manual backup
docker exec electrical-supplier-db pg_dump -U electrical electrical_supplier > backup.sql

# Restore
docker exec -i electrical-supplier-db psql -U electrical electrical_supplier < backup.sql
```

**Automated Backups**: Configure daily backups to S3

#### File Uploads Backup

- **S3/R2**: Enable versioning and lifecycle policies
- **Local**: Daily backup to remote storage

### Data Recovery Procedures

1. **Recent Data Loss** (< 24 hours)
   - Restore from most recent daily backup
   - Replay application logs if available

2. **Older Data Loss**
   - Restore from point-in-time backup
   - Notify affected users

## Monitoring Checklist

### Daily

- [ ] Check error rate in Sentry
- [ ] Review critical alerts
- [ ] Spot-check API response times

### Weekly

- [ ] Review security audit results
- [ ] Check disk usage trends
- [ ] Review slow query logs
- [ ] Update dependencies (security patches)

### Monthly

- [ ] Performance baseline review
- [ ] Cost analysis (cloud resources)
- [ ] Incident retrospectives
- [ ] Load testing

## Contact & Escalation

### On-Call Rotation

- Primary: [Your Team Lead]
- Secondary: [Backend Engineer]
- Database Expert: [DBA Contact]

### External Vendors

- **Hosting Provider**: [Support contact]
- **Database**: [Managed DB support if applicable]
- **CDN**: CloudFlare support

## Additional Resources

- [Production Setup Guide](./PRODUCTION_SETUP.md)
- [Environment Configuration](./ENVIRONMENT_SETUP.md)
- [API Documentation](./API_DOCUMENTATION.md)
- [Security Checklist](../SECURITY_CHECKLIST.md)
