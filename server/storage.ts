import bcrypt from 'bcrypt';
import { 
  users, projects, tasks, stakeholders, raidLogs, communications, communicationVersions, surveys, surveyResponses, gptInteractions, milestones, checklistTemplates, processMaps, roles, userInitiativeAssignments,
  userGroups, userGroupMemberships, userPermissions, communicationStrategy, communicationTemplates,
  type User, type UserWithPassword, type InsertUser, type Project, type InsertProject, type Task, type InsertTask,
  type Stakeholder, type InsertStakeholder, type RaidLog, type InsertRaidLog,
  type Communication, type InsertCommunication, type CommunicationVersion, type InsertCommunicationVersion, type Survey, type InsertSurvey,
  type SurveyResponse, type InsertSurveyResponse, type GptInteraction, type InsertGptInteraction,
  type Milestone, type InsertMilestone, type ChecklistTemplate, type InsertChecklistTemplate,
  type ProcessMap, type InsertProcessMap, type CommunicationStrategy, type InsertCommunicationStrategy,
  type CommunicationTemplate, type InsertCommunicationTemplate,
  type Role, type InsertRole, type UserInitiativeAssignment, type InsertUserInitiativeAssignment,
  type Permissions, type UserGroup, type InsertUserGroup, type UserGroupMembership, 
  type InsertUserGroupMembership, type UserPermission, type InsertUserPermission
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, count, isNull, inArray } from "drizzle-orm";

const SALT_ROUNDS = 12;

export interface IStorage {
  // Roles
  getRoles(): Promise<Role[]>;
  getRole(id: string): Promise<Role | undefined>;
  createRole(role: InsertRole): Promise<Role>;
  updateRole(id: string, role: Partial<InsertRole>): Promise<Role | undefined>;
  deleteRole(id: string): Promise<boolean>;
  
  // Users
  getUsers(): Promise<User[]>;
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<Omit<InsertUser, 'password'> & { passwordHash?: string }>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;
  verifyPassword(username: string, password: string): Promise<User | null>;

  // Projects
  getProjects(userId: string): Promise<Project[]>;
  getProject(id: string): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, project: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: string): Promise<boolean>;
  
  // SECURITY: Authorization helpers for BOLA prevention
  getUserAuthorizedProjectIds(userId: string): Promise<string[]>;
  validateUserProjectAccess(userId: string, projectIds: string[]): Promise<string[]>;

  // Tasks
  getTasksByProject(projectId: string): Promise<Task[]>;
  getTask(id: string): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, task: Partial<InsertTask>): Promise<Task | undefined>;
  deleteTask(id: string): Promise<boolean>;

  // Stakeholders
  getStakeholdersByProject(projectId: string): Promise<Stakeholder[]>;
  getStakeholder(id: string): Promise<Stakeholder | undefined>;
  createStakeholder(stakeholder: InsertStakeholder): Promise<Stakeholder>;
  updateStakeholder(id: string, stakeholder: Partial<InsertStakeholder>): Promise<Stakeholder | undefined>;
  deleteStakeholder(id: string): Promise<boolean>;
  importStakeholders(targetProjectId: string, sourceProjectId: string, stakeholderIds: string[]): Promise<{ imported: number; skipped: number }>;

  // RAID Logs
  getRaidLogsByProject(projectId: string): Promise<RaidLog[]>;
  getRaidLog(id: string): Promise<RaidLog | undefined>;
  createRaidLog(raidLog: InsertRaidLog): Promise<RaidLog>;
  updateRaidLog(id: string, raidLog: Partial<InsertRaidLog>): Promise<RaidLog | undefined>;
  deleteRaidLog(id: string): Promise<boolean>;

  // Communications
  getCommunicationsByProject(projectId: string): Promise<Communication[]>;
  getCommunication(id: string): Promise<Communication | undefined>;
  createCommunication(communication: InsertCommunication): Promise<Communication>;
  updateCommunication(id: string, communication: Partial<InsertCommunication>): Promise<Communication | undefined>;
  deleteCommunication(id: string): Promise<boolean>;

  // Repository-specific methods
  searchCommunications(params: {
    query?: string;
    projectIds?: string[];
    types?: string[];
    statuses?: string[];
    tags?: string[];
    dateFrom?: Date;
    dateTo?: Date;
    createdBy?: string[];
    limit?: number;
    offset?: number;
    sortBy?: 'createdAt' | 'updatedAt' | 'title' | 'engagementScore' | 'effectivenessRating';
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ communications: Communication[]; total: number; }>;
  getCommunicationMetrics(params: { 
    projectId?: string; 
    type?: string; 
    authorizedProjectIds?: string[];
  }): Promise<{
    totalCommunications: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
    avgEngagementScore: number;
    avgEffectivenessRating: number;
    mostUsedTags: Array<{ tag: string; count: number }>;
  }>;
  getCommunicationVersionHistory(communicationId: string, authorizedProjectIds: string[]): Promise<CommunicationVersion[]>;
  archiveCommunications(ids: string[], userId: string): Promise<{ archived: number; errors: string[] }>;
  updateCommunicationEngagement(id: string, engagement: { viewCount?: number; shareCount?: number; lastViewedAt?: Date }): Promise<void>;
  getCommunicationsByStakeholder(stakeholderId: string, projectId?: string): Promise<Communication[]>;

  // Communication Strategies
  getCommunicationStrategiesByProject(projectId: string): Promise<CommunicationStrategy[]>;
  getCommunicationStrategy(id: string): Promise<CommunicationStrategy | undefined>;
  getCommunicationStrategyByPhase(projectId: string, phase: string): Promise<CommunicationStrategy | undefined>;
  createCommunicationStrategy(strategy: InsertCommunicationStrategy): Promise<CommunicationStrategy>;
  updateCommunicationStrategy(id: string, strategy: Partial<InsertCommunicationStrategy>): Promise<CommunicationStrategy | undefined>;
  deleteCommunicationStrategy(id: string): Promise<boolean>;

  // Communication Templates
  getCommunicationTemplates(): Promise<CommunicationTemplate[]>;
  getCommunicationTemplatesByCategory(category: string): Promise<CommunicationTemplate[]>;
  getActiveCommunicationTemplates(): Promise<CommunicationTemplate[]>;
  getCommunicationTemplate(id: string): Promise<CommunicationTemplate | undefined>;
  createCommunicationTemplate(template: InsertCommunicationTemplate): Promise<CommunicationTemplate>;
  updateCommunicationTemplate(id: string, template: Partial<InsertCommunicationTemplate>): Promise<CommunicationTemplate | undefined>;
  deleteCommunicationTemplate(id: string): Promise<boolean>;
  incrementTemplateUsage(id: string): Promise<void>;

  // Surveys
  getSurveysByProject(projectId: string): Promise<Survey[]>;
  getSurvey(id: string): Promise<Survey | undefined>;
  createSurvey(survey: InsertSurvey): Promise<Survey>;
  updateSurvey(id: string, survey: Partial<InsertSurvey>): Promise<Survey | undefined>;
  deleteSurvey(id: string): Promise<boolean>;

  // Survey Responses
  getResponsesBySurvey(surveyId: string): Promise<SurveyResponse[]>;
  createSurveyResponse(response: InsertSurveyResponse): Promise<SurveyResponse>;

  // GPT Interactions
  getGptInteractionsByUser(userId: string): Promise<GptInteraction[]>;
  createGptInteraction(interaction: InsertGptInteraction): Promise<GptInteraction>;

  // Milestones
  getMilestonesByProject(projectId: string): Promise<Milestone[]>;
  getMilestone(id: string): Promise<Milestone | undefined>;
  createMilestone(milestone: InsertMilestone): Promise<Milestone>;
  updateMilestone(id: string, milestone: Partial<InsertMilestone>): Promise<Milestone | undefined>;
  deleteMilestone(id: string): Promise<boolean>;

  // Checklist Templates
  getChecklistTemplates(): Promise<ChecklistTemplate[]>;
  getChecklistTemplatesByCategory(category: string): Promise<ChecklistTemplate[]>;
  getActiveChecklistTemplates(): Promise<ChecklistTemplate[]>;
  getChecklistTemplate(id: string): Promise<ChecklistTemplate | undefined>;
  createChecklistTemplate(template: InsertChecklistTemplate): Promise<ChecklistTemplate>;
  updateChecklistTemplate(id: string, template: Partial<InsertChecklistTemplate>): Promise<ChecklistTemplate | undefined>;
  deleteChecklistTemplate(id: string): Promise<boolean>;


  // Process Maps
  getProcessMapsByProject(projectId: string): Promise<ProcessMap[]>;
  getProcessMap(id: string): Promise<ProcessMap | undefined>;
  createProcessMap(processMap: InsertProcessMap): Promise<ProcessMap>;
  updateProcessMap(id: string, processMap: Partial<InsertProcessMap>): Promise<ProcessMap | undefined>;
  deleteProcessMap(id: string): Promise<boolean>;

  // Dashboard Analytics
  getDashboardStats(userId: string): Promise<{
    activeProjects: number;
    totalTasks: number;
    completedTasks: number;
    openRisks: number;
    openIssues: number;
    stakeholderEngagement: number;
    changeReadiness: number;
  }>;

  // User-Initiative Assignments
  getUserInitiativeAssignments(userId: string): Promise<UserInitiativeAssignment[]>;
  getInitiativeAssignments(projectId: string): Promise<UserInitiativeAssignment[]>;
  assignUserToInitiative(assignment: InsertUserInitiativeAssignment): Promise<UserInitiativeAssignment>;
  updateUserInitiativeAssignment(id: string, assignment: Partial<InsertUserInitiativeAssignment>): Promise<UserInitiativeAssignment | undefined>;
  removeUserFromInitiative(userId: string, projectId: string): Promise<boolean>;

  // Enhanced User Methods
  getUsersWithRoles(): Promise<(Omit<User, 'passwordHash'> & { role: Role })[]>;
  updateUserRole(userId: string, roleId: string): Promise<User | undefined>;
  getUsersByRole(roleId: string): Promise<User[]>;

  // Role-Based Access Methods
  getUserPermissions(userId: string): Promise<Permissions>;
  checkUserPermission(userId: string, permission: keyof Permissions): Promise<boolean>;

  // Security Management Center - User Groups
  getUserGroups(): Promise<UserGroup[]>;
  getUserGroup(id: string): Promise<UserGroup | undefined>;
  createUserGroup(group: InsertUserGroup): Promise<UserGroup>;
  updateUserGroup(id: string, group: Partial<InsertUserGroup>): Promise<UserGroup | undefined>;
  deleteUserGroup(id: string): Promise<boolean>;

  // Security Management Center - User Group Memberships
  getUserGroupMemberships(userId: string): Promise<UserGroupMembership[]>;
  getGroupMemberships(groupId: string): Promise<UserGroupMembership[]>;
  assignUserToGroup(membership: InsertUserGroupMembership): Promise<UserGroupMembership>;
  removeUserFromGroup(userId: string, groupId: string): Promise<boolean>;

  // Security Management Center - Individual User Permissions
  getUserIndividualPermissions(userId: string): Promise<UserPermission | undefined>;
  setUserIndividualPermissions(permission: InsertUserPermission): Promise<UserPermission>;
  updateUserIndividualPermissions(userId: string, permissions: Partial<InsertUserPermission>): Promise<UserPermission | undefined>;
  clearUserIndividualPermissions(userId: string): Promise<boolean>;

  // Security Management Center - Enhanced Permission Resolution
  resolveUserPermissions(userId: string): Promise<Permissions>;
  checkEnhancedUserPermission(userId: string, permission: keyof Permissions): Promise<boolean>;
  getUserSecuritySummary(userId: string): Promise<{
    rolePermissions: Permissions;
    groupPermissions: Permissions[];
    individualPermissions?: Permissions;
    resolvedPermissions: Permissions;
  }>;
}

