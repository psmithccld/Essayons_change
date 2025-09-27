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
  
  // Change Artifacts Management - granular CRUD operations
  canSeeArtifacts: z.boolean().default(false),
  canModifyArtifacts: z.boolean().default(false),
  canEditArtifacts: z.boolean().default(false),
  canDeleteArtifacts: z.boolean().default(false),
  
  // System Administration - high-level permissions
  canSeeSystemSettings: z.boolean().default(false),
  canModifySystemSettings: z.boolean().default(false),
  canEditSystemSettings: z.boolean().default(false),
  canManageSystem: z.boolean().default(false),
  
  // Organizational Management - SaaS administrative permissions
  canManageOrganizations: z.boolean().default(false),
  canSeeAllOrganizations: z.boolean().default(false),
  canModifyOrganizationSettings: z.boolean().default(false),
  canDeleteOrganizations: z.boolean().default(false),
  canSeeOrganizationBilling: z.boolean().default(false),
  canModifyOrganizationBilling: z.boolean().default(false),
  
  // Subscription and Plan Management
  canManageSubscriptions: z.boolean().default(false),
  canSeeAllSubscriptions: z.boolean().default(false),
  canModifySubscriptions: z.boolean().default(false),
  canCancelSubscriptions: z.boolean().default(false),
  canManagePlans: z.boolean().default(false),
  canCreateCustomPlans: z.boolean().default(false),
  canModifyPlanPricing: z.boolean().default(false),
  
  // Consultation and Custom Package Management
  canManageConsultations: z.boolean().default(false),
  canSeeAllConsultations: z.boolean().default(false),
  canScheduleConsultations: z.boolean().default(false),
  canCreateCustomPackages: z.boolean().default(false),
  canModifyCustomPackages: z.boolean().default(false),
  canAccessConsultationNotes: z.boolean().default(false),
  
  // Multi-tenant Organization Switching
  canSwitchOrganizations: z.boolean().default(false),
  canInviteToOrganizations: z.boolean().default(false),
  canManageOrganizationMembers: z.boolean().default(false),
  canAssignOrganizationRoles: z.boolean().default(false),
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
  passwordHash: text("password_hash"), // Made optional for pending users
  name: text("name").notNull(),
  email: text("email").notNull().unique(), // Added email for verification
  department: text("department"), // Department for stakeholder auto-population
  roleId: uuid("role_id").references(() => roles.id, { onDelete: "restrict" }).notNull(),
  currentOrganizationId: uuid("current_organization_id"), // Fixed circular reference - constraints added via relations
  isActive: boolean("is_active").notNull().default(true),
  isEmailVerified: boolean("is_email_verified").notNull().default(false), // Email verification status
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Email verification tokens for secure user registration
export const emailVerificationTokens = pgTable("email_verification_tokens", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull(),
  token: text("token").notNull().unique(), // Secure random token
  expiresAt: timestamp("expires_at").notNull(), // Token expiration
  isUsed: boolean("is_used").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  emailIdx: index("email_verification_tokens_email_idx").on(table.email),
  tokenIdx: index("email_verification_tokens_token_idx").on(table.token),
}));

// Password reset tokens for future use
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  isUsed: boolean("is_used").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  tokenIdx: index("password_reset_tokens_token_idx").on(table.token),
}));

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

// Multi-tenant Organization System

// Organizations table - the core of multi-tenancy
export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(), // URL-friendly identifier
  description: text("description"),
  status: text("status").notNull().default("active"), // active, suspended, trial
  ownerUserId: uuid("owner_user_id").references(() => users.id, { onDelete: "restrict" }).notNull(),
  // Contact Information
  contactEmail: text("contact_email").notNull(),
  billingEmail: text("billing_email").notNull(), 
  contactPhone: text("contact_phone"),
  address: text("address"),
  website: text("website"),
  // Subscription and Limits
  maxUsers: integer("max_users").notNull().default(10),
  taxId: text("tax_id"),
  enabledFeatures: jsonb("enabled_features").default({
    readinessSurveys: true,
    gptCoach: true,
    communications: true,
    changeArtifacts: true,
    reports: true
  }), // Feature flags for this organization
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  slugIdx: index("organizations_slug_idx").on(table.slug),
  ownerIdx: index("organizations_owner_idx").on(table.ownerUserId),
}));

