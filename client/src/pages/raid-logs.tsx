import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, AlertTriangle, CheckCircle, AlertCircle, Link as LinkIcon, Calendar, User, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Project, RaidLog } from "@shared/schema";

const raidLogFormSchema = z.object({
  type: z.enum(["risk", "action", "issue", "dependency"]),
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  severity: z.enum(["low", "medium", "high", "critical"]),
  impact: z.enum(["low", "medium", "high"]),
  probability: z.enum(["low", "medium", "high"]).optional(),
  dueDate: z.string().optional(),
  resolution: z.string().optional(),
});

type RaidLogFormData = z.infer<typeof raidLogFormSchema>;

function getRaidTypeIcon(type: string) {
  switch (type) {
    case 'risk': return <AlertTriangle className="w-4 h-4 text-destructive" />;
    case 'action': return <CheckCircle className="w-4 h-4 text-accent" />;
    case 'issue': return <AlertCircle className="w-4 h-4 text-primary" />;
    case 'dependency': return <LinkIcon className="w-4 h-4 text-secondary" />;
    default: return <AlertCircle className="w-4 h-4 text-muted-foreground" />;
  }
}

function getRaidTypeColor(type: string) {
  switch (type) {
    case 'risk': return 'bg-destructive/10 text-destructive border-destructive/20';
    case 'action': return 'bg-accent/10 text-accent border-accent/20';
    case 'issue': return 'bg-primary/10 text-primary border-primary/20';
    case 'dependency': return 'bg-secondary/10 text-secondary border-secondary/20';
    default: return 'bg-muted text-muted-foreground border-border';
  }
}

function getSeverityColor(severity: string) {
  switch (severity) {
    case 'critical': return 'bg-red-500 text-white';
    case 'high': return 'bg-orange-500 text-white';
    case 'medium': return 'bg-yellow-500 text-black';
    case 'low': return 'bg-green-500 text-white';
    default: return 'bg-gray-500 text-white';
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case 'open': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
    case 'in_progress': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
    case 'closed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
  }
}

