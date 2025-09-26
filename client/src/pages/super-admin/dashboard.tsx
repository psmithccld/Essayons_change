import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
  Building2, 
  Users, 
  CreditCard, 
  TrendingUp, 
  Activity,
  DollarSign,
  UserCheck,
  AlertTriangle 
} from "lucide-react";
import { useSuperAdmin } from "@/contexts/SuperAdminContext";
import { SuperAdminUserManagement } from "@/components/super-admin/user-management";

interface DashboardStats {
  totalOrganizations: number;
  activeOrganizations: number;
  totalUsers: number;
  activeSubscriptions: number;
  monthlyRevenue: number;
  pendingActions: number;
}

export default function SuperAdminDashboard() {
  const { sessionId } = useSuperAdmin();

  // Fetch dashboard statistics
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/super-admin/dashboard/stats"],
    queryFn: async () => {
      const response = await fetch("/api/super-admin/dashboard/stats", {
        headers: {
          "x-super-admin-session": sessionId!,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch dashboard stats");
      return response.json() as Promise<DashboardStats>;
    },
    enabled: !!sessionId,
  });

  // Fetch recent organizations
  const { data: recentOrgs } = useQuery({
    queryKey: ["/api/super-admin/organizations", "recent"],
    queryFn: async () => {
      const response = await fetch("/api/super-admin/organizations?limit=5&sort=recent", {
        headers: {
          "x-super-admin-session": sessionId!,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch recent organizations");
      return response.json();
    },
    enabled: !!sessionId,
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

      {/* Main Dashboard Content */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" data-testid="tab-overview">
            <Activity className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="organizations" data-testid="tab-organizations">
            <Building2 className="h-4 w-4 mr-2" />
            Organizations
          </TabsTrigger>
          <TabsTrigger value="billing" data-testid="tab-billing">
            <CreditCard className="h-4 w-4 mr-2" />
            Billing
          </TabsTrigger>
          <TabsTrigger value="analytics" data-testid="tab-analytics">
            <TrendingUp className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="admin-users" data-testid="tab-admin-users">
            <UserCheck className="h-4 w-4 mr-2" />
            Admin Users
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                      Excellent
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">API Response Time</span>
                    <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      Fast
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
          </div>
        </TabsContent>

        <TabsContent value="organizations">
          <Card>
            <CardHeader>
              <CardTitle>Organization Management</CardTitle>
              <CardDescription>
                Comprehensive tenant organization management
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Organization management interface will be loaded here
              </p>
              <Button data-testid="button-manage-organizations">
                <Building2 className="h-4 w-4 mr-2" />
                Manage Organizations
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing">
          <Card>
            <CardHeader>
              <CardTitle>Billing Management</CardTitle>
              <CardDescription>
                Subscription plans, pricing, and Stripe integration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Billing management interface will be loaded here
              </p>
              <Button data-testid="button-manage-billing">
                <CreditCard className="h-4 w-4 mr-2" />
                Manage Billing
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>Platform Analytics</CardTitle>
              <CardDescription>
                Usage metrics, growth trends, and performance data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Analytics dashboard will be loaded here
              </p>
              <Button data-testid="button-view-analytics">
                <TrendingUp className="h-4 w-4 mr-2" />
                View Analytics
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="admin-users">
          <SuperAdminUserManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}