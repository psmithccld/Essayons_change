import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, Lightbulb, Clock } from "lucide-react";
import { FeatureGate } from "@/components/auth/FeatureGate";

interface ChatSession {
  id: string;
  title: string;
  messages: any[];
  timestamp: string;
}

export default function GptCoach() {
  // Mock data for Recent Chats display
  const [chatSessions] = useState<ChatSession[]>([]);

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


  return (
    <FeatureGate feature="gptCoach" redirectTo="/">
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl mx-auto">
        {/* Recent Chats */}
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
                    className="hover:bg-muted/50 transition-colors" 
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
    </FeatureGate>
  );
}
