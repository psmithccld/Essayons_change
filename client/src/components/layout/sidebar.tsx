import { useState, useEffect } from "react";
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
  GripVertical
} from "lucide-react";
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
import { z } from "zod";

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
};

// All navigation items - Overview first (non-draggable), then draggable items
const allNavigationItems: NavigationItem[] = [
  { id: "overview", icon: ChartLine, label: "Overview", path: "/" },
  { id: "tasks", icon: ListTodo, label: "Tasks & To Do", path: "/tasks" },
  { id: "checklist-templates", icon: ListChecks, label: "Checklist Templates", path: "/checklist-templates" },
  { id: "gantt", icon: ChartGantt, label: "Gantt Charts", path: "/gantt" },
  { id: "raid-logs", icon: AlertTriangle, label: "RAID Logs", path: "/raid-logs" },
  { id: "progress-reports", icon: ChartBar, label: "Progress Reports", path: "/reports" },
  { id: "communications", icon: Megaphone, label: "Communications", path: "/communications" },
  { id: "stakeholders", icon: Users, label: "Stakeholders", path: "/stakeholders" },
  { id: "surveys", icon: ClipboardCheck, label: "Readiness Surveys", path: "/surveys" },
  { id: "gpt-coach", icon: Bot, label: "GPT Coach", path: "/gpt-coach" },
  { id: "fishbone", icon: Fish, label: "Fishbone Analysis", path: "/fishbone" },
  { id: "process-mapping", icon: GitBranch, label: "Process Mapping", path: "/process-mapping" },
  { id: "mind-maps", icon: Brain, label: "Mind Maps", path: "/mind-maps" }
];

// Draggable navigation items (excluding overview)
const defaultDraggableItems = allNavigationItems.slice(1);

const SIDEBAR_ORDER_KEY = "sidebarOrder";

export default function Sidebar() {
  const [location] = useLocation();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [draggableItems, setDraggableItems] = useState<NavigationItem[]>(defaultDraggableItems);
  const { toast } = useToast();

  // Load saved order from localStorage on component mount
  useEffect(() => {
    const savedOrder = localStorage.getItem(SIDEBAR_ORDER_KEY);
    if (savedOrder) {
      try {
        const savedIds = JSON.parse(savedOrder);
        // Reorder items based on saved order (excluding overview)
        const reorderedItems = savedIds
          .map((id: string) => defaultDraggableItems.find(item => item.id === id))
          .filter(Boolean);
        
        // Add any new items that weren't in the saved order
        const existingIds = new Set(savedIds);
        const newItems = defaultDraggableItems.filter(item => !existingIds.has(item.id));
        
        setDraggableItems([...reorderedItems, ...newItems]);
      } catch (error) {
        console.error('Failed to parse saved sidebar order:', error);
        setDraggableItems(defaultDraggableItems);
      }
    }
  }, []);

  // Save order to localStorage whenever items change
  const saveOrder = (items: NavigationItem[]) => {
    const itemIds = items.map(item => item.id);
    localStorage.setItem(SIDEBAR_ORDER_KEY, JSON.stringify(itemIds));
  };

  // Handle drag end event (only for draggable items)
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) {
      return;
    }

    const items = Array.from(draggableItems);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setDraggableItems(items);
    saveOrder(items);
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
    // Here we would normally save to backend/local storage
    toast({
      title: "Settings Updated",
      description: "Your preferences have been saved successfully!",
    });
    setIsSettingsOpen(false);
  };

  // Render a draggable navigation item
  const renderDraggableItem = (item: NavigationItem, index: number) => {
    const isActive = location === item.path;
    const IconComponent = item.icon;

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

  // Render a non-draggable navigation item
  const renderNavigationItem = (item: NavigationItem) => {
    const isActive = location === item.path;
    const IconComponent = item.icon;

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
                  {draggableItems.map((item, index) => 
                    renderDraggableItem(item, index)
                  )}
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
            <p className="text-sm font-medium text-foreground truncate">Dr. Jane Doe</p>
            <p className="text-xs text-muted-foreground truncate">PhD Candidate</p>
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
                          <FormItem className="flex flex-col sm:flex-row sm:items-center justify-between rounded-lg border p-4 space-y-3 sm:space-y-0">
                            <div className="space-y-0.5 flex-1 min-w-0">
                              <FormLabel className="text-base">Push Notifications</FormLabel>
                              <div className="text-sm text-muted-foreground">
                                Receive notifications about project updates
                              </div>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="switch-notifications"
                                className="flex-shrink-0"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="emailNotifications"
                        render={({ field }) => (
                          <FormItem className="flex flex-col sm:flex-row sm:items-center justify-between rounded-lg border p-4 space-y-3 sm:space-y-0">
                            <div className="space-y-0.5 flex-1 min-w-0">
                              <FormLabel className="text-base">Email Notifications</FormLabel>
                              <div className="text-sm text-muted-foreground">
                                Receive email updates about your projects
                              </div>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="switch-email-notifications"
                                className="flex-shrink-0"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="autoSave"
                        render={({ field }) => (
                          <FormItem className="flex flex-col sm:flex-row sm:items-center justify-between rounded-lg border p-4 space-y-3 sm:space-y-0">
                            <div className="space-y-0.5 flex-1 min-w-0">
                              <FormLabel className="text-base">Auto-save</FormLabel>
                              <div className="text-sm text-muted-foreground">
                                Automatically save your work while editing
                              </div>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="switch-auto-save"
                                className="flex-shrink-0"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row sm:justify-end gap-2 sm:gap-2 pt-6">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsSettingsOpen(false)}
                        data-testid="button-cancel-settings"
                        className="w-full sm:w-auto"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        data-testid="button-save-settings"
                        className="w-full sm:w-auto"
                      >
                        Save Settings
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
