import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Eye, 
  Shield, 
  Clock, 
  User, 
  Building2, 
  AlertTriangle, 
  Settings, 
  Database, 
  FileText,
  History,
  Lock,
  Unlock,
  HelpCircle
} from "lucide-react";
import { format } from "date-fns";
import type { SupportSession, SupportAuditLog } from "@shared/schema";

// Use shared schema types for consistency
interface Organization {
  id: string;
  name: string;
  slug: string;
  status: string;
  ownerUserId: string;
  maxUsers: number;
  enabledFeatures: Record<string, boolean>;
}

// Enhanced session creation schema with granular access controls
const sessionCreationSchema = z.object({
  organizationId: z.string().min(1, "Please select an organization"),
  reason: z.string().min(10, "Please provide a detailed reason (minimum 10 characters)").max(500),
  duration: z.number().min(15).max(480).default(60), // 15 minutes to 8 hours
  accessScopes: z.object({
    organizationSettings: z.boolean().default(false),
    userManagement: z.boolean().default(false),
    projectData: z.boolean().default(false),
    communicationsData: z.boolean().default(false),
    surveyData: z.boolean().default(false),
    reportsData: z.boolean().default(false),
  }),
});

type SessionCreationData = z.infer<typeof sessionCreationSchema>;

export default function SuperAdminCustomerSupport() {
  const [selectedOrganization, setSelectedOrganization] = useState<string>("");
  const [isSupportModeEnabled, setIsSupportModeEnabled] = useState(false);
  const [activeSession, setActiveSession] = useState<SupportSession | null>(null);
  const [showSupportModeDialog, setShowSupportModeDialog] = useState(false);
  const [auditLogFilter, setAuditLogFilter] = useState<"all" | "customer_visible" | "write_actions">("all");

  // Form for session creation with validation
  const form = useForm<SessionCreationData>({
    resolver: zodResolver(sessionCreationSchema),
    defaultValues: {
      organizationId: "",
      reason: "",
      duration: 60,
      accessScopes: {
        organizationSettings: false,
        userManagement: false,
        projectData: false,
        communicationsData: false,
        surveyData: false,
        reportsData: false,
      },
    },
  });

  // Fetch organizations
  const { data: organizations, isLoading: isLoadingOrgs } = useQuery({
    queryKey: ["/api/super-admin/organizations"],
  });

  // Fetch active support session for selected organization
  const { data: currentSession } = useQuery({
    queryKey: ["/api/super-admin/support/session", selectedOrganization],
    enabled: !!selectedOrganization,
  });

  // Fetch recent support audit logs
  const { data: auditLogs } = useQuery({
    queryKey: ["/api/super-admin/support/audit-logs", selectedOrganization],
    enabled: !!selectedOrganization,
  });

  // Start support session mutation
  const startSessionMutation = useMutation({
    mutationFn: async (data: { organizationId: string; sessionType: string; reason: string; accessScopes?: any; duration?: number }) => {
      return apiRequest("POST", "/api/super-admin/support/session", data);
    },
    onSuccess: (data) => {
      setActiveSession(data);
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/support/session"] });
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/support/audit-logs"] });
    },
  });

  // End support session mutation
  const endSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      return apiRequest("PATCH", `/api/super-admin/support/session/${sessionId}/end`);
    },
    onSuccess: () => {
      setActiveSession(null);
      setIsSupportModeEnabled(false);
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/support/session"] });
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/support/audit-logs"] });
    },
  });

  // Toggle support mode mutation
  const toggleSupportModeMutation = useMutation({
    mutationFn: async (data: { sessionId: string; supportMode: boolean }) => {
      return apiRequest("PATCH", `/api/super-admin/support/session/${data.sessionId}/toggle-mode`, { supportMode: data.supportMode });
    },
    onSuccess: (data) => {
      setActiveSession(data);
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/support/session"] });
    },
  });

  const selectedOrg = (organizations as Organization[] || []).find((org: Organization) => org.id === selectedOrganization);
  const session = (currentSession as SupportSession) || activeSession;

  const handleStartSession = (data: SessionCreationData) => {
    // Now send all the properties including accessScopes and duration
    startSessionMutation.mutate({
      organizationId: data.organizationId,
      sessionType: "read_only",
      reason: data.reason,
      accessScopes: data.accessScopes,
      duration: data.duration,
    });
  };

  const handleEndSession = () => {
    if (!session?.id) return;
    endSessionMutation.mutate(session.id);
  };

  const handleToggleSupportMode = (enabled: boolean) => {
    if (!session?.id) return;
    
    setIsSupportModeEnabled(enabled);
    toggleSupportModeMutation.mutate({
      sessionId: session.id,
      supportMode: enabled,
    });
  };

  const handleImpersonateOrganization = () => {
    if (!selectedOrg) return;
    
    // This would navigate to the main app with impersonation context
    const impersonationUrl = `/?_support_org=${selectedOrg.id}&_support_mode=${isSupportModeEnabled ? 'write' : 'read'}`;
    window.open(impersonationUrl, '_blank');
  };

  return (
    <div className="space-y-6" data-testid="page-customer-support">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Customer Support
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Securely access customer organizations for support with full audit logging
          </p>
        </div>
        
        {session?.isActive && (
          <Badge variant={session.sessionType === "support_mode" ? "destructive" : "secondary"} className="text-sm">
            <Shield className="h-3 w-3 mr-1" />
            {session.sessionType === "support_mode" ? "Support Mode Active" : "Read-Only Session"}
          </Badge>
        )}
      </div>

      {/* Active Session Banner */}
      {session?.isActive && (
        <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800 dark:text-amber-200">
            <div className="flex items-center justify-between">
              <div>
                Active support session for <strong>{selectedOrg?.name}</strong> 
                {session.sessionType === "support_mode" && (
                  <span className="text-red-600 font-semibold"> (WRITE ACCESS ENABLED)</span>
                )}
                <div className="text-xs mt-1">
                  Started: {format(new Date(session.startedAt), "MMM d, yyyy h:mm a")} | 
                  Expires: {format(new Date(session.expiresAt), "MMM d, yyyy h:mm a")}
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleEndSession}
                data-testid="button-end-session"
              >
                End Session
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Organization Selection & Session Controls */}
        <div className="lg:col-span-2 space-y-6">
          {/* Organization Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building2 className="h-5 w-5 mr-2" />
                Select Organization
              </CardTitle>
              <CardDescription>
                Choose an organization to provide support assistance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="organization-select">Organization</Label>
                <Select
                  value={selectedOrganization}
                  onValueChange={setSelectedOrganization}
                  disabled={isLoadingOrgs || session?.isActive}
                >
                  <SelectTrigger data-testid="select-organization">
                    <SelectValue placeholder="Select an organization..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(organizations as Organization[] || []).map((org: Organization) => (
                      <SelectItem key={org.id} value={org.id}>
                        <div className="flex items-center justify-between w-full">
                          <span>{org.name}</span>
                          <Badge variant={org.status === "active" ? "default" : "secondary"} className="ml-2">
                            {org.status}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedOrg && !session?.isActive && (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleStartSession)} className="space-y-4 pt-4 border-t">
                    <FormField
                      control={form.control}
                      name="organizationId"
                      render={({ field }) => (
                        <FormItem className="hidden">
                          <FormControl>
                            <input type="hidden" {...field} value={selectedOrganization} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="reason"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Support Reason (Required)</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Enter detailed reason for accessing this organization (ticket #, issue description, etc.)"
                              data-testid="input-support-reason"
                              rows={3}
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            This reason will be logged and visible to the customer.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="duration"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Session Duration</FormLabel>
                          <FormControl>
                            <Select value={field.value.toString()} onValueChange={(value) => field.onChange(parseInt(value))}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="15">15 minutes</SelectItem>
                                <SelectItem value="30">30 minutes</SelectItem>
                                <SelectItem value="60">1 hour</SelectItem>
                                <SelectItem value="120">2 hours</SelectItem>
                                <SelectItem value="240">4 hours</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-3">
                      <FormLabel>Access Scope (Select areas you need access to)</FormLabel>
                      <div className="grid grid-cols-2 gap-3">
                        <FormField
                          control={form.control}
                          name="accessScopes.organizationSettings"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel className="text-sm font-normal">Organization Settings</FormLabel>
                              </div>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="accessScopes.userManagement"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel className="text-sm font-normal">User Management</FormLabel>
                              </div>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="accessScopes.projectData"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel className="text-sm font-normal">Project Data</FormLabel>
                              </div>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="accessScopes.communicationsData"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel className="text-sm font-normal">Communications</FormLabel>
                              </div>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="accessScopes.surveyData"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel className="text-sm font-normal">Survey Data</FormLabel>
                              </div>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="accessScopes.reportsData"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel className="text-sm font-normal">Reports & Analytics</FormLabel>
                              </div>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                    
                    <Button 
                      type="submit"
                      disabled={startSessionMutation.isPending}
                      className="w-full"
                      data-testid="button-start-session"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Start Read-Only Session
                    </Button>
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>

          {/* Session Controls */}
          {session?.isActive && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="h-5 w-5 mr-2" />
                  Session Controls
                </CardTitle>
                <CardDescription>
                  Manage your support session access level and actions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Support Mode Toggle */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label className="text-base font-medium">Support Mode</Label>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Enable write access for making changes to resolve customer issues
                      </p>
                    </div>
                    <Switch
                      checked={session.sessionType === "support_mode"}
                      onCheckedChange={handleToggleSupportMode}
                      disabled={toggleSupportModeMutation.isPending}
                      data-testid="switch-support-mode"
                    />
                  </div>
                  
                  {session.sessionType === "support_mode" && (
                    <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
                      <Lock className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-red-800 dark:text-red-200">
                        <strong>Support Mode Active:</strong> All actions will be logged and visible to the customer.
                        Use this mode only when necessary to resolve customer issues.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                <Separator />

                {/* Access Actions */}
                <div className="space-y-4">
                  <h4 className="font-medium">Access Organization</h4>
                  <Button 
                    onClick={handleImpersonateOrganization}
                    variant="outline"
                    className="w-full"
                    data-testid="button-impersonate"
                  >
                    <User className="h-4 w-4 mr-2" />
                    View as {selectedOrg?.name}
                    {session.sessionType === "support_mode" ? (
                      <Unlock className="h-4 w-4 ml-2 text-red-500" />
                    ) : (
                      <Eye className="h-4 w-4 ml-2" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Organization Details & Recent Activity */}
        <div className="space-y-6">
          {selectedOrg && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Database className="h-5 w-5 mr-2" />
                  Organization Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">Name</Label>
                    <p className="text-sm">{selectedOrg.name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">Status</Label>
                    <div>
                      <Badge variant={selectedOrg.status === "active" ? "default" : "secondary"}>
                        {selectedOrg.status}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">Max Users</Label>
                    <p className="text-sm">{selectedOrg.maxUsers}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">Enabled Features</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {Object.entries(selectedOrg.enabledFeatures || {}).map(([feature, enabled]) => (
                        enabled && (
                          <Badge key={feature} variant="outline" className="text-xs">
                            {feature}
                          </Badge>
                        )
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Support Activity */}
          {selectedOrganization && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <History className="h-5 w-5 mr-2" />
                  Recent Activity
                </CardTitle>
                <CardDescription>
                  Latest support access logs for this organization
                </CardDescription>
              </CardHeader>
              <CardContent>
                {(auditLogs as SupportAuditLog[] || []).length > 0 ? (
                  <div className="space-y-3">
                    {(auditLogs as SupportAuditLog[] || []).slice(0, 5).map((log: SupportAuditLog) => (
                      <div key={log.id} className="flex items-start space-x-3 text-sm border-b border-gray-100 dark:border-gray-800 pb-3 last:border-0">
                        <div className="flex-shrink-0 mt-1">
                          {log.accessLevel === "write" ? (
                            <Unlock className="h-3 w-3 text-red-500" />
                          ) : (
                            <Eye className="h-3 w-3 text-gray-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-900 dark:text-white font-medium">{log.description}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {log.accessLevel}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {format(new Date(log.createdAt), "MMM d, h:mm a")}
                            </span>
                            {log.isCustomerVisible && (
                              <Badge variant="secondary" className="text-xs">
                                Customer Visible
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No recent support activity</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Support Guidelines */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <HelpCircle className="h-5 w-5 mr-2" />
                Support Guidelines
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="space-y-2">
                <h4 className="font-medium text-green-700 dark:text-green-400">✓ Read-Only Mode</h4>
                <ul className="text-gray-600 dark:text-gray-400 space-y-1 ml-4">
                  <li>• View organization data safely</li>
                  <li>• No changes can be made</li>
                  <li>• All access is logged</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium text-amber-700 dark:text-amber-400">⚠ Support Mode</h4>
                <ul className="text-gray-600 dark:text-gray-400 space-y-1 ml-4">
                  <li>• Enable only when necessary</li>
                  <li>• All actions are logged</li>
                  <li>• Customer can view all changes</li>
                  <li>• Sessions auto-expire</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium text-blue-700 dark:text-blue-400">📋 Best Practices</h4>
                <ul className="text-gray-600 dark:text-gray-400 space-y-1 ml-4">
                  <li>• Always provide support reason</li>
                  <li>• End sessions when complete</li>
                  <li>• Limit access to necessary data</li>
                  <li>• Communicate transparently</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}