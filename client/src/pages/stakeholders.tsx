import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Users, Mail, Phone, Building, TrendingUp, TrendingDown, Minus, MessageSquare, Bot, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useCurrentProject } from "@/contexts/CurrentProjectContext";
import { usePermissions } from "@/hooks/use-permissions";
import type { Project, Stakeholder } from "@shared/schema";

const stakeholderFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  role: z.string().min(1, "Role is required"),
  department: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  influenceLevel: z.enum(["low", "medium", "high"]),
  supportLevel: z.enum(["resistant", "neutral", "supportive"]),
  engagementLevel: z.enum(["low", "medium", "high"]),
  communicationPreference: z.enum(["email", "meeting", "phone"]).optional(),
  notes: z.string().optional(),
});

type StakeholderFormData = z.infer<typeof stakeholderFormSchema>;

function getSupportIcon(level: string) {
  switch (level) {
    case 'supportive': return <TrendingUp className="w-4 h-4 text-green-600" />;
    case 'neutral': return <Minus className="w-4 h-4 text-yellow-600" />;
    case 'resistant': return <TrendingDown className="w-4 h-4 text-red-600" />;
    default: return <Minus className="w-4 h-4 text-muted-foreground" />;
  }
}

function getSupportColor(level: string) {
  switch (level) {
    case 'supportive': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
    case 'neutral': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
    case 'resistant': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
  }
}

function getInfluenceColor(level: string) {
  switch (level) {
    case 'high': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
    case 'medium': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
    case 'low': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
  }
}

function getEngagementColor(level: string) {
  switch (level) {
    case 'high': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300';
    case 'medium': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
    case 'low': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
  }
}