// Organization memberships - users belong to organizations with roles
export const organizationMemberships = pgTable("organization_memberships", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  orgRole: text("org_role").notNull().default("member"), // owner, admin, member
  isActive: boolean("is_active").notNull().default(true),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  invitedById: uuid("invited_by_id").references(() => users.id, { onDelete: "set null" }),
}, (table) => ({
  uniqueUserOrg: unique().on(table.userId, table.organizationId), // Prevent duplicate memberships
  orgUserIdx: index("org_memberships_org_user_idx").on(table.organizationId, table.userId),
  userIdx: index("org_memberships_user_idx").on(table.userId),
}));

// Subscription plans - licensing tiers with features and limits
export const plans = pgTable("plans", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(), // "Basic Plan", "Professional", etc.
  description: text("description"),
  seatLimit: integer("seat_limit").notNull(), // Maximum users per organization
  pricePerSeatCents: integer("price_per_seat_cents").notNull(), // Price per seat in cents
  features: jsonb("features").default({}), // Available features and limits (JSONB format)
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  activeIdx: index("plans_active_idx").on(table.isActive),
}));

// Organization subscriptions - billing and license tracking
export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  planId: uuid("plan_id").references(() => plans.id, { onDelete: "restrict" }).notNull(),
  status: text("status").notNull().default("trialing"), // trialing, active, past_due, canceled, incomplete
  seatsPurchased: integer("seats_purchased").notNull().default(1), // Number of licensed seats
  trialEndsAt: timestamp("trial_ends_at"),
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  // Stripe integration fields
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id").unique(),
  stripePriceId: text("stripe_price_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("subscriptions_org_idx").on(table.organizationId),
  stripeSubIdx: index("subscriptions_stripe_sub_idx").on(table.stripeSubscriptionId),
  statusIdx: index("subscriptions_status_idx").on(table.status),
}));

// Organization invitations - manage pending user invitations
export const invitations = pgTable("invitations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  email: text("email").notNull(),
  orgRole: text("org_role").notNull().default("member"), // owner, admin, member
  status: text("status").notNull().default("pending"), // pending, accepted, expired, cancelled
  invitedById: uuid("invited_by_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  acceptedAt: timestamp("accepted_at"),
  expiresAt: timestamp("expires_at").notNull(), // 7 days from creation
  token: text("token").notNull().unique(), // Secure invitation token
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  orgEmailIdx: index("invitations_org_email_idx").on(table.organizationId, table.email),
  tokenIdx: index("invitations_token_idx").on(table.token),
  statusIdx: index("invitations_status_idx").on(table.status),
  expiresIdx: index("invitations_expires_idx").on(table.expiresAt),
}));

// Organization settings - custom configuration and branding
export const organizationSettings = pgTable("organization_settings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull().unique(),
  // Branding and customization
  logoUrl: text("logo_url"),
  primaryColor: text("primary_color").default("#3b82f6"),
  secondaryColor: text("secondary_color").default("#64748b"),
  customDomain: text("custom_domain"),
  timezone: text("timezone").default("UTC"),
  dateFormat: text("date_format").default("MM/dd/yyyy"),
  // Feature toggles and limits
  enabledFeatures: jsonb("enabled_features").default({}), // Feature flags
  customLimits: jsonb("custom_limits").default({}), // Custom package limits
  // Custom fields and configurations
  customFields: jsonb("custom_fields").default([]), // Custom form fields
  integrationSettings: jsonb("integration_settings").default({}), // External integrations config
  // Billing and subscription preferences
  invoicePrefix: text("invoice_prefix"),
  billingEmail: text("billing_email"),
  taxId: text("tax_id"),
  billingAddress: jsonb("billing_address").default({}),
  // Consultation and setup tracking
  isConsultationComplete: boolean("is_consultation_complete").default(false),
  consultationNotes: text("consultation_notes"),
  setupProgress: jsonb("setup_progress").default({}), // Track setup completion
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("org_settings_org_idx").on(table.organizationId),
}));

