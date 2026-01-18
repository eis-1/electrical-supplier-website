import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import { randomUUID } from 'crypto';
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

  // If running behind a reverse proxy (Nginx/Cloudflare), trust proxy headers.
  // This ensures req.ip and rate limiting use the real client IP.
  app.set('trust proxy', 1);

  // HSTS: Force HTTPS in production (requires HTTPS to be configured)
  if (env.NODE_ENV === 'production') {
    app.use((req, res, next) => {
      // Only set HSTS if the request is already over HTTPS
      if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
        res.setHeader(
          'Strict-Transport-Security',
          'max-age=31536000; includeSubDomains; preload'
        );
      }
      next();
    });
  }

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        scriptSrc: ["'self'"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
      },
    },
    hsts: false, // We handle HSTS manually above
    frameguard: { action: 'deny' },
    noSniff: true,
    xssFilter: true,
  }));

  // CORS configuration
  app.use(cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'x-csrf-token'],
    exposedHeaders: ['x-csrf-token'],
  }));

  // Cookie parser (must come before routes that use cookies)
  app.use(cookieParser(env.COOKIE_SECRET));

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request ID middleware for tracing
  app.use((req: Request, res: Response, next: NextFunction) => {
    const requestId = req.headers['x-request-id'] as string || randomUUID();
    req.headers['x-request-id'] = requestId;
    res.setHeader('X-Request-ID', requestId);
    (req as any).requestId = requestId;
    next();
  });

  // Response compression (production)
  if (env.NODE_ENV === 'production') {
    // Compression is optional - install with: npm install compression @types/compression
    // Uncomment below when dependency is installed:
    // import compression from 'compression';
    // app.use(compression());
  }

  // Prevent indexing of admin/API endpoints even if discovered
  app.use((req, res, next) => {
    if (req.path.startsWith('/admin') || req.path.startsWith('/api')) {
      res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    }
    next();
  });

  // Rate limiting
  app.use(`/api/${env.API_VERSION}`, apiLimiter);

  // Health check endpoint (liveness probe)
  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // Readiness check endpoint (includes dependencies)
  app.get('/ready', async (_req, res) => {
    const isProduction = env.NODE_ENV === 'production';
    const checks = {
      database: 'unknown',
      redis: 'unknown',
    };

    try {
      // Check database connectivity
      const { prisma } = await import('./config/db');
      await prisma.$queryRaw`SELECT 1`;
      checks.database = 'ok';
    } catch (error) {
      checks.database = 'error';
      logger.error('Readiness check: Database error', error);
    }

    try {
      // Check Redis if configured
      const { getRedisClient } = await import('./config/redis');
      const redisClient = getRedisClient();
      if (redisClient) {
        await redisClient.ping();
        checks.redis = 'ok';
      } else {
        checks.redis = 'not_configured';
      }
    } catch (error) {
      checks.redis = 'error';
      logger.error('Readiness check: Redis error', error);
    }

    const allHealthy = checks.database === 'ok' && (checks.redis === 'ok' || checks.redis === 'not_configured');
    const statusCode = allHealthy ? 200 : 503;

    res.status(statusCode).json({
      status: allHealthy ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
      security: {
        hsts: isProduction,
        helmet: true,
        rateLimiting: true,
        jwtExpiry: true,
        uploadValidation: true,
        auditLogging: true,
        requestId: true,
      },
      checks,
    });
  });

  // API routes
  const apiPrefix = `/api/${env.API_VERSION}`;

  app.use(`${apiPrefix}/auth`, authRoutes);
  app.use(`${apiPrefix}/categories`, categoryRoutes);
  app.use(`${apiPrefix}/brands`, brandRoutes);
  app.use(`${apiPrefix}/products`, productRoutes);
  app.use(`${apiPrefix}/quotes`, quoteRoutes);
  app.use(`${apiPrefix}/upload`, uploadRoutes);

  // Static files for uploads (with security headers)
  app.use('/uploads', (req, res, next) => {
    // Security headers for uploaded files
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Content-Security-Policy', "default-src 'none'");

    // Force download for documents (PDFs) to prevent inline execution
    if (req.path.includes('/documents/')) {
      res.setHeader('Content-Disposition', 'attachment');
    }

    next();
  }, express.static(env.UPLOAD_DIR));

  // Serve frontend static files (if built)
  const frontendDistPath = path.join(__dirname, '../../frontend/dist');
  console.log(`📂 Serving static files from: ${frontendDistPath}`);

  // Domain-safe robots.txt and sitemap.xml
  // (Static files may still exist in dist, but these dynamic routes ensure the domain is always correct.)
  app.get('/robots.txt', (req, res) => {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    res.type('text/plain');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.send(
      [
        'User-agent: *',
        'Allow: /',
        '',
        'Disallow: /admin/',
        'Disallow: /api/',
        '',
        `Sitemap: ${baseUrl}/sitemap.xml`,
        '',
      ].join('\n')
    );
  });

  app.get('/sitemap.xml', (req, res) => {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const today = new Date().toISOString().slice(0, 10);
    const urls = [
      { loc: `${baseUrl}/`, changefreq: 'daily', priority: '1.0' },
      { loc: `${baseUrl}/products`, changefreq: 'daily', priority: '0.9' },
      { loc: `${baseUrl}/brands`, changefreq: 'weekly', priority: '0.8' },
      { loc: `${baseUrl}/projects`, changefreq: 'weekly', priority: '0.7' },
      { loc: `${baseUrl}/quote`, changefreq: 'monthly', priority: '0.9' },
      { loc: `${baseUrl}/about`, changefreq: 'monthly', priority: '0.6' },
      { loc: `${baseUrl}/contact`, changefreq: 'monthly', priority: '0.7' },
    ];

    const body = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...urls.map(
        (u) =>
          [
            '  <url>',
            `    <loc>${u.loc}</loc>`,
            `    <lastmod>${today}</lastmod>`,
            `    <changefreq>${u.changefreq}</changefreq>`,
            `    <priority>${u.priority}</priority>`,
            '  </url>',
          ].join('\n')
      ),
      '</urlset>',
      '',
    ].join('\n');

    res.type('application/xml');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.send(body);
  });

  // Serve built frontend assets with sensible caching:
  // - /assets/* (hashed) => 1 year immutable
  // - index.html and non-hashed files => no-cache / revalidate
  app.use(
    express.static(frontendDistPath, {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('index.html')) {
          res.setHeader('Cache-Control', 'no-cache');
          return;
        }

        if (filePath.includes(`${path.sep}assets${path.sep}`)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          return;
        }

        res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
      },
    })
  );

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
    // Ensure admin routes are not indexed.
    if (req.path.startsWith('/admin')) {
      res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    }
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
