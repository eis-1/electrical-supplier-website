import { createApp } from './app';
import { env } from './config/env';
import { connectDatabase } from './config/db';
import { initRedis, closeRedis } from './config/redis';
import { initializeRateLimiters } from './middlewares/rateLimit.middleware';
import { logger } from './utils/logger';

const startServer = async () => {
  try {
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
      logger.info(`🚀 Server running on port ${env.PORT}`);
      logger.info(`📍 Environment: ${env.NODE_ENV}`);
      logger.info(`🌐 API: http://localhost:${env.PORT}/api/${env.API_VERSION}`);
    });

    // Graceful shutdown
    const shutdown = async () => {
      logger.info('Shutting down server...');
      
      // Close Redis connection
      await closeRedis();
      
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
