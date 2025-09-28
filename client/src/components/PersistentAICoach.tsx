import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot, Send, Minimize2, Maximize2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCurrentProject } from "@/contexts/CurrentProjectContext";

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

export default function PersistentAICoach() {
  const [customPrompt, setCustomPrompt] = useState<string>("");
  const [chatSessions, setChatSessions] = useState<ChatSession[]>(() => {
    // Load chat sessions from localStorage on init
    try {
      const saved = localStorage.getItem('persistentAICoach-chatSessions');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('Failed to load chat sessions from localStorage:', error);
      return [];
    }
  });
  const [currentChatId, setCurrentChatId] = useState<string | null>(() => {
    // Load current chat ID from localStorage on init
    try {
      return localStorage.getItem('persistentAICoach-currentChatId') || null;
    } catch (error) {
      console.error('Failed to load current chat ID from localStorage:', error);
      return null;
    }
  });
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isChatMinimized, setIsChatMinimized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [chatSize, setChatSize] = useState({ width: 384, height: 384 });
  const [lastExpandedSize, setLastExpandedSize] = useState({ width: 384, height: 384 });
  const chatWindowRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { currentProject } = useCurrentProject();

  // Save chat sessions to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('persistentAICoach-chatSessions', JSON.stringify(chatSessions));
    } catch (error) {
      console.error('Failed to save chat sessions to localStorage:', error);
    }
  }, [chatSessions]);

  // Save current chat ID to localStorage whenever it changes
  useEffect(() => {
    try {
      if (currentChatId) {
        localStorage.setItem('persistentAICoach-currentChatId', currentChatId);
      } else {
        localStorage.removeItem('persistentAICoach-currentChatId');
      }
    } catch (error) {
      console.error('Failed to save current chat ID to localStorage:', error);
    }
  }, [currentChatId]);

  // Restore chat window state if there's a current chat
  useEffect(() => {
    if (currentChatId && getCurrentChat()) {
      setIsChatOpen(true);
    }
  }, [currentChatId]);

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

  return (
    <>
      {/* Fixed Bottom Chat Input */}
      <div className="fixed bottom-0 left-0 md:left-64 right-0 bg-background border-t p-4 z-10">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center space-x-4">
            <div className="flex-1 flex items-center space-x-2">
              <Input
                placeholder="Ask the AI Coach anything about change management..."
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                data-testid="input-persistent-chat"
                className="flex-1"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!customPrompt.trim() || isLoading}
                data-testid="button-send-persistent-message"
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
                data-testid="button-toggle-persistent-chat-size"
              >
                {isChatMinimized ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={closeChat}
                className="h-6 w-6 p-0"
                data-testid="button-close-persistent-chat"
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
    </>
  );
}