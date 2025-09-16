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
import { Toggle } from "@/components/ui/toggle";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, AlertTriangle, CheckCircle, AlertCircle, Link as LinkIcon, Calendar, User, Filter, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useCurrentProject } from "@/contexts/CurrentProjectContext";
import type { Project, RaidLog } from "@shared/schema";

// Template-specific form schemas matching Excel templates
const riskFormSchema = z.object({
  type: z.literal("risk"),
  title: z.string().min(1, "Risk title is required"),
  likelihood: z.coerce.number().min(1).max(5),
  riskLevel: z.coerce.number().min(1).max(5),
  potentialOutcome: z.string().min(1, "Potential outcome is required"),
  whoWillManage: z.string().min(1, "Who will manage is required"),
  notes: z.string().optional(),
});

const actionFormSchema = z.object({
  type: z.literal("action"),
  title: z.string().min(1, "Action title is required"),
  event: z.string().min(1, "Event description is required"),
  dueOut: z.string().min(1, "Due out is required"),
  assigneeId: z.string().optional(),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
  wasDeadlineMet: z.boolean().optional(),
});

const issueFormSchema = z.object({
  type: z.literal("issue"),
  title: z.string().min(1, "Issue title is required"),
  description: z.string().min(1, "Description is required"),
  priority: z.enum(["low", "medium", "high", "critical"]),
  impact: z.enum(["low", "medium", "high"]),
  severity: z.enum(["low", "medium", "high", "critical"]),
  assigneeId: z.string().optional(),
  dueDate: z.string().optional(),
  rootCause: z.string().optional(),
});

const deficiencyFormSchema = z.object({
  type: z.literal("deficiency"),
  title: z.string().min(1, "Deficiency title is required"),
  description: z.string().min(1, "Description is required"),
  category: z.string().min(1, "Category is required"),
  severity: z.enum(["low", "medium", "high", "critical"]),
  impact: z.enum(["low", "medium", "high"]),
  assigneeId: z.string().optional(),
  targetResolutionDate: z.string().optional(),
  resolutionStatus: z.enum(["pending", "in_progress", "resolved"]).optional(),
});

// Union type for all form schemas
const raidLogFormSchema = z.union([riskFormSchema, actionFormSchema, issueFormSchema, deficiencyFormSchema]);

type RaidLogFormData = z.infer<typeof raidLogFormSchema>;
type RiskFormData = z.infer<typeof riskFormSchema>;
type ActionFormData = z.infer<typeof actionFormSchema>;
type IssueFormData = z.infer<typeof issueFormSchema>;
type DeficiencyFormData = z.infer<typeof deficiencyFormSchema>;

function getRaidTypeIcon(type: string) {
  switch (type) {
    case 'risk': return <AlertTriangle className="w-4 h-4 text-destructive" />;
    case 'action': return <CheckCircle className="w-4 h-4 text-accent" />;
    case 'issue': return <AlertCircle className="w-4 h-4 text-primary" />;
    case 'deficiency': return <LinkIcon className="w-4 h-4 text-secondary" />;
    default: return <AlertCircle className="w-4 h-4 text-muted-foreground" />;
  }
}

