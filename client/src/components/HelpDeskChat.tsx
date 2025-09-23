import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, Bot, User, X, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface HelpDeskChatProps {
  isOpen: boolean;
  onClose: () => void;
}

// Use shared types from backend schema
interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string; // API returns ISO string, not Date object
}

interface SupportConversation {
  id: string;
  userId: string;
  organizationId: string;
  sessionId: string;
  title?: string;
  status: "active" | "resolved" | "escalated";
  priority: "low" | "medium" | "high" | "urgent";
  category?: string;
  messages: Message[];
  createdAt: string; // API returns ISO string
  updatedAt: string; // API returns ISO string
}

const messageSchema = z.object({
  message: z.string().min(1, "Message cannot be empty").max(1000, "Message too long"),
});

type MessageForm = z.infer<typeof messageSchema>;

export function HelpDeskChat({ isOpen, onClose }: HelpDeskChatProps) {
  const [isTyping, setIsTyping] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<MessageForm>({
    resolver: zodResolver(messageSchema),
    defaultValues: {
      message: "",
    },
  });

  // Ensure we have a session ID
  const getOrCreateSessionId = () => {
    let sessionId = sessionStorage.getItem("sessionId");
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      sessionStorage.setItem("sessionId", sessionId);
    }
    return sessionId;
  };

  const sessionId = getOrCreateSessionId();

  // Get existing conversation by session
  const { data: existingConversation, isLoading: loadingConversation } = useQuery({
    queryKey: ["/api/helpdesk/conversations/session", sessionId],
    queryFn: async () => {
      const response = await fetch(`/api/helpdesk/conversations/session/${sessionId}`, {
        credentials: "include",
      });
      
      if (response.status === 404) {
        return null; // No existing conversation
      }
      
      if (!response.ok) {
        throw new Error(`Failed to fetch conversation: ${response.statusText}`);
      }
      
      return await response.json();
    },
    enabled: isOpen && !!sessionId,
  });

  // Get conversation messages if we have a conversation ID
  const { data: conversation, isLoading: loadingMessages } = useQuery<SupportConversation>({
    queryKey: ["/api/helpdesk/conversations", conversationId],
    enabled: !!conversationId,
  });

  // Create new conversation mutation
  const createConversationMutation = useMutation({
    mutationFn: async (data: { title: string }): Promise<SupportConversation> => {
      const response = await apiRequest("POST", "/api/helpdesk/conversations", {
        title: data.title,
        status: "active",
        priority: "medium",
        category: "general",
        sessionId: sessionId, // Include sessionId for proper backend linking
        messages: [],
      });
      return await response.json();
    },
    onSuccess: (newConversation: SupportConversation) => {
      setConversationId(newConversation.id);
      // Invalidate both conversation list and the specific conversation
      queryClient.invalidateQueries({ queryKey: ["/api/helpdesk/conversations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/helpdesk/conversations", newConversation.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/helpdesk/conversations/session", sessionId] });
    },
    onError: (error) => {
      console.error("Failed to create conversation:", error);
      toast({
        title: "Error",
        description: "Failed to start conversation. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Add message to conversation mutation
  const addMessageMutation = useMutation({
    mutationFn: async (data: { conversationId: string; role: string; content: string }): Promise<SupportConversation> => {
      const response = await apiRequest("POST", `/api/helpdesk/conversations/${data.conversationId}/messages`, {
        role: data.role,
        content: data.content,
      });
      return await response.json();
    },
    onSuccess: (data, variables) => {
      // Invalidate using mutation variables to avoid stale state
      queryClient.invalidateQueries({ queryKey: ["/api/helpdesk/conversations", variables.conversationId] });
      form.reset();
      scrollToBottom();
    },
    onError: (error) => {
      console.error("Failed to send message:", error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const onSubmit = async (data: MessageForm) => {
    const messageContent = data.message;
    
    if (!conversationId) {
      // Create conversation first, then send the message
      try {
        const newConversation = await createConversationMutation.mutateAsync({
          title: messageContent.substring(0, 50) + "...",
        });
        
        // Send the original message to the new conversation
        await addMessageMutation.mutateAsync({
          conversationId: newConversation.id,
          role: "user",
          content: messageContent,
        });
        
        // Simulate GPT typing for first message consistency
        setIsTyping(true);
        setTimeout(async () => {
          setIsTyping(false);
          
          // Add assistant response (mock for now)
          await addMessageMutation.mutateAsync({
            conversationId: newConversation.id,
            role: "assistant",
            content: "Thank you for contacting support! I'm analyzing your request and will provide assistance shortly. This is a placeholder response - GPT integration will be implemented in Phase 5.",
          });
        }, 2000);
        
        return;
      } catch (error) {
        console.error("Failed to create conversation and send message:", error);
        return;
      }
    }

    // Add user message to existing conversation
    await addMessageMutation.mutateAsync({
      conversationId,
      role: "user",
      content: messageContent,
    });

    // Simulate GPT typing
    setIsTyping(true);
    
    // TODO: Phase 5 - Add actual GPT integration here
    setTimeout(async () => {
      setIsTyping(false);
      
      // Add assistant response (mock for now)
      await addMessageMutation.mutateAsync({
        conversationId,
        role: "assistant",
        content: "Thank you for your message. I'm analyzing your issue and will provide assistance shortly. This is a placeholder response - GPT integration will be implemented in Phase 5.",
      });
    }, 2000);
  };

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  };

  // Set conversation ID from existing conversation
  useEffect(() => {
    if (existingConversation && typeof existingConversation === 'object' && 'id' in existingConversation) {
      setConversationId(existingConversation.id as string);
    }
  }, [existingConversation]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (conversation?.messages) {
      setTimeout(scrollToBottom, 100);
    }
  }, [conversation?.messages]);

  const messages = conversation?.messages || [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md w-full h-[600px] flex flex-col p-0" data-testid="dialog-helpdesk-chat">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                <Bot className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold">Support Assistant</DialogTitle>
                <p className="text-sm text-muted-foreground">
                  {conversation?.status === "active" ? "Online" : "Ready to help"}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {conversation && (
                <Badge variant={conversation.priority === "high" || conversation.priority === "urgent" ? "destructive" : "secondary"}>
                  {conversation.priority}
                </Badge>
              )}
              <DialogClose asChild>
                <Button variant="ghost" size="sm" data-testid="button-helpdesk-close">
                  <X className="h-4 w-4" />
                </Button>
              </DialogClose>
            </div>
          </div>
        </DialogHeader>

        {/* Messages Area */}
        <ScrollArea ref={scrollAreaRef} className="flex-1 px-6 py-4" data-testid="scroll-helpdesk-messages">
          {loadingConversation || loadingMessages ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center">
              <Bot className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-medium text-lg mb-2">Welcome to Support</h3>
              <p className="text-sm text-muted-foreground">
                Hi! I'm your AI support assistant. How can I help you today?
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                  data-testid={`message-${message.role}-${index}`}
                >
                  <div className={`flex max-w-[80%] ${
                    message.role === "user" ? "flex-row-reverse" : "flex-row"
                  }`}>
                    <Avatar className="w-8 h-8 mt-1">
                      <AvatarFallback>
                        {message.role === "user" ? (
                          <User className="h-4 w-4" />
                        ) : message.role === "assistant" ? (
                          <Bot className="h-4 w-4" />
                        ) : (
                          <AlertCircle className="h-4 w-4" />
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`mx-3 ${
                      message.role === "user" ? "text-right" : "text-left"
                    }`}>
                      <div className={`inline-block p-3 rounded-lg ${
                        message.role === "user" 
                          ? "bg-blue-600 text-white" 
                          : message.role === "assistant"
                          ? "bg-muted" 
                          : "bg-yellow-100 dark:bg-yellow-900"
                      }`}>
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Typing Indicator */}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="flex">
                    <Avatar className="w-8 h-8 mt-1">
                      <AvatarFallback>
                        <Bot className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="mx-3">
                      <div className="inline-block p-3 rounded-lg bg-muted">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 rounded-full bg-current animate-bounce [animation-delay:0ms]" />
                          <div className="w-2 h-2 rounded-full bg-current animate-bounce [animation-delay:150ms]" />
                          <div className="w-2 h-2 rounded-full bg-current animate-bounce [animation-delay:300ms]" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Input Area */}
        <div className="px-6 py-4 border-t">
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex space-x-2">
            <Input
              {...form.register("message")}
              placeholder="Type your message..."
              className="flex-1"
              disabled={addMessageMutation.isPending || createConversationMutation.isPending}
              data-testid="input-helpdesk-message"
            />
            <Button
              type="submit"
              size="sm"
              disabled={!form.watch("message") || addMessageMutation.isPending || createConversationMutation.isPending}
              data-testid="button-helpdesk-send"
            >
              {addMessageMutation.isPending || createConversationMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
          {form.formState.errors.message && (
            <p className="text-sm text-red-500 mt-1">{form.formState.errors.message.message}</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}