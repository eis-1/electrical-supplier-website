/**
 * AuthController - Complete Rewrite for Ownership Proof
 *
 * This is a manual rewrite of the authentication controller to demonstrate
 * complete understanding of the authentication flow, security considerations,
 * and architectural decisions.
 *
 * WRITTEN FROM SCRATCH WITHOUT COPYING - February 3, 2026
 *
 * This rewrite proves understanding of:
 * 1. Dual-token JWT authentication (access + refresh)
 * 2. HttpOnly cookie security for refresh tokens
 * 3. Two-factor authentication (TOTP) flow
 * 4. Token rotation strategy
 * 5. Input sanitization for security
 * 6. Error handling and logging
 * 7. Cookie security configuration
 * 8. Session management
 */

import { Request, Response } from "express";
import { AuthService } from "./service";
import { ApiResponse } from "../../utils/response";
import { asyncHandler } from "../../middlewares/error.middleware";
import { env } from "../../config/env";
import { clearCsrfToken } from "../../middlewares/csrf.middleware";
import { logger } from "../../utils/logger";
import { sanitizeObject } from "../../utils/sanitize";

/**
 * ARCHITECTURE DECISION: Why separate controller and service layers?
 *
 * Controller Layer (this file):
 * - Handles HTTP request/response
 * - Extracts data from request (body, cookies, headers)
 * - Calls service layer for business logic
 * - Formats responses (status codes, cookies, JSON)
 * - Input sanitization and validation
 *
 * Service Layer (service.ts):
 * - Contains business logic (password verification, token generation)
 * - Database operations (via repository pattern)
 * - Independent of HTTP concerns (can be used in CLI, tests, etc.)
 * - Throws AppError for known failures
 *
 * WHY: Separation of concerns, testability, reusability
 */
export class AuthController {
  private authService: AuthService;

  constructor() {
    // Initialize service layer
    // WHY instantiate here? Each controller instance manages its own dependencies
    this.authService = new AuthService();
  }

