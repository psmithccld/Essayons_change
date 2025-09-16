import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, jsonb, uuid, decimal } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("user"),
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
  ownerId: uuid("owner_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: uuid("project_id").references(() => projects.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").notNull().default("pending"), // pending, in_progress, completed, blocked
  priority: text("priority").notNull().default("medium"), // low, medium, high, critical
  assigneeId: uuid("assignee_id").references(() => users.id),
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
  projectId: uuid("project_id").references(() => projects.id).notNull(),
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
  projectId: uuid("project_id").references(() => projects.id).notNull(),
  type: text("type").notNull(), // risk, action, issue, deficiency
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("open"), // open, in_progress, closed
  severity: text("severity").notNull(), // low, medium, high, critical
  impact: text("impact").notNull(), // low, medium, high
  probability: text("probability"), // low, medium, high (for risks)
  ownerId: uuid("owner_id").references(() => users.id).notNull(),
  assigneeId: uuid("assignee_id").references(() => users.id),
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
  projectId: uuid("project_id").references(() => projects.id).notNull(),
  type: text("type").notNull(), // flyer, company_email, point_to_point_email, meeting_prompt
  title: text("title").notNull(),
  content: text("content").notNull(),
  targetAudience: text("target_audience").array().default([]),
  sendDate: timestamp("send_date"),
  status: text("status").notNull().default("draft"), // draft, scheduled, sent
  createdById: uuid("created_by_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const surveys = pgTable("surveys", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: uuid("project_id").references(() => projects.id).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  questions: jsonb("questions").notNull(), // Array of question objects
  status: text("status").notNull().default("draft"), // draft, active, completed
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  createdById: uuid("created_by_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const surveyResponses = pgTable("survey_responses", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  surveyId: uuid("survey_id").references(() => surveys.id).notNull(),
  respondentId: uuid("respondent_id").references(() => users.id),
  respondentEmail: text("respondent_email"),
  responses: jsonb("responses").notNull(), // Object with questionId -> answer
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
});

export const gptInteractions = pgTable("gpt_interactions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: uuid("project_id").references(() => projects.id),
  userId: uuid("user_id").references(() => users.id).notNull(),
  type: text("type").notNull(), // communication_plan, readiness_analysis, risk_mitigation, stakeholder_tips
  prompt: text("prompt").notNull(),
  response: text("response").notNull(),
  metadata: jsonb("metadata"), // Additional context data
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const milestones = pgTable("milestones", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: uuid("project_id").references(() => projects.id).notNull(),
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
  createdById: uuid("created_by_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  ownedProjects: many(projects),
  assignedTasks: many(tasks),
  ownedRaidLogs: many(raidLogs),
  assignedRaidLogs: many(raidLogs),
  communications: many(communications),
  surveys: many(surveys),
  surveyResponses: many(surveyResponses),
  gptInteractions: many(gptInteractions),
  createdChecklistTemplates: many(checklistTemplates),
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
  }),
  assignee: one(users, {
    fields: [raidLogs.assigneeId],
    references: [users.id],
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

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
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

export const insertSurveySchema = createInsertSchema(surveys).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
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

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

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
