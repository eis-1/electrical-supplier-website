/**
 * Database Configuration
 *
 * Prisma ORM client initialization with singleton pattern.
 *
 * **Singleton Pattern:**
 * Ensures only one Prisma Client instance exists throughout application lifecycle.
 * Critical for:
 * - Connection pooling (Prisma manages internal connection pool)
 * - Memory efficiency (avoids multiple client instances)
 * - Hot reload support in development (prevents connection leaks)
 *
 * **Development Mode:**
 * - Stores client in global scope to survive hot reloads
 * - Next.js/Nodemon can trigger multiple module loads
 * - Global assignment prevents connection pool exhaustion
 *
 * **Production Mode:**
 * - Creates new client instance on each deploy
 * - No global assignment needed (single initialization)
 *
 * **Logging:**
 * - error: Logs query errors
 * - warn: Logs warnings (slow queries, etc.)
 * - info, query: Disabled by default for performance
 *
 * **Connection Management:**
 * - connectDatabase(): Called on server startup
 * - disconnectDatabase(): Called on graceful shutdown (SIGTERM, SIGINT)
 * - $connect() is lazy - first query triggers actual connection
 *
 * @see {@link https://www.prisma.io/docs/guides/performance-and-optimization/connection-management Prisma Connection Management}
 * @module DatabaseConfig
 */

import { PrismaClient } from "@prisma/client";
import { logger } from "../utils/logger";

/**
 * Prisma Client Singleton Factory
 * Creates Prisma Client instance with logging configuration
 */
const prismaClientSingleton = () => {
  return new PrismaClient({
    log: ["error", "warn"],
  });
};

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

export const prisma = globalThis.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prisma;
}

// Connect to database
export const connectDatabase = async (): Promise<void> => {
  try {
    await prisma.$connect();
    logger.info("✓ Database connected successfully");
  } catch (error) {
    if (error instanceof Error) {
      logger.error("✗ Database connection failed:", {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });
    } else {
      logger.error("✗ Database connection failed:", error);
    }
    process.exit(1);
  }
};

// Disconnect from database
export const disconnectDatabase = async (): Promise<void> => {
  try {
    await prisma.$disconnect();
    logger.info("Database disconnected");
  } catch (error) {
    logger.error("Error disconnecting database:", error);
  }
};
