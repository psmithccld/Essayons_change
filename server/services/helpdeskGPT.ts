import { openai } from '../openai';
import { generateContextAwareResponse } from '../vectorStore';
import { gptContextBuilder } from './gptContextBuilder';

interface HelpdeskGPTResponse {
  response: string;
  confidence: "high" | "medium" | "low";
  category: "technical" | "permissions" | "guidance" | "escalation";
  escalationRecommended: boolean;
  escalationReason?: string;
  relevantSources: string[];
  conversationId: string;
}

interface HelpdeskGPTRequest {
  message: string;
  conversationId: string;
  userId: string;
  organizationId: string;
  sessionId: string;
  conversationHistory?: Array<{
    role: "user" | "assistant" | "system";
    content: string;
    timestamp: string;
  }>;
}

class HelpdeskGPTService {
  private readonly SYSTEM_PROMPT = `You are an intelligent helpdesk assistant for a change management application. Your role is tier 1 technical support with READ-ONLY access to provide helpful guidance.

CORE PRINCIPLES:
- Always be helpful, professional, and solution-oriented
- Provide step-by-step troubleshooting guidance when possible
- Classify issues as technical, permissions, guidance, or escalation
- NEVER make system changes - you have read-only access only
- Always prompt before escalating to avoid unnecessary interruptions
- Use the provided context to give personalized responses

ESCALATION CRITERIA:
- Data corruption or loss issues
- Security breaches or permission violations  
- System errors that require code changes
- Database issues beyond user control
- Complex permission changes requiring admin access

RESPONSE STYLE:
- Be concise but thorough
- Use bullet points for multi-step instructions
- Reference specific UI elements when relevant
- Provide context-aware suggestions based on user's current state`;

  /**
   * Generate intelligent helpdesk response using combined context
   */
  async generateResponse(request: HelpdeskGPTRequest): Promise<HelpdeskGPTResponse> {
    try {
      // Step 1: Build comprehensive user context using Phase 3 service
      const userContext = await gptContextBuilder.buildContext(
        request.userId,
        request.organizationId,
        request.sessionId,
        {
          page: 'helpdesk-chat',
          userAgent: 'helpdesk-agent',
          errorContext: request.message,
          userAction: 'support-request'
        }
      );

      // Step 2: Get relevant knowledge base context using vector store
      const knowledgeResponse = await generateContextAwareResponse(
        request.message,
        this.SYSTEM_PROMPT
      );

      // Step 3: Build comprehensive prompt with all context
      const conversationContext = this.buildConversationContext(request.conversationHistory || []);
      const formattedUserContext = gptContextBuilder.formatContextForGPT(userContext);

      const comprehensivePrompt = `${this.SYSTEM_PROMPT}

=== USER CONTEXT ===
${formattedUserContext}

=== KNOWLEDGE BASE CONTEXT ===
${knowledgeResponse.context}

=== CONVERSATION HISTORY ===
${conversationContext}

=== CURRENT USER MESSAGE ===
${request.message}

=== INSTRUCTIONS ===
Analyze the user's message in context of their current situation. Provide a helpful response and classify this interaction.

Return your response in this exact JSON format:
{
  "response": "Your helpful response to the user",
  "confidence": "high|medium|low",
  "category": "technical|permissions|guidance|escalation", 
  "escalationRecommended": boolean,
  "escalationReason": "reason if escalation recommended, null otherwise"
}`;

      // Step 4: Generate intelligent response
      const gptResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: comprehensivePrompt }],
        response_format: { type: "json_object" },
        temperature: 0.7,
      });

      const parsedResponse = JSON.parse(gptResponse.choices[0].message.content || '{}');

      return {
        response: parsedResponse.response || "I'm here to help! Could you provide more details about what you're experiencing?",
        confidence: parsedResponse.confidence || "medium",
        category: parsedResponse.category || "guidance", 
        escalationRecommended: parsedResponse.escalationRecommended || false,
        escalationReason: parsedResponse.escalationReason || undefined,
        relevantSources: knowledgeResponse.relevantSources,
        conversationId: request.conversationId,
      };

    } catch (error) {
      console.error("Error generating helpdesk response:", error);
      
      // Fallback response
      return {
        response: "I'm experiencing a temporary issue. Please try rephrasing your question, or I can escalate this to our technical team for assistance.",
        confidence: "low",
        category: "technical",
        escalationRecommended: true,
        escalationReason: "GPT service unavailable",
        relevantSources: [],
        conversationId: request.conversationId,
      };
    }
  }

  /**
   * Build conversation context from message history
   */
  private buildConversationContext(history: Array<{ role: string; content: string; timestamp: string }>): string {
    if (history.length === 0) {
      return "This is the start of a new conversation.";
    }

    const recentHistory = history.slice(-6); // Last 6 messages for context
    return recentHistory
      .map(msg => `${msg.role.toUpperCase()}: ${msg.content}`)
      .join('\n');
  }

  /**
   * Determine if user question suggests need for escalation based on keywords
   */
  private detectEscalationKeywords(message: string): boolean {
    const escalationKeywords = [
      'broken', 'error', 'bug', 'crash', 'corrupted', 'lost data',
      'security', 'hack', 'breach', 'unauthorized', 'permission denied',
      'database', 'server', 'admin', 'critical', 'urgent'
    ];

    const lowerMessage = message.toLowerCase();
    return escalationKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  /**
   * Generate escalation summary for support tickets
   */
  async generateEscalationSummary(request: HelpdeskGPTRequest, helpdeskResponse: HelpdeskGPTResponse): Promise<{
    title: string;
    description: string;
    priority: "low" | "medium" | "high" | "urgent";
  }> {
    const prompt = `Based on this helpdesk conversation, generate an escalation summary:

User Message: ${request.message}
Assistant Response: ${helpdeskResponse.response}
Category: ${helpdeskResponse.category}
Escalation Reason: ${helpdeskResponse.escalationReason}

Generate a concise escalation ticket with:
{
  "title": "Brief title (max 60 chars)",
  "description": "Clear description for technical team", 
  "priority": "low|medium|high|urgent"
}`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.5,
      });

      return JSON.parse(response.choices[0].message.content || '{}');
    } catch (error) {
      console.error("Error generating escalation summary:", error);
      return {
        title: "Helpdesk Escalation Required",
        description: `User Issue: ${request.message.substring(0, 200)}...`,
        priority: "medium"
      };
    }
  }
}

// Export singleton instance
export const helpdeskGPT = new HelpdeskGPTService();