import express, { Request, Response } from "express";
import { z } from "zod";
import { insertProcessMapSchema } from "@shared/schema";

/**
 * Create a router for process-maps endpoints.
 * Accepts a storage object implementing createProcessMap(...) and optionally getProjectById(...)
 *
 * Usage:
 *   import { DatabaseStorage } from "../storage";
 *   const router = createProcessMapsRouter(new DatabaseStorage());
 *   app.use(router);
 *
 * NOTE: This file intentionally does not assume authentication middleware details.
 * It expects `req.user` to be set by upstream auth middleware and `req.organizationId`
 * to be set by tenant middleware when multi-tenancy is in use.
 */

export function createProcessMapsRouter(storage: any) {
  const router = express.Router();

  const createProcessMapBodySchema = z.object({
    name: z.string().min(1),
    description: z.string().nullable().optional(),
    // Accept either structured JSON or a string representation from older clients
    canvasData: z.any().optional(),
    elements: z.any().optional(),
    connections: z.any().optional(),
  });

  router.post("/api/projects/:projectId/process-maps", async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const organizationId = (req as any).organizationId;

      // 1) Auth
      if (!user || !user.id) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { projectId } = req.params;
      if (!projectId) {
        return res.status(400).json({ message: "Missing projectId in URL" });
      }

      // 2) Basic body validation
      const parsed = createProcessMapBodySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid request body", errors: parsed.error.format() });
      }

      const { name, description } = parsed.data;

      // 3) Validate/normalize canvasData
      let canvasData: any = { objects: [], background: "#ffffff" };
      if (req.body.canvasData !== undefined && req.body.canvasData !== null) {
        try {
          canvasData = typeof req.body.canvasData === "string" ? JSON.parse(req.body.canvasData) : req.body.canvasData;
          // ensure minimal structure
          if (typeof canvasData !== "object" || canvasData === null) {
            canvasData = { objects: [], background: "#ffffff" };
          }
        } catch (err) {
          return res.status(400).json({ message: "Invalid canvasData JSON" });
        }
      }

      // 4) BOLA/tenant check: verify project exists and belongs to the organizationId (if available)
      let project: any | undefined = undefined;
      try {
        // not all storage implementations expose getProjectById; guard for that
        if (typeof storage.getProjectById === "function") {
          project = await storage.getProjectById(projectId);
        } else if (typeof storage.getProject === "function") {
          project = await storage.getProject(projectId);
        }
      } catch (err) {
        // If storage threw, map to 500 (but allow creation to proceed if caller purposely doesn't provide project access checks)
        console.error("Error loading project for validation:", err);
        return res.status(500).json({ message: "Error validating project" });
      }

      if (project) {
        if (organizationId && (project as any).organizationId && (project as any).organizationId !== organizationId) {
          return res.status(403).json({ message: "Project not accessible in current organization" });
        }
      }

      // 5) Build insert payload server-side (do NOT trust client-provided createdById)
      const insertPayload = {
        projectId,
        name,
        description: description ?? null,
        canvasData,
        elements: req.body.elements ?? [],
        connections: req.body.connections ?? [],
        createdById: user.id,
      };

      // 6) Validate using shared schema (defensive)
      const validated = insertProcessMapSchema.safeParse(insertPayload);
      if (!validated.success) {
        return res.status(400).json({ message: "Invalid process map payload", errors: validated.error.format() });
      }

      // 7) Insert
      const created = await storage.createProcessMap(validated.data);

      return res.status(201).json(created);
    } catch (err: any) {
      // Map common DB FK violation to a friendly message
      if (err?.code === "23503") {
        return res.status(400).json({ message: "Referenced resource not found or invalid foreign key", detail: err?.detail });
      }
      console.error("Error in create process map route:", err);
      return res.status(500).json({ message: "Internal server error while creating process map" });
    }
  });

  return router;
}

export default createProcessMapsRouter;