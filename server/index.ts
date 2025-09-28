import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import cookieParser from "cookie-parser";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ConnectPgSimple from "connect-pg-simple";
import ws from "ws";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { seedDatabase } from "./seed";
import { initializeVectorStore } from "./vectorStore";
import { db } from "./db";
import { sql } from "drizzle-orm";

const app = express();

// CRITICAL: Fast health checks BEFORE any middleware to prevent deployment timeouts
let isReady = false;

// Ultra-fast health check for deployment - no DB, no sessions, no middleware
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    message: 'Application is running',
    timestamp: new Date().toISOString()
  });
});

// Fast root endpoint during startup, then serve SPA when ready
app.get('/', (req, res, next) => {
  if (!isReady) {
    // During startup: return JSON for health checks
    return res.status(200).json({
      status: 'starting',
      message: 'Application is initializing',
      timestamp: new Date().toISOString()
    });
  }
  // After ready: continue to static file serving
  next();
});

// Support HEAD requests for health checks
app.head(['/', '/health'], (req, res) => {
  res.status(200).end();
});

// SECURITY: Configure session management with PostgreSQL store
neonConfig.webSocketConstructor = ws;
const pgPool = new Pool({ connectionString: process.env.DATABASE_URL });
const PgSession = ConnectPgSimple(session);

app.use(session({
  store: new PgSession({
    pool: pgPool,
    tableName: 'session', // Uses PostgreSQL session table
    createTableIfMissing: true,
  }),
  secret: process.env.SESSION_SECRET || 'fallback-secret-for-development-only',
  resave: false,
  saveUninitialized: false,
  name: 'essayons.sid', // Custom session name
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true, // Prevent XSS attacks
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'strict' // CSRF protection
  }
}));

app.use(cookieParser()); // SECURITY: Enable cookie parsing for secure Super Admin sessions
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// SECURITY: Serve exports directory statically for file downloads with proper cache headers
app.use('/exports', express.static('exports', {
  maxAge: '1d', // Cache for 1 day
  etag: true,
  lastModified: true,
  setHeaders: (res, path) => {
    // Security headers for file downloads
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
  }
}));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Keep /ready endpoint for detailed diagnostics with DB connectivity check
  app.get('/ready', async (req, res) => {
    try {
      // Check database connectivity
      await db.execute(sql`SELECT 1`);
      
      res.status(200).json({ 
        status: 'ready', 
        message: 'Ready to serve traffic',
        timestamp: new Date().toISOString(),
        checks: {
          database: 'ok'
        }
      });
    } catch (error) {
      res.status(503).json({ 
        status: 'not_ready', 
        message: 'Service not ready',
        timestamp: new Date().toISOString(),
        checks: {
          database: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  });

  // EMERGENCY: Simple Super Admin login bypass for broken routes.ts
  app.post('/api/auth/super-admin/login', express.json(), async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
      }

      // Query super admin user
      const result = await db.execute(sql`
        SELECT id, username, email, name, role, password_hash, is_active, created_at
        FROM super_admin_users 
        WHERE username = ${username} AND is_active = true
      `);
      const user = result.rows[0];

      if (!user || !user.password_hash) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Verify password with bcrypt
      const bcrypt = await import('bcrypt');
      const passwordMatch = await bcrypt.default.compare(password, user.password_hash);

      if (!passwordMatch) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Success - return user data (no session for now, just auth confirmation)
      res.status(200).json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          name: user.name,
          role: user.role
        }
      });

    } catch (error) {
      console.error('Emergency login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
    
    // Start background initialization AFTER server is listening
    // This ensures health checks respond immediately while init happens in background
    Promise.resolve().then(async () => {
      // Seed the database in background
      try {
        await seedDatabase();
      } catch (error) {
        console.error("Database seeding failed:", error);
        // Continue running even if seeding fails (e.g., if already seeded)
      }

      // Initialize vector store in background
      try {
        await initializeVectorStore();
      } catch (error) {
        console.error("Vector store initialization failed:", error);
        // Continue running even if vector store fails
      }

      // Mark server as ready after all background initialization completes
      isReady = true;
      console.log("✅ Server is now ready - health checks will serve SPA");
    });
  });
})();
