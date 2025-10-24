import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import cookieParser from "cookie-parser";
import { neonConfig } from "@neondatabase/serverless";
import ConnectPgSimple from "connect-pg-simple";
import ws from "ws";
import { registerRoutes } from "./routes";
import { seedDatabase } from "./seed";
import { initializeVectorStore } from "./vectorStore";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
const { Pool } = pkg;

// Top-level logging
console.log('DATABASE_URL:', process.env.DATABASE_URL);

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

console.log("Startup: Top-level script loaded.");
console.log("Startup: All imports completed.");

// EXPRESS INITIALIZATION
const app = express();
console.log("Startup: Express initialized.");

// TRUST PROXY - Required for production on Render.com and other platforms
// This allows Express to trust the proxy headers (X-Forwarded-Proto, X-Forwarded-For, etc.)
// Without this, secure cookies won't work because Express thinks the connection is insecure
app.set('trust proxy', 1);

// Create a single shared Postgres pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
console.log("Startup: Postgres pool created.");

const db = drizzle(pool);
console.log("Startup: Drizzle DB initialized.");

// HEALTH ENDPOINTS
app.get("/health", (_req, res) =>
  res.status(200).json({ status: "healthy", timestamp: new Date().toISOString() })
);

app.head("/health", (_req, res) => res.status(200).end());

app.get("/", (req, res, next) => {
  const acceptHeader = req.get("Accept") || "";
  const userAgent = req.get("User-Agent") || "";

  const isHealthCheck =
    !acceptHeader.includes("text/html") ||
    userAgent.includes("kube-probe") ||
    userAgent.includes("health") ||
    userAgent.includes("monitoring") ||
    userAgent.includes("check");

  if (isHealthCheck) {
    return res.status(200).json({
      status: "healthy",
      service: "essayons-change-management",
      timestamp: new Date().toISOString(),
    });
  }

  next();
});

app.head("/", (_req, res) => res.status(200).end());

console.log("Startup: Health endpoints registered.");

// SESSION CONFIGURATION
neonConfig.webSocketConstructor = ws;
const pgPool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const PgSession = ConnectPgSimple(session);

app.use(
  session({
    store: new PgSession({
      pool: pgPool,
      tableName: "session",
      createTableIfMissing: true,
    }),
    secret: (() => {
      const secret = process.env.SESSION_SECRET;
      const isProduction = process.env.NODE_ENV === "production";
      if (isProduction && !secret) {
        console.error("🚨 SECURITY ERROR: SESSION_SECRET is required in production");
        throw new Error("SESSION_SECRET environment variable is required in production");
      }
      return secret || "fallback-secret-for-development-only";
    })(),
    resave: false,
    saveUninitialized: false,
    name: "essayons.sid",
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: "lax", // Changed from "strict" to "lax" for production compatibility
    },
  })
);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Populate req.user from session (if session stores user or userId).
// This ensures route handlers that expect req.user will have it populated.
// It runs after session/cookie parsing, and before request-logging and routes.
app.use((req, _res, next) => {
  try {
    const s = (req as any).session;
    if (!(req as any).user && s) {
      // If the session has a full user object, attach it.
      if (s.user) {
        (req as any).user = s.user;
      } else if (s.userId) {
        // If the session stores only a userId, attach a minimal user object (handlers can lookup full user if needed).
        (req as any).user = { id: s.userId };
      }
    }
  } catch (err) {
    console.error("[auth-populate] failed to populate req.user from session", err);
  } finally {
    next();
  }
});

console.log("Startup: Session and middleware registered.");

// STATIC EXPORTS
app.use(
  "/exports",
  express.static("exports", {
    maxAge: "1d",
    etag: true,
    lastModified: true,
    setHeaders: (res) => {
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("X-Frame-Options", "DENY");
    },
  })
);

console.log("Startup: Static exports registered.");

// REQUEST LOGGING MIDDLEWARE
let log = console.log;
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      if (logLine.length > 80) logLine = logLine.slice(0, 79) + "…";
      log(logLine);
    }
  });

  next();
});

console.log("Startup: Request logging middleware registered.");

