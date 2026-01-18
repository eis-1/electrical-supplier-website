import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables.
// Preferred: backend/.env (when running from backend folder).
// Fallback: repo-root .env (older docs/scripts).
const envCandidates = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '../.env'),
  path.resolve(__dirname, '../../.env'),
  path.resolve(__dirname, '../../../.env'),
];

for (const candidate of envCandidates) {
  if (fs.existsSync(candidate)) {
    dotenv.config({ path: candidate });
    break;
  }
}

interface EnvConfig {
  NODE_ENV: 'development' | 'production' | 'test';
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
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX_REQUESTS: number;
  QUOTE_RATE_LIMIT_WINDOW_MS: number;
  QUOTE_RATE_LIMIT_MAX_REQUESTS: number;
  QUOTE_DEDUP_WINDOW_MS: number;
  QUOTE_MAX_PER_EMAIL_PER_DAY: number;
  BCRYPT_ROUNDS: number;
}

const INSECURE_DEFAULTS = [
  'fallback-refresh-secret-change-in-production',
  'cookie-secret-key-change-in-production',
  'dev-jwt-secret-change-me',
  'your-super-secret-jwt-key',
  'change-me',
  'changeme',
];

const getEnvVar = (key: string, defaultValue?: string): string => {
  const value = process.env[key];
  if (value !== undefined) {
    return value;
  }
  if (defaultValue !== undefined) {
    return defaultValue;
  }
  throw new Error(`Missing required environment variable: ${key}`);
};

const getSecureEnvVar = (key: string, defaultValue: string, minLength = 32): string => {
  const value = process.env[key] || defaultValue;

  // Never allow empty secrets (even in development)
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  
  // In production, enforce secure secrets
  if (process.env.NODE_ENV === 'production') {
    if (INSECURE_DEFAULTS.includes(value.toLowerCase())) {
      throw new Error(
        `SECURITY ERROR: ${key} is using an insecure default value. ` +
        `Set a strong secret (min ${minLength} characters) in production.`
      );
    }
    if (value.length < minLength) {
      throw new Error(
        `SECURITY ERROR: ${key} must be at least ${minLength} characters in production. Current: ${value.length}`
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
  return value ? value === 'true' : defaultValue;
};

export const env: EnvConfig = {
  NODE_ENV: getEnvVar('NODE_ENV', 'development') as 'development' | 'production' | 'test',
  PORT: getEnvNumber('PORT', 5000),
  API_VERSION: getEnvVar('API_VERSION', 'v1'),
  DATABASE_URL: getEnvVar('DATABASE_URL'),
  JWT_SECRET: getSecureEnvVar('JWT_SECRET', 'dev-jwt-secret-change-me', 32),
  JWT_EXPIRES_IN: getEnvVar('JWT_EXPIRES_IN', '15m'),
  JWT_REFRESH_SECRET: getSecureEnvVar('JWT_REFRESH_SECRET', 'fallback-refresh-secret-change-in-production', 32),
  JWT_REFRESH_EXPIRES_IN: getEnvVar('JWT_REFRESH_EXPIRES_IN', '7d'),
  COOKIE_SECRET: getSecureEnvVar('COOKIE_SECRET', 'cookie-secret-key-change-in-production', 32),
  CORS_ORIGIN: getEnvVar('CORS_ORIGIN', 'http://localhost:5173'),
  REDIS_URL: getEnvVar('REDIS_URL', ''),
  CAPTCHA_SITE_KEY: getEnvVar('CAPTCHA_SITE_KEY', ''),
  CAPTCHA_SECRET_KEY: getEnvVar('CAPTCHA_SECRET_KEY', ''),
  SMTP_HOST: getEnvVar('SMTP_HOST', 'smtp.gmail.com'),
  SMTP_PORT: getEnvNumber('SMTP_PORT', 587),
  SMTP_SECURE: getEnvBoolean('SMTP_SECURE', false),
  SMTP_USER: getEnvVar('SMTP_USER', ''),
  SMTP_PASS: getEnvVar('SMTP_PASS', ''),
  EMAIL_FROM: getEnvVar('EMAIL_FROM', 'noreply@example.com'),
  ADMIN_EMAIL: getEnvVar('ADMIN_EMAIL', 'admin@example.com'),
  COMPANY_NAME: getEnvVar('COMPANY_NAME', 'Electrical Supplier'),
  COMPANY_PHONE: getEnvVar('COMPANY_PHONE', '+1-234-567-8900'),
  COMPANY_WHATSAPP: getEnvVar('COMPANY_WHATSAPP', '+1-234-567-8900'),
  COMPANY_ADDRESS: getEnvVar('COMPANY_ADDRESS', '123 Business St, City, State, ZIP'),
  UPLOAD_DIR: getEnvVar('UPLOAD_DIR', './uploads'),
  MAX_FILE_SIZE: getEnvNumber('MAX_FILE_SIZE', 5242880), // 5MB
  MAX_FILES_PER_UPLOAD: getEnvNumber('MAX_FILES_PER_UPLOAD', 10),
  ALLOWED_IMAGE_TYPES: getEnvVar('ALLOWED_IMAGE_TYPES', 'image/jpeg,image/png,image/webp').split(','),
  ALLOWED_DOC_TYPES: getEnvVar('ALLOWED_DOC_TYPES', 'application/pdf').split(','),
  RATE_LIMIT_WINDOW_MS: getEnvNumber('RATE_LIMIT_WINDOW_MS', 900000), // 15 min
  RATE_LIMIT_MAX_REQUESTS: getEnvNumber('RATE_LIMIT_MAX_REQUESTS', 100),
  QUOTE_RATE_LIMIT_WINDOW_MS: getEnvNumber('QUOTE_RATE_LIMIT_WINDOW_MS', 3600000), // 1 hour
  QUOTE_RATE_LIMIT_MAX_REQUESTS: getEnvNumber('QUOTE_RATE_LIMIT_MAX_REQUESTS', 5),
  // Anti-spam (additional to rate limiting)
  QUOTE_DEDUP_WINDOW_MS: getEnvNumber('QUOTE_DEDUP_WINDOW_MS', 10 * 60 * 1000), // 10 minutes
  QUOTE_MAX_PER_EMAIL_PER_DAY: getEnvNumber('QUOTE_MAX_PER_EMAIL_PER_DAY', 5),
  BCRYPT_ROUNDS: getEnvNumber('BCRYPT_ROUNDS', 10),
};

export const isDevelopment = env.NODE_ENV === 'development';
export const isProduction = env.NODE_ENV === 'production';
