import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Calendar, User as UserIcon, AlertCircle, CheckCircle, Clock, Pause, X, ListChecks, FileText, Building, Code, Megaphone, Settings, Edit, Trash2, Copy, Zap, Play, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useCurrentProject } from "@/contexts/CurrentProjectContext";
import type { Project, Task, User, ChecklistTemplate } from "@shared/schema";

const taskFormSchema = z.object({
  name: z.string().min(1, "Task name is required"),
  description: z.string().optional(),
  status: z.enum(["pending", "in_progress", "completed", "blocked"]),
  priority: z.enum(["low", "medium", "high", "critical"]),
  assigneeId: z.string().optional(),
  assigneeEmail: z.string().optional(),
  assignmentType: z.enum(["user", "external"]).default("user"),
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
  checklist: z.array(z.object({
    id: z.string(),
    text: z.string(),
    completed: z.boolean()
  })).optional().default([]),
}).refine(
  (data) => {
    // If assignment type is external, require a valid email
    if (data.assignmentType === "external") {
      return data.assigneeEmail && data.assigneeEmail.trim().length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.assigneeEmail);
    }
    return true;
  },
  {
    message: "Email is required for external assignments",
    path: ["assigneeEmail"],
  }
);

type TaskFormData = z.infer<typeof taskFormSchema>;

function getStatusIcon(status: string) {
  switch (status) {
    case 'completed': return <CheckCircle className="w-4 h-4 text-green-600" />;
    case 'in_progress': return <Clock className="w-4 h-4 text-blue-600" />;
    case 'blocked': return <Pause className="w-4 h-4 text-red-600" />;
    default: return <AlertCircle className="w-4 h-4 text-gray-600" />;
  }
}

function getPriorityColor(priority: string) {
  switch (priority) {
    case 'critical': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
    case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
    case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
    default: return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
    case 'in_progress': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
    case 'blocked': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
  }
}

const categories = [
  { value: "development", label: "Development", icon: Code },
  { value: "marketing", label: "Marketing", icon: Megaphone },
  { value: "operations", label: "Operations", icon: Settings },
  { value: "general", label: "General", icon: Building },
];

interface TaskChecklistProps {
  checklist: Array<{id: string, text: string, completed: boolean}>;
  taskId: string;
  onToggleItem: (taskId: string, itemId: string, completed: boolean) => void;
}

