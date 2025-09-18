import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, jsonb, uuid, decimal, unique, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enhanced permissions structure for comprehensive Security Management Center
export const permissionsSchema = z.object({
  // User Management - granular CRUD operations
  canSeeUsers: z.boolean().default(false),
  canModifyUsers: z.boolean().default(false),
  canEditUsers: z.boolean().default(false),
  canDeleteUsers: z.boolean().default(false),
  
  // Project Management - granular CRUD operations
  canSeeProjects: z.boolean().default(false),
  canModifyProjects: z.boolean().default(false),
  canEditProjects: z.boolean().default(false),
  canDeleteProjects: z.boolean().default(false),
  canSeeAllProjects: z.boolean().default(false),
  canModifyAllProjects: z.boolean().default(false),
  canEditAllProjects: z.boolean().default(false),
  canDeleteAllProjects: z.boolean().default(false),
  
  // Tasks Management - granular CRUD operations
  canSeeTasks: z.boolean().default(false),
  canModifyTasks: z.boolean().default(false),
  canEditTasks: z.boolean().default(false),
  canDeleteTasks: z.boolean().default(false),
  
  // Stakeholder Management - granular CRUD operations
  canSeeStakeholders: z.boolean().default(false),
  canModifyStakeholders: z.boolean().default(false),
  canEditStakeholders: z.boolean().default(false),
  canDeleteStakeholders: z.boolean().default(false),
  
  // RAID Logs Management - granular CRUD operations
  canSeeRaidLogs: z.boolean().default(false),
  canModifyRaidLogs: z.boolean().default(false),
  canEditRaidLogs: z.boolean().default(false),
  canDeleteRaidLogs: z.boolean().default(false),
  
  // Communications Management - granular CRUD operations
  canSeeCommunications: z.boolean().default(false),
  canModifyCommunications: z.boolean().default(false),
  canEditCommunications: z.boolean().default(false),
  canDeleteCommunications: z.boolean().default(false),
  
  // Meeting Management - granular CRUD operations and scheduling
  canSeeMeetings: z.boolean().default(false),
  canModifyMeetings: z.boolean().default(false),
  canEditMeetings: z.boolean().default(false),
  canDeleteMeetings: z.boolean().default(false),
  canScheduleMeetings: z.boolean().default(false),
  canSendMeetingInvites: z.boolean().default(false),
  canGenerateMeetingAgendas: z.boolean().default(false),
  
  // Survey Management - granular CRUD operations
  canSeeSurveys: z.boolean().default(false),
  canModifySurveys: z.boolean().default(false),
  canEditSurveys: z.boolean().default(false),
  canDeleteSurveys: z.boolean().default(false),
  
  
  // Process Maps Management - granular CRUD operations
  canSeeProcessMaps: z.boolean().default(false),
  canModifyProcessMaps: z.boolean().default(false),
  canEditProcessMaps: z.boolean().default(false),
  canDeleteProcessMaps: z.boolean().default(false),
  
  // Gantt Charts Management - granular CRUD operations
  canSeeGanttCharts: z.boolean().default(false),
  canModifyGanttCharts: z.boolean().default(false),
  canEditGanttCharts: z.boolean().default(false),
  canDeleteGanttCharts: z.boolean().default(false),
  
  // Checklist Templates Management - granular CRUD operations
  canSeeChecklistTemplates: z.boolean().default(false),
  canModifyChecklistTemplates: z.boolean().default(false),
  canEditChecklistTemplates: z.boolean().default(false),
  canDeleteChecklistTemplates: z.boolean().default(false),
  
  // Reports and Analytics - granular access
  canSeeReports: z.boolean().default(false),
  canModifyReports: z.boolean().default(false),
  canEditReports: z.boolean().default(false),
  canDeleteReports: z.boolean().default(false),
  
  // Security and Role Management - granular CRUD operations
  canSeeRoles: z.boolean().default(false),
  canModifyRoles: z.boolean().default(false),
  canEditRoles: z.boolean().default(false),
  canDeleteRoles: z.boolean().default(false),
  canSeeGroups: z.boolean().default(false),
  canModifyGroups: z.boolean().default(false),
  canEditGroups: z.boolean().default(false),
  canDeleteGroups: z.boolean().default(false),
  canSeeSecuritySettings: z.boolean().default(false),
  canModifySecuritySettings: z.boolean().default(false),
  canEditSecuritySettings: z.boolean().default(false),
  canDeleteSecuritySettings: z.boolean().default(false),
  
  // Email System Permissions - fine-grained control
  canSendEmails: z.boolean().default(false),
  canSendBulkEmails: z.boolean().default(false),
  canSendSystemEmails: z.boolean().default(false),
  canSeeEmailLogs: z.boolean().default(false),
  canModifyEmailTemplates: z.boolean().default(false),
  canEditEmailSettings: z.boolean().default(false),
  
  // System Administration - high-level permissions
  canSeeSystemSettings: z.boolean().default(false),
  canModifySystemSettings: z.boolean().default(false),
  canEditSystemSettings: z.boolean().default(false),
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

// User Groups for advanced security management
export const userGroups = pgTable("user_groups", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  description: text("description"),
  permissions: jsonb("permissions").notNull().$type<Permissions>(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Many-to-many relationship between users and groups
export const userGroupMemberships = pgTable("user_group_memberships", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  groupId: uuid("group_id").references(() => userGroups.id, { onDelete: "cascade" }).notNull(),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
  assignedById: uuid("assigned_by_id").references(() => users.id, { onDelete: "set null" }),
}, (table) => ({
  uniqueUserGroup: unique().on(table.userId, table.groupId), // Prevent duplicate group memberships
}));

// Individual user permissions for ad-hoc security
export const userPermissions = pgTable("user_permissions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull().unique(),
  permissions: jsonb("permissions").notNull().$type<Permissions>(),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
  assignedById: uuid("assigned_by_id").references(() => users.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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
  // Initiative management enhancements
  priority: text("priority").notNull().default("medium"), // high, medium, low
  category: text("category"), // strategic, operational, compliance, technology
  objectives: text("objectives"), // Project objectives and goals
  scope: text("scope"), // Project scope definition
  successCriteria: text("success_criteria"), // Success criteria and KPIs
  budget: decimal("budget", { precision: 15, scale: 2 }), // Project budget amount
  assumptions: text("assumptions"), // Project assumptions
  constraints: text("constraints"), // Project constraints and limitations
  risks: text("risks"), // Initial risk assessment
  deliverables: jsonb("deliverables").default([]), // Array of deliverable objects
  stakeholderRequirements: text("stakeholder_requirements"), // Stakeholder needs
  businessJustification: text("business_justification"), // Business case
  currentPhase: text("current_phase").notNull().default("identify_need"), // Change process phase
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

// Communication Templates Repository
export const communicationTemplates = pgTable("communication_templates", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(), // flyer, email, meeting_agenda, newsletter, meeting
  templateType: text("template_type").notNull(), // company_approved, custom, system_default
  content: text("content").notNull(),
  metadata: jsonb("metadata").default({}), // Template-specific metadata like color schemes, fonts, etc.
  tags: text("tags").array().default([]), // For categorization and search
  isActive: boolean("is_active").notNull().default(true),
  usageCount: integer("usage_count").default(0), // Track how often template is used
  createdById: uuid("created_by_id").references(() => users.id, { onDelete: "restrict" }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const communications = pgTable("communications", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  type: text("type").notNull(), // flyer, group_email, point_to_point_email, meeting_prompt, meeting
  title: text("title").notNull(),
  content: text("content").notNull(),
  targetAudience: text("target_audience").array().default([]),
  sendDate: timestamp("send_date"),
  status: text("status").notNull().default("draft"), // draft, scheduled, sent
  // Enhanced fields for comprehensive communications
  channelPreferences: jsonb("channel_preferences").default({}), // {flyers: boolean, groupEmails: boolean, p2pEmails: boolean, meetings: boolean}
  visibilitySettings: text("visibility_settings").default("public"), // public, private (for P2P emails)
  distributionMethod: text("distribution_method"), // email, print, digital_display, meeting
  raidLogReferences: text("raid_log_references").array().default([]), // References to related RAID log entries
  exportOptions: jsonb("export_options").default({}), // {powerpoint: boolean, canva: boolean, pdf: boolean}
  // Repository-specific enhancements
  tags: text("tags").array().default([]), // Tags for categorization and search
  priority: text("priority").default("medium"), // low, medium, high, critical - for repository sorting
  effectivenessRating: decimal("effectiveness_rating", { precision: 3, scale: 2 }), // User-rated effectiveness (1.00-5.00)
  engagementScore: decimal("engagement_score", { precision: 5, scale: 2 }).default("0.00"), // Calculated engagement score
  viewCount: integer("view_count").default(0), // How many times this communication was viewed
  shareCount: integer("share_count").default(0), // How many times this communication was shared
  lastViewedAt: timestamp("last_viewed_at"), // Last time this communication was viewed
  archivedAt: timestamp("archived_at"), // When this communication was archived
  archivedById: uuid("archived_by_id").references(() => users.id, { onDelete: "set null" }), // Who archived it
  isArchived: boolean("is_archived").notNull().default(false), // Archive status
  version: integer("version").notNull().default(1), // Version number for version history
  parentId: uuid("parent_id").references(() => communications.id, { onDelete: "set null" }), // Reference to parent version
  // Meeting-specific data (5Ws)
  meetingWho: text("meeting_who"), // Who should attend
  meetingWhat: text("meeting_what"), // What will be discussed
  meetingWhen: timestamp("meeting_when"), // When the meeting is scheduled
  meetingWhere: text("meeting_where"), // Where the meeting will take place
  meetingWhy: text("meeting_why"), // Why the meeting is necessary
  // Enhanced meeting fields
  meetingType: text("meeting_type"), // status, planning, review, decision, brainstorming
  meetingDuration: integer("meeting_duration"), // Duration in minutes
  meetingTimezone: text("meeting_timezone"), // Timezone for the meeting
  meetingLocation: text("meeting_location"), // Physical location or virtual meeting link
  meetingAgenda: jsonb("meeting_agenda").default([]), // Array of agenda items with time allocations
  meetingObjectives: text("meeting_objectives").array().default([]), // Meeting objectives
  meetingOutcomes: text("meeting_outcomes"), // Meeting outcomes/decisions (post-meeting)
  meetingPreparation: text("meeting_preparation"), // What participants should prepare
  meetingRecurrencePattern: text("meeting_recurrence_pattern"), // none, daily, weekly, monthly, custom
  // GPT-generated content tracking
  isGptGenerated: boolean("is_gpt_generated").notNull().default(false),
  gptPromptUsed: text("gpt_prompt_used"), // Original prompt if GPT-generated
  gptInteractionId: uuid("gpt_interaction_id").references(() => gptInteractions.id, { onDelete: "set null" }), // Link to GPT interaction
  templateId: uuid("template_id").references(() => communicationTemplates.id, { onDelete: "set null" }), // Reference to template used
  createdById: uuid("created_by_id").references(() => users.id, { onDelete: "restrict" }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  // Additional repository metadata
  metadata: jsonb("metadata").default({}), // Extended metadata for analytics and custom fields
}, (table) => ({
  // Performance indexes for Repository operations
  projectIdIdx: index("communications_project_id_idx").on(table.projectId),
  typeIdx: index("communications_type_idx").on(table.type),
  statusIdx: index("communications_status_idx").on(table.status),
  createdAtIdx: index("communications_created_at_idx").on(table.createdAt),
  // Composite indexes for common queries
  projectTypeIdx: index("communications_project_type_idx").on(table.projectId, table.type),
  projectStatusIdx: index("communications_project_status_idx").on(table.projectId, table.status),
  // GIN index for tag searches
  tagsIdx: index("communications_tags_gin_idx").using("gin", table.tags),
  // Trigram indexes for text search performance
  titleTextIdx: index("communications_title_trgm_idx").using("gin", sql`${table.title} gin_trgm_ops`),
  contentTextIdx: index("communications_content_trgm_idx").using("gin", sql`${table.content} gin_trgm_ops`),
}));

// Communication Versions table for proper version history tracking
export const communicationVersions = pgTable("communication_versions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  communicationId: uuid("communication_id").references(() => communications.id, { onDelete: "cascade" }).notNull(),
  version: integer("version").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  targetAudience: text("target_audience").array().default([]),
  status: text("status").notNull(),
  type: text("type").notNull(),
  tags: text("tags").array().default([]),
  priority: text("priority"),
  effectivenessRating: decimal("effectiveness_rating", { precision: 3, scale: 2 }),
  metadata: jsonb("metadata").default({}),
  changeDescription: text("change_description"), // Description of what changed in this version
  editorId: uuid("editor_id").references(() => users.id, { onDelete: "set null" }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  uniqueVersionPerCommunication: unique().on(table.communicationId, table.version),
}));

// Communication Recipients tracking
export const communicationRecipients = pgTable("communication_recipients", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  communicationId: uuid("communication_id").references(() => communications.id, { onDelete: "cascade" }).notNull(),
  recipientType: text("recipient_type").notNull(), // internal_user, external_email, stakeholder
  recipientUserId: uuid("recipient_user_id").references(() => users.id, { onDelete: "set null" }), // For internal users
  recipientEmail: text("recipient_email"), // For external recipients
  recipientName: text("recipient_name"),
  recipientRole: text("recipient_role"), // Role or title of recipient
  deliveryStatus: text("delivery_status").notNull().default("pending"), // pending, sent, delivered, failed, bounced
  openedAt: timestamp("opened_at"), // Email open tracking
  clickedAt: timestamp("clicked_at"), // Click tracking
  respondedAt: timestamp("responded_at"), // Response tracking
  notes: text("notes"), // Additional notes about this recipient
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Communication Strategy for phase-based guidance
export const communicationStrategy = pgTable("communication_strategy", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  phase: text("phase").notNull(), // identify_need, develop_solution, implement_change, sustain_change, evaluate_results
  strategyName: text("strategy_name").notNull(),
  description: text("description"),
  targetAudiences: jsonb("target_audiences").default([]), // Array of audience objects
  keyMessages: jsonb("key_messages").default([]), // Array of key message objects
  communicationChannels: text("communication_channels").array().default([]), // email, meeting, flyer, etc.
  frequency: text("frequency"), // daily, weekly, monthly, as_needed
  stakeholderMapping: jsonb("stakeholder_mapping").default({}), // Map stakeholders to communication preferences
  resistancePoints: jsonb("resistance_points").default([]), // Identified resistance points and mitigation strategies
  successMetrics: jsonb("success_metrics").default([]), // How to measure communication effectiveness
  timeline: jsonb("timeline").default({}), // Communication timeline and milestones
  isActive: boolean("is_active").notNull().default(true),
  createdById: uuid("created_by_id").references(() => users.id, { onDelete: "restrict" }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Notifications system for user alerts
export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull(), // initiative_assignment, stakeholder_added, raid_identified, phase_change
  relatedId: uuid("related_id"), // Reference to related entity (project, stakeholder, raid log)
  relatedType: text("related_type"), // Type of related entity (project, stakeholder, raid_log)
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  // Performance indexes for notification queries
  userIdIdx: index("notifications_user_id_idx").on(table.userId),
  isReadIdx: index("notifications_is_read_idx").on(table.isRead),
  createdAtIdx: index("notifications_created_at_idx").on(table.createdAt),
  // Composite index for common queries (user's unread notifications)
  userUnreadIdx: index("notifications_user_unread_idx").on(table.userId, table.isRead, table.createdAt),
}));

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

// User Groups Relations
export const userGroupsRelations = relations(userGroups, ({ many }) => ({
  memberships: many(userGroupMemberships),
}));

// User Group Memberships Relations  
export const userGroupMembershipsRelations = relations(userGroupMemberships, ({ one }) => ({
  user: one(users, {
    fields: [userGroupMemberships.userId],
    references: [users.id],
  }),
  group: one(userGroups, {
    fields: [userGroupMemberships.groupId],
    references: [userGroups.id],
  }),
  assignedBy: one(users, {
    fields: [userGroupMemberships.assignedById],
    references: [users.id],
    relationName: "groupAssignments"
  }),
}));

// User Permissions Relations
export const userPermissionsRelations = relations(userPermissions, ({ one }) => ({
  user: one(users, {
    fields: [userPermissions.userId],
    references: [users.id],
  }),
  assignedBy: one(users, {
    fields: [userPermissions.assignedById],
    references: [users.id],
    relationName: "permissionAssignments"
  }),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  role: one(roles, {
    fields: [users.roleId],
    references: [roles.id],
  }),
  // Security Management Relations
  groupMemberships: many(userGroupMemberships),
  individualPermissions: one(userPermissions),
  assignedGroupMemberships: many(userGroupMemberships, { relationName: "groupAssignments" }),
  assignedPermissions: many(userPermissions, { relationName: "permissionAssignments" }),
  // Existing Relations
  ownedProjects: many(projects),
  assignedTasks: many(tasks),
  ownedRaidLogs: many(raidLogs, { relationName: "raidLogOwner" }),
  assignedRaidLogs: many(raidLogs, { relationName: "raidLogAssignee" }),
  communications: many(communications),
  surveys: many(surveys),
  surveyResponses: many(surveyResponses),
  gptInteractions: many(gptInteractions),
  createdChecklistTemplates: many(checklistTemplates),
  createdProcessMaps: many(processMaps),
  initiativeAssignments: many(userInitiativeAssignments, { relationName: "userAssignments" }),
  assignedInitiatives: many(userInitiativeAssignments, { relationName: "assignedBy" }),
  // Communication Module Relations
  createdCommunicationTemplates: many(communicationTemplates),
  communicationRecipients: many(communicationRecipients),
  createdCommunicationStrategies: many(communicationStrategy),
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
  processMaps: many(processMaps),
  userAssignments: many(userInitiativeAssignments),
  // Communication Module Relations
  communicationStrategies: many(communicationStrategy),
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

// Communication Templates Relations
export const communicationTemplatesRelations = relations(communicationTemplates, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [communicationTemplates.createdById],
    references: [users.id],
  }),
  communications: many(communications), // Communications that use this template
}));

// Communications Relations (Enhanced)
export const communicationsRelations = relations(communications, ({ one, many }) => ({
  project: one(projects, {
    fields: [communications.projectId],
    references: [projects.id],
  }),
  createdBy: one(users, {
    fields: [communications.createdById],
    references: [users.id],
  }),
  archivedBy: one(users, {
    fields: [communications.archivedById],
    references: [users.id],
    relationName: "communicationArchiver",
  }),
  template: one(communicationTemplates, {
    fields: [communications.templateId],
    references: [communicationTemplates.id],
  }),
  gptInteraction: one(gptInteractions, {
    fields: [communications.gptInteractionId],
    references: [gptInteractions.id],
  }),
  parentVersion: one(communications, {
    fields: [communications.parentId],
    references: [communications.id],
    relationName: "versionHistory",
  }),
  childVersions: many(communications, { relationName: "versionHistory" }),
  recipients: many(communicationRecipients), // Communication recipients
}));

// Communication Recipients Relations
export const communicationRecipientsRelations = relations(communicationRecipients, ({ one }) => ({
  communication: one(communications, {
    fields: [communicationRecipients.communicationId],
    references: [communications.id],
  }),
  recipientUser: one(users, {
    fields: [communicationRecipients.recipientUserId],
    references: [users.id],
  }),
}));

// Communication Strategy Relations
export const communicationStrategyRelations = relations(communicationStrategy, ({ one }) => ({
  project: one(projects, {
    fields: [communicationStrategy.projectId],
    references: [projects.id],
  }),
  createdBy: one(users, {
    fields: [communicationStrategy.createdById],
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

// Communication Templates Insert Schema
export const insertCommunicationTemplateSchema = createInsertSchema(communicationTemplates).omit({
  id: true,
  usageCount: true,
  createdAt: true,
  updatedAt: true,
});

// Enhanced Communications Insert Schema
export const insertCommunicationSchema = createInsertSchema(communications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCommunicationVersionSchema = createInsertSchema(communicationVersions).omit({
  id: true,
  createdAt: true,
});

// Communication Recipients Insert Schema
export const insertCommunicationRecipientSchema = createInsertSchema(communicationRecipients).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Communication Strategy Insert Schema
export const insertCommunicationStrategySchema = createInsertSchema(communicationStrategy).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Notifications Insert Schema
export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
}).extend({
  type: z.enum(['initiative_assignment', 'stakeholder_added', 'raid_identified', 'phase_change']),
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


export const insertProcessMapSchema = createInsertSchema(processMaps).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Security Management Insert Schemas
export const insertUserGroupSchema = createInsertSchema(userGroups).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  permissions: permissionsSchema, // Validate permissions structure
});

export const insertUserGroupMembershipSchema = createInsertSchema(userGroupMemberships).omit({
  id: true,
  assignedAt: true,
});

export const insertUserPermissionSchema = createInsertSchema(userPermissions).omit({
  id: true,
  assignedAt: true,
  updatedAt: true,
}).extend({
  permissions: permissionsSchema, // Validate permissions structure
});

// Default role permissions for seeding with enhanced Security Management Center permissions
export const DEFAULT_PERMISSIONS = {
  SUPER_ADMIN: {
    // User Management - Full Access
    canSeeUsers: true,
    canModifyUsers: true,
    canEditUsers: true,
    canDeleteUsers: true,
    
    // Project Management - Full Access
    canSeeProjects: true,
    canModifyProjects: true,
    canEditProjects: true,
    canDeleteProjects: true,
    canSeeAllProjects: true,
    canModifyAllProjects: true,
    canEditAllProjects: true,
    canDeleteAllProjects: true,
    
    // Tasks Management - Full Access
    canSeeTasks: true,
    canModifyTasks: true,
    canEditTasks: true,
    canDeleteTasks: true,
    
    // Stakeholder Management - Full Access
    canSeeStakeholders: true,
    canModifyStakeholders: true,
    canEditStakeholders: true,
    canDeleteStakeholders: true,
    
    // RAID Logs Management - Full Access
    canSeeRaidLogs: true,
    canModifyRaidLogs: true,
    canEditRaidLogs: true,
    canDeleteRaidLogs: true,
    
    // Communications Management - Full Access
    canSeeCommunications: true,
    canModifyCommunications: true,
    canEditCommunications: true,
    canDeleteCommunications: true,
    
    // Survey Management - Full Access
    canSeeSurveys: true,
    canModifySurveys: true,
    canEditSurveys: true,
    canDeleteSurveys: true,
    
    // Mind Maps Management - Full Access
    canSeeMindMaps: true,
    canModifyMindMaps: true,
    canEditMindMaps: true,
    canDeleteMindMaps: true,
    
    // Process Maps Management - Full Access
    canSeeProcessMaps: true,
    canModifyProcessMaps: true,
    canEditProcessMaps: true,
    canDeleteProcessMaps: true,
    
    // Gantt Charts Management - Full Access
    canSeeGanttCharts: true,
    canModifyGanttCharts: true,
    canEditGanttCharts: true,
    canDeleteGanttCharts: true,
    
    // Checklist Templates Management - Full Access
    canSeeChecklistTemplates: true,
    canModifyChecklistTemplates: true,
    canEditChecklistTemplates: true,
    canDeleteChecklistTemplates: true,
    
    // Reports and Analytics - Full Access
    canSeeReports: true,
    canModifyReports: true,
    canEditReports: true,
    canDeleteReports: true,
    
    // Security and Role Management - Full Access
    canSeeRoles: true,
    canModifyRoles: true,
    canEditRoles: true,
    canDeleteRoles: true,
    canSeeGroups: true,
    canModifyGroups: true,
    canEditGroups: true,
    canDeleteGroups: true,
    canSeeSecuritySettings: true,
    canModifySecuritySettings: true,
    canEditSecuritySettings: true,
    canDeleteSecuritySettings: true,
    
    // Email System Permissions - Full Access
    canSendEmails: true,
    canSendBulkEmails: true,
    canSendSystemEmails: true,
    canSeeEmailLogs: true,
    canModifyEmailTemplates: true,
    canEditEmailSettings: true,
    
    // System Administration - Full Access
    canSeeSystemSettings: true,
    canModifySystemSettings: true,
    canEditSystemSettings: true,
    canManageSystem: true,
  },
  PROJECT_MANAGER: {
    // User Management - View Only
    canSeeUsers: true,
    canModifyUsers: false,
    canEditUsers: false,
    canDeleteUsers: false,
    
    // Project Management - Limited Management
    canSeeProjects: true,
    canModifyProjects: true,
    canEditProjects: true,
    canDeleteProjects: false,
    canSeeAllProjects: true,
    canModifyAllProjects: false,
    canEditAllProjects: false,
    canDeleteAllProjects: false,
    
    // Tasks Management - Full Management
    canSeeTasks: true,
    canModifyTasks: true,
    canEditTasks: true,
    canDeleteTasks: true,
    
    // Stakeholder Management - Full Management
    canSeeStakeholders: true,
    canModifyStakeholders: true,
    canEditStakeholders: true,
    canDeleteStakeholders: true,
    
    // RAID Logs Management - Full Management
    canSeeRaidLogs: true,
    canModifyRaidLogs: true,
    canEditRaidLogs: true,
    canDeleteRaidLogs: true,
    
    // Communications Management - Full Management
    canSeeCommunications: true,
    canModifyCommunications: true,
    canEditCommunications: true,
    canDeleteCommunications: true,
    
    // Survey Management - Full Management
    canSeeSurveys: true,
    canModifySurveys: true,
    canEditSurveys: true,
    canDeleteSurveys: true,
    
    // Mind Maps Management - Full Management
    canSeeMindMaps: true,
    canModifyMindMaps: true,
    canEditMindMaps: true,
    canDeleteMindMaps: true,
    
    // Process Maps Management - Full Management
    canSeeProcessMaps: true,
    canModifyProcessMaps: true,
    canEditProcessMaps: true,
    canDeleteProcessMaps: true,
    
    // Gantt Charts Management - Full Management
    canSeeGanttCharts: true,
    canModifyGanttCharts: true,
    canEditGanttCharts: true,
    canDeleteGanttCharts: true,
    
    // Checklist Templates Management - Full Management
    canSeeChecklistTemplates: true,
    canModifyChecklistTemplates: true,
    canEditChecklistTemplates: true,
    canDeleteChecklistTemplates: true,
    
    // Reports and Analytics - View Only
    canSeeReports: true,
    canModifyReports: false,
    canEditReports: false,
    canDeleteReports: false,
    
    // Security and Role Management - View Only
    canSeeRoles: true,
    canModifyRoles: false,
    canEditRoles: false,
    canDeleteRoles: false,
    canSeeGroups: false,
    canModifyGroups: false,
    canEditGroups: false,
    canDeleteGroups: false,
    canSeeSecuritySettings: false,
    canModifySecuritySettings: false,
    canEditSecuritySettings: false,
    canDeleteSecuritySettings: false,
    
    // Email System Permissions - Basic Access
    canSendEmails: true,
    canSendBulkEmails: false,
    canSendSystemEmails: false,
    canSeeEmailLogs: false,
    canModifyEmailTemplates: false,
    canEditEmailSettings: false,
    
    // System Administration - No Access
    canSeeSystemSettings: false,
    canModifySystemSettings: false,
    canEditSystemSettings: false,
    canManageSystem: false,
  },
  TEAM_MEMBER: {
    // User Management - No Access
    canSeeUsers: false,
    canModifyUsers: false,
    canEditUsers: false,
    canDeleteUsers: false,
    
    // Project Management - Limited View Only
    canSeeProjects: true,
    canModifyProjects: false,
    canEditProjects: false,
    canDeleteProjects: false,
    canSeeAllProjects: false,
    canModifyAllProjects: false,
    canEditAllProjects: false,
    canDeleteAllProjects: false,
    
    // Tasks Management - Limited Access
    canSeeTasks: true,
    canModifyTasks: true,
    canEditTasks: true,
    canDeleteTasks: false,
    
    // Stakeholder Management - View Only
    canSeeStakeholders: true,
    canModifyStakeholders: false,
    canEditStakeholders: false,
    canDeleteStakeholders: false,
    
    // RAID Logs Management - View Only
    canSeeRaidLogs: true,
    canModifyRaidLogs: false,
    canEditRaidLogs: false,
    canDeleteRaidLogs: false,
    
    // Communications Management - View Only
    canSeeCommunications: true,
    canModifyCommunications: false,
    canEditCommunications: false,
    canDeleteCommunications: false,
    
    // Survey Management - Limited Access
    canSeeSurveys: true,
    canModifySurveys: false,
    canEditSurveys: false,
    canDeleteSurveys: false,
    
    // Mind Maps Management - Limited Access
    canSeeMindMaps: true,
    canModifyMindMaps: true,
    canEditMindMaps: true,
    canDeleteMindMaps: false,
    
    // Process Maps Management - Limited Access
    canSeeProcessMaps: true,
    canModifyProcessMaps: true,
    canEditProcessMaps: true,
    canDeleteProcessMaps: false,
    
    // Gantt Charts Management - View Only
    canSeeGanttCharts: true,
    canModifyGanttCharts: false,
    canEditGanttCharts: false,
    canDeleteGanttCharts: false,
    
    // Checklist Templates Management - Limited Access
    canSeeChecklistTemplates: true,
    canModifyChecklistTemplates: false,
    canEditChecklistTemplates: false,
    canDeleteChecklistTemplates: false,
    
    // Reports and Analytics - No Access
    canSeeReports: false,
    canModifyReports: false,
    canEditReports: false,
    canDeleteReports: false,
    
    // Security and Role Management - No Access
    canSeeRoles: false,
    canModifyRoles: false,
    canEditRoles: false,
    canDeleteRoles: false,
    canSeeGroups: false,
    canModifyGroups: false,
    canEditGroups: false,
    canDeleteGroups: false,
    canSeeSecuritySettings: false,
    canModifySecuritySettings: false,
    canEditSecuritySettings: false,
    canDeleteSecuritySettings: false,
    
    // Email System Permissions - No Access
    canSendEmails: false,
    canSendBulkEmails: false,
    canSendSystemEmails: false,
    canSeeEmailLogs: false,
    canModifyEmailTemplates: false,
    canEditEmailSettings: false,
    
    // System Administration - No Access
    canSeeSystemSettings: false,
    canModifySystemSettings: false,
    canEditSystemSettings: false,
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

// Communication Templates Types
export type CommunicationTemplate = typeof communicationTemplates.$inferSelect;
export type InsertCommunicationTemplate = z.infer<typeof insertCommunicationTemplateSchema>;

// Enhanced Communications Types
export type Communication = typeof communications.$inferSelect;
export type InsertCommunication = z.infer<typeof insertCommunicationSchema>;

// Communication Versions Types
export type CommunicationVersion = typeof communicationVersions.$inferSelect;
export type InsertCommunicationVersion = z.infer<typeof insertCommunicationVersionSchema>;

// Communication Recipients Types
export type CommunicationRecipient = typeof communicationRecipients.$inferSelect;
export type InsertCommunicationRecipient = z.infer<typeof insertCommunicationRecipientSchema>;

// Communication Strategy Types
export type CommunicationStrategy = typeof communicationStrategy.$inferSelect;
export type InsertCommunicationStrategy = z.infer<typeof insertCommunicationStrategySchema>;

// Notifications Types
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

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


export type ProcessMap = typeof processMaps.$inferSelect;
export type InsertProcessMap = z.infer<typeof insertProcessMapSchema>;

// Security Management Center Types
export type UserGroup = typeof userGroups.$inferSelect;
export type InsertUserGroup = z.infer<typeof insertUserGroupSchema>;

export type UserGroupMembership = typeof userGroupMemberships.$inferSelect;
export type InsertUserGroupMembership = z.infer<typeof insertUserGroupMembershipSchema>;

export type UserPermission = typeof userPermissions.$inferSelect;
export type InsertUserPermission = z.infer<typeof insertUserPermissionSchema>;

// Security validation schemas for API endpoints
export const distributionRequestSchema = z.object({
  distributionMethod: z.enum(['email', 'slack', 'teams']).default('email'),
  recipients: z.array(z.string().email()).optional(),
  dryRun: z.boolean().default(false)
});

export const exportRequestSchema = z.object({
  format: z.enum(['powerpoint', 'pdf', 'canva'])
});

export type DistributionRequest = z.infer<typeof distributionRequestSchema>;
export type ExportRequest = z.infer<typeof exportRequestSchema>;
