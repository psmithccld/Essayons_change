import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Shield, Plus, Lock, Users, Key, AlertTriangle, Edit, Trash2, Search, UserCheck, Settings, FileText, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { insertRoleSchema, type Role, type User, type Permissions, type InsertRole, permissionsSchema } from "@shared/schema";
import { RouteGuard } from "@/components/auth/RouteGuard";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { usePermissions } from "@/hooks/use-permissions";

// Permission categories for better organization
const PERMISSION_CATEGORIES = {
  "User Management": {
    icon: Users,
    permissions: ["canViewUsers", "canCreateUsers", "canEditUsers", "canDeleteUsers"] as (keyof Permissions)[],
    description: "Control access to user management features"
  },
  "Project Management": {
    icon: FileText,
    permissions: ["canCreateProjects", "canEditAllProjects", "canDeleteProjects", "canViewAllProjects"] as (keyof Permissions)[],
    description: "Manage project creation and modification permissions"
  },
  "Role Management": {
    icon: Shield,
    permissions: ["canViewRoles", "canCreateRoles", "canEditRoles", "canDeleteRoles"] as (keyof Permissions)[],
    description: "Control role and permission management access"
  },
  "System Administration": {
    icon: Settings,
    permissions: ["canViewReports", "canManageSystem"] as (keyof Permissions)[],
    description: "System-level administrative capabilities"
  }
};

// Permission display names for better UX
const PERMISSION_LABELS: Record<keyof Permissions, string> = {
  canViewUsers: "View Users",
  canCreateUsers: "Create Users", 
  canEditUsers: "Edit Users",
  canDeleteUsers: "Delete Users",
  canCreateProjects: "Create Projects",
  canEditAllProjects: "Edit All Projects",
  canDeleteProjects: "Delete Projects",
  canViewAllProjects: "View All Projects",
  canViewRoles: "View Roles",
  canCreateRoles: "Create Roles",
  canEditRoles: "Edit Roles",
  canDeleteRoles: "Delete Roles",
  canViewReports: "View Reports",
  canManageSystem: "Manage System"
};

interface RoleFormDialogProps {
  role?: Role;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userPermissions?: Permissions;
}

