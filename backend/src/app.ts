import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';
import { apiLimiter } from './middlewares/rateLimit.middleware';
import { logger } from './utils/logger';

// Import routes
import authRoutes from './modules/auth/routes';
import categoryRoutes from './modules/category/routes';
import brandRoutes from './modules/brand/routes';
import productRoutes from './modules/product/routes';
import quoteRoutes from './modules/quote/routes';
import uploadRoutes from './routes/upload.routes';

export const createApp = (): Application => {
  const app = express();

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    // Removed crossOriginResourcePolicy as it is not recognized
  }));

  // CORS configuration
  app.use(cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Rate limiting
  app.use(`/api/${env.API_VERSION}`, apiLimiter);

  // Health check endpoint
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API routes
  const apiPrefix = `/api/${env.API_VERSION}`;
  
  app.use(`${apiPrefix}/auth`, authRoutes);
  app.use(`${apiPrefix}/categories`, categoryRoutes);
  app.use(`${apiPrefix}/brands`, brandRoutes);
  app.use(`${apiPrefix}/products`, productRoutes);
  app.use(`${apiPrefix}/quotes`, quoteRoutes);
  app.use(`${apiPrefix}/upload`, uploadRoutes);

  // Static files for uploads
  app.use('/uploads', express.static(env.UPLOAD_DIR));

  // Serve frontend static files (if built)
  const frontendDistPath = path.join(__dirname, '../../frontend/dist');
  console.log(`📂 Serving static files from: ${frontendDistPath}`);
  app.use(express.static(frontendDistPath));

  // Handle React Router - send all non-API/non-static requests to index.html
  // This must come AFTER static file middleware and BEFORE error handlers
  app.use((req, res, next) => {
    // Skip API routes, uploads, health check, and files with extensions (static assets)
    if (
      req.path.startsWith('/api') || 
      req.path.startsWith('/uploads') || 
      req.path.startsWith('/health') ||
      req.path.match(/\.\w+$/) // Has file extension (like .js, .css, .png, etc.)
    ) {
      return next();
    }
    
    // Serve index.html for all other routes (SPA routing)
    res.sendFile(path.join(frontendDistPath, 'index.html'), (err) => {
      if (err) {
        next(err);
      }
    });
  });

  // Error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  logger.info('Express app configured successfully');

  return app;
};
