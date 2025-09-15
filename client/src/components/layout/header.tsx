import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Bell, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { insertProjectSchema, type InsertProject } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useCurrentProject } from "@/contexts/CurrentProjectContext";
import { z } from "zod";

const projectFormSchema = insertProjectSchema.extend({
  name: z.string().min(1, "Project name is required"),
  description: z.string().optional(),
  status: z.enum(["identify_need", "identify_stakeholders", "develop_change", "implement_change", "reinforce_change"]).default("identify_need"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

type ProjectFormData = z.infer<typeof projectFormSchema>;

export default function Header() {
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentProject, setCurrentProject, projects, isLoading } = useCurrentProject();

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

  return (
    <header className="bg-card border-b border-border px-6 py-4" data-testid="header">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Change Management Dashboard</h1>
            <p className="text-sm text-muted-foreground">Monitor and manage organizational change initiatives</p>
          </div>
          
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
        </div>
        <div className="flex items-center space-x-4">
          <Button 
            onClick={() => setIsNewProjectOpen(true)}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            data-testid="button-new-initiative"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Initiative
          </Button>
          <div className="relative">
            <Bell 
              className="text-muted-foreground w-5 h-5 cursor-pointer hover:text-foreground" 
              data-testid="button-notifications"
            />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full"></span>
          </div>
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
    </header>
  );
}
