import { createApp } from "./app";
import { env } from "./config/env";
import { connectDatabase, disconnectDatabase } from "./config/db";
import { initRedis, closeRedis } from "./config/redis";
import {
  initializeRateLimiters,
  shutdownRateLimiters,
} from "./middlewares/rateLimit.middleware";
import { initSentry } from "./config/sentry";
import { logger } from "./utils/logger";

const startServer = async () => {
  try {
    // Initialize Sentry FIRST (to catch initialization errors)
    initSentry();

    // Connect to database
    await connectDatabase();

    // Initialize Redis (optional, falls back to in-memory)
    await initRedis();

    // Initialize rate limiters AFTER Redis is ready
    initializeRateLimiters();

    // Create Express app
    const app = createApp();

    // Start server
    const server = app.listen(env.PORT, () => {
      logger.info(`Server running on port ${env.PORT}`, {
        environment: env.NODE_ENV,
        apiVersion: env.API_VERSION,
        url: `http://localhost:${env.PORT}/api/${env.API_VERSION}`,
      });
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, starting graceful shutdown...`);

      // Stop accepting new connections
      server.close(async () => {
        logger.info("HTTP server closed");

        try {
          await shutdownRateLimiters();
          logger.info("Rate limiters shut down");

          // Close Redis connection
          await closeRedis();
          logger.info("Redis connection closed");

          // Close database connection
          await disconnectDatabase();
          logger.info("Database connection closed");

          logger.info("Graceful shutdown complete");
          process.exit(0);
        } catch (error) {
          logger.error("Error during shutdown", error);
          process.exit(1);
        }
      });

      // Force shutdown after 30 seconds
      setTimeout(() => {
        logger.error("Forced shutdown after timeout");
        process.exit(1);
      }, 30000);
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
