# Security hardening summary (archived)

This document previously summarized security hardening activities and included example secret values.
It has been minimized to avoid leaking sensitive information.

See instead:

- `SECURITY.md`
- `SECURITY_CHECKLIST.md`
- `PRODUCTION_SETUP.md`
- `SECURITY_REVIEW.md`

## Minimal checklist

- `.env` is not committed; only `.env.example` templates exist in the repo
- Secrets are generated per environment and stored in a secrets manager or runtime environment
- Production uses HTTPS and secure cookie flags
- Monitoring/alerting is configured for auth and error rates
