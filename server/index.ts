process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

console.log("Startup: Top-level script loaded."); // <--- Added

import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import cookieParser from "cookie-parser";
import { neonConfig } from "@neondatabase/serverless";
import ConnectPgSimple from "connect-pg-simple";
import ws from "ws";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { seedDatabase } from "./seed";
import { initializeVectorStore } from "./vectorStore";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
const { Pool } = pkg;

console.log("Startup: All imports completed."); // <--- Added

// EXPRESS INITIALIZATION
const app = express();
console.log("Startup: Express initialized."); // <--- Added

// Create a single shared Postgres pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

console.log("Startup: Postgres pool created."); // <--- Added

const db = drizzle(pool);
console.log("Startup: Drizzle DB initialized."); // <--- Added

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

console.log("Startup: Health endpoints registered."); // <--- Added

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
      sameSite: "strict",
    },
  })
);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

console.log("Startup: Session and middleware registered."); // <--- Added

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

console.log("Startup: Static exports registered."); // <--- Added

// REQUEST LOGGING MIDDLEWARE
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

console.log("Startup: Request logging middleware registered."); // <--- Added

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
      throw err;
    }

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || 500;
      res.status(status).json({ message: err.message || "Internal Server Error" });
      throw err;
    });

    // VITE/STATIC
    try {
      if (app.get("env") === "development") {
        await setupVite(app);
        console.log("Startup: setupVite complete.");
      } else {
        serveStatic(app);
        console.log("Startup: serveStatic complete.");
      }
    } catch (err) {
      console.error("Startup: Error in serveStatic/setupVite:", err);
      throw err;
    }

    // SERVER START
    const port = parseInt(process.env.PORT || "5000", 10);
    console.log("Startup: Before app.listen");
    app.listen(port, "0.0.0.0", () => {
      log(`serving on port ${port}`);
      console.log("🚀 Server ready for health checks - serving on port", port);
      console.log("Startup: After app.listen");
    });

    // SEED ONLY IN DEV
    const isProduction = process.env.NODE_ENV === "production";
    if (!isProduction) {
      console.log("Startup: Starting database seeding...");
      try {
        await seedDatabase();
        console.log("Startup: 🎉 Database seeding completed successfully!");
      } catch (error) {
        console.error("Startup: Database seeding failed:", error);
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
    }

    console.log("Startup: ✅ Server initialization complete");
  } catch (err) {
    console.error("❌ Startup failed:", err);
    process.exit(1);
  }
})();
