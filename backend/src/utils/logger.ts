type LogLevel = 'info' | 'warn' | 'error' | 'debug' | 'security';

interface SecurityEventData {
  type: 'auth' | 'upload' | 'quote' | 'admin_action' | 'rate_limit' | 'validation' | 'captcha' | 'csrf';
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

class Logger {
  private getTimestamp(): string {
    return new Date().toISOString();
  }

  /**
   * Check if we should output structured JSON logs (for production log aggregation)
   */
  private isStructuredLogging(): boolean {
    return process.env.LOG_FORMAT === 'json' || process.env.NODE_ENV === 'production';
  }

  /**
   * Output structured JSON log (for ELK, DataDog, Splunk, etc.)
   */
  private outputStructuredLog(level: LogLevel, message: string, metadata?: LogMetadata): void {
    const logEntry = {
      timestamp: this.getTimestamp(),
      level: level.toUpperCase(),
      message,
      service: 'electrical-supplier-api',
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      ...metadata,
    };
    console.log(JSON.stringify(logEntry));
  }

  /**
   * Output human-readable log (for development)
   */
  private formatMessage(level: LogLevel, message: string, metadata?: LogMetadata): string {
    const timestamp = this.getTimestamp();
    const metaStr = metadata ? ' ' + JSON.stringify(metadata) : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
  }

  info(message: string, metadata?: LogMetadata): void {
    if (this.isStructuredLogging()) {
      this.outputStructuredLog('info', message, metadata);
    } else {
      console.log(this.formatMessage('info', message, metadata));
    }
  }

  warn(message: string, metadata?: LogMetadata): void {
    if (this.isStructuredLogging()) {
      this.outputStructuredLog('warn', message, metadata);
    } else {
      console.warn(this.formatMessage('warn', message, metadata));
    }
  }

  error(message: string, error?: Error | any, metadata?: LogMetadata): void {
    const errorMeta = error ? {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: error.code,
      },
      ...metadata,
    } : metadata;

    if (this.isStructuredLogging()) {
      this.outputStructuredLog('error', message, errorMeta);
    } else {
      console.error(this.formatMessage('error', message, errorMeta));
    }
  }

  debug(message: string, metadata?: LogMetadata): void {
    if (process.env.NODE_ENV === 'development') {
      if (this.isStructuredLogging()) {
        this.outputStructuredLog('debug', message, metadata);
      } else {
        console.debug(this.formatMessage('debug', message, metadata));
      }
    }
  }

  /**
   * Log security-relevant events for monitoring and audit trails.
   * These logs should be sent to a centralized logging system in production.
   */
  security(event: SecurityEventData): void {
    const logData = {
      timestamp: this.getTimestamp(),
      level: 'SECURITY',
      service: 'electrical-supplier-api',
      environment: process.env.NODE_ENV || 'development',
      ...event,
    };
    console.log(JSON.stringify(logData));
  }

  /**
   * Log admin actions for audit trail.
   */
  audit(action: string, adminId: string, details?: Record<string, any>): void {
    this.security({
      type: 'admin_action',
      action,
      userId: adminId,
      details,
    });
  }

  /**
   * Log performance metrics (request duration, DB query time, etc.)
   */
  metric(metricName: string, value: number, metadata?: LogMetadata): void {
    const metricData = {
      timestamp: this.getTimestamp(),
      level: 'METRIC',
      service: 'electrical-supplier-api',
      environment: process.env.NODE_ENV || 'development',
      metric: metricName,
      value,
      ...metadata,
    };
    console.log(JSON.stringify(metricData));
  }

  /**
   * Create a child logger with default metadata (useful for request-scoped logging)
   */
  child(defaultMetadata: LogMetadata): RequestLogger {
    return new RequestLogger(this, defaultMetadata);
  }
}

/**
 * Request-scoped logger with pre-attached metadata (traceId, userId, etc.)
 */
class RequestLogger {
  constructor(
    private parent: Logger,
    private metadata: LogMetadata
  ) {}

  info(message: string, additionalMeta?: LogMetadata): void {
    this.parent.info(message, { ...this.metadata, ...additionalMeta });
  }

  warn(message: string, additionalMeta?: LogMetadata): void {
    this.parent.warn(message, { ...this.metadata, ...additionalMeta });
  }

  error(message: string, error?: Error | any, additionalMeta?: LogMetadata): void {
    this.parent.error(message, error, { ...this.metadata, ...additionalMeta });
  }

  debug(message: string, additionalMeta?: LogMetadata): void {
    this.parent.debug(message, { ...this.metadata, ...additionalMeta });
  }
}

export const logger = new Logger();
export { LogMetadata, RequestLogger };
