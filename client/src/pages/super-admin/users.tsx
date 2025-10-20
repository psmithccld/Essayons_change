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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { 
  Users, 
  Search, 
  UserPlus, 
  UserMinus, 
  Shield, 
  Building2,
  Mail,
  Calendar,
  Settings,
  Crown,
  UserCheck,
  AlertTriangle,
  RefreshCw,
  Filter
} from "lucide-react";
import { useSuperAdmin } from "@/contexts/SuperAdminContext";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface PlatformUser {
  id: string;
  name: string;
  username: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
  organizations: {
    id: string;
    name: string;
    domain: string;
    roleName: string;
    isAdmin: boolean;
  }[];
}

interface Organization {
  id: string;
  name: string;
  domain: string;
  isActive: boolean;
  userCount: number;
}

interface Role {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
}

interface UserAssignment {
  userId: string;
  organizationId: string;
  isAdmin: boolean;
}

// Form schemas
const assignUserSchema = z.object({
  userId: z.string().min(1, "User is required"),
  organizationId: z.string().min(1, "Organization is required"),
  isAdmin: z.boolean().default(false),
});

const createUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  username: z.string().min(1, "Username is required"),
  email: z.string().email("Valid email is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
  isActive: z.boolean().default(true),
  organizationId: z.string().optional(),
  isAdmin: z.boolean().default(false),
  roleId: z.string().optional(),
  isSuperAdmin: z.boolean().default(false),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

type AssignUserFormData = z.infer<typeof assignUserSchema>;
type CreateUserFormData = z.infer<typeof createUserSchema>;

export default function SuperAdminUsers() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [orgFilter, setOrgFilter] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<PlatformUser | null>(null);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const { sessionId } = useSuperAdmin();
  const { toast } = useToast();

  // Fetch platform users
  const { data: users = [], isLoading: usersLoading, refetch: refetchUsers } = useQuery({
    queryKey: ["/api/super-admin/users"],
    queryFn: async () => {
      const response = await fetch("/api/super-admin/users", {
        credentials: 'include', // Use cookies for authentication
      });
      if (!response.ok) throw new Error("Failed to fetch users");
      return response.json() as Promise<PlatformUser[]>;
    },
    enabled: true, // Always enabled, auth handled by cookies
  });

  // Fetch organizations for dropdowns
  const { data: organizations = [] } = useQuery({
    queryKey: ["/api/super-admin/organizations", "simple"],
    queryFn: async () => {
      const response = await fetch("/api/super-admin/organizations?fields=id,name,domain,isActive,userCount", {
        credentials: 'include', // Use cookies for authentication
      });
      if (!response.ok) throw new Error("Failed to fetch organizations");
      return response.json() as Promise<Organization[]>;
    },
    enabled: true, // Always enabled, auth handled by cookies
  });

  // Search users mutation
  const searchUsersMutation = useMutation({
    mutationFn: async (query: string) => {
      const response = await fetch(`/api/super-admin/users/search?q=${encodeURIComponent(query)}`, {
        credentials: 'include', // Use cookies for authentication
      });
      if (!response.ok) throw new Error("Failed to search users");
      return response.json();
    },
  });

  // Assign user to organization mutation
  const assignUserMutation = useMutation({
    mutationFn: async (data: AssignUserFormData) => {
      const response = await fetch(`/api/super-admin/organizations/${data.organizationId}/admins`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include', // Use cookies for authentication
        body: JSON.stringify({
          userId: data.userId,
          role: data.isAdmin ? 'admin' : 'owner', // Map checkbox: checked=admin, unchecked=owner
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to assign user");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/organizations"] });
      setIsAssignDialogOpen(false);
      assignForm.reset();
      toast({
        title: "Success",
        description: "User assigned to organization successfully",
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

  // Remove user from organization mutation
  const removeUserMutation = useMutation({
    mutationFn: async ({ organizationId, userId }: { organizationId: string; userId: string }) => {
      const response = await fetch(`/api/super-admin/organizations/${organizationId}/members/${userId}`, {
        method: "DELETE",
        credentials: 'include', // Use cookies for authentication
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to remove user");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/organizations"] });
      toast({
        title: "Success",
        description: "User removed from organization successfully",
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

  // Create platform user mutation
  const createUserMutation = useMutation({
    mutationFn: async (data: CreateUserFormData) => {
      const response = await fetch("/api/super-admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include', // Use cookies for authentication
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create user");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/users"] });
      setIsCreateDialogOpen(false);
      createForm.reset();
      toast({
        title: "Success",
        description: "User created successfully",
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
  const assignForm = useForm<AssignUserFormData>({
    resolver: zodResolver(assignUserSchema),
    defaultValues: {
      userId: "",
      organizationId: "",
      isAdmin: false,
    },
  });

  const createForm = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      name: "",
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      isActive: true,
      organizationId: "",
      isAdmin: false,
      roleId: "",
      isSuperAdmin: false,
    },
  });

  // Watch organization selection to fetch roles
  const selectedOrgId = createForm.watch("organizationId");
  
  // Fetch roles for selected organization
  const { data: orgRoles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ["/api/super-admin/organizations", selectedOrgId, "roles"],
    queryFn: async () => {
      if (!selectedOrgId || selectedOrgId === "none") return [];
      const response = await fetch(`/api/super-admin/organizations/${selectedOrgId}/roles`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error("Failed to fetch roles");
      return response.json() as Promise<Role[]>;
    },
    enabled: !!selectedOrgId && selectedOrgId !== "none",
  });

  // Filter users
  const filteredUsers = users.filter((user) => {
    const term = (searchTerm || '').toLowerCase();
    const matchesSearch = (user.name || '').toLowerCase().includes(term) ||
                         (user.username || '').toLowerCase().includes(term) ||
                         (user.email || '').toLowerCase().includes(term);
    const matchesStatus = statusFilter === "all" || 
                         (statusFilter === "active" && user.isActive) ||
                         (statusFilter === "inactive" && !user.isActive);
    const matchesOrg = orgFilter === "all" || 
                      (user.organizations || []).some(org => org.id === orgFilter);
    return matchesSearch && matchesStatus && matchesOrg;
  });

  const handleViewUserDetails = (user: PlatformUser) => {
    setSelectedUser(user);
    setIsDetailDialogOpen(true);
  };

  const handleRemoveUserFromOrg = (userId: string, organizationId: string, orgName: string) => {
    if (confirm(`Remove user from ${orgName}? This action cannot be undone.`)) {
      removeUserMutation.mutate({ organizationId, userId });
    }
  };

  const userStats = {
    totalUsers: users.length,
    activeUsers: users.filter(u => u.isActive).length,
    usersWithMultipleOrgs: users.filter(u => (u.organizations || []).length > 1).length,
    adminUsers: users.filter(u => (u.organizations || []).some(org => org.isAdmin)).length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            User Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Platform-wide user search and organization assignment
          </p>
        </div>
        
        <div className="flex gap-2">
          <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-assign-user">
                <UserPlus className="h-4 w-4 mr-2" />
                Assign User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Assign User to Organization</DialogTitle>
                <DialogDescription>
                  Add an existing user to an organization with appropriate permissions
                </DialogDescription>
              </DialogHeader>
              <Form {...assignForm}>
                <form onSubmit={assignForm.handleSubmit((data) => assignUserMutation.mutate(data))} className="space-y-4">
                  <FormField
                    control={assignForm.control}
                    name="userId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>User</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-user">
                              <SelectValue placeholder="Select user" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {users.map((user) => (
                              <SelectItem key={user.id} value={user.id}>
                                {user.name} ({user.email})
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
                    name="organizationId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Organization</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-organization">
                              <SelectValue placeholder="Select organization" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {organizations.filter(org => org.isActive).map((org) => (
                              <SelectItem key={org.id} value={org.id}>
                                {org.name} ({org.domain})
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
                    name="isAdmin"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Organization Admin</FormLabel>
                          <div className="text-sm text-muted-foreground">
                            Grant admin privileges in this organization
                          </div>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-is-admin"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={assignUserMutation.isPending} data-testid="button-submit-assign">
                      {assignUserMutation.isPending ? "Assigning..." : "Assign User"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-user">
                <UserPlus className="h-4 w-4 mr-2" />
                Create User
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Platform User</DialogTitle>
                <DialogDescription>
                  Create a new user with optional organization assignment
                </DialogDescription>
              </DialogHeader>
              <Form {...createForm}>
                <form onSubmit={createForm.handleSubmit((data) => createUserMutation.mutate(data))} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={createForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="John Doe" data-testid="input-user-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={createForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="johndoe" data-testid="input-username" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={createForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" placeholder="john@example.com" data-testid="input-user-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={createForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input {...field} type="password" data-testid="input-user-password" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={createForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm Password</FormLabel>
                          <FormControl>
                            <Input {...field} type="password" data-testid="input-confirm-password" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={createForm.control}
                    name="organizationId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Initial Organization (Optional)</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            // Reset roleId when organization changes
                            createForm.setValue("roleId", "");
                            createForm.setValue("isAdmin", false);
                          }} 
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-initial-org">
                              <SelectValue placeholder="Select organization" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">No Organization (Homeless User)</SelectItem>
                            {organizations.filter(org => org.isActive).map((org) => (
                              <SelectItem key={org.id} value={org.id}>
                                {org.name} ({org.domain})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Show role selector when organization is selected */}
                  {selectedOrgId && selectedOrgId !== "none" && (
                    <FormField
                      control={createForm.control}
                      name="roleId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Security Role</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-role">
                                <SelectValue placeholder={rolesLoading ? "Loading roles..." : "Select a role"} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {orgRoles.map((role) => (
                                <SelectItem key={role.id} value={role.id}>
                                  {role.name}
                                  {role.description && ` - ${role.description}`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                          <div className="text-xs text-muted-foreground">
                            Select a specific security role for this user in the organization
                          </div>
                        </FormItem>
                      )}
                    />
                  )}

                  {/* Show super admin toggle for homeless users */}
                  {(!selectedOrgId || selectedOrgId === "none") && (
                    <FormField
                      control={createForm.control}
                      name="isSuperAdmin"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-purple-50 dark:bg-purple-950 border-purple-300 dark:border-purple-700">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base flex items-center gap-2">
                              <Crown className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                              Make Super Admin
                            </FormLabel>
                            <div className="text-sm text-muted-foreground">
                              Grant platform-wide super admin privileges (homeless users only)
                            </div>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-super-admin"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={createForm.control}
                      name="isActive"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Active User</FormLabel>
                            <div className="text-sm text-muted-foreground">
                              Allow user to log in
                            </div>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-user-active"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    {/* Only show isAdmin toggle for organization users when roleId is NOT selected */}
                    {selectedOrgId && selectedOrgId !== "none" && !createForm.watch("roleId") && (
                      <FormField
                        control={createForm.control}
                        name="isAdmin"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Organization Admin</FormLabel>
                              <div className="text-sm text-muted-foreground">
                                Admin in selected org (legacy)
                              </div>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="switch-initial-admin"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    )}
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createUserMutation.isPending} data-testid="button-submit-create-user">
                      {createUserMutation.isPending ? "Creating..." : "Create User"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold" data-testid="stat-total-users">{userStats.totalUsers}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Users</p>
                <p className="text-2xl font-bold" data-testid="stat-active-users">{userStats.activeUsers}</p>
              </div>
              <UserCheck className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Multi-Org Users</p>
                <p className="text-2xl font-bold" data-testid="stat-multi-org-users">{userStats.usersWithMultipleOrgs}</p>
              </div>
              <Building2 className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Admin Users</p>
                <p className="text-2xl font-bold" data-testid="stat-admin-users">{userStats.adminUsers}</p>
              </div>
              <Crown className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users by name, username, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-users"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48" data-testid="select-status-filter">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="inactive">Inactive Only</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={orgFilter} onValueChange={setOrgFilter}>
              <SelectTrigger className="w-48" data-testid="select-org-filter">
                <SelectValue placeholder="Filter by organization" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Organizations</SelectItem>
                {organizations.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Platform Users ({filteredUsers.length})
          </CardTitle>
          <CardDescription>
            Manage users across all tenant organizations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {usersLoading ? (
            <p className="text-center py-8 text-muted-foreground">Loading users...</p>
          ) : filteredUsers.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No users found</p>
          ) : (
            <div className="space-y-4">
              {filteredUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold" data-testid={`user-name-${user.id}`}>{user.name}</h3>
                      <Badge variant={user.isActive ? "default" : "secondary"}>
                        {user.isActive ? "Active" : "Inactive"}
                      </Badge>
                      {(user.organizations || []).some(org => org.isAdmin) && (
                        <Badge variant="outline">
                          <Crown className="h-3 w-3 mr-1" />
                          Admin
                        </Badge>
                      )}
                      <Badge variant="outline">
                        <Building2 className="h-3 w-3 mr-1" />
                        {(user.organizations || []).length} orgs
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {user.email}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Joined: {new Date(user.createdAt).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1">
                        <UserCheck className="h-3 w-3" />
                        {user.lastLoginAt ? `Last login: ${new Date(user.lastLoginAt).toLocaleDateString()}` : "Never logged in"}
                      </div>
                    </div>
                    
                    {/* Organization Memberships */}
                    {(user.organizations || []).length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(user.organizations || []).map((org) => (
                          <div key={org.id} className="flex items-center gap-2 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs">
                            <span>{org.name}</span>
                            {org.isAdmin && <Shield className="h-3 w-3 text-yellow-500" />}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveUserFromOrg(user.id, org.id, org.name)}
                              className="h-4 w-4 p-0 hover:bg-red-100 hover:text-red-600"
                              data-testid={`button-remove-${user.id}-${org.id}`}
                            >
                              <UserMinus className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewUserDetails(user)}
                      data-testid={`button-view-user-${user.id}`}
                    >
                      <Settings className="h-3 w-3 mr-1" />
                      Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Details Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>
              Complete information for {selectedUser?.name}
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Full Name</label>
                  <p className="text-sm text-muted-foreground">{selectedUser.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Username</label>
                  <p className="text-sm text-muted-foreground">{selectedUser.username}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <p className="text-sm">
                    <Badge variant={selectedUser.isActive ? "default" : "secondary"}>
                      {selectedUser.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Created</label>
                  <p className="text-sm text-muted-foreground">
                    {new Date(selectedUser.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Last Login</label>
                  <p className="text-sm text-muted-foreground">
                    {selectedUser.lastLoginAt ? new Date(selectedUser.lastLoginAt).toLocaleDateString() : "Never"}
                  </p>
                </div>
              </div>

              {/* Organization Memberships */}
              <div>
                <label className="text-sm font-medium mb-3 block">Organization Memberships</label>
                {(selectedUser.organizations || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Not a member of any organizations</p>
                ) : (
                  <div className="space-y-2">
                    {(selectedUser.organizations || []).map((org) => (
                      <div key={org.id} className="flex items-center justify-between p-3 border rounded">
                        <div>
                          <p className="font-medium">{org.name}</p>
                          <p className="text-sm text-muted-foreground">{org.domain}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{org.roleName}</Badge>
                          {org.isAdmin && (
                            <Badge variant="secondary">
                              <Crown className="h-3 w-3 mr-1" />
                              Admin
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}