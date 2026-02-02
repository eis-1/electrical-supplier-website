import { body } from "express-validator";

/**
 * Brand Creation Validation Rules
 *
 * Validates brand/manufacturer data for create/update operations.
 *
 * **Required Fields:**
 * - name: 2-100 characters, manufacturer/brand name
 * - slug: URL-safe identifier, must be unique
 *
 * **Optional Fields:**
 * - logo: Logo image URL/path for brand display
 * - description: Brand description or partnership details
 * - website: Official brand website (must be valid URL)
 * - isAuthorized: Boolean flag for authorized distributor status
 * - displayOrder: Integer ≥ 0, controls sort order
 *
 * **Slug Requirements:**
 * - Lowercase letters, numbers, hyphens only
 * - Used in URLs: /products?brand={slug}
 * - Pattern: /^[a-z0-9-]+$/
 *
 * **Authorized Distributor Flag:**
 * - Indicates official partnership with brand
 * - Can be highlighted in UI to build customer trust
 * - Helps differentiate official vs gray market products
 *
 * **Website Validation:**
 * - Must be valid URL format if provided
 * - Links to manufacturer's official site
 * - Useful for customer verification and support
 *
 * **Security:**
 * - Slug pattern prevents path traversal
 * - URL validation prevents XSS through malformed links
 */
export const createBrandValidation = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Brand name is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Brand name must be between 2 and 100 characters"),
  body("slug")
    .trim()
    .notEmpty()
    .withMessage("Slug is required")
    .matches(/^[a-z0-9-]+$/)
    .withMessage(
      "Slug must contain only lowercase letters, numbers, and hyphens",
    ),
  body("logo").optional().trim(),
  body("description").optional().trim(),
  body("website").optional().trim().isURL().withMessage("Must be a valid URL"),
  body("isAuthorized")
    .optional()
    .isBoolean()
    .withMessage("isAuthorized must be a boolean"),
  body("displayOrder")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Display order must be a positive integer"),
];

/**
 * Brand Update Validation Rules
 *
 * Reuses createBrandValidation for updates.
 * All fields optional, service layer handles partial updates.
 */
export const updateBrandValidation = createBrandValidation;
