import { useState } from "react";
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
  ListChecks
} from "lucide-react";
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

const navigationSections = [
  {
    title: "Dashboard",
    items: [
      { icon: ChartLine, label: "Overview", path: "/" }
    ]
  },
  {
    title: "PMIS Tools", 
    items: [
      { icon: ListTodo, label: "Tasks & To Do", path: "/tasks" },
      { icon: ListChecks, label: "Checklist Templates", path: "/checklist-templates" },
      { icon: ChartGantt, label: "Gantt Charts", path: "/gantt" },
      { icon: AlertTriangle, label: "RAID Logs", path: "/raid-logs" },
      { icon: ChartBar, label: "Progress Reports", path: "/" }
    ]
  },
  {
    title: "Change Management",
    items: [
      { icon: Megaphone, label: "Communications", path: "/communications" },
      { icon: Users, label: "Stakeholders", path: "/stakeholders" },
      { icon: ClipboardCheck, label: "Readiness Surveys", path: "/surveys" },
      { icon: Bot, label: "GPT Coach", path: "/gpt-coach" }
    ]
  },
  {
    title: "Visual Tools",
    items: [
      { icon: Fish, label: "Fishbone Analysis", path: "/fishbone" },
      { icon: GitBranch, label: "Process Mapping", path: "/process-mapping" },
      { icon: Brain, label: "Mind Maps", path: "/mind-maps" }
    ]
  }
];

export default function Sidebar() {
  const [location] = useLocation();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { toast } = useToast();

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

  return (
    <div className="w-64 bg-card border-r border-border flex flex-col" data-testid="sidebar">
      {/* Logo Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <ChartLine className="text-primary-foreground w-4 h-4" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">CMIS</h1>
            <p className="text-xs text-muted-foreground">Change Management</p>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4 space-y-2">
        {navigationSections.map((section, sectionIndex) => (
          <div key={sectionIndex} className="mb-4">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              {section.title}
            </h3>
            <div className="space-y-1">
              {section.items.map((item, itemIndex) => {
                const isActive = location === item.path;
                const IconComponent = item.icon;
                
                return (
                  <Link key={itemIndex} href={item.path}>
                    <a 
                      className={cn(
                        "flex items-center space-x-3 p-2 rounded-md text-sm font-medium transition-colors",
                        isActive 
                          ? "bg-primary text-primary-foreground" 
                          : "text-foreground hover:bg-muted"
                      )}
                      data-testid={`nav-${item.label.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-')}`}
                    >
                      <IconComponent className="w-4 h-4" />
                      <span>{item.label}</span>
                    </a>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
            <span className="text-xs font-medium text-secondary-foreground">JD</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">Dr. Jane Doe</p>
            <p className="text-xs text-muted-foreground truncate">PhD Candidate</p>
          </div>
          <Sheet open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
            <SheetTrigger asChild>
              <Settings 
                className="text-muted-foreground w-4 h-4 cursor-pointer hover:text-foreground" 
                data-testid="settings-button"
              />
            </SheetTrigger>
            <SheetContent side="right" className="w-[400px] sm:w-[540px]">
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
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
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
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="emailNotifications"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
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
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="autoSave"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
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
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex justify-end space-x-2 pt-6">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsSettingsOpen(false)}
                        data-testid="button-cancel-settings"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        data-testid="button-save-settings"
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
