import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Form, 
  FormControl, 
  FormDescription,
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Building2, 
  Palette, 
  CreditCard, 
  Settings, 
  Globe,
  Save,
  Calendar,
  Clock
} from "lucide-react";

const organizationSettingsSchema = z.object({
  logoUrl: z.string().url().optional().or(z.literal("")),
  primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Must be a valid hex color").default("#3b82f6"),
  secondaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Must be a valid hex color").default("#64748b"),
  customDomain: z.string().optional().or(z.literal("")),
  timezone: z.string().default("UTC"),
  dateFormat: z.string().default("MM/dd/yyyy"),
  billingEmail: z.string().email().optional().or(z.literal("")),
  taxId: z.string().optional().or(z.literal("")),
  invoicePrefix: z.string().optional().or(z.literal("")),
});

type OrganizationSettingsForm = z.infer<typeof organizationSettingsSchema>;

export default function OrganizationSettings() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("general");

  // Fetch organization settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ["/api/organization/settings"],
  });

  // Fetch current organization
  const { data: currentOrg } = useQuery({
    queryKey: ["/api/organization/current"],
  });

  const form = useForm<OrganizationSettingsForm>({
    resolver: zodResolver(organizationSettingsSchema),
    defaultValues: {
      logoUrl: "",
      primaryColor: "#3b82f6",
      secondaryColor: "#64748b",
      customDomain: "",
      timezone: "UTC",
      dateFormat: "MM/dd/yyyy",
      billingEmail: "",
      taxId: "",
      invoicePrefix: "",
    },
  });

  // Update form values when settings data loads
  React.useEffect(() => {
    if (settings) {
      form.reset({
        logoUrl: (settings as any)?.logoUrl || "",
        primaryColor: (settings as any)?.primaryColor || "#3b82f6",
        secondaryColor: (settings as any)?.secondaryColor || "#64748b",
        customDomain: (settings as any)?.customDomain || "",
        timezone: (settings as any)?.timezone || "UTC",
        dateFormat: (settings as any)?.dateFormat || "MM/dd/yyyy",
        billingEmail: (settings as any)?.billingEmail || "",
        taxId: (settings as any)?.taxId || "",
        invoicePrefix: (settings as any)?.invoicePrefix || "",
      });
    }
  }, [settings, form]);

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: OrganizationSettingsForm) => {
      const response = await fetch("/api/organization/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error("Failed to update settings");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organization/settings"] });
      toast({
        title: "Settings Updated",
        description: "Organization settings have been successfully updated.",
      });
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update organization settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: OrganizationSettingsForm) => {
    updateSettingsMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Settings className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600 dark:text-gray-400">Loading organization settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Building2 className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Organization Settings
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your organization's configuration and preferences
          </p>
        </div>
      </div>

      {currentOrg ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {(currentOrg as any)?.name || "Organization"}
            </CardTitle>
            <CardDescription>
              Organization ID: {(currentOrg as any)?.id || "N/A"} • Status: <Badge variant="secondary">{(currentOrg as any)?.status || "Unknown"}</Badge>
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <Tabs value={activeTab} onValueChange={setActiveTab} data-testid="settings-tabs">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general" data-testid="tab-general">
            <Settings className="h-4 w-4 mr-2" />
            General
          </TabsTrigger>
          <TabsTrigger value="branding" data-testid="tab-branding">
            <Palette className="h-4 w-4 mr-2" />
            Branding
          </TabsTrigger>
          <TabsTrigger value="billing" data-testid="tab-billing">
            <CreditCard className="h-4 w-4 mr-2" />
            Billing
          </TabsTrigger>
          <TabsTrigger value="features" data-testid="tab-features">
            <Globe className="h-4 w-4 mr-2" />
            Features
          </TabsTrigger>
        </TabsList>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            <TabsContent value="general" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>General Settings</CardTitle>
                  <CardDescription>
                    Configure basic organization settings and preferences
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="timezone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Timezone</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="input-timezone">
                              <SelectValue placeholder="Select timezone" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="UTC">UTC</SelectItem>
                            <SelectItem value="America/New_York">Eastern Time</SelectItem>
                            <SelectItem value="America/Chicago">Central Time</SelectItem>
                            <SelectItem value="America/Denver">Mountain Time</SelectItem>
                            <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                            <SelectItem value="Europe/London">London</SelectItem>
                            <SelectItem value="Europe/Paris">Paris</SelectItem>
                            <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Default timezone for your organization
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dateFormat"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date Format</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="input-date-format">
                              <SelectValue placeholder="Select date format" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="MM/dd/yyyy">MM/DD/YYYY</SelectItem>
                            <SelectItem value="dd/MM/yyyy">DD/MM/YYYY</SelectItem>
                            <SelectItem value="yyyy-MM-dd">YYYY-MM-DD</SelectItem>
                            <SelectItem value="MMM dd, yyyy">MMM DD, YYYY</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Default date format for displays
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="customDomain"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Custom Domain</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="yourdomain.com" 
                            {...field}
                            data-testid="input-custom-domain"
                          />
                        </FormControl>
                        <FormDescription>
                          Custom domain for your organization (optional)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="branding" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Brand Customization</CardTitle>
                  <CardDescription>
                    Customize your organization's visual identity
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="logoUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Logo URL</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="https://example.com/logo.png" 
                            {...field}
                            data-testid="input-logo-url"
                          />
                        </FormControl>
                        <FormDescription>
                          URL to your organization's logo image
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="primaryColor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Primary Color</FormLabel>
                          <div className="flex gap-2">
                            <FormControl>
                              <Input 
                                type="color" 
                                {...field}
                                className="w-16 h-10 p-1 border rounded"
                                data-testid="input-primary-color"
                              />
                            </FormControl>
                            <FormControl>
                              <Input 
                                placeholder="#3b82f6" 
                                {...field}
                                className="font-mono"
                                data-testid="input-primary-color-text"
                              />
                            </FormControl>
                          </div>
                          <FormDescription>
                            Primary brand color
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="secondaryColor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Secondary Color</FormLabel>
                          <div className="flex gap-2">
                            <FormControl>
                              <Input 
                                type="color" 
                                {...field}
                                className="w-16 h-10 p-1 border rounded"
                                data-testid="input-secondary-color"
                              />
                            </FormControl>
                            <FormControl>
                              <Input 
                                placeholder="#64748b" 
                                {...field}
                                className="font-mono"
                                data-testid="input-secondary-color-text"
                              />
                            </FormControl>
                          </div>
                          <FormDescription>
                            Secondary brand color
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="billing" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Billing Information</CardTitle>
                  <CardDescription>
                    Manage billing preferences and tax information
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="billingEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Billing Email</FormLabel>
                        <FormControl>
                          <Input 
                            type="email"
                            placeholder="billing@yourcompany.com" 
                            {...field}
                            data-testid="input-billing-email"
                          />
                        </FormControl>
                        <FormDescription>
                          Email address for billing notifications
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="invoicePrefix"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Invoice Prefix</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="INV" 
                            {...field}
                            data-testid="input-invoice-prefix"
                          />
                        </FormControl>
                        <FormDescription>
                          Prefix for invoice numbers (e.g., INV-001)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="taxId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tax ID / VAT Number</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter tax ID or VAT number" 
                            {...field}
                            data-testid="input-tax-id"
                          />
                        </FormControl>
                        <FormDescription>
                          Your organization's tax identification number
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="features" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Feature Configuration</CardTitle>
                  <CardDescription>
                    Enable or disable features for your organization
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Feature toggles will be available based on your subscription plan.
                    Contact support for custom feature configurations.
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">AI Coaching</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Enable GPT-powered change management coaching
                        </p>
                      </div>
                      <Switch disabled defaultChecked data-testid="feature-ai-coaching" />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Advanced Analytics</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Access to detailed reports and analytics
                        </p>
                      </div>
                      <Switch disabled defaultChecked data-testid="feature-analytics" />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Custom Integrations</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Connect with external tools and services
                        </p>
                      </div>
                      <Switch disabled data-testid="feature-integrations" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <div className="flex justify-end">
              <Button 
                type="submit" 
                disabled={updateSettingsMutation.isPending}
                data-testid="button-save-settings"
              >
                {updateSettingsMutation.isPending ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Settings
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </Tabs>
    </div>
  );
}