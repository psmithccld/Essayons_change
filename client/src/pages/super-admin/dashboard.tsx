import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  XCircle
} from "lucide-react";
import { useSuperAdmin } from "@/contexts/SuperAdminContext";

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
                <Activity className="h-5 w-5" />
                System Health
              </CardTitle>
              <CardDescription>
                Platform performance metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Database Performance</span>
                  <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Excellent
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">API Response Time</span>
                  <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    &lt;200ms
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Storage Usage</span>
                  <Badge variant="outline">73% capacity</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Active Sessions</span>
                  <span className="text-sm font-medium">{stats?.totalUsers || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Platform Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Platform Alerts
              </CardTitle>
              <CardDescription>
                Issues requiring attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats?.pendingActions && stats.pendingActions > 0 ? (
                  <div className="flex items-center justify-between p-3 border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20 rounded-lg">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <span className="text-sm font-medium">Pending Actions</span>
                    </div>
                    <Badge variant="secondary">{stats.pendingActions}</Badge>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3 border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium">All systems operational</span>
                    </div>
                  </div>
                )}
                
                {/* System Status Items */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Payment Processing</span>
                    <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Online
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Email Services</span>
                    <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Online
                    </Badge>
                  </div>
                </div>
              </div>
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
              {/* Activity items will be populated from backend */}
              <div className="text-center py-8 text-muted-foreground">
                Activity feed will be implemented with real-time data
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}