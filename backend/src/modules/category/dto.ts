import { body } from "express-validator";

/**
 * Category Creation Validation Rules
 *
 * Validates category data for create/update operations.
 *
 * **Required Fields:**
 * - name: 2-100 characters, display name for category
 * - slug: URL-safe identifier, must be unique (checked at service layer)
 *
 * **Optional Fields:**
 * - icon: Icon identifier for UI rendering (e.g., 'icon-led', 'icon-cable')
 * - description: Text description for category
 * - displayOrder: Integer ≥ 0, controls sort order (lower = higher)
 *
 * **Slug Requirements:**
 * - Must be lowercase letters, numbers, hyphens only
 * - Used in URLs: /products/category/{slug}
 * - Pattern: /^[a-z0-9-]+$/
 * - Must be unique (enforced by unique constraint in database)
 *
 * **Display Order:**
 * - Lower numbers appear first in category lists
 * - If omitted, defaults to database default
 * - Allows manual category sorting in admin panel
 *
 * **Security:**
 * - All text trimmed to prevent whitespace issues
 * - Slug pattern prevents path traversal and special characters
 */
export const createCategoryValidation = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Category name is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Category name must be between 2 and 100 characters"),
  body("slug")
    .trim()
    .notEmpty()
    .withMessage("Slug is required")
    .matches(/^[a-z0-9-]+$/)
    .withMessage(
      "Slug must contain only lowercase letters, numbers, and hyphens",
    ),
  body("icon").optional().trim(),
  body("description").optional().trim(),
  body("displayOrder")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Display order must be a positive integer"),
];

/**
 * Category Update Validation Rules
 *
 * Reuses createCategoryValidation rules for updates.
 * All fields optional at validation layer, service layer handles partial updates.
 */
export const updateCategoryValidation = createCategoryValidation;
