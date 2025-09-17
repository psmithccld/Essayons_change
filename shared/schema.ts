import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, jsonb, uuid, decimal, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Define permissions structure for type safety
export const permissionsSchema = z.object({
  canViewUsers: z.boolean().default(false), // RBAC: View user lists and profiles
  canCreateUsers: z.boolean().default(false),
  canEditUsers: z.boolean().default(false),
  canDeleteUsers: z.boolean().default(false),
  canCreateProjects: z.boolean().default(false),
  canEditAllProjects: z.boolean().default(false),
  canDeleteProjects: z.boolean().default(false),
  canViewAllProjects: z.boolean().default(false),
  canViewRoles: z.boolean().default(false), // RBAC: View roles for assignment
  canCreateRoles: z.boolean().default(false),
  canEditRoles: z.boolean().default(false),
  canDeleteRoles: z.boolean().default(false),
  canViewReports: z.boolean().default(false),
  canManageSystem: z.boolean().default(false),
});

export type Permissions = z.infer<typeof permissionsSchema>;

export const roles = pgTable("roles", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  description: text("description"),
  permissions: jsonb("permissions").notNull().$type<Permissions>(), // Strongly typed permissions object
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(), // Changed from plain text to hashed password
  name: text("name").notNull(),
  roleId: uuid("role_id").references(() => roles.id, { onDelete: "restrict" }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").notNull().default("planning"), // planning, active, completed, cancelled
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  progress: integer("progress").default(0), // 0-100
  ownerId: uuid("owner_id").references(() => users.id, { onDelete: "restrict" }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const userInitiativeAssignments = pgTable("user_initiative_assignments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  role: text("role").notNull(), // Initiative-specific role: "Lead", "Member", "Observer"
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
  assignedById: uuid("assigned_by_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
}, (table) => ({
  uniqueUserProject: unique().on(table.userId, table.projectId), // Prevent duplicate assignments
}));

export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").notNull().default("pending"), // pending, in_progress, completed, blocked
  priority: text("priority").notNull().default("medium"), // low, medium, high, critical
  assigneeId: uuid("assignee_id").references(() => users.id, { onDelete: "set null" }),
  assigneeEmail: text("assignee_email"), // For external email assignments
  startDate: timestamp("start_date"),
  dueDate: timestamp("due_date"),
  completedDate: timestamp("completed_date"),
  progress: integer("progress").default(0),
  dependencies: text("dependencies").array().default([]),
  checklist: jsonb("checklist").default([]), // Array of {id: string, text: string, completed: boolean}
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const stakeholders = pgTable("stakeholders", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  department: text("department"),
  email: text("email"),
  phone: text("phone"),
  influenceLevel: text("influence_level").notNull(), // low, medium, high
  supportLevel: text("support_level").notNull(), // resistant, neutral, supportive
  engagementLevel: text("engagement_level").notNull(), // low, medium, high
  communicationPreference: text("communication_preference"), // email, meeting, phone
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const raidLogs = pgTable("raid_logs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  type: text("type").notNull(), // risk, action, issue, deficiency
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("open"), // open, in_progress, closed
  severity: text("severity").notNull(), // low, medium, high, critical
  impact: text("impact").notNull(), // low, medium, high
  probability: text("probability"), // low, medium, high (for risks)
  ownerId: uuid("owner_id").references(() => users.id, { onDelete: "restrict" }).notNull(),
  assigneeId: uuid("assignee_id").references(() => users.id, { onDelete: "set null" }),
  dueDate: timestamp("due_date"),
  resolution: text("resolution"),
  // Template-specific fields from Excel
  // Risk Register fields
  likelihood: integer("likelihood"), // 1-5 scale
  riskLevel: integer("risk_level"), // 1-5 scale  
  potentialOutcome: text("potential_outcome"),
  whoWillManage: text("who_will_manage"),
  notes: text("notes"),
  // Action Register fields
  event: text("event"), // Event description
  dueOut: text("due_out"), // What is due out
  wasDeadlineMet: boolean("was_deadline_met"),
  // Issue Register fields (custom template)
  priority: text("priority"), // low, medium, high, critical
  rootCause: text("root_cause"),
  // Deficiency Register fields (custom template) 
  category: text("category"),
  targetResolutionDate: timestamp("target_resolution_date"),
  resolutionStatus: text("resolution_status"), // pending, in_progress, resolved
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const communications = pgTable("communications", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  type: text("type").notNull(), // flyer, company_email, point_to_point_email, meeting_prompt
  title: text("title").notNull(),
  content: text("content").notNull(),
  targetAudience: text("target_audience").array().default([]),
  sendDate: timestamp("send_date"),
  status: text("status").notNull().default("draft"), // draft, scheduled, sent
  createdById: uuid("created_by_id").references(() => users.id, { onDelete: "restrict" }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const surveys = pgTable("surveys", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  questions: jsonb("questions").notNull(), // Array of question objects
  status: text("status").notNull().default("draft"), // draft, active, completed
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  targetStakeholders: text("target_stakeholders").array().default([]),
  createdById: uuid("created_by_id").references(() => users.id, { onDelete: "restrict" }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const surveyResponses = pgTable("survey_responses", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  surveyId: uuid("survey_id").references(() => surveys.id, { onDelete: "cascade" }).notNull(),
  respondentId: uuid("respondent_id").references(() => users.id, { onDelete: "set null" }),
  respondentEmail: text("respondent_email"),
  responses: jsonb("responses").notNull(), // Object with questionId -> answer
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
});

export const gptInteractions = pgTable("gpt_interactions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  type: text("type").notNull(), // communication_plan, readiness_analysis, risk_mitigation, stakeholder_tips
  prompt: text("prompt").notNull(),
  response: text("response").notNull(),
  metadata: jsonb("metadata"), // Additional context data
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const milestones = pgTable("milestones", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  targetDate: timestamp("target_date").notNull(),
  status: text("status").notNull().default("pending"), // pending, achieved, missed
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const checklistTemplates = pgTable("checklist_templates", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(), // development, marketing, operations, general
  templateItems: jsonb("template_items").notNull(), // Array of {text: string, required: boolean}
  isActive: boolean("is_active").notNull().default(true),
  createdById: uuid("created_by_id").references(() => users.id, { onDelete: "restrict" }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const mindMaps = pgTable("mind_maps", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  canvasData: jsonb("canvas_data").notNull(), // Fabric.js canvas state
  textBoxes: jsonb("text_boxes").default([]), // Array of text box metadata for context menus
  isActive: boolean("is_active").notNull().default(true),
  createdById: uuid("created_by_id").references(() => users.id, { onDelete: "restrict" }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const processMaps = pgTable("process_maps", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  canvasData: jsonb("canvas_data").notNull(), // Fabric.js canvas state
  elements: jsonb("elements").default([]), // Array of process elements metadata
  connections: jsonb("connections").default([]), // Array of connection data between elements
  isActive: boolean("is_active").notNull().default(true),
  createdById: uuid("created_by_id").references(() => users.id, { onDelete: "restrict" }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Relations
export const rolesRelations = relations(roles, ({ many }) => ({
  users: many(users),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  role: one(roles, {
    fields: [users.roleId],
    references: [roles.id],
  }),
  ownedProjects: many(projects),
  assignedTasks: many(tasks),
  ownedRaidLogs: many(raidLogs, { relationName: "raidLogOwner" }),
  assignedRaidLogs: many(raidLogs, { relationName: "raidLogAssignee" }),
  communications: many(communications),
  surveys: many(surveys),
  surveyResponses: many(surveyResponses),
  gptInteractions: many(gptInteractions),
  createdChecklistTemplates: many(checklistTemplates),
  createdMindMaps: many(mindMaps),
  createdProcessMaps: many(processMaps),
  initiativeAssignments: many(userInitiativeAssignments, { relationName: "userAssignments" }),
  assignedInitiatives: many(userInitiativeAssignments, { relationName: "assignedBy" }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  owner: one(users, {
    fields: [projects.ownerId],
    references: [users.id],
  }),
  tasks: many(tasks),
  stakeholders: many(stakeholders),
  raidLogs: many(raidLogs),
  communications: many(communications),
  surveys: many(surveys),
  gptInteractions: many(gptInteractions),
  milestones: many(milestones),
  mindMaps: many(mindMaps),
  processMaps: many(processMaps),
  userAssignments: many(userInitiativeAssignments),
}));

export const userInitiativeAssignmentsRelations = relations(userInitiativeAssignments, ({ one }) => ({
  user: one(users, {
    fields: [userInitiativeAssignments.userId],
    references: [users.id],
    relationName: "userAssignments"
  }),
  project: one(projects, {
    fields: [userInitiativeAssignments.projectId],
    references: [projects.id],
  }),
  assignedBy: one(users, {
    fields: [userInitiativeAssignments.assignedById],
    references: [users.id],
    relationName: "assignedBy"
  }),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id],
  }),
  assignee: one(users, {
    fields: [tasks.assigneeId],
    references: [users.id],
  }),
}));

export const stakeholdersRelations = relations(stakeholders, ({ one }) => ({
  project: one(projects, {
    fields: [stakeholders.projectId],
    references: [projects.id],
  }),
}));

export const raidLogsRelations = relations(raidLogs, ({ one }) => ({
  project: one(projects, {
    fields: [raidLogs.projectId],
    references: [projects.id],
  }),
  owner: one(users, {
    fields: [raidLogs.ownerId],
    references: [users.id],
    relationName: "raidLogOwner"
  }),
  assignee: one(users, {
    fields: [raidLogs.assigneeId],
    references: [users.id],
    relationName: "raidLogAssignee"
  }),
}));

export const communicationsRelations = relations(communications, ({ one }) => ({
  project: one(projects, {
    fields: [communications.projectId],
    references: [projects.id],
  }),
  createdBy: one(users, {
    fields: [communications.createdById],
    references: [users.id],
  }),
}));

export const surveysRelations = relations(surveys, ({ one, many }) => ({
  project: one(projects, {
    fields: [surveys.projectId],
    references: [projects.id],
  }),
  createdBy: one(users, {
    fields: [surveys.createdById],
    references: [users.id],
  }),
  responses: many(surveyResponses),
}));

export const surveyResponsesRelations = relations(surveyResponses, ({ one }) => ({
  survey: one(surveys, {
    fields: [surveyResponses.surveyId],
    references: [surveys.id],
  }),
  respondent: one(users, {
    fields: [surveyResponses.respondentId],
    references: [users.id],
  }),
}));

export const gptInteractionsRelations = relations(gptInteractions, ({ one }) => ({
  project: one(projects, {
    fields: [gptInteractions.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [gptInteractions.userId],
    references: [users.id],
  }),
}));

export const milestonesRelations = relations(milestones, ({ one }) => ({
  project: one(projects, {
    fields: [milestones.projectId],
    references: [projects.id],
  }),
}));

export const checklistTemplatesRelations = relations(checklistTemplates, ({ one }) => ({
  createdBy: one(users, {
    fields: [checklistTemplates.createdById],
    references: [users.id],
  }),
}));

export const mindMapsRelations = relations(mindMaps, ({ one }) => ({
  project: one(projects, {
    fields: [mindMaps.projectId],
    references: [projects.id],
  }),
  createdBy: one(users, {
    fields: [mindMaps.createdById],
    references: [users.id],
  }),
}));

export const processMapsRelations = relations(processMaps, ({ one }) => ({
  project: one(projects, {
    fields: [processMaps.projectId],
    references: [projects.id],
  }),
  createdBy: one(users, {
    fields: [processMaps.createdById],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertRoleSchema = createInsertSchema(roles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  permissions: permissionsSchema, // Validate permissions structure
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  passwordHash: true, // Exclude hashed password from direct insertion
}).extend({
  password: z.string().min(8, "Password must be at least 8 characters long"), // Plain password for hashing
  roleId: z.string().uuid("Role ID must be a valid UUID"), // Ensure roleId is required and valid
});

export const insertUserInitiativeAssignmentSchema = createInsertSchema(userInitiativeAssignments).omit({
  id: true,
  assignedAt: true,
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertStakeholderSchema = createInsertSchema(stakeholders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRaidLogSchema = createInsertSchema(raidLogs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Template-specific schemas for each RAID log type
export const insertRiskSchema = insertRaidLogSchema.extend({
  type: z.literal("risk"),
  likelihood: z.number().min(1).max(5),
  riskLevel: z.number().min(1).max(5),
  potentialOutcome: z.string(),
  whoWillManage: z.string(),
  notes: z.string().optional(),
}).omit({
  description: true, // Use notes instead
  severity: true, // Use riskLevel instead
  impact: true, // Use riskLevel instead
  probability: true, // Use likelihood instead
});

export const insertActionSchema = insertRaidLogSchema.extend({
  type: z.literal("action"),
  event: z.string(),
  dueOut: z.string(),
  dueDate: z.string().optional(), // deadline in template
  wasDeadlineMet: z.boolean().optional(),
  notes: z.string().optional(),
}).omit({
  description: true, // Use event instead
  severity: true, // Not used for actions
  impact: true, // Not used for actions
  probability: true, // Not used for actions
});

export const insertIssueSchema = insertRaidLogSchema.extend({
  type: z.literal("issue"),
  priority: z.enum(["low", "medium", "high", "critical"]),
  rootCause: z.string().optional(),
}).omit({
  probability: true, // Not used for issues
});

export const insertDeficiencySchema = insertRaidLogSchema.extend({
  type: z.literal("deficiency"),
  category: z.string(),
  targetResolutionDate: z.string().optional(),
  resolutionStatus: z.enum(["pending", "in_progress", "resolved"]).optional(),
}).omit({
  probability: true, // Not used for deficiencies
});

export const insertCommunicationSchema = createInsertSchema(communications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Base schema without refinements for operations that need .omit()
export const baseSurveySchema = createInsertSchema(surveys).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  startDate: z.string().optional().transform((val) => {
    if (!val) return undefined;
    const date = new Date(val);
    if (isNaN(date.getTime())) {
      throw new Error("Invalid start date format");
    }
    return date;
  }),
  endDate: z.string().optional().transform((val) => {
    if (!val) return undefined;
    const date = new Date(val);
    if (isNaN(date.getTime())) {
      throw new Error("Invalid end date format");
    }
    return date;
  }),
});

// Final schema with date validation refinements
export const insertSurveySchema = baseSurveySchema.refine((data) => {
  // Ensure endDate >= startDate when both are provided
  if (data.startDate && data.endDate) {
    return data.endDate >= data.startDate;
  }
  return true;
}, {
  message: "End date must be greater than or equal to start date",
  path: ["endDate"],
});

export const insertSurveyResponseSchema = createInsertSchema(surveyResponses).omit({
  id: true,
  submittedAt: true,
});

export const insertGptInteractionSchema = createInsertSchema(gptInteractions).omit({
  id: true,
  createdAt: true,
});

export const insertMilestoneSchema = createInsertSchema(milestones).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertChecklistTemplateSchema = createInsertSchema(checklistTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMindMapSchema = createInsertSchema(mindMaps).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProcessMapSchema = createInsertSchema(processMaps).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Default role permissions for seeding
export const DEFAULT_PERMISSIONS = {
  SUPER_ADMIN: {
    canViewUsers: true,
    canCreateUsers: true,
    canEditUsers: true,
    canDeleteUsers: true,
    canCreateProjects: true,
    canEditAllProjects: true,
    canDeleteProjects: true,
    canViewAllProjects: true,
    canViewRoles: true,
    canCreateRoles: true,
    canEditRoles: true,
    canDeleteRoles: true,
    canViewReports: true,
    canManageSystem: true,
  },
  PROJECT_MANAGER: {
    canViewUsers: true, // Can view users for assignment purposes
    canCreateUsers: false,
    canEditUsers: false,
    canDeleteUsers: false,
    canCreateProjects: true,
    canEditAllProjects: false,
    canDeleteProjects: false,
    canViewAllProjects: false,
    canViewRoles: true, // Can view roles for assignment purposes
    canCreateRoles: false,
    canEditRoles: false,
    canDeleteRoles: false,
    canViewReports: true,
    canManageSystem: false,
  },
  TEAM_MEMBER: {
    canViewUsers: false, // Team members don't need to view all users
    canCreateUsers: false,
    canEditUsers: false,
    canDeleteUsers: false,
    canCreateProjects: false,
    canEditAllProjects: false,
    canDeleteProjects: false,
    canViewAllProjects: false,
    canViewRoles: false, // Team members don't need to assign roles
    canCreateRoles: false,
    canEditRoles: false,
    canDeleteRoles: false,
    canViewReports: false,
    canManageSystem: false,
  },
} as const;

// Types
export type Role = typeof roles.$inferSelect;
export type InsertRole = z.infer<typeof insertRoleSchema>;

// SECURITY: User type excludes passwordHash to prevent exposure
export type User = Omit<typeof users.$inferSelect, 'passwordHash'>;
// Internal type for authentication operations (never exported to frontend)
export type UserWithPassword = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type UserInitiativeAssignment = typeof userInitiativeAssignments.$inferSelect;
export type InsertUserInitiativeAssignment = z.infer<typeof insertUserInitiativeAssignmentSchema>;

export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;

export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;

export type Stakeholder = typeof stakeholders.$inferSelect;
export type InsertStakeholder = z.infer<typeof insertStakeholderSchema>;

export type RaidLog = typeof raidLogs.$inferSelect;
export type InsertRaidLog = z.infer<typeof insertRaidLogSchema>;
export type InsertRisk = z.infer<typeof insertRiskSchema>;
export type InsertAction = z.infer<typeof insertActionSchema>;
export type InsertIssue = z.infer<typeof insertIssueSchema>;
export type InsertDeficiency = z.infer<typeof insertDeficiencySchema>;

export type Communication = typeof communications.$inferSelect;
export type InsertCommunication = z.infer<typeof insertCommunicationSchema>;

export type Survey = typeof surveys.$inferSelect;
export type InsertSurvey = z.infer<typeof insertSurveySchema>;

export type SurveyResponse = typeof surveyResponses.$inferSelect;
export type InsertSurveyResponse = z.infer<typeof insertSurveyResponseSchema>;

export type GptInteraction = typeof gptInteractions.$inferSelect;
export type InsertGptInteraction = z.infer<typeof insertGptInteractionSchema>;

export type Milestone = typeof milestones.$inferSelect;
export type InsertMilestone = z.infer<typeof insertMilestoneSchema>;

export type ChecklistTemplate = typeof checklistTemplates.$inferSelect;
export type InsertChecklistTemplate = z.infer<typeof insertChecklistTemplateSchema>;

export type MindMap = typeof mindMaps.$inferSelect;
export type InsertMindMap = z.infer<typeof insertMindMapSchema>;

export type ProcessMap = typeof processMaps.$inferSelect;
export type InsertProcessMap = z.infer<typeof insertProcessMapSchema>;
