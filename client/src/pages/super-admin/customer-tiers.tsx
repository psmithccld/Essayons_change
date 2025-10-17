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

// Feature definitions
const FEATURE_DEFINITIONS = {
  communications: { name: "Communications", description: "Communication management and planning tools", type: "boolean" },
  reports: { name: "Reporting", description: "Advanced reports and analytics dashboard", type: "boolean" },
  gptCoach: { name: "GPT Integration", description: "AI-powered coaching and insights", type: "boolean" },
  readinessSurveys: { name: "Surveys", description: "Survey creation and response management", type: "boolean" },
  changeArtifacts: { name: "Change Artifacts", description: "Change artifact management", type: "boolean" },
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

// Customer Tier schema
const tierSchema = z.object({
  name: z.string().min(1, "Tier name is required"),
  description: z.string().optional(),
  seatLimit: z.number().min(1, "Seat limit must be at least 1"),
  pricePerSeatCents: z.number().min(0, "Price must be positive"),
  maxProjects: z.number().min(0, "Max projects must be zero or greater").optional(),
  maxUsers: z.number().min(0, "Max users must be zero or greater").optional(),
  maxStorage: z.number().min(0, "Max storage must be zero or greater").optional(),
  currency: z.string().min(3, "Currency required").max(3, "Currency required").default("USD"),
  billingInterval: z.string().default("month"),
  organizationCount: z.number().optional(),
  stripeProductId: z.string().optional(),
  stripePriceId: z.string().optional(),
  isPopular: z.boolean().default(false),
  features: z.object({
    communications: z.boolean().default(false),
    reports: z.boolean().default(false),
    gptCoach: z.boolean().default(false),
    readinessSurveys: z.boolean().default(false),
    changeArtifacts: z.boolean().default(false),
    hasAdvancedReporting: z.boolean().default(false),
    hasAPIAccess: z.boolean().default(false),
    hasCustomBranding: z.boolean().default(false),
    hasSSO: z.boolean().default(false),
    hasPrioritySupport: z.boolean().default(false),
    hasAdvancedSecurity: z.boolean().default(false),
    hasWorkflowAutomation: z.boolean().default(false),
    hasDataExport: z.boolean().default(false),
    hasAuditLogs: z.boolean().default(false),
    // For legacy support, add numeric features here as well:
    maxProjects: z.number().optional(),
    maxUsers: z.number().optional(),
    maxStorage: z.number().optional(),
  }),
  isActive: z.boolean().default(true),
});

type TierFormData = z.infer<typeof tierSchema>;

interface CustomerTier {
  id: string;
  name: string;
  description?: string;
  seatLimit: number;
  pricePerSeatCents: number;
  maxProjects?: number;
  maxUsers?: number;
  maxStorage?: number;
  currency?: string;
  billingInterval?: string;
  organizationCount?: number;
  stripeProductId?: string;
  stripePriceId?: string;
  isPopular?: boolean;
  isActive: boolean;
  features: {
    communications: boolean;
    reports: boolean;
    gptCoach: boolean;
    readinessSurveys: boolean;
    changeArtifacts: boolean;
    hasAdvancedReporting: boolean;
    hasAPIAccess: boolean;
    hasCustomBranding: boolean;
    hasSSO: boolean;
    hasPrioritySupport: boolean;
    hasAdvancedSecurity: boolean;
    hasWorkflowAutomation: boolean;
    hasDataExport: boolean;
    hasAuditLogs: boolean;
    maxProjects?: number;
    maxUsers?: number;
    maxStorage?: number;
  };
  createdAt: string;
  updatedAt: string;
}

export default function SuperAdminCustomerTiers() {
  const [selectedTier, setSelectedTier] = useState<CustomerTier | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const { isAuthenticated } = useSuperAdmin();
  const { toast } = useToast();

  // Fetch customer tiers
  const { data: tiers = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/super-admin/customer-tiers"],
    queryFn: async () => {
      const response = await fetch("/api/super-admin/customer-tiers", {
        credentials: 'include',
      });
      if (!response.ok) throw new Error("Failed to fetch customer tiers");
      return response.json() as Promise<CustomerTier[]>;
    },
    enabled: isAuthenticated,
  });

  // Create tier mutation
  const createTierMutation = useMutation({
    mutationFn: async (data: TierFormData) => {
      const response = await fetch("/api/super-admin/customer-tiers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create tier");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/customer-tiers"] });
      setIsCreateDialogOpen(false);
      createForm.reset();
      toast({ title: "Success", description: "Customer tier created successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Update tier mutation
  const updateTierMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: TierFormData }) => {
      const response = await fetch(`/api/super-admin/customer-tiers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update tier");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/customer-tiers"] });
      setIsEditDialogOpen(false);
      setSelectedTier(null);
      editForm.reset();
      toast({ title: "Success", description: "Customer tier updated successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Delete tier mutation
  const deleteTierMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/super-admin/customer-tiers/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete tier");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/customer-tiers"] });
      toast({ title: "Success", description: "Customer tier deleted successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Forms
  const createForm = useForm<TierFormData>({
    resolver: zodResolver(tierSchema),
    defaultValues: {
      name: "",
      description: "",
      seatLimit: 5,
      pricePerSeatCents: 2500,
      maxProjects: 0,
      maxUsers: 0,
      maxStorage: 0,
      currency: "USD",
      billingInterval: "month",
      organizationCount: 0,
      stripeProductId: "",
      stripePriceId: "",
      isPopular: false,
      isActive: true,
      features: {
        communications: false,
        reports: false,
        gptCoach: false,
        readinessSurveys: false,
        changeArtifacts: false,
        hasAdvancedReporting: false,
        hasAPIAccess: false,
        hasCustomBranding: false,
        hasSSO: false,
        hasPrioritySupport: false,
        hasAdvancedSecurity: false,
        hasWorkflowAutomation: false,
        hasDataExport: false,
        hasAuditLogs: false,
        maxProjects: 0,
        maxUsers: 0,
        maxStorage: 0,
      },
    },
  });

  const editForm = useForm<TierFormData>({
    resolver: zodResolver(tierSchema),
    defaultValues: {
      name: "",
      description: "",
      seatLimit: 5,
      pricePerSeatCents: 2500,
      maxProjects: 0,
      maxUsers: 0,
      maxStorage: 0,
      currency: "USD",
      billingInterval: "month",
      organizationCount: 0,
      stripeProductId: "",
      stripePriceId: "",
      isPopular: false,
      isActive: true,
      features: {
        communications: false,
        reports: false,
        gptCoach: false,
        readinessSurveys: false,
        changeArtifacts: false,
        hasAdvancedReporting: false,
        hasAPIAccess: false,
        hasCustomBranding: false,
        hasSSO: false,
        hasPrioritySupport: false,
        hasAdvancedSecurity: false,
        hasWorkflowAutomation: false,
        hasDataExport: false,
        hasAuditLogs: false,
        maxProjects: 0,
        maxUsers: 0,
        maxStorage: 0,
      },
    },
  });

  const handleEditTier = (tier: CustomerTier) => {
    setSelectedTier(tier);
    editForm.reset({
      name: tier.name,
      description: tier.description || "",
      seatLimit: tier.seatLimit,
      pricePerSeatCents: tier.pricePerSeatCents,
      maxProjects: tier.maxProjects || 0,
      maxUsers: tier.maxUsers || 0,
      maxStorage: tier.maxStorage || 0,
      currency: tier.currency || "USD",
      billingInterval: tier.billingInterval || "month",
      organizationCount: tier.organizationCount || 0,
      stripeProductId: tier.stripeProductId || "",
      stripePriceId: tier.stripePriceId || "",
      isPopular: !!tier.isPopular,
      isActive: tier.isActive,
      features: tier.features,
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteTier = (id: string) => {
    if (confirm("Are you sure you want to delete this customer tier? This action cannot be undone.")) {
      deleteTierMutation.mutate(id);
    }
  };

  const renderTierCard = (tier: CustomerTier) => (
    <Card key={tier.id} className={`relative ${tier.isPopular ? "ring-2 ring-blue-500" : ""}`}>
      {tier.isPopular && (
        <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
          <Badge className="bg-blue-500 text-white px-3">
            <Star className="h-3 w-3 mr-1" />
            Popular
          </Badge>
        </div>
      )}
      <CardHeader className="text-center pb-4">
        <div className="flex items-center justify-center gap-2 mb-2">
          {tier.name === "Enterprise" && <Crown className="h-5 w-5 text-yellow-500" />}
          {tier.name === "Pro" && <Zap className="h-5 w-5 text-purple-500" />}
          {tier.name === "Basic" && <Package className="h-5 w-5 text-blue-500" />}
          <CardTitle className="text-xl" data-testid={`tier-name-${tier.id}`}>{tier.name}</CardTitle>
        </div>
        <div className="flex items-center justify-center gap-1">
          <span className="text-3xl font-bold">${(tier.pricePerSeatCents / 100).toFixed(2)}</span>
          <span className="text-muted-foreground">/{tier.billingInterval || "month"}</span>
        </div>
        {tier.description && (
          <CardDescription className="mt-2">{tier.description}</CardDescription>
        )}
        <div className="flex items-center justify-center gap-2 mt-3">
          <Badge variant={tier.isActive ? "default" : "secondary"}>
            {tier.isActive ? "Active" : "Inactive"}
          </Badge>
          <Badge variant="outline">
            <Users className="h-3 w-3 mr-1" />
            {tier.seatLimit} seats
          </Badge>
          <Badge variant="outline">
            <Package className="h-3 w-3 mr-1" />
            {tier.maxProjects ?? tier.features.maxProjects ?? 0} projects
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Max Projects</span>
            <span className="font-medium">{tier.maxProjects ?? tier.features.maxProjects ?? 0}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>Max Users</span>
            <span className="font-medium">{tier.maxUsers ?? tier.features.maxUsers ?? 0}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>Storage</span>
            <span className="font-medium">{tier.maxStorage ?? tier.features.maxStorage ?? 0} GB</span>
          </div>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span>Currency</span>
          <span className="font-medium">{tier.currency || "USD"}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span>Billing Interval</span>
          <span className="font-medium">{tier.billingInterval || "month"}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span>Organization Count</span>
          <span className="font-medium">{tier.organizationCount ?? 0}</span>
        </div>
        {/* Feature Toggles */}
        <div className="space-y-1 pt-2 border-t">
          {Object.entries(FEATURE_DEFINITIONS).map(([key, feature]) => {
            if (feature.type === "boolean") {
              const hasFeature = tier.features[key as keyof typeof tier.features] as boolean;
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
        {(tier.stripeProductId || tier.stripePriceId) && (
          <div className="pt-2 border-t">
            {tier.stripeProductId && (
              <p className="text-xs text-muted-foreground">
                Stripe Product: {tier.stripeProductId}
              </p>
            )}
            {tier.stripePriceId && (
              <p className="text-xs text-muted-foreground">
                Stripe Price: {tier.stripePriceId}
              </p>
            )}
          </div>
        )}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => handleEditTier(tier)}
            data-testid={`button-edit-tier-${tier.id}`}
          >
            <Edit className="h-3 w-3 mr-1" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDeleteTier(tier.id)}
            className="text-red-600 hover:text-red-700"
            data-testid={`button-delete-tier-${tier.id}`}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
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
              <form onSubmit={createForm.handleSubmit((data) => createTierMutation.mutate(data))} className="space-y-6">
                <Tabs defaultValue="basic" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="basic">Basic Info</TabsTrigger>
                    <TabsTrigger value="pricing">Pricing</TabsTrigger>
                    <TabsTrigger value="features">Features</TabsTrigger>
                    <TabsTrigger value="stripe">Stripe</TabsTrigger>
                  </TabsList>
                  <TabsContent value="basic" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={createForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tier Name</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="e.g. Pro, Enterprise" data-testid="input-tier-name" />
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
                              <Textarea {...field} placeholder="Tier description..." />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={createForm.control}
                      name="isActive"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Active Tier</FormLabel>
                            <div className="text-sm text-muted-foreground">
                              Available for new subscriptions
                            </div>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-tier-active"
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
                            <FormLabel className="text-base">Popular Tier</FormLabel>
                            <div className="text-sm text-muted-foreground">
                              Highlight this tier as popular
                            </div>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-tier-popular"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
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
                                <SelectItem value="month">Monthly</SelectItem>
                                <SelectItem value="year">Yearly</SelectItem>
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
                        name="maxProjects"
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
                        name="maxUsers"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Max Users</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="number"
                                min="0"
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
                        name="maxStorage"
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
                      <FormField
                        control={createForm.control}
                        name="organizationCount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Organization Count</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="number"
                                min="0"
                                onChange={e => field.onChange(Number(e.target.value))}
                                data-testid="input-organization-count"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </TabsContent>
                  <TabsContent value="features" className="space-y-4">
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
                  <TabsContent value="stripe" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={createForm.control}
                        name="stripeProductId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Stripe Product ID</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="prod_123456" data-testid="input-stripe-product-id" />
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
                              <Input {...field} placeholder="price_987654" data-testid="input-stripe-price-id" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </TabsContent>
                </Tabs>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createTierMutation.isPending} data-testid="button-submit-create-tier">
                    {createTierMutation.isPending ? "Creating..." : "Create Tier"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
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
            ) : tiers.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No customer tiers found</p>
                  <p className="text-sm text-muted-foreground mt-1">Create your first subscription tier to get started</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tiers.map(renderTierCard)}
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
                {tiers.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-3">Feature</th>
                          {tiers.map((tier) => (
                            <th key={tier.id} className="text-center p-3">
                              {tier.name}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {/* Feature toggles */}
                        {Object.entries(FEATURE_DEFINITIONS).map(([key, feature]) => (
                          <tr key={key} className="border-b">
                            <td className="p-3 font-medium">{feature.name}</td>
                            {tiers.map((tier) => (
                              <td key={tier.id} className="text-center p-3">
                                {feature.type === "boolean" ? (
                                  tier.features[key as keyof typeof tier.features] ? (
                                    <Check className="h-4 w-4 text-green-500 mx-auto" />
                                  ) : (
                                    <X className="h-4 w-4 text-gray-400 mx-auto" />
                                  )
                                ) : (
                                  <span className="font-medium">
                                    {tier.features[key as keyof typeof tier.features]}
                                  </span>
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                        {/* Numeric features */}
                        <tr className="border-b">
                          <td className="p-3 font-medium">Max Projects</td>
                          {tiers.map((tier) => (
                            <td key={tier.id} className="text-center p-3">
                              {tier.maxProjects ?? tier.features.maxProjects ?? 0}
                            </td>
                          ))}
                        </tr>
                        <tr className="border-b">
                          <td className="p-3 font-medium">Max Users</td>
                          {tiers.map((tier) => (
                            <td key={tier.id} className="text-center p-3">
                              {tier.maxUsers ?? tier.features.maxUsers ?? 0}
                            </td>
                          ))}
                        </tr>
                        <tr className="border-b">
                          <td className="p-3 font-medium">Max Storage (GB)</td>
                          {tiers.map((tier) => (
                            <td key={tier.id} className="text-center p-3">
                              {tier.maxStorage ?? tier.features.maxStorage ?? 0}
                            </td>
                          ))}
                        </tr>
                        <tr className="border-b">
                          <td className="p-3 font-medium">Currency</td>
                          {tiers.map((tier) => (
                            <td key={tier.id} className="text-center p-3">
                              {tier.currency || "USD"}
                            </td>
                          ))}
                        </tr>
                        <tr className="border-b">
                          <td className="p-3 font-medium">Billing Interval</td>
                          {tiers.map((tier) => (
                            <td key={tier.id} className="text-center p-3">
                              {tier.billingInterval || "month"}
                            </td>
                          ))}
                        </tr>
                        <tr className="border-b">
                          <td className="p-3 font-medium">Organization Count</td>
                          {tiers.map((tier) => (
                            <td key={tier.id} className="text-center p-3">
                              {tier.organizationCount ?? 0}
                            </td>
                          ))}
                        </tr>
                        <tr className="border-b">
                          <td className="p-3 font-medium">Stripe Product ID</td>
                          {tiers.map((tier) => (
                            <td key={tier.id} className="text-center p-3">
                              {tier.stripeProductId || "—"}
                            </td>
                          ))}
                        </tr>
                        <tr className="border-b">
                          <td className="p-3 font-medium">Stripe Price ID</td>
                          {tiers.map((tier) => (
                            <td key={tier.id} className="text-center p-3">
                              {tier.stripePriceId || "—"}
                            </td>
                          ))}
                        </tr>
                        <tr className="border-b">
                          <td className="p-3 font-medium">Popular</td>
                          {tiers.map((tier) => (
                            <td key={tier.id} className="text-center p-3">
                              {tier.isPopular ? <Star className="h-4 w-4 text-blue-500 mx-auto" /> : "—"}
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-center py-8 text-muted-foreground">
                    No tiers available for comparison
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Customer Tier</DialogTitle>
            <DialogDescription>
              Update subscription tier configuration and features
            </DialogDescription>
          </DialogHeader>
          {selectedTier && (
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit((data) => updateTierMutation.mutate({ id: selectedTier.id, data }))} className="space-y-4">
                <Tabs defaultValue="basic" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="basic">Basic Details</TabsTrigger>
                    <TabsTrigger value="pricing">Pricing</TabsTrigger>
                    <TabsTrigger value="features">Features</TabsTrigger>
                    <TabsTrigger value="stripe">Stripe</TabsTrigger>
                  </TabsList>
                  <TabsContent value="basic" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={editForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tier Name</FormLabel>
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
                              <FormLabel className="text-base">Active Tier</FormLabel>
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
                      <FormField
                        control={editForm.control}
                        name="isPopular"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Popular Tier</FormLabel>
                              <div className="text-sm text-muted-foreground">
                                Highlight this tier as popular
                              </div>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="switch-edit-popular"
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
                            <Textarea {...field} data-testid="textarea-edit-description" placeholder="Brief description of this tier..." />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TabsContent>
                  <TabsContent value="pricing" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
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
                        name="currency"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Currency</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-edit-currency">
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
                      <FormField
                        control={editForm.control}
                        name="billingInterval"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Billing Interval</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-edit-billing-interval">
                                  <SelectValue placeholder="Select interval" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="month">Monthly</SelectItem>
                                <SelectItem value="year">Yearly</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={editForm.control}
                        name="maxProjects"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Max Projects</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="number"
                                min="0"
                                onChange={e => field.onChange(Number(e.target.value))}
                                data-testid="input-edit-max-projects"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={editForm.control}
                        name="maxUsers"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Max Users</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="number"
                                min="0"
                                onChange={e => field.onChange(Number(e.target.value))}
                                data-testid="input-edit-max-users"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={editForm.control}
                        name="maxStorage"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Max Storage (GB)</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="number"
                                min="0"
                                onChange={e => field.onChange(Number(e.target.value))}
                                data-testid="input-edit-max-storage"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={editForm.control}
                        name="organizationCount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Organization Count</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="number"
                                min="0"
                                onChange={e => field.onChange(Number(e.target.value))}
                                data-testid="input-edit-organization-count"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </TabsContent>
                  <TabsContent value="features" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      {Object.entries(FEATURE_DEFINITIONS).map(([key, feature]) => {
                        if (feature.type === "boolean") {
                          return (
                            <FormField
                              key={key}
                              control={editForm.control}
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
                                      data-testid={`switch-edit-${key}`}
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
                  <TabsContent value="stripe" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={editForm.control}
                        name="stripeProductId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Stripe Product ID</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="prod_123456" data-testid="input-edit-stripe-product-id" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={editForm.control}
                        name="stripePriceId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Stripe Price ID</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="price_987654" data-testid="input-edit-stripe-price-id" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </TabsContent>
                </Tabs>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updateTierMutation.isPending} data-testid="button-submit-edit-tier">
                    {updateTierMutation.isPending ? "Updating..." : "Update Tier"}
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