// Custom consultation workflows - post-consultation user setup
export const consultationWorkflows = pgTable("consultation_workflows", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  consultantId: uuid("consultant_id").references(() => users.id, { onDelete: "set null" }),
  // Consultation details
  consultationType: text("consultation_type").notNull(), // initial, follow_up, package_review
  status: text("status").notNull().default("scheduled"), // scheduled, in_progress, completed, cancelled
  scheduledAt: timestamp("scheduled_at"),
  completedAt: timestamp("completed_at"),
  duration: integer("duration"), // Duration in minutes
  // Custom package configuration
  recommendedPlanId: uuid("recommended_plan_id").references(() => plans.id),
  customFeatures: jsonb("custom_features").default({}), // Recommended custom features
  customLimits: jsonb("custom_limits").default({}), // Recommended custom limits
  // User setup and training
  setupTasks: jsonb("setup_tasks").default([]), // Array of setup tasks
  trainingModules: jsonb("training_modules").default([]), // Recommended training
  followUpDate: timestamp("follow_up_date"),
  // Notes and documentation
  consultationNotes: text("consultation_notes"),
  userRequirements: text("user_requirements"),
  businessObjectives: text("business_objectives"),
  successMetrics: text("success_metrics"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  orgUserIdx: index("consultation_workflows_org_user_idx").on(table.organizationId, table.userId),
  statusIdx: index("consultation_workflows_status_idx").on(table.status),
  consultantIdx: index("consultation_workflows_consultant_idx").on(table.consultantId),
}));

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "cascade" }), // Nullable for migration
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").notNull().default("identify_need"), // identify_need, identify_stakeholders, develop_change, implement_change, reinforce_change
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
  role: text("role").notNull(), // Initiative-specific role: "Change Owner", "Change Champion", "Change Agent", "Member", "Observer"
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
  assignedById: uuid("assigned_by_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
}, (table) => ({
  uniqueUserProject: unique().on(table.userId, table.projectId), // Prevent duplicate assignments
}));

export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "cascade" }), // Nullable for migration
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
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "cascade" }), // Nullable for migration
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
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "cascade" }), // Nullable for migration
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
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "cascade" }), // Nullable for migration
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
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "cascade" }), // Nullable for migration
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
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "cascade" }), // Nullable for migration
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

// Change Artifacts - Document Repository Management
export const changeArtifacts = pgTable("change_artifacts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "cascade" }), // Nullable for migration
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  filename: text("filename").notNull(), // System filename (unique)
  originalFilename: text("original_filename").notNull(), // User's original filename
  fileSize: integer("file_size").notNull(), // File size in bytes
  contentType: text("content_type").notNull(), // File MIME type (application/pdf, image/png, etc.)
  filePath: text("file_path").notNull(), // Storage path/URL
  objectPath: text("object_path").notNull(), // Object storage path
  description: text("description"), // User-provided description
  tags: text("tags").array().default([]), // Searchable tags
  category: text("category").default("general"), // document, image, template, presentation, other
  versionNumber: integer("version_number").default(1), // Version tracking
  isActive: boolean("is_active").default(true), // Soft delete capability
  accessCount: integer("access_count").default(0), // Usage tracking
  lastAccessedAt: timestamp("last_accessed_at"), // Last download/view time
  uploadedById: uuid("uploaded_by_id").references(() => users.id, { onDelete: "restrict" }).notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  isPublic: boolean("is_public").default(false),
  metadata: jsonb("metadata").default({}), // Extended metadata (upload client, processing info, etc.)
}, (table) => ({
  // Performance indexes for artifact queries
  projectIdIdx: index("change_artifacts_project_id_idx").on(table.projectId),
  categoryIdx: index("change_artifacts_category_idx").on(table.category),
  uploadedByIdx: index("change_artifacts_uploaded_by_idx").on(table.uploadedById),
  uploadedAtIdx: index("change_artifacts_uploaded_at_idx").on(table.uploadedAt),
  // Composite indexes for common queries
  projectCategoryIdx: index("change_artifacts_project_category_idx").on(table.projectId, table.category),
  projectActiveIdx: index("change_artifacts_project_active_idx").on(table.projectId, table.isActive),
  // GIN index for tag searches
  tagsIdx: index("change_artifacts_tags_gin_idx").using("gin", table.tags),
  // Text search indexes
  filenameTextIdx: index("change_artifacts_filename_trgm_idx").using("gin", sql`${table.originalFilename} gin_trgm_ops`),
  descriptionTextIdx: index("change_artifacts_description_trgm_idx").using("gin", sql`${table.description} gin_trgm_ops`),
}));

