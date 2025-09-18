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
import { insertRoleSchema, insertUserGroupSchema, insertUserGroupMembershipSchema, insertUserPermissionSchema, type Role, type User, type UserGroup, type UserGroupMembership, type UserPermission, type Permissions, type InsertRole, type InsertUserGroup, type InsertUserGroupMembership, type InsertUserPermission, permissionsSchema } from "@shared/schema";
import { RouteGuard } from "@/components/auth/RouteGuard";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { usePermissions } from "@/hooks/use-permissions";

// Permission categories for better organization
const PERMISSION_CATEGORIES = {
  "User Management": {
    icon: Users,
    permissions: ["canSeeUsers", "canModifyUsers", "canEditUsers", "canDeleteUsers"] as (keyof Permissions)[],
    description: "Control access to user management features"
  },
  "Project Management": {
    icon: FileText,
    permissions: ["canModifyProjects", "canEditAllProjects", "canDeleteProjects", "canSeeAllProjects"] as (keyof Permissions)[],
    description: "Manage project creation and modification permissions"
  },
  "Role Management": {
    icon: Shield,
    permissions: ["canSeeRoles", "canModifyRoles", "canEditRoles", "canDeleteRoles"] as (keyof Permissions)[],
    description: "Control role and permission management access"
  },
  "System Administration": {
    icon: Settings,
    permissions: ["canSeeReports", "canManageSystem"] as (keyof Permissions)[],
    description: "System-level administrative capabilities"
  }
};

