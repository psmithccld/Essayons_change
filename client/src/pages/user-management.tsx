import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Users, Plus, Shield, UserCheck, Search, MoreHorizontal, Edit, Trash2, UserPlus, Eye, EyeOff } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { insertUserSchema, insertUserGroupMembershipSchema, insertUserPermissionSchema, type User, type Role, type UserInitiativeAssignment, type Permissions, type UserGroup, type UserGroupMembership, type UserPermission } from "@shared/schema";
import { RouteGuard } from "@/components/auth/RouteGuard";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { usePermissions } from "@/hooks/use-permissions";

// Form validation schemas
const createUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  username: z.string().min(1, "Username is required"),
  email: z.string().email("Must be a valid email address"),
  roleId: z.string().uuid("Please select a role"),
  isActive: z.boolean().default(true),
  password: z.string().min(8, "Password must be at least 8 characters long"),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

const editUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  username: z.string().min(1, "Username is required"),
  roleId: z.string().uuid("Please select a role"),
  isActive: z.boolean()
});

type CreateUserFormData = z.infer<typeof createUserSchema>;
type EditUserFormData = z.infer<typeof editUserSchema>;

function UserManagementContent() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [viewingUserInitiatives, setViewingUserInitiatives] = useState<User | null>(null);
  const [viewingUserSecurity, setViewingUserSecurity] = useState<User | null>(null);
  const [isGroupAssignmentOpen, setIsGroupAssignmentOpen] = useState(false);
  const [isIndividualPermissionsOpen, setIsIndividualPermissionsOpen] = useState(false);
  const [selectedUserForSecurity, setSelectedUserForSecurity] = useState<User | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch users with roles
  const { data: users = [], isLoading: usersLoading } = useQuery<(Omit<User, 'passwordHash'> & { role: Role })[]>({
    queryKey: ["/api/users/with-roles"],
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Fetch roles for dropdowns
  const { data: roles = [] } = useQuery<Role[]>({
    queryKey: ["/api/roles"]
  });

  // RBAC: Fetch current user permissions for UI gating
  const { data: userPermissions, isLoading: permissionsLoading } = useQuery<{
    user: Pick<User, 'id' | 'username' | 'name' | 'roleId' | 'isActive'>;
    permissions: Permissions;
  }>({
    queryKey: ["/api/users/me/permissions"]
  });

  // Fetch user initiatives when viewing
  const { data: userInitiatives = [] } = useQuery<UserInitiativeAssignment[]>({
    queryKey: ["/api/users", viewingUserInitiatives?.id, "initiatives"],
    enabled: !!viewingUserInitiatives?.id
  });

  // Security Management Center Integration - Fetch user groups
  const { data: userGroups = [] } = useQuery<UserGroup[]>({
    queryKey: ["/api/user-groups"],
    enabled: !!userPermissions?.permissions?.canSeeGroups
  });

  // Fetch user group memberships for selected user
  const { data: userGroupMemberships = [] } = useQuery<UserGroupMembership[]>({
    queryKey: ["/api/users", selectedUserForSecurity?.id, "groups"],
    enabled: !!selectedUserForSecurity?.id && !!userPermissions?.permissions?.canSeeGroups
  });

  // Fetch individual user permissions for selected user
  const { data: userIndividualPermissions } = useQuery<UserPermission | null>({
    queryKey: ["/api/users", selectedUserForSecurity?.id, "individual-permissions"],
    enabled: !!selectedUserForSecurity?.id && !!userPermissions?.permissions?.canSeeSecuritySettings
  });

  // Fetch user security summary for selected user
  const { data: userSecuritySummary } = useQuery<{
    rolePermissions: Permissions;
    groupPermissions: Permissions[];
    individualPermissions?: Permissions;
    resolvedPermissions: Permissions;
  }>({
    queryKey: ["/api/users", selectedUserForSecurity?.id, "security-summary"],
    enabled: !!selectedUserForSecurity?.id && !!userPermissions?.permissions?.canSeeSecuritySettings
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: (userData: Omit<CreateUserFormData, 'confirmPassword'>) => apiRequest("POST", "/api/users", userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/with-roles"] });
      setIsCreateDialogOpen(false);
      toast({ title: "Success", description: "User created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create user", variant: "destructive" });
    }
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: ({ id, ...userData }: EditUserFormData & { id: string }) => 
      apiRequest("PUT", `/api/users/${id}`, userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/with-roles"] });
      setEditingUser(null);
      toast({ title: "Success", description: "User updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update user", variant: "destructive" });
    }
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: (userId: string) => apiRequest("DELETE", `/api/users/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/with-roles"] });
      toast({ title: "Success", description: "User deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete user", variant: "destructive" });
    }
  });

  // Security Management Center Mutations

  // Assign user to group mutation
  const assignUserToGroupMutation = useMutation({
    mutationFn: ({ userId, groupId }: { userId: string, groupId: string }) => 
      apiRequest("POST", "/api/user-group-memberships", { userId, groupId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", selectedUserForSecurity?.id, "groups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", selectedUserForSecurity?.id, "security-summary"] });
      toast({ title: "Success", description: "User assigned to group successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to assign user to group", variant: "destructive" });
    }
  });

  // Remove user from group mutation
  const removeUserFromGroupMutation = useMutation({
    mutationFn: ({ userId, groupId }: { userId: string, groupId: string }) => 
      apiRequest("DELETE", "/api/user-group-memberships/remove", { userId, groupId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", selectedUserForSecurity?.id, "groups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", selectedUserForSecurity?.id, "security-summary"] });
      toast({ title: "Success", description: "User removed from group successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to remove user from group", variant: "destructive" });
    }
  });

  // Set individual user permissions mutation
  const setIndividualPermissionsMutation = useMutation({
    mutationFn: ({ userId, permissions }: { userId: string, permissions: Permissions }) => 
      apiRequest("POST", `/api/users/${userId}/individual-permissions`, { permissions }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", selectedUserForSecurity?.id, "individual-permissions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", selectedUserForSecurity?.id, "security-summary"] });
      toast({ title: "Success", description: "Individual permissions set successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to set individual permissions", variant: "destructive" });
    }
  });

  // Clear individual user permissions mutation
  const clearIndividualPermissionsMutation = useMutation({
    mutationFn: (userId: string) => 
      apiRequest("DELETE", `/api/users/${userId}/individual-permissions`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", selectedUserForSecurity?.id, "individual-permissions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", selectedUserForSecurity?.id, "security-summary"] });
      toast({ title: "Success", description: "Individual permissions cleared successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to clear individual permissions", variant: "destructive" });
    }
  });

  // Forms
  const createForm = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      name: "",
      username: "",
      password: "",
      confirmPassword: "",
      roleId: "",
      isActive: true
    }
  });

  const editForm = useForm<EditUserFormData>({
    resolver: zodResolver(editUserSchema)
  });

  // Filter users based on search and filters
  const filteredUsers = users.filter((user: any) => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.username.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = selectedRole === "all" || user.role?.name === selectedRole;
    const matchesStatus = selectedStatus === "all" || 
                         (selectedStatus === "active" && user.isActive) ||
                         (selectedStatus === "inactive" && !user.isActive);
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Calculate metrics
  const totalUsers = users.length;
  const activeUsers = users.filter((user: any) => user.isActive).length;
  const adminUsers = users.filter((user: any) => user.role?.name?.toLowerCase().includes('admin')).length;

  const handleCreateUser = (data: CreateUserFormData) => {
    const { confirmPassword, ...userData } = data;
    createUserMutation.mutate(userData);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    editForm.reset({
      name: user.name,
      username: user.username,
      roleId: user.roleId,
      isActive: user.isActive
    });
  };

  const handleUpdateUser = (data: EditUserFormData) => {
    if (!editingUser) return;
    updateUserMutation.mutate({ ...data, id: editingUser.id });
  };

  const handleDeleteUser = (userId: string) => {
    deleteUserMutation.mutate(userId);
  };

  const formatLastLogin = (lastLogin: string | null) => {
    if (!lastLogin) return "Never";
    return new Date(lastLogin).toLocaleDateString();
  };

  return (
    <div className="space-y-6" data-testid="user-management-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">User Management</h1>
          <p className="text-sm text-muted-foreground">Manage users, roles, and permissions</p>
        </div>
        {/* RBAC: Only show Add User button if user has canModifyUsers permission */}
        {userPermissions?.permissions?.canModifyUsers && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-user">
                <Plus className="w-4 h-4 mr-2" />
                Add User
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
            </DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(handleCreateUser)} className="space-y-4">
                <FormField
                  control={createForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} data-testid="input-user-name" />
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
                        <Input placeholder="john.doe" {...field} data-testid="input-user-username" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} data-testid="input-user-password" />
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
                        <Input type="password" placeholder="••••••••" {...field} data-testid="input-user-confirm-password" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="roleId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} data-testid="select-user-role">
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {roles.filter(role => role.id && role.id.trim() !== '').map((role: Role) => (
                            <SelectItem key={role.id} value={role.id}>
                              {role.name}
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
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Active User</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          User can log in and access the system
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
                    disabled={createUserMutation.isPending}
                    data-testid="button-submit-create"
                  >
                    {createUserMutation.isPending ? "Creating..." : "Create User"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        )}
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold text-foreground" data-testid="metric-total-users">
                  {totalUsers}
                </p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Users className="text-primary w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Users</p>
                <p className="text-2xl font-bold text-foreground" data-testid="metric-active-users">
                  {activeUsers}
                </p>
              </div>
              <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center">
                <UserCheck className="text-secondary w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Admin Users</p>
                <p className="text-2xl font-bold text-foreground" data-testid="metric-admin-users">
                  {adminUsers}
                </p>
              </div>
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                <Shield className="text-accent w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-users"
              />
            </div>
            <Select value={selectedRole} onValueChange={setSelectedRole} data-testid="select-filter-role">
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {roles.filter(role => role.id && role.id.trim() !== '' && role.name && role.name.trim() !== '').map((role: Role) => (
                  <SelectItem key={role.id} value={role.name}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedStatus} onValueChange={setSelectedStatus} data-testid="select-filter-status">
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {usersLoading ? (
            <div className="text-center py-8">Loading users...</div>
          ) : (
            <Table data-testid="table-users">
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user: any) => (
                  <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.username}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{user.role?.name || "No Role"}</Badge>
                    </TableCell>
                    <TableCell>
                      {user.isActive ? (
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          <UserCheck className="w-3 h-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <EyeOff className="w-3 h-3 mr-1" />
                          Inactive
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{formatLastLogin(user.lastLoginAt)}</TableCell>
                    <TableCell>
                      {/* RBAC: Only show actions dropdown if user has any management permissions */}
                      {(userPermissions?.permissions?.canEditUsers || userPermissions?.permissions?.canDeleteUsers) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0" data-testid={`button-actions-${user.id}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {/* RBAC: Only show edit option if user has canEditUsers permission */}
                            {userPermissions?.permissions?.canEditUsers && (
                              <DropdownMenuItem onClick={() => handleEditUser(user)} data-testid={`button-edit-${user.id}`}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => setViewingUserInitiatives(user)} data-testid={`button-initiatives-${user.id}`}>
                              <UserPlus className="mr-2 h-4 w-4" />
                              View Initiatives
                            </DropdownMenuItem>

                            {/* Security Management Center Integration */}
                            {userPermissions?.permissions?.canSeeSecuritySettings && (
                              <DropdownMenuItem onClick={() => {
                                setSelectedUserForSecurity(user);
                                setViewingUserSecurity(user);
                              }} data-testid={`button-security-${user.id}`}>
                                <Shield className="mr-2 h-4 w-4" />
                                Security Overview
                              </DropdownMenuItem>
                            )}

                            {userPermissions?.permissions?.canSeeGroups && (
                              <DropdownMenuItem onClick={() => {
                                setSelectedUserForSecurity(user);
                                setIsGroupAssignmentOpen(true);
                              }} data-testid={`button-groups-${user.id}`}>
                                <Users className="mr-2 h-4 w-4" />
                                Group Assignments
                              </DropdownMenuItem>
                            )}

                            {userPermissions?.permissions?.canSeeSecuritySettings && (
                              <DropdownMenuItem onClick={() => {
                                setSelectedUserForSecurity(user);
                                setIsIndividualPermissionsOpen(true);
                              }} data-testid={`button-permissions-${user.id}`}>
                                <UserCheck className="mr-2 h-4 w-4" />
                                Individual Permissions
                              </DropdownMenuItem>
                            )}
                            {/* RBAC: Only show delete option if user has canDeleteUsers permission */}
                            {userPermissions?.permissions?.canDeleteUsers && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem onSelect={(e) => e.preventDefault()} data-testid={`button-delete-${user.id}`}>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete User</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete {user.name}? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteUser(user.id)}
                                      className="bg-red-600 hover:bg-red-700"
                                      data-testid="button-confirm-delete"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No users found matching your criteria.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleUpdateUser)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-edit-user-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-edit-user-username" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="roleId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} data-testid="select-edit-user-role">
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {roles.filter(role => role.id && role.id.trim() !== '').map((role: Role) => (
                          <SelectItem key={role.id} value={role.id}>
                            {role.name}
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
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Active User</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        User can log in and access the system
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-edit-user-active"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setEditingUser(null)}
                  data-testid="button-cancel-edit"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateUserMutation.isPending}
                  data-testid="button-submit-edit"
                >
                  {updateUserMutation.isPending ? "Updating..." : "Update User"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* User Initiatives Dialog */}
      <Dialog open={!!viewingUserInitiatives} onOpenChange={() => setViewingUserInitiatives(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Initiative Assignments - {viewingUserInitiatives?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {userInitiatives.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                This user is not assigned to any initiatives.
              </div>
            ) : (
              <div className="space-y-2">
                {userInitiatives.map((assignment: any) => (
                  <div key={assignment.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">Project Assignment</p>
                      <p className="text-sm text-muted-foreground">
                        Role: {assignment.role} • Assigned: {new Date(assignment.assignedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="outline">{assignment.role}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Security Overview Dialog */}
      <Dialog open={!!viewingUserSecurity} onOpenChange={() => {setViewingUserSecurity(null); setSelectedUserForSecurity(null);}}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Security Overview - {viewingUserSecurity?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {userSecuritySummary && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <Shield className="w-8 h-8 text-primary" />
                        <div>
                          <p className="font-semibold">Role Permissions</p>
                          <p className="text-sm text-muted-foreground">
                            {Object.values(userSecuritySummary.rolePermissions).filter(Boolean).length} enabled
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <Users className="w-8 h-8 text-secondary" />
                        <div>
                          <p className="font-semibold">Group Permissions</p>
                          <p className="text-sm text-muted-foreground">
                            {userSecuritySummary.groupPermissions.length} groups
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <UserCheck className="w-8 h-8 text-accent" />
                        <div>
                          <p className="font-semibold">Individual Permissions</p>
                          <p className="text-sm text-muted-foreground">
                            {userSecuritySummary.individualPermissions ? 
                              Object.values(userSecuritySummary.individualPermissions).filter(Boolean).length + " enabled" : 
                              "None set"}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Resolved Permissions Summary</h3>
                  <div className="text-sm text-muted-foreground mb-4">
                    These are the final permissions this user has, combining role, group, and individual permissions with "most permissive wins" logic.
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(userSecuritySummary.resolvedPermissions).map(([permission, enabled]) => (
                      <div key={permission} className={`p-3 rounded-lg border ${enabled ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                        <div className="flex items-center space-x-2">
                          {enabled ? (
                            <UserCheck className="w-4 h-4 text-green-600" />
                          ) : (
                            <UserCheck className="w-4 h-4 text-red-400" />
                          )}
                          <span className="text-sm font-medium">{permission}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Group Assignment Dialog */}
      <Dialog open={isGroupAssignmentOpen} onOpenChange={() => {setIsGroupAssignmentOpen(false); setSelectedUserForSecurity(null);}}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Group Assignments - {selectedUserForSecurity?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Current Group Memberships */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Current Groups</h3>
              {userGroupMemberships.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  This user is not assigned to any groups.
                </div>
              ) : (
                <div className="space-y-2">
                  {userGroupMemberships.map((membership: UserGroupMembership) => {
                    const group = userGroups.find(g => g.id === membership.groupId);
                    return (
                      <div key={membership.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{group?.name || membership.groupId}</p>
                          <p className="text-sm text-muted-foreground">
                            {group?.description || 'No description'}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeUserFromGroupMutation.mutate({
                            userId: selectedUserForSecurity!.id,
                            groupId: membership.groupId
                          })}
                          disabled={removeUserFromGroupMutation.isPending}
                        >
                          Remove
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Available Groups */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Available Groups</h3>
              <div className="space-y-2">
                {userGroups
                  .filter(group => !userGroupMemberships.some(m => m.groupId === group.id))
                  .map((group: UserGroup) => (
                    <div key={group.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{group.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {group.description || 'No description'}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => assignUserToGroupMutation.mutate({
                          userId: selectedUserForSecurity!.id,
                          groupId: group.id
                        })}
                        disabled={assignUserToGroupMutation.isPending}
                      >
                        Assign
                      </Button>
                    </div>
                  ))
                }
              </div>
              {userGroups.filter(group => !userGroupMemberships.some(m => m.groupId === group.id)).length === 0 && (
                <div className="text-center py-4 text-muted-foreground">
                  All available groups are already assigned.
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Individual Permissions Dialog */}
      <Dialog open={isIndividualPermissionsOpen} onOpenChange={() => {setIsIndividualPermissionsOpen(false); setSelectedUserForSecurity(null);}}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Individual Permissions - {selectedUserForSecurity?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="text-sm text-muted-foreground">
              Individual permissions override role and group permissions. Use sparingly for specific user needs.
            </div>

            {userIndividualPermissions ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Current Individual Permissions</h3>
                  <Button
                    variant="outline"
                    onClick={() => clearIndividualPermissionsMutation.mutate(selectedUserForSecurity!.id)}
                    disabled={clearIndividualPermissionsMutation.isPending}
                  >
                    Clear All
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(userIndividualPermissions.permissions).map(([permission, enabled]) => (
                    <div key={permission} className={`p-3 rounded-lg border ${enabled ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                      <div className="flex items-center space-x-2">
                        {enabled ? (
                          <UserCheck className="w-4 h-4 text-green-600" />
                        ) : (
                          <UserCheck className="w-4 h-4 text-gray-400" />
                        )}
                        <span className="text-sm font-medium">{permission}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <UserCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Individual Permissions Set</h3>
                <p className="text-muted-foreground mb-4">
                  This user relies on role and group permissions only.
                </p>
                <Button
                  onClick={() => {
                    // Set default permissions (all false)
                    const defaultPermissions: Permissions = {} as Permissions;
                    Object.keys(userPermissions?.permissions || {}).forEach(key => {
                      defaultPermissions[key as keyof Permissions] = false;
                    });
                    setIndividualPermissionsMutation.mutate({
                      userId: selectedUserForSecurity!.id,
                      permissions: defaultPermissions
                    });
                  }}
                  disabled={setIndividualPermissionsMutation.isPending}
                >
                  Set Individual Permissions
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function UserManagement() {
  return (
    <RouteGuard permission="canSeeUsers">
      <UserManagementContent />
    </RouteGuard>
  );
}