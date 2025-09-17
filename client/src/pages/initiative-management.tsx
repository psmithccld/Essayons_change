import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
import { Briefcase, Plus, Target, TrendingUp, Calendar as CalendarIcon, Search, MoreHorizontal, Edit, Trash2, Users, UserPlus, Clock, AlertCircle, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { insertProjectSchema, type Project, type User, type UserInitiativeAssignment, type Role } from "@shared/schema";
import { RouteGuard } from "@/components/auth/RouteGuard";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { usePermissions } from "@/hooks/use-permissions";

// Form validation schemas
const createInitiativeSchema = insertProjectSchema.extend({
  startDate: z.string().optional(),
  endDate: z.string().optional()
});

const editInitiativeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  status: z.enum(["planning", "active", "completed", "cancelled"]),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  progress: z.number().min(0).max(100).optional()
});

const assignUserSchema = z.object({
  userId: z.string().uuid("Please select a user"),
  projectId: z.string().uuid(),
  role: z.enum(["Lead", "Member", "Observer"])
});

type CreateInitiativeFormData = z.infer<typeof createInitiativeSchema>;
type EditInitiativeFormData = z.infer<typeof editInitiativeSchema>;
type AssignUserFormData = z.infer<typeof assignUserSchema>;

// Enhanced project type with assignments
type ProjectWithAssignments = Project & {
  assignments?: UserInitiativeAssignment[];
  owner?: User;
};

function InitiativeManagementContent() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingInitiative, setEditingInitiative] = useState<Project | null>(null);
  const [managingAssignments, setManagingAssignments] = useState<Project | null>(null);
  const [isAssignUserDialogOpen, setIsAssignUserDialogOpen] = useState(false);
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [editStartDate, setEditStartDate] = useState<Date>();
  const [editEndDate, setEditEndDate] = useState<Date>();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch initiatives/projects
  const { data: initiatives = [], isLoading: initiativesLoading } = useQuery<ProjectWithAssignments[]>({
    queryKey: ["/api/projects"],
    refetchInterval: 30000
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
      status: "planning",
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

  // Filter initiatives
  const filteredInitiatives = initiatives.filter((initiative) => {
    const matchesSearch = initiative.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (initiative.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    const matchesStatus = selectedStatus === "all" || initiative.status === selectedStatus;
    
    return matchesSearch && matchesStatus;
  });

  // Calculate metrics
  const totalInitiatives = initiatives.length;
  const activeInitiatives = initiatives.filter(i => i.status === "active").length;
  const completedInitiatives = initiatives.filter(i => i.status === "completed").length;
  const averageProgress = initiatives.length > 0 
    ? Math.round(initiatives.reduce((acc, i) => acc + (i.progress || 0), 0) / initiatives.length)
    : 0;

  const handleCreateInitiative = (data: CreateInitiativeFormData) => {
    createInitiativeMutation.mutate(data);
  };

  const handleEditInitiative = (initiative: Project) => {
    setEditingInitiative(initiative);
    setEditStartDate(initiative.startDate ? new Date(initiative.startDate) : undefined);
    setEditEndDate(initiative.endDate ? new Date(initiative.endDate) : undefined);
    editForm.reset({
      name: initiative.name,
      description: initiative.description || "",
      status: initiative.status as "planning" | "active" | "completed" | "cancelled",
      progress: initiative.progress || 0
    });
  };

  const handleUpdateInitiative = (data: EditInitiativeFormData) => {
    if (!editingInitiative) return;
    updateInitiativeMutation.mutate({ ...data, id: editingInitiative.id });
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

  const formatDate = (dateValue: string | Date | null) => {
    if (!dateValue) return "Not set";
    const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
    return format(date, "MMM dd, yyyy");
  };

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
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Initiative</DialogTitle>
            </DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(handleCreateInitiative)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={createForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Initiative Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Digital Transformation" {...field} data-testid="input-initiative-name" />
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
                          <Textarea placeholder="Describe the initiative objectives..." {...field} value={field.value || ""} data-testid="input-initiative-description" />
                        </FormControl>
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
                            <SelectItem value="planning">Planning</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
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
                <div className="flex justify-end space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsCreateDialogOpen(false)}
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
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Initiatives</p>
                <p className="text-2xl font-bold text-foreground" data-testid="metric-total-initiatives">
                  {totalInitiatives}
                </p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Briefcase className="text-primary w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Initiatives</p>
                <p className="text-2xl font-bold text-foreground" data-testid="metric-active-initiatives">
                  {activeInitiatives}
                </p>
              </div>
              <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center">
                <Target className="text-secondary w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-foreground" data-testid="metric-completed-initiatives">
                  {completedInitiatives}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="text-green-600 w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg. Progress</p>
                <p className="text-2xl font-bold text-foreground" data-testid="metric-avg-progress">
                  {averageProgress}%
                </p>
              </div>
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                <TrendingUp className="text-accent w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Initiatives Table */}
      <Card>
        <CardHeader>
          <CardTitle>Initiatives</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search initiatives..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-initiatives"
              />
            </div>
            <Select value={selectedStatus} onValueChange={setSelectedStatus} data-testid="select-filter-status">
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="planning">Planning</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

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
                {filteredInitiatives.map((initiative) => (
                  <TableRow key={initiative.id} data-testid={`row-initiative-${initiative.id}`}>
                    <TableCell className="font-medium">
                      <div>
                        <div className="font-semibold">{initiative.name}</div>
                        {initiative.description && (
                          <div className="text-sm text-muted-foreground truncate max-w-xs">
                            {initiative.description}
                          </div>
                        )}
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
                {filteredInitiatives.length === 0 && (
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

      {/* Edit Initiative Dialog */}
      <Dialog open={!!editingInitiative} onOpenChange={() => setEditingInitiative(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Initiative</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleUpdateInitiative)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Initiative Name</FormLabel>
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
                        <Textarea {...field} data-testid="input-edit-initiative-description" />
                      </FormControl>
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
                          <SelectItem value="planning">Planning</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
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
              <div className="flex justify-end space-x-2">
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
                                <SelectItem value="Lead">Lead</SelectItem>
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