// Change Artifacts Relations
export const changeArtifactsRelations = relations(changeArtifacts, ({ one }) => ({
  project: one(projects, {
    fields: [changeArtifacts.projectId],
    references: [projects.id],
  }),
  uploadedBy: one(users, {
    fields: [changeArtifacts.uploadedById],
    references: [users.id],
  }),
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
  // Change Artifacts Relations
  uploadedArtifacts: many(changeArtifacts),
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
  // Change Artifacts Relations
  changeArtifacts: many(changeArtifacts),
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
  lastLoginAt: true,
  isEmailVerified: true, // Handled during verification process
}).extend({
  password: z.string().min(8, "Password must be at least 8 characters long").optional(), // Optional for email verification flow
  confirmPassword: z.string().optional(), // Password confirmation
  roleId: z.string().uuid("Role ID must be a valid UUID"), // Ensure roleId is required and valid
  email: z.string().email("Must be a valid email address"), // Email validation
}).refine((data) => {
  // If password is provided, confirmPassword must match (only validate when both exist)
  if (data.password && data.confirmPassword && data.password !== data.confirmPassword) {
    return false;
  }
  return true;
}, {
  message: "Passwords must match",
  path: ["confirmPassword"],
});

// Email verification token schemas
export const insertEmailVerificationTokenSchema = createInsertSchema(emailVerificationTokens).omit({
  id: true,
  createdAt: true,
}).extend({
  email: z.string().email("Must be a valid email address"),
  token: z.string().min(32, "Token must be at least 32 characters"),
  expiresAt: z.date(),
});

export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({
  id: true,
  createdAt: true,
}).extend({
  userId: z.string().uuid("User ID must be a valid UUID"),
  token: z.string().min(32, "Token must be at least 32 characters"),
  expiresAt: z.date(),
});

// Registration request schema (for initial signup)
export const registrationRequestSchema = z.object({
  email: z.string().email("Must be a valid email address"),
  name: z.string().min(1, "Name is required"),
  username: z.string().min(3, "Username must be at least 3 characters").regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
});

// Email verification response schema (for setting password after email verification)
export const emailVerificationResponseSchema = z.object({
  token: z.string().min(32, "Invalid token"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords must match",
  path: ["confirmPassword"],
});

export const insertUserInitiativeAssignmentSchema = createInsertSchema(userInitiativeAssignments).omit({
  id: true,
  assignedAt: true,
}).extend({
  role: z.enum(["Change Owner", "Change Champion", "Change Agent", "Member", "Observer"])
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  // Transform number budget from frontend to string for database decimal field
  budget: z.union([z.string(), z.number()]).transform(val => 
    typeof val === 'number' ? val.toString() : val
  ).optional()
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
}).extend({
  // Handle date string coercion for meetingWhen field
  meetingWhen: z.union([
    z.date(),
    z.string().transform((str) => new Date(str))
  ]).optional()
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

// Change Artifacts Insert Schema
export const insertChangeArtifactSchema = createInsertSchema(changeArtifacts).omit({
  id: true,
  uploadedAt: true,
}).extend({
  category: z.enum(['document', 'image', 'template', 'presentation', 'other']).default('document'),
  accessLevel: z.enum(['project', 'public', 'restricted']).default('project'),
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

// Organizational Management Insert Schemas
export const insertOrganizationSchema = createInsertSchema(organizations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOrganizationMembershipSchema = createInsertSchema(organizationMemberships).omit({
  id: true,
  joinedAt: true,
});

export const insertPlanSchema = createInsertSchema(plans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInvitationSchema = createInsertSchema(invitations).omit({
  id: true,
  createdAt: true,
});

export const insertOrganizationSettingsSchema = createInsertSchema(organizationSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertConsultationWorkflowSchema = createInsertSchema(consultationWorkflows).omit({
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

// Change Artifacts Types
export type ChangeArtifact = typeof changeArtifacts.$inferSelect;
export type InsertChangeArtifact = z.infer<typeof insertChangeArtifactSchema>;

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

// Organizational Management Types
export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;

export type OrganizationMembership = typeof organizationMemberships.$inferSelect;
export type InsertOrganizationMembership = z.infer<typeof insertOrganizationMembershipSchema>;

export type Plan = typeof plans.$inferSelect;
export type InsertPlan = z.infer<typeof insertPlanSchema>;

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;

export type Invitation = typeof invitations.$inferSelect;
export type InsertInvitation = z.infer<typeof insertInvitationSchema>;

export type OrganizationSettings = typeof organizationSettings.$inferSelect;
export type InsertOrganizationSettings = z.infer<typeof insertOrganizationSettingsSchema>;

export type ConsultationWorkflow = typeof consultationWorkflows.$inferSelect;
export type InsertConsultationWorkflow = z.infer<typeof insertConsultationWorkflowSchema>;

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

// Email verification and password reset types
export type EmailVerificationToken = typeof emailVerificationTokens.$inferSelect;
export type InsertEmailVerificationToken = z.infer<typeof insertEmailVerificationTokenSchema>;

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;

// Authentication request types
export type RegistrationRequest = z.infer<typeof registrationRequestSchema>;
export type EmailVerificationResponse = z.infer<typeof emailVerificationResponseSchema>;

// ===============================================
// HELPDESK GPT AGENT SYSTEM
// ===============================================

// Support Tickets - for escalations to super admin
export const supportTickets = pgTable("support_tickets", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(), // Issue summary
  description: text("description").notNull(), // Detailed issue description
  category: text("category").notNull(), // permissions, technical, feature_request, bug
  priority: text("priority").notNull().default("medium"), // low, medium, high, urgent
  status: text("status").notNull().default("open"), // open, in_progress, resolved, closed
  
  // Context data for troubleshooting
  userContext: jsonb("user_context").default({}), // User role, permissions, current page
  systemContext: jsonb("system_context").default({}), // Error logs, API responses, system state
  conversationHistory: jsonb("conversation_history").default([]), // GPT conversation that led to escalation
  
  // Assignment and resolution
  assignedToSuperAdmin: uuid("assigned_to_super_admin").references(() => superAdminUsers.id, { onDelete: "set null" }),
  resolvedAt: timestamp("resolved_at"),
  resolutionNotes: text("resolution_notes"),
  
  // Email/notification tracking
  emailSent: boolean("email_sent").notNull().default(false),
  emailSentAt: timestamp("email_sent_at"),
  notificationsSent: jsonb("notifications_sent").default([]), // Array of notification IDs
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("support_tickets_org_idx").on(table.organizationId),
  userIdx: index("support_tickets_user_idx").on(table.userId),
  statusIdx: index("support_tickets_status_idx").on(table.status),
  priorityIdx: index("support_tickets_priority_idx").on(table.priority),
  assignedIdx: index("support_tickets_assigned_idx").on(table.assignedToSuperAdmin),
}));

// Support Conversations - chat history with GPT agent
export const supportConversations = pgTable("support_conversations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  
  // Conversation metadata
  sessionId: text("session_id").notNull(), // Unique session ID for grouping messages
  isActive: boolean("is_active").notNull().default(true), // Is conversation still ongoing?
  
  // Context at conversation start
  initialContext: jsonb("initial_context").default({}), // User state when conversation began
  currentPage: text("current_page"), // Page user was on when starting conversation
  userAgent: text("user_agent"), // Browser info for debugging context
  
  // Conversation content
  messages: jsonb("messages").default([]), // Array of message objects {role, content, timestamp}
  issueResolved: boolean("issue_resolved").notNull().default(false),
  satisfactionRating: integer("satisfaction_rating"), // 1-5 rating if provided
  
  // Escalation tracking
  escalatedToTicket: uuid("escalated_to_ticket").references(() => supportTickets.id, { onDelete: "set null" }),
  escalatedAt: timestamp("escalated_at"),
  
  // Analytics and improvement
  conversationDuration: integer("conversation_duration"), // Minutes of conversation
  messagesCount: integer("messages_count").notNull().default(0),
  issueCategory: text("issue_category"), // Detected by GPT: permissions, navigation, data, etc.
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("support_conversations_org_idx").on(table.organizationId),
  userIdx: index("support_conversations_user_idx").on(table.userId),
  sessionIdx: index("support_conversations_session_idx").on(table.sessionId),
  activeIdx: index("support_conversations_active_idx").on(table.isActive),
  resolvedIdx: index("support_conversations_resolved_idx").on(table.issueResolved),
  escalatedIdx: index("support_conversations_escalated_idx").on(table.escalatedToTicket),
}));

// Helpdesk Insert Schemas
export const insertSupportTicketSchema = createInsertSchema(supportTickets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  emailSentAt: true,
  resolvedAt: true,
});

export const insertSupportConversationSchema = createInsertSchema(supportConversations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  escalatedAt: true,
});

// Helpdesk Types
export type SupportTicket = typeof supportTickets.$inferSelect;
export type InsertSupportTicket = z.infer<typeof insertSupportTicketSchema>;

export type SupportConversation = typeof supportConversations.$inferSelect;
export type InsertSupportConversation = z.infer<typeof insertSupportConversationSchema>;

// GPT Message type for conversation history
export const gptMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  timestamp: z.string().datetime(),
  messageId: z.string().optional(), // Unique ID for each message
});

export type GPTMessage = z.infer<typeof gptMessageSchema>;

// ===============================================
// SUPER ADMIN SYSTEM - Platform Management
// ===============================================

// Super Admin Users - completely separate from tenant users
export const superAdminUsers = pgTable("super_admin_users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("admin"), // admin, super_admin, platform_manager
  isActive: boolean("is_active").notNull().default(true),
  // MFA (Multi-Factor Authentication) fields
  mfaEnabled: boolean("mfa_enabled").notNull().default(false),
  totpSecret: text("totp_secret"), // Encrypted TOTP secret for authenticator apps
  backupCodes: text("backup_codes").array(), // Array of hashed backup codes for recovery
  mfaEnrolledAt: timestamp("mfa_enrolled_at"), // When MFA was first enabled
  lastMfaUsedAt: timestamp("last_mfa_used_at"), // Last time MFA was successfully used
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  usernameIdx: index("super_admin_users_username_idx").on(table.username),
  emailIdx: index("super_admin_users_email_idx").on(table.email),
  mfaEnabledIdx: index("super_admin_users_mfa_enabled_idx").on(table.mfaEnabled),
}));

// Super Admin Sessions - separate session management
export const superAdminSessions = pgTable("super_admin_sessions", {
  id: text("id").primaryKey(), // Session ID
  superAdminUserId: uuid("super_admin_user_id").references(() => superAdminUsers.id, { onDelete: "cascade" }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIdx: index("super_admin_sessions_user_idx").on(table.superAdminUserId),
  expiresIdx: index("super_admin_sessions_expires_idx").on(table.expiresAt),
}));

// Super Admin MFA Setup - temporary storage during MFA enrollment
export const superAdminMfaSetup = pgTable("super_admin_mfa_setup", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  superAdminUserId: uuid("super_admin_user_id").references(() => superAdminUsers.id, { onDelete: "cascade" }).notNull().unique(),
  tempTotpSecret: text("temp_totp_secret").notNull(), // Temporary TOTP secret during setup
  backupCodes: text("backup_codes").array().notNull(), // Generated backup codes for download
  qrCodeDataUrl: text("qr_code_data_url").notNull(), // QR code data URL for easy setup
  expiresAt: timestamp("expires_at").notNull(), // Setup expires in 10 minutes
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIdx: index("super_admin_mfa_setup_user_idx").on(table.superAdminUserId),
  expiresIdx: index("super_admin_mfa_setup_expires_idx").on(table.expiresAt),
}));

