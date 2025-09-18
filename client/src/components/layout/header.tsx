import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Plus, User, Shield, Briefcase, ChevronDown, Settings, Palette, Check, Trash2, UserPlus, AlertTriangle, BarChart3, RefreshCw, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { insertProjectSchema, type InsertProject, type Notification } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useCurrentProject } from "@/contexts/CurrentProjectContext";
import { usePermissions } from "@/hooks/use-permissions";
import { Link } from "wouter";
import { z } from "zod";
import { formatDistanceToNow } from "date-fns";

const projectFormSchema = insertProjectSchema.extend({
  name: z.string().min(1, "Project name is required"),
  description: z.string().optional(),
  status: z.enum(["identify_need", "identify_stakeholders", "develop_change", "implement_change", "reinforce_change"]).default("identify_need"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

type ProjectFormData = z.infer<typeof projectFormSchema>;

const userSettingsSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email").optional(),
  role: z.string().optional(),
  theme: z.enum(["light", "dark", "system"]).default("system"),
  notifications: z.boolean().default(true),
  emailNotifications: z.boolean().default(true),
  autoSave: z.boolean().default(true),
});

type UserSettingsData = z.infer<typeof userSettingsSchema>;

export default function Header() {
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentProject, setCurrentProject, projects, isLoading } = useCurrentProject();
  const { user, hasAnyPermission } = usePermissions();

  // Generate user initials from name
  const getUserInitials = (name: string) => {
    if (!name) return "U";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  // Notification icon helper
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'initiative_assignment':
        return <Briefcase className="w-4 h-4" />;
      case 'stakeholder_added':
        return <UserPlus className="w-4 h-4" />;
      case 'raid_identified':
        return <AlertTriangle className="w-4 h-4" />;
      case 'phase_change':
        return <BarChart3 className="w-4 h-4" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  // Notification queries and mutations
  const { data: notifications, isLoading: notificationsLoading, error: notificationsError } = useQuery({
    queryKey: ['/api/notifications'],
    refetchInterval: 30000, // Auto-refresh every 30 seconds
    refetchIntervalInBackground: true,
  });

  const { data: unreadCount, isLoading: unreadCountLoading } = useQuery({
    queryKey: ['/api/notifications/unread-count'],
    refetchInterval: 30000, // Auto-refresh every 30 seconds
    refetchIntervalInBackground: true,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await apiRequest("POST", `/api/notifications/${notificationId}/read`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
      toast({
        title: "Notification marked as read",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to mark notification as read",
        variant: "destructive",
      });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/notifications/mark-all-read");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
      toast({
        title: "All notifications marked as read",
        description: `${data.markedAsRead} notifications updated`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to mark all notifications as read",
        variant: "destructive",
      });
    },
  });

  const clearAllNotificationsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", "/api/notifications/clear-all");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
      toast({
        title: "All notifications cleared",
        description: `${data.deletedCount} notifications deleted`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error", 
        description: error.message || "Failed to clear all notifications",
        variant: "destructive",
      });
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await apiRequest("DELETE", `/api/notifications/${notificationId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
      toast({
        title: "Notification deleted",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete notification",
        variant: "destructive",
      });
    },
  });

  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: "",
      description: "",
      status: "identify_need",
      progress: 0,
      ownerId: "550e8400-e29b-41d4-a716-446655440000", // Default user UUID
    },
  });

  const createProjectMutation = useMutation({
    mutationFn: async (data: ProjectFormData) => {
      const response = await apiRequest("POST", "/api/projects", data);
      return response.json();
    },
    onSuccess: (newProject) => {
      toast({
        title: "Success",
        description: "Project created successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      // Set the newly created project as current
      setCurrentProject(newProject);
      setIsNewProjectOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create project",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ProjectFormData) => {
    createProjectMutation.mutate(data);
  };

  // User Settings Form
  const settingsForm = useForm<UserSettingsData>({
    resolver: zodResolver(userSettingsSchema),
    defaultValues: {
      name: user?.name || "",
      email: user?.username || "",
      role: "User",
      theme: "system",
      notifications: true,
      emailNotifications: true,
      autoSave: true,
    },
  });

  const onSettingsSubmit = (data: UserSettingsData) => {
    console.log("Settings updated:", data);
    toast({
      title: "Settings Updated",
      description: "Your preferences have been saved successfully!",
    });
    setIsSettingsOpen(false);
  };

  return (
    <header className="bg-card border-b border-border px-6 py-4" data-testid="header">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6">
          
          {/* Initiative Dropdown */}
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-muted-foreground">Current Initiative:</span>
            <Select 
              value={currentProject?.id || ""} 
              onValueChange={(projectId) => {
                const project = projects.find(p => p.id === projectId);
                if (project) {
                  setCurrentProject(project);
                }
              }}
              disabled={isLoading}
            >
              <SelectTrigger className="w-[250px]" data-testid="select-current-initiative">
                <SelectValue 
                  placeholder={isLoading ? "Loading initiatives..." : "Select an initiative..."} 
                />
              </SelectTrigger>
              <SelectContent>
                {isLoading ? (
                  <SelectItem value="loading" disabled>Loading...</SelectItem>
                ) : projects.length === 0 ? (
                  <SelectItem value="none" disabled>No initiatives available</SelectItem>
                ) : (
                  projects.map((project) => (
                    <SelectItem key={project.id} value={project.id} data-testid={`option-project-${project.id}`}>
                      {project.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* New Initiative Button - Moved to left side */}
          <Button 
            onClick={() => setIsNewProjectOpen(true)}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            data-testid="button-new-initiative"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Initiative
          </Button>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Interactive Notification System */}
          <DropdownMenu open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen}>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="relative h-10 w-10 rounded-full"
                data-testid="button-notifications"
              >
                {notificationsLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                ) : (
                  <Bell className="w-5 h-5 text-muted-foreground hover:text-foreground" />
                )}
                {/* Notification Count Badge */}
                {!unreadCountLoading && unreadCount && unreadCount.count > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
                    data-testid="badge-notification-count"
                  >
                    {unreadCount.count > 99 ? '99+' : unreadCount.count}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80" data-testid="dropdown-notifications">
              <div className="flex items-center justify-between p-3 border-b">
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                <div className="flex items-center space-x-2">
                  {/* Mark All as Read Button */}
                  {!unreadCountLoading && unreadCount && unreadCount.count > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => markAllAsReadMutation.mutate()}
                      disabled={markAllAsReadMutation.isPending}
                      data-testid="button-mark-all-read"
                    >
                      {markAllAsReadMutation.isPending ? (
                        <Loader2 className="w-3 h-3 animate-spin mr-1" />
                      ) : (
                        <Check className="w-3 h-3 mr-1" />
                      )}
                      Mark all read
                    </Button>
                  )}
                  {/* Clear All Notifications Button */}
                  {!notificationsLoading && notifications && notifications.notifications?.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => clearAllNotificationsMutation.mutate()}
                      disabled={clearAllNotificationsMutation.isPending}
                      data-testid="button-clear-all"
                    >
                      {clearAllNotificationsMutation.isPending ? (
                        <Loader2 className="w-3 h-3 animate-spin mr-1" />
                      ) : (
                        <Trash2 className="w-3 h-3 mr-1" />
                      )}
                      Clear all
                    </Button>
                  )}
                </div>
              </div>
              
              {/* Notification List */}
              <ScrollArea className="h-96" data-testid="scroll-notifications">
                {notificationsLoading ? (
                  <div className="p-4 space-y-3">
                    <Skeleton className="h-16 w-full" data-testid="skeleton-notification" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : notificationsError ? (
                  <div className="p-4 text-center text-muted-foreground" data-testid="error-notifications">
                    <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
                    <p>Failed to load notifications</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/notifications'] })}
                      className="mt-2"
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Retry
                    </Button>
                  </div>
                ) : !notifications?.notifications?.length ? (
                  <div className="p-4 text-center text-muted-foreground" data-testid="empty-notifications">
                    <Bell className="w-8 h-8 mx-auto mb-2" />
                    <p>No notifications</p>
                    <p className="text-xs">You're all caught up!</p>
                  </div>
                ) : (
                  <div className="p-2">
                    {notifications.notifications.map((notification: Notification) => (
                      <div
                        key={notification.id}
                        className={`flex items-start space-x-3 p-3 rounded-lg border mb-2 ${
                          notification.isRead 
                            ? 'bg-muted/30 border-muted' 
                            : 'bg-card border-border shadow-sm'
                        }`}
                        data-testid={`notification-${notification.id}`}
                      >
                        <div className={`flex-shrink-0 p-1.5 rounded-full ${
                          notification.isRead ? 'bg-muted' : 'bg-primary/10'
                        }`}>
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className={`text-sm font-medium truncate ${
                            notification.isRead ? 'text-muted-foreground' : 'text-foreground'
                          }`}>
                            {notification.title}
                          </h4>
                          <p className={`text-xs mt-1 line-clamp-2 ${
                            notification.isRead ? 'text-muted-foreground/70' : 'text-muted-foreground'
                          }`}>
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground/60 mt-2">
                            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                        <div className="flex flex-col space-y-1">
                          {!notification.isRead && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => markAsReadMutation.mutate(notification.id)}
                              disabled={markAsReadMutation.isPending}
                              data-testid={`button-mark-read-${notification.id}`}
                            >
                              <Check className="w-3 h-3" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteNotificationMutation.mutate(notification.id)}
                            disabled={deleteNotificationMutation.isPending}
                            data-testid={`button-delete-${notification.id}`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* User Settings Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="relative h-10 w-10 rounded-full" data-testid="button-user-settings">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-primary-foreground">
                    {getUserInitials(user?.name || "")}
                  </span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {hasAnyPermission('canSeeUsers') && (
                <DropdownMenuItem asChild>
                  <Link href="/users" className="flex items-center w-full" data-testid="nav-user-management">
                    <User className="w-4 h-4 mr-2" />
                    User Management
                  </Link>
                </DropdownMenuItem>
              )}
              {hasAnyPermission('canSeeRoles') && (
                <DropdownMenuItem asChild>
                  <Link href="/security" className="flex items-center w-full" data-testid="nav-security-roles">
                    <Shield className="w-4 h-4 mr-2" />
                    Security & Roles
                  </Link>
                </DropdownMenuItem>
              )}
              {hasAnyPermission('canSeeAllProjects', 'canModifyProjects', 'canEditAllProjects') && (
                <DropdownMenuItem asChild>
                  <Link href="/initiatives" className="flex items-center w-full" data-testid="nav-initiative-management">
                    <Briefcase className="w-4 h-4 mr-2" />
                    Initiative Management
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setIsSettingsOpen(true)} data-testid="nav-user-settings">
                <Settings className="w-4 h-4 mr-2" />
                User Settings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* New Project Modal */}
      <Dialog open={isNewProjectOpen} onOpenChange={setIsNewProjectOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Initiative</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Initiative Name *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter initiative name..."
                        data-testid="input-project-name"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe the initiative goals and scope..."
                        data-testid="input-project-description"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-project-status">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="identify_need">Identify Need to Change</SelectItem>
                        <SelectItem value="identify_stakeholders">Identify Stakeholders</SelectItem>
                        <SelectItem value="develop_change">Develop the Change</SelectItem>
                        <SelectItem value="implement_change">Implement the Change</SelectItem>
                        <SelectItem value="reinforce_change">Reinforce the Change</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input 
                        type="date"
                        data-testid="input-project-start-date"
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value || undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
                    <FormControl>
                      <Input 
                        type="date"
                        data-testid="input-project-end-date"
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value || undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsNewProjectOpen(false)}
                  data-testid="button-cancel-project"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createProjectMutation.isPending}
                  data-testid="button-create-project"
                >
                  {createProjectMutation.isPending ? "Creating..." : "Create Initiative"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* User Settings Sheet */}
      <Sheet open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <SheetContent side="right" className="w-full max-w-[400px] sm:max-w-[540px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              User Settings
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <Form {...settingsForm}>
              <form onSubmit={settingsForm.handleSubmit(onSettingsSubmit)} className="space-y-6">
                {/* Profile Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground border-b pb-2">
                    <User className="w-4 h-4" />
                    Profile
                  </div>
                  <FormField
                    control={settingsForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input data-testid="input-settings-name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={settingsForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" data-testid="input-settings-email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={settingsForm.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <FormControl>
                          <Input data-testid="input-settings-role" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Appearance Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground border-b pb-2">
                    <Palette className="w-4 h-4" />
                    Appearance
                  </div>
                  <FormField
                    control={settingsForm.control}
                    name="theme"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Theme</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-settings-theme">
                              <SelectValue placeholder="Select theme" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="light">Light</SelectItem>
                            <SelectItem value="dark">Dark</SelectItem>
                            <SelectItem value="system">System</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Notifications Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground border-b pb-2">
                    <Bell className="w-4 h-4" />
                    Notifications
                  </div>
                  <FormField
                    control={settingsForm.control}
                    name="notifications"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            Push Notifications
                          </FormLabel>
                          <div className="text-sm text-muted-foreground">
                            Get notified about important updates
                          </div>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-settings-notifications"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={settingsForm.control}
                    name="emailNotifications"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            Email Notifications
                          </FormLabel>
                          <div className="text-sm text-muted-foreground">
                            Receive updates via email
                          </div>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-settings-email-notifications"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={settingsForm.control}
                    name="autoSave"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            Auto Save
                          </FormLabel>
                          <div className="text-sm text-muted-foreground">
                            Automatically save your work
                          </div>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-settings-auto-save"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button type="submit" data-testid="button-save-settings">
                    Save Changes
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsSettingsOpen(false)}
                    data-testid="button-cancel-settings"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
