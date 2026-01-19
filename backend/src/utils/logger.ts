import pino from "pino";
import pretty from "pino-pretty";

interface SecurityEventData {
  type:
    | "auth"
    | "upload"
    | "quote"
    | "admin_action"
    | "rate_limit"
    | "validation"
    | "captcha"
    | "csrf";
  action: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  details?: Record<string, any>;
}

interface LogMetadata {
  traceId?: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  path?: string;
  method?: string;
  duration?: number;
  [key: string]: any;
}

/**
 * Redact sensitive fields from logs to prevent credential leaks
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
 * - Production: Fast JSON output for log aggregation (ELK, DataDog, Splunk)
 * - Development: Pretty-printed human-readable logs
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
 * Enhanced logger with Pino integration and backward compatibility
 */
class Logger {
  private pino = pinoLogger;

  info(message: string, metadata?: LogMetadata): void {
    this.pino.info(metadata || {}, message);
  }

  warn(message: string, metadata?: LogMetadata): void {
    this.pino.warn(metadata || {}, message);
  }

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

  debug(message: string, metadata?: LogMetadata): void {
    this.pino.debug(metadata || {}, message);
  }

  /**
   * Log security-relevant events for monitoring and audit trails.
   * These logs should be sent to a centralized logging system in production.
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
   * Log admin actions for audit trail.
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
   * Log performance metrics (request duration, DB query time, etc.)
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
   * Create a child logger with default metadata (useful for request-scoped logging)
   */
  child(defaultMetadata: LogMetadata): RequestLogger {
    return new RequestLogger(this, defaultMetadata);
  }

  /**
   * Get underlying Pino logger instance for direct access
   */
  getPinoLogger() {
    return this.pino;
  }
}

/**
 * Request-scoped logger with pre-attached metadata (traceId, userId, etc.)
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