export default function Stakeholders() {
  const [isNewStakeholderOpen, setIsNewStakeholderOpen] = useState(false);
  const [isGptTipsOpen, setIsGptTipsOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [selectedStakeholders, setSelectedStakeholders] = useState<string[]>([]);
  const [gptTips, setGptTips] = useState<any>(null);
  const [useUserSelection, setUseUserSelection] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const { toast } = useToast();
  const { currentProject, projects } = useCurrentProject();
  const { user: currentUser } = usePermissions();
  const queryClient = useQueryClient();

  const { data: stakeholders = [], isLoading } = useQuery<Stakeholder[]>({
    queryKey: ['/api/projects', currentProject?.id, 'stakeholders'],
    enabled: !!currentProject?.id,
  });

  const { data: sourceStakeholders = [] } = useQuery<Stakeholder[]>({
    queryKey: ['/api/projects', selectedProject, 'stakeholders'],
    enabled: !!selectedProject && selectedProject !== currentProject?.id,
  });

  // Fetch users for stakeholder selection
  const { data: users = [] } = useQuery({
    queryKey: ['/api/users/with-roles'],
  });

  const form = useForm<StakeholderFormData>({
    resolver: zodResolver(stakeholderFormSchema),
    defaultValues: {
      influenceLevel: "medium",
      supportLevel: "neutral",
      engagementLevel: "medium",
      department: currentUser?.department || "",
    },
  });

  // Update department when currentUser changes (for cases where currentUser loads after form initialization)
  useEffect(() => {
    if (currentUser?.department && !form.getValues('department')) {
      form.setValue('department', currentUser.department);
    }
  }, [currentUser?.department, form]);

  // Handle user selection and field prepopulation
  const handleUserSelection = (userId: string) => {
    setSelectedUserId(userId);
    if (userId) {
      const selectedUser = users.find(user => user.id === userId);
      if (selectedUser) {
        // Prepopulate fields based on selected user
        form.setValue('name', selectedUser.name);
        form.setValue('email', selectedUser.email || '');
        form.setValue('role', selectedUser.role?.name || selectedUser.role || '');
        form.setValue('department', selectedUser.department || '');
      }
    }
  };

  const handleModeToggle = (useSelection: boolean) => {
    setUseUserSelection(useSelection);
    if (!useSelection) {
      // Clear user selection when switching to manual mode
      setSelectedUserId('');
      form.reset({
        influenceLevel: "medium",
        supportLevel: "neutral",
        engagementLevel: "medium",
        department: currentUser?.department || "",
      });
    }
  };

  const createStakeholderMutation = useMutation({
    mutationFn: async (stakeholderData: StakeholderFormData) => {
      if (!currentProject?.id) throw new Error("No project selected");
      const response = await apiRequest("POST", `/api/projects/${currentProject.id}/stakeholders`, stakeholderData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', currentProject?.id, 'stakeholders'] });
      setIsNewStakeholderOpen(false);
      // Reset form but preserve department for subsequent entries
      form.reset({
        influenceLevel: "medium",
        supportLevel: "neutral",
        engagementLevel: "medium",
        department: currentUser?.department || "",
      });
      toast({
        title: "Success",
        description: "Stakeholder added successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add stakeholder",
        variant: "destructive",
      });
    },
  });

  const importStakeholdersMutation = useMutation({
    mutationFn: async ({ sourceProjectId, stakeholderIds }: { sourceProjectId: string; stakeholderIds: string[] }) => {
      if (!currentProject?.id) throw new Error("No project selected");
      const response = await apiRequest("POST", `/api/projects/${currentProject.id}/stakeholders/import`, {
        sourceProjectId,
        stakeholderIds,
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', currentProject?.id, 'stakeholders'] });
      setIsImportOpen(false);
      setSelectedProject("");
      setSelectedStakeholders([]);
      toast({
        title: "Success",
        description: `Imported ${data.imported} stakeholder(s) successfully`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to import stakeholders",
        variant: "destructive",
      });
    },
  });

  const getStakeholderTipsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/gpt/stakeholder-tips", {
        projectId: currentProject?.id,
        stakeholders: stakeholders.map(s => ({
          name: s.name,
          role: s.role,
          supportLevel: s.supportLevel,
          influenceLevel: s.influenceLevel,
          engagementLevel: s.engagementLevel,
        }))
      });
      return response.json();
    },
    onSuccess: (data) => {
      setGptTips(data);
      toast({
        title: "Success",
        description: "Generated engagement tips successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate tips",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: StakeholderFormData) => {
    createStakeholderMutation.mutate(data);
  };

  const handleGetTips = () => {
    getStakeholderTipsMutation.mutate();
    setIsGptTipsOpen(true);
  };

  const handleImportStakeholders = () => {
    if (selectedStakeholders.length === 0) {
      toast({
        title: "No stakeholders selected",
        description: "Please select stakeholders to import",
        variant: "destructive",
      });
      return;
    }
    importStakeholdersMutation.mutate({
      sourceProjectId: selectedProject,
      stakeholderIds: selectedStakeholders,
    });
  };

  const toggleStakeholderSelection = (stakeholderId: string) => {
    setSelectedStakeholders(prev =>
      prev.includes(stakeholderId)
        ? prev.filter(id => id !== stakeholderId)
        : [...prev, stakeholderId]
    );
  };

  const selectAllStakeholders = () => {
    const allIds = sourceStakeholders.map(s => s.id);
    setSelectedStakeholders(
      selectedStakeholders.length === sourceStakeholders.length ? [] : allIds
    );
  };

  // Calculate engagement metrics
  const engagementStats = {
    totalStakeholders: stakeholders.length,
    supportive: stakeholders.filter(s => s.supportLevel === 'supportive').length,
    neutral: stakeholders.filter(s => s.supportLevel === 'neutral').length,
    resistant: stakeholders.filter(s => s.supportLevel === 'resistant').length,
    highInfluence: stakeholders.filter(s => s.influenceLevel === 'high').length,
    highEngagement: stakeholders.filter(s => s.engagementLevel === 'high').length,
  };

  return (
    <div className="space-y-6" data-testid="stakeholders-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Stakeholders</h1>
          <p className="text-sm text-muted-foreground">Manage stakeholder relationships and engagement</p>
        </div>
        <div className="flex space-x-2">
          <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                disabled={!currentProject?.id || projects.filter(p => p.id !== currentProject?.id).length === 0}
                data-testid="button-import-stakeholders"
              >
                <Copy className="w-4 h-4 mr-2" />
                Import from Other Initiatives
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Import Stakeholders from Other Initiatives</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Select Initiative</label>
                  <Select value={selectedProject} onValueChange={setSelectedProject}>
                    <SelectTrigger data-testid="select-source-project">
                      <SelectValue placeholder="Choose an initiative to import from" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.filter(p => p.id !== currentProject?.id).map(project => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {selectedProject && sourceStakeholders.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-medium">Select Stakeholders to Import</label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={selectAllStakeholders}
                        data-testid="button-select-all-stakeholders"
                      >
                        {selectedStakeholders.length === sourceStakeholders.length ? "Deselect All" : "Select All"}
                      </Button>
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-3">
                      {sourceStakeholders.map(stakeholder => (
                        <div 
                          key={stakeholder.id}
                          className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50"
                        >
                          <Checkbox
                            id={stakeholder.id}
                            checked={selectedStakeholders.includes(stakeholder.id)}
                            onCheckedChange={() => toggleStakeholderSelection(stakeholder.id)}
                            data-testid={`checkbox-stakeholder-${stakeholder.id}`}
                          />
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="font-medium text-sm">{stakeholder.name}</span>
                              <Badge className={getSupportColor(stakeholder.supportLevel)}>
                                {stakeholder.supportLevel}
                              </Badge>
                              <Badge className={getInfluenceColor(stakeholder.influenceLevel)}>
                                {stakeholder.influenceLevel} influence
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">{stakeholder.role}</p>
                            {stakeholder.department && (
                              <p className="text-xs text-muted-foreground">{stakeholder.department}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedProject && sourceStakeholders.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="w-8 h-8 mx-auto mb-2" />
                    <p>No stakeholders found in the selected initiative</p>
                  </div>
                )}

                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsImportOpen(false);
                      setSelectedProject("");
                      setSelectedStakeholders([]);
                    }}
                    data-testid="button-cancel-import"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleImportStakeholders}
                    disabled={selectedStakeholders.length === 0 || importStakeholdersMutation.isPending}
                    data-testid="button-confirm-import"
                  >
                    {importStakeholdersMutation.isPending 
                      ? `Importing ${selectedStakeholders.length} stakeholder(s)...` 
                      : `Import ${selectedStakeholders.length} Stakeholder(s)`
                    }
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          <Dialog open={isGptTipsOpen} onOpenChange={setIsGptTipsOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                disabled={!currentProject?.id || stakeholders.length === 0}
                onClick={handleGetTips}
                data-testid="button-gpt-tips"
              >
                <Bot className="w-4 h-4 mr-2" />
                Get AI Tips
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Stakeholder Engagement Tips</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {getStakeholderTipsMutation.isPending ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="text-sm text-muted-foreground mt-2">Generating tips...</p>
                  </div>
                ) : gptTips ? (
                  <>
                    <div>
                      <h4 className="font-medium text-foreground mb-2">General Tips</h4>
                      <div className="space-y-2">
                        {gptTips.generalTips?.map((tip: string, index: number) => (
                          <div key={index} className="p-3 bg-muted/50 rounded-lg">
                            <p className="text-sm">{tip}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-foreground mb-2">Specific Recommendations</h4>
                      <div className="space-y-3">
                        {gptTips.specificTips?.map((item: any, index: number) => (
                          <div key={index} className="border border-border rounded-lg p-3">
                            <h5 className="font-medium text-sm mb-2">{item.stakeholder}</h5>
                            <div className="space-y-1">
                              {item.tips.map((tip: string, tipIndex: number) => (
                                <p key={tipIndex} className="text-sm text-muted-foreground">• {tip}</p>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : null}
              </div>
            </DialogContent>
          </Dialog>
          
          <Dialog open={isNewStakeholderOpen} onOpenChange={setIsNewStakeholderOpen}>
            <DialogTrigger asChild>
              <Button disabled={!currentProject?.id} data-testid="button-new-stakeholder">
                <Plus className="w-4 h-4 mr-2" />
                Add Stakeholder
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Stakeholder</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  {/* User Selection Mode Toggle */}
                  <div className="flex items-center space-x-4 p-3 bg-muted/30 rounded-lg">
                    <label className="text-sm font-medium">Input Method:</label>
                    <div className="flex space-x-2">
                      <Button
                        type="button"
                        variant={!useUserSelection ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleModeToggle(false)}
                        data-testid="button-manual-entry"
                      >
                        Manual Entry
                      </Button>
                      <Button
                        type="button"
                        variant={useUserSelection ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleModeToggle(true)}
                        data-testid="button-select-user"
                      >
                        Select from Users
                      </Button>
                    </div>
                  </div>

                  {/* User Selection Field */}
                  {useUserSelection && (
                    <FormField
                      control={form.control}
                      name="name" // We'll use name field for validation but populate from user selection
                      render={() => (
                        <FormItem>
                          <FormLabel>Select User</FormLabel>
                          <Select value={selectedUserId} onValueChange={handleUserSelection}>
                            <FormControl>
                              <SelectTrigger data-testid="select-stakeholder-user">
                                <SelectValue placeholder="Choose a user to add as stakeholder" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {users.map((user) => (
                                <SelectItem key={user.id} value={user.id}>
                                  {user.name} - {user.role?.name || 'No role'} ({user.email})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {/* Manual Entry Fields or Read-only populated fields */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              disabled={useUserSelection}
                              placeholder={useUserSelection ? "Will be populated from selected user" : "Enter name"}
                              data-testid="input-stakeholder-name" 
                            />
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
                          <FormLabel>Role/Position</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              disabled={useUserSelection}
                              placeholder={useUserSelection ? "Will be populated from selected user" : "Enter role"}
                              data-testid="input-stakeholder-role" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="department"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Department</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              placeholder={useUserSelection ? "Enter department (not auto-populated)" : "Enter department"}
                              data-testid="input-stakeholder-department" 
                            />
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
                            <Input 
                              type="email" 
                              {...field} 
                              disabled={useUserSelection}
                              placeholder={useUserSelection ? "Will be populated from selected user" : "Enter email"}
                              data-testid="input-stakeholder-email" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-stakeholder-phone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="influenceLevel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Influence Level</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-influence-level">
                                <SelectValue placeholder="Select level" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="supportLevel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Support Level</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-support-level">
                                <SelectValue placeholder="Select level" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="resistant">Resistant</SelectItem>
                              <SelectItem value="neutral">Neutral</SelectItem>
                              <SelectItem value="supportive">Supportive</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="engagementLevel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Engagement Level</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-engagement-level">
                                <SelectValue placeholder="Select level" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="communicationPreference"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Communication Preference</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-comm-preference">
                              <SelectValue placeholder="Select preference" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="meeting">Meeting</SelectItem>
                            <SelectItem value="phone">Phone</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea {...field} data-testid="input-stakeholder-notes" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsNewStakeholderOpen(false)}
                      data-testid="button-cancel-stakeholder"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createStakeholderMutation.isPending}
                      data-testid="button-save-stakeholder"
                    >
                      {createStakeholderMutation.isPending ? "Adding..." : "Add Stakeholder"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Engagement Overview */}
      {currentProject && stakeholders.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">Total Stakeholders</p>
                  <p className="text-2xl font-bold" data-testid="total-stakeholders">{engagementStats.totalStakeholders}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium">Supportive</p>
                  <p className="text-2xl font-bold text-green-600" data-testid="supportive-stakeholders">
                    {engagementStats.supportive}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <TrendingDown className="w-5 h-5 text-red-600" />
                <div>
                  <p className="text-sm font-medium">Resistant</p>
                  <p className="text-2xl font-bold text-red-600" data-testid="resistant-stakeholders">
                    {engagementStats.resistant}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <MessageSquare className="w-5 h-5 text-purple-600" />
                <div>
                  <p className="text-sm font-medium">High Influence</p>
                  <p className="text-2xl font-bold text-purple-600" data-testid="high-influence-stakeholders">
                    {engagementStats.highInfluence}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Stakeholders List */}
      {currentProject && (
        <Card>
          <CardHeader>
            <CardTitle>Stakeholder Directory</CardTitle>
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
            ) : stakeholders.length === 0 ? (
              <div className="text-center py-12" data-testid="no-stakeholders-message">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No Stakeholders Found</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Start building your stakeholder map for this project.
                </p>
                <Button onClick={() => setIsNewStakeholderOpen(true)} data-testid="button-add-first-stakeholder">
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Stakeholder
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {stakeholders.map((stakeholder) => (
                  <Card key={stakeholder.id} className="hover:shadow-md transition-shadow" data-testid={`stakeholder-${stakeholder.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-primary">
                              {stakeholder.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </span>
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h3 className="font-medium text-foreground">{stakeholder.name}</h3>
                              {getSupportIcon(stakeholder.supportLevel)}
                            </div>
                            
                            <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-3">
                              <span>{stakeholder.role}</span>
                              {stakeholder.department && (
                                <>
                                  <span>•</span>
                                  <span className="flex items-center space-x-1">
                                    <Building className="w-3 h-3" />
                                    <span>{stakeholder.department}</span>
                                  </span>
                                </>
                              )}
                            </div>
                            
                            <div className="flex items-center space-x-2 mb-3">
                              <Badge className={getInfluenceColor(stakeholder.influenceLevel)}>
                                {stakeholder.influenceLevel} influence
                              </Badge>
                              <Badge className={getSupportColor(stakeholder.supportLevel)}>
                                {stakeholder.supportLevel}
                              </Badge>
                              <Badge className={getEngagementColor(stakeholder.engagementLevel)}>
                                {stakeholder.engagementLevel} engagement
                              </Badge>
                            </div>
                            
                            <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                              {stakeholder.email && (
                                <div className="flex items-center space-x-1">
                                  <Mail className="w-3 h-3" />
                                  <span>{stakeholder.email}</span>
                                </div>
                              )}
                              {stakeholder.phone && (
                                <div className="flex items-center space-x-1">
                                  <Phone className="w-3 h-3" />
                                  <span>{stakeholder.phone}</span>
                                </div>
                              )}
                              {stakeholder.communicationPreference && (
                                <div className="flex items-center space-x-1">
                                  <MessageSquare className="w-3 h-3" />
                                  <span>Prefers {stakeholder.communicationPreference}</span>
                                </div>
                              )}
                            </div>
                            
                            {stakeholder.notes && (
                              <div className="mt-2 p-2 bg-muted/50 rounded text-xs text-muted-foreground">
                                {stakeholder.notes}
                              </div>
                            )}
                          </div>
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
    </div>
  );
}
