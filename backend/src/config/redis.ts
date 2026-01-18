import { createClient } from 'redis';
import { env } from './env';
import { logger } from '../utils/logger';

let redisClient: ReturnType<typeof createClient> | null = null;

/**
 * Initialize Redis connection if REDIS_URL is configured
 * Falls back to in-memory rate limiting if Redis is not available
 */
export const initRedis = async (): Promise<void> => {
  if (!env.REDIS_URL) {
    logger.info('Redis URL not configured, using in-memory rate limiting');
    return;
  }

  try {
    redisClient = createClient({
      url: env.REDIS_URL,
      socket: {
        connectTimeout: 5000,
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            logger.error('Redis reconnection failed after 10 attempts');
            return new Error('Redis reconnection limit exceeded');
          }
          return Math.min(retries * 100, 3000);
        },
      },
    });

    redisClient.on('error', (err) => {
      logger.error('Redis client error:', err);
    });

    redisClient.on('connect', () => {
      logger.info('Redis client connected');
    });

    redisClient.on('reconnecting', () => {
      logger.warn('Redis client reconnecting...');
    });

    await redisClient.connect();
    logger.info('Redis connection established successfully');
  } catch (error) {
    logger.error('Failed to initialize Redis:', error);
    redisClient = null;
  }
};

/**
 * Get Redis client instance (may be null if not configured or connection failed)
 */
export const getRedisClient = (): ReturnType<typeof createClient> | null => {
  return redisClient;
};

/**
 * Close Redis connection gracefully
 */
export const closeRedis = async (): Promise<void> => {
  if (redisClient) {
    try {
      await redisClient.quit();
      logger.info('Redis connection closed');
    } catch (error) {
      logger.error('Error closing Redis connection:', error);
    }
  }
};
