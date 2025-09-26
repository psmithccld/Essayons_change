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
  MapPin
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
  planName?: string;
  createdAt: string;
  updatedAt: string;
}

export default function SuperAdminOrganizations() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { sessionId } = useSuperAdmin();
  const { toast } = useToast();

  // Fetch organizations
  const { data: organizations = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/super-admin/organizations"],
    queryFn: async () => {
      const response = await fetch("/api/super-admin/organizations", {
        headers: {
          "x-super-admin-session": sessionId!,
        },
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
    enabled: !!sessionId,
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
        ownerUserId: "bdc321c7-9687-4302-ac33-2d17f552191b", // TODO: Make this configurable/dynamic for production
      };
      
      const response = await fetch("/api/super-admin/organizations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-super-admin-session": sessionId!,
        },
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
      };
      
      const response = await fetch(`/api/super-admin/organizations/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-super-admin-session": sessionId!,
        },
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
        headers: {
          "x-super-admin-session": sessionId!,
        },
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
    });
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
                      {org.planName && (
                        <Badge variant="outline">
                          {org.planName}
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
                        {org.userCount}/{org.maxUsers} users
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
              <form onSubmit={editForm.handleSubmit((data) => updateOrgMutation.mutate({ id: selectedOrg.id, data }))} className="space-y-4">
                {/* Same form fields as create form... */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Organization Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Acme Corporation" />
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
                          <Input {...field} placeholder="acme-corp" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updateOrgMutation.isPending} data-testid="button-submit-edit-org">
                    {updateOrgMutation.isPending ? "Updating..." : "Update Organization"}
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