import { 
  users, projects, tasks, stakeholders, raidLogs, communications, surveys, surveyResponses, gptInteractions, milestones, checklistTemplates,
  type User, type InsertUser, type Project, type InsertProject, type Task, type InsertTask,
  type Stakeholder, type InsertStakeholder, type RaidLog, type InsertRaidLog,
  type Communication, type InsertCommunication, type Survey, type InsertSurvey,
  type SurveyResponse, type InsertSurveyResponse, type GptInteraction, type InsertGptInteraction,
  type Milestone, type InsertMilestone, type ChecklistTemplate, type InsertChecklistTemplate
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, count, isNull, inArray } from "drizzle-orm";

export interface IStorage {
  // Users
  getUsers(): Promise<User[]>;
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Projects
  getProjects(userId: string): Promise<Project[]>;
  getProject(id: string): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, project: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: string): Promise<boolean>;

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
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(users.name);
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Projects
  async getProjects(userId: string): Promise<Project[]> {
    return await db.select().from(projects).where(eq(projects.ownerId, userId)).orderBy(desc(projects.createdAt));
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
    const [updated] = await db.update(communications)
      .set({ ...communication, updatedAt: new Date() })
      .where(eq(communications.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteCommunication(id: string): Promise<boolean> {
    const result = await db.delete(communications).where(eq(communications.id, id));
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
}

export const storage = new DatabaseStorage();
