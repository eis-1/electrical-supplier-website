import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";
import { env } from "./env";
import { logger } from "../utils/logger";

/**
 * Initialize Sentry error tracking and performance monitoring
 *
 * Features:
 * - Automatic error capture and reporting
 * - Performance monitoring (transactions, spans)
 * - Release tracking and source maps
 * - User context and breadcrumbs
 * - Integration with Express middleware
 *
 * Setup:
 * 1. Create Sentry account at https://sentry.io
 * 2. Create new project (Node.js/Express)
 * 3. Copy DSN to .env file (SENTRY_DSN)
 * 4. Optionally set SENTRY_ENVIRONMENT and SENTRY_RELEASE
 */
export const initSentry = () => {
  const sentryDsn = process.env.SENTRY_DSN;

  // Skip initialization if DSN not configured (optional in development)
  if (!sentryDsn) {
    if (env.NODE_ENV === "production") {
      logger.warn(
        "Sentry DSN not configured in production. Error tracking disabled.",
      );
    } else {
      logger.debug(
        "Sentry DSN not configured. Skipping initialization (development mode).",
      );
    }
    return;
  }

  const sentryConfig: Sentry.NodeOptions = {
    dsn: sentryDsn,

    // Environment (development, staging, production)
    environment: process.env.SENTRY_ENVIRONMENT || env.NODE_ENV,

    // Release version for tracking deployments
    release:
      process.env.SENTRY_RELEASE ||
      `electrical-supplier-api@${process.env.npm_package_version || "1.0.0"}`,

    // Performance monitoring sample rate (0.0 to 1.0)
    // 1.0 = 100% of transactions, 0.1 = 10% of transactions
    tracesSampleRate: env.NODE_ENV === "production" ? 0.1 : 1.0,

    // Profiling sample rate (subset of traced transactions)
    profilesSampleRate: env.NODE_ENV === "production" ? 0.1 : 1.0,

    // Integrations
    integrations: [
      // Performance profiling (CPU, memory)
      nodeProfilingIntegration(),
    ],

    // Don't capture errors in development unless explicitly enabled
    enabled:
      env.NODE_ENV === "production" || process.env.SENTRY_ENABLED === "true",

    // Filter out sensitive information
    beforeSend(event) {
      // Don't send passwords, tokens, or other sensitive data
      if (event.request?.data) {
        const sensitiveFields = [
          "password",
          "token",
          "secret",
          "apiKey",
          "cookie",
        ];
        sensitiveFields.forEach((field) => {
          if (event.request?.data && typeof event.request.data === "object") {
            delete (event.request.data as any)[field];
          }
        });
      }

      // Filter out health check errors (expected 503s)
      if (
        event.request?.url?.includes("/health") ||
        event.request?.url?.includes("/ready")
      ) {
        return null;
      }

      return event;
    },

    // Breadcrumbs configuration
    beforeBreadcrumb(breadcrumb) {
      // Don't log health check requests in breadcrumbs
      if (
        breadcrumb.data?.url?.includes("/health") ||
        breadcrumb.data?.url?.includes("/ready")
      ) {
        return null;
      }
      return breadcrumb;
    },
  };

  Sentry.init(sentryConfig);

  logger.info("Sentry initialized successfully", {
    environment: sentryConfig.environment,
    release: sentryConfig.release,
    enabled: sentryConfig.enabled,
  });
};

/**
 * Manually capture an exception to Sentry with additional context
 */
export const captureException = (
  error: Error,
  context?: Record<string, any>,
) => {
  if (context) {
    Sentry.setContext("additional", context);
  }
  Sentry.captureException(error);
};

/**
 * Manually capture a message to Sentry
 */
export const captureMessage = (
  message: string,
  level: Sentry.SeverityLevel = "info",
) => {
  Sentry.captureMessage(message, level);
};

/**
 * Set user context for Sentry (correlate errors with users)
 */
export const setUserContext = (
  userId: string,
  email?: string,
  username?: string,
) => {
  Sentry.setUser({
    id: userId,
    email,
    username,
  });
};

/**
 * Clear user context (on logout)
 */
export const clearUserContext = () => {
  Sentry.setUser(null);
};

/**
 * Add custom tag for filtering in Sentry dashboard
 */
export const addTag = (key: string, value: string) => {
  Sentry.setTag(key, value);
};

/**
 * Add breadcrumb for debugging context
 */
export const addBreadcrumb = (
  message: string,
  category?: string,
  level?: Sentry.SeverityLevel,
) => {
  Sentry.addBreadcrumb({
    message,
    category: category || "custom",
    level: level || "info",
    timestamp: Date.now() / 1000,
  });
};

// Export Sentry instance for middleware usage
export { Sentry };
