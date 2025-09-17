import { useQuery } from "@tanstack/react-query";
import type { Permissions, User } from "@shared/schema";

interface UserWithPermissions {
  user: {
    id: string;
    username: string;
    name: string;
    roleId: string;
    isActive: boolean;
  };
  permissions: Permissions;
}

export function usePermissions() {
  const query = useQuery<UserWithPermissions>({
    queryKey: ['/api/users/me/permissions'],
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  const permissions = query.data?.permissions;
  const user = query.data?.user;

  // Helper function to check a specific permission
  const hasPermission = (permission: keyof Permissions): boolean => {
    return Boolean(permissions?.[permission]);
  };

  // Helper function to check multiple permissions (all must be true)
  const hasAllPermissions = (...permissionKeys: (keyof Permissions)[]): boolean => {
    return permissionKeys.every(permission => hasPermission(permission));
  };

  // Helper function to check if user has any of the provided permissions
  const hasAnyPermission = (...permissionKeys: (keyof Permissions)[]): boolean => {
    return permissionKeys.some(permission => hasPermission(permission));
  };

  // Feature-level access checks
  const canAccessUserManagement = (): boolean => {
    return hasPermission('canViewUsers');
  };

  const canAccessInitiativeManagement = (): boolean => {
    return hasAnyPermission('canViewAllProjects', 'canCreateProjects', 'canEditAllProjects');
  };

  const canAccessSecurityManagement = (): boolean => {
    return hasPermission('canViewRoles');
  };

  const canManageProjects = (): boolean => {
    return hasAnyPermission('canCreateProjects', 'canEditAllProjects', 'canDeleteProjects');
  };

  const canCreateContent = (): boolean => {
    return hasAnyPermission('canCreateProjects', 'canEditAllProjects');
  };

  const canDeleteContent = (): boolean => {
    return hasAnyPermission('canDeleteProjects', 'canDeleteUsers');
  };

  const canViewSystemReports = (): boolean => {
    return hasPermission('canViewReports');
  };

  const isSystemAdmin = (): boolean => {
    return hasPermission('canManageSystem');
  };

  const isLoading = query.isLoading;
  const isError = query.isError;
  const error = query.error;

  return {
    // Raw data
    permissions,
    user,
    
    // Query states
    isLoading,
    isError,
    error,
    
    // Permission checkers
    hasPermission,
    hasAllPermissions,
    hasAnyPermission,
    
    // Feature-level access
    canAccessUserManagement,
    canAccessInitiativeManagement,
    canAccessSecurityManagement,
    canManageProjects,
    canCreateContent,
    canDeleteContent,
    canViewSystemReports,
    isSystemAdmin,
    
    // Refresh permissions
    refetch: query.refetch,
  };
}