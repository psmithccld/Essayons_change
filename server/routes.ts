import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertProjectSchema, insertTaskSchema, insertStakeholderSchema, insertRaidLogSchema,
  insertCommunicationSchema, insertSurveySchema, baseSurveySchema, insertSurveyResponseSchema, insertGptInteractionSchema,
  insertMilestoneSchema, insertChecklistTemplateSchema, insertProcessMapSchema,
  insertRiskSchema, insertActionSchema, insertIssueSchema, insertDeficiencySchema,
  insertRoleSchema, insertUserSchema, insertUserInitiativeAssignmentSchema,
  insertUserGroupMembershipSchema, insertUserPermissionSchema,
  type UserInitiativeAssignment, type InsertUserInitiativeAssignment, type User, type Role, type Permissions
} from "@shared/schema";
import * as openaiService from "./openai";
import { sendTaskAssignmentNotification } from "./services/emailService";

// SECURITY: Permission enforcement middleware
interface AuthenticatedRequest extends Request {
  userId?: string;
}

// For demo purposes, using a hardcoded user ID - in production, get from session/token
const DEMO_USER_ID = "550e8400-e29b-41d4-a716-446655440000";

// Permission middleware factory
const requirePermission = (permission: keyof Permissions) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      // In production, extract userId from session/token
      const userId = req.userId || DEMO_USER_ID;
      
      const hasPermission = await storage.checkUserPermission(userId, permission);
      if (!hasPermission) {
        return res.status(403).json({ 
          error: `Access denied. Required permission: ${permission}` 
        });
      }
      
      // Store userId for use in route handlers
      req.userId = userId;
      next();
    } catch (error) {
      console.error("Error checking permission:", error);
      res.status(500).json({ error: "Permission check failed" });
    }
  };
};

