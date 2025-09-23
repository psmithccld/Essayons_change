import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Briefcase, Plus, Target, TrendingUp, Calendar as CalendarIcon, Search, MoreHorizontal, Edit, Trash2, Users, UserPlus, Clock, AlertCircle, CheckCircle, Copy, Filter, ArrowUpDown, Star, Zap, Shield, Settings, TrendingDown, DollarSign, FileText } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { insertProjectSchema, type Project, type User, type UserInitiativeAssignment, type Role } from "@shared/schema";
import { RouteGuard } from "@/components/auth/RouteGuard";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { usePermissions } from "@/hooks/use-permissions";
import { useLocation } from "wouter";

// Priority and Category options
const PRIORITY_OPTIONS = [
  { value: "high", label: "High", color: "destructive" },
  { value: "medium", label: "Medium", color: "default" },
  { value: "low", label: "Low", color: "secondary" }
] as const;

const CATEGORY_OPTIONS = [
  { value: "strategic", label: "Strategic", color: "default" },
  { value: "operational", label: "Operational", color: "secondary" },
  { value: "compliance", label: "Compliance", color: "destructive" },
  { value: "technology", label: "Technology", color: "outline" },
  { value: "hr", label: "HR", color: "default" },
  { value: "finance", label: "Finance", color: "secondary" }
] as const;

// Enhanced form validation schemas
const createInitiativeSchema = insertProjectSchema.omit({
  ownerId: true // Will be provided automatically in handler
}).extend({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  deliverables: z.array(z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().optional(),
    targetDate: z.string().optional()
  })).optional().default([])
});

const editInitiativeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  status: z.enum(["identify_need", "identify_stakeholders", "develop_change", "implement_change", "reinforce_change", "cancelled"]),
  priority: z.enum(["high", "medium", "low"]).optional(),
  category: z.string().optional(),
  objectives: z.string().optional(),
  scope: z.string().optional(),
  successCriteria: z.string().optional(),
  budget: z.coerce.number().optional(),
  assumptions: z.string().optional(),
  constraints: z.string().optional(),
  risks: z.string().optional(),
  stakeholderRequirements: z.string().optional(),
  businessJustification: z.string().optional(),
  deliverables: z.array(z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().optional(),
    targetDate: z.string().optional()
  })).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  progress: z.number().min(0).max(100).optional()
});

const copyInitiativeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  copyAssignments: z.boolean().default(false),
  copyTasks: z.boolean().default(false),
  newStartDate: z.string().optional(),
  newEndDate: z.string().optional()
});

const assignUserSchema = z.object({
  userId: z.string().uuid("Please select a user"),
  projectId: z.string().uuid(),
  role: z.enum(["Change Owner", "Change Champion", "Change Agent", "Member", "Observer"])
});

type CreateInitiativeFormData = z.infer<typeof createInitiativeSchema>;
type EditInitiativeFormData = z.infer<typeof editInitiativeSchema>;
type CopyInitiativeFormData = z.infer<typeof copyInitiativeSchema>;
type AssignUserFormData = z.infer<typeof assignUserSchema>;

// Enhanced initiative type with calculated fields
type EnhancedInitiative = Project & {
  assignments?: UserInitiativeAssignment[];
  owner?: User;
  priorityInfo?: typeof PRIORITY_OPTIONS[number];
  categoryInfo?: typeof CATEGORY_OPTIONS[number];
};

// Enhanced project type with assignments
type ProjectWithAssignments = Project & {
  assignments?: UserInitiativeAssignment[];
  owner?: User;
};

