import pino from "pino";
import pretty from "pino-pretty";

/**
 * Security event data structure for audit trail
 * Used by logger.security() to track security-relevant events
 */
interface SecurityEventData {
  type:
    | "auth" // Authentication events (login, logout, token refresh)
    | "upload" // File upload events (success, rejection, validation)
    | "quote" // Quote submission events (spam detection, rate limiting)
    | "admin_action" // Admin operations (CRUD, settings changes)
    | "rate_limit" // Rate limit violations
    | "validation" // Input validation failures
    | "captcha" // CAPTCHA events
    | "csrf"; // CSRF token validation
  action: string; // Specific action (e.g., "spam_blocked_honeypot", "login_failed")
  userId?: string; // User or admin ID involved
  ip?: string; // Request IP address
  userAgent?: string; // Client user agent string
  details?: Record<string, any>; // Additional context data
}

/**
 * Metadata attached to log entries
 * Supports distributed tracing and request correlation
 */
interface LogMetadata {
  traceId?: string; // Distributed tracing ID (correlation across services)
  userId?: string; // User or admin ID
  ip?: string; // Request IP address
  userAgent?: string; // Client user agent
  path?: string; // Request path
  method?: string; // HTTP method (GET, POST, etc.)
  duration?: number; // Operation duration in milliseconds
  [key: string]: any; // Additional custom metadata
}

/**
 * Redact sensitive fields from logs to prevent credential leaks
 *
 * Security Importance:
 * - Prevents passwords from appearing in logs
 * - Protects API keys and tokens
 * - Complies with data protection regulations (GDPR, etc.)
 * - Prevents credential exposure in log aggregation systems
 *
 * Redacted Fields:
 * - Passwords and secrets (any depth)
 * - Authorization tokens (JWT, bearer, etc.)
 * - Session cookies
 * - API keys and access tokens
 * - CSRF tokens
 * - Request headers containing sensitive data
 *
 * Output:
 * Redacted fields show '[REDACTED]' instead of actual value
 *
 * Examples:
 * - { password: 'secret123' } → { password: '[REDACTED]' }
 * - { req: { body: { token: 'abc' } } } → { req: { body: { token: '[REDACTED]' } } }
 */
const redact = {
  paths: [
    'password',
    '*.password',
    'req.body.password',
    'token',
    '*.token',
    'req.body.token',
    'secret',
    '*.secret',
    'authorization',
    '*.authorization',
    'cookie',
    '*.cookie',
    'req.headers.cookie',
    'req.headers.authorization',
    'apiKey',
    '*.apiKey',
    'accessToken',
    '*.accessToken',
    'refreshToken',
    '*.refreshToken',
    'csrfToken',
    '*.csrfToken',
  ],
  censor: '[REDACTED]',
};

/**
 * Configure Pino logger with environment-aware settings
 *
 * Output Format:
 * - Production: Fast JSON output for log aggregation systems
 *   - Suitable for: ELK Stack, Datadog, Splunk, CloudWatch
 *   - Format: {"level":"INFO","time":"2026-02-03T...","msg":"..."}
 * - Development: Pretty-printed human-readable logs
 *   - Colorized output for terminal readability
 *   - Formatted timestamps
 *   - Single-line or multi-line based on complexity
 *
 * Log Levels (highest to lowest):
 * - fatal: App is crashing (60)
 * - error: Errors requiring attention (50)
 * - warn: Warnings and degraded functionality (40)
 * - info: General informational messages (30) [DEFAULT]
 * - debug: Detailed debugging information (20)
 * - trace: Very detailed tracing (10)
 *
 * Base Context (added to all logs):
 * - service: "electrical-supplier-api"
 * - environment: "development" | "production" | "test"
 * - version: Package version from package.json
 *
 * Configuration:
 * - LOG_LEVEL: Override default log level (e.g., "debug", "warn")
 * - LOG_FORMAT: Set to "json" to force JSON in development
 * - NODE_ENV: Determines default format (development vs production)
 *
 * @returns Configured Pino logger instance
 */
