import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Rocket, Users, TrendingUp, AlertTriangle, 
  Bot, Lightbulb, ChartLine, ExternalLink,
  CheckCircle, Clock, AlertCircle, Link as LinkIcon
} from "lucide-react";
import changeProcessFlowImage from "@assets/image_1757964076529.png";

interface DashboardStats {
  activeProjects: number;
  totalTasks: number;
  completedTasks: number;
  openRisks: number;
  openIssues: number;
  stakeholderEngagement: number;
  changeReadiness: number;
}

interface Activity {
  id: string;
  type: 'survey' | 'communication' | 'risk' | 'issue';
  title: string;
  project: string;
  timeAgo: string;
}

const mockActivities: Activity[] = [
  {
    id: '1',
    type: 'survey',
    title: 'Stakeholder survey completed',
    project: 'Digital Transformation Initiative',
    timeAgo: '2 hours ago'
  },
  {
    id: '2', 
    type: 'communication',
    title: 'Communication plan updated',
    project: 'Office Relocation Project',
    timeAgo: '5 hours ago'
  },
  {
    id: '3',
    type: 'risk',
    title: 'Risk assessment created',
    project: 'ERP Implementation',
    timeAgo: '1 day ago'
  },
  {
    id: '4',
    type: 'issue',
    title: 'Issue escalated',
    project: 'Process Optimization',
    timeAgo: '2 days ago'
  }
];

const mockProjects = [
  {
    id: '1',
    name: 'Digital Transformation',
    description: 'Modernizing customer service processes and tools',
    progress: 68,
    status: 'Active',
    dueDate: 'Mar 15, 2024'
  },
  {
    id: '2',
    name: 'Office Relocation', 
    description: 'Moving headquarters to new downtown location',
    progress: 25,
    status: 'Planning',
    dueDate: 'Jun 30, 2024'
  },
  {
    id: '3',
    name: 'ERP Implementation',
    description: 'Implementing new enterprise resource planning system',
    progress: 42,
    status: 'Development',
    dueDate: 'Sep 15, 2024'
  }
];

function getActivityIcon(type: Activity['type']) {
  switch (type) {
    case 'survey': return <CheckCircle className="w-2 h-2 text-secondary" />;
    case 'communication': return <Clock className="w-2 h-2 text-accent" />;
    case 'risk': return <AlertCircle className="w-2 h-2 text-primary" />;
    case 'issue': return <AlertTriangle className="w-2 h-2 text-destructive" />;
    default: return <Clock className="w-2 h-2 text-muted-foreground" />;
  }
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
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['/api/dashboard/stats'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  if (isLoading) {
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
                <p className="text-sm font-medium text-muted-foreground">Active Initiatives</p>
                <p className="text-2xl font-bold text-foreground" data-testid="metric-active-projects">
                  {stats?.activeProjects || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Rocket className="text-primary w-6 h-6" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-secondary font-medium">+15%</span>
              <span className="text-muted-foreground ml-1">from last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Stakeholder Engagement</p>
                <p className="text-2xl font-bold text-foreground" data-testid="metric-stakeholder-engagement">
                  {stats?.stakeholderEngagement || 0}%
                </p>
              </div>
              <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center">
                <Users className="text-secondary w-6 h-6" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-secondary font-medium">+3%</span>
              <span className="text-muted-foreground ml-1">engagement rate</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Change Readiness</p>
                <p className="text-2xl font-bold text-foreground" data-testid="metric-change-readiness">
                  {stats?.changeReadiness || 0}%
                </p>
              </div>
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                <TrendingUp className="text-accent w-6 h-6" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-accent font-medium">+8%</span>
              <span className="text-muted-foreground ml-1">readiness score</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Open Issues</p>
                <p className="text-2xl font-bold text-foreground" data-testid="metric-open-issues">
                  {(stats?.openRisks || 0) + (stats?.openIssues || 0)}
                </p>
              </div>
              <div className="w-12 h-12 bg-destructive/10 rounded-lg flex items-center justify-center">
                <AlertTriangle className="text-destructive w-6 h-6" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-destructive font-medium">-12%</span>
              <span className="text-muted-foreground ml-1">from last week</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Change Model Visualization */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Change Process Flow</CardTitle>
              <Button variant="ghost" size="sm" data-testid="button-view-details">
                View Details
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center p-4">
              <img 
                src={changeProcessFlowImage} 
                alt="Change Process Flow - Organizational Actions and Individual Actions" 
                className="w-full max-w-4xl h-auto"
                data-testid="change-process-flow-image"
              />
            </div>
          </CardContent>
        </Card>

        {/* Recent Activities */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockActivities.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3" data-testid={`activity-${activity.id}`}>
                  {getActivityIcon(activity.type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{activity.title}</p>
                    <p className="text-xs text-muted-foreground">{activity.project}</p>
                    <p className="text-xs text-muted-foreground">{activity.timeAgo}</p>
                  </div>
                </div>
              ))}
            </div>
            
            <Button variant="ghost" className="w-full mt-4" data-testid="button-view-all-activities">
              View All Activities
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Sections Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Initiatives */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Active Initiatives</CardTitle>
              <Button variant="ghost" size="sm" data-testid="button-manage-all">
                Manage All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockProjects.map((project) => (
                <Card key={project.id} className="border border-border" data-testid={`project-${project.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-foreground">{project.name}</h3>
                      <Badge className={getProjectStatusColor(project.status)}>
                        {project.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{project.description}</p>
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs text-muted-foreground">Progress: {project.progress}%</div>
                      <div className="text-xs text-muted-foreground">Due: {project.dueDate}</div>
                    </div>
                    <Progress value={project.progress} className="h-2" />
                  </CardContent>
                </Card>
              ))}
            </div>
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
                count: stats?.openRisks || 0,
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
                count: stats?.openIssues || 0,
                detail: "2 Critical", 
                color: "primary",
                icon: AlertCircle
              },
              {
                title: "Dependencies",
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
