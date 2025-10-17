import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Package, 
  Plus, 
  Edit, 
  Trash2, 
  Crown, 
  Star,
  Check,
  X,
  DollarSign,
  Users,
  Zap,
  Shield,
  Settings
} from "lucide-react";
import { useSuperAdmin } from "@/contexts/SuperAdminContext";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

// Feature definitions - including core application features
const FEATURE_DEFINITIONS = {
  // Core Application Features (fully implemented)
  communications: { name: "Communications", description: "Communication management and planning tools", implemented: true },
  reports: { name: "Reporting", description: "Advanced reports and analytics dashboard", implemented: true },
  gptCoach: { name: "GPT Integration", description: "AI-powered coaching and insights", implemented: true },
  readinessSurveys: { name: "Surveys", description: "Survey creation and response management", implemented: true },
  changeArtifacts: { name: "Change Artifacts", description: "Change artifact management", implemented: true },
  // Data Management Features (partially implemented)
  dataExport: { name: "Data Export", description: "Export data in PowerPoint and PDF formats", implemented: true },
  auditLogs: { name: "Audit Logs", description: "Basic activity and request logging", implemented: true },
  // Future Features (under construction)
  customBranding: { name: "Custom Branding", description: "Customize logos, colors, and themes", implemented: false, underConstruction: true },
  workflowAutomation: { name: "Workflow Automation", description: "Automated workflows and triggers", implemented: false, underConstruction: true },
} as const;

// Plan schema for form validation - matches database structure
const planSchema = z.object({
  name: z.string().min(1, "Plan name is required"),
  description: z.string().optional(),
  seatLimit: z.number().min(1, "Seat limit must be at least 1"),
  pricePerSeatCents: z.number().min(0, "Price must be positive"),
  maxFileUploadSizeMB: z.number().min(1, "File upload size must be at least 1 MB").default(10),
  storageGB: z.number().min(1, "Storage must be at least 1 GB").default(5),
  features: z.object({
    // Core Application Features (fully implemented)
    communications: z.boolean().default(false),
    reports: z.boolean().default(false),
    gptCoach: z.boolean().default(false),
    readinessSurveys: z.boolean().default(false),
    changeArtifacts: z.boolean().default(false),
    // Data Management Features (partially implemented)
    dataExport: z.boolean().default(false),
    auditLogs: z.boolean().default(false),
    // Future Features (under construction)
    customBranding: z.boolean().default(false),
    workflowAutomation: z.boolean().default(false),
  }),
  isActive: z.boolean().default(true),
});

type PlanFormData = z.infer<typeof planSchema>;

