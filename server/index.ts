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
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
const { Pool } = pkg;

// -------------------------------------
// EXPRESS INITIALIZATION
// -------------------------------------
const app = express();

// Create a single shared Postgres pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Fix self-signed cert
});

const db = drizzle(pool);

// -------------------------------------
// HEALTH ENDPOINTS
// -------------------------------------
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

// -------------------------------------
// SESSION CONFIGURATION
// -------------------------------------
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

// -------------------------------------
// STATIC EXPORTS
// -------------------------------------
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

// -------------------------------------
// REQUEST LOGGING MIDDLEWARE
// -------------------------------------
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

// -------------------------------------
// ASYNC STARTUP WRAPPER
// -------------------------------------
(async () => {
  try {
    // ✅ 1. RUN MIGRATIONS BEFORE ANYTHING ELSE
    console.log("🚀 Running database migrations...");
    await migrate(db, { migrationsFolder: "migrations" });
    console.log("✅ Database migrations applied successfully");

    // 2. HEALTH + READY ENDPOINT
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

    // ✅ 3. REGISTER ROUTES
    const server = await registerRoutes(app);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || 500;
      res.status(status).json({ message: err.message || "Internal Server Error" });
      throw err;
    });

    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // ✅ 4. START SERVER
    const port = parseInt(process.env.PORT || "5000", 10);
    server.listen({ port, host: "0.0.0.0", reusePort: true }, () => {
      log(`serving on port ${port}`);
      console.log("🚀 Server ready for health checks - serving on port", port);
    });

    // ✅ 5. SEED ONLY IN DEV
    const isProduction = process.env.NODE_ENV === "production";
    if (!isProduction) {
      console.log("🌱 Starting database seeding...");
      try {
        await seedDatabase();
        console.log("🎉 Database seeding completed successfully!");
      } catch (error) {
        console.error("Database seeding failed:", error);
      }
    } else {
      console.log("🏭 Production environment detected - skipping database seeding");
    }

    // ✅ 6. INITIALIZE VECTOR STORE
    try {
      console.log("Initializing vector store...");
      await initializeVectorStore();
      console.log("✅ Vector store initialization complete");
    } catch (error) {
      console.error("Vector store initialization failed:", error);
    }

    console.log("✅ Server initialization complete");
  } catch (err) {
    console.error("❌ Startup failed:", err);
    process.exit(1);
  }
})();

