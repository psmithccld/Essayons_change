import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Bot, Send, Lightbulb, ChartLine, AlertTriangle, Users, MessageSquare, FileText, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useCurrentProject } from "@/contexts/CurrentProjectContext";
import type { Project, Stakeholder, RaidLog } from "@shared/schema";

interface GPTResponse {
  type: string;
  content: any;
  timestamp: string;
}

const coachingPrompts = [
  {
    id: "communication",
    title: "Generate Communication Plan",
    description: "Create a comprehensive communication strategy for your change initiative",
    icon: MessageSquare,
    category: "Communication",
  },
  {
    id: "readiness",
    title: "Analyze Change Readiness",
    description: "Assess organizational readiness and get improvement recommendations",
    icon: ChartLine,
    category: "Assessment",
  },
  {
    id: "risks",
    title: "Risk Mitigation Strategies",
    description: "Get targeted strategies to mitigate project risks",
    icon: AlertTriangle,
    category: "Risk Management",
  },
  {
    id: "stakeholders",
    title: "Stakeholder Engagement Tips",
    description: "Personalized advice for engaging different stakeholder groups",
    icon: Users,
    category: "Stakeholder Management",
  },
];

export default function GptCoach() {
  const [activeTab, setActiveTab] = useState<string>("quick-actions");
  const [customPrompt, setCustomPrompt] = useState<string>("");
  const [responses, setResponses] = useState<GPTResponse[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentResponse, setCurrentResponse] = useState<any>(null);
  const { toast } = useToast();
  const { currentProject } = useCurrentProject();

  const { data: stakeholders = [] } = useQuery<Stakeholder[]>({
    queryKey: ['/api/projects', currentProject?.id, 'stakeholders'],
    enabled: !!currentProject?.id,
  });

  const { data: raidLogs = [] } = useQuery<RaidLog[]>({
    queryKey: ['/api/projects', currentProject?.id, 'raid-logs'],
    enabled: !!currentProject?.id,
  });

  const generateCommunicationPlanMutation = useMutation({
    mutationFn: async () => {
      if (!currentProject?.id) throw new Error("No project selected");

      const response = await apiRequest("POST", "/api/gpt/communication-plan", {
        projectId: currentProject.id,
        projectName: currentProject.name,
        description: currentProject.description || "",
        stakeholders: stakeholders.map(s => ({
          name: s.name,
          role: s.role,
          supportLevel: s.supportLevel,
          influenceLevel: s.influenceLevel,
        }))
      });
      return response.json();
    },
    onSuccess: (data) => {
      const newResponse = {
        type: "communication_plan",
        content: data,
        timestamp: new Date().toISOString(),
      };
      setResponses(prev => [newResponse, ...prev]);
      setCurrentResponse(data);
      setIsDialogOpen(true);
      toast({
        title: "Success",
        description: "Communication plan generated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate communication plan",
        variant: "destructive",
      });
    },
  });

  const analyzeReadinessMutation = useMutation({
    mutationFn: async () => {
      const mockSurveyData = {
        responses: [
          { questionId: "1", question: "How ready are you for this change?", answer: 3 },
          { questionId: "2", question: "Do you understand the benefits?", answer: "Somewhat" },
          { questionId: "3", question: "What concerns you most?", answer: "Training and support" },
        ],
        stakeholderData: stakeholders.map(s => ({
          supportLevel: s.supportLevel,
          engagementLevel: s.engagementLevel,
          role: s.role,
        }))
      };

      const response = await apiRequest("POST", "/api/gpt/readiness-analysis", {
        projectId: currentProject?.id,
        ...mockSurveyData
      });
      return response.json();
    },
    onSuccess: (data) => {
      const newResponse = {
        type: "readiness_analysis",
        content: data,
        timestamp: new Date().toISOString(),
      };
      setResponses(prev => [newResponse, ...prev]);
      setCurrentResponse(data);
      setIsDialogOpen(true);
      toast({
        title: "Success",
        description: "Readiness analysis completed successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to analyze readiness",
        variant: "destructive",
      });
    },
  });

  const riskMitigationMutation = useMutation({
    mutationFn: async () => {
      const risks = raidLogs.filter(log => log.type === 'risk').map(risk => ({
        title: risk.title,
        description: risk.description,
        severity: risk.severity,
        impact: risk.impact,
        probability: risk.probability || 'medium',
      }));

      const response = await apiRequest("POST", "/api/gpt/risk-mitigation", {
        projectId: currentProject?.id,
        risks
      });
      return response.json();
    },
    onSuccess: (data) => {
      const newResponse = {
        type: "risk_mitigation",
        content: data,
        timestamp: new Date().toISOString(),
      };
      setResponses(prev => [newResponse, ...prev]);
      setCurrentResponse(data);
      setIsDialogOpen(true);
      toast({
        title: "Success",
        description: "Risk mitigation strategies generated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate risk strategies",
        variant: "destructive",
      });
    },
  });

  const stakeholderTipsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/gpt/stakeholder-tips", {
        projectId: currentProject?.id,
        stakeholders: stakeholders.map(s => ({
          name: s.name,
          role: s.role,
          supportLevel: s.supportLevel,
          influenceLevel: s.influenceLevel,
          engagementLevel: s.engagementLevel,
        }))
      });
      return response.json();
    },
    onSuccess: (data) => {
      const newResponse = {
        type: "stakeholder_tips",
        content: data,
        timestamp: new Date().toISOString(),
      };
      setResponses(prev => [newResponse, ...prev]);
      setCurrentResponse(data);
      setIsDialogOpen(true);
      toast({
        title: "Success",
        description: "Stakeholder engagement tips generated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate stakeholder tips",
        variant: "destructive",
      });
    },
  });

  const handleQuickAction = (actionId: string) => {
    if (!currentProject?.id) {
      toast({
        title: "Project Required",
        description: "Please select a project first",
        variant: "destructive",
      });
      return;
    }

    switch (actionId) {
      case "communication":
        generateCommunicationPlanMutation.mutate();
        break;
      case "readiness":
        analyzeReadinessMutation.mutate();
        break;
      case "risks":
        riskMitigationMutation.mutate();
        break;
      case "stakeholders":
        stakeholderTipsMutation.mutate();
        break;
    }
  };

  const handleCustomPrompt = () => {
    if (!customPrompt.trim()) return;

    // For demo purposes, create a mock response
    const mockResponse = {
      type: "custom",
      content: {
        response: "I understand your question about change management. Based on best practices, I recommend focusing on clear communication, stakeholder engagement, and measuring progress throughout your initiative. Would you like me to elaborate on any specific aspect?"
      },
      timestamp: new Date().toISOString(),
    };
    
    setResponses(prev => [mockResponse, ...prev]);
    setCurrentResponse(mockResponse.content);
    setIsDialogOpen(true);
    setCustomPrompt("");
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)}d ago`;
    }
  };

  const getResponseIcon = (type: string) => {
    switch (type) {
      case "communication_plan": return <MessageSquare className="w-4 h-4" />;
      case "readiness_analysis": return <ChartLine className="w-4 h-4" />;
      case "risk_mitigation": return <AlertTriangle className="w-4 h-4" />;
      case "stakeholder_tips": return <Users className="w-4 h-4" />;
      default: return <Bot className="w-4 h-4" />;
    }
  };

  const getResponseTitle = (type: string) => {
    switch (type) {
      case "communication_plan": return "Communication Plan";
      case "readiness_analysis": return "Readiness Analysis";
      case "risk_mitigation": return "Risk Mitigation";
      case "stakeholder_tips": return "Stakeholder Tips";
      default: return "AI Response";
    }
  };

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


      {/* Main Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Actions & Prompt */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>AI Assistant</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList>
                  <TabsTrigger value="quick-actions" data-testid="tab-quick-actions">Quick Actions</TabsTrigger>
                  <TabsTrigger value="custom-prompt" data-testid="tab-custom-prompt">Custom Query</TabsTrigger>
                </TabsList>

                <TabsContent value="quick-actions" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {coachingPrompts.map((prompt) => {
                      const IconComponent = prompt.icon;
                      const isLoading = 
                        (prompt.id === "communication" && generateCommunicationPlanMutation.isPending) ||
                        (prompt.id === "readiness" && analyzeReadinessMutation.isPending) ||
                        (prompt.id === "risks" && riskMitigationMutation.isPending) ||
                        (prompt.id === "stakeholders" && stakeholderTipsMutation.isPending);

                      return (
                        <Card key={prompt.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-start space-x-3">
                              <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                <IconComponent className="w-5 h-5 text-accent" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-2">
                                  <h3 className="font-medium text-foreground">{prompt.title}</h3>
                                  <Badge variant="outline" className="text-xs">
                                    {prompt.category}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground mb-3">
                                  {prompt.description}
                                </p>
                                <Button
                                  size="sm"
                                  onClick={() => handleQuickAction(prompt.id)}
                                  disabled={!currentProject?.id || isLoading}
                                  data-testid={`button-${prompt.id}`}
                                >
                                  {isLoading ? "Generating..." : "Generate"}
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </TabsContent>

                <TabsContent value="custom-prompt" className="space-y-4">
                  <div className="space-y-4">
                    <Textarea
                      placeholder="Ask me anything about change management, stakeholder engagement, risk mitigation, or communication strategies..."
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      rows={4}
                      data-testid="input-custom-prompt"
                    />
                    <Button
                      onClick={handleCustomPrompt}
                      disabled={!customPrompt.trim()}
                      data-testid="button-send-prompt"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Ask AI Coach
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Response History */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="w-4 h-4" />
                <span>Recent Responses</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {responses.length === 0 ? (
                <div className="text-center py-8" data-testid="no-responses">
                  <Bot className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No AI Responses Yet</h3>
                  <p className="text-sm text-muted-foreground">
                    Start by selecting a project and using the quick actions or custom prompts.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {responses.slice(0, 5).map((response, index) => (
                    <Card key={index} className="cursor-pointer hover:bg-muted/50 transition-colors" data-testid={`response-${index}`}>
                      <CardContent className="p-3">
                        <div className="flex items-start space-x-2">
                          <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center flex-shrink-0">
                            {getResponseIcon(response.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="text-sm font-medium text-foreground truncate">
                                {getResponseTitle(response.type)}
                              </h4>
                              <span className="text-xs text-muted-foreground">
                                {formatTimestamp(response.timestamp)}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              AI-generated insights for your change initiative
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

      {/* Response Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Bot className="w-5 h-5 text-accent" />
              <span>AI Response</span>
            </DialogTitle>
          </DialogHeader>
          
          {currentResponse && (
            <div className="space-y-6">
              {currentResponse.strategy && (
                <div>
                  <h4 className="font-medium text-foreground mb-2">Communication Strategy</h4>
                  <p className="text-sm text-muted-foreground">{currentResponse.strategy}</p>
                </div>
              )}
              
              {currentResponse.overallScore && (
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4">
                    <span className="text-2xl font-bold text-primary">{currentResponse.overallScore}%</span>
                  </div>
                  <h3 className="text-lg font-semibold">Overall Readiness Score</h3>
                </div>
              )}
              
              {currentResponse.insights && (
                <div>
                  <h4 className="font-medium text-foreground mb-3">Key Insights</h4>
                  <div className="space-y-2">
                    {currentResponse.insights.map((insight: string, index: number) => (
                      <div key={index} className="flex items-start space-x-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                        <p className="text-sm">{insight}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {currentResponse.recommendations && (
                <div>
                  <h4 className="font-medium text-foreground mb-3">Recommendations</h4>
                  <div className="space-y-2">
                    {currentResponse.recommendations.map((rec: string, index: number) => (
                      <div key={index} className="flex items-start space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                        <p className="text-sm">{rec}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {currentResponse.response && (
                <div>
                  <h4 className="font-medium text-foreground mb-2">Response</h4>
                  <p className="text-sm text-muted-foreground">{currentResponse.response}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