function TaskChecklist({ checklist, taskId, onToggleItem }: TaskChecklistProps) {
  return (
    <div className="mb-3 space-y-2">
      <div className="flex items-center space-x-2">
        <ListChecks className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium text-muted-foreground">
          Checklist ({checklist.filter(item => item.completed).length}/{checklist.length})
        </span>
      </div>
      <div className="space-y-1 ml-6">
        {checklist.map((item) => (
          <div key={item.id} className="flex items-center space-x-2">
            <Checkbox
              checked={item.completed}
              onCheckedChange={(checked) => 
                onToggleItem(taskId, item.id, checked as boolean)
              }
              data-testid={`checkbox-${taskId}-${item.id}`}
            />
            <span 
              className={`text-sm ${
                item.completed 
                  ? 'line-through text-muted-foreground' 
                  : 'text-foreground'
              }`}
            >
              {item.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function getCategoryIcon(category: string) {
  const categoryData = categories.find(c => c.value === category);
  const IconComponent = categoryData?.icon || Building;
  return <IconComponent className="w-4 h-4" />;
}

function getCategoryColor(category: string) {
  switch (category) {
    case 'development': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
    case 'marketing': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
    case 'operations': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
  }
}

// Helper functions for task display
function getPriorityVariant(priority: string): "default" | "secondary" | "destructive" | "outline" {
  switch (priority) {
    case 'critical': return 'destructive';
    case 'high': return 'secondary';  
    case 'medium': return 'outline';
    default: return 'default';
  }
}

function getStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case 'completed': return 'default';
    case 'in_progress': return 'secondary';
    case 'blocked': return 'destructive';
    default: return 'outline';
  }
}

export default function Tasks() {
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [newChecklistItem, setNewChecklistItem] = useState("");
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("dueDate");
  const [viewMode, setViewMode] = useState<string>("cards");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentProject, projects } = useCurrentProject();

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ['/api/projects', currentProject?.id, 'tasks'],
    enabled: !!currentProject?.id,
  });

  const { data: templates = [] } = useQuery<ChecklistTemplate[]>({
    queryKey: ['/api/checklist-templates/active'],
  });

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      status: "pending",
      priority: "medium",
      assignmentType: "user",
      assigneeId: "unassigned",
      assigneeEmail: "",
    },
  });

  // Watch assignmentType and clear the external email when appropriate.
  // UseEffect avoids clearing repeatedly from Select internals and centralizes logic.
  const assignmentTypeValue = form.watch("assignmentType");
  useEffect(() => {
    const currentEmail = form.getValues("assigneeEmail");
    if (assignmentTypeValue === "external") {
      // Only clear when it's the sentinel or empty to avoid overwriting user input
      if (!currentEmail || currentEmail === "unassigned") {
        form.setValue("assigneeEmail", "", { shouldValidate: false });
      }
    } else {
      // switching to user: clear external email (don't disturb if already empty)
      if (currentEmail) {
        form.setValue("assigneeEmail", "", { shouldValidate: false });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignmentTypeValue]);

  const createTaskMutation = useMutation({
    mutationFn: async (taskData: TaskFormData) => {
      if (!currentProject?.id) throw new Error("No project selected");
      return apiRequest("POST", `/api/projects/${currentProject.id}/tasks`, taskData);
    },
    onSuccess: async () => {
      form.reset();
      await queryClient.invalidateQueries({ queryKey: ['/api/projects', currentProject?.id, 'tasks'] });
      setIsTaskDialogOpen(false);
      setEditingTask(null);
      toast({
        title: "Success",
        description: "Task created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create task",
        variant: "destructive",
      });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, data }: { taskId: string; data: Partial<Task> }) => {
      return apiRequest("PUT", `/api/tasks/${taskId}`, data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/projects', currentProject?.id, 'tasks'] });
      setIsTaskDialogOpen(false);
      setEditingTask(null);
      toast({
        title: "Success", 
        description: "Task updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      return apiRequest("DELETE", `/api/tasks/${taskId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', currentProject?.id, 'tasks'] });
      toast({
        title: "Success",
        description: "Task deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete task",
        variant: "destructive",
      });
    },
  });

  const handleDeleteTask = (taskId: string, taskName: string) => {
    if (window.confirm(`Are you sure you want to delete "${taskName}"? This action cannot be undone.`)) {
      deleteTaskMutation.mutate(taskId);
    }
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    
    // Ensure checklist is properly typed
    const checklistData = Array.isArray(task.checklist) 
      ? (task.checklist as Array<{id: string, text: string, completed: boolean}>)
      : [];
    
    form.reset({
      name: task.name,
      description: task.description || "",
      status: task.status as "pending" | "in_progress" | "completed" | "blocked",
      priority: task.priority as "low" | "medium" | "high" | "critical",
      assigneeId: task.assigneeId || "unassigned",
      assigneeEmail: task.assigneeEmail || "",
      assignmentType: task.assigneeId ? "user" : task.assigneeEmail ? "external" : "user",
      startDate: task.startDate ? new Date(task.startDate).toISOString().split('T')[0] : "",
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : "",
      checklist: checklistData,
    });
    setIsTaskDialogOpen(true);
  };

  const handleCreateTask = () => {
    setEditingTask(null);
    form.reset({
      name: "",
      description: "",
      status: "pending",
      priority: "medium",
      assigneeId: "unassigned",
      assigneeEmail: "",
      assignmentType: "user",
      startDate: "",
      dueDate: "",
      checklist: [],
    });
    setIsTaskDialogOpen(true);
  };

  const onSubmit = (data: TaskFormData) => {
    if (!currentProject) {
      toast({
        title: "Error",
        description: "Please select a project first",
        variant: "destructive",
      });
      return;
    }
    
    // Handle assignment logic: either user ID or external email
    let assigneeId = undefined;
    let assigneeEmail = undefined;
    
    if (data.assignmentType === "user" && data.assigneeId && data.assigneeId !== "unassigned") {
      assigneeId = data.assigneeId;
    } else if (data.assignmentType === "external" && data.assigneeEmail) {
      // Normalize assigneeEmail: trim and ignore "unassigned" sentinel
      const trimmedEmail = data.assigneeEmail.trim();
      if (trimmedEmail && trimmedEmail.toLowerCase() !== "unassigned") {
        assigneeEmail = trimmedEmail;
      }
    }
    
    // Send date strings to backend (backend will handle conversion)
    const taskData = {
      name: data.name,
      description: data.description,
      status: data.status,
      priority: data.priority,
      assigneeId,
      assigneeEmail,
      startDate: data.startDate || undefined,
      dueDate: data.dueDate || undefined,
      checklist: data.checklist,
      assignmentType: data.assignmentType,
    };
    
    if (editingTask) {
      // Convert string dates to Date objects for update API
      const updateData = {
        ...taskData,
        startDate: taskData.startDate ? new Date(taskData.startDate) : null,
        dueDate: taskData.dueDate ? new Date(taskData.dueDate) : null,
      };
      updateTaskMutation.mutate({ taskId: editingTask.id, data: updateData });
      setEditingTask(null);
    } else {
      createTaskMutation.mutate(taskData);
    }
  };

  const addChecklistItem = () => {
    if (!newChecklistItem.trim()) return;
    const currentChecklist = form.getValues("checklist") || [];
    form.setValue("checklist", [
      ...currentChecklist,
      { id: crypto.randomUUID(), text: newChecklistItem.trim(), completed: false }
    ]);
    setNewChecklistItem("");
  };

  const removeChecklistItem = (itemId: string) => {
    const currentChecklist = form.getValues("checklist") || [];
    form.setValue("checklist", currentChecklist.filter(item => item.id !== itemId));
  };

  const applyTemplate = (template: ChecklistTemplate) => {
    const templateItems = template.templateItems as { text: string; required: boolean }[];
    const newChecklistItems = templateItems.map(item => ({
      id: crypto.randomUUID(),
      text: item.text,
      completed: false
    }));
    
    const currentChecklist = form.getValues("checklist") || [];
    form.setValue("checklist", [...currentChecklist, ...newChecklistItems]);
    setIsTemplateDialogOpen(false);
    
    toast({
      title: "Template Applied",
      description: `Added ${newChecklistItems.length} items from "${template.name}" template`,
    });
  };

  const toggleChecklistItem = (taskId: string, itemId: string, completed: boolean) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    const checklist = Array.isArray(task.checklist) 
      ? (task.checklist as Array<{id: string, text: string, completed: boolean}>)
      : [];
    
    const updatedChecklist = checklist.map((item) => 
      item.id === itemId ? { ...item, completed } : item
    );
    
    updateTaskMutation.mutate({
      taskId,
      data: { checklist: updatedChecklist }
    });
  };

  const handleStatusChange = (taskId: string, status: string) => {
    updateTaskMutation.mutate({ taskId, data: { status } });
  };

  // Enhanced filtering and sorting
  const filteredAndSortedTasks = useMemo(() => {
    let filtered = tasks.filter(task => {
      // Search filter
      if (searchQuery && !task.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !task.description?.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      // Status filter
      if (statusFilter !== "all" && task.status !== statusFilter) {
        return false;
      }

      // Priority filter
      if (priorityFilter !== "all" && task.priority !== priorityFilter) {
        return false;
      }

      // Assignee filter
      if (assigneeFilter !== "all") {
        if (assigneeFilter === "unassigned" && task.assigneeId) {
          return false;
        }
        if (assigneeFilter !== "unassigned" && task.assigneeId !== assigneeFilter) {
          return false;
        }
      }

      return true;
    });

    // Sort tasks
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "dueDate":
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        case "priority":
          const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
          return priorityOrder[b.priority as keyof typeof priorityOrder] - priorityOrder[a.priority as keyof typeof priorityOrder];
        case "status":
          return a.status.localeCompare(b.status);
        case "name":
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    return filtered;
  }, [tasks, searchQuery, statusFilter, priorityFilter, assigneeFilter, sortBy]);

  // Check if task is overdue
  const isOverdue = (task: Task) => {
    if (!task.dueDate || task.status === "completed") return false;
    return new Date(task.dueDate) < new Date();
  };

  // Calculate task completion percentage
  const getTaskProgress = (task: Task) => {
    if (!task.checklist || !Array.isArray(task.checklist) || task.checklist.length === 0) {
      return task.status === "completed" ? 100 : 0;
    }
    const checklist = task.checklist as Array<{id: string, text: string, completed: boolean}>;
    const completed = checklist.filter(item => item.completed).length;
    return Math.round((completed / checklist.length) * 100);
  };

  // Duplicate task function
  const duplicateTask = (task: Task) => {
    const duplicatedData = {
      name: `${task.name} (Copy)`,
      description: task.description || undefined,
      status: "pending" as const,
      priority: task.priority as "low" | "medium" | "high" | "critical",
      assigneeId: task.assigneeId || undefined,
      assigneeEmail: task.assigneeEmail || undefined,
      startDate: task.startDate ? new Date(task.startDate).toISOString().split('T')[0] : undefined,
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : undefined,
      checklist: (task.checklist as Array<{id: string, text: string, completed: boolean}>) || [],
      assignmentType: (task.assigneeId ? "user" : task.assigneeEmail ? "external" : "user") as "user" | "external",
    };
    createTaskMutation.mutate(duplicatedData);
  };

  return (
    <div className="space-y-6" data-testid="tasks-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Tasks & Projects</h1>
          <p className="text-sm text-muted-foreground">Manage project tasks and track progress</p>
        </div>
        <div className="flex gap-2">
          <Button 
            disabled={!currentProject} 
            onClick={handleCreateTask} 
            data-testid="button-create-task"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Task
          </Button>
          
          {/* Create/Edit Task Dialog */}
          <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingTask ? `Edit Task: ${editingTask.name}` : 'Create New Task'}</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Task Name</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-edit-task-name" />
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
                          <Textarea {...field} data-testid="input-edit-task-description" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="priority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Priority</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-edit-task-priority">
                                <SelectValue placeholder="Select priority" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="critical">Critical</SelectItem>
                            </SelectContent>
                          </Select>
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
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-edit-task-status">
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="blocked">Blocked</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} data-testid="input-task-start-date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="dueDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Due Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} data-testid="input-task-due-date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="assignmentType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assignment Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-assignment-type">
                              <SelectValue placeholder="Select assignment type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="user">Team Member</SelectItem>
                            <SelectItem value="external">External Email</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {form.watch("assignmentType") === "user" ? (
                    <FormField
                      control={form.control}
                      name="assigneeId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Assign To</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || "unassigned"}>
                            <FormControl>
                              <SelectTrigger data-testid="select-assignee">
                                <SelectValue placeholder="Select team member" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="unassigned">Unassigned</SelectItem>
                              {users.map((user) => (
                                <SelectItem key={user.id} value={user.id}>
                                  {user.name} ({user.email})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : (
                    // Use Controller for the assigneeEmail field to ensure proper mapping
                    <Controller
                      name="assigneeEmail"
                      control={form.control}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>External Email</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="email@example.com"
                              // Show empty string instead of sentinel
                              value={field.value === "unassigned" ? "" : (field.value ?? "")}
                              onChange={(e) => {
                                // Forward native event as value to RHF
                                field.onChange(e.target.value);
                              }}
                              data-testid="input-assignee-email"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <div className="space-y-2">
                    <Label>Checklist</Label>
                    <div className="space-y-2">
                      {form.watch("checklist")?.map((item, index) => (
                        <div key={item.id} className="flex items-center space-x-2">
                          <Checkbox
                            checked={item.completed}
                            onCheckedChange={(checked) => {
                              const checklist = form.getValues("checklist");
                              checklist[index].completed = checked as boolean;
                              form.setValue("checklist", [...checklist]);
                            }}
                            data-testid={`checkbox-item-${item.id}`}
                          />
                          <span className={`flex-1 text-sm ${item.completed ? 'line-through text-muted-foreground' : ''}`}>
                            {item.text}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeChecklistItem(item.id)}
                            data-testid={`button-remove-${item.id}`}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                      <div className="flex space-x-2">
                        <Input
                          placeholder="Add checklist item..."
                          value={newChecklistItem}
                          onChange={(e) => setNewChecklistItem(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addChecklistItem();
                            }
                          }}
                          data-testid="input-checklist-item"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={addChecklistItem}
                          data-testid="button-add-checklist-item"
                        >
                          Add
                        </Button>
                        {templates.length > 0 && (
                          <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
                            <DialogTrigger asChild>
                              <Button type="button" variant="outline" size="sm">
                                <FileText className="w-4 h-4 mr-1" />
                                Templates
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Apply Checklist Template</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-2">
                                {templates.map((template) => (
                                  <Button
                                    key={template.id}
                                    type="button"
                                    variant="outline"
                                    className="w-full justify-start"
                                    onClick={() => applyTemplate(template)}
                                  >
                                    {template.name}
                                  </Button>
                                ))}
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsTaskDialogOpen(false)}
                      data-testid="button-cancel-task"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={editingTask ? updateTaskMutation.isPending : createTaskMutation.isPending}
                      data-testid={editingTask ? "button-save-edit" : "button-save-create"}
                    >
                      {editingTask 
                        ? (updateTaskMutation.isPending ? "Updating..." : "Update Task")
                        : (createTaskMutation.isPending ? "Creating..." : "Create Task")
                      }
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Current Project Info */}
      {currentProject ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span>Tasks for: {currentProject.name}</span>
              <Badge variant="outline">{tasks.length} tasks</Badge>
            </CardTitle>
          </CardHeader>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No Project Selected</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Please select an initiative from the dropdown in the header to view tasks.</p>
          </CardContent>
        </Card>
      )}

      {/* Tasks List */}
      {currentProject && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Project Tasks</CardTitle>
              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                <span data-testid="tasks-total">Total: {tasks.length}</span>
                <span data-testid="tasks-completed">
                  Completed: {tasks.filter(t => t.status === 'completed').length}
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 bg-muted rounded animate-pulse" />
                ))}
              </div>
            ) : filteredAndSortedTasks.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No tasks found for this project.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredAndSortedTasks.map((task) => (
                  <Card key={task.id} className="p-4" data-testid={`card-task-${task.id}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className="font-medium" data-testid={`text-task-name-${task.id}`}>{task.name}</h4>
                          <Badge variant={getPriorityVariant(task.priority)} data-testid={`badge-priority-${task.id}`}>
                            {task.priority}
                          </Badge>
                          <Badge variant={getStatusVariant(task.status)} data-testid={`badge-status-${task.id}`}>
                            {task.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        {task.description && (
                          <p className="text-sm text-muted-foreground mb-3" data-testid={`text-description-${task.id}`}>
                            {task.description}
                          </p>
                        )}
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                          {task.assigneeId && task.assigneeId !== 'unassigned' && (
                            <span data-testid={`text-assignee-${task.id}`}>
                              Assigned to: {users.find(u => u.id === task.assigneeId)?.name || task.assigneeId}
                            </span>
                          )}
                          {task.dueDate && (
                            <span data-testid={`text-due-date-${task.id}`}>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        {/* Quick Status Buttons */}
                        {task.status === 'pending' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusChange(task.id, 'in_progress')}
                            disabled={updateTaskMutation.isPending}
                            data-testid={`button-start-${task.id}`}
                          >
                            <Play className="w-3 h-3 mr-1" />
                            Start
                          </Button>
                        )}
                        {task.status === 'in_progress' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusChange(task.id, 'completed')}
                            disabled={updateTaskMutation.isPending}
                            data-testid={`button-complete-${task.id}`}
                          >
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Mark Complete
                          </Button>
                        )}
                        {task.status !== 'blocked' && task.status !== 'completed' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusChange(task.id, 'blocked')}
                            disabled={updateTaskMutation.isPending}
                            data-testid={`button-block-${task.id}`}
                          >
                            <XCircle className="w-3 h-3 mr-1" />
                            Block
                          </Button>
                        )}
                        
                        {/* Edit Task Button */}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditTask(task)}
                          data-testid={`button-edit-${task.id}`}
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        
                        {/* Delete Task Button */}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteTask(task.id, task.name)}
                          disabled={deleteTaskMutation.isPending}
                          data-testid={`button-delete-${task.id}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                        
                        {/* Copy Task Button */}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => duplicateTask(task)}
                          disabled={createTaskMutation.isPending}
                          data-testid={`button-copy-${task.id}`}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
