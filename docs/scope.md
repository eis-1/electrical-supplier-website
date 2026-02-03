# Project Scope Document

## Electrical Supplier Website - B2B Lead Generation Platform

---

## Project Type

B2B Website (NOT E-Commerce)

---

## Primary Business Goal

Generate qualified quotation leads from electrical contractors, engineers, and procurement officers.

---

## Mandatory Pages (Phase 1)

1. **Home**
   - Hero section with value proposition
   - Trust indicators (4 items)
   - Product categories grid (3 columns)
   - Brand showcase
   - Why choose us section
   - CTA banner

2. **Products (Catalog)**
   - Filterable product listing
   - Category filter (left sidebar)
   - Brand filter (left sidebar)
   - Product cards with NO pricing
   - "Request Quote" button on each card

3. **Product Details**
   - Product image
   - Specifications
   - Brand and model info
   - Datasheet download (PDF)
   - Inquiry form

4. **Brands**
   - Authorized brand showcase
   - Static grid layout (no carousel)

5. **Request a Quote**
   - Lead generation form
   - Fields: Name, Company, Phone, Email, Product, Quantity, Details
   - Email notification to admin
   - WhatsApp notification
   - Success confirmation

6. **About Us**
   - Business overview
   - Market experience
   - Shop photos
   - Key facts (no marketing fluff)

7. **Contact**
   - Address, phone, email
   - WhatsApp contact
   - Office hours
   - Google Maps embed

8. **Admin Panel**
   - Product management (CRUD)
   - Category management
   - Brand management
   - Datasheet upload
   - View quote requests

---

## Optional Pages (Phase 2 - Future)

- Projects / Client showcase
- Certifications
- FAQ

---

## Explicit Feature Exclusions

### Never Implement:

- Shopping cart
- Public pricing display
- Online payment gateway
- User registration/login (except admin)
- Product reviews
- Wishlists
- Live chat
- Heavy animations/sliders
- Dark theme
- AI features
- Blockchain

---

## Core Functional Requirements

### Product Management

- Admin can add/edit/delete products
- Each product has: name, brand, model, category, specs, datasheet
- Products filterable by category and brand

### Quote System

- Public form submission
- Server-side validation
- Email notification to admin
- WhatsApp notification option
- Store submissions in database

### Search & Filter

- Keyword-based product search
- Multi-select brand filter
- Category filter
- No advanced search features

---

## Non-Functional Requirements

### Performance

- Page load < 2 seconds
- Image lazy loading
- Asset compression
- Minimal third-party scripts

### Security

- HTTPS mandatory
- Admin authentication (JWT)
- Input sanitization
- SQL injection prevention
- Regular database backups

### SEO

- Clean URLs
- Meta titles and descriptions
- Local Business schema markup
- Mobile-first responsive design

---

## Technology Constraints (Non-Negotiable)

### Frontend

- TypeScript (mandatory)
- React 18+
- Vite
- CSS Modules or Tailwind CSS

### Backend

- Node.js 18+
- Express
- TypeScript

### Database

- PostgreSQL (preferred) or MySQL

### Hosting

- VPS (DigitalOcean or Vultr)
- Nginx
- Cloudflare CDN

---

## Design Constraints

### Must Follow:

- Modern industrial aesthetic
- White background
- Clean layout, large spacing
- Minimal animations
- No outdated UI patterns

### Color Palette:

- Primary: Deep Engineering Blue
- Secondary: Industrial Green
- Accent: Orange/Yellow (CTAs only)
- Background: White with light gray sections

---

## Success Metrics

- Quote form submissions per month
- Page load performance
- Mobile usability score
- SEO ranking for target keywords

---

## Acceptance Criteria (Phase 1)

This section is the "scope freeze" for Feature Done.

If any acceptance criteria below is not met, the project is not considered feature-complete for Phase 1.

### 1) Home

- Home loads without errors on desktop + mobile.
- Hero section shows real business headline + CTA buttons.
- Trust indicators show 4 items.
- Category grid shows 3 columns on desktop and stacks on mobile.
- Brand section renders and is readable.
- "Why choose us" section shows bullet list + CTA.
- No placeholder blocks are visible (images must be real assets or approved final placeholders).

### 2) Products (Catalog)

- Products list loads with pagination.
- Filtering works:
  - category filter uses category **slug**
  - brand filter supports one or multiple brand **slug** values
  - search filters by name/model/description (as implemented)
- No pricing is displayed anywhere.
- Each product card has a "Request Quote" action.

### 3) Product Details

- Product detail page loads by product slug.
- Displays: name, model, brand, category, specs.
- Datasheet download link works if datasheet exists.
- Quote/inquiry submission works from product page.

### 4) Brands

- Brand page shows authorized brands in a simple grid (no carousel requirement).
- Brand logos render (or safe fallback if missing) and are clickable if supported.

### 5) Request a Quote

- Quote form validates required fields server-side.
- Successful submission:
  - stores record in DB
  - returns success UI confirmation
  - admin can see it in Admin panel
- Anti-spam controls are active (rate limit + dedupe + per-email/day cap).
- Email notifications:
  - if SMTP is configured with real credentials, at least one test email is successfully sent to ADMIN_EMAIL
  - if SMTP is not configured, system must fail safely (clear logs + no crash)

### 6) About

- About page shows business overview + experience number.
- Shop photos are real assets (not text placeholders).

### 7) Contact

- Contact page shows: address, phone, email, WhatsApp, office hours.
- Google Maps embed is mandatory:
  - `VITE_GOOGLE_MAPS_EMBED_URL` is configured
  - map iframe renders on the page

### 8) Admin Panel

- Admin can log in with credentials created by seed.
- Admin CRUD works end-to-end for:
  - products
  - categories
  - brands
- Admin can view and manage quote requests.
- Audit logs page is accessible per RBAC rules (where implemented).
- 2FA:
  - Admin can enable 2FA and log in with TOTP when enabled.

### 9) Uploads

- Image upload works for allowed image types.
- Datasheet upload works for PDF.
- Invalid files are blocked (magic-byte validation).
- Uploaded files are served with safe headers (no inline execution for documents).

---

## Assumptions & Dependencies (Mandatory)

- Final business content is provided by env vars in `frontend/.env`.
- Mandatory assets are provided under `frontend/public/assets/` (see `docs/ASSET_REQUIREMENTS.md`).
- SMTP credentials must be real to verify email end-to-end.
- Google Maps embed URL must be real to verify the map requirement.

---

## Scope Sign-off (Required to claim “100% Feature Done”)

- [ ] Client/Owner sign-off: The Phase 1 scope and acceptance criteria above are final.
- [ ] Date signed:

---

## Out of Scope (Do Not Build)

- Multi-language support
- Currency conversion
- Inventory management
- CRM integration
- Advanced analytics
- Social media integration (except WhatsApp)