// Super Admin Insert Schemas
export const insertSuperAdminUserSchema = createInsertSchema(superAdminUsers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastLoginAt: true,
  mfaEnrolledAt: true,
  lastMfaUsedAt: true,
});

export const insertSuperAdminMfaSetupSchema = createInsertSchema(superAdminMfaSetup).omit({
  id: true,
  createdAt: true,
});

export const insertSuperAdminSessionSchema = createInsertSchema(superAdminSessions).omit({
  createdAt: true,
});

// Super Admin Types
export type SuperAdminUser = typeof superAdminUsers.$inferSelect;
export type InsertSuperAdminUser = z.infer<typeof insertSuperAdminUserSchema>;

export type SuperAdminSession = typeof superAdminSessions.$inferSelect;
export type InsertSuperAdminSession = z.infer<typeof insertSuperAdminSessionSchema>;

export type SuperAdminMfaSetup = typeof superAdminMfaSetup.$inferSelect;
export type InsertSuperAdminMfaSetup = z.infer<typeof insertSuperAdminMfaSetupSchema>;

// Super Admin authentication schemas
export const superAdminLoginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

// MFA verification schema
export const superAdminMfaVerifySchema = z.object({
  sessionId: z.string().min(1, "Session ID is required"),
  totpCode: z.string().regex(/^\d{6}$/, "TOTP code must be 6 digits").optional(),
  backupCode: z.string().min(8, "Backup code must be at least 8 characters").optional(),
}).refine(data => data.totpCode || data.backupCode, {
  message: "Either TOTP code or backup code is required",
});