interface Plan {
  id: string;
  name: string;
  description?: string;
  seatLimit: number;
  pricePerSeatCents: number;
  maxFileUploadSizeMB: number;
  storageGB: number;
  isActive: boolean;
  features: {
    // Core Application Features
    communications: boolean;
    reports: boolean;
    gptCoach: boolean;
    readinessSurveys: boolean;
    changeArtifacts: boolean;
    // Data Management Features
    dataExport: boolean;
    auditLogs: boolean;
    // Future Features
    customBranding: boolean;
    workflowAutomation: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export default function SuperAdminCustomerTiers() {
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const { isAuthenticated } = useSuperAdmin();
  const { toast } = useToast();

  // Fetch plans
  const { data: plans = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/super-admin/customer-tiers"],
    queryFn: async () => {
      const response = await fetch("/api/super-admin/customer-tiers", {
        credentials: 'include', // Use cookies for authentication
      });
      if (!response.ok) throw new Error("Failed to fetch customer tiers");
      const result = await response.json();
      return result.tiers as Plan[];
    },
    enabled: isAuthenticated,
  });

  // Create plan mutation
  const createPlanMutation = useMutation({
    mutationFn: async (data: PlanFormData) => {
      const response = await fetch("/api/super-admin/customer-tiers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include', // Use cookies for authentication
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create customer tier");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/customer-tiers"] });
      setIsCreateDialogOpen(false);
      createForm.reset();
      toast({
        title: "Success",
        description: "Customer tier created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update plan mutation
  const updatePlanMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: PlanFormData }) => {
      const response = await fetch(`/api/super-admin/customer-tiers/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include', // Use cookies for authentication
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update customer tier");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/customer-tiers"] });
      setIsEditDialogOpen(false);
      setSelectedPlan(null);
      editForm.reset();
      toast({
        title: "Success",
        description: "Customer tier updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete plan mutation
  const deletePlanMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/super-admin/customer-tiers/${id}`, {
        method: "DELETE",
        credentials: 'include', // Use cookies for authentication
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete customer tier");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/customer-tiers"] });
      toast({
        title: "Success",
        description: "Customer tier deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Forms
  const createForm = useForm<PlanFormData>({
    resolver: zodResolver(planSchema),
    defaultValues: {
      name: "",
      description: "",
      seatLimit: 5,
      pricePerSeatCents: 2500, // $25.00 per seat
      maxFileUploadSizeMB: 10,
      storageGB: 5,
      isActive: true,
      features: {
        // Core Application Features
        communications: false,
        reports: false,
        gptCoach: false,
        readinessSurveys: false,
        changeArtifacts: false,
        // Data Management Features
        dataExport: false,
        auditLogs: false,
        // Future Features
        customBranding: false,
        workflowAutomation: false,
      },
    },
  });

  const editForm = useForm<PlanFormData>({
    resolver: zodResolver(planSchema),
    defaultValues: {
      name: "",
      description: "",
      seatLimit: 5,
      pricePerSeatCents: 2500,
      maxFileUploadSizeMB: 10,
      storageGB: 5,
      isActive: true,
      features: {
        // Core Application Features
        communications: false,
        reports: false,
        gptCoach: false,
        readinessSurveys: false,
        changeArtifacts: false,
        // Data Management Features
        dataExport: false,
        auditLogs: false,
        // Future Features
        customBranding: false,
        workflowAutomation: false,
      },
    },
  });

  const handleEditPlan = (plan: Plan) => {
    setSelectedPlan(plan);
    editForm.reset({
      name: plan.name,
      description: plan.description || "",
      seatLimit: plan.seatLimit,
      pricePerSeatCents: plan.pricePerSeatCents,
      maxFileUploadSizeMB: plan.maxFileUploadSizeMB,
      storageGB: plan.storageGB,
      isActive: plan.isActive,
      features: plan.features,
    });
    setIsEditDialogOpen(true);
  };

  const handleDeletePlan = (id: string) => {
    if (confirm("Are you sure you want to delete this customer tier? This action cannot be undone.")) {
      deletePlanMutation.mutate(id);
    }
  };

  const renderPlanCard = (plan: Plan) => {
    // Calculate price display from cents
    const pricePerSeat = (plan.pricePerSeatCents / 100).toFixed(2);
    
    return (
      <Card key={plan.id} className="relative">
        <CardHeader className="text-center pb-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            {plan.name.toLowerCase().includes("enterprise") && <Crown className="h-5 w-5 text-yellow-500" />}
            {plan.name.toLowerCase().includes("pro") && <Zap className="h-5 w-5 text-purple-500" />}
            {plan.name.toLowerCase().includes("basic") && <Package className="h-5 w-5 text-blue-500" />}
            <CardTitle className="text-xl" data-testid={`plan-name-${plan.id}`}>{plan.name}</CardTitle>
          </div>
          
          <div className="flex items-center justify-center gap-1">
            <span className="text-3xl font-bold">${pricePerSeat}</span>
            <span className="text-muted-foreground">/seat</span>
          </div>
          
          {plan.description && (
            <CardDescription className="mt-2">{plan.description}</CardDescription>
          )}
          
          <div className="flex items-center justify-center gap-2 mt-3">
            <Badge variant={plan.isActive ? "default" : "secondary"}>
              {plan.isActive ? "Active" : "Inactive"}
            </Badge>
            <Badge variant="outline">
              <Users className="h-3 w-3 mr-1" />
              {plan.seatLimit} max seats
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Feature Toggles */}
          <div className="space-y-1">
            {Object.entries(FEATURE_DEFINITIONS).map(([key, feature]) => {
              const hasFeature = plan.features[key as keyof typeof plan.features] as boolean;
              return (
                <div key={key} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {feature.name}
                    {feature.underConstruction && (
                      <Badge variant="outline" className="ml-2 text-xs">Under Construction</Badge>
                    )}
                  </span>
                  {hasFeature ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <X className="h-4 w-4 text-gray-400" />
                  )}
                </div>
              );
            })}
          </div>
          
          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => handleEditPlan(plan)}
              data-testid={`button-edit-plan-${plan.id}`}
            >
              <Edit className="h-3 w-3 mr-1" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDeletePlan(plan.id)}
              className="text-red-600 hover:text-red-700"
              data-testid={`button-delete-plan-${plan.id}`}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Customer Tiers
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage subscription plans and feature configurations
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-tier">
              <Plus className="h-4 w-4 mr-2" />
              Create Tier
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Customer Tier</DialogTitle>
              <DialogDescription>
                Define a new subscription plan with pricing and feature configuration
              </DialogDescription>
            </DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit((data) => createPlanMutation.mutate(data))} className="space-y-6">
                <Tabs defaultValue="basic" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="basic">Basic Info</TabsTrigger>
                    <TabsTrigger value="pricing">Pricing</TabsTrigger>
                    <TabsTrigger value="features">Features</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="basic" className="space-y-4">
                    <FormField
                      control={createForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Plan Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g. Pro, Enterprise" data-testid="input-plan-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={createForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea {...field} placeholder="Plan description..." />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={createForm.control}
                        name="isActive"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Active Plan</FormLabel>
                              <div className="text-sm text-muted-foreground">
                                Available for new subscriptions
                              </div>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="switch-plan-active"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="pricing" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={createForm.control}
                        name="seatLimit"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Seat Limit</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                type="number" 
                                min="1" 
                                onChange={e => field.onChange(Number(e.target.value))}
                                data-testid="input-seat-limit"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={createForm.control}
                        name="pricePerSeatCents"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Price Per Seat (cents)</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                type="number" 
                                min="0"
                                onChange={e => field.onChange(Number(e.target.value))}
                                data-testid="input-price-per-seat-cents"
                                placeholder="e.g. 2500 = $25.00"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={createForm.control}
                        name="maxFileUploadSizeMB"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Max File Upload Size (MB)</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                type="number" 
                                min="1"
                                onChange={e => field.onChange(Number(e.target.value))}
                                data-testid="input-max-file-upload-size"
                                placeholder="e.g. 10"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={createForm.control}
                        name="storageGB"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Storage Limit (GB)</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                type="number" 
                                min="1"
                                onChange={e => field.onChange(Number(e.target.value))}
                                data-testid="input-storage-gb"
                                placeholder="e.g. 5"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="features" className="space-y-4">
                    {/* Boolean Features */}
                    <div className="grid grid-cols-2 gap-4">
                      {Object.entries(FEATURE_DEFINITIONS).map(([key, feature]) => {
                        return (
                          <FormField
                            key={key}
                            control={createForm.control}
                            name={`features.${key}` as any}
                            render={({ field }) => (
                              <FormItem className={`flex flex-row items-center justify-between rounded-lg border p-4 ${feature.underConstruction ? 'opacity-60' : ''}`}>
                                <div className="space-y-0.5">
                                  <FormLabel className="text-base">
                                    {feature.name}
                                    {feature.underConstruction && (
                                      <Badge variant="outline" className="ml-2 text-xs">Under Construction</Badge>
                                    )}
                                  </FormLabel>
                                  <div className="text-sm text-muted-foreground">
                                    {feature.description}
                                  </div>
                                </div>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    disabled={feature.underConstruction}
                                    data-testid={`switch-${key}`}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        );
                      })}
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createPlanMutation.isPending} data-testid="button-submit-create-tier">
                    {createPlanMutation.isPending ? "Creating..." : "Create Tier"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Plans Grid */}
      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview" data-testid="tab-tier-overview">
              <Package className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="features" data-testid="tab-tier-features">
              <Settings className="h-4 w-4 mr-2" />
              Feature Matrix
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            {isLoading ? (
              <p className="text-center py-8 text-muted-foreground">Loading customer tiers...</p>
            ) : plans.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No customer tiers found</p>
                  <p className="text-sm text-muted-foreground mt-1">Create your first subscription plan to get started</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {plans.map(renderPlanCard)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="features">
            <Card>
              <CardHeader>
                <CardTitle>Feature Comparison Matrix</CardTitle>
                <CardDescription>
                  Compare features across all customer tiers
                </CardDescription>
              </CardHeader>
              <CardContent>
                {plans.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-3">Feature</th>
                          {plans.map((plan) => (
                            <th key={plan.id} className="text-center p-3">
                              {plan.name}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(FEATURE_DEFINITIONS).map(([key, feature]) => (
                          <tr key={key} className="border-b">
                            <td className="p-3 font-medium">
                              {feature.name}
                              {feature.underConstruction && (
                                <Badge variant="outline" className="ml-2 text-xs">Under Construction</Badge>
                              )}
                            </td>
                            {plans.map((plan) => (
                              <td key={plan.id} className="text-center p-3">
                                {plan.features[key as keyof typeof plan.features] ? (
                                  <Check className="h-4 w-4 text-green-500 mx-auto" />
                                ) : (
                                  <X className="h-4 w-4 text-gray-400 mx-auto" />
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-center py-8 text-muted-foreground">
                    No plans available for comparison
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Plan Dialog - Similar structure to create but with edit form */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Customer Tier</DialogTitle>
            <DialogDescription>
              Update subscription plan configuration and features
            </DialogDescription>
          </DialogHeader>
          {selectedPlan && (
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit((data) => updatePlanMutation.mutate({ id: selectedPlan.id, data }))} className="space-y-4">
                <Tabs defaultValue="basic" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="basic">Basic Details</TabsTrigger>
                    <TabsTrigger value="features">Features</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="basic" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={editForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Plan Name</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-edit-name" placeholder="e.g. Basic, Pro, Enterprise" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={editForm.control}
                        name="isActive"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Active Plan</FormLabel>
                              <div className="text-sm text-muted-foreground">
                                Available for new subscriptions
                              </div>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="switch-edit-active"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={editForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea {...field} data-testid="textarea-edit-description" placeholder="Brief description of this plan..." />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={editForm.control}
                        name="seatLimit"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Seat Limit</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                type="number" 
                                min="1"
                                onChange={e => field.onChange(Number(e.target.value))}
                                data-testid="input-edit-seat-limit"
                                placeholder="e.g. 10"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={editForm.control}
                        name="pricePerSeatCents"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Price Per Seat (cents)</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                type="number" 
                                min="0"
                                onChange={e => field.onChange(Number(e.target.value))}
                                data-testid="input-edit-price-per-seat-cents"
                                placeholder="e.g. 2500 = $25.00"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={editForm.control}
                        name="maxFileUploadSizeMB"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Max File Upload Size (MB)</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                type="number" 
                                min="1"
                                onChange={e => field.onChange(Number(e.target.value))}
                                data-testid="input-edit-max-file-upload-size"
                                placeholder="e.g. 10"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={editForm.control}
                        name="storageGB"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Storage Limit (GB)</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                type="number" 
                                min="1"
                                onChange={e => field.onChange(Number(e.target.value))}
                                data-testid="input-edit-storage-gb"
                                placeholder="e.g. 5"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="features" className="space-y-4">
                    {/* Boolean Features */}
                    <div className="grid grid-cols-2 gap-4">
                      {Object.entries(FEATURE_DEFINITIONS).map(([key, feature]) => {
                        return (
                          <FormField
                            key={key}
                            control={editForm.control}
                            name={`features.${key}` as any}
                            render={({ field }) => (
                              <FormItem className={`flex flex-row items-center justify-between rounded-lg border p-4 ${feature.underConstruction ? 'opacity-60' : ''}`}>
                                <div className="space-y-0.5">
                                  <FormLabel className="text-base">
                                    {feature.name}
                                    {feature.underConstruction && (
                                      <Badge variant="outline" className="ml-2 text-xs">Under Construction</Badge>
                                    )}
                                  </FormLabel>
                                  <div className="text-sm text-muted-foreground">
                                    {feature.description}
                                  </div>
                                </div>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    disabled={feature.underConstruction}
                                    data-testid={`switch-edit-${key}`}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        );
                      })}
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updatePlanMutation.isPending} data-testid="button-submit-edit-tier">
                    {updatePlanMutation.isPending ? "Updating..." : "Update Tier"}
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}