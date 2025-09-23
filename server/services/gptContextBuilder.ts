/**
 * GPT Context Builder Service
 * 
 * Gathers comprehensive context for intelligent helpdesk support including:
 * - User session and permissions
 * - Current application state  
 * - Recent errors and system logs
 * - Page context and user journey
 * - Organization data and settings
 * 
 * This context enables GPT to provide personalized, intelligent troubleshooting
 * with full awareness of user's situation and system state.
 */

import { storage } from '../storage'

export interface GPTContext {
  // User Context
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    permissions: any;
    isActive: boolean;
  };
  
  // Organization Context
  organization: {
    id: string;
    name: string;
    settings: any;
    memberCount: number;
    subscription: {
      seatLimit: number;
      activeSeats: number;
      availableSeats: number;
    };
  };

  // Current Session Context
  session: {
    sessionId: string;
    currentPage: string;
    userAgent: string;
    lastActivity: Date;
    timeSpent: number; // minutes in current session
  };

  // Application State Context
  applicationState: {
    recentProjects: Array<{
      id: string;
      name: string;
      status: string;
      updatedAt: Date;
      taskCount: number;
    }>;
    recentTasks: Array<{
      id: string;
      title: string;
      status: string;
      priority: string;
      projectName: string;
    }>;
    activeNotifications: number;
    pendingInvitations: number;
  };

  // System Health Context
  systemHealth: {
    recentErrors: Array<{
      timestamp: Date;
      level: 'error' | 'warning' | 'info';
      message: string;
      context: string;
      userAction?: string;
    }>;
    apiResponseTimes: {
      average: number;
      slow: boolean;
    };
    lastSuccessfulBackup: Date | null;
  };

  // User Journey Context
  userJourney: {
    registrationDate: Date;
    lastLogin: Date;
    loginCount: number;
    commonPages: string[];
    strugglesWithFeatures: string[];
    helpRequestsCount: number;
  };

  // Previous Support Context
  supportHistory: {
    previousConversations: Array<{
      id: string;
      createdAt: Date;
      issueCategory: string;
      resolved: boolean;
      satisfactionRating?: number;
    }>;
    commonIssues: string[];
    escalationHistory: Array<{
      id: string;
      createdAt: Date;
      reason: string;
      status: string;
    }>;
  };
}

export class GPTContextBuilder {
  