function RoleFormDialog({ role, open, onOpenChange, userPermissions }: RoleFormDialogProps) {
  const { toast } = useToast();
  const isEditing = !!role;

  const form = useForm<InsertRole>({
    resolver: zodResolver(insertRoleSchema),
    defaultValues: {
      name: role?.name || "",
      description: role?.description || "",
      permissions: role?.permissions || permissionsSchema.parse({})
    }
  });

  const createRoleMutation = useMutation({
    mutationFn: (data: InsertRole) => apiRequest("/api/roles", {
      method: "POST",
      body: JSON.stringify(data)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Success",
        description: "Role created successfully"
      });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create role",
        variant: "destructive"
      });
    }
  });

  const updateRoleMutation = useMutation({
    mutationFn: (data: Partial<InsertRole>) => apiRequest(`/api/roles/${role!.id}`, {
      method: "PUT",
      body: JSON.stringify(data)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Success",
        description: "Role updated successfully"
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update role",
        variant: "destructive"
      });
    }
  });

  const onSubmit = (data: InsertRole) => {
    if (isEditing) {
      updateRoleMutation.mutate(data);
    } else {
      createRoleMutation.mutate(data);
    }
  };

  const togglePermission = (permission: keyof Permissions) => {
    const currentPermissions = form.getValues("permissions");
    form.setValue("permissions", {
      ...currentPermissions,
      [permission]: !currentPermissions[permission]
    });
  };

  const setPermissionCategory = (permissions: (keyof Permissions)[], enabled: boolean) => {
    const currentPermissions = form.getValues("permissions");
    const updates = permissions.reduce((acc, perm) => {
      // Only allow setting permissions that the user has themselves
      const userHasPermission = userPermissions?.[perm] || false;
      if (userHasPermission) {
        acc[perm] = enabled;
      }
      return acc;
    }, {} as Partial<Permissions>);
    
    form.setValue("permissions", {
      ...currentPermissions,
      ...updates
    });
  };

  const permissions = form.watch("permissions");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="role-form-dialog">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Role" : "Create Role"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter role name" {...field} data-testid="input-role-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Describe this role..." {...field} data-testid="input-role-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            <div>
              <h3 className="text-lg font-semibold mb-4">Permissions</h3>
              <div className="space-y-6">
                {Object.entries(PERMISSION_CATEGORIES).map(([categoryName, category]) => {
                  const Icon = category.icon;
                  const categoryPermissions = category.permissions.filter(perm => 
                    permissions.hasOwnProperty(perm)
                  );
                  const enabledCount = categoryPermissions.filter(perm => permissions[perm]).length;
                  const allEnabled = enabledCount === categoryPermissions.length;
                  const someEnabled = enabledCount > 0 && enabledCount < categoryPermissions.length;
                  
                  // Check if user has any permissions in this category
                  const userPermissionsInCategory = category.permissions.filter(perm => 
                    userPermissions?.[perm] || false
                  );
                  const categoryDisabled = userPermissionsInCategory.length === 0;

                  return (
                    <Card key={categoryName} className="border">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Icon className="w-5 h-5 text-primary" />
                            <div>
                              <CardTitle className="text-base">{categoryName}</CardTitle>
                              <p className="text-sm text-muted-foreground">{category.description}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-muted-foreground">
                              {enabledCount}/{categoryPermissions.length} enabled
                            </span>
                            <Switch
                              checked={allEnabled}
                              ref={someEnabled ? (ref) => {
                                if (ref) ref.indeterminate = true;
                              } : undefined}
                              onCheckedChange={(checked) => !categoryDisabled && setPermissionCategory(category.permissions, checked)}
                              disabled={categoryDisabled}
                              data-testid={`toggle-category-${categoryName.toLowerCase().replace(' ', '-')}`}
                            />
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {category.permissions.map((permission) => {
                            const userHasPermission = userPermissions?.[permission] || false;
                            const isDisabled = !userHasPermission;
                            
                            return (
                              <div key={permission} className={`flex items-center justify-between p-2 rounded border ${
                                isDisabled ? 'opacity-50 bg-muted/30' : ''
                              }`}>
                                <div className="flex-1">
                                  <Label htmlFor={permission} className={`cursor-pointer ${
                                    isDisabled ? 'text-muted-foreground cursor-not-allowed' : ''
                                  }`}>
                                    {PERMISSION_LABELS[permission]}
                                  </Label>
                                  {isDisabled && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      You don't have this permission to assign
                                    </p>
                                  )}
                                </div>
                                <Switch
                                  id={permission}
                                  checked={permissions[permission] || false}
                                  onCheckedChange={() => !isDisabled && togglePermission(permission)}
                                  disabled={isDisabled}
                                  data-testid={`toggle-${permission}`}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            <DialogFooter className="flex gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel-role"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createRoleMutation.isPending || updateRoleMutation.isPending}
                data-testid="button-save-role"
              >
                {createRoleMutation.isPending || updateRoleMutation.isPending ? "Saving..." : (isEditing ? "Update Role" : "Create Role")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

interface RoleCardProps {
  role: Role;
  userCount: number;
  onEdit: (role: Role) => void;
  onDelete: (role: Role) => void;
  userPermissions?: Permissions;
}

function RoleCard({ role, userCount, onEdit, onDelete, userPermissions }: RoleCardProps) {
  const permissions = role.permissions;
  const enabledPermissions = Object.values(permissions).filter(Boolean).length;
  const totalPermissions = Object.keys(permissions).length;

  const getRoleLevel = (enabledCount: number, totalCount: number) => {
    const percentage = (enabledCount / totalCount) * 100;
    if (percentage >= 80) return { level: "critical", label: "Admin" };
    if (percentage >= 60) return { level: "high", label: "Manager" };
    if (percentage >= 30) return { level: "medium", label: "User" };
    return { level: "low", label: "Viewer" };
  };

  const { level, label } = getRoleLevel(enabledPermissions, totalPermissions);

  return (
    <Card className="border hover:shadow-md transition-shadow" data-testid={`role-card-${role.id}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1">
            <Shield className="w-5 h-5 text-muted-foreground" />
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <h3 className="font-medium text-foreground">{role.name}</h3>
                <Badge 
                  variant={level === 'critical' ? 'destructive' : 
                         level === 'high' ? 'default' : 
                         level === 'medium' ? 'secondary' : 'outline'}
                  data-testid={`badge-role-level-${role.id}`}
                >
                  {label}
                </Badge>
              </div>
              {role.description && (
                <p className="text-sm text-muted-foreground mb-2">{role.description}</p>
              )}
              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                <span className="flex items-center" data-testid={`text-user-count-${role.id}`}>
                  <Users className="w-3 h-3 mr-1" />
                  {userCount} users
                </span>
                <span className="flex items-center" data-testid={`text-permission-count-${role.id}`}>
                  <Key className="w-3 h-3 mr-1" />
                  {enabledPermissions}/{totalPermissions} permissions
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {userPermissions?.canEditRoles && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(role)}
                data-testid={`button-edit-role-${role.id}`}
              >
                <Edit className="w-4 h-4" />
              </Button>
            )}
            {userPermissions?.canDeleteRoles && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    data-testid={`button-delete-role-${role.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Role</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete the "{role.name}" role? 
                      {userCount > 0 && (
                        <span className="block mt-2 text-destructive font-medium">
                          Warning: This role is assigned to {userCount} user(s). They will lose access when this role is deleted.
                        </span>
                      )}
                      This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => onDelete(role)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      data-testid={`button-confirm-delete-role-${role.id}`}
                    >
                      Delete Role
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SecurityManagementContent() {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | undefined>();
  const { toast } = useToast();

  // Fetch roles
  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ["/api/roles"]
  });

  // Fetch users
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["/api/users"]
  });

  // Fetch current user permissions
  const { data: userPermissionsData } = useQuery({
    queryKey: ["/api/users/me/permissions"]
  });

  const userPermissions = userPermissionsData?.permissions;

  const deleteRoleMutation = useMutation({
    mutationFn: (roleId: string) => apiRequest(`/api/roles/${roleId}`, {
      method: "DELETE"
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Success",
        description: "Role deleted successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error", 
        description: error.message || "Failed to delete role",
        variant: "destructive"
      });
    }
  });

  const handleEditRole = (role: Role) => {
    setEditingRole(role);
    setRoleDialogOpen(true);
  };

  const handleDeleteRole = (role: Role) => {
    deleteRoleMutation.mutate(role.id);
  };

  const handleCreateRole = () => {
    setEditingRole(undefined);
    setRoleDialogOpen(true);
  };

  // Calculate user counts per role
  const userCountByRole = users.reduce((acc: Record<string, number>, user: User) => {
    acc[user.roleId] = (acc[user.roleId] || 0) + 1;
    return acc;
  }, {});

  // Filter roles based on search
  const filteredRoles = roles.filter((role: Role) =>
    role.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (role.description?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Calculate metrics
  const totalPermissions = Object.keys(permissionsSchema.shape).length;
  const activeUsers = users.filter((user: User) => user.isActive).length;
  const totalRoles = roles.length;

  if (!userPermissions?.canViewRoles) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Card className="w-96">
          <CardContent className="p-6 text-center">
            <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">
              You don't have permission to view security and roles.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="security-management-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Security & Roles</h1>
          <p className="text-sm text-muted-foreground">Manage roles, permissions, and security settings</p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search roles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-64"
              data-testid="input-search-roles"
            />
          </div>
          {userPermissions?.canCreateRoles && (
            <Button onClick={handleCreateRole} data-testid="button-create-role">
              <Plus className="w-4 h-4 mr-2" />
              Create Role
            </Button>
          )}
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Roles</p>
                <p className="text-2xl font-bold text-foreground" data-testid="metric-total-roles">
                  {totalRoles}
                </p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Shield className="text-primary w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Permissions</p>
                <p className="text-2xl font-bold text-foreground" data-testid="metric-permissions">
                  {totalPermissions}
                </p>
              </div>
              <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center">
                <Key className="text-secondary w-6 h-6" />
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
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                <UserCheck className="text-accent w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Security Events</p>
                <p className="text-2xl font-bold text-foreground" data-testid="metric-security-events">
                  0
                </p>
              </div>
              <div className="w-12 h-12 bg-destructive/10 rounded-lg flex items-center justify-center">
                <AlertTriangle className="text-destructive w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Role Management */}
      <Card>
        <CardHeader>
          <CardTitle>Role Management</CardTitle>
          <p className="text-sm text-muted-foreground">
            Configure roles and permissions to control access to features and data
          </p>
        </CardHeader>
        <CardContent>
          {rolesLoading || usersLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-20 bg-muted/50 rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRoles.length === 0 ? (
                <div className="text-center py-8">
                  <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    {searchQuery ? "No roles found" : "No roles yet"}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery 
                      ? "Try adjusting your search criteria"
                      : "Create your first role to get started with access control"
                    }
                  </p>
                  {!searchQuery && userPermissions?.canCreateRoles && (
                    <Button onClick={handleCreateRole} data-testid="button-create-first-role">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Role
                    </Button>
                  )}
                </div>
              ) : (
                filteredRoles.map((role: Role) => (
                  <RoleCard
                    key={role.id}
                    role={role}
                    userCount={userCountByRole[role.id] || 0}
                    onEdit={handleEditRole}
                    onDelete={handleDeleteRole}
                    userPermissions={userPermissions}
                  />
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Role Form Dialog */}
      <RoleFormDialog
        role={editingRole}
        open={roleDialogOpen}
        onOpenChange={(open) => {
          setRoleDialogOpen(open);
          if (!open) setEditingRole(undefined);
        }}
        userPermissions={userPermissions}
      />
    </div>
  );
}

export default function SecurityManagement() {
  return (
    <RouteGuard permission="canViewRoles">
      <SecurityManagementContent />
    </RouteGuard>
  );
}