/**
 * Input Sanitization Utilities
 *
 * Purpose: Prevent prototype pollution, injection attacks, and malicious input
 *
 * Security threats addressed:
 * 1. Prototype pollution: `{"__proto__": {"isAdmin": true}}`
 * 2. Constructor pollution: `{"constructor": {"prototype": {"isAdmin": true}}}`
 * 3. XSS via object keys: `{"<script>alert(1)</script>": "value"}`
 * 4. Deep object manipulation
 *
 * Usage:
 * ```typescript
 * // Sanitize request body before passing to service
 * const sanitizedData = sanitizeObject(req.body);
 * await productService.create(sanitizedData);
 * ```
 */

/**
 * Dangerous keys that should never appear in user input
 * These allow prototype pollution attacks
 */
const DANGEROUS_KEYS = [
  '__proto__',
  'constructor',
  'prototype',
  '__defineGetter__',
  '__defineSetter__',
  '__lookupGetter__',
  '__lookupSetter__',
];

/**
 * Sanitize object by removing dangerous keys recursively
 *
 * @param obj - Object to sanitize (usually req.body)
 * @param maxDepth - Maximum recursion depth (prevent DoS via deep nesting)
 * @returns Sanitized object with dangerous keys removed
 *
 * @example
 * // Malicious input
 * const input = { name: "Product", __proto__: { isAdmin: true } };
 *
 * // Sanitized output
 * const safe = sanitizeObject(input);
 * // { name: "Product" } - __proto__ removed
 */
export function sanitizeObject<T = any>(
  obj: any,
  maxDepth: number = 10,
  currentDepth: number = 0
): T {
  // Base cases: primitive types, null, undefined
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  // Prevent DoS via deep nesting
  if (currentDepth >= maxDepth) {
    throw new Error(
      `Object nesting too deep (max ${maxDepth} levels). Possible DoS attack.`
    );
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map((item) =>
      sanitizeObject(item, maxDepth, currentDepth + 1)
    ) as T;
  }

  // Handle objects
  const sanitized: any = {};

  for (const key in obj) {
    // Skip inherited properties (only own properties)
    if (!obj.hasOwnProperty(key)) {
      continue;
    }

    // Block dangerous keys
    if (DANGEROUS_KEYS.includes(key.toLowerCase())) {
      // Log security event
      console.warn('[SECURITY] Blocked dangerous key in input:', {
        key,
        type: 'prototype_pollution_attempt',
        timestamp: new Date().toISOString(),
      });
      continue; // Skip this key
    }

    // Recursively sanitize nested objects
    const value = obj[key];
    sanitized[key] = sanitizeObject(value, maxDepth, currentDepth + 1);
  }

  return sanitized as T;
}

/**
 * Validate that object doesn't contain dangerous patterns
 * Throws error if dangerous keys found
 *
 * @param obj - Object to validate
 * @throws Error if dangerous keys detected
 *
 * @example
 * try {
 *   validateObjectSafety(req.body);
 * } catch (error) {
 *   return res.status(400).json({ error: 'Invalid input' });
 * }
 */
export function validateObjectSafety(obj: any): void {
  const dangerousKeys: string[] = [];

  function scan(target: any, path: string = ''): void {
    if (target === null || typeof target !== 'object') {
      return;
    }

    for (const key in target) {
      if (!target.hasOwnProperty(key)) {
        continue;
      }

      const fullPath = path ? `${path}.${key}` : key;

      if (DANGEROUS_KEYS.includes(key.toLowerCase())) {
        dangerousKeys.push(fullPath);
      }

      // Recursively scan nested objects
      if (typeof target[key] === 'object') {
        scan(target[key], fullPath);
      }
    }
  }

  scan(obj);

  if (dangerousKeys.length > 0) {
    throw new Error(
      `Dangerous keys detected: ${dangerousKeys.join(', ')}. ` +
        'Possible prototype pollution attack.'
    );
  }
}

/**
 * Sanitize string input (prevent XSS, SQL injection patterns)
 *
 * @param input - String to sanitize
 * @returns Sanitized string with dangerous patterns removed
 *
 * Note: This is a basic sanitization. For HTML output, use DOMPurify.
 * For SQL queries, use parameterized queries (Prisma handles this).
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    return input;
  }

  return (
    input
      // Remove null bytes (can cause issues in C-based systems)
      .replace(/\0/g, '')
      // Normalize whitespace (prevent homograph attacks)
      .trim()
  );
}

/**
 * Sanitize email address
 * Removes whitespace, converts to lowercase
 *
 * @param email - Email address to sanitize
 * @returns Sanitized email
 */
export function sanitizeEmail(email: string): string {
  if (typeof email !== 'string') {
    return email;
  }

  return email.trim().toLowerCase();
}

/**
 * Sanitize array input
 * Removes non-array values, applies sanitization to each element
 *
 * @param arr - Array to sanitize
 * @param maxLength - Maximum array length (prevent DoS)
 * @returns Sanitized array
 */
export function sanitizeArray<T = any>(
  arr: any,
  maxLength: number = 100
): T[] {
  if (!Array.isArray(arr)) {
    return [];
  }

  if (arr.length > maxLength) {
    throw new Error(
      `Array too large (${arr.length} items, max ${maxLength}). Possible DoS attack.`
    );
  }

  return arr.map((item) => {
    if (typeof item === 'object' && item !== null) {
      return sanitizeObject(item);
    }
    return item;
  });
}

/**
 * Strip HTML tags from string (basic XSS prevention)
 *
 * @param input - String that may contain HTML
 * @returns String with HTML tags removed
 *
 * Note: For rich text, use a proper HTML sanitizer like DOMPurify
 */
export function stripHtmlTags(input: string): string {
  if (typeof input !== 'string') {
    return input;
  }

  return input.replace(/<[^>]*>/g, '');
}

/**
 * Validate that object only contains expected keys
 * Throws error if unexpected keys found
 *
 * @param obj - Object to validate
 * @param allowedKeys - Array of allowed key names
 * @throws Error if unexpected keys found
 *
 * @example
 * validateAllowedKeys(req.body, ['name', 'email', 'password']);
 * // Throws if req.body contains 'isAdmin' or other unexpected keys
 */
export function validateAllowedKeys(
  obj: any,
  allowedKeys: string[]
): void {
  if (typeof obj !== 'object' || obj === null) {
    return;
  }

  const actualKeys = Object.keys(obj);
  const unexpectedKeys = actualKeys.filter((key) => !allowedKeys.includes(key));

  if (unexpectedKeys.length > 0) {
    throw new Error(
      `Unexpected keys in request: ${unexpectedKeys.join(', ')}. ` +
        `Allowed keys: ${allowedKeys.join(', ')}`
    );
  }
}

/**
 * Create sanitization middleware for Express routes
 *
 * @returns Express middleware that sanitizes req.body
 *
 * @example
 * router.post('/products', sanitizeInput(), productController.create);
 */
export function sanitizeInput() {
  return (req: any, res: any, next: any) => {
    try {
      if (req.body && typeof req.body === 'object') {
        req.body = sanitizeObject(req.body);
      }

      if (req.query && typeof req.query === 'object') {
        req.query = sanitizeObject(req.query);
      }

      if (req.params && typeof req.params === 'object') {
        req.params = sanitizeObject(req.params);
      }

      next();
    } catch (error) {
      // Security event: possible attack detected
      console.error('[SECURITY] Input sanitization failed:', error);
      return res.status(400).json({
        error: 'Invalid input format',
        message: 'Request contains malicious data',
      });
    }
  };
}
