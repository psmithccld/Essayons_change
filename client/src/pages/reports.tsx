import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from "recharts";
import {
  Users,
  CheckSquare,
  AlertTriangle,
  UserCheck,
  TrendingUp,
  Download,
  Filter,
  Calendar,
  Search,
  RefreshCw,
  BarChart3,
  PieChart as PieChartIcon,
  FileText,
  Target
} from "lucide-react";
import { format } from "date-fns";

// Define interfaces for all report data types
interface UserLoginActivity {
  userId: string;
  username: string;
  name: string;
  roleName: string;
  lastLoginAt: Date | null;
  loginFrequency: number;
  isActive: boolean;
  daysSinceLastLogin: number | null;
  totalLogins: number;
}

interface RoleAssignment {
  roleId: string;
  roleName: string;
  description: string;
  userCount: number;
  users: Array<{
    userId: string;
    username: string;
    name: string;
    assignedAt: Date;
  }>;
  permissions: any;
}

interface InitiativeParticipation {
  userId: string;
  username: string;
  name: string;
  roleName: string;
  initiativeCount: number;
  workloadScore: number;
  initiatives: Array<{
    projectId: string;
    projectName: string;
    role: string;
    assignedAt: Date;
    status: string;
    priority: string;
  }>;
}

interface TaskStatus {
  taskId: string;
  name: string;
  projectId: string;
  projectName: string;
  status: string;
  priority: string;
  assigneeId: string | null;
  assigneeName: string | null;
  assigneeEmail: string | null;
  dueDate: Date | null;
  progress: number;
  createdAt: Date;
  overdue: boolean;
  daysOverdue: number | null;
}

interface RAIDItem {
  raidId: string;
  title: string;
  type: string;
  projectId: string;
  projectName: string;
  severity: string;
  impact: string;
  status: string;
  ownerName: string;
  assigneeName: string | null;
  dueDate: Date | null;
  createdAt: Date;
  daysOpen: number;
  overdue: boolean;
}

interface StakeholderDirectory {
  stakeholderId: string;
  name: string;
  role: string;
  department: string | null;
  email: string | null;
  phone: string | null;
  projectId: string;
  projectName: string;
  influenceLevel: string;
  supportLevel: string;
  engagementLevel: string;
  communicationPreference: string | null;
  lastContactDate: Date | null;
  totalCommunications: number;
}

// Color scheme for consistent branding
const ESSAYONS_COLORS = {
  primary: "#8B0000", // Deep Essayons Red
  secondary: "#B22222", // Lighter red
  accent: "#DC143C", // Crimson
  neutral: "#6B7280", // Gray
  success: "#10B981", // Green
  warning: "#F59E0B", // Amber
  error: "#EF4444", // Red
};

const CHART_COLORS = [
  ESSAYONS_COLORS.primary,
  ESSAYONS_COLORS.secondary,
  ESSAYONS_COLORS.accent,
  ESSAYONS_COLORS.success,
  ESSAYONS_COLORS.warning,
  ESSAYONS_COLORS.neutral,
];

