import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Building2, 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Users, 
  Settings,
  UserPlus,
  Calendar,
  Globe,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Package,
  DollarSign,
  FileText,
  Shield,
  AlertTriangle,
  Clock,
  Upload,
  Download,
  X as XIcon
} from "lucide-react";
import { useSuperAdmin } from "@/contexts/SuperAdminContext";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

// Organization schema for form validation
const organizationSchema = z.object({
  name: z.string().min(1, "Organization name is required"),
  domain: z.string().min(1, "Domain is required").regex(/^[a-zA-Z0-9-]+$/, "Domain must contain only letters, numbers, and hyphens"),
  description: z.string().optional(),
  contactEmail: z.string().email("Valid email is required"),
  contactPhone: z.string().optional(),
  address: z.string().optional(),
  website: z.string().url("Valid URL required").optional().or(z.literal("")),
  isActive: z.boolean().default(true),
  maxUsers: z.number().min(1, "Must allow at least 1 user").max(10000, "Maximum 10000 users allowed"),
  billingEmail: z.string().email("Valid billing email is required"),
  taxId: z.string().optional(),
  licenseExpiresAt: z.string().optional(),
  isReadOnly: z.boolean().default(false),
  primaryContactEmail: z.string().email("Valid email required").optional().or(z.literal("")),
  contractValue: z.coerce.number().min(0, "Contract value must be positive").optional().nullable(),
  contractStartDate: z.string().optional().nullable(),
  contractEndDate: z.string().optional().nullable(),
  stripeCustomerId: z.string().optional().nullable(),
});

type OrganizationFormData = z.infer<typeof organizationSchema>;

interface Organization {
  id: string;
  name: string;
  domain: string;
  description?: string;
  contactEmail: string;
  contactPhone?: string;
  address?: string;
  website?: string;
  isActive: boolean;
  maxUsers: number;
  billingEmail: string;
  taxId?: string;
  userCount: number;
  memberCount?: number;
  tierName?: string;
  createdAt: string;
  updatedAt: string;
  licenseExpiresAt?: string | null;
  isReadOnly?: boolean;
  primaryContactEmail?: string | null;
  contractValue?: number | null;
  contractStartDate?: string | null;
  contractEndDate?: string | null;
  stripeCustomerId?: string | null;
  subscription?: {
    id: string;
    tierId: string;
    status: string;
    seatsPurchased: number;
    tier: {
      name: string;
      price: number;
      currency: string;
      features: Record<string, boolean>;
    } | null;
  } | null;
}

interface CustomerTier {
  id: string;
  name: string;
  description?: string;
  seatLimit: number;
  price: number;
  features: Record<string, boolean>;
  pricingModel?: string;
  currency?: string;
}

interface SubscriptionInfo {
  id?: string;
  tierId?: string;
  tierName?: string;
  status?: string;
  seatsPurchased?: number;
  currentPeriodEnd?: string;
  trialEndsAt?: string;
}

