import express, { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import path from "path";
import { randomUUID } from "crypto";
import pinoHttp from "pino-http";
import { env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middlewares/error.middleware";
import { apiLimiter } from "./middlewares/rateLimit.middleware";
import { logger } from "./utils/logger";

// Import routes
import authRoutes from "./modules/auth/routes";
import categoryRoutes from "./modules/category/routes";
import brandRoutes from "./modules/brand/routes";
import productRoutes from "./modules/product/routes";
import quoteRoutes from "./modules/quote/routes";
import uploadRoutes from "./routes/upload.routes";
import auditRoutes from "./modules/audit/routes";

export const createApp = (): Application => {
  const app = express();

  // If running behind a reverse proxy (Nginx/Cloudflare), trust proxy headers.
  // This ensures req.ip and rate limiting use the real client IP.
  app.set("trust proxy", 1);

  // HTTP request logging with Pino
  // Automatically logs all requests with timing, status, etc.
  const httpLogger = pinoHttp({
    logger: logger.getPinoLogger(),
    customLogLevel: (_req, res, err) => {
      if (res.statusCode >= 400 && res.statusCode < 500) {
        return "warn";
      } else if (res.statusCode >= 500 || err) {
        return "error";
      }
      return "info";
    },
    customSuccessMessage: (req, res) => {
      return `${req.method} ${req.url} ${res.statusCode}`;
    },
    customErrorMessage: (req, res, err) => {
      return `${req.method} ${req.url} ${res.statusCode} - ${err.message}`;
    },
    // Redact sensitive headers and request body fields
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'req.headers["x-api-key"]',
        'req.body.password',
        'req.body.token',
        'req.body.secret',
        'res.headers["set-cookie"]',
      ],
      censor: '[REDACTED]',
    },
    // Don't log health checks to reduce noise
    autoLogging: {
      ignore: (req) => req.url === "/health" || req.url === "/ready",
    },
  });

  app.use(httpLogger);

  // HSTS: Force HTTPS in production (requires HTTPS to be configured)
  if (env.NODE_ENV === "production") {
    app.use((req, res, next) => {
      // Only set HSTS if the request is already over HTTPS
      if (req.secure || req.headers["x-forwarded-proto"] === "https") {
        res.setHeader(
          "Strict-Transport-Security",
          "max-age=31536000; includeSubDomains; preload",
        );
      }
      next();
    });
  }

  // Security middleware
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
          scriptSrc: ["'self'"],
          frameSrc: ["'none'"],
          objectSrc: ["'none'"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          mediaSrc: ["'self'"],
          manifestSrc: ["'self'"],
          workerSrc: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
          baseUri: ["'self'"],
        },
      },
      hsts: false, // We handle HSTS manually above
      frameguard: { action: "deny" },
      noSniff: true,
      xssFilter: true,
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
      permittedCrossDomainPolicies: { permittedPolicies: "none" },
    }),
  );

  // Serve frontend static files BEFORE CORS (static assets don't need CORS)
  // In dev mode (tsx): __dirname = backend/src => ../../frontend/dist
  // In prod mode (compiled): __dirname = backend/dist => ../../frontend/dist
  const frontendDistPath = path.resolve(__dirname, "../../frontend/dist");
  const indexHtmlPath = path.join(frontendDistPath, "index.html");

  // Check if frontend is built
  const frontendExists = require('fs').existsSync(indexHtmlPath);
  if (!frontendExists) {
    logger.warn("Frontend build not found. Run 'npm --prefix frontend run build' to generate it.", {
      expectedPath: frontendDistPath,
    });
  } else {
    logger.info("Serving static files", { path: frontendDistPath });
    // Serve static assets (JS, CSS, images) WITHOUT CORS checks
    app.use(express.static(frontendDistPath, {
      maxAge: env.NODE_ENV === 'production' ? '1y' : 0,
      setHeaders: (res, filepath) => {
        // Only cache assets with hashes, not index.html
        if (filepath.includes('/assets/')) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        } else {
          res.setHeader('Cache-Control', 'no-cache');
        }
      }
    }));
  }

  // CORS configuration (only for API routes, NOT static files)
  const allowedOrigins = (env.CORS_ORIGIN || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (allowedOrigins.length === 0) {
    logger.warn(
      "CORS_ORIGIN is empty. Cross-origin browser requests will be blocked. " +
        "Set CORS_ORIGIN to an explicit origin (or comma-separated list) e.g. http://localhost:5173",
    );
  } else {
    logger.info("CORS allowed origins configured", { origins: allowedOrigins });
  }

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow non-browser clients (no Origin header): curl, Postman, server-to-server
        if (!origin) {
          return callback(null, true);
        }

        // If not configured, behave as same-origin only (block all cross-origin)
        if (allowedOrigins.length === 0) {
          return callback(new Error("CORS: Origin not allowed"));
        }

        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }

        return callback(new Error("CORS: Origin not allowed"));
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: [
        "Content-Type",
        "Authorization",
        "X-CSRF-Token",
        "x-csrf-token",
      ],
      exposedHeaders: ["x-csrf-token"],
    }),
  );

  // Cookie parser (must come before routes that use cookies)
  app.use(cookieParser(env.COOKIE_SECRET));

  // Body parsing middleware with strict size limits to prevent DoS
  // 10kb limit for JSON/form data (sufficient for API requests)
  // File uploads handled separately by multer with higher limits
  app.use(express.json({ limit: "10kb" }));
  app.use(express.urlencoded({ extended: true, limit: "10kb" }));

  // Request ID middleware for tracing
  app.use((req: Request, res: Response, next: NextFunction) => {
    const requestId = (req.headers["x-request-id"] as string) || randomUUID();
    req.headers["x-request-id"] = requestId;
    res.setHeader("X-Request-ID", requestId);
    (req as any).requestId = requestId;
    next();
  });

  // Response compression (production)
  if (env.NODE_ENV === "production") {
    // Compression is optional - install with: npm install compression @types/compression
    // Uncomment below when dependency is installed:
    // import compression from 'compression';
    // app.use(compression());
  }

  // Prevent indexing of admin/API endpoints even if discovered
  app.use((req, res, next) => {
    if (req.path.startsWith("/admin") || req.path.startsWith("/api")) {
      res.setHeader("X-Robots-Tag", "noindex, nofollow");
    }
    next();
  });

  // Rate limiting
  app.use(`/api/${env.API_VERSION}`, apiLimiter);

  // Health check endpoint (liveness probe)
  app.get("/health", (_req, res) => {
    const isProduction = env.NODE_ENV === "production";
    const memUsage = process.memoryUsage();

    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
        rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
      },
      security: {
        hsts: isProduction,
        helmet: true,
        rateLimiting: true,
        requestId: true,
      },
    });
  });

  // Readiness check endpoint (includes dependencies)
  app.get("/ready", async (_req, res) => {
    const isProduction = env.NODE_ENV === "production";
    const checks = {
      database: "unknown",
      redis: "unknown",
    };

    try {
      // Check database connectivity
      const { prisma } = await import("./config/db");
      await prisma.$queryRaw`SELECT 1`;
      checks.database = "ok";
    } catch (error) {
      checks.database = "error";
      logger.error("Readiness check: Database error", error);
    }

    try {
      // Check Redis if configured
      const { getRedisClient } = await import("./config/redis");
      const redisClient = getRedisClient();
      if (redisClient) {
        await redisClient.ping();
        checks.redis = "ok";
      } else {
        checks.redis = "not_configured";
      }
    } catch (error) {
      checks.redis = "error";
      logger.error("Readiness check: Redis error", error);
    }

    const allHealthy =
      checks.database === "ok" &&
      (checks.redis === "ok" || checks.redis === "not_configured");
    const statusCode = allHealthy ? 200 : 503;

    res.status(statusCode).json({
      status: allHealthy ? "ready" : "not_ready",
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
  app.use(`${apiPrefix}/audit-logs`, auditRoutes);

  // Static files for uploads (with security headers)
  app.use(
    "/uploads",
    (req, res, next) => {
      // Security headers for uploaded files
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("X-Frame-Options", "DENY");
      res.setHeader("Content-Security-Policy", "default-src 'none'");

      // Force download for documents (PDFs) to prevent inline execution
      if (req.path.includes("/documents/")) {
        res.setHeader("Content-Disposition", "attachment");
      }

      next();
    },
    express.static(env.UPLOAD_DIR),
  );

  // Domain-safe robots.txt and sitemap.xml
  // (Static files may still exist in dist, but these dynamic routes ensure the domain is always correct.)
  app.get("/robots.txt", (req, res) => {
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    res.type("text/plain");
    res.setHeader("Cache-Control", "public, max-age=300");
    res.send(
      [
        "User-agent: *",
        "Allow: /",
        "",
        "Disallow: /admin/",
        "Disallow: /api/",
        "",
        `Sitemap: ${baseUrl}/sitemap.xml`,
        "",
      ].join("\n"),
    );
  });

  app.get("/sitemap.xml", (req, res) => {
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const today = new Date().toISOString().slice(0, 10);
    const urls = [
      { loc: `${baseUrl}/`, changefreq: "daily", priority: "1.0" },
      { loc: `${baseUrl}/products`, changefreq: "daily", priority: "0.9" },
      { loc: `${baseUrl}/brands`, changefreq: "weekly", priority: "0.8" },
      { loc: `${baseUrl}/projects`, changefreq: "weekly", priority: "0.7" },
      { loc: `${baseUrl}/quote`, changefreq: "monthly", priority: "0.9" },
      { loc: `${baseUrl}/about`, changefreq: "monthly", priority: "0.6" },
      { loc: `${baseUrl}/contact`, changefreq: "monthly", priority: "0.7" },
    ];

    const body = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...urls.map((u) =>
        [
          "  <url>",
          `    <loc>${u.loc}</loc>`,
          `    <lastmod>${today}</lastmod>`,
          `    <changefreq>${u.changefreq}</changefreq>`,
          `    <priority>${u.priority}</priority>`,
          "  </url>",
        ].join("\n"),
      ),
      "</urlset>",
      "",
    ].join("\n");

    res.type("application/xml");
    res.setHeader("Cache-Control", "public, max-age=300");
    res.send(body);
  });

  // Handle React Router - send all non-API/non-static requests to index.html
  // This must come AFTER static file middleware and BEFORE error handlers
  app.use((req, res, next) => {
    // Skip API routes, uploads, health check, and files with extensions (static assets)
    if (
      req.path.startsWith("/api") ||
      req.path.startsWith("/uploads") ||
      req.path.startsWith("/health") ||
      req.path.match(/\.\w+$/) // Has file extension (like .js, .css, .png, etc.)
    ) {
      return next();
    }

    // Serve index.html for all other routes (SPA routing)
    // Ensure admin routes are not indexed.
    if (req.path.startsWith("/admin")) {
      res.setHeader("X-Robots-Tag", "noindex, nofollow");
    }
    res.sendFile(path.join(frontendDistPath, "index.html"), (err) => {
      if (err) {
        next(err);
      }
    });
  });

  // Error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  logger.info("Express app configured successfully");

  return app;
};