  /**
   * Builds comprehensive context for GPT support agent
   */
  async buildContext(
    userId: string, 
    organizationId: string,
    sessionId: string,
    currentPageContext?: {
      page: string;
      userAgent: string;
      errorContext?: string;
      userAction?: string;
    }
  ): Promise<GPTContext> {
    
    try {
      // Gather all context data in parallel for efficiency
      const [
        userContext,
        organizationData,
        seatUsage,
        organizationSettings,
        recentProjects,
        supportConversations,
        supportTickets,
        notificationsResult
      ] = await Promise.all([
        storage.getUserContext(userId, organizationId),
        storage.getOrganization(organizationId),
        storage.getSeatUsage(organizationId),
        storage.getOrganizationSettings(organizationId),
        this.getRecentProjectsWithStats(userId, organizationId),
        storage.getSupportConversationsByUser(userId, organizationId),
        storage.getSupportTicketsByUser(userId, organizationId),
        storage.getNotifications(userId)
      ]);

      // Process and format the context
      const context: GPTContext = {
        user: {
          id: userContext.user.id,
          name: userContext.user.name,
          email: userContext.user.email,
          role: userContext.user.roleId,
          permissions: userContext.permissions,
          isActive: userContext.organizationMembership.isActive,
        },

        organization: {
          id: organizationData?.id || organizationId,
          name: organizationData?.name || 'Unknown',
          settings: organizationSettings || {},
          memberCount: seatUsage.activeMembers,
          subscription: {
            seatLimit: seatUsage.seatLimit,
            activeSeats: seatUsage.activeMembers,
            availableSeats: seatUsage.available,
          },
        },

        session: {
          sessionId,
          currentPage: currentPageContext?.page || 'Unknown',
          userAgent: currentPageContext?.userAgent || 'Unknown',
          lastActivity: new Date(),
          timeSpent: this.calculateSessionTime(sessionId), // TODO: Implement session tracking
        },

        applicationState: {
          recentProjects: recentProjects,
          recentTasks: userContext.recentTasks.map(task => ({
            id: task.id,
            title: task.name,
            status: task.status,
            priority: task.priority,
            projectName: recentProjects.find(p => p.id === task.projectId)?.name || 'Unknown'
          })),
          activeNotifications: notificationsResult.notifications.length,
          pendingInvitations: await this.getPendingInvitationsCount(organizationId),
        },

        systemHealth: {
          recentErrors: this.formatRecentErrors(currentPageContext?.errorContext),
          apiResponseTimes: {
            average: 200, // TODO: Implement real metrics
            slow: false,
          },
          lastSuccessfulBackup: new Date(), // TODO: Implement backup tracking
        },

        userJourney: {
          registrationDate: userContext.organizationMembership.joinedAt,
          lastLogin: new Date(), // TODO: Track login times
          loginCount: 1, // TODO: Track login count
          commonPages: ['dashboard', 'projects'], // TODO: Track page visits
          strugglesWithFeatures: this.identifyStruggles(supportConversations),
          helpRequestsCount: supportConversations.length,
        },

        supportHistory: {
          previousConversations: supportConversations.slice(0, 10).map(conv => ({
            id: conv.id,
            createdAt: conv.createdAt,
            issueCategory: conv.issueCategory || 'General',
            resolved: conv.issueResolved || false,
            satisfactionRating: conv.satisfactionRating || undefined,
          })),
          commonIssues: this.extractCommonIssues(supportConversations),
          escalationHistory: supportTickets.slice(0, 5).map(ticket => ({
            id: ticket.id,
            createdAt: ticket.createdAt,
            reason: ticket.category,
            status: ticket.status,
          })),
        },
      };

      return context;

    } catch (error) {
      console.error('Error building GPT context:', error);
      // Return minimal context on error
      return this.buildMinimalContext(userId, organizationId, sessionId);
    }
  }

  /**
   * Formats context for GPT prompt
   */
  formatContextForGPT(context: GPTContext): string {
    return `
**USER CONTEXT**
- Name: ${context.user.name} (${context.user.email})
- Role: ${context.user.role}
- Organization: ${context.organization.name}
- Current Page: ${context.session.currentPage}
- Session Time: ${context.session.timeSpent} minutes

**APPLICATION STATE**
- Active Projects: ${context.applicationState.recentProjects.length}
- Recent Tasks: ${context.applicationState.recentTasks.length}
- Notifications: ${context.applicationState.activeNotifications}
- Organization Members: ${context.organization.memberCount}/${context.organization.subscription.seatLimit}

**RECENT ACTIVITY**
Recent Projects:
${context.applicationState.recentProjects.map(p => `- ${p.name} (${p.status}) - ${p.taskCount} tasks`).join('\n')}

Recent Tasks:
${context.applicationState.recentTasks.slice(0, 5).map(t => `- ${t.title} (${t.status}) - ${t.projectName}`).join('\n')}

**SUPPORT HISTORY**
- Help Requests: ${context.userJourney.helpRequestsCount}
- Previous Issues: ${context.supportHistory.commonIssues.join(', ')}
- Escalations: ${context.supportHistory.escalationHistory.length}

**SYSTEM STATUS**
- Recent Errors: ${context.systemHealth.recentErrors.length}
- API Performance: ${context.systemHealth.apiResponseTimes.slow ? 'Slow' : 'Normal'}
${context.systemHealth.recentErrors.length > 0 ? 
  `- Latest Error: ${context.systemHealth.recentErrors[0].message}` : ''}

**USER PERMISSIONS**
${JSON.stringify(context.user.permissions, null, 2)}
    `.trim();
  }

  // Helper Methods
  
