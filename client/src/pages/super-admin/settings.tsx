import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Settings,
  Shield,
  Mail,
  Database,
  Zap,
  Globe,
  Lock,
  Clock,
  AlertTriangle,
  CheckCircle,
  Save,
  RefreshCw,
  Eye,
  EyeOff,
  Key,
  Server,
  Users,
  Bell,
  FileText,
  ToggleLeft,
  ToggleRight
} from "lucide-react";
import { useSuperAdmin } from "@/contexts/SuperAdminContext";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

// Global Platform Settings - True platform-wide controls
interface GlobalSettings {
  globalFeatures: {
    maintenanceMode: boolean;
    newUserRegistration: boolean;
    scheduledMaintenanceStart?: string;
    scheduledMaintenanceEnd?: string;
    maintenanceMessage: string;
  };
}

interface SystemHealth {
  status: "healthy" | "warning" | "critical";
  uptime: number;
  lastBackup: string;
  diskUsage: number;
  memoryUsage: number;
  activeConnections: number;
  queueSize: number;
}

export default function SuperAdminSettings() {
  const [activeSection, setActiveSection] = useState("global");
  const [showSensitiveData, setShowSensitiveData] = useState(false);
  const { isAuthenticated } = useSuperAdmin();
  const { toast } = useToast();

  // Fetch global platform settings
  const { data: globalSettings, isLoading: globalLoading, refetch: refetchGlobal } = useQuery({
    queryKey: ["/api/super-admin/global-settings"],
    queryFn: async () => {
      const response = await fetch("/api/super-admin/global-settings", {
        credentials: 'include'
      });
      if (!response.ok) throw new Error("Failed to fetch global settings");
      return response.json() as Promise<GlobalSettings>;
    },
    enabled: isAuthenticated,
  });

  // Fetch system health
  const { data: health, isLoading: healthLoading } = useQuery({
    queryKey: ["/api/super-admin/system/health"],
    queryFn: async () => {
      const response = await fetch("/api/super-admin/system/health", {
        credentials: 'include'
      });
      if (!response.ok) throw new Error("Failed to fetch system health");
      return response.json() as Promise<SystemHealth>;
    },
    enabled: isAuthenticated,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Update global settings mutation
  const updateGlobalMutation = useMutation({
    mutationFn: async (updatedSettings: Partial<GlobalSettings>) => {
      const response = await fetch("/api/super-admin/global-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify(updatedSettings),
      });
      if (!response.ok) throw new Error("Failed to update global settings");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Global Settings Updated",
        description: "Platform-wide settings have been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/global-settings"] });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: "Failed to update global settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Maintenance mode mutation
  const toggleMaintenanceMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const response = await fetch("/api/super-admin/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify({ enabled }),
      });
      if (!response.ok) throw new Error("Failed to toggle maintenance mode");
      return response.json();
    },
    onSuccess: (data, enabled) => {
      toast({
        title: `Maintenance Mode ${enabled ? 'Enabled' : 'Disabled'}`,
        description: enabled 
          ? "Platform is now in maintenance mode. Users will see the maintenance message."
          : "Platform is now live. All users can access the system.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/global-settings"] });
    },
    onError: () => {
      toast({
        title: "Operation Failed",
        description: "Failed to toggle maintenance mode.",
        variant: "destructive",
      });
    },
  });

  const handleGlobalFeatureToggle = (feature: keyof GlobalSettings['globalFeatures'], enabled: boolean) => {
    if (!globalSettings) return;
    
    const updatedSettings = {
      ...globalSettings,
      globalFeatures: {
        ...globalSettings.globalFeatures,
        [feature]: enabled
      }
    };
    
    updateGlobalMutation.mutate(updatedSettings);
  };

  const formatUptime = (hours: number) => {
    if (hours < 24) return `${hours.toFixed(1)} hours`;
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days} days, ${remainingHours.toFixed(1)} hours`;
  };

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case "healthy": return "text-green-600 bg-green-100 dark:bg-green-900/20";
      case "warning": return "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20";
      case "critical": return "text-red-600 bg-red-100 dark:bg-red-900/20";
      default: return "text-gray-600 bg-gray-100 dark:bg-gray-900/20";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            System Settings
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Configure platform-wide settings, security policies, and system controls
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => {
              refetchGlobal();
            }}
            variant="outline"
            size="sm"
            data-testid="button-refresh-settings"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button
            onClick={() => setShowSensitiveData(!showSensitiveData)}
            variant="outline"
            size="sm"
            data-testid="button-toggle-sensitive"
          >
            {showSensitiveData ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
            {showSensitiveData ? "Hide" : "Show"} Sensitive
          </Button>
        </div>
      </div>

      {/* System Health Alert */}
      {health && health.status !== "healthy" && (
        <Alert className={health.status === "critical" ? "border-red-500" : "border-yellow-500"}>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            System status: <strong>{health.status.toUpperCase()}</strong>
            {health.status === "critical" && " - Immediate attention required"}
            {health.status === "warning" && " - Monitor closely"}
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeSection} onValueChange={setActiveSection} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="global" data-testid="tab-global">
            <Globe className="h-4 w-4 mr-2" />
            Global Platform
          </TabsTrigger>
          <TabsTrigger value="system" data-testid="tab-system">
            <Server className="h-4 w-4 mr-2" />
            System Health
          </TabsTrigger>
        </TabsList>

        {/* Global Platform Settings */}
        <TabsContent value="global" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Global Platform Controls
              </CardTitle>
              <CardDescription>
                Platform-wide settings that affect all users and organizations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {globalLoading ? (
                <p className="text-center py-8 text-muted-foreground">Loading global settings...</p>
              ) : (
                <div className="space-y-6">
                  {/* Maintenance Mode */}
                  <div className="p-6 border rounded-lg bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <Label className="text-base font-medium text-red-900 dark:text-red-100">
                          <AlertTriangle className="h-4 w-4 inline mr-2" />
                          Maintenance Mode
                        </Label>
                        <p className="text-sm text-red-700 dark:text-red-300">
                          Puts the entire platform offline for maintenance. Only super admins can access the system.
                        </p>
                      </div>
                      <Switch
                        checked={globalSettings?.globalFeatures?.maintenanceMode || false}
                        onCheckedChange={(checked) => handleGlobalFeatureToggle('maintenanceMode', checked)}
                        data-testid="switch-maintenance-mode"
                      />
                    </div>
                    
                    {globalSettings?.globalFeatures?.maintenanceMode && (
                      <div className="mt-4 space-y-3">
                        <Label htmlFor="maintenance-message">Maintenance Message</Label>
                        <Textarea
                          id="maintenance-message"
                          placeholder="We're performing scheduled maintenance. Please check back soon."
                          value={globalSettings?.globalFeatures?.maintenanceMessage || ""}
                          onChange={(e) => {
                            const updatedSettings = {
                              ...globalSettings,
                              globalFeatures: {
                                ...globalSettings.globalFeatures,
                                maintenanceMessage: e.target.value
                              }
                            };
                            updateGlobalMutation.mutate(updatedSettings);
                          }}
                          data-testid="textarea-maintenance-message"
                        />
                      </div>
                    )}
                  </div>

                  {/* Registration Controls */}
                  <div className="p-6 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <Label className="text-base font-medium">New User Registration</Label>
                        <p className="text-sm text-muted-foreground">
                          Allow new users to create accounts on the platform
                        </p>
                      </div>
                      <Switch
                        checked={globalSettings?.globalFeatures?.newUserRegistration || false}
                        onCheckedChange={(checked) => handleGlobalFeatureToggle('newUserRegistration', checked)}
                        data-testid="switch-new-registrations"
                      />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Health & Status */}
        <TabsContent value="system" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* System Health */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  System Health
                </CardTitle>
                <CardDescription>Real-time system status and metrics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {healthLoading ? (
                  <p className="text-center py-8 text-muted-foreground">Loading health data...</p>
                ) : health ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Overall Status</span>
                      <Badge className={getHealthStatusColor(health.status)} data-testid="badge-system-status">
                        {health.status.toUpperCase()}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Uptime</span>
                      <span className="text-sm" data-testid="text-system-uptime">
                        {formatUptime(health.uptime)}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Last Backup</span>
                      <span className="text-sm" data-testid="text-last-backup">
                        {new Date(health.lastBackup).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Disk Usage</span>
                      <span className="text-sm" data-testid="text-disk-usage">
                        {health.diskUsage.toFixed(1)}%
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Memory Usage</span>
                      <span className="text-sm" data-testid="text-memory-usage">
                        {health.memoryUsage.toFixed(1)}%
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Active Connections</span>
                      <span className="text-sm" data-testid="text-active-connections">
                        {health.activeConnections}
                      </span>
                    </div>
                  </>
                ) : (
                  <p className="text-center py-8 text-muted-foreground">Unable to load health data</p>
                )}
              </CardContent>
            </Card>

            {/* Platform Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Platform Information
                </CardTitle>
                <CardDescription>Current platform status and configuration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Maintenance Mode</span>
                  <Badge 
                    variant={globalSettings?.globalFeatures?.maintenanceMode ? "destructive" : "secondary"}
                    data-testid="badge-maintenance-status"
                  >
                    {globalSettings?.globalFeatures?.maintenanceMode ? "ACTIVE" : "DISABLED"}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">New Registrations</span>
                  <Badge 
                    variant={globalSettings?.globalFeatures?.newUserRegistration ? "secondary" : "outline"}
                    data-testid="badge-registration-status"
                  >
                    {globalSettings?.globalFeatures?.newUserRegistration ? "ENABLED" : "DISABLED"}
                  </Badge>
                </div>

                <div className="text-xs text-muted-foreground mt-4">
                  <p>Use the Global Platform tab to modify these settings.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}