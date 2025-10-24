import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk in case it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      
      // Set no-cache headers for HTML documents in development mode
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  // Candidate directories to look for the built client index.html
  const candidates = [
    path.resolve(import.meta.dirname, "public"),                     // current expectation
    path.resolve(import.meta.dirname, "..", "client", "dist"),      // common Vite output
    path.resolve(import.meta.dirname, "..", "client", "build"),     // CRA-like output
    path.resolve(import.meta.dirname, "..", "dist"),                // alternate top-level dist
    path.resolve(import.meta.dirname, "..", "client", "public"),    // sometimes used
  ];

  // Pick the first candidate that contains index.html
  let distPath: string | null = null;
  for (const c of candidates) {
    try {
      if (fs.existsSync(path.join(c, "index.html"))) {
        distPath = c;
        break;
      }
    } catch (e) {
      // ignore and continue
    }
  }

  if (!distPath) {
    // Helpful error message so deploy logs show where we looked
    const tried = candidates.map((p) => `  - ${p}`).join("\n");
    throw new Error(
      `Could not find index.html in any expected build directories. Looked at:\n${tried}\n` +
      `Make sure you run the client build in CI and that index.html is present in one of these locations.`
    );
  }

  // Serve hashed static assets (assets/) with long-term caching if present
  const assetsPath = path.join(distPath, "assets");
  if (fs.existsSync(assetsPath)) {
    app.use(
      "/assets",
      express.static(assetsPath, {
        maxAge: "1y",
        immutable: true,
        setHeaders: (res) => {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        },
      })
    );
  }

  // Serve images folder if present
  const imagesPath = path.join(distPath, "images");
  if (fs.existsSync(imagesPath)) {
    app.use(
      "/images",
      express.static(imagesPath, {
        maxAge: "1d",
        setHeaders: (res) => {
          res.setHeader("Cache-Control", "public, max-age=86400");
        },
      })
    );
  }

  // Fallback: serve index.html for all other GET requests that accept HTML
  app.get("*", (req, res, next) => {
    const accept = (req.headers.accept || "").toString();
    if (req.method !== "GET" || !accept.includes("text/html")) {
      return next();
    }

    const indexPath = path.join(distPath as string, "index.html");
    if (!fs.existsSync(indexPath)) return res.status(404).send("index.html not found");

    // Strong cache headers for document responses (origin intent + CDN hints)
    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, max-age=0, s-maxage=0, proxy-revalidate"
    );
    // Helpful for some edge caches / CDNs that inspect Surrogate-Control
    res.setHeader("Surrogate-Control", "no-store");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    try { res.removeHeader("ETag"); } catch (e) {}
    try { res.removeHeader("Last-Modified"); } catch (e) {}

    // Debug log so we can confirm the instance served the HTML shell and which path was used
    try {
      console.info(`[serveStatic] sending index.html (no-store) from ${distPath} for ${req.path}`);
    } catch {}

    res.sendFile(indexPath, (err) => {
      if (err) next(err);
    });
  });
}