// Permission display names for better UX
const PERMISSION_LABELS: Record<keyof Permissions, string> = {
  // User Management
  canSeeUsers: "View Users",
  canModifyUsers: "Create Users", 
  canEditUsers: "Edit Users",
  canDeleteUsers: "Delete Users",
  
  // Project Management
  canSeeProjects: "View Projects",
  canModifyProjects: "Create Projects",
  canEditProjects: "Edit Projects",
  canDeleteProjects: "Delete Projects",
  canSeeAllProjects: "View All Projects",
  canModifyAllProjects: "Create All Projects",
  canEditAllProjects: "Edit All Projects",
  canDeleteAllProjects: "Delete All Projects",
  
  // Tasks Management
  canSeeTasks: "View Tasks",
  canModifyTasks: "Create Tasks",
  canEditTasks: "Edit Tasks",
  canDeleteTasks: "Delete Tasks",
  
  // Stakeholder Management
  canSeeStakeholders: "View Stakeholders",
  canModifyStakeholders: "Create Stakeholders",
  canEditStakeholders: "Edit Stakeholders",
  canDeleteStakeholders: "Delete Stakeholders",
  
  // RAID Logs Management
  canSeeRaidLogs: "View RAID Logs",
  canModifyRaidLogs: "Create RAID Logs",
  canEditRaidLogs: "Edit RAID Logs",
  canDeleteRaidLogs: "Delete RAID Logs",
  
  // Communications Management
  canSeeCommunications: "View Communications",
  canModifyCommunications: "Create Communications",
  canEditCommunications: "Edit Communications",
  canDeleteCommunications: "Delete Communications",
  
  // Survey Management
  canSeeSurveys: "View Surveys",
  canModifySurveys: "Create Surveys",
  canEditSurveys: "Edit Surveys",
  canDeleteSurveys: "Delete Surveys",
  
  // Mind Maps Management
  canSeeMindMaps: "View Mind Maps",
  canModifyMindMaps: "Create Mind Maps",
  canEditMindMaps: "Edit Mind Maps",
  canDeleteMindMaps: "Delete Mind Maps",
  
  // Process Maps Management
  canSeeProcessMaps: "View Process Maps",
  canModifyProcessMaps: "Create Process Maps",
  canEditProcessMaps: "Edit Process Maps",
  canDeleteProcessMaps: "Delete Process Maps",
  
  // Gantt Charts Management
  canSeeGanttCharts: "View Gantt Charts",
  canModifyGanttCharts: "Create Gantt Charts",
  canEditGanttCharts: "Edit Gantt Charts",
  canDeleteGanttCharts: "Delete Gantt Charts",
  
  // Checklist Templates Management
  canSeeChecklistTemplates: "View Checklists",
  canModifyChecklistTemplates: "Create Checklists",
  canEditChecklistTemplates: "Edit Checklists",
  canDeleteChecklistTemplates: "Delete Checklists",
  
  // Reports and Analytics
  canSeeReports: "View Reports",
  canModifyReports: "Create Reports",
  canEditReports: "Edit Reports",
  canDeleteReports: "Delete Reports",
  
  // Security and Role Management
  canSeeRoles: "View Roles",
  canModifyRoles: "Create Roles",
  canEditRoles: "Edit Roles",
  canDeleteRoles: "Delete Roles",
  canSeeGroups: "View Groups",
  canModifyGroups: "Create Groups",
  canEditGroups: "Edit Groups",
  canDeleteGroups: "Delete Groups",
  canSeeSecuritySettings: "View Security Settings",
  canModifySecuritySettings: "Create Security Settings",
  canEditSecuritySettings: "Edit Security Settings",
  canDeleteSecuritySettings: "Delete Security Settings",
  
  // Email System Permissions
  canSendEmails: "Send Emails",
  canSendBulkEmails: "Send Bulk Emails",
  canSendSystemEmails: "Send System Emails",
  canSeeEmailLogs: "View Email Logs",
  canModifyEmailTemplates: "Create Email Templates",
  canEditEmailSettings: "Edit Email Settings",
  
  // System Administration
  canSeeSystemSettings: "View System Settings",
  canModifySystemSettings: "Create System Settings",
  canEditSystemSettings: "Edit System Settings",
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
    mutationFn: (data: InsertRole) => apiRequest("POST", "/api/roles", data),
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
    mutationFn: (data: Partial<InsertRole>) => apiRequest("PUT", `/api/roles/${role!.id}`, data),
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

// Roles Tab Content Component
function RolesTabContent({
  roles,
  rolesLoading,
  usersLoading,
  userCountByRole,
  totalRoles,
  totalPermissions,
  activeUsers,
  searchQuery,
  handleCreateRole,
  handleEditRole,
  handleDeleteRole,
  userPermissions
}: {
  roles: Role[];
  rolesLoading: boolean;
  usersLoading: boolean;
  userCountByRole: Record<string, number>;
  totalRoles: number;
  totalPermissions: number;
  activeUsers: number;
  searchQuery: string;
  handleCreateRole: () => void;
  handleEditRole: (role: Role) => void;
  handleDeleteRole: (role: Role) => void;
  userPermissions?: Permissions;
}) {
  return (
    <>
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
              {roles.length === 0 ? (
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
                  {!searchQuery && userPermissions?.canModifyRoles && (
                    <Button onClick={handleCreateRole} data-testid="button-create-first-role">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Role
                    </Button>
                  )}
                </div>
              ) : (
                roles.map((role: Role) => (
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
    </>
  );
}


// User Permission Override Dialog Component
interface UserPermissionDialogProps {
  user?: User & { role?: Role; groupMemberships?: UserGroupMembership[]; individualPermissions?: UserPermission };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userPermissions?: Permissions;
}

function UserPermissionDialog({ user, open, onOpenChange, userPermissions }: UserPermissionDialogProps) {
  const { toast } = useToast();

  // Fetch individual permissions for this user
  const { data: individualPermissions } = useQuery<UserPermission[]>({
    queryKey: ["/api/user-permissions", user?.id],
    enabled: open && !!user
  });

  // Fetch group memberships for this user
  const { data: userGroupMemberships = [] } = useQuery<UserGroupMembership[]>({
    queryKey: ["/api/group-memberships", user?.id],
    enabled: open && !!user
  });

  // Fetch all groups to resolve group permissions
  const { data: groups = [] } = useQuery<UserGroup[]>({
    queryKey: ["/api/groups"],
    enabled: open && !!user
  });

  const form = useForm<InsertUserPermission>({
    resolver: zodResolver(insertUserPermissionSchema),
    defaultValues: {
      userId: user?.id || "",
      permissions: individualPermissions?.[0]?.permissions || permissionsSchema.parse({})
    }
  });

  const upsertPermissionMutation = useMutation({
    mutationFn: (data: InsertUserPermission) => {
      const existingPermission = individualPermissions?.[0];
      const url = existingPermission 
        ? `/api/user-permissions/${existingPermission.id}` 
        : "/api/user-permissions";
      const method = existingPermission ? "PUT" : "POST";
      
      return apiRequest(method, url, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-permissions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Success",
        description: "User permissions updated successfully"
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user permissions",
        variant: "destructive"
      });
    }
  });

  if (!user) return null;

  // Calculate resolved permissions (most permissive wins)
  const resolveUserPermissions = (): Permissions => {
    const resolved = permissionsSchema.parse({});
    
    // Start with role permissions
    if (user.role?.permissions) {
      Object.keys(resolved).forEach(key => {
        const permKey = key as keyof Permissions;
        resolved[permKey] = user.role!.permissions[permKey] || false;
      });
    }

    // Add group permissions (most permissive)
    const userGroups = groups.filter(group => 
      userGroupMemberships.some(membership => membership.groupId === group.id)
    );
    userGroups.forEach(group => {
      Object.keys(resolved).forEach(key => {
        const permKey = key as keyof Permissions;
        resolved[permKey] = resolved[permKey] || group.permissions[permKey] || false;
      });
    });

    // Add individual permissions (most permissive)
    if (individualPermissions?.[0]?.permissions) {
      Object.keys(resolved).forEach(key => {
        const permKey = key as keyof Permissions;
        resolved[permKey] = resolved[permKey] || individualPermissions[0].permissions[permKey] || false;
      });
    }

    return resolved;
  };

  const resolvedPermissions = resolveUserPermissions();
  const individualPerms = individualPermissions?.[0]?.permissions || permissionsSchema.parse({});
  const permissions = form.watch("permissions");

  const togglePermission = (permission: keyof Permissions) => {
    const currentPermissions = form.getValues("permissions");
    form.setValue("permissions", {
      ...currentPermissions,
      [permission]: !currentPermissions[permission]
    });
  };

  const onSubmit = (data: InsertUserPermission) => {
    upsertPermissionMutation.mutate({
      ...data,
      userId: user.id
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto" data-testid="user-permission-dialog">
        <DialogHeader>
          <DialogTitle>Manage Permissions - {user.name}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Override individual permissions for this user. Individual permissions take precedence over role and group permissions.
          </p>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Current Resolved Permissions */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Current Resolved Permissions</h3>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {Object.entries(PERMISSION_CATEGORIES).map(([categoryName, category]) => {
                const enabledInCategory = category.permissions.filter(perm => resolvedPermissions[perm]).length;
                
                return (
                  <Card key={categoryName} className="border">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <category.icon className="w-4 h-4 text-muted-foreground" />
                          <CardTitle className="text-sm">{categoryName}</CardTitle>
                        </div>
                        <Badge variant="outline" data-testid={`resolved-category-count-${categoryName.toLowerCase().replace(' ', '-')}`}>
                          {enabledInCategory}/{category.permissions.length}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-1">
                        {category.permissions.map((permission) => {
                          const hasRole = user.role?.permissions[permission] || false;
                          const hasGroup = groups.some(group => 
                            userGroupMemberships.some(m => m.groupId === group.id) && 
                            group.permissions[permission]
                          );
                          const hasIndividual = individualPerms[permission] || false;
                          const resolved = resolvedPermissions[permission];

                          return (
                            <div key={permission} className="flex items-center justify-between text-xs">
                              <span className={resolved ? "text-green-600 font-medium" : "text-muted-foreground"}>
                                {PERMISSION_LABELS[permission]}
                              </span>
                              <div className="flex items-center space-x-1">
                                {hasRole && <Badge variant="outline" className="text-xs">Role</Badge>}
                                {hasGroup && <Badge variant="outline" className="text-xs">Group</Badge>}
                                {hasIndividual && <Badge variant="default" className="text-xs">Individual</Badge>}
                                {resolved && <Badge variant="default" className="text-xs bg-green-100 text-green-800">✓</Badge>}
                              </div>
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

          {/* Individual Permission Overrides */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Individual Permission Overrides</h3>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {Object.entries(PERMISSION_CATEGORIES).map(([categoryName, category]) => {
                    const enabledInCategory = category.permissions.filter(perm => permissions[perm]).length;
                    
                    return (
                      <Card key={categoryName} className="border">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <category.icon className="w-4 h-4 text-primary" />
                              <CardTitle className="text-sm">{categoryName}</CardTitle>
                            </div>
                            <Badge variant="outline" data-testid={`individual-category-count-${categoryName.toLowerCase().replace(' ', '-')}`}>
                              {enabledInCategory}/{category.permissions.length}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="space-y-2">
                            {category.permissions.map((permission) => {
                              const userHasPermission = userPermissions?.[permission] || false;
                              const isDisabled = !userHasPermission;
                              
                              return (
                                <div key={permission} className={`flex items-center justify-between p-2 rounded border ${
                                  isDisabled ? 'opacity-50 bg-muted/30' : ''
                                }`}>
                                  <Label htmlFor={`user-${permission}`} className={`text-xs cursor-pointer ${
                                    isDisabled ? 'text-muted-foreground cursor-not-allowed' : ''
                                  }`}>
                                    {PERMISSION_LABELS[permission]}
                                  </Label>
                                  <Switch
                                    id={`user-${permission}`}
                                    checked={permissions[permission] || false}
                                    onCheckedChange={() => !isDisabled && togglePermission(permission)}
                                    disabled={isDisabled}
                                    data-testid={`toggle-user-${permission}`}
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

                <DialogFooter className="flex gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => onOpenChange(false)}
                    data-testid="button-cancel-user-permissions"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={upsertPermissionMutation.isPending}
                    data-testid="button-save-user-permissions"
                  >
                    {upsertPermissionMutation.isPending ? "Saving..." : "Save Permissions"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// User Card Component
interface UserCardProps {
  user: User & { role?: Role };
  onManagePermissions: (user: User & { role?: Role }) => void;
  userPermissions?: Permissions;
  resolvedPermissions?: Permissions;
}

function UserCard({ user, onManagePermissions, userPermissions, resolvedPermissions }: UserCardProps) {
  const enabledPermissions = resolvedPermissions ? Object.values(resolvedPermissions).filter(Boolean).length : 0;
  const totalPermissions = Object.keys(permissionsSchema.shape).length;

  const getUserSecurityLevel = (enabledCount: number, totalCount: number) => {
    const percentage = (enabledCount / totalCount) * 100;
    if (percentage >= 80) return { level: "critical", label: "Admin Access" };
    if (percentage >= 60) return { level: "high", label: "Manager" };
    if (percentage >= 30) return { level: "medium", label: "Standard User" };
    return { level: "low", label: "Limited Access" };
  };

  const { level, label } = getUserSecurityLevel(enabledPermissions, totalPermissions);

  return (
    <Card className="border hover:shadow-md transition-shadow" data-testid={`user-card-${user.id}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1">
            <UserCheck className="w-5 h-5 text-muted-foreground" />
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <h3 className="font-medium text-foreground" data-testid={`text-user-name-${user.id}`}>{user.name}</h3>
                <Badge 
                  variant={level === 'critical' ? 'destructive' : 
                         level === 'high' ? 'default' : 
                         level === 'medium' ? 'secondary' : 'outline'}
                  data-testid={`badge-user-level-${user.id}`}
                >
                  {label}
                </Badge>
                {!user.isActive && (
                  <Badge variant="outline" className="text-muted-foreground">
                    Inactive
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mb-2">@{user.username}</p>
              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                <span className="flex items-center" data-testid={`text-user-role-${user.id}`}>
                  <Shield className="w-3 h-3 mr-1" />
                  {user.role?.name || "No Role"}
                </span>
                <span className="flex items-center" data-testid={`text-user-permission-count-${user.id}`}>
                  <Key className="w-3 h-3 mr-1" />
                  {enabledPermissions}/{totalPermissions} permissions
                </span>
                {user.lastLoginAt && (
                  <span className="flex items-center">
                    <Eye className="w-3 h-3 mr-1" />
                    Last login: {new Date(user.lastLoginAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {userPermissions?.canEditUsers && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onManagePermissions(user)}
                data-testid={`button-manage-user-permissions-${user.id}`}
              >
                <Settings className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Users Tab Content Component  
function UsersTabContent({
  searchQuery,
  userPermissions
}: {
  searchQuery: string;
  userPermissions?: Permissions;
}) {
  const [permissionDialogOpen, setPermissionDialogOpen] = useState(false);
  const [managingUser, setManagingUser] = useState<User & { role?: Role } | undefined>();

  // Fetch users with roles
  const { data: users = [], isLoading: usersLoading } = useQuery<(User & { role?: Role })[]>({
    queryKey: ["/api/users"]
  });

  // Fetch all individual user permissions
  const { data: individualPermissions = [] } = useQuery<UserPermission[]>({
    queryKey: ["/api/user-permissions"]
  });

  // Fetch group memberships
  const { data: groupMemberships = [] } = useQuery<UserGroupMembership[]>({
    queryKey: ["/api/group-memberships"]
  });

  // Fetch groups for permission resolution
  const { data: groups = [] } = useQuery<UserGroup[]>({
    queryKey: ["/api/groups"]
  });

  if (!userPermissions?.canSeeUsers) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Card className="w-96">
          <CardContent className="p-6 text-center">
            <UserCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">
              You don't have permission to view users.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Filter users by search query
  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.role?.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Calculate resolved permissions for each user
  const getUserResolvedPermissions = (user: User & { role?: Role }): Permissions => {
    const resolved = permissionsSchema.parse({});
    
    // Start with role permissions
    if (user.role?.permissions) {
      Object.keys(resolved).forEach(key => {
        const permKey = key as keyof Permissions;
        resolved[permKey] = user.role!.permissions[permKey] || false;
      });
    }

    // Add group permissions (most permissive)
    const userGroups = groups.filter(group => 
      groupMemberships.some(membership => membership.userId === user.id && membership.groupId === group.id)
    );
    userGroups.forEach(group => {
      Object.keys(resolved).forEach(key => {
        const permKey = key as keyof Permissions;
        resolved[permKey] = resolved[permKey] || group.permissions[permKey] || false;
      });
    });

    // Add individual permissions (most permissive)
    const userIndividualPermissions = individualPermissions.find(p => p.userId === user.id);
    if (userIndividualPermissions?.permissions) {
      Object.keys(resolved).forEach(key => {
        const permKey = key as keyof Permissions;
        resolved[permKey] = resolved[permKey] || userIndividualPermissions.permissions[permKey] || false;
      });
    }

    return resolved;
  };

  const handleManagePermissions = (user: User & { role?: Role }) => {
    setManagingUser(user);
    setPermissionDialogOpen(true);
  };

  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.isActive).length;
  const usersWithIndividualPermissions = individualPermissions.length;
  const usersWithGroupMemberships = new Set(groupMemberships.map(m => m.userId)).size;

  return (
    <>
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
                <UserCheck className="text-primary w-6 h-6" />
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
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <UserCheck className="text-green-600 w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Individual Permissions</p>
                <p className="text-2xl font-bold text-foreground" data-testid="metric-individual-permissions">
                  {usersWithIndividualPermissions}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Settings className="text-blue-600 w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Group Members</p>
                <p className="text-2xl font-bold text-foreground" data-testid="metric-group-members">
                  {usersWithGroupMemberships}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Users className="text-purple-600 w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users List */}
      <div className="space-y-4">
        {usersLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-5 h-5 bg-muted rounded" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-muted rounded w-1/4" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredUsers.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <UserCheck className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Users Found</h3>
              <p className="text-muted-foreground">
                {searchQuery ? `No users match "${searchQuery}"` : "No users available"}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredUsers.map((user) => (
            <UserCard
              key={user.id}
              user={user}
              onManagePermissions={handleManagePermissions}
              userPermissions={userPermissions}
              resolvedPermissions={getUserResolvedPermissions(user)}
            />
          ))
        )}
      </div>

      {/* User Permission Dialog */}
      <UserPermissionDialog
        user={managingUser}
        open={permissionDialogOpen}
        onOpenChange={(open) => {
          setPermissionDialogOpen(open);
          if (!open) setManagingUser(undefined);
        }}
        userPermissions={userPermissions}
      />
    </>
  );
}

// Security Overview Tab Content Component
function SecurityOverviewTabContent({
  totalRoles,
  totalPermissions,
  activeUsers,
  userPermissions
}: {
  totalRoles: number;
  totalPermissions: number;
  activeUsers: number;
  userPermissions?: Permissions;
}) {
  if (!userPermissions?.canSeeSecuritySettings) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Card className="w-96">
          <CardContent className="p-6 text-center">
            <Eye className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">
              You don't have permission to view security overview.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Security Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Roles</p>
                <p className="text-2xl font-bold text-foreground">{totalRoles}</p>
              </div>
              <Shield className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Permissions</p>
                <p className="text-2xl font-bold text-foreground">{totalPermissions}</p>
              </div>
              <Key className="w-8 h-8 text-secondary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Users</p>
                <p className="text-2xl font-bold text-foreground">{activeUsers}</p>
              </div>
              <UserCheck className="w-8 h-8 text-accent" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Security Overview</CardTitle>
          <p className="text-sm text-muted-foreground">
            Comprehensive security analytics and system insights
          </p>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Eye className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Security Analytics</h3>
            <p className="text-muted-foreground mb-4">
              Detailed security analytics and reporting features are coming soon.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SecurityManagementContent() {
  const [activeTab, setActiveTab] = useState("roles");
  const [searchQuery, setSearchQuery] = useState("");
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | undefined>();
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<UserGroup | undefined>();
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>();
  const [userSecurityDialogOpen, setUserSecurityDialogOpen] = useState(false);
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
    mutationFn: (roleId: string) => apiRequest("DELETE", `/api/roles/${roleId}`),
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
          <h1 className="text-2xl font-semibold text-foreground">Security Management Center</h1>
          <p className="text-sm text-muted-foreground">Manage roles, user groups, individual permissions, and security settings</p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder={activeTab === 'roles' ? 'Search roles...' : activeTab === 'groups' ? 'Search groups...' : 'Search...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-64"
              data-testid="input-search"
            />
          </div>
          {activeTab === 'roles' && userPermissions?.canModifyRoles && (
            <Button onClick={handleCreateRole} data-testid="button-create-role">
              <Plus className="w-4 h-4 mr-2" />
              Create Role
            </Button>
          )}
          {activeTab === 'groups' && userPermissions?.canModifyGroups && (
            <Button onClick={() => { setEditingGroup(undefined); setGroupDialogOpen(true); }} data-testid="button-create-group">
              <Plus className="w-4 h-4 mr-2" />
              Create Group
            </Button>
          )}
        </div>
      </div>

      {/* Security Management Center Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="roles" data-testid="tab-roles">
            <Shield className="w-4 h-4 mr-2" />
            Roles
          </TabsTrigger>
          <TabsTrigger value="groups" data-testid="tab-groups">
            <Users className="w-4 h-4 mr-2" />
            Groups
          </TabsTrigger>
          <TabsTrigger value="users" data-testid="tab-users">
            <UserCheck className="w-4 h-4 mr-2" />
            Users
          </TabsTrigger>
          <TabsTrigger value="overview" data-testid="tab-overview">
            <Eye className="w-4 h-4 mr-2" />
            Security Overview
          </TabsTrigger>
        </TabsList>

        {/* Roles Tab */}
        <TabsContent value="roles" className="space-y-6">
          <RolesTabContent 
            roles={filteredRoles}
            rolesLoading={rolesLoading}
            usersLoading={usersLoading}
            userCountByRole={userCountByRole}
            totalRoles={totalRoles}
            totalPermissions={totalPermissions}
            activeUsers={activeUsers}
            searchQuery={searchQuery}
            handleCreateRole={handleCreateRole}
            handleEditRole={handleEditRole}
            handleDeleteRole={handleDeleteRole}
            userPermissions={userPermissions}
          />
        </TabsContent>

        {/* Groups Tab */}
        <TabsContent value="groups" className="space-y-6">
          <GroupsTabContent 
            searchQuery={searchQuery}
            userPermissions={userPermissions}
          />
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-6">
          <UsersTabContent 
            searchQuery={searchQuery}
            userPermissions={userPermissions}
          />
        </TabsContent>

        {/* Security Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <SecurityOverviewTabContent 
            totalRoles={totalRoles}
            totalPermissions={totalPermissions}
            activeUsers={activeUsers}
            userPermissions={userPermissions}
          />
        </TabsContent>
      </Tabs>

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

// Group Form Dialog Component
interface GroupFormDialogProps {
  group?: UserGroup;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userPermissions?: Permissions;
}

function GroupFormDialog({ group, open, onOpenChange, userPermissions }: GroupFormDialogProps) {
  const { toast } = useToast();
  const isEditing = !!group;

  const form = useForm<InsertUserGroup>({
    resolver: zodResolver(insertUserGroupSchema),
    defaultValues: {
      name: group?.name || "",
      description: group?.description || "",
      permissions: group?.permissions || permissionsSchema.parse({})
    }
  });

  const createGroupMutation = useMutation({
    mutationFn: (data: InsertUserGroup) => apiRequest("POST", "/api/groups", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/group-memberships"] });
      toast({
        title: "Success",
        description: "Group created successfully"
      });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create group",
        variant: "destructive"
      });
    }
  });

  const updateGroupMutation = useMutation({
    mutationFn: (data: Partial<InsertUserGroup>) => apiRequest("PUT", `/api/groups/${group!.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/group-memberships"] });
      toast({
        title: "Success",
        description: "Group updated successfully"
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update group",
        variant: "destructive"
      });
    }
  });

  const onSubmit = (data: InsertUserGroup) => {
    if (isEditing) {
      updateGroupMutation.mutate(data);
    } else {
      createGroupMutation.mutate(data);
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="group-form-dialog">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Group" : "Create Group"}
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
                    <FormLabel>Group Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter group name" {...field} data-testid="input-group-name" />
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
                      <Textarea placeholder="Describe this group..." {...field} data-testid="input-group-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            <div>
              <h3 className="text-lg font-semibold mb-4">Group Permissions</h3>
              <div className="space-y-6">
                {Object.entries(PERMISSION_CATEGORIES).map(([categoryName, category]) => {
                  const Icon = category.icon;
                  const categoryPermissions = category.permissions.filter(perm => 
                    permissions.hasOwnProperty(perm)
                  );
                  const enabledCount = categoryPermissions.filter(perm => permissions[perm]).length;
                  const allEnabled = enabledCount === categoryPermissions.length;
                  
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
                              onCheckedChange={(checked) => !categoryDisabled && setPermissionCategory(category.permissions, checked)}
                              disabled={categoryDisabled}
                              data-testid={`toggle-group-category-${categoryName.toLowerCase().replace(' ', '-')}`}
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
                                  <Label htmlFor={`group-${permission}`} className={`cursor-pointer ${
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
                                  id={`group-${permission}`}
                                  checked={permissions[permission] || false}
                                  onCheckedChange={() => !isDisabled && togglePermission(permission)}
                                  disabled={isDisabled}
                                  data-testid={`toggle-group-${permission}`}
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
                data-testid="button-cancel-group"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createGroupMutation.isPending || updateGroupMutation.isPending}
                data-testid="button-save-group"
              >
                {createGroupMutation.isPending || updateGroupMutation.isPending ? "Saving..." : (isEditing ? "Update Group" : "Create Group")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// Group Card Component
interface GroupCardProps {
  group: UserGroup;
  memberCount: number;
  onEdit: (group: UserGroup) => void;
  onDelete: (group: UserGroup) => void;
  onManageMembers: (group: UserGroup) => void;
  userPermissions?: Permissions;
}

function GroupCard({ group, memberCount, onEdit, onDelete, onManageMembers, userPermissions }: GroupCardProps) {
  const permissions = group.permissions;
  const enabledPermissions = Object.values(permissions).filter(Boolean).length;
  const totalPermissions = Object.keys(permissions).length;

  const getGroupLevel = (enabledCount: number, totalCount: number) => {
    const percentage = (enabledCount / totalCount) * 100;
    if (percentage >= 80) return { level: "critical", label: "High Access" };
    if (percentage >= 60) return { level: "high", label: "Manager" };
    if (percentage >= 30) return { level: "medium", label: "Standard" };
    return { level: "low", label: "Limited" };
  };

  const { level, label } = getGroupLevel(enabledPermissions, totalPermissions);

  return (
    <Card className="border hover:shadow-md transition-shadow" data-testid={`group-card-${group.id}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1">
            <Users className="w-5 h-5 text-muted-foreground" />
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <h3 className="font-medium text-foreground">{group.name}</h3>
                <Badge 
                  variant={level === 'critical' ? 'destructive' : 
                         level === 'high' ? 'default' : 
                         level === 'medium' ? 'secondary' : 'outline'}
                  data-testid={`badge-group-level-${group.id}`}
                >
                  {label}
                </Badge>
              </div>
              {group.description && (
                <p className="text-sm text-muted-foreground mb-2">{group.description}</p>
              )}
              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                <span className="flex items-center" data-testid={`text-member-count-${group.id}`}>
                  <UserCheck className="w-3 h-3 mr-1" />
                  {memberCount} members
                </span>
                <span className="flex items-center" data-testid={`text-group-permission-count-${group.id}`}>
                  <Key className="w-3 h-3 mr-1" />
                  {enabledPermissions}/{totalPermissions} permissions
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {userPermissions?.canEditGroups && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onManageMembers(group)}
                data-testid={`button-manage-group-members-${group.id}`}
              >
                <UserCheck className="w-4 h-4" />
              </Button>
            )}
            {userPermissions?.canEditGroups && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(group)}
                data-testid={`button-edit-group-${group.id}`}
              >
                <Edit className="w-4 h-4" />
              </Button>
            )}
            {userPermissions?.canDeleteGroups && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    data-testid={`button-delete-group-${group.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Group</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete the "{group.name}" group? 
                      {memberCount > 0 && (
                        <span className="block mt-2 text-destructive font-medium">
                          Warning: This group has {memberCount} member(s). They will lose group permissions when this group is deleted.
                        </span>
                      )}
                      This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => onDelete(group)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      data-testid={`button-confirm-delete-group-${group.id}`}
                    >
                      Delete Group
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

// Group Members Management Dialog
interface GroupMembersDialogProps {
  group?: UserGroup;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userPermissions?: Permissions;
}

function GroupMembersDialog({ group, open, onOpenChange, userPermissions }: GroupMembersDialogProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch all users
  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: open
  });

  // Fetch group memberships for this group
  const { data: memberships = [], isLoading: membershipsLoading } = useQuery<UserGroupMembership[]>({
    queryKey: ["/api/group-memberships", group?.id],
    enabled: open && !!group
  });

  const addMemberMutation = useMutation({
    mutationFn: (data: InsertUserGroupMembership) => apiRequest("POST", "/api/group-memberships", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/group-memberships"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Success",
        description: "User added to group successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add user to group",
        variant: "destructive"
      });
    }
  });

  const removeMemberMutation = useMutation({
    mutationFn: (membershipId: string) => apiRequest("DELETE", `/api/group-memberships/${membershipId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/group-memberships"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Success",
        description: "User removed from group successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove user from group",
        variant: "destructive"
      });
    }
  });

  if (!group) return null;

  const memberUserIds = new Set(memberships.map(m => m.userId));
  const availableUsers = users.filter(user => !memberUserIds.has(user.id));
  const groupMembers = users.filter(user => memberUserIds.has(user.id));

  const filteredAvailableUsers = availableUsers.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredMembers = groupMembers.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddMember = (userId: string) => {
    addMemberMutation.mutate({
      userId,
      groupId: group.id
    });
  };

  const handleRemoveMember = (userId: string) => {
    const membership = memberships.find(m => m.userId === userId);
    if (membership) {
      removeMemberMutation.mutate(membership.id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="group-members-dialog">
        <DialogHeader>
          <DialogTitle>Manage Members - {group.name}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Add or remove users from this group. Group permissions will apply to all members.
          </p>
        </DialogHeader>

        <div className="space-y-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-group-users"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Current Members */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Current Members ({groupMembers.length})</h3>
              {membershipsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="animate-pulse bg-muted h-16 rounded" />
                  ))}
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredMembers.map((user) => (
                    <Card key={user.id} className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium" data-testid={`text-member-name-${user.id}`}>{user.name}</p>
                          <p className="text-sm text-muted-foreground">@{user.username}</p>
                        </div>
                        {userPermissions?.canEditGroups && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveMember(user.id)}
                            disabled={removeMemberMutation.isPending}
                            data-testid={`button-remove-member-${user.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))}
                  {filteredMembers.length === 0 && (
                    <p className="text-muted-foreground text-center py-8">
                      {searchQuery ? "No members match your search" : "No members in this group"}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Available Users */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Available Users ({availableUsers.length})</h3>
              {usersLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="animate-pulse bg-muted h-16 rounded" />
                  ))}
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredAvailableUsers.map((user) => (
                    <Card key={user.id} className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium" data-testid={`text-available-user-name-${user.id}`}>{user.name}</p>
                          <p className="text-sm text-muted-foreground">@{user.username}</p>
                        </div>
                        {userPermissions?.canEditGroups && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAddMember(user.id)}
                            disabled={addMemberMutation.isPending}
                            data-testid={`button-add-member-${user.id}`}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))}
                  {filteredAvailableUsers.length === 0 && (
                    <p className="text-muted-foreground text-center py-8">
                      {searchQuery ? "No users match your search" : "All users are already members"}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} data-testid="button-close-group-members">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Groups Tab Content Component
function GroupsTabContent({
  searchQuery,
  userPermissions
}: {
  searchQuery: string;
  userPermissions?: Permissions;
}) {
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<UserGroup | undefined>();
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);
  const [managingGroup, setManagingGroup] = useState<UserGroup | undefined>();

  // Fetch groups
  const { data: groups = [], isLoading: groupsLoading } = useQuery<UserGroup[]>({
    queryKey: ["/api/groups"]
  });

  // Fetch group memberships for counts
  const { data: memberships = [] } = useQuery<UserGroupMembership[]>({
    queryKey: ["/api/group-memberships"]
  });

  const { toast } = useToast();

  const deleteGroupMutation = useMutation({
    mutationFn: (groupId: string) => apiRequest("DELETE", `/api/groups/${groupId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/group-memberships"] });
      toast({
        title: "Success",
        description: "Group deleted successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete group",
        variant: "destructive"
      });
    }
  });

  // Filter groups by search query
  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (group.description && group.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Calculate member counts
  const memberCountByGroup = memberships.reduce((acc, membership) => {
    acc[membership.groupId] = (acc[membership.groupId] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const handleCreateGroup = () => {
    setEditingGroup(undefined);
    setGroupDialogOpen(true);
  };

  const handleEditGroup = (group: UserGroup) => {
    setEditingGroup(group);
    setGroupDialogOpen(true);
  };

  const handleDeleteGroup = (group: UserGroup) => {
    deleteGroupMutation.mutate(group.id);
  };

  const handleManageMembers = (group: UserGroup) => {
    setManagingGroup(group);
    setMembersDialogOpen(true);
  };

  const totalGroups = groups.length;
  const totalPermissions = Object.keys(permissionsSchema.shape).length;
  const activeGroups = groups.filter(g => g.isActive).length;
  const totalMembers = memberships.length;

  return (
    <>
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Groups</p>
                <p className="text-2xl font-bold text-foreground" data-testid="metric-total-groups">
                  {totalGroups}
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
                <p className="text-sm font-medium text-muted-foreground">Active Groups</p>
                <p className="text-2xl font-bold text-foreground" data-testid="metric-active-groups">
                  {activeGroups}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <UserCheck className="text-green-600 w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Members</p>
                <p className="text-2xl font-bold text-foreground" data-testid="metric-total-members">
                  {totalMembers}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="text-blue-600 w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Permissions</p>
                <p className="text-2xl font-bold text-foreground" data-testid="metric-group-permissions">
                  {totalPermissions}
                </p>
              </div>
              <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center">
                <Key className="text-secondary w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Groups List */}
      <div className="space-y-4">
        {groupsLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-5 h-5 bg-muted rounded" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-muted rounded w-1/4" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredGroups.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Groups Found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery ? `No groups match "${searchQuery}"` : "Create your first user group to get started"}
              </p>
              {userPermissions?.canModifyGroups && !searchQuery && (
                <Button onClick={handleCreateGroup} data-testid="button-create-first-group">
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Group
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredGroups.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              memberCount={memberCountByGroup[group.id] || 0}
              onEdit={handleEditGroup}
              onDelete={handleDeleteGroup}
              onManageMembers={handleManageMembers}
              userPermissions={userPermissions}
            />
          ))
        )}
      </div>

      {/* Group Form Dialog */}
      <GroupFormDialog
        group={editingGroup}
        open={groupDialogOpen}
        onOpenChange={(open) => {
          setGroupDialogOpen(open);
          if (!open) setEditingGroup(undefined);
        }}
        userPermissions={userPermissions}
      />

      {/* Group Members Dialog */}
      <GroupMembersDialog
        group={managingGroup}
        open={membersDialogOpen}
        onOpenChange={(open) => {
          setMembersDialogOpen(open);
          if (!open) setManagingGroup(undefined);
        }}
        userPermissions={userPermissions}
      />
    </>
  );
}

export default function SecurityManagement() {
  return (
    <RouteGuard permission="canSeeRoles">
      <SecurityManagementContent />
    </RouteGuard>
  );
}