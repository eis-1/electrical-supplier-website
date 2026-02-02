/*
  Warnings:

  - Added the required column `createdDay` to the `quote_requests` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_quote_requests" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "company" TEXT,
    "phone" TEXT NOT NULL,
    "whatsapp" TEXT,
    "email" TEXT NOT NULL,
    "productName" TEXT,
    "quantity" TEXT,
    "projectDetails" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "notes" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdDay" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
-- Copy existing data and populate createdDay from createdAt (format: YYYY-MM-DD)
-- createdAt is stored as Unix timestamp in milliseconds (integer)
INSERT INTO "new_quote_requests" ("id", "name", "company", "phone", "whatsapp", "email", "productName", "quantity", "projectDetails", "status", "notes", "ipAddress", "userAgent", "createdDay", "createdAt", "updatedAt")
SELECT
  "id",
  "name",
  "company",
  "phone",
  "whatsapp",
  "email",
  "productName",
  "quantity",
  "projectDetails",
  "status",
  "notes",
  "ipAddress",
  "userAgent",
  strftime('%Y-%m-%d', "createdAt" / 1000, 'unixepoch') as "createdDay",
  "createdAt",
  "updatedAt"
FROM "quote_requests";
DROP TABLE "quote_requests";
ALTER TABLE "new_quote_requests" RENAME TO "quote_requests";
CREATE INDEX "quote_requests_status_idx" ON "quote_requests"("status");
CREATE INDEX "quote_requests_createdAt_idx" ON "quote_requests"("createdAt");
CREATE INDEX "quote_requests_email_idx" ON "quote_requests"("email");
CREATE INDEX "quote_requests_status_createdAt_idx" ON "quote_requests"("status", "createdAt");
CREATE UNIQUE INDEX "quote_requests_email_phone_createdDay_key" ON "quote_requests"("email", "phone", "createdDay");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
