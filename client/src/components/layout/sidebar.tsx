import { useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  ChartLine,
  ListTodo,
  ChartGantt,
  AlertTriangle,
  ChartBar,
  Megaphone,
  Users,
  ClipboardCheck,
  Bot,
  Fish,
  GitBranch,
  Brain,
  Settings,
  User,
  Palette,
  Bell,
  ListChecks,
  GripVertical,
  Briefcase,
  Shield
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { DragDropContext, Droppable, Draggable, DropResult } from "react-beautiful-dnd";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/use-permissions";
import { z } from "zod";
import type { Permissions } from "@shared/schema";

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

type NavigationItem = {
  id: string;
  icon: any;
  label: string;
  path: string;
  permissions?: (keyof Permissions)[];
  requireAll?: boolean; // If true, user must have ALL permissions. If false, user needs ANY permission
  customCheck?: () => boolean;
};

// All navigation items with permission requirements
const allNavigationItems: NavigationItem[] = [
  { id: "overview", icon: ChartLine, label: "Overview", path: "/" },
  { id: "tasks", icon: ListTodo, label: "Tasks & To Do", path: "/tasks" },
  { id: "checklist-templates", icon: ListChecks, label: "Checklist Templates", path: "/checklist-templates" },
  { id: "gantt", icon: ChartGantt, label: "Gantt Charts", path: "/gantt" },
  { id: "raid-logs", icon: AlertTriangle, label: "RAID Logs", path: "/raid-logs" },
  { id: "progress-reports", icon: ChartBar, label: "Progress Reports", path: "/reports", permissions: ["canSeeReports"] },
  { id: "communications", icon: Megaphone, label: "Communications", path: "/communications" },
  { id: "stakeholders", icon: Users, label: "Stakeholders", path: "/stakeholders" },
  { id: "surveys", icon: ClipboardCheck, label: "Readiness Surveys", path: "/surveys" },
  { id: "gpt-coach", icon: Bot, label: "GPT Coach", path: "/gpt-coach" },
  { id: "fishbone", icon: Fish, label: "Fishbone Analysis", path: "/fishbone" },
  { id: "process-mapping", icon: GitBranch, label: "Development Maps", path: "/process-mapping", permissions: ["canSeeAllProjects", "canModifyProjects"], requireAll: false },
  { id: "mind-maps", icon: Brain, label: "Mind Maps", path: "/mind-maps", permissions: ["canSeeAllProjects", "canModifyProjects"], requireAll: false }
];

const SIDEBAR_ORDER_KEY = "sidebarOrder";

export default function Sidebar() {
  const [location] = useLocation();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [dragOrder, setDragOrder] = useState<string[]>([]);
  const { toast } = useToast();
  const { isLoading: permissionsLoading, hasAllPermissions, hasAnyPermission, user } = usePermissions();

  // Get ordered draggable items (excluding overview)
  const orderedDraggableItems = useMemo(() => {
    const baseDraggableItems = allNavigationItems.slice(1);
    
    // If we have a drag order, use it
    if (dragOrder.length > 0) {
      const ordered = dragOrder
        .map(id => baseDraggableItems.find(item => item.id === id))
        .filter(Boolean) as NavigationItem[];
      
      // Add any new items not in the order
      const existingIds = new Set(dragOrder);
      const newItems = baseDraggableItems.filter(item => !existingIds.has(item.id));
      
      return [...ordered, ...newItems];
    }
    
    // Otherwise try to load from localStorage
    try {
      const savedOrder = localStorage.getItem(SIDEBAR_ORDER_KEY);
      if (savedOrder) {
        const savedIds = JSON.parse(savedOrder);
        const ordered = savedIds
          .map((id: string) => baseDraggableItems.find(item => item.id === id))
          .filter(Boolean) as NavigationItem[];
        
        const existingIds = new Set(savedIds);
        const newItems = baseDraggableItems.filter(item => !existingIds.has(item.id));
        
        return [...ordered, ...newItems];
      }
    } catch (error) {
      console.error('Failed to parse saved sidebar order:', error);
    }
    
    return baseDraggableItems;
  }, [dragOrder]);

  // Handle drag end event
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) {
      return;
    }

    const items = Array.from(orderedDraggableItems);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const newOrder = items.map(item => item.id);
    setDragOrder(newOrder);
    
    // Save to localStorage
    localStorage.setItem(SIDEBAR_ORDER_KEY, JSON.stringify(newOrder));
  };

  const form = useForm<UserSettingsData>({
    resolver: zodResolver(userSettingsSchema),
    defaultValues: {
      name: "Dr. Jane Doe",
      email: "jane.doe@university.edu",
      role: "PhD Candidate",
      theme: "system",
      notifications: true,
      emailNotifications: true,
      autoSave: true,
    },
  });

  const onSettingsSubmit = (data: UserSettingsData) => {
    toast({
      title: "Settings Updated",
      description: "Your preferences have been saved successfully!",
    });
    setIsSettingsOpen(false);
  };

  // Check if user has permission for a navigation item
  const hasPermissionForItem = (item: NavigationItem): boolean => {
    if (!item.permissions || item.permissions.length === 0) {
      return true;
    }

    if (item.customCheck) {
      return item.customCheck();
    }

    if (item.requireAll) {
      return hasAllPermissions(...item.permissions);
    } else {
      return hasAnyPermission(...item.permissions);
    }
  };

  // Render a draggable navigation item
  const renderDraggableItem = (item: NavigationItem, index: number) => {
    // Check permissions at render time
    if (!hasPermissionForItem(item) && !permissionsLoading) {
      return null;
    }

    const isActive = location === item.path;
    const IconComponent = item.icon;

    // Show skeleton while loading permissions
    if (permissionsLoading) {
      return (
        <div key={item.id} className="mb-1">
          <div className="flex items-center space-x-3 p-2">
            <Skeleton className="w-4 h-4 rounded" />
            <Skeleton className="h-4 flex-1" />
          </div>
        </div>
      );
    }

    return (
      <Draggable key={item.id} draggableId={item.id} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className={cn(
              "mb-1",
              snapshot.isDragging && "shadow-lg"
            )}
          >
            <Link href={item.path}>
              <div 
                className={cn(
                  "flex items-center space-x-3 p-2 rounded-md text-sm font-medium transition-colors group cursor-pointer",
                  isActive 
                    ? "bg-primary text-primary-foreground" 
                    : "text-foreground hover:bg-muted"
                )}
                data-testid={`nav-${item.label.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-')}`}
              >
                <GripVertical className="w-4 h-4 text-muted-foreground group-hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                <IconComponent className="w-4 h-4" />
                <span className="flex-1">{item.label}</span>
              </div>
            </Link>
          </div>
        )}
      </Draggable>
    );
  };

  // Render a non-draggable navigation item (overview)
  const renderNavigationItem = (item: NavigationItem) => {
    const isActive = location === item.path;
    const IconComponent = item.icon;

    // Show skeleton while loading permissions
    if (permissionsLoading) {
      return (
        <div key={item.id} className="mb-1">
          <div className="flex items-center space-x-3 p-2">
            <Skeleton className="w-4 h-4 rounded" />
            <Skeleton className="h-4 flex-1" />
          </div>
        </div>
      );
    }

    return (
      <div key={item.id} className="mb-1">
        <Link href={item.path}>
          <div 
            className={cn(
              "flex items-center space-x-3 p-2 rounded-md text-sm font-medium transition-colors cursor-pointer",
              isActive 
                ? "bg-primary text-primary-foreground" 
                : "text-foreground hover:bg-muted"
            )}
            data-testid={`nav-${item.label.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-')}`}
          >
            <IconComponent className="w-4 h-4" />
            <span>{item.label}</span>
          </div>
        </Link>
      </div>
    );
  };

  return (
    <div className="w-64 min-w-0 bg-card border-r border-border flex flex-col h-screen" data-testid="sidebar">
      {/* Logo Header */}
      <div className="p-4 sm:p-6 border-b border-border flex-shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <ChartLine className="text-primary-foreground w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-semibold text-foreground truncate">CMIS</h1>
            <p className="text-xs text-muted-foreground truncate">Change Management</p>
          </div>
        </div>
      </div>

      {/* Navigation Menu - Scrollable */}
      <nav className="flex-1 overflow-y-auto min-h-0 p-4">
        <div className="space-y-1">
          {/* Overview - Fixed at Top */}
          {renderNavigationItem(allNavigationItems[0])}
          
          {/* Draggable Navigation Items */}
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="navigation">
              {(provided, snapshot) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className={cn(
                    "space-y-1 mt-1",
                    snapshot.isDraggingOver && "bg-muted/50 rounded-md p-1"
                  )}
                >
                  {orderedDraggableItems.map((item, index) => 
                    renderDraggableItem(item, index)
                  ).filter(Boolean)}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-border flex-shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-medium text-secondary-foreground">JD</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{user?.name || "Loading..."}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.username || "Loading..."}</p>
          </div>
          <Sheet open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
            <SheetTrigger asChild>
              <Settings 
                className="text-muted-foreground w-4 h-4 cursor-pointer hover:text-foreground flex-shrink-0" 
                data-testid="settings-button"
              />
            </SheetTrigger>
            <SheetContent side="right" className="w-full max-w-[400px] sm:max-w-[540px] overflow-y-auto">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  User Settings
                </SheetTitle>
              </SheetHeader>
              <div className="mt-6">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSettingsSubmit)} className="space-y-6">
                    {/* Profile Section */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-foreground border-b pb-2">
                        <User className="w-4 h-4" />
                        Profile
                      </div>
                      <FormField
                        control={form.control}
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
                        control={form.control}
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
                        control={form.control}
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
                        control={form.control}
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
                        control={form.control}
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
                        control={form.control}
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
                        control={form.control}
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
        </div>
      </div>
    </div>
  );
}