// User Reports Components
function UserReportsTab() {
  const [activeReport, setActiveReport] = useState<'login-activity' | 'role-assignment' | 'initiatives-participation'>('login-activity');
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    sortBy: 'name',
    sortOrder: 'asc' as 'asc' | 'desc'
  });

  const { data: loginActivityData, isLoading: loginActivityLoading } = useQuery({
    queryKey: ['reports', 'users', 'login-activity', filters],
    queryFn: async () => {
      const response = await fetch('/api/reports/users/login-activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filters)
      });
      if (!response.ok) throw new Error('Failed to fetch login activity report');
      return response.json() as Promise<UserLoginActivity[]>;
    },
    enabled: activeReport === 'login-activity'
  });

  const { data: roleAssignmentData, isLoading: roleAssignmentLoading } = useQuery({
    queryKey: ['reports', 'users', 'role-assignment', filters],
    queryFn: async () => {
      const response = await fetch('/api/reports/users/role-assignment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filters)
      });
      if (!response.ok) throw new Error('Failed to fetch role assignment report');
      return response.json() as Promise<RoleAssignment[]>;
    },
    enabled: activeReport === 'role-assignment'
  });

  const { data: initiativesData, isLoading: initiativesLoading } = useQuery({
    queryKey: ['reports', 'users', 'initiatives-participation', filters],
    queryFn: async () => {
      const response = await fetch('/api/reports/users/initiatives-participation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filters)
      });
      if (!response.ok) throw new Error('Failed to fetch initiatives participation report');
      return response.json() as Promise<InitiativeParticipation[]>;
    },
    enabled: activeReport === 'initiatives-participation'
  });

  const exportReport = () => {
    // Implementation for CSV/PDF export
    console.log(`Exporting ${activeReport} report`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant={activeReport === 'login-activity' ? 'default' : 'outline'}
            onClick={() => setActiveReport('login-activity')}
            data-testid="button-login-activity-report"
          >
            <Users className="h-4 w-4 mr-2" />
            Login Activity
          </Button>
          <Button
            variant={activeReport === 'role-assignment' ? 'default' : 'outline'}
            onClick={() => setActiveReport('role-assignment')}
            data-testid="button-role-assignment-report"
          >
            <UserCheck className="h-4 w-4 mr-2" />
            Role Assignment
          </Button>
          <Button
            variant={activeReport === 'initiatives-participation' ? 'default' : 'outline'}
            onClick={() => setActiveReport('initiatives-participation')}
            data-testid="button-initiatives-participation-report"
          >
            <Target className="h-4 w-4 mr-2" />
            Initiative Participation
          </Button>
        </div>
        <div className="flex gap-2">
          <Select value={filters.sortBy} onValueChange={(value) => setFilters({...filters, sortBy: value})}>
            <SelectTrigger className="w-40" data-testid="select-sort-by">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="lastLogin">Last Login</SelectItem>
              <SelectItem value="loginFrequency">Login Frequency</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exportReport} variant="outline" data-testid="button-export-user-report">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {activeReport === 'login-activity' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" style={{ color: ESSAYONS_COLORS.primary }} />
              User Login Activity Report
            </CardTitle>
            <CardDescription>
              Track user login patterns, frequency, and inactive accounts across the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loginActivityLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <Table data-testid="table-login-activity">
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead>Days Since Login</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Total Logins</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loginActivityData?.map((user) => (
                    <TableRow key={user.userId} data-testid={`row-user-${user.userId}`}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.username}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{user.roleName}</Badge>
                      </TableCell>
                      <TableCell>
                        {user.lastLoginAt ? format(new Date(user.lastLoginAt), 'PPp') : 'Never'}
                      </TableCell>
                      <TableCell>
                        {user.daysSinceLastLogin !== null ? `${user.daysSinceLastLogin} days` : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={user.isActive ? 'default' : 'destructive'}
                          style={{ backgroundColor: user.isActive ? ESSAYONS_COLORS.success : ESSAYONS_COLORS.error }}
                        >
                          {user.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>{user.totalLogins}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {activeReport === 'role-assignment' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" style={{ color: ESSAYONS_COLORS.primary }} />
              Role Assignment Report
            </CardTitle>
            <CardDescription>
              Current security roles and user assignments across the organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            {roleAssignmentLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <Table data-testid="table-role-assignment">
                <TableHeader>
                  <TableRow>
                    <TableHead>Role</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>User Count</TableHead>
                    <TableHead>Users</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roleAssignmentData?.map((role) => (
                    <TableRow key={role.roleId} data-testid={`row-role-${role.roleId}`}>
                      <TableCell>
                        <div className="font-medium">{role.roleName}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-600">{role.description}</div>
                      </TableCell>
                      <TableCell>
                        <Badge style={{ backgroundColor: ESSAYONS_COLORS.primary }}>
                          {role.userCount}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {role.users.slice(0, 3).map((user) => (
                            <Badge key={user.userId} variant="secondary" className="text-xs">
                              {user.name}
                            </Badge>
                          ))}
                          {role.users.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{role.users.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {activeReport === 'initiatives-participation' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" style={{ color: ESSAYONS_COLORS.primary }} />
              Initiative Participation Report
            </CardTitle>
            <CardDescription>
              User workload and initiative assignments across all projects
            </CardDescription>
          </CardHeader>
          <CardContent>
            {initiativesLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <Table data-testid="table-initiatives-participation">
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Initiative Count</TableHead>
                    <TableHead>Workload Score</TableHead>
                    <TableHead>Recent Initiatives</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {initiativesData?.map((user) => (
                    <TableRow key={user.userId} data-testid={`row-initiative-user-${user.userId}`}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.username}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{user.roleName}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge style={{ backgroundColor: ESSAYONS_COLORS.primary }}>
                          {user.initiativeCount}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>{user.workloadScore}</span>
                          <Badge 
                            variant={user.workloadScore > 10 ? 'destructive' : user.workloadScore > 5 ? 'default' : 'secondary'}
                            style={{ 
                              backgroundColor: user.workloadScore > 10 ? ESSAYONS_COLORS.error : 
                                             user.workloadScore > 5 ? ESSAYONS_COLORS.warning : 
                                             ESSAYONS_COLORS.success 
                            }}
                          >
                            {user.workloadScore > 10 ? 'High' : user.workloadScore > 5 ? 'Medium' : 'Low'}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {user.initiatives.slice(0, 2).map((initiative) => (
                            <Badge key={initiative.projectId} variant="outline" className="text-xs">
                              {initiative.projectName}
                            </Badge>
                          ))}
                          {user.initiatives.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{user.initiatives.length - 2} more
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Task Reports Components
function TaskReportsTab() {
  const [activeReport, setActiveReport] = useState<'status' | 'upcoming-deadlines' | 'overdue' | 'completion-trend'>('status');
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    status: [],
    priority: [],
    sortBy: 'dueDate',
    sortOrder: 'asc' as 'asc' | 'desc'
  });

  const { data: taskStatusData, isLoading: taskStatusLoading } = useQuery({
    queryKey: ['reports', 'tasks', 'status', filters],
    queryFn: async () => {
      const response = await fetch('/api/reports/tasks/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filters)
      });
      if (!response.ok) throw new Error('Failed to fetch task status report');
      return response.json() as Promise<TaskStatus[]>;
    },
    enabled: activeReport === 'status'
  });

  const { data: upcomingDeadlinesData, isLoading: upcomingDeadlinesLoading } = useQuery({
    queryKey: ['reports', 'tasks', 'upcoming-deadlines', filters],
    queryFn: async () => {
      const response = await fetch('/api/reports/tasks/upcoming-deadlines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({...filters, daysAhead: 30})
      });
      if (!response.ok) throw new Error('Failed to fetch upcoming deadlines report');
      return response.json() as Promise<TaskStatus[]>;
    },
    enabled: activeReport === 'upcoming-deadlines'
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={activeReport === 'status' ? 'default' : 'outline'}
            onClick={() => setActiveReport('status')}
            data-testid="button-task-status-report"
          >
            <CheckSquare className="h-4 w-4 mr-2" />
            Task Status
          </Button>
          <Button
            variant={activeReport === 'upcoming-deadlines' ? 'default' : 'outline'}
            onClick={() => setActiveReport('upcoming-deadlines')}
            data-testid="button-upcoming-deadlines-report"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Upcoming Deadlines
          </Button>
          <Button
            variant={activeReport === 'overdue' ? 'default' : 'outline'}
            onClick={() => setActiveReport('overdue')}
            data-testid="button-overdue-tasks-report"
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            Overdue Tasks
          </Button>
          <Button
            variant={activeReport === 'completion-trend' ? 'default' : 'outline'}
            onClick={() => setActiveReport('completion-trend')}
            data-testid="button-completion-trend-report"
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Completion Trend
          </Button>
        </div>
        <Button variant="outline" data-testid="button-export-task-report">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      {activeReport === 'status' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5" style={{ color: ESSAYONS_COLORS.primary }} />
              Task Status Report
            </CardTitle>
            <CardDescription>
              Comprehensive view of all tasks with status, priority, and progress tracking
            </CardDescription>
          </CardHeader>
          <CardContent>
            {taskStatusLoading ? (
              <div className="space-y-2">
                {[...Array(10)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <Table data-testid="table-task-status">
                <TableHeader>
                  <TableRow>
                    <TableHead>Task</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Assignee</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Progress</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {taskStatusData?.map((task) => (
                    <TableRow key={task.taskId} data-testid={`row-task-${task.taskId}`}>
                      <TableCell>
                        <div className="font-medium">{task.name}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{task.projectName}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          style={{ 
                            backgroundColor: task.status === 'completed' ? ESSAYONS_COLORS.success : 
                                           task.status === 'in_progress' ? ESSAYONS_COLORS.warning :
                                           ESSAYONS_COLORS.neutral 
                          }}
                        >
                          {task.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          style={{ 
                            backgroundColor: task.priority === 'high' ? ESSAYONS_COLORS.error : 
                                           task.priority === 'medium' ? ESSAYONS_COLORS.warning :
                                           ESSAYONS_COLORS.success 
                          }}
                        >
                          {task.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {task.assigneeName || 'Unassigned'}
                      </TableCell>
                      <TableCell>
                        {task.dueDate ? (
                          <div className={task.overdue ? 'text-red-600' : ''}>
                            {format(new Date(task.dueDate), 'PP')}
                            {task.overdue && <span className="ml-1 text-xs">(Overdue)</span>}
                          </div>
                        ) : 'No due date'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div 
                              className="h-2 rounded-full" 
                              style={{ 
                                width: `${task.progress}%`, 
                                backgroundColor: ESSAYONS_COLORS.primary 
                              }}
                            />
                          </div>
                          <span className="text-sm">{task.progress}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {activeReport === 'upcoming-deadlines' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" style={{ color: ESSAYONS_COLORS.primary }} />
              Upcoming Deadlines Report
            </CardTitle>
            <CardDescription>
              Tasks due within the next 30 days requiring attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingDeadlinesLoading ? (
              <div className="space-y-2">
                {[...Array(10)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <Table data-testid="table-upcoming-deadlines">
                <TableHeader>
                  <TableRow>
                    <TableHead>Task</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Days Until Due</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Assignee</TableHead>
                    <TableHead>Progress</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {upcomingDeadlinesData?.map((task) => (
                    <TableRow key={task.taskId} data-testid={`row-upcoming-task-${task.taskId}`}>
                      <TableCell>
                        <div className="font-medium">{task.name}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{task.projectName}</Badge>
                      </TableCell>
                      <TableCell>
                        {task.dueDate ? format(new Date(task.dueDate), 'PP') : 'No due date'}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          style={{ 
                            backgroundColor: (task.daysOverdue || 0) < 7 ? ESSAYONS_COLORS.error : 
                                           (task.daysOverdue || 0) < 14 ? ESSAYONS_COLORS.warning :
                                           ESSAYONS_COLORS.success 
                          }}
                        >
                          {task.daysOverdue} days
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          style={{ 
                            backgroundColor: task.priority === 'high' ? ESSAYONS_COLORS.error : 
                                           task.priority === 'medium' ? ESSAYONS_COLORS.warning :
                                           ESSAYONS_COLORS.success 
                          }}
                        >
                          {task.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {task.assigneeName || 'Unassigned'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div 
                              className="h-2 rounded-full" 
                              style={{ 
                                width: `${task.progress}%`, 
                                backgroundColor: ESSAYONS_COLORS.primary 
                              }}
                            />
                          </div>
                          <span className="text-sm">{task.progress}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// RAID Reports Components
function RAIDReportsTab() {
  const [activeReport, setActiveReport] = useState<'items' | 'high-severity-risks' | 'open-issues' | 'dependencies-at-risk'>('items');
  const [filters, setFilters] = useState({
    type: [],
    severity: [],
    status: [],
    sortBy: 'severity',
    sortOrder: 'desc' as 'asc' | 'desc'
  });

  const { data: raidItemsData, isLoading: raidItemsLoading } = useQuery({
    queryKey: ['reports', 'raid', 'items', filters],
    queryFn: async () => {
      const response = await fetch('/api/reports/raid/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filters)
      });
      if (!response.ok) throw new Error('Failed to fetch RAID items report');
      return response.json() as Promise<RAIDItem[]>;
    },
    enabled: activeReport === 'items'
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={activeReport === 'items' ? 'default' : 'outline'}
            onClick={() => setActiveReport('items')}
            data-testid="button-raid-items-report"
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            RAID Items
          </Button>
          <Button
            variant={activeReport === 'high-severity-risks' ? 'default' : 'outline'}
            onClick={() => setActiveReport('high-severity-risks')}
            data-testid="button-high-severity-risks-report"
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            High Severity Risks
          </Button>
          <Button
            variant={activeReport === 'open-issues' ? 'default' : 'outline'}
            onClick={() => setActiveReport('open-issues')}
            data-testid="button-open-issues-report"
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            Open Issues
          </Button>
          <Button
            variant={activeReport === 'dependencies-at-risk' ? 'default' : 'outline'}
            onClick={() => setActiveReport('dependencies-at-risk')}
            data-testid="button-dependencies-at-risk-report"
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            Dependencies at Risk
          </Button>
        </div>
        <Button variant="outline" data-testid="button-export-raid-report">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      {activeReport === 'items' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" style={{ color: ESSAYONS_COLORS.primary }} />
              RAID Items Report
            </CardTitle>
            <CardDescription>
              Comprehensive view of all risks, assumptions, issues, and dependencies
            </CardDescription>
          </CardHeader>
          <CardContent>
            {raidItemsLoading ? (
              <div className="space-y-2">
                {[...Array(10)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <Table data-testid="table-raid-items">
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Days Open</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {raidItemsData?.map((item) => (
                    <TableRow key={item.raidId} data-testid={`row-raid-${item.raidId}`}>
                      <TableCell>
                        <div className="font-medium">{item.title}</div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          style={{ 
                            backgroundColor: item.type === 'risk' ? ESSAYONS_COLORS.error : 
                                           item.type === 'issue' ? ESSAYONS_COLORS.warning :
                                           item.type === 'assumption' ? ESSAYONS_COLORS.neutral :
                                           ESSAYONS_COLORS.primary 
                          }}
                        >
                          {item.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.projectName}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          style={{ 
                            backgroundColor: item.severity === 'critical' ? ESSAYONS_COLORS.error : 
                                           item.severity === 'high' ? '#FF6B35' :
                                           item.severity === 'medium' ? ESSAYONS_COLORS.warning :
                                           ESSAYONS_COLORS.success 
                          }}
                        >
                          {item.severity}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          style={{ 
                            backgroundColor: item.status === 'closed' ? ESSAYONS_COLORS.success : 
                                           item.status === 'open' ? ESSAYONS_COLORS.warning :
                                           ESSAYONS_COLORS.neutral 
                          }}
                        >
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{item.ownerName}</TableCell>
                      <TableCell>
                        <Badge variant={item.daysOpen > 30 ? 'destructive' : 'secondary'}>
                          {item.daysOpen} days
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Stakeholder Reports Components
function StakeholderReportsTab() {
  const [activeReport, setActiveReport] = useState<'directory' | 'cross-initiative-load' | 'engagement'>('directory');
  const [filters, setFilters] = useState({
    roles: [],
    influenceLevel: [],
    supportLevel: [],
    sortBy: 'name',
    sortOrder: 'asc' as 'asc' | 'desc'
  });

  const { data: stakeholderDirectoryData, isLoading: stakeholderDirectoryLoading } = useQuery({
    queryKey: ['reports', 'stakeholders', 'directory', filters],
    queryFn: async () => {
      const response = await fetch('/api/reports/stakeholders/directory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filters)
      });
      if (!response.ok) throw new Error('Failed to fetch stakeholder directory report');
      return response.json() as Promise<StakeholderDirectory[]>;
    },
    enabled: activeReport === 'directory'
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={activeReport === 'directory' ? 'default' : 'outline'}
            onClick={() => setActiveReport('directory')}
            data-testid="button-stakeholder-directory-report"
          >
            <Users className="h-4 w-4 mr-2" />
            Directory
          </Button>
          <Button
            variant={activeReport === 'cross-initiative-load' ? 'default' : 'outline'}
            onClick={() => setActiveReport('cross-initiative-load')}
            data-testid="button-cross-initiative-load-report"
          >
            <Target className="h-4 w-4 mr-2" />
            Cross-Initiative Load
          </Button>
          <Button
            variant={activeReport === 'engagement' ? 'default' : 'outline'}
            onClick={() => setActiveReport('engagement')}
            data-testid="button-stakeholder-engagement-report"
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Engagement Tracking
          </Button>
        </div>
        <Button variant="outline" data-testid="button-export-stakeholder-report">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      {activeReport === 'directory' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" style={{ color: ESSAYONS_COLORS.primary }} />
              Stakeholder Directory
            </CardTitle>
            <CardDescription>
              Comprehensive stakeholder contact information and engagement levels
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stakeholderDirectoryLoading ? (
              <div className="space-y-2">
                {[...Array(10)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <Table data-testid="table-stakeholder-directory">
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Influence Level</TableHead>
                    <TableHead>Support Level</TableHead>
                    <TableHead>Engagement</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stakeholderDirectoryData?.map((stakeholder) => (
                    <TableRow key={stakeholder.stakeholderId} data-testid={`row-stakeholder-${stakeholder.stakeholderId}`}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{stakeholder.name}</div>
                          {stakeholder.department && (
                            <div className="text-sm text-gray-500">{stakeholder.department}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{stakeholder.role}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{stakeholder.projectName}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {stakeholder.email && <div>{stakeholder.email}</div>}
                          {stakeholder.phone && <div>{stakeholder.phone}</div>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          style={{ 
                            backgroundColor: stakeholder.influenceLevel === 'high' ? ESSAYONS_COLORS.error : 
                                           stakeholder.influenceLevel === 'medium' ? ESSAYONS_COLORS.warning :
                                           ESSAYONS_COLORS.success 
                          }}
                        >
                          {stakeholder.influenceLevel}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          style={{ 
                            backgroundColor: stakeholder.supportLevel === 'supportive' ? ESSAYONS_COLORS.success : 
                                           stakeholder.supportLevel === 'neutral' ? ESSAYONS_COLORS.neutral :
                                           stakeholder.supportLevel === 'resistant' ? ESSAYONS_COLORS.error :
                                           ESSAYONS_COLORS.warning
                          }}
                        >
                          {stakeholder.supportLevel}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          style={{ 
                            backgroundColor: stakeholder.engagementLevel === 'high' ? ESSAYONS_COLORS.success : 
                                           stakeholder.engagementLevel === 'medium' ? ESSAYONS_COLORS.warning :
                                           ESSAYONS_COLORS.neutral 
                          }}
                        >
                          {stakeholder.engagementLevel}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Readiness & Surveys Reports Components
function ReadinessSurveysTab() {
  const [activeReport, setActiveReport] = useState<'phase-scores' | 'survey-responses' | 'sentiment-trend' | 'understanding-gaps' | 'post-mortem-success' | 'response-rates'>('phase-scores');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={activeReport === 'phase-scores' ? 'default' : 'outline'}
            onClick={() => setActiveReport('phase-scores')}
            data-testid="button-phase-readiness-report"
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Phase Readiness
          </Button>
          <Button
            variant={activeReport === 'survey-responses' ? 'default' : 'outline'}
            onClick={() => setActiveReport('survey-responses')}
            data-testid="button-survey-responses-report"
          >
            <FileText className="h-4 w-4 mr-2" />
            Survey Responses
          </Button>
          <Button
            variant={activeReport === 'sentiment-trend' ? 'default' : 'outline'}
            onClick={() => setActiveReport('sentiment-trend')}
            data-testid="button-sentiment-trend-report"
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Sentiment Trend
          </Button>
        </div>
        <Button variant="outline" data-testid="button-export-readiness-report">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      {activeReport === 'phase-scores' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" style={{ color: ESSAYONS_COLORS.primary }} />
              Phase Readiness Score Report
            </CardTitle>
            <CardDescription>
              Aggregate readiness scores by initiative and current phase
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  { project: 'Digital Transformation', readiness: 78, phase: 'Implementation' },
                  { project: 'Process Optimization', readiness: 85, phase: 'Planning' },
                  { project: 'System Migration', readiness: 62, phase: 'Assessment' },
                  { project: 'Organizational Restructure', readiness: 71, phase: 'Implementation' },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="project" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="readiness" fill={ESSAYONS_COLORS.primary} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Cross-Cutting Reports Components
function CrossCuttingReportsTab() {
  const [activeReport, setActiveReport] = useState<'change-health' | 'org-readiness-heatmap' | 'stakeholder-sentiment'>('change-health');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={activeReport === 'change-health' ? 'default' : 'outline'}
            onClick={() => setActiveReport('change-health')}
            data-testid="button-change-health-report"
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Change Health Dashboard
          </Button>
          <Button
            variant={activeReport === 'org-readiness-heatmap' ? 'default' : 'outline'}
            onClick={() => setActiveReport('org-readiness-heatmap')}
            data-testid="button-org-readiness-heatmap-report"
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Org Readiness Heatmap
          </Button>
          <Button
            variant={activeReport === 'stakeholder-sentiment' ? 'default' : 'outline'}
            onClick={() => setActiveReport('stakeholder-sentiment')}
            data-testid="button-stakeholder-sentiment-report"
          >
            <PieChartIcon className="h-4 w-4 mr-2" />
            Stakeholder Sentiment
          </Button>
        </div>
        <Button variant="outline" data-testid="button-export-cross-cutting-report">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      {activeReport === 'change-health' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" style={{ color: ESSAYONS_COLORS.primary }} />
              Change Health Dashboard
            </CardTitle>
            <CardDescription>
              Composite health scores across all change initiatives with trend analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Overall Health</p>
                      <p className="text-2xl font-bold" style={{ color: ESSAYONS_COLORS.primary }}>78%</p>
                    </div>
                    <TrendingUp className="h-8 w-8" style={{ color: ESSAYONS_COLORS.success }} />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Task Completion</p>
                      <p className="text-2xl font-bold" style={{ color: ESSAYONS_COLORS.primary }}>82%</p>
                    </div>
                    <CheckSquare className="h-8 w-8" style={{ color: ESSAYONS_COLORS.success }} />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Risk Mitigation</p>
                      <p className="text-2xl font-bold" style={{ color: ESSAYONS_COLORS.primary }}>70%</p>
                    </div>
                    <AlertTriangle className="h-8 w-8" style={{ color: ESSAYONS_COLORS.warning }} />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Stakeholder Support</p>
                      <p className="text-2xl font-bold" style={{ color: ESSAYONS_COLORS.primary }}>75%</p>
                    </div>
                    <Users className="h-8 w-8" style={{ color: ESSAYONS_COLORS.primary }} />
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={[
                  { month: 'Jan', health: 65, tasks: 70, risks: 60, stakeholders: 68 },
                  { month: 'Feb', health: 68, tasks: 72, risks: 65, stakeholders: 70 },
                  { month: 'Mar', health: 72, tasks: 75, risks: 68, stakeholders: 72 },
                  { month: 'Apr', health: 75, tasks: 78, risks: 70, stakeholders: 75 },
                  { month: 'May', health: 78, tasks: 82, risks: 70, stakeholders: 75 },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="health" stroke={ESSAYONS_COLORS.primary} strokeWidth={3} />
                  <Line type="monotone" dataKey="tasks" stroke={ESSAYONS_COLORS.success} strokeWidth={2} />
                  <Line type="monotone" dataKey="risks" stroke={ESSAYONS_COLORS.warning} strokeWidth={2} />
                  <Line type="monotone" dataKey="stakeholders" stroke={ESSAYONS_COLORS.secondary} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Main Reports Component
export default function Reports() {
  const [activeTab, setActiveTab] = useState("user-reports");

  return (
    <div className="flex-1 space-y-6 p-6 pt-20">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0">
        <div>
          <h2 className="text-3xl font-bold tracking-tight" style={{ color: ESSAYONS_COLORS.primary }}>
            Comprehensive Reports
          </h2>
          <p className="text-gray-600">
            Advanced analytics and insights across all change management initiatives
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" data-testid="button-refresh-all-reports">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh All
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6" data-testid="tabs-reports">
          <TabsTrigger value="user-reports" data-testid="tab-user-reports">
            <Users className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">User Reports</span>
          </TabsTrigger>
          <TabsTrigger value="task-reports" data-testid="tab-task-reports">
            <CheckSquare className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Task Reports</span>
          </TabsTrigger>
          <TabsTrigger value="raid-reports" data-testid="tab-raid-reports">
            <AlertTriangle className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">RAID Reports</span>
          </TabsTrigger>
          <TabsTrigger value="stakeholder-reports" data-testid="tab-stakeholder-reports">
            <UserCheck className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Stakeholder Reports</span>
          </TabsTrigger>
          <TabsTrigger value="readiness-surveys" data-testid="tab-readiness-surveys">
            <BarChart3 className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Readiness & Surveys</span>
          </TabsTrigger>
          <TabsTrigger value="cross-cutting" data-testid="tab-cross-cutting">
            <TrendingUp className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Cross-Cutting</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="user-reports" className="space-y-6">
          <UserReportsTab />
        </TabsContent>

        <TabsContent value="task-reports" className="space-y-6">
          <TaskReportsTab />
        </TabsContent>

        <TabsContent value="raid-reports" className="space-y-6">
          <RAIDReportsTab />
        </TabsContent>

        <TabsContent value="stakeholder-reports" className="space-y-6">
          <StakeholderReportsTab />
        </TabsContent>

        <TabsContent value="readiness-surveys" className="space-y-6">
          <ReadinessSurveysTab />
        </TabsContent>

        <TabsContent value="cross-cutting" className="space-y-6">
          <CrossCuttingReportsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}