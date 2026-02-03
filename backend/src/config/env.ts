import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { AppError } from "../middlewares/error.middleware";

/**
 * Environment Configuration Loader
 *
 * Purpose:
 * - Load and validate environment variables
 * - Provide type-safe access to configuration
 * - Support multiple .env file locations
 * - Set sensible defaults for optional values
 *
 * .env File Loading Strategy:
 * Tries locations in order:
 * 1. ./backend/.env (when running from backend folder)
 * 2. ./.env (when running from repo root)
 * 3. ../.env (when running from subdirectory)
 * 4. ../../.env (nested subdirectories)
 *
 * This flexible approach supports:
 * - Running backend independently
 * - Running from docker-compose (repo root)
 * - Running tests from various locations
 *
 * Usage:
 * @example
 * import { env } from './config/env';
 *
 * const port = env.PORT; // Type-safe number
 * const isDev = env.NODE_ENV === 'development';
 * const secret = env.JWT_SECRET; // Required, will error if missing
 */

// Load environment variables from .env file
// Tries multiple locations to support different execution contexts
const envCandidates = [
  path.resolve(process.cwd(), ".env"), // Current working directory
  path.resolve(process.cwd(), "../.env"), // Parent directory
  path.resolve(__dirname, "../../.env"), // Relative to this file
  path.resolve(__dirname, "../../../.env"), // Repo root
];

for (const candidate of envCandidates) {
  if (fs.existsSync(candidate)) {
    dotenv.config({ path: candidate });
    break;
  }
}

/**
 * Environment configuration interface
 *
 * All configuration values with types and descriptions.
 * Required values will cause startup error if missing.
 * Optional values have sensible defaults.
 */
interface EnvConfig {
  NODE_ENV: "development" | "production" | "test";
  TRUST_PROXY: boolean;
  PORT: number;
  API_VERSION: string;
  DATABASE_URL: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  JWT_REFRESH_SECRET: string;
  JWT_REFRESH_EXPIRES_IN: string;
  COOKIE_SECRET: string;
  CORS_ORIGIN: string;
  REDIS_URL?: string;
  CAPTCHA_SITE_KEY?: string;
  CAPTCHA_SECRET_KEY?: string;
  SMTP_HOST: string;
  SMTP_PORT: number;
  SMTP_SECURE: boolean;
  SMTP_USER: string;
  SMTP_PASS: string;
  EMAIL_FROM: string;
  ADMIN_EMAIL: string;
  COMPANY_NAME: string;
  COMPANY_PHONE: string;
  COMPANY_WHATSAPP: string;
  COMPANY_ADDRESS: string;
  UPLOAD_DIR: string;
  MAX_FILE_SIZE: number;
  MAX_FILES_PER_UPLOAD: number;
  ALLOWED_IMAGE_TYPES: string[];
  ALLOWED_DOC_TYPES: string[];
  // Storage configuration
  STORAGE_PROVIDER: "local" | "s3" | "r2";
  S3_REGION: string;
  S3_BUCKET: string;
  S3_ACCESS_KEY_ID: string;
  S3_SECRET_ACCESS_KEY: string;
  S3_ENDPOINT?: string;
  S3_PUBLIC_URL?: string;
  S3_PUBLIC_BUCKET: boolean;
  // Malware scanning
  MALWARE_SCAN_PROVIDER: "none" | "virustotal" | "clamav";
  MALWARE_SCAN_FAIL_MODE: "fail_open" | "fail_closed";
  VIRUSTOTAL_API_KEY?: string;
  CLAMAV_HOST?: string;
  CLAMAV_PORT?: number;
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX_REQUESTS: number;
  AUTH_RATE_LIMIT_WINDOW_MS: number;
  AUTH_RATE_LIMIT_MAX_REQUESTS: number;
  TWO_FACTOR_RATE_LIMIT_WINDOW_MS: number;
  TWO_FACTOR_RATE_LIMIT_MAX_REQUESTS: number;
  QUOTE_RATE_LIMIT_WINDOW_MS: number;
  QUOTE_RATE_LIMIT_MAX_REQUESTS: number;
  QUOTE_DEDUP_WINDOW_MS: number;
  QUOTE_MAX_PER_EMAIL_PER_DAY: number;
  BCRYPT_ROUNDS: number;
  // Pagination limits (Phase 2 - Prevent overflow)
  MAX_PAGE_SIZE: number;
  DEFAULT_PAGE_SIZE: number;
  MAX_QUERY_RESULTS: number;
}

const INSECURE_DEFAULTS = [
  "fallback-refresh-secret-change-in-production",
  "cookie-secret-key-change-in-production",
  "dev-jwt-secret-change-me",
  "your-super-secret-jwt-key",
  "change-me",
  "changeme",
];