// Helper function to build complete RAID log from template-specific data
function buildRaidInsertFromTemplate(type: string, baseData: any): any {
  // Add backward compatibility mapping
  if (type === 'dependency') {
    type = 'deficiency';
  }
  
  // Keep date fields as strings for Zod validation
  const processedData = {
    ...baseData,
    type,
    // Date fields should remain as strings since schemas expect strings
    dueDate: baseData.dueDate || undefined,
    targetResolutionDate: baseData.targetResolutionDate || undefined,
  };
  
  let templateValidated;
  let description: string;
  
  switch (type) {
    case 'risk':
      templateValidated = insertRiskSchema.parse(processedData);
      description = templateValidated.notes || templateValidated.title || 'Risk description';
      break;
    case 'action':
      templateValidated = insertActionSchema.parse(processedData);
      description = templateValidated.event || templateValidated.title || 'Action description';
      break;
    case 'issue':
      templateValidated = insertIssueSchema.parse(processedData);
      description = templateValidated.description || templateValidated.title || 'Issue description';
      break;
    case 'deficiency':
      templateValidated = insertDeficiencySchema.parse(processedData);
      description = templateValidated.description || templateValidated.title || 'Deficiency description';
      break;
    default:
      // Fallback to generic schema for backward compatibility
      return insertRaidLogSchema.parse(processedData);
  }
  
  // Merge template-specific fields with required generic fields
  // Convert string dates to Date objects for database insertion
  const finalData = {
    ...templateValidated,
    description,
    severity: (templateValidated as any).severity || 'medium',
    impact: (templateValidated as any).impact || 'medium',
  };
  
  // Convert date strings to Date objects for database timestamp fields
  if (finalData.dueDate && typeof finalData.dueDate === 'string') {
    finalData.dueDate = new Date(finalData.dueDate);
  }
  if (finalData.targetResolutionDate && typeof finalData.targetResolutionDate === 'string') {
    finalData.targetResolutionDate = new Date(finalData.targetResolutionDate);
  }
  
  return finalData;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Roles
  app.get("/api/roles", requirePermission('canSeeRoles'), async (req, res) => {
    try {
      const roles = await storage.getRoles();
      res.json(roles);
    } catch (error) {
      console.error("Error fetching roles:", error);
      res.status(500).json({ error: "Failed to fetch roles" });
    }
  });

  // Authentication
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
      }
      
      const user = await storage.verifyPassword(username, password);
      if (!user) {
        return res.status(401).json({ error: "Invalid username or password" });
      }
      
      // Get user role information
      const role = await storage.getRole(user.roleId);
      if (!role) {
        return res.status(500).json({ error: "User role not found" });
      }
      
      // User already has passwordHash removed by storage layer
      res.json({
        user: user,
        role,
        permissions: role.permissions
      });
    } catch (error) {
      console.error("Error during login:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // RBAC: User permissions endpoint for frontend permission gating
  app.get("/api/users/me/permissions", async (req: AuthenticatedRequest, res) => {
    try {
      // For demo purposes, using a hardcoded user ID - in production, get from session/token
      const userId = req.userId || DEMO_USER_ID;
      
      const permissions = await storage.getUserPermissions(userId);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      res.json({
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          roleId: user.roleId,
          isActive: user.isActive
        },
        permissions
      });
    } catch (error) {
      console.error("Error fetching user permissions:", error);
      res.status(500).json({ error: "Failed to fetch user permissions" });
    }
  });

  // Users
  app.get("/api/users", requirePermission('canSeeUsers'), async (req, res) => {
    try {
      const users = await storage.getUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // Dashboard
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      // For demo, using a default user ID - in production, get from auth
      const userId = "550e8400-e29b-41d4-a716-446655440000";
      const stats = await storage.getDashboardStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
  });

  // Projects
  app.get("/api/projects", async (req, res) => {
    try {
      const userId = "550e8400-e29b-41d4-a716-446655440000";
      const projects = await storage.getProjects(userId);
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ error: "Failed to fetch projects" });
    }
  });

  app.get("/api/projects/:id", async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      console.error("Error fetching project:", error);
      res.status(500).json({ error: "Failed to fetch project" });
    }
  });

  app.post("/api/projects", requirePermission('canModifyProjects'), async (req: AuthenticatedRequest, res) => {
    try {
      // Convert date strings to Date objects before validation
      const processedData = {
        ...req.body,
        ownerId: req.userId || DEMO_USER_ID, // Use authenticated user ID
        startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
        endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
      };
      
      const validatedData = insertProjectSchema.parse(processedData);
      const project = await storage.createProject(validatedData);
      res.status(201).json(project);
    } catch (error) {
      console.error("Error creating project:", error);
      res.status(400).json({ error: "Failed to create project" });
    }
  });

  app.put("/api/projects/:id", requirePermission('canEditAllProjects'), async (req, res) => {
    try {
      // Convert date strings to Date objects and validate
      const processedData = {
        ...req.body,
        startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
        endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
      };
      
      // Create update schema by making insertProjectSchema fields optional and omitting generated fields
      const updateProjectSchema = insertProjectSchema.partial().omit({ id: true, ownerId: true, createdAt: true, updatedAt: true });
      const validatedData = updateProjectSchema.parse(processedData);
      
      const project = await storage.updateProject(req.params.id, validatedData);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      console.error("Error updating project:", error);
      res.status(400).json({ error: "Failed to update project" });
    }
  });

  app.delete("/api/projects/:id", requirePermission('canDeleteProjects'), async (req, res) => {
    try {
      const success = await storage.deleteProject(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting project:", error);
      res.status(500).json({ error: "Failed to delete project" });
    }
  });

  // Copy project endpoint
  app.post("/api/projects/:id/copy", requirePermission('canModifyProjects'), async (req: AuthenticatedRequest, res) => {
    try {
      const originalProject = await storage.getProject(req.params.id);
      if (!originalProject) {
        return res.status(404).json({ error: "Original project not found" });
      }

      const { name, copyAssignments, copyTasks, newStartDate, newEndDate } = req.body;

      // Create the copied project with new data
      const copiedProjectData = {
        ...originalProject,
        name: name || `Copy of ${originalProject.name}`,
        ownerId: req.userId || DEMO_USER_ID,
        status: "planning" as const, // Reset status to planning
        progress: 0, // Reset progress
        startDate: newStartDate ? new Date(newStartDate) : undefined,
        endDate: newEndDate ? new Date(newEndDate) : undefined,
      };

      // Remove fields that shouldn't be copied
      delete (copiedProjectData as any).id;
      delete (copiedProjectData as any).createdAt;
      delete (copiedProjectData as any).updatedAt;

      const validatedData = insertProjectSchema.parse(copiedProjectData);
      const copiedProject = await storage.createProject(validatedData);

      // Copy assignments if requested
      if (copyAssignments) {
        try {
          const assignments = await storage.getProjectAssignments(req.params.id);
          for (const assignment of assignments) {
            await storage.createUserInitiativeAssignment({
              userId: assignment.userId,
              projectId: copiedProject.id,
              role: assignment.role,
              assignedById: req.userId || DEMO_USER_ID
            });
          }
        } catch (assignmentError) {
          console.error("Error copying assignments:", assignmentError);
          // Continue even if assignment copying fails
        }
      }

      // Copy tasks if requested
      if (copyTasks) {
        try {
          const tasks = await storage.getTasksByProject(req.params.id);
          for (const task of tasks) {
            const copiedTaskData = {
              ...task,
              projectId: copiedProject.id,
              status: "pending" as const, // Reset task status
              progress: 0, // Reset task progress
              completedDate: undefined, // Clear completion date
            };
            
            // Remove fields that shouldn't be copied
            delete (copiedTaskData as any).id;
            delete (copiedTaskData as any).createdAt;
            delete (copiedTaskData as any).updatedAt;
            
            await storage.createTask(copiedTaskData);
          }
        } catch (taskError) {
          console.error("Error copying tasks:", taskError);
          // Continue even if task copying fails
        }
      }

      res.status(201).json(copiedProject);
    } catch (error) {
      console.error("Error copying project:", error);
      res.status(400).json({ error: "Failed to copy project" });
    }
  });

  // Tasks
  app.get("/api/projects/:projectId/tasks", async (req, res) => {
    try {
      const tasks = await storage.getTasksByProject(req.params.projectId);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  });

  app.post("/api/projects/:projectId/tasks", async (req, res) => {
    try {
      // Convert date strings to Date objects before validation
      const processedData = {
        ...req.body,
        projectId: req.params.projectId,
        startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
        dueDate: req.body.dueDate ? new Date(req.body.dueDate) : undefined,
      };
      
      const validatedData = insertTaskSchema.parse(processedData);
      const task = await storage.createTask(validatedData);
      
      // Send email notification if task is assigned (internal user or external email)
      if (task.assigneeId || task.assigneeEmail) {
        try {
          const project = await storage.getProject(req.params.projectId);
          if (project) {
            let emailAddress = task.assigneeEmail;
            
            // If internal user assignment, get their email
            if (task.assigneeId && !emailAddress) {
              const assignee = await storage.getUser(task.assigneeId);
              emailAddress = assignee ? `${assignee.username}@company.com` : null;
            }
            
            if (emailAddress) {
              await sendTaskAssignmentNotification(
                emailAddress,
                task.name,
                project.name,
                task.dueDate ? new Date(task.dueDate).toDateString() : null
              );
            }
          }
        } catch (emailError) {
          console.error("Error sending task assignment email:", emailError);
          // Don't fail the task creation if email fails
        }
      }
      
      res.status(201).json(task);
    } catch (error) {
      console.error("Error creating task:", error);
      res.status(400).json({ error: "Failed to create task" });
    }
  });

  app.put("/api/tasks/:id", async (req, res) => {
    try {
      const oldTask = await storage.getTask(req.params.id);
      const task = await storage.updateTask(req.params.id, req.body);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      
      // Send email notification if assignee changed
      if (task.assigneeId && oldTask?.assigneeId !== task.assigneeId) {
        try {
          const assignee = await storage.getUser(task.assigneeId);
          const project = await storage.getProject(task.projectId);
          if (assignee && project) {
            await sendTaskAssignmentNotification(
              `${assignee.username}@company.com`, // Use username as email fallback
              task.name,
              project.name,
              task.dueDate ? new Date(task.dueDate).toDateString() : undefined
            );
          }
        } catch (emailError) {
          console.error("Error sending task assignment email:", emailError);
          // Don't fail the task update if email fails
        }
      }
      
      res.json(task);
    } catch (error) {
      console.error("Error updating task:", error);
      res.status(400).json({ error: "Failed to update task" });
    }
  });

  app.delete("/api/tasks/:id", async (req, res) => {
    try {
      const success = await storage.deleteTask(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Task not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting task:", error);
      res.status(500).json({ error: "Failed to delete task" });
    }
  });

  // Milestones
  app.get("/api/projects/:projectId/milestones", async (req, res) => {
    try {
      const milestones = await storage.getMilestonesByProject(req.params.projectId);
      res.json(milestones);
    } catch (error) {
      console.error("Error fetching milestones:", error);
      res.status(500).json({ error: "Failed to fetch milestones" });
    }
  });

  app.post("/api/projects/:projectId/milestones", async (req, res) => {
    try {
      // Convert date strings to Date objects before validation
      const processedData = {
        ...req.body,
        projectId: req.params.projectId,
        targetDate: req.body.targetDate ? new Date(req.body.targetDate) : undefined,
      };
      
      const validatedData = insertMilestoneSchema.parse(processedData);
      const milestone = await storage.createMilestone(validatedData);
      res.status(201).json(milestone);
    } catch (error) {
      console.error("Error creating milestone:", error);
      res.status(400).json({ error: "Failed to create milestone" });
    }
  });

  app.put("/api/milestones/:id", async (req, res) => {
    try {
      // Convert date strings to Date objects before updating
      const processedData = {
        ...req.body,
        targetDate: req.body.targetDate ? new Date(req.body.targetDate) : undefined,
      };
      
      const milestone = await storage.updateMilestone(req.params.id, processedData);
      if (!milestone) {
        return res.status(404).json({ error: "Milestone not found" });
      }
      res.json(milestone);
    } catch (error) {
      console.error("Error updating milestone:", error);
      res.status(400).json({ error: "Failed to update milestone" });
    }
  });

  app.delete("/api/milestones/:id", async (req, res) => {
    try {
      const success = await storage.deleteMilestone(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Milestone not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting milestone:", error);
      res.status(500).json({ error: "Failed to delete milestone" });
    }
  });

  // Checklist Templates
  app.get("/api/checklist-templates", async (req, res) => {
    try {
      const templates = await storage.getChecklistTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching checklist templates:", error);
      res.status(500).json({ error: "Failed to fetch checklist templates" });
    }
  });

  app.get("/api/checklist-templates/active", async (req, res) => {
    try {
      const templates = await storage.getActiveChecklistTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching active checklist templates:", error);
      res.status(500).json({ error: "Failed to fetch active checklist templates" });
    }
  });

  app.get("/api/checklist-templates/category/:category", async (req, res) => {
    try {
      const templates = await storage.getChecklistTemplatesByCategory(req.params.category);
      res.json(templates);
    } catch (error) {
      console.error("Error fetching checklist templates by category:", error);
      res.status(500).json({ error: "Failed to fetch checklist templates by category" });
    }
  });

  app.get("/api/checklist-templates/:id", async (req, res) => {
    try {
      const template = await storage.getChecklistTemplate(req.params.id);
      if (!template) {
        return res.status(404).json({ error: "Checklist template not found" });
      }
      res.json(template);
    } catch (error) {
      console.error("Error fetching checklist template:", error);
      res.status(500).json({ error: "Failed to fetch checklist template" });
    }
  });

  app.post("/api/checklist-templates", async (req, res) => {
    try {
      const processedData = {
        ...req.body,
        createdById: "550e8400-e29b-41d4-a716-446655440000", // For demo, using default user ID
      };
      
      const validatedData = insertChecklistTemplateSchema.parse(processedData);
      const template = await storage.createChecklistTemplate(validatedData);
      res.status(201).json(template);
    } catch (error) {
      console.error("Error creating checklist template:", error);
      res.status(400).json({ error: "Failed to create checklist template" });
    }
  });

  app.put("/api/checklist-templates/:id", async (req, res) => {
    try {
      const template = await storage.updateChecklistTemplate(req.params.id, req.body);
      if (!template) {
        return res.status(404).json({ error: "Checklist template not found" });
      }
      res.json(template);
    } catch (error) {
      console.error("Error updating checklist template:", error);
      res.status(400).json({ error: "Failed to update checklist template" });
    }
  });

  app.delete("/api/checklist-templates/:id", async (req, res) => {
    try {
      const success = await storage.deleteChecklistTemplate(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Checklist template not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting checklist template:", error);
      res.status(500).json({ error: "Failed to delete checklist template" });
    }
  });

  // Stakeholders
  app.get("/api/projects/:projectId/stakeholders", async (req, res) => {
    try {
      const stakeholders = await storage.getStakeholdersByProject(req.params.projectId);
      res.json(stakeholders);
    } catch (error) {
      console.error("Error fetching stakeholders:", error);
      res.status(500).json({ error: "Failed to fetch stakeholders" });
    }
  });

  app.post("/api/projects/:projectId/stakeholders", async (req, res) => {
    try {
      const validatedData = insertStakeholderSchema.parse({
        ...req.body,
        projectId: req.params.projectId
      });
      const stakeholder = await storage.createStakeholder(validatedData);
      res.status(201).json(stakeholder);
    } catch (error) {
      console.error("Error creating stakeholder:", error);
      res.status(400).json({ error: "Failed to create stakeholder" });
    }
  });

  app.put("/api/stakeholders/:id", async (req, res) => {
    try {
      const stakeholder = await storage.updateStakeholder(req.params.id, req.body);
      if (!stakeholder) {
        return res.status(404).json({ error: "Stakeholder not found" });
      }
      res.json(stakeholder);
    } catch (error) {
      console.error("Error updating stakeholder:", error);
      res.status(400).json({ error: "Failed to update stakeholder" });
    }
  });

  app.delete("/api/stakeholders/:id", async (req, res) => {
    try {
      const success = await storage.deleteStakeholder(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Stakeholder not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting stakeholder:", error);
      res.status(500).json({ error: "Failed to delete stakeholder" });
    }
  });

  app.post("/api/projects/:projectId/stakeholders/import", async (req, res) => {
    try {
      const { sourceProjectId, stakeholderIds } = req.body;
      if (!sourceProjectId || !Array.isArray(stakeholderIds) || stakeholderIds.length === 0) {
        return res.status(400).json({ error: "Invalid request: sourceProjectId and stakeholderIds array required" });
      }
      
      const result = await storage.importStakeholders(req.params.projectId, sourceProjectId, stakeholderIds);
      res.json({ imported: result.imported, skipped: result.skipped });
    } catch (error) {
      console.error("Error importing stakeholders:", error);
      res.status(500).json({ error: "Failed to import stakeholders" });
    }
  });

  // RAID Logs
  app.get("/api/projects/:projectId/raid-logs", async (req, res) => {
    try {
      const raidLogs = await storage.getRaidLogsByProject(req.params.projectId);
      
      // Add backward compatibility mapping for any legacy data
      const normalizedRaidLogs = raidLogs.map(log => ({
        ...log,
        type: log.type === 'dependency' ? 'deficiency' : log.type
      }));
      
      res.json(normalizedRaidLogs);
    } catch (error) {
      console.error("Error fetching RAID logs:", error);
      res.status(500).json({ error: "Failed to fetch RAID logs" });
    }
  });

  app.post("/api/projects/:projectId/raid-logs", async (req, res) => {
    try {
      // Add backward compatibility mapping
      let processedBody = { ...req.body };
      if (processedBody.type === 'dependency') {
        processedBody.type = 'deficiency';
      }
      
      // Additional enum validation beyond drizzle-zod
      const allowedTypes = ['risk', 'action', 'issue', 'deficiency'];
      if (!allowedTypes.includes(processedBody.type)) {
        return res.status(400).json({ error: `Invalid type. Must be one of: ${allowedTypes.join(', ')}` });
      }
      
      // Use transformation helper to build complete RAID log from template data
      const baseData = {
        ...processedBody,
        projectId: req.params.projectId,
        ownerId: "550e8400-e29b-41d4-a716-446655440000"
      };
      
      const validatedData = buildRaidInsertFromTemplate(processedBody.type, baseData);
      
      const raidLog = await storage.createRaidLog(validatedData);
      
      // Apply backward compatibility mapping to response
      const normalizedRaidLog = {
        ...raidLog,
        type: raidLog.type === 'dependency' ? 'deficiency' : raidLog.type
      };
      
      res.status(201).json(normalizedRaidLog);
    } catch (error) {
      console.error("Error creating RAID log:", error);
      if (error instanceof Error && error.name === 'ZodError') {
        res.status(400).json({ error: "Validation failed", details: (error as any).errors });
      } else {
        res.status(400).json({ error: "Failed to create RAID log" });
      }
    }
  });

  app.put("/api/raid-logs/:id", async (req, res) => {
    try {
      // Add backward compatibility mapping
      let processedBody = { ...req.body };
      if (processedBody.type === 'dependency') {
        processedBody.type = 'deficiency';
      }
      
      // Additional enum validation if type is being updated
      if (processedBody.type) {
        const allowedTypes = ['risk', 'action', 'issue', 'deficiency'];
        if (!allowedTypes.includes(processedBody.type)) {
          return res.status(400).json({ error: `Invalid type. Must be one of: ${allowedTypes.join(', ')}` });
        }
      }
      
      // For updates, validate with appropriate partial schema if type is being updated
      let validatedData = processedBody;
      if (processedBody.type) {
        // Use transformation helper for type changes to ensure complete data
        validatedData = buildRaidInsertFromTemplate(processedBody.type, processedBody);
      } else {
        // For partial updates without type change, use generic partial validation
        validatedData = insertRaidLogSchema.partial().parse(processedBody);
      }
      
      const raidLog = await storage.updateRaidLog(req.params.id, validatedData);
      if (!raidLog) {
        return res.status(404).json({ error: "RAID log not found" });
      }
      
      // Apply backward compatibility mapping to response
      const normalizedRaidLog = {
        ...raidLog,
        type: raidLog.type === 'dependency' ? 'deficiency' : raidLog.type
      };
      
      res.json(normalizedRaidLog);
    } catch (error) {
      console.error("Error updating RAID log:", error);
      res.status(400).json({ error: "Failed to update RAID log" });
    }
  });

  app.delete("/api/raid-logs/:id", async (req, res) => {
    try {
      const success = await storage.deleteRaidLog(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "RAID log not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting RAID log:", error);
      res.status(500).json({ error: "Failed to delete RAID log" });
    }
  });

  // Communications
  app.get("/api/projects/:projectId/communications", async (req, res) => {
    try {
      const communications = await storage.getCommunicationsByProject(req.params.projectId);
      res.json(communications);
    } catch (error) {
      console.error("Error fetching communications:", error);
      res.status(500).json({ error: "Failed to fetch communications" });
    }
  });

  app.post("/api/projects/:projectId/communications", async (req, res) => {
    try {
      const validatedData = insertCommunicationSchema.parse({
        ...req.body,
        projectId: req.params.projectId,
        createdById: "550e8400-e29b-41d4-a716-446655440000"
      });
      const communication = await storage.createCommunication(validatedData);
      res.status(201).json(communication);
    } catch (error) {
      console.error("Error creating communication:", error);
      res.status(400).json({ error: "Failed to create communication" });
    }
  });

  app.put("/api/communications/:id", async (req, res) => {
    try {
      const communication = await storage.updateCommunication(req.params.id, req.body);
      if (!communication) {
        return res.status(404).json({ error: "Communication not found" });
      }
      res.json(communication);
    } catch (error) {
      console.error("Error updating communication:", error);
      res.status(400).json({ error: "Failed to update communication" });
    }
  });

  app.delete("/api/communications/:id", async (req, res) => {
    try {
      const success = await storage.deleteCommunication(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Communication not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting communication:", error);
      res.status(500).json({ error: "Failed to delete communication" });
    }
  });

  // Surveys
  app.get("/api/projects/:projectId/surveys", async (req, res) => {
    try {
      const surveys = await storage.getSurveysByProject(req.params.projectId);
      res.json(surveys);
    } catch (error) {
      console.error("Error fetching surveys:", error);
      res.status(500).json({ error: "Failed to fetch surveys" });
    }
  });

  app.post("/api/projects/:projectId/surveys", async (req, res) => {
    try {
      const validatedData = insertSurveySchema.parse({
        ...req.body,
        projectId: req.params.projectId,
        createdById: "550e8400-e29b-41d4-a716-446655440000"
      });
      const survey = await storage.createSurvey(validatedData);
      res.status(201).json(survey);
    } catch (error) {
      console.error("Error creating survey:", error);
      res.status(400).json({ error: "Failed to create survey" });
    }
  });

  app.put("/api/surveys/:id", async (req, res) => {
    try {
      // Validate the update data using a partial schema (omit required fields like projectId and createdById)
      const updateSchema = baseSurveySchema.omit({ projectId: true, createdById: true }).partial();
      const validatedData = updateSchema.parse(req.body);
      
      const survey = await storage.updateSurvey(req.params.id, validatedData);
      if (!survey) {
        return res.status(404).json({ error: "Survey not found" });
      }
      res.json(survey);
    } catch (error) {
      console.error("Error updating survey:", error);
      res.status(400).json({ error: "Failed to update survey" });
    }
  });

  app.delete("/api/surveys/:id", async (req, res) => {
    try {
      const success = await storage.deleteSurvey(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Survey not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting survey:", error);
      res.status(500).json({ error: "Failed to delete survey" });
    }
  });

  // Survey Responses
  app.get("/api/surveys/:surveyId/responses", async (req, res) => {
    try {
      const responses = await storage.getResponsesBySurvey(req.params.surveyId);
      res.json(responses);
    } catch (error) {
      console.error("Error fetching survey responses:", error);
      res.status(500).json({ error: "Failed to fetch survey responses" });
    }
  });

  app.post("/api/surveys/:surveyId/responses", async (req, res) => {
    try {
      const validatedData = insertSurveyResponseSchema.parse({
        ...req.body,
        surveyId: req.params.surveyId
      });
      const response = await storage.createSurveyResponse(validatedData);
      res.status(201).json(response);
    } catch (error) {
      console.error("Error creating survey response:", error);
      res.status(400).json({ error: "Failed to create survey response" });
    }
  });

  // GPT Coach endpoints
  app.post("/api/gpt/communication-plan", async (req, res) => {
    try {
      const { projectId, projectName, description, stakeholders } = req.body;
      
      const plan = await openaiService.generateCommunicationPlan({
        name: projectName,
        description,
        stakeholders
      });

      // Save interaction
      await storage.createGptInteraction({
        projectId,
        userId: "550e8400-e29b-41d4-a716-446655440000",
        type: "communication_plan",
        prompt: `Generate communication plan for ${projectName}`,
        response: JSON.stringify(plan),
        metadata: { projectName, description }
      });

      res.json(plan);
    } catch (error) {
      console.error("Error generating communication plan:", error);
      res.status(500).json({ error: "Failed to generate communication plan" });
    }
  });

  app.post("/api/gpt/readiness-analysis", async (req, res) => {
    try {
      const { projectId, surveyResponses, stakeholderData } = req.body;
      
      const analysis = await openaiService.analyzeChangeReadiness({
        responses: surveyResponses,
        stakeholderData
      });

      // Save interaction
      await storage.createGptInteraction({
        projectId,
        userId: "550e8400-e29b-41d4-a716-446655440000",
        type: "readiness_analysis",
        prompt: "Analyze change readiness",
        response: JSON.stringify(analysis),
        metadata: { responseCount: surveyResponses.length }
      });

      res.json(analysis);
    } catch (error) {
      console.error("Error analyzing readiness:", error);
      res.status(500).json({ error: "Failed to analyze change readiness" });
    }
  });

  app.post("/api/gpt/risk-mitigation", async (req, res) => {
    try {
      const { projectId, risks } = req.body;
      
      const strategies = await openaiService.generateRiskMitigationStrategies(risks);

      // Save interaction
      await storage.createGptInteraction({
        projectId,
        userId: "550e8400-e29b-41d4-a716-446655440000",
        type: "risk_mitigation",
        prompt: "Generate risk mitigation strategies",
        response: JSON.stringify(strategies),
        metadata: { riskCount: risks.length }
      });

      res.json(strategies);
    } catch (error) {
      console.error("Error generating risk strategies:", error);
      res.status(500).json({ error: "Failed to generate risk mitigation strategies" });
    }
  });

  app.post("/api/gpt/stakeholder-tips", async (req, res) => {
    try {
      const { projectId, stakeholders } = req.body;
      
      const tips = await openaiService.getStakeholderEngagementTips(stakeholders);

      // Save interaction
      await storage.createGptInteraction({
        projectId,
        userId: "550e8400-e29b-41d4-a716-446655440000",
        type: "stakeholder_tips",
        prompt: "Get stakeholder engagement tips",
        response: JSON.stringify(tips),
        metadata: { stakeholderCount: stakeholders.length }
      });

      res.json(tips);
    } catch (error) {
      console.error("Error generating stakeholder tips:", error);
      res.status(500).json({ error: "Failed to generate stakeholder tips" });
    }
  });

  app.post("/api/gpt/generate-content", async (req, res) => {
    try {
      const { type, projectName, changeDescription, targetAudience, keyMessages } = req.body;
      
      const content = await openaiService.generateChangeContent(type, {
        projectName,
        changeDescription,
        targetAudience,
        keyMessages
      });

      res.json(content);
    } catch (error) {
      console.error("Error generating content:", error);
      res.status(500).json({ error: "Failed to generate content" });
    }
  });


  // Process Maps
  app.get("/api/projects/:projectId/process-maps", async (req, res) => {
    try {
      const processMaps = await storage.getProcessMapsByProject(req.params.projectId);
      res.json(processMaps);
    } catch (error) {
      console.error("Error fetching process maps:", error);
      res.status(500).json({ error: "Failed to fetch process maps" });
    }
  });

  app.get("/api/process-maps/:id", async (req, res) => {
    try {
      const processMap = await storage.getProcessMap(req.params.id);
      if (!processMap) {
        return res.status(404).json({ error: "Process map not found" });
      }
      res.json(processMap);
    } catch (error) {
      console.error("Error fetching process map:", error);
      res.status(500).json({ error: "Failed to fetch process map" });
    }
  });

  app.post("/api/projects/:projectId/process-maps", async (req, res) => {
    try {
      const validatedData = insertProcessMapSchema.parse({
        ...req.body,
        projectId: req.params.projectId,
        createdById: "550e8400-e29b-41d4-a716-446655440000", // For demo, using default user ID
      });
      const processMap = await storage.createProcessMap(validatedData);
      res.status(201).json(processMap);
    } catch (error) {
      console.error("Error creating process map:", error);
      res.status(400).json({ error: "Failed to create process map" });
    }
  });

  app.put("/api/process-maps/:id", async (req, res) => {
    try {
      const processMap = await storage.updateProcessMap(req.params.id, req.body);
      if (!processMap) {
        return res.status(404).json({ error: "Process map not found" });
      }
      res.json(processMap);
    } catch (error) {
      console.error("Error updating process map:", error);
      res.status(400).json({ error: "Failed to update process map" });
    }
  });

  app.delete("/api/process-maps/:id", async (req, res) => {
    try {
      const success = await storage.deleteProcessMap(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Process map not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting process map:", error);
      res.status(500).json({ error: "Failed to delete process map" });
    }
  });

  // Enhanced Role Management Routes
  app.post("/api/roles", requirePermission('canModifyRoles'), async (req, res) => {
    try {
      const validatedData = insertRoleSchema.parse(req.body);
      const role = await storage.createRole(validatedData);
      res.status(201).json(role);
    } catch (error) {
      console.error("Error creating role:", error);
      res.status(400).json({ error: "Failed to create role" });
    }
  });

  app.put("/api/roles/:id", requirePermission('canEditRoles'), async (req, res) => {
    try {
      // SECURITY: Validate input data with Zod
      const validatedData = insertRoleSchema.partial().parse(req.body);
      
      const role = await storage.updateRole(req.params.id, validatedData);
      if (!role) {
        return res.status(404).json({ error: "Role not found" });
      }
      res.json(role);
    } catch (error) {
      console.error("Error updating role:", error);
      res.status(400).json({ error: "Failed to update role" });
    }
  });

  app.delete("/api/roles/:id", requirePermission('canDeleteRoles'), async (req, res) => {
    try {
      const success = await storage.deleteRole(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Role not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting role:", error);
      res.status(500).json({ error: "Failed to delete role" });
    }
  });

  // User-Initiative Assignment Routes
  app.get("/api/users/:userId/initiatives", requirePermission('canSeeUsers'), async (req, res) => {
    try {
      const assignments = await storage.getUserInitiativeAssignments(req.params.userId);
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching user initiative assignments:", error);
      res.status(500).json({ error: "Failed to fetch user initiative assignments" });
    }
  });

  app.get("/api/projects/:projectId/assignments", async (req, res) => {
    try {
      const assignments = await storage.getInitiativeAssignments(req.params.projectId);
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching initiative assignments:", error);
      res.status(500).json({ error: "Failed to fetch initiative assignments" });
    }
  });

  app.post("/api/assignments", requirePermission('canEditAllProjects'), async (req: AuthenticatedRequest, res) => {
    try {
      // Server sets assignedById from authenticated user
      const assignmentData = {
        ...req.body,
        assignedById: req.userId || DEMO_USER_ID
      };
      
      const validatedData = insertUserInitiativeAssignmentSchema.parse(assignmentData);
      const assignment = await storage.assignUserToInitiative(validatedData);
      res.status(201).json(assignment);
    } catch (error) {
      console.error("Error creating user initiative assignment:", error);
      res.status(400).json({ error: "Failed to create assignment" });
    }
  });

  app.put("/api/assignments/:id", requirePermission('canEditAllProjects'), async (req, res) => {
    try {
      // SECURITY: Validate input data with Zod
      const validatedData = insertUserInitiativeAssignmentSchema.partial().parse(req.body);
      
      const assignment = await storage.updateUserInitiativeAssignment(req.params.id, validatedData);
      if (!assignment) {
        return res.status(404).json({ error: "Assignment not found" });
      }
      res.json(assignment);
    } catch (error) {
      console.error("Error updating assignment:", error);
      res.status(400).json({ error: "Failed to update assignment" });
    }
  });

  app.delete("/api/assignments/:id", requirePermission('canEditAllProjects'), async (req, res) => {
    try {
      const { userId, projectId } = req.body;
      if (!userId || !projectId) {
        return res.status(400).json({ error: "userId and projectId are required" });
      }
      const success = await storage.removeUserFromInitiative(userId, projectId);
      if (!success) {
        return res.status(404).json({ error: "Assignment not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting assignment:", error);
      res.status(500).json({ error: "Failed to delete assignment" });
    }
  });

  // Alternative DELETE route for cleaner frontend patterns
  app.delete("/api/assignments/remove", requirePermission('canEditAllProjects'), async (req, res) => {
    try {
      const { userId, projectId } = req.body;
      if (!userId || !projectId) {
        return res.status(400).json({ error: "userId and projectId are required" });
      }
      const success = await storage.removeUserFromInitiative(userId, projectId);
      if (!success) {
        return res.status(404).json({ error: "Assignment not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting assignment:", error);
      res.status(500).json({ error: "Failed to delete assignment" });
    }
  });

  // Enhanced User Management Routes
  app.get("/api/users/with-roles", requirePermission('canSeeUsers'), async (req, res) => {
    try {
      const usersWithRoles = await storage.getUsersWithRoles();
      res.json(usersWithRoles);
    } catch (error) {
      console.error("Error fetching users with roles:", error);
      res.status(500).json({ error: "Failed to fetch users with roles" });
    }
  });

  app.post("/api/users", requirePermission('canModifyUsers'), async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(validatedData);
      
      // User already has passwordHash removed by storage layer
      res.status(201).json(user);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(400).json({ error: "Failed to create user" });
    }
  });

  app.put("/api/users/:id", requirePermission('canEditUsers'), async (req, res) => {
    try {
      // SECURITY: Validate input data with Zod, exclude password field
      const validatedData = insertUserSchema.partial().omit({ password: true }).parse(req.body);
      
      const user = await storage.updateUser(req.params.id, validatedData);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // User already has passwordHash removed by storage layer
      res.json(user);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(400).json({ error: "Failed to update user" });
    }
  });

  app.put("/api/users/:id/role", requirePermission('canEditUsers'), async (req, res) => {
    try {
      const { roleId } = req.body;
      if (!roleId) {
        return res.status(400).json({ error: "roleId is required" });
      }
      
      const user = await storage.updateUserRole(req.params.id, roleId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // User already has passwordHash removed by storage layer
      res.json(user);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(400).json({ error: "Failed to update user role" });
    }
  });

  app.delete("/api/users/:id", requirePermission('canDeleteUsers'), async (req, res) => {
    try {
      // Check if user has dependencies (assigned tasks, initiatives, etc.)
      const userInitiatives = await storage.getUserInitiativeAssignments(req.params.id);
      if (userInitiatives.length > 0) {
        return res.status(400).json({ 
          error: "Cannot delete user with active initiative assignments. Please reassign or remove assignments first." 
        });
      }

      // Note: Could add more dependency checks (assigned tasks, owned projects, etc.)
      // For now, implementing basic deletion
      const success = await storage.deleteUser(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "User not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ error: "Failed to delete user" });
    }
  });


  app.get("/api/users/by-role/:roleId", requirePermission('canSeeUsers'), async (req, res) => {
    try {
      const users = await storage.getUsersByRole(req.params.roleId);
      // Users already have passwordHash removed by storage layer
      res.json(users);
    } catch (error) {
      console.error("Error fetching users by role:", error);
      res.status(500).json({ error: "Failed to fetch users by role" });
    }
  });

  // Permission Check Routes
  app.get("/api/users/:userId/permissions", requirePermission('canSeeUsers'), async (req, res) => {
    try {
      const permissions = await storage.getUserPermissions(req.params.userId);
      res.json(permissions);
    } catch (error) {
      console.error("Error fetching user permissions:", error);
      res.status(500).json({ error: "Failed to fetch user permissions" });
    }
  });

  app.get("/api/users/:userId/permissions/:permission", requirePermission('canSeeUsers'), async (req, res) => {
    try {
      const hasPermission = await storage.checkUserPermission(
        req.params.userId, 
        req.params.permission as keyof Permissions
      );
      res.json({ hasPermission });
    } catch (error) {
      console.error("Error checking user permission:", error);
      res.status(500).json({ error: "Failed to check user permission" });
    }
  });

  // ===== SECURITY MANAGEMENT CENTER API ROUTES =====

  // User Groups Management Routes
  app.get("/api/user-groups", requirePermission('canSeeGroups'), async (req, res) => {
    try {
      const groups = await storage.getUserGroups();
      res.json(groups);
    } catch (error) {
      console.error("Error fetching user groups:", error);
      res.status(500).json({ error: "Failed to fetch user groups" });
    }
  });

  app.get("/api/user-groups/:id", requirePermission('canSeeGroups'), async (req, res) => {
    try {
      const group = await storage.getUserGroup(req.params.id);
      if (!group) {
        return res.status(404).json({ error: "User group not found" });
      }
      res.json(group);
    } catch (error) {
      console.error("Error fetching user group:", error);
      res.status(500).json({ error: "Failed to fetch user group" });
    }
  });

  app.post("/api/user-groups", requirePermission('canModifyGroups'), async (req: AuthenticatedRequest, res) => {
    try {
      const validatedData = insertUserGroupSchema.parse(req.body);
      const group = await storage.createUserGroup(validatedData);
      res.status(201).json(group);
    } catch (error) {
      console.error("Error creating user group:", error);
      res.status(400).json({ error: "Failed to create user group" });
    }
  });

  app.put("/api/user-groups/:id", requirePermission('canEditGroups'), async (req, res) => {
    try {
      const validatedData = insertUserGroupSchema.partial().parse(req.body);
      const group = await storage.updateUserGroup(req.params.id, validatedData);
      if (!group) {
        return res.status(404).json({ error: "User group not found" });
      }
      res.json(group);
    } catch (error) {
      console.error("Error updating user group:", error);
      res.status(400).json({ error: "Failed to update user group" });
    }
  });

  app.delete("/api/user-groups/:id", requirePermission('canDeleteGroups'), async (req, res) => {
    try {
      const success = await storage.deleteUserGroup(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "User group not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting user group:", error);
      res.status(500).json({ error: "Failed to delete user group" });
    }
  });

  // User Group Memberships Management Routes
  app.get("/api/users/:userId/groups", requirePermission('canSeeGroups'), async (req, res) => {
    try {
      const memberships = await storage.getUserGroupMemberships(req.params.userId);
      res.json(memberships);
    } catch (error) {
      console.error("Error fetching user group memberships:", error);
      res.status(500).json({ error: "Failed to fetch user group memberships" });
    }
  });

  app.get("/api/user-groups/:groupId/members", requirePermission('canSeeGroups'), async (req, res) => {
    try {
      const memberships = await storage.getGroupMemberships(req.params.groupId);
      res.json(memberships);
    } catch (error) {
      console.error("Error fetching group memberships:", error);
      res.status(500).json({ error: "Failed to fetch group memberships" });
    }
  });

  app.post("/api/user-group-memberships", requirePermission('canModifyGroups'), async (req: AuthenticatedRequest, res) => {
    try {
      // Server sets assignedById from authenticated user
      const membershipData = {
        ...req.body,
        assignedById: req.userId || DEMO_USER_ID
      };
      
      const validatedData = insertUserGroupMembershipSchema.parse(membershipData);
      const membership = await storage.assignUserToGroup(validatedData);
      res.status(201).json(membership);
    } catch (error) {
      console.error("Error assigning user to group:", error);
      res.status(400).json({ error: "Failed to assign user to group" });
    }
  });

  app.delete("/api/user-group-memberships/remove", requirePermission('canModifyGroups'), async (req, res) => {
    try {
      const { userId, groupId } = req.body;
      if (!userId || !groupId) {
        return res.status(400).json({ error: "userId and groupId are required" });
      }
      
      const success = await storage.removeUserFromGroup(userId, groupId);
      if (!success) {
        return res.status(404).json({ error: "User group membership not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing user from group:", error);
      res.status(500).json({ error: "Failed to remove user from group" });
    }
  });

  // Individual User Permissions Management Routes
  app.get("/api/users/:userId/individual-permissions", requirePermission('canSeeSecuritySettings'), async (req, res) => {
    try {
      const permissions = await storage.getUserIndividualPermissions(req.params.userId);
      res.json(permissions || null);
    } catch (error) {
      console.error("Error fetching user individual permissions:", error);
      res.status(500).json({ error: "Failed to fetch user individual permissions" });
    }
  });

  app.post("/api/users/:userId/individual-permissions", requirePermission('canModifySecuritySettings'), async (req: AuthenticatedRequest, res) => {
    try {
      // Server sets assignedById from authenticated user and userId from params
      const permissionData = {
        userId: req.params.userId,
        permissions: req.body.permissions,
        assignedById: req.userId || DEMO_USER_ID
      };
      
      const validatedData = insertUserPermissionSchema.parse(permissionData);
      const permission = await storage.setUserIndividualPermissions(validatedData);
      res.status(201).json(permission);
    } catch (error) {
      console.error("Error setting user individual permissions:", error);
      res.status(400).json({ error: "Failed to set user individual permissions" });
    }
  });

  app.put("/api/users/:userId/individual-permissions", requirePermission('canEditSecuritySettings'), async (req: AuthenticatedRequest, res) => {
    try {
      const updateData = {
        permissions: req.body.permissions
      };
      
      const validatedData = insertUserPermissionSchema.partial().parse(updateData);
      const permission = await storage.updateUserIndividualPermissions(req.params.userId, validatedData);
      if (!permission) {
        return res.status(404).json({ error: "User individual permissions not found" });
      }
      res.json(permission);
    } catch (error) {
      console.error("Error updating user individual permissions:", error);
      res.status(400).json({ error: "Failed to update user individual permissions" });
    }
  });

  app.delete("/api/users/:userId/individual-permissions", requirePermission('canDeleteSecuritySettings'), async (req, res) => {
    try {
      const success = await storage.clearUserIndividualPermissions(req.params.userId);
      if (!success) {
        return res.status(404).json({ error: "User individual permissions not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error clearing user individual permissions:", error);
      res.status(500).json({ error: "Failed to clear user individual permissions" });
    }
  });

  // Enhanced Permission Resolution Routes
  app.get("/api/users/:userId/resolved-permissions", requirePermission('canSeeSecuritySettings'), async (req, res) => {
    try {
      const resolvedPermissions = await storage.resolveUserPermissions(req.params.userId);
      res.json(resolvedPermissions);
    } catch (error) {
      console.error("Error resolving user permissions:", error);
      res.status(500).json({ error: "Failed to resolve user permissions" });
    }
  });

  app.get("/api/users/:userId/security-summary", requirePermission('canSeeSecuritySettings'), async (req, res) => {
    try {
      const securitySummary = await storage.getUserSecuritySummary(req.params.userId);
      res.json(securitySummary);
    } catch (error) {
      console.error("Error fetching user security summary:", error);
      res.status(500).json({ error: "Failed to fetch user security summary" });
    }
  });

  app.get("/api/users/:userId/enhanced-permissions/:permission", requirePermission('canSeeSecuritySettings'), async (req, res) => {
    try {
      const hasPermission = await storage.checkEnhancedUserPermission(
        req.params.userId, 
        req.params.permission as keyof Permissions
      );
      res.json({ hasPermission });
    } catch (error) {
      console.error("Error checking enhanced user permission:", error);
      res.status(500).json({ error: "Failed to check enhanced user permission" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
