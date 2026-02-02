import { Request, Response, NextFunction } from "express";
import { validationResult, ValidationChain } from "express-validator";
import { ApiResponse } from "../utils/response";

/**
 * Validation Middleware Factory
 *
 * Creates a middleware function that runs express-validator validation chains
 * and returns standardized error responses on validation failure.
 *
 * **How it works:**
 * 1. Accepts an array of express-validator ValidationChain objects
 * 2. Runs all validations in parallel against the request
 * 3. Collects validation errors using validationResult()
 * 4. Returns 400 Bad Request with formatted error list if validation fails
 * 5. Calls next() if all validations pass
 *
 * **Error Format:**
 * Each error includes:
 * - field: The request field that failed validation (if applicable)
 * - message: Human-readable error message
 *
 * **Usage Pattern:**
 * ```typescript
 * router.post('/products',
 *   authenticateAdmin,
 *   validate(createProductValidation),
 *   productController.create
 * );
 * ```
 *
 * @param validations - Array of express-validator validation chains to run
 * @returns Express middleware function that validates and returns errors or proceeds
 *
 * @example
 * ```typescript
 * const loginValidation = [
 *   body('email').isEmail().withMessage('Valid email required'),
 *   body('password').isLength({ min: 8 })
 * ];
 *
 * router.post('/login', validate(loginValidation), loginController);
 * ```
 */
export const validate = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Run all validations
    await Promise.all(validations.map((validation) => validation.run(req)));

    // Check for errors
    const errors = validationResult(req);

    if (errors.isEmpty()) {
      return next();
    }

    // Format errors
    const formattedErrors = errors.array().map((err) => ({
      field: err.type === "field" ? err.path : undefined,
      message: err.msg,
    }));

    return ApiResponse.badRequest(res, "Validation failed", formattedErrors);
  };
};
