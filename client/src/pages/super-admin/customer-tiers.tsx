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
  // Core Application Features (connected to actual functionality)
  communications: { name: "Communications", description: "Communication management and planning tools", type: "boolean" },
  reports: { name: "Reporting", description: "Advanced reports and analytics dashboard", type: "boolean" },
  gptCoach: { name: "GPT Integration", description: "AI-powered coaching and insights", type: "boolean" },
  readinessSurveys: { name: "Surveys", description: "Survey creation and response management", type: "boolean" },
  changeArtifacts: { name: "Change Artifacts", description: "Change artifact management", type: "boolean" },
  // Enterprise Features (advanced tier features)
  hasAdvancedReporting: { name: "Advanced Reporting", description: "Access to advanced reports and analytics", type: "boolean" },
  hasAPIAccess: { name: "API Access", description: "REST API access for integrations", type: "boolean" },
  hasCustomBranding: { name: "Custom Branding", description: "Customize logos, colors, and themes", type: "boolean" },
  hasSSO: { name: "Single Sign-On", description: "SAML/OAuth SSO integration", type: "boolean" },
  hasPrioritySupport: { name: "Priority Support", description: "24/7 priority customer support", type: "boolean" },
  hasAdvancedSecurity: { name: "Advanced Security", description: "Enhanced security features and compliance", type: "boolean" },
  hasWorkflowAutomation: { name: "Workflow Automation", description: "Automated workflows and triggers", type: "boolean" },
  hasDataExport: { name: "Data Export", description: "Export data in various formats", type: "boolean" },
  hasAuditLogs: { name: "Audit Logs", description: "Detailed activity and audit logging", type: "boolean" },
} as const;