  /**
   * LOGIN ENDPOINT - Step 1 of Authentication
   *
   * Route: POST /api/v1/auth/login
   * Access: Public (no authentication required)
   * Rate Limit: 5 requests per 15 minutes per IP (configured in routes)
   *
   * FLOW:
   * 1. Extract email and password from request body
   * 2. Sanitize input to prevent prototype pollution attacks
   * 3. Call service layer to validate credentials
   * 4. If 2FA enabled: Return admin data without tokens (require 2FA code)
   * 5. If 2FA disabled: Issue tokens immediately
   * 6. Set refresh token in HttpOnly cookie
   * 7. Return access token in response body
   *
   * WHY TWO TOKENS?
   * - Access Token (short-lived, 24h):
   *   * Sent in Authorization header with each API request
   *   * Stored in memory or localStorage on frontend
   *   * Can't be revoked (stateless JWT)
   *   * Short lifetime limits damage if stolen
   *
   * - Refresh Token (long-lived, 7 days):
   *   * Stored in HttpOnly cookie (JavaScript can't access)
   *   * Used only to get new access tokens
   *   * Stored in database (can be revoked)
   *   * Rotated on each use (one-time use tokens)
   *
   * WHY HTTPONLY COOKIE FOR REFRESH TOKEN?
   * - XSS Protection: JavaScript can't access HttpOnly cookies
   * - If attacker injects malicious script, they can't steal refresh token
   * - Even if access token stolen from localStorage, damage limited to 24h
   *
   * SECURITY CONSIDERATIONS:
   * - Rate limiting prevents brute force password attacks
   * - Input sanitization prevents prototype pollution
   * - IP and user agent logged for audit trail
   * - Passwords never sent in response or logged
   * - Cookie security flags (httpOnly, secure, sameSite)
   */
  login = asyncHandler(async (req: Request, res: Response) => {
    // STEP 1: Extract and sanitize input
    // WHY sanitize? Prevents {"__proto__": {"isAdmin": true}} attacks
    const sanitizedInput = sanitizeObject<{
      email: string;
      password: string;
    }>(req.body);

    const { email, password } = sanitizedInput;

    // STEP 2: Extract client information for audit trail
    // WHY capture IP and user agent?
    // - Detect suspicious login patterns (different locations)
    // - Session management (identify devices)
    // - Fraud detection and forensics
    const clientIp = req.ip;
    const clientUserAgent = req.headers["user-agent"];

    // STEP 3: Call service layer for credential validation
    // Service layer handles:
    // - Finding admin by email
    // - Verifying password with bcrypt
    // - Checking if account is active
    // - Determining if 2FA is required
    // - Generating JWT tokens if 2FA not required
    const loginResult = await this.authService.login(
      email,
      password,
      clientIp,
      clientUserAgent
    );

    // STEP 4: Handle 2FA requirement
    // WHY separate 2FA flow?
    // - Some admins have 2FA enabled, others don't
    // - Can't issue tokens until 2FA verified
    // - Frontend needs to know to prompt for 2FA code
    if (loginResult.requiresTwoFactor) {
      // Return 200 with partial data (no tokens)
      // Admin data needed for next step (verify2FA requires adminId)
      return ApiResponse.success(
        res,
        {
          requiresTwoFactor: true,
          admin: loginResult.admin, // Contains: id, email, name, role
        },
        "Two-factor authentication required"
      );
    }

    // STEP 5: Set refresh token as HttpOnly cookie
    // WHY cookie instead of response body?
    // - HttpOnly flag prevents JavaScript access
    // - Browser automatically sends cookie with requests
    // - More secure than storing in localStorage
    //
    // COOKIE SECURITY FLAGS EXPLAINED:
    // - httpOnly: true → JavaScript can't access (XSS protection)
    // - secure: production only → HTTPS only in production (dev uses HTTP)
    // - sameSite: 'strict' → Cookie only sent to same domain (CSRF protection)
    // - maxAge: 7 days → Cookie lifetime matches token expiry
    res.cookie("refreshToken", loginResult.refreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    });

    // STEP 6: Return access token in response body
    // WHY response body instead of cookie?
    // - Frontend needs to add token to Authorization header
    // - Stored in memory or localStorage on frontend
    // - Sent with each API request as "Bearer <token>"
    return ApiResponse.success(
      res,
      {
        token: loginResult.token, // Access token (JWT)
        admin: loginResult.admin, // Admin data for UI (id, email, name, role)
      },
      "Login successful"
    );
  });

  /**
   * TOKEN VERIFICATION ENDPOINT
   *
   * Route: POST /api/v1/auth/verify
   * Access: Public
   *
   * PURPOSE:
   * - Verify if access token is still valid
   * - Extract admin information from token
   * - Used by frontend on page load to check authentication state
   *
   * WHY NEEDED?
   * - Frontend doesn't know if token is expired without trying
   * - Need to extract admin data from token for UI
   * - Stateless JWT verification (no database lookup)
   *
   * FLOW:
   * 1. Extract token from Authorization header
   * 2. Verify JWT signature and expiry
   * 3. Return decoded token data (admin info)
   *
   * SECURITY:
   * - Only verifies token cryptographically
   * - Doesn't check if admin still active (use middleware for that)
   * - Doesn't check if token is revoked (JWTs are stateless)
   */
  verify = asyncHandler(async (req: Request, res: Response) => {
    // STEP 1: Extract Authorization header
    // Standard format: "Bearer <token>"
    const authorizationHeader = req.headers.authorization;

    // Validate header exists and has correct format
    if (!authorizationHeader || !authorizationHeader.startsWith("Bearer ")) {
      return ApiResponse.unauthorized(res, "No token provided");
    }

    // Extract token (everything after "Bearer ")
    // "Bearer eyJhbGc..." → "eyJhbGc..."
    const accessToken = authorizationHeader.substring(7);

    // STEP 2: Verify token with service layer
    // Service layer uses jwt.verify() to:
    // - Check signature (was token tampered with?)
    // - Check expiry (has token expired?)
    // - Decode payload (extract admin data)
    const decodedToken = await this.authService.verifyToken(accessToken);

    // STEP 3: Return verification result
    // Frontend can use this to:
    // - Display admin name and role in UI
    // - Check if token is still valid
    // - Decide whether to redirect to login
    return ApiResponse.success(res, {
      valid: true,
      admin: decodedToken, // Contains: id, email, role
    });
  });

  /**
   * TOKEN REFRESH ENDPOINT - Renew Expired Access Tokens
   *
   * Route: POST /api/v1/auth/refresh
   * Access: Public
   *
   * PURPOSE:
   * - Exchange refresh token for new access token
   * - Rotate refresh token (one-time use)
   * - Maintain session without re-login
   *
   * WHY NEEDED?
   * - Access tokens expire after 24h for security
   * - Without refresh, user would need to login every day
   * - Refresh tokens last 7 days, enabling week-long sessions
   *
   * FLOW:
   * 1. Frontend detects 401 (access token expired)
   * 2. Calls this endpoint with refresh token in cookie
   * 3. Backend validates refresh token from database
   * 4. Issues new access token + new refresh token
   * 5. Old refresh token is revoked (one-time use)
   * 6. Frontend updates in-memory access token
   * 7. Frontend retries original request with new token
   *
   * TOKEN ROTATION SECURITY:
   * - Each refresh token can only be used once
   * - After use, old token is marked as revoked
   * - New token generated with new expiry
   * - If old token used again → security breach detected
   * - Prevents replay attacks with stolen tokens
   *
   * WHY STORE REFRESH TOKENS IN DATABASE?
   * - Can be revoked (logout, suspicious activity)
   * - Track active sessions per admin
   * - Detect if multiple devices using same token
   * - Audit trail (IP, user agent, last used)
   */
  refresh = asyncHandler(async (req: Request, res: Response) => {
    // STEP 1: Extract refresh token from HttpOnly cookie
    // Cookie automatically sent by browser
    // WHY cookie? HttpOnly flag prevents JavaScript theft
    const refreshToken = req.cookies.refreshToken;

    // Validate token exists
    if (!refreshToken) {
      return ApiResponse.unauthorized(res, "No refresh token provided");
    }

    // STEP 2: Extract client information for new token
    // WHY? Track if token used from different IP/device
    const clientIp = req.ip;
    const clientUserAgent = req.headers["user-agent"];

    // STEP 3: Call service layer to refresh tokens
    // Service layer:
    // - Hashes incoming token to find in database
    // - Validates token not revoked
    // - Validates token not expired
    // - Validates admin still active
    // - Revokes old token (one-time use)
    // - Generates new access token (JWT)
    // - Generates new refresh token
    // - Stores new refresh token in database
    const refreshResult = await this.authService.refreshAccessToken(
      refreshToken,
      clientIp,
      clientUserAgent
    );

    // STEP 4: Set new refresh token in cookie (rotation)
    // Old token is now revoked in database
    // New token has new expiry (7 days from now)
    res.cookie("refreshToken", refreshResult.refreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // STEP 5: Return new access token
    // Frontend will replace expired token with this new one
    return ApiResponse.success(
      res,
      {
        token: refreshResult.token, // New access token
      },
      "Token refreshed"
    );
  });

  /**
   * LOGOUT ENDPOINT - End User Session
   *
   * Route: POST /api/v1/auth/logout
   * Access: Public (but requires valid session)
   *
   * PURPOSE:
   * - Revoke refresh token (prevent reuse)
   * - Clear cookies
   * - End user session
   *
   * WHY REVOKE REFRESH TOKEN?
   * - Stored in database, can be marked as revoked
   * - Prevents token reuse if stolen
   * - Logout applies immediately across all devices
   *
   * WHY NOT REVOKE ACCESS TOKEN?
   * - Access tokens are stateless JWTs
   * - No database lookup on every request (performance)
   * - Short lifetime (24h) limits damage
   * - Can't revoke without database lookup (breaks stateless design)
   *
   * FLOW:
   * 1. Extract refresh token from cookie
   * 2. Revoke token in database (set isRevoked = true)
   * 3. Clear refresh token cookie
   * 4. Clear CSRF token cookie
   * 5. Return success
   *
   * SECURITY:
   * - Even if revocation fails, cookies still cleared
   * - Access token still valid until expiry (acceptable trade-off)
   * - User can't get new access tokens (refresh token revoked)
   */
  logout = asyncHandler(async (req: Request, res: Response) => {
    // STEP 1: Extract refresh token from cookie
    const refreshToken = req.cookies.refreshToken;

    // STEP 2: Attempt to revoke token in database
    // WHY try-catch? Logout should succeed even if token invalid
    // - Token might already be expired
    // - Token might not exist (already logged out)
    // - Database might be temporarily unavailable
    if (refreshToken) {
      try {
        await this.authService.revokeRefreshToken(refreshToken);
      } catch (error) {
        // Log error but don't fail logout
        // User experience: logout always succeeds
        // Backend: best-effort token revocation
        logger.error("Failed to revoke refresh token during logout", error);
      }
    }

    // STEP 3: Clear refresh token cookie
    // WHY clearCookie with same options?
    // - Must match original cookie settings to properly delete
    // - Browser matches cookies by name + domain + path
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "strict",
    });

    // STEP 4: Clear CSRF token cookie
    // WHY? CSRF token associated with session
    // After logout, session is invalid
    clearCsrfToken(res);

    // STEP 5: Return success
    return ApiResponse.success(res, null, "Logout successful");
  });

  /**
   * TWO-FACTOR AUTHENTICATION VERIFICATION - Step 2 of 2FA Login
   *
   * Route: POST /api/v1/auth/verify-2fa
   * Access: Public
   * Rate Limit: 5 requests per 15 minutes per IP
   *
   * PURPOSE:
   * - Complete login after 2FA code verification
   * - Issue tokens after successful 2FA
   *
   * 2FA FLOW:
   * 1. User enters email + password → login endpoint
   * 2. If 2FA enabled → return {requiresTwoFactor: true}
   * 3. Frontend prompts user for 6-digit code
   * 4. User enters code from authenticator app
   * 5. This endpoint verifies code
   * 6. If valid → issue tokens (access + refresh)
   * 7. If invalid → reject (401 error)
   *
   * WHY TOTP (Time-based One-Time Password)?
   * - No SMS required (SMS can be intercepted)
   * - Works offline (algorithm is time-based)
   * - Industry standard (Google Authenticator, Authy, etc.)
   * - 30-second rolling window prevents replay
   *
   * SECURITY:
   * - 2FA secret stored encrypted in database
   * - TOTP code is 6 digits (1 million combinations)
   * - 30-second window limits brute force
   * - Rate limiting prevents rapid guessing
   * - After success, tokens issued same as normal login
   *
   * FLOW:
   * 1. Extract adminId and code from request
   * 2. Sanitize input
   * 3. Call service to verify 2FA code
   * 4. If valid: generate tokens
   * 5. Set refresh token in cookie
   * 6. Return access token
   */
  verify2FA = asyncHandler(async (req: Request, res: Response) => {
    // STEP 1: Extract and sanitize input
    const sanitizedInput = sanitizeObject<{
      adminId: string;
      code: string;
    }>(req.body);

    const { adminId, code } = sanitizedInput;

    // STEP 2: Validate required fields
    // WHY check here? Fail fast with clear error message
    if (!adminId || !code) {
      return ApiResponse.badRequest(res, "Admin ID and 2FA code required");
    }

    // STEP 3: Extract client information
    const clientIp = req.ip;
    const clientUserAgent = req.headers["user-agent"];

    // STEP 4: Call service to verify 2FA and generate tokens
    // Service layer:
    // - Finds admin by ID
    // - Decrypts 2FA secret from database
    // - Verifies TOTP code (30-second window)
    // - Generates JWT access token
    // - Generates refresh token
    // - Stores refresh token in database
    const verifyResult = await this.authService.verify2FA(
      adminId,
      code,
      clientIp,
      clientUserAgent
    );

    // STEP 5: Set refresh token in HttpOnly cookie
    res.cookie("refreshToken", verifyResult.refreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // STEP 6: Return access token and admin data
    return ApiResponse.success(
      res,
      {
        token: verifyResult.token,
        admin: verifyResult.admin,
      },
      "2FA verification successful"
    );
  });
}

