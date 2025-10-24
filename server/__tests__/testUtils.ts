import express from "express";
import bodyParser from "body-parser";
import request from "supertest";
import { createProcessMapsRouter } from "../routes/process-maps";

/**
 * Test helpers for building an Express app with controllable auth + storage
 *
 * createApp(options) returns:
 *  - app: express.Application with the router mounted
 *  - request: supertest bound request function to the app
 *
 * options:
 *  - user?: { id: string, email?: string } | null  (null => unauthenticated)
 *  - organizationId?: string | null
 *  - storage?: any  (object implementing createProcessMap, getProjectById)
 */

export function createApp({ user = null, organizationId = null, storage = null } = {}) {
  const app = express();
  app.use(bodyParser.json());

  // simple auth middleware for tests: attaches user and organizationId onto req
  app.use((req: any, res, next) => {
    if (user !== undefined && user !== null) {
      req.user = user;
    }
    if (organizationId !== undefined && organizationId !== null) {
      req.organizationId = organizationId;
    }
    next();
  });

  // If no storage provided, provide a minimal in-memory stub.
  const defaultStorage = {
    createProcessMap: jest.fn(async (payload: any) => ({ id: "new-map-id", ...payload })),
    getProjectById: jest.fn(async (id: string) => undefined),
  };

  const effectiveStorage = storage ?? defaultStorage;

  app.use(createProcessMapsRouter(effectiveStorage));

  return { app, request: request(app), storage: effectiveStorage };
}