import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import { 
  TrendingUp, 
  Users, 
  Activity,
  Clock,
  MousePointer,
  Zap,
  Database,
  Server,
  AlertTriangle,
  CheckCircle,
  Calendar,
  BarChart3,
  PieChart as PieIcon,
  RefreshCw
} from "lucide-react";
import { useSuperAdmin } from "@/contexts/SuperAdminContext";

interface EngagementMetrics {
  activeUsers24h: number;
  activeUsers7d: number;
  activeUsers30d: number;
  averageSessionDuration: number;
  sessionsToday: number;
  bounceRate: number;
  retentionRate: number;
}

interface FeatureUsage {
  feature: string;
  usage: number;
  trend: number;
  category: string;
}

interface PerformanceMetrics {
  averageResponseTime: number;
  uptime: number;
  errorRate: number;
  databaseConnections: number;
  memoryUsage: number;
  cpuUsage: number;
}

interface UserGrowthData {
  date: string;
  users: number;
  organizations: number;
  activeUsers: number;
}

interface LoginActivityData {
  hour: string;
  logins: number;
  uniqueUsers: number;
}

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6'];

export default function SuperAdminAnalytics() {
  const [timeRange, setTimeRange] = useState("7d");
  const { isAuthenticated } = useSuperAdmin();

  // Fetch engagement metrics
  const { data: engagement, isLoading: engagementLoading, refetch: refetchEngagement } = useQuery({
    queryKey: ["/api/super-admin/analytics/engagement", timeRange],
    queryFn: async () => {
      const response = await fetch(`/api/super-admin/analytics/engagement?range=${timeRange}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error("Failed to fetch engagement metrics");
      return response.json() as Promise<EngagementMetrics>;
    },
    enabled: isAuthenticated,
  });

  // Fetch feature usage
  const { data: featureUsage, isLoading: featureLoading } = useQuery({
    queryKey: ["/api/super-admin/analytics/features", timeRange],
    queryFn: async () => {
      const response = await fetch(`/api/super-admin/analytics/features?range=${timeRange}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error("Failed to fetch feature usage");
      return response.json() as Promise<FeatureUsage[]>;
    },
    enabled: isAuthenticated,
  });

  // Fetch performance metrics
  const { data: performance, isLoading: performanceLoading } = useQuery({
    queryKey: ["/api/super-admin/analytics/performance"],
    queryFn: async () => {
      const response = await fetch("/api/super-admin/analytics/performance", {
        credentials: 'include'
      });
      if (!response.ok) throw new Error("Failed to fetch performance metrics");
      return response.json() as Promise<PerformanceMetrics>;
    },
    enabled: isAuthenticated,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch user growth data
  const { data: userGrowth, isLoading: growthLoading } = useQuery({
    queryKey: ["/api/super-admin/analytics/growth", timeRange],
    queryFn: async () => {
      const response = await fetch(`/api/super-admin/analytics/growth?range=${timeRange}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error("Failed to fetch growth data");
      return response.json() as Promise<UserGrowthData[]>;
    },
    enabled: isAuthenticated,
  });

  // Fetch login activity
  const { data: loginActivity, isLoading: loginLoading } = useQuery({
    queryKey: ["/api/super-admin/analytics/login-activity", timeRange],
    queryFn: async () => {
      const response = await fetch(`/api/super-admin/analytics/login-activity?range=${timeRange}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error("Failed to fetch login activity");
      return response.json() as Promise<LoginActivityData[]>;
    },
    enabled: isAuthenticated,
  });

  const handleRefreshData = () => {
    refetchEngagement();
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Platform Analytics
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Deep insights into platform usage, performance, and growth
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32" data-testid="select-time-range">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            onClick={handleRefreshData} 
            variant="outline" 
            size="sm"
            data-testid="button-refresh"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs defaultValue="engagement" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="engagement" data-testid="tab-engagement">
            <Activity className="h-4 w-4 mr-2" />
            Engagement
          </TabsTrigger>
          <TabsTrigger value="features" data-testid="tab-features">
            <MousePointer className="h-4 w-4 mr-2" />
            Features
          </TabsTrigger>
          <TabsTrigger value="performance" data-testid="tab-performance">
            <Server className="h-4 w-4 mr-2" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="growth" data-testid="tab-growth">
            <TrendingUp className="h-4 w-4 mr-2" />
            Growth
          </TabsTrigger>
        </TabsList>

        {/* Engagement Analytics */}
        <TabsContent value="engagement" className="space-y-6">
          {/* Engagement KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Users (24h)</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="metric-active-users-24h">
                  {engagementLoading ? "..." : formatNumber(engagement?.activeUsers24h || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Unique users in last 24 hours
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Session Duration</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="metric-session-duration">
                  {engagementLoading ? "..." : formatDuration(engagement?.averageSessionDuration || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Average session length
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Retention Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="metric-retention-rate">
                  {engagementLoading ? "..." : `${(engagement?.retentionRate || 0).toFixed(1)}%`}
                </div>
                <p className="text-xs text-muted-foreground">
                  7-day user retention
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sessions Today</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="metric-sessions-today">
                  {engagementLoading ? "..." : formatNumber(engagement?.sessionsToday || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Total sessions today
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Login Activity Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Login Activity
              </CardTitle>
              <CardDescription>Hourly breakdown of user login patterns</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={loginActivity || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="logins" fill="#ef4444" name="Total Logins" />
                    <Bar dataKey="uniqueUsers" fill="#3b82f6" name="Unique Users" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Feature Usage Analytics */}
        <TabsContent value="features" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieIcon className="h-5 w-5" />
                Feature Usage Distribution
              </CardTitle>
              <CardDescription>Which features are being used most across the platform</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={featureUsage || []}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ feature, usage }) => `${feature}: ${usage}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="usage"
                      >
                        {(featureUsage || []).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-4">
                  {(featureUsage || []).map((feature, index) => (
                    <div key={feature.feature} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <div>
                          <p className="font-medium">{feature.feature}</p>
                          <p className="text-sm text-muted-foreground">{feature.category}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">{feature.usage}%</p>
                        <div className="flex items-center gap-1">
                          {feature.trend > 0 ? (
                            <TrendingUp className="h-3 w-3 text-green-500" />
                          ) : (
                            <TrendingUp className="h-3 w-3 text-red-500 rotate-180" />
                          )}
                          <span className={`text-xs ${feature.trend > 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {Math.abs(feature.trend)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Monitoring */}
        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Response Time</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="metric-response-time">
                  {performanceLoading ? "..." : `${performance?.averageResponseTime || 0}ms`}
                </div>
                <p className="text-xs text-muted-foreground">
                  Average API response time
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">System Uptime</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600" data-testid="metric-uptime">
                  {performanceLoading ? "..." : `${(performance?.uptime || 0).toFixed(2)}%`}
                </div>
                <p className="text-xs text-muted-foreground">
                  Last 30 days availability
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="metric-error-rate">
                  {performanceLoading ? "..." : `${(performance?.errorRate || 0).toFixed(3)}%`}
                </div>
                <p className="text-xs text-muted-foreground">
                  API error rate
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">DB Connections</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="metric-db-connections">
                  {performanceLoading ? "..." : performance?.databaseConnections || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Active database connections
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
                <Server className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="metric-memory-usage">
                  {performanceLoading ? "..." : `${(performance?.memoryUsage || 0).toFixed(1)}%`}
                </div>
                <p className="text-xs text-muted-foreground">
                  System memory utilization
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="metric-cpu-usage">
                  {performanceLoading ? "..." : `${(performance?.cpuUsage || 0).toFixed(1)}%`}
                </div>
                <p className="text-xs text-muted-foreground">
                  System CPU utilization
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Growth Analytics */}
        <TabsContent value="growth" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Platform Growth Trends
              </CardTitle>
              <CardDescription>User and organization growth over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={userGrowth || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="users" 
                      stackId="1" 
                      stroke="#3b82f6" 
                      fill="#3b82f6" 
                      fillOpacity={0.6}
                      name="Total Users"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="activeUsers" 
                      stackId="2" 
                      stroke="#22c55e" 
                      fill="#22c55e" 
                      fillOpacity={0.6}
                      name="Active Users"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="organizations" 
                      stackId="3" 
                      stroke="#ef4444" 
                      fill="#ef4444" 
                      fillOpacity={0.6}
                      name="Organizations"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}