import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Bot, Send, Lightbulb, MessageSquare, Clock, Minimize2, Maximize2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useCurrentProject } from "@/contexts/CurrentProjectContext";
import { Link } from "wouter";
import type { Project, Stakeholder, RaidLog } from "@shared/schema";

interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: string;
}

interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  timestamp: string;
}

export default function GptCoach() {
  const [customPrompt, setCustomPrompt] = useState<string>("");
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isChatMinimized, setIsChatMinimized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [chatSize, setChatSize] = useState({ width: 384, height: 384 }); // width in pixels, height in pixels
  const [lastExpandedSize, setLastExpandedSize] = useState({ width: 384, height: 384 });
  const chatWindowRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { currentProject } = useCurrentProject();

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const getCurrentChat = () => {
    if (!currentChatId) return null;
    return chatSessions.find(session => session.id === currentChatId) || null;
  };

  const createNewChat = (question: string) => {
    const newChatId = generateId();
    const newChat: ChatSession = {
      id: newChatId,
      title: question.length > 50 ? question.substring(0, 50) + '...' : question,
      messages: [],
      timestamp: new Date().toISOString()
    };
    setChatSessions(prev => [newChat, ...prev]);
    setCurrentChatId(newChatId);
    setIsChatOpen(true);
    setIsChatMinimized(false);
    return newChatId;
  };

  const handleSendMessage = async () => {
    if (!customPrompt.trim()) return;

    const messageText = customPrompt.trim();
    setCustomPrompt("");

    // Create or get current chat
    let chatId = currentChatId;
    if (!chatId) {
      chatId = createNewChat(messageText);
    }

    // Add user message
    const userMessage: ChatMessage = {
      id: generateId(),
      type: 'user',
      content: messageText,
      timestamp: new Date().toISOString()
    };

    setChatSessions(prev => prev.map(session => 
      session.id === chatId 
        ? { ...session, messages: [...session.messages, userMessage] }
        : session
    ));

    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const aiMessage: ChatMessage = {
        id: generateId(),
        type: 'ai',
        content: `I understand your question about "${messageText}". Based on best practices in change management, I recommend focusing on clear communication, stakeholder engagement, and measuring progress throughout your initiative. Would you like me to elaborate on any specific aspect?`,
        timestamp: new Date().toISOString()
      };

      setChatSessions(prev => prev.map(session => 
        session.id === chatId 
          ? { ...session, messages: [...session.messages, aiMessage] }
          : session
      ));

      setIsLoading(false);
    }, 1500);
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) {
      return "Just now";
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)}d ago`;
    }
  };

  const openChat = (chatId: string) => {
    setCurrentChatId(chatId);
    setIsChatOpen(true);
    setIsChatMinimized(false);
  };

  const closeChat = () => {
    setIsChatOpen(false);
    setCurrentChatId(null);
  };

  const minimizeChat = () => {
    if (!isChatMinimized) {
      setLastExpandedSize(chatSize);
    }
    setIsChatMinimized(true);
  };

  const maximizeChat = () => {
    setIsChatMinimized(false);
    setChatSize(lastExpandedSize);
  };

  // Sync state with user-driven resizes using ResizeObserver
  useEffect(() => {
    if (!chatWindowRef.current || isChatMinimized) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setChatSize({ width, height });
        if (!isChatMinimized) {
          setLastExpandedSize({ width, height });
        }
      }
    });

    resizeObserver.observe(chatWindowRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [isChatMinimized]);

  return (
    <div className="space-y-6" data-testid="gpt-coach-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground flex items-center space-x-2">
            <Bot className="w-6 h-6 text-accent" />
            <span>GPT Change Coach</span>
          </h1>
          <p className="text-sm text-muted-foreground">AI-powered guidance for your change management initiatives</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {/* Chat History */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="w-4 h-4" />
                <span>Recent Chats</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {chatSessions.length === 0 ? (
                <div className="text-center py-8" data-testid="no-chats">
                  <Bot className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No Chats Yet</h3>
                  <p className="text-sm text-muted-foreground">
                    Use the chat box below to start a conversation with the AI Coach.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {chatSessions.slice(0, 5).map((session) => (
                    <Card 
                      key={session.id} 
                      className="cursor-pointer hover:bg-muted/50 transition-colors" 
                      onClick={() => openChat(session.id)}
                      data-testid={`chat-history-${session.id}`}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start space-x-2">
                          <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Bot className="w-4 h-4 text-accent" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="text-sm font-medium text-foreground truncate">
                                {session.title}
                              </h4>
                              <span className="text-xs text-muted-foreground">
                                {formatTimestamp(session.timestamp)}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {session.messages.length} messages
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Tips Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Lightbulb className="w-4 h-4 text-accent" />
                <span>AI Tips</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="p-3 bg-accent/5 border border-accent/20 rounded-lg">
                  <p className="text-sm font-medium text-accent mb-1">Communication Tip</p>
                  <p className="text-sm text-foreground">
                    Regular pulse surveys help track sentiment changes. Consider weekly 2-question surveys for active projects.
                  </p>
                </div>
                <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                  <p className="text-sm font-medium text-primary mb-1">Stakeholder Tip</p>
                  <p className="text-sm text-foreground">
                    Focus extra attention on high-influence, resistant stakeholders. They can become powerful allies if engaged properly.
                  </p>
                </div>
                <div className="p-3 bg-secondary/5 border border-secondary/20 rounded-lg">
                  <p className="text-sm font-medium text-secondary mb-1">Progress Tip</p>
                  <p className="text-sm text-foreground">
                    Celebrate small wins publicly to build momentum and maintain morale throughout the change process.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Fixed Bottom Chat Input */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 z-10">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center space-x-4">
            <div className="flex-1 flex items-center space-x-2">
              <Input
                placeholder="Ask the AI Coach anything about change management..."
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                data-testid="input-custom-prompt"
                className="flex-1"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!customPrompt.trim() || isLoading}
                data-testid="button-send-message"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Chat Window */}
      {isChatOpen && getCurrentChat() && (
        <div 
          ref={chatWindowRef}
          className={`fixed bottom-20 right-4 bg-background border rounded-lg shadow-lg z-20 transition-all flex flex-col overflow-auto ${
            isChatMinimized ? 'resize-none' : 'resize'
          }`}
          style={{
            width: `${chatSize.width}px`,
            height: isChatMinimized ? '48px' : `${chatSize.height}px`,
            minWidth: '300px',
            minHeight: '200px',
            maxWidth: '600px',
            maxHeight: '500px'
          }}
          data-testid="floating-chat-window"
        >
          {/* Chat Header */}
          <div className="flex items-center justify-between p-3 border-b bg-muted/50 rounded-t-lg">
            <div className="flex items-center space-x-2">
              <Bot className="w-4 h-4 text-accent" />
              <h3 className="text-sm font-medium truncate">{getCurrentChat()?.title}</h3>
            </div>
            <div className="flex items-center space-x-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={isChatMinimized ? maximizeChat : minimizeChat}
                className="h-6 w-6 p-0"
                data-testid="button-toggle-chat-size"
              >
                {isChatMinimized ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={closeChat}
                className="h-6 w-6 p-0"
                data-testid="button-close-chat"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>

          {/* Chat Content */}
          {!isChatMinimized && (
            <div className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 p-3 overflow-y-auto space-y-3">
                {getCurrentChat()?.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.type === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[80%] p-3 rounded-lg text-sm ${
                        message.type === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-foreground'
                      }`}
                    >
                      <p>{message.content}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {formatTimestamp(message.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-muted text-foreground p-3 rounded-lg text-sm">
                      <div className="flex items-center space-x-2">
                        <div className="animate-pulse">Thinking...</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Padding for fixed bottom chat */}
      <div className="h-20"></div>
    </div>
  );
}