export default function SuperAdminOrganizations() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<string>("");
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const { isAuthenticated } = useSuperAdmin();
  const { toast } = useToast();

  // Fetch organization files
  const { data: organizationFiles = [], refetch: refetchFiles } = useQuery({
    queryKey: ["/api/super-admin/organizations", selectedOrg?.id, "files"],
    queryFn: async () => {
      if (!selectedOrg?.id) return [];
      const response = await fetch(`/api/super-admin/organizations/${selectedOrg.id}/files`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error("Failed to fetch files");
      return response.json();
    },
    enabled: isAuthenticated && !!selectedOrg?.id,
  });
  
  // Fetch available customer tiers from API
  const { data: tiersData } = useQuery<{ tiers: CustomerTier[] }>({
    queryKey: ["/api/super-admin/customer-tiers"],
    enabled: isAuthenticated
  });
  const availableTiers: CustomerTier[] = tiersData?.tiers || [];

  // Fetch organizations
  const { data: organizations = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/super-admin/organizations"],
    queryFn: async () => {
      const response = await fetch("/api/super-admin/organizations", {
        credentials: 'include', // Use cookies for authentication
      });
      if (!response.ok) throw new Error("Failed to fetch organizations");
      const rawData = await response.json();
      
      // Transform backend data to match frontend interface
      return rawData.map((org: any) => ({
        ...org,
        domain: org.slug, // Map slug to domain for display
        isActive: org.status === "active", // Map status to isActive boolean
      })) as Organization[];
    },
    enabled: isAuthenticated,
  });

  // Create organization mutation
  const createOrgMutation = useMutation({
    mutationFn: async (data: OrganizationFormData) => {
      // Transform form data to match database schema
      const organizationData = {
        name: data.name,
        slug: data.domain, // Map domain to slug
        description: data.description,
        contactEmail: data.contactEmail,
        billingEmail: data.billingEmail,
        contactPhone: data.contactPhone,
        address: data.address,
        website: data.website,
        maxUsers: data.maxUsers,
        taxId: data.taxId,
        status: data.isActive ? "active" : "inactive", // Map isActive to status
        // Include license management fields
        licenseExpiresAt: data.licenseExpiresAt || null,
        isReadOnly: data.isReadOnly || false,
        primaryContactEmail: data.primaryContactEmail || null,
        // Include contract management fields
        contractValue: data.contractValue !== undefined && data.contractValue !== null 
          ? Math.round(data.contractValue * 100) 
          : null, // Convert dollars to cents, preserving 0 as valid
        contractStartDate: data.contractStartDate || null,
        contractEndDate: data.contractEndDate || null,
        stripeCustomerId: data.stripeCustomerId || null,
        // ownerUserId is optional - can be set later when users are added to organization
      };
      
      const response = await fetch("/api/super-admin/organizations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include', // Use cookies for authentication
        body: JSON.stringify(organizationData),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create organization");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/organizations"] });
      setIsCreateDialogOpen(false);
      createForm.reset();
      toast({
        title: "Success",
        description: "Organization created successfully",
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

  // Update organization mutation
  const updateOrgMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: OrganizationFormData }) => {
      // Transform form data to match database schema
      const organizationData = {
        name: data.name,
        slug: data.domain, // Map domain to slug
        description: data.description,
        contactEmail: data.contactEmail,
        billingEmail: data.billingEmail,
        contactPhone: data.contactPhone,
        address: data.address,
        website: data.website,
        maxUsers: data.maxUsers,
        taxId: data.taxId,
        status: data.isActive ? "active" : "inactive", // Map isActive to status
        // Include license management fields
        licenseExpiresAt: data.licenseExpiresAt || null,
        isReadOnly: data.isReadOnly || false,
        primaryContactEmail: data.primaryContactEmail || null,
        // Include contract management fields
        contractValue: data.contractValue !== undefined && data.contractValue !== null 
          ? Math.round(data.contractValue * 100) 
          : null, // Convert dollars to cents, preserving 0 as valid
        contractStartDate: data.contractStartDate || null,
        contractEndDate: data.contractEndDate || null,
        stripeCustomerId: data.stripeCustomerId || null,
        // Include selected customer tier information
        tierId: selectedTier || undefined,
        tierName: selectedTier ? availableTiers.find((t: CustomerTier) => t.id === selectedTier)?.name : undefined
      };
      
      const response = await fetch(`/api/super-admin/organizations/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include', // Use cookies for authentication
        body: JSON.stringify(organizationData),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update organization");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/organizations"] });
      setIsEditDialogOpen(false);
      setSelectedOrg(null);
      setSelectedTier("");
      setSubscriptionInfo(null);
      editForm.reset();
      toast({
        title: "Success",
        description: "Organization updated successfully",
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

  // Delete organization mutation
  const deleteOrgMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/super-admin/organizations/${id}`, {
        method: "DELETE",
        credentials: 'include', // Use cookies for authentication
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete organization");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/organizations"] });
      toast({
        title: "Success",
        description: "Organization deleted successfully",
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

  // File upload handler
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || !event.target.files[0] || !selectedOrg) return;
    
    const file = event.target.files[0];
    setUploadingFile(true);
    
    try {
      // Step 1: Get pre-signed upload URL
      const uploadUrlResponse = await fetch(`/api/objects/upload?filename=${encodeURIComponent(file.name)}&type=${encodeURIComponent(file.type)}`, {
        credentials: 'include',
      });
      
      if (!uploadUrlResponse.ok) throw new Error("Failed to get upload URL");
      
      const { uploadUrl, fileKey } = await uploadUrlResponse.json();
      
      // Step 2: Upload file directly to object storage
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });
      
      if (!uploadResponse.ok) throw new Error("Failed to upload file");
      
      // Step 3: Create file metadata record
      const metadataResponse = await fetch(`/api/super-admin/organizations/${selectedOrg.id}/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          organizationId: selectedOrg.id,
          fileName: file.name,
          fileKey: fileKey,
          fileType: file.type,
          fileSize: file.size,
        }),
      });
      
      if (!metadataResponse.ok) throw new Error("Failed to save file metadata");
      
      await refetchFiles();
      toast({
        title: "Success",
        description: `File "${file.name}" uploaded successfully`,
      });
      
      // Reset file input
      event.target.value = '';
    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploadingFile(false);
    }
  };

  // File delete handler
  const handleDeleteFile = async (fileId: string, fileName: string) => {
    if (!selectedOrg || !confirm(`Are you sure you want to delete "${fileName}"?`)) return;
    
    try {
      const response = await fetch(`/api/super-admin/organizations/${selectedOrg.id}/files/${fileId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (!response.ok) throw new Error("Failed to delete file");
      
      await refetchFiles();
      toast({
        title: "Success",
        description: `File "${fileName}" deleted successfully`,
      });
    } catch (error: any) {
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // File download handler
  const handleDownloadFile = async (fileId: string, fileName: string) => {
    if (!selectedOrg) return;
    
    try {
      const response = await fetch(`/api/super-admin/organizations/${selectedOrg.id}/files/${fileId}/download`, {
        credentials: 'include',
      });
      
      if (!response.ok) throw new Error("Failed to get download URL");
      
      const { downloadUrl } = await response.json();
      
      // Open download URL in new tab
      window.open(downloadUrl, '_blank');
    } catch (error: any) {
      toast({
        title: "Download Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Forms
  const createForm = useForm<OrganizationFormData>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      name: "",
      domain: "",
      description: "",
      contactEmail: "",
      contactPhone: "",
      address: "",
      website: "",
      isActive: true,
      maxUsers: 100,
      billingEmail: "",
      taxId: "",
      licenseExpiresAt: "",
      isReadOnly: false,
      primaryContactEmail: "",
      contractValue: undefined,
      contractStartDate: "",
      contractEndDate: "",
      stripeCustomerId: "",
    },
  });

  const editForm = useForm<OrganizationFormData>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      name: "",
      domain: "",
      description: "",
      contactEmail: "",
      contactPhone: "",
      address: "",
      website: "",
      isActive: true,
      maxUsers: 100,
      billingEmail: "",
      taxId: "",
      licenseExpiresAt: "",
      isReadOnly: false,
      primaryContactEmail: "",
      contractValue: undefined,
      contractStartDate: "",
      contractEndDate: "",
      stripeCustomerId: "",
    },
  });

  // Filter organizations
  const filteredOrgs = organizations.filter((org) => {
    const matchesSearch = org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         org.domain.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         org.contactEmail.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || 
                         (statusFilter === "active" && org.isActive) ||
                         (statusFilter === "inactive" && !org.isActive);
    return matchesSearch && matchesStatus;
  });

  const handleEditOrg = (org: Organization) => {
    setSelectedOrg(org);
    editForm.reset({
      name: org.name,
      domain: org.domain,
      description: org.description || "",
      contactEmail: org.contactEmail,
      contactPhone: org.contactPhone || "",
      address: org.address || "",
      website: org.website || "",
      isActive: org.isActive,
      maxUsers: org.maxUsers,
      billingEmail: org.billingEmail,
      taxId: org.taxId || "",
      licenseExpiresAt: org.licenseExpiresAt || "",
      isReadOnly: org.isReadOnly || false,
      primaryContactEmail: org.primaryContactEmail || "",
      contractValue: org.contractValue !== undefined && org.contractValue !== null 
        ? org.contractValue / 100 
        : undefined, // Convert from cents to dollars for display, preserving 0 as valid
      contractStartDate: org.contractStartDate || "",
      contractEndDate: org.contractEndDate || "",
      stripeCustomerId: org.stripeCustomerId || "",
    });
    
    // Set current tier from subscription
    setSelectedTier(org.subscription?.tierId || "");
    
    // Reset subscription info for now (could be loaded from API in future)
    setSubscriptionInfo(null);
    
    setIsEditDialogOpen(true);
  };

  const handleDeleteOrg = (id: string) => {
    if (confirm("Are you sure you want to delete this organization? This action cannot be undone.")) {
      deleteOrgMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Organizations
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage tenant organizations and their configurations
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-organization">
              <Plus className="h-4 w-4 mr-2" />
              Create Organization
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Organization</DialogTitle>
              <DialogDescription>
                Set up a new tenant organization with initial configuration
              </DialogDescription>
            </DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit((data) => createOrgMutation.mutate(data))} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={createForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Organization Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Acme Corporation" data-testid="input-org-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={createForm.control}
                    name="domain"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Domain</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="acme-corp" data-testid="input-org-domain" />
                        </FormControl>
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
                        <Textarea {...field} placeholder="Organization description..." />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={createForm.control}
                    name="contactEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Email</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" placeholder="admin@acme.com" data-testid="input-contact-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={createForm.control}
                    name="billingEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Billing Email</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" placeholder="billing@acme.com" data-testid="input-billing-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={createForm.control}
                    name="contactPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Phone</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="+1 (555) 123-4567" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={createForm.control}
                    name="website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="https://acme.com" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={createForm.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Full business address..." />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
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
                            min="1" 
                            max="10000"
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
                    name="taxId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tax ID</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Tax identification number" />
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
                        <FormLabel className="text-base">Active Organization</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          Allow users to access this organization
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-org-active"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createOrgMutation.isPending} data-testid="button-submit-create-org">
                    {createOrgMutation.isPending ? "Creating..." : "Create Organization"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search organizations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-organizations"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48" data-testid="select-status-filter">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Organizations</SelectItem>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="inactive">Inactive Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Organizations Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Organizations ({filteredOrgs.length})
          </CardTitle>
          <CardDescription>
            Manage all tenant organizations and their settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">Loading organizations...</p>
          ) : filteredOrgs.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No organizations found</p>
          ) : (
            <div className="space-y-4">
              {filteredOrgs.map((org) => (
                <div key={org.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold" data-testid={`org-name-${org.id}`}>{org.name}</h3>
                      <Badge variant={org.isActive ? "default" : "secondary"}>
                        {org.isActive ? "Active" : "Inactive"}
                      </Badge>
                      {org.subscription?.tier?.name && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Package className="h-3 w-3" />
                          {org.subscription.tier.name}
                        </Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        {org.domain}
                      </div>
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {org.contactEmail}
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {org.memberCount || org.userCount}/{org.maxUsers} users
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(org.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditOrg(org)}
                      data-testid={`button-edit-org-${org.id}`}
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteOrg(org.id)}
                      className="text-red-600 hover:text-red-700"
                      data-testid={`button-delete-org-${org.id}`}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Organization Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Organization</DialogTitle>
            <DialogDescription>
              Update organization details and configuration
            </DialogDescription>
          </DialogHeader>
          {selectedOrg && (
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit((data) => updateOrgMutation.mutate({ id: selectedOrg.id, data }))} className="space-y-6">
                <Tabs defaultValue="basic" className="space-y-4">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="basic">Basic Info</TabsTrigger>
                    <TabsTrigger value="license">License</TabsTrigger>
                    <TabsTrigger value="subscription">Subscription</TabsTrigger>
                    <TabsTrigger value="billing">Billing</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="basic" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={editForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Organization Name</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Acme Corporation" data-testid="input-edit-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={editForm.control}
                        name="domain"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Domain</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="acme-corp" data-testid="input-edit-domain" />
                            </FormControl>
                            <FormMessage />
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
                            <Textarea {...field} placeholder="Brief description of the organization..." />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={editForm.control}
                        name="contactEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contact Email</FormLabel>
                            <FormControl>
                              <Input {...field} type="email" placeholder="admin@acme.com" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={editForm.control}
                        name="contactPhone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contact Phone</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="+1 (555) 123-4567" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={editForm.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address</FormLabel>
                          <FormControl>
                            <Textarea {...field} placeholder="Full business address..." />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={editForm.control}
                        name="website"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Website</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="https://acme.com" />
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
                                min="1" 
                                max="10000"
                                onChange={e => field.onChange(Number(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={editForm.control}
                      name="isActive"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Active Organization</FormLabel>
                            <div className="text-sm text-muted-foreground">
                              Allow users to access this organization
                            </div>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </TabsContent>

                  <TabsContent value="license" className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Shield className="h-5 w-5" />
                      <h3 className="text-lg font-semibold">License Management</h3>
                    </div>

                    <FormField
                      control={editForm.control}
                      name="licenseExpiresAt"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>License Expiration Date</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="datetime-local" 
                              value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ""}
                              onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value).toISOString() : "")}
                              data-testid="input-license-expires"
                            />
                          </FormControl>
                          <div className="text-xs text-muted-foreground mt-1">
                            <Clock className="h-3 w-3 inline mr-1" />
                            Leave empty for unlimited license. Organization enters read-only mode 7 days after expiration.
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={editForm.control}
                      name="primaryContactEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Primary Contact Email</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="email" 
                              placeholder="contact@organization.com"
                              data-testid="input-primary-contact"
                            />
                          </FormControl>
                          <div className="text-xs text-muted-foreground mt-1">
                            <Mail className="h-3 w-3 inline mr-1" />
                            Will receive license expiration notifications 7 days before expiration
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={editForm.control}
                      name="isReadOnly"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4 text-orange-500" />
                              Read-Only Mode
                            </FormLabel>
                            <div className="text-sm text-muted-foreground">
                              Restrict organization to read-only access (automatically enabled after license expiration grace period)
                            </div>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-read-only"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {selectedOrg.licenseExpiresAt && (
                      <Card className="bg-muted/50">
                        <CardContent className="pt-4">
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              <span className="font-medium">License Status</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <span className="text-muted-foreground">Current Status:</span>
                                <div className="font-medium">
                                  {selectedOrg.isReadOnly ? (
                                    <Badge variant="destructive">Read-Only</Badge>
                                  ) : new Date(selectedOrg.licenseExpiresAt) < new Date() ? (
                                    <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300">Grace Period</Badge>
                                  ) : (
                                    <Badge variant="default">Active</Badge>
                                  )}
                                </div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Expires:</span>
                                <div className="font-medium">
                                  {new Date(selectedOrg.licenseExpiresAt).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Contract Value Section */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="h-5 w-5" />
                        <h3 className="text-lg font-semibold">Contract Details</h3>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={editForm.control}
                          name="contractValue"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Contract Value ($)</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field}
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  placeholder="0.00"
                                  value={field.value || ""}
                                  onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                  data-testid="input-contract-value"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={editForm.control}
                          name="stripeCustomerId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Stripe Customer ID</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field}
                                  placeholder="cus_..."
                                  value={field.value || ""}
                                  data-testid="input-stripe-customer-id"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={editForm.control}
                          name="contractStartDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Contract Start Date</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field}
                                  type="date"
                                  value={field.value ? new Date(field.value).toISOString().split('T')[0] : ""}
                                  onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value).toISOString() : "")}
                                  data-testid="input-contract-start-date"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={editForm.control}
                          name="contractEndDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Contract End Date</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field}
                                  type="date"
                                  value={field.value ? new Date(field.value).toISOString().split('T')[0] : ""}
                                  onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value).toISOString() : "")}
                                  data-testid="input-contract-end-date"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    {/* Contract Files Section */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="h-5 w-5" />
                          <h3 className="text-lg font-semibold">Contract Documents</h3>
                        </div>
                        <div className="relative">
                          <input
                            type="file"
                            id="contract-upload"
                            className="hidden"
                            onChange={handleFileUpload}
                            disabled={uploadingFile}
                            data-testid="input-contract-file"
                          />
                          <Button
                            size="sm"
                            onClick={() => document.getElementById('contract-upload')?.click()}
                            disabled={uploadingFile}
                            data-testid="button-upload-contract"
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            {uploadingFile ? 'Uploading...' : 'Upload Contract'}
                          </Button>
                        </div>
                      </div>

                      {organizationFiles.length === 0 ? (
                        <Card>
                          <CardContent className="pt-6 text-center text-muted-foreground">
                            <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p>No contract documents uploaded yet</p>
                          </CardContent>
                        </Card>
                      ) : (
                        <div className="space-y-2">
                          {organizationFiles.map((file: any) => (
                            <Card key={file.id} data-testid={`card-file-${file.id}`}>
                              <CardContent className="pt-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3 flex-1">
                                    <FileText className="h-5 w-5 text-muted-foreground" />
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium truncate">{file.fileName}</p>
                                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <span>{(file.fileSize / 1024).toFixed(1)} KB</span>
                                        <span>•</span>
                                        <span>{new Date(file.uploadedAt).toLocaleDateString()}</span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleDownloadFile(file.id, file.fileName)}
                                      data-testid={`button-download-${file.id}`}
                                    >
                                      <Download className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleDeleteFile(file.id, file.fileName)}
                                      data-testid={`button-delete-${file.id}`}
                                    >
                                      <XIcon className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="subscription" className="space-y-4">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-4">
                        <Package className="h-5 w-5" />
                        <h3 className="text-lg font-semibold">Customer Tier Selection</h3>
                      </div>
                      
                      <div className="grid gap-4">
                        {availableTiers.map((tier: CustomerTier) => (
                          <Card key={tier.id} className={`cursor-pointer transition-all ${selectedTier === tier.id ? 'ring-2 ring-primary' : ''}`} onClick={() => setSelectedTier(tier.id)}>
                            <CardContent className="pt-4">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <h4 className="font-semibold">{tier.name}</h4>
                                    <Badge variant="outline">
                                      ${(tier.price / 100).toFixed(2)}/seat/month
                                    </Badge>
                                    <Badge variant="secondary">
                                      Up to {tier.seatLimit} seats
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground mb-2">{tier.description}</p>
                                  <div className="flex flex-wrap gap-1">
                                    {Object.entries(tier.features || {}).map(([feature, enabled]) => enabled && (
                                      <Badge key={feature} variant="outline" className="text-xs">
                                        {feature}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                                <div className="flex items-center">
                                  <input
                                    type="radio"
                                    name="tier"
                                    value={tier.id}
                                    checked={selectedTier === tier.id}
                                    onChange={() => setSelectedTier(tier.id)}
                                    className="h-4 w-4"
                                  />
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>

                      {selectedTier && (
                        <Card className="bg-muted/50">
                          <CardContent className="pt-4">
                            <div className="flex items-center gap-2 mb-2">
                              <CreditCard className="h-4 w-4" />
                              <h4 className="font-medium">Subscription Details</h4>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">Selected Tier:</span>
                                <div className="font-medium">{availableTiers.find((t: CustomerTier) => t.id === selectedTier)?.name}</div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Price per Seat:</span>
                                <div className="font-medium">${(availableTiers.find((t: CustomerTier) => t.id === selectedTier)?.price || 0) / 100}/month</div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Max Seats:</span>
                                <div className="font-medium">{availableTiers.find((t: CustomerTier) => t.id === selectedTier)?.seatLimit}</div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Current Users:</span>
                                <div className="font-medium">{selectedOrg?.userCount || 0}</div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="billing" className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <DollarSign className="h-5 w-5" />
                      <h3 className="text-lg font-semibold">Billing Information</h3>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={editForm.control}
                        name="billingEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Billing Email</FormLabel>
                            <FormControl>
                              <Input {...field} type="email" placeholder="billing@acme.com" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={editForm.control}
                        name="taxId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tax ID</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Tax identification number" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {subscriptionInfo && (
                      <Card>
                        <CardContent className="pt-4">
                          <h4 className="font-medium mb-3">Current Subscription Status</h4>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Status:</span>
                              <div className="font-medium">
                                <Badge variant={subscriptionInfo.status === 'active' ? 'default' : 'secondary'}>
                                  {subscriptionInfo.status}
                                </Badge>
                              </div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Seats Purchased:</span>
                              <div className="font-medium">{subscriptionInfo.seatsPurchased}</div>
                            </div>
                            {subscriptionInfo.currentPeriodEnd && (
                              <div>
                                <span className="text-muted-foreground">Next Billing:</span>
                                <div className="font-medium">{new Date(subscriptionInfo.currentPeriodEnd).toLocaleDateString()}</div>
                              </div>
                            )}
                            {subscriptionInfo.trialEndsAt && (
                              <div>
                                <span className="text-muted-foreground">Trial Ends:</span>
                                <div className="font-medium">{new Date(subscriptionInfo.trialEndsAt).toLocaleDateString()}</div>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>
                </Tabs>

                <div className="flex justify-between">
                  <div>
                    {selectedTier && selectedTier !== selectedOrg?.tierName && (
                      <p className="text-sm text-muted-foreground">
                        Tier will be updated to: <strong>{availableTiers.find((t: CustomerTier) => t.id === selectedTier)?.name}</strong>
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={updateOrgMutation.isPending} data-testid="button-submit-edit-org">
                      {updateOrgMutation.isPending ? "Updating..." : "Update Organization"}
                    </Button>
                  </div>
                </div>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}