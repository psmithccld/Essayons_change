import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";

// SECURITY: Session type declaration
declare module 'express-session' {
  interface SessionData {
    userId?: string;
    user?: {
      id: string;
      username: string;
      name: string;
      roleId: string;
      isActive: boolean;
    };
  }
}

interface SessionRequest extends Request {
  session: {
    userId?: string;
    user?: {
      id: string;
      username: string;
      name: string;
      roleId: string;
      isActive: boolean;
    };
    regenerate(callback: (err?: any) => void): void;
    destroy(callback: (err?: any) => void): void;
    save(callback?: (err?: any) => void): void;
  };
}
import { storage } from "./storage";
import { 
  insertProjectSchema, insertTaskSchema, insertStakeholderSchema, insertRaidLogSchema,
  insertCommunicationSchema, insertCommunicationStrategySchema, insertCommunicationTemplateSchema, insertSurveySchema, baseSurveySchema, insertSurveyResponseSchema, insertGptInteractionSchema,
  insertMilestoneSchema, insertChecklistTemplateSchema, insertProcessMapSchema,
  insertRiskSchema, insertActionSchema, insertIssueSchema, insertDeficiencySchema,
  insertRoleSchema, insertUserSchema, insertUserInitiativeAssignmentSchema,
  insertUserGroupMembershipSchema, insertUserPermissionSchema, insertNotificationSchema,
  type UserInitiativeAssignment, type InsertUserInitiativeAssignment, type User, type Role, type Permissions, type Notification
} from "@shared/schema";
import * as openaiService from "./openai";
import { sendTaskAssignmentNotification, sendBulkGroupEmail, sendP2PEmail } from "./services/emailService";
import { z } from "zod";

// Input validation schemas
const distributionRequestSchema = z.object({
  distributionMethod: z.enum(['email', 'print', 'digital_display']),
  recipients: z.array(z.string().email()).optional(),
  dryRun: z.boolean().default(false),
  environment: z.string().optional()
});

const exportRequestSchema = z.object({
  format: z.enum(['powerpoint', 'pdf', 'canva'])
});

// GPT Content Generation schema
const generateGroupEmailContentSchema = z.object({
  projectName: z.string().min(1, "Project name is required"),
  changeDescription: z.string().optional(),
  targetAudience: z.array(z.string()).min(1, "At least one target audience is required"),
  keyMessages: z.array(z.string()).optional(),
  raidLogContext: z.array(z.object({
    id: z.string(),
    title: z.string(),
    type: z.string(),
    description: z.string()
  })).optional(),
  tone: z.enum(['professional', 'friendly', 'urgent', 'formal']).default('professional'),
  urgency: z.enum(['low', 'normal', 'high', 'critical']).default('normal')
});

// GPT Content Refinement schema
const refineGroupEmailContentSchema = z.object({
  currentContent: z.object({
    title: z.string(),
    content: z.string(),
    callToAction: z.string().optional()
  }),
  refinementRequest: z.string().min(1, "Refinement request is required"),
  context: z.object({}).optional(),
  tone: z.enum(['professional', 'friendly', 'urgent', 'formal']).default('professional'),
  urgency: z.enum(['low', 'normal', 'high', 'critical']).default('normal')
});

// P2P Email Content Generation schema
const generateP2PEmailContentSchema = z.object({
  projectName: z.string().min(1, "Project name is required"),
  recipientName: z.string().min(1, "Recipient name is required"),
  recipientRole: z.string().optional(),
  changeDescription: z.string().optional(),
  communicationPurpose: z.enum(['check_in', 'update', 'request', 'follow_up', 'collaboration', 'feedback']),
  keyMessages: z.array(z.string()).optional(),
  raidLogContext: z.array(z.object({
    id: z.string(),
    title: z.string(),
    type: z.string(),
    description: z.string()
  })).optional(),
  tone: z.enum(['professional', 'friendly', 'formal', 'conversational']).default('professional'),
  urgency: z.enum(['low', 'normal', 'high', 'critical']).default('normal'),
  relationship: z.enum(['colleague', 'manager', 'stakeholder', 'external']).default('colleague')
});

// P2P Email Content Refinement schema
const refineP2PEmailContentSchema = z.object({
  currentContent: z.object({
    title: z.string(),
    content: z.string(),
    callToAction: z.string().optional()
  }),
  refinementRequest: z.string().min(1, "Refinement request is required"),
  recipientName: z.string().min(1, "Recipient name is required"),
  relationship: z.enum(['colleague', 'manager', 'stakeholder', 'external']).default('colleague'),
  tone: z.enum(['professional', 'friendly', 'formal', 'conversational']).default('professional'),
  urgency: z.enum(['low', 'normal', 'high', 'critical']).default('normal')
});

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Rate limiting helper
const checkRateLimit = (userId: string, limit: number = 10, windowMs: number = 60000): boolean => {
  const now = Date.now();
  const userLimit = rateLimitStore.get(userId);
  
  if (!userLimit || now > userLimit.resetTime) {
    rateLimitStore.set(userId, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (userLimit.count >= limit) {
    return false;
  }
  
  userLimit.count++;
  return true;
};

// Environment safety check
const checkEnvironmentSafety = (operation: 'email' | 'bulk_email'): { safe: boolean; message?: string } => {
  const isProduction = process.env.NODE_ENV === 'production';
  const isDevelopment = process.env.NODE_ENV === 'development';
  const allowProductionEmail = process.env.ALLOW_PRODUCTION_EMAIL === 'true';
  
  if (isProduction && !allowProductionEmail && operation === 'bulk_email') {
    return {
      safe: false,
      message: 'Bulk email distribution is disabled in production without explicit configuration'
    };
  }
  
  if (isDevelopment && !process.env.SENDGRID_API_KEY) {
    return {
      safe: false,
      message: 'Email service not configured in development environment'
    };
  }
  
  return { safe: true };
};

// SECURITY: Session-based authentication interfaces
interface AuthenticatedRequest extends SessionRequest {
  userId?: string;
  user?: {
    id: string;
    username: string;
    name: string;
    roleId: string;
    isActive: boolean;
  };
}

// SECURITY: Authentication middleware - uses secure session-based authentication
const requireAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    // SECURITY: Block x-user-id header in production to prevent spoofing
    if (process.env.NODE_ENV === 'production' && req.headers['x-user-id']) {
      console.warn('Blocked x-user-id header in production environment');
      return res.status(400).json({ error: "Invalid authentication method" });
    }
    
    // Get userId from session (secure, server-side stored)
    let userId = req.session?.userId;
    
    // SECURITY: Only allow demo user fallback in development environment
    if (!userId && process.env.NODE_ENV === 'development') {
      // Check if x-user-id header is provided for development convenience
      const headerUserId = req.headers['x-user-id'] as string;
      if (headerUserId) {
        userId = headerUserId;
        console.warn('Using x-user-id header in development mode - NOT SECURE FOR PRODUCTION');
      } else {
        // Fall back to demo user only in development
        userId = "550e8400-e29b-41d4-a716-446655440000";
        console.warn('Using demo user ID in development mode');
      }
    }
    
    if (!userId) {
      return res.status(401).json({ error: "Authentication required. Please log in." });
    }
    
    // Verify user exists and is active
    const user = await storage.getUser(userId);
    if (!user || !user.isActive) {
      // Clear invalid session
      if (req.session) {
        req.session.userId = undefined;
        req.session.user = undefined;
      }
      return res.status(401).json({ error: "Invalid or inactive user account." });
    }
    
    // Store user info for use in route handlers
    req.userId = userId;
    req.user = {
      id: user.id,
      username: user.username,
      name: user.name,
      roleId: user.roleId,
      isActive: user.isActive
    };
    
    // Update session with current user data
    if (req.session && process.env.NODE_ENV !== 'development') {
      req.session.userId = user.id;
      req.session.user = req.user;
    }
    
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(500).json({ error: "Authentication check failed" });
  }
};

// Permission middleware factory - requires authentication first
const requirePermission = (permission: keyof Permissions) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.userId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const hasPermission = await storage.checkUserPermission(req.userId, permission);
      if (!hasPermission) {
        return res.status(403).json({ 
          error: `Access denied. Required permission: ${permission}` 
        });
      }
      
      next();
    } catch (error) {
      console.error("Error checking permission:", error);
      res.status(500).json({ error: "Permission check failed" });
    }
  };
};