// MFA setup completion schema
export const superAdminMfaSetupCompleteSchema = z.object({
  setupId: z.string().min(1, "Setup ID is required"),
  totpCode: z.string().regex(/^\d{6}$/, "TOTP code must be 6 digits"),
});

export const superAdminRegistrationSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Valid email is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required"),
  role: z.enum(["admin", "super_admin", "platform_manager"]).default("admin"),
});

// Create Super Admin Schema (for admin user management)
export const createSuperAdminSchema = z.object({
  username: z.string()
    .min(3, "Username must be at least 3 characters")
    .max(50, "Username must be less than 50 characters")
    .regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, underscores, and hyphens"),
  password: z.string()
    .min(12, "Password must be at least 12 characters")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/, 
      "Password must contain uppercase, lowercase, number, and special character"),
});

export type SuperAdminLoginRequest = z.infer<typeof superAdminLoginSchema>;
export type SuperAdminRegistrationRequest = z.infer<typeof superAdminRegistrationSchema>;
export type CreateSuperAdminRequest = z.infer<typeof createSuperAdminSchema>;

// AI Coach Context Types for context-aware responses
export const coachContextPageSchema = z.enum([
  "dashboard",
  "projects", 
  "tasks",
  "stakeholders",
  "raid-logs", 
  "communications",
  "surveys",
  "gpt-coach",
  "gantt",
  "process-mapping"
]);

