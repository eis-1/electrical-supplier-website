# Project Scope Document

## Electrical Supplier Website - B2B Lead Generation Platform

**Last Updated**: January 8, 2026

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

## Out of Scope (Do Not Build)

- Multi-language support
- Currency conversion
- Inventory management
- CRM integration
- Advanced analytics
- Social media integration (except WhatsApp)