const getEnvVar = (key: string, defaultValue?: string): string => {
  const value = process.env[key];
  if (value !== undefined) {
    return value;
  }
  if (defaultValue !== undefined) {
    return defaultValue;
  }
  throw new AppError(500, `Missing required environment variable: ${key}`);
};

const getSecureEnvVar = (
  key: string,
  defaultValue: string,
  minLength = 32,
): string => {
  const value = process.env[key] || defaultValue;

  // Never allow empty secrets (even in development)
  if (!value || value.trim().length === 0) {
    throw new AppError(500, `Missing required environment variable: ${key}`);
  }

  // In production, enforce secure secrets
  if (process.env.NODE_ENV === "production") {
    if (INSECURE_DEFAULTS.includes(value.toLowerCase())) {
      throw new AppError(
        500,
        `SECURITY ERROR: ${key} is using an insecure default value. ` +
          `Set a strong secret (min ${minLength} characters) in production.`,
      );
    }
    if (value.length < minLength) {
      throw new AppError(
        500,
        `SECURITY ERROR: ${key} must be at least ${minLength} characters in production. Current: ${value.length}`,
      );
    }
  }

  return value;
};

const getEnvNumber = (key: string, defaultValue: number): number => {
  const value = process.env[key];
  return value ? parseInt(value, 10) : defaultValue;
};

const getEnvBoolean = (key: string, defaultValue: boolean): boolean => {
  const value = process.env[key];
  return value ? value === "true" : defaultValue;
};