function getRaidTypeColor(type: string) {
  switch (type) {
    case 'risk': return 'bg-destructive/10 text-destructive border-destructive/20';
    case 'action': return 'bg-accent/10 text-accent border-accent/20';
    case 'issue': return 'bg-primary/10 text-primary border-primary/20';
    case 'deficiency': return 'bg-secondary/10 text-secondary border-secondary/20';
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
  const [activeTab, setActiveTab] = useState<string>("all");
  const [isNewLogOpen, setIsNewLogOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<RaidLog | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentProject } = useCurrentProject();

  const { data: raidLogs = [], isLoading } = useQuery<RaidLog[]>({
    queryKey: ['/api/projects', currentProject?.id, 'raid-logs'],
    enabled: !!currentProject?.id,
  });

  const [formType, setFormType] = useState<"risk" | "action" | "issue" | "deficiency">("risk");
  
  // Get schema based on selected type
  const getFormSchema = (type: string) => {
    switch (type) {
      case "risk": return riskFormSchema;
      case "action": return actionFormSchema;
      case "issue": return issueFormSchema;
      case "deficiency": return deficiencyFormSchema;
      default: return riskFormSchema;
    }
  };
  
  const form = useForm<RaidLogFormData>({
    resolver: zodResolver(raidLogFormSchema),
    defaultValues: {
      type: formType,
      likelihood: 3,
      riskLevel: 3,
      priority: "medium",
      severity: "medium",
      impact: "medium",
      resolutionStatus: "pending",
    },
  });
  
  // Reset form when type changes
  const handleTypeChange = (newType: "risk" | "action" | "issue" | "deficiency") => {
    setFormType(newType);
    
    // Reset form with appropriate defaults for the new type
    const baseDefaults = {
      type: newType,
      title: "",
      notes: "",
    };
    
    const typeSpecificDefaults = {
      risk: {
        ...baseDefaults,
        likelihood: 3,
        riskLevel: 3,
        potentialOutcome: "",
        whoWillManage: "",
      },
      action: {
        ...baseDefaults,
        event: "",
        dueOut: "",
        assigneeId: "",
        dueDate: "",
        wasDeadlineMet: false,
      },
      issue: {
        ...baseDefaults,
        description: "",
        priority: "medium" as const,
        impact: "medium" as const,
        severity: "medium" as const,
        assigneeId: "",
        dueDate: "",
        rootCause: "",
      },
      deficiency: {
        ...baseDefaults,
        description: "",
        category: "",
        severity: "medium" as const,
        impact: "medium" as const,
        assigneeId: "",
        targetResolutionDate: "",
        resolutionStatus: "pending" as const,
      },
    };
    
    form.reset(typeSpecificDefaults[newType]);
  };

  const createRaidLogMutation = useMutation({
    mutationFn: async (logData: RaidLogFormData) => {
      if (!currentProject?.id) throw new Error("No project selected");
      const response = await apiRequest("POST", `/api/projects/${currentProject.id}/raid-logs`, logData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', currentProject?.id, 'raid-logs'] });
      setIsNewLogOpen(false);
      setEditingLog(null);
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
      queryClient.invalidateQueries({ queryKey: ['/api/projects', currentProject?.id, 'raid-logs'] });
      setIsNewLogOpen(false);
      setEditingLog(null);
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

  const deleteRaidLogMutation = useMutation({
    mutationFn: async (logId: string) => {
      const response = await apiRequest("DELETE", `/api/raid-logs/${logId}`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', currentProject?.id, 'raid-logs'] });
      toast({
        title: "Success",
        description: "RAID log deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete RAID log",
        variant: "destructive",
      });
    },
  });

  const handleDeleteLog = (logId: string, logTitle: string) => {
    if (window.confirm(`Are you sure you want to delete "${logTitle}"? This action cannot be undone.`)) {
      deleteRaidLogMutation.mutate(logId);
    }
  };

  const handleEditLog = (log: RaidLog) => {
    setEditingLog(log);
    setFormType(log.type as "risk" | "action" | "issue" | "deficiency");
    
    // Reset form with log data
    form.reset({
      type: log.type,
      title: log.title,
      description: log.description || "",
      // Risk-specific fields
      likelihood: log.likelihood || 3,
      riskLevel: log.riskLevel || 3,
      potentialOutcome: log.potentialOutcome || "",
      whoWillManage: log.whoWillManage || "",
      // Action-specific fields
      event: log.event || "",
      dueOut: log.dueOut || "",
      assigneeId: log.assigneeId || "",
      dueDate: log.dueDate ? new Date(log.dueDate).toISOString().split('T')[0] : "",
      wasDeadlineMet: log.wasDeadlineMet || false,
      // Issue-specific fields
      priority: log.priority || "medium",
      impact: log.impact || "medium",
      severity: log.severity || "medium",
      rootCause: log.rootCause || "",
      // Deficiency-specific fields
      category: log.category || "",
      targetResolutionDate: log.targetResolutionDate ? new Date(log.targetResolutionDate).toISOString().split('T')[0] : "",
      resolutionStatus: log.resolutionStatus || "pending",
      // Common fields
      notes: log.notes || "",
    });
    
    setIsNewLogOpen(true);
  };

  const onSubmit = (data: RaidLogFormData) => {
    // The union schema validates the data correctly based on the type discriminant
    if (editingLog) {
      updateRaidLogMutation.mutate({ logId: editingLog.id, data });
      setEditingLog(null);
    } else {
      createRaidLogMutation.mutate(data);
    }
  };
  
  // Helper function to render template-specific details
  const renderTemplateDetails = (log: RaidLog) => {
    switch (log.type) {
      case 'risk':
        return (
          <div className="space-y-2">
            <div className="flex items-center space-x-4 text-xs text-muted-foreground">
              {log.likelihood && <span>Likelihood: {log.likelihood}/5</span>}
              {log.riskLevel && <span>Risk Level: {log.riskLevel}/5</span>}
            </div>
            {log.potentialOutcome && (
              <p className="text-sm text-muted-foreground">Outcome: {log.potentialOutcome}</p>
            )}
            {log.whoWillManage && (
              <p className="text-sm text-muted-foreground">Manager: {log.whoWillManage}</p>
            )}
            {log.notes && (
              <p className="text-sm text-muted-foreground">Notes: {log.notes}</p>
            )}
          </div>
        );
      case 'action':
        return (
          <div className="space-y-2">
            <div className="flex items-center space-x-4 text-xs text-muted-foreground">
              <span>Date: {new Date(log.createdAt).toLocaleDateString()}</span>
              {log.assigneeId && <span>Assigned to: {log.assigneeId}</span>}
            </div>
            {log.event && (
              <p className="text-sm text-muted-foreground">Event: {log.event}</p>
            )}
            {log.dueOut && (
              <p className="text-sm text-muted-foreground">Due Out: {log.dueOut}</p>
            )}
            <div className="flex items-center space-x-4 text-xs text-muted-foreground">
              {log.dueDate && (
                <div className="flex items-center space-x-1">
                  <Calendar className="w-3 h-3" />
                  <span>Deadline: {new Date(log.dueDate).toLocaleDateString()}</span>
                </div>
              )}
              {log.wasDeadlineMet !== undefined && (
                <span>Deadline Met: {log.wasDeadlineMet ? 'Yes' : 'No'}</span>
              )}
            </div>
            {log.notes && (
              <p className="text-sm text-muted-foreground">Notes: {log.notes}</p>
            )}
          </div>
        );
      case 'issue':
        return (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{log.description}</p>
            <div className="flex items-center space-x-4 text-xs text-muted-foreground">
              {log.priority && <span>Priority: {log.priority}</span>}
              {log.impact && <span>Impact: {log.impact}</span>}
              {log.severity && <span>Severity: {log.severity}</span>}
            </div>
            {log.rootCause && (
              <p className="text-sm text-muted-foreground">Root Cause: {log.rootCause}</p>
            )}
            {log.dueDate && (
              <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                <Calendar className="w-3 h-3" />
                <span>Due: {new Date(log.dueDate).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        );
      case 'deficiency':
        return (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{log.description}</p>
            <div className="flex items-center space-x-4 text-xs text-muted-foreground">
              {log.category && <span>Category: {log.category}</span>}
              {log.severity && <span>Severity: {log.severity}</span>}
            </div>
            <div className="flex items-center space-x-4 text-xs text-muted-foreground">
              {log.targetResolutionDate && (
                <div className="flex items-center space-x-1">
                  <Calendar className="w-3 h-3" />
                  <span>Target: {new Date(log.targetResolutionDate).toLocaleDateString()}</span>
                </div>
              )}
              {log.resolutionStatus && (
                <span>Status: {log.resolutionStatus.replace('_', ' ')}</span>
              )}
            </div>
          </div>
        );
      default:
        return (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{log.description}</p>
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
        );
    }
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
    deficiency: raidLogs.filter(log => log.type === 'deficiency').length,
  };

  return (
    <div className="space-y-6" data-testid="raid-logs-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">RAID Logs</h1>
          <p className="text-sm text-muted-foreground">Track risks, actions, issues, and deficiencies</p>
        </div>
        <Dialog open={isNewLogOpen} onOpenChange={setIsNewLogOpen}>
          <DialogTrigger asChild>
            <Button disabled={!currentProject?.id} data-testid="button-new-raid-log">
              <Plus className="w-4 h-4 mr-2" />
              New Entry
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingLog ? "Edit RAID Log Entry" : "Create RAID Log Entry"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {/* Type Selection */}
                <div className="mb-4">
                  <label className="text-sm font-medium">Type</label>
                  <div className="flex gap-2 mt-2">
                    {(['risk', 'action', 'issue', 'deficiency'] as const).map((type) => (
                      <Button
                        key={type}
                        type="button"
                        variant={formType === type ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleTypeChange(type)}
                        data-testid={`select-${type}-type`}
                      >
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </Button>
                    ))}
                  </div>
                </div>
                
                {/* Risk-specific fields */}
                {formType === "risk" && (
                  <>
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Risk</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Describe the risk" data-testid="input-risk-title" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="likelihood"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Likelihood (1-5)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="1"
                                max="5"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value))}
                                data-testid="input-risk-likelihood"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="riskLevel"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Risk Level (1-5)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="1"
                                max="5"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value))}
                                data-testid="input-risk-level"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="potentialOutcome"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Potential Outcome</FormLabel>
                          <FormControl>
                            <Textarea {...field} data-testid="input-risk-outcome" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="whoWillManage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Who will manage?</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-risk-manager" />
                          </FormControl>
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
                            <Textarea {...field} data-testid="input-risk-notes" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}
                
                {/* Action-specific fields */}
                {formType === "action" && (
                  <>
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Action Title</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-action-title" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="event"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Event</FormLabel>
                          <FormControl>
                            <Textarea {...field} placeholder="Describe the event" data-testid="input-action-event" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="dueOut"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Due Out</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="What is due out" data-testid="input-action-due-out" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="dueDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Deadline</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} data-testid="input-action-deadline" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="wasDeadlineMet"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormLabel>Was deadline met?</FormLabel>
                            <FormControl>
                              <input
                                type="checkbox"
                                checked={field.value || false}
                                onChange={field.onChange}
                                data-testid="checkbox-deadline-met"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes</FormLabel>
                          <FormControl>
                            <Textarea {...field} data-testid="input-action-notes" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}
                
                {/* Issue-specific fields */}
                {formType === "issue" && (
                  <>
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Issue</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-issue-title" />
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
                            <Textarea {...field} data-testid="input-issue-description" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="priority"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Priority</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-issue-priority">
                                  <SelectValue />
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
                        name="impact"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Impact</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-issue-impact">
                                  <SelectValue />
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
                        name="severity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Severity</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-issue-severity">
                                  <SelectValue />
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
                      name="dueDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Due Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} data-testid="input-issue-due-date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="rootCause"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Root Cause</FormLabel>
                          <FormControl>
                            <Textarea {...field} data-testid="input-issue-root-cause" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}
                
                {/* Deficiency-specific fields */}
                {formType === "deficiency" && (
                  <>
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Deficiency</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-deficiency-title" />
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
                            <Textarea {...field} data-testid="input-deficiency-description" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Category</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-deficiency-category" />
                            </FormControl>
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
                                <SelectTrigger data-testid="select-deficiency-severity">
                                  <SelectValue />
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
                      name="targetResolutionDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Target Resolution Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} data-testid="input-deficiency-target-date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="resolutionStatus"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Resolution Status</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-deficiency-resolution-status">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                              <SelectItem value="resolved">Resolved</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}


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

      {/* RAID Logs */}
      {currentProject && (
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
            <div className="space-y-4">
              {/* Toggle Buttons Filter */}
              <div className="flex flex-wrap gap-2">
                <Toggle
                  pressed={activeTab === "all"}
                  onPressedChange={() => setActiveTab("all")}
                  variant="outline"
                  className={`${
                    activeTab === "all" 
                      ? "bg-primary text-primary-foreground border-primary" 
                      : "hover:bg-muted"
                  }`}
                  data-testid="toggle-all-raids"
                >
                  All ({logCounts.all})
                </Toggle>
                <Toggle
                  pressed={activeTab === "risk"}
                  onPressedChange={() => setActiveTab("risk")}
                  variant="outline"
                  className={`${
                    activeTab === "risk" 
                      ? "bg-destructive text-destructive-foreground border-destructive" 
                      : "hover:bg-muted"
                  }`}
                  data-testid="toggle-risks"
                >
                  <AlertTriangle className="w-4 h-4 mr-1" />
                  Risks ({logCounts.risk})
                </Toggle>
                <Toggle
                  pressed={activeTab === "action"}
                  onPressedChange={() => setActiveTab("action")}
                  variant="outline"
                  className={`${
                    activeTab === "action" 
                      ? "bg-accent text-accent-foreground border-accent" 
                      : "hover:bg-muted"
                  }`}
                  data-testid="toggle-actions"
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Actions ({logCounts.action})
                </Toggle>
                <Toggle
                  pressed={activeTab === "issue"}
                  onPressedChange={() => setActiveTab("issue")}
                  variant="outline"
                  className={`${
                    activeTab === "issue" 
                      ? "bg-primary text-primary-foreground border-primary" 
                      : "hover:bg-muted"
                  }`}
                  data-testid="toggle-issues"
                >
                  <AlertCircle className="w-4 h-4 mr-1" />
                  Issues ({logCounts.issue})
                </Toggle>
                <Toggle
                  pressed={activeTab === "deficiency"}
                  onPressedChange={() => setActiveTab("deficiency")}
                  variant="outline"
                  className={`${
                    activeTab === "deficiency" 
                      ? "bg-secondary text-secondary-foreground border-secondary" 
                      : "hover:bg-muted"
                  }`}
                  data-testid="toggle-deficiencies"
                >
                  <LinkIcon className="w-4 h-4 mr-1" />
                  Deficiencies ({logCounts.deficiency})
                </Toggle>
              </div>

              {/* Content Area */}
              <div className="space-y-4">
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
                                  <Badge className={getSeverityColor(log.severity || 'medium')}>
                                    {log.severity || 'medium'}
                                  </Badge>
                                </div>
                                
                                {/* Template-specific details */}
                                {renderTemplateDetails(log)}
                              </div>
                            </div>
                            
                            <div className="flex flex-col space-y-2 ml-4">
                              <div className="flex items-center space-x-2">
                                <Badge className={`text-xs ${getStatusColor(log.status)}`}>
                                  {log.status.replace('_', ' ')}
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditLog(log)}
                                  data-testid={`button-edit-raid-${log.id}`}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteLog(log.id, log.title)}
                                  data-testid={`button-delete-raid-${log.id}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
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
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
