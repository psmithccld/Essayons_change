import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Building2, 
  Users, 
  CreditCard, 
  TrendingUp, 
  Activity,
  DollarSign,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Server,
  Monitor,
  Zap
} from "lucide-react";
import { useSuperAdmin } from "@/contexts/SuperAdminContext";
import type { Activity as ActivityType, SystemHealth, Alert } from "@shared/schema";

interface DashboardStats {
  totalOrganizations: number;
  activeOrganizations: number;
  totalUsers: number;
  activeSubscriptions: number;
  monthlyRevenue: number;
  pendingActions: number;
}

export default function SuperAdminDashboard() {
  const { isAuthenticated } = useSuperAdmin();

  // Acknowledge alert mutation
  const acknowledgeMutation = useMutation({
    mutationFn: async (alertId: string) => {
      return apiRequest(`/api/super-admin/dashboard/alerts/${alertId}/acknowledge`, {
        method: 'POST'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/dashboard/alerts"] });
    },
  });

  const acknowledgeAlert = (alertId: string) => {
    acknowledgeMutation.mutate(alertId);
  };

  // Fetch dashboard statistics
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/super-admin/dashboard/stats"],
    queryFn: async () => {
      const response = await fetch("/api/super-admin/dashboard/stats", {
        credentials: 'include'
      });
      if (!response.ok) throw new Error("Failed to fetch dashboard stats");
      return response.json() as Promise<DashboardStats>;
    },
    enabled: isAuthenticated,
  });

  // Fetch recent organizations
  const { data: recentOrgs } = useQuery({
    queryKey: ["/api/super-admin/organizations", "recent"],
    queryFn: async () => {
      const response = await fetch("/api/super-admin/organizations?limit=5&sort=recent", {
        credentials: 'include'
      });
      if (!response.ok) throw new Error("Failed to fetch recent organizations");
      return response.json();
    },
    enabled: isAuthenticated,
  });

  // Fetch recent activity
  const { data: recentActivity, isLoading: isActivityLoading, error: activityError } = useQuery({
    queryKey: ["/api/super-admin/dashboard/recent-activity"],
    queryFn: async (): Promise<ActivityType[]> => {
      const response = await fetch("/api/super-admin/dashboard/recent-activity?limit=10", {
        credentials: 'include'
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || "Failed to fetch recent activity");
      }
      return response.json();
    },
    enabled: isAuthenticated,
    refetchInterval: 30000, // Refetch every 30 seconds for near real-time updates
    staleTime: 10000, // Consider data stale after 10 seconds
  });

  // Fetch system health
  const { data: systemHealth, isLoading: isHealthLoading, error: healthError } = useQuery({
    queryKey: ["/api/super-admin/dashboard/system-health"],
    queryFn: async (): Promise<SystemHealth> => {
      const response = await fetch("/api/super-admin/dashboard/system-health", {
        credentials: 'include'
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || "Failed to fetch system health");
      }
      return response.json();
    },
    enabled: isAuthenticated,
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 15000, // Consider data stale after 15 seconds
  });

  // Fetch platform alerts
  const { data: platformAlerts, isLoading: isAlertsLoading, error: alertsError } = useQuery({
    queryKey: ["/api/super-admin/dashboard/alerts"],
    queryFn: async (): Promise<Alert[]> => {
      const response = await fetch("/api/super-admin/dashboard/alerts?limit=5", {
        credentials: 'include'
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || "Failed to fetch platform alerts");
      }
      return response.json();
    },
    enabled: isAuthenticated,
    refetchInterval: 60000, // Refetch every minute for alerts
    staleTime: 30000, // Consider data stale after 30 seconds
  });

  const statCards = [
    {
      title: "Total Organizations",
      value: stats?.totalOrganizations || 0,
      icon: Building2,
      description: `${stats?.activeOrganizations || 0} active`,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-100 dark:bg-blue-900/20"
    },
    {
      title: "Platform Users",
      value: stats?.totalUsers || 0,
      icon: Users,
      description: "Across all tenants",
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-100 dark:bg-green-900/20"
    },
    {
      title: "Active Subscriptions",
      value: stats?.activeSubscriptions || 0,
      icon: CreditCard,
      description: "Billing subscriptions",
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-100 dark:bg-purple-900/20"
    },
    {
      title: "Monthly Revenue",
      value: `$${(stats?.monthlyRevenue || 0).toLocaleString()}`,
      icon: DollarSign,
      description: "Current month",
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-100 dark:bg-emerald-900/20"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Super Admin Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Platform-wide management and analytics
          </p>
        </div>
        
        {stats?.pendingActions && stats.pendingActions > 0 && (
          <Badge variant="destructive" className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            {stats.pendingActions} pending actions
          </Badge>
        )}
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <Card key={index} className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid={`stat-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}>
                {statsLoading ? "..." : stat.value}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Executive Dashboard Content */}
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Organizations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Recent Organizations
              </CardTitle>
              <CardDescription>
                Latest tenant organizations created
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentOrgs && recentOrgs.length > 0 ? (
                <div className="space-y-3">
                  {recentOrgs.map((org: any) => (
                    <div key={org.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium" data-testid={`org-name-${org.id}`}>{org.name}</p>
                        <p className="text-sm text-muted-foreground">{org.domain}</p>
                      </div>
                      <Badge variant={org.isActive ? "default" : "secondary"}>
                        {org.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No organizations found</p>
              )}
            </CardContent>
          </Card>

          {/* System Health */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                System Health
              </CardTitle>
              <CardDescription>
                Real-time platform performance metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isHealthLoading ? (
                <div className="text-center py-4 text-muted-foreground">
                  Loading system health...
                </div>
              ) : healthError ? (
                <div className="text-center py-4">
                  <div className="flex items-center justify-center gap-2 text-red-600 mb-2">
                    <AlertCircle className="h-5 w-5" />
                    <span className="font-medium">Health Check Failed</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {healthError instanceof Error ? healthError.message : "Unknown error"}
                  </p>
                </div>
              ) : systemHealth ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">System Status</span>
                    <Badge 
                      variant={systemHealth.status === 'healthy' ? 'default' : systemHealth.status === 'warning' ? 'secondary' : 'destructive'}
                      className={`${
                        systemHealth.status === 'healthy' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                        systemHealth.status === 'warning' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                        'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}
                      data-testid={`badge-system-status-${systemHealth.status}`}
                    >
                      {systemHealth.status === 'healthy' && <CheckCircle className="h-3 w-3 mr-1" />}
                      {systemHealth.status === 'warning' && <AlertTriangle className="h-3 w-3 mr-1" />}
                      {systemHealth.status === 'critical' && <XCircle className="h-3 w-3 mr-1" />}
                      {systemHealth.status === 'healthy' ? 'Healthy' : 
                       systemHealth.status === 'warning' ? 'Warning' : 'Critical'}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Response Time P95</span>
                    <Badge 
                      variant={systemHealth.responseTimeP95 < 500 ? 'default' : systemHealth.responseTimeP95 < 1000 ? 'secondary' : 'destructive'}
                      className={`${
                        systemHealth.responseTimeP95 < 500 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                        systemHealth.responseTimeP95 < 1000 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                        'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}
                      data-testid="text-response-time"
                    >
                      {systemHealth.responseTimeP95}ms
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Database Latency</span>
                    <span className="text-sm font-medium" data-testid="text-db-latency">
                      {systemHealth.dbLatencyMs}ms
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Error Rate</span>
                    <Badge 
                      variant={systemHealth.errorRate < 1 ? 'default' : systemHealth.errorRate < 3 ? 'secondary' : 'destructive'}
                      className={`${
                        systemHealth.errorRate < 1 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                        systemHealth.errorRate < 3 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                        'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}
                      data-testid="text-error-rate"
                    >
                      {systemHealth.errorRate}%
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">CPU Usage</span>
                    <Badge variant="outline" data-testid="text-cpu-usage">
                      {systemHealth.cpuUsage}%
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Memory Usage</span>
                    <Badge variant="outline" data-testid="text-memory-usage">
                      {systemHealth.memoryUsage}%
                    </Badge>
                  </div>
                  
                  <div className="mt-4 pt-3 border-t">
                    <div className="text-xs text-muted-foreground">
                      Last updated: {new Date(systemHealth.lastUpdated).toLocaleString()}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  No health data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Platform Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                Platform Alerts
              </CardTitle>
              <CardDescription>
                Critical issues and actionable notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isAlertsLoading ? (
                <div className="text-center py-4 text-muted-foreground">
                  Loading alerts...
                </div>
              ) : alertsError ? (
                <div className="text-center py-4">
                  <div className="flex items-center justify-center gap-2 text-red-600 mb-2">
                    <AlertCircle className="h-5 w-5" />
                    <span className="font-medium">Failed to load alerts</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {alertsError instanceof Error ? alertsError.message : "Unknown error"}
                  </p>
                </div>
              ) : platformAlerts && platformAlerts.length > 0 ? (
                <div className="space-y-3">
                  {platformAlerts.map((alert: Alert) => (
                    <div 
                      key={alert.id} 
                      className={`flex items-start justify-between p-3 border rounded-lg ${
                        alert.severity === 'critical' ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20' :
                        alert.severity === 'high' ? 'border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20' :
                        alert.severity === 'medium' ? 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20' :
                        'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20'
                      }`}
                      data-testid={`alert-${alert.id}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-1">
                          {alert.type === 'payment_failed' && <XCircle className={`h-4 w-4 ${
                            alert.severity === 'critical' ? 'text-red-600' : 'text-orange-600'
                          }`} />}
                          {alert.type === 'inactive_org' && <Building2 className="h-4 w-4 text-gray-600" />}
                          {alert.type === 'system_error' && <Zap className="h-4 w-4 text-red-600" />}
                          {alert.type === 'security' && <AlertTriangle className="h-4 w-4 text-red-600" />}
                          {alert.type === 'license_overage' && <CreditCard className="h-4 w-4 text-orange-600" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm" data-testid={`alert-title-${alert.id}`}>
                              {alert.title}
                            </p>
                            <Badge 
                              variant={
                                alert.severity === 'critical' ? 'destructive' :
                                alert.severity === 'high' ? 'destructive' :
                                alert.severity === 'medium' ? 'secondary' :
                                'outline'
                              }
                              className="text-xs"
                            >
                              {alert.severity.toUpperCase()}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {alert.message}
                          </p>
                          {alert.organizationName && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Organization: {alert.organizationName}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">
                            {new Date(alert.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {!alert.acknowledged && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs"
                            data-testid={`button-acknowledge-${alert.id}`}
                            onClick={() => acknowledgeAlert(alert.id)}
                          >
                            Acknowledge
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center p-6 border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium">No active alerts</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity Feed */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>
              Latest platform events and user actions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isActivityLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading activity...
                </div>
              ) : activityError ? (
                <div className="text-center py-8">
                  <div className="flex items-center justify-center gap-2 text-red-600 mb-2">
                    <AlertCircle className="h-5 w-5" />
                    <span className="font-medium">Failed to load activity</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {activityError instanceof Error ? activityError.message : "Unknown error occurred"}
                  </p>
                </div>
              ) : recentActivity && recentActivity.length > 0 ? (
                <div className="space-y-3">
                  {recentActivity.map((activity: ActivityType) => (
                    <div key={activity.id} className="flex items-start gap-3 p-3 border rounded-lg">
                      <div className="flex-shrink-0 mt-1">
                        {activity.type === 'organization_created' && <Building2 className="h-4 w-4 text-blue-600" />}
                        {activity.type === 'user_signup' && <Users className="h-4 w-4 text-green-600" />}
                        {activity.type === 'subscription_changed' && <CreditCard className="h-4 w-4 text-purple-600" />}
                        {activity.type === 'payment_failed' && <XCircle className="h-4 w-4 text-red-600" />}
                        {activity.type === 'system_event' && <Activity className="h-4 w-4 text-gray-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-sm" data-testid={`activity-title-${activity.id}`}>
                              {activity.title}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {activity.description}
                            </p>
                          </div>
                          <Badge 
                            variant={
                              activity.type === 'organization_created' ? 'default' :
                              activity.type === 'user_signup' ? 'secondary' :
                              activity.type === 'subscription_changed' ? 'outline' :
                              activity.type === 'payment_failed' ? 'destructive' :
                              'secondary'
                            }
                            className="text-xs whitespace-nowrap ml-2"
                          >
                            {activity.type.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(activity.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No recent activity found
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}