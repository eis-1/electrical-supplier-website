-- Add 2FA fields to admins table
ALTER TABLE "admins" ADD COLUMN "twoFactorSecret" TEXT;
ALTER TABLE "admins" ADD COLUMN "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "admins" ADD COLUMN "backupCodes" TEXT;