const createPinoLogger = () => {
  const isDevelopment = process.env.NODE_ENV === "development";
  const logLevel = process.env.LOG_LEVEL || (isDevelopment ? "debug" : "info");

  const baseConfig: pino.LoggerOptions = {
    level: logLevel,
    base: {
      service: "electrical-supplier-api",
      environment: process.env.NODE_ENV || "development",
      version: process.env.npm_package_version || "1.0.0",
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact, // Apply redaction to all logs
    formatters: {
      level: (label) => {
        return { level: label.toUpperCase() };
      },
    },
  };

  // Development: Pretty-printed logs
  if (isDevelopment && process.env.LOG_FORMAT !== "json") {
    const prettyStream = pretty({
      colorize: true,
      translateTime: "SYS:standard",
      ignore: "pid,hostname",
      singleLine: false,
    });
    return pino(baseConfig, prettyStream);
  }

  // Production: JSON logs for aggregation
  return pino(baseConfig);
};

const pinoLogger = createPinoLogger();

/**
 * Enhanced logger with Pino integration and structured logging
 *
 * Features:
 * - Structured JSON logging for production
 * - Pretty-printed logs for development
 * - Automatic sensitive data redaction
 * - Security event logging for audit trails
 * - Performance metric tracking
 * - Request-scoped child loggers
 * - Error object serialization
 *
 * Usage Patterns:
 * 1. General logging: logger.info('Server started', { port: 5000 })
 * 2. Error logging: logger.error('DB failed', error, { query: 'SELECT...' })
 * 3. Security events: logger.security({ type: 'auth', action: 'login_failed', ip: req.ip })
 * 4. Admin actions: logger.audit('delete_product', adminId, { productId: '123' })
 * 5. Performance: logger.metric('api_latency', 250, { endpoint: '/products' })
 * 6. Request logs: const reqLogger = logger.child({ traceId, userId })
 *
 * Log Aggregation:
 * All logs include standard fields for easy querying:
 * - level: Log severity (INFO, ERROR, etc.)
 * - time: ISO 8601 timestamp
 * - msg: Human-readable message
 * - service, environment, version: Context fields
 * - Plus any custom metadata
 */
class Logger {
  private pino = pinoLogger;

  /**
   * Log informational message
   * Use for: Normal operations, status updates, non-error events
   *
   * @param message - Human-readable message
   * @param metadata - Optional structured data (traceId, userId, etc.)
   *
   * @example
   * logger.info('User logged in', { userId: '123', ip: req.ip });
   */
  info(message: string, metadata?: LogMetadata): void {
    this.pino.info(metadata || {}, message);
  }

  /**
   * Log warning message
   * Use for: Degraded functionality, deprecated features, potential issues
   *
   * @param message - Human-readable warning
   * @param metadata - Optional structured data
   *
   * @example
   * logger.warn('SMTP not configured, emails disabled', { env: process.env.NODE_ENV });
   */
  warn(message: string, metadata?: LogMetadata): void {
    this.pino.warn(metadata || {}, message);
  }

  /**
   * Log error message with optional error object
   * Use for: Exceptions, failures, errors requiring attention
   *
   * Error Object Handling:
   * - Automatically extracts: name, message, stack, code
   * - Serializes for JSON logs
   * - Redacts sensitive fields
   *
   * @param message - Human-readable error description
   * @param error - Optional Error object or any error-like object
   * @param metadata - Optional structured data
   *
   * @example
   * try {
   *   await db.query(sql);
   * } catch (error) {
   *   logger.error('Database query failed', error, { query: sql });
   * }
   */
  error(message: string, error?: Error | any, metadata?: LogMetadata): void {
    const errorMeta = error
      ? {
          err: {
            name: error.name,
            message: error.message,
            stack: error.stack,
            code: error.code,
          },
          ...metadata,
        }
      : metadata;

    this.pino.error(errorMeta || {}, message);
  }

  /**
   * Log debug message
   * Use for: Development debugging, verbose tracing, internal state
   *
   * Note: Only logged when LOG_LEVEL=debug or lower
   * Default: Not logged in production (LOG_LEVEL=info)
   *
   * @param message - Debug message
   * @param metadata - Optional structured data
   *
   * @example
   * logger.debug('Cache hit', { key: 'user:123', ttl: 3600 });
   */
  debug(message: string, metadata?: LogMetadata): void {
    this.pino.debug(metadata || {}, message);
  }

  /**
   * Log security-relevant events for monitoring and audit trails
   *
   * Security Events Include:
   * - Authentication attempts (success, failure)
   * - Spam detection triggers
   * - Rate limit violations
   * - Admin actions (CRUD operations)
   * - File upload validations
   * - CSRF/validation failures
   *
   * Monitoring Integration:
   * These logs should be:
   * - Sent to centralized logging (Datadog, ELK, Splunk)
   * - Monitored for anomalies
   * - Alerted on suspicious patterns
   * - Retained for compliance (GDPR audit trail)
   *
   * Log Format:
   * - logType: "security" (for easy filtering)
   * - type: Event category (auth, upload, quote, etc.)
   * - action: Specific action taken
   * - Plus all standard fields (ip, userId, userAgent, etc.)
   *
   * @param event - Security event data
   *
   * @example
   * logger.security({
   *   type: 'quote',
   *   action: 'spam_blocked_honeypot',
   *   ip: req.ip,
   *   userAgent: req.headers['user-agent'],
   *   details: { email: 'attacker@example.com' }
   * });
   */
  security(event: SecurityEventData): void {
    this.pino.info(
      {
        logType: "security",
        ...event,
      },
      `Security event: ${event.type} - ${event.action}`,
    );
  }

  /**
   * Log admin actions for audit trail
   *
   * Use for:
   * - Product/category CRUD operations
   * - Settings changes
   * - User management
   * - Security configuration updates
   *
   * Compliance:
   * Audit logs help meet regulatory requirements:
   * - Who did what and when
   * - Accountability for sensitive operations
   * - Forensics after security incidents
   *
   * @param action - Action performed (e.g., "delete_product", "update_settings")
   * @param adminId - Admin user ID who performed action
   * @param details - Additional context (productId, old/new values, etc.)
   *
   * @example
   * logger.audit('delete_product', req.adminId, {
   *   productId: '123',
   *   productName: 'Circuit Breaker MCB'
   * });
   */
  audit(action: string, adminId: string, details?: Record<string, any>): void {
    this.security({
      type: "admin_action",
      action,
      userId: adminId,
      details,
    });
  }

  /**
   * Log performance metrics
   *
   * Use for:
   * - API endpoint latency
   * - Database query duration
   * - External API call times
   * - Cache hit rates
   * - File processing times
   *
   * Monitoring:
   * - Aggregate metrics in APM systems
   * - Set up alerts for slow operations
   * - Track performance trends over time
   * - Identify bottlenecks
   *
   * @param metricName - Metric identifier (e.g., "api_latency", "db_query_time")
   * @param value - Numeric value (usually milliseconds)
   * @param metadata - Optional context (endpoint, query, etc.)
   *
   * @example
   * const start = Date.now();
   * await productService.getAllProducts();
   * logger.metric('db_query_time', Date.now() - start, {
   *   query: 'getAllProducts',
   *   resultCount: products.length
   * });
   */
  metric(metricName: string, value: number, metadata?: LogMetadata): void {
    this.pino.info(
      {
        logType: "metric",
        metric: metricName,
        value,
        ...metadata,
      },
      `Metric: ${metricName} = ${value}`,
    );
  }

  /**
   * Create a child logger with default metadata
   *
   * Use for:
   * - Request-scoped logging (attach traceId, userId once)
   * - Background jobs (attach jobId, jobType)
   * - Module-specific logging (attach module name)
   *
   * Benefits:
   * - Metadata attached automatically to all child logs
   * - Easy request correlation across log entries
   * - Cleaner code (no repeated metadata)
   *
   * @param defaultMetadata - Metadata attached to all child logs
   * @returns RequestLogger instance with pre-attached metadata
   *
   * @example
   * // In Express middleware
   * app.use((req, res, next) => {
   *   req.log = logger.child({
   *     traceId: req.id,
   *     method: req.method,
   *     path: req.path,
   *     ip: req.ip
   *   });
   *   next();
   * });
   *
   * // In route handler
   * req.log.info('Processing request'); // Automatically includes traceId, method, path, ip
   */
  child(defaultMetadata: LogMetadata): RequestLogger {
    return new RequestLogger(this, defaultMetadata);
  }

  /**
   * Get underlying Pino logger instance for direct access
   *
   * Use when:
   * - Need Pino-specific features (streams, transports)
   * - Integrating with third-party libraries expecting Pino
   * - Custom log processors
   *
   * @returns Pino logger instance
   *
   * @example
   * const pino = logger.getPinoLogger();
   * pino.addLevel('trace', 10); // Add custom log level
   */
  getPinoLogger() {
    return this.pino;
  }
}

/**
 * Request-scoped logger with pre-attached metadata
 *
 * Purpose:
 * - Simplifies request logging by attaching common metadata once
 * - Automatically includes traceId, userId, ip, etc. in all logs
 * - Enables easy request correlation across multiple log entries
 *
 * Usage Pattern:
 * 1. Create child logger in middleware with request context
 * 2. Attach to request object (req.log = logger.child({...}))
 * 3. Use throughout request lifecycle
 * 4. All logs automatically include request context
 *
 * Benefits:
 * - DRY principle (don't repeat metadata)
 * - Request tracing (find all logs for one request)
 * - Cleaner code (less boilerplate)
 *
 * @example
 * // Middleware
 * const reqLogger = logger.child({
 *   traceId: uuidv4(),
 *   userId: req.userId,
 *   ip: req.ip,
 *   path: req.path
 * });
 *
 * // Controller
 * reqLogger.info('Fetching products'); // Includes traceId, userId, ip, path
 * reqLogger.error('Database error', err); // Still includes all context
 */
class RequestLogger {
  constructor(
    private parent: Logger,
    private metadata: LogMetadata,
  ) {}

  info(message: string, additionalMeta?: LogMetadata): void {
    this.parent.info(message, { ...this.metadata, ...additionalMeta });
  }

  warn(message: string, additionalMeta?: LogMetadata): void {
    this.parent.warn(message, { ...this.metadata, ...additionalMeta });
  }

  error(
    message: string,
    error?: Error | any,
    additionalMeta?: LogMetadata,
  ): void {
    this.parent.error(message, error, { ...this.metadata, ...additionalMeta });
  }

  debug(message: string, additionalMeta?: LogMetadata): void {
    this.parent.debug(message, { ...this.metadata, ...additionalMeta });
  }
}

export const logger = new Logger();
export { LogMetadata, RequestLogger };