export const coachContextSelectionsSchema = z.object({
  stakeholderId: z.string().optional(),
  raidLogId: z.string().optional(), 
  taskId: z.string().optional(),
  surveyId: z.string().optional(),
  communicationId: z.string().optional(),
  processMapId: z.string().optional(),
});

export const coachContextSnapshotSchema = z.object({
  // Project summary (aligned with projects.currentPhase)
  currentPhase: z.string().optional(),
  projectObjectives: z.string().optional(),
  
  // Key insights (limited to top items)
  topRisks: z.array(z.object({
    id: z.string(),
    title: z.string(),
    severity: z.enum(["low", "medium", "high", "critical"]),
    category: z.enum(["risk", "assumption", "issue", "dependency"]),
  })).max(5).optional(),
  
  stakeholderSummary: z.object({
    totalCount: z.number(),
    resistantCount: z.number(),
    supportiveCount: z.number(),
    highInfluenceCount: z.number(),
  }).optional(),
  
  upcomingMilestones: z.array(z.object({
    title: z.string(),
    dueDate: z.string(), // ISO 8601 format
    status: z.string(),
  })).max(3).optional(),
  
  latestSurveyPulse: z.object({
    readinessScore: z.number(),
    responseCount: z.number(),
    sentiment: z.enum(["positive", "neutral", "negative"]),
  }).optional(),
  
  taskSummary: z.object({
    totalCount: z.number(),
    completedCount: z.number(),
    overdueCount: z.number(),
  }).optional(),
});

export const coachContextPayloadSchema = z.object({
  // Current location
  pathname: z.string(),
  pageName: coachContextPageSchema,
  
  // User and tenant context
  userId: z.string().optional(),
  currentOrganizationId: z.string().optional(),
  currentProjectId: z.string().optional(),
  currentProjectName: z.string().optional(),
  userRole: z.string().optional(),
  
  // Page-specific selections
  selections: coachContextSelectionsSchema.optional(),
  
  // Relevant data snapshot
  snapshot: coachContextSnapshotSchema.optional(),
}).refine(data => {
  // Keep payload size reasonable (~4KB limit)
  const serialized = JSON.stringify(data);
  return serialized.length < 4096;
}, "Context payload too large");

export type CoachContextPage = z.infer<typeof coachContextPageSchema>;
export type CoachContextSelections = z.infer<typeof coachContextSelectionsSchema>; 
export type CoachContextSnapshot = z.infer<typeof coachContextSnapshotSchema>;
export type CoachContextPayload = z.infer<typeof coachContextPayloadSchema>;

// Super Admin System Settings validation schemas
export const systemSettingsUpdateSchema = z.object({
  globalFeatures: z.object({
    maintenanceMode: z.boolean().optional(),
    newUserRegistration: z.boolean().optional(),
    emailNotifications: z.boolean().optional(),
    gptServices: z.boolean().optional(),
    fileUploads: z.boolean().optional(),
    reports: z.boolean().optional(),
  }).optional(),
  security: z.object({
    passwordMinLength: z.number().min(6).max(32).optional(),
    passwordRequireSpecialChars: z.boolean().optional(),
    sessionTimeoutMinutes: z.number().min(15).max(1440).optional(),
    maxLoginAttempts: z.number().min(3).max(10).optional(),
    twoFactorRequired: z.boolean().optional(),
    ipWhitelist: z.array(z.string()).optional(),
  }).optional(),
  email: z.object({
    fromName: z.string().min(1).max(100).optional(),
    fromEmail: z.string().email().optional(),
    replyToEmail: z.string().email().optional(),
    supportEmail: z.string().email().optional(),
    enableWelcomeEmails: z.boolean().optional(),
    enableNotifications: z.boolean().optional(),
  }).optional(),
  limits: z.object({
    maxOrgsPerPlan: z.number().min(1).max(1000).optional(),
    maxUsersPerOrg: z.number().min(1).max(10000).optional(),
    maxProjectsPerOrg: z.number().min(1).max(1000).optional(),
    maxFileUploadSizeMB: z.number().min(1).max(100).optional(),
    apiRateLimit: z.number().min(10).max(10000).optional(),
    sessionTimeoutHours: z.number().min(1).max(24).optional(),
  }).optional(),
  maintenance: z.object({
    isMaintenanceMode: z.boolean().optional(),
    maintenanceMessage: z.string().max(500).optional(),
    plannedDowntimeStart: z.string().optional(),
    plannedDowntimeEnd: z.string().optional(),
    allowedIps: z.array(z.string()).optional(),
  }).optional(),
});