  private async getRecentProjectsWithStats(userId: string, organizationId: string): Promise<Array<{
    id: string;
    name: string;
    status: string;
    updatedAt: Date;
    taskCount: number;
  }>> {
    const projects = await storage.getProjects(userId, organizationId);
    
    const projectsWithStats = await Promise.all(
      projects.slice(0, 5).map(async (project) => {
        const tasks = await storage.getTasksByProject(project.id, organizationId);
        return {
          id: project.id,
          name: project.name,
          status: project.status,
          updatedAt: project.updatedAt,
          taskCount: tasks.length,
        };
      })
    );

    return projectsWithStats;
  }

  private async getPendingInvitationsCount(organizationId: string): Promise<number> {
    const invitations = await storage.getOrganizationInvitations(organizationId);
    return invitations.filter((inv: any) => inv.status === 'pending').length;
  }

  private formatRecentErrors(errorContext?: string): Array<{
    timestamp: Date;
    level: 'error' | 'warning' | 'info';
    message: string;
    context: string;
    userAction?: string;
  }> {
    if (!errorContext) return [];
    
    // TODO: Implement proper error log parsing
    return [{
      timestamp: new Date(),
      level: 'error' as const,
      message: errorContext,
      context: 'Frontend',
      userAction: 'Unknown',
    }];
  }

  private identifyStruggles(conversations: any[]): string[] {
    // TODO: Implement ML/pattern recognition for struggle identification
    const commonStruggles: string[] = [];
    
    conversations.forEach(conv => {
      if (conv.messagesCount > 10) {
        commonStruggles.push('Long conversations (complex issues)');
      }
      if (conv.escalatedToTicket) {
        commonStruggles.push('Issues requiring escalation');
      }
      if (conv.satisfactionRating && conv.satisfactionRating < 3) {
        commonStruggles.push('Low satisfaction with support');
      }
    });

    return Array.from(new Set(commonStruggles));
  }

  private extractCommonIssues(conversations: any[]): string[] {
    const issueCategories = conversations
      .map(conv => conv.issueCategory)
      .filter(Boolean);
    
    const categoryCount = issueCategories.reduce((acc, category) => {
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(categoryCount)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 3)
      .map(([category]) => category);
  }

  private calculateSessionTime(sessionId: string): number {
    // TODO: Implement real session time tracking
    // For now, return a default value
    return Math.floor(Math.random() * 30) + 5; // 5-35 minutes
  }

  private async buildMinimalContext(userId: string, organizationId: string, sessionId: string): Promise<GPTContext> {
    // Fallback context with minimal data
    const user = await storage.getUser(userId);
    const org = await storage.getOrganization(organizationId);
    
    return {
      user: {
        id: user?.id || userId,
        name: user?.name || 'Unknown User',
        email: user?.email || 'unknown@example.com',
        role: user?.roleId || 'user',
        permissions: {},
        isActive: true,
      },
      organization: {
        id: org?.id || organizationId,
        name: org?.name || 'Unknown Organization',
        settings: {},
        memberCount: 1,
        subscription: { seatLimit: 5, activeSeats: 1, availableSeats: 4 },
      },
      session: {
        sessionId,
        currentPage: 'Unknown',
        userAgent: 'Unknown',
        lastActivity: new Date(),
        timeSpent: 0,
      },
      applicationState: {
        recentProjects: [],
        recentTasks: [],
        activeNotifications: 0,
        pendingInvitations: 0,
      },
      systemHealth: {
        recentErrors: [],
        apiResponseTimes: { average: 200, slow: false },
        lastSuccessfulBackup: null,
      },
      userJourney: {
        registrationDate: new Date(),
        lastLogin: new Date(),
        loginCount: 1,
        commonPages: [],
        strugglesWithFeatures: [],
        helpRequestsCount: 0,
      },
      supportHistory: {
        previousConversations: [],
        commonIssues: [],
        escalationHistory: [],
      },
    };
  }
}

// Export singleton instance
export const gptContextBuilder = new GPTContextBuilder();