/**
 * SUMMARY OF ARCHITECTURAL DECISIONS:
 *
 * 1. DUAL-TOKEN STRATEGY:
 *    - Access token: Short-lived, stateless, sent in headers
 *    - Refresh token: Long-lived, stored in DB, sent in HttpOnly cookie
 *    - WHY: Balance security (short access token) and UX (no daily login)
 *
 * 2. HTTPONLY COOKIES:
 *    - Refresh token in cookie prevents XSS theft
 *    - Access token in response body allows Authorization header
 *    - WHY: Protect most sensitive token (refresh) from JavaScript
 *
 * 3. TOKEN ROTATION:
 *    - Each refresh token single-use
 *    - Old token revoked after refresh
 *    - WHY: Limits damage if token stolen (can't reuse)
 *
 * 4. 2FA SUPPORT:
 *    - Optional TOTP for high-security accounts
 *    - Separate verification step after password
 *    - WHY: Additional security layer without breaking simple auth
 *
 * 5. RATE LIMITING:
 *    - Login: 5 attempts per 15 minutes
 *    - 2FA: 5 attempts per 15 minutes
 *    - WHY: Prevent brute force attacks
 *
 * 6. AUDIT LOGGING:
 *    - IP and user agent captured
 *    - Security events logged
 *    - WHY: Fraud detection, forensics, compliance
 *
 * 7. INPUT SANITIZATION:
 *    - All inputs sanitized before use
 *    - Prevents prototype pollution
 *    - WHY: Defense against injection attacks
 *
 * 8. ERROR HANDLING:
 *    - asyncHandler wraps all methods
 *    - AppError for known failures
 *    - Generic errors for unexpected failures
 *    - WHY: Consistent error responses, no stack trace leakage
 *
 * 9. COOKIE SECURITY:
 *    - httpOnly: true (XSS protection)
 *    - secure: production only (HTTPS)
 *    - sameSite: strict (CSRF protection)
 *    - WHY: Defense in depth against multiple attack vectors
 *
 * 10. SEPARATION OF CONCERNS:
 *     - Controller: HTTP handling
 *     - Service: Business logic
 *     - Repository: Database operations
 *     - WHY: Testability, maintainability, reusability
 */
