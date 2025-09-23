import { useState, useMemo } from "react";
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
import { useForm } from "react-hook-form";
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
  assigneeEmail: z.string().email().optional(),
  assignmentType: z.enum(["user", "external"]).default("user"),
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
  checklist: z.array(z.object({
    id: z.string(),
    text: z.string(),
    completed: z.boolean()
  })).optional().default([]),
});

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
  // Removed isNewTaskOpen state - using quick create only  
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [newChecklistItem, setNewChecklistItem] = useState("");
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
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
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (taskData: TaskFormData) => {
      if (!currentProject?.id) throw new Error("No project selected");
      const response = await apiRequest("POST", `/api/projects/${currentProject.id}/tasks`, taskData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', currentProject?.id, 'tasks'] });
      // Quick create dialog handled separately
      setEditingTask(null);
      form.reset();
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
      const response = await apiRequest("PUT", `/api/tasks/${taskId}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', currentProject?.id, 'tasks'] });
      setIsEditDialogOpen(false);
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
      const response = await apiRequest("DELETE", `/api/tasks/${taskId}`, {});
      return response.json();
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
    setIsEditDialogOpen(true);
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
      assigneeEmail = data.assigneeEmail;
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

  // Quick task creation form
  const quickTaskForm = useForm<{name: string}>({
    resolver: zodResolver(z.object({ name: z.string().min(1, "Task name required") })),
    defaultValues: { name: "" }
  });

  const quickCreateMutation = useMutation({
    mutationFn: async (data: {name: string}) => {
      if (!currentProject?.id) throw new Error("No project selected");
      const response = await apiRequest("POST", `/api/projects/${currentProject.id}/tasks`, {
        name: data.name,
        status: "pending",
        priority: "medium",
        assignmentType: "user"
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', currentProject?.id, 'tasks'] });
      setIsQuickCreateOpen(false);
      quickTaskForm.reset();
      toast({ title: "Success", description: "Task created successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create task", variant: "destructive" });
    },
  });

  const onQuickSubmit = (data: {name: string}) => {
    quickCreateMutation.mutate(data);
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
          {/* Quick Create Dialog */}
          <Dialog open={isQuickCreateOpen} onOpenChange={setIsQuickCreateOpen}>
            <DialogTrigger asChild>
              <Button disabled={!currentProject} variant="outline" data-testid="button-quick-task">
                <Zap className="w-4 h-4 mr-2" />
                Quick Task
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Quick Task Creation</DialogTitle>
              </DialogHeader>
              <form onSubmit={quickTaskForm.handleSubmit(onQuickSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="quickTaskName">Task Name</Label>
                  <Input
                    id="quickTaskName"
                    {...quickTaskForm.register("name")}
                    placeholder="Enter task name..."
                    data-testid="input-quick-task-name"
                  />
                  {quickTaskForm.formState.errors.name && (
                    <p className="text-sm text-red-500">{quickTaskForm.formState.errors.name.message}</p>
                  )}
                </div>
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsQuickCreateOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={quickCreateMutation.isPending} data-testid="button-quick-create">
                    {quickCreateMutation.isPending ? "Creating..." : "Create Task"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          
          {/* Edit Task Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Task: {editingTask?.name}</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit((data) => {
                  if (editingTask) {
                    updateTaskMutation.mutate({ taskId: editingTask.id, data });
                  }
                })} className="space-y-4">
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

                  <div className="flex justify-end space-x-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsEditDialogOpen(false)}
                      data-testid="button-cancel-edit"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={updateTaskMutation.isPending}
                      data-testid="button-save-edit"
                    >
                      {updateTaskMutation.isPending ? "Updating..." : "Update Task"}
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
                            <span data-testid={`text-assignee-${task.id}`}>Assigned to: {task.assigneeId}</span>
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
                            Complete
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