// Combined middleware for auth + permission
const requireAuthAndPermission = (permission: keyof Permissions) => {
  return [requireAuth, requirePermission(permission)];
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
      // Provide defaults for required risk-specific fields from simple form
      const riskData = {
        ...processedData,
        likelihood: processedData.likelihood || 3, // Default to medium likelihood
        riskLevel: processedData.riskLevel || 3, // Default to medium risk level 
        potentialOutcome: processedData.potentialOutcome || processedData.description || "Risk identified",
        whoWillManage: processedData.whoWillManage || "To be determined",
        notes: processedData.description || processedData.notes,
        // Keep required database fields
        title: processedData.title || "Risk Item",
        description: processedData.description || processedData.potentialOutcome || processedData.title || "Risk identified",
        severity: processedData.severity || "medium",
        impact: processedData.impact || "medium",
      };
      
      // Clean assigneeId if it's empty or invalid
      if (!riskData.assigneeId || riskData.assigneeId === "" || riskData.assigneeId === "none") {
        delete riskData.assigneeId;
      }
      
      // For risks, use the database fields directly instead of type-specific validation
      templateValidated = riskData;
      description = templateValidated.description;
      break;
    case 'action':
      // Provide defaults for required action-specific fields from simple form
      const actionData = {
        ...processedData,
        event: processedData.event || processedData.description || processedData.title || "Action required",
        dueOut: processedData.dueOut || "To be determined",
        notes: processedData.description || processedData.notes,
        // Keep required database fields
        title: processedData.title || "Action Item",
        description: processedData.description || processedData.event || processedData.title || "Action required",
        severity: processedData.severity || "medium",
        impact: processedData.impact || "medium",
      };
      
      // Clean assigneeId if it's empty or invalid
      if (!actionData.assigneeId || actionData.assigneeId === "" || actionData.assigneeId === "none") {
        delete actionData.assigneeId;
      }
      
      // For actions, use the database fields directly instead of type-specific validation
      templateValidated = actionData;
      description = templateValidated.description;
      break;
    case 'issue':
      templateValidated = insertIssueSchema.parse(processedData);
      description = templateValidated.description || templateValidated.title || 'Issue description';
      break;
    case 'deficiency':
      // Provide defaults for required deficiency-specific fields from simple form
      const deficiencyData = {
        ...processedData,
        category: processedData.category || "General", // Default category
        resolutionStatus: processedData.resolutionStatus || "pending" // Default status
      };
      templateValidated = insertDeficiencySchema.parse(deficiencyData);
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
  };
  
  // Only add severity and impact for types that support them
  if (type === 'issue' || type === 'deficiency') {
    finalData.severity = (templateValidated as any).severity || 'medium';
    finalData.impact = (templateValidated as any).impact || 'medium';
  }
  
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

  // SECURITY: Authentication endpoints with session management
  app.post("/api/auth/login", async (req: SessionRequest, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
      }
      
      const user = await storage.verifyPassword(username, password);
      if (!user) {
        return res.status(401).json({ error: "Invalid username or password" });
      }
      
      if (!user.isActive) {
        return res.status(401).json({ error: "Account is inactive" });
      }
      
      // Get user role information
      const role = await storage.getRole(user.roleId);
      if (!role) {
        return res.status(500).json({ error: "User role not found" });
      }
      
      // SECURITY: Regenerate session ID to prevent session fixation attacks
      req.session.regenerate((err) => {
        if (err) {
          console.error("Session regeneration error:", err);
          return res.status(500).json({ error: "Session creation failed" });
        }
        
        // Store user information in session
        req.session.userId = user.id;
        req.session.user = {
          id: user.id,
          username: user.username,
          name: user.name,
          roleId: user.roleId,
          isActive: user.isActive
        };
        
        // Save session
        req.session.save((err) => {
          if (err) {
            console.error("Session save error:", err);
            return res.status(500).json({ error: "Session creation failed" });
          }
          
          // Return user data and permissions (passwordHash already removed by storage layer)
          res.json({
            user: user,
            role,
            permissions: role.permissions,
            sessionEstablished: true
          });
        });
      });
    } catch (error) {
      console.error("Error during login:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });
  
  // SECURITY: Logout endpoint that destroys sessions
  app.post("/api/auth/logout", async (req: SessionRequest, res) => {
    try {
      if (req.session) {
        req.session.destroy((err) => {
          if (err) {
            console.error("Session destruction error:", err);
            return res.status(500).json({ error: "Logout failed" });
          }
          
          // Clear the session cookie
          res.clearCookie('essayons.sid');
          res.json({ message: "Logged out successfully" });
        });
      } else {
        res.json({ message: "No active session found" });
      }
    } catch (error) {
      console.error("Error during logout:", error);
      res.status(500).json({ error: "Logout failed" });
    }
  });
  
  // SECURITY: Check authentication status endpoint
  app.get("/api/auth/status", async (req: SessionRequest, res) => {
    try {
      if (req.session?.userId) {
        // Verify user still exists and is active
        const user = await storage.getUser(req.session.userId);
        if (user && user.isActive) {
          const role = await storage.getRole(user.roleId);
          return res.json({
            authenticated: true,
            user: {
              id: user.id,
              username: user.username,
              name: user.name,
              roleId: user.roleId,
              isActive: user.isActive
            },
            role,
            permissions: role?.permissions
          });
        } else {
          // User no longer exists or is inactive, clear session
          req.session.destroy(() => {});
        }
      }
      
      res.json({ authenticated: false });
    } catch (error) {
      console.error("Error checking auth status:", error);
      res.status(500).json({ error: "Authentication status check failed" });
    }
  });

  // RBAC: User permissions endpoint for frontend permission gating
  app.get("/api/users/me/permissions", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!; // Always available after requireAuth middleware
      
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

  // Notifications endpoints
  // GET /api/notifications - get user's notifications (unread first, with pagination)
  app.get("/api/notifications", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      const unreadOnly = req.query.unread_only === 'true';
      
      const result = await storage.getNotifications(userId, { limit, offset, unreadOnly });
      res.json(result);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  // POST /api/notifications/:id/read - mark single notification as read
  app.post("/api/notifications/:id/read", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const notificationId = req.params.id;
      
      const success = await storage.markNotificationAsRead(notificationId, userId);
      if (!success) {
        return res.status(404).json({ error: "Notification not found or access denied" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ error: "Failed to mark notification as read" });
    }
  });

  // POST /api/notifications/mark-all-read - mark all user notifications as read
  app.post("/api/notifications/mark-all-read", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      
      const count = await storage.markAllNotificationsAsRead(userId);
      res.json({ success: true, markedAsRead: count });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ error: "Failed to mark all notifications as read" });
    }
  });

  // DELETE /api/notifications/:id - delete single notification
  app.delete("/api/notifications/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const notificationId = req.params.id;
      
      const success = await storage.deleteNotification(notificationId, userId);
      if (!success) {
        return res.status(404).json({ error: "Notification not found or access denied" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting notification:", error);
      res.status(500).json({ error: "Failed to delete notification" });
    }
  });

  // DELETE /api/notifications/clear-all - clear all user notifications
  app.delete("/api/notifications/clear-all", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      
      const count = await storage.clearAllNotifications(userId);
      res.json({ success: true, deletedCount: count });
    } catch (error) {
      console.error("Error clearing all notifications:", error);
      res.status(500).json({ error: "Failed to clear all notifications" });
    }
  });

  // GET /api/notifications/unread-count - get unread notification count
  app.get("/api/notifications/unread-count", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      
      const count = await storage.getUnreadNotificationCount(userId);
      res.json({ count });
    } catch (error) {
      console.error("Error fetching unread notification count:", error);
      res.status(500).json({ error: "Failed to fetch unread notification count" });
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
  app.get("/api/dashboard/stats", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const stats = await storage.getDashboardStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
  });

  // Projects
  app.get("/api/projects", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
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
        ownerId: req.userId!, // Use authenticated user ID
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
      
      // Get original project to check for status changes
      const originalProject = await storage.getProject(req.params.id);
      if (!originalProject) {
        return res.status(404).json({ error: "Project not found" });
      }
      
      const project = await storage.updateProject(req.params.id, validatedData);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      
      // Create notifications for assigned users if status/phase changed
      if (validatedData.status && validatedData.status !== originalProject.status) {
        try {
          const assignments = await storage.getInitiativeAssignments(req.params.id);
          if (assignments.length > 0) {
            const notificationPromises = assignments.map(assignment => 
              storage.createNotification({
                userId: assignment.userId,
                title: "Initiative Status Changed",
                message: `The status of initiative "${project.name}" has changed from ${originalProject.status} to ${project.status}`,
                type: "phase_change",
                relatedId: project.id,
                relatedType: "project"
              })
            );
            
            await Promise.all(notificationPromises);
          }
        } catch (notificationError) {
          console.error("Error creating phase change notifications:", notificationError);
          // Don't fail the project update if notification creation fails
        }
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
            
            // Create notification for the assigned user
            try {
              await storage.createNotification({
                userId: assignment.userId,
                title: "Initiative Assignment",
                message: `You have been assigned to the copied initiative "${copiedProject.name}" as ${assignment.role}`,
                type: "initiative_assignment",
                relatedId: copiedProject.id,
                relatedType: "project"
              });
            } catch (notificationError) {
              console.error("Error creating assignment notification during copy:", notificationError);
              // Don't fail the copy if notification creation fails
            }
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

  app.post("/api/checklist-templates", requireAuthAndPermission('canModifyChecklistTemplates'), async (req: AuthenticatedRequest, res) => {
    try {
      const processedData = {
        ...req.body,
        createdById: req.userId!,
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

  // Communication Templates
  app.get("/api/communication-templates", requireAuthAndPermission('canSeeCommunications'), async (req: AuthenticatedRequest, res) => {
    try {
      const templates = await storage.getCommunicationTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching communication templates:", error);
      res.status(500).json({ error: "Failed to fetch communication templates" });
    }
  });

  app.get("/api/communication-templates/active", requireAuthAndPermission('canSeeCommunications'), async (req: AuthenticatedRequest, res) => {
    try {
      const templates = await storage.getActiveCommunicationTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching active communication templates:", error);
      res.status(500).json({ error: "Failed to fetch active communication templates" });
    }
  });

  app.get("/api/communication-templates/category/:category", requireAuthAndPermission('canSeeCommunications'), async (req: AuthenticatedRequest, res) => {
    try {
      const templates = await storage.getCommunicationTemplatesByCategory(req.params.category);
      res.json(templates);
    } catch (error) {
      console.error("Error fetching communication templates by category:", error);
      res.status(500).json({ error: "Failed to fetch communication templates by category" });
    }
  });

  app.get("/api/communication-templates/:id", requireAuthAndPermission('canSeeCommunications'), async (req: AuthenticatedRequest, res) => {
    try {
      const template = await storage.getCommunicationTemplate(req.params.id);
      if (!template) {
        return res.status(404).json({ error: "Communication template not found" });
      }
      res.json(template);
    } catch (error) {
      console.error("Error fetching communication template:", error);
      res.status(500).json({ error: "Failed to fetch communication template" });
    }
  });

  app.post("/api/communication-templates", requireAuthAndPermission('canModifyCommunications'), async (req: AuthenticatedRequest, res) => {
    try {
      const processedData = {
        ...req.body,
        createdById: req.userId || DEMO_USER_ID,
      };
      
      const validatedData = insertCommunicationTemplateSchema.parse(processedData);
      const template = await storage.createCommunicationTemplate(validatedData);
      res.status(201).json(template);
    } catch (error) {
      console.error("Error creating communication template:", error);
      res.status(400).json({ error: "Failed to create communication template" });
    }
  });

  app.put("/api/communication-templates/:id", requireAuthAndPermission('canEditCommunications'), async (req: AuthenticatedRequest, res) => {
    try {
      const template = await storage.updateCommunicationTemplate(req.params.id, req.body);
      if (!template) {
        return res.status(404).json({ error: "Communication template not found" });
      }
      res.json(template);
    } catch (error) {
      console.error("Error updating communication template:", error);
      res.status(400).json({ error: "Failed to update communication template" });
    }
  });

  app.delete("/api/communication-templates/:id", requireAuthAndPermission('canDeleteCommunications'), async (req: AuthenticatedRequest, res) => {
    try {
      const success = await storage.deleteCommunicationTemplate(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Communication template not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting communication template:", error);
      res.status(500).json({ error: "Failed to delete communication template" });
    }
  });

  // Increment template usage count
  app.post("/api/communication-templates/:id/usage", requireAuthAndPermission('canSeeCommunications'), async (req: AuthenticatedRequest, res) => {
    try {
      await storage.incrementTemplateUsage(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error incrementing template usage:", error);
      res.status(500).json({ error: "Failed to increment template usage" });
    }
  });

  // Repository API Endpoints
  
  // Advanced search for communications
  app.post('/api/communications/search', requireAuth, requirePermission('canSeeCommunications'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const searchParams = req.body;
      
      // SECURITY: Override client-sent projectIds with server-validated project access
      const authorizedProjectIds = await storage.getUserAuthorizedProjectIds(req.userId!);
      
      // If client sent specific projectIds, validate them against authorized projects
      if (searchParams.projectIds && Array.isArray(searchParams.projectIds)) {
        searchParams.projectIds = await storage.validateUserProjectAccess(req.userId!, searchParams.projectIds);
        if (searchParams.projectIds.length === 0) {
          return res.status(403).json({ error: 'Access denied to requested projects' });
        }
      } else {
        // If no specific projects requested, search all authorized projects
        searchParams.projectIds = authorizedProjectIds;
      }
      
      // Ensure user can only search projects they have access to
      if (searchParams.projectIds.length === 0) {
        return res.json({ communications: [], total: 0 });
      }
      
      const result = await storage.searchCommunications(searchParams);
      res.json(result);
    } catch (error) {
      console.error('Communication search error:', error);
      res.status(500).json({ error: 'Failed to search communications' });
    }
  });

  // Get communication metrics and analytics
  app.get('/api/communications/metrics', requireAuth, requirePermission('canSeeCommunications'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { projectId, type } = req.query;
      
      // SECURITY: ALWAYS get user's authorized projects for filtering
      const authorizedProjectIds = await storage.getUserAuthorizedProjectIds(req.userId!);
      
      // SECURITY: Validate project access if specific project requested
      if (projectId && !authorizedProjectIds.includes(projectId as string)) {
        return res.status(403).json({ error: 'Access denied to requested project' });
      }
      
      // SECURITY: Pass authorizedProjectIds to storage for SQL-level filtering
      const metrics = await storage.getCommunicationMetrics({
        projectId: projectId as string | undefined,
        type: type as string | undefined,
        authorizedProjectIds
      });
      res.json(metrics);
    } catch (error) {
      console.error('Communication metrics error:', error);
      res.status(500).json({ error: 'Failed to get communication metrics' });
    }
  });

  // Get communication version history
  app.get('/api/communications/:id/versions', requireAuth, requirePermission('canSeeCommunications'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      
      // SECURITY: Get user's authorized projects for access control
      const authorizedProjectIds = await storage.getUserAuthorizedProjectIds(req.userId!);
      
      // SECURITY: Storage method now validates communication access internally
      const versions = await storage.getCommunicationVersionHistory(id, authorizedProjectIds);
      
      // Return 403 if empty result due to unauthorized access
      if (versions.length === 0) {
        // Check if communication exists but user doesn't have access
        const communication = await storage.getCommunication(id);
        if (communication && !authorizedProjectIds.includes(communication.projectId)) {
          return res.status(403).json({ error: 'Access denied to communication version history' });
        }
      }
      
      res.json(versions);
    } catch (error) {
      console.error('Communication version history error:', error);
      res.status(500).json({ error: 'Failed to get communication version history' });
    }
  });

  // Archive communications (bulk action)
  app.post('/api/communications/archive', requireAuth, requirePermission('canModifyCommunications'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'Invalid or empty ids array' });
      }
      
      // SECURITY: Validate that user has access to all communications being archived
      const authorizedProjectIds = await storage.getUserAuthorizedProjectIds(req.userId!);
      
      // Check each communication to ensure user has access to its project
      for (const id of ids) {
        const communication = await storage.getCommunication(id);
        if (!communication || !authorizedProjectIds.includes(communication.projectId)) {
          return res.status(403).json({ error: `Access denied to communication ${id}` });
        }
      }
      
      const result = await storage.archiveCommunications(ids, req.userId!);
      res.json(result);
    } catch (error) {
      console.error('Archive communications error:', error);
      res.status(500).json({ error: 'Failed to archive communications' });
    }
  });

  // Update communication engagement metrics
  app.patch('/api/communications/:id/engagement', requireAuth, requirePermission('canModifyCommunications'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const engagement = req.body;
      await storage.updateCommunicationEngagement(id, engagement);
      res.json({ success: true });
    } catch (error) {
      console.error('Update communication engagement error:', error);
      res.status(500).json({ error: 'Failed to update communication engagement' });
    }
  });

  // Get communications by stakeholder
  app.get('/api/communications/by-stakeholder/:stakeholderId', requireAuth, requirePermission('canSeeCommunications'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { stakeholderId } = req.params;
      const { projectId } = req.query;
      
      // SECURITY: Validate project access if specific project requested
      if (projectId) {
        const authorizedProjectIds = await storage.getUserAuthorizedProjectIds(req.userId!);
        if (!authorizedProjectIds.includes(projectId as string)) {
          return res.status(403).json({ error: 'Access denied to requested project' });
        }
      }
      
      const communications = await storage.getCommunicationsByStakeholder(
        stakeholderId, 
        projectId as string | undefined
      );
      res.json(communications);
    } catch (error) {
      console.error('Get communications by stakeholder error:', error);
      res.status(500).json({ error: 'Failed to get communications by stakeholder' });
    }
  });

  // GPT Content Generation for Flyers
  app.post("/api/gpt/generate-flyer-content", requirePermission('canModifyCommunications'), async (req, res) => {
    try {
      const { projectName, changeDescription, targetAudience, keyMessages, template } = req.body;
      
      if (!projectName || !targetAudience) {
        return res.status(400).json({ error: "Project name and target audience are required" });
      }

      const content = await openaiService.generateChangeContent('flyer', {
        projectName,
        changeDescription: changeDescription || '',
        targetAudience: Array.isArray(targetAudience) ? targetAudience : [targetAudience],
        keyMessages: Array.isArray(keyMessages) ? keyMessages : (keyMessages ? [keyMessages] : [])
      });

      res.json(content);
    } catch (error) {
      console.error("Error generating flyer content:", error);
      res.status(500).json({ error: "Failed to generate flyer content" });
    }
  });

  // GPT Content Refinement for Flyers
  app.post("/api/gpt/refine-flyer-content", requirePermission('canModifyCommunications'), async (req, res) => {
    try {
      const { currentContent, refinementRequest, context } = req.body;
      
      if (!currentContent || !refinementRequest) {
        return res.status(400).json({ error: "Current content and refinement request are required" });
      }

      const prompt = `Refine this flyer content based on the request:

Current content:
Title: ${currentContent.title || 'No title'}
Content: ${currentContent.content || 'No content'}
Call to Action: ${currentContent.callToAction || 'No CTA'}

Refinement request: ${refinementRequest}

Context: ${JSON.stringify(context || {})}

Return the refined content in JSON format:
{
  "title": "refined title",
  "content": "refined content body",
  "callToAction": "refined call to action"
}`;

      const { openai } = await import("./openai");
      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const refinedContent = JSON.parse(response.choices[0].message.content || "{}");
      res.json(refinedContent);
    } catch (error) {
      console.error("Error refining flyer content:", error);
      res.status(500).json({ error: "Failed to refine flyer content" });
    }
  });

  // GPT Content Generation for Group Emails
  app.post("/api/gpt/generate-group-email-content", requirePermission('canModifyCommunications'), async (req: AuthenticatedRequest, res) => {
    try {
      // SECURITY: Input validation with Zod
      const validatedInput = generateGroupEmailContentSchema.parse(req.body);
      const { projectName, changeDescription, targetAudience, keyMessages, raidLogContext, tone, urgency } = validatedInput;

      const raidContextString = raidLogContext && raidLogContext.length > 0 
        ? `\n\nRelated Project Information:\n${raidLogContext.map((item: any) => `${item.type.toUpperCase()}: ${item.title} - ${item.description}`).join('\n')}`
        : '';

      const content = await openaiService.generateChangeContent('email', {
        projectName,
        changeDescription: (changeDescription || '') + raidContextString,
        targetAudience: Array.isArray(targetAudience) ? targetAudience : [targetAudience],
        keyMessages: Array.isArray(keyMessages) ? keyMessages : (keyMessages ? [keyMessages] : [])
      });

      res.json(content);
    } catch (error) {
      console.error("Error generating group email content:", error);
      res.status(500).json({ error: "Failed to generate group email content" });
    }
  });

  // GPT Content Refinement for Group Emails
  app.post("/api/gpt/refine-group-email-content", requirePermission('canModifyCommunications'), async (req: AuthenticatedRequest, res) => {
    try {
      // SECURITY: Input validation with Zod
      const validatedInput = refineGroupEmailContentSchema.parse(req.body);
      const { currentContent, refinementRequest, context, tone, urgency } = validatedInput;

      const prompt = `Refine this group email content based on the request:

Current content:
Subject: ${currentContent.title || 'No subject'}
Content: ${currentContent.content || 'No content'}
Call to Action: ${currentContent.callToAction || 'No CTA'}

Refinement request: ${refinementRequest}
Tone: ${tone || 'Professional'}
Urgency: ${urgency || 'Normal'}

Context: ${JSON.stringify(context || {})}

Create professional email content that:
- Uses appropriate tone (${tone || 'Professional'})
- Reflects urgency level (${urgency || 'Normal'})
- Maintains clear communication
- Includes actionable next steps

Return the refined content in JSON format:
{
  "title": "refined email subject",
  "content": "refined email body",
  "callToAction": "refined call to action"
}`;

      const { openai } = await import("./openai");
      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const refinedContent = JSON.parse(response.choices[0].message.content || "{}");
      res.json(refinedContent);
    } catch (error) {
      console.error("Error refining group email content:", error);
      res.status(500).json({ error: "Failed to refine group email content" });
    }
  });

  // GPT Content Generation for P2P Emails
  app.post("/api/gpt/generate-p2p-email-content", requireAuthAndPermission('canSendEmails'), async (req: AuthenticatedRequest, res) => {
    try {
      // SECURITY: Input validation with Zod
      const validatedInput = generateP2PEmailContentSchema.parse(req.body);
      const { 
        projectName, 
        recipientName, 
        recipientRole, 
        changeDescription, 
        communicationPurpose, 
        keyMessages, 
        raidLogContext, 
        tone, 
        urgency,
        relationship 
      } = validatedInput;

      // SECURITY: Rate limiting check for P2P content generation
      if (!checkRateLimit(req.userId!, 20, 300000)) { // 20 generations per 5 minutes
        return res.status(429).json({ 
          error: "Rate limit exceeded. Please wait before generating more content." 
        });
      }

      const raidContextString = raidLogContext && raidLogContext.length > 0 
        ? `\n\nRelated Project Information:\n${raidLogContext.map((item: any) => `${item.type.toUpperCase()}: ${item.title} - ${item.description}`).join('\n')}`
        : '';

      const purposeContext = {
        'check_in': 'This is a personal check-in to see how they are feeling about the change',
        'update': 'This is an update to keep them informed about progress or developments',
        'request': 'This is a request for their help, input, or action on something specific',
        'follow_up': 'This is a follow-up to a previous conversation or commitment',
        'collaboration': 'This is an invitation to collaborate on something together',
        'feedback': 'This is a request for their feedback or thoughts on something'
      };

      const relationshipContext = {
        'colleague': 'This person is a peer/colleague',
        'manager': 'This person is in a management role',
        'stakeholder': 'This person is a project stakeholder',
        'external': 'This person is external to the organization'
      };

      const prompt = `Create a personal, one-on-one email for a change initiative. This should be conversational and tailored to individual communication.

Project: ${projectName}
Recipient: ${recipientName}${recipientRole ? ` (${recipientRole})` : ''}
Purpose: ${communicationPurpose} - ${purposeContext[communicationPurpose]}
Relationship: ${relationship} - ${relationshipContext[relationship]}
Tone: ${tone}
Urgency: ${urgency}

Change Description: ${changeDescription || 'General change initiative communication'}${raidContextString}

Key Messages to Include: ${keyMessages && keyMessages.length > 0 ? keyMessages.join(', ') : 'General project update'}

Create a personal email that:
- Uses a ${tone} tone appropriate for a ${relationship}
- Addresses ${recipientName} personally
- Reflects ${urgency} urgency level
- Focuses on the specific purpose: ${communicationPurpose}
- Is conversational and feels like it's written person-to-person
- Includes relevant context about the change initiative
- Has a clear but not pushy call to action
- Maintains professional standards while being personal

Return the content in JSON format:
{
  "title": "personal email subject line",
  "content": "personal email body content with proper line breaks",
  "callToAction": "specific next step or call to action"
}`;

      const { openai } = await import("./openai");
      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const content = JSON.parse(response.choices[0].message.content || "{}");
      res.json(content);
    } catch (error) {
      console.error("Error generating P2P email content:", error);
      res.status(500).json({ error: "Failed to generate P2P email content" });
    }
  });

  // GPT Content Refinement for P2P Emails
  app.post("/api/gpt/refine-p2p-email-content", requireAuthAndPermission('canSendEmails'), async (req: AuthenticatedRequest, res) => {
    try {
      // SECURITY: Input validation with Zod
      const validatedInput = refineP2PEmailContentSchema.parse(req.body);
      const { currentContent, refinementRequest, recipientName, relationship, tone, urgency } = validatedInput;

      // SECURITY: Rate limiting check
      if (!checkRateLimit(req.userId!, 20, 300000)) { // 20 refinements per 5 minutes
        return res.status(429).json({ 
          error: "Rate limit exceeded. Please wait before refining more content." 
        });
      }

      const relationshipContext = {
        'colleague': 'This person is a peer/colleague',
        'manager': 'This person is in a management role', 
        'stakeholder': 'This person is a project stakeholder',
        'external': 'This person is external to the organization'
      };

      const prompt = `Refine this personal, one-on-one email based on the request:

Current content:
Subject: ${currentContent.title || 'No subject'}
Content: ${currentContent.content || 'No content'}
Call to Action: ${currentContent.callToAction || 'No CTA'}

Recipient: ${recipientName}
Relationship: ${relationship} - ${relationshipContext[relationship]}
Refinement request: ${refinementRequest}
Tone: ${tone}
Urgency: ${urgency}

Create refined personal email content that:
- Maintains a ${tone} tone appropriate for a ${relationship}
- Addresses ${recipientName} personally
- Reflects ${urgency} urgency level
- Incorporates the refinement request: ${refinementRequest}
- Keeps the conversational, person-to-person feel
- Maintains professional standards while being personal
- Has clear but not pushy communication

Return the refined content in JSON format:
{
  "title": "refined personal email subject",
  "content": "refined personal email body",
  "callToAction": "refined call to action"
}`;

      const { openai } = await import("./openai");
      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const refinedContent = JSON.parse(response.choices[0].message.content || "{}");
      res.json(refinedContent);
    } catch (error) {
      console.error("Error refining P2P email content:", error);
      res.status(500).json({ error: "Failed to refine P2P email content" });
    }
  });

  // Flyer Distribution - SECURITY: Requires bulk email permission and proper auth
  app.post("/api/communications/:id/distribute", requireAuthAndPermission('canSendBulkEmails'), async (req: AuthenticatedRequest, res) => {
    try {
      // SECURITY: Input validation with Zod
      const validatedInput = distributionRequestSchema.parse(req.body);
      const { distributionMethod, recipients, dryRun } = validatedInput;
      
      // SECURITY: Rate limiting check
      if (!checkRateLimit(req.userId!, 5, 300000)) { // 5 distributions per 5 minutes
        return res.status(429).json({ 
          error: "Rate limit exceeded. Please wait before sending more distributions." 
        });
      }
      
      // DRY RUN mode - short-circuit before environment safety checks
      if (dryRun) {
        // Skip all safety checks for dry runs - they should always succeed
        console.log(`[DRY RUN] User ${req.userId} initiating DRY RUN distribution - bypassing environment checks`);
      } else {
        // SECURITY: Environment safety check (only for live distributions)
        const safetyCheck = checkEnvironmentSafety('bulk_email');
        if (!safetyCheck.safe) {
          return res.status(403).json({ 
            error: safetyCheck.message,
            hint: "Set ALLOW_PRODUCTION_EMAIL=true if you intend to send emails in production"
          });
        }
      }

      const communication = await storage.getCommunication(req.params.id);
      if (!communication) {
        return res.status(404).json({ error: "Communication not found" });
      }

      const project = await storage.getProject(communication.projectId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      let distributionResult = { sent: 0, failed: 0, results: [] as any[] };

      if (distributionMethod === 'email') {
        // Get recipient list
        let emailList: string[] = [];
        
        if (recipients && Array.isArray(recipients)) {
          emailList = recipients;
        } else if (communication.targetAudience && communication.targetAudience.length > 0) {
          // For demo purposes, generate email addresses from target audience
          // In production, this would be resolved from stakeholder database
          emailList = communication.targetAudience.map(audience => 
            `${audience.toLowerCase().replace(/\s+/g, '.')}@company.com`
          );
        } else {
          return res.status(400).json({ error: "No recipients specified for email distribution" });
        }
        
        // SECURITY: Log distribution attempt
        console.log(`[DISTRIBUTION] User ${req.userId} initiating ${dryRun ? 'DRY RUN' : 'LIVE'} email distribution`, {
          communicationId: req.params.id,
          recipientCount: emailList.length,
          projectId: communication.projectId,
          timestamp: new Date().toISOString()
        });
        
        // Handle DRY RUN mode - simulate without sending
        if (dryRun) {
          distributionResult = {
            sent: emailList.length,
            failed: 0,
            results: emailList.map(email => ({ email, success: true, note: 'DRY RUN - not actually sent' }))
          };
          console.log(`[DRY RUN] Would distribute to ${emailList.length} recipients:`, emailList);
        } else {
          // LIVE distribution - choose appropriate email service based on communication type
          if (communication.type === 'group_email') {
            // Get RAID log context if referenced
            let raidLogInfo: { title: string; type: string; description: string }[] = [];
            if (communication.raidLogReferences && communication.raidLogReferences.length > 0) {
              try {
                const raidLogs = await Promise.all(
                  communication.raidLogReferences.map(id => storage.getRaidLog(id))
                );
                raidLogInfo = raidLogs
                  .filter(log => log !== undefined)
                  .map(log => ({
                    title: log!.title,
                    type: log!.type,
                    description: log!.description
                  }));
              } catch (error) {
                console.warn('Error fetching RAID logs for email context:', error);
              }
            }
            
            distributionResult = await sendBulkGroupEmail(
              emailList,
              communication.title,
              communication.content,
              project.name,
              raidLogInfo.length > 0 ? raidLogInfo : undefined
            );
          } else {
            // Import and use flyer distribution service for backward compatibility
            const { sendBulkFlyerDistribution } = await import("./services/emailService");
            
            distributionResult = await sendBulkFlyerDistribution(
              emailList,
              communication.title,
              communication.content,
              project.name,
              distributionMethod
            );
          }
        }
      }

      // Update communication with distribution method and status (only for live runs)
      const updatedCommunication = await storage.updateCommunication(req.params.id, {
        distributionMethod,
        status: dryRun ? 'draft' : (distributionResult.sent > 0 ? 'sent' : 'failed'),
        sendDate: dryRun ? undefined : new Date()
      });
      
      // SECURITY: Log distribution result
      console.log(`[DISTRIBUTION RESULT] User ${req.userId}`, {
        communicationId: req.params.id,
        success: distributionResult.sent > 0,
        sent: distributionResult.sent,
        failed: distributionResult.failed,
        dryRun,
        timestamp: new Date().toISOString()
      });

      res.json({ 
        success: distributionResult.sent > 0,
        dryRun,
        message: dryRun 
          ? `DRY RUN: Would distribute to ${distributionResult.sent} recipients via ${distributionMethod}`
          : `Flyer distributed via ${distributionMethod}. Sent: ${distributionResult.sent}, Failed: ${distributionResult.failed}`,
        communication: updatedCommunication,
        distributionResult,
        environmentInfo: {
          nodeEnv: process.env.NODE_ENV,
          emailConfigured: !!process.env.SENDGRID_API_KEY
        }
      });
    } catch (error) {
      console.error("Error distributing flyer:", error);
      res.status(500).json({ error: "Failed to distribute flyer" });
    }
  });

  // P2P Email Sending - SECURITY: Requires individual email permission and proper auth
  app.post("/api/communications/:id/send-p2p", requireAuthAndPermission('canSendEmails'), async (req: AuthenticatedRequest, res) => {
    try {
      const { recipientEmail, recipientName, visibility, dryRun } = req.body;

      // Validate input
      if (!recipientEmail || !recipientName) {
        return res.status(400).json({ error: "Recipient email and name are required" });
      }

      // Validate visibility setting
      const validVisibilityOptions = ['private', 'team', 'archive'];
      if (visibility && !validVisibilityOptions.includes(visibility)) {
        return res.status(400).json({ 
          error: "Invalid visibility setting. Must be 'private', 'team', or 'archive'" 
        });
      }

      // SECURITY: Rate limiting check for P2P emails
      if (!checkRateLimit(req.userId!, 10, 300000)) { // 10 P2P emails per 5 minutes
        return res.status(429).json({ 
          error: "Rate limit exceeded. Please wait before sending more personal emails." 
        });
      }

      // Get communication
      const communication = await storage.getCommunication(req.params.id);
      if (!communication) {
        return res.status(404).json({ error: "Communication not found" });
      }

      // Validate communication type
      if (communication.type !== 'point_to_point_email') {
        return res.status(400).json({ error: "Communication must be a point-to-point email" });
      }

      // Get project
      const project = await storage.getProject(communication.projectId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      // Get sender info
      const sender = await storage.getUser(req.userId!);
      if (!sender) {
        return res.status(404).json({ error: "Sender not found" });
      }

      // Handle DRY RUN mode
      if (dryRun) {
        console.log(`[DRY RUN] P2P Email - Would send "${communication.title}" to ${recipientName} (${recipientEmail})`);
        return res.json({
          success: true,
          dryRun: true,
          message: `DRY RUN: Would send personal email to ${recipientName}`,
          emailPreview: {
            subject: `Personal Communication: ${communication.title}`,
            recipient: { name: recipientName, email: recipientEmail },
            sender: sender.name,
            visibility,
            content: communication.content
          }
        });
      }

      // SECURITY: Environment safety check for live sending
      const safetyCheck = checkEnvironmentSafety('email');
      if (!safetyCheck.safe) {
        return res.status(403).json({ 
          error: safetyCheck.message,
          hint: "Email service not configured properly"
        });
      }

      // Get RAID log context if referenced
      let raidLogInfo: { title: string; type: string; description: string }[] = [];
      if (communication.raidLogReferences && communication.raidLogReferences.length > 0) {
        try {
          const raidLogs = await Promise.all(
            communication.raidLogReferences.map(id => storage.getRaidLog(id))
          );
          raidLogInfo = raidLogs
            .filter(log => log !== undefined)
            .map(log => ({
              title: log!.title,
              type: log!.type,
              description: log!.description
            }));
        } catch (error) {
          console.warn('Error fetching RAID logs for P2P email context:', error);
        }
      }

      // Send P2P email
      const emailSent = await sendP2PEmail(
        recipientEmail,
        recipientName,
        communication.title,
        communication.content,
        project.name,
        sender.name,
        visibility as 'private' | 'team' | 'archive',
        raidLogInfo.length > 0 ? raidLogInfo : undefined
      );

      if (!emailSent) {
        return res.status(500).json({ error: "Failed to send personal email" });
      }

      // Update communication status
      const updatedCommunication = await storage.updateCommunication(req.params.id, {
        status: 'sent',
        sendDate: new Date(),
        distributionMethod: 'email'
      });

      // Create recipient record
      await storage.createCommunicationRecipient({
        communicationId: communication.id,
        recipientType: 'external_email',
        recipientEmail,
        recipientName,
        recipientRole: communication.metadata?.recipientRole || undefined,
        deliveryStatus: 'sent'
      });

      // SECURITY: Log P2P email sending
      console.log(`[P2P EMAIL SENT] User ${req.userId}`, {
        communicationId: req.params.id,
        recipientEmail,
        recipientName,
        visibility,
        projectId: communication.projectId,
        timestamp: new Date().toISOString()
      });

      res.json({
        success: true,
        dryRun: false,
        message: `Personal email sent successfully to ${recipientName}`,
        communication: updatedCommunication,
        recipient: {
          name: recipientName,
          email: recipientEmail
        },
        environmentInfo: {
          nodeEnv: process.env.NODE_ENV,
          emailConfigured: !!process.env.SENDGRID_API_KEY
        }
      });

    } catch (error) {
      console.error("Error sending P2P email:", error);
      res.status(500).json({ error: "Failed to send personal email" });
    }
  });

  // Flyer Export - SECURITY: Requires communication permissions and proper auth
  app.post("/api/communications/:id/export", requireAuthAndPermission('canSeeCommunications'), async (req: AuthenticatedRequest, res) => {
    try {
      // SECURITY: Input validation with Zod
      const validatedInput = exportRequestSchema.parse(req.body);
      const { format } = validatedInput;
      
      // SECURITY: Rate limiting for exports
      if (!checkRateLimit(req.userId!, 20, 300000)) { // 20 exports per 5 minutes
        return res.status(429).json({ 
          error: "Export rate limit exceeded. Please wait before requesting more exports." 
        });
      }
      
      // SECURITY: Log export attempt
      console.log(`[EXPORT] User ${req.userId} requesting ${format} export`, {
        communicationId: req.params.id,
        format,
        timestamp: new Date().toISOString()
      });

      const communication = await storage.getCommunication(req.params.id);
      if (!communication) {
        return res.status(404).json({ error: "Communication not found" });
      }

      // Import export service
      const { exportService } = await import("./services/exportService");
      
      let downloadUrl: string;
      let fileExtension: string;
      
      switch (format) {
        case 'powerpoint':
          downloadUrl = await exportService.exportToPowerPoint(communication);
          fileExtension = 'pptx';
          break;
        case 'pdf':
          downloadUrl = await exportService.exportToPDF(communication);
          fileExtension = 'pdf';
          break;
        case 'canva':
          downloadUrl = await exportService.exportToCanvaPNG(communication);
          fileExtension = 'png';
          break;
        default:
          return res.status(400).json({ error: "Unsupported export format" });
      }
      
      const exportResult = {
        format,
        downloadUrl,
        filename: `${communication.title.replace(/[^a-zA-Z0-9]/g, '_')}.${fileExtension}`,
        success: true,
        generatedAt: new Date().toISOString(),
        generatedBy: req.userId
      };
      
      // SECURITY: Log successful export
      console.log(`[EXPORT SUCCESS] User ${req.userId}`, {
        communicationId: req.params.id,
        format,
        filename: exportResult.filename,
        timestamp: new Date().toISOString()
      });

      res.json(exportResult);
    } catch (error) {
      console.error("Error exporting flyer:", error);
      res.status(500).json({ error: "Failed to export flyer" });
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
      
      // Create notifications for project team members about new stakeholder
      try {
        const [project, assignments] = await Promise.all([
          storage.getProject(req.params.projectId),
          storage.getInitiativeAssignments(req.params.projectId)
        ]);
        
        if (project && assignments.length > 0) {
          const notificationPromises = assignments.map(assignment => 
            storage.createNotification({
              userId: assignment.userId,
              title: "New Stakeholder Added",
              message: `A new stakeholder "${stakeholder.name}" (${stakeholder.role}) has been added to the initiative "${project.name}"`,
              type: "stakeholder_added",
              relatedId: stakeholder.id,
              relatedType: "stakeholder"
            })
          );
          
          await Promise.all(notificationPromises);
        }
      } catch (notificationError) {
        console.error("Error creating stakeholder notifications:", notificationError);
        // Don't fail the stakeholder creation if notification creation fails
      }
      
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
      
      // Create notifications for project team members about imported stakeholders
      if (result.imported > 0) {
        try {
          const [project, assignments] = await Promise.all([
            storage.getProject(req.params.projectId),
            storage.getInitiativeAssignments(req.params.projectId)
          ]);
          
          if (project && assignments.length > 0) {
            const notificationPromises = assignments.map(assignment => 
              storage.createNotification({
                userId: assignment.userId,
                title: "Stakeholders Imported",
                message: `${result.imported} stakeholder(s) have been imported to the initiative "${project.name}"`,
                type: "stakeholder_added",
                relatedId: req.params.projectId,
                relatedType: "project"
              })
            );
            
            await Promise.all(notificationPromises);
          }
        } catch (notificationError) {
          console.error("Error creating stakeholder import notifications:", notificationError);
          // Don't fail the import if notification creation fails
        }
      }
      
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
      
      // Create notification for assigned user if RAID log has an assignee
      if (raidLog.assigneeId) {
        try {
          const project = await storage.getProject(req.params.projectId);
          if (project) {
            await storage.createNotification({
              userId: raidLog.assigneeId,
              title: "RAID Log Assignment",
              message: `You have been assigned to a ${raidLog.type}: "${raidLog.title}" in the initiative "${project.name}"`,
              type: "raid_identified",
              relatedId: raidLog.id,
              relatedType: "raid_log"
            });
          }
        } catch (notificationError) {
          console.error("Error creating RAID log assignment notification:", notificationError);
          // Don't fail the RAID log creation if notification creation fails
        }
      }
      
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
      
      // Get original RAID log to check for assignee changes
      const originalRaidLog = await storage.getRaidLog(req.params.id);
      if (!originalRaidLog) {
        return res.status(404).json({ error: "RAID log not found" });
      }
      
      const raidLog = await storage.updateRaidLog(req.params.id, validatedData);
      if (!raidLog) {
        return res.status(404).json({ error: "RAID log not found" });
      }
      
      // Create notification for new assignee if assignee was changed
      if (validatedData.assigneeId && validatedData.assigneeId !== originalRaidLog.assigneeId) {
        try {
          const project = await storage.getProject(raidLog.projectId);
          if (project) {
            await storage.createNotification({
              userId: validatedData.assigneeId,
              title: "RAID Log Assignment",
              message: `You have been assigned to a ${raidLog.type}: "${raidLog.title}" in the initiative "${project.name}"`,
              type: "raid_identified",
              relatedId: raidLog.id,
              relatedType: "raid_log"
            });
          }
        } catch (notificationError) {
          console.error("Error creating RAID log assignment notification:", notificationError);
          // Don't fail the update if notification creation fails
        }
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

  app.post("/api/projects/:projectId/communications", async (req: AuthenticatedRequest, res) => {
    try {
      // Determine required permission based on communication type
      let requiredPermission: keyof Permissions = 'canModifyCommunications';
      if (req.body.type === 'meeting') {
        requiredPermission = 'canScheduleMeetings';
      }

      // SECURITY: Check authentication and specific permission
      if (!req.userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      // Check user permissions
      const user = await storage.getUser(req.userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      const userPermissions = await storage.resolveUserPermissions(req.userId);
      if (!userPermissions[requiredPermission]) {
        return res.status(403).json({ 
          error: "Access denied", 
          message: `Permission '${requiredPermission}' is required to create this type of communication`
        });
      }

      const validatedData = insertCommunicationSchema.parse({
        ...req.body,
        projectId: req.params.projectId,
        createdById: req.userId!
      });
      const communication = await storage.createCommunication(validatedData);
      res.status(201).json(communication);
    } catch (error) {
      console.error("Error creating communication:", error);
      res.status(400).json({ error: "Failed to create communication" });
    }
  });

  app.put("/api/communications/:id", requireAuthAndPermission('canModifyCommunications'), async (req: AuthenticatedRequest, res) => {
    try {
      // Get existing communication to check type for specific permission
      const existingCommunication = await storage.getCommunication(req.params.id);
      if (!existingCommunication) {
        return res.status(404).json({ error: "Communication not found" });
      }

      // Check meeting-specific permissions if it's a meeting
      if (existingCommunication.type === 'meeting') {
        const userPermissions = await storage.resolveUserPermissions(req.userId!);
        if (!userPermissions.canScheduleMeetings) {
          return res.status(403).json({ 
            error: "Access denied", 
            message: "Permission 'canScheduleMeetings' is required to modify meetings"
          });
        }
      }

      const communication = await storage.updateCommunication(req.params.id, req.body);
      res.json(communication);
    } catch (error) {
      console.error("Error updating communication:", error);
      res.status(400).json({ error: "Failed to update communication" });
    }
  });

  app.delete("/api/communications/:id", requireAuthAndPermission('canDeleteCommunications'), async (req: AuthenticatedRequest, res) => {
    try {
      // Get existing communication to check type for specific permission
      const existingCommunication = await storage.getCommunication(req.params.id);
      if (!existingCommunication) {
        return res.status(404).json({ error: "Communication not found" });
      }

      // Check meeting-specific permissions if it's a meeting
      if (existingCommunication.type === 'meeting') {
        const userPermissions = await storage.resolveUserPermissions(req.userId!);
        if (!userPermissions.canDeleteMeetings) {
          return res.status(403).json({ 
            error: "Access denied", 
            message: "Permission 'canDeleteMeetings' is required to delete meetings"
          });
        }
      }

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

  // Communication Strategies
  app.get("/api/projects/:projectId/communication-strategies", requirePermission('canSeeCommunications'), async (req, res) => {
    try {
      const strategies = await storage.getCommunicationStrategiesByProject(req.params.projectId);
      res.json(strategies);
    } catch (error) {
      console.error("Error fetching communication strategies:", error);
      res.status(500).json({ error: "Failed to fetch communication strategies" });
    }
  });

  app.get("/api/projects/:projectId/communication-strategies/phase/:phase", requirePermission('canSeeCommunications'), async (req, res) => {
    try {
      const strategy = await storage.getCommunicationStrategyByPhase(req.params.projectId, req.params.phase);
      if (!strategy) {
        return res.status(404).json({ error: "Communication strategy not found for this phase" });
      }
      res.json(strategy);
    } catch (error) {
      console.error("Error fetching communication strategy by phase:", error);
      res.status(500).json({ error: "Failed to fetch communication strategy" });
    }
  });

  app.post("/api/projects/:projectId/communication-strategies", requireAuthAndPermission('canModifyCommunications'), async (req: AuthenticatedRequest, res) => {
    try {
      const validatedData = insertCommunicationStrategySchema.parse({
        ...req.body,
        projectId: req.params.projectId,
        createdById: req.userId!
      });
      const strategy = await storage.createCommunicationStrategy(validatedData);
      res.status(201).json(strategy);
    } catch (error) {
      console.error("Error creating communication strategy:", error);
      res.status(400).json({ error: "Failed to create communication strategy" });
    }
  });

  app.put("/api/communication-strategies/:id", requirePermission('canEditCommunications'), async (req, res) => {
    try {
      const updateSchema = insertCommunicationStrategySchema.omit({ projectId: true, createdById: true }).partial();
      const validatedData = updateSchema.parse(req.body);
      
      const strategy = await storage.updateCommunicationStrategy(req.params.id, validatedData);
      if (!strategy) {
        return res.status(404).json({ error: "Communication strategy not found" });
      }
      res.json(strategy);
    } catch (error) {
      console.error("Error updating communication strategy:", error);
      res.status(400).json({ error: "Failed to update communication strategy" });
    }
  });

  app.delete("/api/communication-strategies/:id", requirePermission('canDeleteCommunications'), async (req, res) => {
    try {
      const success = await storage.deleteCommunicationStrategy(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Communication strategy not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting communication strategy:", error);
      res.status(500).json({ error: "Failed to delete communication strategy" });
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

  app.post("/api/projects/:projectId/surveys", requireAuthAndPermission('canModifySurveys'), async (req: AuthenticatedRequest, res) => {
    try {
      const validatedData = insertSurveySchema.parse({
        ...req.body,
        projectId: req.params.projectId,
        createdById: req.userId!
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

  app.post("/api/gpt/resistance-counter-messages", async (req, res) => {
    try {
      const { projectId, resistancePoints } = req.body;
      
      const counterMessages = await openaiService.generateResistanceCounterMessages(resistancePoints);

      // Save interaction
      await storage.createGptInteraction({
        projectId,
        userId: "550e8400-e29b-41d4-a716-446655440000",
        type: "resistance_counter_messages",
        prompt: "Generate counter-messages for resistance points",
        response: JSON.stringify(counterMessages),
        metadata: { resistanceCount: resistancePoints.length }
      });

      res.json(counterMessages);
    } catch (error) {
      console.error("Error generating counter messages:", error);
      res.status(500).json({ error: "Failed to generate counter messages" });
    }
  });

  app.post("/api/gpt/phase-guidance", requirePermission('canSeeCommunications'), async (req, res) => {
    try {
      const { projectId, phase, projectName, description, currentPhase } = req.body;
      
      const guidance = await openaiService.generatePhaseGuidance(phase, {
        name: projectName,
        description,
        currentPhase
      });

      // Save interaction only if OpenAI was successful
      if (!guidance.aiError) {
        await storage.createGptInteraction({
          projectId,
          userId: "550e8400-e29b-41d4-a716-446655440000",
          type: "phase_guidance",
          prompt: `Generate guidance for ${phase} phase`,
          response: JSON.stringify(guidance),
          metadata: { phase, currentPhase }
        });
      }

      res.json(guidance);
    } catch (error: any) {
      console.error("Error generating phase guidance:", error);
      
      // Provide more specific error messages
      if (error.status === 401) {
        res.status(200).json({
          keyThemes: ["Communication strategy guidance temporarily unavailable"],
          communicationObjectives: ["AI-powered features require valid API configuration"],
          recommendedChannels: ["Email updates", "Team meetings", "Project dashboards"],
          keyMessages: ["Manual guidance available through project management"],
          timeline: [
            {
              week: "Week 1",
              activities: ["Contact administrator about AI features"]
            }
          ],
          aiError: {
            type: 'api_key',
            message: 'OpenAI API key is missing or invalid. Please configure a valid API key to enable AI-powered features.',
            fallbackAvailable: true
          }
        });
      } else {
        res.status(200).json({
          keyThemes: ["Communication strategy guidance temporarily unavailable"],
          communicationObjectives: ["Standard communication best practices apply"],
          recommendedChannels: ["Email updates", "Team meetings", "Project dashboards"],
          keyMessages: ["Focus on clear, timely communication with stakeholders"],
          timeline: [
            {
              week: "Week 1",
              activities: ["Plan communication approach", "Identify key stakeholders"]
            }
          ],
          aiError: {
            type: 'service_unavailable',
            message: 'AI service is temporarily unavailable. Using standard communication guidance.',
            fallbackAvailable: true
          }
        });
      }
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
      
      // Create notification for the assigned user
      try {
        const project = await storage.getProject(validatedData.projectId);
        if (project) {
          await storage.createNotification({
            userId: validatedData.userId,
            title: "Initiative Assignment",
            message: `You have been assigned to the initiative "${project.name}" as ${validatedData.role}`,
            type: "initiative_assignment",
            relatedId: validatedData.projectId,
            relatedType: "project"
          });
        }
      } catch (notificationError) {
        console.error("Error creating assignment notification:", notificationError);
        // Don't fail the assignment if notification creation fails
      }
      
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

  // Meeting agenda generation endpoint
  app.post("/api/gpt/generate-meeting-agenda", requireAuthAndPermission('canGenerateMeetingAgendas'), async (req: AuthenticatedRequest, res) => {
    try {
      // SECURITY: Input validation with Zod
      const validatedInput = generateMeetingAgendaSchema.parse(req.body);
      
      // SECURITY: Rate limiting check for meeting agenda generation
      if (!checkRateLimit(req.userId!, 10, 300000)) { // 10 agenda generations per 5 minutes
        return res.status(429).json({ 
          error: "Rate limit exceeded. Please wait before generating more agendas." 
        });
      }

      const agendaData = await openaiService.generateMeetingAgenda(validatedInput);

      // Save GPT interaction for audit trail
      await storage.createGptInteraction({
        projectId: null, // Meeting agenda generation might not always be tied to specific project
        userId: req.userId!,
        type: 'meeting_agenda_generation',
        prompt: `Generate meeting agenda for ${validatedInput.meetingType} meeting: ${validatedInput.meetingPurpose}`,
        response: JSON.stringify(agendaData),
        metadata: {
          meetingType: validatedInput.meetingType,
          duration: validatedInput.duration,
          participantCount: validatedInput.participants.length
        }
      });

      res.json(agendaData);
    } catch (error) {
      console.error("Error generating meeting agenda:", error);
      res.status(500).json({ error: "Failed to generate meeting agenda" });
    }
  });

  // Meeting Invites Sending - SECURITY: Requires meeting invite permission and proper auth
  app.post("/api/communications/:id/send-meeting-invites", requireAuthAndPermission('canSendMeetingInvites'), async (req: AuthenticatedRequest, res) => {
    try {
      // SECURITY: Input validation with Zod
      const validatedInput = sendMeetingInviteSchema.parse(req.body);
      const { recipients, meetingData, dryRun } = validatedInput;

      // SECURITY: Rate limiting check for meeting invites
      if (!checkRateLimit(req.userId!, 5, 300000)) { // 5 meeting invite distributions per 5 minutes
        return res.status(429).json({ 
          error: "Rate limit exceeded. Please wait before sending more meeting invites." 
        });
      }

      // Get communication
      const communication = await storage.getCommunication(req.params.id);
      if (!communication) {
        return res.status(404).json({ error: "Communication not found" });
      }

      // Validate communication type
      if (communication.type !== 'meeting') {
        return res.status(400).json({ error: "Communication must be a meeting" });
      }

      // Get project
      const project = await storage.getProject(communication.projectId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      // Handle DRY RUN mode
      if (dryRun) {
        console.log(`[DRY RUN] Meeting Invites - Would send "${meetingData.title}" to ${recipients.length} recipients`);
        return res.json({
          success: true,
          dryRun: true,
          message: `DRY RUN: Would send meeting invites to ${recipients.length} participants`,
          distributionResult: {
            sent: recipients.length,
            failed: 0,
            results: recipients.map(r => ({ email: r.email, success: true }))
          }
        });
      }

      // SECURITY: Environment safety check for live sending
      const safetyCheck = checkEnvironmentSafety('bulk_email');
      if (!safetyCheck.safe) {
        return res.status(403).json({ 
          error: safetyCheck.message,
          hint: "Meeting invite service not configured properly"
        });
      }

      // Generate meeting invite content using GPT
      const inviteContent = await openaiService.generateMeetingInviteContent({
        projectName: project.name,
        title: meetingData.title,
        purpose: meetingData.description,
        date: new Date(meetingData.startTime).toDateString(),
        time: new Date(meetingData.startTime).toTimeString(),
        duration: Math.round((new Date(meetingData.endTime).getTime() - new Date(meetingData.startTime).getTime()) / (1000 * 60)),
        location: meetingData.location,
        agenda: meetingData.agenda,
        preparation: meetingData.preparation,
        hostName: meetingData.organizerName
      });

      // Send bulk meeting invites
      const { sendBulkMeetingInvites } = await import("./services/emailService");
      const distributionResult = await sendBulkMeetingInvites(
        recipients,
        meetingData,
        inviteContent
      );

      // Update communication status
      const updatedCommunication = await storage.updateCommunication(req.params.id, {
        status: distributionResult.sent > 0 ? 'sent' : 'failed',
        sendDate: new Date(),
        distributionMethod: 'email'
      });

      // Create recipient records
      for (const recipient of recipients) {
        await storage.createCommunicationRecipient({
          communicationId: communication.id,
          recipientType: 'meeting_participant',
          recipientEmail: recipient.email,
          recipientName: recipient.name,
          recipientRole: recipient.role,
          deliveryStatus: distributionResult.results.find(r => r.email === recipient.email)?.success ? 'sent' : 'failed'
        });
      }

      // SECURITY: Log meeting invites distribution
      console.log(`[MEETING INVITES] User ${req.userId}`, {
        communicationId: req.params.id,
        recipientCount: recipients.length,
        sent: distributionResult.sent,
        failed: distributionResult.failed,
        timestamp: new Date().toISOString()
      });

      res.json({
        success: distributionResult.sent > 0,
        dryRun: false,
        message: `Meeting invites sent to ${distributionResult.sent} participants. ${distributionResult.failed} failed.`,
        communication: updatedCommunication,
        distributionResult,
        environmentInfo: {
          nodeEnv: process.env.NODE_ENV,
          emailConfigured: !!process.env.SENDGRID_API_KEY
        }
      });

    } catch (error) {
      console.error("Error sending meeting invites:", error);
      res.status(500).json({ error: "Failed to send meeting invites" });
    }
  });

  // Meeting Content Refinement - SECURITY: Requires meeting agenda generation permission and proper auth
  app.post("/api/gpt/refine-meeting-content", requireAuthAndPermission('canGenerateMeetingAgendas'), async (req: AuthenticatedRequest, res) => {
    try {
      // SECURITY: Input validation with Zod
      const validatedInput = refineMeetingContentSchema.parse(req.body);
      
      // SECURITY: Rate limiting check for meeting content refinement
      if (!checkRateLimit(req.userId!, 15, 300000)) { // 15 refinements per 5 minutes
        return res.status(429).json({ 
          error: "Rate limit exceeded. Please wait before refining more meeting content." 
        });
      }

      const refinedContent = await openaiService.refineMeetingContent(validatedInput);

      // Save GPT interaction for audit trail
      await storage.createGptInteraction({
        projectId: null, // Meeting content refinement might not always be tied to specific project
        userId: req.userId!,
        type: 'meeting_content_refinement',
        prompt: `Refine meeting content: ${validatedInput.refinementRequest}`,
        response: JSON.stringify(refinedContent),
        metadata: {
          originalTitle: validatedInput.currentContent.title,
          refinementType: validatedInput.refinementRequest.substring(0, 50),
          meetingType: validatedInput.meetingContext.meetingType
        }
      });

      res.json(refinedContent);
    } catch (error) {
      console.error("Error refining meeting content:", error);
      res.status(500).json({ error: "Failed to refine meeting content" });
    }
  });

  // =====================================
  // COMPREHENSIVE REPORTS SYSTEM ENDPOINTS
  // =====================================

  // Define report parameter validation schema
  const reportParamsSchema = z.object({
    authorizedProjectIds: z.array(z.string()).optional(),
    dateFrom: z.string().datetime().optional(),
    dateTo: z.string().datetime().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  });

  // A. User Reports
  app.post('/api/reports/users/login-activity', requireAuth, requirePermission('canSeeReports'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const params = req.body;
      
      // SECURITY: Get user's authorized projects for filtering
      const authorizedProjectIds = await storage.getUserAuthorizedProjectIds(req.userId!);
      
      // Override with authorized projects for security
      params.authorizedProjectIds = authorizedProjectIds;
      
      // Convert date strings to Date objects
      if (params.dateFrom) params.dateFrom = new Date(params.dateFrom);
      if (params.dateTo) params.dateTo = new Date(params.dateTo);
      
      const report = await storage.getUserLoginActivityReport(params);
      res.json(report);
    } catch (error) {
      console.error('User login activity report error:', error);
      res.status(500).json({ error: 'Failed to generate user login activity report' });
    }
  });

  app.post('/api/reports/users/role-assignment', requireAuth, requirePermission('canSeeReports'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const params = req.body;
      
      // SECURITY: Get user's authorized projects for filtering
      const authorizedProjectIds = await storage.getUserAuthorizedProjectIds(req.userId!);
      params.authorizedProjectIds = authorizedProjectIds;
      
      const report = await storage.getRoleAssignmentReport(params);
      res.json(report);
    } catch (error) {
      console.error('Role assignment report error:', error);
      res.status(500).json({ error: 'Failed to generate role assignment report' });
    }
  });

  app.post('/api/reports/users/initiatives-participation', requireAuth, requirePermission('canSeeReports'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const params = req.body;
      
      // SECURITY: Get user's authorized projects for filtering
      const authorizedProjectIds = await storage.getUserAuthorizedProjectIds(req.userId!);
      params.authorizedProjectIds = authorizedProjectIds;
      
      const report = await storage.getInitiativesParticipationReport(params);
      res.json(report);
    } catch (error) {
      console.error('Initiatives participation report error:', error);
      res.status(500).json({ error: 'Failed to generate initiatives participation report' });
    }
  });

  // B. Task Reports
  app.post('/api/reports/tasks/status', requireAuth, requirePermission('canSeeReports'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const params = req.body;
      
      // SECURITY: Get user's authorized projects for filtering
      const authorizedProjectIds = await storage.getUserAuthorizedProjectIds(req.userId!);
      params.authorizedProjectIds = authorizedProjectIds;
      
      // Convert date strings to Date objects
      if (params.dateFrom) params.dateFrom = new Date(params.dateFrom);
      if (params.dateTo) params.dateTo = new Date(params.dateTo);
      
      const report = await storage.getTaskStatusReport(params);
      res.json(report);
    } catch (error) {
      console.error('Task status report error:', error);
      res.status(500).json({ error: 'Failed to generate task status report' });
    }
  });

  app.post('/api/reports/tasks/upcoming-deadlines', requireAuth, requirePermission('canSeeReports'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const params = req.body;
      
      // SECURITY: Get user's authorized projects for filtering
      const authorizedProjectIds = await storage.getUserAuthorizedProjectIds(req.userId!);
      params.authorizedProjectIds = authorizedProjectIds;
      
      // Default to 30 days ahead if not specified
      if (!params.daysAhead) params.daysAhead = 30;
      
      const report = await storage.getUpcomingDeadlinesReport(params);
      res.json(report);
    } catch (error) {
      console.error('Upcoming deadlines report error:', error);
      res.status(500).json({ error: 'Failed to generate upcoming deadlines report' });
    }
  });

  app.post('/api/reports/tasks/overdue', requireAuth, requirePermission('canSeeReports'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const params = req.body;
      
      // SECURITY: Get user's authorized projects for filtering
      const authorizedProjectIds = await storage.getUserAuthorizedProjectIds(req.userId!);
      params.authorizedProjectIds = authorizedProjectIds;
      
      const report = await storage.getOverdueTasksReport(params);
      res.json(report);
    } catch (error) {
      console.error('Overdue tasks report error:', error);
      res.status(500).json({ error: 'Failed to generate overdue tasks report' });
    }
  });

  app.post('/api/reports/tasks/completion-trend', requireAuth, requirePermission('canSeeReports'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const params = req.body;
      
      // SECURITY: Get user's authorized projects for filtering
      const authorizedProjectIds = await storage.getUserAuthorizedProjectIds(req.userId!);
      params.authorizedProjectIds = authorizedProjectIds;
      
      // Convert date strings to Date objects
      if (params.dateFrom) params.dateFrom = new Date(params.dateFrom);
      if (params.dateTo) params.dateTo = new Date(params.dateTo);
      
      const report = await storage.getTaskCompletionTrendReport(params);
      res.json(report);
    } catch (error) {
      console.error('Task completion trend report error:', error);
      res.status(500).json({ error: 'Failed to generate task completion trend report' });
    }
  });

  // C. RAID Reports
  app.post('/api/reports/raid/items', requireAuth, requirePermission('canSeeReports'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const params = req.body;
      
      // SECURITY: Get user's authorized projects for filtering
      const authorizedProjectIds = await storage.getUserAuthorizedProjectIds(req.userId!);
      params.authorizedProjectIds = authorizedProjectIds;
      
      // Convert date strings to Date objects
      if (params.dateFrom) params.dateFrom = new Date(params.dateFrom);
      if (params.dateTo) params.dateTo = new Date(params.dateTo);
      
      const report = await storage.getRaidItemReport(params);
      res.json(report);
    } catch (error) {
      console.error('RAID item report error:', error);
      res.status(500).json({ error: 'Failed to generate RAID item report' });
    }
  });

  app.post('/api/reports/raid/high-severity-risks', requireAuth, requirePermission('canSeeReports'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const params = req.body;
      
      // SECURITY: Get user's authorized projects for filtering
      const authorizedProjectIds = await storage.getUserAuthorizedProjectIds(req.userId!);
      params.authorizedProjectIds = authorizedProjectIds;
      
      const report = await storage.getHighSeverityRisksReport(params);
      res.json(report);
    } catch (error) {
      console.error('High severity risks report error:', error);
      res.status(500).json({ error: 'Failed to generate high severity risks report' });
    }
  });

  app.post('/api/reports/raid/open-issues', requireAuth, requirePermission('canSeeReports'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const params = req.body;
      
      // SECURITY: Get user's authorized projects for filtering
      const authorizedProjectIds = await storage.getUserAuthorizedProjectIds(req.userId!);
      params.authorizedProjectIds = authorizedProjectIds;
      
      const report = await storage.getOpenIssuesByInitiativeReport(params);
      res.json(report);
    } catch (error) {
      console.error('Open issues report error:', error);
      res.status(500).json({ error: 'Failed to generate open issues report' });
    }
  });

  app.post('/api/reports/raid/dependencies-at-risk', requireAuth, requirePermission('canSeeReports'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const params = req.body;
      
      // SECURITY: Get user's authorized projects for filtering
      const authorizedProjectIds = await storage.getUserAuthorizedProjectIds(req.userId!);
      params.authorizedProjectIds = authorizedProjectIds;
      
      // Default to 30 days ahead if not specified
      if (!params.daysAhead) params.daysAhead = 30;
      
      const report = await storage.getDependenciesAtRiskReport(params);
      res.json(report);
    } catch (error) {
      console.error('Dependencies at risk report error:', error);
      res.status(500).json({ error: 'Failed to generate dependencies at risk report' });
    }
  });

  // D. Stakeholder Reports
  app.post('/api/reports/stakeholders/directory', requireAuth, requirePermission('canSeeReports'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const params = req.body;
      
      // SECURITY: Get user's authorized projects for filtering
      const authorizedProjectIds = await storage.getUserAuthorizedProjectIds(req.userId!);
      params.authorizedProjectIds = authorizedProjectIds;
      
      const report = await storage.getStakeholderDirectoryReport(params);
      res.json(report);
    } catch (error) {
      console.error('Stakeholder directory report error:', error);
      res.status(500).json({ error: 'Failed to generate stakeholder directory report' });
    }
  });

  app.post('/api/reports/stakeholders/cross-initiative-load', requireAuth, requirePermission('canSeeReports'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const params = req.body;
      
      // SECURITY: Get user's authorized projects for filtering
      const authorizedProjectIds = await storage.getUserAuthorizedProjectIds(req.userId!);
      params.authorizedProjectIds = authorizedProjectIds;
      
      const report = await storage.getCrossInitiativeStakeholderLoadReport(params);
      res.json(report);
    } catch (error) {
      console.error('Cross-initiative stakeholder load report error:', error);
      res.status(500).json({ error: 'Failed to generate cross-initiative stakeholder load report' });
    }
  });

  app.post('/api/reports/stakeholders/engagement', requireAuth, requirePermission('canSeeReports'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const params = req.body;
      
      // SECURITY: Get user's authorized projects for filtering
      const authorizedProjectIds = await storage.getUserAuthorizedProjectIds(req.userId!);
      params.authorizedProjectIds = authorizedProjectIds;
      
      // Convert date strings to Date objects
      if (params.dateFrom) params.dateFrom = new Date(params.dateFrom);
      if (params.dateTo) params.dateTo = new Date(params.dateTo);
      
      const report = await storage.getStakeholderEngagementReport(params);
      res.json(report);
    } catch (error) {
      console.error('Stakeholder engagement report error:', error);
      res.status(500).json({ error: 'Failed to generate stakeholder engagement report' });
    }
  });

  // E. Readiness & Surveys Reports
  app.post('/api/reports/readiness/phase-scores', requireAuth, requirePermission('canSeeReports'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const params = req.body;
      
      // SECURITY: Get user's authorized projects for filtering
      const authorizedProjectIds = await storage.getUserAuthorizedProjectIds(req.userId!);
      params.authorizedProjectIds = authorizedProjectIds;
      
      const report = await storage.getPhaseReadinessScoreReport(params);
      res.json(report);
    } catch (error) {
      console.error('Phase readiness score report error:', error);
      res.status(500).json({ error: 'Failed to generate phase readiness score report' });
    }
  });

  app.post('/api/reports/surveys/responses', requireAuth, requirePermission('canSeeReports'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const params = req.body;
      
      // SECURITY: Get user's authorized projects for filtering
      const authorizedProjectIds = await storage.getUserAuthorizedProjectIds(req.userId!);
      params.authorizedProjectIds = authorizedProjectIds;
      
      // Convert date strings to Date objects
      if (params.dateFrom) params.dateFrom = new Date(params.dateFrom);
      if (params.dateTo) params.dateTo = new Date(params.dateTo);
      
      const report = await storage.getSurveyResponseReport(params);
      res.json(report);
    } catch (error) {
      console.error('Survey response report error:', error);
      res.status(500).json({ error: 'Failed to generate survey response report' });
    }
  });

  app.post('/api/reports/surveys/sentiment-trend', requireAuth, requirePermission('canSeeReports'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const params = req.body;
      
      // SECURITY: Get user's authorized projects for filtering
      const authorizedProjectIds = await storage.getUserAuthorizedProjectIds(req.userId!);
      params.authorizedProjectIds = authorizedProjectIds;
      
      // Convert date strings to Date objects
      if (params.dateFrom) params.dateFrom = new Date(params.dateFrom);
      if (params.dateTo) params.dateTo = new Date(params.dateTo);
      
      const report = await storage.getSentimentTrendReport(params);
      res.json(report);
    } catch (error) {
      console.error('Sentiment trend report error:', error);
      res.status(500).json({ error: 'Failed to generate sentiment trend report' });
    }
  });

  app.post('/api/reports/surveys/understanding-gaps', requireAuth, requirePermission('canSeeReports'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const params = req.body;
      
      // SECURITY: Get user's authorized projects for filtering
      const authorizedProjectIds = await storage.getUserAuthorizedProjectIds(req.userId!);
      params.authorizedProjectIds = authorizedProjectIds;
      
      const report = await storage.getUnderstandingGapsReport(params);
      res.json(report);
    } catch (error) {
      console.error('Understanding gaps report error:', error);
      res.status(500).json({ error: 'Failed to generate understanding gaps report' });
    }
  });

  app.post('/api/reports/surveys/post-mortem-success', requireAuth, requirePermission('canSeeReports'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const params = req.body;
      
      // SECURITY: Get user's authorized projects for filtering
      const authorizedProjectIds = await storage.getUserAuthorizedProjectIds(req.userId!);
      params.authorizedProjectIds = authorizedProjectIds;
      
      const report = await storage.getPostMortemSuccessReport(params);
      res.json(report);
    } catch (error) {
      console.error('Post-mortem success report error:', error);
      res.status(500).json({ error: 'Failed to generate post-mortem success report' });
    }
  });

  app.post('/api/reports/surveys/response-rates', requireAuth, requirePermission('canSeeReports'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const params = req.body;
      
      // SECURITY: Get user's authorized projects for filtering
      const authorizedProjectIds = await storage.getUserAuthorizedProjectIds(req.userId!);
      params.authorizedProjectIds = authorizedProjectIds;
      
      // Convert date strings to Date objects
      if (params.dateFrom) params.dateFrom = new Date(params.dateFrom);
      if (params.dateTo) params.dateTo = new Date(params.dateTo);
      
      const report = await storage.getSurveyResponseRateReport(params);
      res.json(report);
    } catch (error) {
      console.error('Survey response rate report error:', error);
      res.status(500).json({ error: 'Failed to generate survey response rate report' });
    }
  });

  // F. Cross-Cutting Reports
  app.post('/api/reports/cross-cutting/change-health', requireAuth, requirePermission('canSeeReports'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const params = req.body;
      
      // SECURITY: Get user's authorized projects for filtering
      const authorizedProjectIds = await storage.getUserAuthorizedProjectIds(req.userId!);
      params.authorizedProjectIds = authorizedProjectIds;
      
      const report = await storage.getChangeHealthDashboard(params);
      res.json(report);
    } catch (error) {
      console.error('Change health dashboard error:', error);
      res.status(500).json({ error: 'Failed to generate change health dashboard' });
    }
  });

  app.post('/api/reports/cross-cutting/org-readiness-heatmap', requireAuth, requirePermission('canSeeReports'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const params = req.body;
      
      // SECURITY: Get user's authorized projects for filtering
      const authorizedProjectIds = await storage.getUserAuthorizedProjectIds(req.userId!);
      params.authorizedProjectIds = authorizedProjectIds;
      
      const report = await storage.getOrgReadinessHeatmap(params);
      res.json(report);
    } catch (error) {
      console.error('Org readiness heatmap error:', error);
      res.status(500).json({ error: 'Failed to generate org readiness heatmap' });
    }
  });

  app.post('/api/reports/cross-cutting/stakeholder-sentiment', requireAuth, requirePermission('canSeeReports'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const params = req.body;
      
      // SECURITY: Get user's authorized projects for filtering
      const authorizedProjectIds = await storage.getUserAuthorizedProjectIds(req.userId!);
      params.authorizedProjectIds = authorizedProjectIds;
      
      // Convert date strings to Date objects
      if (params.dateFrom) params.dateFrom = new Date(params.dateFrom);
      if (params.dateTo) params.dateTo = new Date(params.dateTo);
      
      const report = await storage.getStakeholderSentimentReport(params);
      res.json(report);
    } catch (error) {
      console.error('Stakeholder sentiment report error:', error);
      res.status(500).json({ error: 'Failed to generate stakeholder sentiment report' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Meeting-specific validation schemas
const generateMeetingAgendaSchema = z.object({
  projectName: z.string().min(1, "Project name is required"),
  meetingType: z.enum(['status', 'planning', 'review', 'decision', 'brainstorming']),
  meetingPurpose: z.string().min(1, "Meeting purpose is required"),
  duration: z.number().min(15).max(480), // 15 minutes to 8 hours
  participants: z.array(z.object({
    name: z.string(),
    role: z.string()
  })).min(1, "At least one participant is required"),
  objectives: z.array(z.string()).min(1, "At least one objective is required"),
  raidLogContext: z.array(z.object({
    id: z.string(),
    title: z.string(),
    type: z.string(),
    description: z.string()
  })).optional()
});

const refineMeetingContentSchema = z.object({
  currentContent: z.object({
    title: z.string(),
    agenda: z.array(z.object({
      item: z.string(),
      timeAllocation: z.number(),
      owner: z.string(),
      type: z.string()
    })),
    objectives: z.array(z.string()),
    preparation: z.string().optional()
  }),
  refinementRequest: z.string().min(1, "Refinement request is required"),
  meetingContext: z.object({
    meetingType: z.string(),
    duration: z.number(),
    participantCount: z.number()
  })
});

const generateMeetingInviteSchema = z.object({
  projectName: z.string().min(1, "Project name is required"),
  title: z.string().min(1, "Meeting title is required"),
  purpose: z.string().min(1, "Meeting purpose is required"),
  date: z.string().min(1, "Meeting date is required"),
  time: z.string().min(1, "Meeting time is required"),
  duration: z.number().min(15).max(480),
  location: z.string().min(1, "Meeting location is required"),
  agenda: z.array(z.object({
    item: z.string(),
    timeAllocation: z.number()
  })),
  preparation: z.string().optional(),
  hostName: z.string().min(1, "Host name is required")
});

const sendMeetingInviteSchema = z.object({
  recipients: z.array(z.object({
    email: z.string().email(),
    name: z.string(),
    role: z.string().optional()
  })).min(1, "At least one recipient is required"),
  meetingData: z.object({
    title: z.string(),
    description: z.string(),
    startTime: z.string(),
    endTime: z.string(),
    location: z.string(),
    organizerName: z.string(),
    organizerEmail: z.string().email(),
    agenda: z.array(z.object({
      item: z.string(),
      timeAllocation: z.number()
    })),
    preparation: z.string().optional(),
    projectName: z.string()
  }),
  dryRun: z.boolean().default(false)
});
