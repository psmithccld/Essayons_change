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

interface SystemSettings {
  // Global Feature Flags
  globalFeatures: {
    maintenanceMode: boolean;
    newUserRegistration: boolean;
    emailNotifications: boolean;
    gptServices: boolean;
    fileUploads: boolean;
    reports: boolean;
  };
  
  // Security Policies
  security: {
    passwordMinLength: number;
    passwordRequireSpecialChars: boolean;
    sessionTimeoutMinutes: number;
    maxLoginAttempts: number;
    twoFactorRequired: boolean;
    ipWhitelist: string[];
  };
  
  // Email Configuration
  email: {
    fromName: string;
    fromEmail: string;
    replyToEmail: string;
    supportEmail: string;
    enableWelcomeEmails: boolean;
    enableNotifications: boolean;
  };
  
  // Platform Limits
  limits: {
    maxOrgsPerPlan: number;
    maxUsersPerOrg: number;
    maxProjectsPerOrg: number;
    maxFileUploadSizeMB: number;
    apiRateLimit: number;
    sessionTimeoutHours: number;
  };
  
  // System Maintenance
  maintenance: {
    isMaintenanceMode: boolean;
    maintenanceMessage: string;
    plannedDowntimeStart?: string;
    plannedDowntimeEnd?: string;
    allowedIps: string[];
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
  const [activeSection, setActiveSection] = useState("features");
  const [showSensitiveData, setShowSensitiveData] = useState(false);
  const { isAuthenticated } = useSuperAdmin();
  const { toast } = useToast();

  // Fetch system settings
  const { data: settings, isLoading: settingsLoading, refetch: refetchSettings } = useQuery({
    queryKey: ["/api/super-admin/settings"],
    queryFn: async () => {
      const response = await fetch("/api/super-admin/settings", {
        credentials: 'include'
      });
      if (!response.ok) throw new Error("Failed to fetch system settings");
      return response.json() as Promise<SystemSettings>;
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

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (updatedSettings: Partial<SystemSettings>) => {
      const response = await fetch("/api/super-admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify(updatedSettings),
      });
      if (!response.ok) throw new Error("Failed to update settings");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Settings Updated",
        description: "System settings have been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/settings"] });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: "Failed to update system settings. Please try again.",
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
      refetchSettings();
    },
    onError: () => {
      toast({
        title: "Operation Failed",
        description: "Failed to toggle maintenance mode.",
        variant: "destructive",
      });
    },
  });

  const handleFeatureToggle = (feature: keyof SystemSettings['globalFeatures'], enabled: boolean) => {
    if (!settings) return;
    
    const updatedSettings = {
      ...settings,
      globalFeatures: {
        ...settings.globalFeatures,
        [feature]: enabled
      }
    };
    
    updateSettingsMutation.mutate(updatedSettings);
  };

  const handleSecurityUpdate = (field: keyof SystemSettings['security'], value: any) => {
    if (!settings) return;
    
    const updatedSettings = {
      ...settings,
      security: {
        ...settings.security,
        [field]: value
      }
    };
    
    updateSettingsMutation.mutate(updatedSettings);
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
            onClick={() => refetchSettings()}
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
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="features" data-testid="tab-features">
            <ToggleLeft className="h-4 w-4 mr-2" />
            Features
          </TabsTrigger>
          <TabsTrigger value="security" data-testid="tab-security">
            <Shield className="h-4 w-4 mr-2" />
            Security
          </TabsTrigger>
          <TabsTrigger value="email" data-testid="tab-email">
            <Mail className="h-4 w-4 mr-2" />
            Email
          </TabsTrigger>
          <TabsTrigger value="limits" data-testid="tab-limits">
            <Database className="h-4 w-4 mr-2" />
            Limits
          </TabsTrigger>
          <TabsTrigger value="system" data-testid="tab-system">
            <Server className="h-4 w-4 mr-2" />
            System
          </TabsTrigger>
        </TabsList>

        {/* Global Feature Flags */}
        <TabsContent value="features" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ToggleLeft className="h-5 w-5" />
                Global Feature Flags
              </CardTitle>
              <CardDescription>
                Control platform-wide feature availability across all organizations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {settingsLoading ? (
                <p className="text-center py-8 text-muted-foreground">Loading settings...</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Maintenance Mode */}
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <Label className="text-base font-medium">Maintenance Mode</Label>
                      <p className="text-sm text-muted-foreground">
                        Put the entire platform in maintenance mode
                      </p>
                    </div>
                    <Switch
                      checked={settings?.globalFeatures?.maintenanceMode || false}
                      onCheckedChange={(checked) => toggleMaintenanceMutation.mutate(checked)}
                      data-testid="switch-maintenance-mode"
                    />
                  </div>

                  {/* New User Registration */}
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <Label className="text-base font-medium">New User Registration</Label>
                      <p className="text-sm text-muted-foreground">
                        Allow new users to register accounts
                      </p>
                    </div>
                    <Switch
                      checked={settings?.globalFeatures?.newUserRegistration || false}
                      onCheckedChange={(checked) => handleFeatureToggle('newUserRegistration', checked)}
                      data-testid="switch-user-registration"
                    />
                  </div>

                  {/* Email Notifications */}
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <Label className="text-base font-medium">Email Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Enable system-wide email notifications
                      </p>
                    </div>
                    <Switch
                      checked={settings?.globalFeatures?.emailNotifications || false}
                      onCheckedChange={(checked) => handleFeatureToggle('emailNotifications', checked)}
                      data-testid="switch-email-notifications"
                    />
                  </div>

                  {/* GPT Services */}
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <Label className="text-base font-medium">GPT AI Services</Label>
                      <p className="text-sm text-muted-foreground">
                        Enable AI coaching and assistance features
                      </p>
                    </div>
                    <Switch
                      checked={settings?.globalFeatures?.gptServices || false}
                      onCheckedChange={(checked) => handleFeatureToggle('gptServices', checked)}
                      data-testid="switch-gpt-services"
                    />
                  </div>

                  {/* File Uploads */}
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <Label className="text-base font-medium">File Uploads</Label>
                      <p className="text-sm text-muted-foreground">
                        Allow users to upload files and documents
                      </p>
                    </div>
                    <Switch
                      checked={settings?.globalFeatures?.fileUploads || false}
                      onCheckedChange={(checked) => handleFeatureToggle('fileUploads', checked)}
                      data-testid="switch-file-uploads"
                    />
                  </div>

                  {/* Reports */}
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <Label className="text-base font-medium">Reporting System</Label>
                      <p className="text-sm text-muted-foreground">
                        Enable data export and reporting features
                      </p>
                    </div>
                    <Switch
                      checked={settings?.globalFeatures?.reports || false}
                      onCheckedChange={(checked) => handleFeatureToggle('reports', checked)}
                      data-testid="switch-reports"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security Policies
              </CardTitle>
              <CardDescription>
                Configure platform-wide security requirements and policies
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {settingsLoading ? (
                <p className="text-center py-8 text-muted-foreground">Loading security settings...</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Password Requirements */}
                  <div className="space-y-3">
                    <Label htmlFor="password-length">Minimum Password Length</Label>
                    <Input
                      id="password-length"
                      type="number"
                      min="6"
                      max="32"
                      value={settings?.security?.passwordMinLength || 8}
                      onChange={(e) => handleSecurityUpdate('passwordMinLength', parseInt(e.target.value))}
                      data-testid="input-password-length"
                    />
                    <p className="text-xs text-muted-foreground">
                      Minimum characters required for user passwords
                    </p>
                  </div>

                  {/* Session Timeout */}
                  <div className="space-y-3">
                    <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
                    <Input
                      id="session-timeout"
                      type="number"
                      min="15"
                      max="1440"
                      value={settings?.security?.sessionTimeoutMinutes || 120}
                      onChange={(e) => handleSecurityUpdate('sessionTimeoutMinutes', parseInt(e.target.value))}
                      data-testid="input-session-timeout"
                    />
                    <p className="text-xs text-muted-foreground">
                      Automatic logout time for inactive sessions
                    </p>
                  </div>

                  {/* Max Login Attempts */}
                  <div className="space-y-3">
                    <Label htmlFor="max-login-attempts">Max Login Attempts</Label>
                    <Input
                      id="max-login-attempts"
                      type="number"
                      min="3"
                      max="10"
                      value={settings?.security?.maxLoginAttempts || 5}
                      onChange={(e) => handleSecurityUpdate('maxLoginAttempts', parseInt(e.target.value))}
                      data-testid="input-max-login-attempts"
                    />
                    <p className="text-xs text-muted-foreground">
                      Failed attempts before account lockout
                    </p>
                  </div>

                  {/* Two-Factor Authentication */}
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <Label className="text-base font-medium">Require 2FA</Label>
                      <p className="text-sm text-muted-foreground">
                        Force two-factor authentication for all users
                      </p>
                    </div>
                    <Switch
                      checked={settings?.security?.twoFactorRequired || false}
                      onCheckedChange={(checked) => handleSecurityUpdate('twoFactorRequired', checked)}
                      data-testid="switch-require-2fa"
                    />
                  </div>

                  {/* Special Characters in Passwords */}
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <Label className="text-base font-medium">Require Special Characters</Label>
                      <p className="text-sm text-muted-foreground">
                        Passwords must contain special characters
                      </p>
                    </div>
                    <Switch
                      checked={settings?.security?.passwordRequireSpecialChars || false}
                      onCheckedChange={(checked) => handleSecurityUpdate('passwordRequireSpecialChars', checked)}
                      data-testid="switch-special-chars"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Configuration */}
        <TabsContent value="email" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Configuration
              </CardTitle>
              <CardDescription>
                Configure system email settings and templates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label htmlFor="from-name">From Name</Label>
                  <Input
                    id="from-name"
                    value={settings?.email?.fromName || ""}
                    placeholder="Platform Support"
                    data-testid="input-from-name"
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="from-email">From Email</Label>
                  <Input
                    id="from-email"
                    type="email"
                    value={settings?.email?.fromEmail || ""}
                    placeholder="noreply@platform.com"
                    data-testid="input-from-email"
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="reply-to-email">Reply-To Email</Label>
                  <Input
                    id="reply-to-email"
                    type="email"
                    value={settings?.email?.replyToEmail || ""}
                    placeholder="support@platform.com"
                    data-testid="input-reply-to-email"
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="support-email">Support Email</Label>
                  <Input
                    id="support-email"
                    type="email"
                    value={settings?.email?.supportEmail || ""}
                    placeholder="help@platform.com"
                    data-testid="input-support-email"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Platform Limits */}
        <TabsContent value="limits" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Platform Limits & Quotas
              </CardTitle>
              <CardDescription>
                Set default limits and quotas for organizations and users
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label htmlFor="max-users-per-org">Max Users per Organization</Label>
                  <Input
                    id="max-users-per-org"
                    type="number"
                    min="1"
                    value={settings?.limits?.maxUsersPerOrg || 100}
                    data-testid="input-max-users-per-org"
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="max-projects-per-org">Max Projects per Organization</Label>
                  <Input
                    id="max-projects-per-org"
                    type="number"
                    min="1"
                    value={settings?.limits?.maxProjectsPerOrg || 50}
                    data-testid="input-max-projects-per-org"
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="max-file-upload">Max File Upload Size (MB)</Label>
                  <Input
                    id="max-file-upload"
                    type="number"
                    min="1"
                    max="100"
                    value={settings?.limits?.maxFileUploadSizeMB || 10}
                    data-testid="input-max-file-upload"
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="api-rate-limit">API Rate Limit (requests/minute)</Label>
                  <Input
                    id="api-rate-limit"
                    type="number"
                    min="10"
                    value={settings?.limits?.apiRateLimit || 1000}
                    data-testid="input-api-rate-limit"
                  />
                </div>
              </div>
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

            {/* Maintenance Controls */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Maintenance Controls
                </CardTitle>
                <CardDescription>Platform maintenance and emergency controls</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Label htmlFor="maintenance-message">Maintenance Message</Label>
                  <Textarea
                    id="maintenance-message"
                    placeholder="The platform is currently undergoing scheduled maintenance. We'll be back shortly."
                    value={settings?.maintenance?.maintenanceMessage || ""}
                    data-testid="textarea-maintenance-message"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="downtime-start">Planned Start</Label>
                    <Input
                      id="downtime-start"
                      type="datetime-local"
                      data-testid="input-downtime-start"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="downtime-end">Planned End</Label>
                    <Input
                      id="downtime-end"
                      type="datetime-local"
                      data-testid="input-downtime-end"
                    />
                  </div>
                </div>

                <Button 
                  variant="destructive" 
                  className="w-full"
                  onClick={() => toggleMaintenanceMutation.mutate(true)}
                  disabled={settings?.globalFeatures?.maintenanceMode}
                  data-testid="button-enable-maintenance"
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Enable Maintenance Mode
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}