export const env: EnvConfig = {
  NODE_ENV: getEnvVar("NODE_ENV", "development") as
    | "development"
    | "production"
    | "test",
  // Trust X-Forwarded-* headers only when you actually run behind a reverse proxy.
  // Defaults to true in production/test (common in deploy + keeps tests deterministic),
  // false in development to avoid IP spoofing via client-sent headers.
  TRUST_PROXY: getEnvBoolean(
    "TRUST_PROXY",
    (process.env.NODE_ENV || "development") !== "development",
  ),
  PORT: getEnvNumber("PORT", 5000),
  API_VERSION: getEnvVar("API_VERSION", "v1"),
  DATABASE_URL: getEnvVar("DATABASE_URL"),
  JWT_SECRET: getSecureEnvVar("JWT_SECRET", "dev-jwt-secret-change-me", 32),
  JWT_EXPIRES_IN: getEnvVar("JWT_EXPIRES_IN", "15m"),
  JWT_REFRESH_SECRET: getSecureEnvVar(
    "JWT_REFRESH_SECRET",
    "fallback-refresh-secret-change-in-production",
    32,
  ),
  JWT_REFRESH_EXPIRES_IN: getEnvVar("JWT_REFRESH_EXPIRES_IN", "7d"),
  COOKIE_SECRET: getSecureEnvVar(
    "COOKIE_SECRET",
    "cookie-secret-key-change-in-production",
    32,
  ),
  CORS_ORIGIN: getEnvVar("CORS_ORIGIN", "http://localhost:5173"),
  REDIS_URL: getEnvVar("REDIS_URL", ""),
  CAPTCHA_SITE_KEY: getEnvVar("CAPTCHA_SITE_KEY", ""),
  CAPTCHA_SECRET_KEY: getEnvVar("CAPTCHA_SECRET_KEY", ""),
  SMTP_HOST: getEnvVar("SMTP_HOST", "smtp.gmail.com"),
  SMTP_PORT: getEnvNumber("SMTP_PORT", 587),
  SMTP_SECURE: getEnvBoolean("SMTP_SECURE", false),
  SMTP_USER: getEnvVar("SMTP_USER", ""),
  SMTP_PASS: getEnvVar("SMTP_PASS", ""),
  EMAIL_FROM: getEnvVar("EMAIL_FROM", "noreply@example.com"),
  ADMIN_EMAIL: getEnvVar("ADMIN_EMAIL", "admin@example.com"),
  COMPANY_NAME: getEnvVar("COMPANY_NAME", "Electrical Supplier"),
  COMPANY_PHONE: getEnvVar("COMPANY_PHONE", "+1-234-567-8900"),
  COMPANY_WHATSAPP: getEnvVar("COMPANY_WHATSAPP", "+1-234-567-8900"),
  COMPANY_ADDRESS: getEnvVar(
    "COMPANY_ADDRESS",
    "123 Business St, City, State, ZIP",
  ),
  UPLOAD_DIR: getEnvVar("UPLOAD_DIR", "./uploads"),
  MAX_FILE_SIZE: getEnvNumber("MAX_FILE_SIZE", 5242880), // 5MB
  MAX_FILES_PER_UPLOAD: getEnvNumber("MAX_FILES_PER_UPLOAD", 10),
  ALLOWED_IMAGE_TYPES: getEnvVar(
    "ALLOWED_IMAGE_TYPES",
    "image/jpeg,image/png,image/webp",
  ).split(","),
  ALLOWED_DOC_TYPES: getEnvVar("ALLOWED_DOC_TYPES", "application/pdf").split(
    ",",
  ),
  // Storage configuration
  STORAGE_PROVIDER: getEnvVar("STORAGE_PROVIDER", "local") as
    | "local"
    | "s3"
    | "r2",
  S3_REGION: getEnvVar("S3_REGION", "us-east-1"),
  S3_BUCKET: getEnvVar("S3_BUCKET", "uploads"),
  S3_ACCESS_KEY_ID: getEnvVar("S3_ACCESS_KEY_ID", ""),
  S3_SECRET_ACCESS_KEY: getEnvVar("S3_SECRET_ACCESS_KEY", ""),
  S3_ENDPOINT: getEnvVar("S3_ENDPOINT", ""),
  S3_PUBLIC_URL: getEnvVar("S3_PUBLIC_URL", ""),
  S3_PUBLIC_BUCKET: getEnvBoolean("S3_PUBLIC_BUCKET", true),
  // Malware scanning
  MALWARE_SCAN_PROVIDER: getEnvVar("MALWARE_SCAN_PROVIDER", "none") as
    | "none"
    | "virustotal"
    | "clamav",
  MALWARE_SCAN_FAIL_MODE: getEnvVar("MALWARE_SCAN_FAIL_MODE", "fail_open") as
    | "fail_open"
    | "fail_closed",
  VIRUSTOTAL_API_KEY: getEnvVar("VIRUSTOTAL_API_KEY", ""),
  CLAMAV_HOST: getEnvVar("CLAMAV_HOST", ""),
  CLAMAV_PORT: getEnvNumber("CLAMAV_PORT", 8080),
  RATE_LIMIT_WINDOW_MS: getEnvNumber("RATE_LIMIT_WINDOW_MS", 900000), // 15 min
  RATE_LIMIT_MAX_REQUESTS: getEnvNumber("RATE_LIMIT_MAX_REQUESTS", 100),
  AUTH_RATE_LIMIT_WINDOW_MS: getEnvNumber(
    "AUTH_RATE_LIMIT_WINDOW_MS",
    15 * 60 * 1000,
  ),
  AUTH_RATE_LIMIT_MAX_REQUESTS: getEnvNumber("AUTH_RATE_LIMIT_MAX_REQUESTS", 5),
  TWO_FACTOR_RATE_LIMIT_WINDOW_MS: getEnvNumber(
    "TWO_FACTOR_RATE_LIMIT_WINDOW_MS",
    5 * 60 * 1000,
  ),
  TWO_FACTOR_RATE_LIMIT_MAX_REQUESTS: getEnvNumber(
    "TWO_FACTOR_RATE_LIMIT_MAX_REQUESTS",
    5,
  ),
  QUOTE_RATE_LIMIT_WINDOW_MS: getEnvNumber(
    "QUOTE_RATE_LIMIT_WINDOW_MS",
    3600000,
  ), // 1 hour
  QUOTE_RATE_LIMIT_MAX_REQUESTS: getEnvNumber(
    "QUOTE_RATE_LIMIT_MAX_REQUESTS",
    5,
  ),
  // Anti-spam (additional to rate limiting)
  QUOTE_DEDUP_WINDOW_MS: getEnvNumber("QUOTE_DEDUP_WINDOW_MS", 10 * 60 * 1000), // 10 minutes
  QUOTE_MAX_PER_EMAIL_PER_DAY: getEnvNumber("QUOTE_MAX_PER_EMAIL_PER_DAY", 5),
  BCRYPT_ROUNDS: getEnvNumber("BCRYPT_ROUNDS", 10),
  // Pagination limits (Phase 2 - Prevent overflow attacks)
  MAX_PAGE_SIZE: getEnvNumber("MAX_PAGE_SIZE", 100),
  DEFAULT_PAGE_SIZE: getEnvNumber("DEFAULT_PAGE_SIZE", 12),
  MAX_QUERY_RESULTS: getEnvNumber("MAX_QUERY_RESULTS", 1000),
};

// CORS safety validation
// We allow comma-separated origins via CORS_ORIGIN (e.g. "http://localhost:5173,http://localhost:4173").
// Never allow wildcard in production when credentials are enabled.
if (env.NODE_ENV === "production") {
  const raw = env.CORS_ORIGIN || "";
  const parts = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (parts.includes("*")) {
    throw new AppError(
      500,
      "SECURITY ERROR: CORS_ORIGIN cannot include '*' in production. " +
        "Set explicit allowed origins (comma-separated).",
    );
  }
}

export const isDevelopment = env.NODE_ENV === "development";
export const isProduction = env.NODE_ENV === "production";
