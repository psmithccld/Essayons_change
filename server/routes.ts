import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertProjectSchema, insertTaskSchema, insertStakeholderSchema, insertRaidLogSchema,
  insertCommunicationSchema, insertSurveySchema, insertSurveyResponseSchema, insertGptInteractionSchema,
  insertMilestoneSchema, insertChecklistTemplateSchema, insertMindMapSchema, insertProcessMapSchema,
  insertRiskSchema, insertActionSchema, insertIssueSchema, insertDeficiencySchema
} from "@shared/schema";
import * as openaiService from "./openai";
import { sendTaskAssignmentNotification } from "./services/emailService";

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
  // Users
  app.get("/api/users", async (req, res) => {
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

  app.post("/api/projects", async (req, res) => {
    try {
      // Convert date strings to Date objects before validation
      const processedData = {
        ...req.body,
        ownerId: "550e8400-e29b-41d4-a716-446655440000",
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

  app.put("/api/projects/:id", async (req, res) => {
    try {
      const project = await storage.updateProject(req.params.id, req.body);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      console.error("Error updating project:", error);
      res.status(400).json({ error: "Failed to update project" });
    }
  });

  app.delete("/api/projects/:id", async (req, res) => {
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
      const survey = await storage.updateSurvey(req.params.id, req.body);
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

  // Mind Maps
  app.get("/api/projects/:projectId/mind-maps", async (req, res) => {
    try {
      const mindMaps = await storage.getMindMapsByProject(req.params.projectId);
      res.json(mindMaps);
    } catch (error) {
      console.error("Error fetching mind maps:", error);
      res.status(500).json({ error: "Failed to fetch mind maps" });
    }
  });

  app.get("/api/mind-maps/:id", async (req, res) => {
    try {
      const mindMap = await storage.getMindMap(req.params.id);
      if (!mindMap) {
        return res.status(404).json({ error: "Mind map not found" });
      }
      res.json(mindMap);
    } catch (error) {
      console.error("Error fetching mind map:", error);
      res.status(500).json({ error: "Failed to fetch mind map" });
    }
  });

  app.post("/api/projects/:projectId/mind-maps", async (req, res) => {
    try {
      const validatedData = insertMindMapSchema.parse({
        ...req.body,
        projectId: req.params.projectId,
        createdById: "550e8400-e29b-41d4-a716-446655440000", // For demo, using default user ID
      });
      const mindMap = await storage.createMindMap(validatedData);
      res.status(201).json(mindMap);
    } catch (error) {
      console.error("Error creating mind map:", error);
      res.status(400).json({ error: "Failed to create mind map" });
    }
  });

  app.put("/api/mind-maps/:id", async (req, res) => {
    try {
      const mindMap = await storage.updateMindMap(req.params.id, req.body);
      if (!mindMap) {
        return res.status(404).json({ error: "Mind map not found" });
      }
      res.json(mindMap);
    } catch (error) {
      console.error("Error updating mind map:", error);
      res.status(400).json({ error: "Failed to update mind map" });
    }
  });

  app.delete("/api/mind-maps/:id", async (req, res) => {
    try {
      const success = await storage.deleteMindMap(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Mind map not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting mind map:", error);
      res.status(500).json({ error: "Failed to delete mind map" });
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

  const httpServer = createServer(app);
  return httpServer;
}