export const maintenanceToggleSchema = z.object({
  enabled: z.boolean(),
  message: z.string().max(500).optional(),
});

export const analyticsRangeSchema = z.object({
  range: z.enum(['1d', '7d', '30d', '90d']).default('7d'),
});

// Support Session Management - tracks when super admins are impersonating organizations
export const supportSessions = pgTable("support_sessions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  superAdminUserId: uuid("super_admin_user_id").references(() => superAdminUsers.id, { onDelete: "cascade" }).notNull(),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  sessionType: text("session_type").notNull().default("read_only"), // read_only, support_mode
  isActive: boolean("is_active").notNull().default(true),
  reason: text("reason"), // Why this session was created (ticket number, escalation reason, etc.)
  startedAt: timestamp("started_at").defaultNow().notNull(),
  endedAt: timestamp("ended_at"),
  expiresAt: timestamp("expires_at").notNull(), // Auto-expire sessions for security
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  superAdminIdx: index("support_sessions_super_admin_idx").on(table.superAdminUserId),
  organizationIdx: index("support_sessions_organization_idx").on(table.organizationId),
  activeSessionsIdx: index("support_sessions_active_idx").on(table.isActive, table.organizationId),
  expiryIdx: index("support_sessions_expiry_idx").on(table.expiresAt),
}));

// Support Audit Logs - comprehensive logging of all support actions
export const supportAuditLogs = pgTable("support_audit_logs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: uuid("session_id").references(() => supportSessions.id, { onDelete: "cascade" }),
  superAdminUserId: uuid("super_admin_user_id").references(() => superAdminUsers.id, { onDelete: "cascade" }).notNull(),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  action: text("action").notNull(), // page_view, data_access, setting_change, user_action, etc.
  resource: text("resource"), // The specific resource accessed (users, projects, settings, etc.)
  resourceId: text("resource_id"), // ID of the specific resource if applicable
  description: text("description").notNull(), // Human readable description of what happened
  details: jsonb("details"), // Additional structured data about the action
  accessLevel: text("access_level").notNull().default("read"), // read, write, admin
  isCustomerVisible: boolean("is_customer_visible").notNull().default(true), // Whether customer can see this log entry
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  sessionIdx: index("support_audit_logs_session_idx").on(table.sessionId),
  superAdminIdx: index("support_audit_logs_super_admin_idx").on(table.superAdminUserId),
  organizationIdx: index("support_audit_logs_organization_idx").on(table.organizationId),
  customerVisibleIdx: index("support_audit_logs_customer_visible_idx").on(table.isCustomerVisible, table.organizationId),
  createdAtIdx: index("support_audit_logs_created_at_idx").on(table.createdAt),
}));

// Support system types
export type SupportSession = typeof supportSessions.$inferSelect;
export type SupportAuditLog = typeof supportAuditLogs.$inferSelect;

// Support session insert schemas with Zod validation
export const insertSupportSessionSchema = createInsertSchema(supportSessions, {
  expiresAt: z.string().datetime(), // ISO datetime string
  reason: z.string().min(10).max(500).optional(),
  sessionType: z.enum(["read_only", "support_mode"]).default("read_only"),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const insertSupportAuditLogSchema = createInsertSchema(supportAuditLogs, {
  description: z.string().min(5).max(1000),
  action: z.string().min(2).max(100),
  accessLevel: z.enum(["read", "write", "admin"]).default("read"),
}).omit({ id: true, createdAt: true });

export type InsertSupportSession = z.infer<typeof insertSupportSessionSchema>;
export type InsertSupportAuditLog = z.infer<typeof insertSupportAuditLogSchema>;

export type SystemSettingsUpdate = z.infer<typeof systemSettingsUpdateSchema>;
export type MaintenanceToggle = z.infer<typeof maintenanceToggleSchema>;
export type AnalyticsRange = z.infer<typeof analyticsRangeSchema>;
