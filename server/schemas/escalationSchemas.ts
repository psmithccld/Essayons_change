import { z } from "zod";

// Escalation request validation schema
export const escalationRequestSchema = z.object({
  conversationId: z.string().uuid("Invalid conversation ID format"),
  userMessage: z.string().min(1, "User message is required").max(2000, "User message too long"),
  assistantResponse: z.string().min(1, "Assistant response is required").max(5000, "Assistant response too long"),
  escalationReason: z.string().optional(),
  category: z.enum(["technical", "permissions", "guidance", "escalation"], {
    errorMap: () => ({ message: "Category must be one of: technical, permissions, guidance, escalation" })
  }).optional().default("guidance"),
  priority: z.enum(["low", "medium", "high", "urgent"], {
    errorMap: () => ({ message: "Priority must be one of: low, medium, high, urgent" })
  }).optional().default("medium"),
  userConfirmed: z.boolean().refine(val => val === true, {
    message: "User confirmation is required for escalation"
  })
});

export type EscalationRequest = z.infer<typeof escalationRequestSchema>;