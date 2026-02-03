# Security hardening notes (archived)

This file previously contained a detailed hardening log and example secret/password values.
To reduce the risk of leaking sensitive information, the detailed report has been replaced with this short pointer.

Use these canonical documents instead:

- `SECURITY.md`
- `SECURITY_CHECKLIST.md`
- `PRODUCTION_SETUP.md`
- `docs/SECURITY_REVIEW.md`

## What to verify

- `.env` files are not tracked by Git (only `.env.example` templates are committed)
- Secrets are generated per environment and stored outside the repository
- HTTPS and secure cookie flags are enabled in production
- Rate limiting and security headers are enabled

## How to validate

- Run backend tests: see `backend/tests/README.md`
- Run end-to-end checks: see `TESTING.md`
