import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Calendar, Clock, ChevronRight, AlertCircle, Plus, Diamond, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import GanttChart from "@/components/charts/gantt-chart";
import { useCurrentProject } from "@/contexts/CurrentProjectContext";
import type { Task, Milestone, Communication } from "@shared/schema";

const milestoneFormSchema = z.object({
  name: z.string().min(1, "Milestone name is required"),
  description: z.string().optional(),
  targetDate: z.string().min(1, "Target date is required"),
  status: z.enum(["pending", "achieved", "missed"]),
});

type MilestoneFormData = z.infer<typeof milestoneFormSchema>;

export default function Gantt() {
  const [isNewMilestoneOpen, setIsNewMilestoneOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentProject } = useCurrentProject();

  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ['/api/projects', currentProject?.id, 'tasks'],
    enabled: !!currentProject?.id,
  });

  const { data: milestones = [], isLoading: milestonesLoading } = useQuery<Milestone[]>({
    queryKey: ['/api/projects', currentProject?.id, 'milestones'],
    enabled: !!currentProject?.id,
  });

  const { data: communications = [], isLoading: communicationsLoading } = useQuery<Communication[]>({
    queryKey: ['/api/projects', currentProject?.id, 'communications'],
    enabled: !!currentProject?.id,
  });

  // Filter communications to get only meetings
  const meetings = communications.filter(comm => 
    comm.type === 'meeting' || comm.type === 'meeting_prompt'
  );

  const form = useForm<MilestoneFormData>({
    resolver: zodResolver(milestoneFormSchema),
    defaultValues: {
      status: "pending",
    },
  });

  const createMilestoneMutation = useMutation({
    mutationFn: async (milestoneData: MilestoneFormData) => {
      if (!currentProject?.id) throw new Error("No project selected");
      const response = await apiRequest("POST", `/api/projects/${currentProject.id}/milestones`, milestoneData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', currentProject?.id, 'milestones'] });
      setIsNewMilestoneOpen(false);
      setEditingMilestone(null);
      form.reset();
      toast({
        title: "Success",
        description: "Milestone created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create milestone",
        variant: "destructive",
      });
    },
  });

  const updateMilestoneMutation = useMutation({
    mutationFn: async ({ milestoneId, data }: { milestoneId: string; data: Partial<MilestoneFormData> }) => {
      const response = await apiRequest("PUT", `/api/milestones/${milestoneId}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', currentProject?.id, 'milestones'] });
      setEditingMilestone(null);
      form.reset();
      toast({
        title: "Success",
        description: "Milestone updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update milestone",
        variant: "destructive",
      });
    },
  });

  const deleteMilestoneMutation = useMutation({
    mutationFn: async (milestoneId: string) => {
      const response = await apiRequest("DELETE", `/api/milestones/${milestoneId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', currentProject?.id, 'milestones'] });
      toast({
        title: "Success",
        description: "Milestone deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete milestone",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: MilestoneFormData) => {
    if (!currentProject) {
      toast({
        title: "Error",
        description: "Please select a project first",
        variant: "destructive",
      });
      return;
    }
    
    if (editingMilestone) {
      updateMilestoneMutation.mutate({
        milestoneId: editingMilestone.id,
        data: data,
      });
    } else {
      createMilestoneMutation.mutate(data);
    }
  };

  const handleEditMilestone = (milestone: Milestone) => {
    setEditingMilestone(milestone);
    form.reset({
      name: milestone.name,
      description: milestone.description || "",
      targetDate: milestone.targetDate ? new Date(milestone.targetDate).toISOString().split('T')[0] : "",
      status: milestone.status as "pending" | "achieved" | "missed",
    });
    setIsNewMilestoneOpen(true);
  };

  const handleDeleteMilestone = (milestoneId: string) => {
    if (confirm("Are you sure you want to delete this milestone?")) {
      deleteMilestoneMutation.mutate(milestoneId);
    }
  };

  return (
    <div className="space-y-6" data-testid="gantt-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Gantt Charts</h1>
          <p className="text-sm text-muted-foreground">Visualize project timelines and task dependencies</p>
        </div>
        
        {currentProject && (
          <Dialog open={isNewMilestoneOpen} onOpenChange={(open) => {
            setIsNewMilestoneOpen(open);
            if (!open) {
              setEditingMilestone(null);
              form.reset();
            }
          }}>
            <DialogTrigger asChild>
              <Button data-testid="button-new-milestone">
                <Plus className="w-4 h-4 mr-2" />
                New Milestone
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingMilestone ? "Edit Milestone" : "Create New Milestone"}
                </DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Milestone Name</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-milestone-name" />
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
                          <Textarea {...field} data-testid="input-milestone-description" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="targetDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-milestone-target-date" />
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
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-milestone-status">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="achieved">Achieved</SelectItem>
                            <SelectItem value="missed">Missed</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        setIsNewMilestoneOpen(false);
                        setEditingMilestone(null);
                        form.reset();
                      }}
                      data-testid="button-cancel-milestone"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createMilestoneMutation.isPending || updateMilestoneMutation.isPending}
                      data-testid="button-save-milestone"
                    >
                      {createMilestoneMutation.isPending || updateMilestoneMutation.isPending
                        ? "Saving..." 
                        : editingMilestone ? "Update Milestone" : "Create Milestone"
                      }
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>


      {/* Project Overview */}
      {currentProject ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{currentProject.name}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {currentProject.description}
                </p>
              </div>
              <Badge className={
                currentProject.status === 'active' ? 'bg-green-100 text-green-800' :
                currentProject.status === 'planning' ? 'bg-yellow-100 text-yellow-800' :
                'bg-blue-100 text-blue-800'
              }>
                {currentProject.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Start Date</p>
                  <p className="text-sm text-muted-foreground">
                    {currentProject.startDate 
                      ? new Date(currentProject.startDate).toLocaleDateString()
                      : 'Not set'
                    }
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">End Date</p>
                  <p className="text-sm text-muted-foreground">
                    {currentProject.endDate
                      ? new Date(currentProject.endDate).toLocaleDateString()
                      : 'Not set'
                    }
                  </p>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium">Progress</p>
                <p className="text-sm text-muted-foreground">{currentProject.progress || 0}% Complete</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No Project Selected</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Please select a project from the dropdown in the header to view the Gantt chart.</p>
          </CardContent>
        </Card>
      )}

      {/* Gantt Chart */}
      {currentProject && (
        <Card>
          <CardHeader>
            <CardTitle>Project Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading || communicationsLoading || milestonesLoading ? (
              <div className="flex items-center justify-center h-64" data-testid="gantt-loading">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : tasks.length === 0 && milestones.length === 0 && meetings.length === 0 ? (
              <div className="text-center py-12" data-testid="no-timeline-data-gantt">
                <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No Timeline Data</h3>
                <p className="text-sm text-muted-foreground">
                  Add tasks, milestones, or schedule meetings to see the Gantt chart visualization.
                </p>
              </div>
            ) : (
              <GanttChart tasks={tasks} milestones={milestones} meetings={meetings} />
            )}
          </CardContent>
        </Card>
      )}

      {/* Milestones */}
      {currentProject && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <Diamond className="w-5 h-5" />
                <span>Project Milestones</span>
              </CardTitle>
              <Badge variant="outline">{milestones.length} milestones</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {milestonesLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-16 bg-muted rounded-lg"></div>
                  </div>
                ))}
              </div>
            ) : milestones.length === 0 ? (
              <div className="text-center py-8" data-testid="no-milestones-message">
                <Diamond className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No Milestones Yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Create milestones to track important project deadlines and goals.
                </p>
                <Button onClick={() => setIsNewMilestoneOpen(true)} data-testid="button-create-first-milestone">
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Milestone
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {milestones.map((milestone) => (
                  <Card key={milestone.id} className="border-l-4 border-l-blue-500" data-testid={`milestone-${milestone.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <Diamond className="w-4 h-4 text-blue-500" />
                            <h3 className="font-medium text-foreground">{milestone.name}</h3>
                            <Badge 
                              className={
                                milestone.status === 'achieved' ? 'bg-green-100 text-green-800' :
                                milestone.status === 'missed' ? 'bg-red-100 text-red-800' :
                                'bg-blue-100 text-blue-800'
                              }
                            >
                              {milestone.status}
                            </Badge>
                          </div>
                          {milestone.description && (
                            <p className="text-sm text-muted-foreground mb-3">{milestone.description}</p>
                          )}
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <div className="flex items-center space-x-1">
                              <Calendar className="w-4 h-4" />
                              <span>Target: {new Date(milestone.targetDate).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex space-x-2 ml-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditMilestone(milestone)}
                            data-testid={`button-edit-milestone-${milestone.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteMilestone(milestone.id)}
                            data-testid={`button-delete-milestone-${milestone.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Task Dependencies */}
      {currentProject && tasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Task Dependencies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {tasks
                .filter(task => task.dependencies && task.dependencies.length > 0)
                .map((task) => (
                  <div 
                    key={task.id} 
                    className="flex items-center space-x-3 p-3 border border-border rounded-lg"
                    data-testid={`dependency-${task.id}`}
                  >
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{task.name}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-sm text-muted-foreground">Depends on:</span>
                        {task.dependencies?.map((depId, index) => {
                          const dependentTask = tasks.find(t => t.id === depId);
                          return (
                            <div key={depId} className="flex items-center">
                              {index > 0 && <span className="text-muted-foreground mx-1">,</span>}
                              <Badge variant="outline" className="text-xs">
                                {dependentTask?.name || `Task ${depId.slice(0, 8)}...`}
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                ))}
              {tasks.filter(task => task.dependencies && task.dependencies.length > 0).length === 0 && (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">No task dependencies defined</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
