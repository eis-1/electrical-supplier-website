import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

interface EnvConfig {
  NODE_ENV: string;
  PORT: number;
  API_VERSION: string;
  DATABASE_URL: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  CORS_ORIGIN: string;
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
  ALLOWED_IMAGE_TYPES: string[];
  ALLOWED_DOC_TYPES: string[];
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX_REQUESTS: number;
  QUOTE_RATE_LIMIT_WINDOW_MS: number;
  QUOTE_RATE_LIMIT_MAX_REQUESTS: number;
  BCRYPT_ROUNDS: number;
}

const getEnvVar = (key: string, defaultValue?: string): string => {
  const value = process.env[key] || defaultValue;
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
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
  NODE_ENV: getEnvVar('NODE_ENV', 'development'),
  PORT: getEnvNumber('PORT', 5000),
  API_VERSION: getEnvVar('API_VERSION', 'v1'),
  DATABASE_URL: getEnvVar('DATABASE_URL'),
  JWT_SECRET: getEnvVar('JWT_SECRET'),
  JWT_EXPIRES_IN: getEnvVar('JWT_EXPIRES_IN', '7d'),
  CORS_ORIGIN: getEnvVar('CORS_ORIGIN', 'http://localhost:5173'),
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
  ALLOWED_IMAGE_TYPES: getEnvVar('ALLOWED_IMAGE_TYPES', 'image/jpeg,image/png,image/webp').split(','),
  ALLOWED_DOC_TYPES: getEnvVar('ALLOWED_DOC_TYPES', 'application/pdf').split(','),
  RATE_LIMIT_WINDOW_MS: getEnvNumber('RATE_LIMIT_WINDOW_MS', 900000), // 15 min
  RATE_LIMIT_MAX_REQUESTS: getEnvNumber('RATE_LIMIT_MAX_REQUESTS', 100),
  QUOTE_RATE_LIMIT_WINDOW_MS: getEnvNumber('QUOTE_RATE_LIMIT_WINDOW_MS', 3600000), // 1 hour
  QUOTE_RATE_LIMIT_MAX_REQUESTS: getEnvNumber('QUOTE_RATE_LIMIT_MAX_REQUESTS', 5),
  BCRYPT_ROUNDS: getEnvNumber('BCRYPT_ROUNDS', 10),
};

export const isDevelopment = env.NODE_ENV === 'development';
export const isProduction = env.NODE_ENV === 'production';
