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

// ULTRA-SIMPLE: Health endpoint for deployment health checks - no logic, immediate response
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// ULTRA-SIMPLE: HEAD requests for health checks - immediate response
app.head('/health', (req, res) => {
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
  secret: (() => {
    const secret = process.env.SESSION_SECRET;
    const isProduction = process.env.REPLIT_DEPLOYMENT === '1' || process.env.NODE_ENV === 'production';
    
    if (isProduction && !secret) {
      console.error('🚨 SECURITY ERROR: SESSION_SECRET is required in production');
      throw new Error('SESSION_SECRET environment variable is required in production');
    }
    
    return secret || 'fallback-secret-for-development-only';
  })(),
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

  // EMERGENCY: Simple Super Admin login bypass for broken routes.ts (DEVELOPMENT ONLY)
  const isProduction = process.env.REPLIT_DEPLOYMENT === '1' || process.env.NODE_ENV === 'production';
  if (!isProduction) {
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
  } else {
    console.log("🔒 Production environment - emergency login route disabled for security");
  }

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Setup Vite or static serving - this handles SPA routing correctly
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
    console.log("🚀 Server ready for health checks - serving on port", port);
    
    // Start background initialization AFTER server is listening
    // This ensures health checks respond immediately while init happens in background
    Promise.resolve().then(async () => {
      const isProduction = process.env.REPLIT_DEPLOYMENT === '1' || process.env.NODE_ENV === 'production';
      
      // PRODUCTION FIX: Skip seeding in production to prevent connection timeouts
      if (!isProduction) {
        console.log("🌱 Starting database seeding...");
        try {
          await seedDatabase();
          console.log("🎉 Database seeding completed successfully!");
        } catch (error) {
          console.error("Database seeding failed:", error);
          // Continue running even if seeding fails (e.g., if already seeded)
        }
      } else {
        console.log("🏭 Production environment detected - skipping database seeding");
      }

      // Initialize vector store in background (safe for production)
      try {
        console.log("Initializing vector store...");
        await initializeVectorStore();
        console.log("✅ Vector store initialization complete");
      } catch (error) {
        console.error("Vector store initialization failed:", error);
        // Continue running even if vector store fails
      }

      // Background initialization completed
      console.log("✅ Server initialization complete");
    });
  });
})();
