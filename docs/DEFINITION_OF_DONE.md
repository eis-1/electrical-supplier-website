# Definition of Done (DoD)

This project has two different “done” meanings:

1. **Feature Done** = every agreed feature works end-to-end in a clean environment.
2. **Handover Ready / Fully Polished** = feature done **plus** production ops, docs, demo assets, and reliability gates.

> Why this file exists: without a written DoD, “100% done” is impossible to claim because the scope can keep expanding.

---

## A) Feature Done ✅ (Functional completion)

A feature is considered **done** only if all points below are true:

### Core flows

- Public can:
  - browse categories, brands, products
  - filter/search products
  - open product details
  - submit a quote request successfully
- Admin can:
  - login (including 2FA when enabled)
  - manage products (CRUD)
  - manage categories (CRUD)
  - manage brands (CRUD)
  - manage quote pipeline (list + status updates + internal notes if supported)
  - view audit logs (role-based)

### Non-functional “feature checks”

- Every flow above works with a fresh database after running migrations + seed.
- No UI pages are blocked by placeholders for required business content.
- External integrations are either:
  - properly configured, **or**
  - safely disabled with clear UI/admin messaging (not silently failing).

### Proof

- Each core flow is covered by at least one of:
  - automated integration tests (API)
  - Playwright E2E tests (UI)
  - written UAT checklist with screenshots

---

## B) Why it’s not 100% “Feature Done” by default (common blockers)

Even when most modules exist, a project is not “100% feature done” if any of these are true:

### 1) Scope is not frozen

If we don’t have a final, written list of features + acceptance criteria, new requirements (e.g., stock, pricing tiers, payment, CRM sync) can appear at any time.

### 2) Some features depend on configuration (not enabled out-of-the-box)

Examples in this repo:

- **Email notifications** are disabled unless SMTP env vars are real (not placeholders).
- **Map embed** shows a placeholder unless `VITE_GOOGLE_MAPS_EMBED_URL` is set.
- Malware scanning / advanced security features can be optional depending on environment.

These are “implemented” but not always “complete” until configured and verified end-to-end.

### 3) Some UI sections intentionally contain placeholders

Examples:

- Home page hero image / business image placeholders
- Contact page map placeholder (when env is missing)

If the business requirement is “real content everywhere”, placeholders mean “not done”.

### 4) Coverage may be strong but not exhaustive

Even with CI, contract tests, and E2E tests, we may not yet cover _every_ admin/public journey and edge case.

---

## C) Step-by-step path (recommended)

### Step 1 — Freeze scope

- Write the final feature list.
- Add acceptance criteria per feature (input, output, error cases).
- Lock the scope document: `docs/scope.md` (Phase 1 acceptance criteria).

### Step 2 — UAT checklist + demo script

- A 1-page checklist anyone can follow.
- Screenshot/recording guide.

### Step 3 — Close the gaps

- Replace placeholders with real assets/content or make them optional.
- Ensure integrations have clear “enabled/disabled” behavior.

### Step 4 — Prove it

- Add/extend E2E tests for the full user journeys.
- Run the full CI suite to validate.

---

## D) Fully Polished / Handover Ready ✅ (Production completion)

This is **Feature Done +**

- Docker/Deploy package (or VPS guide)
- Runbook + backups + monitoring basics
- Final OpenAPI + contract coverage
- Performance and load test tiers
- Security checklist + rotation procedures
- Demo dataset and showroom-ready pages
