import { createApp } from "./testUtils";
import { InsertProcessMap } from "@shared/schema";

describe("POST /api/projects/:projectId/process-maps", () => {
  const projectId = "proj-1";
  const orgId = "org-1";
  const user = { id: "user-1", email: "u@example.com" };

  test("returns 401 when not authenticated", async () => {
    const { request } = createApp({ user: null, organizationId: orgId });
    const resp = await request.post(`/api/projects/${projectId}/process-maps`).send({ name: "Map" });
    expect(resp.status).toBe(401);
    expect(resp.body).toHaveProperty("message", "Authentication required");
  });

  test("returns 400 when canvasData is invalid JSON (string)", async () => {
    // Mock storage.getProjectById to return project in same org
    const storage = {
      createProcessMap: jest.fn(),
      getProjectById: jest.fn(async (id: string) => ({ id: projectId, organizationId: orgId })),
    };
    const { request } = createApp({ user, organizationId: orgId, storage });

    // send canvasData as a string that's not JSON (should parse and fail)
    const resp = await request
      .post(`/api/projects/${projectId}/process-maps`)
      .send({ name: "InvalidCanvasMap", canvasData: "this-is-not-json" });

    expect(resp.status).toBe(400);
    expect(resp.body).toHaveProperty("message", "Invalid canvasData JSON");
    expect(storage.createProcessMap).not.toHaveBeenCalled();
  });

  test("returns 403 when project belongs to another organization", async () => {
    // storage returns a project that belongs to a different org
    const storage = {
      createProcessMap: jest.fn(),
      getProjectById: jest.fn(async (id: string) => ({ id: projectId, organizationId: "other-org" })),
    };
    const { request } = createApp({ user, organizationId: orgId, storage });

    const resp = await request
      .post(`/api/projects/${projectId}/process-maps`)
      .send({ name: "Map", canvasData: { objects: [] } });

    expect(resp.status).toBe(403);
    expect(resp.body).toHaveProperty("message", "Project not accessible in current organization");
    expect(storage.createProcessMap).not.toHaveBeenCalled();
  });

  test("returns 201 on success and passes createdById from authenticated user", async () => {
    const createdMap = { id: "created-id", projectId, name: "OK Map", canvasData: { objects: [] }, createdById: user.id };
    const storage = {
      createProcessMap: jest.fn(async (payload: InsertProcessMap) => ({ ...createdMap, ...payload })),
      getProjectById: jest.fn(async (id: string) => ({ id: projectId, organizationId: orgId })),
    };

    const { request } = createApp({ user, organizationId: orgId, storage });

    const payload = { name: "OK Map", canvasData: { objects: [] }, elements: [], connections: [] };
    const resp = await request.post(`/api/projects/${projectId}/process-maps`).send(payload);

    expect(resp.status).toBe(201);
    expect(resp.body).toHaveProperty("id");
    // verify storage was called with createdById set to the test user id
    expect(storage.createProcessMap).toHaveBeenCalled();
    const calledWith = (storage.createProcessMap as jest.Mock).mock.calls[0][0];
    expect(calledWith.createdById).toBe(user.id);
    expect(calledWith.projectId).toBe(projectId);
    expect(resp.body.name).toBe(payload.name);
  });
});