// AUTH DEBUG MIDDLEWARE (temporary, for troubleshooting)
// This will now see req.user if the session contained user/userId.
app.use((req, _res, next) => {
  try {
    console.info("[auth-debug] method=%s path=%s", req.method, req.path);
    console.info("[auth-debug] cookie header present=%s", !!req.headers.cookie);
    // express-session provides req.sessionID and req.session
    console.info("[auth-debug] sessionID=%s", (req as any).sessionID || "<none>");
    console.info(
      "[auth-debug] sessionKeys=%s",
      (req as any).session ? Object.keys((req as any).session).slice(0, 20).join(",") : "<no-session>"
    );
    const u = (req as any).user;
    if (u) {
      // Print only minimal user info to avoid leaking sensitive fields
      console.info("[auth-debug] req.user present:", { id: u.id, email: u.email });
    } else {
      console.info("[auth-debug] req.user absent");
    }
  } catch (err) {
    console.error("[auth-debug] logging failed", err);
  } finally {
    next();
  }
});

// STRONG: Prevent any caching of the HTML shell (index.html / root)
// This sets no-store and removes ETag/Last-Modified so the browser will always request
// and receive a fresh HTML body (avoids accepting 304 and reusing old HTML).
app.use((req, res, next) => {
  if (req.method === "GET" && (req.path === "/" || req.path.endsWith("/index.html"))) {
    try {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      // Remove ETag/Last-Modified so origin won't reply 304 for the document
      // (some frameworks/setups set these later; removal here is best-effort)
      try { res.removeHeader("ETag"); } catch {}
      try { res.removeHeader("Last-Modified"); } catch {}
    } catch (err) {
      console.error("[no-cache-index] failed to set no-store headers", err);
    }
  }
  next();
});

// ASYNC STARTUP WRAPPER
(async () => {
  try {
    console.log("Startup: Entered async wrapper.");

    // HEALTH + READY ENDPOINT
    app.get("/ready", async (_req, res) => {
      try {
        await db.execute(sql`SELECT 1`);
        res.status(200).json({
          status: "ready",
          message: "Ready to serve traffic",
          timestamp: new Date().toISOString(),
          checks: { database: "ok" },
        });
      } catch (error) {
        res.status(503).json({
          status: "not_ready",
          message: "Service not ready",
          timestamp: new Date().toISOString(),
          checks: { database: "failed", error: (error as Error).message },
        });
      }
    });

    // REGISTER ROUTES
    try {
      await registerRoutes(app);
      console.log("Startup: registerRoutes complete.");
    } catch (err) {
      console.error("Startup: Error in registerRoutes:", err);
      // Do NOT throw or return here!
    }

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || 500;
      res.status(status).json({ message: err.message || "Internal Server Error" });
      // Do NOT throw or return here!
    });

    // VITE/STATIC
    try {
      if (app.get("env") === "development") {
        const { setupVite, log: viteLog } = await import("./vite");
        await setupVite(app);
        log = viteLog;
        console.log("Startup: setupVite complete.");
      } else {
        const { serveStatic, log: viteLog } = await import("./vite");
        serveStatic(app);
        log = viteLog;
        console.log("Startup: serveStatic complete.");
      }
    } catch (err) {
      console.error("Startup: Error in serveStatic/setupVite:", err);
      // Do NOT throw or return here!
    }

    // SEED ONLY IN DEV
    const isProduction = process.env.NODE_ENV === "production";
    if (!isProduction) {
      console.log("Startup: Starting database seeding...");
      try {
        await seedDatabase();
        console.log("Startup: 🎉 Database seeding completed successfully!");
      } catch (error) {
        console.error("Startup: Database seeding failed:", error);
        // Do NOT throw or return here!
      }
    } else {
      console.log("Startup: Production environment detected - skipping database seeding");
    }

    // INITIALIZE VECTOR STORE
    try {
      console.log("Startup: Initializing vector store...");
      await initializeVectorStore();
      console.log("Startup: ✅ Vector store initialization complete");
    } catch (error) {
      console.error("Startup: Vector store initialization failed:", error);
      // Do NOT throw or return here!
    }

    console.log("Startup: ✅ Server initialization complete");
  } catch (err) {
    console.error("❌ Startup failed:", err);
    process.exit(1);
  }
})();

// OUTSIDE the async wrapper, at top-level:
const port = parseInt(process.env.PORT || "5000", 10);
console.log("Startup: Before app.listen (outside async)");
app.listen(port, "0.0.0.0", () => {
  console.log(`🚀 Server listening on port ${port}`);
  console.log("Startup: After app.listen (outside async)");
});