function InitiativeManagementContent() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<string>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingInitiative, setEditingInitiative] = useState<Project | null>(null);
  const [copyingInitiative, setCopyingInitiative] = useState<Project | null>(null);
  const [isCopyDialogOpen, setIsCopyDialogOpen] = useState(false);
  const [managingAssignments, setManagingAssignments] = useState<Project | null>(null);
  const [isAssignUserDialogOpen, setIsAssignUserDialogOpen] = useState(false);
  const [currentTab, setCurrentTab] = useState("basic");
  const [editCurrentTab, setEditCurrentTab] = useState("basic");
  const [deliverables, setDeliverables] = useState<Array<{id: string, title: string, description?: string, targetDate?: string}>>([]);
  const [editDeliverables, setEditDeliverables] = useState<Array<{id: string, title: string, description?: string, targetDate?: string}>>([]);
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [editStartDate, setEditStartDate] = useState<Date>();
  const [editEndDate, setEditEndDate] = useState<Date>();
  const [copyStartDate, setCopyStartDate] = useState<Date>();
  const [copyEndDate, setCopyEndDate] = useState<Date>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [location, setLocation] = useLocation();

  // Auto-open dialog when coming from header button
  useEffect(() => {
    const params = new URLSearchParams(location.split('?')[1]);
    if (params.get('create') === 'true') {
      setIsCreateDialogOpen(true);
      // Clear the parameter to avoid reopening on refresh
      setLocation('/initiatives');
    }
  }, [location, setLocation]);

  // Fetch initiatives/projects
  const { data: initiatives = [], isLoading: initiativesLoading } = useQuery<EnhancedInitiative[]>({
    queryKey: ["/api/projects"],
    refetchInterval: 30000,
    select: (data: Project[]) => {
      return data.map(initiative => ({
        ...initiative,
        priorityInfo: PRIORITY_OPTIONS.find(p => p.value === initiative.priority),
        categoryInfo: CATEGORY_OPTIONS.find(c => c.value === initiative.category)
      }));
    }
  });

  // Fetch users for dropdowns
  const { data: usersWithRoles = [] } = useQuery<(User & { role: Role })[]>({
    queryKey: ["/api/users/with-roles"]
  });

  // Fetch assignments for selected initiative
  const { data: assignments = [] } = useQuery<(UserInitiativeAssignment & { user: User, assignedBy: User })[]>({
    queryKey: ["/api/projects", managingAssignments?.id, "assignments"],
    enabled: !!managingAssignments?.id
  });

  // Create initiative mutation
  const createInitiativeMutation = useMutation({
    mutationFn: (initiativeData: CreateInitiativeFormData) => {
      const processedData = {
        ...initiativeData,
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString()
      };
      return apiRequest("POST", "/api/projects", processedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setIsCreateDialogOpen(false);
      setStartDate(undefined);
      setEndDate(undefined);
      toast({ title: "Success", description: "Initiative created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create initiative", variant: "destructive" });
    }
  });

  // Update initiative mutation
  const updateInitiativeMutation = useMutation({
    mutationFn: ({ id, ...initiativeData }: EditInitiativeFormData & { id: string }) => {
      const processedData = {
        ...initiativeData,
        startDate: editStartDate?.toISOString(),
        endDate: editEndDate?.toISOString()
      };
      return apiRequest("PUT", `/api/projects/${id}`, processedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setEditingInitiative(null);
      setEditStartDate(undefined);
      setEditEndDate(undefined);
      toast({ title: "Success", description: "Initiative updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update initiative", variant: "destructive" });
    }
  });

  // Delete initiative mutation
  const deleteInitiativeMutation = useMutation({
    mutationFn: (initiativeId: string) => apiRequest("DELETE", `/api/projects/${initiativeId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: "Success", description: "Initiative deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete initiative", variant: "destructive" });
    }
  });

  // Copy initiative mutation
  const copyInitiativeMutation = useMutation({
    mutationFn: (copyData: CopyInitiativeFormData & { originalId: string }) => 
      apiRequest("POST", `/api/projects/${copyData.originalId}/copy`, copyData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setIsCopyDialogOpen(false);
      setCopyingInitiative(null);
      setCopyStartDate(undefined);
      setCopyEndDate(undefined);
      toast({ title: "Success", description: "Initiative copied successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to copy initiative", variant: "destructive" });
    }
  });

  // Assign user mutation
  const assignUserMutation = useMutation({
    mutationFn: (assignmentData: AssignUserFormData) => apiRequest("POST", "/api/assignments", assignmentData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", managingAssignments?.id, "assignments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setIsAssignUserDialogOpen(false);
      toast({ title: "Success", description: "User assigned successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to assign user", variant: "destructive" });
    }
  });

  // Remove user assignment mutation
  const removeAssignmentMutation = useMutation({
    mutationFn: ({ userId, projectId }: { userId: string; projectId: string }) => 
      apiRequest("DELETE", `/api/assignments/remove`, { userId, projectId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", managingAssignments?.id, "assignments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: "Success", description: "User removed from initiative" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to remove user", variant: "destructive" });
    }
  });

  // Forms
  const createForm = useForm<CreateInitiativeFormData>({
    resolver: zodResolver(createInitiativeSchema),
    defaultValues: {
      name: "",
      description: "",
      status: "identify_need",
      progress: 0
    }
  });

  const editForm = useForm<EditInitiativeFormData>({
    resolver: zodResolver(editInitiativeSchema)
  });

  const assignForm = useForm<AssignUserFormData>({
    resolver: zodResolver(assignUserSchema),
    defaultValues: {
      role: "Member"
    }
  });

  const copyForm = useForm<CopyInitiativeFormData>({
    resolver: zodResolver(copyInitiativeSchema),
    defaultValues: {
      copyAssignments: false,
      copyTasks: false
    }
  });

  // Enhanced filtering and sorting
  const filteredAndSortedInitiatives = initiatives
    .filter((initiative) => {
      const matchesSearch = searchTerm === "" || [
        initiative.name,
        initiative.description,
        initiative.objectives,
        initiative.scope,
        initiative.businessJustification,
        initiative.category
      ].some(field => field?.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesStatus = selectedStatus === "all" || initiative.status === selectedStatus;
      const matchesPriority = selectedPriorities.length === 0 || selectedPriorities.includes(initiative.priority || "medium");
      const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(initiative.category || "");
      
      return matchesSearch && matchesStatus && matchesPriority && matchesCategory;
    })
    .sort((a, b) => {
      let aValue: any;
      let bValue: any;
      
      switch (sortBy) {
        case "priority":
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          aValue = priorityOrder[a.priority as keyof typeof priorityOrder] || 2;
          bValue = priorityOrder[b.priority as keyof typeof priorityOrder] || 2;
          break;
        case "category":
          aValue = a.category || "";
          bValue = b.category || "";
          break;
        case "budget":
          aValue = Number(a.budget) || 0;
          bValue = Number(b.budget) || 0;
          break;
        case "progress":
          aValue = a.progress || 0;
          bValue = b.progress || 0;
          break;
        case "startDate":
          aValue = a.startDate ? new Date(a.startDate).getTime() : 0;
          bValue = b.startDate ? new Date(b.startDate).getTime() : 0;
          break;
        case "endDate":
          aValue = a.endDate ? new Date(a.endDate).getTime() : 0;
          bValue = b.endDate ? new Date(b.endDate).getTime() : 0;
          break;
        default: // name
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }
      
      if (sortOrder === "asc") {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

  // Calculate enhanced metrics
  const totalInitiatives = initiatives.length;
  const activeInitiatives = initiatives.filter(i => i.status === "active").length;
  const completedInitiatives = initiatives.filter(i => i.status === "completed").length;
  const highPriorityInitiatives = initiatives.filter(i => i.priority === "high").length;
  const averageProgress = initiatives.length > 0 
    ? Math.round(initiatives.reduce((acc, i) => acc + (i.progress || 0), 0) / initiatives.length)
    : 0;
  const totalBudget = initiatives.reduce((acc, i) => acc + (Number(i.budget) || 0), 0);

  const handleCreateInitiative = (data: CreateInitiativeFormData) => {
    const processedData = {
      ...data,
      ownerId: "550e8400-e29b-41d4-a716-446655440000", // Use demo user ID
      deliverables: deliverables.length > 0 ? deliverables : undefined
    };
    createInitiativeMutation.mutate(processedData);
  };
  
  const handleCopyInitiative = (data: CopyInitiativeFormData) => {
    if (!copyingInitiative) return;
    const processedData = {
      ...data,
      originalId: copyingInitiative.id,
      newStartDate: copyStartDate?.toISOString(),
      newEndDate: copyEndDate?.toISOString()
    };
    copyInitiativeMutation.mutate(processedData);
  };
  
  const handleStartCopyInitiative = (initiative: Project) => {
    setCopyingInitiative(initiative);
    copyForm.reset({
      name: `Copy of ${initiative.name}`,
      copyAssignments: false,
      copyTasks: false
    });
    setIsCopyDialogOpen(true);
  };

  const handleEditInitiative = (initiative: Project) => {
    setEditingInitiative(initiative);
    setEditStartDate(initiative.startDate ? new Date(initiative.startDate) : undefined);
    setEditEndDate(initiative.endDate ? new Date(initiative.endDate) : undefined);
    setEditDeliverables(Array.isArray(initiative.deliverables) ? initiative.deliverables : []);
    setEditCurrentTab("basic");
    editForm.reset({
      name: initiative.name,
      description: initiative.description || "",
      status: initiative.status as "planning" | "active" | "completed" | "cancelled",
      priority: initiative.priority as "high" | "medium" | "low" || "medium",
      category: initiative.category || "",
      objectives: initiative.objectives || "",
      scope: initiative.scope || "",
      successCriteria: initiative.successCriteria || "",
      budget: initiative.budget ? Number(initiative.budget) : undefined,
      assumptions: initiative.assumptions || "",
      constraints: initiative.constraints || "",
      risks: initiative.risks || "",
      stakeholderRequirements: initiative.stakeholderRequirements || "",
      businessJustification: initiative.businessJustification || "",
      progress: initiative.progress || 0
    });
  };

  const handleUpdateInitiative = (data: EditInitiativeFormData) => {
    if (!editingInitiative) return;
    const processedData = {
      ...data,
      id: editingInitiative.id,
      deliverables: editDeliverables.length > 0 ? editDeliverables : undefined
    };
    updateInitiativeMutation.mutate(processedData);
  };

  const handleDeleteInitiative = (initiativeId: string) => {
    deleteInitiativeMutation.mutate(initiativeId);
  };

  const handleManageAssignments = (initiative: Project) => {
    setManagingAssignments(initiative);
    assignForm.setValue("projectId", initiative.id);
  };

  const handleAssignUser = (data: AssignUserFormData) => {
    assignUserMutation.mutate(data);
  };

  const handleRemoveAssignment = (userId: string, projectId: string) => {
    removeAssignmentMutation.mutate({ userId, projectId });
  };

  // Helper functions for badges and icons
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "active": return "default";
      case "completed": return "default";
      case "planning": return "secondary";
      case "cancelled": return "destructive";
      default: return "outline";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active": return <Clock className="w-3 h-3" />;
      case "completed": return <CheckCircle className="w-3 h-3" />;
      case "planning": return <Target className="w-3 h-3" />;
      case "cancelled": return <AlertCircle className="w-3 h-3" />;
      default: return null;
    }
  };

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case "high": return "destructive";
      case "medium": return "default";
      case "low": return "secondary";
      default: return "outline";
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "high": return <AlertCircle className="w-3 h-3" />;
      case "medium": return <Clock className="w-3 h-3" />;
      case "low": return <CheckCircle className="w-3 h-3" />;
      default: return <TrendingDown className="w-3 h-3" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "strategic": return <Star className="w-3 h-3" />;
      case "operational": return <Settings className="w-3 h-3" />;
      case "compliance": return <Shield className="w-3 h-3" />;
      case "technology": return <Zap className="w-3 h-3" />;
      case "hr": return <Users className="w-3 h-3" />;
      case "finance": return <DollarSign className="w-3 h-3" />;
      default: return <Briefcase className="w-3 h-3" />;
    }
  };

  const formatCurrency = (amount: number | string | null) => {
    if (!amount) return "Not set";
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num);
  };

  const addDeliverable = () => {
    const newDeliverable = {
      id: `deliverable-${Date.now()}`,
      title: "",
      description: "",
      targetDate: ""
    };
    setDeliverables([...deliverables, newDeliverable]);
  };

  const addEditDeliverable = () => {
    const newDeliverable = {
      id: `deliverable-${Date.now()}`,
      title: "",
      description: "",
      targetDate: ""
    };
    setEditDeliverables([...editDeliverables, newDeliverable]);
  };

  const removeDeliverable = (id: string) => {
    setDeliverables(deliverables.filter(d => d.id !== id));
  };

  const removeEditDeliverable = (id: string) => {
    setEditDeliverables(editDeliverables.filter(d => d.id !== id));
  };

  const updateDeliverable = (id: string, field: string, value: string) => {
    setDeliverables(deliverables.map(d => 
      d.id === id ? { ...d, [field]: value } : d
    ));
  };

  const updateEditDeliverable = (id: string, field: string, value: string) => {
    setEditDeliverables(editDeliverables.map(d => 
      d.id === id ? { ...d, [field]: value } : d
    ));
  };

  const formatDate = (dateValue: string | Date | null) => {
    if (!dateValue) return "Not set";
    const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
    return format(date, "MMM dd, yyyy");
  };

  const resetCreateForm = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    setDeliverables([]);
    setCurrentTab("basic");
    createForm.reset({
      name: "",
      description: "",
      status: "planning",
      priority: "medium",
      category: "",
      objectives: "",
      scope: "",
      successCriteria: "",
      budget: undefined,
      assumptions: "",
      constraints: "",
      risks: "",
      stakeholderRequirements: "",
      businessJustification: "",
      progress: 0
    });
  };

  const handleTabChange = (tab: string) => {
    setCurrentTab(tab);
  };

  const handleEditTabChange = (tab: string) => {
    setEditCurrentTab(tab);
  };

  const togglePriorityFilter = (priority: string) => {
    setSelectedPriorities(prev => 
      prev.includes(priority) 
        ? prev.filter(p => p !== priority)
        : [...prev, priority]
    );
  };

  const toggleCategoryFilter = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const clearAllFilters = () => {
    setSearchTerm("");
    setSelectedStatus("all");
    setSelectedPriorities([]);
    setSelectedCategories([]);
  };

  const handleSortChange = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  // Check if any filters are active
  const hasActiveFilters = searchTerm !== "" || selectedStatus !== "all" || 
    selectedPriorities.length > 0 || selectedCategories.length > 0;

  return (
    <div className="space-y-6" data-testid="initiative-management-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Initiative Management</h1>
          <p className="text-sm text-muted-foreground">Manage change initiatives and track progress</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-initiative">
              <Plus className="w-4 h-4 mr-2" />
              Create Initiative
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Initiative</DialogTitle>
              <p className="text-sm text-muted-foreground">Complete the project charter with comprehensive initiative details</p>
            </DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(handleCreateInitiative)} className="space-y-6">
                <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="basic" data-testid="tab-basic">
                      <Target className="w-4 h-4 mr-2" />
                      Basic Info
                    </TabsTrigger>
                    <TabsTrigger value="objectives" data-testid="tab-objectives">
                      <Briefcase className="w-4 h-4 mr-2" />
                      Objectives & Scope
                    </TabsTrigger>
                    <TabsTrigger value="planning" data-testid="tab-planning">
                      <DollarSign className="w-4 h-4 mr-2" />
                      Planning & Resources
                    </TabsTrigger>
                    <TabsTrigger value="risk" data-testid="tab-risk">
                      <Shield className="w-4 h-4 mr-2" />
                      Risk & Constraints
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="basic" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={createForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>Initiative Name *</FormLabel>
                            <FormControl>
                              <Input placeholder="Digital Transformation Initiative" {...field} data-testid="input-initiative-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={createForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Brief overview of the initiative..."
                                className="h-20"
                                {...field} 
                                value={field.value || ""} 
                                data-testid="input-initiative-description" 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={createForm.control}
                        name="priority"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Priority *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value || "medium"} data-testid="select-initiative-priority">
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select priority" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {PRIORITY_OPTIONS.map((priority) => (
                                  <SelectItem key={priority.value} value={priority.value}>
                                    <div className="flex items-center gap-2">
                                      {getPriorityIcon(priority.value)}
                                      {priority.label}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={createForm.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Category</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""} data-testid="select-initiative-category">
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {CATEGORY_OPTIONS.map((category) => (
                                  <SelectItem key={category.value} value={category.value}>
                                    <div className="flex items-center gap-2">
                                      {getCategoryIcon(category.value)}
                                      {category.label}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={createForm.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Status</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value} data-testid="select-initiative-status">
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="identify_need">Identify Need to Change</SelectItem>
                                <SelectItem value="identify_stakeholders">Identify Stakeholders</SelectItem>
                                <SelectItem value="develop_change">Develop the Change</SelectItem>
                                <SelectItem value="implement_change">Implement the Change</SelectItem>
                                <SelectItem value="reinforce_change">Reinforce the Change</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={createForm.control}
                        name="progress"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Progress (%)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                placeholder="0"
                                {...field}
                                value={field.value || 0}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                data-testid="input-initiative-progress"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Start Date</label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !startDate && "text-muted-foreground"
                              )}
                              data-testid="button-start-date"
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {startDate ? format(startDate, "PPP") : "Pick a date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={startDate}
                              onSelect={setStartDate}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">End Date</label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !endDate && "text-muted-foreground"
                              )}
                              data-testid="button-end-date"
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {endDate ? format(endDate, "PPP") : "Pick a date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={endDate}
                              onSelect={setEndDate}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="objectives" className="space-y-4">
                    <div className="grid grid-cols-1 gap-6">
                      <FormField
                        control={createForm.control}
                        name="objectives"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Objectives & Goals</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Define clear, measurable objectives for this initiative..."
                                className="h-24"
                                {...field} 
                                value={field.value || ""} 
                                data-testid="input-initiative-objectives" 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={createForm.control}
                        name="scope"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Project Scope</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Define what is included and excluded from this initiative..."
                                className="h-24"
                                {...field} 
                                value={field.value || ""} 
                                data-testid="input-initiative-scope" 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={createForm.control}
                        name="successCriteria"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Success Criteria & KPIs</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Define measurable success criteria and key performance indicators..."
                                className="h-20"
                                {...field} 
                                value={field.value || ""} 
                                data-testid="input-initiative-success-criteria" 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {/* Deliverables Section */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium">Key Deliverables</label>
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm" 
                            onClick={addDeliverable}
                            data-testid="button-add-deliverable"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Deliverable
                          </Button>
                        </div>
                        {deliverables.map((deliverable, index) => (
                          <div key={deliverable.id} className="p-4 border rounded-lg space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium">Deliverable {index + 1}</h4>
                              <Button 
                                type="button" 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => removeDeliverable(deliverable.id)}
                                data-testid={`button-remove-deliverable-${index}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <label className="text-sm font-medium">Title</label>
                                <Input 
                                  placeholder="Deliverable title"
                                  value={deliverable.title}
                                  onChange={(e) => updateDeliverable(deliverable.id, "title", e.target.value)}
                                  data-testid={`input-deliverable-title-${index}`}
                                />
                              </div>
                              <div>
                                <label className="text-sm font-medium">Target Date</label>
                                <Input 
                                  type="date"
                                  value={deliverable.targetDate}
                                  onChange={(e) => updateDeliverable(deliverable.id, "targetDate", e.target.value)}
                                  data-testid={`input-deliverable-date-${index}`}
                                />
                              </div>
                            </div>
                            <div>
                              <label className="text-sm font-medium">Description</label>
                              <Textarea 
                                placeholder="Describe this deliverable..."
                                className="h-16"
                                value={deliverable.description}
                                onChange={(e) => updateDeliverable(deliverable.id, "description", e.target.value)}
                                data-testid={`input-deliverable-description-${index}`}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="planning" className="space-y-4">
                    <div className="grid grid-cols-1 gap-6">
                      <FormField
                        control={createForm.control}
                        name="budget"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Budget ($)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="100000"
                                {...field}
                                value={field.value || ""}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                                data-testid="input-initiative-budget"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={createForm.control}
                        name="stakeholderRequirements"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Stakeholder Requirements</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Define key stakeholder needs and requirements..."
                                className="h-24"
                                {...field} 
                                value={field.value || ""} 
                                data-testid="input-initiative-stakeholder-requirements" 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={createForm.control}
                        name="businessJustification"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Business Justification</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Explain the business case and expected benefits..."
                                className="h-24"
                                {...field} 
                                value={field.value || ""} 
                                data-testid="input-initiative-business-justification" 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="risk" className="space-y-4">
                    <div className="grid grid-cols-1 gap-6">
                      <FormField
                        control={createForm.control}
                        name="assumptions"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Key Assumptions</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="List key assumptions for this initiative..."
                                className="h-20"
                                {...field} 
                                value={field.value || ""} 
                                data-testid="input-initiative-assumptions" 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={createForm.control}
                        name="constraints"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Constraints & Limitations</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Identify constraints and limitations..."
                                className="h-20"
                                {...field} 
                                value={field.value || ""} 
                                data-testid="input-initiative-constraints" 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={createForm.control}
                        name="risks"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Initial Risk Assessment</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Identify initial risks and mitigation strategies..."
                                className="h-20"
                                {...field} 
                                value={field.value || ""} 
                                data-testid="input-initiative-risks" 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </TabsContent>
                </Tabs>
                
                <div className="flex justify-between">
                  <div className="flex space-x-2">
                    {currentTab !== "basic" && (
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          const tabs = ["basic", "objectives", "planning", "risk"];
                          const currentIndex = tabs.indexOf(currentTab);
                          if (currentIndex > 0) handleTabChange(tabs[currentIndex - 1]);
                        }}
                        data-testid="button-previous-tab"
                      >
                        Previous
                      </Button>
                    )}
                    {currentTab !== "risk" && (
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          const tabs = ["basic", "objectives", "planning", "risk"];
                          const currentIndex = tabs.indexOf(currentTab);
                          if (currentIndex < tabs.length - 1) handleTabChange(tabs[currentIndex + 1]);
                        }}
                        data-testid="button-next-tab"
                      >
                        Next
                      </Button>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        setIsCreateDialogOpen(false);
                        resetCreateForm();
                      }}
                      data-testid="button-cancel-create"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createInitiativeMutation.isPending}
                      data-testid="button-submit-create"
                    >
                      {createInitiativeMutation.isPending ? "Creating..." : "Create Initiative"}
                    </Button>
                  </div>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Enhanced Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Initiatives</p>
                <p className="text-2xl font-bold text-foreground" data-testid="metric-total-initiatives">
                  {totalInitiatives}
                </p>
              </div>
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Briefcase className="text-primary w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-foreground" data-testid="metric-active-initiatives">
                  {activeInitiatives}
                </p>
              </div>
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                <Target className="text-blue-600 dark:text-blue-400 w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">High Priority</p>
                <p className="text-2xl font-bold text-foreground" data-testid="metric-high-priority">
                  {highPriorityInitiatives}
                </p>
              </div>
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
                <AlertCircle className="text-red-600 dark:text-red-400 w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Budget</p>
                <p className="text-lg font-bold text-foreground" data-testid="metric-total-budget">
                  {formatCurrency(totalBudget)}
                </p>
              </div>
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                <DollarSign className="text-green-600 dark:text-green-400 w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg. Progress</p>
                <p className="text-2xl font-bold text-foreground" data-testid="metric-avg-progress">
                  {averageProgress}%
                </p>
              </div>
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="text-purple-600 dark:text-purple-400 w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Filtering and Search */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Initiatives
              <Badge variant="outline" className="ml-2" data-testid="initiatives-count">
                {filteredAndSortedInitiatives.length}
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" data-testid="button-sort">
                    <ArrowUpDown className="w-4 h-4 mr-2" />
                    Sort: {sortBy}
                    {sortOrder === "desc" && " ↓"}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {[
                    { value: "name", label: "Name" },
                    { value: "priority", label: "Priority" },
                    { value: "category", label: "Category" },
                    { value: "budget", label: "Budget" },
                    { value: "progress", label: "Progress" },
                    { value: "startDate", label: "Start Date" },
                    { value: "endDate", label: "End Date" }
                  ].map((option) => (
                    <DropdownMenuItem
                      key={option.value}
                      onClick={() => handleSortChange(option.value)}
                      data-testid={`sort-${option.value}`}
                    >
                      {option.label}
                      {sortBy === option.value && (
                        <span className="ml-auto">
                          {sortOrder === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              {hasActiveFilters && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearAllFilters}
                  data-testid="button-clear-filters"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search initiatives, objectives, scope, business justification..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-initiatives"
              />
            </div>
            
            {/* Filters */}
            <div className="flex flex-wrap gap-3">
              <Select value={selectedStatus} onValueChange={setSelectedStatus} data-testid="select-filter-status">
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="identify_need">Identify Need to Change</SelectItem>
                  <SelectItem value="identify_stakeholders">Identify Stakeholders</SelectItem>
                  <SelectItem value="develop_change">Develop the Change</SelectItem>
                  <SelectItem value="implement_change">Implement the Change</SelectItem>
                  <SelectItem value="reinforce_change">Reinforce the Change</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" data-testid="button-filter-priority">
                    <Filter className="w-4 h-4 mr-2" />
                    Priority
                    {selectedPriorities.length > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {selectedPriorities.length}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {PRIORITY_OPTIONS.map((priority) => (
                    <DropdownMenuItem
                      key={priority.value}
                      onClick={() => togglePriorityFilter(priority.value)}
                      data-testid={`filter-priority-${priority.value}`}
                    >
                      <div className="flex items-center gap-2">
                        {getPriorityIcon(priority.value)}
                        {priority.label}
                        {selectedPriorities.includes(priority.value) && (
                          <CheckCircle className="w-4 h-4 ml-auto text-green-600" />
                        )}
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" data-testid="button-filter-category">
                    <Filter className="w-4 h-4 mr-2" />
                    Category
                    {selectedCategories.length > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {selectedCategories.length}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {CATEGORY_OPTIONS.map((category) => (
                    <DropdownMenuItem
                      key={category.value}
                      onClick={() => toggleCategoryFilter(category.value)}
                      data-testid={`filter-category-${category.value}`}
                    >
                      <div className="flex items-center gap-2">
                        {getCategoryIcon(category.value)}
                        {category.label}
                        {selectedCategories.includes(category.value) && (
                          <CheckCircle className="w-4 h-4 ml-auto text-green-600" />
                        )}
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          
          {/* Initiatives List */}
          {initiativesLoading ? (
            <div className="text-center py-8">Loading initiatives...</div>
          ) : (
            <Table data-testid="table-initiatives">
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Assignments</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedInitiatives.map((initiative) => (
                  <TableRow key={initiative.id} data-testid={`row-initiative-${initiative.id}`}>
                    <TableCell className="font-medium">
                      <div className="space-y-2">
                        <div className="font-semibold">{initiative.name}</div>
                        {initiative.description && (
                          <div className="text-sm text-muted-foreground truncate max-w-xs">
                            {initiative.description}
                          </div>
                        )}
                        <div className="flex flex-wrap gap-1">
                          {initiative.priority && (
                            <div className="flex items-center gap-1">
                              {getPriorityIcon(initiative.priority)}
                              <Badge variant={getPriorityBadgeVariant(initiative.priority)} className="text-xs">
                                {initiative.priority}
                              </Badge>
                            </div>
                          )}
                          {initiative.category && (
                            <div className="flex items-center gap-1">
                              {getCategoryIcon(initiative.category)}
                              <Badge variant="outline" className="text-xs">
                                {CATEGORY_OPTIONS.find(c => c.value === initiative.category)?.label || initiative.category}
                              </Badge>
                            </div>
                          )}
                          {initiative.budget && (
                            <Badge variant="outline" className="text-xs text-green-700">
                              <DollarSign className="w-3 h-3 mr-1" />
                              {formatCurrency(initiative.budget)}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(initiative.status)} className="flex items-center gap-1 w-fit">
                        {getStatusIcon(initiative.status)}
                        {initiative.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Progress value={initiative.progress || 0} className="h-2 w-16" />
                        <span className="text-sm text-muted-foreground min-w-[3rem]">
                          {initiative.progress || 0}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(initiative.startDate)}</TableCell>
                    <TableCell>{formatDate(initiative.endDate)}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{initiative.assignments?.length || 0}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0" data-testid={`button-actions-${initiative.id}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleStartCopyInitiative(initiative)} data-testid={`button-copy-${initiative.id}`}>
                            <Copy className="mr-2 h-4 w-4" />
                            Copy Initiative
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditInitiative(initiative)} data-testid={`button-edit-${initiative.id}`}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleManageAssignments(initiative)} data-testid={`button-assignments-${initiative.id}`}>
                            <UserPlus className="mr-2 h-4 w-4" />
                            Manage Assignments
                          </DropdownMenuItem>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()} data-testid={`button-delete-${initiative.id}`}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Initiative</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{initiative.name}"? This action cannot be undone and will remove all associated tasks and assignments.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteInitiative(initiative.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                  data-testid="button-confirm-delete"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredAndSortedInitiatives.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No initiatives found matching your criteria.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Copy Initiative Dialog */}
      <Dialog open={isCopyDialogOpen} onOpenChange={setIsCopyDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Copy Initiative</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Create a copy of "{copyingInitiative?.name}"
            </p>
          </DialogHeader>
          <Form {...copyForm}>
            <form onSubmit={copyForm.handleSubmit(handleCopyInitiative)} className="space-y-4">
              <FormField
                control={copyForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Initiative Name</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-copy-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="space-y-3">
                <FormField
                  control={copyForm.control}
                  name="copyAssignments"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          data-testid="checkbox-copy-assignments"
                          className="rounded border border-input"
                        />
                      </FormControl>
                      <FormLabel className="text-sm font-normal">
                        Copy user assignments
                      </FormLabel>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={copyForm.control}
                  name="copyTasks"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          data-testid="checkbox-copy-tasks"
                          className="rounded border border-input"
                        />
                      </FormControl>
                      <FormLabel className="text-sm font-normal">
                        Copy tasks and milestones
                      </FormLabel>
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">New Start Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !copyStartDate && "text-muted-foreground"
                        )}
                        data-testid="button-copy-start-date"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {copyStartDate ? format(copyStartDate, "PPP") : "Optional"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={copyStartDate}
                        onSelect={setCopyStartDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">New End Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !copyEndDate && "text-muted-foreground"
                        )}
                        data-testid="button-copy-end-date"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {copyEndDate ? format(copyEndDate, "PPP") : "Optional"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={copyEndDate}
                        onSelect={setCopyEndDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsCopyDialogOpen(false)}
                  data-testid="button-cancel-copy"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={copyInitiativeMutation.isPending}
                  data-testid="button-submit-copy"
                >
                  {copyInitiativeMutation.isPending ? "Copying..." : "Copy Initiative"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Enhanced Edit Initiative Dialog */}
      <Dialog open={!!editingInitiative} onOpenChange={() => setEditingInitiative(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Initiative</DialogTitle>
            <p className="text-sm text-muted-foreground">Update initiative details and project charter information</p>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleUpdateInitiative)} className="space-y-6">
              <Tabs value={editCurrentTab} onValueChange={handleEditTabChange} className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="basic" data-testid="edit-tab-basic">
                    <Target className="w-4 h-4 mr-2" />
                    Basic Info
                  </TabsTrigger>
                  <TabsTrigger value="objectives" data-testid="edit-tab-objectives">
                    <Briefcase className="w-4 h-4 mr-2" />
                    Objectives & Scope
                  </TabsTrigger>
                  <TabsTrigger value="planning" data-testid="edit-tab-planning">
                    <DollarSign className="w-4 h-4 mr-2" />
                    Planning & Resources
                  </TabsTrigger>
                  <TabsTrigger value="risk" data-testid="edit-tab-risk">
                    <Shield className="w-4 h-4 mr-2" />
                    Risk & Constraints
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="basic" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={editForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Initiative Name *</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-edit-initiative-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea 
                              className="h-20"
                              {...field} 
                              data-testid="input-edit-initiative-description" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="priority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Priority *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} data-testid="select-edit-initiative-priority">
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select priority" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {PRIORITY_OPTIONS.map((priority) => (
                                <SelectItem key={priority.value} value={priority.value}>
                                  <div className="flex items-center gap-2">
                                    {getPriorityIcon(priority.value)}
                                    {priority.label}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""} data-testid="select-edit-initiative-category">
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {CATEGORY_OPTIONS.map((category) => (
                                <SelectItem key={category.value} value={category.value}>
                                  <div className="flex items-center gap-2">
                                    {getCategoryIcon(category.value)}
                                    {category.label}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} data-testid="select-edit-initiative-status">
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="identify_need">Identify Need to Change</SelectItem>
                              <SelectItem value="identify_stakeholders">Identify Stakeholders</SelectItem>
                              <SelectItem value="develop_change">Develop the Change</SelectItem>
                              <SelectItem value="implement_change">Implement the Change</SelectItem>
                              <SelectItem value="reinforce_change">Reinforce the Change</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="progress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Progress (%)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              data-testid="input-edit-initiative-progress"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Start Date</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !editStartDate && "text-muted-foreground"
                            )}
                            data-testid="button-edit-start-date"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {editStartDate ? format(editStartDate, "PPP") : "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={editStartDate}
                            onSelect={setEditStartDate}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">End Date</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !editEndDate && "text-muted-foreground"
                            )}
                            data-testid="button-edit-end-date"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {editEndDate ? format(editEndDate, "PPP") : "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={editEndDate}
                            onSelect={setEditEndDate}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="objectives" className="space-y-4">
                  <div className="grid grid-cols-1 gap-6">
                    <FormField
                      control={editForm.control}
                      name="objectives"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Objectives & Goals</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Define clear, measurable objectives for this initiative..."
                              className="h-24"
                              {...field} 
                              data-testid="input-edit-initiative-objectives" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="scope"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Project Scope</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Define what is included and excluded from this initiative..."
                              className="h-24"
                              {...field} 
                              data-testid="input-edit-initiative-scope" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="successCriteria"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Success Criteria & KPIs</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Define measurable success criteria and key performance indicators..."
                              className="h-20"
                              {...field} 
                              data-testid="input-edit-initiative-success-criteria" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {/* Edit Deliverables Section */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">Key Deliverables</label>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm" 
                          onClick={addEditDeliverable}
                          data-testid="button-add-edit-deliverable"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Deliverable
                        </Button>
                      </div>
                      {editDeliverables.map((deliverable, index) => (
                        <div key={deliverable.id} className="p-4 border rounded-lg space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">Deliverable {index + 1}</h4>
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => removeEditDeliverable(deliverable.id)}
                              data-testid={`button-remove-edit-deliverable-${index}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="text-sm font-medium">Title</label>
                              <Input 
                                placeholder="Deliverable title"
                                value={deliverable.title}
                                onChange={(e) => updateEditDeliverable(deliverable.id, "title", e.target.value)}
                                data-testid={`input-edit-deliverable-title-${index}`}
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium">Target Date</label>
                              <Input 
                                type="date"
                                value={deliverable.targetDate}
                                onChange={(e) => updateEditDeliverable(deliverable.id, "targetDate", e.target.value)}
                                data-testid={`input-edit-deliverable-date-${index}`}
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-sm font-medium">Description</label>
                            <Textarea 
                              placeholder="Describe this deliverable..."
                              className="h-16"
                              value={deliverable.description}
                              onChange={(e) => updateEditDeliverable(deliverable.id, "description", e.target.value)}
                              data-testid={`input-edit-deliverable-description-${index}`}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="planning" className="space-y-4">
                  <div className="grid grid-cols-1 gap-6">
                    <FormField
                      control={editForm.control}
                      name="budget"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Budget ($)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="100000"
                              {...field}
                              value={field.value || ""}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                              data-testid="input-edit-initiative-budget"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="stakeholderRequirements"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Stakeholder Requirements</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Define key stakeholder needs and requirements..."
                              className="h-24"
                              {...field} 
                              data-testid="input-edit-initiative-stakeholder-requirements" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="businessJustification"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Business Justification</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Explain the business case and expected benefits..."
                              className="h-24"
                              {...field} 
                              data-testid="input-edit-initiative-business-justification" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value="risk" className="space-y-4">
                  <div className="grid grid-cols-1 gap-6">
                    <FormField
                      control={editForm.control}
                      name="assumptions"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Key Assumptions</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="List key assumptions for this initiative..."
                              className="h-20"
                              {...field} 
                              data-testid="input-edit-initiative-assumptions" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="constraints"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Constraints & Limitations</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Identify constraints and limitations..."
                              className="h-20"
                              {...field} 
                              data-testid="input-edit-initiative-constraints" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="risks"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Initial Risk Assessment</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Identify initial risks and mitigation strategies..."
                              className="h-20"
                              {...field} 
                              data-testid="input-edit-initiative-risks" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>
              </Tabs>
              
              <div className="flex justify-between">
                <div className="flex space-x-2">
                  {editCurrentTab !== "basic" && (
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        const tabs = ["basic", "objectives", "planning", "risk"];
                        const currentIndex = tabs.indexOf(editCurrentTab);
                        if (currentIndex > 0) handleEditTabChange(tabs[currentIndex - 1]);
                      }}
                      data-testid="button-edit-previous-tab"
                    >
                      Previous
                    </Button>
                  )}
                  {editCurrentTab !== "risk" && (
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        const tabs = ["basic", "objectives", "planning", "risk"];
                        const currentIndex = tabs.indexOf(editCurrentTab);
                        if (currentIndex < tabs.length - 1) handleEditTabChange(tabs[currentIndex + 1]);
                      }}
                      data-testid="button-edit-next-tab"
                    >
                      Next
                    </Button>
                  )}
                </div>
                <div className="flex space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setEditingInitiative(null)}
                    data-testid="button-cancel-edit"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={updateInitiativeMutation.isPending}
                    data-testid="button-submit-edit"
                  >
                    {updateInitiativeMutation.isPending ? "Updating..." : "Update Initiative"}
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Assignment Management Dialog */}
      <Dialog open={!!managingAssignments} onOpenChange={() => setManagingAssignments(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Manage Assignments - {managingAssignments?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Current Assignments</h3>
              <Dialog open={isAssignUserDialogOpen} onOpenChange={setIsAssignUserDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-assign-user">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Assign User
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Assign User to Initiative</DialogTitle>
                  </DialogHeader>
                  <Form {...assignForm}>
                    <form onSubmit={assignForm.handleSubmit(handleAssignUser)} className="space-y-4">
                      <FormField
                        control={assignForm.control}
                        name="userId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>User</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} data-testid="select-assign-user">
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a user" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {usersWithRoles.filter(user => 
                                  !assignments.some(assignment => assignment.user.id === user.id)
                                ).map((user) => (
                                  <SelectItem key={user.id} value={user.id}>
                                    {user.name} ({user.role?.name})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={assignForm.control}
                        name="role"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Initiative Role</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} data-testid="select-assign-role">
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Change Owner">Change Owner</SelectItem>
                                <SelectItem value="Change Champion">Change Champion</SelectItem>
                                <SelectItem value="Change Agent">Change Agent</SelectItem>
                                <SelectItem value="Member">Member</SelectItem>
                                <SelectItem value="Observer">Observer</SelectItem>
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
                          onClick={() => setIsAssignUserDialogOpen(false)}
                          data-testid="button-cancel-assign"
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="submit" 
                          disabled={assignUserMutation.isPending}
                          data-testid="button-submit-assign"
                        >
                          {assignUserMutation.isPending ? "Assigning..." : "Assign User"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
            
            <Table data-testid="table-assignments">
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>System Role</TableHead>
                  <TableHead>Initiative Role</TableHead>
                  <TableHead>Assigned Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((assignment) => (
                  <TableRow key={assignment.id} data-testid={`row-assignment-${assignment.id}`}>
                    <TableCell className="font-medium">{assignment.user.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">User Role</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="default">{assignment.role}</Badge>
                    </TableCell>
                    <TableCell>{format(new Date(assignment.assignedAt), "MMM dd, yyyy")}</TableCell>
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            data-testid={`button-remove-assignment-${assignment.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove Assignment</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to remove {assignment.user.name} from this initiative?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleRemoveAssignment(assignment.user.id, assignment.projectId)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
                {assignments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No users assigned to this initiative.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function InitiativeManagement() {
  const { canAccessInitiativeManagement } = usePermissions();
  
  return (
    <RouteGuard customCheck={canAccessInitiativeManagement}>
      <InitiativeManagementContent />
    </RouteGuard>
  );
}