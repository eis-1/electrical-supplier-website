# Asset requirements (mandatory)

You said these are **mandatory**, but the final materials are not available yet.

This repo therefore includes **clean, non-copyright placeholder SVGs** under `frontend/public/assets/`.
You can replace any file with a real `.webp/.jpg/.png` using the **same filename** (recommended), and the UI will automatically show the real asset.

---

## Required assets list

### Brand + SEO

- `frontend/public/favicon.ico` (optional but recommended)
- `frontend/public/og-image.png` (recommended) — 1200×630
- Company logo (recommended)
  - Suggested: `frontend/public/assets/logo.png` (or `.svg`)

### Home page

- Hero image: `frontend/public/assets/hero.(webp|jpg|png|svg)`
  - Recommended: 1200×900
  - Target size: ≤ 250KB
- Business image: `frontend/public/assets/business.(webp|jpg|png|svg)`
  - Recommended: 1200×900

### About page

- Shop photos:
  - `frontend/public/assets/shop-1.(webp|jpg|png|svg)`
  - `frontend/public/assets/shop-2.(webp|jpg|png|svg)`
  - `frontend/public/assets/shop-3.(webp|jpg|png|svg)`
  - Recommended: 1200×900 each (4:3 crop works well)

### Contact page

- Interactive Google map (mandatory):
  - Set `VITE_GOOGLE_MAPS_EMBED_URL` in `frontend/.env`
  - Until set, UI shows a clean placeholder map image: `frontend/public/assets/map-placeholder.svg`

---

## Content checklist (mandatory)

Populate these env vars in `frontend/.env`:

- `VITE_COMPANY_NAME`
- `VITE_COMPANY_PHONE`
- `VITE_COMPANY_EMAIL`
- `VITE_COMPANY_ADDRESS`
- `VITE_COMPANY_WHATSAPP`
- `VITE_COMPANY_EXPERIENCE`
- `VITE_GOOGLE_MAPS_EMBED_URL` (mandatory)

If you want a single shared source later, we can generate `frontend/.env` from the root `.env` or from a `config.json`.