// Plan schema for form validation - matches database structure
const planSchema = z.object({
  name: z.string().min(1, "Plan name is required"),
  description: z.string().optional(),
  seatLimit: z.number().min(1, "Seat limit must be at least 1"),
  pricePerSeatCents: z.number().min(0, "Price must be positive"),
  features: z.object({
    // Core Application Features (connected to actual functionality)
    communications: z.boolean().default(false),
    reports: z.boolean().default(false),
    gptCoach: z.boolean().default(false),
    readinessSurveys: z.boolean().default(false),
    changeArtifacts: z.boolean().default(false),
    // Enterprise Features (advanced tier features)
    hasAdvancedReporting: z.boolean().default(false),
    hasAPIAccess: z.boolean().default(false),
    hasCustomBranding: z.boolean().default(false),
    hasSSO: z.boolean().default(false),
    hasPrioritySupport: z.boolean().default(false),
    hasAdvancedSecurity: z.boolean().default(false),
    hasWorkflowAutomation: z.boolean().default(false),
    hasDataExport: z.boolean().default(false),
    hasAuditLogs: z.boolean().default(false),
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
  isActive: boolean;
  features: {
    // Core Application Features
    communications: boolean;
    reports: boolean;
    gptCoach: boolean;
    readinessSurveys: boolean;
    changeArtifacts: boolean;
    // Enterprise Features
    hasAdvancedReporting: boolean;
    hasAPIAccess: boolean;
    hasCustomBranding: boolean;
    hasSSO: boolean;
    hasPrioritySupport: boolean;
    hasAdvancedSecurity: boolean;
    hasWorkflowAutomation: boolean;
    hasDataExport: boolean;
    hasAuditLogs: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export default function SuperAdminCustomerTiers() {
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const { sessionId } = useSuperAdmin();
  const { toast } = useToast();

  // Fetch plans
  const { data: plans = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/super-admin/plans"],
    queryFn: async () => {
      const response = await fetch("/api/super-admin/plans", {
        headers: {
          "x-super-admin-session": sessionId!,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch plans");
      return response.json() as Promise<Plan[]>;
    },
    enabled: !!sessionId,
  });

  // Create plan mutation
  const createPlanMutation = useMutation({
    mutationFn: async (data: PlanFormData) => {
      const response = await fetch("/api/super-admin/plans", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-super-admin-session": sessionId!,
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create plan");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/plans"] });
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
      const response = await fetch(`/api/super-admin/plans/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-super-admin-session": sessionId!,
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update plan");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/plans"] });
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
      const response = await fetch(`/api/super-admin/plans/${id}`, {
        method: "DELETE",
        headers: {
          "x-super-admin-session": sessionId!,
        },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete plan");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/plans"] });
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
      price: 0,
      billingInterval: "monthly",
      currency: "USD",
      stripeProductId: "",
      stripePriceId: "",
      isActive: true,
      isPopular: false,
      features: {
        maxProjects: 10,
        maxUsers: 5,
        maxStorage: 10,
        hasAdvancedReporting: false,
        hasAPIAccess: false,
        hasCustomBranding: false,
        hasSSO: false,
        hasPrioritySupport: false,
        hasAdvancedSecurity: false,
        hasWorkflowAutomation: false,
        hasDataExport: false,
        hasAuditLogs: false,
      },
    },
  });

  const editForm = useForm<PlanFormData>({
    resolver: zodResolver(planSchema),
    defaultValues: {
      name: "",
      description: "",
      price: 0,
      billingInterval: "monthly",
      currency: "USD",
      stripeProductId: "",
      stripePriceId: "",
      isActive: true,
      isPopular: false,
      features: {
        maxProjects: 10,
        maxUsers: 5,
        maxStorage: 10,
        hasAdvancedReporting: false,
        hasAPIAccess: false,
        hasCustomBranding: false,
        hasSSO: false,
        hasPrioritySupport: false,
        hasAdvancedSecurity: false,
        hasWorkflowAutomation: false,
        hasDataExport: false,
        hasAuditLogs: false,
      },
    },
  });

  const handleEditPlan = (plan: Plan) => {
    setSelectedPlan(plan);
    editForm.reset({
      name: plan.name,
      description: plan.description || "",
      price: plan.price,
      billingInterval: plan.billingInterval as "monthly" | "yearly",
      currency: plan.currency,
      stripeProductId: plan.stripeProductId || "",
      stripePriceId: plan.stripePriceId || "",
      isActive: plan.isActive,
      isPopular: plan.isPopular,
      features: plan.features,
    });
    setIsEditDialogOpen(true);
  };

  const handleDeletePlan = (id: string) => {
    if (confirm("Are you sure you want to delete this customer tier? This action cannot be undone.")) {
      deletePlanMutation.mutate(id);
    }
  };

  const renderPlanCard = (plan: Plan) => (
    <Card key={plan.id} className={`relative ${plan.isPopular ? 'ring-2 ring-blue-500' : ''}`}>
      {plan.isPopular && (
        <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
          <Badge className="bg-blue-500 text-white px-3">
            <Star className="h-3 w-3 mr-1" />
            Popular
          </Badge>
        </div>
      )}
      
      <CardHeader className="text-center pb-4">
        <div className="flex items-center justify-center gap-2 mb-2">
          {plan.name === "Enterprise" && <Crown className="h-5 w-5 text-yellow-500" />}
          {plan.name === "Pro" && <Zap className="h-5 w-5 text-purple-500" />}
          {plan.name === "Basic" && <Package className="h-5 w-5 text-blue-500" />}
          <CardTitle className="text-xl" data-testid={`plan-name-${plan.id}`}>{plan.name}</CardTitle>
        </div>
        
        <div className="flex items-center justify-center gap-1">
          <span className="text-3xl font-bold">${plan.price}</span>
          <span className="text-muted-foreground">/{plan.billingInterval}</span>
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
            {plan.organizationCount} orgs
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Key Features */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Max Projects</span>
            <span className="font-medium">{plan.features.maxProjects}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>Max Users</span>
            <span className="font-medium">{plan.features.maxUsers}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>Storage</span>
            <span className="font-medium">{plan.features.maxStorage} GB</span>
          </div>
        </div>
        
        {/* Feature Toggles */}
        <div className="space-y-1 pt-2 border-t">
          {Object.entries(FEATURE_DEFINITIONS).map(([key, feature]) => {
            if (feature.type === "boolean") {
              const hasFeature = plan.features[key as keyof typeof plan.features] as boolean;
              return (
                <div key={key} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{feature.name}</span>
                  {hasFeature ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <X className="h-4 w-4 text-gray-400" />
                  )}
                </div>
              );
            }
            return null;
          })}
        </div>
        
        {/* Stripe Integration */}
        {plan.stripeProductId && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              Stripe Product: {plan.stripeProductId}
            </p>
            {plan.stripePriceId && (
              <p className="text-xs text-muted-foreground">
                Price: {plan.stripePriceId}
              </p>
            )}
          </div>
        )}
        
        {/* Actions */}
        <div className="flex gap-2 pt-2">
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
                    <div className="grid grid-cols-2 gap-4">
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
                        name="currency"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Currency</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-currency">
                                  <SelectValue placeholder="Select currency" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="USD">USD</SelectItem>
                                <SelectItem value="EUR">EUR</SelectItem>
                                <SelectItem value="GBP">GBP</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

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
                      
                      <FormField
                        control={createForm.control}
                        name="isPopular"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Popular Plan</FormLabel>
                              <div className="text-sm text-muted-foreground">
                                Show "Popular" badge
                              </div>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="switch-plan-popular"
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
                        name="price"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Price</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                type="number" 
                                min="0" 
                                step="0.01"
                                onChange={e => field.onChange(Number(e.target.value))}
                                data-testid="input-plan-price"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={createForm.control}
                        name="billingInterval"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Billing Interval</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-billing-interval">
                                  <SelectValue placeholder="Select interval" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="monthly">Monthly</SelectItem>
                                <SelectItem value="yearly">Yearly</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={createForm.control}
                        name="stripeProductId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Stripe Product ID</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="prod_..." data-testid="input-stripe-product-id" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={createForm.control}
                        name="stripePriceId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Stripe Price ID</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="price_..." data-testid="input-stripe-price-id" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="features" className="space-y-4">
                    {/* Numeric Features */}
                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={createForm.control}
                        name="features.maxProjects"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Max Projects</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                type="number" 
                                min="0"
                                onChange={e => field.onChange(Number(e.target.value))}
                                data-testid="input-max-projects"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={createForm.control}
                        name="features.maxUsers"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Max Users</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                type="number" 
                                min="1"
                                onChange={e => field.onChange(Number(e.target.value))}
                                data-testid="input-max-users"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={createForm.control}
                        name="features.maxStorage"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Max Storage (GB)</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                type="number" 
                                min="0"
                                onChange={e => field.onChange(Number(e.target.value))}
                                data-testid="input-max-storage"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Boolean Features */}
                    <div className="grid grid-cols-2 gap-4">
                      {Object.entries(FEATURE_DEFINITIONS).map(([key, feature]) => {
                        if (feature.type === "boolean") {
                          return (
                            <FormField
                              key={key}
                              control={createForm.control}
                              name={`features.${key}` as any}
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                  <div className="space-y-0.5">
                                    <FormLabel className="text-base">{feature.name}</FormLabel>
                                    <div className="text-sm text-muted-foreground">
                                      {feature.description}
                                    </div>
                                  </div>
                                  <FormControl>
                                    <Switch
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                      data-testid={`switch-${key}`}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          );
                        }
                        return null;
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
                            <td className="p-3 font-medium">{feature.name}</td>
                            {plans.map((plan) => (
                              <td key={plan.id} className="text-center p-3">
                                {feature.type === "boolean" ? (
                                  plan.features[key as keyof typeof plan.features] ? (
                                    <Check className="h-4 w-4 text-green-500 mx-auto" />
                                  ) : (
                                    <X className="h-4 w-4 text-gray-400 mx-auto" />
                                  )
                                ) : (
                                  <span className="font-medium">
                                    {plan.features[key as keyof typeof plan.features]}
                                    {key === "maxStorage" && " GB"}
                                  </span>
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
                {/* Similar form structure as create form, but populated with existing data */}
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