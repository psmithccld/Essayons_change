import { useState } from "react";
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
import { Plus, Calendar, User as UserIcon, AlertCircle, CheckCircle, Clock, Pause, X, ListChecks, FileText, Building, Code, Megaphone, Settings, Edit, Trash2 } from "lucide-react";
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

export default function Tasks() {
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [newChecklistItem, setNewChecklistItem] = useState("");
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
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
      setIsNewTaskOpen(false);
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
      setIsNewTaskOpen(false);
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
    setIsNewTaskOpen(true);
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

  return (
    <div className="space-y-6" data-testid="tasks-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Tasks & Projects</h1>
          <p className="text-sm text-muted-foreground">Manage project tasks and track progress</p>
        </div>
        <Dialog open={isNewTaskOpen} onOpenChange={setIsNewTaskOpen}>
          <DialogTrigger asChild>
            <Button disabled={!currentProject} data-testid="button-new-task">
              <Plus className="w-4 h-4 mr-2" />
              New Task
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingTask ? "Edit Task" : "Create New Task"}</DialogTitle>
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
                        <Input {...field} data-testid="input-task-name" />
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
                        <Textarea {...field} data-testid="input-task-description" />
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
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-task-priority">
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
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-task-status">
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

                <FormField
                  control={form.control}
                  name="assignmentType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assignment Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} defaultValue="user">
                        <FormControl>
                          <SelectTrigger data-testid="select-assignment-type">
                            <SelectValue placeholder="Choose assignment type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="user">Select from team members</SelectItem>
                          <SelectItem value="external">Enter external email</SelectItem>
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
                        <FormLabel>Assign To Team Member</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-assignee">
                              <SelectValue placeholder="Select team member (optional)" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="unassigned">Unassigned</SelectItem>
                            {users.map((user: User) => (
                              <SelectItem key={user.id} value={user.id}>
                                {user.name} ({user.username})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : (
                  <FormField
                    control={form.control}
                    name="assigneeEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>External Email Address</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter external assignee email"
                            data-testid="input-assignee-email"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

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

                {/* Checklist Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Task Checklist</Label>
                    <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
                      <DialogTrigger asChild>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          data-testid="button-use-template"
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          Use Template
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle data-testid="text-template-dialog-title">Select Checklist Template</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          {templates.length === 0 ? (
                            <div className="text-center py-8">
                              <ListChecks className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                                No templates available
                              </h3>
                              <p className="text-gray-600 dark:text-gray-300">
                                Create checklist templates to use them here
                              </p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto">
                              {templates.map((template) => (
                                <Card 
                                  key={template.id} 
                                  className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                                  onClick={() => applyTemplate(template)}
                                  data-testid={`template-option-${template.id}`}
                                >
                                  <CardContent className="p-4">
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                          {getCategoryIcon(template.category)}
                                          <h3 className="font-medium" data-testid={`template-name-${template.id}`}>
                                            {template.name}
                                          </h3>
                                          <Badge className={getCategoryColor(template.category)}>
                                            {categories.find(c => c.value === template.category)?.label}
                                          </Badge>
                                        </div>
                                        {template.description && (
                                          <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                                            {template.description}
                                          </p>
                                        )}
                                        <div className="text-xs text-gray-500">
                                          {(template.templateItems as any[])?.length || 0} items
                                        </div>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={newChecklistItem}
                      onChange={(e) => setNewChecklistItem(e.target.value)}
                      placeholder="Add checklist item..."
                      data-testid="input-checklist-item"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addChecklistItem())}
                    />
                    <Button 
                      type="button" 
                      onClick={addChecklistItem}
                      disabled={!newChecklistItem.trim()}
                      data-testid="button-add-checklist-item"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  {/* Checklist Items */}
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {(form.watch("checklist") || []).map((item: any) => (
                      <div key={item.id} className="flex items-center gap-2 p-2 bg-muted rounded">
                        <ListChecks className="w-4 h-4 text-muted-foreground" />
                        <span className="flex-1 text-sm">{item.text}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeChecklistItem(item.id)}
                          data-testid={`button-remove-checklist-${item.id}`}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsNewTaskOpen(false)}
                    data-testid="button-cancel-task"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createTaskMutation.isPending}
                    data-testid="button-save-task"
                  >
                    {createTaskMutation.isPending ? "Creating..." : "Create Task"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
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
                  <div key={i} className="animate-pulse">
                    <div className="h-20 bg-muted rounded-lg"></div>
                  </div>
                ))}
              </div>
            ) : tasks.length === 0 ? (
              <div className="text-center py-12" data-testid="no-tasks-message">
                <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No Tasks Found</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Get started by creating your first task for this project.
                </p>
                <Button onClick={() => setIsNewTaskOpen(true)} data-testid="button-create-first-task">
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Task
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {tasks.map((task) => (
                  <Card key={task.id} className="hover:shadow-md transition-shadow" data-testid={`task-${task.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            {getStatusIcon(task.status)}
                            <h3 className="font-medium text-foreground">{task.name}</h3>
                          </div>
                          {task.description && (
                            <p className="text-sm text-muted-foreground mb-3">{task.description}</p>
                          )}
                        </div>
                        <div className="flex flex-col space-y-2 ml-4">
                          <div className="flex items-center space-x-2">
                            <Badge className={getPriorityColor(task.priority)}>
                              {task.priority}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditTask(task)}
                              data-testid={`button-edit-task-${task.id}`}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteTask(task.id, task.name)}
                              data-testid={`button-delete-task-${task.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          <Select
                            value={task.status}
                            onValueChange={(value) => handleStatusChange(task.id, value)}
                          >
                            <SelectTrigger className="w-32 h-8" data-testid={`select-status-${task.id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="blocked">Blocked</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      {task.progress !== null && task.progress > 0 && (
                        <div className="mb-3">
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-muted-foreground">Progress</span>
                            <span className="font-medium">{task.progress}%</span>
                          </div>
                          <Progress value={task.progress} className="h-2" />
                        </div>
                      )}
                      
                      {/* Task Checklist */}
                      {task.checklist && Array.isArray(task.checklist) && task.checklist.length > 0 ? (
                        <TaskChecklist 
                          checklist={task.checklist as Array<{id: string, text: string, completed: boolean}>}
                          taskId={task.id}
                          onToggleItem={toggleChecklistItem}
                        />
                      ) : null}
                      
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        {task.startDate && (
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-4 h-4" />
                            <span>Start: {new Date(task.startDate).toLocaleDateString()}</span>
                          </div>
                        )}
                        {task.dueDate && (
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-4 h-4" />
                            <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                          </div>
                        )}
                        {task.assigneeId && (
                          <div className="flex items-center space-x-1">
                            <UserIcon className="w-4 h-4" />
                            <span>Assigned</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
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
