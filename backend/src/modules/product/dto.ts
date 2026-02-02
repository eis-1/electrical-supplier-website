import { body } from "express-validator";

/**
 * Product Creation Validation Rules
 *
 * Validates product data submitted by admin when creating new products.
 *
 * **Required Fields:**
 * - name: 2-255 characters, trimmed
 *
 * **Optional Fields:**
 * - slug: Auto-generated if not provided (from name/model at service layer)
 * - model: Product model number/identifier
 * - categoryId, brandId: Must be valid UUIDs if provided
 * - description, keyFeatures: Text content
 * - image, datasheetUrl: URLs/paths to resources
 * - isFeatured: Boolean flag for homepage display
 * - specs: Array of specification objects
 *
 * **Slug Rules:**
 * - If provided: Must be lowercase letters, numbers, hyphens only
 * - If omitted: Service layer generates from name/model
 * - Pattern: /^[a-z0-9-]+$/
 *
 * **Security:**
 * - All text fields trimmed to prevent whitespace attacks
 * - UUID validation prevents SQL injection on foreign keys
 * - No HTML allowed (handled by sanitization middleware if configured)
 *
 * @see ProductService.create for slug auto-generation logic
 */
export const createProductValidation = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Product name is required")
    .isLength({ min: 2, max: 255 })
    .withMessage("Product name must be between 2 and 255 characters"),
  // Slug is optional: if not provided, it will be generated from name/model.
  body("slug")
    .optional()
    .trim()
    .matches(/^[a-z0-9-]+$/)
    .withMessage(
      "Slug must contain only lowercase letters, numbers, and hyphens",
    ),
  body("model").optional().trim(),
  body("categoryId")
    .optional()
    .isUUID()
    .withMessage("Category ID must be a valid UUID"),
  body("brandId")
    .optional()
    .isUUID()
    .withMessage("Brand ID must be a valid UUID"),
  body("description").optional().trim(),
  body("keyFeatures").optional().trim(),
  body("image").optional().trim(),
  body("datasheetUrl").optional().trim(),
  body("isFeatured")
    .optional()
    .isBoolean()
    .withMessage("isFeatured must be a boolean"),
  body("specs").optional().isArray().withMessage("Specs must be an array"),
];

/**
 * Product Update Validation Rules
 *
 * Validates product data for update operations.
 * Same validation rules as createProductValidation, but all fields optional.
 *
 * **Partial Updates:**
 * - Only provided fields are validated and updated
 * - Omitted fields retain existing values
 * - Cannot set required fields to null/empty
 *
 * **Use Case:**
 * Admin can update just name, or just isFeatured flag, without sending all fields.
 */
export const updateProductValidation = [
  body("name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage("Product name must be between 2 and 255 characters"),
  body("slug")
    .optional()
    .trim()
    .matches(/^[a-z0-9-]+$/)
    .withMessage(
      "Slug must contain only lowercase letters, numbers, and hyphens",
    ),
  body("model").optional().trim(),
  body("categoryId")
    .optional()
    .isUUID()
    .withMessage("Category ID must be a valid UUID"),
  body("brandId")
    .optional()
    .isUUID()
    .withMessage("Brand ID must be a valid UUID"),
  body("description").optional().trim(),
  body("keyFeatures").optional().trim(),
  body("image").optional().trim(),
  body("datasheetUrl").optional().trim(),
  body("isFeatured")
    .optional()
    .isBoolean()
    .withMessage("isFeatured must be a boolean"),
  body("specs").optional().isArray().withMessage("Specs must be an array"),
];
