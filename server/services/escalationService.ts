import { storage } from '../storage';
import { helpdeskGPT } from './helpdeskGPT';
import { sendEmail } from './emailService';
import { SupportTicket, InsertSupportTicket } from '@shared/schema';

interface EscalationRequest {
  conversationId: string;
  userId: string;
  organizationId: string;
  sessionId: string;
  userMessage: string;
  assistantResponse: string;
  escalationReason: string;
  category: "technical" | "permissions" | "guidance" | "escalation";
  priority: "low" | "medium" | "high" | "urgent";
  userConfirmed: boolean;
}

interface EscalationResult {
  success: boolean;
  ticket?: SupportTicket;
  emailSent: boolean;
  error?: string;
}

class EscalationService {
  /**
   * Process complete escalation workflow:
   * 1. Generate escalation summary using GPT
   * 2. Create support ticket in database
   * 3. Send email notification to sys admin
   * 4. Update conversation with escalation info
   */
  async processEscalation(request: EscalationRequest): Promise<EscalationResult> {
    try {
      // Step 1: Generate intelligent escalation summary using GPT
      const escalationSummary = await helpdeskGPT.generateEscalationSummary(
        {
          message: request.userMessage,
          conversationId: request.conversationId,
          userId: request.userId,
          organizationId: request.organizationId,
          sessionId: request.sessionId,
        },
        {
          response: request.assistantResponse,
          confidence: "medium", // Will be provided by calling code
          category: request.category,
          escalationRecommended: true,
          escalationReason: request.escalationReason,
          relevantSources: [],
          conversationId: request.conversationId,
        }
      );

      // Step 2: Build comprehensive support ticket data
      const ticketData: InsertSupportTicket = {
        organizationId: request.organizationId,
        userId: request.userId,
        title: escalationSummary.title || `Helpdesk Escalation - ${request.category}`,
        description: escalationSummary.description || `User Issue: ${request.userMessage}`,
        category: request.category,
        priority: escalationSummary.priority || request.priority,
        status: "open",
        userContext: {
          originalMessage: request.userMessage,
          assistantResponse: request.assistantResponse,
          escalationReason: request.escalationReason,
          sessionId: request.sessionId,
        },
        systemContext: null, // Will be filled by context builder if needed
        conversationHistory: [
          {
            role: "user",
            content: request.userMessage,
            timestamp: new Date().toISOString(),
          },
          {
            role: "assistant", 
            content: request.assistantResponse,
            timestamp: new Date().toISOString(),
          },
        ]
      };

      // Step 3: Create support ticket  
      const ticket = await storage.createSupportTicket(ticketData, request.organizationId);
      
      // Step 4: Update conversation to mark as escalated
      await storage.updateSupportConversation(
        request.conversationId,
        request.organizationId,
        {
          escalatedToTicket: ticket.id,
          isActive: false, // Mark conversation as closed since it's escalated
        }
      );

      // Step 5: Send email notification to system admin
      const emailSent = await this.sendEscalationEmail(ticket, request);

      // Step 6: Update ticket with email status
      await storage.updateSupportTicket(ticket.id, request.organizationId, {
        emailSent,
      });

      return {
        success: true,
        ticket,
        emailSent,
      };

    } catch (error) {
      console.error("Error processing escalation:", error);
      return {
        success: false,
        emailSent: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  /**
   * Send email notification to system administrator about escalation
   */
  private async sendEscalationEmail(ticket: SupportTicket, request: EscalationRequest): Promise<boolean> {
    try {
      // Get system admin email - in production this should come from organization settings
      const sysAdminEmail = process.env.SYSTEM_ADMIN_EMAIL || "admin@changeprime.com";
      const fromEmail = process.env.FROM_EMAIL || "support@changeprime.com";

      const emailHtml = this.createEscalationEmailHtml(ticket, request);
      const emailText = this.createEscalationEmailText(ticket, request);

      const emailResult = await sendEmail({
        to: sysAdminEmail,
        from: fromEmail,
        subject: `🚨 Helpdesk Escalation: ${ticket.title}`,
        text: emailText,
        html: emailHtml,
      });

      if (emailResult) {
        console.log(`Escalation email sent successfully for ticket ${ticket.id}`);
      } else {
        console.warn(`Failed to send escalation email for ticket ${ticket.id}`);
      }

      return emailResult;

    } catch (error) {
      console.error("Error sending escalation email:", error);
      return false;
    }
  }

  /**
   * Create HTML email template for escalation notifications
   */
  private createEscalationEmailHtml(ticket: SupportTicket, request: EscalationRequest): string {
    const priorityColors = {
      low: "#10B981",      // green
      medium: "#F59E0B",   // yellow  
      high: "#EF4444",     // red
      urgent: "#DC2626",   // dark red
    };

    const priorityColor = priorityColors[ticket.priority as keyof typeof priorityColors] || "#6B7280";

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Helpdesk Escalation Alert</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">🚨 Helpdesk Escalation</h1>
          <p style="color: #f0f0f0; margin: 10px 0 0 0;">Immediate Attention Required</p>
        </div>
        
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0;">
          <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid ${priorityColor};">
            <h2 style="color: #333; margin-top: 0; display: flex; align-items: center; gap: 10px;">
              ${ticket.title}
              <span style="background: ${priorityColor}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; text-transform: uppercase; font-weight: bold;">${ticket.priority}</span>
            </h2>
            
            <div style="margin: 20px 0;">
              <strong>Category:</strong> <span style="text-transform: capitalize;">${ticket.category}</span><br>
              <strong>Ticket ID:</strong> ${ticket.id}<br>
              <strong>User:</strong> ${request.userId}<br>
              <strong>Organization:</strong> ${request.organizationId}<br>
              <strong>Created:</strong> ${new Date(ticket.createdAt).toLocaleString()}
            </div>

            <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <strong>Description:</strong><br>
              <p style="margin: 10px 0 0 0;">${ticket.description}</p>
            </div>

            <div style="background: #fff3cd; padding: 15px; border-radius: 6px; border-left: 4px solid #ffc107;">
              <strong>Escalation Reason:</strong><br>
              <p style="margin: 10px 0 0 0;">${request.escalationReason}</p>
            </div>

            <div style="background: #e8f4fd; padding: 15px; border-radius: 6px; border-left: 4px solid #0ea5e9;">
              <strong>User's Original Message:</strong><br>
              <p style="margin: 10px 0 0 0; font-style: italic;">"${request.userMessage}"</p>
            </div>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="#" style="display: inline-block; background: #DC2626; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; font-size: 16px;">
              View Ticket in Admin Panel
            </a>
          </div>
          
          <p style="font-size: 14px; color: #666; text-align: center;">
            This escalation was automatically generated by the intelligent helpdesk system.<br>
            Please review and assign this ticket to the appropriate team member.
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
          <p>© ${new Date().getFullYear()} ChangePrime Support System. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Create plain text email for escalation notifications
   */
  private createEscalationEmailText(ticket: SupportTicket, request: EscalationRequest): string {
    return `
🚨 HELPDESK ESCALATION ALERT

Title: ${ticket.title}
Priority: ${ticket.priority.toUpperCase()}
Category: ${ticket.category}
Ticket ID: ${ticket.id}

User: ${request.userId}
Organization: ${request.organizationId}
Created: ${new Date(ticket.createdAt).toLocaleString()}

DESCRIPTION:
${ticket.description}

ESCALATION REASON:
${request.escalationReason}

USER'S ORIGINAL MESSAGE:
"${request.userMessage}"

This escalation was automatically generated by the intelligent helpdesk system.
Please review and assign this ticket to the appropriate team member.

---
ChangePrime Support System
    `;
  }

  /**
   * Get escalation confirmation message for users
   */
  getEscalationConfirmationMessage(category: string, reason: string): string {
    const messages = {
      technical: "This appears to be a technical issue that requires administrator assistance. Would you like me to create a support ticket and notify our technical team?",
      permissions: "This seems to be a permissions-related issue that may require administrator review. Should I escalate this to create a support ticket?",
      guidance: "Based on your request, you may benefit from personalized assistance from our support team. Would you like me to create a support ticket for further help?",
      escalation: "This issue requires immediate attention from our support team. I recommend creating a support ticket to ensure you get the specialized help you need. Proceed with escalation?",
    };

    const baseMessage = messages[category as keyof typeof messages] || messages.escalation;
    
    if (reason) {
      return `${baseMessage}\n\nReason for escalation: ${reason}`;
    }
    
    return baseMessage;
  }
}

// Export singleton instance
export const escalationService = new EscalationService();