export class DatabaseStorage implements IStorage {
  // Roles
  async getRoles(): Promise<Role[]> {
    return await db.select().from(roles).orderBy(roles.name);
  }

  async getRole(id: string): Promise<Role | undefined> {
    const [role] = await db.select().from(roles).where(eq(roles.id, id));
    return role || undefined;
  }

  async createRole(insertRole: InsertRole): Promise<Role> {
    const [role] = await db.insert(roles).values(insertRole).returning();
    return role;
  }

  async updateRole(id: string, role: Partial<InsertRole>): Promise<Role | undefined> {
    const [updated] = await db.update(roles)
      .set({ ...role, updatedAt: new Date() })
      .where(eq(roles.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteRole(id: string): Promise<boolean> {
    const result = await db.delete(roles).where(eq(roles.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }
  // Users
  async getUsers(): Promise<User[]> {
    const users_list = await db.select().from(users).orderBy(users.name);
    // Remove passwordHash from response for security
    return users_list.map(({ passwordHash, ...user }) => user as User);
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    if (!user) return undefined;
    // Remove passwordHash from response for security
    const { passwordHash, ...userWithoutHash } = user;
    return userWithoutHash as User;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    if (!user) return undefined;
    // SECURITY: Remove passwordHash from response
    const { passwordHash, ...userWithoutHash } = user;
    return userWithoutHash as User;
  }

  // SECURITY: Internal method that includes passwordHash for authentication
  private async getUserByUsernameWithPassword(username: string): Promise<UserWithPassword | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    // Hash the password before storing
    const hashedPassword = await bcrypt.hash(insertUser.password, SALT_ROUNDS);
    
    // Remove the plain password and add the hashed one
    const { password, ...userDataWithoutPassword } = insertUser;
    const userData = {
      ...userDataWithoutPassword,
      passwordHash: hashedPassword,
    };
    
    const [user] = await db.insert(users).values(userData).returning();
    // Remove passwordHash from response for security
    const { passwordHash: _, ...userWithoutHash } = user;
    return userWithoutHash as User;
  }

  async updateUser(id: string, userData: Partial<Omit<InsertUser, 'password'> & { passwordHash?: string }>): Promise<User | undefined> {
    const [updated] = await db.update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    if (!updated) return undefined;
    // Remove passwordHash from response for security
    const { passwordHash, ...userWithoutHash } = updated;
    return userWithoutHash as User;
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async verifyPassword(username: string, password: string): Promise<User | null> {
    // SECURITY: Use internal method that includes passwordHash for authentication
    const userWithPassword = await this.getUserByUsernameWithPassword(username);
    if (!userWithPassword || !userWithPassword.isActive) {
      return null;
    }
    
    const isValid = await bcrypt.compare(password, userWithPassword.passwordHash);
    if (!isValid) return null;
    
    // SECURITY: Remove passwordHash from response
    const { passwordHash, ...userWithoutHash } = userWithPassword;
    return userWithoutHash as User;
  }

  // Projects
  async getProjects(userId: string): Promise<Project[]> {
    const userProjects = await db.select().from(projects).where(eq(projects.ownerId, userId)).orderBy(desc(projects.createdAt));
    
    // Get projects where user has assignments
    const assignedProjects = await db.select({
      id: projects.id,
      name: projects.name,
      description: projects.description,
      status: projects.status,
      startDate: projects.startDate,
      endDate: projects.endDate,
      progress: projects.progress,
      ownerId: projects.ownerId,
      priority: projects.priority,
      category: projects.category,
      objectives: projects.objectives,
      scope: projects.scope,
      successCriteria: projects.successCriteria,
      budget: projects.budget,
      assumptions: projects.assumptions,
      constraints: projects.constraints,
      risks: projects.risks,
      deliverables: projects.deliverables,
      stakeholderRequirements: projects.stakeholderRequirements,
      businessJustification: projects.businessJustification,
      currentPhase: projects.currentPhase,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
    })
      .from(projects)
      .innerJoin(userInitiativeAssignments, eq(userInitiativeAssignments.projectId, projects.id))
      .where(eq(userInitiativeAssignments.userId, userId));

    // Combine and deduplicate projects
    const allProjects = [...userProjects];
    assignedProjects.forEach(assigned => {
      if (!allProjects.find(p => p.id === assigned.id)) {
        allProjects.push(assigned);
      }
    });
    
    return allProjects.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // SECURITY: Get project IDs that user has access to (CRITICAL for BOLA prevention)
  async getUserAuthorizedProjectIds(userId: string): Promise<string[]> {
    const userProjects = await db.select({ id: projects.id })
      .from(projects)
      .where(eq(projects.ownerId, userId));
    
    const assignedProjects = await db.select({ id: projects.id })
      .from(projects)
      .innerJoin(userInitiativeAssignments, eq(userInitiativeAssignments.projectId, projects.id))
      .where(eq(userInitiativeAssignments.userId, userId));

    // Combine and deduplicate project IDs
    const allProjectIds = new Set([...userProjects.map(p => p.id), ...assignedProjects.map(p => p.id)]);
    return Array.from(allProjectIds);
  }

  // SECURITY: Validate that all provided project IDs are authorized for the user
  async validateUserProjectAccess(userId: string, projectIds: string[]): Promise<string[]> {
    const authorizedProjectIds = await this.getUserAuthorizedProjectIds(userId);
    return projectIds.filter(id => authorizedProjectIds.includes(id));
  }

  async getProject(id: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project || undefined;
  }

  async createProject(project: InsertProject): Promise<Project> {
    const [created] = await db.insert(projects).values(project).returning();
    return created;
  }

  async updateProject(id: string, project: Partial<InsertProject>): Promise<Project | undefined> {
    const [updated] = await db.update(projects)
      .set({ ...project, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteProject(id: string): Promise<boolean> {
    const result = await db.delete(projects).where(eq(projects.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Tasks
  async getTasksByProject(projectId: string): Promise<Task[]> {
    return await db.select().from(tasks).where(eq(tasks.projectId, projectId)).orderBy(desc(tasks.createdAt));
  }

  async getTask(id: string): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task || undefined;
  }

  async createTask(task: InsertTask): Promise<Task> {
    const [created] = await db.insert(tasks).values(task).returning();
    return created;
  }

  async updateTask(id: string, task: Partial<InsertTask>): Promise<Task | undefined> {
    const [updated] = await db.update(tasks)
      .set({ ...task, updatedAt: new Date() })
      .where(eq(tasks.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteTask(id: string): Promise<boolean> {
    const result = await db.delete(tasks).where(eq(tasks.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Stakeholders
  async getStakeholdersByProject(projectId: string): Promise<Stakeholder[]> {
    return await db.select().from(stakeholders).where(eq(stakeholders.projectId, projectId)).orderBy(desc(stakeholders.createdAt));
  }

  async getStakeholder(id: string): Promise<Stakeholder | undefined> {
    const [stakeholder] = await db.select().from(stakeholders).where(eq(stakeholders.id, id));
    return stakeholder || undefined;
  }

  async createStakeholder(stakeholder: InsertStakeholder): Promise<Stakeholder> {
    const [created] = await db.insert(stakeholders).values(stakeholder).returning();
    return created;
  }

  async updateStakeholder(id: string, stakeholder: Partial<InsertStakeholder>): Promise<Stakeholder | undefined> {
    const [updated] = await db.update(stakeholders)
      .set({ ...stakeholder, updatedAt: new Date() })
      .where(eq(stakeholders.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteStakeholder(id: string): Promise<boolean> {
    const result = await db.delete(stakeholders).where(eq(stakeholders.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async importStakeholders(targetProjectId: string, sourceProjectId: string, stakeholderIds: string[]): Promise<{ imported: number; skipped: number }> {
    // Get the stakeholders to import
    const sourceStakeholders = await db
      .select()
      .from(stakeholders)
      .where(
        and(
          eq(stakeholders.projectId, sourceProjectId),
          inArray(stakeholders.id, stakeholderIds)
        )
      );

    // Get existing stakeholders in target project to check for duplicates (by name and role)
    const existingStakeholders = await db
      .select()
      .from(stakeholders)
      .where(eq(stakeholders.projectId, targetProjectId));

    let imported = 0;
    let skipped = 0;

    for (const stakeholder of sourceStakeholders) {
      // Check if stakeholder with same name and role already exists in target project
      const duplicate = existingStakeholders.find(
        existing => 
          existing.name.toLowerCase() === stakeholder.name.toLowerCase() && 
          existing.role.toLowerCase() === stakeholder.role.toLowerCase()
      );

      if (duplicate) {
        skipped++;
        continue;
      }

      // Create new stakeholder in target project
      const { id, projectId, createdAt, updatedAt, ...stakeholderData } = stakeholder;
      await db.insert(stakeholders).values({
        ...stakeholderData,
        projectId: targetProjectId,
      });
      
      imported++;
    }

    return { imported, skipped };
  }

  // RAID Logs
  async getRaidLogsByProject(projectId: string): Promise<RaidLog[]> {
    return await db.select().from(raidLogs).where(eq(raidLogs.projectId, projectId)).orderBy(desc(raidLogs.createdAt));
  }

  async getRaidLog(id: string): Promise<RaidLog | undefined> {
    const [raidLog] = await db.select().from(raidLogs).where(eq(raidLogs.id, id));
    return raidLog || undefined;
  }

  async createRaidLog(raidLog: InsertRaidLog): Promise<RaidLog> {
    const [created] = await db.insert(raidLogs).values(raidLog).returning();
    return created;
  }

  async updateRaidLog(id: string, raidLog: Partial<InsertRaidLog>): Promise<RaidLog | undefined> {
    const [updated] = await db.update(raidLogs)
      .set({ ...raidLog, updatedAt: new Date() })
      .where(eq(raidLogs.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteRaidLog(id: string): Promise<boolean> {
    const result = await db.delete(raidLogs).where(eq(raidLogs.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Communications
  async getCommunicationsByProject(projectId: string): Promise<Communication[]> {
    return await db.select().from(communications).where(eq(communications.projectId, projectId)).orderBy(desc(communications.createdAt));
  }

  async getCommunication(id: string): Promise<Communication | undefined> {
    const [communication] = await db.select().from(communications).where(eq(communications.id, id));
    return communication || undefined;
  }

  async createCommunication(communication: InsertCommunication): Promise<Communication> {
    const [created] = await db.insert(communications).values(communication).returning();
    return created;
  }

  async updateCommunication(id: string, communication: Partial<InsertCommunication>): Promise<Communication | undefined> {
    // Get current communication for version history
    const [current] = await db.select().from(communications).where(eq(communications.id, id));
    if (!current) return undefined;
    
    // Create version history before updating
    await db.insert(communicationVersions).values({
      communicationId: id,
      version: current.version,
      title: current.title,
      content: current.content,
      targetAudience: current.targetAudience,
      status: current.status,
      type: current.type,
      tags: current.tags,
      priority: current.priority,
      effectivenessRating: current.effectivenessRating,
      metadata: current.metadata,
      changeDescription: 'Communication updated',
      editorId: communication.createdById || current.createdById
    });
    
    // Update communication with incremented version
    const [updated] = await db.update(communications)
      .set({ 
        ...communication, 
        version: current.version + 1,
        updatedAt: new Date() 
      })
      .where(eq(communications.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteCommunication(id: string): Promise<boolean> {
    const result = await db.delete(communications).where(eq(communications.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Repository-specific methods implementation
  async searchCommunications(params: {
    query?: string;
    projectIds?: string[];
    types?: string[];
    statuses?: string[];
    tags?: string[];
    dateFrom?: Date;
    dateTo?: Date;
    createdBy?: string[];
    limit?: number;
    offset?: number;
    sortBy?: 'createdAt' | 'updatedAt' | 'title' | 'engagementScore' | 'effectivenessRating';
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ communications: Communication[]; total: number; }> {
    let query = db.select().from(communications);
    let countQuery = db.select({ count: count() }).from(communications);

    // Build WHERE conditions
    const conditions: any[] = [];
    
    if (params.query) {
      const searchTerm = `%${params.query}%`;
      conditions.push(sql`(
        ${communications.title} ILIKE ${searchTerm} OR 
        ${communications.content} ILIKE ${searchTerm}
      )`);
    }

    if (params.projectIds && params.projectIds.length > 0) {
      conditions.push(inArray(communications.projectId, params.projectIds));
    }

    if (params.types && params.types.length > 0) {
      conditions.push(inArray(communications.type, params.types));
    }

    if (params.statuses && params.statuses.length > 0) {
      conditions.push(inArray(communications.status, params.statuses));
    }

    if (params.tags && params.tags.length > 0) {
      // Check if any of the provided tags exist in the tags array
      conditions.push(sql`${communications.tags} && ${params.tags}`);
    }

    if (params.dateFrom) {
      conditions.push(sql`${communications.createdAt} >= ${params.dateFrom.toISOString()}`);
    }

    if (params.dateTo) {
      conditions.push(sql`${communications.createdAt} <= ${params.dateTo.toISOString()}`);
    }

    if (params.createdBy && params.createdBy.length > 0) {
      conditions.push(inArray(communications.createdById, params.createdBy));
    }

    // Apply conditions
    if (conditions.length > 0) {
      const whereCondition = conditions.reduce((acc, condition) => acc ? and(acc, condition) : condition);
      query = query.where(whereCondition);
      countQuery = countQuery.where(whereCondition);
    }

    // Get total count
    const [{ count: totalCount }] = await countQuery;

    // Apply sorting
    const sortField = params.sortBy || 'createdAt';
    const sortOrder = params.sortOrder || 'desc';
    
    if (sortOrder === 'asc') {
      switch (sortField) {
        case 'createdAt': query = query.orderBy(communications.createdAt); break;
        case 'updatedAt': query = query.orderBy(communications.updatedAt); break;
        case 'title': query = query.orderBy(communications.title); break;
        case 'engagementScore': query = query.orderBy(communications.engagementScore); break;
        case 'effectivenessRating': query = query.orderBy(communications.effectivenessRating); break;
      }
    } else {
      switch (sortField) {
        case 'createdAt': query = query.orderBy(desc(communications.createdAt)); break;
        case 'updatedAt': query = query.orderBy(desc(communications.updatedAt)); break;
        case 'title': query = query.orderBy(desc(communications.title)); break;
        case 'engagementScore': query = query.orderBy(desc(communications.engagementScore)); break;
        case 'effectivenessRating': query = query.orderBy(desc(communications.effectivenessRating)); break;
      }
    }

    // Apply pagination
    if (params.offset) {
      query = query.offset(params.offset);
    }
    if (params.limit) {
      query = query.limit(params.limit);
    }

    const results = await query;

    return {
      communications: results,
      total: totalCount
    };
  }

  async getCommunicationMetrics(params: { 
    projectId?: string; 
    type?: string; 
    authorizedProjectIds?: string[];
  }): Promise<{
    totalCommunications: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
    avgEngagementScore: number;
    avgEffectivenessRating: number;
    mostUsedTags: Array<{ tag: string; count: number }>;
  }> {
    const conditions: any[] = [];
    
    // SECURITY: Always filter by authorized projects when provided
    if (params.authorizedProjectIds && params.authorizedProjectIds.length > 0) {
      if (params.projectId) {
        // Verify requested projectId is in authorized list
        if (params.authorizedProjectIds.includes(params.projectId)) {
          conditions.push(eq(communications.projectId, params.projectId));
        } else {
          // Return empty metrics if requested projectId is not authorized
          return {
            totalCommunications: 0,
            byType: {},
            byStatus: {},
            avgEngagementScore: 0,
            avgEffectivenessRating: 0,
            mostUsedTags: []
          };
        }
      } else {
        // Filter by all authorized projects when no specific projectId requested
        conditions.push(inArray(communications.projectId, params.authorizedProjectIds));
      }
    } else if (params.projectId) {
      // Legacy behavior: filter by specific project when no authorization filtering
      conditions.push(eq(communications.projectId, params.projectId));
    }
    
    if (params.type) {
      conditions.push(eq(communications.type, params.type));
    }
    
    const whereCondition = conditions.length > 0 
      ? conditions.reduce((acc, condition) => acc ? and(acc, condition) : condition)
      : undefined;
    
    // SQL aggregation for total count
    let totalQuery = db.select({ count: count() }).from(communications);
    if (whereCondition) {
      totalQuery = totalQuery.where(whereCondition);
    }
    const [{ count: totalCommunications }] = await totalQuery;
    
    // SQL aggregation for type counts
    let typeQuery = db.select({
      type: communications.type,
      count: count()
    }).from(communications).groupBy(communications.type);
    if (whereCondition) {
      typeQuery = typeQuery.where(whereCondition);
    }
    const typeResults = await typeQuery;
    const byType: Record<string, number> = {};
    typeResults.forEach(result => {
      byType[result.type] = result.count;
    });
    
    // SQL aggregation for status counts
    let statusQuery = db.select({
      status: communications.status,
      count: count()
    }).from(communications).groupBy(communications.status);
    if (whereCondition) {
      statusQuery = statusQuery.where(whereCondition);
    }
    const statusResults = await statusQuery;
    const byStatus: Record<string, number> = {};
    statusResults.forEach(result => {
      byStatus[result.status] = result.count;
    });
    
    // SQL aggregation for engagement and effectiveness scores
    let scoresQuery = db.select({
      avgEngagement: sql<number>`AVG(CASE WHEN ${communications.engagementScore} > 0 THEN ${communications.engagementScore} END)`,
      avgEffectiveness: sql<number>`AVG(CASE WHEN ${communications.effectivenessRating} > 0 THEN ${communications.effectivenessRating} END)`
    }).from(communications);
    if (whereCondition) {
      scoresQuery = scoresQuery.where(whereCondition);
    }
    const [scores] = await scoresQuery;
    
    // SQL aggregation for tag counts (PostgreSQL specific)
    let tagsQuery = db.select({
      tag: sql<string>`unnest(${communications.tags})`,
      count: sql<number>`count(*)`
    }).from(communications).groupBy(sql`unnest(${communications.tags})`).orderBy(sql`count(*) DESC`).limit(10);
    if (whereCondition) {
      tagsQuery = tagsQuery.where(whereCondition);
    }
    const tagResults = await tagsQuery;
    const mostUsedTags = tagResults.map(result => ({
      tag: result.tag,
      count: result.count
    }));
    
    return {
      totalCommunications,
      byType,
      byStatus,
      avgEngagementScore: scores.avgEngagement || 0,
      avgEffectivenessRating: scores.avgEffectiveness || 0,
      mostUsedTags
    };
  }

  async getCommunicationVersionHistory(communicationId: string, authorizedProjectIds: string[]): Promise<CommunicationVersion[]> {
    // SECURITY: First verify the communication belongs to user's authorized projects
    const communication = await db.select({ projectId: communications.projectId })
      .from(communications)
      .where(eq(communications.id, communicationId));
    
    if (communication.length === 0) {
      // Communication not found
      return [];
    }
    
    if (!authorizedProjectIds.includes(communication[0].projectId)) {
      // SECURITY: Communication belongs to unauthorized project - return empty array
      return [];
    }
    
    // Get version history from the dedicated version table
    const versions = await db.select()
      .from(communicationVersions)
      .where(eq(communicationVersions.communicationId, communicationId))
      .orderBy(desc(communicationVersions.version), desc(communicationVersions.createdAt));
    
    return versions;
  }

  async archiveCommunications(ids: string[], userId: string): Promise<{ archived: number; errors: string[] }> {
    const results = { archived: 0, errors: [] as string[] };
    
    for (const id of ids) {
      try {
        const [updated] = await db.update(communications)
          .set({
            isArchived: true,
            archivedAt: new Date(),
            archivedById: userId,
            updatedAt: new Date()
          })
          .where(eq(communications.id, id))
          .returning();
        
        if (updated) {
          results.archived++;
        } else {
          results.errors.push(`Communication ${id} not found`);
        }
      } catch (error) {
        results.errors.push(`Failed to archive ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    return results;
  }

  async updateCommunicationEngagement(id: string, engagement: { 
    viewCount?: number; 
    shareCount?: number; 
    lastViewedAt?: Date 
  }): Promise<void> {
    const updateData: any = { updatedAt: new Date() };
    
    if (engagement.viewCount !== undefined) {
      updateData.viewCount = engagement.viewCount;
    }
    if (engagement.shareCount !== undefined) {
      updateData.shareCount = engagement.shareCount;
    }
    if (engagement.lastViewedAt !== undefined) {
      updateData.lastViewedAt = engagement.lastViewedAt;
    }

    await db.update(communications)
      .set(updateData)
      .where(eq(communications.id, id));
  }

  async getCommunicationsByStakeholder(stakeholderId: string, projectId?: string): Promise<Communication[]> {
    // Get stakeholder details
    const [stakeholder] = await db.select()
      .from(stakeholders)
      .where(eq(stakeholders.id, stakeholderId));

    if (!stakeholder) return [];

    let query = db.select()
      .from(communications)
      .where(sql`
        ${communications.targetAudience} @> ${JSON.stringify([stakeholder.name])} OR
        ${communications.targetAudience} @> ${JSON.stringify([stakeholder.role])}
      `);

    if (projectId) {
      query = query.where(eq(communications.projectId, projectId));
    } else if (stakeholder.projectId) {
      query = query.where(eq(communications.projectId, stakeholder.projectId));
    }

    return await query.orderBy(desc(communications.createdAt));
  }

  // Communication Strategies
  async getCommunicationStrategiesByProject(projectId: string): Promise<CommunicationStrategy[]> {
    return await db.select().from(communicationStrategy).where(eq(communicationStrategy.projectId, projectId)).orderBy(desc(communicationStrategy.createdAt));
  }

  async getCommunicationStrategy(id: string): Promise<CommunicationStrategy | undefined> {
    const [strategy] = await db.select().from(communicationStrategy).where(eq(communicationStrategy.id, id));
    return strategy || undefined;
  }

  async getCommunicationStrategyByPhase(projectId: string, phase: string): Promise<CommunicationStrategy | undefined> {
    const [strategy] = await db.select()
      .from(communicationStrategy)
      .where(and(
        eq(communicationStrategy.projectId, projectId),
        eq(communicationStrategy.phase, phase),
        eq(communicationStrategy.isActive, true)
      ));
    return strategy || undefined;
  }

  async createCommunicationStrategy(strategy: InsertCommunicationStrategy): Promise<CommunicationStrategy> {
    const [created] = await db.insert(communicationStrategy).values(strategy).returning();
    return created;
  }

  async updateCommunicationStrategy(id: string, strategy: Partial<InsertCommunicationStrategy>): Promise<CommunicationStrategy | undefined> {
    const [updated] = await db.update(communicationStrategy)
      .set({ ...strategy, updatedAt: new Date() })
      .where(eq(communicationStrategy.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteCommunicationStrategy(id: string): Promise<boolean> {
    const result = await db.delete(communicationStrategy).where(eq(communicationStrategy.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Surveys
  async getSurveysByProject(projectId: string): Promise<Survey[]> {
    return await db.select().from(surveys).where(eq(surveys.projectId, projectId)).orderBy(desc(surveys.createdAt));
  }

  async getSurvey(id: string): Promise<Survey | undefined> {
    const [survey] = await db.select().from(surveys).where(eq(surveys.id, id));
    return survey || undefined;
  }

  async createSurvey(survey: InsertSurvey): Promise<Survey> {
    const [created] = await db.insert(surveys).values(survey).returning();
    return created;
  }

  async updateSurvey(id: string, survey: Partial<InsertSurvey>): Promise<Survey | undefined> {
    const [updated] = await db.update(surveys)
      .set({ ...survey, updatedAt: new Date() })
      .where(eq(surveys.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteSurvey(id: string): Promise<boolean> {
    const result = await db.delete(surveys).where(eq(surveys.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Survey Responses
  async getResponsesBySurvey(surveyId: string): Promise<SurveyResponse[]> {
    return await db.select().from(surveyResponses).where(eq(surveyResponses.surveyId, surveyId));
  }

  async createSurveyResponse(response: InsertSurveyResponse): Promise<SurveyResponse> {
    const [created] = await db.insert(surveyResponses).values(response).returning();
    return created;
  }

  // GPT Interactions
  async getGptInteractionsByUser(userId: string): Promise<GptInteraction[]> {
    return await db.select().from(gptInteractions).where(eq(gptInteractions.userId, userId)).orderBy(desc(gptInteractions.createdAt));
  }

  async createGptInteraction(interaction: InsertGptInteraction): Promise<GptInteraction> {
    const [created] = await db.insert(gptInteractions).values(interaction).returning();
    return created;
  }

  // Dashboard Analytics
  async getDashboardStats(userId: string): Promise<{
    activeProjects: number;
    totalTasks: number;
    completedTasks: number;
    openRisks: number;
    openIssues: number;
    stakeholderEngagement: number;
    changeReadiness: number;
  }> {
    // Get active projects count (all projects that are not completed or cancelled)
    const [activeProjectsResult] = await db
      .select({ count: count() })
      .from(projects)
      .where(and(
        eq(projects.ownerId, userId),
        sql`${projects.status} NOT IN ('completed', 'cancelled')`
      ));

    // Get all user's projects for further queries
    const userProjects = await db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.ownerId, userId));

    const projectIds = userProjects.map(p => p.id);

    let totalTasks = 0;
    let completedTasks = 0;
    let openRisks = 0;
    let openIssues = 0;

    if (projectIds.length > 0) {
      // Get task counts
      const [totalTasksResult] = await db
        .select({ count: count() })
        .from(tasks)
        .where(inArray(tasks.projectId, projectIds));

      const [completedTasksResult] = await db
        .select({ count: count() })
        .from(tasks)
        .where(and(
          inArray(tasks.projectId, projectIds),
          eq(tasks.status, 'completed')
        ));

      // Get RAID log counts
      const [openRisksResult] = await db
        .select({ count: count() })
        .from(raidLogs)
        .where(and(
          inArray(raidLogs.projectId, projectIds),
          eq(raidLogs.type, 'risk'),
          eq(raidLogs.status, 'open')
        ));

      const [openIssuesResult] = await db
        .select({ count: count() })
        .from(raidLogs)
        .where(and(
          inArray(raidLogs.projectId, projectIds),
          eq(raidLogs.type, 'issue'),
          eq(raidLogs.status, 'open')
        ));

      totalTasks = totalTasksResult.count;
      completedTasks = completedTasksResult.count;
      openRisks = openRisksResult.count;
      openIssues = openIssuesResult.count;
    }

    // Calculate stakeholder engagement (simplified - average of supportive stakeholders)
    let stakeholderEngagement = 75; // Default value
    if (projectIds.length > 0) {
      const supportiveStakeholders = await db
        .select({ count: count() })
        .from(stakeholders)
        .where(and(
          inArray(stakeholders.projectId, projectIds),
          eq(stakeholders.supportLevel, 'supportive')
        ));

      const totalStakeholders = await db
        .select({ count: count() })
        .from(stakeholders)
        .where(inArray(stakeholders.projectId, projectIds));

      if (totalStakeholders[0].count > 0) {
        stakeholderEngagement = Math.round((supportiveStakeholders[0].count / totalStakeholders[0].count) * 100);
      }
    }

    // Calculate change readiness (simplified - based on completed tasks and low resistance)
    let changeReadiness = 65; // Default value
    if (totalTasks > 0) {
      const taskProgress = (completedTasks / totalTasks) * 100;
      changeReadiness = Math.round((taskProgress + stakeholderEngagement) / 2);
    }

    return {
      activeProjects: activeProjectsResult.count,
      totalTasks,
      completedTasks,
      openRisks,
      openIssues,
      stakeholderEngagement,
      changeReadiness
    };
  }

  // User-Initiative Assignments
  async getUserInitiativeAssignments(userId: string): Promise<UserInitiativeAssignment[]> {
    return await db.select().from(userInitiativeAssignments)
      .where(eq(userInitiativeAssignments.userId, userId))
      .orderBy(desc(userInitiativeAssignments.assignedAt));
  }

  async getInitiativeAssignments(projectId: string): Promise<UserInitiativeAssignment[]> {
    return await db.select().from(userInitiativeAssignments)
      .where(eq(userInitiativeAssignments.projectId, projectId))
      .orderBy(desc(userInitiativeAssignments.assignedAt));
  }

  async assignUserToInitiative(assignment: InsertUserInitiativeAssignment): Promise<UserInitiativeAssignment> {
    const [created] = await db.insert(userInitiativeAssignments).values(assignment).returning();
    return created;
  }

  async updateUserInitiativeAssignment(id: string, assignment: Partial<InsertUserInitiativeAssignment>): Promise<UserInitiativeAssignment | undefined> {
    const [updated] = await db.update(userInitiativeAssignments)
      .set(assignment)
      .where(eq(userInitiativeAssignments.id, id))
      .returning();
    return updated || undefined;
  }

  async removeUserFromInitiative(userId: string, projectId: string): Promise<boolean> {
    const result = await db.delete(userInitiativeAssignments)
      .where(and(
        eq(userInitiativeAssignments.userId, userId),
        eq(userInitiativeAssignments.projectId, projectId)
      ));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Enhanced User Methods
  async getUsersWithRoles(): Promise<(Omit<User, 'passwordHash'> & { role: Role })[]> {
    const result = await db.select({
      id: users.id,
      username: users.username,
      // passwordHash: users.passwordHash, // SECURITY: Excluded to prevent exposure
      name: users.name,
      roleId: users.roleId,
      isActive: users.isActive,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
      role: {
        id: roles.id,
        name: roles.name,
        description: roles.description,
        permissions: roles.permissions,
        isActive: roles.isActive,
        createdAt: roles.createdAt,
        updatedAt: roles.updatedAt
      }
    })
    .from(users)
    .leftJoin(roles, eq(users.roleId, roles.id))
    .orderBy(users.name);

    return result.map(row => ({
      id: row.id,
      username: row.username,
      // passwordHash: row.passwordHash, // SECURITY: Removed to prevent exposure
      name: row.name,
      roleId: row.roleId,
      isActive: row.isActive,
      lastLoginAt: row.lastLoginAt,
      createdAt: row.createdAt,
      role: row.role as Role
    }));
  }

  async updateUserRole(userId: string, roleId: string): Promise<User | undefined> {
    const [updated] = await db.update(users)
      .set({ roleId })
      .where(eq(users.id, userId))
      .returning();
    if (!updated) return undefined;
    // Remove passwordHash from response for security
    const { passwordHash, ...userWithoutHash } = updated;
    return userWithoutHash as User;
  }

  async getUsersByRole(roleId: string): Promise<User[]> {
    const users_list = await db.select().from(users)
      .where(eq(users.roleId, roleId))
      .orderBy(users.name);
    // Remove passwordHash from response for security
    return users_list.map(({ passwordHash, ...user }) => user as User);
  }

  // Role-Based Access Methods
  async getUserPermissions(userId: string): Promise<Permissions> {
    const result = await db.select({
      permissions: roles.permissions
    })
    .from(users)
    .leftJoin(roles, eq(users.roleId, roles.id))
    .where(eq(users.id, userId));

    if (result.length === 0 || !result[0].permissions) {
      // Return default permissions with all false if user/role not found
      // Using the new permission keys that match the schema
      return {
        // User Management
        canSeeUsers: false,
        canModifyUsers: false,
        canEditUsers: false,
        canDeleteUsers: false,
        
        // Project Management
        canSeeProjects: false,
        canModifyProjects: false,
        canEditProjects: false,
        canDeleteProjects: false,
        canSeeAllProjects: false,
        canModifyAllProjects: false,
        canEditAllProjects: false,
        canDeleteAllProjects: false,
        
        // Tasks Management
        canSeeTasks: false,
        canModifyTasks: false,
        canEditTasks: false,
        canDeleteTasks: false,
        
        // Stakeholder Management
        canSeeStakeholders: false,
        canModifyStakeholders: false,
        canEditStakeholders: false,
        canDeleteStakeholders: false,
        
        // RAID Logs Management
        canSeeRaidLogs: false,
        canModifyRaidLogs: false,
        canEditRaidLogs: false,
        canDeleteRaidLogs: false,
        
        // Communications Management
        canSeeCommunications: false,
        canModifyCommunications: false,
        canEditCommunications: false,
        canDeleteCommunications: false,
        
        // Survey Management
        canSeeSurveys: false,
        canModifySurveys: false,
        canEditSurveys: false,
        canDeleteSurveys: false,
        
        // Mind Maps Management
        canSeeMindMaps: false,
        canModifyMindMaps: false,
        canEditMindMaps: false,
        canDeleteMindMaps: false,
        
        // Process Maps Management
        canSeeProcessMaps: false,
        canModifyProcessMaps: false,
        canEditProcessMaps: false,
        canDeleteProcessMaps: false,
        
        // Gantt Charts Management
        canSeeGanttCharts: false,
        canModifyGanttCharts: false,
        canEditGanttCharts: false,
        canDeleteGanttCharts: false,
        
        // Checklist Templates Management
        canSeeChecklistTemplates: false,
        canModifyChecklistTemplates: false,
        canEditChecklistTemplates: false,
        canDeleteChecklistTemplates: false,
        
        // Reports and Analytics
        canSeeReports: false,
        canModifyReports: false,
        canEditReports: false,
        canDeleteReports: false,
        
        // Security and Role Management
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
        
        // Email System Permissions
        canSendEmails: false,
        canSendBulkEmails: false,
        canSendSystemEmails: false,
        canSeeEmailLogs: false,
        canModifyEmailTemplates: false,
        canEditEmailSettings: false,
        
        // System Administration
        canSeeSystemSettings: false,
        canModifySystemSettings: false,
        canEditSystemSettings: false,
        canManageSystem: false,
      };
    }

    return result[0].permissions as Permissions;
  }

  async checkUserPermission(userId: string, permission: keyof Permissions): Promise<boolean> {
    const permissions = await this.resolveUserPermissions(userId);
    return permissions[permission] || false;
  }

  // Milestones
  async getMilestonesByProject(projectId: string): Promise<Milestone[]> {
    return await db.select().from(milestones).where(eq(milestones.projectId, projectId)).orderBy(milestones.targetDate);
  }

  async getMilestone(id: string): Promise<Milestone | undefined> {
    const [milestone] = await db.select().from(milestones).where(eq(milestones.id, id));
    return milestone || undefined;
  }

  async createMilestone(milestone: InsertMilestone): Promise<Milestone> {
    const [created] = await db.insert(milestones).values(milestone).returning();
    return created;
  }

  async updateMilestone(id: string, milestone: Partial<InsertMilestone>): Promise<Milestone | undefined> {
    const [updated] = await db.update(milestones)
      .set({ ...milestone, updatedAt: new Date() })
      .where(eq(milestones.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteMilestone(id: string): Promise<boolean> {
    const result = await db.delete(milestones).where(eq(milestones.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Communication Templates
  async getCommunicationTemplates(): Promise<CommunicationTemplate[]> {
    return await db.select().from(communicationTemplates).orderBy(desc(communicationTemplates.createdAt));
  }

  async getCommunicationTemplatesByCategory(category: string): Promise<CommunicationTemplate[]> {
    return await db.select().from(communicationTemplates)
      .where(eq(communicationTemplates.category, category))
      .orderBy(desc(communicationTemplates.createdAt));
  }

  async getActiveCommunicationTemplates(): Promise<CommunicationTemplate[]> {
    return await db.select().from(communicationTemplates)
      .where(eq(communicationTemplates.isActive, true))
      .orderBy(desc(communicationTemplates.createdAt));
  }

  async getCommunicationTemplate(id: string): Promise<CommunicationTemplate | undefined> {
    const [template] = await db.select().from(communicationTemplates).where(eq(communicationTemplates.id, id));
    return template || undefined;
  }

  async createCommunicationTemplate(template: InsertCommunicationTemplate): Promise<CommunicationTemplate> {
    const [created] = await db.insert(communicationTemplates).values(template).returning();
    return created;
  }

  async updateCommunicationTemplate(id: string, template: Partial<InsertCommunicationTemplate>): Promise<CommunicationTemplate | undefined> {
    const [updated] = await db.update(communicationTemplates)
      .set({ ...template, updatedAt: new Date() })
      .where(eq(communicationTemplates.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteCommunicationTemplate(id: string): Promise<boolean> {
    const result = await db.delete(communicationTemplates).where(eq(communicationTemplates.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async incrementTemplateUsage(id: string): Promise<void> {
    await db.update(communicationTemplates)
      .set({ usageCount: sql`${communicationTemplates.usageCount} + 1` })
      .where(eq(communicationTemplates.id, id));
  }

  // Checklist Templates
  async getChecklistTemplates(): Promise<ChecklistTemplate[]> {
    return await db.select().from(checklistTemplates).orderBy(desc(checklistTemplates.createdAt));
  }

  async getChecklistTemplatesByCategory(category: string): Promise<ChecklistTemplate[]> {
    return await db.select().from(checklistTemplates)
      .where(eq(checklistTemplates.category, category))
      .orderBy(desc(checklistTemplates.createdAt));
  }

  async getActiveChecklistTemplates(): Promise<ChecklistTemplate[]> {
    return await db.select().from(checklistTemplates)
      .where(eq(checklistTemplates.isActive, true))
      .orderBy(desc(checklistTemplates.createdAt));
  }

  async getChecklistTemplate(id: string): Promise<ChecklistTemplate | undefined> {
    const [template] = await db.select().from(checklistTemplates).where(eq(checklistTemplates.id, id));
    return template || undefined;
  }

  async createChecklistTemplate(template: InsertChecklistTemplate): Promise<ChecklistTemplate> {
    const [created] = await db.insert(checklistTemplates).values(template).returning();
    return created;
  }

  async updateChecklistTemplate(id: string, template: Partial<InsertChecklistTemplate>): Promise<ChecklistTemplate | undefined> {
    const [updated] = await db.update(checklistTemplates)
      .set({ ...template, updatedAt: new Date() })
      .where(eq(checklistTemplates.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteChecklistTemplate(id: string): Promise<boolean> {
    const result = await db.delete(checklistTemplates).where(eq(checklistTemplates.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Mind Maps

  // Process Maps
  async getProcessMapsByProject(projectId: string): Promise<ProcessMap[]> {
    return await db.select().from(processMaps)
      .where(and(eq(processMaps.projectId, projectId), eq(processMaps.isActive, true)))
      .orderBy(desc(processMaps.createdAt));
  }

  async getProcessMap(id: string): Promise<ProcessMap | undefined> {
    const [processMap] = await db.select().from(processMaps).where(eq(processMaps.id, id));
    return processMap || undefined;
  }

  async createProcessMap(insertProcessMap: InsertProcessMap): Promise<ProcessMap> {
    const [processMap] = await db.insert(processMaps).values(insertProcessMap).returning();
    return processMap;
  }

  async updateProcessMap(id: string, updateData: Partial<InsertProcessMap>): Promise<ProcessMap | undefined> {
    const [processMap] = await db.update(processMaps)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(processMaps.id, id))
      .returning();
    return processMap || undefined;
  }

  async deleteProcessMap(id: string): Promise<boolean> {
    const result = await db.delete(processMaps).where(eq(processMaps.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // ===== SECURITY MANAGEMENT CENTER METHODS =====

  // User Groups Management
  async getUserGroups(): Promise<UserGroup[]> {
    try {
      return await db.select().from(userGroups)
        .where(eq(userGroups.isActive, true))
        .orderBy(userGroups.name);
    } catch (error) {
      // Fallback when new tables don't exist yet
      console.warn('User groups table not available yet:', error);
      return [];
    }
  }

  async getUserGroup(id: string): Promise<UserGroup | undefined> {
    try {
      const [group] = await db.select().from(userGroups).where(eq(userGroups.id, id));
      return group || undefined;
    } catch (error) {
      console.warn('User groups table not available yet:', error);
      return undefined;
    }
  }

  async createUserGroup(insertGroup: InsertUserGroup): Promise<UserGroup> {
    try {
      const [group] = await db.insert(userGroups).values(insertGroup).returning();
      return group;
    } catch (error) {
      console.error('Failed to create user group:', error);
      throw error;
    }
  }

  async updateUserGroup(id: string, updateData: Partial<InsertUserGroup>): Promise<UserGroup | undefined> {
    try {
      const [updated] = await db.update(userGroups)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(userGroups.id, id))
        .returning();
      return updated || undefined;
    } catch (error) {
      console.error('Failed to update user group:', error);
      return undefined;
    }
  }

  async deleteUserGroup(id: string): Promise<boolean> {
    try {
      const result = await db.delete(userGroups).where(eq(userGroups.id, id));
      return result.rowCount ? result.rowCount > 0 : false;
    } catch (error) {
      console.error('Failed to delete user group:', error);
      return false;
    }
  }

  // User Group Memberships Management
  async getUserGroupMemberships(userId: string): Promise<UserGroupMembership[]> {
    try {
      return await db.select().from(userGroupMemberships)
        .where(eq(userGroupMemberships.userId, userId))
        .orderBy(userGroupMemberships.assignedAt);
    } catch (error) {
      console.warn('User group memberships table not available yet:', error);
      return [];
    }
  }

  async getGroupMemberships(groupId: string): Promise<UserGroupMembership[]> {
    try {
      return await db.select().from(userGroupMemberships)
        .where(eq(userGroupMemberships.groupId, groupId))
        .orderBy(userGroupMemberships.assignedAt);
    } catch (error) {
      console.warn('User group memberships table not available yet:', error);
      return [];
    }
  }

  async assignUserToGroup(membership: InsertUserGroupMembership): Promise<UserGroupMembership> {
    try {
      const [assigned] = await db.insert(userGroupMemberships).values(membership).returning();
      return assigned;
    } catch (error) {
      console.error('Failed to assign user to group:', error);
      throw error;
    }
  }

  async removeUserFromGroup(userId: string, groupId: string): Promise<boolean> {
    try {
      const result = await db.delete(userGroupMemberships)
        .where(and(
          eq(userGroupMemberships.userId, userId),
          eq(userGroupMemberships.groupId, groupId)
        ));
      return result.rowCount ? result.rowCount > 0 : false;
    } catch (error) {
      console.error('Failed to remove user from group:', error);
      return false;
    }
  }

  // Individual User Permissions Management
  async getUserIndividualPermissions(userId: string): Promise<UserPermission | undefined> {
    try {
      const [permissions] = await db.select().from(userPermissions)
        .where(eq(userPermissions.userId, userId));
      return permissions || undefined;
    } catch (error) {
      console.warn('User permissions table not available yet:', error);
      return undefined;
    }
  }

  async setUserIndividualPermissions(permission: InsertUserPermission): Promise<UserPermission> {
    try {
      const [set] = await db.insert(userPermissions).values(permission).returning();
      return set;
    } catch (error) {
      console.error('Failed to set user individual permissions:', error);
      throw error;
    }
  }

  async updateUserIndividualPermissions(userId: string, updateData: Partial<InsertUserPermission>): Promise<UserPermission | undefined> {
    try {
      const [updated] = await db.update(userPermissions)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(userPermissions.userId, userId))
        .returning();
      return updated || undefined;
    } catch (error) {
      console.error('Failed to update user individual permissions:', error);
      return undefined;
    }
  }

  async clearUserIndividualPermissions(userId: string): Promise<boolean> {
    try {
      const result = await db.delete(userPermissions).where(eq(userPermissions.userId, userId));
      return result.rowCount ? result.rowCount > 0 : false;
    } catch (error) {
      console.error('Failed to clear user individual permissions:', error);
      return false;
    }
  }

  // Enhanced Permission Resolution - The Core of Security Management Center
  async resolveUserPermissions(userId: string): Promise<Permissions> {
    try {
      // Get role permissions (existing functionality)
      const rolePermissions = await this.getUserPermissions(userId);
      
      // Get group permissions (most permissive wins across groups)
      const groupMemberships = await this.getUserGroupMemberships(userId);
      let groupPermissions: Permissions = {} as Permissions;
      
      // Initialize all group permissions as false
      Object.keys(rolePermissions).forEach(key => {
        groupPermissions[key as keyof Permissions] = false;
      });
      
      // Get permissions from all groups and apply most permissive logic
      for (const membership of groupMemberships) {
        try {
          const group = await this.getUserGroup(membership.groupId);
          if (group && group.isActive) {
            Object.keys(group.permissions).forEach(key => {
              const permission = key as keyof Permissions;
              if (group.permissions[permission]) {
                groupPermissions[permission] = true; // Most permissive wins
              }
            });
          }
        } catch (err) {
          console.warn('Failed to get group permissions:', err);
        }
      }
      
      // Get individual user permissions
      const individualPermissions = await this.getUserIndividualPermissions(userId);
      
      // Combine all permissions with most permissive wins
      const resolvedPermissions: Permissions = {} as Permissions;
      
      Object.keys(rolePermissions).forEach(key => {
        const permission = key as keyof Permissions;
        resolvedPermissions[permission] = 
          rolePermissions[permission] || 
          groupPermissions[permission] || 
          (individualPermissions?.permissions[permission] || false);
      });
      
      return resolvedPermissions;
    } catch (error) {
      console.error('Failed to resolve user permissions:', error);
      // Fallback to role-only permissions
      return await this.getUserPermissions(userId);
    }
  }

  async checkEnhancedUserPermission(userId: string, permission: keyof Permissions): Promise<boolean> {
    const permissions = await this.resolveUserPermissions(userId);
    return permissions[permission] || false;
  }

  async getUserSecuritySummary(userId: string): Promise<{
    rolePermissions: Permissions;
    groupPermissions: Permissions[];
    individualPermissions?: Permissions;
    resolvedPermissions: Permissions;
  }> {
    const rolePermissions = await this.getUserPermissions(userId);
    const groupMemberships = await this.getUserGroupMemberships(userId);
    const individualUserPermissions = await this.getUserIndividualPermissions(userId);
    
    // Get permissions from all groups
    const groupPermissions: Permissions[] = [];
    for (const membership of groupMemberships) {
      try {
        const group = await this.getUserGroup(membership.groupId);
        if (group && group.isActive) {
          groupPermissions.push(group.permissions);
        }
      } catch (err) {
        console.warn('Failed to get group permissions for summary:', err);
      }
    }
    
    const resolvedPermissions = await this.resolveUserPermissions(userId);
    
    return {
      rolePermissions,
      groupPermissions,
      individualPermissions: individualUserPermissions?.permissions,
      resolvedPermissions,
    };
  }
}

export const storage = new DatabaseStorage();