export default function RaidLogs() {
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("all");
  const [isNewLogOpen, setIsNewLogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
  });

  const { data: raidLogs = [], isLoading } = useQuery<RaidLog[]>({
    queryKey: ['/api/projects', selectedProject, 'raid-logs'],
    enabled: !!selectedProject,
  });

  const form = useForm<RaidLogFormData>({
    resolver: zodResolver(raidLogFormSchema),
    defaultValues: {
      type: "risk",
      severity: "medium",
      impact: "medium",
      probability: "medium",
    },
  });

  const createRaidLogMutation = useMutation({
    mutationFn: async (logData: RaidLogFormData) => {
      const response = await apiRequest("POST", `/api/projects/${selectedProject}/raid-logs`, logData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', selectedProject, 'raid-logs'] });
      setIsNewLogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "RAID log entry created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create RAID log entry",
        variant: "destructive",
      });
    },
  });

  const updateRaidLogMutation = useMutation({
    mutationFn: async ({ logId, data }: { logId: string; data: Partial<RaidLog> }) => {
      const response = await apiRequest("PUT", `/api/raid-logs/${logId}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', selectedProject, 'raid-logs'] });
      toast({
        title: "Success",
        description: "RAID log updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update RAID log",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RaidLogFormData) => {
    createRaidLogMutation.mutate(data);
  };

  const handleStatusChange = (logId: string, status: string) => {
    updateRaidLogMutation.mutate({ logId, data: { status } });
  };

  const filteredLogs = raidLogs.filter(log => 
    activeTab === "all" || log.type === activeTab
  );

  const logCounts = {
    all: raidLogs.length,
    risk: raidLogs.filter(log => log.type === 'risk').length,
    action: raidLogs.filter(log => log.type === 'action').length,
    issue: raidLogs.filter(log => log.type === 'issue').length,
    dependency: raidLogs.filter(log => log.type === 'dependency').length,
  };

  return (
    <div className="space-y-6" data-testid="raid-logs-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">RAID Logs</h1>
          <p className="text-sm text-muted-foreground">Track risks, actions, issues, and dependencies</p>
        </div>
        <Dialog open={isNewLogOpen} onOpenChange={setIsNewLogOpen}>
          <DialogTrigger asChild>
            <Button disabled={!selectedProject} data-testid="button-new-raid-log">
              <Plus className="w-4 h-4 mr-2" />
              New Entry
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create RAID Log Entry</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-raid-type">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="risk">Risk</SelectItem>
                            <SelectItem value="action">Action</SelectItem>
                            <SelectItem value="issue">Issue</SelectItem>
                            <SelectItem value="dependency">Dependency</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="severity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Severity</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-raid-severity">
                              <SelectValue placeholder="Select severity" />
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
                </div>

                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-raid-title" />
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
                        <Textarea {...field} data-testid="input-raid-description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="impact"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Impact</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-raid-impact">
                              <SelectValue placeholder="Impact" />
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

                  {form.watch("type") === "risk" && (
                    <FormField
                      control={form.control}
                      name="probability"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Probability</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-raid-probability">
                                <SelectValue placeholder="Probability" />
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
                  )}

                  <FormField
                    control={form.control}
                    name="dueDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Due Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-raid-due-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsNewLogOpen(false)}
                    data-testid="button-cancel-raid"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createRaidLogMutation.isPending}
                    data-testid="button-save-raid"
                  >
                    {createRaidLogMutation.isPending ? "Creating..." : "Create Entry"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Project Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Project</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-full max-w-md" data-testid="select-raid-project">
              <SelectValue placeholder="Choose a project to view RAID logs" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* RAID Logs */}
      {selectedProject && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>RAID Log Entries</CardTitle>
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Filter by type</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="all" data-testid="tab-all-raids">
                  All ({logCounts.all})
                </TabsTrigger>
                <TabsTrigger value="risk" data-testid="tab-risks">
                  Risks ({logCounts.risk})
                </TabsTrigger>
                <TabsTrigger value="action" data-testid="tab-actions">
                  Actions ({logCounts.action})
                </TabsTrigger>
                <TabsTrigger value="issue" data-testid="tab-issues">
                  Issues ({logCounts.issue})
                </TabsTrigger>
                <TabsTrigger value="dependency" data-testid="tab-dependencies">
                  Dependencies ({logCounts.dependency})
                </TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="space-y-4">
                {isLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-24 bg-muted rounded-lg"></div>
                      </div>
                    ))}
                  </div>
                ) : filteredLogs.length === 0 ? (
                  <div className="text-center py-12" data-testid="no-raids-message">
                    <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      No {activeTab === 'all' ? 'RAID log entries' : `${activeTab}s`} Found
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Get started by creating your first entry for this project.
                    </p>
                    <Button onClick={() => setIsNewLogOpen(true)} data-testid="button-create-first-raid">
                      <Plus className="w-4 h-4 mr-2" />
                      Create First Entry
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredLogs.map((log) => (
                      <Card 
                        key={log.id} 
                        className={`hover:shadow-md transition-shadow ${getRaidTypeColor(log.type)}`}
                        data-testid={`raid-log-${log.id}`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-start space-x-3 flex-1">
                              {getRaidTypeIcon(log.type)}
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-2">
                                  <h3 className="font-medium text-foreground">{log.title}</h3>
                                  <Badge className={getSeverityColor(log.severity)}>
                                    {log.severity}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground mb-3">{log.description}</p>
                                
                                <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                                  <span>Impact: {log.impact}</span>
                                  {log.probability && <span>Probability: {log.probability}</span>}
                                  {log.dueDate && (
                                    <div className="flex items-center space-x-1">
                                      <Calendar className="w-3 h-3" />
                                      <span>Due: {new Date(log.dueDate).toLocaleDateString()}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex flex-col space-y-2 ml-4">
                              <Badge className={`text-xs ${getStatusColor(log.status)}`}>
                                {log.status.replace('_', ' ')}
                              </Badge>
                              <Select
                                value={log.status}
                                onValueChange={(value) => handleStatusChange(log.id, value)}
                              >
                                <SelectTrigger className="w-28 h-8" data-testid={`select-status-${log.id}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="open">Open</SelectItem>
                                  <SelectItem value="in_progress">In Progress</SelectItem>
                                  <SelectItem value="closed">Closed</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          
                          {log.resolution && (
                            <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                              <div className="flex items-center space-x-2 mb-1">
                                <CheckCircle className="w-4 h-4 text-green-600" />
                                <span className="text-sm font-medium">Resolution</span>
                              </div>
                              <p className="text-sm text-muted-foreground">{log.resolution}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
