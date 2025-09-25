import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Rocket, Users, TrendingUp, AlertTriangle, 
  Bot, Lightbulb, ChartLine, ExternalLink,
  CheckCircle, Clock, AlertCircle, Link as LinkIcon,
  Edit2, Save, X
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import ChangeProcessFlow from "@/components/ChangeProcessFlow";

interface DashboardStats {
  activeProjects: number;
  totalTasks: number;
  completedTasks: number;
  openRisks: number;
  openIssues: number;
  stakeholderEngagement: number;
  changeReadiness: number;
}

interface UserDashboardMetrics {
  activeInitiatives: number;
  pendingSurveys: number;
  pendingTasks: number;
  openIssues: number;
  initiativesByPhase: Record<string, number>;
  filterType?: 'all' | 'assigned_only' | 'my_initiatives' | 'exclude_owned_only';
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  progress: number | null;
  priority: string;
  category: string | null;
  objectives: string | null;
  scope: string | null;
  successCriteria: string | null;
  currentPhase: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

interface UserInitiativeWithRole {
  project: Project;
  role: string;
  canEdit: boolean;
  assignedAt: string;
}



function getProjectStatusColor(status: string) {
  switch (status.toLowerCase()) {
    case 'active': return 'bg-secondary/10 text-secondary';
    case 'planning': return 'bg-accent/10 text-accent'; 
    case 'development': return 'bg-primary/10 text-primary';
    default: return 'bg-muted text-muted-foreground';
  }
}

export default function Dashboard() {
  const [editingProject, setEditingProject] = useState<string | null>(null);
  const [editData, setEditData] = useState<{ status: string; name: string }>({ status: '', name: '' });
  const [filterType, setFilterType] = useState<'all' | 'assigned_only' | 'my_initiatives' | 'exclude_owned_only'>('assigned_only');
  const { toast } = useToast();

  const { data: userMetrics, isLoading: isLoadingMetrics } = useQuery<UserDashboardMetrics>({
    queryKey: ['/api/my/dashboard-metrics', filterType],
    queryFn: async () => {
      const response = await fetch(`/api/my/dashboard-metrics?filterType=${filterType}`);
      if (!response.ok) throw new Error('Failed to fetch dashboard metrics');
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: userInitiatives, isLoading: isLoadingInitiatives } = useQuery<UserInitiativeWithRole[]>({
    queryKey: ['/api/my/initiatives'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const updateProjectMutation = useMutation({
    mutationFn: async ({ projectId, data }: { projectId: string; data: { name: string; status: string } }) => {
      return await apiRequest(`/api/projects/${projectId}`, 'PUT', data);
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['/api/my/initiatives'] });
      queryClient.invalidateQueries({ queryKey: ['/api/my/dashboard-metrics'] });
      toast({
        title: "Success",
        description: "Project updated successfully",
      });
      setEditingProject(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update project",
        variant: "destructive",
      });
    },
  });

  const handleEditClick = (project: Project) => {
    setEditingProject(project.id);
    setEditData({ status: project.status, name: project.name });
  };

  const handleSaveEdit = async (projectId: string) => {
    if (!editData.name.trim()) {
      toast({
        title: "Error",
        description: "Project name cannot be empty",
        variant: "destructive",
      });
      return;
    }

    updateProjectMutation.mutate({
      projectId,
      data: {
        name: editData.name.trim(),
        status: editData.status,
      },
    });
  };

  const handleCancelEdit = () => {
    setEditingProject(null);
    setEditData({ status: '', name: '' });
  };

  if (isLoadingMetrics) {
    return (
      <div className="space-y-6" data-testid="dashboard-loading">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-16 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="dashboard">
      {/* Key Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">My Active Initiatives</p>
                <p className="text-2xl font-bold text-foreground" data-testid="metric-my-active-initiatives">
                  {userMetrics?.activeInitiatives || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Rocket className="text-primary w-6 h-6" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-secondary font-medium">Assigned to you</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">My Pending Surveys</p>
                <p className="text-2xl font-bold text-foreground" data-testid="metric-my-pending-surveys">
                  {userMetrics?.pendingSurveys || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center">
                <CheckCircle className="text-secondary w-6 h-6" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-secondary font-medium">Awaiting response</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">My Pending Tasks</p>
                <p className="text-2xl font-bold text-foreground" data-testid="metric-my-pending-tasks">
                  {userMetrics?.pendingTasks || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                <Clock className="text-accent w-6 h-6" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-accent font-medium">Tasks assigned</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">My Open Issues</p>
                <p className="text-2xl font-bold text-foreground" data-testid="metric-my-open-issues">
                  {userMetrics?.openIssues || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-destructive/10 rounded-lg flex items-center justify-center">
                <AlertTriangle className="text-destructive w-6 h-6" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-destructive font-medium">Need attention</span>
            </div>
          </CardContent>
        </Card>

        {/* Change Process Flow - Spanning all 4 columns */}
        <Card className="col-span-1 md:col-span-2 lg:col-span-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex flex-col space-y-2">
                <CardTitle>Change Process Flow</CardTitle>
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-muted-foreground">Filter initiatives:</span>
                  <Select value={filterType} onValueChange={(value: 'all' | 'assigned_only' | 'my_initiatives' | 'exclude_owned_only') => setFilterType(value)} data-testid="select-filter-type">
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Select filter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="assigned_only">My Assigned Initiatives</SelectItem>
                      <SelectItem value="my_initiatives">Team Member Initiatives</SelectItem>
                      <SelectItem value="exclude_owned_only">Explicitly Assigned Only</SelectItem>
                      <SelectItem value="all">All Accessible Initiatives</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button variant="ghost" size="sm" data-testid="button-view-details" onClick={() => window.location.href = '/change-process-flow'}>
                View Details
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <ChangeProcessFlow initiativesByPhase={userMetrics?.initiativesByPhase} />
          </CardContent>
        </Card>
      </div>

      {/* Detailed Sections Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Initiatives */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>My Assigned Initiatives</CardTitle>
              <Button variant="ghost" size="sm" data-testid="button-manage-all">
                Manage All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingInitiatives ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Card key={i} className="border border-border animate-pulse">
                    <CardContent className="p-4">
                      <div className="h-4 bg-muted rounded mb-2"></div>
                      <div className="h-3 bg-muted rounded mb-3 w-3/4"></div>
                      <div className="h-2 bg-muted rounded"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {userInitiatives?.length ? (
                  userInitiatives.map((initiative) => (
                    <Card key={initiative.project.id} className="border border-border" data-testid={`project-${initiative.project.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          {editingProject === initiative.project.id ? (
                            <Input
                              value={editData.name}
                              onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                              className="h-6 font-medium"
                              data-testid={`input-project-name-${initiative.project.id}`}
                            />
                          ) : (
                            <h3 className="font-medium text-foreground">{initiative.project.name}</h3>
                          )}
                          <div className="flex items-center space-x-2">
                            {editingProject === initiative.project.id ? (
                              <Select 
                                value={editData.status} 
                                onValueChange={(value) => setEditData({ ...editData, status: value })}
                              >
                                <SelectTrigger className="w-32 h-6" data-testid={`select-status-${initiative.project.id}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="planning">Planning</SelectItem>
                                  <SelectItem value="active">Active</SelectItem>
                                  <SelectItem value="on_hold">On Hold</SelectItem>
                                  <SelectItem value="completed">Completed</SelectItem>
                                  <SelectItem value="cancelled">Cancelled</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <Badge className={getProjectStatusColor(initiative.project.status)}>
                                {initiative.project.status}
                              </Badge>
                            )}
                            {initiative.canEdit && (
                              <div className="flex items-center space-x-1">
                                {editingProject === initiative.project.id ? (
                                  <>
                                    <Button 
                                      size="sm" 
                                      variant="ghost" 
                                      onClick={() => handleSaveEdit(initiative.project.id)}
                                      disabled={updateProjectMutation.isPending}
                                      data-testid={`button-save-${initiative.project.id}`}
                                    >
                                      <Save className="w-3 h-3" />
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      variant="ghost" 
                                      onClick={handleCancelEdit}
                                      data-testid={`button-cancel-${initiative.project.id}`}
                                    >
                                      <X className="w-3 h-3" />
                                    </Button>
                                  </>
                                ) : (
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    onClick={() => handleEditClick(initiative.project)}
                                    data-testid={`button-edit-${initiative.project.id}`}
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-sm text-muted-foreground">{initiative.project.description || 'No description'}</p>
                          <Badge variant="outline" className="text-xs">
                            {initiative.role}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-xs text-muted-foreground">
                            Progress: {initiative.project.progress || 0}%
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Phase: {initiative.project.currentPhase || 'Not set'}
                          </div>
                        </div>
                        <Progress value={initiative.project.progress || 0} className="h-2" />
                        {initiative.project.endDate && (
                          <div className="text-xs text-muted-foreground mt-2">
                            Due: {new Date(initiative.project.endDate).toLocaleDateString()}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No initiatives assigned to you</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* GPT Change Coach */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>GPT Change Coach</CardTitle>
              <Bot className="text-accent w-5 h-5" />
            </div>
          </CardHeader>
          <CardContent>
            <Card className="bg-muted/30 mb-4">
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center flex-shrink-0">
                    <Bot className="text-accent-foreground w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-foreground mb-2">
                      <strong>AI Recommendation:</strong> Based on your stakeholder engagement data, consider implementing additional feedback sessions for the Digital Transformation initiative. Resistance indicators suggest more communication touchpoints are needed.
                    </p>
                    <div className="flex space-x-2">
                      <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90" data-testid="button-apply-recommendation">
                        Apply
                      </Button>
                      <Button variant="outline" size="sm" data-testid="button-dismiss-recommendation">
                        Dismiss
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <div className="space-y-3">
              {[
                { icon: Lightbulb, label: "Generate Communication Plan", testId: "generate-communication" },
                { icon: ChartLine, label: "Analyze Readiness Score", testId: "analyze-readiness" },
                { icon: AlertTriangle, label: "Risk Mitigation Strategies", testId: "risk-mitigation" },
                { icon: Users, label: "Stakeholder Engagement Tips", testId: "stakeholder-tips" }
              ].map((action, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className="w-full flex items-center justify-between p-3 h-auto hover:bg-muted/30"
                  data-testid={`button-${action.testId}`}
                >
                  <div className="flex items-center space-x-3">
                    <action.icon className="text-accent w-4 h-4" />
                    <span className="text-sm font-medium">{action.label}</span>
                  </div>
                  <ExternalLink className="text-muted-foreground w-3 h-3" />
                </Button>
              ))}
            </div>
            
            <Card className="mt-4 bg-accent/5 border border-accent/20">
              <CardContent className="p-3">
                <div className="flex items-center space-x-2 mb-2">
                  <Lightbulb className="text-accent w-4 h-4" />
                  <span className="text-sm font-medium text-accent">Quick Tip</span>
                </div>
                <p className="text-sm text-foreground">
                  Regular pulse surveys can help you track sentiment changes throughout your initiative. Consider scheduling weekly 2-question surveys for active projects.
                </p>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </div>

      {/* RAID Log Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>RAID Log Summary</CardTitle>
            <Button variant="ghost" size="sm" data-testid="button-view-full-logs">
              View Full Logs
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                title: "Risks",
                count: 0,
                detail: "3 High Priority",
                color: "destructive",
                icon: AlertTriangle
              },
              {
                title: "Actions", 
                count: 15,
                detail: "7 Due This Week",
                color: "accent",
                icon: CheckCircle
              },
              {
                title: "Issues",
                count: userMetrics?.openIssues || 0,
                detail: "2 Critical", 
                color: "primary",
                icon: AlertCircle
              },
              {
                title: "Deficiencies",
                count: 12,
                detail: "3 Blocked",
                color: "secondary",
                icon: LinkIcon
              }
            ].map((item, index) => (
              <Card key={index} className={`border border-${item.color}/20 bg-${item.color}/5`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className={`font-medium text-${item.color}`}>{item.title}</h3>
                    <item.icon className={`text-${item.color} w-5 h-5`} />
                  </div>
                  <div className={`text-2xl font-bold text-${item.color} mb-1`} data-testid={`raid-${item.title.toLowerCase()}-count`}>
                    {item.count}
                  </div>
                  <div className="text-xs text-muted-foreground">{item.detail}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
