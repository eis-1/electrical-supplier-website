import { body } from "express-validator";

/**
 * Quote Request Creation Validation Rules
 *
 * Validates customer quote request submissions from public website form.
 *
 * **Required Fields:**
 * - name: 2-100 characters, customer name
 * - phone: Valid phone number format (international supported)
 * - email: Valid email, normalized for consistency
 *
 * **Optional Fields:**
 * - company: Company name, max 150 characters
 * - whatsapp: WhatsApp number (same format as phone)
 * - productName: Product of interest, max 255 characters
 * - quantity: Desired quantity, max 50 characters (can be text like "500 units")
 * - projectDetails: Additional context, max 1000 characters
 *
 * **Phone Number Validation:**
 * - Pattern supports international formats: +1-234-567-8900, (123) 456-7890
 * - Regex: /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/
 * - Allows flexible formatting for global customers
 *
 * **Email Normalization:**
 * - normalizeEmail() ensures consistent format (lowercase, trim)
 * - Prevents duplicate detection issues from case differences
 * - Example: Test@Email.com → test@email.com
 *
 * **Field Length Limits:**
 * - Prevents abuse through extremely long submissions
 * - projectDetails: 1000 chars (reasonable detail without spam)
 * - Prevents database storage issues and performance impact
 *
 * **Security:**
 * - All text fields trimmed
 * - Email normalization prevents case-based bypasses
 * - Length limits prevent storage exhaustion attacks
 * - Works with quoteSpam middleware for multi-layer protection
 *
 * @see quoteSpam.middleware.ts for honeypot and timing analysis
 */
export const createQuoteValidation = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Name must be between 2 and 100 characters"),
  body("company")
    .optional()
    .trim()
    .isLength({ max: 150 })
    .withMessage("Company name must not exceed 150 characters"),
  body("phone")
    .trim()
    .notEmpty()
    .withMessage("Phone number is required")
    .matches(
      /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/,
    )
    .withMessage("Please provide a valid phone number"),
  body("whatsapp")
    .optional()
    .trim()
    .matches(
      /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/,
    )
    .withMessage("Please provide a valid WhatsApp number"),
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email address"),
  body("productName")
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage("Product name must not exceed 255 characters"),
  body("quantity")
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage("Quantity must not exceed 50 characters"),
  body("projectDetails")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Project details must not exceed 1000 characters"),
];

/**
 * Quote Update Validation Rules (Admin Only)
 *
 * Validates admin updates to quote requests for status tracking.
 *
 * **Updatable Fields:**
 * - status: Must be one of: 'new', 'contacted', 'quoted', 'closed'
 * - notes: Admin notes for internal tracking (unlimited length)
 *
 * **Status Workflow:**
 * - new: Initial state when customer submits quote
 * - contacted: Admin has reached out to customer
 * - quoted: Price quote has been provided
 * - closed: Quote completed (won, lost, or abandoned)
 *
 * **Use Case:**
 * Admin panel for managing quote pipeline and tracking follow-ups.
 */
export const updateQuoteValidation = [
  body("status")
    .optional()
    .isIn(["new", "contacted", "quoted", "closed"])
    .withMessage("Invalid status value"),
  body("notes").optional().trim(),
];
